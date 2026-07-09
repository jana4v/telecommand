import {
  Graph,
  Selection,
  Snapline,
  History,
  Clipboard,
  Keyboard,
  Transform,
  Scroller,
} from "@antv/x6";
import { register } from "@antv/x6-vue-shape";
import { defineComponent, h } from "vue";

// ── Import all SCADA node components ──────────────────────────────────────
import ValveNode           from "../nodes/ValveNode.vue";
import TankNode            from "../nodes/TankNode.vue";
import GaugeNode           from "../nodes/GaugeNode.vue";
import TwtaNode            from "../nodes/TwtaNode.vue";
import BatteryNode         from "../nodes/BatteryNode.vue";
import MomentumWheelNode   from "../nodes/MomentumWheelNode.vue";
import DtgNode             from "../nodes/DtgNode.vue";
import SwitchSP2TNode      from "../nodes/SwitchSP2TNode.vue";
import Sp2tCircleNode      from "../nodes/Sp2tCircleNode.vue";
import Sp2tNoBackgroundNode from "../nodes/Sp2tNoBackgroundNode.vue";
import Switch3PNode        from "../nodes/Switch3PNode.vue";
import Switch4PNode        from "../nodes/Switch4PNode.vue";
import Dp3tNode            from "../nodes/Dp3tNode.vue";
import TransferSwitchNode  from "../nodes/TransferSwitchNode.vue";
import ThrusterNode        from "../nodes/ThrusterNode.vue";
import MonopropThrusterNode from "../nodes/MonopropThrusterNode.vue";
import GroundNode          from "../nodes/GroundNode.vue";
import DiodeNode           from "../nodes/DiodeNode.vue";
import ZenerDiodeNode      from "../nodes/ZenerDiodeNode.vue";
import ResistorNode        from "../nodes/ResistorNode.vue";
import CapacitorNode       from "../nodes/CapacitorNode.vue";
import FuseNode            from "../nodes/FuseNode.vue";
import MosfetNode          from "../nodes/MosfetNode.vue";
import SpstSwitchNode      from "../nodes/SpstSwitchNode.vue";
import CurrentSensorNode   from "../nodes/CurrentSensorNode.vue";
import LEDNode             from "../nodes/LEDNode.vue";
import IndicatorNode       from "../nodes/IndicatorNode.vue"; // numeric display (formerly "indicator")
import ImageNode           from "../nodes/ImageNode.vue";
import SvgNode             from "../nodes/SvgNode.vue";
import CircleNode          from "../nodes/CircleNode.vue";
import RectNode            from "../nodes/RectNode.vue";
import TextLabelNode          from "../nodes/TextLabelNode.vue";
import TransparentLabelNode   from "../nodes/TransparentLabelNode.vue";
import DriverAmplifierNode   from "../nodes/DriverAmplifierNode.vue";
import TwtaDaNode            from "../nodes/TwtaDaNode.vue";
import RfDownConverterNode  from "../nodes/RfDownConverterNode.vue";
import RfUpConverterNode    from "../nodes/RfUpConverterNode.vue";
import LnaNode              from "../nodes/LnaNode.vue";
import ReceiverNode         from "../nodes/ReceiverNode.vue";
import ReceiverDemodNode   from "../nodes/ReceiverDemodNode.vue";
import TransmitterNode     from "../nodes/TransmitterNode.vue";
import NsguNode           from "../nodes/NsguNode.vue";
import ModulatorNode      from "../nodes/ModulatorNode.vue";
import QpskModulatorNode  from "../nodes/QpskModulatorNode.vue";
import QpskDemodNode      from "../nodes/QpskDemodNode.vue";
import TmDecoderNode      from "../nodes/TmDecoderNode.vue";
import RfCouplerNode      from "../nodes/RfCouplerNode.vue";
import AcmuNode           from "../nodes/AcmuNode.vue";
import FpgaNode             from "../nodes/FpgaNode.vue";
import RfCirculatorNode     from "../nodes/RfCirculatorNode.vue";
import BandpassFilterNode  from "../nodes/BandpassFilterNode.vue";
import LowPassFilterNode   from "../nodes/LowPassFilterNode.vue";
import SystemNode          from "../nodes/SystemNode.vue";
import SspaNode            from "../nodes/SspaNode.vue";
import PumpNode            from "../nodes/PumpNode.vue";
import DpdtSwitchNode      from "../nodes/DpdtSwitchNode.vue";
import DpdtNSwitchNode     from "../nodes/DpdtNSwitchNode.vue";
import RubidiumClockNode   from "../nodes/RubidiumClockNode.vue";
import RubidiumAtomNode    from "../nodes/RubidiumAtomNode.vue";
import HornAntennaNode        from "../nodes/HornAntennaNode.vue";
import PatchArrayAntennaNode  from "../nodes/PatchArrayAntennaNode.vue";
import HelicalAntennaNode     from "../nodes/HelicalAntennaNode.vue";
import OffsetReflectorNode   from "../nodes/OffsetReflectorNode.vue";
import DataGridNode           from "../nodes/DataGridNode.vue";
import PlotGraphNode          from "../nodes/PlotGraphNode.vue";
import TextBoxNode            from "../nodes/TextBoxNode.vue";
// ── Gaganyaan ECLSS nodes ─────────────────────────────────────────────────
import PyroValveNode         from "../nodes/PyroValveNode.vue";
import SolenoidValveNode     from "../nodes/SolenoidValveNode.vue";
import MotorValveNode        from "../nodes/MotorValveNode.vue";
import HeatExchangerNode     from "../nodes/HeatExchangerNode.vue";
import RadiatorNode          from "../nodes/RadiatorNode.vue";
import RadiatorFanNode       from "../nodes/RadiatorFanNode.vue";
import HeaterPlateNode       from "../nodes/HeaterPlateNode.vue";
import CompensatorNode       from "../nodes/CompensatorNode.vue";
import CheckValveNode        from "../nodes/CheckValveNode.vue";
import LfcuNode              from "../nodes/LfcuNode.vue";
import RobotNode             from "../nodes/RobotNode.vue";
import CtrlBoardNode         from "../nodes/CtrlBoardNode.vue";
import FreehandPathNode      from "../nodes/FreehandPathNode.vue";
import ReverseNode           from "../nodes/ReverseNode.vue";

function makeReverseNode(baseComponent: any) {
  return defineComponent({
    name: `Reverse${baseComponent?.name ?? "Node"}`,
    setup() {
      return () => h(ReverseNode as any, { component: baseComponent });
    },
  });
}

const TwtaNodeReverse = makeReverseNode(TwtaNode);
const DriverAmplifierNodeReverse = makeReverseNode(DriverAmplifierNode);
const TwtaDaNodeReverse = makeReverseNode(TwtaDaNode);
const SspaNodeReverse = makeReverseNode(SspaNode);
const LnaNodeReverse = makeReverseNode(LnaNode);
const RfDownConverterNodeReverse = makeReverseNode(RfDownConverterNode);
const RfUpConverterNodeReverse = makeReverseNode(RfUpConverterNode);
const RfCirculatorNodeReverse = makeReverseNode(RfCirculatorNode);
const BandpassFilterNodeReverse = makeReverseNode(BandpassFilterNode);
const LowPassFilterNodeReverse = makeReverseNode(LowPassFilterNode);
const ReceiverNodeReverse = makeReverseNode(ReceiverNode);
const ReceiverDemodNodeReverse = makeReverseNode(ReceiverDemodNode);
const TransmitterNodeReverse = makeReverseNode(TransmitterNode);
const NsguNodeReverse = makeReverseNode(NsguNode);
const ModulatorNodeReverse = makeReverseNode(ModulatorNode);
const TmDecoderNodeReverse = makeReverseNode(TmDecoderNode);
const RfCouplerNodeReverse = makeReverseNode(RfCouplerNode);
const AcmuNodeReverse = makeReverseNode(AcmuNode);

