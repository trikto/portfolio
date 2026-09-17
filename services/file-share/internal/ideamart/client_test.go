package ideamart

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestDebitSendsMobileAccountAndDigits(t *testing.T) {
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
	if _, _, err := client.Debit(context.Background(), "0776351232", "1", "LKR", "12345678901234567890123456789012"); err != nil {
		t.Fatal(err)
	}
	if body["subscriberId"] != "94776351232" {
		t.Fatalf("subscriberId=%v", body["subscriberId"])
	}
	if body["paymentInstrument"] != "MobileAccount" {
		t.Fatalf("paymentInstrument=%v", body["paymentInstrument"])
	}
	if body["amount"] != "1" || body["currency"] != "LKR" {
		t.Fatalf("amount/currency=%v %v", body["amount"], body["currency"])
	}
}
