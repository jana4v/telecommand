/** Mutate X6 cell data + local inspector mirror (parent provides this). */
export type InspectorSetter = (key: string, value: unknown) => void;

/** Apply one data key to many selected edges (multi-select). */
export type InspectorBulkSetter = (key: string, value: unknown) => void;