// ── Register all SCADA shapes ─────────────────────────────────────────────
const _PORT_MARKUP = [{ tagName: "circle", selector: "circle" }];
const PORT_GROUPS = {
  left:  { position: "left",   markup: _PORT_MARKUP, attrs: { circle: { r: 5, magnet: true, fill: "#0d1117", stroke: "#8090a0", strokeWidth: 1.5 } } },
  right: { position: "right",  markup: _PORT_MARKUP, attrs: { circle: { r: 5, magnet: true, fill: "#0d1117", stroke: "#8090a0", strokeWidth: 1.5 } } },
  top:   { position: "top",    markup: _PORT_MARKUP, attrs: { circle: { r: 5, magnet: true, fill: "#0d1117", stroke: "#8090a0", strokeWidth: 1.5 } } },
  bottom:{ position: "bottom", markup: _PORT_MARKUP, attrs: { circle: { r: 5, magnet: true, fill: "#0d1117", stroke: "#8090a0", strokeWidth: 1.5 } } },
};

const DEFAULT_PORTS = {
  groups: PORT_GROUPS,
  items: [
    { group: "left",   id: "left"   },
    { group: "right",  id: "right"  },
    { group: "top",    id: "top"    },
    { group: "bottom", id: "bottom" },
  ],
};

const LR_PORTS = {
  groups: PORT_GROUPS,
  items: [
    { group: "left",  id: "left"  },
    { group: "right", id: "right" },
  ],
};

const TB_PORTS = {
  groups: PORT_GROUPS,
  items: [
    { group: "top",    id: "top"    },
    { group: "bottom", id: "bottom" },
  ],
};

// Subtle port groups — blend with dark-body shapes (battery, etc.)
const SUBTLE_PORT_GROUPS = {
  top:    { position: "top",    markup: _PORT_MARKUP, attrs: { circle: { r: 5, magnet: true, fill: "#0d1117", stroke: "#8090a0", strokeWidth: 1.5 } } },
  bottom: { position: "bottom", markup: _PORT_MARKUP, attrs: { circle: { r: 5, magnet: true, fill: "#0d1117", stroke: "#8090a0", strokeWidth: 1.5 } } },
};

const SUBTLE_TB_PORTS = {
  groups: SUBTLE_PORT_GROUPS,
  items: [
    { group: "top",    id: "top"    },
    { group: "bottom", id: "bottom" },
  ],
};

// Port groups with no default items — groups defined so right-click context menu can add them
const NO_ITEM_PORTS = { groups: PORT_GROUPS, items: [] };

// ── Thruster-specific ports — two top ports that track OX/FUL inlets at any resize ──
// OX inlet sits at x≈10% of width; FUL inlet at x≈90% of width.
// Both at y=5 (top edge). Uses scada-switch-port proportional layout so ports
// stay locked to the visual inlet positions after resize.
const THRUSTER_PORT_GROUPS = {
  ox: {
    position: "scada-switch-port",
    markup: _PORT_MARKUP,
    attrs: { circle: { r: 5, magnet: true, fill: "#06101e", stroke: "#1858c8", strokeWidth: 1.8 } },
  },
  fuel: {
    position: "scada-switch-port",
    markup: _PORT_MARKUP,
    attrs: { circle: { r: 5, magnet: true, fill: "#160604", stroke: "#b83010", strokeWidth: 1.8 } },
  },
};
const THRUSTER_PORTS = {
  groups: THRUSTER_PORT_GROUPS,
  items: [
    { id: "ox",   group: "ox",   args: { xRatio: 0.10, yEdge: "top" as const } },
    { id: "fuel", group: "fuel", args: { xRatio: 0.90, yEdge: "top" as const } },
  ],
};

// ── Monoprop thruster — single centred propellant port on top ──
const MONOPROP_PORT_GROUPS = {
  fuel: {
    position: "scada-switch-port",
    markup: _PORT_MARKUP,
    attrs: { circle: { r: 5, magnet: true, fill: "#160604", stroke: "#b83010", strokeWidth: 1.8 } },
  },
};
const MONOPROP_THRUSTER_PORTS = {
  groups: MONOPROP_PORT_GROUPS,
  items: [
    { id: "fuel", group: "fuel", args: { xRatio: 0.50, yEdge: "top" as const } },
  ],
};

// ── Proportional port layout for switch elements ──────────────────────────
// Ports stay aligned to the visual connecting dots at any node size:
//   xEdge='left'  → x = 5px from left edge  (matches cx=5 in SVG)
//   xEdge='right' → x = width − 5px          (matches cx=w-5 in SVG)
//   yEdge='top'   → y = 5px from top edge    (matches cy=5 in SVG)
//   yEdge='bottom'→ y = height − 5px         (matches cy=h-5 in SVG)
//   xRatio/yRatio → proportional centre       (matches cx=w/2, cy=h*ratio)
try {
  Graph.registerPortLayout(
    "scada-switch-port",
    (portItems: any[], elemBBox: any) =>
      portItems.map((args: any) => ({
        position: {
          x: args.xEdge === "left"  ? 5
           : args.xEdge === "right" ? elemBBox.width  - 5
           : elemBBox.width  * (args.xRatio ?? 0.5),
          y: args.yEdge === "top"    ? 5
           : args.yEdge === "bottom" ? elemBBox.height - 5
           : elemBBox.height * (args.yRatio ?? 0.5),
        },
        angle: 0,
      })),
  );
} catch (e) {
  const msg = e instanceof Error ? e.message : String(e);
  // HMR can evaluate this module multiple times in dev; keep registration idempotent.
  if (!msg.includes("already registered")) throw e;
}

const CONN_ATTRS = { circle: { r: 6, magnet: true, fill: "transparent", stroke: "transparent" } };

type SwitchPortDef = { id: string; xEdge?: "left"|"right"; yEdge?: "top"|"bottom"; xRatio?: number; yRatio?: number };
function switchPorts(pts: SwitchPortDef[]) {
  return {
    groups: { conn: { position: "scada-switch-port", attrs: CONN_ATTRS } },
    items: pts.map(p => ({ id: p.id, group: "conn", args: p })),
  };
}

// Ground — single connection port at top centre
const GROUND_PORTS = {
  groups: {
    "gnd-in": {
      position: "scada-switch-port",
      markup: _PORT_MARKUP,
      attrs: { circle: { r: 5, magnet: true, fill: "#0d1117", stroke: "#8090a0", strokeWidth: 1.5 } },
    },
  },
  items: [{ id: "in", group: "gnd-in", args: { xRatio: 0.5, yEdge: "top" as const } }],
};

// Diode / ZenerDiode / Resistor — input at left-centre, output at right-centre
const LR_EDGE_PORTS = switchPorts([
  { id: "in",  xEdge: "left",  yRatio: 0.5 },
  { id: "out", xEdge: "right", yRatio: 0.5 },
]);

// SPST Switch — viewBox "0 0 110 70"
// Pivot (left terminal) circle  : SVG (16, 44)  → xRatio=16/110≈0.1455, yRatio=44/70≈0.629
// Contact (right terminal) circle: SVG (94, 44) → xRatio=94/110≈0.8545, yRatio=44/70≈0.629
// Ports sit exactly on the visible SVG circles, not at the wire stub endpoints.
const SPST_SWITCH_PORTS = {
  groups: {
    left:  { position: "scada-switch-port", markup: _PORT_MARKUP, attrs: { circle: { r: 5, magnet: true, fill: "#0d1117", stroke: "#8090a0", strokeWidth: 1.5 } } },
    right: { position: "scada-switch-port", markup: _PORT_MARKUP, attrs: { circle: { r: 5, magnet: true, fill: "#0d1117", stroke: "#8090a0", strokeWidth: 1.5 } } },
  },
  items: [
    { id: "left",  group: "left",  args: { xRatio: 16 / 110, yRatio: 44 / 70 } },
    { id: "right", group: "right", args: { xRatio: 94 / 110, yRatio: 44 / 70 } },
  ],
};

