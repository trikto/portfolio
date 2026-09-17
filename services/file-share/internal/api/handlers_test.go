package api_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/trikto/portfolio/services/file-share/internal/api"
	"github.com/trikto/portfolio/services/file-share/internal/config"
	"github.com/trikto/portfolio/services/file-share/internal/store"
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
		cfg.MaxPayloadBytes = 1024
	}
	if cfg.RateLimitPerHour == 0 {
		cfg.RateLimitPerHour = 1000
	}
	return api.New(cfg, fake, nil, nil).Handler()
}

func postBytes(t *testing.T, h http.Handler, path string, body []byte, headers map[string]string) *http.Response {
	t.Helper()
	var r io.Reader
	if body != nil {
		r = bytes.NewReader(body)
	}
	req := httptest.NewRequest(http.MethodPost, path, r)
	req.Header.Set("Content-Type", "application/octet-stream")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec.Result()
}

func TestCreateAndFetchRoundTrip(t *testing.T) {
	fake := store.NewFake()
	h := testServer(t, fake, config.Config{})
	payload := []byte{0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17}
	origin := "https://gajan.dev"

	create := postBytes(t, h, "/api/v1/files", payload, map[string]string{"Origin": origin})
	if create.StatusCode != http.StatusCreated {
		t.Fatalf("create status=%d", create.StatusCode)
	}
	if create.Header.Get("Access-Control-Allow-Origin") != origin {
		t.Fatal("missing CORS on create")
	}
	var created struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(create.Body).Decode(&created); err != nil || created.ID == "" {
		t.Fatalf("create body: %#v err=%v", created, err)
	}
	_ = create.Body.Close()

	fetch := postBytes(t, h, "/api/v1/files/"+created.ID, nil, map[string]string{"Origin": origin})
	defer fetch.Body.Close()
	if fetch.StatusCode != http.StatusOK {
		t.Fatalf("fetch status=%d", fetch.StatusCode)
	}
	got, err := io.ReadAll(fetch.Body)
	if err != nil || !bytes.Equal(got, payload) {
		t.Fatalf("fetch payload=%v err=%v", got, err)
	}

	again := postBytes(t, h, "/api/v1/files/"+created.ID, nil, nil)
	defer again.Body.Close()
	if again.StatusCode != http.StatusOK {
		t.Fatalf("second fetch should succeed, status=%d", again.StatusCode)
	}
}

func TestCreateRejectsEmptyAndOversize(t *testing.T) {
	fake := store.NewFake()
	h := testServer(t, fake, config.Config{MaxPayloadBytes: 8})
	empty := postBytes(t, h, "/api/v1/files", nil, nil)
	if empty.StatusCode != http.StatusBadRequest {
		t.Fatalf("empty status=%d", empty.StatusCode)
	}
	_ = empty.Body.Close()
	big := postBytes(t, h, "/api/v1/files", bytes.Repeat([]byte{1}, 9), nil)
	if big.StatusCode != http.StatusRequestEntityTooLarge {
		t.Fatalf("oversize status=%d", big.StatusCode)
	}
	_ = big.Body.Close()
}

func TestFetchMissAndGetRejected(t *testing.T) {
	fake := store.NewFake()
	h := testServer(t, fake, config.Config{})
	miss := postBytes(t, h, "/api/v1/files/abcdefghijklmnopqrstuv", nil, nil)
	if miss.StatusCode != http.StatusNotFound {
		t.Fatalf("miss status=%d", miss.StatusCode)
	}
	_ = miss.Body.Close()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/files/abcdefghijklmnopqrstuv", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("GET status=%d", rec.Code)
	}
}

func TestStoreUnavailable(t *testing.T) {
	fake := store.NewFake()
	fake.SetFailing(true)
	h := testServer(t, fake, config.Config{})
	create := postBytes(t, h, "/api/v1/files", []byte{1, 2, 3}, nil)
	if create.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("create status=%d", create.StatusCode)
	}
	_ = create.Body.Close()
}

func TestCORSOptions(t *testing.T) {
	fake := store.NewFake()
	h := testServer(t, fake, config.Config{})
	req := httptest.NewRequest(http.MethodOptions, "/api/v1/files", nil)
	req.Header.Set("Origin", "https://gajan.dev")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("options status=%d", rec.Code)
	}
	if rec.Header().Get("Access-Control-Allow-Methods") != "POST, OPTIONS" {
		t.Fatalf("allow methods: %s", rec.Header().Get("Access-Control-Allow-Methods"))
	}
}
