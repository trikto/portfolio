package api

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
)

const idBytes = 16

func newID() (string, error) {
	buf := make([]byte, idBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate id: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}
