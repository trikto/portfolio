package api

import (
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

// Metrics holds the Prometheus instruments for the HTTP API.
type Metrics struct {
	CreatedTotal    prometheus.Counter
	BurnedTotal     prometheus.Counter
	BurnMissesTotal prometheus.Counter
	PayloadBytes    prometheus.Histogram
	TimeToBurn      prometheus.Histogram
	StoreUp         prometheus.Gauge
	HTTPDuration    *prometheus.HistogramVec
}

func NewMetrics(reg prometheus.Registerer) *Metrics {
	factory := promauto.With(reg)
	return &Metrics{
		CreatedTotal: factory.NewCounter(prometheus.CounterOpts{
			Name: "onetime_secrets_created_total",
			Help: "Secrets successfully stored.",
		}),
		BurnedTotal: factory.NewCounter(prometheus.CounterOpts{
			Name: "onetime_secrets_burned_total",
			Help: "Secrets successfully burned (returned once and deleted).",
		}),
		BurnMissesTotal: factory.NewCounter(prometheus.CounterOpts{
			Name: "onetime_secrets_burn_misses_total",
			Help: "Burn attempts that found nothing (never existed, already burned, or expired).",
		}),
		PayloadBytes: factory.NewHistogram(prometheus.HistogramOpts{
			Name:    "onetime_secret_payload_bytes",
			Help:    "Decoded ciphertext payload size in bytes at create time.",
			Buckets: []float64{64, 256, 1024, 4096, 16384, 65536},
		}),
		TimeToBurn: factory.NewHistogram(prometheus.HistogramOpts{
			Name:    "onetime_secret_time_to_burn_seconds",
			Help:    "Seconds from create to successful burn.",
			Buckets: []float64{1, 5, 30, 60, 300, 3600, 86400, 604800},
		}),
		StoreUp: factory.NewGauge(prometheus.GaugeOpts{
			Name: "onetime_secret_store_up",
			Help: "1 when the last store Ping succeeded, 0 otherwise.",
		}),
		HTTPDuration: factory.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "onetime_secret_http_request_duration_seconds",
			Help:    "HTTP request duration by route and status class.",
			Buckets: prometheus.DefBuckets,
		}, []string{"route", "status_class"}),
	}
}

func (m *Metrics) ObserveHTTP(route string, status int, d time.Duration) {
	if m == nil || m.HTTPDuration == nil {
		return
	}
	class := strconv.Itoa(status/100) + "xx"
	m.HTTPDuration.WithLabelValues(route, class).Observe(d.Seconds())
}
