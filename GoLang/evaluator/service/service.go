package service

import (
	"context"
	"fmt"
	"net/http"
	"time"

	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/go-chi/chi/v5"
	"github.com/mainframe/tm-system/evaluator/internal"
	"github.com/mainframe/tm-system/internal/clients"
	"github.com/mainframe/tm-system/internal/config"
	"github.com/mainframe/tm-system/internal/logging"
	"github.com/mainframe/tm-system/internal/repository"
	"github.com/mainframe/tm-system/internal/repository/sqlite"
)

// EvaluatorConfig holds all runtime settings for the evaluator service.
type EvaluatorConfig struct {
	config.BaseConfig `mapstructure:",squash"`
	HTTP              HTTPConfig `mapstructure:"http"`
	Eval              EvalConfig `mapstructure:"eval"`
}

// HTTPConfig holds the HTTP server port.
type HTTPConfig struct {
	Port int `mapstructure:"port"`
}

// EvalConfig tunes JS execution limits.
type EvalConfig struct {
	// MaxConcurrent scripts that may run simultaneously. Default: 10.
	MaxConcurrent int `mapstructure:"max_concurrent"`
	// MaxTimeoutMs is the hard ceiling for any single script. Default: 30000.
	MaxTimeoutMs int `mapstructure:"max_timeout_ms"`
	// DefaultTimeoutMs is used when the caller does not specify timeout_ms. Default: 5000.
	DefaultTimeoutMs int `mapstructure:"default_timeout_ms"`
	// JobTTLMinutes: async job results are kept for this long. Default: 60.
	JobTTLMinutes int `mapstructure:"job_ttl_minutes"`
}

// Run starts the evaluator HTTP service and blocks until ctx is cancelled.
func Run(ctx context.Context, configPath string) error {
	var cfg EvaluatorConfig
	if err := config.Load(configPath, &cfg); err != nil {
		return fmt.Errorf("evaluator: config error: %w", err)
	}
	applyDefaults(&cfg)

	logger := logging.NewLogger(cfg.Service.Name, logging.ParseLevel(cfg.Service.LogLevel))

	rdb, err := clients.NewRedisClient(ctx, cfg.Redis.Addr, cfg.Redis.Password, cfg.Redis.DB, logger)
	if err != nil {
		return fmt.Errorf("evaluator: redis: %w", err)
	}
	defer rdb.Close()

	// Optional SQLite — enriches chain map keys with human-readable mnemonics.
	var tmStore repository.TMMnemonicStore
	if cfg.Database.Path != "" || cfg.Database.DSN != "" {
		if sdb, dbErr := clients.NewDB(ctx, cfg.Database, logger); dbErr != nil {
			logger.Warn("evaluator: database unavailable, mnemonic enrichment disabled", "error", dbErr)
		} else {
			defer sdb.Close()
			tmStore = sqlite.NewTMMnemonicRepo(sdb, logger)
		}
	}

	scope := internal.NewScopeBuilder(rdb, tmStore, logger)
	sandbox := internal.NewSandbox(
		cfg.Eval.MaxConcurrent,
		time.Duration(cfg.Eval.MaxTimeoutMs)*time.Millisecond,
		scope,
		logger,
	)
	store := internal.NewJobStore()

	// Background reaper: remove stale completed jobs.
	go func() {
		ticker := time.NewTicker(10 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				store.Reap(time.Duration(cfg.Eval.JobTTLMinutes) * time.Minute)
			}
		}
	}()

	handler := internal.NewHandler(
		sandbox,
		store,
		time.Duration(cfg.Eval.DefaultTimeoutMs)*time.Millisecond,
		logger,
	)

	r := chi.NewRouter()
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(corsMiddleware)

	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	r.Route("/api/eval/v1", func(r chi.Router) {
		handler.RegisterRoutes(r)
	})

	addr := fmt.Sprintf(":%d", cfg.HTTP.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  60 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	go func() {
		logger.Info("evaluator HTTP server starting", "addr", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("HTTP server error", "error", err)
		}
	}()

	<-ctx.Done()
	logger.Info("shutting down evaluator")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("evaluator: shutdown: %w", err)
	}

	logger.Info("evaluator stopped")
	return nil
}

func applyDefaults(cfg *EvaluatorConfig) {
	if cfg.HTTP.Port == 0 {
		cfg.HTTP.Port = 21006
	}
	if cfg.Eval.MaxConcurrent <= 0 {
		cfg.Eval.MaxConcurrent = 10
	}
	if cfg.Eval.MaxTimeoutMs <= 0 {
		cfg.Eval.MaxTimeoutMs = 30_000
	}
	if cfg.Eval.DefaultTimeoutMs <= 0 {
		cfg.Eval.DefaultTimeoutMs = 5_000
	}
	if cfg.Eval.JobTTLMinutes <= 0 {
		cfg.Eval.JobTTLMinutes = 60
	}
}

// corsMiddleware mirrors the gateway's CORS setup.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
