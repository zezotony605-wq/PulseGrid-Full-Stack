package rules

import (
	"testing"
)

func healthy() Sample {
	return Sample{
		EventID:           "event-1",
		DeviceID:          "PG-A7F2",
		Timestamp:         "2026-03-14T10:42:38.491Z",
		HeartRate:         86,
		SpeedKmh:          12.4,
		SystolicPressure:  121,
		DiastolicPressure: 78,
		OxygenPercent:     98,
	}
}

func TestEvaluate(t *testing.T) {
	tests := []struct {
		name         string
		mutate       func(*Sample)
		wantRules    []string
		wantSeverity Severity
	}{
		{
			name:         "healthy reading raises nothing",
			mutate:       func(*Sample) {},
			wantRules:    nil,
			wantSeverity: Normal,
		},
		{
			name:         "hypoxaemia is critical",
			mutate:       func(s *Sample) { s.OxygenPercent = 87 },
			wantRules:    []string{"hypoxaemia"},
			wantSeverity: Critical,
		},
		{
			name:         "borderline oxygen is only a warning",
			mutate:       func(s *Sample) { s.OxygenPercent = 93 },
			wantRules:    []string{"low_oxygen"},
			wantSeverity: Warning,
		},
		{
			name:         "the oxygen bands do not overlap at 90",
			mutate:       func(s *Sample) { s.OxygenPercent = 90 },
			wantRules:    []string{"low_oxygen"},
			wantSeverity: Warning,
		},
		{
			name:         "95 percent oxygen is inside the normal band",
			mutate:       func(s *Sample) { s.OxygenPercent = 95 },
			wantRules:    nil,
			wantSeverity: Normal,
		},
		{
			name:         "hypertensive crisis reports on either pressure",
			mutate:       func(s *Sample) { s.DiastolicPressure = 124 },
			wantRules:    []string{"hypertensive_crisis"},
			wantSeverity: Critical,
		},
		{
			name:         "stage 2 hypertension stops below the crisis threshold",
			mutate:       func(s *Sample) { s.SystolicPressure = 179 },
			wantRules:    []string{"stage_2_hypertension"},
			wantSeverity: Warning,
		},
		{
			name:         "180 systolic escalates to crisis only",
			mutate:       func(s *Sample) { s.SystolicPressure = 180 },
			wantRules:    []string{"hypertensive_crisis"},
			wantSeverity: Critical,
		},
		{
			name:         "critical alerts are reported before warnings",
			mutate:       func(s *Sample) { s.OxygenPercent = 85; s.HeartRate = 130 },
			wantRules:    []string{"hypoxaemia", "elevated_heart_rate"},
			wantSeverity: Critical,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			sample := healthy()
			test.mutate(&sample)

			alerts := Evaluate(sample, Default)
			got := make([]string, 0, len(alerts))
			for _, alert := range alerts {
				got = append(got, alert.Rule)
			}

			if len(got) != len(test.wantRules) {
				t.Fatalf("got rules %v, want %v", got, test.wantRules)
			}
			for i, name := range test.wantRules {
				if got[i] != name {
					t.Fatalf("rule %d: got %q, want %q", i, got[i], name)
				}
			}
			if worst := Worst(alerts); worst != test.wantSeverity {
				t.Fatalf("got severity %v, want %v", worst, test.wantSeverity)
			}
		})
	}
}

func TestEvaluateCarriesDeviceAndDetail(t *testing.T) {
	sample := healthy()
	sample.OxygenPercent = 84

	alerts := Evaluate(sample, Default)
	if len(alerts) != 1 {
		t.Fatalf("got %d alerts, want 1", len(alerts))
	}
	if alerts[0].DeviceID != "PG-A7F2" {
		t.Errorf("device id: got %q", alerts[0].DeviceID)
	}
	if alerts[0].Severity != "critical" {
		t.Errorf("severity: got %q", alerts[0].Severity)
	}
	if alerts[0].Detail != "SpO2 84% below 90%" {
		t.Errorf("detail: got %q", alerts[0].Detail)
	}
	if alerts[0].Timestamp != sample.Timestamp {
		t.Errorf("timestamp: got %q", alerts[0].Timestamp)
	}
}

func TestSeverityString(t *testing.T) {
	cases := map[Severity]string{Normal: "normal", Warning: "warning", Critical: "critical"}
	for severity, want := range cases {
		if got := severity.String(); got != want {
			t.Errorf("Severity(%d): got %q, want %q", severity, got, want)
		}
	}
}

func TestRuleNamesAreSortedAndComplete(t *testing.T) {
	names := RuleNames(Default)
	if len(names) != len(Default) {
		t.Fatalf("got %d names for %d rules", len(names), len(Default))
	}
	for i := 1; i < len(names); i++ {
		if names[i-1] > names[i] {
			t.Fatalf("names are not sorted: %v", names)
		}
	}
}
