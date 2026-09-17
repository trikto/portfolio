package ideamart

import (
	"fmt"
	"regexp"
	"strings"
)

var (
	separators = regexp.MustCompile(`[\s()\-]`)
	msisdn     = regexp.MustCompile(`^94[0-9]{9}$`)
)

// ToTelAddress is the only place "tel:" is added. Output is always tel:94XXXXXXXXX.
func ToTelAddress(msisdnRaw string) (string, error) {
	trimmed := strings.TrimSpace(msisdnRaw)
	if trimmed == "" {
		return "", fmt.Errorf("empty subscriber address")
	}
	if strings.HasPrefix(strings.ToLower(trimmed), "tel:") {
		trimmed = trimmed[4:]
	}
	digits := strings.TrimPrefix(separators.ReplaceAllString(trimmed, ""), "+")
	digits = strings.TrimPrefix(digits, "00")
	if strings.HasPrefix(digits, "0") && len(digits) == 10 {
		digits = "94" + digits[1:]
	}
	if !msisdn.MatchString(digits) {
		return "", fmt.Errorf("invalid subscriber address")
	}
	return "tel:" + digits, nil
}

// MaskAddress masks a subscriber address for logs and the charge ledger.
func MaskAddress(address string) string {
	body := address
	if len(body) >= 4 && strings.EqualFold(body[:4], "tel:") {
		body = body[4:]
	}
	if len(body) <= 6 {
		return "tel:***"
	}
	return "tel:" + body[:3] + strings.Repeat("*", len(body)-6) + body[len(body)-3:]
}
