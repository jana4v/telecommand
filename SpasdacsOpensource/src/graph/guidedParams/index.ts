/**
 * Guided Simple Mode: per-category parameter definitions and script parse/generate.
 * Element-specific pieces live under `./elements/`; maps are assembled in `registry.ts`.
 */

export type { GuidedParam, ParamValue, GuidedCategoryDef } from "./types";

export {
  STATE_MAP_BLOCK_TAIL,
  findMatchingJsonBrace,
  extractCallArgument,
  parseStateMapWrapper,
  wrapWithStateMap,
  telemetryStateSetDiffers,
  suggestStateMap,
} from "./stateMapUtils";

export { GUIDED_PARAMS, BODY_BUILDERS } from "./registry";

export { parseGuidedScript, generateGuidedScript } from "./script";
