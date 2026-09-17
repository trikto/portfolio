package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/trikto/portfolio/services/file-share/internal/billing"
	"github.com/trikto/portfolio/services/file-share/internal/ideamart"
)

const consentVersion = "files-sender-pays-v1"

func (s *Server) handlePaywall(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"enabled":  s.cfg.Paywall,
		"amount":   s.cfg.Price,
		"currency": s.cfg.Currency,
	})
}

func (s *Server) handleGrantStatus(w http.ResponseWriter, r *http.Request) {
	grant := r.PathValue("grant")
	if s.ledger == nil || !validID(grant) {
		writeError(w, http.StatusNotFound, "not_found", "grant not found")
		return
	}
	charge, ok, err := s.ledger.GetByGrant(grant)
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "store_unavailable", "billing ledger is not reachable")
		return
	}
	if !ok {
		writeError(w, http.StatusNotFound, "not_found", "grant not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"status":  charge.Status,
		"charged": charge.Status == billing.StatusCharged,
		"used":    charge.GrantUsed,
	})
}

type chargeRequest struct {
	SubscriberID string `json:"subscriberId"`
	Consent      bool   `json:"consent"`
}

func (s *Server) handleCharge(w http.ResponseWriter, r *http.Request) {
	start := s.now()
	if !s.cfg.Paywall || s.ledger == nil || s.debit == nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "sender-pays charging is not enabled")
		s.observe("charge", http.StatusBadRequest, start)
		return
	}
	if !s.limit.allow("charge:"+clientIP(r), s.cfg.RateLimitPerHour, s.now()) {
		writeError(w, http.StatusTooManyRequests, "rate_limited", "charge rate limit exceeded")
		s.observe("charge", http.StatusTooManyRequests, start)
		return
	}

	var req chargeRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096)).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "request body must be JSON with subscriberId and consent")
		s.observe("charge", http.StatusBadRequest, start)
		return
	}
	if !req.Consent {
		writeError(w, http.StatusBadRequest, "invalid_request", "explicit consent is required before charging")
		s.observe("charge", http.StatusBadRequest, start)
		return
	}
	address, err := ideamart.ToTelAddress(req.SubscriberID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid_request", "subscriberId must be a Sri Lankan mobile number")
		s.observe("charge", http.StatusBadRequest, start)
		return
	}

	trxID, err := ideamart.GenerateExternalTrxID()
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "store_unavailable", "could not allocate a charge id")
		s.observe("charge", http.StatusServiceUnavailable, start)
		return
	}
	grant, err := newID()
	if err != nil {
		writeError(w, http.StatusServiceUnavailable, "store_unavailable", "could not allocate a grant")
		s.observe("charge", http.StatusServiceUnavailable, start)
		return
	}

	charge := billing.Charge{
		ExternalTrxID: trxID,
		Subscriber:    ideamart.MaskAddress(address),
		Amount:        s.cfg.Price,
		Currency:      s.cfg.Currency,
		Status:        billing.StatusPending,
		Grant:         grant,
		Consent:       consentVersion,
		CreatedAt:     s.now(),
	}
	if err := s.ledger.Put(charge); err != nil {
		writeError(w, http.StatusServiceUnavailable, "store_unavailable", "could not persist the charge")
		s.observe("charge", http.StatusServiceUnavailable, start)
		return
	}

	internal, code, debitErr := s.debit.Debit(r.Context(), address, s.cfg.Price, s.cfg.Currency, trxID)
	if debitErr != nil {
		var apiErr *ideamart.Error
		if errors.As(debitErr, &apiErr) {
			if apiErr.StatusCode == "E1405" {
				_ = s.ledger.UpdateStatus(trxID, billing.StatusUnknown, "")
				s.log.Info("charge", "statusCode", apiErr.StatusCode, "subscriber", charge.Subscriber, "externalTrxId", trxID)
				writeJSON(w, http.StatusAccepted, map[string]any{
					"status":        billing.StatusUnknown,
					"grant":         grant,
					"externalTrxId": trxID,
					"amount":        s.cfg.Price,
					"currency":      s.cfg.Currency,
				})
				s.observe("charge", http.StatusAccepted, start)
				return
			}
			status, bodyCode, message := mapChargeError(apiErr.StatusCode)
			_ = s.ledger.UpdateStatus(trxID, ledgerStatus(apiErr.StatusCode), "")
			s.log.Info("charge", "statusCode", apiErr.StatusCode, "subscriber", charge.Subscriber, "externalTrxId", trxID)
			writeError(w, status, bodyCode, message)
			s.observe("charge", status, start)
			return
		}
		_ = s.ledger.UpdateStatus(trxID, billing.StatusUnknown, "")
		s.log.Info("charge", "statusCode", "timeout", "subscriber", charge.Subscriber, "externalTrxId", trxID)
		writeJSON(w, http.StatusAccepted, map[string]any{
			"status":        billing.StatusUnknown,
			"grant":         grant,
			"externalTrxId": trxID,
			"amount":        s.cfg.Price,
			"currency":      s.cfg.Currency,
		})
		s.observe("charge", http.StatusAccepted, start)
		return
	}

	if err := s.ledger.UpdateStatus(trxID, billing.StatusCharged, internal); err != nil {
		writeError(w, http.StatusServiceUnavailable, "store_unavailable", "charge succeeded but the ledger could not be updated")
		s.observe("charge", http.StatusServiceUnavailable, start)
		return
	}
	s.log.Info("charge", "statusCode", code, "subscriber", charge.Subscriber, "externalTrxId", trxID)
	writeJSON(w, http.StatusCreated, map[string]any{
		"status":        billing.StatusCharged,
		"grant":         grant,
		"externalTrxId": trxID,
		"amount":        s.cfg.Price,
		"currency":      s.cfg.Currency,
	})
	s.observe("charge", http.StatusCreated, start)
}

