package api

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/trikto/portfolio/services/file-share/internal/billing"
	"github.com/trikto/portfolio/services/file-share/internal/config"
	"github.com/trikto/portfolio/services/file-share/internal/store"
)

type Debiter interface {
	Debit(ctx context.Context, subscriberID, amount, currency, externalTrxID string) (internalTrxID, statusCode string, err error)
}

type Server struct {
	cfg     config.Config
	store   store.Store
	ledger  *billing.Ledger
	debit   Debiter
	metrics *Metrics
	log     *slog.Logger
	now     func() time.Time
	limit   *limiter
}

func New(cfg config.Config, s store.Store, ledger *billing.Ledger, debit Debiter, metrics *Metrics, log *slog.Logger) *Server {
	if log == nil {
		log = slog.Default()
	}
	return &Server{
		cfg:     cfg,
		store:   s,
		ledger:  ledger,
		debit:   debit,
		metrics: metrics,
		log:     log,
		now:     time.Now,
		limit:   newLimiter(),
	}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.handleHealthz)
	mux.HandleFunc("GET /readyz", s.handleReadyz)
	mux.HandleFunc("GET /api/v1/files/paywall", s.handlePaywall)
	mux.HandleFunc("GET /api/v1/files/grants/{grant}", s.handleGrantStatus)
	mux.HandleFunc("POST /api/v1/files/charge", s.handleCharge)
	mux.HandleFunc("OPTIONS /api/v1/files/charge", s.handleCharge)
	mux.HandleFunc("POST /api/v1/ideamart/charging/notification", s.handleChargingNotification)
	mux.HandleFunc("POST /api/v1/files", s.handleCreate)
	mux.HandleFunc("OPTIONS /api/v1/files", s.handleCreate)
	mux.HandleFunc("POST /api/v1/files/{id}", s.handleFetch)
	mux.HandleFunc("OPTIONS /api/v1/files/{id}", s.handleFetch)
	mux.HandleFunc("GET /api/v1/files/{id}", s.handleFetchMethodNotAllowed)
	return corsMiddleware(s.cfg, s.withNoStore(mux))
}

func (s *Server) withNoStore(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleHealthz(w http.ResponseWriter, r *http.Request) {
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

type createResponse struct {
	ID string `json:"id"`
}

func (s *Server) handleCreate(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	if !s.limit.allow("create:"+clientIP(r), s.cfg.RateLimitPerHour, s.now()) {
		writeError(w, http.StatusTooManyRequests, "rate_limited", "create rate limit exceeded")
		s.observe("create", http.StatusTooManyRequests, start)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, int64(s.cfg.MaxPayloadBytes)+1)
	payload, err := io.ReadAll(r.Body)
	if err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) || errors.Is(err, io.ErrUnexpectedEOF) || strings.Contains(err.Error(), "http: request body too large") {
			writeError(w, http.StatusRequestEntityTooLarge, "payload_too_large", "request body exceeds limit")
			s.observe("create", http.StatusRequestEntityTooLarge, start)
			return
		}
		writeError(w, http.StatusBadRequest, "invalid_request", "could not read ciphertext")
		s.observe("create", http.StatusBadRequest, start)
		return
	}
	if len(payload) == 0 {
		writeError(w, http.StatusBadRequest, "invalid_request", "payload is required")
		s.observe("create", http.StatusBadRequest, start)
		return
	}
	if len(payload) > s.cfg.MaxPayloadBytes {
		writeError(w, http.StatusRequestEntityTooLarge, "payload_too_large", "payload exceeds limit")
		s.observe("create", http.StatusRequestEntityTooLarge, start)
		return
	}

	grant := strings.TrimSpace(r.Header.Get("X-Upload-Grant"))
	if s.cfg.Paywall {
		if grant == "" || !validID(grant) {
			writeError(w, http.StatusPaymentRequired, "payment_required", "create a charge grant before uploading")
			s.observe("create", http.StatusPaymentRequired, start)
			return
		}
		if s.ledger == nil {
			writeError(w, http.StatusServiceUnavailable, "store_unavailable", "billing ledger is not reachable")
			s.observe("create", http.StatusServiceUnavailable, start)
			return
		}
	}

	var id string
	for attempt := 0; attempt < 3; attempt++ {
		id, err = newID()
		if err != nil {
			s.log.Error("id generation failed")
			writeError(w, http.StatusServiceUnavailable, "store_unavailable", "could not allocate identity")
			s.observe("create", http.StatusServiceUnavailable, start)
			return
		}
		if s.cfg.Paywall {
			if _, ok, consumeErr := s.ledger.ConsumeGrant(grant, id); consumeErr != nil {
				writeError(w, http.StatusServiceUnavailable, "store_unavailable", "billing ledger is not reachable")
				s.observe("create", http.StatusServiceUnavailable, start)
				return
			} else if !ok {
				writeError(w, http.StatusPaymentRequired, "payment_required", "charge grant is missing, unpaid, or already used")
				s.observe("create", http.StatusPaymentRequired, start)
				return
			}
		}
		stored, putErr := s.store.Put(r.Context(), id, payload)
		if putErr != nil {
			if s.cfg.Paywall {
				_ = s.ledger.ReleaseGrant(grant)
			}
			writeError(w, http.StatusServiceUnavailable, "store_unavailable", "store is not reachable")
			s.observe("create", http.StatusServiceUnavailable, start)
			return
		}
		if stored {
			break
		}
		if s.cfg.Paywall {
			_ = s.ledger.ReleaseGrant(grant)
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
		s.metrics.PayloadBytes.Observe(float64(len(payload)))
	}

	writeJSON(w, http.StatusCreated, createResponse{ID: id})
	s.observe("create", http.StatusCreated, start)
}

func (s *Server) handleFetch(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	if !s.limit.allow("fetch:"+clientIP(r), s.cfg.RateLimitPerHour, s.now()) {
		writeError(w, http.StatusTooManyRequests, "rate_limited", "fetch rate limit exceeded")
		s.observe("fetch", http.StatusTooManyRequests, start)
		return
	}

	id := r.PathValue("id")
	if !validID(id) {
		if s.metrics != nil {
			s.metrics.FetchMissesTotal.Inc()
		}
		writeError(w, http.StatusNotFound, "not_found", "file not found")
		s.observe("fetch", http.StatusNotFound, start)
		return
	}

	payload, found, err := s.store.Get(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "store_unavailable", "store is not reachable")
		s.observe("fetch", http.StatusServiceUnavailable, start)
		return
	}
	if !found {
		if s.metrics != nil {
			s.metrics.FetchMissesTotal.Inc()
		}
		writeError(w, http.StatusNotFound, "not_found", "file not found")
		s.observe("fetch", http.StatusNotFound, start)
		return
	}

	if s.metrics != nil {
		s.metrics.FetchedTotal.Inc()
	}

	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(payload)
	s.observe("fetch", http.StatusOK, start)
}

func (s *Server) handleFetchMethodNotAllowed(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	w.Header().Set("Allow", "POST, OPTIONS")
	writeError(w, http.StatusMethodNotAllowed, "invalid_request", "download requires POST")
	s.observe("fetch", http.StatusMethodNotAllowed, start)
}

func (s *Server) observe(route string, status int, start time.Time) {
	if s.metrics != nil {
		s.metrics.ObserveHTTP(route, status, time.Since(start))
	}
}

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
	return !strings.ContainsAny(id, "+/=")
}
