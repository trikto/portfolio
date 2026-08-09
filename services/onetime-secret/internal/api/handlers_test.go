package api_test

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/trikto/portfolio/services/onetime-secret/internal/api"
	"github.com/trikto/portfolio/services/onetime-secret/internal/config"
	"github.com/trikto/portfolio/services/onetime-secret/internal/store"
)

func testServer(t *testing.T, fake *store.Fake, cfg config.Config) http.Handler {
	t.Helper()
	if cfg.Port == "" {
		cfg.Port = config.DefaultPort
	}
	if cfg.MetricsPort == "" {
		cfg.MetricsPort = config.DefaultMetricsPort
	}
	if len(cfg.AllowedOrigins) == 0 {
		cfg.AllowedOrigins = []string{config.DefaultAllowedOrigins}
	}
	if cfg.MaxPayloadBytes == 0 {
		cfg.MaxPayloadBytes = config.DefaultMaxPayloadBytes
	}
	if cfg.RateLimitPerHour == 0 {
		cfg.RateLimitPerHour = 1000
	}
	return api.New(cfg, fake, nil, nil).Handler()
}

func validPayload(size int) string {
	raw := make([]byte, size)
	for i := range raw {
		raw[i] = byte(i % 251)
	}
	return base64.RawURLEncoding.EncodeToString(raw)
}

func postJSON(t *testing.T, h http.Handler, path string, body any, headers map[string]string) *http.Response {
	t.Helper()
	var r io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatal(err)
		}
		r = bytes.NewReader(b)
	}
	req := httptest.NewRequest(http.MethodPost, path, r)
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec.Result()
}

func decodeJSON(t *testing.T, resp *http.Response, dest any) {
	t.Helper()
	defer resp.Body.Close()
	if err := json.NewDecoder(resp.Body).Decode(dest); err != nil {
		t.Fatalf("decode: %v", err)
	}
}

func TestCreateTTLValidation(t *testing.T) {
	fake := store.NewFake()
	h := testServer(t, fake, config.Config{})
	payload := validPayload(32)

	cases := []struct {
		name   string
		ttl    any
		status int
		code   string
	}{
		{name: "1h", ttl: 3600, status: http.StatusCreated},
		{name: "24h", ttl: 86400, status: http.StatusCreated},
		{name: "7d", ttl: 604800, status: http.StatusCreated},
		{name: "rejected", ttl: 120, status: http.StatusBadRequest, code: "invalid_request"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			resp := postJSON(t, h, "/api/v1/secrets", map[string]any{"payload": payload, "ttl": tc.ttl}, nil)
			if resp.StatusCode != tc.status {
				t.Fatalf("status=%d want=%d", resp.StatusCode, tc.status)
			}
			if tc.code != "" {
				var body map[string]string
				decodeJSON(t, resp, &body)
				if body["error"] != tc.code {
					t.Fatalf("error=%q want=%q", body["error"], tc.code)
				}
			} else {
				var body map[string]string
				decodeJSON(t, resp, &body)
				if body["id"] == "" || body["expiresAt"] == "" {
					t.Fatalf("missing id/expiresAt: %#v", body)
				}
				if _, err := time.Parse(time.RFC3339, body["expiresAt"]); err != nil {
					t.Fatalf("expiresAt not RFC3339: %v", err)
				}
			}
		})
	}
}

func TestCreatePayloadSizeCap(t *testing.T) {
	fake := store.NewFake()
	h := testServer(t, fake, config.Config{MaxPayloadBytes: 64, RateLimitPerHour: 1000})

	ok := postJSON(t, h, "/api/v1/secrets", map[string]any{"payload": validPayload(64), "ttl": 3600}, nil)
	if ok.StatusCode != http.StatusCreated {
		t.Fatalf("64-byte payload status=%d", ok.StatusCode)
	}
	ok.Body.Close()

	tooBig := postJSON(t, h, "/api/v1/secrets", map[string]any{"payload": validPayload(65), "ttl": 3600}, nil)
	defer tooBig.Body.Close()
	if tooBig.StatusCode != http.StatusRequestEntityTooLarge {
		t.Fatalf("status=%d want=413", tooBig.StatusCode)
	}
	var body map[string]string
	decodeJSON(t, tooBig, &body)
	if body["error"] != "payload_too_large" {
		t.Fatalf("error=%q", body["error"])
	}
}

