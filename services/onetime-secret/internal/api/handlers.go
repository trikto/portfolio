package api

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/trikto/portfolio/services/onetime-secret/internal/config"
	"github.com/trikto/portfolio/services/onetime-secret/internal/store"
)

// Allowed TTL values match the frontend SECRET_TTLS contract exactly.
var allowedTTLs = map[int64]struct{}{
	3600:   {},
	86400:  {},
	604800: {},
}

// Server is the HTTP API surface over a Store.
type Server struct {
	cfg     config.Config
	store   store.Store
	metrics *Metrics
	log     *slog.Logger
	now     func() time.Time
}

// New builds a Server. metrics may be nil in tests that do not assert on it.
func New(cfg config.Config, s store.Store, metrics *Metrics, log *slog.Logger) *Server {
	if log == nil {
		log = slog.Default()
	}
	return &Server{
		cfg:     cfg,
		store:   s,
		metrics: metrics,
		log:     log,
		now:     time.Now,
	}
}

// Handler returns the API mux wrapped with CORS and Cache-Control defaults.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.handleHealthz)
	mux.HandleFunc("GET /readyz", s.handleReadyz)
	mux.HandleFunc("POST /api/v1/secrets", s.handleCreate)
	mux.HandleFunc("OPTIONS /api/v1/secrets", s.handleCreate) // CORS middleware short-circuits OPTIONS
	mux.HandleFunc("POST /api/v1/secrets/{id}/burn", s.handleBurn)
	mux.HandleFunc("OPTIONS /api/v1/secrets/{id}/burn", s.handleBurn)
	// Burn is POST-only. A GET would let link unfurlers (Slack, iMessage, email
	// clients, corporate proxies) silently consume the one-time secret before
	// the recipient ever opens it.
	mux.HandleFunc("GET /api/v1/secrets/{id}/burn", s.handleBurnMethodNotAllowed)

	return corsMiddleware(s.cfg, s.withNoStore(mux))
}

func (s *Server) withNoStore(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleHealthz(w http.ResponseWriter, r *http.Request) {
	// Liveness must not depend on Valkey: a store outage should mark the pod
	// NotReady, not kill and restart it in a loop.
	start := time.Now()
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
	s.observe("healthz", http.StatusOK, start)
}

func (s *Server) handleReadyz(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	if err := s.store.Ping(r.Context()); err != nil {
		if s.metrics != nil {
			s.metrics.StoreUp.Set(0)
		}
		writeError(w, http.StatusServiceUnavailable, "store_unavailable", "store is not reachable")
		s.observe("readyz", http.StatusServiceUnavailable, start)
		return
	}
	if s.metrics != nil {
		s.metrics.StoreUp.Set(1)
	}
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
	s.observe("readyz", http.StatusOK, start)
}

type createRequest struct {
	Payload string `json:"payload"`
	TTL     int64  `json:"ttl"`
}

type createResponse struct {
	ID        string `json:"id"`
	ExpiresAt string `json:"expiresAt"`
}

func (s *Server) handleCreate(w http.ResponseWriter, r *http.Request) {
	start := time.Now()

	allowed, err := checkCreateRateLimit(r, s.store, s.cfg.RateLimitPerHour)
	if err != nil {
		s.log.Warn("rate limit store unavailable")
		writeError(w, http.StatusServiceUnavailable, "store_unavailable", "store is not reachable")
		s.observe("create", http.StatusServiceUnavailable, start)
		return
	}
	if !allowed {
		writeError(w, http.StatusTooManyRequests, "rate_limited", "create rate limit exceeded")
		s.observe("create", http.StatusTooManyRequests, start)
		return
	}

	// Cap the raw body before JSON decode so a huge request cannot allocate.
	r.Body = http.MaxBytesReader(w, r.Body, int64(s.cfg.MaxPayloadBytes)+4096)

	var req createRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) || errors.Is(err, io.ErrUnexpectedEOF) || strings.Contains(err.Error(), "http: request body too large") {
			writeError(w, http.StatusRequestEntityTooLarge, "payload_too_large", "request body exceeds limit")
			s.observe("create", http.StatusRequestEntityTooLarge, start)
			return
		}
		writeError(w, http.StatusBadRequest, "invalid_request", "request body must be JSON with payload and ttl")
		s.observe("create", http.StatusBadRequest, start)
		return
	}

	if _, ok := allowedTTLs[req.TTL]; !ok {
		writeError(w, http.StatusBadRequest, "invalid_request", "ttl must be 3600, 86400, or 604800")
		s.observe("create", http.StatusBadRequest, start)
		return
	}

	if req.Payload == "" {
		writeError(w, http.StatusBadRequest, "invalid_request", "payload is required")
		s.observe("create", http.StatusBadRequest, start)
		return
	}

	decoded, err := base64.RawURLEncoding.DecodeString(req.Payload)
	if err != nil {
		// Also reject standard base64 with padding: the contract is base64url only.
		writeError(w, http.StatusBadRequest, "invalid_request", "payload must be base64url without padding")
		s.observe("create", http.StatusBadRequest, start)
		return
	}
	if len(decoded) == 0 {
		writeError(w, http.StatusBadRequest, "invalid_request", "payload is empty")
		s.observe("create", http.StatusBadRequest, start)
		return
	}
	if len(decoded) > s.cfg.MaxPayloadBytes {
		writeError(w, http.StatusRequestEntityTooLarge, "payload_too_large", "decoded payload exceeds limit")
		s.observe("create", http.StatusRequestEntityTooLarge, start)
		return
	}

	now := s.now().UTC()
	ttl := time.Duration(req.TTL) * time.Second
	rec := store.Record{CreatedAt: now, Payload: req.Payload}

	var id string
	for attempt := 0; attempt < 3; attempt++ {
		id, err = newID()
		if err != nil {
			s.log.Error("id generation failed")
			writeError(w, http.StatusServiceUnavailable, "store_unavailable", "could not allocate identity")
			s.observe("create", http.StatusServiceUnavailable, start)
			return
		}
		stored, putErr := s.store.Put(r.Context(), id, rec, ttl)
		if putErr != nil {
			if errors.Is(putErr, store.ErrUnavailable) {
				writeError(w, http.StatusServiceUnavailable, "store_unavailable", "store is not reachable")
				s.observe("create", http.StatusServiceUnavailable, start)
				return
			}
			s.log.Error("store put failed")
			writeError(w, http.StatusServiceUnavailable, "store_unavailable", "store is not reachable")
			s.observe("create", http.StatusServiceUnavailable, start)
			return
		}
		if stored {
			break
		}
		if attempt == 2 {
			s.log.Error("id collision retries exhausted")
			writeError(w, http.StatusServiceUnavailable, "store_unavailable", "could not allocate identity")
			s.observe("create", http.StatusServiceUnavailable, start)
			return
		}
	}

	if s.metrics != nil {
		s.metrics.CreatedTotal.Inc()
		s.metrics.PayloadBytes.Observe(float64(len(decoded)))
	}

	writeJSON(w, http.StatusCreated, createResponse{
		ID:        id,
		ExpiresAt: now.Add(ttl).Format(time.RFC3339),
	})
	s.observe("create", http.StatusCreated, start)
}

