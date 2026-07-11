package models

// ViewportState holds the last saved pan/zoom position for a diagram canvas.
type ViewportState struct {
	Zoom float64 `json:"zoom"`
	Cx   float64 `json:"cx"`
	Cy   float64 `json:"cy"`
}

// TelemetryManifest is the set of telemetry inputs a diagram consumes, computed
// at save time. The viewer uses it to subscribe to only the paramIds it binds
// (per-param NATS subjects) instead of the full firehose. NeedsFull signals that
// at least one binding reads the whole TM map (a dynamic or unscoped script) and
// the viewer must therefore fall back to the unified subject for correctness.
type TelemetryManifest struct {
	Params     []string `json:"params"`     // bare paramIds bound directly or via literal TM[] refs
	Chains     []string `json:"chains"`     // sourceStreamIds referenced by scoped/script bindings
	HasScripts bool     `json:"hasScripts"` // any __multi__/transform script present (informational)
	NeedsFull  bool     `json:"needsFull"`  // a binding reads the whole map → viewer must use the firehose
}

// SpasdacsDiagram is a SPASDACS mimic diagram stored in the spasdacs SQLite table.
type SpasdacsDiagram struct {
	ID              string         `json:"id"`
	Name            string         `json:"name"`
	Description     string         `json:"description,omitempty"`
	// omitempty so ?slim=view responses drop the field entirely instead of
	// sending "modelData": null; normal saves always carry a non-nil value.
	ModelData       interface{}    `json:"modelData,omitempty"`
	// ViewModelData is a view-optimised copy of ModelData generated at editor
	// save time. All binding topics and TM[] script references are reduced to
	// bare paramIds (e.g. "RFS00057_5W_SSPA1-ON-OFF_STS" → "RFS00057") so the
	// viewer can match incoming NATS messages directly without loading the
	// gateway mnemonic mapping. Absent on diagrams saved before this field was
	// introduced; viewer falls back to ModelData in that case.
	ViewModelData   string         `json:"viewModelData,omitempty"`
	// TelemetryManifest lists the telemetry inputs this diagram consumes,
	// generated server-side at save time (like ViewModelData). The viewer uses
	// it to subscribe selectively. Absent on diagrams saved before this field.
	TelemetryManifest *TelemetryManifest `json:"telemetryManifest,omitempty"`
	BackgroundColor string         `json:"backgroundColor,omitempty"`
	CanvasSize      string         `json:"canvasSize,omitempty"`
	EdgeColor       string         `json:"edgeColor,omitempty"`
	EdgeWidth       *float64       `json:"edgeWidth,omitempty"`
	CreatedAt       string         `json:"createdAt"`
	UpdatedAt       string         `json:"updatedAt"`
	AutoViewInclude  *bool         `json:"autoViewInclude,omitempty"`
	AutoViewDuration *int          `json:"autoViewDuration,omitempty"`
	ViewportState   *ViewportState `json:"viewportState,omitempty"`
}

// SpasdacsMeta is the list-view representation (no ModelData) returned by GET /diagrams.
type SpasdacsMeta struct {
	ID               string         `json:"id"`
	Name             string         `json:"name"`
	Description      string         `json:"description,omitempty"`
	CreatedAt        string         `json:"createdAt"`
	UpdatedAt        string         `json:"updatedAt"`
	AutoViewInclude  *bool          `json:"autoViewInclude,omitempty"`
	AutoViewDuration *int           `json:"autoViewDuration,omitempty"`
	ViewportState    *ViewportState `json:"viewportState,omitempty"`
}
