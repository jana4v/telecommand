// generate_tpd.js  –  SPASDACS Nova  Test Plan Document
// Doc No: SCG-GRCD2-SW-2025-05  |  Version 2.0  |  March 2026
'use strict';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, LevelFormat, TableOfContents,
  PageBreak
} = require('docx');
const fs = require('fs');

// ── Colors ────────────────────────────────────────────────────────────────
const C = {
  navy:     '1A1A2E', blue:     '2E75B6', lightBlue: 'BDD7EE',
  teal:     '00A99D', white:    'FFFFFF', offWhite:  'F2F7FC',
  gray:     'D6DCE4', darkGray: '595959', black:     '000000',
  orange:   'C45911', orangeBg: 'FCE4D6', green:     '375623',
  greenBg:  'E2EFDA', purple:   '5B2C6F', purpleBg:  'EBD5F5',
  red:      'C00000', redBg:    'FFE7E7', yellow:    'BF8F00',
  yellowBg: 'FFF2CC',
};
const thinBorder  = { style: BorderStyle.SINGLE, size: 1, color: C.gray };
const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorder    = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders   = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ── Text helpers ──────────────────────────────────────────────────────────
const sp   = (text, opts = {}) => new TextRun({ text, font: 'Arial', size: 22, ...opts });
const bold = (text, opts = {}) => sp(text, { bold: true, ...opts });
const mono = (text) => new TextRun({ text, font: 'Courier New', size: 20, color: C.darkGray });

function para(children, opts = {}) {
  const arr = typeof children === 'string' ? [sp(children)] : children;
  return new Paragraph({ children: arr, spacing: { after: 100 }, ...opts });
}
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text, font: 'Arial', size: 32, bold: true, color: C.navy })],
    spacing: { before: 360, after: 180 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.blue, space: 6 } } });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, font: 'Arial', size: 26, bold: true, color: C.blue })],
    spacing: { before: 240, after: 120 } });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, font: 'Arial', size: 24, bold: true, color: C.darkGray })],
    spacing: { before: 180, after: 80 } });
}
function bullet(text, level = 0) {
  return new Paragraph({ numbering: { reference: 'bullets', level },
    children: [sp(text)], spacing: { after: 60 } });
}
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }
function spacer()    { return new Paragraph({ children: [], spacing: { after: 120 } }); }
function divider()   {
  return new Paragraph({ spacing: { after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.lightBlue, space: 4 } },
    children: [] });
}

// ── Table cell helpers ────────────────────────────────────────────────────
function hCell(text, w, color = C.navy) {
  return new TableCell({ borders: cellBorders, width: { size: w, type: WidthType.DXA },
    shading: { fill: color, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [sp(text, { bold: true, color: C.white })], alignment: AlignmentType.CENTER })] });
}
function dCell(text, w, shade = C.white, align = AlignmentType.LEFT) {
  return new TableCell({ borders: cellBorders, width: { size: w, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [sp(text)], alignment: align })] });
}
function dCellRuns(runs, w, shade = C.white) {
  return new TableCell({ borders: cellBorders, width: { size: w, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: runs })] });
}

// ── Cover page ────────────────────────────────────────────────────────────
function makeCover() {
  const line = (text, size, color, spacing = 60) =>
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: spacing },
      children: [new TextRun({ text, font: 'Arial', size, bold: true, color })] });

  return [
    spacer(), spacer(), spacer(),
    line('UR RAO SATELLITE CENTRE', 24, C.navy),
    line('INDIAN SPACE RESEARCH ORGANISATION, BANGALORE', 22, C.darkGray, 200),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.blue, space: 4 } },
      children: [] }),
    spacer(),
    line('TEST PLAN DOCUMENT', 28, C.blue, 80),
    line('SPAcecraft Status Display And Commanding Software', 36, C.navy, 60),
    line('NOVA (Version 2.0)', 30, C.teal, 200),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.lightBlue, space: 4 } },
      children: [] }),
    spacer(),
    // Metadata table
    new Table({
      width: { size: 6000, type: WidthType.DXA },
      columnWidths: [2400, 3600],
      rows: [
        ['Document Number', 'SCG-GRCD2-SW-2025-05'],
        ['Version',         '2.0'],
        ['Date',            'March 2026'],
        ['Status',          'Approved'],
        ['Organization',    'GEOSAT RF & Payload Checkout Division-2, SCG'],
      ].map(([k, v]) => new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 2400, type: WidthType.DXA },
          shading: { fill: C.offWhite, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [para([bold(k)])] }),
        new TableCell({ borders: cellBorders, width: { size: 3600, type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [para(v)] }),
      ]})),
    }),
    spacer(), spacer(),
    line('COMMITTED TO TOTAL QUALITY AND ZERO DEFECT IN SPACE SYSTEMS AND SERVICES', 18, C.darkGray),
    pageBreak(),
  ];
}

// ── Change history ────────────────────────────────────────────────────────
function makeChangeHistory() {
  return [
    h1('Change History'),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [1200, 1200, 2400, 1560, 3000],
      rows: [
        new TableRow({ children: [
          hCell('Version', 1200), hCell('Date', 1200), hCell('Affected Section', 2400),
          hCell('Nature', 1560), hCell('Description', 3000),
        ]}),
        new TableRow({ children: [
          dCell('2.0', 1200, C.offWhite, AlignmentType.CENTER),
          dCell('March 2026', 1200, C.offWhite),
          dCell('All', 2400, C.offWhite),
          dCell('New', 1560, C.offWhite, AlignmentType.CENTER),
          dCell('Initial release for SPASDACS Nova (v2.0)', 3000, C.offWhite),
        ]}),
      ],
    }),
    spacer(),
    para([sp('A = Addition    M = Modification    D = Deletion', { italics: true, color: C.darkGray, size: 20 })]),
    pageBreak(),
  ];
}

// ── Section 1: Introduction ───────────────────────────────────────────────
function makeIntro() {
  return [
    h1('1. Introduction'),
    h2('1.1 Purpose'),
    para('This Test Plan Document (TPD) defines the test strategy, test scope, test approach, test cases, and test environment for SPASDACS Nova (Version 2.0). It provides the framework for verifying that the software meets all requirements specified in the Software Requirements Specification (SRS, Doc No: SCG-GRCD2-SW-2025-03) and fulfils the intent of the Functional Requirements Document (FRD, Doc No: SCG-GRCD2-SW-2025-02).'),
    spacer(),
    h2('1.2 Scope'),
    para('The scope of testing covers all functional and non-functional aspects of SPASDACS Nova including:'),
    bullet('Frontend Vue 3 Single Page Application (SPA) running in a modern browser'),
    bullet('AntV X6 diagram canvas — node creation, editing, linking, grouping, and persistence'),
    bullet('Telemetry binding engine — real-time NATS telemetry to visual property mapping'),
    bullet('Identity and Access Management (IAM) — authentication, JWT lifecycle, RBAC'),
    bullet('Viewer mode — unauthenticated read-only access with live telemetry'),
    bullet('Telecommanding (TC) — command queue, UMACS TC interface'),
    bullet('Backend Gateway REST API — diagram CRUD, mnemonic catalog, TM upload'),
    bullet('Auto View — automatic diagram cycling'),
    bullet('Real-time NATS connectivity — subscriptions, heartbeat, reconnect behaviour'),
    spacer(),
    h2('1.3 References'),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2400, 4560, 2400],
      rows: [
        new TableRow({ children: [hCell('Doc No', 2400), hCell('Title', 4560), hCell('Version', 2400)] }),
        ...[
          ['SCG-GRCD2-SW-2025-02', 'Functional Requirements Document - SPASDACS Nova', '2.0'],
          ['SCG-GRCD2-SW-2025-03', 'Software Requirements Specification - SPASDACS Nova', '2.0'],
          ['SCG-GRCD2-SW-2025-04', 'Software Design Document - SPASDACS Nova', '2.0'],
          ['SCG-GRCD2-SW-2021-03', 'Test Case Document - SPASDACS v1.0 (Reference)', '1.0'],
        ].map(([id, title, ver]) => new TableRow({ children: [
          dCell(id, 2400, C.offWhite), dCell(title, 4560, C.offWhite), dCell(ver, 2400, C.offWhite, AlignmentType.CENTER),
        ]})),
      ],
    }),
    spacer(),
    h2('1.4 Definitions and Abbreviations'),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2000, 7360],
      rows: [
        new TableRow({ children: [hCell('Term / Acronym', 2000), hCell('Definition', 7360)] }),
        ...[
          ['SPASDACS', 'SPAcecraft Status Display And Commanding Software'],
          ['TPD',      'Test Plan Document'],
          ['SRS',      'Software Requirements Specification'],
          ['SDD',      'Software Design Document'],
          ['FRD',      'Functional Requirements Document'],
          ['TC',       'Telecommand'],
          ['TM',       'Telemetry'],
          ['IAM',      'Identity and Access Management'],
          ['JWT',      'JSON Web Token'],
          ['RBAC',     'Role-Based Access Control'],
          ['NATS',     'Neural Autonomic Transport System (message broker)'],
          ['SPA',      'Single Page Application'],
          ['UMACS',    'Unified Mission Automation and Control System'],
          ['DUT',      'Device Under Test'],
          ['SUT',      'System Under Test'],
          ['Pass',     'Test step result matches expected result'],
          ['Fail',     'Test step result does not match expected result'],
          ['Pending',  'Test not yet executed'],
          ['N/A',      'Not Applicable'],
        ].map(([k, v]) => new TableRow({ children: [
          dCell(k, 2000, C.offWhite), dCell(v, 7360),
        ]})),
      ],
    }),
    pageBreak(),
  ];
}

