package service

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/mainframe/umacs-tc/internal"
	"github.com/mainframe/umacs-tc/internal/emulator"
	"github.com/redis/go-redis/v9"
	"gopkg.in/yaml.v3"
)

// Config holds the umacs-tc configuration.
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

// Run starts the umacs-tc service and blocks until ctx is cancelled.
//
// Wiring mirrors cmd/main.go — chi + humachi carry both the typed operation
// handlers and the Huma-managed routes (/openapi.json, /docs) on the same
// router.
func Run(ctx context.Context, configPath string) error {
	cfg, err := loadConfig(configPath)
	if err != nil {
		return fmt.Errorf("umacs-tc: failed to load config: %w", err)
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

	if err := rdb.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("umacs-tc: failed to connect to Redis: %w", err)
	}
	logger.Info("connected to redis")

	history, err := internal.NewHistoryStore(ctx, internal.HistoryConfig{
		Type: cfg.Database.Type,
		DSN:  cfg.Database.DSN,
		Path: cfg.Database.Path,
	}, logger)
	if err != nil {
		return fmt.Errorf("umacs-tc: history database: %w", err)
	}
	defer history.Close()

	// Start the embedded emulator on :21003. When umacs.tc_ip is 127.0.0.1
	// handler.getTCURL() routes all UMACS calls to this local server.
	stopEmulator := emulator.Start(ctx, rdb, cfg.Emulator, logger)
	defer stopEmulator()

	umacsEnv := internal.NewUmacsEnvData(rdb, &cfg.Umacs, logger)
	handler := internal.NewHandler(rdb, umacsEnv, logger)
	records := internal.NewRecordStore(rdb, history, logger)

	// Consumer context derived from the passed-in ctx so it can be cancelled
	// before HTTP server shutdown to stop processing new commands.
	consumerCtx, consumerCancel := context.WithCancel(ctx)
	consumer := internal.NewQueueConsumer(rdb, handler, records, logger)
	go consumer.Run(consumerCtx)

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

	<-ctx.Done()

	// Stop consumer first, then drain HTTP.
	consumerCancel()
	logger.Info("shutting down server...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("umacs-tc: server shutdown error: %w", err)
	}
	logger.Info("server stopped")
	return nil
}

// corsMiddleware sets permissive CORS headers for the typed POST endpoints.
// /docs and /openapi.json are served from the same router and also pick up
// these headers.
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
