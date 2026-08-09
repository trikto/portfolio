// Package config loads the service configuration from the environment.
//
// Configuration is environment-only on purpose: the service has no config file,
// no flags and no credentials, so a container image plus a Deployment spec is
// the complete deployable unit.
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
	ValkeyAddr       string
	AllowedOrigins   []string
	MaxPayloadBytes  int
	RateLimitPerHour int
	LogLevel         slog.Level
}

// Defaults mirror the documented HTTP contract and the Kubernetes manifests.
const (
	DefaultPort             = "8080"
	DefaultMetricsPort      = "9090"
	DefaultValkeyAddr       = "valkey:6379"
	DefaultAllowedOrigins   = "https://gajan.dev"
	DefaultMaxPayloadBytes  = 65536
	DefaultRateLimitPerHour = 60
)

// Load reads the configuration from the process environment, applying defaults
// for anything unset. Any malformed value is a hard error: starting with a
// silently wrong limit is worse than failing to start.
func Load(getenv func(string) string) (Config, error) {
	cfg := Config{
		Port:        firstNonEmpty(getenv("PORT"), DefaultPort),
		MetricsPort: firstNonEmpty(getenv("METRICS_PORT"), DefaultMetricsPort),
		ValkeyAddr:  firstNonEmpty(getenv("VALKEY_ADDR"), DefaultValkeyAddr),
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

	return cfg, nil
}

// LoadFromOS is the production entry point.
func LoadFromOS() (Config, error) { return Load(os.Getenv) }

// OriginAllowed reports whether an Origin header value is on the allow list.
// Matching is exact: no wildcards and no suffix matching, so a lookalike host
// such as "https://gajan.dev.attacker.example" can never match.
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

func firstNonEmpty(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}
