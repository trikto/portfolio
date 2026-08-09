// Package store defines the one-time secret storage contract.
//
// The store only ever handles opaque base64url text produced by the browser's
// AES-GCM encryption. It has no key, no way to obtain one, and therefore no way
// to read a plaintext secret. Nothing in this package may log, wrap or return a
// payload or an id inside an error value.
package store

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// ErrUnavailable reports that the backing store could not serve the request.
// Callers translate it into a 503 store_unavailable response.
var ErrUnavailable = errors.New("store unavailable")

// ErrMalformedRecord reports a stored value this build cannot parse, which in
// practice means a rolling upgrade across incompatible record formats.
var ErrMalformedRecord = errors.New("malformed record")

// Record is the complete stored value for one secret.
//
// CreatedAt lives inside the value rather than in a second key so that a burn
// stays a single atomic command; a companion key would need its own delete and
// could drift out of sync with the payload.
type Record struct {
	CreatedAt time.Time
	Payload   string
}

// Store is the minimal surface the API needs. Keeping it this small is what
// makes an in-memory fake practical for tests.
type Store interface {
	// Put stores a record under id with the given TTL, but only if id is
	// currently unused (SET ... NX). It reports false without error when the
	// id was already taken, so the caller can regenerate and retry.
	Put(ctx context.Context, id string, rec Record, ttl time.Duration) (stored bool, err error)

	// Burn atomically returns and removes the record for id. It reports false
	// without error when nothing was stored under id.
	Burn(ctx context.Context, id string) (rec Record, found bool, err error)

	// IncrementCounter increments key, setting ttl on the first increment only,
	// and returns the new value. It backs the per-IP rate limiter.
	IncrementCounter(ctx context.Context, key string, ttl time.Duration) (int64, error)

	// Ping reports whether the store is reachable. It backs /readyz.
	Ping(ctx context.Context) error

	Close() error
}

// SecretKey namespaces secret entries so they cannot collide with rate-limit
// counters in the same keyspace.
func SecretKey(id string) string { return "secret:" + id }

const recordVersion = "v1"

// EncodeRecord serialises a record as "v1:<createdAtUnixMilli>:<payload>".
// The payload is already base64url text, which contains no ':', so a two-way
// split is unambiguous.
func EncodeRecord(rec Record) string {
	return recordVersion + ":" + strconv.FormatInt(rec.CreatedAt.UTC().UnixMilli(), 10) + ":" + rec.Payload
}

// DecodeRecord parses a stored value. Its errors deliberately carry no fragment
// of the stored data.
func DecodeRecord(raw string) (Record, error) {
	parts := strings.SplitN(raw, ":", 3)
	if len(parts) != 3 || parts[0] != recordVersion {
		return Record{}, ErrMalformedRecord
	}
	millis, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return Record{}, ErrMalformedRecord
	}
	return Record{
		CreatedAt: time.UnixMilli(millis).UTC(),
		Payload:   parts[2],
	}, nil
}

// unavailable wraps a backend failure. The wrapped error is the store's own
// status message; command arguments (and therefore payloads) are never part of
// it, which is why it is safe to surface in logs.
func unavailable(op string, err error) error {
	return fmt.Errorf("%w: %s: %v", ErrUnavailable, op, err)
}
