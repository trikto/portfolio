package store

import (
	"context"
	"sync"
	"time"
)

// Fake is an in-memory Store used by the tests so that `go test ./...` needs no
// running Valkey. It reproduces the two properties the real store is chosen
// for: NX-guarded writes, and a burn that is atomic under concurrency.
type Fake struct {
	mu       sync.Mutex
	entries  map[string]fakeEntry
	counters map[string]fakeCounter
	now      func() time.Time
	down     bool
}

type fakeEntry struct {
	value     string
	expiresAt time.Time
}

type fakeCounter struct {
	value     int64
	expiresAt time.Time
}

func NewFake() *Fake {
	return &Fake{
		entries:  make(map[string]fakeEntry),
		counters: make(map[string]fakeCounter),
		now:      time.Now,
	}
}

// SetClock replaces the fake's clock, so TTL expiry can be tested without
// sleeping.
func (f *Fake) SetClock(now func() time.Time) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.now = now
}

// SetDown makes every operation fail with ErrUnavailable, which is how the
// tests exercise the 503 and fail-closed rate-limit paths.
func (f *Fake) SetDown(down bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.down = down
}

func (f *Fake) Put(_ context.Context, id string, rec Record, ttl time.Duration) (bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.down {
		return false, unavailable("fake", ErrUnavailable)
	}
	key := SecretKey(id)
	if entry, ok := f.entries[key]; ok && f.now().Before(entry.expiresAt) {
		return false, nil
	}
	f.entries[key] = fakeEntry{value: EncodeRecord(rec), expiresAt: f.now().Add(ttl)}
	return true, nil
}

func (f *Fake) Burn(_ context.Context, id string) (Record, bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.down {
		return Record{}, false, unavailable("fake", ErrUnavailable)
	}
	key := SecretKey(id)
	entry, ok := f.entries[key]
	// Read and delete happen under one lock, mirroring GETDEL.
	delete(f.entries, key)
	if !ok || !f.now().Before(entry.expiresAt) {
		return Record{}, false, nil
	}
	rec, err := DecodeRecord(entry.value)
	if err != nil {
		return Record{}, false, nil
	}
	return rec, true, nil
}

func (f *Fake) IncrementCounter(_ context.Context, key string, ttl time.Duration) (int64, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.down {
		return 0, unavailable("fake", ErrUnavailable)
	}
	counter, ok := f.counters[key]
	if !ok || !f.now().Before(counter.expiresAt) {
		counter = fakeCounter{expiresAt: f.now().Add(ttl)}
	}
	counter.value++
	f.counters[key] = counter
	return counter.value, nil
}

func (f *Fake) Ping(context.Context) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.down {
		return unavailable("fake", ErrUnavailable)
	}
	return nil
}

func (f *Fake) Close() error { return nil }

// Len reports how many unexpired entries are held, for assertions.
func (f *Fake) Len() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	count := 0
	for _, entry := range f.entries {
		if f.now().Before(entry.expiresAt) {
			count++
		}
	}
	return count
}
