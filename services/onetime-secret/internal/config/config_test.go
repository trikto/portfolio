package config_test

import (
	"testing"

	"github.com/trikto/portfolio/services/onetime-secret/internal/config"
)

func TestLoadDefaults(t *testing.T) {
	cfg, err := config.Load(func(string) string { return "" })
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Port != config.DefaultPort || cfg.MetricsPort != config.DefaultMetricsPort {
		t.Fatalf("ports: %+v", cfg)
	}
	if cfg.MaxPayloadBytes != config.DefaultMaxPayloadBytes {
		t.Fatalf("max payload: %d", cfg.MaxPayloadBytes)
	}
	if !cfg.OriginAllowed("https://gajan.dev") {
		t.Fatal("default origin should allow https://gajan.dev")
	}
	if cfg.OriginAllowed("https://gajan.dev.attacker.example") {
		t.Fatal("suffix lookalike must not match")
	}
}

func TestLoadRejectsBadInts(t *testing.T) {
	_, err := config.Load(func(k string) string {
		if k == "MAX_PAYLOAD_BYTES" {
			return "-1"
		}
		return ""
	})
	if err == nil {
		t.Fatal("expected error")
	}
}