// MOSFET — viewBox "0 0 50 75"
//   G wire tip: x=0 (left edge),  y=43.089/75 of height  → xRatio=0,    yRatio≈0.5745
//   D wire tip: x=43/50 of width, y=0  (top edge)        → xRatio=0.86, yRatio=0
//   S wire tip: x=43/50 of width, y=75 (bottom edge)     → xRatio=0.86, yRatio=1.0
// Each pin gets its own named group (so the port circle is visible) and the position
// uses xRatio/yRatio (not xEdge/yEdge) to avoid the built-in 5 px inset.
const MOSFET_PORTS = {
  groups: {
    G: { position: "scada-switch-port", markup: _PORT_MARKUP, attrs: { circle: { r: 5, magnet: true, fill: "#0d1117", stroke: "#8090a0", strokeWidth: 1.5 } } },
    D: { position: "scada-switch-port", markup: _PORT_MARKUP, attrs: { circle: { r: 5, magnet: true, fill: "#0d1117", stroke: "#8090a0", strokeWidth: 1.5 } } },
    S: { position: "scada-switch-port", markup: _PORT_MARKUP, attrs: { circle: { r: 5, magnet: true, fill: "#0d1117", stroke: "#8090a0", strokeWidth: 1.5 } } },
  },
  items: [
    { id: "G", group: "G", args: { xRatio: 0,    yRatio: 43.089 / 75 } },
    { id: "D", group: "D", args: { xRatio: 0.86, yRatio: 0            } },
    { id: "S", group: "S", args: { xRatio: 0.86, yRatio: 1            } },
  ],
};

// SP2T / SP2TC / SP2T-NoBg — L at left-centre, R1 at right-25%, R2 at right-75%
const SP2T_PORTS  = switchPorts([
  { id: "L",  xEdge: "left",  yRatio: 0.5  },
  { id: "R1", xEdge: "right", yRatio: 0.25 },
  { id: "R2", xEdge: "right", yRatio: 0.75 },
]);
const SP2TC_PORTS = SP2T_PORTS;

// Switch3P / Switch4P — T/B at top/bottom-centre, L/R at left/right-centre
const SW3P_PORTS  = switchPorts([
  { id: "T", xRatio: 0.5, yEdge: "top"    },
  { id: "B", xRatio: 0.5, yEdge: "bottom" },
  { id: "L", xEdge: "left",  yRatio: 0.5  },
  { id: "R", xEdge: "right", yRatio: 0.5  },
]);

// TransferSwitch — L1/L2 at left-25%/75%, R1/R2 at right-25%/75%
const XFR_PORTS   = switchPorts([
  { id: "L1", xEdge: "left",  yRatio: 0.25 },
  { id: "L2", xEdge: "left",  yRatio: 0.75 },
  { id: "R1", xEdge: "right", yRatio: 0.25 },
  { id: "R2", xEdge: "right", yRatio: 0.75 },
]);

// RF Circulator — scl=min(160,210)/160=1.0  r=160*0.44=70.4  cy=r+5=75.4
// p1x = 80-70.4 = 9.6  → xRatio 9.6/160  = 0.06
// p2x = 80+70.4 = 150.4 → xRatio 150.4/160 = 0.94
// port1/2 yRatio = cy/h = 75.4/210 = 0.359
// termBodyY = cy+r = 145.8 → yRatio 145.8/210 = 0.695
const CIRCULATOR_PORTS = switchPorts([
  { id: "port1", xRatio: 0.06,  yRatio: 0.36 },
  { id: "port2", xRatio: 0.94,  yRatio: 0.36 },
  { id: "port3", xRatio: 0.5,   yRatio: 0.70 },
]);

// RF Coupler — P1 left-centre, P2 right-centre, P3 bottom-right (76%), P4 bottom-left (38%)
// Body occupies h*0.18..h*0.60, so P1/P2 yRatio = body-centre/h = (0.18+0.21) = 0.39
const RF_COUPLER_PORTS = switchPorts([
  { id: "P1", xEdge: "left",  yRatio: 0.39 },
  { id: "P2", xEdge: "right", yRatio: 0.39 },
  { id: "P3", xRatio: 0.729,  yEdge: "bottom" },
  { id: "P4", xRatio: 0.394,  yEdge: "bottom" },
]);

// ACMU — CLK1-4 on left at yRatio 0.22/0.40/0.58/0.76, OUT on right at yRatio 0.50
const ACMU_PORTS = switchPorts([
  { id: "CLK1", xEdge: "left",  yRatio: 0.22 },
  { id: "CLK2", xEdge: "left",  yRatio: 0.40 },
  { id: "CLK3", xEdge: "left",  yRatio: 0.58 },
  { id: "CLK4", xEdge: "left",  yRatio: 0.76 },
  { id: "OUT",  xEdge: "right", yRatio: 0.50 },
]);

// DP3T — L1/L2 at left-25%/75%, R1/R2/R3 at right-17%/50%/83%
const DP3T_PORTS  = switchPorts([
  { id: "L1", xEdge: "left",  yRatio: 0.25 },
  { id: "L2", xEdge: "left",  yRatio: 0.75 },
  { id: "R1", xEdge: "right", yRatio: 0.17 },
  { id: "R2", xEdge: "right", yRatio: 0.50 },
  { id: "R3", xEdge: "right", yRatio: 0.83 },
]);

// DPDT — 4 corner ports only (TL/TR/BL/BR)
//   Interior COM dots (CTL/CTR/CBL/CBR) are visual-only, not connectable
const DPDT_PORTS  = switchPorts([
  { id: "TL", xRatio: 0.07, yRatio: 0.07 },
  { id: "TR", xRatio: 0.93, yRatio: 0.07 },
  { id: "BL", xRatio: 0.07, yRatio: 0.93 },
  { id: "BR", xRatio: 0.93, yRatio: 0.93 },
]);

// DPDT_N — outer ports moved parallel to interior rows (y at 28% / 72%)
//   on the left and right edges. Connections run straight horizontally
//   to the inner COM dots, rather than diagonally from the corners.
const DPDT_N_PORTS = switchPorts([
  { id: "TL", xRatio: 0.07, yRatio: 0.28 },
  { id: "TR", xRatio: 0.93, yRatio: 0.28 },
  { id: "BL", xRatio: 0.07, yRatio: 0.72 },
  { id: "BR", xRatio: 0.93, yRatio: 0.72 },
]);

// Radiator fan (vertical): connector points are on radiator body (left/right midline)
const RADIATOR_FAN_PORTS = switchPorts([
  { id: "rad-left",  xRatio: 0.22, yRatio: 0.73 },
  { id: "rad-right", xRatio: 0.78, yRatio: 0.73 },
]);

// Radiator: ports on top connector tabs (as shown in element art).
// Keep legacy top/bottom ids so existing diagrams stay connected.
const RADIATOR_PORTS = switchPorts([
  { id: "left",   xRatio: 0.21, yRatio: 0.07 },
  { id: "right",  xRatio: 0.79, yRatio: 0.07 },
  { id: "top",    xRatio: 0.21, yRatio: 0.07 },
  { id: "bottom", xRatio: 0.79, yRatio: 0.07 },
]);

