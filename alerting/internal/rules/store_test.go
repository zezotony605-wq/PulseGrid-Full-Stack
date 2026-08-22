package rules

import (
	"sync"
	"testing"
)

func sampleWithID(id string, oxygen int) Sample {
	s := healthy()
	s.EventID = id
	s.OxygenPercent = oxygen
	return s
}

func TestStoreSkipsAlreadyEvaluatedEvents(t *testing.T) {
	store := NewStore(10)

	first := store.Record(sampleWithID("event-1", 85), Default)
	repeat := store.Record(sampleWithID("event-1", 85), Default)

	if len(first) != 1 {
		t.Fatalf("first record: got %d alerts, want 1", len(first))
	}
	if repeat != nil {
		t.Fatalf("repeat record: got %v, want nil", repeat)
	}

	counts, evaluated := store.Counters()
	if evaluated != 1 {
		t.Errorf("evaluated: got %d, want 1", evaluated)
	}
	if counts["hypoxaemia"] != 1 {
		t.Errorf("hypoxaemia count: got %d, want 1", counts["hypoxaemia"])
	}
}

func TestStoreRetainsNewestAlertsUpToCapacity(t *testing.T) {
	store := NewStore(3)
	for i, id := range []string{"a", "b", "c", "d", "e"} {
		_ = i
		store.Record(sampleWithID(id, 85), Default)
	}

	alerts := store.Recent()
	if len(alerts) != 3 {
		t.Fatalf("got %d alerts, want 3", len(alerts))
	}
	if alerts[0].Timestamp == "" {
		t.Error("newest alert lost its timestamp")
	}
}

func TestStoreCapacityIsAlwaysPositive(t *testing.T) {
	store := NewStore(0)
	store.Record(sampleWithID("event-1", 85), Default)

	if got := len(store.Recent()); got != 1 {
		t.Fatalf("got %d alerts, want 1", got)
	}
}

func TestStoreCountersAreACopy(t *testing.T) {
	store := NewStore(5)
	store.Record(sampleWithID("event-1", 85), Default)

	counts, _ := store.Counters()
	counts["hypoxaemia"] = 999

	fresh, _ := store.Counters()
	if fresh["hypoxaemia"] != 1 {
		t.Fatalf("caller mutated the store's counters: got %d", fresh["hypoxaemia"])
	}
}

func TestStoreDedupeSetDoesNotGrowWithoutBound(t *testing.T) {
	store := NewStore(2)
	for i := range 200 {
		store.Record(sampleWithID(string(rune('a'+i%26))+string(rune('a'+i/26)), 98), Default)
	}

	store.mu.RLock()
	seen := len(store.seen)
	store.mu.RUnlock()

	if seen > 2*20 {
		t.Fatalf("dedupe set grew to %d entries", seen)
	}
}

func TestStoreIsSafeUnderConcurrentUse(t *testing.T) {
	store := NewStore(50)
	var wg sync.WaitGroup

	for worker := range 8 {
		wg.Add(1)
		go func(worker int) {
			defer wg.Done()
			for i := range 50 {
				store.Record(sampleWithID(string(rune('A'+worker))+string(rune('0'+i%10)), 85), Default)
				store.Recent()
				store.Counters()
			}
		}(worker)
	}
	wg.Wait()

	if _, evaluated := store.Counters(); evaluated == 0 {
		t.Fatal("no samples were evaluated")
	}
}
