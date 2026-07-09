# Adding and using a new diagram element

This guide describes how to introduce a new SCADA-style node in SPASDACS Nova: from the **category string** through the graph, palette, inspector, optional **Simple mode** guided params, and **live telemetry** behavior.

Pick a **stable category name** (PascalCase, e.g. `MyWidget`) and use it **everywhere** the app keys nodes by category: `PALETTE_ITEMS`, `CATEGORY_TO_SHAPE`, inspector slices, guided params, and telemetry target lists.

---

## 1. Data model (`src/types.ts`)

1. **`ScadaNodeDomainFields`**  
   Add optional fields your Vue node reads from `cell.data` (booleans, numbers, strings, colors, etc.). Keep names consistent with what the node and telemetry will set.

2. **`CATEGORY_TARGET_PROPS`**  
   List which `cell.data` keys operators can bind to telemetry for this category (strings that match binding / inspector usage).

3. **`PALETTE_ITEMS`**  
   Append an entry:
   - `category`: your stable category string  
   - `label`: human-readable name in the palette  
   - `defaults`: `Partial<ScadaNodeData>` so new nodes get sensible initial `data` when dropped  

Existing items are the reference for shape and naming.

---

## 2. Vue node component (`src/nodes/<YourNode>.vue`)

- Implement the visuals with Vue 3.  
- Read node state via **`useNodeData()`** (or the project’s standard cell/data pattern) from **`cell.data`**, aligned with `ScadaNodeData` / your new domain fields.  
- Follow an existing node (e.g. `BatteryNode.vue`, `DriverAmplifierNode.vue`) for ports, sizing, and how data maps to SVG/CSS.

---

## 3. Register the shape (`src/graph/setupGraph.ts`)

1. **Import** your component.  
2. **`register()`** from `@antv/x6-vue-shape` with:
   - unique **`shape`** id (e.g. `scada-my-widget`)  
   - **`width` / `height`**  
   - **`component`**  
   - **`ports`** — reuse `DEFAULT_PORTS`, `LR_PORTS`, `TB_PORTS`, `LR_EDGE_PORTS`, etc., or define a custom port layout like other nodes.  
3. **`CATEGORY_TO_SHAPE`** — add your category → the same `shape` string.

The editor resolves drops using `PALETTE_ITEMS` + `CATEGORY_TO_SHAPE` in `src/pages/EditorPage.vue`.

---

## 4. Palette (`src/components/ElementPalette.vue`)

- Palette rows are driven by **`PALETTE_ITEMS`** from `src/types.ts`.  
- Add a **preview** block for your category in the template (same pattern as other categories).  
- Drag uses `category` + defaults from `PALETTE_ITEMS` (see `onDragStart`).

---

## 5. Inspector (`src/components/Inspector.vue` + `src/components/inspector/slices/`)

- Wire the inspector so a selected node of your category shows the right controls.  
- Add or extend a **slice** component under `inspector/slices/` and gate it with **`isAny('YourCategory')`** (or the project’s equivalent helper).  
- Bind editors to the same `cell.data` keys you listed in `CATEGORY_TARGET_PROPS` and used in the Vue node.

---

## 6. Optional: Simple mode guided params (`src/graph/guidedParams/`)

If the element should appear in **Simple mode** with a form + generated script:

1. Create **`src/graph/guidedParams/elements/<name>.ts`** exporting a **`GuidedCategoryDef`**:
   - **`params`**: `GuidedParam[]` (`key`, `label`, `hint`, optional `fixedValues`, `optional`)  
   - **`body`**: function returning a JS snippet that runs after `let` assignments and **`return`s** an object of data keys for the node (see `battery.ts` for a minimal example).  
2. Register in **`src/graph/guidedParams/registry.ts`**:
   - **`GUIDED_PARAMS`** — `category` string → `params`  
   - **`BODY_BUILDERS`** — same category → `body`  

Use the **exact same category string** as everywhere else.

---

## 7. Live telemetry (`src/telemetry/X6NatsTelemetry.ts`)

When telemetry drives your node’s `cell.data`:

- **Numeric** props that should tween must be listed in **`NUMERIC_PROPS`**.  
- **Boolean** props in **`BOOLEAN_PROPS`**.  
- **Color** props in **`COLOR_PROPS`**.  
- Edge-only string props use **`EDGE_STRING_PROPS`**.  
- Geometry (`x`, `y`, `width`, `height`, `angle`, `visible`) has special handling via **`GEO_PROPS`** / **`GEO_OFFSET_PROPS`** — only extend these if your bindings intentionally move or resize nodes from TM.

If you add a new prop type (e.g. a string that isn’t edge-related), check how existing code applies values and extend the same pattern so updates are consistent.

---

## 8. Dependency overview

```text
types.ts (domain fields, PALETTE_ITEMS, CATEGORY_TARGET_PROPS)
    → setupGraph.ts (register + CATEGORY_TO_SHAPE)
    → nodes/<Name>.vue (rendering)
    → ElementPalette.vue (preview + drag)
    → Inspector + inspector/slices (editing)
    → optional guidedParams/elements/*.ts + registry.ts
    → X6NatsTelemetry.ts (prop sets + apply behavior)
```

---

## 9. Quick checklist

- [ ] Category string fixed and reused everywhere.  
- [ ] `ScadaNodeDomainFields` + `PALETTE_ITEMS` + `CATEGORY_TARGET_PROPS`.  
- [ ] Vue node + `register()` + `CATEGORY_TO_SHAPE`.  
- [ ] Palette preview + inspector slice.  
- [ ] `NUMERIC_PROPS` / `BOOLEAN_PROPS` / `COLOR_PROPS` (and friends) updated if telemetry binds new fields.  
- [ ] If using Simple mode: `guidedParams/elements/<name>.ts` + `registry.ts`.

After changes, drop a node from the palette in the editor, save/load JSON, and verify viewer telemetry updates if bindings are used.
