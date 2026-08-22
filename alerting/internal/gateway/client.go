// Package gateway reads telemetry from the PulseGrid Kotlin gateway.
package gateway

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/zezotony605-wq/pulsegrid/alerting/internal/rules"
)

// Client reads the gateway's public telemetry endpoints.
//
// The evaluator deliberately consumes the same read API as the dashboard
// rather than joining the Kafka consumer group: alerting must never move a
// storage consumer's offsets, and a rule change must not replay the topic.
type Client struct {
	BaseURL string
	HTTP    *http.Client
}

// New returns a client with a bounded HTTP timeout.
func New(baseURL string, timeout time.Duration) *Client {
	return &Client{
		BaseURL: baseURL,
		HTTP:    &http.Client{Timeout: timeout},
	}
}

// Recent fetches the most recent samples across the fleet.
func (c *Client) Recent(ctx context.Context, limit int) ([]rules.Sample, error) {
	endpoint, err := url.JoinPath(c.BaseURL, "api", "v1", "telemetry", "recent")
	if err != nil {
		return nil, fmt.Errorf("build recent url: %w", err)
	}
	endpoint += "?limit=" + strconv.Itoa(limit)

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("build recent request: %w", err)
	}
	request.Header.Set("Accept", "application/json")

	response, err := c.HTTP.Do(request)
	if err != nil {
		return nil, fmt.Errorf("call gateway: %w", err)
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("gateway returned %s", response.Status)
	}

	var samples []rules.Sample
	if err := json.NewDecoder(response.Body).Decode(&samples); err != nil {
		return nil, fmt.Errorf("decode telemetry: %w", err)
	}
	return samples, nil
}
