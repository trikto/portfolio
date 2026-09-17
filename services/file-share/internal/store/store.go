package store

import (
	"context"
	"errors"
)

var ErrUnavailable = errors.New("store unavailable")

type Store interface {
	Put(ctx context.Context, id string, payload []byte) (created bool, err error)
	Get(ctx context.Context, id string) (payload []byte, found bool, err error)
	Ping(ctx context.Context) error
}
