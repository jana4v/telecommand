package tc

import (
	"context"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/mainframe/tm-system/gateway/internal/common"
)

// HumaHandlers bundles the tc-package handlers so we can register Huma
// operations for every chi route in one place.
type HumaHandlers struct {
	Upload *TelecommandUploadHandler
	Get    *GetTCAPIHandler
}

// RegisterHumaRoutes wires every tc/ chi route into the given Huma API.
func (h *HumaHandlers) RegisterHumaRoutes(api huma.API) {
	// --- TC upload -----------------------------------------------------------
	common.RegisterChiProxy(api,
		"upload-telecommand", http.MethodPost, "/telecommand/upload",
		"Upload a TC database file (.xlsx or .out) and bulk-upsert all records it contains. "+
			"Existing rows for subsystems present in the file are replaced. "+
			"Publishes MDB_TC_COMMANDS_UPDATED to Redis after a successful import.",
		[]string{"telecommand", "upload"},
		h.Upload.UploadTelecommand,
	)

	// --- GET /get/tc/mnemonic_list[/{subsystem}] -----------------------------
	common.RegisterChiProxy(api,
		"get-tc-mnemonic-list", http.MethodGet, "/get/tc/mnemonic_list",
		"Return the distinct cmd_desc values from tc_mnemonics across every subsystem, sorted alphabetically.",
		[]string{"tc"},
		h.Get.GetTCMnemonicList,
	)
	huma.Register(api, huma.Operation{
		OperationID: "get-tc-mnemonic-list-by-subsystem",
		Method:      http.MethodGet,
		Path:        "/get/tc/mnemonic_list/{subsystem}",
		Summary:     "Return distinct TC cmd_desc values filtered by subsystem",
		Description: "Pass a single subsystem name or a comma-separated list (e.g. 'CAS,CCS,TTC') " +
			"to return the distinct cmd_desc values for those subsystems only. Sorted alphabetically.",
		Tags: []string{"tc"},
	}, func(ctx context.Context, input *struct {
		Subsystem string `path:"subsystem" doc:"One subsystem name, or a comma-separated list (e.g. CAS,CCS,TTC). Empty = all subsystems."`
	}) (*common.HumaAny, error) {
		return common.CallChi(ctx,
			http.MethodGet, "/get/tc/mnemonic_list/"+input.Subsystem,
			map[string]string{"subsystem": input.Subsystem},
			nil, h.Get.GetTCMnemonicList)
	})

	// --- GET /get/tc/cid_list[/{subsystem}] ----------------------------------
	common.RegisterChiProxy(api,
		"get-tc-cid-list", http.MethodGet, "/get/tc/cid_list",
		"Return the distinct id values from tc_mnemonics across every subsystem, sorted alphabetically.",
		[]string{"tc"},
		h.Get.GetTCCidList,
	)
	huma.Register(api, huma.Operation{
		OperationID: "get-tc-cid-list-by-subsystem",
		Method:      http.MethodGet,
		Path:        "/get/tc/cid_list/{subsystem}",
		Summary:     "Return distinct TC id values filtered by subsystem",
		Description: "Pass a single subsystem name or a comma-separated list (e.g. 'CAS,CCS,TTC') " +
			"to return the distinct id values for those subsystems only.",
		Tags: []string{"tc"},
	}, func(ctx context.Context, input *struct {
		Subsystem string `path:"subsystem" doc:"One subsystem name, or a comma-separated list (e.g. CAS,CCS,TTC). Empty = all subsystems."`
	}) (*common.HumaAny, error) {
		return common.CallChi(ctx,
			http.MethodGet, "/get/tc/cid_list/"+input.Subsystem,
			map[string]string{"subsystem": input.Subsystem},
			nil, h.Get.GetTCCidList)
	})

	// --- GET /get/tc/cid_mnemonic_list ---------------------------------------
	common.RegisterChiProxy(api,
		"get-tc-cid-mnemonic-list", http.MethodGet, "/get/tc/cid_mnemonic_list",
		"Return every TC entry cascaded as \"{id}_{cmd_desc}\", e.g. \"ACM53801_PHASE_METER_MNT_RATE_SECS\".",
		[]string{"tc"},
		h.Get.GetTCCidMnemonicList,
	)

	// NOTE: a tc_mnemonics-backed operation on /get/tm/pid_mnemonic_list/
	// {subsystem} used to be registered here, shadowing tm/huma_ops.go's TM
	// operation on the same path so TM-only subsystems always returned [].
	// The TC-shaped data remains available at /get/tc/cid_mnemonic_list.

	// --- GET /get/tc/subsystems ----------------------------------------------
	common.RegisterChiProxy(api,
		"get-tc-subsystems", http.MethodGet, "/get/tc/subsystems",
		"Return the distinct subsystem names from tc_mnemonics wrapped as {\"subsystems\": [...]}.",
		[]string{"tc"},
		h.Get.GetTCSubsystems,
	)
	common.RegisterChiProxy(api,
		"get-tc-subsystems-list", http.MethodGet, "/get/tc/subsystems_list",
		"Return the distinct subsystem names from tc_mnemonics as a plain JSON array.",
		[]string{"tc"},
		h.Get.GetTCSubsystemsList,
	)

	// --- GET /get/tc/{cid}[/columns/{columns}] -------------------------------
	huma.Register(api, huma.Operation{
		OperationID: "get-tc-by-cid",
		Method:      http.MethodGet,
		Path:        "/get/tc/{cid}",
		Summary:     "Return the full TC document for the given CID",
		Description: "Returns the raw document map including all first-class columns and all fields from the JSON blob.",
		Tags:        []string{"tc"},
	}, func(ctx context.Context, input *struct {
		CID string `path:"cid" doc:"Telecommand ID, e.g. ACM53801. Auto-uppercased."`
	}) (*common.HumaAny, error) {
		return common.CallChi(ctx,
			http.MethodGet, "/get/tc/"+input.CID,
			map[string]string{"cid": input.CID},
			nil, h.Get.GetTCByCID)
	})

	huma.Register(api, huma.Operation{
		OperationID: "get-tc-by-cid-columns",
		Method:      http.MethodGet,
		Path:        "/get/tc/{cid}/columns/{columns}",
		Summary:     "Return only the requested columns for the given CID",
		Description: "{columns} is a comma-separated list, e.g. \"id,cmd_desc,cmd_code,source_file,preCondition\". " +
			"Aliased column names: id→_id; cmd_code→cmdCode; cmd_desc→cmdDesc; cmd_type→cmdType; " +
			"source_file→sourceFile; created_at→createdAt; modified_at→modifiedAt; " +
			"data→the full raw JSON document. " +
			"Everything else is matched directly against the document key.",
		Tags: []string{"tc"},
	}, func(ctx context.Context, input *struct {
		CID     string `path:"cid"     doc:"Telecommand ID, e.g. ACM53801. Auto-uppercased."`
		Columns string `path:"columns" doc:"Comma-separated column list, e.g. id,cmd_desc,cmd_code,preCondition."`
	}) (*common.HumaAny, error) {
		return common.CallChi(ctx,
			http.MethodGet, "/get/tc/"+input.CID+"/columns/"+input.Columns,
			map[string]string{"cid": input.CID, "columns": input.Columns},
			nil, h.Get.GetTCByCIDColumns)
	})

	// --- PUT /update/tc ------------------------------------------------------
	huma.Register(api, huma.Operation{
		OperationID: "update-tc-generic",
		Method:      http.MethodPut,
		Path:        "/update/tc",
		Summary:     "Generic bulk update for allowed TC columns",
		Description: "Body: `[{\"cid\":\"ACM53801\",\"preCondition\":\"...\",\"priority\":2,...}]`\n\n" +
			"Updates any combination of the allowed columns for each supplied CID. " +
			"**Allowed fields** (camelCase OR snake_case accepted): " +
			"`preCondition`, `postCondition`, `postConditionDelay`, `priority`, `format`, " +
			"`dataCodeMapName`, `dataCodeMap`, `inhibited`, `exclude_in_expected`, `exclude_in_procedure`.\n\n" +
			"Fields not in the allowed set are silently ignored (including `id`, `subsystem`, " +
			"`cmd_code`, `cmd_desc`, `cmd_type`, `source_file`).\n\n" +
			"CIDs that are not found are listed in the `missing` response field.",
		Tags: []string{"tc"},
	}, func(ctx context.Context, input *struct {
		Body []map[string]any `doc:"Array of update items, each keyed by CID." required:"true"`
	}) (*common.HumaAny, error) {
		return common.CallChi(ctx, http.MethodPut, "/update/tc", nil, input.Body, h.Get.UpdateTCGeneric)
	})
}
