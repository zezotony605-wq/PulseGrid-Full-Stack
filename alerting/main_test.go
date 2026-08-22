package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/zezotony605-wq/PulseGrid-Full-Stack/alerting/internal/rules"
)

func criticalSample(id string) rules.Sample {
	return rules.Sample{
		EventID:           id,
		DeviceID:          "PG-A7F2",
		Timestamp:         "2026-03-14T10:42:38.491Z",
		HeartRate:         86,
		SystolicPressure:  121,
		DiastolicPressure: 78,
		OxygenPercent:     84,
	}
}

func TestMetricsExposeEveryRuleEvenAtZero(t *testing.T) {
	store := rules.NewStore(10)
	store.Record(criticalSample("event-1"), rules.Default)

	body := renderMetrics(store)

	for _, name := range rules.RuleNames(rules.Default) {
		if !strings.Contains(body, `pulsegrid_alerting_rule_fired_total{rule="`+name+`"}`) {
			t.Errorf("metrics are missing rule %q:\n%s", name, body)
		}
	}
	if !strings.Contains(body, `pulsegrid_alerting_rule_fired_total{rule="hypoxaemia"} 1`) {
		t.Errorf("hypoxaemia should have fired once:\n%s", body)
	}
	if !strings.Contains(body, "pulsegrid_alerting_samples_evaluated_total 1") {
		t.Errorf("evaluated counter is wrong:\n%s", body)
	}
	if !strings.Contains(body, "pulsegrid_alerting_active_alerts 1") {
		t.Errorf("active gauge is wrong:\n%s", body)
	}
}

func TestMetricsAreValidExpositionFormat(t *testing.T) {
	body := renderMetrics(rules.NewStore(10))

	for _, line := range strings.Split(strings.TrimSpace(body), "\n") {
		if strings.HasPrefix(line, "#") {
			continue
		}
		// Every sample line is `name[{labels}] value`.
		if fields := strings.Fields(line); len(fields) != 2 {
			t.Errorf("malformed sample line %q", line)
		}
	}
	if strings.Count(body, "# TYPE ") != 3 {
		t.Errorf("expected three TYPE declarations:\n%s", body)
	}
}

func TestAlertsEndpointReturnsAnArrayWhenEmpty(t *testing.T) {
	var healthy atomic.Bool
	healthy.Store(true)

	recorder := httptest.NewRecorder()
	routes(rules.NewStore(10), &healthy).ServeHTTP(
		recorder, httptest.NewRequest(http.MethodGet, "/api/v1/alerts", nil),
	)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status: got %d", recorder.Code)
	}
	// A nil slice would marshal to `null` and break array consumers.
	if body := strings.TrimSpace(recorder.Body.String()); body != "[]" {
		t.Fatalf("body: got %q, want []", body)
	}
}

func TestAlertsEndpointSerialisesStoredAlerts(t *testing.T) {
	var healthy atomic.Bool
	healthy.Store(true)

	store := rules.NewStore(10)
	store.Record(criticalSample("event-1"), rules.Default)

	recorder := httptest.NewRecorder()
	routes(store, &healthy).ServeHTTP(
		recorder, httptest.NewRequest(http.MethodGet, "/api/v1/alerts", nil),
	)

	var alerts []map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &alerts); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(alerts) != 1 {
		t.Fatalf("got %d alerts, want 1", len(alerts))
	}
	if alerts[0]["severity"] != "critical" || alerts[0]["rule"] != "hypoxaemia" {
		t.Fatalf("unexpected alert: %+v", alerts[0])
	}
}

func TestHealthzReportsDegradedUntilTheGatewayAnswers(t *testing.T) {
	var healthy atomic.Bool
	handler := routes(rules.NewStore(10), &healthy)

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if recorder.Code != http.StatusServiceUnavailable {
		t.Errorf("degraded status: got %d, want 503", recorder.Code)
	}

	healthy.Store(true)
	recorder = httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if recorder.Code != http.StatusOK {
		t.Errorf("healthy status: got %d, want 200", recorder.Code)
	}
}

func TestEnvDurationFallsBackOnGarbage(t *testing.T) {
	t.Setenv("ALERT_POLL_INTERVAL", "not-a-duration")
	if got := envDuration("ALERT_POLL_INTERVAL", 5*time.Second); got != 5*time.Second {
		t.Errorf("got %v, want the fallback", got)
	}

	t.Setenv("ALERT_POLL_INTERVAL", "-3s")
	if got := envDuration("ALERT_POLL_INTERVAL", 5*time.Second); got != 5*time.Second {
		t.Errorf("a non-positive interval must fall back, got %v", got)
	}

	t.Setenv("ALERT_POLL_INTERVAL", "250ms")
	if got := envDuration("ALERT_POLL_INTERVAL", 5*time.Second); got != 250*time.Millisecond {
		t.Errorf("got %v, want 250ms", got)
	}
}