// ── Section 2: Test Items ─────────────────────────────────────────────────
function makeTestItems() {
  return [
    h1('2. Test Items'),
    para('The following software components constitute the System Under Test (SUT) for SPASDACS Nova:'),
    spacer(),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [800, 2200, 3560, 2800],
      rows: [
        new TableRow({ children: [hCell('No.', 800), hCell('Component', 2200), hCell('Description', 3560), hCell('Technology', 2800)] }),
        ...[
          ['1',  'Frontend SPA',          'Vue 3 + TypeScript browser application',                       'Vue 3.5, Vite, TypeScript'],
          ['2',  'AntV X6 Canvas',        'Diagram editor with 30 SCADA node types',                      '@antv/x6 v2.18.1'],
          ['3',  'Telemetry Engine',       'Real-time NATS-to-node property binding engine',               'nats.ws 1.30.2, GSAP 3'],
          ['4',  'IAM Service',            'Authentication, JWT issuance, RBAC enforcement',               'Go, Casbin v2, MongoDB'],
          ['5',  'Gateway Service',        'REST API proxy and diagram storage backend',                   'Go, chi router, MongoDB'],
          ['6',  'Ingest Service',         'WebSocket TM ingestion and Redis cache writer',                'Go, Redis 7'],
          ['7',  'NATS Broker',            'Real-time pub/sub message backbone',                          'NATS JetStream'],
          ['8',  'UMACS-TC Service',       'Telecommand dispatch to spacecraft TC system',                 'Go, UMACS API'],
          ['9',  'Storage Service',        'Time-series telemetry archival',                               'Go, InfluxDB 3 OSS'],
          ['10', 'Launcher',               'Process supervisor for all microservices',                     'Go'],
        ].map(([n, comp, desc, tech]) => new TableRow({ children: [
          dCell(n, 800, C.offWhite, AlignmentType.CENTER),
          dCell(comp, 2200, C.offWhite),
          dCell(desc, 3560),
          dCell(tech, 2800),
        ]})),
      ],
    }),
    pageBreak(),
  ];
}

// ── Section 3 & 4: Features ───────────────────────────────────────────────
function makeFeatures() {
  return [
    h1('3. Features to be Tested'),
    para('The following features are in scope for this test plan:'),
    spacer(),
    h2('3.1 Authentication and Access Control'),
    bullet('Login with valid/invalid credentials'),
    bullet('JWT token issuance and refresh (15-minute access token, 7-day refresh token)'),
    bullet('Logout and token invalidation'),
    bullet('Role-based access enforcement (super_admin, admin, operator, viewer)'),
    bullet('Password change'),
    bullet('Session persistence across page reload'),
    bullet('Unauthenticated viewer mode access'),
    spacer(),
    h2('3.2 Diagram Management'),
    bullet('Create, save, load, and delete diagrams'),
    bullet('Diagram list display on landing page'),
    bullet('Export diagram as JSON file'),
    bullet('Import diagram from JSON file'),
    bullet('Auto View include/exclude and duration configuration per diagram'),
    spacer(),
    h2('3.3 Canvas and Node Operations'),
    bullet('Drag and drop SCADA nodes from palette to canvas'),
    bullet('Node move, resize (Transform plugin), and delete'),
    bullet('Multi-select with rubber-band selection (Selection plugin)'),
    bullet('Undo/Redo history (History plugin, depth 50)'),
    bullet('Copy/Paste nodes (Clipboard plugin)'),
    bullet('Group and Ungroup nodes'),
    bullet('Z-order operations (Bring to Front, Send to Back, Raise, Lower)'),
    bullet('Zoom in/out and Fit-to-View'),
    bullet('Grid toggle'),
    bullet('Edge creation and deletion between nodes'),
    bullet('Snapline alignment aid (Snapline plugin)'),
    bullet('Keyboard shortcuts (Delete, Ctrl+Z/Y/C/X/V/G/A)'),
    spacer(),
    h2('3.4 Node Properties and Inspector'),
    bullet('Edit label text per node'),
    bullet('Edit fill color, stroke color, and stroke width'),
    bullet('Edit node geometry (width, height)'),
    bullet('Assign single and multiple telemetry bindings'),
    bullet('Configure binding rules (condition-based value mapping)'),
    bullet('Write and validate custom JavaScript transform scripts'),
    bullet('Category-specific properties (valve state, tank level, meter angle, LED state, etc.)'),
    spacer(),
    h2('3.5 Telemetry Binding Engine'),
    bullet('NATS subscription to tm_map subject (full snapshot and delta)'),
    bullet('Heartbeat status subscription and display'),
    bullet('Property classification: COLOR, NUMERIC, BOOLEAN, GEO'),
    bullet('Fill color binding with predefined, named, hex (#RRGGBB), and rgb(r,g,b) formats'),
    bullet('Fill color binding with more than two states (multi-state)'),
    bullet('Stroke color binding with all color formats'),
    bullet('Numeric value display with easeOutCubic tweening animation (500 ms)'),
    bullet('Node visibility (hide/show) driven by telemetry'),
    bullet('Rotation/angle binding with GSAP momentum animation'),
    bullet('GEO offset (X/Y position shift) driven by telemetry'),
    bullet('CSS dashed-edge flow animation reflecting telemetry state'),
    bullet('Telemetry store consistency (mnemonic-to-value map)'),
    bullet('NATS reconnect and snapshot re-subscription on disconnect'),
    spacer(),
    h2('3.6 Viewer Mode'),
    bullet('Public access to diagram viewer without authentication'),
    bullet('Unauthenticated viewer banner displayed'),
    bullet('TC Queue button hidden for unauthenticated users'),
    bullet('Live telemetry updates visible in viewer mode'),
    bullet('Auto-hiding top bar on inactivity'),
    bullet('Read-only canvas (no edit tools)'),
    spacer(),
    h2('3.7 Telecommanding'),
    bullet('TC Queue panel visibility for Operator and above roles only'),
    bullet('Add command to queue via node context menu'),
    bullet('Reorder commands in queue via drag-and-drop'),
    bullet('Delete individual commands from queue'),
    bullet('Clear entire command queue'),
    bullet('Execute queued TC command through UMACS-TC API'),
    bullet('TC command blocked for viewer role and unauthenticated users'),
    spacer(),
    h2('3.8 Auto View'),
    bullet('Automatic cycling through diagrams flagged autoViewInclude = true'),
    bullet('Per-diagram display duration (autoViewDuration in seconds)'),
    bullet('Pause and Resume auto view'),
    bullet('Auto view with single qualifying diagram (no cycling)'),
    spacer(),
    h2('3.9 Backend API'),
    bullet('Diagram CRUD endpoints (GET, POST/upsert, DELETE)'),
    bullet('Diagram metadata patch (PATCH autoViewInclude, autoViewDuration)'),
    bullet('Mnemonic catalog query endpoint'),
    bullet('TM CSV/JSON upload endpoint'),
    bullet('IAM auth endpoints (login, refresh, logout, me, change-password)'),
    bullet('IAM user/role management endpoints'),
    bullet('Gateway health/readiness endpoint'),
    spacer(),
    h1('4. Features Not to be Tested'),
    para('The following items are explicitly excluded from the current test cycle:'),
    bullet('Hardware-in-the-loop spacecraft interface (simulated via UMACS emulator only)'),
    bullet('InfluxDB time-series query and historical playback (deferred to future release)'),
    bullet('NATS JetStream persistence and replay'),
    bullet('Multi-tenant or multi-mission configuration'),
    bullet('Mobile or touch-device browser rendering'),
    bullet('Load/stress testing beyond 500 concurrent parameters'),
    bullet('Accessibility (WCAG) compliance testing'),
    bullet('Internationalisation / localisation'),
    pageBreak(),
  ];
}

// ── Section 5: Test Approach ──────────────────────────────────────────────
function makeApproach() {
  return [
    h1('5. Test Approach'),
    para('Testing follows a layered V-model strategy progressing from unit-level through integration and system testing to User Acceptance Testing (UAT).'),
    spacer(),
    h2('5.1 Unit Testing'),
    para('Individual functions and composables are verified in isolation using Vitest (frontend) and Go test (backend). Scope includes:'),
    bullet('Telemetry binding evaluation logic (parseRule, applyValues, coerceValue)'),
    bullet('Color coercion helpers (color format normalisation)'),
    bullet('Tween interpolation function (easeOutCubic)'),
    bullet('IAM service: JWT signing, bcrypt verification, Casbin policy evaluation'),
    bullet('Ingest parser functions: ParseTMPacket, ParseSCOSPacket'),
    bullet('Unified TM map write rules (SRS Section 9.2 suffix logic)'),
    spacer(),
    h2('5.2 Integration Testing'),
    para('Component interfaces are verified end-to-end across service boundaries:'),
    bullet('Frontend auth service ↔ IAM REST API (login, token refresh, RBAC)'),
    bullet('DiagramStorage ↔ Gateway API (CRUD round-trips)'),
    bullet('Ingest service ↔ Redis ↔ NATS publisher pipeline'),
    bullet('Telemetry engine ↔ NATS broker (subscribe, receive, apply)'),
    bullet('UMACS-TC service ↔ TC emulator (command dispatch, response)'),
    spacer(),
    h2('5.3 System Testing'),
    para('Full-system test with all services running under the Launcher. Each test case in Section 13 is executed against the running system. Priority classification:'),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [1400, 5160, 2800],
      rows: [
        new TableRow({ children: [hCell('Priority', 1400), hCell('Criteria', 5160), hCell('Examples', 2800)] }),
        ...[
          ['High',   'Core functionality; failure blocks mission operations',        'Telemetry binding, Auth login, TM display'],
          ['Medium', 'Important feature; workaround exists',                          'Copy/paste, Z-order, Auto View'],
          ['Low',    'Enhancement or cosmetic; no operational impact',               'Snapline, grid toggle, tooltip'],
        ].map(([p, c, e]) => new TableRow({ children: [
          dCell(p, 1400, p === 'High' ? C.redBg : p === 'Medium' ? C.yellowBg : C.greenBg),
          dCell(c, 5160), dCell(e, 2800),
        ]})),
      ],
    }),
    spacer(),
    h2('5.4 Regression Testing'),
    para('On every code merge to the main branch, the High-priority test cases (marked H in the test case tables) are re-executed to detect regressions before release.'),
    spacer(),
    h2('5.5 User Acceptance Testing (UAT)'),
    para('UAT is conducted by GEOSAT operations personnel using realistic spacecraft TM/TC scenarios. Acceptance criteria are defined in Section 6.'),
    pageBreak(),
  ];
}