func TestCreateRejectsNonBase64URL(t *testing.T) {
	fake := store.NewFake()
	h := testServer(t, fake, config.Config{})

	cases := []string{
		"not!valid",
		base64.StdEncoding.EncodeToString([]byte("hello")), // padding / + /
		"",
	}
	for _, payload := range cases {
		resp := postJSON(t, h, "/api/v1/secrets", map[string]any{"payload": payload, "ttl": 3600}, nil)
		if resp.StatusCode != http.StatusBadRequest {
			t.Fatalf("payload %q status=%d want=400", payload, resp.StatusCode)
		}
		var body map[string]string
		decodeJSON(t, resp, &body)
		if body["error"] != "invalid_request" {
			t.Fatalf("error=%q", body["error"])
		}
	}
}

func TestBurnOnce(t *testing.T) {
	fake := store.NewFake()
	h := testServer(t, fake, config.Config{})
	payload := validPayload(48)

	create := postJSON(t, h, "/api/v1/secrets", map[string]any{"payload": payload, "ttl": 3600}, nil)
	var created map[string]string
	decodeJSON(t, create, &created)
	id := created["id"]

	first := postJSON(t, h, "/api/v1/secrets/"+id+"/burn", nil, nil)
	var burned map[string]string
	decodeJSON(t, first, &burned)
	if first.StatusCode != http.StatusOK || burned["payload"] != payload {
		t.Fatalf("first burn status=%d payload mismatch", first.StatusCode)
	}

	second := postJSON(t, h, "/api/v1/secrets/"+id+"/burn", nil, nil)
	defer second.Body.Close()
	if second.StatusCode != http.StatusNotFound {
		t.Fatalf("second burn status=%d want=404", second.StatusCode)
	}
	var miss map[string]string
	decodeJSON(t, second, &miss)
	if miss["error"] != "not_found" {
		t.Fatalf("error=%q", miss["error"])
	}
}

func TestConcurrentBurnExactlyOneWinner(t *testing.T) {
	fake := store.NewFake()
	h := testServer(t, fake, config.Config{})
	payload := validPayload(32)

	create := postJSON(t, h, "/api/v1/secrets", map[string]any{"payload": payload, "ttl": 3600}, nil)
	var created map[string]string
	decodeJSON(t, create, &created)
	id := created["id"]

	const n = 32
	var wins atomic.Int64
	var misses atomic.Int64
	var unexpected atomic.Int64
	var wg sync.WaitGroup
	wg.Add(n)
	for i := 0; i < n; i++ {
		go func() {
			defer wg.Done()
			req := httptest.NewRequest(http.MethodPost, "/api/v1/secrets/"+id+"/burn", nil)
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			switch rec.Code {
			case http.StatusOK:
				wins.Add(1)
			case http.StatusNotFound:
				misses.Add(1)
			default:
				unexpected.Add(1)
			}
		}()
	}
	wg.Wait()

	if unexpected.Load() != 0 {
		t.Fatalf("unexpected statuses=%d", unexpected.Load())
	}
	if wins.Load() != 1 {
		t.Fatalf("winners=%d want=1", wins.Load())
	}
	if misses.Load() != n-1 {
		t.Fatalf("misses=%d want=%d", misses.Load(), n-1)
	}
}

