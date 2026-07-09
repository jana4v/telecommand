<template>
  <Teleport to="body">
    <div v-if="visible" class="tbe-backdrop" @mousedown.self="close">
      <div class="tbe-modal">

        <!-- Header -->
        <div class="tbe-header">
          <span class="tbe-header-title">⚡ Telemetry Binding Editor</span>
          <span v-if="cellLabel" class="tbe-header-mnem">{{ cellLabel }}</span>
          <span v-if="effectiveSvgElementId" class="tbe-header-part" title="Telemetry applies to this SVG part">#{{ effectiveSvgElementId }}</span>
          <button class="tbe-close-btn" @click="close" title="Close">✕</button>
        </div>

        <!-- Tab bar -->
        <div class="tbe-tabs">
          <button class="tbe-tab" :class="{ active: activeTab === 'bindings' }" @click="activeTab = 'bindings'">
            Bindings <span v-if="localBindings.length" class="tab-count">{{ localBindings.length }}</span>
          </button>
          <button class="tbe-tab" :class="{ active: activeTab === 'simple' }" @click="activeTab = 'simple'">Simple</button>
          <button class="tbe-tab" :class="{ active: activeTab === 'advanced' }" @click="switchToAdvanced">Advanced</button>
        </div>

        <!-- ── Bindings tab ──────────────────────────────────────────────── -->
        <div v-if="activeTab === 'bindings'" class="bindings-list">
          <div v-if="!localBindings.length" class="bindings-empty-state">
            No bindings yet. Click <strong>+ New Binding</strong> to add one.
          </div>
          <div v-for="b in localBindings" :key="b.id" class="binding-item">
            <span class="binding-type-badge">{{ b.targetProp === '__multi__' ? 'Script' : 'Rules' }}</span>
            <span v-if="b.sourceStreamId && b.sourceStreamId !== 'default'" class="binding-stream-badge" :title="'NATS stream'">{{ b.sourceStreamId }}</span>
            <span v-if="b.svgElementId" class="binding-part-badge" :title="'SVG part'">{{ b.svgElementId }}</span>
            <span class="binding-preview">{{ b.topic || (b.script?.slice(0, 60) ?? b.targetProp) }}</span>
            <div class="binding-item-actions">
              <button class="btn-binding-edit" @click="editBindingFromList(b)" title="Edit">✎</button>
              <button class="btn-binding-del" @click="deleteBinding(b.id)" title="Delete">✕</button>
            </div>
          </div>
          <button class="btn-new-binding" @click="startNewBinding">+ New Binding</button>

          <!-- ── Hover Display section (nodes only) ──────────────────────── -->
          <div v-if="!isEdge" class="hover-display-section">
            <div class="hover-display-header">
              <span class="hover-display-title">Hover Display</span>
              <span class="hover-display-hint">Mnemonics shown in live tooltip on element hover</span>
            </div>
            <!-- Existing hover mnemonics -->
            <div class="hover-chips">
              <div v-for="(mnem, idx) in localHoverMnemonics" :key="idx" class="hover-chip">
                <span class="hover-chip-label">{{ mnem }}</span>
                <button class="hover-chip-del" type="button" @click="removeHoverMnemonic(idx)" title="Remove">✕</button>
              </div>
              <div v-if="!localHoverMnemonics.length" class="hover-empty">
                No hover mnemonics — add one below.
              </div>
            </div>
            <!-- Subsystem filter + mnemonic picker row -->
            <div class="hover-add-row">
              <!-- Subsystem single-select -->
              <div class="hover-sub-wrap" v-click-outside="() => { hoverSubOpen = false }">
                <button ref="hoverSubTriggerEl" class="ms-trigger hover-sub-trigger" type="button"
                  @click.stop="openHoverSub(hoverSubTriggerEl as HTMLElement)">
                  <span class="ms-trigger-label">{{ hoverSubsystem || 'All subsystems' }}</span>
                  <span class="ms-chevron">{{ hoverSubOpen ? '▲' : '▼' }}</span>
                </button>
                <Teleport to="body">
                  <div v-if="hoverSubOpen" class="ms-dropdown" :style="hoverSubStyle" @click.stop @mousedown.stop>
                    <div class="ms-search-wrap">
                      <input class="ms-search" v-model="hoverSubQuery" placeholder="Search subsystem…" @click.stop />
                      <button v-if="hoverSubsystem" class="ms-clear-btn" type="button"
                        @click.stop="hoverSubsystem = ''; hoverSubOpen = false" title="Clear">✕</button>
                    </div>
                    <ul class="ms-list">
                      <li class="ms-item" :class="{ selected: hoverSubsystem === '' }"
                        @click.stop="hoverSubsystem = ''; hoverSubOpen = false">All subsystems</li>
                      <li v-for="s in hoverSubFiltered" :key="s" class="ms-item"
                        :class="{ selected: hoverSubsystem === s }"
                        @click.stop="hoverSubsystem = s; hoverSubOpen = false">{{ s }}</li>
                      <li v-if="hoverSubFiltered.length === 0" class="ms-empty">No match</li>
                    </ul>
                  </div>
                </Teleport>
              </div>

              <!-- Mnemonic searchable dropdown -->
              <button ref="hoverMnemTriggerEl" class="guided-mnem-trigger hover-mnem-trigger"
                :class="{ 'has-value': !!newHoverMnem, 'is-open': hoverMnemDropOpen }"
                type="button" @click.stop="openHoverMnemDrop(hoverMnemTriggerEl as HTMLElement)">
                <span class="guided-mnem-trigger-label">{{ newHoverMnem || '— Select mnemonic —' }}</span>
                <span class="guided-mnem-trigger-chevron">{{ hoverMnemDropOpen ? '▲' : '▼' }}</span>
              </button>
              <Teleport to="body">
                <div v-if="hoverMnemDropOpen" class="mnem-dropdown" :style="hoverMnemDropStyle"
                  @mousedown.stop @click.stop>
                  <div class="mnem-search-wrap">
                    <input v-model="hoverMnemDropQuery" class="mnem-search hover-mnem-search"
                      placeholder="Search mnemonic…" autocomplete="off" @click.stop
                      @keydown.escape.stop="hoverMnemDropOpen = false"
                      @keydown.enter.stop="addHoverMnemFromInput" />
                    <button v-if="newHoverMnem" type="button" class="mnem-clear-btn"
                      @click.stop="newHoverMnem = ''" title="Clear">✕</button>
                  </div>
                  <ul class="mnem-list">
                    <li v-for="opt in hoverMnemDropOptions" :key="opt" class="mnem-item"
                      :class="{ selected: newHoverMnem === opt }"
                      @click.stop="newHoverMnem = opt; hoverMnemDropOpen = false">
                      <span class="mnem-item-label">{{ opt }}</span>
                    </li>
                    <li v-if="hoverMnemDropOptions.length === 0" class="mnem-empty">No match</li>
                    <li v-else-if="hoverMnemDropHasMore" class="mnem-hint">Showing first {{ MNEM_DROPDOWN_LIMIT }} matches. Type more to narrow.</li>
                  </ul>
                </div>
              </Teleport>
              <div v-if="hoverMnemDropOpen" class="mnem-overlay" style="z-index:10299"
                @mousedown="hoverMnemDropOpen = false"></div>

              <button class="hover-add-btn" type="button"
                @click="addHoverMnemFromInput"
                :disabled="!newHoverMnem.trim()">+ Add</button>
            </div>
          </div>

          <!-- ── Telecommands section (nodes only) ────────────────────────── -->
          <div v-if="!isEdge" class="tc-section">
            <div class="hover-display-header">
              <span class="hover-display-title">📡 Telecommands</span>
              <span class="hover-display-hint">TC mnemonics associated with this element</span>
            </div>
            <!-- Selected TC mnemonics chips -->
            <div class="hover-chips">
              <div v-for="(mnem, idx) in localTelecommands" :key="idx" class="hover-chip tc-chip">
                <span class="hover-chip-label">{{ mnem }}</span>
                <button class="hover-chip-del" type="button" @click="removeTelecommand(idx)" title="Remove">✕</button>
              </div>
              <div v-if="!localTelecommands.length" class="hover-empty">
                No telecommands — add one below.
              </div>
            </div>
            <!-- Subsystem filter + TC mnemonic picker row -->
            <div class="hover-add-row">
              <!-- TC Subsystem single-select -->
              <div class="hover-sub-wrap" v-click-outside="() => { tcSubOpen = false }">
                <button ref="tcSubTriggerEl" class="ms-trigger hover-sub-trigger" type="button"
                  @click.stop="openTcSub(tcSubTriggerEl as HTMLElement)">
                  <span class="ms-trigger-label">{{ tcSubsystem || 'All subsystems' }}</span>
                  <span class="ms-chevron">{{ tcSubOpen ? '▲' : '▼' }}</span>
                </button>
                <Teleport to="body">
                  <div v-if="tcSubOpen" class="ms-dropdown" :style="tcSubStyle" @click.stop @mousedown.stop>
                    <div class="ms-search-wrap">
                      <input class="ms-search" v-model="tcSubQuery" placeholder="Search subsystem…" @click.stop />
                      <button v-if="tcSubsystem" class="ms-clear-btn" type="button"
                        @click.stop="tcSubsystem = ''; tcSubOpen = false" title="Clear">✕</button>
                    </div>
                    <ul class="ms-list">
                      <li class="ms-item" :class="{ selected: tcSubsystem === '' }"
                        @click.stop="tcSubsystem = ''; tcSubOpen = false">All subsystems</li>
                      <li v-for="s in tcSubFiltered" :key="s" class="ms-item"
                        :class="{ selected: tcSubsystem === s }"
                        @click.stop="tcSubsystem = s; tcSubOpen = false">{{ s }}</li>
                      <li v-if="tcSubFiltered.length === 0" class="ms-empty">No match</li>
                    </ul>
                  </div>
                </Teleport>
              </div>

              <!-- TC Mnemonic searchable dropdown -->
              <button ref="tcMnemTriggerEl" class="guided-mnem-trigger hover-mnem-trigger"
                :class="{ 'has-value': !!newTcMnem, 'is-open': tcMnemDropOpen }"
                type="button" @click.stop="openTcMnemDrop(tcMnemTriggerEl as HTMLElement)">
                <span class="guided-mnem-trigger-label">{{ tcDisplayLabel(newTcMnem) || '— Select TC mnemonic —' }}</span>
                <span class="guided-mnem-trigger-chevron">{{ tcMnemDropOpen ? '▲' : '▼' }}</span>
              </button>
              <Teleport to="body">
                <div v-if="tcMnemDropOpen" class="mnem-dropdown" :style="tcMnemDropStyle"
                  @mousedown.stop @click.stop>
                  <div class="mnem-search-wrap">
                    <input v-model="tcMnemDropQuery" class="mnem-search tc-mnem-search"
                      placeholder="Search TC mnemonic…" autocomplete="off" @click.stop
                      @keydown.escape.stop="tcMnemDropOpen = false"
                      @keydown.enter.stop="addTcMnemFromInput" />
                    <button v-if="newTcMnem" type="button" class="mnem-clear-btn"
                      @click.stop="newTcMnem = ''" title="Clear">✕</button>
                  </div>
                  <ul class="mnem-list">
                    <li v-for="opt in tcMnemDropOptions" :key="opt.value" class="mnem-item"
                      :class="{ selected: newTcMnem === opt.value }"
                      @click.stop="newTcMnem = opt.value; tcMnemDropOpen = false">
                      <span class="mnem-item-label">{{ opt.label }}</span>
                    </li>
                    <li v-if="tcMnemDropOptions.length === 0" class="mnem-empty">No match</li>
                    <li v-else-if="tcMnemDropHasMore" class="mnem-hint">Showing first {{ MNEM_DROPDOWN_LIMIT }} matches. Type more to narrow.</li>
                  </ul>
                </div>
              </Teleport>
              <div v-if="tcMnemDropOpen" class="mnem-overlay" style="z-index:10299"
                @mousedown="tcMnemDropOpen = false"></div>

              <button class="hover-add-btn" type="button"
                @click="addTcMnemFromInput"
                :disabled="!newTcMnem.trim()">+ Add</button>
            </div>
          </div>
        </div>

        <!-- ── Simple tab: GUIDED form (category has guided params) ─────── -->
        <div v-if="hasSimpleMode && !isDataGrid && activeTab === 'simple'" class="simple-form-area">

          <div class="simple-field">
            <span class="simple-field-label">Telemetry source</span>
            <select v-model="simpleSourceStreamId" class="simple-prop-select" title="NATS stream for this element’s telemetry">
              <option v-for="s in telemetryStreams" :key="s.id" :value="s.id">{{ s.label }} ({{ s.id }})</option>
            </select>
            <p class="simple-field-hint">
              Configure streams in <strong>Viewer → NATS</strong> or the diagram list <strong>Streams</strong> button.
              The viewer passes a <strong>scoped</strong> <code>TM</code> to the script for the stream you pick here — you normally use <code>TM["MNEMONIC"]</code>, not <code>TM.streams…</code>, unless <strong>Main TM (default)</strong> is selected (full <code>TM</code> with <code>TM.streams.&lt;id&gt;</code>).
            </p>
            <p class="simple-field-hint simple-field-hint--sub">
              In <strong>Advanced</strong>, <code>TM[""]</code> only means a parameter still has <strong>no mnemonic</strong> in Simple — it is <em>not</em> the stream id. Select mnemonics for every row, then Save.
            </p>
          </div>

          <!-- Subsystem multi-select filter -->
          <div class="simple-subsystem-row" v-click-outside="() => { msOpen = false }">
            <span class="simple-subsystem-label">Subsystem</span>
            <div class="ms-wrap">
              <button ref="msTriggerEl" class="ms-trigger" type="button" @click.stop="toggleMsOpen">
                <span class="ms-trigger-label">
                  <template v-if="simpleSubsystems.length === 0">All subsystems</template>
                  <template v-else-if="simpleSubsystems.length === 1">{{ simpleSubsystems[0] }}</template>
                  <template v-else>{{ simpleSubsystems.length }} subsystems</template>
                </span>
                <span class="ms-chevron">{{ msOpen ? '▲' : '▼' }}</span>
              </button>
              <Teleport to="body">
                <div v-if="msOpen" class="ms-dropdown" :style="msDropdownStyle" @click.stop @mousedown.stop>
                  <div class="ms-search-wrap">
                    <input class="ms-search" v-model="msQuery" placeholder="Search subsystem…" @click.stop />
                    <button v-if="simpleSubsystems.length > 0" class="ms-clear-btn" type="button"
                      @click.stop="simpleSubsystems = []" title="Clear selection">✕</button>
                  </div>
                  <ul class="ms-list">
                    <li v-for="s in msFiltered" :key="s" class="ms-item"
                      :class="{ selected: simpleSubsystems.includes(s) }" @click.stop="toggleSubsystem(s)">
                      <span class="ms-checkbox">{{ simpleSubsystems.includes(s) ? '✓' : '' }}</span>{{ s }}
                    </li>
                    <li v-if="msFiltered.length === 0" class="ms-empty">No match</li>
                  </ul>
                </div>
              </Teleport>
            </div>
          </div>

          <div class="simple-field simple-inline-fields">
            <div>
              <span class="simple-field-label">Animation duration (s)</span>
              <input v-model.number="simpleAnimationDuration" type="number" min="0" step="0.1" class="simple-prop-select" />
            </div>
          </div>

          <!-- ── Indicator: State mnemonic hoisted above Colour Conditions ───── -->
          <template v-if="resolvedGuidedCategory === 'Indicator' && paramValues['state']">
            <div class="guided-row">
              <div class="guided-row-header">
                <span class="guided-label">State</span>
                <span class="guided-hint">value that drives the LED colour (e.g. '1', '0')</span>
              </div>
              <div class="guided-input-area">
                <div v-if="paramValues['state'].customExpr" class="guided-custom-expr">
                  <span class="guided-custom-expr-label">Custom:</span>
                  <code class="guided-custom-expr-code">{{ paramValues['state'].customExpr }}</code>
                  <button type="button" class="guided-custom-expr-clear"
                    @click="paramValues['state'].customExpr = undefined" title="Clear custom expression">✕</button>
                </div>
                <button v-if="!paramValues['state'].customExpr" type="button" class="guided-mnem-trigger"
                  :class="{ 'has-value': !!paramValues['state'].mnemonic, 'is-open': activeMnemDropdown === 'state' }"
                  :disabled="paramValues['state'].na"
                  @click="openMnemDropdown('state', $event.currentTarget as HTMLElement)">
                  <span class="guided-mnem-trigger-label">
                    {{ paramValues['state'].mnemonic || '— Select mnemonic —' }}
                  </span>
                  <span class="guided-mnem-trigger-chevron">{{ activeMnemDropdown === 'state' ? '▲' : '▼' }}</span>
                </button>
                <Teleport to="body">
                  <div v-if="activeMnemDropdown === 'state'" class="mnem-dropdown" :style="mnemDropdownStyle"
                    @mousedown.stop @click.stop>
                    <div class="mnem-search-wrap">
                      <input v-model="mnemDropdownQuery" class="mnem-search" placeholder="Search mnemonic…"
                        autocomplete="off" @click.stop @keydown.escape.stop="closeMnemDropdown" />
                      <button v-if="paramValues['state'].mnemonic" type="button" class="mnem-clear-btn"
                        @click.stop="selectMnemonic('state', '')" title="Clear">✕</button>
                    </div>
                    <ul class="mnem-list">
                      <li v-for="opt in mnemDropdownOptions" :key="opt" class="mnem-item"
                        :class="{ selected: paramValues['state'].mnemonic === opt, 'cross-sub': isCrossSubsystem(opt) }"
                        @click.stop="selectMnemonic('state', opt)">
                        <span class="mnem-item-label">{{ opt }}</span>
                        <span v-if="isCrossSubsystem(opt)" class="mnem-item-badge">other sub</span>
                      </li>
                      <li v-if="mnemDropdownOptions.length === 0" class="mnem-empty">No match</li>
                      <li v-else-if="mnemDropdownHasMore" class="mnem-hint">Showing first {{ MNEM_DROPDOWN_LIMIT }} matches. Type more to narrow.</li>
                    </ul>
                  </div>
                </Teleport>
                <button
                  v-if="!paramValues['state'].customExpr && paramValues['state'].mnemonic && !paramValues['state'].na"
                  type="button" class="guided-transform-btn"
                  :class="{ active: !!paramValues['state'].transform, open: activeTransformKey === 'state' }"
                  @click="toggleTransformPanel('state')"
                  :title="paramValues['state'].transform ? 'Edit transform: ' + paramValues['state'].transform : 'Add pre-transform (optional)'">
                  <span class="guided-transform-icon">⚡</span>
                  <span v-if="paramValues['state'].transform" class="guided-transform-preview">{{ paramValues['state'].transform }}</span>
                  <span v-else class="guided-transform-none">transform</span>
                </button>
                <!-- No ON/OFF chips for Indicator — Colour Conditions handle value→colour mapping -->
              </div>
            </div>
          </template>

          <!-- ── CurrentSensor / Indicator: colour conditions (rule list) ───── -->
          <div v-if="resolvedGuidedCategory === 'CurrentSensor' || resolvedGuidedCategory === 'Indicator'" class="cs-rules-block">
            <div class="cs-rules-header">
              <span class="cs-rules-title">Colour Conditions</span>
              <!-- Auto-suggest button: visible when a mnemonic with discrete values is selected -->
              <button
                v-if="csSourceMnemonic"
                class="cs-autofill-btn"
                type="button"
                :title="`Re-generate conditions from ${csSourceMnemonic}'s telemetry values`"
                @click="csAutoFillNonce++"
              >⟳ Auto-suggest</button>
              <span class="cs-rules-hint">First match wins · evaluated against <code>currentValue</code></span>
            </div>
            <p v-if="resolvedGuidedCategory === 'Indicator' && csSourceMnemonic && !csRules.length"
               class="cs-autofill-hint">
              No conditions yet — click <strong>⟳ Auto-suggest</strong> to prefill from
              <em>{{ csSourceMnemonic }}</em>'s known states, or add manually.
            </p>

            <div v-if="!csRules.length && !(resolvedGuidedCategory === 'Indicator' && csSourceMnemonic)" class="cs-rules-empty">
              No conditions yet — the readout uses the default colour.
            </div>

            <div v-for="(rule, i) in csRules" :key="i" class="cs-rule-row">
              <span class="cs-rule-prefix">If current</span>

              <!-- Only == / != make sense for string states -->
              <select class="cs-op"
                :value="rule.op"
                @change="csUpdateRule(i, 'op', ($event.target as HTMLSelectElement).value)">
                <template v-if="typeof rule.threshold === 'string' && isNaN(Number(rule.threshold))">
                  <option value="==">==</option>
                  <option value="!=">!=</option>
                </template>
                <template v-else>
                  <option value=">">&gt;</option>
                  <option value=">=">&gt;=</option>
                  <option value="<">&lt;</option>
                  <option value="<=">&lt;=</option>
                  <option value="==">==</option>
                  <option value="!=">!=</option>
                </template>
              </select>

              <!-- Text input for string states (ON/OFF), number input for numeric thresholds -->
              <input
                :class="['cs-thresh', { 'cs-thresh-str': typeof rule.threshold === 'string' && isNaN(Number(rule.threshold)) }]"
                :type="typeof rule.threshold === 'string' && isNaN(Number(rule.threshold)) ? 'text' : 'number'"
                step="any"
                :value="rule.threshold"
                @change="csUpdateRule(i, 'threshold', ($event.target as HTMLInputElement).value)" />

              <span class="cs-arrow">→</span>

              <input class="cs-color" type="color"
                :value="rule.color"
                @input="csUpdateRule(i, 'color', ($event.target as HTMLInputElement).value)" />

              <button class="cs-del" type="button" title="Delete rule" @click="csRemoveRule(i)">✕</button>
            </div>

            <button class="cs-add" type="button" @click="csAddRule">+ Add Condition</button>
          </div>

          <!-- Per-param guided rows (state is hoisted above Colour Conditions for Indicator) -->
          <template v-for="param in guidedParams" :key="param.key">
            <div v-if="paramValues[param.key] && shouldShowGuidedParam(param)
                       && !(resolvedGuidedCategory === 'Indicator' && param.key === 'state')"
                 class="guided-row">
              <div class="guided-row-header">
                <span class="guided-label">{{ param.label }}</span>
                <span class="guided-hint">{{ param.hint }}</span>
              </div>
              <div class="guided-input-area">

                <!-- Custom expression banner -->
                <div v-if="paramValues[param.key].customExpr" class="guided-custom-expr">
                  <span class="guided-custom-expr-label">Custom:</span>
                  <code class="guided-custom-expr-code">{{ paramValues[param.key].customExpr }}</code>
                  <button type="button" class="guided-custom-expr-clear"
                    @click="paramValues[param.key].customExpr = undefined" title="Clear custom expression">✕</button>
                </div>

                <!-- Mnemonic searchable dropdown -->
                <button v-if="!paramValues[param.key].customExpr" type="button" class="guided-mnem-trigger"
                  :class="{ 'has-value': !!paramValues[param.key].mnemonic, 'is-open': activeMnemDropdown === param.key }"
                  :disabled="paramValues[param.key].na"
                  @click="openMnemDropdown(param.key, $event.currentTarget as HTMLElement)">
                  <span class="guided-mnem-trigger-label">
                    {{ paramValues[param.key].mnemonic || '— Select mnemonic —' }}
                  </span>
                  <span class="guided-mnem-trigger-chevron">{{ activeMnemDropdown === param.key ? '▲' : '▼' }}</span>
                </button>

                <Teleport to="body">
                  <div v-if="activeMnemDropdown === param.key" class="mnem-dropdown" :style="mnemDropdownStyle"
                    @mousedown.stop @click.stop>
                    <div class="mnem-search-wrap">
                      <input v-model="mnemDropdownQuery" class="mnem-search" placeholder="Search mnemonic…"
                        autocomplete="off" @click.stop @keydown.escape.stop="closeMnemDropdown" />
                      <button v-if="paramValues[param.key].mnemonic" type="button" class="mnem-clear-btn"
                        @click.stop="selectMnemonic(param.key, '')" title="Clear">✕</button>
                    </div>
                    <ul class="mnem-list">
                      <li v-for="opt in mnemDropdownOptions" :key="opt" class="mnem-item"
                        :class="{ selected: paramValues[param.key].mnemonic === opt, 'cross-sub': isCrossSubsystem(opt) }"
                        @click.stop="selectMnemonic(param.key, opt)">
                        <span class="mnem-item-label">{{ opt }}</span>
                        <span v-if="isCrossSubsystem(opt)" class="mnem-item-badge">other sub</span>
                      </li>
                      <li v-if="mnemDropdownOptions.length === 0" class="mnem-empty">No match</li>
                      <li v-else-if="mnemDropdownHasMore" class="mnem-hint">Showing first {{ MNEM_DROPDOWN_LIMIT }} matches. Type more to narrow.</li>
                    </ul>
                  </div>
                </Teleport>

                <!-- Per-param ⚡ transform button (shown only when mnemonic selected) -->
                <button
                  v-if="!paramValues[param.key].customExpr && paramValues[param.key].mnemonic && !paramValues[param.key].na"
                  type="button" class="guided-transform-btn"
                  :class="{ active: !!paramValues[param.key].transform, open: activeTransformKey === param.key }"
                  @click="toggleTransformPanel(param.key)"
                  :title="paramValues[param.key].transform ? 'Edit transform: ' + paramValues[param.key].transform : 'Add pre-transform (optional)'">
                  <span class="guided-transform-icon">⚡</span>
                  <span v-if="paramValues[param.key].transform" class="guided-transform-preview">{{ paramValues[param.key].transform }}</span>
                  <span v-else class="guided-transform-none">transform</span>
                </button>

                <!-- Fixed value chips + N/A chip -->
                <div v-if="!paramValues[param.key].customExpr && (param.fixedValues?.length || param.optional)" class="guided-chips">
                  <button v-for="v in param.fixedValues" :key="v" class="guided-chip"
                    :class="{ active: paramValues[param.key].fixed === v && !paramValues[param.key].na }"
                    @click="selectFixed(param.key, v)" type="button">{{ v }}</button>
                  <button v-if="param.optional" class="guided-chip guided-chip-na"
                    :class="{ active: paramValues[param.key].na }"
                    @click="selectNa(param.key)" type="button">N/A</button>
                </div>

                <!-- Map raw TM labels → element canonical states (e.g. ON/OFF vs LOCKED/UNLOCKED) -->
                <div v-if="showGuidedStateMapping(param)" class="guided-state-map">
                  <div class="guided-state-map-title">Map telemetry → element states</div>
                  <p class="guided-state-map-hint">
                    Telemetry discrete values differ from the element’s expected states. Assign each raw value to a canonical state.
                  </p>
                  <div v-for="raw in guidedActualStatesForParam(param)" :key="raw" class="guided-state-map-row">
                    <code class="guided-state-map-raw">{{ raw }}</code>
                    <span class="guided-state-map-arrow" aria-hidden="true">→</span>
                    <select class="guided-state-map-select"
                      :value="paramValues[param.key].stateMap?.[raw] ?? ''"
                      @change="onGuidedStateMapChange(param.key, raw, ($event.target as HTMLSelectElement).value)">
                      <option disabled value="">— choose —</option>
                      <option v-for="ev in (param.fixedValues ?? [])" :key="`${raw}-${ev}`" :value="ev">{{ ev }}</option>
                    </select>

                    <template v-if="showGuidedStateColorEditor(param)">
                      <span class="guided-state-map-arrow" aria-hidden="true">🎨</span>
                      <input
                        class="guided-state-color"
                        type="color"
                        :value="guidedStateColorForRaw(raw)"
                        @input="onGuidedStateColorChange(raw, ($event.target as HTMLInputElement).value)"
                        :title="`Color for ${raw}`"
                      />
                    </template>
                  </div>
                  <p v-if="showGuidedStateColorEditor(param)" class="guided-state-map-hint">
                    State colors are driven from selected telemetry states and mapped into Robot ON/OFF accent colors.
                  </p>
                  <button v-if="paramValues[param.key].stateMap && Object.keys(paramValues[param.key].stateMap!).length"
                    type="button" class="guided-state-map-clear" @click="clearGuidedStateMap(param.key)">
                    Clear mapping
                  </button>
                </div>
              </div>

              <!-- Inline transform Monaco panel -->
              <div v-if="activeTransformKey === param.key" class="guided-transform-panel">
                <div class="guided-transform-panel-header">
                  <span class="guided-transform-panel-title">⚡ Transform — <strong>{{ param.label }}</strong></span>
                  <span class="guided-transform-panel-hint"><code>v</code> = raw TM value · expression must evaluate to a value</span>
                  <button v-if="paramValues[param.key].transform" class="guided-transform-panel-clear"
                    type="button" @click="clearTransform(param.key)" title="Remove transform">✕ Clear</button>
                  <button class="guided-transform-panel-close" type="button" @click="closeTransformPanel">✕</button>
                </div>
                <div class="guided-transform-snippets">
                  <button v-for="snip in TRANSFORM_SNIPPETS" :key="snip.label" type="button"
                    class="guided-transform-snip" :title="snip.insert"
                    @click="insertTransformSnippet(param.key, snip.insert)">{{ snip.label }}</button>
                </div>
                <div :ref="el => { transformEditorEl = (el as HTMLElement) ?? null }"
                  class="guided-transform-editor-area"></div>
              </div>
            </div>

            <!-- ── Border Colour Conditions (injected right after the Border row) ── -->
            <div v-if="param.key === 'borderColor'
                       && BORDER_COLOR_CATEGORIES.has(resolvedGuidedCategory ?? '')
                       && bcSourceMnemonic"
                 class="cs-rules-block">
              <div class="cs-rules-header">
                <span class="cs-rules-title">Border Colour Conditions</span>
                <button class="cs-autofill-btn" type="button"
                  :title="`Re-generate conditions from ${bcSourceMnemonic}'s telemetry values`"
                  @click="bcAutoFillNonce++">⟳ Auto-suggest</button>
                <span class="cs-rules-hint">First match wins · evaluated against border mnemonic value</span>
              </div>
              <p v-if="!bcRules.length" class="cs-autofill-hint">
                No conditions yet — click <strong>⟳ Auto-suggest</strong> to prefill from
                <em>{{ bcSourceMnemonic }}</em>'s known states, or add manually.
              </p>

              <div v-for="(rule, bi) in bcRules" :key="bi" class="cs-rule-row">
                <span class="cs-rule-prefix">If border</span>
                <select class="cs-op"
                  :value="rule.op"
                  @change="bcUpdateRule(bi, 'op', ($event.target as HTMLSelectElement).value)">
                  <template v-if="typeof rule.threshold === 'string' && isNaN(Number(rule.threshold))">
                    <option value="==">==</option>
                    <option value="!=">!=</option>
                  </template>
                  <template v-else>
                    <option value=">">&gt;</option>
                    <option value=">=">&gt;=</option>
                    <option value="<">&lt;</option>
                    <option value="<=">&lt;=</option>
                    <option value="==">==</option>
                    <option value="!=">!=</option>
                  </template>
                </select>
                <input
                  :class="['cs-thresh', { 'cs-thresh-str': typeof rule.threshold === 'string' && isNaN(Number(rule.threshold)) }]"
                  :type="typeof rule.threshold === 'string' && isNaN(Number(rule.threshold)) ? 'text' : 'number'"
                  step="any"
                  :value="rule.threshold"
                  @change="bcUpdateRule(bi, 'threshold', ($event.target as HTMLInputElement).value)" />
                <span class="cs-arrow">→</span>
                <input class="cs-color" type="color"
                  :value="rule.color"
                  @input="bcUpdateRule(bi, 'color', ($event.target as HTMLInputElement).value)" />
                <button class="cs-del" type="button" title="Delete rule" @click="bcRemoveRule(bi)">✕</button>
              </div>

              <button class="cs-add" type="button" @click="bcAddRule">+ Add Condition</button>
            </div>
          </template>
        </div>

        <!-- Overlay to close mnemonic dropdown on outside click -->
        <Teleport to="body">
          <div v-if="activeMnemDropdown !== null" class="mnem-overlay" @mousedown="closeMnemDropdown"></div>
        </Teleport>

        <!-- ── Simple tab: DataGrid row manager ─────────────────────────────── -->
        <div v-if="isDataGrid && activeTab === 'simple'" class="simple-form-area dg-guided-area">

          <!-- Stream selector -->
          <div class="simple-field">
            <span class="simple-field-label">Telemetry source</span>
            <select v-model="simpleSourceStreamId" class="simple-prop-select"
              title="NATS stream for all DataGrid row bindings">
              <option v-for="s in telemetryStreams" :key="s.id" :value="s.id">{{ s.label }} ({{ s.id }})</option>
            </select>
          </div>

          <div class="dg-section-header">
            <span class="dg-section-title">Telemetry Rows</span>
            <span class="dg-section-hint">Column 1 = label · Column 2 = live telemetry value</span>
          </div>

          <!-- Empty state -->
          <div v-if="localDgRows.length === 0" class="dg-empty-hint">
            No rows yet — add one below.
          </div>

          <!-- Existing rows -->
          <div v-for="(row, ridx) in localDgRows" :key="row.id" class="dg-guided-row">
            <span class="dg-row-num">{{ ridx + 1 }}</span>
            <div class="dg-row-body">
              <!-- Editable label text -->
              <input class="dg-row-label-input" :value="row.label"
                placeholder="Label (static text)"
                @change="updateDgRowLabel(ridx, ($event.target as HTMLInputElement).value)" />
              <!-- Value topic (required) -->
              <button type="button" class="guided-mnem-trigger dg-topic-btn"
                :class="{ 'has-value': !!row.valueTopic, 'is-open': activeDgDrop === `${row.id}_value` }"
                @click.stop="openDgDrop(`${row.id}_value`, $event.currentTarget as HTMLElement)">
                <span class="guided-mnem-trigger-label">{{ row.valueTopic || '— Value mnemonic * —' }}</span>
                <span class="guided-mnem-trigger-chevron">{{ activeDgDrop === `${row.id}_value` ? '▲' : '▼' }}</span>
              </button>
              <!-- Label topic (optional) -->
              <button type="button" class="guided-mnem-trigger dg-topic-btn dg-topic-opt"
                :class="{ 'has-value': !!row.labelTopic, 'is-open': activeDgDrop === `${row.id}_label` }"
                @click.stop="openDgDrop(`${row.id}_label`, $event.currentTarget as HTMLElement)">
                <span class="guided-mnem-trigger-label">{{ row.labelTopic || '— Label mnemonic (opt) —' }}</span>
                <span class="guided-mnem-trigger-chevron">{{ activeDgDrop === `${row.id}_label` ? '▲' : '▼' }}</span>
              </button>

              <!-- Row value options: Decimals + Display mode -->
              <div class="dg-row-opts">
                <label class="dg-opt-label" title="Round numeric value to N decimal places">
                  <span class="dg-opt-text">Decimals</span>
                  <input class="dg-decimals-input" type="number" min="0" max="8" step="1"
                    :value="row.decimals ?? ''" placeholder="—"
                    @change="updateDgRowDecimals(ridx, ($event.target as HTMLInputElement).value)" />
                </label>
                <div class="dg-mode-toggle">
                  <button type="button" class="dg-mode-btn"
                    :class="{ active: (row.displayMode ?? 'text') === 'text' }"
                    @click="updateDgRowDisplayMode(ridx, 'text')">Text</button>
                  <button type="button" class="dg-mode-btn"
                    :class="{ active: row.displayMode === 'led' }"
                    @click="updateDgRowDisplayMode(ridx, 'led')">
                    <span class="dg-led-dot" :class="{ active: row.displayMode === 'led' }"></span>LED
                  </button>
                </div>
              </div>

              <!-- LED condition panel (shown only in LED mode) -->
              <div v-if="row.displayMode === 'led'" class="dg-led-panel">
                <div class="dg-led-panel-header">
                  <span class="dg-led-panel-title">LED Conditions</span>
                  <button v-if="row.valueTopic" type="button" class="dg-led-autobtn"
                    title="Fetch possible values and auto-suggest conditions"
                    @click="fetchAndApplyLedDefaults(row.id, row.valueTopic)">
                    ⟳ Auto-suggest
                  </button>
                </div>

                <!-- ON condition -->
                <div class="dg-led-cond-row">
                  <span class="dg-led-indicator dg-led-on">●</span>
                  <span class="dg-led-cond-label">ON when</span>
                  <input class="dg-led-cond-input" :value="row.ledOnCondition ?? ''"
                    placeholder='e.g. v === "PRESENT" or v > 0'
                    @change="updateDgRowLedOnCondition(ridx, ($event.target as HTMLInputElement).value)" />
                </div>
                <!-- ON chips from range values -->
                <div v-if="(dgRowRanges[row.id] ?? row.ledRangeValues ?? []).length"
                     class="dg-led-chips">
                  <span class="dg-led-chips-hint">Quick-pick:</span>
                  <button v-for="val in (dgRowRanges[row.id] ?? row.ledRangeValues ?? [])"
                    :key="'on_'+val" type="button" class="dg-led-chip"
                    :class="{ active: row.ledOnCondition === dgChipExpr(val) }"
                    @click="chipInsertOn(ridx, val)">{{ val }}</button>
                </div>

                <!-- OFF condition -->
                <div class="dg-led-cond-row">
                  <span class="dg-led-indicator dg-led-off">●</span>
                  <span class="dg-led-cond-label">OFF when</span>
                  <input class="dg-led-cond-input" :value="row.ledOffCondition ?? ''"
                    placeholder='e.g. v === "ABSENT" or v === 0'
                    @change="updateDgRowLedOffCondition(ridx, ($event.target as HTMLInputElement).value)" />
                </div>
                <!-- OFF chips -->
                <div v-if="(dgRowRanges[row.id] ?? row.ledRangeValues ?? []).length"
                     class="dg-led-chips">
                  <span class="dg-led-chips-hint">Quick-pick:</span>
                  <button v-for="val in (dgRowRanges[row.id] ?? row.ledRangeValues ?? [])"
                    :key="'off_'+val" type="button" class="dg-led-chip"
                    :class="{ active: row.ledOffCondition === dgChipExpr(val) }"
                    @click="chipInsertOff(ridx, val)">{{ val }}</button>
                </div>

                <div class="dg-led-panel-hint">
                  Use <code>v</code> for the current value · unmatched → dim grey
                </div>
              </div>
            </div>
            <button type="button" class="dg-row-del-btn" title="Remove row" @click="removeDgRow(ridx)">×</button>
          </div>

          <!-- Add-row form -->
          <div class="dg-add-row-form">
            <span class="dg-add-form-hint">Add row</span>
            <input class="dg-new-label-input" v-model="dgNewLabel" placeholder="Label (static text)" />
            <button type="button" class="guided-mnem-trigger dg-topic-btn"
              :class="{ 'has-value': !!dgNewValueTopic, 'is-open': activeDgDrop === 'new_value' }"
              @click.stop="openDgDrop('new_value', $event.currentTarget as HTMLElement)">
              <span class="guided-mnem-trigger-label">{{ dgNewValueTopic || '— Value mnemonic * (required) —' }}</span>
              <span class="guided-mnem-trigger-chevron">{{ activeDgDrop === 'new_value' ? '▲' : '▼' }}</span>
            </button>
            <button type="button" class="guided-mnem-trigger dg-topic-btn dg-topic-opt"
              :class="{ 'has-value': !!dgNewLabelTopic, 'is-open': activeDgDrop === 'new_label' }"
              @click.stop="openDgDrop('new_label', $event.currentTarget as HTMLElement)">
              <span class="guided-mnem-trigger-label">{{ dgNewLabelTopic || '— Label mnemonic (optional) —' }}</span>
              <span class="guided-mnem-trigger-chevron">{{ activeDgDrop === 'new_label' ? '▲' : '▼' }}</span>
            </button>
            <button type="button" class="dg-add-btn" :disabled="!dgNewValueTopic.trim()" @click="addDgRow">
              + Add Row
            </button>
          </div>

          <!-- Shared DG mnemonic dropdown (teleported, one at a time) -->
          <Teleport to="body">
            <div v-if="activeDgDrop !== null" class="mnem-dropdown" :style="dgDropStyle"
              @mousedown.stop @click.stop>
              <div class="mnem-search-wrap">
                <input v-model="dgDropQuery" class="mnem-search dg-mnem-search"
                  placeholder="Search mnemonic…" autocomplete="off" @click.stop
                  @keydown.escape.stop="activeDgDrop = null"
                  @keydown.enter.stop="onDgDropEnter" />
                <button v-if="dgCurrentValue" type="button" class="mnem-clear-btn"
                  @click.stop="selectDgMnem('')" title="Clear">✕</button>
              </div>
              <ul class="mnem-list">
                <li v-for="opt in dgDropOptions" :key="opt" class="mnem-item"
                  :class="{ selected: dgCurrentValue === opt }"
                  @click.stop="selectDgMnem(opt)">
                  <span class="mnem-item-label">{{ opt }}</span>
                </li>
                <li v-if="dgDropOptions.length === 0" class="mnem-empty">No match</li>
                <li v-else-if="dgDropHasMore" class="mnem-hint">Showing first {{ MNEM_DROPDOWN_LIMIT }} matches. Type more to narrow.</li>
              </ul>
            </div>
          </Teleport>
          <div v-if="activeDgDrop !== null" class="mnem-overlay" style="z-index:10299"
            @mousedown="activeDgDrop = null"></div>

        </div>

        <!-- ── Simple tab: NON-GUIDED form (generic elements) ─────────────── -->
        <div v-if="!hasSimpleMode && !isDataGrid && activeTab === 'simple'" class="simple-form-area">

          <div class="simple-field">
            <span class="simple-field-label">Telemetry source</span>
            <select v-model="simpleSourceStreamId" class="simple-prop-select" title="NATS stream for this binding">
              <option v-for="s in telemetryStreams" :key="s.id" :value="s.id">{{ s.label }} ({{ s.id }})</option>
            </select>
          </div>

          <!-- Target property selector -->
          <div class="simple-field">
            <span class="simple-field-label">Target Property</span>
            <select v-model="simpleProp" class="simple-prop-select">
              <option v-for="p in simpleTargetProps" :key="p.value" :value="p.value">{{ p.label }}</option>
            </select>
          </div>
          <div v-if="isDeltaNumericProp" class="simple-field simple-inline-fields">
            <div class="simple-inline-field">
              <span class="simple-field-label">Numeric mode</span>
              <select v-model="simpleValueMode" class="simple-prop-select" title="Absolute sets target directly; Delta adds to element base value">
                <option value="absolute">Absolute value</option>
                <option value="delta">Delta from element base</option>
              </select>
            </div>
            <div class="simple-inline-field">
              <span class="simple-field-label">Animation duration (sec)</span>
              <input v-model.number="simpleAnimationDuration" type="number" min="0" step="0.1" class="simple-prop-select" />
            </div>
          </div>
          <p v-if="isDeltaNumericProp" class="simple-bool-hint">
            Delta mode adds telemetry value to the element base value and animates with GSAP.
          </p>
          <p v-if="isBooleanRuleProp" class="simple-bool-hint">
            Rule outputs below use a dropdown: stored as <code>true</code> or <code>false</code>.
            (The engine also treats <code>1</code> / <code>yes</code> as true if you use a transform.)
          </p>
          <p v-else-if="isFlowDirectionRuleProp" class="simple-bool-hint">
            Rule outputs: <code>1</code> = forward, <code>−1</code> = reverse — same as the edge inspector.
          </p>

          <!-- Quick color presets (when a color prop is selected) -->
          <div v-if="isColorProp" class="simple-field color-presets-field">
            <span class="simple-field-label">Quick Color Presets</span>
            <div class="color-presets-palette">
              <button v-for="c in SCADA_COLORS" :key="c.hex" class="color-preset-swatch"
                :style="{ background: c.hex }" :title="`${c.label}\n${c.hex}`" type="button"
                @click="addColorRule(c.hex)">
                <span class="swatch-hex">{{ c.hex }}</span>
              </button>
            </div>
            <div class="color-custom-row">
              <input type="color" v-model="customColorHex" class="color-native-picker" title="Pick any color" />
              <input type="text" v-model="customColorHex" class="color-hex-input" placeholder="#rrggbb" spellcheck="false" />
              <button type="button" class="color-add-btn" @click="addColorRule(customColorHex)">+ Add Rule</button>
            </div>
          </div>

          <!-- Subsystem single-select -->
          <div class="simple-field" v-click-outside="() => { simpleSingleSubOpen = false }">
            <span class="simple-field-label">Subsystem</span>
            <button ref="simpleSingleSubTrigger" class="ms-trigger" type="button"
              @click.stop="openSimpleSingleSub(simpleSingleSubTrigger as HTMLElement)">
              <span class="ms-trigger-label">{{ simpleSubsystem || 'Select subsystem…' }}</span>
              <span class="ms-chevron">{{ simpleSingleSubOpen ? '▲' : '▼' }}</span>
            </button>
            <Teleport to="body">
              <div v-if="simpleSingleSubOpen" class="ms-dropdown" :style="simpleSingleSubStyle" @click.stop @mousedown.stop>
                <div class="ms-search-wrap">
                  <input class="ms-search" v-model="simpleSingleSubQuery" placeholder="Search subsystem…" @click.stop />
                </div>
                <ul class="ms-list">
                  <li v-for="s in simpleSingleSubFiltered" :key="s" class="ms-item"
                    :class="{ selected: simpleSubsystem === s }" @click.stop="selectSimpleSubsystem(s)">{{ s }}</li>
                  <li v-if="simpleSingleSubFiltered.length === 0" class="ms-empty">No match</li>
                </ul>
              </div>
            </Teleport>
          </div>

          <!-- Mnemonic searchable dropdown -->
          <div class="simple-field">
            <span class="simple-field-label">Mnemonic <span class="simple-field-hint">(NATS TM key / mnemonic)</span></span>
            <button ref="simpleSingleMnemDropTrigger" class="guided-mnem-trigger"
              :class="{ 'has-value': !!simpleMnemonic, 'is-open': simpleSingleMnemDropOpen }"
              type="button" @click="openSimpleSingleMnemDrop(simpleSingleMnemDropTrigger as HTMLElement)">
              <span class="guided-mnem-trigger-label">{{ simpleMnemonic || '— Select mnemonic —' }}</span>
              <span class="guided-mnem-trigger-chevron">{{ simpleSingleMnemDropOpen ? '▲' : '▼' }}</span>
            </button>
            <Teleport to="body">
              <div v-if="simpleSingleMnemDropOpen" class="mnem-dropdown" :style="simpleSingleMnemDropStyle"
                @mousedown.stop @click.stop>
                <div class="mnem-search-wrap">
                  <input v-model="simpleSingleMnemDropQuery" class="mnem-search simple-mnem-search"
                    placeholder="Search mnemonic…" autocomplete="off" @click.stop
                    @keydown.escape.stop="simpleSingleMnemDropOpen = false" />
                  <button v-if="simpleMnemonic" type="button" class="mnem-clear-btn"
                    @click.stop="selectSimpleMnemonic('')" title="Clear">✕</button>
                </div>
                <ul class="mnem-list">
                  <li v-for="opt in simpleMnemOptions" :key="opt" class="mnem-item"
                    :class="{ selected: simpleMnemonic === opt }" @click.stop="selectSimpleMnemonic(opt)">
                    <span class="mnem-item-label">{{ opt }}</span>
                  </li>
                  <li v-if="simpleMnemOptions.length === 0" class="mnem-empty">No match</li>
                  <li v-else-if="simpleMnemHasMore" class="mnem-hint">Showing first {{ MNEM_DROPDOWN_LIMIT }} matches. Type more to narrow.</li>
                </ul>
              </div>
            </Teleport>
            <div v-if="simpleSingleMnemDropOpen" class="mnem-overlay" style="z-index:10299"
              @mousedown="simpleSingleMnemDropOpen = false"></div>
          </div>

          <!-- ⚡ Transform button + Monaco panel -->
          <div class="simple-field simple-field--transform">
            <span class="simple-field-label">Transform <span class="simple-field-hint">(optional — JS expression, v = raw value)</span></span>
            <button type="button" class="guided-transform-btn"
              :class="{ active: !!simpleTransform, open: showSimpleTransformPanel }"
              @click="showSimpleTransformPanel = !showSimpleTransformPanel"
              :title="simpleTransform ? 'Edit transform: ' + simpleTransform : 'Add optional transform'">
              <span class="guided-transform-icon">⚡</span>
              <span v-if="simpleTransform" class="guided-transform-preview">{{ simpleTransform }}</span>
              <span v-else class="guided-transform-none">click to add transform…</span>
            </button>
          </div>
          <div v-if="showSimpleTransformPanel" class="guided-transform-panel">
            <div class="guided-transform-panel-header">
              <span class="guided-transform-panel-title">⚡ Transform</span>
              <span class="guided-transform-panel-hint"><code>v</code> = raw value · return the transformed value</span>
              <button v-if="simpleTransform" class="guided-transform-panel-clear" type="button"
                @click="simpleTransform = ''; simpleTransformEditorInstance?.getModel()?.setValue('')"
                title="Remove transform">✕ Clear</button>
              <button class="guided-transform-panel-close" type="button"
                @click="showSimpleTransformPanel = false">✕</button>
            </div>
            <div class="guided-transform-snippets">
              <button v-for="snip in TRANSFORM_SNIPPETS" :key="snip.label" type="button"
                class="guided-transform-snip" :title="snip.insert"
                @click="simpleTransformEditorInstance?.getModel()?.setValue(snip.insert); simpleTransform = snip.insert">
                {{ snip.label }}
              </button>
            </div>
            <div :ref="el => { simpleTransformEditorEl = (el as HTMLElement) ?? null }"
              class="guided-transform-editor-area"></div>
          </div>

          <!-- Rules editor -->
          <div class="rules-section">
            <div class="rules-section-header">
              <span class="simple-field-label">Rules <span class="simple-field-hint">(condition → value, first match wins)</span></span>
              <span class="rules-hint"><code>value</code> = raw TM value</span>
            </div>
            <div v-if="booleanRulesSameOutputWarning" class="rules-warning" role="alert">
              <strong>Every rule has the same output.</strong> The property will not change when telemetry changes.
              <template v-if="simpleProp === 'flowActive'">
                For <strong>Flow Animation</strong>, use <em>Enable flow animation (true)</em> for ON and <em>Disable… (false)</em> for OFF.
              </template>
            </div>
            <div v-for="(rule, idx) in simpleRules" :key="idx" class="rule-row">
              <input v-model="rule.condition" class="rule-condition-input"
                placeholder='e.g. value < 2  or  value === "ON"' type="text" />
              <!-- Color prop: native picker + preset dots -->
              <template v-if="isColorProp">
                <span class="rule-color-swatch" :style="{ background: rule.value || '#cccccc' }"></span>
                <input type="color" v-model="rule.value" class="color-native-picker" title="Pick color" />
                <div class="color-presets-strip">
                  <button v-for="c in SCADA_COLORS" :key="c.hex" class="color-preset-dot"
                    :style="{ background: c.hex }" :title="`${c.label}\n${c.hex}`" type="button"
                    @click="rule.value = c.hex" />
                  <input type="color" :value="rule.value || '#27ae60'"
                    class="color-native-picker" title="Pick any color"
                    @input="rule.value = ($event.target as HTMLInputElement).value" />
                </div>
              </template>
              <template v-else-if="isBooleanRuleProp">
                <select v-model="rule.value" class="rule-value-input rule-select-output" title="Stored in diagram data">
                  <option v-for="opt in booleanRuleSelectOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </template>
              <template v-else-if="isFlowDirectionRuleProp">
                <select v-model="rule.value" class="rule-value-input rule-select-output" title="Stored in diagram data">
                  <option v-for="opt in FLOW_DIRECTION_RULE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </template>
              <template v-else>
                <input type="text" v-model="rule.value" class="rule-value-input" placeholder="output value" />
              </template>
              <button type="button" class="rule-delete-btn" @click="simpleRules.splice(idx, 1)" title="Remove rule">✕</button>
            </div>
            <button type="button" class="rule-add-btn"
              @click="simpleRules.push({ condition: '', value: newRuleDefaultValue() })">
              + Add Rule
            </button>
          </div>
        </div>

        <!-- ── Advanced tab ────────────────────────────────────────────────── -->
        <template v-if="activeTab === 'advanced'">

          <!-- Pre-transform collapsible section -->
          <div class="pretransform-section">
            <button class="pretransform-toggle" type="button" @click="togglePreTransform">
              <span class="pretransform-chevron">{{ showPreTransform ? '▼' : '▶' }}</span>
              <span class="pretransform-label">Pre-transform</span>
              <span class="pretransform-badge">optional</span>
              <span v-if="showPreTransform" class="pretransform-hint">
                <code>value</code> = raw TM value · <code>return</code> transformed value passed to main script
              </span>
            </button>
            <div v-show="showPreTransform" ref="preTransformEditorEl" class="pretransform-editor-area"></div>
          </div>

          <!-- Main Monaco editor -->
          <div ref="editorEl" class="tbe-editor-area"></div>
        </template>

        <!-- Footer -->
        <div class="tbe-footer">
          <span class="tbe-footer-hint" v-if="activeTab === 'simple' && isDataGrid">
            Pick a value mnemonic per row (required) · label mnemonic is optional · click <strong>Save</strong> to apply
          </span>
          <span class="tbe-footer-hint" v-else-if="activeTab === 'simple' && hasSimpleMode">
            Select a mnemonic or fixed chip per parameter · if telemetry states differ from the element, use <strong>Map telemetry → element states</strong> · <strong>Advanced</strong> shows the generated script
          </span>
          <span class="tbe-footer-hint" v-else-if="activeTab === 'simple'">
            Rules: first match wins · color = picker · boolean / flow = labeled dropdowns · else = free text
            <template v-if="props.isEdge"><br /><span class="tbe-footer-viewer-note">Live edge telemetry runs in <strong>Viewer</strong> with NATS connected — not in the diagram editor.</span></template>
          </span>
          <span class="tbe-footer-hint" v-else-if="activeTab === 'advanced' && showPreTransform">
            Pre-transform: <code>return</code> value · Script: <code>value</code> = pre-transformed · return <code>{ prop: val, … }</code>
            <template v-if="hasSimpleMode"> · Custom <code>return</code> is kept when reopening Advanced unless you change a guided Simple field.</template>
          </span>
          <span class="tbe-footer-hint" v-else-if="activeTab === 'advanced' && hasSimpleMode">
            Type <code>TM.</code> to browse mnemonics · return <code>{ prop: val, … }</code> · Custom <code>return</code> is kept when reopening Advanced unless you change Simple.
          </span>
          <span class="tbe-footer-hint" v-else-if="activeTab === 'advanced'">
            Type <code>TM.</code> to browse mnemonics · return <code>{ prop: val, … }</code>
          </span>
          <span class="tbe-footer-hint" v-else></span>
          <div class="tbe-footer-actions">
            <button class="btn-cancel" @click="close">Cancel</button>
            <button class="btn-save" @click="handleSave">
              {{ activeTab === 'bindings' ? '✔ Done' : '✔ Save' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from "vue";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import type { TelemetryBinding, DataGridRow } from "../types";
import { TARGET_PROPS, LINK_TARGET_PROPS, CATEGORY_TARGET_PROPS } from "../types";
import { buildDataGridBindings } from "../graph/dataGridUtils";
import { telemetryStreams, loadTelemetryStreamsFromStorage } from "../stores/telemetryStreamsConfig";
import {
  mnemonicCatalog, liveMnemonics, subsystems,
  loadMnemonicsForSubsystem, loadMnemonicRange, buildSuggestions,
  loadTcSubsystems, loadTcMnemonicsForSubsystem, loadTcMnemonicDisplayMap,
  resolveTelemetryKey, buildPidMnemonics, loadPidMnemonicsForSubsystem,
} from "../services/mnemonicStore";
import {
  GUIDED_PARAMS, generateGuidedScript, parseGuidedScript,
  suggestStateMap, telemetryStateSetDiffers,
  type GuidedParam, type ParamValue,
} from "../graph/guidedParams";

// ── v-click-outside directive ──────────────────────────────────────────────
const vClickOutside = {
  mounted(el: HTMLElement, binding: { value: () => void }) {
    (el as any).__vco__ = (e: MouseEvent) => { if (!el.contains(e.target as Node)) binding.value(); };
    document.addEventListener("mousedown", (el as any).__vco__);
  },
  unmounted(el: HTMLElement) { document.removeEventListener("mousedown", (el as any).__vco__); },
};

// ── Props & Emits ─────────────────────────────────────────────────────────
const props = defineProps<{
  visible: boolean;
  bindings: TelemetryBinding[];
  hoverMnemonics?: string[];
  telecommands?: string[];
  cellLabel?: string;
  /** When set, new bindings target this SVG sub-element id (SvgGraphic). */
  svgElementId?: string | null;
  category?: string;
  isEdge?: boolean;
  /** DataGrid rows — passed when category === "DataGrid" for the guided row editor. */
  dataGridRows?: DataGridRow[];
  /** CurrentSensor — colour conditions evaluated against currentValue. */
  currentColorRules?: Array<{ op: string; threshold: number | string; color: string }>;
  /** System / BandpassFilter / LowPassFilter — colour conditions for border colour. */
  borderColorRules?: Array<{ op: string; threshold: number | string; color: string }>;
}>();

const emit = defineEmits<{
  (e: "update:visible", v: boolean): void;
  (e: "update:bindings", v: TelemetryBinding[]): void;
  (e: "update:hoverMnemonics", v: string[]): void;
  (e: "update:telecommands", v: string[]): void;
  (e: "dataGridRowsUpdated", v: DataGridRow[]): void;
  (e: "update:currentColorRules", v: Array<{ op: string; threshold: number | string; color: string }>): void;
  (e: "update:borderColorRules", v: Array<{ op: string; threshold: number | string; color: string }>): void;
}>();

// ── CurrentSensor colour rules (Simple-tab section) ────────────────────────
type CSRule = { op: string; threshold: number | string; color: string };
const csRules = computed<CSRule[]>(() =>
  Array.isArray(props.currentColorRules) ? (props.currentColorRules as CSRule[]) : []
);
function csAddRule() {
  const palette = ["#27ae60", "#ff9800", "#e74c3c", "#9b59b6", "#3498db", "#f1c40f"];
  const next: CSRule = { op: ">", threshold: 0, color: palette[csRules.value.length % palette.length] };
  emit("update:currentColorRules", [...csRules.value, next]);
}
function csUpdateRule(i: number, key: keyof CSRule, value: any) {
  const next = csRules.value.map((r, idx) => {
    if (idx !== i) return r;
    if (key === "threshold") {
      const n = Number(value);
      // Keep as string if the input is non-numeric (e.g. "ON", "OFF")
      return { ...r, threshold: Number.isFinite(n) ? n : String(value) };
    }
    return { ...r, [key]: value };
  });
  emit("update:currentColorRules", next);
}
function csRemoveRule(i: number) {
  emit("update:currentColorRules", csRules.value.filter((_, idx) => idx !== i));
}

// ── Auto-prefill Colour Conditions from the Indicator mnemonic range ─────────
// When the user picks a mnemonic for the `state` param, we load its discrete
// range values and propose one colour-condition row per value. Both numeric
// and string states are supported (e.g. "1"/"0" AND "ON"/"OFF").
// Colours are heuristic:
//   ON-like values  → green  (#27ae60)
//   OFF-like values → grey   (#888888)
//   Other           → rotating palette

/** Nonce bump triggers a force-refresh even when the user has manually edited rules. */
const csAutoFillNonce = ref(0);

function buildCsRulesFromMnemonicRange(vals: string[]): CSRule[] {
  const PALETTE = ["#27ae60", "#888888", "#e74c3c", "#ff9800", "#3498db", "#9b59b6"];
  let pi = 0;
  const out: CSRule[] = [];
  for (const v of vals) {
    const trimmed = v.trim();
    if (trimmed === "") continue;
    const n = Number(trimmed);
    const isNumeric = Number.isFinite(n);
    // Store numeric threshold as number, string state as string
    const threshold: number | string = isNumeric ? n : trimmed;
    const suggested = colorForStateValue(trimmed);
    // colorForStateValue returns "" for off-like AND unknowns.
    // For off-like states (numeric 0 or OFF_STATE_RE match) use grey.
    // For truly unknown states fall back to the rotating palette.
    const isOffLike = (isNumeric && n === 0) || OFF_STATE_RE.test(trimmed);
    const color = suggested !== "" ? suggested : (isOffLike ? "#888888" : PALETTE[pi++ % PALETTE.length]);
    out.push({ op: "==", threshold, color });
  }
  return out;
}

/** Mnemonic currently bound to the Indicator's state param (or CurrentSensor's current param). */
const csSourceMnemonic = computed(() => {
  const cat = resolvedGuidedCategory.value;
  if (cat === "Indicator")     return paramValues.value["state"]?.mnemonic?.trim()   ?? "";
  if (cat === "CurrentSensor") return paramValues.value["current"]?.mnemonic?.trim() ?? "";
  return "";
});

// ── Border colour rules (System / BandpassFilter / LowPassFilter) ─────────
const BORDER_COLOR_CATEGORIES = new Set(["System", "BandpassFilter", "LowPassFilter"]);
const bcRules = computed<CSRule[]>(() =>
  Array.isArray(props.borderColorRules) ? (props.borderColorRules as CSRule[]) : []
);
function bcAddRule() {
  const palette = ["#27ae60", "#888888", "#e74c3c", "#ff9800", "#3498db", "#9b59b6"];
  const next: CSRule = { op: "==", threshold: "ON", color: palette[bcRules.value.length % palette.length] };
  emit("update:borderColorRules", [...bcRules.value, next]);
}
function bcUpdateRule(i: number, key: keyof CSRule, value: any) {
  const next = bcRules.value.map((r, idx) => {
    if (idx !== i) return r;
    if (key === "threshold") {
      const n = Number(value);
      return { ...r, threshold: Number.isFinite(n) ? n : String(value) };
    }
    return { ...r, [key]: value };
  });
  emit("update:borderColorRules", next);
}
function bcRemoveRule(i: number) {
  emit("update:borderColorRules", bcRules.value.filter((_, idx) => idx !== i));
}

/** Mnemonic currently bound to the borderColor param (for auto-fill). */
const bcSourceMnemonic = computed(() => {
  const cat = resolvedGuidedCategory.value;
  if (!cat || !BORDER_COLOR_CATEGORIES.has(cat)) return "";
  return paramValues.value["borderColor"]?.mnemonic?.trim() ?? "";
});

const bcAutoFillNonce = ref(0);

const _csMounted = ref(false);
onMounted(() => { _csMounted.value = true; });
onUnmounted(() => { _csMounted.value = false; });

/** Maps legacy SVG symbolId (lowercase, stripped of file prefix) → GUIDED_PARAMS category key. */
const LEGACY_SYMBOL_CATEGORY_MAP: Record<string, string> = {
  twta:        "TWTA",
  tankv2:      "Tank",
  sp2tv1_c:    "SP2TC",
  sp2tv1_r:    "SP2T",
  sp3tv1:      "Switch3P",
  wheel:       "MomentumWheel",
  thruster_c:  "Thruster",
  battery:     "Battery",
  gaugev1:     "Gauge",
  trswitch:    "TransferSwitch",
  dp3tv1:      "DP3T",
  dp_4_pos_v1: "DP4P",
};

const resolvedGuidedCategory = computed<string | null>(() => {
  if (!props.category) return null;
  // For legacy SVG components (SvgGraphic), try to resolve the guided category from the
  // symbolId passed via cellLabel (e.g. "scgSymbols.svg:TWTA" → "TWTA").
  if (props.category === "SvgGraphic") {
    const label = props.cellLabel ?? "";
    // Strip file/namespace prefix: "scgSymbols.svg:TWTA" → "TWTA"
    const compName = label.includes(":") ? label.split(":").pop()! : label;
    const guidedCat = LEGACY_SYMBOL_CATEGORY_MAP[compName.toLowerCase()];
    return guidedCat ?? null;
  }
  return props.category;
});

// ── Local bindings ─────────────────────────────────────────────────────────
const localBindings    = ref<TelemetryBinding[]>([]);
const editingBindingId = ref<string | null>(null);
/** When editing an existing binding, use its svgElementId (overrides props.svgElementId). */
const overrideSvgFromBinding = ref<string | null>(null);

const effectiveSvgElementId = computed(() =>
  overrideSvgFromBinding.value ?? props.svgElementId?.trim() ?? null,
);

watch(() => props.bindings, v => { localBindings.value = v.map(b => ({ ...b })); }, { immediate: true });
watch(() => props.visible, v => { if (v) overrideSvgFromBinding.value = null; });

const MNEM_DROPDOWN_LIMIT = 300;

function buildLimitedMnemonicOptions(
  options: string[],
  query: string,
  selected = "",
): { items: string[]; hasMore: boolean } {
  const q = query.trim().toLowerCase();
  const base = selected && !options.includes(selected) ? [selected, ...options] : options;

  if (!q) {
    if (base.length <= MNEM_DROPDOWN_LIMIT) return { items: base, hasMore: false };
    return { items: base.slice(0, MNEM_DROPDOWN_LIMIT), hasMore: true };
  }

  const out: string[] = [];
  let hasMore = false;
  for (const opt of base) {
    if (!opt.toLowerCase().includes(q)) continue;
    if (out.length < MNEM_DROPDOWN_LIMIT) out.push(opt);
    else {
      hasMore = true;
      break;
    }
  }
  return { items: out, hasMore };
}

// ── Hover Display mnemonics ────────────────────────────────────────────────
const localHoverMnemonics = ref<string[]>([]);
const newHoverMnem        = ref("");
const hoverSubsystem      = ref("");
const hoverSubMnemonics   = ref<string[]>([]);

// Hover subsystem dropdown state
const hoverSubOpen      = ref(false);
const hoverSubQuery     = ref("");
const hoverSubTriggerEl = ref<HTMLElement | null>(null);
const hoverSubStyle     = ref<Record<string, string>>({});

// Hover mnemonic dropdown state
const hoverMnemDropOpen    = ref(false);
const hoverMnemDropQuery   = ref("");
const hoverMnemDropStyle   = ref<Record<string, string>>({});
const hoverMnemTriggerEl   = ref<HTMLElement | null>(null);

watch(() => props.hoverMnemonics, v => { localHoverMnemonics.value = v ? [...v] : []; }, { immediate: true });

watch(hoverSubsystem, async sub => {
  hoverSubMnemonics.value = sub ? await loadPidMnemonicsForSubsystem(sub) : [];
  newHoverMnem.value = "";
});

const hoverMnemSuggestions = computed<string[]>(() =>
  hoverSubsystem.value
    ? hoverSubMnemonics.value
    : buildPidMnemonics()
);

const hoverSubFiltered = computed(() => {
  const q = hoverSubQuery.value.trim().toLowerCase();
  return q ? subsystems.value.filter(s => s.toLowerCase().includes(q)) : subsystems.value;
});

const hoverMnemDropOptions = computed<string[]>(() => {
  return hoverMnemDropResult.value.items;
});

const hoverMnemDropResult = computed(() =>
  buildLimitedMnemonicOptions(
    hoverMnemSuggestions.value,
    hoverMnemDropQuery.value,
    newHoverMnem.value,
  ),
);

const hoverMnemDropHasMore = computed(() => hoverMnemDropResult.value.hasMore);

function openHoverSub(el: HTMLElement) {
  hoverSubOpen.value = true; hoverSubQuery.value = "";
  const r = el.getBoundingClientRect();
  hoverSubStyle.value = { position:"fixed", top:`${r.bottom+4}px`, left:`${r.left}px`, minWidth:`${r.width}px`, zIndex:"10300" };
}

function openHoverMnemDrop(el: HTMLElement) {
  hoverMnemDropOpen.value = true; hoverMnemDropQuery.value = "";
  const r = el.getBoundingClientRect();
  hoverMnemDropStyle.value = { position:"fixed", top:`${r.bottom+4}px`, left:`${r.left}px`, width:`${r.width}px`, zIndex:"10300" };
  nextTick(() => (document.querySelector(".hover-mnem-search") as HTMLInputElement | null)?.focus());
}

function addHoverMnemFromInput() {
  const validMnem = newHoverMnem.value.trim();
  if (!validMnem || localHoverMnemonics.value.includes(validMnem)) return;
  // Store the pid_mnemonic format as-is; resolveTelemetryKey handles both formats during lookup
  localHoverMnemonics.value = [...localHoverMnemonics.value, validMnem];
  newHoverMnem.value = "";
  hoverMnemDropOpen.value = false;
}

function removeHoverMnemonic(idx: number) {
  localHoverMnemonics.value = localHoverMnemonics.value.filter((_, i) => i !== idx);
}

// ── Telecommands section ───────────────────────────────────────────────────
const localTelecommands  = ref<string[]>([]);
const tcSubsystems       = ref<string[]>([]);
const tcSubsystem        = ref("");
const tcMnemonics        = ref<string[]>([]);
const tcMnemonicsAll     = ref<string[]>([]);
const newTcMnem          = ref("");
const tcMnemonicDisplayMap = ref<Record<string, string>>({});
const tcSubsystemsLoaded = ref(false);

// TC subsystem dropdown state
const tcSubOpen      = ref(false);
const tcSubQuery     = ref("");
const tcSubTriggerEl = ref<HTMLElement | null>(null);
const tcSubStyle     = ref<Record<string, string>>({});

// TC mnemonic dropdown state
const tcMnemDropOpen    = ref(false);
const tcMnemDropQuery   = ref("");
const tcMnemDropStyle   = ref<Record<string, string>>({});
const tcMnemTriggerEl   = ref<HTMLElement | null>(null);

watch(() => props.telecommands, v => { localTelecommands.value = v ? [...v] : []; }, { immediate: true });

// Load TC data when editor opens
watch(() => props.visible, v => { if (v) ensureTcSubsystems(); });

// Load TC subsystems lazily when the binding tab is first shown
async function ensureTcSubsystems() {
  if (tcSubsystemsLoaded.value) return;
  tcSubsystemsLoaded.value = true;
  const [subs, all, displayMap] = await Promise.all([
    loadTcSubsystems(),
    loadTcMnemonicsForSubsystem(),
    loadTcMnemonicDisplayMap(),
  ]);
  tcSubsystems.value  = subs;
  tcMnemonicsAll.value = all;
  tcMnemonics.value   = all;
  tcMnemonicDisplayMap.value = displayMap;
}

watch(tcSubsystem, async sub => {
  tcMnemonics.value = sub ? await loadTcMnemonicsForSubsystem(sub) : tcMnemonicsAll.value;
  newTcMnem.value = "";
});

const tcSubFiltered = computed(() => {
  const q = tcSubQuery.value.trim().toLowerCase();
  return q ? tcSubsystems.value.filter(s => s.toLowerCase().includes(q)) : tcSubsystems.value;
});

const tcDisplayLabel = (raw: string): string => {
  const key = String(raw ?? "").trim();
  if (!key) return "";
  return tcMnemonicDisplayMap.value[key] ?? key;
};

const tcMnemDropOptions = computed<Array<{ value: string; label: string }>>(() => {
  return tcMnemDropResult.value.items;
});

const tcMnemDropResult = computed(() => {
  const q = tcMnemDropQuery.value.trim().toLowerCase();
  const selected = newTcMnem.value.trim();
  const baseRaw = selected && !tcMnemonics.value.includes(selected)
    ? [selected, ...tcMnemonics.value]
    : tcMnemonics.value;

  const base = baseRaw.map((value) => ({ value, label: tcDisplayLabel(value) }));

  if (!q) {
    if (base.length <= MNEM_DROPDOWN_LIMIT) return { items: base, hasMore: false };
    return { items: base.slice(0, MNEM_DROPDOWN_LIMIT), hasMore: true };
  }

  const out: Array<{ value: string; label: string }> = [];
  let hasMore = false;
  for (const opt of base) {
    const hay = `${opt.label} ${opt.value}`.toLowerCase();
    if (!hay.includes(q)) continue;
    if (out.length < MNEM_DROPDOWN_LIMIT) out.push(opt);
    else {
      hasMore = true;
      break;
    }
  }
  return { items: out, hasMore };
});

const tcMnemDropHasMore = computed(() => tcMnemDropResult.value.hasMore);

function openTcSub(el: HTMLElement) {
  tcSubOpen.value = true; tcSubQuery.value = "";
  const r = el.getBoundingClientRect();
  tcSubStyle.value = { position:"fixed", top:`${r.bottom+4}px`, left:`${r.left}px`, minWidth:`${r.width}px`, zIndex:"10300" };
}

function openTcMnemDrop(el: HTMLElement) {
  tcMnemDropOpen.value = true; tcMnemDropQuery.value = "";
  const r = el.getBoundingClientRect();
  tcMnemDropStyle.value = { position:"fixed", top:`${r.bottom+4}px`, left:`${r.left}px`, width:`${r.width}px`, zIndex:"10300" };
  nextTick(() => (document.querySelector(".tc-mnem-search") as HTMLInputElement | null)?.focus());
}

function addTcMnemFromInput() {
  const m = newTcMnem.value.trim();
  if (!m || localTelecommands.value.includes(m)) return;
  localTelecommands.value = [...localTelecommands.value, m];
  newTcMnem.value = "";
  tcMnemDropOpen.value = false;
}

function removeTelecommand(idx: number) {
  localTelecommands.value = localTelecommands.value.filter((_, i) => i !== idx);
}

// ── DataGrid guided state ─────────────────────────────────────────────────
const isDataGrid      = computed(() => props.category === "DataGrid");
const localDgRows     = ref<DataGridRow[]>([]);
const dgNewLabel      = ref("");
const dgNewValueTopic = ref("");
const dgNewLabelTopic = ref("");
/** Active dropdown key: "new_value" | "new_label" | "${rowId}_value" | "${rowId}_label" */
const activeDgDrop    = ref<string | null>(null);
const dgDropQuery     = ref("");
const dgDropStyle     = ref<Record<string, string>>({});

watch(() => props.dataGridRows, v => {
  if (isDataGrid.value) localDgRows.value = (v ?? []).map(r => ({ ...r }));
}, { immediate: true });

const dgDropOptions = computed<string[]>(() => {
  return dgDropResult.value.items;
});

const dgDropResult = computed(() =>
  buildLimitedMnemonicOptions(buildPidMnemonics(), dgDropQuery.value, dgCurrentValue.value),
);

const dgDropHasMore = computed(() => dgDropResult.value.hasMore);

/** Current value of the active dropdown field (for "selected" highlight and ✕ button). */
const dgCurrentValue = computed((): string => {
  const key = activeDgDrop.value;
  if (!key) return "";
  if (key === "new_value") return dgNewValueTopic.value;
  if (key === "new_label") return dgNewLabelTopic.value;
  const lastUs = key.lastIndexOf("_");
  const rowId  = key.slice(0, lastUs);
  const field  = key.slice(lastUs + 1);
  const row    = localDgRows.value.find(r => r.id === rowId);
  if (!row) return "";
  return field === "value" ? row.valueTopic : (row.labelTopic ?? "");
});

function openDgDrop(key: string, triggerEl: HTMLElement) {
  activeDgDrop.value = key;
  dgDropQuery.value  = "";
  const r = triggerEl.getBoundingClientRect();
  dgDropStyle.value  = {
    position: "fixed",
    top:      `${r.bottom + 4}px`,
    left:     `${r.left}px`,
    width:    `${r.width}px`,
    zIndex:   "10300",
  };
  nextTick(() => (document.querySelector(".dg-mnem-search") as HTMLInputElement | null)?.focus());
}

// ── LED condition helpers ─────────────────────────────────────────────────────

/** Positive / negative keyword sets for auto-suggesting LED conditions */
const LED_POSITIVE = new Set(["PRESENT","ON","TRUE","YES","OK","ACTIVE","LOCKED","ENABLED","NORMAL","VALID","GOOD","RUNNING","PASS"]);
const LED_NEGATIVE = new Set(["ABSENT","OFF","FALSE","NO","FAULT","FAIL","INACTIVE","UNLOCKED","DISABLED","INVALID","BAD","STOPPED","ERROR"]);

function suggestLedConditions(vals: string[]): { on: string; off: string } {
  if (!vals.length) return { on: "Number(v) !== 0", off: "Number(v) === 0" };
  const uppers = vals.map(v => v.toUpperCase());
  const posIdx = uppers.findIndex(u => LED_POSITIVE.has(u));
  const negIdx = uppers.findIndex(u => LED_NEGATIVE.has(u));
  if (posIdx !== -1) {
    const posQ = `v === "${vals[posIdx]}"`;
    const negQ = negIdx !== -1 ? `v === "${vals[negIdx]}"` : `v !== "${vals[posIdx]}"`;
    return { on: posQ, off: negQ };
  }
  if (vals.length === 2) return { on: `v === "${vals[0]}"`, off: `v === "${vals[1]}"` };
  // Numeric range
  const allNumeric = vals.every(v => !isNaN(Number(v)));
  if (allNumeric) return { on: "Number(v) !== 0", off: "Number(v) === 0" };
  return { on: `v === "${vals[0]}"`, off: "" };
}

/** Range values cache: row.id → string[] */
const dgRowRanges = ref<Record<string, string[]>>({});

async function fetchAndApplyLedDefaults(rowId: string, mnem: string) {
  if (!mnem) return;
  const resolved = resolveTelemetryKey(mnem);
  const sub = mnemonicCatalog.value.find(m => m.mnemonic === resolved)?.subsystem ?? "";
  const vals = sub ? await loadMnemonicRange(sub, mnem) : [];
  dgRowRanges.value = { ...dgRowRanges.value, [rowId]: vals };
  // Auto-fill conditions only if both are currently empty
  const row = localDgRows.value.find(r => r.id === rowId);
  if (!row) return;
  if (!row.ledOnCondition && !row.ledOffCondition && vals.length) {
    const { on, off } = suggestLedConditions(vals);
    localDgRows.value = localDgRows.value.map(r =>
      r.id !== rowId ? r : { ...r, ledOnCondition: on, ledOffCondition: off, ledRangeValues: vals }
    );
  } else {
    localDgRows.value = localDgRows.value.map(r =>
      r.id !== rowId ? r : { ...r, ledRangeValues: vals }
    );
  }
}

function updateDgRowLedOnCondition(idx: number, v: string) {
  localDgRows.value = localDgRows.value.map((r, i) => i === idx ? { ...r, ledOnCondition: v } : r);
}
function updateDgRowLedOffCondition(idx: number, v: string) {
  localDgRows.value = localDgRows.value.map((r, i) => i === idx ? { ...r, ledOffCondition: v } : r);
}

/** Insert `v === "VAL"` into the on/off condition for a row */
/** Returns the canonical chip expression for a given value — used both as a builder and for active-chip comparison in template */
function dgChipExpr(val: string): string {
  return `v === "${val}"`;
}
function chipInsertOn(idx: number, val: string) {
  updateDgRowLedOnCondition(idx, dgChipExpr(val));
}
function chipInsertOff(idx: number, val: string) {
  updateDgRowLedOffCondition(idx, dgChipExpr(val));
}

function selectDgMnem(mnem: string) {
  const key = activeDgDrop.value;
  if (key === null) return;
  if (key === "new_value") {
    dgNewValueTopic.value = mnem;
  } else if (key === "new_label") {
    dgNewLabelTopic.value = mnem;
  } else {
    const lastUs = key.lastIndexOf("_");
    const rowId  = key.slice(0, lastUs);
    const field  = key.slice(lastUs + 1);
    localDgRows.value = localDgRows.value.map(r =>
      r.id !== rowId ? r : {
        ...r,
        valueTopic: field === "value" ? mnem : r.valueTopic,
        labelTopic: field === "label" ? mnem : r.labelTopic,
      }
    );
    // When value mnemonic changes on a LED row, fetch range & auto-suggest conditions
    if (field === "value") {
      const row = localDgRows.value.find(r => r.id === rowId);
      if (row?.displayMode === "led") void fetchAndApplyLedDefaults(rowId, mnem);
    }
  }
  activeDgDrop.value = null;
}

function onDgDropEnter() {
  if (dgDropOptions.value.length > 0) selectDgMnem(dgDropOptions.value[0]);
}

function addDgRow() {
  const topic = dgNewValueTopic.value.trim();
  if (!topic) return;
  const id = Math.random().toString(36).slice(2, 9);
  localDgRows.value = [
    ...localDgRows.value,
    { id, label: dgNewLabel.value.trim() || topic, labelTopic: dgNewLabelTopic.value.trim(), valueTopic: topic, unit: "", displayMode: "text" },
  ];
  dgNewLabel.value      = "";
  dgNewValueTopic.value = "";
  dgNewLabelTopic.value = "";
}

function removeDgRow(idx: number) {
  localDgRows.value = localDgRows.value.filter((_, i) => i !== idx);
}

function updateDgRowLabel(idx: number, v: string) {
  localDgRows.value = localDgRows.value.map((r, i) => i === idx ? { ...r, label: v } : r);
}
function updateDgRowDecimals(idx: number, raw: string) {
  const trimmed = raw.trim();
  const decimals = trimmed === "" ? undefined : Math.max(0, Math.min(8, parseInt(trimmed, 10)));
  localDgRows.value = localDgRows.value.map((r, i) => i === idx ? { ...r, decimals } : r);
}
function updateDgRowDisplayMode(idx: number, mode: "text" | "led") {
  localDgRows.value = localDgRows.value.map((r, i) => i === idx ? { ...r, displayMode: mode } : r);
  // Switching to LED — fetch range immediately if mnemonic is already set
  if (mode === "led") {
    const row = localDgRows.value[idx];
    if (row?.valueTopic) void fetchAndApplyLedDefaults(row.id, row.valueTopic);
  }
}

// ── Tab state ─────────────────────────────────────────────────────────────
const activeTab = ref<"bindings" | "simple" | "advanced">("bindings");

// ── Guided mode ────────────────────────────────────────────────────────────
const guidedParams = computed<GuidedParam[] | null>(
  () => (resolvedGuidedCategory.value ? GUIDED_PARAMS.get(resolvedGuidedCategory.value) ?? null : null)
);
const hasSimpleMode = computed(() => guidedParams.value !== null || isDataGrid.value);
const paramValues   = ref<Record<string, ParamValue>>({});
/** After user edits guided Simple fields, Advanced must regenerate; if false, keep saved __multi__ script body. */
const simpleFormDirty = ref(false);
/** While initEditor assigns paramValues, do not mark Simple dirty */
let paramWatchSuspended = false;
const suggestions   = computed(() => buildSuggestions());

watch(
  () => paramValues.value,
  () => {
    if (paramWatchSuspended || !props.visible) return;
    simpleFormDirty.value = true;
  },
  { deep: true },
);

// ── Non-guided simple state ────────────────────────────────────────────────
const simpleProp      = ref("statusColor");
const simpleSubsystem = ref("");
const simpleMnemonic  = ref("");
const simpleValueMode = ref<"absolute" | "delta">("absolute");
const simpleAnimationDuration = ref<number>(1);
/** NATS logical stream id (matches Viewer NATS stream config) */
const simpleSourceStreamId = ref("default");

function normalizeSourceStreamId(streamId?: string): string {
  const raw = streamId?.trim();
  if (!raw) return "default";
  return telemetryStreams.value.some(s => s.id === raw) ? raw : "default";
}
const simpleTransform = ref("");
const showSimpleTransformPanel = ref(false);
const simpleTransformEditorEl  = ref<HTMLElement | null>(null);
let   simpleTransformEditorInstance: monaco.editor.IStandaloneCodeEditor | null = null;
const simpleRules = ref<{ condition: string; value: string }[]>([]);
const simpleMnemonicSelectionNonce = ref(0);

const simpleTargetProps = computed(() => {
  if (props.isEdge) return LINK_TARGET_PROPS;
  const cat = props.category;
  const allowed = cat ? CATEGORY_TARGET_PROPS[cat] : null;
  if (allowed) return TARGET_PROPS.filter(p => allowed.includes(p.value));
  // Default fallback: all geometric + common appearance props
  return TARGET_PROPS.filter(p =>
    ["x","y","width","height","angle","visible",
     "opacity","fill","stroke","strokeWidth",
     "statusColor","statusText","text","isInvalid"].includes(p.value)
  );
});

const isColorProp = computed(() =>
  ["statusColor","stroke","fill","background"].includes(simpleProp.value)
);

const isDeltaNumericProp = computed(() =>
  ["x", "y", "width", "height"].includes(simpleProp.value)
);

/** Same set as X6NatsTelemetry BOOLEAN_PROPS — rule row shows enable/disable dropdown */
const BOOLEAN_RULE_PROPS = new Set([
  "flowActive", "isCharging", "oxidizerEnabled", "fuelEnabled",
  "isInvalid", "isLocked", "alarm", "visible",
]);

const isBooleanRuleProp = computed(() => BOOLEAN_RULE_PROPS.has(simpleProp.value));
const isFlowDirectionRuleProp = computed(() => simpleProp.value === "flowDirection");

const FLOW_DIRECTION_RULE_OPTIONS = [
  { value: "1", label: "Forward → (stores 1)" },
  { value: "-1", label: "Reverse ← (stores −1)" },
] as const;

const booleanRuleSelectOptions = computed(() => {
  const p = simpleProp.value;
  if (p === "flowActive") {
    return [
      { value: "true", label: "Enable flow animation (true)" },
      { value: "false", label: "Disable flow animation (false)" },
    ];
  }
  if (p === "visible") {
    return [
      { value: "true", label: "Visible / show (true)" },
      { value: "false", label: "Hidden (false)" },
    ];
  }
  if (p === "isCharging") {
    return [
      { value: "true", label: "Charging animation on (true)" },
      { value: "false", label: "Charging animation off (false)" },
    ];
  }
  if (p === "isLocked") {
    return [
      { value: "true", label: "Locked (true)" },
      { value: "false", label: "Unlocked (false)" },
    ];
  }
  if (p === "isInvalid") {
    return [
      { value: "true", label: "Invalid / stale overlay (true)" },
      { value: "false", label: "Normal (false)" },
    ];
  }
  if (p === "alarm") {
    return [
      { value: "true", label: "Alarm on (true)" },
      { value: "false", label: "Alarm off (false)" },
    ];
  }
  return [
    { value: "true", label: "On / enabled (true)" },
    { value: "false", label: "Off / disabled (false)" },
  ];
});

function normalizeBooleanRuleOutput(v: string): string {
  const s = String(v ?? "").toLowerCase().trim();
  if (s === "true" || s === "1" || s === "yes") return "true";
  return "false";
}

function normalizeFlowDirectionRuleOutput(v: string): string {
  const n = Number(v);
  if (Number.isNaN(n)) return "1";
  return n < 0 ? "-1" : "1";
}

function newRuleDefaultValue(): string {
  if (isColorProp.value) return "#27ae60";
  if (isBooleanRuleProp.value) return "false";
  if (isFlowDirectionRuleProp.value) return "1";
  return "";
}

/** True when 2+ rules with conditions all map to the same output (common mistake for ON/OFF). */
const booleanRulesSameOutputWarning = computed(() => {
  if (!isBooleanRuleProp.value && !isFlowDirectionRuleProp.value) return false;
  const withCond = simpleRules.value.filter(r => r.condition.trim());
  if (withCond.length < 2) return false;
  const vals = withCond.map(r => String(r.value).trim());
  return vals.every(v => v === vals[0]);
});

// ── State → color heuristic ───────────────────────────────────────────────
const ON_STATE_RE  = /\b(on|active|activ|enabled|true|yes|running|bunched|warmup|operating|nominal|set|engaged|ok|normal|high|up|open|powered|rdy|ready|locked)\b/i;
const OFF_STATE_RE = /\b(off|inactive|inactiv|disabled|false|no|standby|idle|stby|unset|disengaged|fault|low|down|closed|unpowered|nrdy|nok|anomaly|error|fail)\b/i;

/**
 * For a given range state string, return the suggested default fill color:
 *  - ON-like  → green  (#27ae60)
 *  - OFF-like → ""     (keep the element's original SVG color)
 *  - Unknown  → ""     (let the user choose)
 */
function colorForStateValue(state: string): string {
  if (ON_STATE_RE.test(state))  return "#27ae60";
  if (OFF_STATE_RE.test(state)) return "";
  // Fallback: "1" / non-zero numeric → ON
  const n = Number(state);
  if (!isNaN(n) && n !== 0) return "#27ae60";
  if (!isNaN(n) && n === 0)  return "";
  return "";
}

function buildRulesFromRange(
  vals: string[],
  prop: string,
): { condition: string; value: string }[] {
  const isColor = ["statusColor","innerBorderColor","stroke","fill","background"].includes(prop);
  const isBool  = BOOLEAN_RULE_PROPS.has(prop);
  const isFD    = prop === "flowDirection";
  return vals.map(v => {
    const trimmed = v.trim();
    const num     = trimmed !== "" && !isNaN(Number(trimmed));
    const condition = num
      ? `Number(value) === ${Number(trimmed)}`
      : `value === "${trimmed}"`;
    let value = "";
    if (isColor)       value = colorForStateValue(trimmed);
    else if (isBool)   value = OFF_STATE_RE.test(trimmed) ? "false" : "true";
    else if (isFD)     value = "1";
    return { condition, value };
  });
}

// Auto-populate rules from range values when mnemonic changes.
// Subsystem is inferred from the catalog when not explicitly selected.
watch([simpleMnemonic, simpleSubsystem, simpleMnemonicSelectionNonce], async ([mnem, sub]) => {
  if (!mnem) { simpleRules.value = []; return; }

  // Resolve effective subsystem: explicit selection wins, otherwise look up from catalog
  let effectiveSub = sub?.trim() ?? "";
  if (!effectiveSub) {
    const canonical = resolveTelemetryKey(mnem);
    effectiveSub =
      mnemonicCatalog.value.find(m => m.mnemonic === canonical)?.subsystem?.trim() ?? "";
  }
  if (!effectiveSub) { simpleRules.value = []; return; }

  const vals = await loadMnemonicRange(effectiveSub, mnem);
  if (!vals.length) { simpleRules.value = []; return; }

  const forceRefresh = simpleMnemonicSelectionNonce.value > 0;

  // Only overwrite rules when they are empty or were auto-generated
  // (i.e. do not wipe rules the user has already customised by hand)
  const isAutoGenerated = simpleRules.value.every(r =>
    vals.some(v => {
      const num = v.trim() !== "" && !isNaN(Number(v));
      return r.condition === (num ? `Number(value) === ${Number(v)}` : `value === "${v.trim()}"`);
    })
  );
  if (forceRefresh || simpleRules.value.length === 0 || isAutoGenerated) {
    simpleRules.value = buildRulesFromRange(vals, simpleProp.value);
    if (forceRefresh) simpleMnemonicSelectionNonce.value = 0;
  }
});

watch(simpleProp, (p) => {
  if (!["x", "y", "width", "height"].includes(p)) {
    simpleValueMode.value = "absolute";
  }
  if (!simpleRules.value.length) return;
  if (BOOLEAN_RULE_PROPS.has(p)) {
    simpleRules.value = simpleRules.value.map(r => ({
      ...r,
      value: normalizeBooleanRuleOutput(r.value),
    }));
  } else if (p === "flowDirection") {
    simpleRules.value = simpleRules.value.map(r => ({
      ...r,
      value: normalizeFlowDirectionRuleOutput(r.value),
    }));
  } else if (["statusColor","innerBorderColor","stroke","fill","background"].includes(p)) {
    // Re-assign default colors when user switches to a color property.
    // Only touch rules whose value is empty or was set by a previous auto-run
    // (boolean "true"/"false" gives it away; genuine user color picks are kept).
    simpleRules.value = simpleRules.value.map(r => {
      const wasBool = r.value === "true" || r.value === "false";
      const isEmpty = r.value.trim() === "";
      if (!wasBool && !isEmpty) return r; // user-edited hex — keep it
      // Extract the state value from the condition for re-coloring
      const m = r.condition.match(/=== (?:"([^"]+)"|(\d+(?:\.\d+)?))/);
      const stateStr = m ? (m[1] ?? m[2] ?? "") : "";
      return { ...r, value: colorForStateValue(stateStr) };
    });
  }
});

// ── Single-select subsystem (non-guided) ──────────────────────────────────
const simpleSingleSubOpen    = ref(false);
const simpleSingleSubQuery   = ref("");
const simpleSingleSubTrigger = ref<HTMLElement | null>(null);
const simpleSingleSubStyle   = ref<Record<string, string>>({});
const simpleSingleMnemDropOpen    = ref(false);
const simpleSingleMnemDropQuery   = ref("");
const simpleSingleMnemDropStyle   = ref<Record<string, string>>({});
const simpleSingleMnemDropTrigger = ref<HTMLElement | null>(null);
const simpleSingleSubMnemonics    = ref<string[]>([]);

const simpleSingleSubFiltered = computed(() => {
  const q = simpleSingleSubQuery.value.trim().toLowerCase();
  return q ? subsystems.value.filter(s => s.toLowerCase().includes(q)) : subsystems.value;
});

const simpleMnemOptions = computed<string[]>(() => {
  return simpleMnemResult.value.items;
});

const simpleMnemResult = computed(() => {
  const opts = simpleSubsystem.value
    ? simpleSingleSubMnemonics.value
    : buildPidMnemonics();
  return buildLimitedMnemonicOptions(opts, simpleSingleMnemDropQuery.value, simpleMnemonic.value);
});

const simpleMnemHasMore = computed(() => simpleMnemResult.value.hasMore);

watch(simpleSubsystem, async sub => {
  simpleSingleSubMnemonics.value = [];
  if (sub) simpleSingleSubMnemonics.value = await loadPidMnemonicsForSubsystem(sub);
});

// ── Multi-select subsystem (guided) ───────────────────────────────────────
const simpleSubsystems   = ref<string[]>([]);
const simpleSubMnemonics = ref<string[]>([]);
const msOpen      = ref(false);
const msQuery     = ref("");
const msTriggerEl = ref<HTMLElement | null>(null);
const msDropdownStyle = ref<Record<string, string>>({});

const msFiltered = computed(() => {
  const q = msQuery.value.trim().toLowerCase();
  return q ? subsystems.value.filter(s => s.toLowerCase().includes(q)) : subsystems.value;
});

function toggleMsOpen() {
  if (!msOpen.value) {
    const rect = msTriggerEl.value?.getBoundingClientRect();
    if (rect) msDropdownStyle.value = { position:"fixed", top:`${rect.bottom+4}px`, left:`${rect.left}px`, minWidth:`${rect.width}px`, zIndex:"10200" };
    msQuery.value = "";
  }
  msOpen.value = !msOpen.value;
}

function toggleSubsystem(s: string) {
  const i = simpleSubsystems.value.indexOf(s);
  if (i === -1) simpleSubsystems.value = [...simpleSubsystems.value, s];
  else simpleSubsystems.value = simpleSubsystems.value.filter(x => x !== s);
}

watch(simpleSubsystems, async selected => {
  if (!selected.length) { simpleSubMnemonics.value = []; return; }
  const res = await Promise.all(selected.map(s => loadPidMnemonicsForSubsystem(s)));
  simpleSubMnemonics.value = Array.from(new Set(res.flat()));
});

const simpleSuggestions = computed<{ value: string; label: string }[]>(() => {
  if (simpleSubsystems.value.length > 0)
    return simpleSubMnemonics.value.map(m => ({ value: m, label: m }));
  return buildPidMnemonics().map(m => ({ value: m, label: m }));
});

// ── Guided param helpers ──────────────────────────────────────────────────
function selectFixed(key: string, v: string) {
  paramValues.value[key].fixed = v;
  paramValues.value[key].mnemonic = "";
  paramValues.value[key].na = false;
  paramValues.value[key].stateMap = undefined;
}
function selectNa(key: string) {
  if (paramValues.value[key].na) {
    // Toggle off — re-enable mnemonic selection
    paramValues.value[key].na = false;
  } else {
    paramValues.value[key].na = true;
    paramValues.value[key].fixed = "";
    paramValues.value[key].mnemonic = "";
    paramValues.value[key].stateMap = undefined;
  }
}

// ── Searchable mnemonic dropdown (guided) ─────────────────────────────────
const activeMnemDropdown = ref<string | null>(null);
const mnemDropdownQuery  = ref("");
const mnemDropdownStyle  = ref<Record<string, string>>({});

const mnemDropdownOptions = computed<string[]>(() => {
  return mnemDropdownResult.value.items;
});

const mnemDropdownResult = computed(() => {
  const key = activeMnemDropdown.value;
  if (!key) return { items: [], hasMore: false };
  return buildLimitedMnemonicOptions(
    simpleSuggestions.value.map(s => s.value),
    mnemDropdownQuery.value,
    paramValues.value[key]?.mnemonic ?? "",
  );
});

const mnemDropdownHasMore = computed(() => mnemDropdownResult.value.hasMore);

function openMnemDropdown(key: string, triggerEl: HTMLElement) {
  activeMnemDropdown.value = key; mnemDropdownQuery.value = "";
  const rect = triggerEl.getBoundingClientRect();
  mnemDropdownStyle.value = { position:"fixed", top:`${rect.bottom+4}px`, left:`${rect.left}px`, width:`${rect.width}px`, zIndex:"10200" };
  nextTick(() => (document.querySelector(".mnem-search") as HTMLInputElement | null)?.focus());
}
function closeMnemDropdown() { activeMnemDropdown.value = null; }
function selectMnemonic(key: string, value: string) {
  // Store pid_mnemonic format directly; resolveTelemetryKey will handle it during lookup
  paramValues.value[key].mnemonic = value;
  paramValues.value[key].fixed = "";
  paramValues.value[key].na = false;
  paramValues.value[key].stateMap = undefined;
  closeMnemDropdown();
}

/** Subsystem used for /range when loading discrete telemetry labels. */
function subsystemForGuidedMnemonic(pidMnem: string): string | undefined {
  if (simpleSubsystems.value.length === 1) return simpleSubsystems.value[0];

  const raw = String(pidMnem ?? "").trim();
  if (!raw) return simpleSubsystems.value[0] || subsystems.value[0];

  // Try multiple candidates because telemetry keys can be plain mnemonic,
  // ParamId, or ParamId_mnemonic.
  const candidates = new Set<string>();
  candidates.add(raw);

  const canonical = resolveTelemetryKey(raw);
  if (canonical) candidates.add(canonical);

  const us = raw.indexOf("_");
  if (us > 0) {
    const rest = raw.slice(us + 1).trim();
    if (rest) candidates.add(rest);
  }

  const lc = new Set(Array.from(candidates).map(s => s.toLowerCase()));
  const fromCat = mnemonicCatalog.value.find(m => lc.has(String(m.mnemonic ?? "").toLowerCase()))?.subsystem;
  if (fromCat) return fromCat;

  if (simpleSubsystems.value.length > 0) return simpleSubsystems.value[0];
  return subsystems.value[0];
}

const guidedParamActualRanges = ref<Record<string, string[]>>({});

watch(
  () => ({
    vis: props.visible,
    cat: resolvedGuidedCategory.value,
    subs: simpleSubsystems.value.slice(),
    pv: JSON.stringify(
      Object.fromEntries(
        Object.entries(paramValues.value).map(([k, v]) => [k, { m: v.mnemonic, na: v.na }]),
      ),
    ),
  }),
  async () => {
    if (!props.visible || !hasSimpleMode.value) {
      guidedParamActualRanges.value = {};
      return;
    }
    const gp = guidedParams.value;
    if (!gp?.length) return;
    const next: Record<string, string[]> = {};
    for (const p of gp) {
      // Fetch range for params that either have fixedValues OR explicitly request it (fetchRange: true)
      const needsRange = (p.fixedValues && p.fixedValues.length >= 2) || p.fetchRange;
      if (!needsRange) continue;
      const row = paramValues.value[p.key];
      if (!row?.mnemonic?.trim() || row.na) {
        next[p.key] = [];
        continue;
      }
      const sub = subsystemForGuidedMnemonic(row.mnemonic.trim());
      if (!sub) {
        next[p.key] = [];
        continue;
      }
      next[p.key] = await loadMnemonicRange(sub, row.mnemonic.trim());
      // ── Auto-suggest state map when it is empty ──────────────────────────
      // Only fires once after a mnemonic is first picked; manual edits are preserved.
      if (p.fixedValues?.length && next[p.key].length) {
        const pRow = paramValues.value[p.key];
        const alreadyMapped = pRow?.stateMap && Object.keys(pRow.stateMap).length > 0;
        if (pRow && !alreadyMapped && !pRow.na) {
          const suggested = suggestStateMap(p.fixedValues, next[p.key]);
          if (Object.keys(suggested).length > 0) {
            pRow.stateMap = suggested;
          }
        }
      }
    }
    guidedParamActualRanges.value = next;
  },
  { deep: true },
);

// ── Auto-prefill colour conditions when Indicator/CurrentSensor mnemonic range loads ──
// Must be declared AFTER guidedParamActualRanges (watching it in the source getter
// causes Vue to run effect.run() synchronously during watch() setup; accessing the ref
// before its declaration would throw a ReferenceError and break component setup).
watch(
  () => ({
    cat:   resolvedGuidedCategory.value,
    range: guidedParamActualRanges.value[
             resolvedGuidedCategory.value === "CurrentSensor" ? "current" : "state"
           ],
    nonce: csAutoFillNonce.value,
  }),
  ({ cat, range, nonce }) => {
    if (!_csMounted.value) return;
    if (cat !== "Indicator" && cat !== "CurrentSensor") return;
    const vals = range ?? [];
    // Proceed for any non-empty discrete values — numeric ("0","1") OR string ("ON","OFF").
    // CurrentSensor only ever has numeric states; Indicator can have either.
    const hasVals = vals.some(v => v.trim() !== "");
    if (!hasVals) return;

    const forceRefresh = nonce > 0;

    // Auto-fill only when:
    //   (a) the user explicitly clicked "Auto-suggest" (forceRefresh), OR
    //   (b) there are no conditions yet (first time a mnemonic is selected).
    // We deliberately do NOT auto-overwrite when rules exist so that user-set
    // colours are never silently reset on reopen or mnemonic change.
    const rulesEmpty = csRules.value.length === 0;

    if (forceRefresh || rulesEmpty) {
      nextTick(() => {
        if (!_csMounted.value) return;
        emit("update:currentColorRules", buildCsRulesFromMnemonicRange(vals));
        if (forceRefresh) csAutoFillNonce.value = 0;
      });
    }
  },
  { deep: true },
);

// ── Auto-prefill border colour conditions when borderColor mnemonic range loads ──
watch(
  () => ({
    cat:   resolvedGuidedCategory.value,
    range: guidedParamActualRanges.value["borderColor"],
    nonce: bcAutoFillNonce.value,
  }),
  ({ cat, range, nonce }) => {
    if (!_csMounted.value) return;
    if (!cat || !BORDER_COLOR_CATEGORIES.has(cat)) return;
    if (!bcSourceMnemonic.value) return;
    const vals = range ?? [];
    const hasVals = vals.some((v: string) => v.trim() !== "");
    if (!hasVals) return;
    const forceRefresh = nonce > 0;
    const rulesEmpty = bcRules.value.length === 0;
    if (forceRefresh || rulesEmpty) {
      nextTick(() => {
        if (!_csMounted.value) return;
        emit("update:borderColorRules", buildCsRulesFromMnemonicRange(vals));
        if (forceRefresh) bcAutoFillNonce.value = 0;
      });
    }
  },
  { deep: true },
);

function guidedActualStatesForParam(param: GuidedParam): string[] {
  const fromR = guidedParamActualRanges.value[param.key] ?? [];
  const sm = paramValues.value[param.key]?.stateMap;
  const fromM = sm ? Object.keys(sm) : [];
  // Robot power state: prefer backend range states for the selected mnemonic.
  // Only fall back when range metadata is unavailable.
  if (resolvedGuidedCategory.value === "Robot" && param.key === "powerState") {
    if (fromR.length) return Array.from(new Set(fromR)).sort();
    if (fromM.length) return Array.from(new Set(fromM)).sort();
    return ["OFF", "ON"];
  }
  // Robot fixed-state controls should prefer backend range states from the selected mnemonic.
  // Do not force ON/OFF here; only use existing manual map rows when range is unavailable.
  if (resolvedGuidedCategory.value === "Robot" && param.fixedValues?.length) {
    if (fromR.length) return Array.from(new Set(fromR)).sort();
    return Array.from(new Set(fromM)).sort();
  }
  return Array.from(new Set([...fromR, ...fromM])).sort();
}

function shouldShowGuidedParam(param: GuidedParam): boolean {
  // Robot ON/OFF accent colors are now configured via the state-mapping color editor,
  // so hide the dedicated parameter rows to keep guided UI concise.
  if (resolvedGuidedCategory.value === "Robot" && (param.key === "onColor" || param.key === "offColor")) {
    return false;
  }
  return true;
}

function showGuidedStateMapping(param: GuidedParam): boolean {
  if (!param.fixedValues || param.fixedValues.length < 2) return false;
  const row = paramValues.value[param.key];
  if (!row || row.na || row.customExpr || !row.mnemonic?.trim()) return false;

  // Indicator uses Colour Conditions (csRules) for value→colour mapping — no state map needed.
  if (resolvedGuidedCategory.value === "Indicator") return false;

  // Robot power-state mapping + color editor should appear as soon as a mnemonic is selected.
  if (resolvedGuidedCategory.value === "Robot" && param.key === "powerState") return true;

  const actual = guidedParamActualRanges.value[param.key] ?? [];
  const expected = param.fixedValues;
  const hasMap = row.stateMap && Object.keys(row.stateMap).length > 0;
  if (hasMap) return true;
  return telemetryStateSetDiffers(expected, actual);
}

function onGuidedStateMapChange(key: string, raw: string, canonical: string) {
  const row = paramValues.value[key];
  if (!row) return;
  if (!canonical) {
    if (row.stateMap) {
      const next = { ...row.stateMap };
      delete next[raw];
      row.stateMap = Object.keys(next).length ? next : undefined;
    }
    return;
  }
  row.stateMap = { ...(row.stateMap ?? {}), [raw]: canonical };
}

function showGuidedStateColorEditor(param: GuidedParam): boolean {
  return resolvedGuidedCategory.value === "Robot" && param.key === "powerState";
}

function isOnLikeState(s: string): boolean {
  const v = String(s ?? "").trim();
  if (!v) return false;
  if (ON_STATE_RE.test(v)) return true;
  if (OFF_STATE_RE.test(v)) return false;
  const n = Number(v);
  if (!Number.isNaN(n)) return n !== 0;
  return false;
}

function canonicalForRawPowerState(raw: string): "ON" | "OFF" {
  const explicit = paramValues.value.powerState?.stateMap?.[raw];
  if (explicit === "ON" || explicit === "OFF") return explicit;
  return isOnLikeState(raw) ? "ON" : "OFF";
}

function ensureRobotColorParamRow(key: "onColor" | "offColor"): ParamValue {
  if (!paramValues.value[key]) {
    paramValues.value[key] = { mnemonic: "", fixed: "", na: false, transform: "" };
  }
  return paramValues.value[key];
}

function guidedStateColorForRaw(raw: string): string {
  const canonical = canonicalForRawPowerState(raw);
  const row = canonical === "ON"
    ? ensureRobotColorParamRow("onColor")
    : ensureRobotColorParamRow("offColor");
  const fallback = canonical === "ON" ? "#4a9eff" : "#5b6b7a";
  const c = String(row.fixed ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c : fallback;
}

function onGuidedStateColorChange(raw: string, color: string) {
  const canonical = canonicalForRawPowerState(raw);
  const row = canonical === "ON"
    ? ensureRobotColorParamRow("onColor")
    : ensureRobotColorParamRow("offColor");
  row.fixed = color;
  row.mnemonic = "";
  row.na = false;
}

function clearGuidedStateMap(key: string) {
  const row = paramValues.value[key];
  if (row) row.stateMap = undefined;
}

watch(
  () => [guidedParamActualRanges.value, props.visible, resolvedGuidedCategory.value] as const,
  () => {
    if (!props.visible || !hasSimpleMode.value || !guidedParams.value) return;
    for (const p of guidedParams.value) {
      if (!p.fixedValues || p.fixedValues.length < 2) continue;
      const row = paramValues.value[p.key];
      if (!row?.mnemonic?.trim() || row.na || row.customExpr) continue;
      if (row.stateMap && Object.keys(row.stateMap).length > 0) continue;

      if (resolvedGuidedCategory.value === "Robot" && p.key === "powerState") {
        const actual = guidedActualStatesForParam(p);
        if (actual.length) {
          const sm: Record<string, string> = {};
          for (const raw of actual) sm[raw] = canonicalForRawPowerState(raw);
          row.stateMap = sm;
        }
        continue;
      }

      const actual = guidedParamActualRanges.value[p.key] ?? [];
      const expected = p.fixedValues;

      if (resolvedGuidedCategory.value === "Robot") {
        if (!actual.length) continue;
        if (!telemetryStateSetDiffers(expected, actual)) continue;
        const onTarget = expected[0];
        const offTarget = expected[1] ?? expected[0];
        const sm: Record<string, string> = {};
        for (const raw of actual) sm[raw] = isOnLikeState(raw) ? onTarget : offTarget;
        row.stateMap = sm;
        continue;
      }

      if (!telemetryStateSetDiffers(expected, actual)) continue;
      const sug = suggestStateMap(expected, actual);
      if (Object.keys(sug).length) row.stateMap = sug;
    }
  },
  { deep: true },
);
function isCrossSubsystem(mnem: string) {
  if (!simpleSubsystems.value.length) return false;
  return !simpleSubMnemonics.value.includes(mnem);
}

// ── Per-param transform (guided) ──────────────────────────────────────────
const TRANSFORM_SNIPPETS = [
  { label: "Number(v)",         insert: "Number(v)" },
  { label: "parseFloat(v)",     insert: "parseFloat(v)" },
  { label: "parseInt(v)",       insert: "parseInt(v, 10)" },
  { label: "Math.round(v)",     insert: "Math.round(Number(v))" },
  { label: "toFixed(1)",        insert: "+Number(v).toFixed(1)" },
  { label: "v.trim()",          insert: "v.trim()" },
  { label: "v.toUpperCase()",   insert: "v.toUpperCase()" },
  { label: "v.toLowerCase()",   insert: "v.toLowerCase()" },
  { label: "v === '1'",         insert: 'v === "1"' },
  { label: "Boolean(Number(v))",insert: "Boolean(Number(v))" },
];

const activeTransformKey = ref<string | null>(null);
const transformEditorEl  = ref<HTMLElement | null>(null);
let   transformEditorInstance: monaco.editor.IStandaloneCodeEditor | null = null;

watch(transformEditorEl, el => {
  if (el && !transformEditorInstance) {
    const uri = monaco.Uri.parse("inmemory://scada-param-transform/script.js");
    let model = monaco.editor.getModel(uri);
    const content = (activeTransformKey.value && paramValues.value[activeTransformKey.value]?.transform?.trim()) || "v";
    if (model) model.setValue(content); else model = monaco.editor.createModel(content, "javascript", uri);
    transformEditorInstance = monaco.editor.create(el, {
      model, theme:"vs", automaticLayout:true, minimap:{enabled:false}, fontSize:13, lineNumbers:"off",
      scrollBeyondLastLine:false, wordWrap:"on", folding:false, renderLineHighlight:"none",
      suggest:{showWords:false}, quickSuggestions:{other:true,comments:false,strings:true},
      parameterHints:{enabled:false}, overviewRulerLanes:0,
    });
    transformEditorInstance.onDidChangeModelContent(() => {
      const k = activeTransformKey.value;
      if (k && paramValues.value[k]) paramValues.value[k].transform = transformEditorInstance!.getValue();
    });
    transformEditorInstance.focus();
  } else if (!el) { disposeTransformEditor(); }
});

watch(simpleTransformEditorEl, el => {
  if (el && !simpleTransformEditorInstance) {
    const uri = monaco.Uri.parse("inmemory://scada-simple-transform/script.js");
    let model = monaco.editor.getModel(uri);
    const content = simpleTransform.value.trim() || "v";
    if (model) model.setValue(content); else model = monaco.editor.createModel(content, "javascript", uri);
    simpleTransformEditorInstance = monaco.editor.create(el, {
      model, theme:"vs", automaticLayout:true, minimap:{enabled:false}, fontSize:13, lineNumbers:"off",
      scrollBeyondLastLine:false, wordWrap:"on", folding:false, renderLineHighlight:"none",
      suggest:{showWords:false}, quickSuggestions:{other:true,comments:false,strings:true},
      parameterHints:{enabled:false}, overviewRulerLanes:0,
    });
    simpleTransformEditorInstance.onDidChangeModelContent(() => {
      simpleTransform.value = simpleTransformEditorInstance!.getValue();
    });
    simpleTransformEditorInstance.focus();
  } else if (!el && simpleTransformEditorInstance) {
    simpleTransformEditorInstance.dispose(); simpleTransformEditorInstance = null;
  }
});

function disposeTransformEditor() {
  transformEditorInstance?.dispose(); transformEditorInstance = null;
  monaco.editor.getModel(monaco.Uri.parse("inmemory://scada-param-transform/script.js"))?.dispose();
}
function toggleTransformPanel(key: string) {
  activeTransformKey.value === key ? closeTransformPanel() : (activeTransformKey.value = key);
}
function closeTransformPanel() { activeTransformKey.value = null; }
function insertTransformSnippet(key: string, snippet: string) {
  paramValues.value[key].transform = snippet;
  transformEditorInstance?.getModel()?.setValue(snippet);
  transformEditorInstance?.focus();
}
function clearTransform(key: string) { paramValues.value[key].transform = ""; closeTransformPanel(); }

// ── SCADA colors ──────────────────────────────────────────────────────────
const SCADA_COLORS = [
  // ── Status semantics ─────────────────────────────────────────────────────
  { hex:"#27ae60", label:"Green — OK / Active"       },
  { hex:"#4caf50", label:"Lime Green — Nominal"      },
  { hex:"#00e676", label:"Bright Green — Healthy"    },
  { hex:"#e74c3c", label:"Red — Fault"               },
  { hex:"#ff1744", label:"Bright Red — Alarm"        },
  { hex:"#c0392b", label:"Dark Red — Critical"       },
  { hex:"#ff9800", label:"Orange — Warning"          },
  { hex:"#f39c12", label:"Amber — Caution"           },
  { hex:"#ffeb3b", label:"Yellow — Degraded"         },
  { hex:"#fdd835", label:"Gold — Standby"            },
  // ── Blues / Cyans ─────────────────────────────────────────────────────────
  { hex:"#3498db", label:"Blue — Nominal"            },
  { hex:"#2196f3", label:"Material Blue"             },
  { hex:"#1565c0", label:"Dark Blue"                 },
  { hex:"#00e5ff", label:"Cyan — Stroke / Live"      },
  { hex:"#00bcd4", label:"Teal Cyan"                 },
  { hex:"#26c6da", label:"Aqua"                      },
  // ── Purples / Pinks ───────────────────────────────────────────────────────
  { hex:"#9b59b6", label:"Purple"                    },
  { hex:"#8e24aa", label:"Dark Purple"               },
  { hex:"#e91e63", label:"Pink"                      },
  { hex:"#f06292", label:"Light Pink"                },
  // ── Greys / Neutrals ──────────────────────────────────────────────────────
  { hex:"#ecf0f1", label:"Light Grey — Idle"         },
  { hex:"#95a5a6", label:"Mid Grey"                  },
  { hex:"#607d8b", label:"Blue Grey — Inactive"      },
  { hex:"#2c3e50", label:"Dark Navy — Off/disabled"  },
  { hex:"#111827", label:"Near Black — Background"   },
  { hex:"#ffffff", label:"White"                     },
];

const customColorHex = ref("#27ae60");

function addColorRule(hex: string) {
  simpleRules.value.push({ condition: "", value: hex });
}

// ── Monaco main editor + pre-transform ────────────────────────────────────
const editorEl  = ref<HTMLElement | null>(null);
const preTransformEditorEl = ref<HTMLElement | null>(null);
let   editorInstance: monaco.editor.IStandaloneCodeEditor | null = null;
let   preTransformEditorInstance: monaco.editor.IStandaloneCodeEditor | null = null;
const showPreTransform = ref(false);
let   currentPreTransform = "";

// Watch editorEl — mounts/remounts when Advanced tab is shown
watch(editorEl, el => {
  if (el && !editorInstance) mountMainEditor(el);
  else if (!el && editorInstance) { editorInstance.dispose(); editorInstance = null; }
});

watch(preTransformEditorEl, el => {
  if (el && !preTransformEditorInstance) mountPreTransformEditor(el);
  else if (!el && preTransformEditorInstance) { preTransformEditorInstance.dispose(); preTransformEditorInstance = null; }
});

// Module-level context for completion provider
let _category = "";
const _subMnemCache       = new Map<string, string[]>();
const _mnemonicRangeCache = new Map<string, string[]>();
const _mnemSubsystemMap   = new Map<string, string>();

const PROP_META: Record<string, { type: string; desc: string; example: string }> = {
  // ── Geometric ──────────────────────────────────────────────────────────
  x:              { type:"number (px)",         desc:"Node X position on canvas",             example:"200"       },
  y:              { type:"number (px)",         desc:"Node Y position on canvas",             example:"150"       },
  width:          { type:"number (px)",         desc:"Node width",                            example:"120"       },
  height:         { type:"number (px)",         desc:"Node height",                           example:"80"        },
  angle:          { type:"number (°)",          desc:"Rotation angle in degrees",             example:"45"        },
  visible:        { type:"boolean",             desc:"Show or hide the element",              example:"true"      },
  // ── Appearance ────────────────────────────────────────────────────────
  opacity:        { type:"number 0–1",          desc:"Element opacity",                       example:"0.5"       },
  fill:           { type:"CSS color",           desc:"Background fill color",                 example:'"#22223a"' },
  stroke:         { type:"CSS color",           desc:"Border / stroke color",                 example:'"#ff1744"' },
  strokeWidth:    { type:"number",              desc:"Border width in pixels",                example:"2"         },
  statusColor:    { type:"CSS color",           desc:"Body fill / status color",              example:'"#27ae60"' },
  innerBorderColor: { type:"CSS color",        desc:"FPGA chip inner outline (die border)", example:'"#00e5ff"' },
  isLocked:       { type:"boolean",             desc:"FPGA locked — inner outline green; unlocked orange", example:"true" },
  statusText:     { type:"string",              desc:"Overlay text label",                    example:'"ON"'      },
  isInvalid:      { type:"boolean",             desc:"Show invalid/stale overlay",            example:"false"     },
  // ── Sensor values ─────────────────────────────────────────────────────
  level:          { type:"number 0–100",        desc:"Tank / Gauge fill level %",             example:"75"        },
  temperature:    { type:"number",              desc:"Temperature in °C",                     example:"47.3"      },
  gaugeValue:     { type:"number",              desc:"Gauge display value",                   example:"42.5"      },
  gaugeMin:       { type:"number",              desc:"Gauge minimum scale value",             example:"0"         },
  gaugeMax:       { type:"number",              desc:"Gauge maximum scale value",             example:"100"       },
  // ── Switch ────────────────────────────────────────────────────────────
  position:       { type:"number 0/1/2/3",     desc:"Switch routing position index",         example:"1"         },
  // ── Wheel ─────────────────────────────────────────────────────────────
  wheelSpeed:     { type:"number RPM",          desc:"Momentum wheel speed",                  example:"3000"      },
  wheelDirection: { type:"1 | -1",             desc:"Wheel direction: 1=CW −1=CCW",          example:"1"         },
  // ── Battery ───────────────────────────────────────────────────────────
  chargeLevel:    { type:"number 0–100",        desc:"Battery charge percentage",             example:"82"        },
  isCharging:     { type:"boolean",             desc:"Battery charging animation",            example:"true"      },
  // ── Thruster ──────────────────────────────────────────────────────────
  thrustLevel:    { type:"number 0/1",          desc:"Thruster firing state",                 example:"1"         },
  // ── Edge / flow ───────────────────────────────────────────────────────
  labelText:      { type:"string",              desc:"Text label on the edge (mid-path)",    example:'"RF-1"'    },
  sourceMarker:   { type:"marker id",           desc:"Start arrow: none, classic, block, …", example:'"none"'   },
  targetMarker:   { type:"marker id",           desc:"End arrow: classic, block, ellipse, …", example:'"classic"' },
  flowActive:     { type:"boolean",             desc:"Enable dashed-line flow animation. Coercion: ON = true, or string \"true\"/\"1\"/\"yes\" (any case), or number 1. OFF = anything else (false, 0, \"0\", \"no\", \"off\", empty).", example:"true or 1" },
  flowDirection:  { type:"number ≥0 | <0",    desc:"Animation direction after Number(): forward if ≥0 (use 1), reverse if negative (use −1). Zero counts as forward.", example:"1 or -1" },
  // ── Other ─────────────────────────────────────────────────────────────
  alarm:          { type:"boolean",             desc:"Alarm flag (red stroke)",               example:"true"      },
};

const COLOR_PROPS = new Set(["statusColor","innerBorderColor","stroke","fill","background"]);

const _win = window as unknown as Record<string, unknown>;
const _WORKERS_KEY  = "__scadaMonacoWorkersReady__";
const _PROVIDER_KEY = "__scadaBindingCompletionProvider__";

function ensureWorkers() {
  if (_win[_WORKERS_KEY]) return;
  _win[_WORKERS_KEY] = true;
  const g = window as unknown as { MonacoEnvironment?: { getWorker(_: string, label: string): Worker } };
  if (!g.MonacoEnvironment) {
    g.MonacoEnvironment = {
      getWorker(_: string, label: string) {
        if (label === "typescript" || label === "javascript") return new tsWorker();
        return new editorWorker();
      },
    };
  }
}

function ensureCompletionProvider() {
  if (_win[_PROVIDER_KEY]) return;
  _win[_PROVIDER_KEY] = monaco.languages.registerCompletionItemProvider("javascript", {
    triggerCharacters: ["{",":",  " ",".","\n",",","=",">","<"],
    async provideCompletionItems(model, position) {
      const uri = model.uri.toString();
      if (!uri.includes("scada-binding") && !uri.includes("scada-transform") &&
          !uri.includes("scada-pretransform")) return { suggestions: [] };

      const line       = model.getLineContent(position.lineNumber);
      const textBefore = line.slice(0, position.column - 1);
      const word       = model.getWordUntilPosition(position);
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber, endLineNumber: position.lineNumber,
        startColumn: word.startColumn, endColumn: word.endColumn,
      };
      const sug: monaco.languages.CompletionItem[] = [];

      // Color property → SCADA colors
      if (/\b(statusColor|innerBorderColor|stroke|fill|background)\s*:\s*["']?$/.test(textBefore)) {
        for (const c of SCADA_COLORS) {
          sug.push({ label:`"${c.hex}"`, kind:monaco.languages.CompletionItemKind.Color,
            detail:c.label, documentation:c.hex, insertText:`"${c.hex}"`, range });
        }
        return { suggestions: sug };
      }

      // TM.SUB.MNEM comparisons
      const dotCmp    = textBefore.match(/\bTM\.(\w+)\.([\w+\-.]+)\s*(===?|!==?|>=|<=|>|<)\s*$/);
      const bktCmp    = textBefore.match(/\bTM\s*\[\s*["']([^"']+)["']\s*\]\s*(===?|!==?|>=|<=|>|<)\s*$/);
      if (dotCmp || bktCmp) {
        let sub: string | undefined; let mnem: string;
        if (dotCmp) { sub = dotCmp[1]; mnem = dotCmp[2]; }
        else { mnem = bktCmp![1]; sub = _mnemSubsystemMap.get(mnem) ?? mnemonicCatalog.value.find(m => m.mnemonic === mnem)?.subsystem; }
        const ck = `${sub ?? ""}:${mnem}`;
        let rv = _mnemonicRangeCache.get(ck);
        if (!rv) { rv = sub ? await loadMnemonicRange(sub, mnem) : []; _mnemonicRangeCache.set(ck, rv); }
        for (const v of rv) sug.push({ label:`"${v}"`, kind:monaco.languages.CompletionItemKind.EnumMember, detail:`${mnem} state`, insertText:`"${v}"`, range });
        if (sug.length) return { suggestions: sug };
      }

      // TM.SUB.MNEM → insert TM["MNEM"]
      const mnemMatch = textBefore.match(/\bTM\.(\w+)\.([\w+\-.]*)$/);
      if (mnemMatch) {
        const sub = mnemMatch[1];
        let mnems = _subMnemCache.get(sub);
        if (!mnems) {
          const api = await loadMnemonicsForSubsystem(sub);
          mnems = api.length > 0 ? api : mnemonicCatalog.value.filter(m => m.subsystem?.toUpperCase() === sub.toUpperCase()).map(m => m.mnemonic);
          _subMnemCache.set(sub, mnems);
        }
        const rr: monaco.IRange = { startLineNumber:position.lineNumber, endLineNumber:position.lineNumber, startColumn:Math.max(1, position.column - mnemMatch[0].length), endColumn:position.column };
        for (const name of mnems) {
          _mnemSubsystemMap.set(name, sub);
          sug.push({ label:name, kind:monaco.languages.CompletionItemKind.Variable, detail:`${sub} · TM mnemonic`, insertText:`TM["${name}"]`, filterText:`TM.${sub}.${name}`, range:rr });
        }
        return { suggestions: sug };
      }

      // TM. → subsystem list
      if (/\bTM\.\w*$/.test(textBefore)) {
        for (const s of subsystems.value) sug.push({ label:s, kind:monaco.languages.CompletionItemKind.Module, detail:`Subsystem ${s}`, insertText:s, range });
        return { suggestions: sug };
      }

      // TM["..."] bracket notation
      if (/\bTM\s*\[\s*["'][\w.-]*$/.test(textBefore)) {
        const cat = mnemonicCatalog.value.length
          ? mnemonicCatalog.value
          : liveMnemonics.value.map(m => ({ mnemonic:m, subsystem:undefined as string|undefined }));
        const seen = new Set<string>();
        for (const m of cat) {
          if (seen.has(m.mnemonic)) continue; seen.add(m.mnemonic);
          sug.push({ label:m.mnemonic, kind:monaco.languages.CompletionItemKind.Variable,
            detail:m.subsystem ? `${m.subsystem} · TM mnemonic` : "TM mnemonic", insertText:m.mnemonic, range });
        }
        if (sug.length) return { suggestions: sug };
      }

      // Property names inside return {}
      const ctx = model.getValueInRange({ startLineNumber:Math.max(1,position.lineNumber-10), startColumn:1, endLineNumber:position.lineNumber, endColumn:position.column });
      const inReturn = /return\s*\{[^}]*$/.test(ctx);
      if (inReturn || /^\s*\w*$/.test(textBefore) || /[{,]\s*\w*$/.test(textBefore)) {
        const allowed = _category && CATEGORY_TARGET_PROPS[_category]
          ? CATEGORY_TARGET_PROPS[_category] : TARGET_PROPS.map(p => p.value);
        for (const key of allowed) {
          const meta = PROP_META[key]; if (!meta) continue;
          const lbl = TARGET_PROPS.find(p => p.value === key)?.label || key;
          sug.push({ label:key,
            kind:COLOR_PROPS.has(key) ? monaco.languages.CompletionItemKind.Color : monaco.languages.CompletionItemKind.Field,
            detail:`${meta.type} — ${lbl}`,
            documentation:{ value:`**${lbl}**\n\nType: \`${meta.type}\`\n\n${meta.desc}\n\nExample: \`${meta.example}\``, isTrusted:true },
            insertText:`${key}: `, range });
        }
      }

      return { suggestions: sug };
    },
  });
}

let pendingEditorScript = "";

function mountMainEditor(el: HTMLElement) {
  _category = resolvedGuidedCategory.value ?? props.category ?? "";
  const uri = monaco.Uri.parse("inmemory://scada-binding/script.js");
  let model = monaco.editor.getModel(uri);
  // Use pending script (from Simple tab or existing binding) if set, else default
  const fallback = `// Multi-property script — receives TM\n// Type TM. to browse subsystems/mnemonics\n// return an object with node properties\nreturn {\n  statusColor: "#27ae60",\n};`;
  const content = pendingEditorScript || fallback;
  pendingEditorScript = "";
  if (model) model.setValue(content);
  else model = monaco.editor.createModel(content, "javascript", uri);

  editorInstance = monaco.editor.create(el, {
    model, theme:"vs", automaticLayout:true, minimap:{enabled:false}, fontSize:14,
    lineNumbers:"on", scrollBeyondLastLine:false, wordWrap:"on", folding:false,
    renderLineHighlight:"line", suggest:{showWords:false},
    quickSuggestions:{other:true,comments:false,strings:true}, parameterHints:{enabled:false},
  });
  editorInstance.focus();
}

function mountPreTransformEditor(el: HTMLElement) {
  const uri = monaco.Uri.parse("inmemory://scada-pretransform/script.js");
  let model = monaco.editor.getModel(uri);
  const content = currentPreTransform.trim() || "// value = raw TM value\nreturn value;";
  if (model) model.setValue(content); else model = monaco.editor.createModel(content, "javascript", uri);
  preTransformEditorInstance = monaco.editor.create(el, {
    model, theme:"vs", automaticLayout:true, minimap:{enabled:false}, fontSize:13,
    lineNumbers:"on", scrollBeyondLastLine:false, wordWrap:"on", folding:false,
    renderLineHighlight:"line", suggest:{showWords:false},
    quickSuggestions:{other:true,comments:false,strings:true}, parameterHints:{enabled:false},
  });
}

function togglePreTransform() {
  showPreTransform.value = !showPreTransform.value;
}

// ── Initialization (runs on open + category change) ───────────────────────
function initEditor() {
  paramWatchSuspended = true;
  simpleFormDirty.value = false;
  simpleSourceStreamId.value = "default";
  // Init guided param values from any existing __multi__ binding
  if (isDataGrid.value) {
    // DataGrid: sync rows from prop; reset add-form state
    localDgRows.value     = (props.dataGridRows ?? []).map(r => ({ ...r }));
    dgNewLabel.value      = "";
    dgNewValueTopic.value = "";
    dgNewLabelTopic.value = "";
    activeDgDrop.value    = null;
    // Pre-populate dgRowRanges from cached ledRangeValues stored in rows
    const initialRanges: Record<string, string[]> = {};
    for (const r of localDgRows.value) {
      if (r.displayMode === "led" && r.ledRangeValues?.length) {
        initialRanges[r.id] = r.ledRangeValues;
      }
    }
    dgRowRanges.value = initialRanges;
    paramValues.value     = {};
    editingBindingId.value = null;
  } else if (hasSimpleMode.value && guidedParams.value) {
    const existing = localBindings.value.find(b => b.targetProp === "__multi__" && b.script);
    simpleSourceStreamId.value = normalizeSourceStreamId(existing?.sourceStreamId);
    const restored = existing && resolvedGuidedCategory.value
      ? parseGuidedScript(resolvedGuidedCategory.value, existing.script!)
      : null;
    const init: Record<string, ParamValue> = {};
    for (const p of guidedParams.value) {
      init[p.key] = restored?.[p.key] ?? { mnemonic:"", fixed:"", na:false, transform:"", stateMap: undefined };
    }
    paramValues.value = init;
    editingBindingId.value = existing ? existing.id : null;
  } else {
    paramValues.value = {};
    editingBindingId.value = null;
  }
  nextTick(() => { paramWatchSuspended = false; });

  // Tab selection
  if (localBindings.value.length > 0 && !isDataGrid.value) {
    activeTab.value = "bindings";
  } else if (hasSimpleMode.value) {
    activeTab.value = "simple";
  } else {
    activeTab.value = "simple";
    simpleProp.value = simpleTargetProps.value[0]?.value ?? "statusColor";
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────
onMounted(() => {
  loadTelemetryStreamsFromStorage();
  ensureWorkers();
  ensureCompletionProvider();
  initEditor();
});

// Re-initialize whenever the editor opens or the selected node type changes
watch(() => props.visible, (v) => { if (v) initEditor(); });
watch(() => [props.category, props.cellLabel], () => { if (props.visible) initEditor(); });

onUnmounted(() => {
  _category = "";
  _subMnemCache.clear(); _mnemonicRangeCache.clear(); _mnemSubsystemMap.clear();
  editorInstance?.dispose(); editorInstance = null;
  preTransformEditorInstance?.dispose(); preTransformEditorInstance = null;
  transformEditorInstance?.dispose(); transformEditorInstance = null;
  simpleTransformEditorInstance?.dispose(); simpleTransformEditorInstance = null;
  monaco.editor.getModel(monaco.Uri.parse("inmemory://scada-binding/script.js"))?.dispose();
  monaco.editor.getModel(monaco.Uri.parse("inmemory://scada-pretransform/script.js"))?.dispose();
  monaco.editor.getModel(monaco.Uri.parse("inmemory://scada-param-transform/script.js"))?.dispose();
  monaco.editor.getModel(monaco.Uri.parse("inmemory://scada-simple-transform/script.js"))?.dispose();
});

/** Prepends a comment in Advanced when a non-default NATS stream is selected (runtime TM is scoped — not shown as TM.streams in code). */
function withTelemetrySourceBanner(script: string): string {
  const t = script.trim();
  if (!t) return script;
  const sid = simpleSourceStreamId.value;
  if (sid === "default") return script;
  if (/^\/\/\s*Telemetry source:/i.test(t)) return script;
  const s = telemetryStreams.value.find(x => x.id === sid);
  const label = s?.label ?? sid;
  return `// Telemetry source: ${label} (${sid}) — TM in the viewer is scoped to this stream; use TM["MNEMONIC"] below.\n\n${script}`;
}

// ── Tab switching ─────────────────────────────────────────────────────────
function generateSimpleScript(): string {
  const mnem   = simpleMnemonic.value.trim();
  const prop   = simpleProp.value;
  const rules  = simpleRules.value.filter(r => r.condition.trim());
  const xform  = simpleTransform.value.trim();

  const tmKey  = mnem ? `TM["${mnem}"]` : "undefined";
  const valExpr = xform ? `(${xform})`.replace(/\bv\b/g, tmKey) : tmKey;

  const lines: string[] = [
    `// Auto-generated from Simple tab`,
    `// Mnemonic: ${mnem || "(none)"} · Property: ${prop}`,
    `const value = ${valExpr};`,
    ``,
  ];

  if (rules.length) {
    lines.push(`let result;`);
    for (const r of rules) {
      const cond = r.condition.trim();
      const val  = JSON.stringify(r.value);
      lines.push(`if (${cond}) result = ${val};`);
    }
    lines.push(``, `return { ${prop}: result };`);
  } else {
    lines.push(`return { ${prop}: value };`);
  }

  return lines.join("\n");
}

function switchToAdvanced() {
  if (activeTab.value === "simple" && isDataGrid.value) {
    // DataGrid: no script to carry over; just open Advanced with the fallback template
    pendingEditorScript = "";
  } else if (activeTab.value === "simple" && hasSimpleMode.value) {
    // Regenerating from Simple always wipes custom return { ... } bodies. Only do that
    // when the user actually changed the guided form; otherwise keep the saved script.
    if (simpleFormDirty.value) {
      pendingEditorScript = generateGuidedScript(resolvedGuidedCategory.value!, paramValues.value);
    } else {
      const multi = editingBindingId.value
        ? localBindings.value.find(b => b.id === editingBindingId.value && b.targetProp === "__multi__")
        : localBindings.value.find(b => b.targetProp === "__multi__");
      pendingEditorScript = multi?.script?.trim()
        ? multi.script!
        : generateGuidedScript(resolvedGuidedCategory.value!, paramValues.value);
    }
  } else if (activeTab.value === "simple" && !hasSimpleMode.value) {
    // Non-guided Simple tab (SvgGraphic / generic) → generate script from current selections
    pendingEditorScript = generateSimpleScript();
    // If editor is already mounted, update the model immediately.
    if (editorInstance) {
      const script = withTelemetrySourceBanner(pendingEditorScript);
      pendingEditorScript = "";
      nextTick(() => editorInstance?.getModel()?.setValue(script));
    }
  } else if (activeTab.value === "bindings") {
    const existing = localBindings.value.find(b => b.targetProp === "__multi__" && b.script);
    if (existing?.script) {
      simpleSourceStreamId.value = normalizeSourceStreamId(existing.sourceStreamId);
      pendingEditorScript = existing.script;
    }
  }
  if (pendingEditorScript) pendingEditorScript = withTelemetrySourceBanner(pendingEditorScript);
  activeTab.value = "advanced";
}

// ── Bindings management ───────────────────────────────────────────────────
function newId() { return `${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }

function deleteBinding(id: string) {
  localBindings.value = localBindings.value.filter(b => b.id !== id);
  emit("update:bindings", [...localBindings.value]);
}

function startNewBinding() {
  editingBindingId.value = null;
  overrideSvgFromBinding.value = null;
  currentPreTransform = "";
  simpleProp.value = simpleTargetProps.value[0]?.value ?? "statusColor";
  simpleSubsystem.value = ""; simpleMnemonic.value = "";
  simpleValueMode.value = "absolute";
  simpleAnimationDuration.value = 1;
  simpleSourceStreamId.value = "default";
  simpleTransform.value = ""; simpleRules.value = [];
  activeTab.value = hasSimpleMode.value ? "simple" : "simple";
}

function editBindingFromList(b: TelemetryBinding) {
  editingBindingId.value = b.id;
  overrideSvgFromBinding.value = b.svgElementId ?? null;
  currentPreTransform = b.transformScript ?? "";

  simpleSourceStreamId.value = normalizeSourceStreamId(b.sourceStreamId);
  if (b.script?.trim()) {
    simpleAnimationDuration.value = Number.isFinite(Number(b.animationDuration))
      ? Math.max(0, Number(b.animationDuration))
      : 1;
    const restored = hasSimpleMode.value && resolvedGuidedCategory.value
      ? parseGuidedScript(resolvedGuidedCategory.value, b.script)
      : null;
    if (restored) {
      restoreParamValues(restored);
      activeTab.value = "simple";
    } else {
      simpleFormDirty.value = false;
      const scriptWithBanner = withTelemetrySourceBanner(b.script!);
      pendingEditorScript = scriptWithBanner;
      activeTab.value = "advanced";
      nextTick(() => {
        editorInstance?.getModel()?.setValue(scriptWithBanner);
        if (b.transformScript?.trim()) {
          showPreTransform.value = true;
          nextTick(() => preTransformEditorInstance?.getModel()?.setValue(b.transformScript!));
        }
      });
    }
  } else {
    const tp = b.targetProp ?? "statusColor";
    simpleProp.value = tp;
    simpleSubsystem.value = b.subsystem ?? "";
    simpleMnemonic.value = b.topic ?? "";
    simpleValueMode.value = b.valueMode === "delta" ? "delta" : "absolute";
    simpleAnimationDuration.value = Number.isFinite(Number(b.animationDuration))
      ? Math.max(0, Number(b.animationDuration))
      : 1;
    simpleTransform.value = b.transform ?? "";
    simpleRules.value = (b.rules ?? []).map(r => {
      let val = r.value;
      if (BOOLEAN_RULE_PROPS.has(tp)) val = normalizeBooleanRuleOutput(r.value);
      else if (tp === "flowDirection") val = normalizeFlowDirectionRuleOutput(r.value);
      return { condition: r.condition, value: val };
    });
    activeTab.value = "simple";
  }
}

function restoreParamValues(restored: Record<string, ParamValue>) {
  paramWatchSuspended = true;
  const init: Record<string, ParamValue> = {};
  for (const p of guidedParams.value!) {
    init[p.key] = restored?.[p.key] ?? { mnemonic:"", fixed:"", na:false, transform:"", stateMap: undefined };
  }
  paramValues.value = init;
  nextTick(() => {
    paramWatchSuspended = false;
    simpleFormDirty.value = false;
  });
}

// ── Non-guided simple helpers ─────────────────────────────────────────────
function openSimpleSingleSub(el: HTMLElement) {
  simpleSingleSubOpen.value = true; simpleSingleSubQuery.value = "";
  const r = el.getBoundingClientRect();
  simpleSingleSubStyle.value = { position:"fixed", top:`${r.bottom+4}px`, left:`${r.left}px`, minWidth:`${r.width}px`, zIndex:"10300" };
}
function selectSimpleSubsystem(s: string) {
  const next = String(s ?? "").trim();
  if (!next) return;
  if (simpleSubsystem.value === next) {
    simpleSingleSubOpen.value = false;
    return;
  }
  simpleSubsystem.value = next;
  // Keep current mnemonic and re-fetch mapping under the newly selected subsystem.
  if (simpleMnemonic.value.trim()) simpleMnemonicSelectionNonce.value++;
  simpleSingleSubOpen.value = false;
}
function openSimpleSingleMnemDrop(el: HTMLElement) {
  simpleSingleMnemDropOpen.value = true; simpleSingleMnemDropQuery.value = "";
  const r = el.getBoundingClientRect();
  simpleSingleMnemDropStyle.value = { position:"fixed", top:`${r.bottom+4}px`, left:`${r.left}px`, width:`${r.width}px`, zIndex:"10300" };
  nextTick(() => (document.querySelector(".simple-mnem-search") as HTMLInputElement | null)?.focus());
}
function selectSimpleMnemonic(m: string) {
  // Store pid_mnemonic format directly; resolveTelemetryKey will handle it during lookup
  simpleMnemonic.value = m; 
  if (m.trim()) simpleMnemonicSelectionNonce.value++;
  simpleSingleMnemDropOpen.value = false;
}

// ── Save ──────────────────────────────────────────────────────────────────
function handleSave() {
  if (activeTab.value === "bindings") { close(); return; }

  let binding: TelemetryBinding | null = null;

  const svgCtx = effectiveSvgElementId.value
    ? { svgElementId: effectiveSvgElementId.value }
    : {};

  // Always persist stream id (including "default") so upstream merge paths cannot
  // retain an older non-default sourceStreamId such as "tm2".
  const streamOpt = simpleSourceStreamId.value;

  // ── DataGrid: emit rows + recomputed bindings, then done ─────────────────
  if (isDataGrid.value && activeTab.value === "simple") {
    const newBindings = buildDataGridBindings(localDgRows.value, localBindings.value);
    localBindings.value = newBindings;
    emit("dataGridRowsUpdated", localDgRows.value.map(r => ({ ...r })));
    emit("update:bindings",     [...newBindings]);
    activeTab.value = "bindings";
    return;
  }

  if (hasSimpleMode.value && activeTab.value === "simple") {
    const script = generateGuidedScript(resolvedGuidedCategory.value!, paramValues.value);
    binding = {
      id:         editingBindingId.value ?? newId(),
      topic:      "",
      targetProp: "__multi__",
      script:     script.trim() || undefined,
      animationDuration: Math.max(0, Number(simpleAnimationDuration.value) || 1),
      subsystem:  simpleSubsystems.value[0] || undefined,
      sourceStreamId: streamOpt,
      ...svgCtx,
    };
  } else if (!hasSimpleMode.value && activeTab.value === "simple") {
    const rules = simpleRules.value.filter(r => r.condition.trim());
    binding = {
      id:         editingBindingId.value ?? newId(),
      topic:      simpleMnemonic.value.trim(),
      targetProp: simpleProp.value,
      valueMode:  isDeltaNumericProp.value ? simpleValueMode.value : "absolute",
      animationDuration: isDeltaNumericProp.value
        ? Math.max(0, Number(simpleAnimationDuration.value) || 1)
        : undefined,
      transform:  simpleTransform.value.trim() || undefined,
      rules:      rules.length ? rules : undefined,
      subsystem:  simpleSubsystem.value || undefined,
      sourceStreamId: streamOpt,
      ...svgCtx,
    };
  } else if (activeTab.value === "advanced") {
    const script      = editorInstance?.getValue()            ?? "";
    const preTransform = preTransformEditorInstance?.getValue() ?? "";
    binding = {
      id:              editingBindingId.value ?? newId(),
      topic:           "",
      targetProp:      "__multi__",
      animationDuration: Math.max(0, Number(simpleAnimationDuration.value) || 1),
      sourceStreamId:  streamOpt,
      script:          script.trim()      || undefined,
      transformScript: preTransform.trim() || undefined,
      ...svgCtx,
    };
  }

  if (binding) {
    let idx = editingBindingId.value
      ? localBindings.value.findIndex(b => b.id === editingBindingId.value) : -1;
    if (idx === -1 && binding.targetProp === "__multi__")
      idx = localBindings.value.findIndex(b => b.targetProp === "__multi__");
    if (idx !== -1) localBindings.value.splice(idx, 1, binding);
    else            localBindings.value.push(binding);
    emit("update:bindings", [...localBindings.value]);
    simpleFormDirty.value = false;
  }

  activeTab.value = "bindings";
}

function close() {
  emit("update:bindings", [...localBindings.value]);
  emit("update:hoverMnemonics", [...localHoverMnemonics.value]);
  emit("update:telecommands", [...localTelecommands.value]);
  emit("update:visible", false);
}
</script>

<style scoped>
/* ── Backdrop & Modal ─────────────────────────────────────────────────── */
.tbe-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  z-index: 9999; display: flex; align-items: center; justify-content: center;
}
.tbe-modal {
  background: #ffffff; border: 1px solid #d0d0d0; border-radius: 8px;
  width: min(1220px, 98vw); max-height: 94vh;
  display: flex; flex-direction: column;
  box-shadow: 0 16px 56px rgba(0,0,0,0.22); overflow: hidden;
}

/* ── Header ───────────────────────────────────────────────────────────── */
.tbe-header {
  display: flex; align-items: center; gap: 10px; padding: 12px 18px;
  background: #f5f5f5; border-bottom: 1px solid #e0e0e0; flex-shrink: 0;
}
.tbe-header-title { font-size: 15px; font-weight: 700; color: #1a1a1a; }
.tbe-header-mnem {
  font-size: 13px; font-family: "Consolas","Courier New",monospace; color: #0066cc;
  background: #e8f0fe; border: 1px solid #c5d8f6; padding: 2px 10px; border-radius: 4px;
}
.tbe-header-part {
  font-size: 11px; font-family: "Consolas","Courier New",monospace; color: #0d47a1;
  background: #fff3e0; border: 1px solid #ffcc80; padding: 2px 8px; border-radius: 4px;
}
.binding-part-badge {
  font-size: 10px; color: #e65100; margin-right: 4px; font-weight: 600;
}
.tbe-close-btn {
  margin-left: auto; background: none; border: none; color: #888; cursor: pointer;
  font-size: 18px; line-height: 1; padding: 2px 6px; border-radius: 4px;
}
.tbe-close-btn:hover { color: #d93025; background: #fce8e6; }

/* ── Tabs ─────────────────────────────────────────────────────────────── */
.tbe-tabs { display: flex; background: #f5f5f5; border-bottom: 1px solid #e0e0e0; flex-shrink: 0; }
.tbe-tab {
  padding: 9px 28px; background: transparent; border: none;
  border-bottom: 3px solid transparent; color: #888; cursor: pointer;
  font-size: 13px; font-weight: 600; transition: color 0.15s, border-color 0.15s;
}
.tbe-tab.active { color: #1a73e8; border-bottom-color: #1a73e8; }
.tbe-tab:hover:not(.active) { color: #333; }
.tab-count {
  display: inline-block; background: #1a73e8; color: #fff;
  font-size: 10px; font-weight: 700; border-radius: 10px; padding: 1px 6px; margin-left: 4px;
}

/* ── Bindings list ────────────────────────────────────────────────────── */
.bindings-list {
  flex: 1; overflow-y: auto; padding: 16px 20px;
  display: flex; flex-direction: column; gap: 6px; min-height: 120px; max-height: 68vh;
}
.bindings-empty-state { font-size: 13px; color: #888; padding: 16px 0; }
.bindings-empty-state strong { color: #555; }
.binding-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; background: #f8f8f8; border: 1px solid #e8e8e8; border-radius: 6px;
}
.binding-type-badge {
  padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700;
  background: #e8f0fe; color: #1a73e8; border: 1px solid #c5d8f6; white-space: nowrap; flex-shrink: 0;
}
.binding-stream-badge {
  padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700;
  background: #fff3e0; color: #e65100; border: 1px solid #ffcc80; white-space: nowrap; flex-shrink: 0;
}
.binding-preview {
  flex: 1; color: #333; font-family: monospace; font-size: 12px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.binding-item-actions { display: flex; gap: 4px; flex-shrink: 0; }
.btn-binding-edit, .btn-binding-del {
  background: none; border: none; cursor: pointer; font-size: 13px;
  padding: 2px 7px; border-radius: 3px; color: #888; transition: all 0.1s;
}
.btn-binding-edit:hover { color: #1a73e8; background: #e8f0fe; }
.btn-binding-del:hover  { color: #d93025; background: #fce8e6; }
.btn-new-binding {
  padding: 8px 18px; background: #1a73e8; color: #fff; border: none; border-radius: 6px;
  font-size: 13px; font-weight: 600; cursor: pointer; align-self: flex-start; margin-top: 4px;
}
.btn-new-binding:hover { background: #1557b0; }

/* ── Simple form area (shared) ────────────────────────────────────────── */
.simple-form-area {
  flex: 1; overflow-y: auto; padding: 0 20px 16px;
  display: flex; flex-direction: column; gap: 0;
  max-height: 68vh; background: #ffffff;
}
.simple-form-area::-webkit-scrollbar { width: 4px; }
.simple-form-area::-webkit-scrollbar-thumb { background: #d0d0d0; border-radius: 2px; }

/* Subsystem filter row */
.simple-subsystem-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 0 14px; border-bottom: 1px solid #e8e8e8; margin-bottom: 4px;
  flex-shrink: 0;
}
.simple-subsystem-label { font-size: 11px; font-weight: 700; color: #666; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
.ms-wrap { flex: 1; max-width: 400px; position: relative; }

/* Multi/Single select trigger */
.ms-trigger {
  width: 100%; display: flex; align-items: center; padding: 6px 12px;
  background: #fff; border: 1px solid #c8c8c8; border-radius: 5px;
  color: #1a1a1a; font-size: 13px; cursor: pointer; text-align: left; gap: 6px;
  transition: border-color 0.15s;
}
.ms-trigger:hover, .ms-trigger:focus { border-color: #1a73e8; outline: none; }
.ms-trigger-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ms-chevron { font-size: 10px; color: #888; flex-shrink: 0; }

/* Dropdown */
.ms-dropdown {
  background: #fff; border: 1px solid #c8c8c8; border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.14); overflow: hidden;
}
.ms-search-wrap { display: flex; align-items: center; border-bottom: 1px solid #e8e8e8; }
.ms-search {
  flex: 1; padding: 8px 12px; background: transparent; border: none;
  color: #1a1a1a; font-size: 13px; outline: none;
}
.ms-clear-btn { padding: 4px 10px; background: none; border: none; border-left: 1px solid #e8e8e8; cursor: pointer; color: #888; font-size: 12px; }
.ms-list { margin: 0; padding: 4px 0; list-style: none; max-height: 200px; overflow-y: auto; }
.ms-item { display: flex; align-items: center; gap: 8px; padding: 6px 12px; font-size: 13px; color: #1a1a1a; cursor: pointer; }
.ms-item:hover { background: #f0f4ff; }
.ms-item.selected { background: #e8f0fe; color: #1a73e8; }
.ms-checkbox { width: 16px; text-align: center; font-size: 12px; color: #1a73e8; flex-shrink: 0; }
.ms-empty { padding: 8px 12px; font-size: 12px; color: #aaa; font-style: italic; }

/* ── Simple non-guided fields ─────────────────────────────────────────── */
.simple-field {
  display: flex; flex-direction: column; gap: 6px;
  padding: 10px 0; border-bottom: 1px solid #f0f0f0;
}
.simple-inline-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.simple-inline-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.simple-field-label { font-size: 11px; font-weight: 700; color: #555; text-transform: uppercase; letter-spacing: 0.04em; }
.simple-field-hint { font-weight: 400; text-transform: none; letter-spacing: 0; color: #999; font-size: 10px; }
p.simple-field-hint {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.45;
  color: #666;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}
p.simple-field-hint code { font-size: 10px; background: #f5f5f5; padding: 1px 4px; border-radius: 3px; color: #333; }
.simple-field-hint--sub { margin-top: 4px; font-size: 11px; color: #666; line-height: 1.45; }
.simple-field--transform { border-bottom: none; padding-bottom: 4px; }
.simple-prop-select {
  padding: 6px 10px; background: #fff; border: 1px solid #c8c8c8;
  border-radius: 5px; font-size: 13px; color: #1a1a1a; outline: none;
}
.simple-prop-select:focus { border-color: #1a73e8; }
.simple-bool-hint {
  margin: -4px 0 8px;
  padding: 0 2px;
  font-size: 11px;
  line-height: 1.4;
  color: #5f6368;
}
.simple-bool-hint code {
  font-size: 10px;
  background: #f0f0f0;
  padding: 1px 4px;
  border-radius: 3px;
}

/* Color presets field (non-guided, shown when color prop selected) */
.color-presets-field { background: #fafff8; border: 1px solid #d4edda; border-radius: 6px; padding: 10px 12px; margin-top: 4px; }
.color-presets-palette { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.color-preset-swatch {
  position: relative;
  width: 36px; height: 36px; border-radius: 5px;
  border: 2px solid rgba(0,0,0,0.15); cursor: pointer;
  transition: transform 0.12s, box-shadow 0.12s;
  overflow: hidden;
  display: flex; align-items: flex-end; justify-content: center;
}
.color-preset-swatch:hover { transform: scale(1.18); box-shadow: 0 3px 10px rgba(0,0,0,0.25); z-index: 1; }
.swatch-hex {
  display: none;
  position: absolute; bottom: 0; left: 0; right: 0;
  background: rgba(0,0,0,0.65); color: #fff;
  font-size: 7px; text-align: center; padding: 1px 0;
  letter-spacing: -0.02em; pointer-events: none;
}
.color-preset-swatch:hover .swatch-hex { display: block; }
.color-presets-hint { font-size: 10px; color: #888; margin-top: 2px; }
.color-custom-row {
  display: flex; align-items: center; gap: 6px; margin-top: 8px;
  padding-top: 8px; border-top: 1px solid #e0eed8;
}
.color-hex-input {
  font-family: monospace; font-size: 13px; width: 90px;
  padding: 4px 8px; border: 1px solid #c8c8c8; border-radius: 4px; outline: none;
}
.color-hex-input:focus { border-color: #1a73e8; }
.color-add-btn {
  padding: 4px 10px; background: #1a73e8; color: #fff;
  border: none; border-radius: 4px; font-size: 12px; cursor: pointer;
}
.color-add-btn:hover { background: #1557b0; }

/* ── CurrentSensor / Indicator colour-conditions block ───────────────── */
.cs-rules-block {
  margin: 14px 0 6px 0; padding: 12px;
  background: #f8fafc; border: 1px solid #d0d8e2; border-radius: 5px;
}
.cs-rules-header { display: flex; align-items: center; gap: 8px; justify-content: flex-start; flex-wrap: wrap; margin-bottom: 8px; }
.cs-rules-title  { font-size: 13px; font-weight: 700; color: #222; }
.cs-rules-hint   { font-size: 11px; color: #6a7a8a; margin-left: auto; }
.cs-rules-hint code { background: #e6ecf2; padding: 1px 4px; border-radius: 2px; font-family: monospace; }
.cs-rules-empty  { font-size: 12px; color: #8a99aa; font-style: italic; padding: 6px 0; }
/* Auto-suggest button */
.cs-autofill-btn {
  padding: 2px 8px; font-size: 11px; font-weight: 600;
  background: #eff6ff; color: #2563eb;
  border: 1px solid #93b4eb; border-radius: 3px; cursor: pointer;
  white-space: nowrap;
}
.cs-autofill-btn:hover { background: #dbeafe; color: #1e40af; }
/* Hint shown when no rules and mnemonic is selected */
.cs-autofill-hint {
  font-size: 12px; color: #4a6a9a; background: #eef4ff;
  border: 1px solid #bcd4f7; border-radius: 4px;
  padding: 6px 10px; margin-bottom: 8px;
}
.cs-rule-row {
  display: grid;
  grid-template-columns: auto 70px 1fr auto 36px 28px;
  gap: 8px; align-items: center;
  padding: 5px 0;
}
.cs-rule-prefix { color: #555; font-size: 12px; font-family: monospace; }
.cs-op     { padding: 3px 6px; font-family: monospace; border: 1px solid #c0c8d0; border-radius: 3px; background: #fff; }
.cs-thresh     { padding: 3px 6px; border: 1px solid #c0c8d0; border-radius: 3px; width: 100%; font-family: monospace; }
.cs-thresh-str { text-transform: uppercase; letter-spacing: 0.04em; }
.cs-arrow  { color: #888; font-weight: 700; font-size: 13px; }
.cs-color  { width: 36px; height: 26px; border: 1px solid #c0c8d0; border-radius: 3px; background: transparent; padding: 0; cursor: pointer; }
.cs-del    { background: #fff; color: #c0392b; border: 1px solid #e6b9b3; border-radius: 3px; padding: 0; cursor: pointer; font-size: 13px; width: 26px; height: 26px; }
.cs-del:hover { background: #fde8e6; }
.cs-add {
  width: 100%; margin-top: 8px; padding: 6px;
  background: #fff; color: #2563eb; border: 1px dashed #93b4eb; border-radius: 3px;
  cursor: pointer; font-size: 12px; font-weight: 600;
}
.cs-add:hover { background: #eef4ff; color: #1e40af; }

/* ── Guided rows ──────────────────────────────────────────────────────── */
.guided-row { padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
.guided-row-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 6px; }
.guided-label { font-size: 13px; font-weight: 600; color: #222; }
.guided-hint  { font-size: 11px; color: #999; font-family: monospace; }
.guided-input-area { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }

/* Custom expression banner */
.guided-custom-expr {
  display: flex; align-items: center; gap: 6px;
  background: #f8f4ff; border: 1px solid #d5c6f0; border-radius: 4px; padding: 4px 8px; width: 100%;
}
.guided-custom-expr-label { font-size: 11px; font-weight: 700; color: #7c3aed; white-space: nowrap; }
.guided-custom-expr-code  { font-size: 12px; font-family: monospace; color: #4b1a9e; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.guided-custom-expr-clear { background: none; border: none; cursor: pointer; color: #7c3aed; font-size: 13px; flex-shrink: 0; }

/* Mnemonic trigger */
.guided-mnem-trigger {
  flex: 1; min-width: 160px; max-width: 340px; display: flex; align-items: center;
  padding: 6px 10px; background: #fff; border: 1px solid #c8c8c8; border-radius: 5px;
  font-size: 13px; cursor: pointer; text-align: left; gap: 6px; transition: border-color 0.15s;
}
.guided-mnem-trigger:hover:not(:disabled), .guided-mnem-trigger.is-open { border-color: #1a73e8; }
.guided-mnem-trigger.has-value .guided-mnem-trigger-label { color: #1a1a1a; font-weight: 500; }
.guided-mnem-trigger:disabled { opacity: 0.4; cursor: not-allowed; }
.guided-mnem-trigger-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #aaa; }
.guided-mnem-trigger-chevron { font-size: 10px; color: #888; flex-shrink: 0; }

/* Mnemonic dropdown */
.mnem-dropdown {
  background: #fff; border: 1px solid #c8c8c8; border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.14); overflow: hidden; min-width: 220px;
}
.mnem-overlay { position: fixed; inset: 0; z-index: 10199; }
.mnem-search-wrap { display: flex; align-items: center; border-bottom: 1px solid #e8e8e8; }
.mnem-search { flex: 1; padding: 8px 12px; background: transparent; border: none; color: #1a1a1a; font-size: 13px; outline: none; }
.mnem-clear-btn { padding: 4px 10px; background: none; border: none; border-left: 1px solid #e8e8e8; cursor: pointer; color: #888; font-size: 12px; }
.mnem-list { margin: 0; padding: 4px 0; list-style: none; max-height: 240px; overflow-y: auto; }
.mnem-item { display: flex; align-items: center; gap: 8px; padding: 5px 12px; font-size: 13px; cursor: pointer; }
.mnem-item:hover { background: #f0f4ff; }
.mnem-item.selected { background: #e8f0fe; }
.mnem-item.cross-sub { color: #999; }
.mnem-item-label { flex: 1; font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mnem-item-badge { font-size: 10px; background: #fff3e0; color: #e65100; border: 1px solid #ffcc80; border-radius: 4px; padding: 0 5px; white-space: nowrap; }
.mnem-empty { padding: 8px 12px; font-size: 12px; color: #aaa; font-style: italic; }
.mnem-hint { padding: 8px 12px; font-size: 12px; color: #6b7280; border-top: 1px solid #eef2f7; background: #fafcff; }

/* ── Per-param transform button ───────────────────────────────────────── */
.guided-transform-btn {
  display: flex; align-items: center; gap: 5px; padding: 4px 12px;
  background: #fff; border: 1px solid #d0d0d0; border-radius: 16px;
  font-size: 12px; cursor: pointer; color: #888; transition: all 0.15s;
}
.guided-transform-btn:hover  { border-color: #ff9800; color: #e65100; background: #fff8f0; }
.guided-transform-btn.active { border-color: #ff9800; background: #fff3e0; color: #e65100; font-weight: 600; }
.guided-transform-btn.open   { border-color: #ff9800; background: #fff3e0; }
.guided-transform-icon { font-size: 13px; }
.guided-transform-preview { font-family: monospace; font-size: 11px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.guided-transform-none { color: #bbb; font-style: italic; }

/* Fixed chips */
.guided-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.guided-chip {
  padding: 4px 12px; background: #f5f5f5; border: 1px solid #d0d0d0; border-radius: 14px;
  font-size: 12px; cursor: pointer; color: #555; transition: all 0.15s;
}
.guided-chip:hover  { border-color: #1a73e8; color: #1a73e8; background: #e8f0fe; }
.guided-chip.active { background: #1a73e8; color: #fff; border-color: #1a73e8; }
.guided-chip-na:hover, .guided-chip-na.active { background: #757575; border-color: #757575; color: #fff; }

/* Raw TM label → canonical state (guided discrete parameters) */
.guided-state-map {
  margin-top: 10px; padding: 10px 12px;
  background: #f0f7ff; border: 1px solid #b3d7ff; border-radius: 6px;
}
.guided-state-map-title {
  font-size: 12px; font-weight: 700; color: #1565c0; margin-bottom: 4px;
}
.guided-state-map-hint {
  font-size: 11px; color: #546e7a; margin: 0 0 10px; line-height: 1.35;
}
.guided-state-map-row {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  margin-bottom: 6px;
}
.guided-state-map-raw {
  font-size: 12px; background: #fff; padding: 3px 8px; border-radius: 4px;
  border: 1px solid #90caf9; color: #0d47a1;
}
.guided-state-map-arrow { color: #78909c; font-size: 14px; }
.guided-state-map-select {
  flex: 1; min-width: 140px; padding: 5px 8px; font-size: 12px;
  border: 1px solid #90caf9; border-radius: 4px; background: #fff; color: #1a1a1a;
}
.guided-state-color {
  width: 34px;
  height: 26px;
  padding: 0;
  border: 1px solid #90caf9;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}
.guided-state-map-clear {
  margin-top: 6px; padding: 4px 10px; font-size: 11px;
  background: #fff; border: 1px solid #90caf9; border-radius: 4px; cursor: pointer; color: #1565c0;
}
.guided-state-map-clear:hover { background: #e3f2fd; }

/* ── Inline transform Monaco panel ───────────────────────────────────── */
.guided-transform-panel {
  margin-top: 8px; border: 1px solid #ffd54f; border-radius: 6px;
  background: #fffde7; overflow: hidden;
}
.guided-transform-panel-header {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
  padding: 7px 12px; background: #fff9c4; border-bottom: 1px solid #ffd54f;
}
.guided-transform-panel-title { font-size: 12px; font-weight: 700; color: #e65100; }
.guided-transform-panel-hint { font-size: 11px; color: #888; flex: 1; }
.guided-transform-panel-hint code { font-family: monospace; background: rgba(0,0,0,0.06); padding: 1px 4px; border-radius: 2px; }
.guided-transform-panel-clear { background: none; border: none; cursor: pointer; font-size: 11px; color: #e65100; padding: 2px 6px; white-space: nowrap; }
.guided-transform-panel-close { background: none; border: none; cursor: pointer; font-size: 14px; color: #888; padding: 2px 6px; }
.guided-transform-snippets {
  display: flex; flex-wrap: wrap; gap: 5px; padding: 8px 12px;
  background: #fffde7; border-bottom: 1px solid #fff3e0;
}
.guided-transform-snip {
  padding: 3px 10px; background: #fff; border: 1px solid #ffd54f; border-radius: 12px;
  font-size: 11px; font-family: monospace; cursor: pointer; color: #555; transition: all 0.15s;
}
.guided-transform-snip:hover { background: #ffd54f; color: #1a1a1a; }
.guided-transform-editor-area { height: 80px; }

/* ── Rules section ────────────────────────────────────────────────────── */
.rules-section { margin-top: 8px; display: flex; flex-direction: column; gap: 6px; padding-top: 4px; }
.rules-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.rules-hint { font-size: 11px; color: #999; }
.rules-hint code { font-family: monospace; background: #f0f0f0; padding: 1px 4px; border-radius: 2px; }
.rules-warning {
  margin: 0 0 8px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.45;
  color: #856404;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 6px;
}
.rules-warning strong { color: #664d03; }
.tbe-footer-viewer-note { display: inline-block; margin-top: 6px; color: #5f6368; font-size: 11px; line-height: 1.4; }
.tbe-footer-viewer-note strong { color: #1a73e8; }
.rule-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 4px 0; }
.rule-condition-input {
  flex: 1; min-width: 160px; padding: 5px 8px; background: #fff;
  border: 1px solid #c8c8c8; border-radius: 4px; font-size: 12px;
  font-family: monospace; color: #1a1a1a; outline: none;
}
.rule-condition-input:focus { border-color: #1a73e8; }
.rule-color-swatch {
  width: 24px; height: 24px; border-radius: 4px; flex-shrink: 0;
  border: 1px solid rgba(0,0,0,0.15);
}
.color-native-picker {
  width: 34px; height: 28px; padding: 1px; border: 1px solid #c8c8c8;
  border-radius: 4px; cursor: pointer; flex-shrink: 0; background: #fff;
}
.color-presets-strip { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.color-preset-dot {
  width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid rgba(255,255,255,0.7); outline: 1px solid rgba(0,0,0,0.12);
  cursor: pointer; padding: 0; transition: transform 0.12s;
}
.color-preset-dot:hover { transform: scale(1.3); }
.rule-value-input {
  flex: 1; min-width: 120px; padding: 5px 8px; background: #fff;
  border: 1px solid #c8c8c8; border-radius: 4px; font-size: 12px; color: #1a1a1a; outline: none;
}
.rule-value-input:focus { border-color: #1a73e8; }
.rule-select-output {
  min-width: 200px;
  max-width: 100%;
  cursor: pointer;
}
.rule-delete-btn { background: none; border: none; cursor: pointer; font-size: 13px; color: #aaa; padding: 2px 6px; flex-shrink: 0; }
.rule-delete-btn:hover { color: #d93025; }
.rule-add-btn {
  padding: 5px 14px; background: none; border: 1px dashed #c8c8c8; border-radius: 5px;
  font-size: 12px; color: #888; cursor: pointer; align-self: flex-start; transition: all 0.15s;
}
.rule-add-btn:hover { border-color: #1a73e8; color: #1a73e8; }

/* ── Advanced tab ─────────────────────────────────────────────────────── */

/* Pre-transform section */
.pretransform-section {
  flex-shrink: 0; border-bottom: 1px solid #e0e0e0;
}
.pretransform-toggle {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 16px;
  background: #f9f9f9; border: none; cursor: pointer; text-align: left;
  transition: background 0.15s; font-size: 13px;
}
.pretransform-toggle:hover { background: #f0f0f0; }
.pretransform-chevron { font-size: 11px; color: #888; width: 12px; flex-shrink: 0; }
.pretransform-label { font-weight: 700; color: #333; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
.pretransform-badge {
  font-size: 10px; background: #e8f0fe; color: #1a73e8; border: 1px solid #c5d8f6;
  border-radius: 4px; padding: 1px 7px; font-weight: 600;
}
.pretransform-hint { font-size: 11px; color: #888; flex: 1; }
.pretransform-hint code { font-family: monospace; background: rgba(0,0,0,0.06); padding: 1px 4px; border-radius: 2px; }
.pretransform-editor-area { height: 90px; }

/* Main Monaco editor */
.tbe-editor-area { flex: 1; min-height: 300px; }

/* ── Footer ───────────────────────────────────────────────────────────── */
.tbe-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 18px; border-top: 1px solid #e0e0e0; background: #f5f5f5;
  flex-shrink: 0; gap: 12px;
}
.tbe-footer-hint { font-size: 12px; color: #888; flex: 1; }
.tbe-footer-hint code { font-family: monospace; background: #e8e8e8; padding: 1px 5px; border-radius: 2px; color: #555; }
.tbe-footer-hint em, .tbe-footer-hint strong { color: #1a73e8; font-style: normal; }
.tbe-footer-actions { display: flex; gap: 8px; flex-shrink: 0; }
.btn-cancel {
  padding: 6px 16px; background: #fff; color: #555; border: 1px solid #c8c8c8;
  border-radius: 5px; font-size: 13px; cursor: pointer;
}
.btn-cancel:hover { border-color: #888; }
.btn-save {
  padding: 6px 20px; background: #1a73e8; color: #fff; border: none; border-radius: 5px;
  font-size: 13px; font-weight: 700; cursor: pointer;
}
.btn-save:hover { background: #1557b0; }

/* ── Hover Display section ───────────────────────────────────────────── */
.hover-display-section {
  margin-top: 14px; padding-top: 12px;
  border-top: 1px solid #e0e0e0;
}
.hover-display-header {
  display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;
}
.hover-display-title {
  font-size: 12px; font-weight: 700; color: #1a1a1a;
}
.hover-display-hint {
  font-size: 10px; color: #888;
}
.hover-chips {
  display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px;
}
.hover-chip {
  display: flex; align-items: center; gap: 4px;
  background: #e8f0fe; border: 1px solid #c5d5f5; border-radius: 12px;
  padding: 2px 8px 2px 10px; font-size: 11px; color: #1a56b0;
}
.hover-chip-del {
  background: none; border: none; color: #6a8fcc; cursor: pointer;
  font-size: 10px; padding: 0; line-height: 1;
}
.hover-chip-del:hover { color: #d93025; }
.hover-empty {
  font-size: 11px; color: #aaa; font-style: italic; padding: 2px 0;
}
.hover-add-row {
  display: flex; gap: 5px; align-items: center; flex-wrap: nowrap;
}
/* subsystem trigger wrapper — shrink-0 so it doesn't collapse */
.hover-sub-wrap {
  flex-shrink: 0; position: relative;
}
.hover-sub-trigger {
  max-width: 130px; min-width: 100px; font-size: 11px;
}
/* mnemonic trigger stretches to fill remaining space */
.hover-mnem-trigger {
  flex: 1; min-width: 0; font-size: 12px;
}
.hover-add-btn {
  padding: 4px 10px; background: #1a73e8; color: #fff;
  border: none; border-radius: 4px; font-size: 11px;
  font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0;
}
.hover-add-btn:disabled { opacity: 0.45; cursor: default; }
.hover-add-btn:not(:disabled):hover { background: #1557b0; }

/* ── Telecommands section ─────────────────────────────────────────────── */
.tc-section {
  margin-top: 14px; padding-top: 12px;
  border-top: 1px solid #e0e0e0;
}
.tc-chip {
  background: #fff3e0; border-color: #f4c66a; color: #b45309;
}
.tc-chip .hover-chip-del { color: #c9843a; }
.tc-chip .hover-chip-del:hover { color: #c0392b; }

/* ── DataGrid guided row editor ──────────────────────────────────────── */
.dg-guided-area { }
.dg-section-header { display: flex; align-items: baseline; gap: 8px; margin: 10px 0 6px; }
.dg-section-title { font-size: 12px; font-weight: 700; color: #1a1a1a; }
.dg-section-hint { font-size: 10px; color: #888; }
.dg-empty-hint { font-size: 11px; color: #aaa; font-style: italic; padding: 6px 0 8px; }
.dg-guided-row {
  display: flex; align-items: flex-start; gap: 6px;
  padding: 6px 0; border-bottom: 1px solid #e8e8e8;
}
.dg-row-num {
  font-size: 10px; color: #aaa; min-width: 18px;
  padding-top: 7px; text-align: center; flex-shrink: 0;
}
.dg-row-body { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.dg-row-label-input {
  background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px;
  color: #1a1a1a; font-size: 11px; padding: 4px 7px; width: 100%;
  outline: none; box-sizing: border-box;
}
.dg-row-label-input:focus { border-color: #1a73e8; }
.dg-topic-btn { font-size: 11px !important; padding: 4px 8px !important; min-height: 28px; }
.dg-topic-opt .guided-mnem-trigger-label { color: #999 !important; font-style: italic; }
.dg-topic-opt.has-value .guided-mnem-trigger-label { color: inherit !important; font-style: normal; }
.dg-row-del-btn {
  background: none; border: none; color: #ccc; font-size: 18px;
  cursor: pointer; padding: 2px 4px; flex-shrink: 0; margin-top: 2px; line-height: 1;
}
.dg-row-del-btn:hover { color: #d93025; }
.dg-add-row-form {
  margin-top: 10px; padding: 10px;
  background: #f5f9ff; border: 1px dashed #b3caf5; border-radius: 5px;
  display: flex; flex-direction: column; gap: 6px;
}
.dg-add-form-hint {
  font-size: 10px; font-weight: 700; color: #5a7ab8;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.dg-new-label-input {
  background: #fff; border: 1px solid #ddd; border-radius: 4px;
  color: #1a1a1a; font-size: 11px; padding: 4px 7px; width: 100%;
  outline: none; box-sizing: border-box;
}
.dg-new-label-input:focus { border-color: #1a73e8; }
.dg-add-btn {
  padding: 6px; margin-top: 2px;
  background: rgba(26,115,232,0.08); color: #1a73e8;
  border: 1px dashed rgba(26,115,232,0.35); border-radius: 4px;
  font-size: 11px; font-weight: 600; cursor: pointer;
}
.dg-add-btn:hover:not(:disabled) { background: rgba(26,115,232,0.15); }
.dg-add-btn:disabled { opacity: 0.35; cursor: default; }

/* Row value options (decimals + display mode) */
.dg-row-opts {
  display: flex; align-items: center; gap: 10px; margin-top: 2px;
}
.dg-opt-label {
  display: flex; align-items: center; gap: 4px;
}
.dg-opt-text { font-size: 10px; color: #999; white-space: nowrap; }
.dg-decimals-input {
  width: 46px; font-size: 10px; padding: 2px 5px;
  border: 1px solid #ddd; border-radius: 4px; outline: none;
  background: #fff; color: #1a1a1a; text-align: center;
}
.dg-decimals-input:focus { border-color: #1a73e8; }
.dg-mode-toggle {
  display: flex; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;
}
.dg-mode-btn {
  display: flex; align-items: center; gap: 3px;
  padding: 2px 8px; font-size: 10px; font-weight: 500;
  background: none; border: none; color: #999; cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.dg-mode-btn.active { background: #e8f0fe; color: #1a73e8; }
.dg-mode-btn:hover:not(.active) { background: #f5f5f5; color: #555; }
.dg-led-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%;
  background: #ccc; transition: background 0.15s;
}
.dg-led-dot.active { background: #00c853; box-shadow: 0 0 4px #00c853; }

/* ── LED condition panel ──────────────────────────────────────────────── */
.dg-led-panel {
  margin-top: 6px; padding: 8px 10px;
  background: #f0f6ff; border: 1px solid #c5d9f5; border-radius: 5px;
  display: flex; flex-direction: column; gap: 5px;
}
.dg-led-panel-header {
  display: flex; align-items: center; justify-content: space-between;
}
.dg-led-panel-title {
  font-size: 10px; font-weight: 700; color: #3a5a9a; text-transform: uppercase; letter-spacing: 0.05em;
}
.dg-led-autobtn {
  font-size: 10px; padding: 2px 8px; cursor: pointer;
  background: #1a73e8; color: #fff; border: none; border-radius: 3px;
  font-weight: 600;
}
.dg-led-autobtn:hover { background: #1557b0; }
.dg-led-cond-row {
  display: flex; align-items: center; gap: 6px;
}
.dg-led-indicator { font-size: 13px; flex-shrink: 0; }
.dg-led-on  { color: #00c853; }
.dg-led-off { color: #d93025; }
.dg-led-cond-label {
  font-size: 10px; color: #555; white-space: nowrap; min-width: 52px; flex-shrink: 0;
}
.dg-led-cond-input {
  flex: 1; font-size: 10px; font-family: 'Courier New', monospace;
  padding: 3px 7px; border: 1px solid #c5d9f5; border-radius: 4px;
  background: #fff; color: #1a1a1a; outline: none;
}
.dg-led-cond-input:focus { border-color: #1a73e8; }
.dg-led-chips {
  display: flex; flex-wrap: wrap; align-items: center; gap: 4px;
  padding-left: 19px;
}
.dg-led-chips-hint { font-size: 9px; color: #999; }
.dg-led-chip {
  font-size: 10px; padding: 1px 7px;
  border: 1px solid #c5d9f5; border-radius: 10px;
  background: #fff; color: #3a5a9a; cursor: pointer;
  font-family: 'Courier New', monospace;
  transition: background 0.12s, color 0.12s;
}
.dg-led-chip:hover { background: #ddeaff; }
.dg-led-chip.active { background: #1a73e8; color: #fff; border-color: #1a73e8; }
.dg-led-panel-hint {
  font-size: 9px; color: #999; font-style: italic; padding-top: 2px;
}
.dg-led-panel-hint code { background: #e8edf5; padding: 0 3px; border-radius: 2px; font-style: normal; }
</style>
