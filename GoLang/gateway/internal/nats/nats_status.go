// Package nats exposes the NATS server's connection status to the GUI.
// It proxies the NATS HTTP monitoring endpoint (varz) rather than holding a
// NATS client connection — the gateway itself never talks NATS protocol.
package nats

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/mainframe/tm-system/gateway/internal/common"
)

// defaultMonitorURL is the NATS HTTP monitoring endpoint inside the compose
// network (nats.conf sets http_port: 8222). Override with NATS_MONITOR_URL.
const defaultMonitorURL = "http://nats:8222"

type NatsStatusHandler struct {
	monitorURL string
	client     *http.Client
	logger     *slog.Logger
}

func NewNatsStatusHandler(logger *slog.Logger) *NatsStatusHandler {
	url := os.Getenv("NATS_MONITOR_URL")
	if url == "" {
		url = defaultMonitorURL
	}
	return &NatsStatusHandler{
		monitorURL: url,
		client:     &http.Client{Timeout: 2 * time.Second},
		logger:     logger,
	}
}

// GetStatus handles GET /nats/status.
// Response shape matches the SPASDACS client (DiagramStorage.getNatsStatus):
// {"connections": <current client count>, "max": <server max_connections>}.
func (h *NatsStatusHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	resp, err := h.client.Get(h.monitorURL + "/varz")
	if err != nil {
		h.logger.Warn("nats varz fetch failed", "url", h.monitorURL, "error", err)
		common.WriteJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "nats monitoring unreachable"})
		return
	}
	defer resp.Body.Close()

	var varz struct {
		Connections    int `json:"connections"`
		MaxConnections int `json:"max_connections"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&varz); err != nil {
		h.logger.Warn("nats varz decode failed", "error", err)
		common.WriteJSON(w, http.StatusBadGateway, map[string]string{"error": "invalid nats monitoring response"})
		return
	}

	common.WriteJSON(w, http.StatusOK, map[string]int{
		"connections": varz.Connections,
		"max":         varz.MaxConnections,
	})
}