// Heater plate: connector points sit exactly on radiator slab left/right sides.
// Keep legacy ids (left/right) so already-saved edges remain attached.
const HEATER_PLATE_PORTS = {
  groups: {
    conn: {
      position: "scada-switch-port",
      markup: _PORT_MARKUP,
      attrs: { circle: { r: 6, magnet: true, fill: "#0d1117", stroke: "#8aa7c6", strokeWidth: 1.6 } },
    },
  },
  items: [
    { id: "left",      group: "conn", args: { xRatio: 0.08, yRatio: 0.65 } },
    { id: "right",     group: "conn", args: { xRatio: 0.92, yRatio: 0.65 } },
    { id: "rad-left",  group: "conn", args: { xRatio: 0.08, yRatio: 0.65 } },
    { id: "rad-right", group: "conn", args: { xRatio: 0.92, yRatio: 0.65 } },
  ],
};

register({ shape: "scada-valve",            width: 80,  height: 60,  component: ValveNode,            ports: DEFAULT_PORTS });
register({ shape: "scada-tank",             width: 80,  height: 130, component: TankNode,             ports: NO_ITEM_PORTS });
register({ shape: "scada-gauge",            width: 100, height: 100, component: GaugeNode,            ports: NO_ITEM_PORTS });
register({ shape: "scada-twta",             width: 170, height: 115, component: TwtaNode,             ports: LR_PORTS });
register({ shape: "scada-battery",          width: 60,  height: 128, component: BatteryNode,          ports: SUBTLE_TB_PORTS });
register({ shape: "scada-momentumwheel",    width: 195, height: 185, component: MomentumWheelNode,    ports: NO_ITEM_PORTS });
register({ shape: "scada-dtg",             width: 255, height: 190, component: DtgNode,             ports: NO_ITEM_PORTS });
register({ shape: "scada-sp2t",             width: 70,  height: 90,  component: SwitchSP2TNode,       ports: SP2T_PORTS  });
register({ shape: "scada-sp2tc",            width: 90,  height: 90,  component: Sp2tCircleNode,       ports: SP2TC_PORTS });
register({ shape: "scada-sp2t-nobg",        width: 70,  height: 90,  component: Sp2tNoBackgroundNode, ports: SP2T_PORTS  });
register({ shape: "scada-switch3p",         width: 90,  height: 90,  component: Switch3PNode,         ports: SW3P_PORTS  });
register({ shape: "scada-switch4p",         width: 90,  height: 90,  component: Switch4PNode,         ports: SW3P_PORTS  });
register({ shape: "scada-dp3t",             width: 70,  height: 120, component: Dp3tNode,             ports: DP3T_PORTS  });
register({ shape: "scada-transferswitch",   width: 70,  height: 70,  component: TransferSwitchNode,   ports: XFR_PORTS   });
register({ shape: "scada-thruster",         width: 90,  height: 200, component: ThrusterNode,         ports: THRUSTER_PORTS });
register({ shape: "scada-monoprop-thruster", width: 90,  height: 200, component: MonopropThrusterNode, ports: MONOPROP_THRUSTER_PORTS });
register({ shape: "scada-ground",           width: 50,  height: 70,  component: GroundNode,           ports: GROUND_PORTS });
register({ shape: "scada-diode",            width: 100, height: 80,  component: DiodeNode,            ports: LR_EDGE_PORTS });
register({ shape: "scada-zenerdiode",       width: 100, height: 80,  component: ZenerDiodeNode,       ports: LR_EDGE_PORTS });
register({ shape: "scada-resistor",         width: 100, height: 44,  component: ResistorNode,         ports: LR_EDGE_PORTS });
register({ shape: "scada-capacitor",        width: 100, height: 44,  component: CapacitorNode,        ports: LR_EDGE_PORTS });
register({ shape: "scada-fuse",             width: 100, height: 44,  component: FuseNode,             ports: LR_EDGE_PORTS });
register({ shape: "scada-spst-switch",      width: 110, height: 70,  component: SpstSwitchNode,       ports: SPST_SWITCH_PORTS });
register({ shape: "scada-mosfet",           width: 80,  height: 120, component: MosfetNode,           ports: MOSFET_PORTS });
register({ shape: "scada-current-sensor",   width: 130, height: 70,  component: CurrentSensorNode,    ports: NO_ITEM_PORTS });
// scada-indicator = LED status indicator (original element, restored).
// scada-numeric-display = the numeric digital display (previously called "indicator").
// Diagrams saved with category "Indicator" and shape "scada-indicator" will now
// render the LED again, matching what was there before the rename.
register({ shape: "scada-indicator",        width: 60,  height: 60,  component: LEDNode,              ports: NO_ITEM_PORTS });
register({ shape: "scada-numeric-display",  width: 120, height: 65,  component: IndicatorNode,        ports: NO_ITEM_PORTS });
register({ shape: "scada-image",            width: 160, height: 120, component: ImageNode,            ports: NO_ITEM_PORTS });
register({ shape: "scada-svg",              width: 200, height: 150, component: SvgNode,              ports: NO_ITEM_PORTS });
register({ shape: "scada-circle",           width: 60,  height: 60,  component: CircleNode,           ports: NO_ITEM_PORTS });
register({ shape: "scada-rect",             width: 120, height: 80,  component: RectNode,             ports: NO_ITEM_PORTS });
register({ shape: "scada-textlabel",             width: 120, height: 40,  component: TextLabelNode,          ports: { groups: {}, items: [] } });
  register({ shape: "scada-transparentlabel",      width: 120, height: 40,  component: TransparentLabelNode,   ports: { groups: {}, items: [] } });
