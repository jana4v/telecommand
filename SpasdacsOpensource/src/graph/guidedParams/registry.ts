import type { GuidedParam } from "./types";
import { battery } from "./elements/battery";
import { pump } from "./elements/pump";
import { bandpassFilter, lowPassFilter, system } from "./elements/filters";
import { sspa } from "./elements/sspa";
import { dtg } from "./elements/dtg";
import { driverAmplifier } from "./elements/driverAmplifier";
import { fpga } from "./elements/fpga";
import { gauge, tank } from "./elements/gaugeTank";
import { lna, receiver, rfDownConverter, rfUpConverter, receiverDemod, transmitter, nsgu, modulator, acmu } from "./elements/rfConverters";
import { rfCirculator } from "./elements/rfCirculator";
import { momentumWheel } from "./elements/momentumWheel";
import { sp2t, sp2tc, sp2tNoBg, switch3p, transferSwitch, dp3t, dp4p, dpdt } from "./elements/switches";
import { thruster } from "./elements/thruster";
import { monopropThruster } from "./elements/monopropThruster";
import { twta } from "./elements/twta";
import { twtada } from "./elements/twtada";
import { rubidiumClock } from "./elements/rubidiumClock";
import { hornAntenna }   from "./elements/hornAntenna";
import { currentSensor } from "./elements/currentSensor";
import { indicator }     from "./elements/indicator";
import { numericDisplay } from "./elements/numericDisplay";
import { plotGraph }     from "./elements/plotGraph";
import { textBox }       from "./elements/textBox";
import { robot }         from "./elements/robot";
import { radiatorFan }   from "./elements/radiatorFan";
import { heaterPlate }   from "./elements/heaterPlate";
import { ctrlBoard }     from "./elements/ctrlBoard";
import { tmDecoder }     from "./elements/tmDecoder";
import { mosfet }        from "./elements/mosfet";
import { spstSwitch }    from "./elements/spstSwitch";

type BodyBuilder = () => string;

/** Assembled maps for the guided form (category → params / return-body). */
export const GUIDED_PARAMS = new Map<string, GuidedParam[]>([
  ["Pump", pump.params],
  ["TWTA", twta.params],
  ["TWTA_reverse", twta.params],
  ["Battery", battery.params],
  ["MomentumWheel", momentumWheel.params],
  ["DTG", dtg.params],
  ["Gauge", gauge.params],
  ["Tank", tank.params],
  ["SP2T", sp2t.params],
  ["SP2TC", sp2tc.params],
  ["SP2TNoBg", sp2tNoBg.params],
  ["Switch3P", switch3p.params],
  ["TransferSwitch", transferSwitch.params],
  ["DP3T", dp3t.params],
  ["DP4P", dp4p.params],
  ["DPDT",   dpdt.params],
  ["DPDT_N", dpdt.params],
  ["Thruster",         thruster.params],
  ["MonopropThruster", monopropThruster.params],
  ["DriverAmplifier", driverAmplifier.params],
  ["DriverAmplifier_reverse", driverAmplifier.params],
  ["RFDownConverter", rfDownConverter.params],
  ["RFDownConverter_reverse", rfDownConverter.params],
  ["RFUpConverter", rfUpConverter.params],
  ["RFUpConverter_reverse", rfUpConverter.params],
  ["Receiver", receiver.params],
  ["Receiver_reverse", receiver.params],
  ["ReceiverDemod", receiverDemod.params],
  ["ReceiverDemod_reverse", receiverDemod.params],
  ["Transmitter",   transmitter.params],
  ["Transmitter_reverse",   transmitter.params],
  ["Modulator",     modulator.params],
  ["QPSKModulator", modulator.params],
  ["QPSKDemodulator", receiverDemod.params],
  ["TMDecoder", tmDecoder.params],
  ["TMDecoder_reverse", tmDecoder.params],
  ["Modulator_reverse",     modulator.params],
  ["NSGU",          nsgu.params],
  ["NSGU_reverse",          nsgu.params],
  ["ACMU",          acmu.params],
  ["ACMU_reverse",          acmu.params],
  ["LNA", lna.params],
  ["LNA_reverse", lna.params],
  ["FPGA", fpga.params],
  ["RFCirculator", rfCirculator.params],
  ["RFCirculator_reverse", rfCirculator.params],
  ["BandpassFilter", bandpassFilter.params],
  ["BandpassFilter_reverse", bandpassFilter.params],
  ["LowPassFilter", lowPassFilter.params],
  ["LowPassFilter_reverse", lowPassFilter.params],
  ["System", system.params],
  ["TWTADA", twtada.params],
  ["TWTADA_reverse", twtada.params],
  ["SSPA",         sspa.params],
  ["SSPA_reverse", sspa.params],
  ["RubidiumClock", rubidiumClock.params],
  ["RubidiumAtom",  rubidiumClock.params],   // same 4 TM params
  ["HornAntenna",        hornAntenna.params],
  ["PatchArrayAntenna",  hornAntenna.params],   // same ON/OFF position binding
  ["HelicalAntenna",     hornAntenna.params],
  ["OffsetReflector",    hornAntenna.params],
  ["CurrentSensor",      currentSensor.params],
  ["Indicator",          indicator.params],
  ["NumericDisplay",     numericDisplay.params],
  ["PlotGraph",          plotGraph.params],
  ["TextBox",            textBox.params],
  ["Robot",              robot.params],
  ["RadiatorFan",        radiatorFan.params],
  ["HeaterPlate",        heaterPlate.params],
  ["CtrlBoard",          ctrlBoard.params],
  ["Mosfet",             mosfet.params],
  ["SpstSwitch",         spstSwitch.params],
]);