func TestCORS(t *testing.T) {
	fake := store.NewFake()
	h := testServer(t, fake, config.Config{AllowedOrigins: []string{"https://gajan.dev"}})

	t.Run("allowed origin preflight", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/api/v1/secrets", nil)
		req.Header.Set("Origin", "https://gajan.dev")
		req.Header.Set("Access-Control-Request-Method", "POST")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Code != http.StatusNoContent {
			t.Fatalf("status=%d", rec.Code)
		}
		if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://gajan.dev" {
			t.Fatalf("Allow-Origin=%q", got)
		}
		if !strings.Contains(rec.Header().Get("Access-Control-Allow-Methods"), "POST") {
			t.Fatalf("Allow-Methods=%q", rec.Header().Get("Access-Control-Allow-Methods"))
		}
		if rec.Header().Get("Access-Control-Allow-Credentials") != "" {
			t.Fatal("credentials must not be allowed")
		}
	})

	t.Run("disallowed origin", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodOptions, "/api/v1/secrets", nil)
		req.Header.Set("Origin", "https://evil.example")
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		if rec.Header().Get("Access-Control-Allow-Origin") != "" {
			t.Fatal("disallowed origin must not receive ACAO")
		}
	})

	t.Run("create response carries CORS", func(t *testing.T) {
		resp := postJSON(t, h, "/api/v1/secrets", map[string]any{"payload": validPayload(16), "ttl": 3600}, map[string]string{"Origin": "https://gajan.dev"})
		defer resp.Body.Close()
		if resp.Header.Get("Access-Control-Allow-Origin") != "https://gajan.dev" {
			t.Fatalf("Allow-Origin=%q", resp.Header.Get("Access-Control-Allow-Origin"))
		}
		if resp.Header.Get("Cache-Control") != "no-store" {
			t.Fatalf("Cache-Control=%q", resp.Header.Get("Cache-Control"))
		}
	})
}

func TestBurnNotOnGET(t *testing.T) {
	fake := store.NewFake()
	h := testServer(t, fake, config.Config{})
	payload := validPayload(16)

	create := postJSON(t, h, "/api/v1/secrets", map[string]any{"payload": payload, "ttl": 3600}, nil)
	var created map[string]string
	decodeJSON(t, create, &created)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/secrets/"+created["id"]+"/burn", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status=%d want=405", rec.Code)
	}
	if fake.Len() != 1 {
		t.Fatalf("GET must not burn; remaining=%d", fake.Len())
	}
}

func TestCreateFailClosedWhenStoreDown(t *testing.T) {
	fake := store.NewFake()
	fake.SetDown(true)
	h := testServer(t, fake, config.Config{})

	resp := postJSON(t, h, "/api/v1/secrets", map[string]any{"payload": validPayload(16), "ttl": 3600}, nil)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("status=%d want=503", resp.StatusCode)
	}
	var body map[string]string
	decodeJSON(t, resp, &body)
	if body["error"] != "store_unavailable" {
		t.Fatalf("error=%q", body["error"])
	}
}

func TestReadyzDependsOnStore(t *testing.T) {
	fake := store.NewFake()
	h := testServer(t, fake, config.Config{})

	req := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("ready status=%d", rec.Code)
	}

	fake.SetDown(true)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("ready-down status=%d", rec.Code)
	}

	// Liveness stays up.
	health := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, health)
	if rec.Code != http.StatusOK {
		t.Fatalf("health status=%d", rec.Code)
	}
}

func TestRateLimit(t *testing.T) {
	fake := store.NewFake()
	h := testServer(t, fake, config.Config{RateLimitPerHour: 2, MaxPayloadBytes: 1024})

	for i := 0; i < 2; i++ {
		resp := postJSON(t, h, "/api/v1/secrets", map[string]any{"payload": validPayload(8), "ttl": 3600}, nil)
		if resp.StatusCode != http.StatusCreated {
			t.Fatalf("create %d status=%d", i, resp.StatusCode)
		}
		resp.Body.Close()
	}
	resp := postJSON(t, h, "/api/v1/secrets", map[string]any{"payload": validPayload(8), "ttl": 3600}, nil)
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("status=%d want=429", resp.StatusCode)
	}
	var body map[string]string
	decodeJSON(t, resp, &body)
	if body["error"] != "rate_limited" {
		t.Fatalf("error=%q", body["error"])
	}
}
