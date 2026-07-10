# UDTM grid improvements — design

## Goal
Three small usability improvements to `GUI/app/pages/tm/udtm.vue`'s AG Grid:
Excel import, grid-wide fill handle, and a row-count input for "Add Row"
(defaulting to 1).

## Current state
- `addRow()` adds exactly one templated row per click, no count control.
- No `cellSelection`/fill-handle configuration on the grid — copy/paste and
  drag-fill are unavailable.
- No way to bulk-populate rows other than typing them in one at a time or
  loading from the backend/localStorage.

## Design

### 1. Add Row count
A PrimeVue `InputNumber` (already auto-imported, matching this file's
existing `InputText` usage) placed next to the "Add Row" button, bound to a
new `ref(1)`, `:min="1"`. `addRow()` reads this value and appends that many
templated rows in one call instead of always exactly one.

### 2. Fill handle (all columns)
Match the exact, already-working pattern in `GUI/app/pages/tm/updateDb.vue`:
```ts
const cellSelection = ref<boolean | CellSelectionOptions>({
  handle: { mode: 'fill' },
})
```
bound via `:cell-selection="cellSelection"` on `<AgGridVue>`. This is a
grid-level option and applies to every column by default — no per-column
changes needed.

### 3. Import from Excel
- New dependency: `xlsx` (SheetJS) — no existing library in this codebase
  parses spreadsheet files client-side.
- New "Import from Excel" button next to the existing controls, wired to a
  hidden `<input type="file" accept=".xlsx,.xls">`, matching the file-input
  pattern already used in `GUI/app/pages/tm/upload.vue`.
- On file select: read as an `ArrayBuffer`, parse with `XLSX.read`, take the
  first sheet, convert to an array of objects via `XLSX.utils.sheet_to_json`
  (first row = headers).
- Match each Excel column header to a grid field **case-insensitively**
  against the grid's display headers (PID, Mnemonic, Type, ValueLogic,
  ResetLogic, ExpectedValue, Ignore Chain, Ignore Change, Ignore Limit,
  Limits, Range, Tolerance). Unrecognized columns are ignored; missing
  columns fall back to the same defaults `rowTemplate()`/`normalizeRows()`
  already use. Boolean columns (`Ignore Chain`/`Ignore Change`/
  `Ignore Limit`) accept common truthy strings (`true`/`1`/`yes`, case
  insensitive) in addition to actual boolean cell values.
- Imported rows are **appended** to `rowData` (not replacing existing rows),
  then persisted to localStorage the same way every other edit here is
  (`saveLocal`) — no backend call happens until the user clicks
  "Save Changes", consistent with how the rest of this page already works.

## Explicitly out of scope
- No column-mapping UI (drag-to-map, preview-before-import) — header names
  must match, silently skipping unmapped columns.
- No support for `.csv` — `.xlsx`/`.xls` only, per the request.
- No changes to the backend `/ud-tm` save endpoint or payload shape.

## Testing
- Add Row with count set to 3 adds exactly 3 new rows in one click; default
  value on page load is 1.
- Dragging a cell's fill handle across a range of cells (including
  checkbox/select columns) copies the value, matching `updateDb.vue`'s
  existing behavior.
- Importing an `.xlsx` file with a header row matching the grid's column
  names appends correctly-typed rows to the grid; an unrelated Excel file
  (unmatched headers) results in rows with defaults for every field, not an
  error.
