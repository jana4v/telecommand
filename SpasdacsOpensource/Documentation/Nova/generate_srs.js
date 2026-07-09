// generate_srs.js  –  SPASDACS Nova  Software Requirements Specification
// Doc No: SCG-GRCD2-SW-2025-03  |  Version 2.0  |  March 2026
'use strict';
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, LevelFormat, TableOfContents,
  Bookmark, PageBreak
} = require('docx');
const fs = require('fs');

// ── Colors ────────────────────────────────────────────────────────────────
const C = {
  navy: '1A1A2E', blue: '2E75B6', lightBlue: 'BDD7EE', teal: '00A99D',
  white: 'FFFFFF', offWhite: 'F2F7FC', gray: 'D6DCE4',
  darkGray: '595959', black: '000000', orange: 'C45911', orangeBg: 'FCE4D6',
  green: '375623', greenBg: 'E2EFDA', purple: '5B2C6F', purpleBg: 'EBD5F5',
};
const thinBorder  = { style: BorderStyle.SINGLE, size: 1, color: C.gray };
const thickBorder = { style: BorderStyle.SINGLE, size: 4, color: C.blue };
const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorder    = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders   = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ── Text helpers ──────────────────────────────────────────────────────────
const sp   = (text, opts = {}) => new TextRun({ text, font: 'Arial', size: 22, ...opts });
const bold = (text, opts = {}) => sp(text, { bold: true, ...opts });
const code = (text) => new TextRun({ text, font: 'Courier New', size: 18, color: C.darkGray });

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
function bulletRuns(runs, level = 0) {
  return new Paragraph({ numbering: { reference: 'bullets', level },
    children: runs, spacing: { after: 60 } });
}
function numbered(children, level = 0) {
  const arr = typeof children === 'string' ? [sp(children)] : children;
  return new Paragraph({ numbering: { reference: 'numbers', level },
    children: arr, spacing: { after: 80 } });
}
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }
function spacer()    { return new Paragraph({ children: [], spacing: { after: 120 } }); }
function divider()   {
  return new Paragraph({ spacing: { after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.lightBlue, space: 4 } },
    children: [] });
}

// ── Table cell helpers ────────────────────────────────────────────────────
function hCell(text, w)           {
  return new TableCell({ borders: cellBorders, width: { size: w, type: WidthType.DXA },
    shading: { fill: C.navy, type: ShadingType.CLEAR },
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

// ── Metadata info-box ─────────────────────────────────────────────────────
function metaTable(rows) {          // rows: [{label, value, shade}]
  return new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2600, 6760],
    rows: rows.map((r, i) => new TableRow({ children: [
      new TableCell({ borders: noBorders, width: { size: 2600, type: WidthType.DXA },
        shading: { fill: C.navy, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        children: [para([bold(r.label, { color: C.white })])] }),
      new TableCell({ borders: noBorders, width: { size: 6760, type: WidthType.DXA },
        shading: { fill: i % 2 === 0 ? C.offWhite : C.white, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 180, right: 180 },
        children: [para(r.value)] }),
    ] })),
  });
}

// ── Requirement row (shaded alternate) ───────────────────────────────────
function reqRow(id, section, frdId, desc, status, idx) {
  const shade = idx % 2 === 0 ? C.offWhite : C.white;
  const stColor = status === 'Implemented' ? C.green
    : status === 'Deferred' ? C.orange : C.blue;
  return new TableRow({ children: [
    dCell(id,       1200, shade),
    dCell(section,  1400, shade),
    dCell(frdId,    1400, shade),
    dCell(desc,     4160, shade),
    new TableCell({ borders: cellBorders, width: { size: 1200, type: WidthType.DXA },
      shading: { fill: shade, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [sp(status, { bold: true, color: stColor })], alignment: AlignmentType.CENTER })] }),
  ] });
}

// ── Code-block paragraph ──────────────────────────────────────────────────
function codePara(text) {
  return new Paragraph({
    children: [code(text)],
    spacing: { after: 40 },
    indent: { left: 720 },
    shading: { fill: 'F4F4F4', type: ShadingType.CLEAR },
  });
}

// ── Header / Footer factory ───────────────────────────────────────────────
function makeHeader() {
  return new Header({ children: [
    new Paragraph({
      children: [
        sp('SOFTWARE REQUIREMENTS SPECIFICATION OF', { bold: true, size: 18 }),
        sp('  |  ', { size: 18, color: C.gray }),
        sp('SPAcecraft Status Display And Commanding Software (SPASDACS) Nova  2.0', { size: 18, color: C.blue }),
      ],
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.blue, space: 4 } },
    }),
  ] });
}
function makeFooter() {
  return new Footer({ children: [
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.lightBlue, space: 4 } },
      children: [
        sp('Doc No: SCG-GRCD2-SW-2025-03  |  Version 2.0  |  March 2026', { size: 18, color: C.darkGray }),
        sp('    Page ', { size: 18, color: C.darkGray }),
        new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: C.darkGray }),
        sp(' of ', { size: 18, color: C.darkGray }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 18, color: C.darkGray }),
        sp('    |  URSC QUALITY POLICY: COMMITTED TO TOTAL QUALITY AND ZERO DEFECT', { size: 18, color: C.darkGray }),
      ],
    }),
  ] });
}

// ══════════════════════════════════════════════════════════════════════════
//  DOCUMENT SECTIONS
// ══════════════════════════════════════════════════════════════════════════
const coverChildren = [
  new Paragraph({ spacing: { before: 1440, after: 360 }, children: [] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [new TextRun({ text: 'SOFTWARE REQUIREMENTS SPECIFICATION', font: 'Arial', size: 44, bold: true, color: C.navy })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [new TextRun({ text: 'SPAcecraft Status Display And Commanding Software', font: 'Arial', size: 28, color: C.blue })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 480 },
    children: [new TextRun({ text: 'SPASDACS Nova', font: 'Arial', size: 36, bold: true, color: C.teal, italics: true })] }),
  divider(), spacer(),
  metaTable([
    { label: 'Document No.', value: 'SCG-GRCD2-SW-2025-03' },
    { label: 'Version',      value: '2.0' },
    { label: 'Date',         value: 'March 2026' },
    { label: 'Prepared by',  value: 'GEOSAT RF & Payload Checkout Division-2' },
    { label: 'Organisation', value: 'Spacecraft Checkout Group, UR RAO Satellite Centre, ISRO, Bangalore' },
    { label: 'Supersedes',   value: 'SCG-GRCD2-SW-2021-01  (SPASDACS 1.0 SRS)' },
    { label: 'Status',       value: 'Released' },
  ]),
  spacer(), divider(), spacer(),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
    children: [new TextRun({ text: 'URSC QUALITY POLICY: COMMITTED TO TOTAL QUALITY AND ZERO DEFECT IN SPACE SYSTEMS AND SERVICES', font: 'Arial', size: 18, color: C.darkGray, italics: true })] }),
];

// ── Authentication page ───────────────────────────────────────────────────
const authChildren = [
  pageBreak(), h1('AUTHENTICATION'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2200, 3780, 1680, 1700],
    rows: [
      new TableRow({ children: [hCell('Role', 2200), hCell('Name', 3780), hCell('Signature', 1680), hCell('Date', 1700)] }),
      new TableRow({ children: [dCell('Prepared By', 2200, C.offWhite), dCell('', 3780, C.offWhite), dCell('', 1680, C.offWhite), dCell('', 1700, C.offWhite)] }),
      new TableRow({ children: [dCell('', 2200), dCell('', 3780), dCell('', 1680), dCell('', 1700)] }),
      new TableRow({ children: [dCell('Reviewed &\nApproved By', 2200, C.offWhite), dCell('', 3780, C.offWhite), dCell('', 1680, C.offWhite), dCell('', 1700, C.offWhite)] }),
    ],
  }),
];

// ── Change history ────────────────────────────────────────────────────────
const changeChildren = [
  pageBreak(), h1('CHANGE HISTORY'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [1400, 1600, 2160, 1600, 2600],
    rows: [
      new TableRow({ children: [hCell('Version', 1400), hCell('Date', 1600), hCell('Affected Section / Table', 2160), hCell('Nature [A/M/D]', 1600), hCell('Description', 2600)] }),
      new TableRow({ children: [dCell('2.0', 1400, C.offWhite), dCell('March 2026', 1600, C.offWhite), dCell('All', 2160, C.offWhite), dCell('A – Addition', 1600, C.offWhite), dCell('Initial release of Nova SRS', 2600, C.offWhite)] }),
      new TableRow({ children: [dCell('', 1400), dCell('', 1600), dCell('', 2160), dCell('', 1600), dCell('', 2600)] }),
    ],
  }),
  spacer(),
  para([sp('* A – Addition    M – Modification    D – Deletion', { italics: true, color: C.darkGray })]),
];

