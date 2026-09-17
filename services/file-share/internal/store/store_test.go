package store_test

import (
	"bytes"
	"context"
	"os"
	"path/filepath"
	"testing"

	"github.com/trikto/portfolio/services/file-share/internal/store"
)

func TestDiskRoundTrip(t *testing.T) {
	dir := t.TempDir()
	disk, err := store.NewDisk(dir)
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	payload := []byte{1, 2, 3, 4}
	created, err := disk.Put(ctx, "abc123", payload)
	if err != nil || !created {
		t.Fatalf("put: created=%v err=%v", created, err)
	}
	again, err := disk.Put(ctx, "abc123", []byte{9})
	if err != nil || again {
		t.Fatalf("duplicate put: created=%v err=%v", again, err)
	}
	got, found, err := disk.Get(ctx, "abc123")
	if err != nil || !found || !bytes.Equal(got, payload) {
		t.Fatalf("get: found=%v err=%v payload=%v", found, err, got)
	}
	_, found, err = disk.Get(ctx, "missing")
	if err != nil || found {
		t.Fatalf("missing: found=%v err=%v", found, err)
	}
	if err := disk.Ping(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(filepath.Join(dir, "abc123")); err != nil {
		t.Fatal(err)
	}
}
