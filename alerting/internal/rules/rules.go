// Package rules evaluates clinical thresholds over telemetry samples.
//
// Rules are data, not code paths: adding a threshold is a slice entry, and the
// evaluation order is fixed so the same sample always produces the same alert.
package rules

import "fmt"

// Severity orders the alert levels. Higher wins when several rules fire.
type Severity int

const (
	Normal Severity = iota
	Warning
	Critical
)

func (s Severity) String() string {
	switch s {
	case Critical:
		return "critical"
	case Warning:
		return "warning"
	default:
		return "normal"
	}
}

// Sample is the subset of a telemetry event the rules read.
type Sample struct {
	EventID           string  `json:"event_id"`
	DeviceID          string  `json:"device_id"`
	Timestamp         string  `json:"timestamp"`
	HeartRate         int     `json:"heart_rate"`
	SpeedKmh          float64 `json:"speed_kmh"`
	SystolicPressure  int     `json:"systolic_pressure"`
	DiastolicPressure int     `json:"diastolic_pressure"`
	OxygenPercent     int     `json:"oxygen_percent"`
}

// Alert is one rule firing on one sample.
type Alert struct {
	DeviceID  string   `json:"device_id"`
	Rule      string   `json:"rule"`
	Severity  string   `json:"severity"`
	Detail    string   `json:"detail"`
	Timestamp string   `json:"timestamp"`
	severity  Severity `json:"-"`
}

// Rule reports whether a sample breaches a threshold.
type Rule struct {
	Name     string
	Severity Severity
	Match    func(Sample) bool
	Detail   func(Sample) string
}

// Default is the ordered rule set. Critical rules are listed before the
// warning band that overlaps them so Evaluate reports the worst first.
var Default = []Rule{
	{
		Name:     "hypoxaemia",
		Severity: Critical,
		Match:    func(s Sample) bool { return s.OxygenPercent < 90 },
		Detail:   func(s Sample) string { return fmt.Sprintf("SpO2 %d%% below 90%%", s.OxygenPercent) },
	},
	{
		Name:     "hypertensive_crisis",
		Severity: Critical,
		Match:    func(s Sample) bool { return s.SystolicPressure >= 180 || s.DiastolicPressure >= 120 },
		Detail: func(s Sample) string {
			return fmt.Sprintf("blood pressure %d/%d mmHg", s.SystolicPressure, s.DiastolicPressure)
		},
	},
	{
		Name:     "tachycardia",
		Severity: Critical,
		Match:    func(s Sample) bool { return s.HeartRate >= 150 },
		Detail:   func(s Sample) string { return fmt.Sprintf("heart rate %d bpm at rest", s.HeartRate) },
	},
	{
		Name:     "low_oxygen",
		Severity: Warning,
		Match:    func(s Sample) bool { return s.OxygenPercent >= 90 && s.OxygenPercent < 95 },
		Detail:   func(s Sample) string { return fmt.Sprintf("SpO2 %d%% below the 95%% floor", s.OxygenPercent) },
	},
	{
		Name:     "stage_2_hypertension",
		Severity: Warning,
		Match:    func(s Sample) bool { return s.SystolicPressure >= 140 && s.SystolicPressure < 180 },
		Detail:   func(s Sample) string { return fmt.Sprintf("systolic %d mmHg", s.SystolicPressure) },
	},
	{
		Name:     "elevated_heart_rate",
		Severity: Warning,
		Match:    func(s Sample) bool { return s.HeartRate >= 120 && s.HeartRate < 150 },
		Detail:   func(s Sample) string { return fmt.Sprintf("heart rate %d bpm", s.HeartRate) },
	},
}

// Evaluate returns every rule that fires for the sample, worst severity first.
func Evaluate(sample Sample, ruleset []Rule) []Alert {
	var alerts []Alert
	for _, rule := range ruleset {
		if !rule.Match(sample) {
			continue
		}
		alerts = append(alerts, Alert{
			DeviceID:  sample.DeviceID,
			Rule:      rule.Name,
			Severity:  rule.Severity.String(),
			Detail:    rule.Detail(sample),
			Timestamp: sample.Timestamp,
			severity:  rule.Severity,
		})
	}
	return alerts
}

// Worst reports the highest severity among the alerts, or Normal if empty.
func Worst(alerts []Alert) Severity {
	worst := Normal
	for _, alert := range alerts {
		if alert.severity > worst {
			worst = alert.severity
		}
	}
	return worst
}