// ── Section 6–9: Criteria, Suspension, Deliverables, Environment ──────────
function makeCriteriaEtc() {
  return [
    h1('6. Item Pass / Fail Criteria'),
    h2('6.1 Pass Criteria'),
    bullet('All High-priority test cases execute with status Pass.'),
    bullet('Greater than or equal to 90% of Medium-priority test cases pass.'),
    bullet('All security test cases (authentication, authorisation) pass.'),
    bullet('No data loss or corruption occurs during save/load cycles.'),
    bullet('Telemetry values rendered in the browser are numerically equal to NATS-published values within the tween window (500 ms).'),
    bullet('TC commands are not executable by viewer-role or unauthenticated sessions.'),
    spacer(),
    h2('6.2 Fail Criteria'),
    bullet('Any High-priority test case fails without an accepted waiver.'),
    bullet('Authentication or authorisation bypass is demonstrated.'),
    bullet('Telemetry values are rendered incorrectly for more than 1% of samples in a 5-minute test window.'),
    bullet('Any crash, unhandled exception, or data corruption is observed.'),
    spacer(),
    h1('7. Suspension and Resumption Criteria'),
    h2('7.1 Suspension'),
    para('Testing is suspended when:'),
    bullet('A blocker defect prevents execution of more than 25% of planned test cases.'),
    bullet('The test environment (NATS, Redis, MongoDB) becomes unavailable.'),
    bullet('A security vulnerability is discovered that requires immediate remediation.'),
    spacer(),
    h2('7.2 Resumption'),
    para('Testing resumes when:'),
    bullet('Blocker defects have been fixed and verified in an updated build.'),
    bullet('Test environment services have been restored and health-checked.'),
    bullet('The Test Lead confirms the build is stable enough to proceed.'),
    spacer(),
    h1('8. Test Deliverables'),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [3960, 3600, 1800],
      rows: [
        new TableRow({ children: [hCell('Deliverable', 3960), hCell('Description', 3600), hCell('Owner', 1800)] }),
        ...[
          ['Test Plan Document (this document)',    'Strategy, scope, environment, test cases',     'Test Lead'],
          ['Executed Test Case Sheets',             'Completed TC tables with actual results',       'Test Engineer'],
          ['Defect Report',                         'All defects logged with severity and status',   'Test Engineer'],
          ['Test Summary Report',                   'Pass/fail counts, coverage metrics, sign-off',  'Test Lead'],
          ['Test Completion Certificate',           'Formal sign-off from Test Lead and PM',         'Test Lead / PM'],
        ].map(([d, desc, o]) => new TableRow({ children: [
          dCell(d, 3960, C.offWhite), dCell(desc, 3600), dCell(o, 1800, C.offWhite),
        ]})),
      ],
    }),
    spacer(),
    h1('9. Test Environment'),
    h2('9.1 Hardware'),
    bullet('Test PC: Intel Core i7 or equivalent, 16 GB RAM, 100 Mbps LAN'),
    bullet('Browser: Google Chrome latest stable or Mozilla Firefox latest stable'),
    spacer(),
    h2('9.2 Software Services'),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2400, 2560, 2000, 2400],
      rows: [
        new TableRow({ children: [hCell('Service', 2400), hCell('Version', 2560), hCell('Port', 2000), hCell('Notes', 2400)] }),
        ...[
          ['NATS Server',          '2.10+',   '4222 / 9222 (WS)', 'JetStream enabled'],
          ['Redis',                '7.x',     '6379',              'No auth (local only)'],
          ['MongoDB',              '7.x',     '27017',             'astra + iam databases'],
          ['InfluxDB 3 OSS',       '3.x',     '8086',              'Optional for storage tests'],
          ['UMACS-TC Emulator',    '1.0',     '8090',              'Standalone TC mock'],
          ['SPASDACS Nova (all)',  '2.0',     '80 (gateway)',       'Launched via launcher binary'],
        ].map(([s, v, p, n]) => new TableRow({ children: [
          dCell(s, 2400, C.offWhite), dCell(v, 2560), dCell(p, 2000, C.offWhite, AlignmentType.CENTER), dCell(n, 2400),
        ]})),
      ],
    }),
    spacer(),
    h2('9.3 Test Data'),
    bullet('Simulated TM stream generated by the SPASDACS Nova Simulator service (chains: SIM_TM1, SIM_TM2)'),
    bullet('Test user accounts pre-seeded: admin@test / operator@test / viewer@test'),
    bullet('Sample diagrams available in test/fixtures/ directory'),
    pageBreak(),
  ];
}

// ── Section 10–12: Responsibilities, Schedule, Risks ─────────────────────
function makeOrgRisks() {
  return [
    h1('10. Responsibilities and Staffing'),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2400, 3360, 3600],
      rows: [
        new TableRow({ children: [hCell('Role', 2400), hCell('Responsibilities', 3360), hCell('Skills Required', 3600)] }),
        ...[
          ['Test Lead',      'Plan, review, sign-off, defect triage, summary report',    'Software testing, SPASDACS domain knowledge'],
          ['Test Engineer',  'Execute test cases, log defects, update result sheets',    'Web browser testing, REST API testing'],
          ['Dev Support',    'Fix defects, provide test builds, environment support',    'Go, Vue 3, NATS, Redis'],
          ['Operations Rep', 'UAT execution, operational scenario validation',           'Spacecraft operations, TM/TC experience'],
        ].map(([r, res, sk]) => new TableRow({ children: [
          dCell(r, 2400, C.offWhite), dCell(res, 3360), dCell(sk, 3600),
        ]})),
      ],
    }),
    spacer(),
    h1('11. Test Schedule'),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [3200, 2080, 2080, 2000],
      rows: [
        new TableRow({ children: [hCell('Activity', 3200), hCell('Start', 2080), hCell('End', 2080), hCell('Owner', 2000)] }),
        ...[
          ['Test environment setup and verification',      'Week 1', 'Week 1', 'Dev Support'],
          ['Unit test execution (frontend + backend)',      'Week 1', 'Week 2', 'Dev Support'],
          ['Integration test execution',                   'Week 2', 'Week 3', 'Test Engineer'],
          ['System test execution — AUTH, DIAG, CANVAS',   'Week 3', 'Week 4', 'Test Engineer'],
          ['System test execution — TLM, VIEW, TC, API',   'Week 4', 'Week 5', 'Test Engineer'],
          ['System test execution — NODE, AUTO',           'Week 5', 'Week 5', 'Test Engineer'],
          ['Defect fix and regression cycle',              'Week 6', 'Week 7', 'Dev Support / Test Engineer'],
          ['User Acceptance Testing (UAT)',                'Week 7', 'Week 8', 'Operations Rep'],
          ['Test Summary Report and sign-off',             'Week 8', 'Week 8', 'Test Lead'],
        ].map(([a, s, e, o]) => new TableRow({ children: [
          dCell(a, 3200, C.offWhite), dCell(s, 2080, C.offWhite, AlignmentType.CENTER),
          dCell(e, 2080, C.offWhite, AlignmentType.CENTER), dCell(o, 2000),
        ]})),
      ],
    }),
    spacer(),
    h1('12. Risks and Contingencies'),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [3400, 1200, 2360, 2400],
      rows: [
        new TableRow({ children: [hCell('Risk', 3400), hCell('Likelihood', 1200), hCell('Impact', 2360), hCell('Mitigation', 2400)] }),
        ...[
          ['NATS or Redis unavailable in test env',          'Low',    'Blocks TLM + VIEW tests',          'Docker Compose fallback environment'],
          ['UMACS-TC real system inaccessible',              'High',   'TC integration untested',           'Use UMACS-TC emulator service'],
          ['NATS.ws browser connection blocked by firewall', 'Medium', 'Browser TLM tests fail',            'Test on local loopback network'],
          ['IAM token timing sensitive on slow machines',    'Low',    '1–2 JWT refresh tests may fail',    'Increase test timeout to 30 s'],
          ['AntV X6 version API breaking change',            'Low',    'Canvas test steps may need update', 'Pin to x6 v2.18.1; review release notes'],
          ['Incomplete TM simulator coverage',               'Medium', 'Some binding tests lack live data', 'Extend simulator to cover all TM params'],
        ].map(([r, l, i, m]) => new TableRow({ children: [
          dCell(r, 3400),
          dCell(l, 1200, l === 'High' ? C.redBg : l === 'Medium' ? C.yellowBg : C.greenBg, AlignmentType.CENTER),
          dCell(i, 2360), dCell(m, 2400, C.offWhite),
        ]})),
      ],
    }),
    pageBreak(),
  ];
}

// ── Section 13: Test Cases ────────────────────────────────────────────────
// Helper: test case header block
function tcHeader(id, module, title, priority, desc, prereqs) {
  const priColor = priority === 'High' ? C.redBg : priority === 'Medium' ? C.yellowBg : C.greenBg;
  return [
    divider(),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [1400, 2160, 3000, 800, 2000],
      rows: [new TableRow({ children: [
        hCell('TC ID', 1400, C.navy),
        hCell('Module', 2160, C.navy),
        hCell('Test Title', 3000, C.navy),
        hCell('Pri.', 800, C.navy),
        hCell('Designed By', 2000, C.navy),
      ]})],
    }),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [1400, 2160, 3000, 800, 2000],
      rows: [new TableRow({ children: [
        dCell(id, 1400, C.offWhite, AlignmentType.CENTER),
        dCell(module, 2160, C.offWhite),
        dCell(title, 3000),
        dCell(priority, 800, priColor, AlignmentType.CENTER),
        dCell('Test Engineer', 2000, C.offWhite),
      ]})],
    }),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [1400, 7960],
      rows: [
        new TableRow({ children: [hCell('Description', 1400, C.blue), dCell(desc, 7960)] }),
        new TableRow({ children: [hCell('Pre-requisites', 1400, C.blue), dCell(prereqs, 7960, C.offWhite)] }),
      ],
    }),
  ];
}

