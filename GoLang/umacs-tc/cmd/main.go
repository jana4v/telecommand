package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/mainframe/umacs-tc/internal"
	"github.com/mainframe/umacs-tc/internal/emulator"
	"github.com/redis/go-redis/v9"
	"gopkg.in/yaml.v3"
)

type Config struct {
	Server struct {
		Host string `yaml:"host"`
		Port int    `yaml:"port"`
	} `yaml:"server"`
	Redis struct {
		Addr     string `yaml:"addr"`
		Password string `yaml:"password"`
		DB       int    `yaml:"db"`
	} `yaml:"redis"`
	Database struct {
		Type string `yaml:"type"`
		DSN  string `yaml:"dsn"`
		Path string `yaml:"path"`
	} `yaml:"database"`
	Umacs struct {
		TcIP                string `yaml:"tc_ip"`
		TcPort              string `yaml:"tc_port"`
		DataServerIP        string `yaml:"data_server_ip"`
		APIReqSource        string `yaml:"api_req_source"`
		APIReqPriority      string `yaml:"api_req_priority"`
		APIReqExecutionMode string `yaml:"api_req_execution_mode"`
		APIReqSubsystem     string `yaml:"api_req_subsystem"`
	} `yaml:"umacs"`
	Emulator emulator.Config `yaml:"emulator"`
}

func loadConfig(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, err
	}
	return &cfg, nil
}

func main() {
	cfg, err := loadConfig("config.yaml")
	if err != nil {
		slog.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Addr,
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})
	defer rdb.Close()

	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		logger.Error("failed to connect to redis", "error", err)
		os.Exit(1)
	}
	logger.Info("connected to redis")

	history, err := internal.NewHistoryStore(ctx, internal.HistoryConfig{
		Type: cfg.Database.Type,
		DSN:  cfg.Database.DSN,
		Path: cfg.Database.Path,
	}, logger)
	if err != nil {
		logger.Error("failed to initialise history database", "error", err)
		os.Exit(1)
	}
	defer history.Close()

	// Start the embedded emulator on :21003. When umacs.tc_ip is 127.0.0.1
	// handler.getTCURL() routes all UMACS calls to this local server.
	stopEmulator := emulator.Start(ctx, rdb, cfg.Emulator, logger)
	defer stopEmulator()

	umacsEnv := internal.NewUmacsEnvData(rdb, &cfg.Umacs, logger)
	handler := internal.NewHandler(rdb, umacsEnv, logger)
	records := internal.NewRecordStore(rdb, history, logger)

	// Start the Redis priority queue consumer — serialises SEND commands from all
	// parallel Julia procedures to the sequential UMACS TC API.
	consumerCtx, consumerCancel := context.WithCancel(ctx)
	consumer := internal.NewQueueConsumer(rdb, handler, records, logger)
	go consumer.Run(consumerCtx)

	// ── Router ────────────────────────────────────────────────────────────────
	// chi + humachi carries both the typed operation handlers (registered as
	// huma.Operation below) and the Huma-managed routes (/openapi.json, /docs,
	// /schemas/{name}) on the same router.
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(corsMiddleware)

	api := internal.NewHumaAPI(r, logger)
	(&internal.OpsHandlers{H: handler, RDB: rdb, Records: records}).RegisterHumaRoutes(api)

	addr := fmt.Sprintf("%s:%d", cfg.Server.Host, cfg.Server.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	go func() {
		logger.Info("starting server",
			"addr", addr,
			"docs", fmt.Sprintf("http://%s/docs", addr),
			"spec", fmt.Sprintf("http://%s/openapi.json", addr),
		)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("server error", "error", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	consumerCancel()
	logger.Info("shutting down server...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error("server shutdown error", "error", err)
	}
	logger.Info("server stopped")
}

// corsMiddleware sets permissive CORS headers for the typed POST endpoints.
// The /docs and /openapi.json routes are served from the same router and
// also pick up these headers.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if req.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, req)
	})
}
