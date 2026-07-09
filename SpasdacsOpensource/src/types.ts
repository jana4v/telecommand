/** One rule in a telemetry binding: condition → visual value */
export interface BindingRule {
  condition: string; // e.g. "value === 1"  or  "value > 80"
  value: string;     // e.g. "#27ae60"
}

/** Maps one TM key to one diagram node data property */
export interface TelemetryBinding {
  id: string;
  topic: string;        // e.g. "TEMP" (TM key / mnemonic)
  targetProp: string;   // node data key: "statusColor" | "statusText" | "level" | "opacity"
                        // Set to "__multi__" when using a multi-property script.
  /** NATS telemetry stream id (see {@link NatsTelemetryStream}); omit = legacy default stream only */
  sourceStreamId?: string;
  /** For numeric geometric props, interpret incoming telemetry as delta from base value. */
  valueMode?: "absolute" | "delta";
  /** Optional animation duration (seconds) used by legacy SVG live updates. */
  animationDuration?: number;
  rules?: BindingRule[];
  transform?: string;   // e.g. "Math.round(value) + ' RPM'"
  transformScript?: string;
  script?: string;      // Multi-property function body; returns Record<string, unknown>
  subsystem?: string;
  rangeValues?: string[];
  /** When set, the binding updates this SVG sub-element (by `id`) inside a SvgGraphic node, not the X6 node root. */
  svgElementId?: string;
}

/**
 * Fields shared by every SCADA node (`cell.data`).
 * Use {@link ScadaNodeDomainFields} for optional / per-element fields.
 */
export interface BaseScadaNodeData {
  key: string;
  category: string;
  name: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  statusColor: string;
  statusText: string;
  opacity: number;
  telemetryBindings: TelemetryBinding[];
}

/** Optional domain-specific fields (tank, wheel, FPGA, SVG, etc.). */
export interface ScadaNodeDomainFields {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  level?: number;
  angle?: number;
  sw3pAnim?: number;
  sw4pAnim?: number;
  dp3tAnim?: number;
  sp2tAnim?: number;
  xfrAnim?: number;
  position?: number;
  chargeLevel?: number;
  isCharging?: boolean;
  batteryAnim?: number;
  thrusterAnim?: number;
  thrustLevel?: number;
  oxidizerEnabled?: boolean;
  fuelEnabled?: boolean;
  isInvalid?: boolean;
  status?: string;
  alarm?: boolean;
  temperature?: number;
  titleFontSize?: number;
  tempFontSize?: number;
  /** FPGA: stroke around silicon die; when unset, matches statusColor */
  innerBorderColor?: string;
  /** FPGA: when true, inner chip outline is green; when false/unset, orange (unless innerBorderColor set) */
  isLocked?: boolean;
  gaugeValue?: number;
  gaugeMin?: number;
  gaugeMax?: number;
  units?: string;
  daName?: string;
  twtaName?: string;
  dtgSpeed?: number;
  dtgPitch?: number;
  dtgRoll?: number;
  dtgTemperature?: number;
  pumpSpeed?: number;
  pumpSpeedRaw?: number;
  referenceInputClock?: number | string;
  phaseMeterInputClock?: number | string;
  synthesizerLockStatus?: boolean | number | string;
  phaseMeterLockStatus?: boolean | number | string;
  clockPresent?: boolean | number | string;
  samplingTime?: number | string;
  wheelSpeed?: number;
  wheelSpeedRaw?: number;
  wheelDirection?: number;
  wheelAngle?: number;
  wheelTemperature?: number;
  wheelCurrent?: number;
  fontSize?: number;
  hoverMnemonics?: string[];
  tableRows?: Array<{ mnem: string; value: string }>;
  imageSource?: string;
  centerFreq?: string | number;
  group?: string;
  isGroup?: boolean;
  isExpanded?: boolean;
  anadoVoltage?: number;
  telecommands?: string[];
  svgMarkup?: string;
  svgSelectedElementId?: string;
  svgOverrides?: Record<string, Record<string, unknown>>;
  collapsed?: boolean;
  label?: string;
  /** CurrentSensor: numeric current reading, driven by telemetry. */
  currentValue?: number;
  /** CurrentSensor: unit display — "A" or "mA". */
  currentUnits?: "A" | "mA";
  /**
   * CurrentSensor: ordered list of colour conditions. The first rule whose
   * comparison `currentValue {op} threshold` is true wins. Evaluated locally
   * in the node component — no script / binding required.
   */
  currentColorRules?: Array<{
    op: ">" | ">=" | "<" | "<=" | "==" | "!=";
    threshold: number | string;  // string for digital states like "ON"/"OFF"
    color: string;
  }>;
  /** Indicator: generic display value driven by telemetry (numeric or string state). */
  indicatorValue?: number | string;
  /** Indicator: free-form units string shown in badge (e.g. "V", "°C"). */
  indicatorUnits?: string;
  /** Indicator: minimum digits to show before the decimal point (zero-padded). */
  indicatorIntDigits?: number;
  /** Indicator: decimal places to show (0 = integer only). */
  indicatorDecDigits?: number;
  /** NumericDisplay: ordered colour conditions evaluated against indicatorValue. */
  indicatorColorRules?: Array<{
    op: ">" | ">=" | "<" | "<=" | "==" | "!=";
    threshold: number | string;
    color: string;
  }>;
  /**
   * System / BandpassFilter / LowPassFilter: raw TM value that drives the
   * border colour. Evaluated against `borderColorRules` at runtime.
   */
  borderColorValue?: number | string;
  /**
   * System / BandpassFilter / LowPassFilter: ordered colour conditions that
   * map a TM state (borderColorValue) to a border hex colour.
   * First matching rule wins.
   */
  borderColorRules?: Array<{
    op: ">" | ">=" | "<" | "<=" | "==" | "!=";
    threshold: number | string;
    color: string;
  }>;
  /** TextBox: static fallback text shown when no TM mnemonic is bound. */
  staticText?: string;
  /** TextBox: mnemonic whose value becomes the displayed text (stored in tg_text). */
  textTopic?: string;
  /** TextBox: mnemonic whose value is evaluated against colorConditions (stored in tg_color). */
  colorTopic?: string;
  /** TextBox: ordered colour conditions evaluated against tg_color. First match wins. */
  colorConditions?: Array<{ condition: string; color: string }>;
  /** TextBox: default text colour when no condition matches. */
  textColor?: string;
  /** TextBox: font-family CSS string. */
  fontFamily?: string;
  /** TextBox: background fill colour. */
  bgColor?: string;
  /** TextBox: border stroke colour. */
  borderColor?: string;
  /** TextBox: title bar background colour. */
  titleBarBg?: string;
  /** TextBox: live TM text value — written by telemetry binding. */
  tg_text?: unknown;
  /** TextBox: live TM colour-source value — written by telemetry binding. */
  tg_color?: unknown;
  /** CtrlBoard: when true, PCB trace signal animations play. Auto-on when status=nominal. */
  signalActive?: string | boolean;
  /** PlotGraph: chart mode rendered by Plotly. */
  plotType?: "line" | "scatter" | "bar";
  /** PlotGraph: chart title shown in node header. */
  plotTitle?: string;
  /** PlotGraph: x-axis source mode. */
  plotXMode?: "time" | "telemetry";
  /** PlotGraph: x-axis telemetry topic (used when plotXMode === "telemetry"). */
  plotXTopic?: string;
  /** PlotGraph: telemetry topics mapped to y-series. */
  plotYTopics?: string[];
  /** PlotGraph: rolling time-window buffer in seconds. */
  plotBufferSeconds?: number;
  /** PlotGraph runtime: latest x value from telemetry binding. */
  plot_x?: unknown;
  /** PlotGraph runtime: latest y0 value from telemetry binding. */
  plot_y_0?: unknown;
  /** PlotGraph runtime: latest y1 value from telemetry binding. */
  plot_y_1?: unknown;
  /** PlotGraph runtime: latest y2 value from telemetry binding. */
  plot_y_2?: unknown;
  /** PlotGraph runtime: latest y3 value from telemetry binding. */
  plot_y_3?: unknown;
  /** HeaterPlate: explicit ON/OFF control flag (can also be derived from statusColor). */
  heaterOn?: boolean;
  /** Robot: seated posture mode (e.g., "upright" | "reclined" or boolean/number equivalents). */
  posture?: string | number | boolean;
  /** Robot: right arm mode (e.g., "forward" | "down" or boolean/number equivalents). */
  rightArm?: string | number | boolean;
  /** Robot: left arm mode (e.g., "forward" | "down" or boolean/number equivalents). */
  leftArm?: string | number | boolean;
  /** Robot: when truthy, both arms move to namaste pose. */
  namaste?: string | number | boolean;
  /** Mosfet / SpstSwitch: colour used when the device is active / closed. */
  activeColor?: string;
  /** Mosfet / SpstSwitch: colour used for wires and contacts when inactive / open. */
  lineColor?: string;
  /** TransparentLabel: unit suffix appended to the displayed value (e.g. "°C"). */
  labelSuffix?: string;
}

