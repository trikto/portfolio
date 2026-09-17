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

func TestDebitSendsTelPrefixAndNumericTrx(t *testing.T) {
	var body map[string]any
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
	if body["subscriberId"] != "tel:94777172633" {
		t.Fatalf("subscriberId=%v", body["subscriberId"])
	}
	if body["paymentInstrument"] != nil || body["paymentInstrumentName"] != nil || body["invoiceNo"] != nil {
		t.Fatalf("unexpected extra fields: %v", body)
	}
	if body["externalTrxId"] != "256091234" || body["amount"] != "5" || body["currency"] != "LKR" {
		t.Fatalf("trx/amount=%v %v %v", body["externalTrxId"], body["amount"], body["currency"])
	}
}
