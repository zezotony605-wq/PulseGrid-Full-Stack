package rules

import (
	"sort"
	"sync"
)

// Store keeps the most recent alerts and the counters the metrics endpoint
// exposes. It is written by the poll loop and read by HTTP handlers, so every
// method takes the lock.
type Store struct {
	mu        sync.RWMutex
	capacity  int
	alerts    []Alert
	seen      map[string]struct{}
	firedBy   map[string]int
	evaluated int
}

// NewStore returns a store that retains at most capacity alerts.
func NewStore(capacity int) *Store {
	if capacity <= 0 {
		capacity = 1
	}
	return &Store{
		capacity: capacity,
		seen:     make(map[string]struct{}),
		firedBy:  make(map[string]int),
	}
}

// Record evaluates one sample and stores any alerts it raises.
//
// The poll loop re-reads an overlapping window every tick, so a sample that
// has already been evaluated is skipped by event id: without that, a single
// breach would be counted once per poll for as long as it stayed in the
// window.
func (s *Store) Record(sample Sample, ruleset []Rule) []Alert {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, duplicate := s.seen[sample.EventID]; duplicate {
		return nil
	}
	s.seen[sample.EventID] = struct{}{}
	s.evaluated++

	alerts := Evaluate(sample, ruleset)
	for _, alert := range alerts {
		s.firedBy[alert.Rule]++
	}

	s.alerts = append(alerts, s.alerts...)
	if len(s.alerts) > s.capacity {
		s.alerts = s.alerts[:s.capacity]
	}

	// The dedupe set would otherwise grow without bound. Event ids only need
	// to outlive the polling window, so clear it well past that.
	if len(s.seen) > s.capacity*20 {
		s.seen = map[string]struct{}{sample.EventID: {}}
	}

	return alerts
}

// Recent returns the retained alerts, newest first.
func (s *Store) Recent() []Alert {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]Alert(nil), s.alerts...)
}

// Counters returns the per-rule fire counts and the number of samples seen.
func (s *Store) Counters() (map[string]int, int) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	counts := make(map[string]int, len(s.firedBy))
	for name, count := range s.firedBy {
		counts[name] = count
	}
	return counts, s.evaluated
}

// RuleNames returns the rule names in a stable order for metric output.
func RuleNames(ruleset []Rule) []string {
	names := make([]string, 0, len(ruleset))
	for _, rule := range ruleset {
		names = append(names, rule.Name)
	}
	sort.Strings(names)
	return names
}