/** Full data model for every SCADA node (serialized in diagrams). */
export type ScadaNodeData = BaseScadaNodeData & ScadaNodeDomainFields;

/** One row in a DataGrid telemetry table */
export interface DataGridRow {
  id:          string;
  label:       string;       // static display label
  labelTopic:  string;       // optional TM mnemonic for dynamic label
  valueTopic:  string;       // TM mnemonic for the value column
  unit:        string;       // optional unit suffix
  decimals?:      number;            // round numeric value to N decimal places (undefined = no rounding)
  displayMode?:   "text" | "led";   // "text" = show raw value; "led" = coloured indicator dot
  ledOnCondition?:  string;          // JS expr with `v` → true ⇒ green LED (e.g. `v === "PRESENT"`)
  ledOffCondition?: string;          // JS expr with `v` → true ⇒ red LED  (e.g. `v === "ABSENT"`)
  ledRangeValues?:  string[];        // cached possible values fetched from TM catalog
}

/** Link / connection data */
export interface ScadaLinkData {
  key?: string;
  source: { cell: string; port?: string };
  target: { cell: string; port?: string };
  stroke?: string;
  strokeWidth?: number;
  visible?: boolean;
  opacity?: number;
  labelText?: string;
  /** X6 marker name: none | classic | block | ellipse | … — see EDGE_MARKER_OPTIONS */
  sourceMarker?: string;
  targetMarker?: string;
  flowActive?: boolean;
  flowDirection?: number;
  heaterOn?: boolean;
  dashOffset?: number;
  telemetryBindings?: TelemetryBinding[];
}

/** One logical telemetry feed: one or more NATS subjects share the same mnemonic namespace. */
export interface NatsTelemetryStream {
  /** Stable id for bindings (e.g. "default", "tm1", "smon1") */
  id: string;
  /** Shown in the binding editor */
  label: string;
  /**
   * Subject suffix(es) after the prefix: full subject = `${prefix}.${suffix}`.
   * e.g. ["tm_map", "tm_map/full"] or ["tm1"], ["smon1"].
   */
  subjectSuffixes: string[];
}

/** Default single-stream layout (backward compatible with legacy tm.tm_map). */
export const DEFAULT_TELEMETRY_STREAMS: NatsTelemetryStream[] = [
  { id: "default", label: "Main TM", subjectSuffixes: ["tm_map", "tm_map/full"] },
];

/** NATS connection settings */
export interface NatsConfig {
  serverUrl: string;
  prefix: string;
  username?: string;
  password?: string;
  /** When empty/undefined, {@link DEFAULT_TELEMETRY_STREAMS} is used */
  streams?: NatsTelemetryStream[];
}

/** Simulated TM keys for offline testing */
export const SIMULATED_TOPICS = [
  "factory/pump1/status",
  "factory/tank1/level",
  "factory/motor1/rpm",
  "factory/valve1/state",
  "factory/indicator1/value",
  "factory/twta1/status",
  "factory/twta1/alarm",
  "factory/twta1/temperature",
  "factory/line1/flow",
  "factory/wheel1/speed",
  "factory/wheel1/direction",
  "factory/wheel1/status",
] as const;

/** Binding target options for links */
export const LINK_TARGET_PROPS: { value: string; label: string }[] = [
  { value: "stroke",        label: "Line Color"              },
  { value: "strokeWidth",   label: "Line Width (px)"         },
  { value: "visible",       label: "Visible (show/hide)"     },
  { value: "opacity",       label: "Opacity (0–1)"           },
  { value: "labelText",     label: "Edge label (text)"       },
  { value: "sourceMarker",  label: "Start arrow type"        },
  { value: "targetMarker",  label: "End arrow type"          },
  { value: "flowActive",    label: "Flow Animation"          },
  { value: "flowDirection", label: "Flow Direction (1 / -1)" },
];