register({ shape: "scada-driver-amp",       width: 170, height: 115, component: DriverAmplifierNode,  ports: LR_PORTS });
register({ shape: "scada-twta-da",          width: 280, height: 130, component: TwtaDaNode,            ports: LR_PORTS });
register({ shape: "scada-rf-downconv",      width: 160, height: 100, component: RfDownConverterNode,   ports: LR_PORTS });
register({ shape: "scada-rf-upconv",        width: 160, height: 100, component: RfUpConverterNode,     ports: LR_PORTS });
register({ shape: "scada-lna",              width: 160, height: 100, component: LnaNode,               ports: LR_PORTS });
register({ shape: "scada-bpf",              width: 170, height: 100, component: BandpassFilterNode,    ports: LR_PORTS });
register({ shape: "scada-lpf",              width: 170, height: 100, component: LowPassFilterNode,     ports: LR_PORTS });
register({ shape: "scada-receiver",         width: 210, height: 110, component: ReceiverNode,           ports: LR_PORTS });
register({ shape: "scada-receiver-demod",  width: 250, height: 110, component: ReceiverDemodNode,  ports: LR_PORTS });
register({ shape: "scada-transmitter",     width: 250, height: 110, component: TransmitterNode,    ports: LR_PORTS });
register({ shape: "scada-nsgu",            width: 220, height: 100, component: NsguNode,           ports: LR_PORTS });
register({ shape: "scada-modulator",       width: 250, height: 110, component: ModulatorNode,      ports: LR_PORTS });
register({ shape: "scada-qpsk-modulator",  width: 250, height: 110, component: QpskModulatorNode,  ports: LR_PORTS });
register({ shape: "scada-qpsk-demodulator", width: 250, height: 110, component: QpskDemodNode,     ports: LR_PORTS });
register({ shape: "scada-tm-decoder",      width: 250, height: 110, component: TmDecoderNode,      ports: LR_PORTS });
register({ shape: "scada-tm-decoder-reverse", width: 250, height: 110, component: TmDecoderNodeReverse, ports: LR_PORTS });
register({ shape: "scada-rf-coupler",      width: 200, height: 80,  component: RfCouplerNode,       ports: RF_COUPLER_PORTS });
register({ shape: "scada-acmu",            width: 280, height: 160, component: AcmuNode,            ports: ACMU_PORTS });
register({ shape: "scada-twta-reverse",          width: 170, height: 115, component: TwtaNodeReverse,             ports: LR_PORTS });
register({ shape: "scada-driver-amp-reverse",    width: 170, height: 115, component: DriverAmplifierNodeReverse,  ports: LR_PORTS });
register({ shape: "scada-twta-da-reverse",       width: 280, height: 130, component: TwtaDaNodeReverse,           ports: LR_PORTS });
register({ shape: "scada-sspa-reverse",          width: 180, height: 100, component: SspaNodeReverse,             ports: LR_PORTS });
register({ shape: "scada-lna-reverse",           width: 160, height: 100, component: LnaNodeReverse,              ports: LR_PORTS });
register({ shape: "scada-rf-downconv-reverse",   width: 160, height: 100, component: RfDownConverterNodeReverse,  ports: LR_PORTS });
register({ shape: "scada-rf-upconv-reverse",     width: 160, height: 100, component: RfUpConverterNodeReverse,    ports: LR_PORTS });
register({ shape: "scada-rf-circulator-reverse", width: 160, height: 210, component: RfCirculatorNodeReverse,     ports: CIRCULATOR_PORTS });
register({ shape: "scada-bpf-reverse",           width: 170, height: 100, component: BandpassFilterNodeReverse,   ports: LR_PORTS });
register({ shape: "scada-lpf-reverse",           width: 170, height: 100, component: LowPassFilterNodeReverse,    ports: LR_PORTS });
register({ shape: "scada-receiver-reverse",      width: 210, height: 110, component: ReceiverNodeReverse,         ports: LR_PORTS });
register({ shape: "scada-receiver-demod-reverse", width: 250, height: 110, component: ReceiverDemodNodeReverse,   ports: LR_PORTS });
register({ shape: "scada-transmitter-reverse",   width: 250, height: 110, component: TransmitterNodeReverse,      ports: LR_PORTS });
register({ shape: "scada-nsgu-reverse",          width: 220, height: 100, component: NsguNodeReverse,             ports: LR_PORTS });
register({ shape: "scada-modulator-reverse",     width: 250, height: 110, component: ModulatorNodeReverse,        ports: LR_PORTS });
register({ shape: "scada-rf-coupler-reverse",    width: 200, height: 80,  component: RfCouplerNodeReverse,        ports: RF_COUPLER_PORTS });
register({ shape: "scada-acmu-reverse",          width: 280, height: 160, component: AcmuNodeReverse,             ports: ACMU_PORTS });
register({ shape: "scada-fpga",             width: 185, height: 150, component: FpgaNode,               ports: NO_ITEM_PORTS });
register({ shape: "scada-rf-circulator",    width: 160, height: 210, component: RfCirculatorNode,       ports: CIRCULATOR_PORTS });
register({ shape: "scada-system",           width: 160, height: 70,  component: SystemNode,              ports: LR_PORTS });
register({ shape: "scada-sspa",            width: 180, height: 100, component: SspaNode,                ports: LR_PORTS });
register({ shape: "scada-pump",            width: 130, height: 110, component: PumpNode,                ports: LR_PORTS });
register({ shape: "scada-dpdt",            width: 100, height: 100, component: DpdtSwitchNode,           ports: DPDT_PORTS });
register({ shape: "scada-dpdt-n",          width: 100, height: 100, component: DpdtNSwitchNode,          ports: DPDT_N_PORTS });
register({ shape: "scada-rb-clock",       width: 160, height: 120, component: RubidiumClockNode,        ports: NO_ITEM_PORTS });
register({ shape: "scada-rb-atom",        width: 200, height: 150, component: RubidiumAtomNode,         ports: NO_ITEM_PORTS });
// Horn antenna: one visible blue input port at waveguide centre, left edge
// Uses scada-switch-port layout so it scales proportionally with node resize.
const HORN_ANT_PORTS = {
  groups: {
    "rf-input": {
      position: "scada-switch-port",
      markup:   _PORT_MARKUP,
      attrs:    { circle: { r: 5, magnet: true, fill: "#0d1117", stroke: "#4a9eff", strokeWidth: 1.5 } },
    },
  },
  items: [{ id: "rf-in", group: "rf-input", args: { xEdge: "left", yRatio: 55 / 90 } }],
};
register({ shape: "scada-horn-antenna",        width: 130, height: 85,  component: HornAntennaNode,        ports: HORN_ANT_PORTS });
register({ shape: "scada-patch-array-antenna", width: 160, height: 110, component: PatchArrayAntennaNode, ports: NO_ITEM_PORTS });
register({ shape: "scada-helical-antenna",     width: 160, height: 110, component: HelicalAntennaNode,     ports: NO_ITEM_PORTS });
register({ shape: "scada-offset-reflector",   width: 160, height: 110, component: OffsetReflectorNode,    ports: NO_ITEM_PORTS });
register({ shape: "scada-data-grid",           width: 220, height: 130, component: DataGridNode,          ports: NO_ITEM_PORTS });
register({ shape: "scada-plot-graph",          width: 360, height: 220, component: PlotGraphNode,         ports: NO_ITEM_PORTS });
register({ shape: "scada-text-box",            width: 280, height: 180, component: TextBoxNode,            ports: NO_ITEM_PORTS });
// ── Gaganyaan ECLSS shapes ────────────────────────────────────────────────
register({ shape: "scada-pyro-valve",          width: 80,  height: 70,  component: PyroValveNode,          ports: DEFAULT_PORTS });
register({ shape: "scada-solenoid-valve",      width: 80,  height: 75,  component: SolenoidValveNode,      ports: DEFAULT_PORTS });
register({ shape: "scada-motor-valve",         width: 80,  height: 85,  component: MotorValveNode,         ports: DEFAULT_PORTS });
register({ shape: "scada-heat-exchanger",      width: 130, height: 80,  component: HeatExchangerNode,      ports: LR_PORTS });
register({ shape: "scada-radiator",            width: 180, height: 70,  component: RadiatorNode,           ports: RADIATOR_PORTS });
register({ shape: "scada-radiator-fan",        width: 220, height: 100, component: RadiatorFanNode,        ports: RADIATOR_FAN_PORTS });
register({ shape: "scada-heater-plate",        width: 220, height: 100, component: HeaterPlateNode,        ports: HEATER_PLATE_PORTS });
register({ shape: "scada-compensator",         width: 60,  height: 110, component: CompensatorNode,        ports: SUBTLE_TB_PORTS });
register({ shape: "scada-check-valve",         width: 90,  height: 60,  component: CheckValveNode,         ports: LR_PORTS });
register({ shape: "scada-lfcu",                width: 110, height: 90,  component: LfcuNode,               ports: LR_PORTS });
register({ shape: "scada-robot",               width: 120, height: 160, component: RobotNode,              ports: NO_ITEM_PORTS });
register({ shape: "scada-ctrl-board",          width: 180, height: 130, component: CtrlBoardNode,          ports: NO_ITEM_PORTS });
register({ shape: "scada-freehand-path",        width: 100, height: 50,  component: FreehandPathNode,       ports: {} });

