package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"

	"github.com/trikto/portfolio/services/file-share/internal/api"
	"github.com/trikto/portfolio/services/file-share/internal/billing"
	"github.com/trikto/portfolio/services/file-share/internal/config"
	"github.com/trikto/portfolio/services/file-share/internal/ideamart"
	"github.com/trikto/portfolio/services/file-share/internal/store"
)

func main() {
	cfg, err := config.LoadFromOS()
	if err != nil {
		slog.Error("config", "err", err)
		os.Exit(1)
	}

	log := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel}))
	slog.SetDefault(log)

	disk, err := store.NewDisk(cfg.DataDir)
	if err != nil {
		log.Error("data dir", "err", err)
		os.Exit(1)
	}

	metrics := api.NewMetrics(prometheus.DefaultRegisterer)
	var ledger *billing.Ledger
	var debit api.Debiter
	if cfg.Paywall {
		var err error
		ledger, err = billing.NewLedger(cfg.DataDir)
		if err != nil {
			log.Error("billing ledger", "err", err)
			os.Exit(1)
		}
		debit = ideamart.NewClient(cfg.IdeamartAppID, cfg.IdeamartPassword, cfg.CaasDebitURL)
	}
	server := api.New(cfg, disk, ledger, debit, metrics, log)

	apiSrv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           server.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       10 * time.Minute,
		WriteTimeout:      10 * time.Minute,
		IdleTimeout:       60 * time.Second,
	}

	metricsMux := http.NewServeMux()
	metricsMux.Handle("GET /metrics", promhttp.Handler())
	metricsSrv := &http.Server{
		Addr:              ":" + cfg.MetricsPort,
		Handler:           metricsMux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 2)
	go func() {
		log.Info("api listening", "addr", apiSrv.Addr, "data_dir", cfg.DataDir)
		if err := apiSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()
	go func() {
		log.Info("metrics listening", "addr", metricsSrv.Addr)
		if err := metricsSrv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-errCh:
		log.Error("server failed", "err", err)
		os.Exit(1)
	case sig := <-stop:
		log.Info("shutting down", "signal", sig.String())
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	_ = apiSrv.Shutdown(ctx)
	_ = metricsSrv.Shutdown(ctx)
}