/** All binding target options */
export const TARGET_PROPS: { value: string; label: string }[] = [
  // ── Geometric / layout ──────────────────────────────────────────────────
  { value: "x",             label: "X position (px)"               },
  { value: "y",             label: "Y position (px)"               },
  { value: "width",         label: "Width (px)"                    },
  { value: "height",        label: "Height (px)"                   },
  { value: "angle",         label: "Rotation angle (°)"            },
  { value: "visible",       label: "Visible (true/false)"          },
  // ── Appearance ──────────────────────────────────────────────────────────
  { value: "opacity",       label: "Opacity 0–1"                   },
  { value: "fill",          label: "Fill color"                    },
  { value: "stroke",        label: "Stroke / border color"         },
  { value: "strokeWidth",   label: "Stroke width (px)"             },
  { value: "statusColor",   label: "Status Color (fill)"           },
  { value: "statusText",    label: "Status Text (label)"           },
  { value: "innerBorderColor", label: "Inner border color (FPGA)" },
  { value: "isLocked",      label: "Locked / Lock acquired (FPGA, Rb Clock)" },
  { value: "isInvalid",     label: "Invalid (red overlay)"         },
  // ── Switch / position ───────────────────────────────────────────────────
  { value: "position",      label: "Position / ON-OFF (0=off, 1+=on)"    },
  // ── Sensor values ───────────────────────────────────────────────────────
  { value: "level",         label: "Level 0–100"                   },
  { value: "temperature",   label: "Temperature °C"                },
  { value: "gaugeValue",    label: "Gauge Value"                   },
  { value: "gaugeMin",      label: "Gauge Min"                     },
  { value: "gaugeMax",      label: "Gauge Max"                     },
  // ── Wheel ───────────────────────────────────────────────────────────────
  { value: "wheelSpeed",       label: "Wheel Speed (RPM)"             },
  { value: "wheelDirection",   label: "Wheel Direction (1=CW/-1=CCW)" },
  { value: "wheelTemperature", label: "Wheel Temperature (°C)"        },
  { value: "wheelCurrent",     label: "Wheel Current (A)"             },
  // ── Battery ─────────────────────────────────────────────────────────────
  { value: "chargeLevel",   label: "Charge Level (0–100)"          },
  { value: "isCharging",    label: "Is Charging (bool)"            },
  // ── Thruster ────────────────────────────────────────────────────────────
  { value: "thrustLevel",   label: "Thrust Level (0=off / 1=on)"   },
  // ── Pump ─────────────────────────────────────────────────────────────────
  { value: "pumpSpeed",    label: "Pump Speed (RPM)"               },
  // ── Current sensor ──────────────────────────────────────────────────────
  { value: "currentValue", label: "Current Value (A / mA)"         },
  // ── Text content ──────────────────────────────────────────────────────────
  { value: "text",         label: "Text content"                   },
  // ── SVG path flow animation ───────────────────────────────────────────────
  { value: "flowActive",    label: "Flow animation (enable/disable)" },
  { value: "flowDirection", label: "Flow direction (1=fwd / -1=rev)" },
  { value: "heaterOn",      label: "Heater ON/OFF"                     },
  { value: "referenceInputClock", label: "Reference Input Clock (1-4)" },
  { value: "phaseMeterInputClock", label: "Phase Meter Input Clock (1-4)" },
  { value: "synthesizerLockStatus", label: "Synthesizer Lock Status" },
  { value: "phaseMeterLockStatus", label: "Phase Meter Lock Status" },
  { value: "clockPresent", label: "Clock Present" },
  { value: "samplingTime", label: "Sampling Time" },
];

/**
 * Per-category allowlist of TARGET_PROPS values.
 * TelemetryBindingEditor uses this to show only relevant properties for the selected element.
 * Categories not listed fall back to the full list.
 */
// Geometric props available on every element
const GEO = ["x", "y", "width", "height", "angle", "visible", "opacity"] as const;

