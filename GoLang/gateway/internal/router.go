package gateway

import (
	"log/slog"

	"github.com/go-chi/chi/v5"
	"github.com/mainframe/tm-system/gateway/internal/dtm"
	"github.com/mainframe/tm-system/gateway/internal/maps"
	"github.com/mainframe/tm-system/gateway/internal/nats"
	"github.com/mainframe/tm-system/gateway/internal/payload"
	"github.com/mainframe/tm-system/gateway/internal/redis"
	"github.com/mainframe/tm-system/gateway/internal/sim"
	"github.com/mainframe/tm-system/gateway/internal/spasdacs"
	"github.com/mainframe/tm-system/gateway/internal/state"
	"github.com/mainframe/tm-system/gateway/internal/tc"
	"github.com/mainframe/tm-system/gateway/internal/tm"
	"github.com/mainframe/tm-system/gateway/internal/udtm"
	"github.com/mainframe/tm-system/internal/clients"
	"github.com/mainframe/tm-system/internal/repository/sqlite"
	goredis "github.com/redis/go-redis/v9"
)

// RegisterRoutes mounts all gateway API handlers on the given chi.Router.
// ingestSimURL is the base URL of the ingest service sim API (e.g. "http://localhost:8082").
func RegisterRoutes(r chi.Router, rdb *goredis.Client, sdb *clients.DB, ingestSimURL string, logger *slog.Logger) {
	// Create repository implementations from the shared SQLiteDB.
	tmRepo := sqlite.NewTMMnemonicRepo(sdb, logger)
	tcRepo := sqlite.NewTCMnemonicRepo(sdb, logger)
	scoRepo := sqlite.NewSCOCommandRepo(sdb, logger)
	dtmRepo := sqlite.NewDTMRepo(sdb, logger)
	udtmRepo := sqlite.NewUDTMRepo(sdb, logger)
	spasdacsRepo := sqlite.NewSpasdacsRepo(sdb, logger)
	stateLimitsRepo := sqlite.NewSystemStateLimitRepo(sdb, logger)

	// Instantiate handlers using store interfaces.
	telemetry := tm.NewTelemetryHandler(ingestSimURL, logger)
	liveTM := tm.NewLiveTMHandler(tmRepo, rdb, logger)
	chains := tm.NewChainsHandler(rdb, logger)
	limits := tm.NewLimitsHandler(rdb, logger)
	simulator := sim.NewSimulatorHandler(rdb, logger)
	udtmH := udtm.NewUDTMHandler(rdb, logger)
	dtmH := dtm.NewDTMHandler(rdb, logger)
	mnemonics := tm.NewMnemonicsHandler(tmRepo, tcRepo, scoRepo, rdb, logger)
	udtmCrud := udtm.NewUDTMCrudHandler(udtmRepo, tmRepo, rdb, logger)
	dtmCrud := dtm.NewDTMCrudHandler(dtmRepo, tmRepo, rdb, logger)
	mapsH := maps.NewMapsHandler(rdb, logger)
	redisHash := redis.NewRedisHashHandler(rdb, logger)
	spasdacsH := spasdacs.NewSpasdacsHandler(spasdacsRepo, logger)
	natsStatus := nats.NewNatsStatusHandler(logger)
	stateLimits := state.NewSystemStateLimitsHandler(stateLimitsRepo, logger)
	tmUpload := tm.NewTelemetryUploadHandler(tmRepo, rdb, logger)
	tcUpload := tc.NewTelecommandUploadHandler(tcRepo, rdb, logger)
	tcGet := tc.NewGetTCAPIHandler(tcRepo, rdb, logger)
	payloadTcDb := payload.NewPayloadTcDatabaseHandler(sdb.DB, logger)
	simProxy := sim.NewSimProxyHandler(ingestSimURL, logger)
	simStart := sim.NewSimStartHandler(tmRepo, dtmRepo, udtmRepo, ingestSimURL, logger)

	// --- Huma API (OpenAPI / Swagger docs) ----------------------------------
	// huma registers its handlers on the same chi router (path /openapi.json
	// and /docs). Domain-specific operations are registered separately by
	// each handler — start with the system-state-limits endpoints.
	humaAPI := NewHumaAPI(r, logger)
	stateLimits.RegisterSystemStateLimitsRoutes(humaAPI)

	// Register Huma operations for every other chi route. Each domain's
	// huma_ops.go owns its own operation metadata; the chi router below
	// still serves the same handlers, so both code paths work.
	(&tm.HumaHandlers{
		Mnemonics: mnemonics,
		Telemetry: telemetry,
		Upload:    tmUpload,
		Chains:    chains,
		Limits:    limits,
		LiveTM:    liveTM,
		RDB:       rdb,
	}).RegisterHumaRoutes(humaAPI)

	(&tc.HumaHandlers{Upload: tcUpload, Get: tcGet}).RegisterHumaRoutes(humaAPI)
	(&payload.HumaHandlers{DB: payloadTcDb}).RegisterHumaRoutes(humaAPI)

	(&sim.HumaHandlers{Status: simulator, Proxy: simProxy, Control: simStart}).RegisterHumaRoutes(humaAPI)
	(&udtm.HumaHandlers{Values: udtmH, Crud: udtmCrud}).RegisterHumaRoutes(humaAPI)
	(&dtm.HumaHandlers{Values: dtmH, Crud: dtmCrud}).RegisterHumaRoutes(humaAPI)
	(&redis.HumaHandlers{Hash: redisHash}).RegisterHumaRoutes(humaAPI)
	(&maps.HumaHandlers{Maps: mapsH}).RegisterHumaRoutes(humaAPI)
	(&spasdacs.HumaHandlers{Spasdacs: spasdacsH}).RegisterHumaRoutes(humaAPI)

	r.Route("/api/go/v1", func(r chi.Router) {
		// Existing Redis-backed endpoints
		r.Post("/get-telemetry", telemetry.GetTelemetry)
		r.Post("/fetch-live-tm", liveTM.GetLiveTM)
		r.Get("/fetch-live-tm/map/{source}", liveTM.GetLiveTMMap)
		r.Get("/fetch-live-tm/mnemonic_value_map/{source}", liveTM.GetMnemonicValueMap)
		r.Get("/fetch-live-tm/pid_value_map/{source}", liveTM.GetPIDValueMap)
		r.Get("/chain-status", chains.GetChainStatus)
		r.Get("/chain-mismatches", chains.GetChainMismatches)
		r.Get("/limit-failures", limits.GetLimitFailures)
		r.Get("/simulator-status", simulator.GetSimulatorStatus)
		r.Get("/nats/status", natsStatus.GetStatus)
		r.Post("/simulator/stop", simulator.StopLegacySimulator)
		r.Put("/udtm/values", udtmH.PutValues)
		r.Put("/dtm/values", dtmH.PutValues)

		// TC / SCO catalog (autocomplete — kept for the Monaco editor; the dedicated
		// TC CRUD API is under /get/tc/* and /update/tc below).
		r.Get("/mnemonics/sco", mnemonics.GetSCOCommands)
		r.Get("/mnemonics/all", mnemonics.GetAllMnemonics)
		r.Get("/tm/mnemonics", mnemonics.GetLiveTMMnemonics)

		// ── TM database GET ──────────────────────────────────────────────────
		// Literal paths must appear before the {pid} wildcard so chi resolves
		// them first.
		r.Get("/get/tm/subsystems_list", mnemonics.GetTMSubsystemsList)
		r.Get("/get/tm/subsystems", mnemonics.GetTMSubsystems)
		r.Get("/get/tm/details/{subsystem}", mnemonics.GetTMDetailsBySubsystem)
		r.Get("/get/tm/pid_mnemonic_list", mnemonics.GetTMPidMnemonicList)
		r.Get("/get/tm/pid_mnemonic_list/{subsystem}", mnemonics.GetTMPidMnemonicList)
		r.Get("/get/tm/pid_list", mnemonics.GetTMPidList)
		r.Get("/get/tm/pid_list/{subsystem}", mnemonics.GetTMPidList)
		r.Get("/get/tm/mnemonic_list", mnemonics.GetTMMnemonicList)
		r.Get("/get/tm/mnemonic_list/{subsystem}", mnemonics.GetTMMnemonicList)
		r.Get("/get/tm/{pid}/range", mnemonics.GetTMRangeByPID)
		r.Get("/get/tm/{pid}/limits", mnemonics.GetTMLimitsByPID)
		r.Get("/get/tm/{pid}/expected_value", mnemonics.GetTMExpectedValueByPID)
		r.Get("/get/tm/{pid}/columns/{columns}", mnemonics.GetTMByPIDColumns)
		r.Get("/get/tm/{pid}", mnemonics.GetTMByPID)

		// ── TM database PUT ──────────────────────────────────────────────────
		r.Put("/update/tm/limits", mnemonics.UpdateTMLimitsByPID)
		r.Put("/update/tm/expected_value", mnemonics.UpdateTMExpectedValueByPID)
		r.Put("/update/tm/tolerance", mnemonics.UpdateTMToleranceByPID)
		r.Put("/update/tm", mnemonics.UpdateTMGeneric)

		// ── TM file upload ───────────────────────────────────────────────────
		r.Post("/update/tm/fileupload", tmUpload.UploadTelemetry)

		// ── TM database DELETE ───────────────────────────────────────────────
		// Literal "/delete/tm/subsystems" must be before the {pid} wildcard.
		r.Delete("/delete/tm/subsystems", mnemonics.DeleteTMBySubsystems)
		r.Delete("/delete/tm/{pid}", mnemonics.DeleteTMByPID)

		// TC ingestion (still under /telecommand/upload — used by the seed scripts
		// and the GUI .out-file drop).
		r.Post("/telecommand/upload", tcUpload.UploadTelecommand)

		// ── TC database GET ──────────────────────────────────────────────────
		// Literal paths must appear before the {cid} wildcard so chi resolves
		// them first.
		r.Get("/get/tc/mnemonic_list", tcGet.GetTCMnemonicList)
		r.Get("/get/tc/mnemonic_list/{subsystem}", tcGet.GetTCMnemonicList)
		r.Get("/get/tc/cid_list", tcGet.GetTCCidList)
		r.Get("/get/tc/cid_list/{subsystem}", tcGet.GetTCCidList)
		r.Get("/get/tc/cid_mnemonic_list", tcGet.GetTCCidMnemonicList)
		// NOTE: a tc_mnemonics-backed duplicate of
		// /get/tm/pid_mnemonic_list/{subsystem} used to be registered here,
		// silently shadowing the TM handler above (chi: last registration
		// wins) so TM-only subsystems always got []. The TC-shaped data is
		// still available at /get/tc/cid_mnemonic_list.
		r.Get("/get/tc/subsystems", tcGet.GetTCSubsystems)
		r.Get("/get/tc/subsystems_list", tcGet.GetTCSubsystemsList)
		r.Get("/get/tc/{cid}/columns/{columns}", tcGet.GetTCByCIDColumns)
		r.Get("/get/tc/{cid}", tcGet.GetTCByCID)

		// ── TC database PUT ──────────────────────────────────────────────────
		r.Put("/update/tc", tcGet.UpdateTCGeneric)

		// Payload TC database endpoints
		r.Get("/payloadtc/database/pl-config-based-tc", payloadTcDb.ListPLConfigBasedTC)
		r.Put("/payloadtc/database/pl-config-based-tc", payloadTcDb.SavePLConfigBasedTCBulk)
		r.Get("/payloadtc/database/macros", payloadTcDb.ListPayloadMacros)
		r.Put("/payloadtc/database/macros", payloadTcDb.SavePayloadMacrosBulk)
		r.Get("/payloadtc/database/options/macro-commands", payloadTcDb.GetMacroCommandOptions)
		r.Get("/payloadtc/database/options/test-parameters", payloadTcDb.GetTestParameterOptions)
		r.Get("/payloadtc/database/options/tc-subsystems", payloadTcDb.GetTCSubsystemOptions)
		r.Get("/payloadtc/database/options/tc-commands", payloadTcDb.GetTCCommandOptions)
		r.Get("/payloadtc/database/boa-column-names", payloadTcDb.GetBoaColumnNames)
		r.Get("/payloadtc/database/options/data-commands", payloadTcDb.GetDataCommandOptions)
		r.Get("/payloadtc/database/options/data-map-values", payloadTcDb.GetDataMapValues)
		r.Get("/payloadtc/database/payload-config-boa", payloadTcDb.ListPayloadConfigBoa)
		r.Put("/payloadtc/database/payload-config-boa", payloadTcDb.SavePayloadConfigBoaBulk)
		r.Get("/payloadtc/database/on-off-commands", payloadTcDb.ListOnOffCommands)
		r.Put("/payloadtc/database/on-off-commands", payloadTcDb.SaveOnOffCommandsBulk)
		r.Get("/payloadtc/database/options/on-off-commands", payloadTcDb.GetOnOffCommandOptions)
		r.Get("/payloadtc/database/cfg-tm-to-log", payloadTcDb.ListCfgTmToLog)
		r.Put("/payloadtc/database/cfg-tm-to-log", payloadTcDb.SaveCfgTmToLogBulk)
		r.Get("/payloadtc/database/options/tm-subsystems", payloadTcDb.GetTMSubsystemOptions)
		r.Get("/payloadtc/database/options/tm-mnemonics", payloadTcDb.GetTMMnemonicOptions)
		r.Get("/payloadtc/database/pl-tc-files", payloadTcDb.ListPlTcFiles)
		r.Put("/payloadtc/database/pl-tc-files", payloadTcDb.SavePlTcFilesBulk)
		r.Get("/payloadtc/database/addon-commands", payloadTcDb.ListAddonCommands)
		r.Put("/payloadtc/database/addon-commands", payloadTcDb.SaveAddonCommandsBulk)

		// UD_TM CRUD — SQLite-backed, versioned
		r.Get("/ud-tm", udtmCrud.GetUDTM)
		r.Post("/ud-tm", udtmCrud.SaveUDTM)
		r.Get("/ud-tm/versions", udtmCrud.GetUDTMVersions)
		r.Get("/ud-tm/versions/{version}", udtmCrud.GetUDTMVersion)

		// DTM procedure CRUD — SQLite-backed, publishes DTM_PROCEDURES_UPDATED
		r.Get("/dtm/procedures", dtmCrud.GetDTMProcedures)
		r.Post("/dtm/procedures", dtmCrud.SaveDTMProcedures)

		// Full Redis map reads — returns array of {param, value} dicts
		r.Get("/maps/{name}", mapsH.GetMap)

		// Generic Redis hash state storage API (GUI state persistence)
		r.Post("/redis/hash/write", redisHash.WriteHash)
		r.Post("/redis/hash/read", redisHash.ReadHash)

		// Spasdacs diagrams stored in SQLite "spasdacs" table
		r.Get("/diagrams", spasdacsH.GetDiagrams)
		r.Get("/diagrams/{id}", spasdacsH.GetDiagram)
		r.Post("/diagrams", spasdacsH.PostDiagram)
		r.Patch("/diagrams/{id}", spasdacsH.PatchDiagram)
		r.Delete("/diagrams/{id}", spasdacsH.DeleteDiagram)

		// Sim API — value injection (FIXED mode / DTM / UDTM)
		r.Put("/sim/streams/{streamID}/values", simProxy.PutStreamValues)
		r.Get("/sim/streams", simProxy.GetStreams)
		r.Get("/sim/streams/{streamID}", simProxy.GetStream)

		// Simulation control — random simulation driven by range data from SQLite
		r.Post("/sim/streams/{streamID}/start", simStart.StartSim)
		r.Post("/sim/streams/{streamID}/stop", simStart.StopSim)
		r.Get("/sim/streams/{streamID}/status", simStart.GetSimStatus)
		r.Get("/sim/streams/status", simStart.GetAllSimStatus)
	})
}