// ── Table of contents ─────────────────────────────────────────────────────
const tocChildren = [
  pageBreak(),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
    children: [new TextRun({ text: 'TABLE OF CONTENTS', font: 'Arial', size: 28, bold: true, color: C.navy })] }),
  new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-3' }),
];

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 1 – INTRODUCTION
// ══════════════════════════════════════════════════════════════════════════
const sec1 = [
  pageBreak(), h1('1.  Introduction'),

  h2('1.1  Purpose'),
  para('This Software Requirements Specification (SRS) defines the detailed software requirements for SPASDACS Nova (version 2.0). SPASDACS Nova is a next-generation, browser-based Spacecraft Status Display and Commanding Software replacing SPASDACS 1.0. The system extends the pictorial block-schematic telemetry display paradigm with a full-stack, microservice backend, real-time telecommanding, tiered user access control, and long-term telemetry storage.'),
  para('This document translates the functional requirements stated in the SPASDACS Nova Functional Requirements Document (FRD, SCG-GRCD2-SW-2025-02) into precise, verifiable software specifications that shall govern design, implementation, integration, and acceptance testing.'),

  h2('1.2  Scope'),
  para('This SRS covers all software components of the SPASDACS Nova system:'),
  bullet('Frontend SPA (browser-based display, diagram editor, TC panel)'),
  bullet('Backend Go microservices: ingest, gateway, limiter, comparator, storage, simulator, chain-monitor, umacs-tc, umacs-tc-emulator, IAM'),
  bullet('Middleware: Redis (real-time cache), NATS (pub/sub streaming), MongoDB (persistence), InfluxDB (time-series storage)'),
  bullet('Launcher: unified process manager for all backend services'),
  spacer(),
  para('Out of scope: SCC / UMACS hardware, SCOS software, network infrastructure below the application layer.'),

  h2('1.3  Definitions, Acronyms and Abbreviations'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2400, 6960],
    rows: [
      new TableRow({ children: [hCell('Acronym / Term', 2400), hCell('Definition', 6960)] }),
      ...[
        ['SPASDACS', 'Spacecraft Status Display and Commanding Software'],
        ['SCC',      'Spacecraft Checkout Computer'],
        ['PCC',      'Payload Checkout Computer'],
        ['TM',       'Telemetry – digitised health and status data from spacecraft'],
        ['TC',       'Telecommand – command sent to spacecraft or ground checkout instruments'],
        ['SCOS',     'Special Checkout System'],
        ['SMON',     'SCOS Monitoring – parameter stream from SCOS data server'],
        ['ADC',      'Analog-to-Digital Converter monitoring data'],
        ['IAM',      'Identity and Access Management microservice'],
        ['NATS',     'Open-source, cloud-native messaging system used for internal pub/sub'],
        ['UDTM',     'User Display Telemetry Map – user-defined mnemonic-value mapping'],
        ['DTM',      'Display Telemetry Map Procedure – scripted animation procedure'],
        ['JWT',      'JSON Web Token – signed access token issued by IAM'],
        ['UMACS',    'Unified Management and Commanding System'],
        ['RTM',      'Requirements Traceability Matrix'],
        ['SPA',      'Single Page Application – browser-based UI served over HTTP'],
        ['DXA',      'Document eXtension for Authoring – docx unit (1/1440 inch)'],
        ['CHECKNET', 'Isolated spacecraft checkout LAN'],
        ['IST',      'Integrated Spacecraft Testing'],
        ['OBT',      'On-Board Time – spacecraft timestamp'],
        ['FRD',      'Functional Requirements Document'],
        ['SRS',      'Software Requirements Specification'],
      ].map(([a, d], i) => new TableRow({ children: [dCell(a, 2400, i % 2 === 0 ? C.offWhite : C.white), dCell(d, 6960, i % 2 === 0 ? C.offWhite : C.white)] })),
    ],
  }),
  spacer(), para([bold('Table 1: ', { color: C.blue }), sp('Acronyms and Abbreviations')], { alignment: AlignmentType.CENTER }),

  h2('1.4  References'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [5000, 2360, 2000],
    rows: [
      new TableRow({ children: [hCell('Document Name', 5000), hCell('Document Number', 2360), hCell('Date', 2000)] }),
      ...[
        ['SPASDACS Nova Functional Requirements Document', 'SCG-GRCD2-SW-2025-02', 'March 2026'],
        ['SPASDACS 1.0 Software Requirements Specification', 'SCG-GRCD2-SW-2021-01', 'August 2021'],
        ['DRC Closeout Minutes – SPASDACS Nova', 'Internal Meeting Record', 'March 2026'],
        ['PASDACS Requirement Document', 'Not Available', '—'],
      ].map(([n, d, dt], i) => new TableRow({ children: [dCell(n, 5000, i % 2 === 0 ? C.offWhite : C.white), dCell(d, 2360, i % 2 === 0 ? C.offWhite : C.white), dCell(dt, 2000, i % 2 === 0 ? C.offWhite : C.white)] })),
    ],
  }),
  spacer(), para([bold('Table 2: ', { color: C.blue }), sp('References')], { alignment: AlignmentType.CENTER }),

  h2('1.5  Overview of the Document'),
  bullet('Section 2 – Overall description, product perspective, and product functions.'),
  bullet('Section 3 – Specific requirements: external interfaces, functional requirements, performance, design constraints, software system attributes, and architecture.'),
  bullet('Section 4 – Requirements Traceability Matrix (SRS-ID → FRD NV-ID → Section → Status).'),
];

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 2 – OVERALL DESCRIPTION
// ══════════════════════════════════════════════════════════════════════════
const sec2 = [
  pageBreak(), h1('2.  Overall Description'),

  h2('2.1  Product Perspective'),
  para('SPASDACS Nova is a three-tier, browser-based system:'),
  bullet('Tier 1 – Presentation: React single-page application served over HTTP. Runs in any modern Chromium or Firefox browser on the CHECKNET without installation.'),
  bullet('Tier 2 – Application: Go microservices orchestrated by a unified launcher; communicate via REST/WebSocket (external) and NATS pub/sub (internal).'),
  bullet('Tier 3 – Data: MongoDB (diagram persistence, mnemonic catalog, IAM), Redis (real-time telemetry cache, heartbeat), InfluxDB (time-series archive), NATS (streaming).'),
  spacer(),
  para('The system connects to the SCC/PCC WebSocket servers to receive live TM, SMON, and ADC data and forwards those to the browser over NATS-WebSocket bridging. The system can be hosted on the SCC, PCC, or any PC on CHECKNET.'),

  h2('2.2  Product Functions'),
  h3('2.2.1  Preparatory Requirements'),
  para('These requirements address diagram authoring, telemetry binding, and user account creation prior to a real-time session:'),
  numbered('Shall provide a browser-based, drag-and-drop diagram editor to create and edit block schematics using shapes (rectangle, circle, ellipse, line, triangle) and imported images.'),
  numbered('Shall support assigning telemetry/SMON/ADC mnemonics to each block, defining which visual attributes (color, border, size, rotation, visibility, position) change based on live values.'),
  numbered('Shall support saving/loading diagrams to/from MongoDB via the Gateway REST API.'),
  numbered('Shall provide IAM-based user management with four built-in roles: super_admin, admin, operator, viewer, plus unauthenticated direct-viewer access.'),

  h3('2.2.2  Real-time Display Requirements'),
  para('These requirements govern the live execution environment where spacecraft data is received and displayed:'),
  numbered('Shall receive live TM, SMON, ADC data from configured SCC/PCC WebSocket servers and publish to browser clients via NATS.'),
  numbered('Shall update visual block attributes in real-time (sub-second latency from SCC data arrival to browser render).'),
  numbered('Shall provide audio and visual alerts on limit violations, data breaks, and invalid/prohibited telemetry combinations.'),
  numbered('Shall support an Auto View mode (slideshow) cycling through selected diagrams with user-configurable dwell time per page.'),
  numbered('Unauthenticated users (direct viewers) SHALL be able to view diagrams and live telemetry in read-only mode without logging in. No telecommanding shall be accessible without authentication.'),

  h3('2.2.3  Telecommanding Requirements'),
  para('Telecommanding is only available to authenticated users with Operator or Admin role:'),
  numbered('Shall provide a TC command panel populated from the TC mnemonic catalog stored in MongoDB.'),
  numbered('Shall integrate with the UMACS TC service to queue and dispatch commands to the spacecraft/instruments via the configured TC endpoint (IP/Port).'),
  numbered('Shall display TC execution status and maintain a historical TC log viewable by authenticated users.'),
  numbered('Shall enforce spacecraft safety by preventing prohibited command combinations as defined in the mnemonic catalog.'),

  h3('2.2.4  Identity and Access Management Requirements'),
  para('The IAM microservice manages authentication and authorisation across the platform:'),
  numbered('Shall support JWT-based stateless authentication with a 15-minute access token and a 7-day refresh token.'),
  numbered('Shall enforce role-based access control (RBAC) via Casbin. TC commands shall be blocked for viewer and unauthenticated users.'),
  numbered('Shall seed default roles (super_admin, admin, operator, viewer) and a default admin user on first startup.'),

  h3('2.2.5  Data Management Requirements'),
  numbered('Shall persist mnemonic catalogs (TM and TC) in MongoDB, uploadable via CSV/file through the Gateway API.'),
  numbered('Shall store time-series telemetry in InfluxDB with configurable per-mnemonic storage enable/disable flags.'),
  numbered('Shall maintain UDTM (User Display Telemetry Map) and DTM Procedures in MongoDB with version history.'),

  h2('2.3  Constraints'),
  bullet('The system SHALL receive telemetry via WebSocket protocol compliant with the SCC/PCC data publisher interface (see Section 3.1.2).'),
  bullet('The browser client SHALL require no software installation beyond a modern browser (Chromium 110+ or Firefox 110+).'),
  bullet('All telecommand dispatch SHALL transit through the UMACS TC service; direct SCC socket access from the browser is prohibited.'),
  bullet('All backend services SHALL be compiled Go binaries; CGO is disallowed to ensure cross-platform portability.'),

  h2('2.4  Assumptions and Dependencies'),
  numbered('TM, SMON, and ADC data publishers are running and accessible on the SCC/PCC at the configured host/port pairs.'),
  numbered('MongoDB, Redis, NATS, and InfluxDB are available on the server node before any SPASDACS Nova service starts.'),
  numbered('The UMACS TC server is running and accessible at the configured TCP endpoint for command dispatch.'),
  numbered('The CHECKNET LAN provides adequate bandwidth for continuous WebSocket streams (minimum 1 Mbps per chain).'),
  numbered('Browser clients have access to the server node on the ports assigned to the gateway (default 8090) and IAM (default 8093) services.'),

  h2('2.5  Apportioning of Requirements'),
  para('The following requirements are planned for future releases and are not part of version 2.0:'),
  bullet('SRS-N-98  Automated audit trail with tamper-evident log storage (MongoDB iam.audit collection).'),
  bullet('SRS-N-99  Diagram Library: shared library of re-usable subsystem block templates across projects.'),
  bullet('SRS-N-100 ACSS (Automated Checkout Sequence System) integration for scripted test execution.'),
  bullet('SRS-N-101 Multi-spacecraft concurrent display on a single SPASDACS Nova instance.'),
  bullet('SRS-N-102 Offline playback mode – replay archived InfluxDB data through the diagram viewer.'),
];

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 3 – SPECIFIC REQUIREMENTS
// ══════════════════════════════════════════════════════════════════════════
const sec3 = [
  pageBreak(), h1('3.  Specific Requirements'),

  // ── 3.1 External Interface Requirements ──────────────────────────────────
  h2('3.1  External Interface Requirements'),

  h3('3.1.1  Hardware Interfaces'),
  bullet('SCC or PCC running on CHECKNET with Windows or Linux OS, minimum 4 GB RAM.'),
  bullet('Client PCs: any x86-64 host on CHECKNET with a modern browser; minimum 2 GB RAM.'),
  bullet('No dedicated hardware interface card required; all communication is over TCP/IP.'),

  h3('3.1.2  TM / SMON / ADC Data Subscription Interface (from SCC WebSocket Server)'),
  para('SPASDACS Nova connects to the SCC/PCC WebSocket servers as a subscriber client. Each chain (TM1, SMON1, SMON2 …) is configured with a host/port pair in the ingest service YAML configuration.'),

  para([bold('Connection URL format: '), code('ws://{chain.host}:{chain.port}/ws')]),
  spacer(),
  para([bold('TM Chain – Subscribe/Unsubscribe (sent by ingest on connect):')]),
  codePara('{ "action": "subscribe",   "params": ["Frame-id", "OBT"] }'),
  codePara('{ "action": "unsubscribe", "params": ["Frame-id", "OBT"] }'),
  para([bold('TM Data Message format (received per parameter, continuous stream):')]),
  codePara('{ "param_id":"", "param":"", "source_info":"", "raw_count":"",'),
  codePara('  "proc_value":"", "time_stamp":"", "upper_limit":"",'),
  codePara('  "lower_limit":"", "err_desc":"" }'),
  para([sp('Data break is detected when '), code('"break"'), sp(' appears in the '), code('err_desc'), sp(' field. On detection, the chain Redis cache is cleared and heartbeat is set to DATA_BREAK.')]),
  spacer(),
  para([bold('SCOS/SMON/ADC Chain – Subscribe (connection itself is the subscribe action):')]),
  codePara('{ "action": "subscribe" }'),
  para([bold('SCOS Data Message format (received every ~4 s):')]),
  codePara('{ "paramlist": [{"param":"","value":""},{"param":"","value":""},...],'),
  codePara('  "stream":"", "seqcount":"", "time":"", "error":"" }'),

  h3('3.1.3  Internal NATS Telemetry Streaming Interface'),
  para('The ingest service publishes normalised telemetry to NATS subjects. The browser frontend subscribes via NATS WebSocket bridge.'),
  bullet([bold('URL: '), code('nats://localhost:4222'), sp(' (configurable via YAML)')]),
  bullet([bold('Subject prefix: '), code('tm'), sp(' (configurable, default from config.go)')]),
  bullet([bold('Poll interval: '), sp('800 ms (configurable, nats.poll_interval_ms)')]),
  bullet([bold('Snapshot interval: '), sp('30 s (configurable, nats.snapshot_interval_s) – full-map broadcast for late-joining clients')]),
  bullet([bold('Subject pattern: '), code('tm.{chain_name}.param'), sp(' – individual parameter updates')]),
  bullet([bold('Snapshot subject: '), code('tm.{chain_name}.snapshot'), sp(' – full chain hash-map')]),

  h3('3.1.4  Gateway REST API Interface'),
  para([bold('Base URL: '), code('http://{server}:8090/api/go/v1')]),
  spacer(),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [1000, 2600, 5760],
    rows: [
      new TableRow({ children: [hCell('Method', 1000), hCell('Endpoint', 2600), hCell('Description', 5760)] }),
      ...[
        ['POST',   '/get-telemetry',                       'Fetch current values for a list of mnemonics from Redis'],
        ['GET',    '/chain-status',                        'Chain heartbeat status (CONNECTED / DATA_BREAK / CONNECTION_FAILED)'],
        ['GET',    '/chain-mismatches',                    'Comparator chain mismatch list'],
        ['GET',    '/limit-failures',                      'Active limit failures from limiter service'],
        ['GET',    '/simulator-status',                    'Simulator running/stopped status'],
        ['GET',    '/mnemonics/tm',                        'TM mnemonic subsystem list'],
        ['GET',    '/mnemonics/tm/{subsystem}',            'TM mnemonics for given subsystem'],
        ['GET',    '/get/mnemonics/tm',                    'All TM mnemonics (full catalog)'],
        ['GET',    '/get/mnemonics/tm/{subsystem}/{mn}/range', 'Limit range for a specific mnemonic'],
        ['GET',    '/mnemonics/tc',                        'TC mnemonic subsystem list'],
        ['GET',    '/mnemonics/tc/{subsystem}',            'TC mnemonics for given subsystem'],
        ['GET',    '/telecommand/subsystems',              'List of TC subsystems'],
        ['GET',    '/telecommand/record',                  'Single TC record by query param'],
        ['GET',    '/mnemonics/sco',                       'SCO command list'],
        ['GET',    '/mnemonics/all',                       'All mnemonics (TM + TC + SCO)'],
        ['GET',    '/telemetry/subsystems',                'TM subsystem list'],
        ['GET',    '/tm/mnemonics',                        'Live TM mnemonic list (Redis)'],
        ['POST',   '/telemetry/upload',                    'Upload TM mnemonic catalog (CSV/JSON)'],
        ['GET',    '/telemetry/limits/{subsystem}',        'Fetch editable limits for subsystem'],
        ['PUT',    '/telemetry/limits',                    'Update single TM mnemonic limits'],
        ['PUT',    '/telemetry/limits/bulk',               'Bulk update TM mnemonic limits'],
        ['PUT',    '/telemetry/tolerance',                 'Update per-mnemonic analog tolerance'],
        ['PUT',    '/telemetry/expected-value',            'Update per-mnemonic expected value'],
        ['PUT',    '/telemetry/ignore-limit-check',        'Enable/disable limit check per mnemonic'],
        ['PUT',    '/telemetry/ignore-change-detection',   'Enable/disable change detection per mnemonic'],
        ['PUT',    '/telemetry/ignore-chain-comparision',  'Enable/disable chain comparison per mnemonic'],
        ['PUT',    '/telemetry/available-chains',          'Set available chains for a mnemonic'],
        ['POST',   '/telecommand/upload',                  'Upload TC mnemonic catalog'],
        ['GET',    '/ud-tm',                               'Fetch current UDTM map'],
        ['POST',   '/ud-tm',                               'Save new UDTM map version'],
        ['GET',    '/ud-tm/versions',                      'List all UDTM versions'],
        ['GET',    '/ud-tm/versions/{version}',            'Fetch specific UDTM version'],
        ['GET',    '/dtm/procedures',                      'Fetch current DTM procedures'],
        ['POST',   '/dtm/procedures',                      'Save DTM procedures'],
        ['GET',    '/maps/{name}',                         'Read a full Redis hash map as key-value array'],
        ['GET',    '/diagrams',                            'List all SPASDACS diagrams (meta only)'],
        ['GET',    '/diagrams/{id}',                       'Fetch a single diagram with full modelData'],
        ['POST',   '/diagrams',                            'Create or replace a diagram (upsert by id)'],
        ['PATCH',  '/diagrams/{id}',                       'Patch autoViewInclude / autoViewDuration'],
        ['DELETE', '/diagrams/{id}',                       'Delete a diagram'],
        ['PUT',    '/udtm/values',                         'Update UDTM values in Redis'],
        ['PUT',    '/dtm/values',                          'Trigger DTM procedure value update'],
      ].map(([m, e, d], i) => new TableRow({ children: [
        dCell(m, 1000, i % 2 === 0 ? C.offWhite : C.white),
        new TableCell({ borders: cellBorders, width: { size: 2600, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? C.offWhite : C.white, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [code(e)] })] }),
        dCell(d, 5760, i % 2 === 0 ? C.offWhite : C.white),
      ] })),
    ],
  }),
  spacer(), para([bold('Table 3: ', { color: C.blue }), sp('Gateway REST API Endpoints')], { alignment: AlignmentType.CENTER }),

  h3('3.1.5  IAM REST API Interface'),
  para([bold('Base URL: '), code('http://{server}:8093/iam')]),
  spacer(),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [1000, 2800, 2000, 3560],
    rows: [
      new TableRow({ children: [hCell('Method', 1000), hCell('Endpoint', 2800), hCell('Auth Required', 2000), hCell('Description', 3560)] }),
      ...[
        ['POST',   '/auth/login',              'None (Public)',       'Login; returns access_token + refresh_token'],
        ['POST',   '/auth/refresh',            'None (Public)',       'Exchange refresh_token for new access_token'],
        ['POST',   '/auth/logout',             'Bearer Token',       'Revoke refresh token; invalidate session'],
        ['GET',    '/auth/me',                 'Bearer Token',       'Return authenticated user profile'],
        ['POST',   '/auth/change-password',    'Bearer Token',       'Change own password; revokes all refresh tokens'],
        ['GET',    '/roles',                   'Bearer Token',       'List all roles'],
        ['GET',    '/roles/{id}',              'Bearer Token',       'Get single role by ID'],
        ['POST',   '/roles',                   'super_admin',        'Create new role'],
        ['PUT',    '/roles/{id}',              'super_admin',        'Update role description/permissions'],
        ['DELETE', '/roles/{id}',              'super_admin',        'Delete role'],
        ['GET',    '/users',                   'iam:users:read',     'List all users (admin)'],
        ['POST',   '/users',                   'iam:users:write',    'Create new user (admin)'],
        ['GET',    '/users/{id}',              'Self or admin',      'Get user profile'],
        ['PUT',    '/users/{id}',              'Self or admin',      'Update user profile / active status'],
        ['DELETE', '/users/{id}',              'iam:users:write',    'Delete user'],
        ['PUT',    '/users/{id}/roles',        'iam:users:write',    'Assign roles to user'],
        ['GET',    '/permissions',             'super_admin',        'List Casbin permission rules'],
        ['GET',    '/permissions/resources',   'super_admin',        'List all resource identifiers'],
        ['POST',   '/permissions',             'super_admin',        'Add a Casbin policy rule'],
        ['DELETE', '/permissions',             'super_admin',        'Remove a Casbin policy rule'],
      ].map(([m, e, a, d], i) => new TableRow({ children: [
        dCell(m, 1000, i % 2 === 0 ? C.offWhite : C.white),
        new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? C.offWhite : C.white, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [code(e)] })] }),
        dCell(a, 2000, i % 2 === 0 ? C.offWhite : C.white),
        dCell(d, 3560, i % 2 === 0 ? C.offWhite : C.white),
      ] })),
    ],
  }),
  spacer(), para([bold('Table 4: ', { color: C.blue }), sp('IAM REST API Endpoints')], { alignment: AlignmentType.CENTER }),

  para([bold('JWT Token Lifecycle:')]),
  bullet([bold('Access token TTL: '), sp('15 minutes. Stateless JWT signed with HMAC-SHA256. Must be sent as '), code('Authorization: Bearer <token>'), sp(' header.')]),
  bullet([bold('Refresh token TTL: '), sp('7 days. Stored in MongoDB '), code('iam.refresh_tokens'), sp(' collection with TTL index for auto-expiry.')]),
  bullet([bold('On password change: '), sp('All refresh tokens for the user are revoked immediately.')]),
  bullet([bold('Access token format payload: '), code('{ "sub":"<userId>", "username":"", "roles":["..."], "exp": <unix>, "iat": <unix> }')]),

  h3('3.1.6  UMACS Telecommand Interface'),
  para('The umacs-tc service connects to the UMACS TCP endpoint to dispatch telecommands. Configuration is bootstrapped from YAML and persisted in Redis (hash key: UMACS_ENV_VARIABLES):'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [3000, 2400, 3960],
    rows: [
      new TableRow({ children: [hCell('Redis Field', 3000), hCell('Default', 2400), hCell('Purpose', 3960)] }),
      ...[
        ['UMACS_TC_IP',              '—  (set in config.yaml)',  'IP address of UMACS TC server'],
        ['UMACS_TC_PORT',            '—  (set in config.yaml)',  'TCP port of UMACS TC server'],
        ['UMACS_DATA_SERVER_IP',     '—  (set in config.yaml)',  'Data server IP for status queries'],
        ['TC_API_REQ_SOURCE',        'SPASDACS',                 'Source identifier in TC API request'],
        ['TC_API_REQ_PRIORITY',      'NORMAL',                   'Command priority level'],
        ['TC_API_REQ_EXECUTION_MODE','NORMAL',                   'Execution mode (NORMAL / IMMEDIATE)'],
        ['TC_API_REQ_SUBSYSTEM',     'ALL',                      'Default subsystem filter'],
      ].map(([f, d, p], i) => new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 3000, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? C.offWhite : C.white, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [code(f)] })] }),
        dCell(d, 2400, i % 2 === 0 ? C.offWhite : C.white),
        dCell(p, 3960, i % 2 === 0 ? C.offWhite : C.white),
      ] })),
    ],
  }),
  spacer(), para([bold('Table 5: ', { color: C.blue }), sp('UMACS TC Redis Configuration Fields')], { alignment: AlignmentType.CENTER }),

  h3('3.1.7  MongoDB Data Interface'),
  para([bold('Connection: '), code('mongodb://localhost:27017'), sp(' (configurable). Default database: '), code('astra'), sp('. IAM database: '), code('iam'), sp('.')]),
  spacer(),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2200, 1800, 5360],
    rows: [
      new TableRow({ children: [hCell('Collection', 2200), hCell('Database', 1800), hCell('Contents', 5360)] }),
      ...[
        ['spasdacs',        'astra', 'Diagram documents – id, name, description, modelData (GoJS JSON), autoViewInclude, autoViewDuration, createdAt, updatedAt'],
        ['tm_mnemonics',    'astra', 'TM mnemonic catalog: _id, subsystem, type (BINARY/ANALOG), processingType, range, limits, expectedValue, tolerance, unit, enableComparison, enableLimit, enableStorage'],
        ['tc_mnemonics',    'astra', 'TC mnemonic catalog: subsystem, command mnemonics, parameters, safety flags'],
        ['udtm',            'astra', 'User Display Telemetry Map versions with timestamp and author'],
        ['dtm_procedures',  'astra', 'DTM automation procedures in JSON format'],
        ['users',           'iam',   'User accounts: id, username, email, passwordHash (bcrypt), fullName, roles[], isActive, createdAt, updatedAt'],
        ['roles',           'iam',   'Role definitions: id, name, description, permissions[], createdAt, updatedAt'],
        ['refresh_tokens',  'iam',   'Active refresh tokens: token (hashed), userId, expiresAt (TTL index), createdAt'],
        ['casbin_rules',    'iam',   'Casbin RBAC policy rules (ptype, v0–v5)'],
      ].map(([col, db, c], i) => new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 2200, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? C.offWhite : C.white, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [code(col)] })] }),
        dCell(db, 1800, i % 2 === 0 ? C.offWhite : C.white),
        dCell(c, 5360, i % 2 === 0 ? C.offWhite : C.white),
      ] })),
    ],
  }),
  spacer(), para([bold('Table 6: ', { color: C.blue }), sp('MongoDB Collections')], { alignment: AlignmentType.CENTER }),

  h3('3.1.8  Redis Cache Interface'),
  para([bold('Connection: '), code('localhost:6379'), sp(' (configurable). Used as the real-time telemetry cache and inter-service shared state store.')]),
  spacer(),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [3200, 6160],
    rows: [
      new TableRow({ children: [hCell('Key Pattern', 3200), hCell('Description', 6160)] }),
      ...[
        ['TM_{CHAIN}_MAP',           'Redis hash: param → proc_value for a named chain'],
        ['TM_{CHAIN}_PKT',           'Redis hash: param → full raw JSON packet for a named chain'],
        ['TM_MAP',                   'Unified Redis hash: all chain params merged (suffix rules applied)'],
        ['HEARTBEAT_{CHAIN}',        'String: CONNECTED | DATA_BREAK | CONNECTION_FAILED; TTL = 2 s when OK'],
        ['UMACS_ENV_VARIABLES',      'Hash: UMACS TC configuration fields (see Table 5)'],
        ['LIMIT_FAILURES',           'Sorted set / hash: currently active limit failures with timestamp'],
        ['CHAIN_MISMATCHES',         'Hash: comparator mismatches between chain pairs'],
        ['SIMULATOR_STATUS',         'String: running | stopped'],
        ['UDTM_VALUES',              'Hash: current UDTM parameter values'],
      ].map(([k, d], i) => new TableRow({ children: [
        new TableCell({ borders: cellBorders, width: { size: 3200, type: WidthType.DXA },
          shading: { fill: i % 2 === 0 ? C.offWhite : C.white, type: ShadingType.CLEAR },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [new Paragraph({ children: [code(k)] })] }),
        dCell(d, 6160, i % 2 === 0 ? C.offWhite : C.white),
      ] })),
    ],
  }),
  spacer(), para([bold('Table 7: ', { color: C.blue }), sp('Redis Key Patterns')], { alignment: AlignmentType.CENTER }),

  // ── 3.2 Functional Requirements ──────────────────────────────────────────
  pageBreak(), h2('3.2  Functional Requirements'),

  h3('3.2.1  Diagram Editor (Block Schematic Authoring)'),
  para('[SRS-N-01 through SRS-N-15 | FRD: NV-01 – NV-22]'),
  numbered('SRS-N-01: The editor SHALL support drawing basic shapes: rectangle, circle, ellipse, line, and triangle on a canvas grid.'),
  numbered('SRS-N-02: The editor SHALL support scaling, rotating, and repositioning shapes with pixel-precision handles.'),
  numbered('SRS-N-03: The editor SHALL provide cut, copy, paste, delete, align, and group operations on shapes and shape groups.'),
  numbered('SRS-N-04: The editor SHALL provide undo/redo stack with a minimum depth of 50 operations.'),
  numbered('SRS-N-05: The editor SHALL allow changing fill color, border color, and border width of each shape.'),
  numbered('SRS-N-06: The editor SHALL allow importing PNG/SVG images as background or custom subsystem block shapes.'),
  numbered('SRS-N-07: The editor SHALL support saving diagrams locally to the browser (JSON file) and remotely to MongoDB via POST /api/go/v1/diagrams.'),
  numbered('SRS-N-08: The editor SHALL support opening diagrams by fetching from GET /api/go/v1/diagrams/{id} and re-hydrating the canvas.'),
  numbered('SRS-N-09: The editor SHALL provide a shape library with user-defined custom subsystem block templates stored per-project.'),
  numbered('SRS-N-10: The editor SHALL support adding descriptive labels and free-text annotations on any canvas element.'),
  numbered('SRS-N-11: The editor SHALL support connector lines/arrows between blocks to indicate signal flow paths (Test path / Signal flow path).'),
  numbered('SRS-N-12: The editor SHALL support conditional visibility rules per block – a block SHALL be hidden or shown based on a configured telemetry value condition.'),
  numbered('SRS-N-13: The editor SHALL provide a multiple-page canvas. Pages SHALL be named and navigable via page-tab strip.'),
  numbered('SRS-N-14: Cross-page navigation links SHALL be configurable on blocks so operators can jump between pages by clicking a block.'),
  numbered('SRS-N-15: The editor SHALL operate in Admin role or higher; Operator, Viewer, and unauthenticated users SHALL have read-only access to diagrams.'),

  h3('3.2.2  Telemetry / SMON / ADC Data Binding'),
  para('[SRS-N-16 through SRS-N-22 | FRD: NV-23 – NV-35]'),
  numbered('SRS-N-16: Each canvas shape SHALL support associating one or more TM/SMON/ADC mnemonics from the MongoDB mnemonic catalog.'),
  numbered('SRS-N-17: The following visual attributes SHALL be programmable per-mnemonic via configurable value-to-attribute mapping rules: fill color, border color, border width, element width, element height, rotation angle, x/y position, and visibility (show/hide).'),
  numbered('SRS-N-18: On mouse-over of any block, a telemetry dropdown SHALL appear displaying the mnemonic name, current processed value, raw count, unit, upper limit, lower limit, and timestamp. Values SHALL update in real-time without closing the dropdown.'),
  numbered('SRS-N-19: The association editor SHALL offer type-ahead autocomplete backed by GET /api/go/v1/mnemonics/tm/{subsystem}, enabling rapid mnemonic selection.'),
  numbered('SRS-N-20: Binding definitions SHALL be persisted as part of the diagram modelData in MongoDB.'),
  numbered('SRS-N-21: The system SHALL support BINARY (digital state) and ANALOG (continuous value) mnemonic types with separate attribute-mapping rule editors.'),
  numbered('SRS-N-22: A signal-flow path highlight mode SHALL allow the user to toggle highlighting of connected blocks and connector lines whose source mnemonic matches a chosen value state.'),

  h3('3.2.3  Real-time Viewer'),
  para('[SRS-N-23 through SRS-N-35 | FRD: NV-36 – NV-56]'),
  numbered('SRS-N-23: The viewer SHALL receive telemetry updates via NATS WebSocket bridge and apply block attribute changes within 500 ms of data arrival at the ingest service.'),
  numbered('SRS-N-24: A TM/SMON/ADC link-status indicator SHALL be displayed in the header for each configured chain. States: CONNECTED (green), DATA_BREAK (amber), CONNECTION_FAILED (red).'),
  numbered('SRS-N-25: On DATA_BREAK, a visual banner alert AND an audio alarm (configurable tone) SHALL be triggered. The banner SHALL remain until data resumes.'),
  numbered('SRS-N-26: When a block transitions to an invalid / prohibited combination, a visual alert (block border flashes red) AND audio alert SHALL activate. The user SHALL be able to define invalid condition logic (multi-mnemonic Boolean expressions).'),
  numbered('SRS-N-27: A state-change blink SHALL accompany any BINARY mnemonic transition. Blink duration SHALL be 1 second; the block shall return to steady state thereafter.'),
  numbered('SRS-N-28: Limit violations (analog value outside lower/upper limits) SHALL cause the associated block fill color to change to the configured alarm color (default: red for high, amber for low) and trigger an audio alert.'),
  numbered('SRS-N-29: Limit violation alerts SHALL remain active until the value returns within limits. A dedicated alarm panel SHALL list all active violations with mnemonic name, value, limit, and timestamp.'),
  numbered('SRS-N-30: The viewer SHALL support zoom in / zoom out (10 %–400 % range) on the canvas, with pan by mouse drag.'),
  numbered('SRS-N-31: A page-selection dropdown SHALL allow switching between all pages of the open diagram.'),
  numbered('SRS-N-32: The viewer SHALL be accessible to unauthenticated users (direct viewer mode) in a read-only capacity. The browser SHALL display live telemetry and diagram state without requiring login. No TC panel, no editor controls SHALL be rendered in unauthenticated mode.'),
  numbered('SRS-N-33: Authenticated Viewer role SHALL have identical read-only access as unauthenticated direct viewer, with additional ability to view TC history log.'),
  numbered('SRS-N-34: The viewer SHALL operate on any PC connected to CHECKNET via a standard browser; no plugins or native installations SHALL be required.'),
  numbered('SRS-N-35: A live value numeric overlay display option SHALL be available per block to show the current processed value as text on the canvas block face.'),

  h3('3.2.4  Auto View (Automated Slideshow)'),
  para('[SRS-N-36 through SRS-N-42 | FRD: NV-57 – NV-63]'),
  numbered('SRS-N-36: The system SHALL provide an Auto View mode that cycles through a user-selected subset of diagrams in sequence.'),
  numbered('SRS-N-37: Each diagram SHALL have an autoViewInclude flag (Boolean) and autoViewDuration (integer, seconds) configurable via PATCH /api/go/v1/diagrams/{id}.'),
  numbered('SRS-N-38: The dwell time per diagram SHALL be configurable from 5 to 3600 seconds.'),
  numbered('SRS-N-39: Auto View SHALL be accessible to all users including unauthenticated direct viewers.'),
  numbered('SRS-N-40: The user SHALL be able to pause, resume, skip-forward, and skip-backward during Auto View.'),
  numbered('SRS-N-41: Any active alarm (data break or limit violation) SHALL cause Auto View to pause on the alarming diagram until the alarm is acknowledged or clears.'),
  numbered('SRS-N-42: The Auto View sequence order SHALL be the order in which diagrams appear in the diagram list (sorted by name ascending by default).'),

  h3('3.2.5  Telecommanding'),
  para('[SRS-N-43 through SRS-N-58 | FRD: NV-64 – NV-76]'),
  numbered('SRS-N-43: Telecommanding SHALL only be accessible to authenticated users with Operator or Admin role. Viewer-role and unauthenticated users SHALL see no TC interface elements.'),
  numbered('SRS-N-44: The TC panel SHALL populate commands from the MongoDB TC mnemonic catalog retrieved via GET /api/go/v1/mnemonics/tc/{subsystem}.'),
  numbered('SRS-N-45: The TC panel SHALL provide subsystem filtering and a search bar for rapid command lookup.'),
  numbered('SRS-N-46: Before dispatching any telecommand, the system SHALL present a confirmation dialog showing command name, parameters, and subsystem to the operator.'),
  numbered('SRS-N-47: Commands SHALL be dispatched to the umacs-tc service, which queues and forwards them to the UMACS TCP endpoint.'),
  numbered('SRS-N-48: The umacs-tc-emulator service SHALL provide a software TC stub for integration testing without a live UMACS connection.'),
  numbered('SRS-N-49: TC execution status (QUEUED, SENT, ACKNOWLEDGED, FAILED) SHALL be shown in real-time in the TC status panel.'),
  numbered('SRS-N-50: The system SHALL maintain a TC history log (list of all dispatched commands with timestamp, user, status) accessible to Operator and Admin roles.'),
  numbered('SRS-N-51: The system SHALL prevent dispatch of prohibited command combinations as defined by safety flags in the TC mnemonic catalog.'),
  numbered('SRS-N-52: Spacecraft safety SHALL be enforced by requiring a two-step confirm (select → confirm → send) with no single-click TC dispatch.'),
  numbered('SRS-N-53: TC commands dispatched from the block-schematic display SHALL be supported (right-click on block → TC shortcut menu) for Admin and Operator roles.'),
  numbered('SRS-N-54: The SCO (Special Checkout Object) command interface SHALL be accessible from the TC panel for instrument-level commands.'),
  numbered('SRS-N-55: TC history log SHALL be persisted in MongoDB and be queryable by subsystem, user, time range.'),
  numbered('SRS-N-56: All TC dispatches SHALL be logged with the authenticated username, timestamp, command, and execution result for audit purposes.'),
  numbered('SRS-N-57: The TC API request parameters (source, priority, execution mode, subsystem) SHALL be configurable at runtime via Redis (UMACS_ENV_VARIABLES) without service restart.'),
  numbered('SRS-N-58: The system SHALL display the current TC configuration (IP, port, source, priority, mode) in the TC settings panel accessible to Admin role.'),

  h3('3.2.6  Data Persistence – Diagram CRUD'),
  para('[SRS-N-59 through SRS-N-65 | FRD: NV-77 – NV-85]'),
  numbered('SRS-N-59: Diagrams SHALL be persisted in MongoDB spasdacs collection as documents containing id (string UUID), name, description, modelData (GoJS JSON), backgroundColor, autoViewInclude, autoViewDuration, createdAt, updatedAt.'),
  numbered('SRS-N-60: The POST /diagrams endpoint SHALL perform an upsert (ReplaceOne with upsert=true) keyed on the diagram id field, preserving createdAt on update.'),
  numbered('SRS-N-61: The DELETE /diagrams/{id} endpoint SHALL return HTTP 404 if the diagram does not exist and HTTP 200 on success.'),
  numbered('SRS-N-62: The list endpoint (GET /diagrams) SHALL return SpasdacsMeta objects only (no modelData) to minimise payload size for the diagram selector UI.'),
  numbered('SRS-N-63: The full diagram including modelData SHALL only be returned by GET /diagrams/{id}.'),
  numbered('SRS-N-64: Diagram names SHALL be unique per deployment. A uniqueness check SHALL be enforced at the API layer before persisting.'),
  numbered('SRS-N-65: Diagrams SHALL be exportable as JSON files from the browser for backup or transfer between deployments.'),

  h3('3.2.7  Mnemonic Catalog Management'),
  para('[SRS-N-66 through SRS-N-72 | FRD: NV-86 – NV-93]'),
  numbered('SRS-N-66: TM mnemonic catalog SHALL be uploadable via POST /api/go/v1/telemetry/upload accepting CSV or JSON file format.'),
  numbered('SRS-N-67: Each TM mnemonic document SHALL carry fields: _id, subsystem, type (BINARY/ANALOG), processingType, range, limits, expectedValue, tolerance, unit, digitalStatus, cdbMnemonic, sourceFile, enableComparison, enableLimit, enableStorage.'),
  numbered('SRS-N-68: The limits, tolerance, expectedValue, enableComparison, enableLimit, enableStorage fields SHALL be individually updatable at runtime without re-uploading the catalog (PUT /telemetry/limits, /tolerance, /expected-value, /ignore-* endpoints).'),
  numbered('SRS-N-69: TC mnemonic catalog SHALL be uploadable via POST /api/go/v1/telecommand/upload.'),
  numbered('SRS-N-70: The mnemonic catalog SHALL support per-subsystem querying for Monaco editor autocomplete.'),
  numbered('SRS-N-71: The system SHALL maintain backward compatibility if a mnemonic tolerance value is stored as a string (FlexFloat64 decoder).'),
  numbered('SRS-N-72: Bulk limit update SHALL be supported via PUT /telemetry/limits/bulk accepting an array of {mnemonic, upper, lower} objects.'),

  h3('3.2.8  UDTM / DTM Procedure Management'),
  para('[SRS-N-73 through SRS-N-78 | FRD: NV-94 – NV-99]'),
  numbered('SRS-N-73: UDTM (User Display Telemetry Map) defines a user-configurable mapping of mnemonic names to display values. The current version SHALL be retrievable via GET /ud-tm.'),
  numbered('SRS-N-74: A new UDTM version SHALL be created by POST /ud-tm. All previous versions SHALL remain accessible via GET /ud-tm/versions/{version} for rollback.'),
  numbered('SRS-N-75: DTM Procedures define scripted animation sequences. They SHALL be stored in MongoDB via POST /dtm/procedures and applied to Redis at runtime via PUT /dtm/values.'),
  numbered('SRS-N-76: DTM procedure updates SHALL publish a NATS message on subject DTM_PROCEDURES_UPDATED to notify subscribed frontend clients.'),
  numbered('SRS-N-77: UDTM and DTM changes SHALL only be performable by users with Admin role or higher.'),
  numbered('SRS-N-78: The current UDTM hash-map values SHALL be readable from Redis via GET /maps/{name} endpoint for debugging and verification.'),

  h3('3.2.9  Identity and Access Management (IAM)'),
  para('[SRS-N-79 through SRS-N-95 | FRD: NV-100 – NV-116]'),
  numbered('SRS-N-79: The IAM microservice SHALL run as an independent Go service on port 8093 (configurable).'),
  numbered('SRS-N-80: The IAM service SHALL use MongoDB database iam with collections users, roles, refresh_tokens, casbin_rules.'),
  numbered('SRS-N-81: On first startup, the IAM service SHALL seed four default roles (super_admin, admin, operator, viewer) and a default admin user (username: admin, password: Admin@123!) if the database is empty.'),
  numbered('SRS-N-82: Passwords SHALL be stored as bcrypt hashes (minimum cost factor 12). Plain-text passwords SHALL never be stored or logged.'),
  numbered('SRS-N-83: Access tokens SHALL be JWT signed with HMAC-SHA256 using a configurable secret key. Token TTL SHALL be 15 minutes.'),
  numbered('SRS-N-84: Refresh tokens SHALL be opaque random strings stored as SHA-256 hashes in MongoDB with a TTL index of 7 days.'),
  numbered('SRS-N-85: The IAM service SHALL use Casbin with MongoDB adapter for RBAC policy enforcement. Policy rules SHALL persist across restarts.'),
  numbered('SRS-N-86: The four built-in roles SHALL have the following default permissions:'),
  bullet('super_admin: iam:roles:*, iam:users:*, iam:permissions:*', 1),
  bullet('admin: * (full access to all resources)', 1),
  bullet('operator: telemetry:read, telemetry:write, commands:read, commands:write, simulator:read, simulator:write', 1),
  bullet('viewer: telemetry:read, commands:read, simulator:read', 1),
  numbered('SRS-N-87: Unauthenticated (direct viewer) access SHALL be permitted for diagram view and live telemetry display only. No TC, no editor, no user management SHALL be accessible without a valid token.'),
  numbered('SRS-N-88: Role creation, editing, and deletion SHALL only be performed by super_admin.'),
  numbered('SRS-N-89: User creation, deletion, and role assignment SHALL require iam:users:write permission.'),
  numbered('SRS-N-90: A user SHALL be able to read and update their own profile (GET/PUT /users/{id}) without admin permission (self-service).'),
  numbered('SRS-N-91: The system SHALL support account locking via isActive=false. Locked accounts SHALL be denied token issuance.'),
  numbered('SRS-N-92: The /iam/auth/me endpoint SHALL return the full user profile including assigned roles for the currently authenticated user.'),
  numbered('SRS-N-93: The IAM service SHALL expose a health check at GET /health returning { "status":"ok", "service":"iam" } without authentication.'),
  numbered('SRS-N-94: All IAM endpoints SHALL be served over HTTP on the internal CHECKNET; TLS is deferred to future network layer (not a v2.0 requirement).'),
  numbered('SRS-N-95: The Gateway service SHALL forward JWT validation errors as HTTP 401 Unauthorized to API clients.'),

  h3('3.2.10  Limit Monitoring and Alerting'),
  para('[SRS-N-96 – SRS-N-97 | FRD: NV-117 – NV-120]'),
  numbered('SRS-N-96: The limiter service SHALL continuously compare incoming TM values against the upper/lower limits stored in the mnemonic catalog. Violations SHALL be written to Redis LIMIT_FAILURES key.'),
  numbered('SRS-N-97: ANALOG mnemonics SHALL support a configurable tolerance value to suppress spurious limit failure alerts on noisy channels.'),

  h3('3.2.11  Chain Comparator'),
  para('[SRS-N-98 | FRD: NV-121]'),
  numbered('SRS-N-98: The comparator service SHALL compare values between parallel chains (e.g., TM1 vs TM2). Mismatches SHALL be written to Redis CHAIN_MISMATCHES key and exposed via GET /chain-mismatches. Per-mnemonic comparison can be disabled via enableComparison flag.'),

  h3('3.2.12  Chain Monitor / Health Watchdog'),
  numbered('SRS-N-99: The chainmon service SHALL periodically poll each chain heartbeat key in Redis and publish chain health status to NATS for consumption by the frontend chain-status indicator.'),

  h3('3.2.13  Telemetry Storage (InfluxDB)'),
  numbered('SRS-N-100: The storage service SHALL write telemetry values to InfluxDB for mnemonics with enableStorage=true. The InfluxDB database, org, and token SHALL be configurable.'),

  h3('3.2.14  Simulator'),
  para('[SRS-N-101 – SRS-N-102 | FRD: NV-122 – NV-123]'),
  numbered('SRS-N-101: The simulator service SHALL generate synthetic TM/SMON/ADC data conforming to the mnemonic catalog ranges, allowing diagram testing without a live SCC connection.'),
  numbered('SRS-N-102: Simulator start/stop SHALL be controllable from the UI. Status SHALL be readable via GET /simulator-status.'),

  // ── 3.3 Performance ──────────────────────────────────────────────────────
  h2('3.3  Performance Requirements'),
  numbered('The Gateway service SHALL handle a minimum of 100 concurrent WebSocket/REST connections without degradation.'),
  numbered('End-to-end latency from SCC WebSocket data arrival to browser render SHALL not exceed 500 ms under nominal load.'),
  numbered('The ingest service SHALL process a minimum of 500 TM parameter updates per second per chain with no Redis pipeline failures.'),
  numbered('MongoDB diagram read (GET /diagrams/{id}) SHALL respond within 100 ms for diagrams up to 2 MB modelData.'),
  numbered('The system SHALL operate on server hardware with minimum 4 GB RAM and a 4-core 2 GHz processor.'),
  numbered('Browser clients SHALL require minimum 2 GB RAM; the UI SHALL be responsive on a laptop-class machine.'),
  numbered('The IAM service SHALL issue a JWT access token within 200 ms of a valid login request under nominal load.'),

  // ── 3.4 Design Constraints ───────────────────────────────────────────────
  h2('3.4  Design Constraints'),
  numbered('All backend services SHALL be written in Go with CGO disabled (CGO_ENABLED=0) to produce statically linked, platform-portable binaries.'),
  numbered('The browser UI SHALL be a React single-page application served as static assets by the Gateway service or a dedicated file server; no server-side rendering.'),
  numbered('TM/SMON/ADC data interfaces SHALL be WebSocket-based, matching the existing SCC data publisher protocol defined in Section 3.1.2.'),
  numbered('All inter-service messaging SHALL use NATS pub/sub; direct service-to-service HTTP calls are prohibited except for health checks.'),
  numbered('The system SHALL run on Windows 10+ and Ubuntu 20.04+ without modification to the compiled binaries.'),
  numbered('MongoDB, Redis, NATS, and InfluxDB are external dependencies; the system does not bundle or manage these services.'),
  numbered('The system SHALL use chi v5 as the HTTP router. No other HTTP frameworks are permitted.'),
  numbered('Configuration SHALL use YAML files managed by Viper. Environment variable overrides SHALL be supported.'),

  // ── 3.5 Software System Attributes ───────────────────────────────────────
  h2('3.5  Software System Attributes'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2000, 7360],
    rows: [
      new TableRow({ children: [hCell('Attribute', 2000), hCell('Requirement', 7360)] }),
      ...[
        ['Reliability',      'All backend services SHALL implement exponential back-off reconnect for WebSocket and NATS connections. The ingest service SHALL log and resume automatically after a chain disconnect within 30 seconds.'],
        ['Availability',     'The system SHALL support hot-restart of individual microservices without data loss from MongoDB or InfluxDB. Redis cache may be cleared on restart; diagrams are always reloaded from MongoDB.'],
        ['Maintainability',  'Each microservice SHALL be independently deployable. Services SHALL communicate only via NATS and shared Redis/MongoDB; no hard-coded cross-service HTTP calls. Configuration is YAML-driven with Viper defaults.'],
        ['Security',         'All TC dispatches require authenticated Operator/Admin role with JWT. Passwords stored as bcrypt hashes. Refresh tokens stored as SHA-256 hashes with TTL. Casbin enforces RBAC for all IAM-protected endpoints.'],
        ['Portability',      'Statically compiled Go binaries run on Windows 10+ and Ubuntu 20.04+ x86-64. No runtime dependencies beyond the external middleware stack.'],
        ['Usability',        'Displays SHALL be aesthetically pleasing and allow at-a-glance detection of spacecraft state anomalies. All interactive controls SHALL be accessible within two mouse clicks from the main display.'],
        ['Traceability',     'All TC commands SHALL be logged with username, timestamp, command, and outcome. All IAM changes SHALL generate a log entry.'],
        ['Extensibility',    'New microservices SHALL follow the cmd/internal/service Go package layout and register with the unified Launcher. New telemetry chains are added via YAML configuration only.'],
      ].map(([a, r], i) => new TableRow({ children: [dCell(a, 2000, i % 2 === 0 ? C.offWhite : C.white), dCell(r, 7360, i % 2 === 0 ? C.offWhite : C.white)] })),
    ],
  }),
  spacer(), para([bold('Table 8: ', { color: C.blue }), sp('Software System Attributes')], { alignment: AlignmentType.CENTER }),

  // ── 3.6 Architecture ─────────────────────────────────────────────────────
  h2('3.6  Software Architecture Overview'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2000, 1400, 5960],
    rows: [
      new TableRow({ children: [hCell('Service', 2000), hCell('Port', 1400), hCell('Responsibility', 5960)] }),
      ...[
        ['launcher',            '—',    'Unified process manager; starts/monitors all services with configurable delays and restart policies'],
        ['ingest',              '—',    'WebSocket subscriber for TM, SMON, ADC chains; writes to Redis; publishes to NATS'],
        ['gateway',             '8090', 'REST + WebSocket API gateway; serves diagram CRUD, mnemonic catalog, telemetry queries, TC upload; bridges NATS to browser'],
        ['limiter',             '—',    'Watches Redis TM_MAP; compares against catalog limits; writes LIMIT_FAILURES to Redis'],
        ['comparator',          '—',    'Cross-chain value comparison; writes CHAIN_MISMATCHES to Redis'],
        ['chainmon',            '—',    'Polls chain heartbeats; publishes health status to NATS'],
        ['storage',             '—',    'Reads Redis TM_MAP; writes time-series data to InfluxDB for enabled mnemonics'],
        ['simulator',           '—',    'Generates synthetic TM/SMON data into Redis for offline diagram testing'],
        ['umacs-tc',            '—',    'REST endpoint receiving TC dispatch requests from gateway; forwards to UMACS TCP socket'],
        ['umacs-tc-emulator',   '—',    'Software stub for umacs-tc; used during integration testing without live UMACS'],
        ['iam',                 '8093', 'Identity & Access Management; JWT issuance, RBAC via Casbin, user/role CRUD against MongoDB iam database'],
      ].map(([s, p, r], i) => new TableRow({ children: [dCell(s, 2000, i % 2 === 0 ? C.offWhite : C.white), dCell(p, 1400, i % 2 === 0 ? C.offWhite : C.white), dCell(r, 5960, i % 2 === 0 ? C.offWhite : C.white)] })),
    ],
  }),
  spacer(), para([bold('Table 9: ', { color: C.blue }), sp('Microservice Architecture Summary')], { alignment: AlignmentType.CENTER }),
];

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 4 – REQUIREMENTS TRACEABILITY MATRIX
// ══════════════════════════════════════════════════════════════════════════
const rtmData = [
  // SRS ID       | Section  | FRD ID        | Description                                           | Status
  ['SRS-N-01', '3.2.1', 'NV-01',      'Diagram editor – basic shape drawing',                       'Implemented'],
  ['SRS-N-02', '3.2.1', 'NV-02',      'Diagram editor – scale, rotate, reposition shapes',          'Implemented'],
  ['SRS-N-03', '3.2.1', 'NV-03',      'Diagram editor – cut / copy / paste / delete / align / group','Implemented'],
  ['SRS-N-04', '3.2.1', 'NV-04',      'Diagram editor – undo/redo (depth ≥ 50)',                    'Implemented'],
  ['SRS-N-05', '3.2.1', 'NV-05',      'Diagram editor – fill / border color / border width',        'Implemented'],
  ['SRS-N-06', '3.2.1', 'NV-06',      'Diagram editor – import PNG/SVG images',                     'Implemented'],
  ['SRS-N-07', '3.2.1', 'NV-07',      'Diagram save to MongoDB via POST /diagrams',                 'Implemented'],
  ['SRS-N-08', '3.2.1', 'NV-08',      'Diagram open from MongoDB via GET /diagrams/{id}',           'Implemented'],
  ['SRS-N-09', '3.2.1', 'NV-09',      'Custom shape library per project',                           'Implemented'],
  ['SRS-N-10', '3.2.1', 'NV-10',      'Labels and text annotations on canvas',                      'Implemented'],
  ['SRS-N-11', '3.2.1', 'NV-11',      'Connector lines / signal-flow arrows',                       'Implemented'],
  ['SRS-N-12', '3.2.1', 'NV-12',      'Conditional block visibility (hide/show per TM value)',      'Implemented'],
  ['SRS-N-13', '3.2.1', 'NV-13',      'Multi-page canvas with named page tabs',                     'Implemented'],
  ['SRS-N-14', '3.2.1', 'NV-14',      'Cross-page navigation links on blocks',                      'Implemented'],
  ['SRS-N-15', '3.2.1', 'NV-15',      'Editor access restricted to Admin+ role',                    'Implemented'],
  ['SRS-N-16', '3.2.2', 'NV-23',      'Associate TM/SMON/ADC mnemonics to shapes',                  'Implemented'],
  ['SRS-N-17', '3.2.2', 'NV-24',      'Programmable visual attributes (color, size, rotate, pos, hide)', 'Implemented'],
  ['SRS-N-18', '3.2.2', 'NV-25',      'Mouse-over TM dropdown with real-time values',               'Implemented'],
  ['SRS-N-19', '3.2.2', 'NV-26',      'Monaco autocomplete from mnemonic catalog',                  'Implemented'],
  ['SRS-N-20', '3.2.2', 'NV-27',      'Binding persistence in diagram modelData',                   'Implemented'],
  ['SRS-N-21', '3.2.2', 'NV-28',      'BINARY and ANALOG mnemonic binding support',                 'Implemented'],
  ['SRS-N-22', '3.2.2', 'NV-29',      'Signal-flow path highlight mode',                            'Implemented'],
  ['SRS-N-23', '3.2.3', 'NV-36',      'Real-time TM update latency ≤ 500 ms',                       'Implemented'],
  ['SRS-N-24', '3.2.3', 'NV-37',      'Chain link-status indicator (CONNECTED/DATA_BREAK/FAILED)',  'Implemented'],
  ['SRS-N-25', '3.2.3', 'NV-38',      'Data-break visual banner and audio alarm',                   'Implemented'],
  ['SRS-N-26', '3.2.3', 'NV-39',      'Invalid/prohibited combination visual+audio alert',          'Implemented'],
  ['SRS-N-27', '3.2.3', 'NV-40',      'BINARY state-change blink (1 s duration)',                   'Implemented'],
  ['SRS-N-28', '3.2.3', 'NV-41',      'Limit violation block color change and audio alert',         'Implemented'],
  ['SRS-N-29', '3.2.3', 'NV-42',      'Persistent alarm panel with mnemonic / value / limit / time','Implemented'],
  ['SRS-N-30', '3.2.3', 'NV-43',      'Canvas zoom 10%–400% and pan',                              'Implemented'],
  ['SRS-N-31', '3.2.3', 'NV-44',      'Page-selection dropdown',                                    'Implemented'],
  ['SRS-N-32', '3.2.3', 'NV-45',      'Unauthenticated direct viewer (read-only, no TC)',           'Implemented'],
  ['SRS-N-33', '3.2.3', 'NV-46',      'Viewer role – read-only + TC history log',                   'Implemented'],
  ['SRS-N-34', '3.2.3', 'NV-47',      'Browser-only access, no client installation',                'Implemented'],
  ['SRS-N-35', '3.2.3', 'NV-48',      'Live numeric value overlay on block face',                   'Implemented'],
  ['SRS-N-36', '3.2.4', 'NV-57',      'Auto View slideshow mode',                                   'Implemented'],
  ['SRS-N-37', '3.2.4', 'NV-58',      'Per-diagram autoViewInclude and autoViewDuration flags',     'Implemented'],
  ['SRS-N-38', '3.2.4', 'NV-59',      'Configurable dwell time 5–3600 s per diagram',               'Implemented'],
  ['SRS-N-39', '3.2.4', 'NV-60',      'Auto View accessible to all users including unauthenticated','Implemented'],
  ['SRS-N-40', '3.2.4', 'NV-61',      'Pause / resume / skip-forward / skip-backward controls',    'Implemented'],
  ['SRS-N-41', '3.2.4', 'NV-62',      'Auto View pauses on alarming diagram until cleared',         'Implemented'],
  ['SRS-N-42', '3.2.4', 'NV-63',      'Sequence order by diagram name ascending',                   'Implemented'],
  ['SRS-N-43', '3.2.5', 'NV-64',      'TC access restricted to Operator+ role',                     'Implemented'],
  ['SRS-N-44', '3.2.5', 'NV-65',      'TC panel populated from MongoDB TC mnemonic catalog',        'Implemented'],
  ['SRS-N-45', '3.2.5', 'NV-66',      'TC subsystem filter and command search bar',                 'Implemented'],
  ['SRS-N-46', '3.2.5', 'NV-67',      'TC confirmation dialog before dispatch',                     'Implemented'],
  ['SRS-N-47', '3.2.5', 'NV-68',      'Commands dispatched via umacs-tc service to UMACS TCP',      'Implemented'],
  ['SRS-N-48', '3.2.5', 'NV-69',      'umacs-tc-emulator for integration testing',                  'Implemented'],
  ['SRS-N-49', '3.2.5', 'NV-70',      'Real-time TC execution status (QUEUED/SENT/ACK/FAILED)',     'Implemented'],
  ['SRS-N-50', '3.2.5', 'NV-71',      'TC history log (Operator+ access)',                          'Implemented'],
  ['SRS-N-51', '3.2.5', 'NV-72',      'Prohibited command combination prevention',                  'Implemented'],
  ['SRS-N-52', '3.2.5', 'NV-73',      'Two-step confirm for spacecraft safety (select→confirm→send)','Implemented'],
  ['SRS-N-53', '3.2.5', 'NV-74',      'Block right-click TC shortcut menu (Admin/Operator)',        'Implemented'],
  ['SRS-N-54', '3.2.5', 'NV-75',      'SCO command interface accessible from TC panel',             'Implemented'],
  ['SRS-N-55', '3.2.5', 'NV-76',      'TC history persisted in MongoDB, queryable',                 'Implemented'],
  ['SRS-N-56', '3.2.5', 'NV-76',      'TC audit log: username, timestamp, command, result',         'Implemented'],
  ['SRS-N-57', '3.2.5', 'NV-76',      'TC API params runtime-configurable via Redis (no restart)',  'Implemented'],
  ['SRS-N-58', '3.2.5', 'NV-76',      'TC config panel (Admin): shows IP/port/source/priority/mode','Implemented'],
  ['SRS-N-59', '3.2.6', 'NV-77',      'Diagram MongoDB document schema (id, name, modelData, …)',  'Implemented'],
  ['SRS-N-60', '3.2.6', 'NV-78',      'POST /diagrams – upsert preserving createdAt',               'Implemented'],
  ['SRS-N-61', '3.2.6', 'NV-79',      'DELETE /diagrams/{id} – 404 on missing',                    'Implemented'],
  ['SRS-N-62', '3.2.6', 'NV-80',      'GET /diagrams returns metadata only (no modelData)',         'Implemented'],
  ['SRS-N-63', '3.2.6', 'NV-81',      'GET /diagrams/{id} returns full modelData',                  'Implemented'],
  ['SRS-N-64', '3.2.6', 'NV-82',      'Diagram name uniqueness enforced at API layer',              'Implemented'],
  ['SRS-N-65', '3.2.6', 'NV-83',      'Diagram JSON export from browser for backup/transfer',       'Implemented'],
  ['SRS-N-66', '3.2.7', 'NV-86',      'TM catalog upload via POST /telemetry/upload (CSV/JSON)',    'Implemented'],
  ['SRS-N-67', '3.2.7', 'NV-87',      'TM mnemonic document schema (all fields)',                   'Implemented'],
  ['SRS-N-68', '3.2.7', 'NV-88',      'Runtime editable: limits, tolerance, expectedValue, flags',  'Implemented'],
  ['SRS-N-69', '3.2.7', 'NV-89',      'TC catalog upload via POST /telecommand/upload',             'Implemented'],
  ['SRS-N-70', '3.2.7', 'NV-90',      'Per-subsystem mnemonic query for Monaco autocomplete',       'Implemented'],
  ['SRS-N-71', '3.2.7', 'NV-91',      'FlexFloat64 tolerance backward compatibility (string→float)','Implemented'],
  ['SRS-N-72', '3.2.7', 'NV-92',      'Bulk limit update via PUT /telemetry/limits/bulk',           'Implemented'],
  ['SRS-N-73', '3.2.8', 'NV-94',      'UDTM current version via GET /ud-tm',                        'Implemented'],
  ['SRS-N-74', '3.2.8', 'NV-95',      'UDTM versioning – POST creates new, GET /{version} retrieves old', 'Implemented'],
  ['SRS-N-75', '3.2.8', 'NV-96',      'DTM procedures – save/apply; publishes DTM_PROCEDURES_UPDATED','Implemented'],
  ['SRS-N-76', '3.2.8', 'NV-97',      'NATS notification on DTM procedure update',                  'Implemented'],
  ['SRS-N-77', '3.2.8', 'NV-98',      'UDTM/DTM changes restricted to Admin+ role',                 'Implemented'],
  ['SRS-N-78', '3.2.8', 'NV-99',      'UDTM Redis map readable via GET /maps/{name}',               'Implemented'],
  ['SRS-N-79', '3.2.9', 'NV-100',     'IAM independent microservice on port 8093',                  'Implemented'],
  ['SRS-N-80', '3.2.9', 'NV-101',     'IAM MongoDB database iam (users, roles, tokens, casbin)',    'Implemented'],
  ['SRS-N-81', '3.2.9', 'NV-102',     'First-startup seed: default roles + admin user',             'Implemented'],
  ['SRS-N-82', '3.2.9', 'NV-103',     'Passwords stored as bcrypt hashes (cost ≥ 12)',              'Implemented'],
  ['SRS-N-83', '3.2.9', 'NV-104',     'JWT access token HMAC-SHA256, TTL = 15 min',                 'Implemented'],
  ['SRS-N-84', '3.2.9', 'NV-105',     'Refresh token – opaque hash, TTL = 7 days, MongoDB TTL index','Implemented'],
  ['SRS-N-85', '3.2.9', 'NV-106',     'Casbin RBAC with MongoDB adapter',                           'Implemented'],
  ['SRS-N-86', '3.2.9', 'NV-107',     'Default role permissions (super_admin/admin/operator/viewer)','Implemented'],
  ['SRS-N-87', '3.2.9', 'NV-108',     'Unauthenticated direct viewer – no TC, no editor',           'Implemented'],
  ['SRS-N-88', '3.2.9', 'NV-109',     'Role CRUD restricted to super_admin',                        'Implemented'],
  ['SRS-N-89', '3.2.9', 'NV-110',     'User CRUD requires iam:users:write',                         'Implemented'],
  ['SRS-N-90', '3.2.9', 'NV-111',     'Self-service: user can read/update own profile',             'Implemented'],
  ['SRS-N-91', '3.2.9', 'NV-112',     'Account locking via isActive=false',                         'Implemented'],
  ['SRS-N-92', '3.2.9', 'NV-113',     '/iam/auth/me returns full profile + roles',                  'Implemented'],
  ['SRS-N-93', '3.2.9', 'NV-114',     'IAM health check at GET /health (no auth)',                  'Implemented'],
  ['SRS-N-94', '3.2.9', 'NV-115',     'HTTP on CHECKNET; TLS deferred',                             'Implemented'],
  ['SRS-N-95', '3.2.9', 'NV-116',     'Gateway JWT validation → HTTP 401 on failure',               'Implemented'],
  ['SRS-N-96', '3.2.10','NV-117',     'Limiter: limit violations written to Redis LIMIT_FAILURES',   'Implemented'],
  ['SRS-N-97', '3.2.10','NV-118',     'Limiter: per-mnemonic analog tolerance for noise suppression','Implemented'],
  ['SRS-N-98', '3.2.11','NV-121',     'Comparator: cross-chain mismatch detection + Redis storage', 'Implemented'],
  ['SRS-N-99', '3.2.12','NV-119',     'Chainmon: heartbeat polling + NATS health status publish',   'Implemented'],
  ['SRS-N-100','3.2.13','NV-120',     'Storage: InfluxDB time-series write for enabled mnemonics',  'Implemented'],
  ['SRS-N-101','3.2.14','NV-122',     'Simulator: synthetic TM data generation from catalog ranges','Implemented'],
  ['SRS-N-102','3.2.14','NV-123',     'Simulator: start/stop from UI via GET /simulator-status',    'Implemented'],
  ['SRS-N-98F', '2.5',  '—',         'Audit trail (tamper-evident log in iam.audit)',               'Deferred'],
  ['SRS-N-99F', '2.5',  '—',         'Diagram block template library',                              'Deferred'],
  ['SRS-N-100F','2.5',  '—',         'ACSS automated checkout sequence integration',                'Deferred'],
  ['SRS-N-101F','2.5',  '—',         'Multi-spacecraft concurrent display',                         'Deferred'],
  ['SRS-N-102F','2.5',  '—',         'Offline InfluxDB playback mode',                              'Deferred'],
];

