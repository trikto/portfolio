package ideamart

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"time"
)

var digitsOnly = regexp.MustCompile(`^[0-9]{1,32}$`)

const timeout = 15 * time.Second
const BenignDebit = "E1379"
const paymentInstrumentName = "Mobile Account"

// Contabo K3s egress IP. Ideamart CaaS accepts the working NCS debit with this header.
const egressForwardedFor = "169.58.129.207"

type Error struct {
	StatusCode   string
	StatusDetail string
}

func (e *Error) Error() string {
	return fmt.Sprintf("[%s] %s", e.StatusCode, e.StatusDetail)
}

type Client struct {
	applicationID string
	password      string
	debitURL      string
	http          *http.Client
}

func NewClient(applicationID, password, debitURL string) *Client {
	return &Client{
		applicationID: applicationID,
		password:      password,
		debitURL:      debitURL,
		http:          &http.Client{Timeout: timeout},
	}
}

func GenerateExternalTrxID() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	for i := range buf {
		buf[i] = '0' + buf[i]%10
	}
	return string(buf), nil
}

func (c *Client) Debit(ctx context.Context, subscriberID, amount, currency, externalTrxID string) (internalTrxID, statusCode string, err error) {
	if c == nil || c.debitURL == "" {
		return "", "", fmt.Errorf("caas debit is not configured")
	}
	if !digitsOnly.MatchString(externalTrxID) {
		return "", "", fmt.Errorf("externalTrxId is invalid")
	}
	subscriber, err := ToTelAddress(subscriberID)
	if err != nil {
		return "", "", err
	}
	if currency == "" {
		currency = "LKR"
	}
	data, err := c.post(ctx, map[string]any{
		"invoiceNo":             "SOME_INV_NO_" + externalTrxID,
		"externalTrxId":         externalTrxID,
		"amount":                amount,
		"paymentInstrumentName": paymentInstrumentName,
		"subscriberId":          subscriber,
		"curenncy":              currency,
	})
	if err != nil {
		return "", "", err
	}
	internal, _ := data["internalTrxId"].(string)
	code, _ := data["statusCode"].(string)
	return internal, code, nil
}

func (c *Client) post(ctx context.Context, body map[string]any) (map[string]any, error) {
	payload := map[string]any{
		"applicationId": c.applicationID,
		"password":      c.password,
	}
	for key, value := range body {
		payload[key] = value
	}

	encoded, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, c.debitURL, bytes.NewReader(encoded))
	if err != nil {
		return nil, err
	}
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Forwarded-For", egressForwardedFor)
	response, err := c.http.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(response.Body, 1<<20))
	if err != nil {
		return nil, err
	}
	var data map[string]any
	if err := json.Unmarshal(raw, &data); err != nil {
		return nil, fmt.Errorf("non-JSON caas response")
	}
	statusCode, _ := data["statusCode"].(string)
	statusDetail, _ := data["statusDetail"].(string)
	if statusCode == "S1000" || statusCode == BenignDebit {
		return data, nil
	}
	return nil, &Error{StatusCode: statusCode, StatusDetail: statusDetail}
}