/** Map category name → X6 shape name */
export const CATEGORY_TO_SHAPE: Record<string, string> = {
  Valve:           "scada-valve",
  Tank:            "scada-tank",
  Gauge:           "scada-gauge",
  TWTA:            "scada-twta",
  Battery:         "scada-battery",
  MomentumWheel:   "scada-momentumwheel",
  DTG:             "scada-dtg",
  SP2T:            "scada-sp2t",
  SP2TC:           "scada-sp2tc",
  SP2TNoBg:        "scada-sp2t-nobg",
  Switch3P:        "scada-switch3p",
  Switch4P:        "scada-switch4p",
  DP3T:            "scada-dp3t",
  TransferSwitch:  "scada-transferswitch",
  Indicator:       "scada-indicator",       // LED status dot
  NumericDisplay:  "scada-numeric-display", // digital numeric readout (was "Indicator")
  Thruster:          "scada-thruster",
  MonopropThruster:  "scada-monoprop-thruster",
  Ground:          "scada-ground",
  Diode:           "scada-diode",
  ZenerDiode:      "scada-zenerdiode",
  Resistor:        "scada-resistor",
  Capacitor:       "scada-capacitor",
  Fuse:            "scada-fuse",
  SpstSwitch:      "scada-spst-switch",
  Mosfet:          "scada-mosfet",
  CurrentSensor:   "scada-current-sensor",
  Image:           "scada-image",
  SvgGraphic:      "scada-svg",
  Circle:          "scada-circle",
  Rect:            "scada-rect",
  TextLabel:           "scada-textlabel",
  TransparentLabel:    "scada-transparentlabel",
  DriverAmplifier: "scada-driver-amp",
  DriverAmplifier_reverse: "scada-driver-amp-reverse",
  TWTADA:          "scada-twta-da",
  TWTADA_reverse:  "scada-twta-da-reverse",
  RFDownConverter: "scada-rf-downconv",
  RFDownConverter_reverse: "scada-rf-downconv-reverse",
  RFUpConverter:   "scada-rf-upconv",
  RFUpConverter_reverse: "scada-rf-upconv-reverse",
  LNA:             "scada-lna",
  LNA_reverse:     "scada-lna-reverse",
  Receiver:        "scada-receiver",
  Receiver_reverse: "scada-receiver-reverse",
  ReceiverDemod:   "scada-receiver-demod",
  ReceiverDemod_reverse: "scada-receiver-demod-reverse",
  Transmitter:     "scada-transmitter",
  Transmitter_reverse: "scada-transmitter-reverse",
  NSGU:            "scada-nsgu",
  NSGU_reverse:    "scada-nsgu-reverse",
  Modulator:       "scada-modulator",
  QPSKModulator:   "scada-qpsk-modulator",
  QPSKDemodulator: "scada-qpsk-demodulator",
  TMDecoder:       "scada-tm-decoder",
  TMDecoder_reverse: "scada-tm-decoder-reverse",
  Modulator_reverse: "scada-modulator-reverse",
  RFCoupler:       "scada-rf-coupler",
  RFCoupler_reverse: "scada-rf-coupler-reverse",
  ACMU:            "scada-acmu",
  ACMU_reverse:    "scada-acmu-reverse",
  FPGA:            "scada-fpga",
  RFCirculator:    "scada-rf-circulator",
  RFCirculator_reverse: "scada-rf-circulator-reverse",
  System:          "scada-system",
  BandpassFilter:  "scada-bpf",
  BandpassFilter_reverse: "scada-bpf-reverse",
  LowPassFilter:   "scada-lpf",
  LowPassFilter_reverse: "scada-lpf-reverse",
  SSPA:            "scada-sspa",
  SSPA_reverse:    "scada-sspa-reverse",
  TWTA_reverse:    "scada-twta-reverse",
  Pump:            "scada-pump",
  DPDT:            "scada-dpdt",
  DPDT_N:          "scada-dpdt-n",
  RubidiumClock:   "scada-rb-clock",
  RubidiumAtom:    "scada-rb-atom",
  HornAntenna:        "scada-horn-antenna",
  PatchArrayAntenna:  "scada-patch-array-antenna",
  HelicalAntenna:     "scada-helical-antenna",
  OffsetReflector:    "scada-offset-reflector",
  DataGrid:           "scada-data-grid",
  PlotGraph:          "scada-plot-graph",
  TextBox:            "scada-text-box",
  // Gaganyaan ECLSS
  PyroValve:          "scada-pyro-valve",
  SolenoidValve:      "scada-solenoid-valve",
  MotorValve:         "scada-motor-valve",
  HeatExchanger:      "scada-heat-exchanger",
  Radiator:           "scada-radiator",
  RadiatorFan:        "scada-radiator-fan",
  HeaterPlate:        "scada-heater-plate",
  Compensator:        "scada-compensator",
  CheckValve:         "scada-check-valve",
  LFCU:               "scada-lfcu",
  Robot:              "scada-robot",
  CtrlBoard:          "scada-ctrl-board",
  FreehandPath:       "scada-freehand-path",
};

// ── Graph factory ─────────────────────────────────────────────────────────

/**
 * Apply the port-size formula to every node in the graph immediately.
 * Called when the diagram-level portSizeFactor setting changes so existing
 * nodes update without requiring a manual resize.
 */
export function applyPortSizeToAllNodes(graph: Graph, factor: number): void {
  graph.getNodes().forEach(node => applyPortSizeToNode(node, factor));
}

/**
 * Set the radius of the four standard side ports (left/right/top/bottom) on a node.
 *
 * The radius is derived solely from `factor` — it does NOT depend on the node's
 * current width/height.  Previously it used `Math.max(w, h) * factor` which caused
 * a jarring jump on first resize (ports snapped from their static r=5 to e.g. 24 px
 * for a tall thruster element, and reverted to 5 only after remove+re-add).
 *
 * Mapping: factor ∈ [0.01, 0.50] → r ∈ [2, 15] px (roughly)
 *   0.05 → 3 px  (very small)
 *   0.10 → 6 px  (compact)
 *   0.12 → 7 px  (default — close to the static r:5 baseline)
 *   0.20 → 12 px (large)
 *   0.50 → 15 px (max, clamped)
 */
function applyPortSizeToNode(node: ReturnType<Graph["getNodes"]>[number], factor: number): void {
  const r = Math.max(2, Math.min(15, Math.round(factor * 60)));
  for (const side of ["left", "right", "top", "bottom"]) {
    if (node.prop(`ports/groups/${side}`)) {
      node.prop(`ports/groups/${side}/attrs/circle/r`, r);
    }
  }
}

// Module-level custom clipboard for group-aware deep copy-paste.
// Stores serialized cell JSON so paste can rebuild with fresh IDs.
let _customClipboard: Record<string, unknown>[] | null = null;

// Passthrough router for viewer mode: returns the edge's explicit vertices
// unchanged so no routing algorithm runs. Edges draw as straight segments
// between their stored waypoints (and between source/target anchors).
// Registered once at module load; force=true so re-import is safe.
(Graph as any).registerRouter(
  "passthrough",
  (vertices: { x: number; y: number }[]) => vertices,
  true,
);

function buildEditorManhattanRouter() {
  // Manhattan consistently triggers "Unable to execute manhattan algorithm,
  // use orth instead" for dense SCADA diagrams because the A* pathfinder
  // exhausts maximumLoops before finding a route. Orth produces the same
  // orthogonal routes and is orders of magnitude cheaper.
  return { name: "orth" };
}

/**
 * Gap between two axis-aligned bounding boxes on the axis with the smallest
 * separation. Returns 0 when the boxes are touching or overlapping.
 */
function bboxGap(
  sb: { x: number; y: number; width: number; height: number },
  tb: { x: number; y: number; width: number; height: number },
): number {
  const gX = Math.max(0, Math.max(sb.x, tb.x) - Math.min(sb.x + sb.width,  tb.x + tb.width));
  const gY = Math.max(0, Math.max(sb.y, tb.y) - Math.min(sb.y + sb.height, tb.y + tb.height));
  return Math.min(gX, gY);
}

/**
 * When two connected nodes are very close together the `orth` router forces
 * the edge to exit the source port in the port's cardinal direction before
 * turning, which can require a large U-shaped detour if there is no room in
 * that direction.  For close nodes a direct straight line is always clearer.
 *
 * This function detects the condition and, if triggered, switches the edge to
 * `{ name: "normal" }` (straight line, no intermediate waypoints).  If the
 * nodes have subsequently moved apart it restores `{ name: "orth" }`.
 *
 * Only the auto-determined straight/orth choice is overridden — any router
 * that was explicitly set by the user to something other than those two is
 * left untouched.
 */
