package api

import (
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/trikto/portfolio/services/onetime-secret/internal/store"
)

const rateLimitWindow = time.Hour

// clientIP extracts the caller address for rate limiting.
//
// Prefer the first X-Forwarded-For hop when Traefik (or Cloudflare → Traefik)
// has already appended the real client. Fall back to RemoteAddr otherwise.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if ip := strings.TrimSpace(parts[0]); ip != "" {
			return ip
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// checkCreateRateLimit increments the per-IP create counter and reports whether
// the request is allowed. Fail closed: a store error is treated as rate-limited
// so a Valkey outage cannot become an unbounded create flood.
func checkCreateRateLimit(r *http.Request, s store.Store, limit int) (allowed bool, err error) {
	key := "ratelimit:create:" + clientIP(r)
	n, err := s.IncrementCounter(r.Context(), key, rateLimitWindow)
	if err != nil {
		return false, err
	}
	return n <= int64(limit), nil
}
