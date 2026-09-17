package ideamart

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGenerateExternalTrxIDIsDigits(t *testing.T) {
	id, err := GenerateExternalTrxID()
	if err != nil {
		t.Fatal(err)
	}
	if !digitsOnly.MatchString(id) || len(id) != 32 {
		t.Fatalf("id=%q", id)
	}
}

func TestDebitSendsWorkingCaasShape(t *testing.T) {
	var body map[string]any
	var contentType, forwardedFor string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		contentType = r.Header.Get("Content-Type")
		forwardedFor = r.Header.Get("X-Forwarded-For")
		raw, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatal(err)
		}
		if err := json.Unmarshal(raw, &body); err != nil {
			t.Fatal(err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"statusCode":"S1000","internalTrxId":"321"}`))
	}))
	t.Cleanup(server.Close)

	client := NewClient("APP_TEST", "secret", server.URL)
	if _, _, err := client.Debit(context.Background(), "0777172633", "5", "LKR", "256091234"); err != nil {
		t.Fatal(err)
	}
	if contentType != "application/json" {
		t.Fatalf("Content-Type=%q", contentType)
	}
	if forwardedFor != egressForwardedFor {
		t.Fatalf("X-Forwarded-For=%q", forwardedFor)
	}
	if body["applicationId"] != "APP_TEST" {
		t.Fatalf("applicationId=%v", body["applicationId"])
	}
	if body["subscriberId"] != "tel:94777172633" {
		t.Fatalf("subscriberId=%v", body["subscriberId"])
	}
	if body["paymentInstrumentName"] != "Mobile Account" {
		t.Fatalf("paymentInstrumentName=%v", body["paymentInstrumentName"])
	}
	if body["invoiceNo"] != "SOME_INV_NO_256091234" {
		t.Fatalf("invoiceNo=%v", body["invoiceNo"])
	}
	if body["externalTrxId"] != "256091234" || body["amount"] != "5" {
		t.Fatalf("trx/amount=%v %v", body["externalTrxId"], body["amount"])
	}
	if body["curenncy"] != "LKR" {
		t.Fatalf("curenncy=%v", body["curenncy"])
	}
	if _, ok := body["currency"]; ok {
		t.Fatalf("unexpected currency field: %v", body["currency"])
	}
}

func TestDebitRejectsNonNumericTrx(t *testing.T) {
	client := NewClient("APP_TEST", "secret", "http://example.invalid")
	if _, _, err := client.Debit(context.Background(), "0777172633", "5", "LKR", "INV-1"); err == nil {
		t.Fatal("expected invalid externalTrxId")
	}
}
