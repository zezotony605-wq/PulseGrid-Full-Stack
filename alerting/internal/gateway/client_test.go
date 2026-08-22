package gateway

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

const samplePayload = `[
  {"event_id":"e1","device_id":"PG-A7F2","timestamp":"2026-03-14T10:42:38.491Z",
   "heart_rate":86,"speed_kmh":12.4,"systolic_pressure":121,
   "diastolic_pressure":78,"oxygen_percent":98}
]`

func TestRecentDecodesTheGatewayPayload(t *testing.T) {
	var gotPath, gotQuery, gotAccept string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath, gotQuery, gotAccept = r.URL.Path, r.URL.RawQuery, r.Header.Get("Accept")
		_, _ = w.Write([]byte(samplePayload))
	}))
	defer server.Close()

	samples, err := New(server.URL, time.Second).Recent(context.Background(), 25)
	if err != nil {
		t.Fatalf("Recent: %v", err)
	}

	if gotPath != "/api/v1/telemetry/recent" {
		t.Errorf("path: got %q", gotPath)
	}
	if gotQuery != "limit=25" {
		t.Errorf("query: got %q", gotQuery)
	}
	if gotAccept != "application/json" {
		t.Errorf("accept: got %q", gotAccept)
	}
	if len(samples) != 1 {
		t.Fatalf("got %d samples, want 1", len(samples))
	}
	if samples[0].DeviceID != "PG-A7F2" || samples[0].HeartRate != 86 || samples[0].OxygenPercent != 98 {
		t.Errorf("decoded sample is wrong: %+v", samples[0])
	}
}

func TestRecentJoinsPathsOntoABaseWithAPrefix(t *testing.T) {
	var gotPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		_, _ = w.Write([]byte(`[]`))
	}))
	defer server.Close()

	if _, err := New(server.URL+"/gateway/", time.Second).Recent(context.Background(), 1); err != nil {
		t.Fatalf("Recent: %v", err)
	}
	if gotPath != "/gateway/api/v1/telemetry/recent" {
		t.Errorf("path: got %q", gotPath)
	}
}

func TestRecentReportsANonOKStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer server.Close()

	_, err := New(server.URL, time.Second).Recent(context.Background(), 25)
	if err == nil {
		t.Fatal("want an error for a 503 response")
	}
	if !strings.Contains(err.Error(), "503") {
		t.Errorf("error should name the status: %v", err)
	}
}

func TestRecentReportsAMalformedBody(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"not":"an array"}`))
	}))
	defer server.Close()

	if _, err := New(server.URL, time.Second).Recent(context.Background(), 25); err == nil {
		t.Fatal("want an error for a body that is not a sample array")
	}
}

func TestRecentHonoursACancelledContext(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(200 * time.Millisecond)
		_, _ = w.Write([]byte(`[]`))
	}))
	defer server.Close()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	if _, err := New(server.URL, time.Second).Recent(ctx, 25); err == nil {
		t.Fatal("want an error when the context is already cancelled")
	}
}
