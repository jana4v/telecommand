/** Per-category parameter definitions for the Simple Mode guided form. */

export interface GuidedParam {
  key: string;
  label: string;
  hint: string;
  fixedValues?: string[];
  optional?: boolean;
  /** When true, fetch the mnemonic's discrete range values even if there are no fixedValues.
   *  Used for params like `borderColor` that need state→colour mapping. */
  fetchRange?: boolean;
}

export interface ParamValue {
  mnemonic: string;
  fixed: string;
  na: boolean;
  transform?: string;
  customExpr?: string;
  /** Maps raw TM string → canonical value expected by the element (when telemetry labels differ from fixedValues). */
  stateMap?: Record<string, string>;
}

/** One category: form fields + JS body appended after `let` assignments. */
export interface GuidedCategoryDef {
  params: GuidedParam[];
  body: () => string;
}
