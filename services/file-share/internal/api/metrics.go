package api

import (
	"strconv"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

type Metrics struct {
	CreatedTotal     prometheus.Counter
	FetchedTotal     prometheus.Counter
	FetchMissesTotal prometheus.Counter
	PayloadBytes     prometheus.Histogram
	StoreUp          prometheus.Gauge
	HTTPDuration     *prometheus.HistogramVec
}

func NewMetrics(reg prometheus.Registerer) *Metrics {
	factory := promauto.With(reg)
	return &Metrics{
		CreatedTotal: factory.NewCounter(prometheus.CounterOpts{
			Name: "file_share_created_total",
			Help: "Encrypted files successfully stored.",
		}),
		FetchedTotal: factory.NewCounter(prometheus.CounterOpts{
			Name: "file_share_fetched_total",
			Help: "Encrypted files successfully retrieved.",
		}),
		FetchMissesTotal: factory.NewCounter(prometheus.CounterOpts{
			Name: "file_share_fetch_misses_total",
			Help: "Fetch attempts that found nothing.",
		}),
		PayloadBytes: factory.NewHistogram(prometheus.HistogramOpts{
			Name:    "file_share_payload_bytes",
			Help:    "Ciphertext payload size in bytes at create time.",
			Buckets: []float64{1024, 65536, 1048576, 10485760, 52428800, 104857600, 104858014},
		}),
		StoreUp: factory.NewGauge(prometheus.GaugeOpts{
			Name: "file_share_store_up",
			Help: "1 when the last store Ping succeeded, 0 otherwise.",
		}),
		HTTPDuration: factory.NewHistogramVec(prometheus.HistogramOpts{
			Name:    "file_share_http_request_duration_seconds",
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
