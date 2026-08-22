// Command pulsegrid-alerting evaluates clinical alert rules over PulseGrid
// telemetry and exposes the result to Prometheus and to operators.
//
// It polls the gateway's read API instead of joining the Kafka consumer group:
// the storage consumer owns those offsets, and alerting must not be able to
// move them or replay the topic when a rule changes.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"sync/atomic"
	"syscall"
	"time"

	"github.com/zezotony605-wq/PulseGrid-Full-Stack/alerting/internal/gateway"
	"github.com/zezotony605-wq/PulseGrid-Full-Stack/alerting/internal/rules"
)

const (
	alertCapacity  = 100
	sampleLimit    = 100
	requestTimeout = 5 * time.Second
	shutdownGrace  = 10 * time.Second
)

type config struct {
	gatewayURL   string
	listenAddr   string
	pollInterval time.Duration
}

func loadConfig() config {
	return config{
		gatewayURL:   env("GATEWAY_URL", "http://localhost:8080"),
		listenAddr:   env("ALERT_LISTEN_ADDR", ":8090"),
		pollInterval: envDuration("ALERT_POLL_INTERVAL", 5*time.Second),
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func envDuration(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil || parsed <= 0 {
		slog.Warn("ignoring invalid duration", "key", key, "value", value)
		return fallback
	}
	return parsed
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	cfg := loadConfig()
	store := rules.NewStore(alertCapacity)
	client := gateway.New(cfg.gatewayURL, requestTimeout)

	// Tracks whether the last poll reached the gateway, so /healthz can report
	// degraded without failing the container.
	var upstreamHealthy atomic.Bool

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go poll(ctx, client, store, cfg.pollInterval, &upstreamHealthy)

	server := &http.Server{
		Addr:              cfg.listenAddr,
		Handler:           routes(store, &upstreamHealthy),
		ReadHeaderTimeout: requestTimeout,
	}

	go func() {
		<-ctx.Done()
		slog.Info("shutting down")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownGrace)
		defer cancel()
		if err := server.Shutdown(shutdownCtx); err != nil {
			slog.Error("graceful shutdown failed", "error", err)
		}
	}()

	slog.Info("alert evaluator listening", "addr", cfg.listenAddr, "gateway", cfg.gatewayURL)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		slog.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

// poll reads the recent window on every tick and feeds it through the rules.
func poll(ctx context.Context, client *gateway.Client, store *rules.Store, interval time.Duration, healthy *atomic.Bool) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		samples, err := client.Recent(ctx, sampleLimit)
		if err != nil {
			// The gateway may still be starting; keep serving what we have.
			if ctx.Err() == nil {
				healthy.Store(false)
				slog.Warn("telemetry poll failed", "error", err)
			}
		} else {
			healthy.Store(true)
			for _, sample := range samples {
				for _, alert := range store.Record(sample, rules.Default) {
					slog.Info("alert",
						"device", alert.DeviceID,
						"rule", alert.Rule,
						"severity", alert.Severity,
						"detail", alert.Detail,
					)
				}
			}
		}

		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func routes(store *rules.Store, healthy *atomic.Bool) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		if !healthy.Load() {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "degraded"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	mux.HandleFunc("GET /api/v1/alerts", func(w http.ResponseWriter, _ *http.Request) {
		alerts := store.Recent()
		if alerts == nil {
			alerts = []rules.Alert{}
		}
		writeJSON(w, http.StatusOK, alerts)
	})

	mux.HandleFunc("GET /metrics", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
		_, _ = w.Write([]byte(renderMetrics(store)))
	})

	return mux
}

// renderMetrics writes the Prometheus text exposition format by hand: the
// service exports three series, which does not justify a client library.
func renderMetrics(store *rules.Store) string {
	counts, evaluated := store.Counters()

	var out []byte
	out = append(out, "# HELP pulsegrid_alerting_samples_evaluated_total Telemetry samples evaluated.\n"...)
	out = append(out, "# TYPE pulsegrid_alerting_samples_evaluated_total counter\n"...)
	out = append(out, fmt.Sprintf("pulsegrid_alerting_samples_evaluated_total %d\n", evaluated)...)

	out = append(out, "# HELP pulsegrid_alerting_rule_fired_total Alerts raised, by rule.\n"...)
	out = append(out, "# TYPE pulsegrid_alerting_rule_fired_total counter\n"...)
	for _, name := range rules.RuleNames(rules.Default) {
		out = append(out, fmt.Sprintf("pulsegrid_alerting_rule_fired_total{rule=%s} %d\n",
			strconv.Quote(name), counts[name])...)
	}

	out = append(out, "# HELP pulsegrid_alerting_active_alerts Alerts currently retained.\n"...)
	out = append(out, "# TYPE pulsegrid_alerting_active_alerts gauge\n"...)
	out = append(out, fmt.Sprintf("pulsegrid_alerting_active_alerts %d\n", len(store.Recent()))...)

	return string(out)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		slog.Error("write response failed", "error", err)
	}
}