// Helper: step table
function stepsTable(steps) {
  // steps: [{step, action, data, expected}]
  const W = [400, 2560, 1800, 2400, 1400, 800];
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: W,
    rows: [
      new TableRow({ children: [
        hCell('Step', W[0], C.teal), hCell('Test Action', W[1], C.teal),
        hCell('Test Data', W[2], C.teal), hCell('Expected Result', W[3], C.teal),
        hCell('Actual Result', W[4], C.teal), hCell('Status', W[5], C.teal),
      ]}),
      ...steps.map((s, i) => new TableRow({ children: [
        dCell(String(i + 1), W[0], C.offWhite, AlignmentType.CENTER),
        dCell(s.action, W[1]),
        dCell(s.data || '—', W[2], C.offWhite),
        dCell(s.expected, W[3]),
        dCell('—', W[4], C.offWhite, AlignmentType.CENTER),
        dCell('Pending', W[5], C.yellowBg, AlignmentType.CENTER),
      ]})),
    ],
  });
}

// ── AUTH test cases ───────────────────────────────────────────────────────
function makeAuthTCs() {
  const items = [];
  items.push(h1('13. Test Cases'), h2('13.1 Authentication and Access Control (TC-AUTH)'));

  // TC-AUTH-001
  items.push(...tcHeader('TC-AUTH-001','IAM','Login with valid credentials','High',
    'Verify that a registered user can log in with correct username and password and receives a JWT access token.',
    'SPASDACS Nova running. IAM service reachable. User account "operator@test" exists with password "Test@1234".'));
  items.push(stepsTable([
    { action: 'Navigate to http://<host>/login in a browser', expected: 'Login page is displayed with username and password fields and a Login button.' },
    { action: 'Enter username: operator@test', data: 'operator@test', expected: 'Username field is populated.' },
    { action: 'Enter password: Test@1234', data: 'Test@1234', expected: 'Password field is populated (masked).' },
    { action: 'Click the Login button', expected: 'Browser redirects to the Diagram List page. No error messages shown.' },
    { action: 'Open browser DevTools → Application → LocalStorage', expected: 'Key "spasdacs-auth-v1" exists and contains a JSON object with non-empty "accessToken" and "refreshToken" fields.' },
    { action: 'Inspect the accessToken JWT payload (base64-decode the middle segment)', expected: 'Payload contains "role":"operator", an "exp" approximately 15 minutes from now, and the correct "sub" (user ID).' },
  ]));
  items.push(spacer());

  // TC-AUTH-002
  items.push(...tcHeader('TC-AUTH-002','IAM','Login with invalid credentials','High',
    'Verify that login fails gracefully when incorrect credentials are supplied.',
    'SPASDACS Nova running. User account "operator@test" exists.'));
  items.push(stepsTable([
    { action: 'Navigate to the login page', expected: 'Login page displayed.' },
    { action: 'Enter username: operator@test and password: WrongPassword', data: 'operator@test / WrongPassword', expected: 'Fields populated.' },
    { action: 'Click Login button', expected: 'An error message "Invalid credentials" (or equivalent) is displayed. No redirect occurs. No token is stored in LocalStorage.' },
    { action: 'Attempt to navigate directly to /editor/test-diagram', expected: 'User is redirected back to the login page.' },
  ]));
  items.push(spacer());

  // TC-AUTH-003
  items.push(...tcHeader('TC-AUTH-003','IAM','JWT access token auto-refresh','High',
    'Verify that the frontend automatically refreshes the access token before expiry without requiring the user to re-login.',
    'Logged in as operator@test. Access token has a 15-minute TTL. Application is open.'));
  items.push(stepsTable([
    { action: 'Immediately after login, note the "exp" field in the accessToken JWT', expected: 'exp is approximately 15 minutes from now.' },
    { action: 'Wait 14 minutes without interacting with the application', expected: 'Application remains on the same page with no logout.' },
    { action: 'After 14 minutes, make any API call (e.g., open a diagram)', expected: 'The call succeeds. Checking LocalStorage shows a new accessToken with a refreshed "exp" value approximately 15 minutes in the future.' },
    { action: 'Manually set the localStorage accessToken to an expired token and make an API call', data: 'Modified expired JWT', expected: 'The application uses the refreshToken to obtain a new accessToken transparently. API call succeeds.' },
  ]));
  items.push(spacer());

  // TC-AUTH-004
  items.push(...tcHeader('TC-AUTH-004','IAM','Logout','Medium',
    'Verify that logout clears the session and revokes the refresh token.',
    'Logged in as operator@test.'));
  items.push(stepsTable([
    { action: 'Click the Logout button / user menu → Logout', expected: 'Browser redirects to the login page.' },
    { action: 'Check LocalStorage key "spasdacs-auth-v1"', expected: 'Key is absent or contains empty/null token fields.' },
    { action: 'Attempt to navigate to /editor/any-diagram', expected: 'Redirected to login page.' },
    { action: 'Attempt to use the old refreshToken directly against POST /iam/api/v1/auth/refresh', data: 'Old refreshToken value', expected: 'Response is HTTP 401 Unauthorized.' },
  ]));
  items.push(spacer());

  // TC-AUTH-005
  items.push(...tcHeader('TC-AUTH-005','IAM','Viewer role — no TC access','High',
    'Verify that a user with the viewer role cannot access the TC Queue or execute commands.',
    'Logged in as viewer@test (role: viewer).'));
  items.push(stepsTable([
    { action: 'Navigate to the viewer page for any diagram', expected: 'Diagram loads and telemetry displays normally.' },
    { action: 'Inspect the page for a TC Queue button', expected: 'TC Queue button is NOT visible on the page.' },
    { action: 'Attempt to call POST /umacs-tc/api/v1/queue directly with a Bearer token for viewer role', data: 'Valid viewer JWT', expected: 'Response is HTTP 403 Forbidden.' },
    { action: 'Attempt to access /editor/:id route', expected: 'Redirected to login page or shown an "Access Denied" message — editor route requires operator/admin/super_admin.' },
  ]));
  items.push(spacer());

  // TC-AUTH-006
  items.push(...tcHeader('TC-AUTH-006','IAM','Unauthenticated viewer — no TC access','High',
    'Verify that an unauthenticated user can view diagrams but cannot use the TC Queue.',
    'No user is logged in. Browser has no spasdacs-auth-v1 key in LocalStorage.'));
  items.push(stepsTable([
    { action: 'Navigate directly to /viewer/<diagram-id> without logging in', expected: 'Diagram viewer loads. A banner reading "You are viewing in read-only mode" (or equivalent) is displayed.' },
    { action: 'Verify real-time telemetry updates in the viewer', expected: 'Node colors/values update as telemetry changes. NATS connection is active.' },
    { action: 'Inspect the page for a TC Queue button', expected: 'TC Queue button is NOT present.' },
    { action: 'Inspect the page for an Edit / Editor toolbar', expected: 'No editing tools (palette, inspector, toolbar) are visible.' },
    { action: 'Attempt to navigate to /editor/<diagram-id>', expected: 'Redirected to the login page.' },
  ]));
  items.push(spacer());

  // TC-AUTH-007
  items.push(...tcHeader('TC-AUTH-007','IAM','Operator role — TC Queue visible','High',
    'Verify that an authenticated operator can see and use the TC Queue.',
    'Logged in as operator@test (role: operator). A diagram with TC-capable nodes is open.'));
  items.push(stepsTable([
    { action: 'Navigate to the viewer page', expected: 'Diagram loads.' },
    { action: 'Locate the TC Queue button on the top bar', expected: 'TC Queue button is visible.' },
    { action: 'Right-click on a node that has TC actions configured', expected: 'Context menu with TC action option appears.' },
    { action: 'Click the TC action to add a command to the queue', expected: 'Command is added to the TC Queue panel.' },
  ]));
  items.push(spacer());

  // TC-AUTH-008
  items.push(...tcHeader('TC-AUTH-008','IAM','Change password','Medium',
    'Verify that a logged-in user can successfully change their password.',
    'Logged in as operator@test.'));
  items.push(stepsTable([
    { action: 'Navigate to POST /iam/api/v1/auth/change-password with current and new password', data: 'current: Test@1234, new: NewPass@5678', expected: 'HTTP 200 OK response.' },
    { action: 'Logout from the application', expected: 'Logged out.' },
    { action: 'Attempt login with the old password (Test@1234)', data: 'Test@1234', expected: 'HTTP 401 Unauthorized. Login fails.' },
    { action: 'Login with the new password (NewPass@5678)', data: 'NewPass@5678', expected: 'Login succeeds. JWT returned.' },
    { action: 'Restore original password via change-password', data: 'current: NewPass@5678, new: Test@1234', expected: 'HTTP 200 OK.' },
  ]));
  items.push(spacer());

  return items;
}