function rerouteEdgeIfClose(
  graph: Graph,
  edge: ReturnType<Graph["getEdges"]>[number],
): void {
  const CLOSE_PX = 40; // gap threshold: below this → straight line

  const src = edge.getSource() as any;
  const tgt = edge.getTarget() as any;
  if (!src?.cell || !tgt?.cell || src.cell === tgt.cell) return;

  const sn = graph.getCellById(src.cell);
  const tn = graph.getCellById(tgt.cell);
  if (!sn?.isNode() || !tn?.isNode()) return;

  const sb = sn.getBBox();
  const tb = tn.getBBox();
  const gap = bboxGap(sb, tb);

  const currentRouter = (edge.getRouter() as any)?.name ?? "orth";
  const isManagedRouter = currentRouter === "orth" || currentRouter === "normal";

  if (gap < CLOSE_PX && currentRouter !== "normal") {
    // Switch to straight — clear any orth-generated waypoints too
    edge.setRouter({ name: "normal" });
    edge.setVertices([]);
  } else if (gap >= CLOSE_PX && isManagedRouter && currentRouter !== "orth") {
    // Nodes moved apart — restore orthogonal routing
    edge.setRouter({ name: "orth" });
  }
}

// ── Lock pointer-events helpers ───────────────────────────────────────────────
// When a cell is locked its root SVG <g> container is given pointer-events:none
// so mouse events pass through to the canvas background.  This allows rubber-
// band selection to start even when a large locked element covers the canvas.

/**
 * Apply (or remove) pointer-events:none on a single cell's view container.
 * Uses setTimeout(0) to defer until X6 has rendered the cell view.
 */
export function applyCellLockPointerEvents(graph: Graph, cell: any): void {
  setTimeout(() => {
    const locked = !!(cell.getData?.()?.locked);
    const view = (graph as any).findViewByCell?.(cell);
    if (view?.container) {
      (view.container as Element).setAttribute(
        "pointer-events",
        locked ? "none" : ""
      );
    }
  }, 0);
}

/**
 * Re-sync pointer-events for ALL cells in the graph.
 * Call after a bulk load (progressive load, paste, etc.) once cells are rendered.
 */
export function syncAllCellLockPointerEvents(graph: Graph): void {
  setTimeout(() => {
    (graph as any).getCells?.()?.forEach((cell: any) => {
      const locked = !!(cell.getData?.()?.locked);
      const view = (graph as any).findViewByCell?.(cell);
      if (view?.container) {
        (view.container as Element).setAttribute(
          "pointer-events",
          locked ? "none" : ""
        );
      }
    });
  }, 50); // slightly longer delay to cover progressive-load batches
}

export function createGraph(
  container: HTMLElement,
  readOnly = false,
  options?: { getPortSizeFactor?: () => number },
): Graph {
  const getPortSizeFactor = options?.getPortSizeFactor ?? (() => 0.12);
  const graph = new Graph({
    container,
    grid: { visible: !readOnly, size: 10, type: "dot", args: { color: "#333", thickness: 1 } },
    background: { color: "#0f1419" },
    mousewheel: { enabled: true, zoomAtMousePosition: true, modifiers: null, minScale: 0.1, maxScale: 5 },
    connecting: {
      snap: { radius: 20 },
      allowBlank: !readOnly,
      allowLoop: false,
      allowMulti: true,
      highlight: true,
      // Viewer mode: force passthrough as the graph-level default router so
      // that ALL edges — both those loaded via fromJSON and any created at
      // runtime — render with the waypoints stored in their model without any
      // routing algorithm running. This prevents the orth router from
      // computing U-shaped re-routes when node spacing is tight.
      router: readOnly
        ? { name: "passthrough" }
        : buildEditorManhattanRouter(),
      connector: { name: "rounded", args: { radius: 8 } },
      createEdge() {
        return this.createEdge({
          router: readOnly ? { name: "passthrough" } : buildEditorManhattanRouter(),
          attrs: {
            line: {
              stroke: "#6b7280",
              strokeWidth: 1.5,
              sourceMarker: null,
              targetMarker: { name: "classic", size: 8 },
            },
            // Invisible wider path used as click hit-area so thin lines are easy to select
            wrap: {
              strokeWidth: 16,
              stroke: "transparent",
              fill: "none",
              cursor: "pointer",
            },
          },
          data: {
            flowActive: false,
            flowDirection: 1,
            telemetryBindings: [],
            sourceMarker: "none",
            targetMarker: "classic",
            labelText: "",
          },
          zIndex: 0,
        });
      },
    },
    interacting: readOnly
      ? { nodeMovable: false, edgeMovable: false, magnetConnectable: false }
      : (cellView: any) => {
          // Locked cells are completely non-interactive — cannot be moved,
          // resized, connected to, or have vertices added.
          if ((cellView.cell.getData() as any)?.locked) return false;
          return {
            nodeMovable: true,
            magnetConnectable: true,
            edgeMovable: true,
            edgeLabelMovable: true,
            vertexMovable: true,
            vertexAddable: true,
            vertexDeletable: true,
          };
        },
    highlighting: {
      magnetAdsorbed: {
        name: "stroke",
        args: { attrs: { fill: "#5F95FF", stroke: "#5F95FF" } },
      },
    },
  });

  // ── Plugins ──────────────────────────────────────────────────────────────
  graph.use(new Scroller({
    enabled: true,
    // Editor panning is toggled programmatically via graph.enablePanning() /
    // graph.disablePanning() when the user holds Ctrl (see EditorPage.vue).
    // Viewer mode pans freely with any drag.
    pannable: readOnly ? true : false,
    pageVisible: false,
    autoResize: true,
  }));

  if (!readOnly) {
    graph.use(new Selection({
      enabled: true,
      rubberband: true,
      /** Include edges in drag-box selection (default false in X6 3.x). */
      rubberEdge: true,
      showNodeSelectionBox: true,
      showEdgeSelectionBox: true,
      movable: true,
      multiple: true,
      /** Match EditorPage edge multi-select: Shift as well as Ctrl/Meta (X6 default is ctrl/meta only). */
      multipleSelectionModifiers: ["ctrl", "meta", "shift"],
      strict: false,
      /** Locked cells cannot be selected via rubberband or programmatic select. */
      filter: (cell: any) => !(cell.getData() as any)?.locked,
    }));
    graph.use(new Snapline({ enabled: true, sharp: true, tolerance: 10 }));
    graph.use(new History({ enabled: true, stackSize: 100 }));
    graph.use(new Clipboard({ enabled: true }));
    graph.use(new Keyboard({ enabled: true, global: true }));
    graph.use(new Transform({ resizing: { enabled: true, minWidth: 20, minHeight: 20, orthogonal: false, preserveAspectRatio: false }, rotating: { enabled: true, grid: 15 } }));

    // ── Keyboard shortcuts ────────────────────────────────────────────────
    graph.bindKey(["ctrl+z", "command+z"], () => { graph.undo(); return false; });
    graph.bindKey(["ctrl+y", "ctrl+shift+z", "command+shift+z"], () => { graph.redo(); return false; });
    graph.bindKey(["ctrl+c", "command+c"], () => {
      const cellsToCopy = collectCellsForCopy(graph);
      if (cellsToCopy.length) {
        // Serialize to our own clipboard so paste has full control over ID remapping.
        _customClipboard = cellsToCopy.map((c) => c.toJSON() as Record<string, unknown>);
      }
      return false;
    });
    graph.bindKey(["ctrl+v", "command+v"], () => {
      if (_customClipboard?.length) {
        pasteFromCustomClipboard(graph, { dx: 20, dy: 20 });
      }
      return false;
    });
    graph.bindKey(["ctrl+a", "command+a"], () => {
      // Exclude locked cells from select-all
      const selectable = graph.getCells().filter(c => !(c.getData() as any)?.locked);
      graph.resetSelection(selectable);
      return false;
    });
    graph.bindKey(["delete", "backspace"], () => {
      // Locked cells cannot be deleted via keyboard even if somehow selected
      const toRemove = graph.getSelectedCells().filter(c => !(c.getData() as any)?.locked);
      graph.removeCells(toRemove);
      return false;
    });
    // Arrow-key nudge
    const NUDGE = 10;
    graph.bindKey("up",    () => { nudge(graph, 0, -NUDGE); return false; });
    graph.bindKey("down",  () => { nudge(graph, 0,  NUDGE); return false; });
    graph.bindKey("left",  () => { nudge(graph, -NUDGE, 0); return false; });
    graph.bindKey("right", () => { nudge(graph,  NUDGE, 0); return false; });

    // ── Edge click → selection ────────────────────────────────────────────
    graph.on("edge:click", ({ edge, e }) => {
      // Locked edges cannot be selected
      if ((edge.getData() as any)?.locked) return;
      if ((e as unknown as MouseEvent).shiftKey) {
        graph.select(edge);
      } else {
        graph.resetSelection(edge);
      }
    });

    // Show hover tools when mouse enters edge
    graph.on("edge:mouseenter", ({ edge }) => {
      if (!graph.isSelected(edge)) {
        edge.addTools([
          { name: "vertices",      args: { snapRadius: 20, attrs: { fill: "#4a9eff", stroke: "#4a9eff" } } },
          { name: "segments",      args: { snapRadius: 20, attrs: { fill: "#7b8ea6" } } },
          { name: "button-remove", args: { distance: -40, attrs: { fill: "#e74c3c", "fill-opacity": 0.7 } } },
        ]);
      }
    });

    graph.on("edge:mouseleave", ({ edge }) => {
      if (!graph.isSelected(edge)) {
        edge.removeTools();
      }
    });

    // Clicking blank canvas clears selection
    graph.on("blank:click", () => {
      graph.cleanSelection();
    });

    // ── Straight routing for close nodes ─────────────────────────────────
    // When an edge is first connected, check if source and target nodes are
    // very close.  If so, switch the edge to a direct straight line so it
    // does not loop around looking for room to exit the port's cardinal
    // direction.  When a node is moved so that its edges now span a wider
    // gap, those edges are restored to orthogonal routing automatically.
    graph.on("edge:connected", ({ edge }) => {
      rerouteEdgeIfClose(graph, edge);
    });
    graph.on("node:moved", ({ node }) => {
      graph.getConnectedEdges(node).forEach(edge => rerouteEdgeIfClose(graph, edge));
    });

    // ── Locked cell pointer-events ────────────────────────────────────────
    // When a cell is locked its root <g> container gets pointer-events:none so
    // mouse events fall through to the canvas background.  This lets rubber-
    // band selection start even when a large locked element covers most of the
    // canvas — exactly like Inkscape's lock behaviour.
    graph.on("cell:added",       ({ cell }) => applyCellLockPointerEvents(graph, cell));
    graph.on("cell:change:data", ({ cell }) => applyCellLockPointerEvents(graph, cell));

  }

  return graph;
}