const sec4 = [
  pageBreak(), h1('4.  Requirements Traceability Matrix'),
  para('The following table maps each SRS requirement to its source FRD requirement, document section, and implementation status.'),
  spacer(),
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [1200, 1400, 1400, 4160, 1200],
    rows: [
      new TableRow({ children: [
        hCell('SRS ID', 1200), hCell('Section', 1400), hCell('FRD Req ID', 1400),
        hCell('Description', 4160), hCell('Status', 1200),
      ] }),
      ...rtmData.map(([id, sec, frd, desc, status], idx) => reqRow(id, sec, frd, desc, status, idx)),
    ],
  }),
  spacer(),
  para([bold('Table 10: ', { color: C.blue }), sp('Requirements Traceability Matrix')], { alignment: AlignmentType.CENTER }),
  spacer(),
  new Table({
    width: { size: 4000, type: WidthType.DXA }, columnWidths: [600, 3400],
    rows: [
      new TableRow({ children: [hCell('Key', 600), hCell('Meaning', 3400)] }),
      new TableRow({ children: [dCell('A', 600), dCell('Addition (new requirement)', 3400)] }),
      new TableRow({ children: [dCell('M', 600, C.offWhite), dCell('Modification of existing requirement', 3400, C.offWhite)] }),
      new TableRow({ children: [dCell('D', 600), dCell('Deletion of previous requirement', 3400)] }),
    ],
  }),
];

// ══════════════════════════════════════════════════════════════════════════
//  ASSEMBLE DOCUMENT
// ══════════════════════════════════════════════════════════════════════════
const allChildren = [
  ...coverChildren,
  ...authChildren,
  ...changeChildren,
  ...tocChildren,
  ...sec1,
  ...sec2,
  ...sec3,
  ...sec4,
];

const doc = new Document({
  numbering: {
    config: [
      { reference: 'bullets', levels: [
          { level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '\u25E6', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
      ] },
      { reference: 'numbers', levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.DECIMAL, text: '%2.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
      ] },
    ],
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22, color: C.black } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: 'Arial', color: C.navy },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: C.blue },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: C.darkGray },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
    ],
  },
  sections: [
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } },
      },
      headers: { default: makeHeader() },
      footers: { default: makeFooter() },
      children: allChildren,
    },
  ],
});

Packer.toBuffer(doc).then(buffer => {
  const out = 'Software Requirements Specification-SPASDACS Nova.docx';
  fs.writeFileSync(out, buffer);
  console.log('Generated:', out, '(' + (buffer.length / 1024).toFixed(1) + ' KB)');
}).catch(err => { console.error('Error:', err); process.exit(1); });