export const CATEGORY_TARGET_PROPS: Record<string, string[]> = {
  Valve:          [...GEO, "statusColor", "isInvalid"],
  Tank:           [...GEO, "statusColor", "statusText", "level", "gaugeValue", "gaugeMin", "gaugeMax", "isInvalid"],
  Gauge:          [...GEO, "gaugeValue", "level", "gaugeMin", "gaugeMax", "statusColor", "isInvalid"],
  TWTA:           [...GEO, "statusColor", "temperature", "twtaName", "isInvalid"],
  // DriverAmplifier telemetry bindings — exactly 4 properties (no GEO)
  //   statusColor = ON/OFF driver  (non-empty = ON)
  //   statusText  = "FGM" | "ALC" mode
  //   gaugeValue  = BOA in dB      (bottom-left,  X.XX dB)
  //   temperature = attenuation    (bottom-right, XX.X °C)
  DriverAmplifier: ["statusColor", "statusText", "gaugeValue", "temperature"],
  // TWTADA — combined TWTA + Driver Amplifier unit
  //   statusColor = TWTA warmup state ("#6aaa6a" warming / "#27ae60" bunched / "gradient:off" off)
  //   stroke      = "#ff9800" when ALC enabled, "" otherwise
  //   statusText  = DA mode "FGM" | "ALC"
  //   gaugeValue  = BOA in dB  (bottom-left,  X.XX dB)
  //   temperature = shared temperature (bottom-right, XX.X °C)
  TWTADA:          [...GEO, "statusColor", "statusText", "gaugeValue", "temperature", "isInvalid", "daName", "twtaName"],
  RFDownConverter: [...GEO, "statusColor", "temperature", "isInvalid"],
  RFUpConverter:   [...GEO, "statusColor", "temperature", "isInvalid"],
  LNA:             [...GEO, "statusColor", "temperature", "isInvalid"],
  Receiver:        [...GEO, "statusColor", "temperature", "isInvalid"],
  FPGA:            [...GEO, "statusColor", "innerBorderColor", "isLocked", "temperature", "titleFontSize", "tempFontSize", "isInvalid"],
  RFCirculator:    [...GEO, "temperature", "isInvalid"],
  System:          [...GEO, "statusColor", "stroke", "strokeWidth", "temperature", "titleFontSize", "isInvalid"],
  BandpassFilter:  [...GEO, "statusColor", "temperature", "centerFreq", "titleFontSize", "isInvalid"],
  LowPassFilter:   [...GEO, "statusColor", "temperature", "centerFreq", "titleFontSize", "isInvalid"],
  SSPA:            [...GEO, "statusColor", "temperature", "isInvalid"],
  NSGU:            [...GEO, "statusColor", "temperature", "isInvalid"],
  Modulator:       [...GEO, "statusColor", "temperature", "isInvalid"],
  QPSKModulator:   [...GEO, "statusColor", "temperature", "isInvalid"],
  QPSKDemodulator: [...GEO, "statusColor", "temperature", "isInvalid"],
  TMDecoder:       [...GEO, "statusColor", "temperature", "isInvalid"],
  TMDecoder_reverse:[...GEO, "statusColor", "temperature", "isInvalid"],
  ACMU:            [...GEO, "statusColor", "temperature", "referenceInputClock", "phaseMeterInputClock", "synthesizerLockStatus", "phaseMeterLockStatus", "clockPresent", "samplingTime", "isInvalid"],
  RFCoupler:       [...GEO, "fill", "stroke", "strokeWidth", "isInvalid"],
  TWTA_reverse:           [...GEO, "statusColor", "temperature", "twtaName", "isInvalid"],
  DriverAmplifier_reverse: ["statusColor", "statusText", "gaugeValue", "temperature"],
  TWTADA_reverse:          [...GEO, "statusColor", "statusText", "gaugeValue", "temperature", "isInvalid", "daName", "twtaName"],
  RFDownConverter_reverse: [...GEO, "statusColor", "temperature", "isInvalid"],
  RFUpConverter_reverse:   [...GEO, "statusColor", "temperature", "isInvalid"],
  LNA_reverse:             [...GEO, "statusColor", "temperature", "isInvalid"],
  Receiver_reverse:        [...GEO, "statusColor", "temperature", "isInvalid"],
  RFCirculator_reverse:    [...GEO, "temperature", "isInvalid"],
  BandpassFilter_reverse:  [...GEO, "statusColor", "temperature", "centerFreq", "isInvalid"],
  LowPassFilter_reverse:   [...GEO, "statusColor", "temperature", "centerFreq", "isInvalid"],
  SSPA_reverse:            [...GEO, "statusColor", "temperature", "isInvalid"],
  NSGU_reverse:            [...GEO, "statusColor", "temperature", "isInvalid"],
  Modulator_reverse:       [...GEO, "statusColor", "temperature", "isInvalid"],
  ACMU_reverse:            [...GEO, "statusColor", "temperature", "referenceInputClock", "phaseMeterInputClock", "synthesizerLockStatus", "phaseMeterLockStatus", "clockPresent", "samplingTime", "isInvalid"],
  RFCoupler_reverse:       [...GEO, "fill", "stroke", "strokeWidth", "isInvalid"],
  Battery:        [...GEO, "statusColor", "chargeLevel", "isCharging", "isInvalid"],
  MomentumWheel:  [...GEO, "statusColor", "wheelSpeed", "wheelDirection", "wheelTemperature", "wheelCurrent", "isInvalid"],
  DTG:            [...GEO, "statusColor", "dtgSpeed", "dtgPitch", "dtgRoll", "dtgTemperature", "isInvalid"],
  SP2T:           [...GEO, "statusColor", "position", "isInvalid"],
  SP2TC:          [...GEO, "statusColor", "position", "isInvalid"],
  SP2TNoBg:       [...GEO, "statusColor", "position", "isInvalid"],
  Switch3P:       [...GEO, "statusColor", "position", "isInvalid"],
  Switch4P:       [...GEO, "statusColor", "position", "isInvalid"],
  DP3T:           [...GEO, "statusColor", "position", "isInvalid"],
  TransferSwitch: [...GEO, "statusColor", "position", "isInvalid"],
  DPDT:           [...GEO, "statusColor", "position", "isInvalid"],
  DPDT_N:         [...GEO, "statusColor", "position", "isInvalid"],
  Ground:         [...GEO, "stroke", "opacity"],
  Diode:          [...GEO, "statusColor", "isInvalid"],
  ZenerDiode:     [...GEO, "statusColor", "isInvalid"],
  Resistor:       [...GEO, "statusColor", "isInvalid"],
  Capacitor:      [...GEO, "statusColor", "isInvalid"],
  Fuse:           [...GEO, "statusColor", "isInvalid"],
  Mosfet:         [...GEO, "statusColor", "activeColor", "lineColor", "isInvalid"],
  SpstSwitch:     [...GEO, "statusColor", "activeColor", "lineColor", "name", "isInvalid"],
  CurrentSensor:  [...GEO, "statusColor", "statusText", "currentValue", "isInvalid"],
  Indicator:      [...GEO, "statusColor", "isInvalid"],                         // LED status dot
  NumericDisplay: [...GEO, "statusColor", "indicatorValue", "isInvalid"],       // digital numeric readout
  Thruster:         [...GEO, "statusColor", "thrustLevel", "oxidizerEnabled", "fuelEnabled", "isInvalid"],
  MonopropThruster: [...GEO, "statusColor", "thrustLevel", "fuelEnabled", "isInvalid"],
  Pump:           [...GEO, "statusColor", "pumpSpeed", "isInvalid"],
  Image:          [...GEO, "imageSource", "isInvalid"],
  /** Inline SVG: whole-node GEO + appearance; sub-parts use same props via bindings with svgElementId set */
  SvgGraphic:     [...GEO, "fill", "stroke", "strokeWidth", "opacity", "visible",
                   "statusColor", "statusText", "text", "isInvalid",
                   "flowActive", "flowDirection"],
  // Generic elements — full geometric + all appearance props
  Rect:           [...GEO, "fill", "stroke", "strokeWidth", "statusColor", "statusText", "isInvalid"],
  Circle:         [...GEO, "fill", "stroke", "strokeWidth", "statusColor", "statusText", "isInvalid"],
  TextLabel:           [...GEO, "fill", "stroke", "strokeWidth", "statusColor", "statusText", "text", "isInvalid"],
  TransparentLabel:    [...GEO, "statusColor", "statusText", "text", "textContent", "isInvalid"],
  Indicator2:     [...GEO, "fill", "stroke", "strokeWidth", "statusColor", "statusText", "isInvalid"],
  // Rubidium atomic clock — only the 4 operationally meaningful TM bindings:
  //   position    = 0 → OFF (no animation), ≥1 → ON (fast cyan electron pumping)
  //   isLocked    = true → FREQ LOCK acquired (slow gold orbit, sine-wave display)
  //   temperature = crystal / oven temperature in °C
  //   isInvalid   = red INV indicator + red border
  RubidiumClock:  ["position", "isLocked", "temperature", "isInvalid", "titleFontSize", "tempFontSize"],
  // Rubidium atomic clock — energy-state visualisation (same TM bindings):
  RubidiumAtom:   ["position", "isLocked", "temperature", "isInvalid", "titleFontSize", "tempFontSize"],
  HornAntenna:        ["position", "isInvalid", "titleFontSize"],
  PatchArrayAntenna:  ["position", "isInvalid", "titleFontSize"],
  HelicalAntenna:     ["position", "isInvalid", "titleFontSize"],
  OffsetReflector:    ["position", "isInvalid", "titleFontSize"],
  // DataGrid — rows are managed by the InspectorDataGrid slice; bindings auto-created per row
  DataGrid:       [...GEO, "isInvalid", "titleFontSize", "rowFontSize", "labelColor", "valueColor"],
  // PlotGraph — y-series are commonly bound to dynamic props plot_y_0..plot_y_3
  PlotGraph:      [...GEO, "isInvalid", "plot_x", "plot_y_0", "plot_y_1", "plot_y_2", "plot_y_3"],
  // TextBox — scrollable live-text display with conditional colour
  TextBox:        [...GEO, "isInvalid", "staticText", "textTopic", "colorTopic",
                   "colorConditions", "textColor", "fontSize", "fontFamily",
                   "bgColor", "borderColor", "titleBarBg", "titleFontSize",
                   "tg_text", "tg_color"],
  // ── Gaganyaan ECLSS ───────────────────────────────────────────────────────
  PyroValve:      [...GEO, "statusColor", "position", "isInvalid"],
  SolenoidValve:  [...GEO, "statusColor", "position", "isInvalid"],
  MotorValve:     [...GEO, "statusColor", "position", "isInvalid"],
  HeatExchanger:  [...GEO, "statusColor", "temperature", "isInvalid"],
  Radiator:       [...GEO, "statusColor", "temperature", "isInvalid"],
  RadiatorFan:    [...GEO, "statusColor", "flowActive", "temperature", "isInvalid"],
  HeaterPlate:    [...GEO, "statusColor", "heaterOn", "temperature", "isInvalid"],
  Compensator:    [...GEO, "statusColor", "level", "isInvalid"],
  CheckValve:     [...GEO, "statusColor", "isInvalid"],
  LFCU:           [...GEO, "statusColor", "position", "isInvalid"],
  Robot:          [...GEO, "statusColor", "posture", "rightArm", "leftArm", "namaste", "isInvalid"],
  CtrlBoard:      [...GEO, "statusColor", "status", "signalActive", "titleFontSize", "isInvalid"],
  FreehandPath:   [...GEO, "strokeColor", "strokeWidth", "flowActive", "flowDirection", "pathType", "bendFactor", "points"],
};