function collectCellsForCopy(graph: Graph) {
  const selected = graph.getSelectedCells();
  if (!selected.length) return [];

  const picked = new Map<string, any>();
  const addCell = (cell: any) => {
    if (!cell) return;
    const id = String(cell.id ?? "");
    if (!id || picked.has(id)) return;
    picked.set(id, cell);
  };

  const addGroupMembersRecursive = (node: any) => {
    const d = node?.getData?.() as any;
    if (!d?.isGroup || !Array.isArray(d.memberIds)) return;
    for (const memberId of d.memberIds) {
      const member = graph.getCellById(String(memberId));
      if (!member) continue;
      addCell(member);
      if (member.isNode?.()) addGroupMembersRecursive(member);
    }
  };

  for (const cell of selected) {
    addCell(cell);
    if (cell.isNode?.()) addGroupMembersRecursive(cell);
  }

  const nodeIds = new Set(
    Array.from(picked.values())
      .filter((c: any) => c.isNode?.())
      .map((c: any) => String(c.id)),
  );

  // Preserve local wiring by including edges fully inside the copied node set.
  for (const edge of graph.getEdges()) {
    const src = (edge.getSource() as { cell?: string } | null)?.cell;
    const tgt = (edge.getTarget() as { cell?: string } | null)?.cell;
    if (src && tgt && nodeIds.has(String(src)) && nodeIds.has(String(tgt))) {
      addCell(edge);
    }
  }

  return Array.from(picked.values());
}

/**
 * Paste cells from the custom in-memory clipboard.
 * Builds a fresh id-map for all nodes, remaps group memberIds, and remaps
 * edge source/target — all before adding anything to the graph so there is
 * no ordering dependency on X6's internal clipboard machinery.
 */
function pasteFromCustomClipboard(graph: Graph, offset: { dx: number; dy: number }): void {
  const clipboard = _customClipboard;
  if (!clipboard?.length) return;

  // X6 edge JSON has top-level source.cell / target.cell; node JSON does not.
  const nodeJsons = clipboard.filter((j: any) => !j.source?.cell && !j.target?.cell);
  const edgeJsons = clipboard.filter((j: any) => j.source?.cell || j.target?.cell);

  // Build a guaranteed-unique oldId → newId map for every node.
  const idMap = new Map<string, string>();
  for (const json of nodeJsons) {
    const oldId = String((json as any).id ?? "");
    if (!oldId) continue;
    // Preserve a human-readable prefix (strip trailing _<digits>… suffix).
    const prefix = oldId.replace(/_\d.*$/, "");
    const newId = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    idMap.set(oldId, newId);
  }

  const addedCells: any[] = [];

  // ── Nodes ─────────────────────────────────────────────────────────────────
  for (const json of nodeJsons) {
    const oldId = String((json as any).id ?? "");
    const newId = idMap.get(oldId) ?? oldId;
    const pos = (json as any).position ?? {};
    const newData: any = { ...((json as any).data ?? {}), key: newId };
    // Remap group memberIds so the pasted group owns its pasted members.
    if (newData.isGroup && Array.isArray(newData.memberIds)) {
      newData.memberIds = newData.memberIds.map(
        (mid: string) => idMap.get(String(mid)) ?? String(mid),
      );
    }
    const nodeJson: any = {
      ...json,
      id: newId,
      position: { x: (pos.x ?? 0) + offset.dx, y: (pos.y ?? 0) + offset.dy },
      data: newData,
    };
    try {
      addedCells.push(graph.addNode(nodeJson));
    } catch (e) {
      console.warn("[paste] failed to add node", nodeJson.id, e);
    }
  }

  // ── Edges ─────────────────────────────────────────────────────────────────
  // Edges are added after all nodes so terminals already exist in the graph.
  for (const json of edgeJsons) {
    const srcCell = String((json as any).source?.cell ?? "");
    const tgtCell = String((json as any).target?.cell ?? "");
    const edgeJson: any = {
      ...json,
      // Give each pasted edge a unique id.
      id: `edge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      source: { ...(json as any).source, cell: idMap.get(srcCell) ?? srcCell },
      target: { ...(json as any).target, cell: idMap.get(tgtCell) ?? tgtCell },
      // Shift manual routing vertices by the same offset applied to nodes so
      // the pasted edge path matches the original exactly.
      vertices: Array.isArray((json as any).vertices)
        ? (json as any).vertices.map((v: any) => ({ x: v.x + offset.dx, y: v.y + offset.dy }))
        : [],
    };
    try {
      addedCells.push(graph.addEdge(edgeJson));
    } catch (e) {
      console.warn("[paste] failed to add edge", e);
    }
  }

  if (addedCells.length) graph.resetSelection(addedCells);
}

function nudge(graph: Graph, dx: number, dy: number) {
  graph.getSelectedCells().forEach(cell => {
    if (cell.isNode()) {
      const pos = cell.getPosition();
      cell.setPosition(pos.x + dx, pos.y + dy);
    }
  });
}