// ── DIAG test cases ───────────────────────────────────────────────────────
function makeDiagTCs() {
  const items = [];
  items.push(h2('13.2 Diagram Management (TC-DIAG)'));

  items.push(...tcHeader('TC-DIAG-001','Diagram Mgmt','Create and save a new diagram','High',
    'Verify that a user can create a new blank diagram, add content, and save it to the backend.',
    'Logged in as operator@test. Gateway and MongoDB are running.'));
  items.push(stepsTable([
    { action: 'Navigate to the Diagram List page (root /)', expected: 'List of existing diagrams shown. A "New Diagram" or equivalent creation control is visible.' },
    { action: 'Click "New Diagram" and enter name "Test Diagram Alpha"', data: 'Test Diagram Alpha', expected: 'Editor page opens with a blank canvas.' },
    { action: 'Drag a "General Block" node from the palette onto the canvas', expected: 'Node appears on the canvas at the drop location.' },
    { action: 'Click the Save button (or press Ctrl+S equivalent)', expected: 'A success notification is shown. No error.' },
    { action: 'Reload the page and navigate back to the diagram', expected: 'Diagram "Test Diagram Alpha" is present in the list. Opening it shows the General Block node previously placed.' },
    { action: 'Via API: GET /api/go/v1/diagrams', expected: 'Response JSON array includes an entry with name "Test Diagram Alpha" and a valid non-empty "id".' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-DIAG-002','Diagram Mgmt','Delete a diagram','Medium',
    'Verify that a diagram can be permanently deleted.',
    'Logged in as admin@test. Diagram "Test Diagram Alpha" exists from TC-DIAG-001.'));
  items.push(stepsTable([
    { action: 'On the Diagram List page, locate "Test Diagram Alpha"', expected: 'Diagram entry visible.' },
    { action: 'Click the Delete button for "Test Diagram Alpha" and confirm the prompt', expected: 'Diagram is removed from the list. A success notification is shown.' },
    { action: 'Via API: GET /api/go/v1/diagrams/<id>', expected: 'HTTP 404 Not Found.' },
    { action: 'Reload the Diagram List page', expected: '"Test Diagram Alpha" does not appear in the list.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-DIAG-003','Diagram Mgmt','Export and import a diagram','Medium',
    'Verify round-trip export to JSON and import restores the diagram exactly.',
    'Logged in as operator@test. A diagram with at least 3 nodes exists.'));
  items.push(stepsTable([
    { action: 'Open the diagram in the editor and click Export', expected: 'A JSON file is downloaded to the local machine.' },
    { action: 'Delete the diagram from the list (as per TC-DIAG-002)', expected: 'Diagram deleted.' },
    { action: 'On the Diagram List page, click Import and select the exported JSON file', expected: 'Diagram is uploaded and appears in the list with the original name.' },
    { action: 'Open the imported diagram', expected: 'All nodes and edges are present in the same positions and with the same properties as before export.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-DIAG-004','Diagram Mgmt','Auto View configuration','Medium',
    'Verify that autoViewInclude and autoViewDuration can be patched per diagram.',
    'Logged in as admin@test. At least two diagrams exist.'));
  items.push(stepsTable([
    { action: 'PATCH /api/go/v1/diagrams/<id1> with body {autoViewInclude: true, autoViewDuration: 10}', data: 'autoViewDuration: 10 s', expected: 'HTTP 200 OK.' },
    { action: 'PATCH /api/go/v1/diagrams/<id2> with body {autoViewInclude: true, autoViewDuration: 15}', data: 'autoViewDuration: 15 s', expected: 'HTTP 200 OK.' },
    { action: 'Navigate to the Viewer page and enable Auto View', expected: 'Auto View cycles between id1 and id2. id1 is displayed for approximately 10 seconds before switching.' },
    { action: 'PATCH /api/go/v1/diagrams/<id1> with {autoViewInclude: false}', expected: 'HTTP 200 OK.' },
    { action: 'Re-enable Auto View', expected: 'Only id2 is shown (id1 excluded). No cycling occurs since only one diagram qualifies.' },
  ]));
  items.push(spacer());

  return items;
}

// ── CANVAS test cases ─────────────────────────────────────────────────────
function makeCanvasTCs() {
  const items = [];
  items.push(h2('13.3 Canvas and Node Operations (TC-CANVAS)'));

  items.push(...tcHeader('TC-CANVAS-001','Canvas','Drag and drop node from palette','High',
    'Verify that all SCADA node types can be dragged from the Element Palette and dropped onto the canvas.',
    'Logged in as operator@test. Editor is open with a blank diagram.'));
  items.push(stepsTable([
    { action: 'Locate the Element Palette on the left side of the editor', expected: 'Palette shows categorised SCADA node icons.' },
    { action: 'Drag the "General Block" item from the palette and drop it on the canvas', expected: 'A General Block node appears at the drop position.' },
    { action: 'Drag the "Valve" item from the palette and drop it on the canvas', expected: 'A Valve node appears.' },
    { action: 'Drag the "Meter" item from the palette and drop it on the canvas', expected: 'A Meter node appears.' },
    { action: 'Repeat for at least 5 more node types covering different categories (Tank, LED, Display, Solar Panel, Signal Flow)', expected: 'Each node type instantiates on the canvas with its default shape, correct label, and default dimensions.' },
    { action: 'Save the diagram and reload', expected: 'All dropped nodes persist with correct types after reload.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-CANVAS-002','Canvas','Undo and Redo operations','High',
    'Verify that Ctrl+Z (undo) and Ctrl+Y (redo) correctly reverse and re-apply canvas operations.',
    'Logged in as operator@test. Editor open with a blank canvas.'));
  items.push(stepsTable([
    { action: 'Drag a General Block onto the canvas', expected: 'Node appears.' },
    { action: 'Press Ctrl+Z', expected: 'Node is removed from the canvas (undo add).' },
    { action: 'Press Ctrl+Y', expected: 'Node reappears on the canvas (redo add).' },
    { action: 'Move the node to a new position, then press Ctrl+Z', expected: 'Node returns to its previous position.' },
    { action: 'Delete the node (Delete key), then press Ctrl+Z', expected: 'Node is restored.' },
    { action: 'Perform 50 sequential operations then press Ctrl+Z 50 times', expected: 'History depth of 50 is honoured. Canvas returns to its initial state after 50 undos.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-CANVAS-003','Canvas','Copy, cut, and paste nodes','Medium',
    'Verify Ctrl+C (copy), Ctrl+X (cut), and Ctrl+V (paste) operations on canvas nodes.',
    'Logged in as operator@test. Editor open with at least two nodes.'));
  items.push(stepsTable([
    { action: 'Select a node and press Ctrl+C', expected: 'Node appears to remain unchanged (copy is silent).' },
    { action: 'Click on empty canvas area and press Ctrl+V', expected: 'A duplicate node appears near the original with the same type and properties.' },
    { action: 'Select a different node and press Ctrl+X', expected: 'Node is removed from the canvas.' },
    { action: 'Press Ctrl+V', expected: 'The cut node is pasted at a new position.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-CANVAS-004','Canvas','Group and Ungroup nodes','Medium',
    'Verify that selected nodes can be grouped and later ungrouped.',
    'Logged in as operator@test. Editor open with at least three nodes.'));
  items.push(stepsTable([
    { action: 'Rubber-band select three nodes by dragging across them', expected: 'Three nodes are highlighted/selected.' },
    { action: 'Click the Group button on the toolbar', expected: 'Nodes are enclosed in a group container. Moving the group moves all enclosed nodes together.' },
    { action: 'Save the diagram and reload', expected: 'Grouping persists after reload.' },
    { action: 'Select the group and click Ungroup on the toolbar', expected: 'Group container is removed. Nodes are independent again and retain their positions.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-CANVAS-005','Canvas','Edge creation between nodes','High',
    'Verify that directed edges can be created by connecting output ports to input ports.',
    'Logged in as operator@test. Editor open with at least two nodes with visible ports.'));
  items.push(stepsTable([
    { action: 'Hover over source node until ports appear', expected: 'Circular port handles are shown around the node boundary.' },
    { action: 'Click and drag from one port to the target node port and release', expected: 'An edge (arrow) is created from source port to target port.' },
    { action: 'Hover over the edge', expected: 'Edge tool buttons (delete, etc.) appear on the edge.' },
    { action: 'Click the delete tool on the edge', expected: 'Edge is removed from the canvas.' },
    { action: 'Save and reload the diagram', expected: 'The persisted edge structure matches what was saved.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-CANVAS-006','Canvas','Zoom and Fit-to-View','Low',
    'Verify zoom in/out and fit-to-view controls work correctly.',
    'Logged in as operator@test. Editor open with several nodes spread across the canvas.'));
  items.push(stepsTable([
    { action: 'Click the Zoom In button on the toolbar three times', expected: 'Canvas magnification increases each click. Node text and shapes grow larger.' },
    { action: 'Click the Zoom Out button three times', expected: 'Canvas magnification decreases.' },
    { action: 'Click the Fit-to-View button', expected: 'All nodes on the canvas are visible within the viewport. Zoom level is auto-adjusted.' },
    { action: 'Use mouse scroll wheel over the canvas', expected: 'Canvas zooms in and out relative to mouse pointer position.' },
  ]));
  items.push(spacer());

  return items;
}

// ── NODE PROPERTIES test cases ────────────────────────────────────────────
function makeNodeTCs() {
  const items = [];
  items.push(h2('13.4 Node Properties and Inspector (TC-NODE)'));

  items.push(...tcHeader('TC-NODE-001','Inspector','Edit node label and static properties','High',
    'Verify that clicking a node opens the Inspector and label changes are applied immediately.',
    'Logged in as operator@test. Editor open with a General Block node on the canvas.'));
  items.push(stepsTable([
    { action: 'Single-click a General Block node on the canvas', expected: 'Inspector panel opens on the right side showing node properties (label, fill, stroke, width, height).' },
    { action: 'Change the label text to "PS1_VOLTAGE"', data: 'PS1_VOLTAGE', expected: 'Node label updates on the canvas in real time.' },
    { action: 'Change fill color to #1A73E8 (blue)', data: '#1A73E8', expected: 'Node fill color updates on the canvas.' },
    { action: 'Change stroke color to #FF0000 (red) and stroke width to 3', data: 'stroke: #FF0000, width: 3', expected: 'Node border turns red with increased width.' },
    { action: 'Change width to 200 and height to 80', data: 'W: 200, H: 80', expected: 'Node resizes on the canvas to 200 x 80 pixels.' },
    { action: 'Save the diagram and reload', expected: 'All property changes persist.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-NODE-002','Inspector','Assign fill-color telemetry binding','High',
    'Verify that a fill-color binding can be configured and displays the correct color based on a telemetry condition.',
    'Logged in as operator@test. Editor open. TM simulator streaming values for mnemonic "PS1_STATUS" (0=OFF, 1=ON).'));
  items.push(stepsTable([
    { action: 'Select a General Block node and open the Inspector', expected: 'Inspector panel visible.' },
    { action: 'Click "Add Binding" and select property "fill" (Fill Color)', expected: 'Binding row added for "fill" property.' },
    { action: 'Set Mnemonic to "PS1_STATUS"', data: 'PS1_STATUS', expected: 'Mnemonic field populated.' },
    { action: 'Add Rule 1: condition "== 1", value "#00B050" (green)', data: 'cond: ==1, val: #00B050', expected: 'Rule row added.' },
    { action: 'Add Rule 2: condition "== 0", value "#FF0000" (red)', data: 'cond: ==0, val: #FF0000', expected: 'Second rule row added.' },
    { action: 'Save the diagram and switch to Viewer mode', expected: 'When PS1_STATUS = 1 the node fill is green; when PS1_STATUS = 0 the fill is red.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-NODE-003','Inspector','Assign numeric display binding with tweening','High',
    'Verify that a numeric value binding smoothly animates between values using the tween engine.',
    'TM simulator streaming "BATTERY_VOLTAGE" as a float varying between 22.0 and 28.0 V.'));
  items.push(stepsTable([
    { action: 'Select a Display (numeric readout) node and open Inspector', expected: 'Inspector shows numeric properties.' },
    { action: 'Add binding for property "label" (text display), mnemonic "BATTERY_VOLTAGE"', data: 'BATTERY_VOLTAGE', expected: 'Binding added.' },
    { action: 'Save and switch to Viewer mode', expected: 'Display node shows the current BATTERY_VOLTAGE value.' },
    { action: 'Observe the display value as the simulator changes BATTERY_VOLTAGE', expected: 'Value transitions smoothly over approximately 500 ms (easeOutCubic tween) rather than jumping instantly.' },
    { action: 'Note the displayed value and compare with the raw NATS message value', expected: 'Displayed value equals the NATS value once the tween completes (within 500 ms + render frame).' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-NODE-004','Inspector','Assign rotation binding with momentum animation','Medium',
    'Verify that a rotation/angle binding smoothly animates a rotating node (e.g., turbine, momentum wheel).',
    'TM simulator streaming "WHEEL_SPEED" as an integer 0–360 RPM equivalent.'));
  items.push(stepsTable([
    { action: 'Select a Momentum Wheel node and open Inspector', expected: 'Inspector visible.' },
    { action: 'Add binding for property "rotation", mnemonic "WHEEL_SPEED"', data: 'WHEEL_SPEED', expected: 'Binding added.' },
    { action: 'Save and switch to Viewer', expected: 'Wheel node rotates. Rotation speed changes smoothly as WHEEL_SPEED varies.' },
    { action: 'Set WHEEL_SPEED to 0 in simulator', data: 'WHEEL_SPEED = 0', expected: 'Wheel decelerates and stops.' },
    { action: 'Set WHEEL_SPEED to maximum', data: 'WHEEL_SPEED = max', expected: 'Wheel accelerates to maximum rotation rate.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-NODE-005','Inspector','Assign visibility (hide/show) binding','High',
    'Verify that a node\'s visibility toggles based on a telemetry condition.',
    'TM simulator streaming "FAULT_FLAG" (0 = nominal, 1 = fault).'));
  items.push(stepsTable([
    { action: 'Select a node representing a fault indicator and open Inspector', expected: 'Inspector visible.' },
    { action: 'Add binding for property "visibility", mnemonic "FAULT_FLAG", Rule: ==1 → visible, ==0 → hidden', data: 'FAULT_FLAG', expected: 'Binding saved.' },
    { action: 'Set FAULT_FLAG = 0 in simulator and switch to Viewer', data: 'FAULT_FLAG = 0', expected: 'Node is hidden (not visible on canvas).' },
    { action: 'Set FAULT_FLAG = 1 in simulator', data: 'FAULT_FLAG = 1', expected: 'Node becomes visible.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-NODE-006','Inspector','Custom JavaScript transform script','Medium',
    'Verify that a custom JS transform script can process raw telemetry before binding application.',
    'TM simulator streaming "RAW_TEMP" as integer millidegrees Celsius (e.g., 27500 = 27.5 C).'));
  items.push(stepsTable([
    { action: 'Select a Display node and open Inspector', expected: 'Inspector visible.' },
    { action: 'Add binding for property "label", mnemonic "RAW_TEMP"', expected: 'Binding row added.' },
    { action: 'Open the transform script editor for this binding and enter: return (value / 1000).toFixed(1) + " C"', data: 'return (value/1000).toFixed(1)+" C"', expected: 'Script saved without errors.' },
    { action: 'Save and switch to Viewer', expected: 'Display node shows "27.5 C" when RAW_TEMP = 27500.' },
    { action: 'Change RAW_TEMP in simulator to 30250', data: 'RAW_TEMP = 30250', expected: 'Display updates to "30.3 C".' },
  ]));
  items.push(spacer());

  return items;
}

// ── TELEMETRY ENGINE test cases ───────────────────────────────────────────
function makeTlmTCs() {
  const items = [];
  items.push(h2('13.5 Telemetry Binding Engine (TC-TLM)'));

  items.push(...tcHeader('TC-TLM-001','Telemetry','NATS connection and subscription','High',
    'Verify that the frontend successfully connects to the NATS broker over WebSocket and subscribes to the TM map subjects.',
    'SPASDACS Nova running. NATS broker running with WS on port 9222. TM simulator active.'));
  items.push(stepsTable([
    { action: 'Open the Viewer page for any diagram', expected: 'Page loads.' },
    { action: 'Observe the NATS status badge on the top bar', expected: 'Badge shows "Connected" (green) within 3 seconds of page load.' },
    { action: 'Open browser DevTools → Network → WS tab', expected: 'A WebSocket connection to ws://<host>:9222 is present with status "101 Switching Protocols".' },
    { action: 'Observe incoming WS frames', expected: 'Binary NATS protocol frames arrive at the configured poll interval (approx 800 ms).' },
    { action: 'Stop the NATS broker service', expected: 'NATS status badge changes to "Disconnected" (red/orange) within a few seconds.' },
    { action: 'Restart the NATS broker', expected: 'Frontend automatically reconnects. Badge returns to "Connected". Telemetry resumes without page reload.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-TLM-002','Telemetry','Full TM snapshot on subscribe','High',
    'Verify that on initial connection the frontend receives a full TM map snapshot and all bound nodes are initialised.',
    'NATS running. TM simulator publishing values for at least 10 mnemonics. Diagram with nodes bound to these mnemonics is open.'));
  items.push(stepsTable([
    { action: 'Open the Viewer page', expected: 'Page loads.' },
    { action: 'Observe all bound nodes within 2 seconds of page load', expected: 'All nodes show their telemetry-driven values/colors immediately on load, not starting from default state, because a full snapshot was received.' },
    { action: 'Check the telemetry store (via browser console: window.__tmStore or equivalent debug export)', expected: 'Telemetry store contains entries for all simulator-published mnemonics.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-TLM-003','Telemetry','Delta TM update propagation','High',
    'Verify that individual TM parameter changes are reflected on the bound node within the expected latency.',
    'NATS running. Diagram open in Viewer. A node is bound to "PS1_VOLTAGE".'));
  items.push(stepsTable([
    { action: 'Record the current displayed value of the PS1_VOLTAGE node', expected: 'Current value noted.' },
    { action: 'Trigger a value change: set PS1_VOLTAGE = 28.5 in simulator', data: 'PS1_VOLTAGE = 28.5', expected: 'Value change is published via NATS delta.' },
    { action: 'Observe the node in the browser', expected: 'Node displays 28.5 (via tween) within 800 ms (poll interval) + 500 ms (tween duration) = 1.3 s worst case.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-TLM-004','Telemetry','Heartbeat chain status display','High',
    'Verify that the chain heartbeat badge accurately reflects TM chain connectivity.',
    'NATS running. Ingest service connected to TM simulator on chain SIM_TM1.'));
  items.push(stepsTable([
    { action: 'Observe the heartbeat badge on the Viewer top bar for chain SIM_TM1', expected: 'Badge shows "OK" (green).' },
    { action: 'Stop the TM simulator (disconnect the chain)', expected: 'Within 3 seconds (2 s TTL + propagation) the heartbeat badge changes to "CONNECTION_FAILED" or "NO DATA" state.' },
    { action: 'Restart the TM simulator', expected: 'Badge returns to "OK" within one heartbeat cycle.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-TLM-005','Telemetry','Fill color — multi-state (3+ states)','High',
    'Verify that fill color binding evaluates correctly when more than two condition rules are configured.',
    'TM simulator streaming "ANODE_VOLTAGE" as float. Node bound with 3 rules: <100 -> red, 100-150 -> yellow, >150 -> green.'));
  items.push(stepsTable([
    { action: 'Set ANODE_VOLTAGE = 50 in simulator', data: 'ANODE_VOLTAGE = 50', expected: 'Node fill color is red.' },
    { action: 'Set ANODE_VOLTAGE = 125', data: 'ANODE_VOLTAGE = 125', expected: 'Node fill color is yellow.' },
    { action: 'Set ANODE_VOLTAGE = 200', data: 'ANODE_VOLTAGE = 200', expected: 'Node fill color is green.' },
    { action: 'Set ANODE_VOLTAGE = 100 (boundary)', data: 'ANODE_VOLTAGE = 100', expected: 'Color matches the rule whose condition covers this boundary (verify rule order).' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-TLM-006','Telemetry','GEO offset X/Y position binding','Medium',
    'Verify that GEO offset binding moves a node relative to its base position as telemetry changes.',
    'TM simulator streaming "SAT_X_OFFSET" and "SAT_Y_OFFSET" as integers (pixels).'));
  items.push(stepsTable([
    { action: 'Place a satellite icon node on the canvas at position (400, 300)', expected: 'Node at base position (400, 300).' },
    { action: 'Bind "geoX" property to mnemonic "SAT_X_OFFSET"', expected: 'Binding saved.' },
    { action: 'Bind "geoY" property to mnemonic "SAT_Y_OFFSET"', expected: 'Binding saved.' },
    { action: 'Set SAT_X_OFFSET = 50 and SAT_Y_OFFSET = 30 in simulator', data: 'X=50, Y=30', expected: 'Node visually moves to approximately (450, 330). Base position is unchanged in diagram data.' },
    { action: 'Set SAT_X_OFFSET = 0 and SAT_Y_OFFSET = 0', data: 'X=0, Y=0', expected: 'Node returns to base position (400, 300).' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-TLM-007','Telemetry','CSS flow animation on edges','Medium',
    'Verify that signal-flow CSS animation on an edge activates based on a boolean telemetry condition.',
    'TM simulator streaming "PIPE_FLOW" (0 = no flow, 1 = flow). An edge with flow animation binding exists.'));
  items.push(stepsTable([
    { action: 'Set PIPE_FLOW = 0 in simulator', data: 'PIPE_FLOW = 0', expected: 'Edge is rendered as a static dashed line. No animation.' },
    { action: 'Set PIPE_FLOW = 1 in simulator', data: 'PIPE_FLOW = 1', expected: 'Edge shows animated dashes moving from source to target, indicating active flow.' },
    { action: 'Set PIPE_FLOW = 0', data: 'PIPE_FLOW = 0', expected: 'Animation stops.' },
  ]));
  items.push(spacer());

  return items;
}

// ── TC QUEUE test cases ───────────────────────────────────────────────────
function makeTcQueueTCs() {
  const items = [];
  items.push(h2('13.6 Telecommanding (TC-TC)'));

  items.push(...tcHeader('TC-TC-001','TC Queue','Add command to TC Queue via context menu','High',
    'Verify that an operator can right-click a node with TC actions and add a command to the queue.',
    'Logged in as operator@test. Viewer page open. A node has TC actions configured. UMACS-TC emulator running.'));
  items.push(stepsTable([
    { action: 'Right-click on a node configured with TC actions', expected: 'Context menu appears with a TC action option (e.g., "Send Command: VALVE_OPEN").' },
    { action: 'Click the TC action option', expected: 'The command "VALVE_OPEN" is added to the TC Queue panel. Queue shows 1 pending command.' },
    { action: 'Right-click and add a second command to the queue', expected: 'Queue shows 2 pending commands in order.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-TC-002','TC Queue','Execute TC command via UMACS','High',
    'Verify that executing a queued command dispatches it to the UMACS-TC service and receives a response.',
    'Logged in as operator@test. TC Queue contains one command. UMACS-TC emulator running on port 8090.'));
  items.push(stepsTable([
    { action: 'Observe the TC Queue panel with one command', expected: 'Command entry visible with "Pending" status.' },
    { action: 'Click the Execute (send) button for the command', expected: 'Application calls the UMACS-TC API. A loading/in-progress indicator is shown.' },
    { action: 'Observe the TC Queue after response', expected: 'Command entry shows "Success" or the UMACS acknowledgement status. UMACS emulator log confirms receipt of the command.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-TC-003','TC Queue','TC blocked for unauthenticated user','High',
    'Verify that unauthenticated users cannot access TC functionality.',
    'No user logged in (browser cleared of auth tokens).'));
  items.push(stepsTable([
    { action: 'Navigate to /viewer/<id> without authentication', expected: 'Viewer loads. Unauthenticated banner visible.' },
    { action: 'Inspect page for TC Queue button', expected: 'TC Queue button is NOT present.' },
    { action: 'Attempt POST /umacs-tc/api/v1/queue without Authorization header', expected: 'HTTP 401 Unauthorized.' },
    { action: 'Attempt POST /umacs-tc/api/v1/queue with a viewer-role JWT', data: 'viewer JWT', expected: 'HTTP 403 Forbidden.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-TC-004','TC Queue','Reorder and clear queue','Medium',
    'Verify that commands can be reordered in the queue and the queue can be fully cleared.',
    'Logged in as operator@test. TC Queue contains 3 commands in order: CMD_A, CMD_B, CMD_C.'));
  items.push(stepsTable([
    { action: 'Drag CMD_C to the top of the queue list', expected: 'Queue order becomes: CMD_C, CMD_A, CMD_B.' },
    { action: 'Click the "Clear All" button on the queue panel', expected: 'Confirmation prompt appears. After confirming, queue is empty.' },
    { action: 'Verify the queue is empty', expected: 'TC Queue panel shows 0 pending commands.' },
  ]));
  items.push(spacer());

  return items;
}

// ── VIEWER MODE test cases ────────────────────────────────────────────────
function makeViewerTCs() {
  const items = [];
  items.push(h2('13.7 Viewer Mode (TC-VIEW)'));

  items.push(...tcHeader('TC-VIEW-001','Viewer','Auto-hiding top bar','Low',
    'Verify that the viewer top bar hides after a period of inactivity and reappears on mouse movement.',
    'Any user (auth or unauth) on the Viewer page.'));
  items.push(stepsTable([
    { action: 'Open Viewer page and stop mouse movement for 5 seconds', expected: 'The top bar fades out and disappears.' },
    { action: 'Move the mouse towards the top of the viewport', expected: 'Top bar fades back in.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-VIEW-002','Viewer','Diagram selector in viewer','Medium',
    'Verify that the diagram dropdown in the viewer allows switching between diagrams without reloading the page.',
    'At least two diagrams exist. Viewer page is open.'));
  items.push(stepsTable([
    { action: 'Open the diagram dropdown on the viewer top bar', expected: 'List of available diagrams shown.' },
    { action: 'Select a different diagram from the list', expected: 'Canvas transitions to display the selected diagram. NATS subscriptions are re-initialised for the new diagram\'s bindings.' },
    { action: 'Verify telemetry is live on the newly loaded diagram', expected: 'Bound nodes reflect current TM values within 2 seconds.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-VIEW-003','Viewer','Auto View cycle','Medium',
    'Verify that Auto View automatically cycles through included diagrams.',
    'Two diagrams with autoViewInclude=true and durations 8s and 12s respectively.'));
  items.push(stepsTable([
    { action: 'Enable Auto View on the Viewer page', expected: 'First diagram (shortest or first in order) begins displaying.' },
    { action: 'Wait 8 seconds', expected: 'Diagram switches to the second qualifying diagram automatically.' },
    { action: 'Wait 12 more seconds', expected: 'Diagram cycles back to the first.' },
    { action: 'Click the Pause button', expected: 'Auto View pauses on the current diagram. Timer stops.' },
    { action: 'Click the Resume button', expected: 'Auto View resumes cycling from the current diagram.' },
  ]));
  items.push(spacer());

  return items;
}

// ── BACKEND API test cases ────────────────────────────────────────────────
function makeApiTCs() {
  const items = [];
  items.push(h2('13.8 Backend API (TC-API)'));

  items.push(...tcHeader('TC-API-001','Gateway API','Diagram CRUD via REST','High',
    'Verify the full create/read/update/delete lifecycle for diagrams through the Gateway REST API.',
    'Gateway service running. MongoDB connected. Valid operator JWT available.'));
  items.push(stepsTable([
    { action: 'POST /api/go/v1/diagrams with a valid diagram JSON body (id, name, modelData)', data: 'Valid diagram JSON', expected: 'HTTP 200 OK. Response body contains the saved diagram with matching id and updatedAt timestamp.' },
    { action: 'GET /api/go/v1/diagrams', expected: 'HTTP 200 OK. Response array contains the newly created diagram.' },
    { action: 'GET /api/go/v1/diagrams/<id>', expected: 'HTTP 200 OK. Full diagram JSON including modelData returned.' },
    { action: 'PATCH /api/go/v1/diagrams/<id> with {autoViewInclude: true, autoViewDuration: 20}', expected: 'HTTP 200 OK.' },
    { action: 'GET /api/go/v1/diagrams/<id> again', expected: 'Response shows autoViewInclude=true and autoViewDuration=20.' },
    { action: 'DELETE /api/go/v1/diagrams/<id>', expected: 'HTTP 200 OK. Subsequent GET returns HTTP 404.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-API-002','Gateway API','Mnemonic catalog query','Medium',
    'Verify that the mnemonic catalog endpoint returns the uploaded TM parameter list.',
    'Gateway running. Mnemonic catalog pre-loaded in MongoDB.'));
  items.push(stepsTable([
    { action: 'GET /api/go/v1/mnemonics', expected: 'HTTP 200 OK. Response is an array of mnemonic objects with at least {name, unit, tolerance} fields.' },
    { action: 'GET /api/go/v1/mnemonics?q=VOLTAGE', data: 'q=VOLTAGE', expected: 'Response is filtered to mnemonics containing "VOLTAGE" in their name (or all, depending on implementation).' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-API-003','IAM API','IAM auth endpoints','High',
    'Verify the IAM auth endpoint chain: login → me → refresh → logout.',
    'IAM service running. User operator@test exists.'));
  items.push(stepsTable([
    { action: 'POST /iam/api/v1/auth/login with {email, password}', data: 'operator@test / Test@1234', expected: 'HTTP 200. Response: {accessToken, refreshToken, user {id, email, role}}.' },
    { action: 'GET /iam/api/v1/auth/me with Bearer accessToken', expected: 'HTTP 200. Response contains user info matching operator@test.' },
    { action: 'POST /iam/api/v1/auth/refresh with {refreshToken}', data: 'refreshToken from step 1', expected: 'HTTP 200. New accessToken issued.' },
    { action: 'POST /iam/api/v1/auth/logout with Bearer accessToken', expected: 'HTTP 200. Refresh token revoked.' },
    { action: 'POST /iam/api/v1/auth/refresh with old refreshToken', expected: 'HTTP 401 Unauthorized.' },
  ]));
  items.push(spacer());

  items.push(...tcHeader('TC-API-004','IAM API','User management by admin','Medium',
    'Verify that an admin can create, list, update, and delete IAM users.',
    'Logged in as admin@test (role: admin). IAM service running.'));
  items.push(stepsTable([
    { action: 'GET /iam/api/v1/users with admin JWT', expected: 'HTTP 200. Array of existing users.' },
    { action: 'POST /iam/api/v1/users with {email, password, name}', data: 'testuser@test / Pass@1234 / Test User', expected: 'HTTP 201. New user created with default role.' },
    { action: 'PUT /iam/api/v1/users/<newId>/roles with {roles: ["operator"]}', expected: 'HTTP 200. User role updated to operator.' },
    { action: 'DELETE /iam/api/v1/users/<newId>', expected: 'HTTP 200. User deleted. Subsequent GET /users does not include the deleted user.' },
  ]));
  items.push(spacer());

  return items;
}

// ── Test Case Summary (RTM) ───────────────────────────────────────────────
function makeSummaryTable() {
  const tcs = [
    ['TC-AUTH-001','IAM','Login with valid credentials','High','SRS-N-080'],
    ['TC-AUTH-002','IAM','Login with invalid credentials','High','SRS-N-080'],
    ['TC-AUTH-003','IAM','JWT auto-refresh','High','SRS-N-082'],
    ['TC-AUTH-004','IAM','Logout','Medium','SRS-N-083'],
    ['TC-AUTH-005','IAM','Viewer role — no TC','High','SRS-N-090, SRS-N-095'],
    ['TC-AUTH-006','IAM','Unauthenticated viewer','High','SRS-N-090, SRS-N-095'],
    ['TC-AUTH-007','IAM','Operator — TC Queue visible','High','SRS-N-091'],
    ['TC-AUTH-008','IAM','Change password','Medium','SRS-N-084'],
    ['TC-DIAG-001','Diagram Mgmt','Create and save diagram','High','SRS-N-010, SRS-N-015'],
    ['TC-DIAG-002','Diagram Mgmt','Delete diagram','Medium','SRS-N-017'],
    ['TC-DIAG-003','Diagram Mgmt','Export and import','Medium','SRS-N-018, SRS-N-019'],
    ['TC-DIAG-004','Diagram Mgmt','Auto View configuration','Medium','SRS-N-075'],
    ['TC-CANVAS-001','Canvas','Drag-drop node from palette','High','SRS-N-020'],
    ['TC-CANVAS-002','Canvas','Undo and Redo','High','SRS-N-031'],
    ['TC-CANVAS-003','Canvas','Copy/Cut/Paste','Medium','SRS-N-032'],
    ['TC-CANVAS-004','Canvas','Group/Ungroup','Medium','SRS-N-033'],
    ['TC-CANVAS-005','Canvas','Edge creation','High','SRS-N-025'],
    ['TC-CANVAS-006','Canvas','Zoom and Fit-to-View','Low','SRS-N-035'],
    ['TC-NODE-001','Inspector','Edit static properties','High','SRS-N-040'],
    ['TC-NODE-002','Inspector','Fill color binding','High','SRS-N-050, SRS-N-051'],
    ['TC-NODE-003','Inspector','Numeric display + tween','High','SRS-N-055'],
    ['TC-NODE-004','Inspector','Rotation binding','Medium','SRS-N-058'],
    ['TC-NODE-005','Inspector','Visibility binding','High','SRS-N-057'],
    ['TC-NODE-006','Inspector','JS transform script','Medium','SRS-N-060'],
    ['TC-TLM-001','Telemetry','NATS connect + subscribe','High','SRS-N-044'],
    ['TC-TLM-002','Telemetry','Full TM snapshot','High','SRS-N-044'],
    ['TC-TLM-003','Telemetry','Delta TM update','High','SRS-N-045'],
    ['TC-TLM-004','Telemetry','Heartbeat chain status','High','SRS-N-046'],
    ['TC-TLM-005','Telemetry','Multi-state fill color','High','SRS-N-051'],
    ['TC-TLM-006','Telemetry','GEO offset binding','Medium','SRS-N-059'],
    ['TC-TLM-007','Telemetry','CSS flow animation','Medium','SRS-N-062'],
    ['TC-TC-001','TC Queue','Add command to queue','High','SRS-N-070'],
    ['TC-TC-002','TC Queue','Execute TC command','High','SRS-N-071'],
    ['TC-TC-003','TC Queue','TC blocked unauth','High','SRS-N-090, SRS-N-095'],
    ['TC-TC-004','TC Queue','Reorder and clear queue','Medium','SRS-N-072'],
    ['TC-VIEW-001','Viewer','Auto-hiding top bar','Low','SRS-N-093'],
    ['TC-VIEW-002','Viewer','Diagram selector','Medium','SRS-N-094'],
    ['TC-VIEW-003','Viewer','Auto View cycle','Medium','SRS-N-075'],
    ['TC-API-001','Gateway API','Diagram CRUD','High','SRS-N-100'],
    ['TC-API-002','Gateway API','Mnemonic catalog','Medium','SRS-N-103'],
    ['TC-API-003','IAM API','Auth endpoint chain','High','SRS-N-080'],
    ['TC-API-004','IAM API','User management','Medium','SRS-N-086'],
  ];

  const W = [1400, 1600, 3360, 800, 2200];
  return [
    h1('14. Test Case Summary'),
    para('The table below lists all test cases defined in this document with their module, priority, and traceability to SRS requirements.'),
    spacer(),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: W,
      rows: [
        new TableRow({ children: [
          hCell('TC ID', W[0]), hCell('Module', W[1]), hCell('Test Title', W[2]),
          hCell('Priority', W[3]), hCell('SRS Requirement(s)', W[4]),
        ]}),
        ...tcs.map(([id, mod, title, pri, srs], i) => new TableRow({ children: [
          dCell(id, W[0], i % 2 === 0 ? C.offWhite : C.white),
          dCell(mod, W[1], i % 2 === 0 ? C.offWhite : C.white),
          dCell(title, W[2], i % 2 === 0 ? C.offWhite : C.white),
          dCell(pri, W[3],
            pri === 'High' ? C.redBg : pri === 'Medium' ? C.yellowBg : C.greenBg,
            AlignmentType.CENTER),
          dCell(srs, W[4], i % 2 === 0 ? C.offWhite : C.white),
        ]})),
      ],
    }),
    spacer(),
    para([
      sp('Total Test Cases: ', { bold: true }),
      sp(String(tcs.length) + '  |  '),
      sp('High: ', { bold: true, color: C.red }),
      sp(String(tcs.filter(t => t[3] === 'High').length) + '  '),
      sp('Medium: ', { bold: true, color: C.yellow }),
      sp(String(tcs.filter(t => t[3] === 'Medium').length) + '  '),
      sp('Low: ', { bold: true, color: C.green }),
      sp(String(tcs.filter(t => t[3] === 'Low').length)),
    ]),
    pageBreak(),
  ];
}

// ── Approval page ─────────────────────────────────────────────────────────
function makeApproval() {
  return [
    h1('15. Approvals'),
    para('This Test Plan Document has been reviewed and approved by the following signatories:'),
    spacer(),
    new Table({
      width: { size: 9360, type: WidthType.DXA },
      columnWidths: [2800, 2280, 2280, 2000],
      rows: [
        new TableRow({ children: [hCell('Role', 2800), hCell('Name', 2280), hCell('Signature', 2280), hCell('Date', 2000)] }),
        ...['Test Lead', 'Project Manager', 'Software Lead', 'Operations Representative'].map(role =>
          new TableRow({ children: [
            dCell(role, 2800, C.offWhite),
            dCell('', 2280), dCell('', 2280), dCell('', 2000),
          ]})),
      ],
    }),
  ];
}

// ── Assemble document ─────────────────────────────────────────────────────
const header = new Header({
  children: [new Paragraph({
    children: [
      sp('SPASDACS Nova — Test Plan Document', { bold: true, color: C.navy }),
      new TextRun({ text: '\tSCG-GRCD2-SW-2025-05  |  v2.0', font: 'Arial', size: 20, color: C.darkGray }),
    ],
    tabStops: [{ type: 'right', position: 9360 }],
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.lightBlue, space: 4 } },
  })],
});

const footer = new Footer({
  children: [new Paragraph({
    children: [
      sp('GEOSAT RF & Payload Checkout Division-2, ISRO', { color: C.darkGray, size: 18 }),
      new TextRun({ text: '\tPage ', font: 'Arial', size: 18, color: C.darkGray }),
      new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: C.darkGray }),
      new TextRun({ text: ' of ', font: 'Arial', size: 18, color: C.darkGray }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 18, color: C.darkGray }),
    ],
    tabStops: [{ type: 'right', position: 9360 }],
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.lightBlue, space: 4 } },
  })],
});

const doc = new Document({
  numbering: {
    config: [
      { reference: 'bullets',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '-', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: 'o', alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
        ] },
      { reference: 'numbers',
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial' },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial' },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial' },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
      },
    },
    headers: { default: header },
    footers: { default: footer },
    children: [
      ...makeCover(),
      ...makeChangeHistory(),
      new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-3' }),
      pageBreak(),
      ...makeIntro(),
      ...makeTestItems(),
      ...makeFeatures(),
      ...makeApproach(),
      ...makeCriteriaEtc(),
      ...makeOrgRisks(),
      ...makeAuthTCs(),
      ...makeDiagTCs(),
      ...makeCanvasTCs(),
      ...makeNodeTCs(),
      ...makeTlmTCs(),
      ...makeTcQueueTCs(),
      ...makeViewerTCs(),
      ...makeApiTCs(),
      ...makeSummaryTable(),
      ...makeApproval(),
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = 'Software Test Plan Document-SPASDACS Nova.docx';
  fs.writeFileSync(out, buf);
  console.log('Generated:', out, '(' + (buf.length / 1024).toFixed(1) + ' KB)');
}).catch(err => { console.error(err); process.exit(1); });
