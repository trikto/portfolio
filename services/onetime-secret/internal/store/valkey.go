package store

import (
	"context"
	"errors"
	"time"

	"github.com/redis/go-redis/v9"
)

// Valkey is a Store backed by Valkey (or any Redis-compatible server).
//
// The deployed Valkey runs with persistence disabled entirely: no RDB snapshot,
// no AOF, no volume. Ciphertext therefore never touches a disk, and a restart
// drops every pending secret — the safe direction to fail for this product.
type Valkey struct {
	client *redis.Client
}

// NewValkey builds a client. It does not dial; the first command or Ping does.
func NewValkey(addr string) *Valkey {
	return &Valkey{client: redis.NewClient(&redis.Options{
		Addr:         addr,
		DialTimeout:  2 * time.Second,
		ReadTimeout:  2 * time.Second,
		WriteTimeout: 2 * time.Second,
		PoolSize:     10,
		MaxRetries:   1,
	})}
}

// Put issues SET secret:<id> <record> EX <ttl> NX.
//
// NX is load-bearing: without it a (vanishingly unlikely, but silent) id
// collision would overwrite a live secret, and the first owner's link would
// hand out someone else's ciphertext.
func (v *Valkey) Put(ctx context.Context, id string, rec Record, ttl time.Duration) (bool, error) {
	stored, err := v.client.SetNX(ctx, SecretKey(id), EncodeRecord(rec), ttl).Result()
	if err != nil {
		return false, unavailable("set", err)
	}
	return stored, nil
}

// Burn issues GETDEL secret:<id>.
//
// This must stay a single command. GET followed by DEL leaves a window in which
// two concurrent readers both observe the payload before either delete lands,
// which silently turns a one-time secret into a two-time secret. GETDEL makes
// the read and the delete one atomic step, so exactly one caller can ever win.
func (v *Valkey) Burn(ctx context.Context, id string) (Record, bool, error) {
	raw, err := v.client.GetDel(ctx, SecretKey(id)).Result()
	if errors.Is(err, redis.Nil) {
		return Record{}, false, nil
	}
	if err != nil {
		return Record{}, false, unavailable("getdel", err)
	}
	rec, err := DecodeRecord(raw)
	if err != nil {
		// The entry is already gone; treat an unparseable value as a miss
		// rather than handing the caller something it cannot decrypt.
		return Record{}, false, nil
	}
	return rec, true, nil
}

// IncrementCounter implements INCR with an EXPIRE applied on first use, so a
// rate-limit bucket cannot outlive its hour.
func (v *Valkey) IncrementCounter(ctx context.Context, key string, ttl time.Duration) (int64, error) {
	n, err := v.client.Incr(ctx, key).Result()
	if err != nil {
		return 0, unavailable("incr", err)
	}
	if n == 1 {
		if err := v.client.Expire(ctx, key, ttl).Err(); err != nil {
			// Report the failure so the caller fails closed: an un-expiring
			// bucket would otherwise lock this IP out permanently.
			return 0, unavailable("expire", err)
		}
	}
	return n, nil
}

func (v *Valkey) Ping(ctx context.Context) error {
	if err := v.client.Ping(ctx).Err(); err != nil {
		return unavailable("ping", err)
	}
	return nil
}

func (v *Valkey) Close() error { return v.client.Close() }