type burnResponse struct {
	Payload string `json:"payload"`
}

func (s *Server) handleBurn(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	id := r.PathValue("id")
	if !validID(id) {
		// Indistinguishable from a miss: never confirm that an id looks wrong.
		if s.metrics != nil {
			s.metrics.BurnMissesTotal.Inc()
		}
		writeError(w, http.StatusNotFound, "not_found", "secret not found")
		s.observe("burn", http.StatusNotFound, start)
		return
	}

	rec, found, err := s.store.Burn(r.Context(), id)
	if err != nil {
		if errors.Is(err, store.ErrUnavailable) {
			writeError(w, http.StatusServiceUnavailable, "store_unavailable", "store is not reachable")
			s.observe("burn", http.StatusServiceUnavailable, start)
			return
		}
		s.log.Error("store burn failed")
		writeError(w, http.StatusServiceUnavailable, "store_unavailable", "store is not reachable")
		s.observe("burn", http.StatusServiceUnavailable, start)
		return
	}
	if !found {
		if s.metrics != nil {
			s.metrics.BurnMissesTotal.Inc()
		}
		writeError(w, http.StatusNotFound, "not_found", "secret not found")
		s.observe("burn", http.StatusNotFound, start)
		return
	}

	if s.metrics != nil {
		s.metrics.BurnedTotal.Inc()
		s.metrics.TimeToBurn.Observe(s.now().UTC().Sub(rec.CreatedAt).Seconds())
	}

	writeJSON(w, http.StatusOK, burnResponse{Payload: rec.Payload})
	s.observe("burn", http.StatusOK, start)
}

func (s *Server) handleBurnMethodNotAllowed(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	w.Header().Set("Allow", "POST, OPTIONS")
	writeError(w, http.StatusMethodNotAllowed, "invalid_request", "burn requires POST")
	s.observe("burn", http.StatusMethodNotAllowed, start)
}

func (s *Server) observe(route string, status int, start time.Time) {
	if s.metrics != nil {
		s.metrics.ObserveHTTP(route, status, time.Since(start))
	}
}

// validID accepts the base64url alphabet (no padding) at the length we mint
// (≥128-bit → 22 chars) with a little room for future length changes.
func validID(id string) bool {
	if len(id) < 16 || len(id) > 64 {
		return false
	}
	for _, c := range id {
		if (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '-' || c == '_' {
			continue
		}
		return false
	}
	// Reject padding characters that somehow slipped past.
	return !strings.ContainsAny(id, "+/=")
}
