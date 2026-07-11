package tc

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/mainframe/tm-system/gateway/internal/common"
	"github.com/mainframe/tm-system/internal/models"
	"github.com/mainframe/tm-system/internal/repository"
	goredis "github.com/redis/go-redis/v9"
)

// GetTCAPIHandler serves the /get/tc/* and /update/tc endpoints backed by
// the tc_mnemonics table.  It deliberately reads from the new first-class
// cmd_code/cmd_desc/cmd_type columns rather than the legacy JSON blob.
type GetTCAPIHandler struct {
	tc     repository.TCMnemonicStore
	rdb    *goredis.Client
	logger *slog.Logger
}

// NewGetTCAPIHandler wires a GetTCAPIHandler with its dependencies.
func NewGetTCAPIHandler(tc repository.TCMnemonicStore, rdb *goredis.Client, logger *slog.Logger) *GetTCAPIHandler {
	return &GetTCAPIHandler{tc: tc, rdb: rdb, logger: logger}
}

// splitSubsystems parses "{subsystem}" path value into a clean slice.
// Empty input returns nil.
func splitSubsystems(raw string) []string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

// ─── GET /get/tc/mnemonic_list[/{subsystem}] ─────────────────────────────────

// GetTCMnemonicList returns the sorted distinct cmd_desc values.  When
// {subsystem} is omitted (or empty) every subsystem is included.
func (h *GetTCAPIHandler) GetTCMnemonicList(w http.ResponseWriter, r *http.Request) {
	descs, err := h.tc.GetCmdDescs(r.Context(), splitSubsystems(chi.URLParam(r, "subsystem")))
	if err != nil {
		h.logger.Error("GetTCMnemonicList failed", "error", err)
		common.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	common.WriteJSON(w, http.StatusOK, descs)
}

// ─── GET /get/tc/cid_list[/{subsystem}] ──────────────────────────────────────

// GetTCCidList returns the sorted distinct id values, optionally filtered.
func (h *GetTCAPIHandler) GetTCCidList(w http.ResponseWriter, r *http.Request) {
	ids, err := h.tc.GetIDs(r.Context(), splitSubsystems(chi.URLParam(r, "subsystem")))
	if err != nil {
		h.logger.Error("GetTCCidList failed", "error", err)
		common.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	common.WriteJSON(w, http.StatusOK, ids)
}

// ─── GET /get/tc/cid_mnemonic_list ───────────────────────────────────────────

// GetTCCidMnemonicList returns every "{id}_{cmd_desc}" pair across all subsystems.
func (h *GetTCAPIHandler) GetTCCidMnemonicList(w http.ResponseWriter, r *http.Request) {
	rows, err := h.tc.GetCidMnemonicList(r.Context(), nil)
	if err != nil {
		h.logger.Error("GetTCCidMnemonicList failed", "error", err)
		common.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	common.WriteJSON(w, http.StatusOK, rows)
}

// ─── GET /get/tc/subsystems ──────────────────────────────────────────────────

// GetTCSubsystems returns {"subsystems": ["ACM", "AIT", ...]}.
func (h *GetTCAPIHandler) GetTCSubsystems(w http.ResponseWriter, r *http.Request) {
	subs, err := h.tc.GetSubsystems(r.Context())
	if err != nil {
		h.logger.Error("GetTCSubsystems failed", "error", err)
		common.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	common.WriteJSON(w, http.StatusOK, map[string][]string{"subsystems": subs})
}

// ─── GET /get/tc/subsystems_list ─────────────────────────────────────────────

// GetTCSubsystemsList returns distinct subsystem names as a plain JSON array.
func (h *GetTCAPIHandler) GetTCSubsystemsList(w http.ResponseWriter, r *http.Request) {
	subs, err := h.tc.GetSubsystems(r.Context())
	if err != nil {
		h.logger.Error("GetTCSubsystemsList failed", "error", err)
		common.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	common.WriteJSON(w, http.StatusOK, subs)
}

// ─── GET /get/tc/{cid} ───────────────────────────────────────────────────────

// GetTCByCID returns the full document for the given CID.
func (h *GetTCAPIHandler) GetTCByCID(w http.ResponseWriter, r *http.Request) {
	cid := strings.ToUpper(strings.TrimSpace(chi.URLParam(r, "cid")))
	if cid == "" {
		common.WriteError(w, http.StatusBadRequest, "cid is required")
		return
	}
	doc, err := h.tc.GetByIDRaw(r.Context(), cid)
	if errors.Is(err, repository.ErrNotFound) {
		common.WriteError(w, http.StatusNotFound, "cid not found")
		return
	}
	if err != nil {
		h.logger.Error("GetTCByCID failed", "cid", cid, "error", err)
		common.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}
	common.WriteJSON(w, http.StatusOK, doc)
}

// ─── GET /get/tc/{cid}/columns/{columns} ─────────────────────────────────────

// GetTCByCIDColumns returns only the caller-specified columns for the given CID.
// {columns} is a comma-separated list, e.g. "id,cmd_desc,cmd_code,source_file".
// "id" is rewritten to "_id" to match the document key; everything else is
// looked up as-is in the doc, then the top-level columns are folded in.
func (h *GetTCAPIHandler) GetTCByCIDColumns(w http.ResponseWriter, r *http.Request) {
	cid := strings.ToUpper(strings.TrimSpace(chi.URLParam(r, "cid")))
	if cid == "" {
		common.WriteError(w, http.StatusBadRequest, "cid is required")
		return
	}
	doc, err := h.tc.GetByIDRaw(r.Context(), cid)
	if errors.Is(err, repository.ErrNotFound) {
		common.WriteError(w, http.StatusNotFound, "cid not found")
		return
	}
	if err != nil {
		h.logger.Error("GetTCByCIDColumns failed", "cid", cid, "error", err)
		common.WriteError(w, http.StatusInternalServerError, "internal server error")
		return
	}

	cols := splitSubsystems(chi.URLParam(r, "columns"))
	result := make(map[string]any, len(cols))
	for _, col := range cols {
		// Map user-facing column names to either the doc key, the new first-class
		// column key, or the document _id.
		switch strings.ToLower(strings.TrimSpace(col)) {
		case "id":
			result["id"] = doc["_id"]
		case "subsystem":
			if v, ok := doc["subsystem"]; ok {
				result["subsystem"] = v
			} else {
				result["subsystem"] = ""
			}
		case "cmd_code":
			if v, ok := doc["cmdCode"]; ok {
				result["cmd_code"] = v
			} else {
				result["cmd_code"] = ""
			}
		case "cmd_desc":
			if v, ok := doc["cmdDesc"]; ok {
				result["cmd_desc"] = v
			} else {
				result["cmd_desc"] = ""
			}
		case "cmd_type":
			if v, ok := doc["cmdType"]; ok {
				result["cmd_type"] = v
			} else {
				result["cmd_type"] = ""
			}
		case "source_file":
			if v, ok := doc["sourceFile"]; ok {
				result["source_file"] = v
			} else {
				result["source_file"] = ""
			}
		case "created_at":
			if v, ok := doc["createdAt"]; ok {
				result["created_at"] = v
			} else {
				result["created_at"] = ""
			}
		case "modified_at":
			if v, ok := doc["modifiedAt"]; ok {
				result["modified_at"] = v
			} else {
				result["modified_at"] = ""
			}
		case "data":
			// The "data" column stores the full JSON blob.  GetByIDRaw has
			// already unmarshalled it into doc, so return the whole document
			// for callers that want the raw view in one go.
			result["data"] = doc
		default:
			// Any other name is taken from the document directly (this is where
			// preCondition, postCondition, priority, format, etc. live).
			if v, ok := doc[col]; ok {
				result[col] = v
			}
		}
	}
	common.WriteJSON(w, http.StatusOK, result)
}

// ─── PUT /update/tc ──────────────────────────────────────────────────────────

// tcGenericAllowedCols maps user-facing column names → document keys for the
// generic PUT /update/tc endpoint.  Identity (id), subsystem, and the new
// read-only columns (cmd_code, cmd_desc, cmd_type, source_file) are
// intentionally NOT listed — the user can supply them, but they are silently
// dropped.
var tcGenericAllowedCols = map[string]string{
	"pre_condition":        "preCondition",
	"post_condition":       "postCondition",
	"post_condition_delay": "postConditionDelay",
	"priority":             "priority",
	"format":               "format",
	"data_code_map_name":   "dataCodeMapName",
	"data_code_map":        "dataCodeMap",
	"inhibited":            "inhibited",
	"exclude_in_expected":  "exclude_in_expected",
	"exclude_in_procedure": "exclude_in_procedure",
}

// UpdateTCGeneric bulk-updates one or more TC rows identified by `cid`.
// Body: [{"cid":"ACM53801","preCondition":"...","priority":2,...}]
//
// Only the allowed columns (see tcGenericAllowedCols) are written.  Other
// keys in the body — including the protected ones above — are silently
// ignored.  CIDs that don't match a row are returned in the "missing" array.
func (h *GetTCAPIHandler) UpdateTCGeneric(w http.ResponseWriter, r *http.Request) {
	var items []map[string]any
	if err := json.NewDecoder(r.Body).Decode(&items); err != nil {
		common.WriteError(w, http.StatusBadRequest, "invalid request body: expected JSON array")
		return
	}

	updated, missing := 0, make([]string, 0)
	now := time.Now().UTC().Format(time.RFC3339)

	for _, item := range items {
		cid := strings.ToUpper(strings.TrimSpace(common.ToString(item["cid"])))
		if cid == "" {
			continue
		}

		doc, err := h.tc.GetByIDRaw(r.Context(), cid)
		if errors.Is(err, repository.ErrNotFound) {
			missing = append(missing, cid)
			continue
		}
		if err != nil {
			h.logger.Error("UpdateTCGeneric lookup failed", "cid", cid, "error", err)
			common.WriteError(w, http.StatusInternalServerError, "failed to load record")
			return
		}

		// Apply only the allowed columns; everything else is dropped.
		changed := false
		for userCol, docKey := range tcGenericAllowedCols {
			if val, ok := item[userCol]; ok {
				doc[docKey] = val
				changed = true
			}
		}
		// Also accept the same keys in their original camelCase spelling,
		// since the GUI tends to use those.
		for _, docKey := range tcGenericAllowedCols {
			if val, ok := item[docKey]; ok {
				doc[docKey] = val
				changed = true
			}
		}

		if !changed {
			// Nothing writable supplied — count as a no-op, don't bother saving.
			updated++
			continue
		}

		subsystem := common.ToString(doc["subsystem"])
		doc["updatedAt"] = now
		doc["modifiedAt"] = now

		if err := h.tc.SaveDoc(r.Context(), cid, subsystem, doc); err != nil {
			h.logger.Error("UpdateTCGeneric save failed", "cid", cid, "error", err)
			common.WriteError(w, http.StatusInternalServerError, "failed to update record")
			return
		}
		updated++
	}

	if updated > 0 {
		if err := h.rdb.Publish(r.Context(), models.MdbTcCommandsUpdated, "tc_updated").Err(); err != nil {
			h.logger.Warn("failed to publish MDB_TC_COMMANDS_UPDATED", "error", err)
		}
	}

	common.WriteJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"updated": updated,
		"missing": missing,
	})
}
