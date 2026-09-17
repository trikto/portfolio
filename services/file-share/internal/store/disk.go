package store

import (
	"context"
	"errors"
	"os"
	"path/filepath"
)

type Disk struct {
	dir string
}

func NewDisk(dir string) (*Disk, error) {
	if dir == "" {
		return nil, errors.New("data dir is required")
	}
	if err := os.MkdirAll(dir, 0o750); err != nil {
		return nil, err
	}
	return &Disk{dir: dir}, nil
}

func (d *Disk) pathFor(id string) string {
	return filepath.Join(d.dir, id)
}

func (d *Disk) Put(_ context.Context, id string, payload []byte) (bool, error) {
	path := d.pathFor(id)
	file, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o640)
	if err != nil {
		if errors.Is(err, os.ErrExist) {
			return false, nil
		}
		return false, ErrUnavailable
	}
	defer file.Close()
	if _, err := file.Write(payload); err != nil {
		_ = file.Close()
		_ = os.Remove(path)
		return false, ErrUnavailable
	}
	if err := file.Sync(); err != nil {
		_ = file.Close()
		_ = os.Remove(path)
		return false, ErrUnavailable
	}
	return true, nil
}

func (d *Disk) Get(_ context.Context, id string) ([]byte, bool, error) {
	payload, err := os.ReadFile(d.pathFor(id))
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, false, nil
		}
		return nil, false, ErrUnavailable
	}
	return payload, true, nil
}

func (d *Disk) Ping(_ context.Context) error {
	info, err := os.Stat(d.dir)
	if err != nil || !info.IsDir() {
		return ErrUnavailable
	}
	probe := filepath.Join(d.dir, ".ready")
	if err := os.WriteFile(probe, []byte("ok"), 0o640); err != nil {
		return ErrUnavailable
	}
	return nil
}