export const BODY_BUILDERS = new Map<string, BodyBuilder>([
  ["Pump", pump.body],
  ["TWTA", twta.body],
  ["TWTA_reverse", twta.body],
  ["Battery", battery.body],
  ["MomentumWheel", momentumWheel.body],
  ["DTG", dtg.body],
  ["Gauge", gauge.body],
  ["Tank", tank.body],
  ["SP2T", sp2t.body],
  ["SP2TC", sp2tc.body],
  ["SP2TNoBg", sp2tNoBg.body],
  ["Switch3P", switch3p.body],
  ["TransferSwitch", transferSwitch.body],
  ["DP3T", dp3t.body],
  ["DP4P", dp4p.body],
  ["DPDT",   dpdt.body],
  ["DPDT_N", dpdt.body],
  ["Thruster",         thruster.body],
  ["MonopropThruster", monopropThruster.body],
  ["DriverAmplifier", driverAmplifier.body],
  ["DriverAmplifier_reverse", driverAmplifier.body],
  ["RFDownConverter", rfDownConverter.body],
  ["RFDownConverter_reverse", rfDownConverter.body],
  ["RFUpConverter", rfUpConverter.body],
  ["RFUpConverter_reverse", rfUpConverter.body],
  ["Receiver", receiver.body],
  ["Receiver_reverse", receiver.body],
  ["ReceiverDemod", receiverDemod.body],
  ["ReceiverDemod_reverse", receiverDemod.body],
  ["Transmitter",   transmitter.body],
  ["Transmitter_reverse",   transmitter.body],
  ["Modulator",     modulator.body],
  ["QPSKModulator", modulator.body],
  ["QPSKDemodulator", receiverDemod.body],
  ["TMDecoder", tmDecoder.body],
  ["TMDecoder_reverse", tmDecoder.body],
  ["Modulator_reverse",     modulator.body],
  ["NSGU",          nsgu.body],
  ["NSGU_reverse",          nsgu.body],
  ["ACMU",          acmu.body],
  ["ACMU_reverse",          acmu.body],
  ["LNA", lna.body],
  ["LNA_reverse", lna.body],
  ["FPGA", fpga.body],
  ["RFCirculator", rfCirculator.body],
  ["RFCirculator_reverse", rfCirculator.body],
  ["BandpassFilter", bandpassFilter.body],
  ["BandpassFilter_reverse", bandpassFilter.body],
  ["LowPassFilter", lowPassFilter.body],
  ["LowPassFilter_reverse", lowPassFilter.body],
  ["System", system.body],
  ["TWTADA", twtada.body],
  ["TWTADA_reverse", twtada.body],
  ["SSPA",         sspa.body],
  ["SSPA_reverse", sspa.body],
  ["RubidiumClock", rubidiumClock.body],
  ["RubidiumAtom",  rubidiumClock.body],
  ["HornAntenna",        hornAntenna.body],
  ["PatchArrayAntenna",  hornAntenna.body],
  ["HelicalAntenna",     hornAntenna.body],
  ["OffsetReflector",    hornAntenna.body],
  ["CurrentSensor",      currentSensor.body],
  ["Indicator",          indicator.body],
  ["NumericDisplay",     numericDisplay.body],
  ["PlotGraph",          plotGraph.body],
  ["TextBox",            textBox.body],
  ["Robot",              robot.body],
  ["RadiatorFan",        radiatorFan.body],
  ["HeaterPlate",        heaterPlate.body],
  ["CtrlBoard",          ctrlBoard.body],
  ["Mosfet",             mosfet.body],
  ["SpstSwitch",         spstSwitch.body],
]);
