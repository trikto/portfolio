package store_test

import (
	"testing"
	"time"

	"github.com/trikto/portfolio/services/onetime-secret/internal/store"
)

func TestEncodeDecodeRoundTrip(t *testing.T) {
	rec := store.Record{
		CreatedAt: time.Date(2026, 8, 9, 12, 0, 0, 0, time.UTC),
		Payload:   "abcXYZ-_012",
	}
	raw := store.EncodeRecord(rec)
	got, err := store.DecodeRecord(raw)
	if err != nil {
		t.Fatal(err)
	}
	if !got.CreatedAt.Equal(rec.CreatedAt) || got.Payload != rec.Payload {
		t.Fatalf("got %#v want %#v", got, rec)
	}
}

func TestDecodeRejectsMalformed(t *testing.T) {
	cases := []string{"", "v2:1:x", "v1:nope:x", "v1:1"}
	for _, raw := range cases {
		if _, err := store.DecodeRecord(raw); err != store.ErrMalformedRecord {
			t.Fatalf("%q: err=%v", raw, err)
		}
	}
}

func TestFakePutNXAndExpiry(t *testing.T) {
	fake := store.NewFake()
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	fake.SetClock(func() time.Time { return now })

	rec := store.Record{CreatedAt: now, Payload: "p"}
	ok, err := fake.Put(nil, "id1", rec, time.Hour)
	if err != nil || !ok {
		t.Fatalf("first put: ok=%v err=%v", ok, err)
	}
	ok, err = fake.Put(nil, "id1", rec, time.Hour)
	if err != nil || ok {
		t.Fatalf("nx put: ok=%v err=%v", ok, err)
	}

	now = now.Add(2 * time.Hour)
	ok, err = fake.Put(nil, "id1", rec, time.Hour)
	if err != nil || !ok {
		t.Fatalf("after expiry: ok=%v err=%v", ok, err)
	}
}
