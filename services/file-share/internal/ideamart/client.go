package ideamart

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const timeout = 15 * time.Second
const BenignDebit = "E1379"

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
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func (c *Client) Debit(ctx context.Context, subscriberID, amount, currency, externalTrxID string) (internalTrxID, statusCode string, err error) {
	if c == nil || c.debitURL == "" {
		return "", "", fmt.Errorf("caas debit is not configured")
	}
	if externalTrxID == "" || len(externalTrxID) > 32 {
		return "", "", fmt.Errorf("externalTrxId is invalid")
	}
	address, err := ToTelAddress(subscriberID)
	if err != nil {
		return "", "", err
	}
	if currency == "" {
		currency = "LKR"
	}
	// CaaS debit sample uses tel:9477…; the gateway returns E1325 when this format is missing or malformed.
	data, err := c.post(ctx, map[string]any{
		"externalTrxId": externalTrxID,
		"subscriberId":  address,
		"amount":        amount,
		"currency":      currency,
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
	if statusCode == "S1000" || statusCode == BenignDebit {
		return data, nil
	}
	statusDetail, _ := data["statusDetail"].(string)
	return nil, &Error{StatusCode: statusCode, StatusDetail: statusDetail}
}
