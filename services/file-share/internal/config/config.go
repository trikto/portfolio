// Package config loads the service configuration from the environment.
package config

import (
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
)

// Config is the fully resolved runtime configuration.
type Config struct {
	Port             string
	MetricsPort      string
	DataDir          string
	AllowedOrigins   []string
	MaxPayloadBytes  int
	RateLimitPerHour int
	LogLevel         slog.Level
	Paywall          bool
	Price            string
	Currency         string
	IdeamartAppID    string
	IdeamartPassword string
	CaasDebitURL     string
}

const (
	DefaultPort             = "8080"
	DefaultMetricsPort      = "9090"
	DefaultDataDir          = "/data"
	DefaultAllowedOrigins   = "https://gajan.dev"
	DefaultMaxPayloadBytes  = 104858014 // 100 MiB plaintext + AES-GCM envelope overhead
	DefaultRateLimitPerHour = 20
	DefaultPrice            = "5"
	DefaultCurrency         = "LKR"
)

func Load(getenv func(string) string) (Config, error) {
	cfg := Config{
		Port:        firstNonEmpty(getenv("PORT"), DefaultPort),
		MetricsPort: firstNonEmpty(getenv("METRICS_PORT"), DefaultMetricsPort),
		DataDir:     firstNonEmpty(getenv("DATA_DIR"), DefaultDataDir),
	}

	cfg.AllowedOrigins = parseOrigins(firstNonEmpty(getenv("ALLOWED_ORIGINS"), DefaultAllowedOrigins))
	if len(cfg.AllowedOrigins) == 0 {
		return Config{}, fmt.Errorf("ALLOWED_ORIGINS: no usable origin")
	}

	var err error
	if cfg.MaxPayloadBytes, err = parsePositiveInt(getenv("MAX_PAYLOAD_BYTES"), DefaultMaxPayloadBytes); err != nil {
		return Config{}, fmt.Errorf("MAX_PAYLOAD_BYTES: %w", err)
	}
	if cfg.RateLimitPerHour, err = parsePositiveInt(getenv("RATE_LIMIT_PER_HOUR"), DefaultRateLimitPerHour); err != nil {
		return Config{}, fmt.Errorf("RATE_LIMIT_PER_HOUR: %w", err)
	}
	if cfg.LogLevel, err = parseLevel(getenv("LOG_LEVEL")); err != nil {
		return Config{}, fmt.Errorf("LOG_LEVEL: %w", err)
	}

	cfg.Paywall = parseBool(getenv("FILE_SHARE_PAYWALL"))
	cfg.Price = firstNonEmpty(getenv("FILE_SHARE_PRICE"), DefaultPrice)
	cfg.Currency = firstNonEmpty(getenv("FILE_SHARE_CURRENCY"), DefaultCurrency)
	cfg.IdeamartAppID = strings.TrimSpace(getenv("IDEAMART_APP_ID"))
	cfg.IdeamartPassword = getenv("IDEAMART_PASSWORD")
	cfg.CaasDebitURL = strings.TrimSpace(getenv("IDEAMART_CAAS_DEBIT_URL"))
	if cfg.Paywall {
		if cfg.IdeamartAppID == "" || cfg.IdeamartPassword == "" || cfg.CaasDebitURL == "" {
			return Config{}, fmt.Errorf("FILE_SHARE_PAYWALL requires IDEAMART_APP_ID, IDEAMART_PASSWORD, and IDEAMART_CAAS_DEBIT_URL")
		}
		if cfg.Price == "" {
			return Config{}, fmt.Errorf("FILE_SHARE_PRICE is required when the paywall is on")
		}
	}

	return cfg, nil
}

func LoadFromOS() (Config, error) { return Load(os.Getenv) }

func (c Config) OriginAllowed(origin string) bool {
	if origin == "" {
		return false
	}
	for _, allowed := range c.AllowedOrigins {
		if allowed == origin {
			return true
		}
	}
	return false
}

func parseOrigins(raw string) []string {
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	return origins
}

func parsePositiveInt(raw string, fallback int) (int, error) {
	if raw == "" {
		return fallback, nil
	}
	n, err := strconv.Atoi(raw)
	if err != nil {
		return 0, fmt.Errorf("not an integer")
	}
	if n <= 0 {
		return 0, fmt.Errorf("must be greater than zero")
	}
	return n, nil
}

func parseLevel(raw string) (slog.Level, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "":
		return slog.LevelInfo, nil
	case "debug":
		return slog.LevelDebug, nil
	case "info":
		return slog.LevelInfo, nil
	case "warn", "warning":
		return slog.LevelWarn, nil
	case "error":
		return slog.LevelError, nil
	default:
		return 0, fmt.Errorf("unknown level %q", raw)
	}
}

func parseBool(raw string) bool {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "1", "true", "yes", "on":
		return true
	default:
		return false
	}
}

func firstNonEmpty(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
