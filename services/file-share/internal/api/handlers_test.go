package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/trikto/portfolio/services/file-share/internal/api"
	"github.com/trikto/portfolio/services/file-share/internal/billing"
	"github.com/trikto/portfolio/services/file-share/internal/config"
	"github.com/trikto/portfolio/services/file-share/internal/ideamart"
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
	return api.New(cfg, fake, nil, nil, nil, nil).Handler()
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
	if rec.Header().Get("Access-Control-Allow-Methods") != "GET, POST, OPTIONS" {
		t.Fatalf("allow methods: %s", rec.Header().Get("Access-Control-Allow-Methods"))
	}
}

type fakeDebit struct {
	code     string
	internal string
	err      error
}

func (f *fakeDebit) Debit(_ context.Context, _, _, _, _ string) (string, string, error) {
	if f.err != nil {
		return "", "", f.err
	}
	if f.code != "" && f.code != "S1000" && f.code != ideamart.BenignDebit {
		return "", "", &ideamart.Error{StatusCode: f.code, StatusDetail: f.code}
	}
	return f.internal, "S1000", nil
}

func paywallServer(t *testing.T, debit api.Debiter) http.Handler {
	t.Helper()
	fake := store.NewFake()
	ledger, err := billing.NewLedger(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	cfg := config.Config{
		AllowedOrigins:   []string{config.DefaultAllowedOrigins},
		MaxPayloadBytes:  1024,
		RateLimitPerHour: 1000,
		Paywall:          true,
		Price:            "1.00",
		Currency:         "LKR",
		IdeamartAppID:    "APP_TEST",
	}
	return api.New(cfg, fake, ledger, debit, nil, nil).Handler()
}

func TestPaywallCreateRequiresGrant(t *testing.T) {
	h := paywallServer(t, &fakeDebit{internal: "PAY1"})
	create := postBytes(t, h, "/api/v1/files", []byte{1, 2, 3}, nil)
	if create.StatusCode != http.StatusPaymentRequired {
		t.Fatalf("create status=%d", create.StatusCode)
	}
	_ = create.Body.Close()
}

func TestPaywallChargeThenCreate(t *testing.T) {
	h := paywallServer(t, &fakeDebit{internal: "PAY1"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/files/charge", bytes.NewReader([]byte(`{"subscriberId":"0771234567","consent":true}`)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "https://gajan.dev")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusCreated {
		t.Fatalf("charge status=%d body=%s", rec.Code, rec.Body.String())
	}
	var charged struct {
		Grant  string `json:"grant"`
		Status string `json:"status"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&charged); err != nil || charged.Grant == "" {
		t.Fatalf("charge body: %+v err=%v", charged, err)
	}
	create := postBytes(t, h, "/api/v1/files", []byte{1, 2, 3, 4}, map[string]string{"X-Upload-Grant": charged.Grant})
	if create.StatusCode != http.StatusCreated {
		t.Fatalf("create status=%d", create.StatusCode)
	}
	_ = create.Body.Close()
	again := postBytes(t, h, "/api/v1/files", []byte{1, 2, 3, 4}, map[string]string{"X-Upload-Grant": charged.Grant})
	if again.StatusCode != http.StatusPaymentRequired {
		t.Fatalf("reuse grant status=%d", again.StatusCode)
	}
	_ = again.Body.Close()
}

func TestPaywallInsufficientFunds(t *testing.T) {
	h := paywallServer(t, &fakeDebit{code: "E1378"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/files/charge", bytes.NewReader([]byte(`{"subscriberId":"0771234567","consent":true}`)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusPaymentRequired {
		t.Fatalf("status=%d", rec.Code)
	}
}

func TestChargingNotificationAcksAndMarksPaid(t *testing.T) {
	h := paywallServer(t, &fakeDebit{err: errors.New("timeout")})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/files/charge", bytes.NewReader([]byte(`{"subscriberId":"0771234567","consent":true}`)))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusAccepted {
		t.Fatalf("timeout charge status=%d body=%s", rec.Code, rec.Body.String())
	}
	var pending struct {
		Grant         string `json:"grant"`
		ExternalTrxID string `json:"externalTrxId"`
	}
	if err := json.NewDecoder(rec.Body).Decode(&pending); err != nil {
		t.Fatal(err)
	}
	notify := httptest.NewRequest(http.MethodPost, "/api/v1/ideamart/charging/notification", bytes.NewReader([]byte(`{"applicationId":"APP_TEST","externalTrxId":"`+pending.ExternalTrxID+`","internalTrxId":"PAY9","statusCode":"S1000"}`)))
	notify.Header.Set("Content-Type", "application/json")
	nrec := httptest.NewRecorder()
	h.ServeHTTP(nrec, notify)
	if nrec.Code != http.StatusOK {
		t.Fatalf("notify status=%d", nrec.Code)
	}
	statusReq := httptest.NewRequest(http.MethodGet, "/api/v1/files/grants/"+pending.Grant, nil)
	srec := httptest.NewRecorder()
	h.ServeHTTP(srec, statusReq)
	if srec.Code != http.StatusOK || !bytes.Contains(srec.Body.Bytes(), []byte(`"charged":true`)) {
		t.Fatalf("grant status=%d body=%s", srec.Code, srec.Body.String())
	}
}
