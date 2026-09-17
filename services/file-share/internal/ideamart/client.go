package ideamart

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"time"
)

var digitsOnly = regexp.MustCompile(`^[0-9]{1,32}$`)

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
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	for i := range buf {
		buf[i] = '0' + buf[i]%10
	}
	return string(buf), nil
}

// #region agent log
func debugAgentLog(hypothesisID, location, message string, data map[string]any) {
	payload := map[string]any{
		"sessionId":    "dee627",
		"runId":        "pre-fix",
		"hypothesisId": hypothesisID,
		"location":     location,
		"message":      message,
		"data":         data,
		"timestamp":    time.Now().UnixMilli(),
	}
	encoded, err := json.Marshal(payload)
	if err != nil {
		return
	}
	if f, err := os.OpenFile(`C:\Users\gajan.r\Desktop\html\portfolio\debug-dee627.log`, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644); err == nil {
		_, _ = f.Write(append(encoded, '\n'))
		_ = f.Close()
	}
	req, err := http.NewRequest(http.MethodPost, "http://127.0.0.1:7461/ingest/239b8336-8a74-41c4-9cc3-f981d2d37f9b", bytes.NewReader(encoded))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Debug-Session-Id", "dee627")
	go func() {
		client := &http.Client{Timeout: 400 * time.Millisecond}
		resp, err := client.Do(req)
		if err == nil {
			_ = resp.Body.Close()
		}
	}()
}

// #endregion

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
	// #region agent log
	debugAgentLog("K", "client.go:Debit", "caas debit payload shape", map[string]any{
		"trxLen":           len(externalTrxID),
		"trxAllDigits":     digitsOnly.MatchString(externalTrxID),
		"subscriberLen":    len(subscriber),
		"subscriberHasTel": len(subscriber) >= 4 && subscriber[:4] == "tel:",
		"amount":           amount,
	})
	// #endregion
	data, err := c.post(ctx, map[string]any{
		"externalTrxId": externalTrxID,
		"subscriberId":  subscriber,
		"amount":        amount,
		"currency":      currency,
	})
	if err != nil {
		code := ""
		if e, ok := err.(*Error); ok {
			code = e.StatusCode
		}
		// #region agent log
		debugAgentLog("B", "client.go:Debit", "caas debit failed", map[string]any{
			"statusCode":       code,
			"subscriberHasTel": len(subscriber) >= 4 && subscriber[:4] == "tel:",
			"subscriberLen":    len(subscriber),
			"trxAllDigits":     true,
		})
		// #endregion
		return "", "", err
	}
	internal, _ := data["internalTrxId"].(string)
	code, _ := data["statusCode"].(string)
	// #region agent log
	debugAgentLog("B", "client.go:Debit", "caas debit ok", map[string]any{"statusCode": code, "subscriberLen": len(subscriber)})
	// #endregion
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
	statusDetail, _ := data["statusDetail"].(string)
	// #region agent log
	debugAgentLog("C", "client.go:post", "ideamart status", map[string]any{
		"httpStatus":   response.StatusCode,
		"statusCode":   statusCode,
		"statusDetail": statusDetail,
	})
	// #endregion
	if statusCode == "S1000" || statusCode == BenignDebit {
		return data, nil
	}
	return nil, &Error{StatusCode: statusCode, StatusDetail: statusDetail}
}
