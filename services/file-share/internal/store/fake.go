package store

import (
	"context"
	"sync"
)

type Fake struct {
	mu      sync.Mutex
	files   map[string][]byte
	failing bool
}

func NewFake() *Fake {
	return &Fake{files: map[string][]byte{}}
}

func (f *Fake) SetFailing(failing bool) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.failing = failing
}

func (f *Fake) Put(_ context.Context, id string, payload []byte) (bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.failing {
		return false, ErrUnavailable
	}
	if _, exists := f.files[id]; exists {
		return false, nil
	}
	copied := make([]byte, len(payload))
	copy(copied, payload)
	f.files[id] = copied
	return true, nil
}

func (f *Fake) Get(_ context.Context, id string) ([]byte, bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.failing {
		return nil, false, ErrUnavailable
	}
	payload, ok := f.files[id]
	if !ok {
		return nil, false, nil
	}
	copied := make([]byte, len(payload))
	copy(copied, payload)
	return copied, true, nil
}

func (f *Fake) Ping(_ context.Context) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.failing {
		return ErrUnavailable
	}
	return nil
}