/** Palette items dragged onto the canvas */
export const PALETTE_ITEMS: Array<{ section: string; category: string; label: string; defaults: Partial<ScadaNodeData> }> = [
  // ── Switches ──────────────────────────────────────────────────────────────
  { section: "Switches", category: "SpstSwitch",      label: "SPST Switch",       defaults: { fill: "transparent", stroke: "transparent", strokeWidth: 0, statusColor: "", activeColor: "#9b59b6", lineColor: "#7a7a9a", name: "", opacity: 1 } },
  { section: "Switches", category: "SP2T",           label: "SP2T Switch",       defaults: { fill: "#22223a", stroke: "#a8a8b8", strokeWidth: 4, position: 0, opacity: 1 } },
  { section: "Switches", category: "SP2TC",          label: "SP2T (Round)",      defaults: { fill: "#22223a", stroke: "#a8a8b8", strokeWidth: 4, position: 0, opacity: 1 } },
  { section: "Switches", category: "SP2TNoBg",       label: "SP2T No BG",        defaults: { fill: "transparent", stroke: "transparent", strokeWidth: 0, position: 0, opacity: 1 } },
  { section: "Switches", category: "Switch3P",       label: "Switch 3P",         defaults: { fill: "#22223a", stroke: "#a8a8b8", strokeWidth: 4, position: 0, opacity: 1 } },
  { section: "Switches", category: "Switch4P",       label: "Switch 4P",         defaults: { fill: "#22223a", stroke: "#a8a8b8", strokeWidth: 4, position: 1, opacity: 1 } },
  { section: "Switches", category: "DP3T",           label: "DP3T Switch",       defaults: { fill: "#22223a", stroke: "#a8a8b8", strokeWidth: 4, position: 0, opacity: 1 } },
  { section: "Switches", category: "TransferSwitch", label: "Transfer Switch",   defaults: { fill: "#22223a", stroke: "#a8a8b8", strokeWidth: 4, position: 0, opacity: 1 } },
  { section: "Switches", category: "DPDT",           label: "DPDT Switch",       defaults: { fill: "#22223a", stroke: "#a8a8b8", strokeWidth: 4, position: 0, opacity: 1 } },
  { section: "Switches", category: "DPDT_N",         label: "DPDT Switch (N)",   defaults: { fill: "#22223a", stroke: "#a8a8b8", strokeWidth: 4, position: 0, opacity: 1 } },
  // ── RF / Microwave ────────────────────────────────────────────────────────
  { section: "RF / Microwave", category: "TWTA",           label: "TWTA",               defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, statusColor: "", temperature: undefined, opacity: 1 } },
  { section: "RF / Microwave", category: "DriverAmplifier", label: "Driver Amplifier",  defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, statusColor: "#22c55e", statusText: "FGM", temperature: -3.5, gaugeValue: 1.20, opacity: 1 } },
  { section: "RF / Microwave", category: "TWTADA",          label: "Driver Amp + TWTA", defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, statusColor: "#27ae60", statusText: "FGM", temperature: 52.0, gaugeValue: 1.20, daName: "DA", twtaName: "TWTA", opacity: 1 } },
  { section: "RF / Microwave", category: "SSPA",            label: "SS Power Amplifier",defaults: { fill: "#0e1828", stroke: "#0e1828", strokeWidth: 4, name: "SSPA", statusColor: "#27ae60", temperature: undefined, opacity: 1 } },
  { section: "RF / Microwave", category: "LNA",             label: "LNA",               defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "LNA", statusColor: "#27ae60", temperature: 28.0, opacity: 1 } },
  { section: "RF / Microwave", category: "RFDownConverter", label: "RF Down Converter", defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "RF D/C", statusColor: "#27ae60", temperature: 38.0, opacity: 1 } },
  { section: "RF / Microwave", category: "RFUpConverter",   label: "RF Up Converter",   defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "RF U/C", statusColor: "#27ae60", temperature: 38.0, opacity: 1 } },
  { section: "RF / Microwave", category: "RFCirculator",    label: "RF Circulator",     defaults: { fill: "#ffffff", stroke: "#1a1a1a", strokeWidth: 2, name: "RF Circulator", temperature: undefined, opacity: 1 } },
  { section: "RF / Microwave", category: "BandpassFilter",  label: "Bandpass Filter",   defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "BPF", statusColor: "#27ae60", temperature: 30.0, opacity: 1 } },
  { section: "RF / Microwave", category: "LowPassFilter",   label: "Low Pass Filter",   defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "LPF", statusColor: "#27ae60", temperature: 30.0, opacity: 1 } },
  { section: "RF / Microwave", category: "Receiver",        label: "Receiver",          defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "Receiver", statusColor: "#27ae60", temperature: 32.0, opacity: 1 } },
  { section: "RF / Microwave", category: "ReceiverDemod",   label: "Receiver w/ Demod", defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "Rcv+DEM", statusColor: "#27ae60", temperature: 32.0, opacity: 1 } },
  { section: "RF / Microwave", category: "Transmitter",     label: "Transmitter",       defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "TXMTR",   statusColor: "#27ae60", temperature: 32.0, opacity: 1 } },
  { section: "RF / Microwave", category: "NSGU",            label: "Nav Signal Gen (NSGU)", defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "NSGU",    statusColor: "#27ae60", temperature: 28.0, opacity: 1 } },
  { section: "RF / Microwave", category: "Modulator",       label: "Modulator (DSSS/PSK)",  defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "MOD",     statusColor: "#27ae60", temperature: 30.0, opacity: 1 } },
  { section: "RF / Microwave", category: "QPSKModulator",   label: "QPSK Modulator",       defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "QPSK MOD", statusColor: "#27ae60", temperature: 30.0, opacity: 1 } },
  { section: "RF / Microwave", category: "QPSKDemodulator", label: "QPSK Demodulator",     defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "QPSK DEM", statusColor: "#27ae60", temperature: 30.0, opacity: 1 } },
  { section: "RF / Microwave", category: "TMDecoder",       label: "TM Decoder", defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "TM DECODER", statusColor: "#27ae60", temperature: 34.0, opacity: 1 } },
  { section: "RF / Microwave", category: "TMDecoder_reverse", label: "TMDecoder_reverse", defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "TM DECODER", statusColor: "#27ae60", temperature: 34.0, opacity: 1 } },
  { section: "RF / Microwave", category: "RFCoupler",       label: "RF Coupler",            defaults: { fill: "#1e90b8", stroke: "#0d5f78", strokeWidth: 2, opacity: 1 } },
  { section: "RF / Microwave", category: "ACMU",            label: "ACMU (Atomic Clock Mgmt)", defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "ACMU", statusColor: "#27ae60", temperature: 28.0, referenceInputClock: 1, phaseMeterInputClock: 2, synthesizerLockStatus: true, phaseMeterLockStatus: true, clockPresent: true, samplingTime: 1.1, opacity: 1 } },
  { section: "RF / Microwave", category: "TWTA_reverse",            label: "TWTA_reverse",            defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, statusColor: "", temperature: undefined, opacity: 1 } },
  { section: "RF / Microwave", category: "DriverAmplifier_reverse", label: "DriverAmplifier_reverse", defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, statusColor: "#22c55e", statusText: "FGM", temperature: -3.5, gaugeValue: 1.20, opacity: 1 } },
  { section: "RF / Microwave", category: "TWTADA_reverse",          label: "TWTADA_reverse",          defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, statusColor: "#27ae60", statusText: "FGM", temperature: 52.0, gaugeValue: 1.20, daName: "DA", twtaName: "TWTA", opacity: 1 } },
  { section: "RF / Microwave", category: "SSPA_reverse",            label: "SSPA_reverse",            defaults: { fill: "#0e1828", stroke: "#0e1828", strokeWidth: 4, name: "SSPA", statusColor: "#27ae60", temperature: undefined, opacity: 1 } },
  { section: "RF / Microwave", category: "LNA_reverse",             label: "LNA_reverse",             defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "LNA", statusColor: "#27ae60", temperature: 28.0, opacity: 1 } },
  { section: "RF / Microwave", category: "RFDownConverter_reverse", label: "RFDownConverter_reverse", defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "RF D/C", statusColor: "#27ae60", temperature: 38.0, opacity: 1 } },
  { section: "RF / Microwave", category: "RFUpConverter_reverse",   label: "RFUpConverter_reverse",   defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "RF U/C", statusColor: "#27ae60", temperature: 38.0, opacity: 1 } },
  { section: "RF / Microwave", category: "RFCirculator_reverse",    label: "RFCirculator_reverse",    defaults: { fill: "#ffffff", stroke: "#1a1a1a", strokeWidth: 2, name: "RF Circulator", temperature: undefined, opacity: 1 } },
  { section: "RF / Microwave", category: "BandpassFilter_reverse",  label: "BandpassFilter_reverse",  defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "BPF", statusColor: "#27ae60", temperature: 30.0, opacity: 1 } },
  { section: "RF / Microwave", category: "LowPassFilter_reverse",   label: "LowPassFilter_reverse",   defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "LPF", statusColor: "#27ae60", temperature: 30.0, opacity: 1 } },
  { section: "RF / Microwave", category: "Receiver_reverse",        label: "Receiver_reverse",        defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "Receiver", statusColor: "#27ae60", temperature: 32.0, opacity: 1 } },
  { section: "RF / Microwave", category: "ReceiverDemod_reverse",   label: "ReceiverDemod_reverse",   defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "Rcv+DEM", statusColor: "#27ae60", temperature: 32.0, opacity: 1 } },
  { section: "RF / Microwave", category: "Transmitter_reverse",     label: "Transmitter_reverse",     defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "TXMTR", statusColor: "#27ae60", temperature: 32.0, opacity: 1 } },
  { section: "RF / Microwave", category: "NSGU_reverse",            label: "NSGU_reverse",            defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "NSGU", statusColor: "#27ae60", temperature: 28.0, opacity: 1 } },
  { section: "RF / Microwave", category: "Modulator_reverse",       label: "Modulator_reverse",       defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "MOD", statusColor: "#27ae60", temperature: 30.0, opacity: 1 } },
  { section: "RF / Microwave", category: "RFCoupler_reverse",       label: "RFCoupler_reverse",       defaults: { fill: "#1e90b8", stroke: "#0d5f78", strokeWidth: 2, opacity: 1 } },
  { section: "RF / Microwave", category: "ACMU_reverse",            label: "ACMU_reverse",            defaults: { fill: "#22223a", stroke: "#22223a", strokeWidth: 4, name: "ACMU", statusColor: "#27ae60", temperature: 28.0, referenceInputClock: 1, phaseMeterInputClock: 2, synthesizerLockStatus: true, phaseMeterLockStatus: true, clockPresent: true, samplingTime: 1.1, opacity: 1 } },
  // ── Fluid & Mechanical ───────────────────────────────────────────────────
  { section: "Fluid & Mechanical", category: "Tank",     label: "Tank",    defaults: { fill: "#1e2d3d", stroke: "#d0d0e0", strokeWidth: 6, statusColor: "#2d8fdd", level: 65, opacity: 1 } },
  { section: "Fluid & Mechanical", category: "Pump",     label: "Pump",    defaults: { fill: "#0e1828", stroke: "#4a9eff", strokeWidth: 2, statusColor: "", pumpSpeed: 0, opacity: 1 } },
  { section: "Fluid & Mechanical", category: "Thruster",         label: "Thruster (Biprop)",  defaults: { opacity: 1, name: "", thrustLevel: 0, oxidizerEnabled: false, fuelEnabled: false } },
  { section: "Fluid & Mechanical", category: "MonopropThruster", label: "Thruster (Monoprop)", defaults: { opacity: 1, name: "", thrustLevel: 0, fuelEnabled: false } },
  // ── Power & Storage ──────────────────────────────────────────────────────
  { section: "Power & Storage", category: "Battery", label: "Battery", defaults: { fill: "#22223a", stroke: "#a8a8b8", strokeWidth: 4, chargeLevel: 75, isCharging: false, opacity: 1 } },
  // ── Attitude & Motion ────────────────────────────────────────────────────
  { section: "Attitude & Motion", category: "MomentumWheel", label: "Momentum Wheel", defaults: { fill: "#0e1c2a", stroke: "#4a9eff", strokeWidth: 3, name: "Wheel", statusColor: "#4a9eff", wheelSpeed: 2500, wheelDirection: 1, wheelTemperature: 28.5, wheelCurrent: 2.50, opacity: 1 } },
  { section: "Attitude & Motion", category: "DTG",           label: "DTG Gyroscope",  defaults: { fill: "#0a1428", stroke: "#4a9eff", strokeWidth: 3, name: "DTG", statusColor: "#4a9eff", dtgSpeed: 6000, dtgPitch: 0.0, dtgRoll: 0.0, dtgTemperature: 28.5, opacity: 1 } },
  // ── Electronics ─────────────────────────────────────────────────────────
  { section: "Electronics", category: "Ground",      label: "Ground",      defaults: { fill: "transparent", stroke: "#b0bec5", strokeWidth: 0, name: "", opacity: 1 } },
  { section: "Electronics", category: "Diode",      label: "Diode",       defaults: { fill: "#22223a", stroke: "#a8a8b8", strokeWidth: 4, statusColor: "", opacity: 1 } },
  { section: "Electronics", category: "ZenerDiode", label: "Zener Diode", defaults: { fill: "#22223a", stroke: "#a8a8b8", strokeWidth: 4, statusColor: "", opacity: 1 } },
  { section: "Electronics", category: "Resistor",   label: "Resistor",    defaults: { fill: "#22223a", stroke: "#a8a8b8", strokeWidth: 4, statusColor: "", opacity: 1 } },
  { section: "Electronics", category: "Capacitor",  label: "Capacitor",   defaults: { fill: "#22223a", stroke: "#a8a8b8", strokeWidth: 4, statusColor: "", opacity: 1 } },
  { section: "Electronics", category: "Fuse",       label: "Fuse",        defaults: { fill: "#22223a", stroke: "#a8a8b8", strokeWidth: 4, statusColor: "", opacity: 1 } },
  { section: "Electronics", category: "Mosfet",     label: "MOSFET Switch", defaults: { fill: "transparent", stroke: "transparent", strokeWidth: 0, statusColor: "", activeColor: "#27ae60", lineColor: "#94a3b8", name: "", opacity: 1 } },
  { section: "Electronics", category: "CurrentSensor", label: "Current Sensor (CT)", defaults: { fill: "#0a1018", stroke: "#27ae60", strokeWidth: 2, name: "I SENSOR", statusColor: "#27ae60", currentValue: 0, currentUnits: "A", opacity: 1 } },
  { section: "Electronics", category: "Indicator",      label: "LED Indicator",      defaults: { fill: "#0a1018", stroke: "#27ae60", strokeWidth: 2, name: "", statusColor: "#27ae60", opacity: 1 } },
  { section: "Electronics", category: "NumericDisplay", label: "Numeric Display",    defaults: { fill: "#0a1018", stroke: "#27ae60", strokeWidth: 2, name: "", statusColor: "#27ae60", indicatorValue: 0, indicatorUnits: "", indicatorIntDigits: 3, indicatorDecDigits: 3, opacity: 1 } },
  // ── Monitoring ──────────────────────────────────────────────────────────
  { section: "Monitoring", category: "Gauge",    label: "Gauge",     defaults: { fill: "#22223a", stroke: "#a8a8b8", strokeWidth: 4, gaugeValue: 50, gaugeMin: 0, gaugeMax: 100, opacity: 1 } },
  { section: "Monitoring", category: "PlotGraph", label: "Plot Graph", defaults: { fill: "#0d1117", stroke: "#2a3a4a", strokeWidth: 1, name: "Telemetry Plot", plotTitle: "Telemetry Plot", plotType: "line", plotXMode: "time", plotXTopic: "", plotYTopics: [""], plotBufferSeconds: 120, opacity: 1 } },
  { section: "Monitoring", category: "DataGrid", label: "Data Grid", defaults: { fill: "#0d1117", stroke: "#1e3040", strokeWidth: 1, name: "", opacity: 1 } },
  { section: "Monitoring", category: "TextBox",  label: "Text Box",  defaults: { opacity: 1, name: "", staticText: "", bgColor: "#0d1117", borderColor: "#2a3a4a", titleBarBg: "#0e1f30", textColor: "#c9d1d9", fontSize: 13 } },
  // ── Systems ──────────────────────────────────────────────────────────────
  { section: "Systems", category: "System", label: "System", defaults: { fill: "#0d1520", stroke: "#bdd1c5", strokeWidth: 2, name: "SYSTEM", statusColor: "#27ae60", temperature: undefined, opacity: 1 } },
  { section: "Systems", category: "FPGA",   label: "FPGA",   defaults: { fill: "#0a1428", stroke: "#4a7aaa", strokeWidth: 3, name: "FPGA",   statusColor: "#27ae60", temperature: 45.0, opacity: 1 } },
  // ── Shapes & Labels ──────────────────────────────────────────────────────
  { section: "Shapes & Labels", category: "Circle",   label: "Circle",    defaults: { fill: "#0c3a64", stroke: "#7a7aff", strokeWidth: 4, opacity: 1 } },
  { section: "Shapes & Labels", category: "Rect",     label: "Rectangle", defaults: { fill: "#0c3a64", stroke: "#7a7aff", strokeWidth: 4, opacity: 1 } },
  { section: "Shapes & Labels", category: "TextLabel",         label: "Text Label",        defaults: { fill: "#111827", stroke: "#111827", strokeWidth: 1, statusColor: "#ffffff", fontSize: 16, opacity: 1 } },
  { section: "Shapes & Labels", category: "TransparentLabel",  label: "Transparent Label", defaults: { statusColor: "#ffffff", fontSize: 16, opacity: 1, labelSuffix: "°C" } },
  { section: "Shapes & Labels", category: "Image",    label: "Image",     defaults: { fill: "transparent", stroke: "#30363d", strokeWidth: 1, opacity: 1 } },
  // ── Timing / Frequency Standards ─────────────────────────────────────────
  // ── Antenna ───────────────────────────────────────────────────────────────
  { section: "Antenna", category: "HornAntenna",       label: "Horn Antenna",        defaults: { fill: "transparent", stroke: "transparent", strokeWidth: 0, name: "HORN ANT",    position: 1, opacity: 1 } },
  { section: "Antenna", category: "PatchArrayAntenna", label: "Patch Array Antenna", defaults: { fill: "transparent", stroke: "transparent", strokeWidth: 0, name: "PATCH ARRAY",  position: 0, opacity: 1 } },
  { section: "Antenna", category: "HelicalAntenna",    label: "Helical Antenna",      defaults: { fill: "transparent", stroke: "transparent", strokeWidth: 0, name: "HELICAL ANT",  position: 0, opacity: 1 } },
  { section: "Antenna", category: "OffsetReflector",   label: "Offset Reflector",     defaults: { fill: "transparent", stroke: "transparent", strokeWidth: 0, name: "OFFSET DISH", position: 0, opacity: 1 } },
  // ── Timing / Frequency Standards ─────────────────────────────────────────
  { section: "Timing", category: "RubidiumClock", label: "Rb Clock (orbital)",    defaults: { fill: "#0d1117", stroke: "#4a9eff", strokeWidth: 3, name: "Rb CLOCK", position: 1, isLocked: false, temperature: 60.0, opacity: 1 } },
  { section: "Timing", category: "RubidiumAtom",  label: "Rb Clock (energy states)", defaults: { fill: "#0d1117", stroke: "#4a9eff", strokeWidth: 3, name: "Rb CLOCK", position: 1, isLocked: false, temperature: 60.0, opacity: 1 } },
  // ── ECLSS (Gaganyaan G1 Mission) ─────────────────────────────────────────
  // Actuators
  { section: "ECLSS", category: "LFCU",         label: "LFCU",             defaults: { fill: "#0a1018", stroke: "#27ae60", strokeWidth: 2, name: "LFCU",     statusColor: "", position: 0.5, opacity: 1 } },
  { section: "Fluid & Mechanical", category: "SolenoidValve",label: "Solenoid Valve",   defaults: { fill: "#0a0a18", stroke: "#a8a8b8", strokeWidth: 3, name: "SOL VLV",  statusColor: "", position: 0,   opacity: 1 } },
  { section: "Fluid & Mechanical", category: "MotorValve",   label: "Motor Valve",      defaults: { fill: "#0a1018", stroke: "#27ae60", strokeWidth: 2, name: "MOV",      statusColor: "", position: 0,   opacity: 1 } },
  { section: "Fluid & Mechanical", category: "PyroValve",    label: "Pyro Valve",       defaults: { fill: "#1a1208", stroke: "#ff9800", strokeWidth: 3, name: "PYRO",     statusColor: "", position: 0,   opacity: 1 } },
  { section: "Fluid & Mechanical", category: "CheckValve",   label: "Check Valve",      defaults: { fill: "#0a1018", stroke: "#a8a8b8", strokeWidth: 2, name: "CHK VLV",  statusColor: "",               opacity: 1 } },
  { section: "Fluid & Mechanical", category: "Valve",        label: "Manual Valve",     defaults: { fill: "#22223a", stroke: "#a8a8b8", strokeWidth: 3, name: "VALVE",    statusColor: "",               opacity: 1 } },
  // Fluid circuit
  { section: "ECLSS", category: "HeatExchanger",label: "Heat Exchanger",   defaults: { fill: "#0a1018", stroke: "#607080", strokeWidth: 2, name: "HEX",      statusColor: "", temperature: undefined, opacity: 1 } },
  { section: "ECLSS", category: "Radiator",     label: "Radiator",         defaults: { fill: "#0a1018", stroke: "#4a7090", strokeWidth: 2, name: "RADIATOR", statusColor: "", temperature: undefined, opacity: 1 } },
  { section: "ECLSS", category: "RadiatorFan",  label: "Radiator Fan",     defaults: { fill: "#0a1018", stroke: "#4a7090", strokeWidth: 2, name: "RAD FAN", statusColor: "", temperature: undefined, opacity: 1 } },
  { section: "ECLSS", category: "HeaterPlate",  label: "Heater Plate",     defaults: { fill: "#0a1018", stroke: "#8a6540", strokeWidth: 2, name: "HEATER",  statusColor: "", heaterOn: false, temperature: undefined, opacity: 1 } },
  { section: "ECLSS", category: "Compensator",  label: "Compensator",      defaults: { fill: "#0a1018", stroke: "#6080a0", strokeWidth: 2, name: "COMP",     statusColor: "", level: 60,     opacity: 1 } },
  // Controllers
  { section: "ECLSS", category: "CtrlBoard",    label: "Controller Board", defaults: { opacity: 1, name: "", statusColor: "#4a9eff", status: "nominal", signalActive: "true", titleFontSize: 10.5 } },
  // ── Humanoid ─────────────────────────────────────────────────────────────
  { section: "Humanoid", category: "Robot", label: "Robot / Astronaut", defaults: { opacity: 1, name: "", statusColor: "#4a9eff", posture: "reclined", rightArm: "down", leftArm: "down", namaste: "false" } },
];
