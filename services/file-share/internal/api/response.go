package api

import (
	"encoding/json"
	"net/http"
)

type errorBody struct {
	Error      string `json:"error"`
	Message    string `json:"message"`
	StatusCode string `json:"statusCode,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorBody{Error: code, Message: message})
}

func writeChargeError(w http.ResponseWriter, status int, code, message, platformCode string) {
	writeJSON(w, status, errorBody{Error: code, Message: message, StatusCode: platformCode})
}
