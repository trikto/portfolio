package api

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
)

// idBytes is 16 bytes of CSPRNG entropy (≥128 bits). Collisions are so unlikely
// that Put's NX guard is a belt-and-braces check rather than a real recovery path.
const idBytes = 16

// newID returns a URL-safe base64 identity with no padding.
func newID() (string, error) {
	buf := make([]byte, idBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate id: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}