func (s *Server) handleChargingNotification(w http.ResponseWriter, r *http.Request) {
	ack := map[string]string{"statusCode": "S1000", "statusDetail": "Success"}
	var payload struct {
		ApplicationID string `json:"applicationId"`
		ExternalTrxID string `json:"externalTrxId"`
		InternalTrxID string `json:"internalTrxId"`
		StatusCode    string `json:"statusCode"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20)).Decode(&payload); err != nil {
		writeJSON(w, http.StatusOK, ack)
		return
	}
	if s.cfg.Paywall && s.cfg.IdeamartAppID != "" && payload.ApplicationID != "" && payload.ApplicationID != s.cfg.IdeamartAppID {
		writeJSON(w, http.StatusOK, ack)
		return
	}
	if s.ledger != nil && payload.ExternalTrxID != "" {
		status := ledgerStatus(payload.StatusCode)
		if payload.StatusCode == "S1000" || payload.StatusCode == ideamart.BenignDebit {
			status = billing.StatusCharged
		}
		_ = s.ledger.UpdateStatus(payload.ExternalTrxID, status, payload.InternalTrxID)
	}
	writeJSON(w, http.StatusOK, ack)
}

func ledgerStatus(code string) string {
	switch code {
	case "S1000", ideamart.BenignDebit:
		return billing.StatusCharged
	case "E1378":
		return billing.StatusFunds
	case "E1406":
		return billing.StatusReject
	case "E1405":
		return billing.StatusUnknown
	default:
		return billing.StatusFailed
	}
}

func mapChargeError(code string) (int, string, string) {
	switch code {
	case "E1378":
		return http.StatusPaymentRequired, "insufficient_funds", "the mobile account does not have enough balance"
	case "E1406":
		return http.StatusPaymentRequired, "payment_declined", "the charge was declined"
	default:
		return http.StatusBadGateway, "payment_failed", "the charge could not be completed"
	}
}
