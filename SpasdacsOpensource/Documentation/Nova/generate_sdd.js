// generate_sdd.js  –  SPASDACS Nova  Software Design Document
// Doc No: SCG-GRCD2-SW-2025-04  |  Version 2.0  |  March 2026
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
        sp('SOFTWARE DESIGN DOCUMENT OF', { bold: true, size: 18 }),
        sp('  |  ', { size: 18, color: C.gray }),
        sp('SPAcecraft Status Display And Commanding Software (SPASDACS) Nova 2.0', { size: 18, color: C.blue }),
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
        sp('Doc No: SCG-GRCD2-SW-2025-04  |  Version 2.0  |  March 2026', { size: 18, color: C.darkGray }),
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
//  COVER PAGE
// ══════════════════════════════════════════════════════════════════════════
const coverChildren = [
  new Paragraph({ spacing: { before: 1440, after: 360 }, children: [] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [new TextRun({ text: 'SOFTWARE DESIGN DOCUMENT', font: 'Arial', size: 44, bold: true, color: C.navy })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
    children: [new TextRun({ text: 'SPAcecraft Status Display And Commanding Software', font: 'Arial', size: 28, color: C.blue })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 480 },
    children: [new TextRun({ text: 'SPASDACS Nova', font: 'Arial', size: 36, bold: true, color: C.teal, italics: true })] }),
  divider(), spacer(),
  metaTable([
    { label: 'Document No.', value: 'SCG-GRCD2-SW-2025-04' },
    { label: 'Version',      value: '2.0' },
    { label: 'Date',         value: 'March 2026' },
    { label: 'Prepared by',  value: 'GEOSAT RF & Payload Checkout Division-2' },
    { label: 'Organisation', value: 'Spacecraft Checkout Group, UR RAO Satellite Centre, ISRO, Bangalore' },
    { label: 'Supersedes',   value: 'SCG-GRCD2-SW-2021-03  (SPASDACS 1.0 SDD)' },
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
      new TableRow({ children: [dCell('2.0', 1400, C.offWhite), dCell('March 2026', 1600, C.offWhite), dCell('All', 2160, C.offWhite), dCell('A – Addition', 1600, C.offWhite), dCell('Initial release of Nova SDD', 2600, C.offWhite)] }),
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
  para('This Software Design Document (SDD) describes the software architecture and detailed component design of SPASDACS Nova 2.0. It bridges the SRS (SCG-GRCD2-SW-2025-03) requirements to the actual implementation, documenting design decisions, module structures, data flows, and interface contracts.'),
  para('This document serves as the primary technical reference for developers, integrators, and reviewers who need to understand how the system is structured, how its components interact, and how design decisions map back to stated requirements.'),

  h2('1.2  Scope'),
  para('This SDD covers the following components of SPASDACS Nova 2.0:'),
  bullet('Frontend Single Page Application (SPA) built with Vue 3 and AntV X6 graph engine'),
  bullet('Backend Go microservices: ingest, gateway, limiter, comparator, chainmon, storage, simulator, umacs-tc, umacs-tc-emulator, iam, launcher'),
  bullet('Data infrastructure: MongoDB (primary database), Redis 7+ (telemetry cache, heartbeat, configuration), NATS (pub/sub streaming and WebSocket bridge), InfluxDB 3 OSS (time-series telemetry archive)'),
  spacer(),
  para('Out of scope: SCC/PCC hardware internals, SCOS software design, network switch configuration, and any infrastructure outside the application layer.'),

  h2('1.3  Acronyms and Abbreviations'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2400, 6960],
    rows: [
      new TableRow({ children: [hCell('Acronym / Term', 2400), hCell('Definition', 6960)] }),
      ...[
        ['SDD',    'Software Design Document'],
        ['SPA',    'Single Page Application – browser-based UI served as static assets'],
        ['SFC',    'Single File Component – Vue 3 component format (.vue file)'],
        ['SCADA',  'Supervisory Control and Data Acquisition – industrial monitoring paradigm applied to spacecraft checkout'],
        ['AntV X6','Graph editing engine/library used for the SCADA canvas (version 2.x)'],
        ['NATS',   'Open-source cloud-native messaging system; provides pub/sub and WebSocket bridging'],
        ['IAM',    'Identity and Access Management microservice'],
        ['JWT',    'JSON Web Token – signed stateless access token'],
        ['RBAC',   'Role-Based Access Control – Casbin-enforced policy model'],
        ['TM',     'Telemetry – digitised spacecraft health and status data'],
        ['TC',     'Telecommand – command sent to spacecraft or ground checkout instrument'],
        ['SMON',   'SCOS Monitoring – parameter stream from SCOS data server'],
        ['ADC',    'Analog-to-Digital Converter monitoring data'],
        ['SRS',    'Software Requirements Specification (SCG-GRCD2-SW-2025-03)'],
        ['FRD',    'Functional Requirements Document (SCG-GRCD2-SW-2025-02)'],
        ['rAF',    'requestAnimationFrame – browser animation loop API'],
        ['DXA',    'Document eXtension for Authoring – OOXML unit (1/1440 inch)'],
        ['GSAP',   'GreenSock Animation Platform – JS animation library'],
        ['UDTM',   'User Display Telemetry Map – user-defined mnemonic-value mapping'],
        ['DTM',    'Display Telemetry Map Procedure – scripted animation procedure'],
        ['ORM',    'Object-Relational Mapping (not used; mentioned for contrast with MongoDB document model)'],
        ['TTL',    'Time-To-Live – expiry period for Redis keys and MongoDB documents'],
        ['UDF',    'User-Defined Function – transform/script expression in a telemetry binding'],
      ].map(([a, d], i) => new TableRow({ children: [dCell(a, 2400, i % 2 === 0 ? C.offWhite : C.white), dCell(d, 6960, i % 2 === 0 ? C.offWhite : C.white)] })),
    ],
  }),
  spacer(), para([bold('Table 1: ', { color: C.blue }), sp('Acronyms and Abbreviations')], { alignment: AlignmentType.CENTER }),

  h2('1.4  References'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [5000, 2360, 2000],
    rows: [
      new TableRow({ children: [hCell('Document Name', 5000), hCell('Document Number', 2360), hCell('Date / Version', 2000)] }),
      ...[
        ['SPASDACS Nova Functional Requirements Document',   'SCG-GRCD2-SW-2025-02',  'March 2026'],
        ['SPASDACS Nova Software Requirements Specification','SCG-GRCD2-SW-2025-03',  'March 2026'],
        ['SPASDACS 1.0 Software Design Document',           'SCG-GRCD2-SW-2021-03',  'August 2021'],
        ['AntV X6 2.x Documentation',                       'https://x6.antv.antgroup.com', '2.18.1'],
        ['NATS.ws Documentation',                           'https://github.com/nats-io/nats.ws', '1.30.2'],
      ].map(([n, d, dt], i) => new TableRow({ children: [dCell(n, 5000, i % 2 === 0 ? C.offWhite : C.white), dCell(d, 2360, i % 2 === 0 ? C.offWhite : C.white), dCell(dt, 2000, i % 2 === 0 ? C.offWhite : C.white)] })),
    ],
  }),
  spacer(), para([bold('Table 2: ', { color: C.blue }), sp('References')], { alignment: AlignmentType.CENTER }),

  h2('1.5  Overview of the Document'),
  bullet('Section 2 – System architecture: three-tier overview, microservice dependency map, deployment topology, and technology stack.'),
  bullet('Section 3 – Frontend design: application structure, routing, page components, canvas engine, node architecture, type system, diagram storage, authentication, and command queue.'),
  bullet('Section 4 – Backend microservices design: common service pattern, and detailed design for each of the 11 services.'),
  bullet('Section 5 – Data design: MongoDB schemas, Redis key design, NATS subject design, and AntV X6 modelData schema.'),
  bullet('Section 6 – Interface design: TM WebSocket protocol, NATS message format, and frontend subscription design.'),
  bullet('Section 7 – Security design: authentication flow, RBAC, unauthenticated viewer access, and token security.'),
  bullet('Section 8 – Telemetry binding engine design: architecture, property classification, evaluation pipeline, tween engine, GEO offsets, and flow animation.'),
  bullet('Section 9 – Error handling and resilience design: frontend and backend error handling tables, and WebSocket reconnection design.'),
  bullet('Section 10 – Configuration design: YAML structures, frontend environment variables, and launcher configuration.'),
  bullet('Section 11 – Requirements traceability: mapping of key design decisions back to SRS requirements.'),
];

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 2 – SYSTEM ARCHITECTURE
// ══════════════════════════════════════════════════════════════════════════
const sec2 = [
  pageBreak(), h1('2.  System Architecture'),

  h2('2.1  Three-Tier Architecture Overview'),
  para('SPASDACS Nova 2.0 is structured as a classic three-tier web application adapted for a closed, offline spacecraft checkout network environment. The three tiers are:'),
  bullet('Tier 1 – Presentation: A Vue 3 Single Page Application running entirely in the browser. It uses hash-mode routing (no server-side route handling required) and is served as static compiled assets from the Gateway HTTP server. The browser connects to NATS over WebSocket for all real-time telemetry streaming, and to the Gateway REST API for diagram and mnemonic data operations. Authentication and authorisation are delegated to the IAM REST API.'),
  bullet('Tier 2 – Application: Eleven Go microservices, each independently compiled and process-managed by the Launcher. Inter-service communication uses only two shared channels: a Redis instance (for telemetry state, heartbeat, and configuration) and NATS pub/sub messaging. There are no direct HTTP calls between backend services. Each service subscribes to or publishes on named NATS subjects as defined in the interface contracts.'),
  bullet('Tier 3 – Data: Four data stores serve distinct purposes. MongoDB (databases: astra and iam) stores all persistent structured data including diagrams, mnemonic catalogs, and IAM users/roles/tokens. Redis 7+ provides the high-throughput real-time telemetry cache (TM_MAP, PKT, HEARTBEAT, LIMIT_FAILURES, CHAIN_MISMATCHES keys) and runtime configuration (UMACS_ENV_VARIABLES, SIMULATOR_STATUS). NATS provides the pub/sub streaming backbone connecting ingest to all consumers including the browser. InfluxDB 3 OSS stores time-series telemetry for long-term archival and potential replay.'),
  spacer(),

  h2('2.2  Microservice Dependency Map'),
  para('The table below documents, for each service, which data stores it reads from and writes to, which NATS subjects it listens on, and which subjects it publishes to.'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [1560, 1800, 1800, 2100, 2100],
    rows: [
      new TableRow({ children: [hCell('Service', 1560), hCell('Reads From', 1800), hCell('Writes To', 1800), hCell('Listens NATS', 2100), hCell('Publishes NATS', 2100)] }),
      ...[
        ['ingest',              'SCC WebSocket',                              'Redis TM_MAP, Redis PKT, Redis HEARTBEAT',  '—',                    'tm.{chain}.tm_map, tm.{chain}.tm_map/full'],
        ['gateway',             'Redis, MongoDB',                             'MongoDB (diagrams, mnemonics)',             '—',                    '—'],
        ['limiter',             'Redis TM_MAP, MongoDB tm_mnemonics',         'Redis LIMIT_FAILURES',                      'tm.{chain}.tm_map',    '—'],
        ['comparator',          'Redis TM_MAP (chain pairs)',                 'Redis CHAIN_MISMATCHES',                   'tm.*.tm_map',          '—'],
        ['chainmon',            'Redis HEARTBEAT',                            '—',                                        '—',                    'chain.status.{chain}'],
        ['storage',             'Redis TM_MAP, MongoDB tm_mnemonics',         'InfluxDB',                                 'tm.{chain}.tm_map',    '—'],
        ['simulator',           'MongoDB tm_mnemonics',                       'Redis TM_MAP',                             '—',                    'tm.simulated.tm_map'],
        ['umacs-tc',            '—',                                          'UMACS TCP socket',                         'tc.dispatch',          'tc.status'],
        ['umacs-tc-emulator',   '—',                                          'Redis TC_LOG',                             'tc.dispatch',          'tc.status'],
        ['iam',                 'MongoDB iam database',                       'MongoDB iam database',                     '—',                    '—'],
        ['launcher',            '—',                                          '—',                                        '—',                    '—'],
      ].map(([s, r, w, ln, pub], i) => new TableRow({ children: [
        dCell(s, 1560, i % 2 === 0 ? C.offWhite : C.white),
        dCell(r, 1800, i % 2 === 0 ? C.offWhite : C.white),
        dCell(w, 1800, i % 2 === 0 ? C.offWhite : C.white),
        dCell(ln, 2100, i % 2 === 0 ? C.offWhite : C.white),
        dCell(pub, 2100, i % 2 === 0 ? C.offWhite : C.white),
      ] })),
    ],
  }),
  spacer(), para([bold('Table 3: ', { color: C.blue }), sp('Microservice Dependency Map')], { alignment: AlignmentType.CENTER }),

  h2('2.3  Deployment Topology'),
  para('All backend services run on a single host — either the SCC, PCC, or any dedicated PC on the CHECKNET. The Launcher starts each service as a subprocess with configured start delays to allow dependencies (Redis, MongoDB, NATS) to become ready before dependent services start.'),
  para('Browser clients connect from any PC on the CHECKNET. No internet connectivity is required; all assets, APIs, and telemetry streams are served from the single server node.'),
  bullet('NATS WebSocket bridge: port 9222 (default). Used by browser clients for real-time telemetry.'),
  bullet('Gateway REST API + static file server: port 8090. Used by browser for diagram CRUD, mnemonic queries, and TC dispatch relay.'),
  bullet('IAM service: port 8093. Used by browser for login, token refresh, and user/role management.'),
  bullet('Kong reverse proxy (port 8000): optional API gateway used in production routing to provide a single entry-point URL. Routes /gateway → 8090 and /iam → 8093.'),
  spacer(),
  para('Network traffic remains entirely within the CHECKNET. No traffic traverses the internet or any external firewall.'),

  h2('2.4  Technology Stack Summary'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2400, 2200, 1360, 3400],
    rows: [
      new TableRow({ children: [hCell('Layer', 2400), hCell('Technology', 2200), hCell('Version', 1360), hCell('Role', 3400)] }),
      ...[
        ['Frontend framework',  'Vue 3 + TypeScript',           '3.5.13',   'SPA framework with Composition API'],
        ['Graph engine',        'AntV X6',                      '2.18.1',   'Canvas-based SCADA diagram engine'],
        ['NATS client',         'nats.ws',                      '1.30.2',   'Browser NATS WebSocket client'],
        ['Animation',           'GSAP 3',                       '3.14.2',   'Node-level tween animations (spin, position)'],
        ['Build tool',          'Vite',                         '5.4.10',   'Fast HMR dev server, production bundler'],
        ['Type safety',         'TypeScript',                   '5.6.3',    'Full type coverage including node data models'],
        ['Code editor',         'Monaco Editor',                '0.52.2',   'Transform script and multi-binding editor in Inspector'],
        ['Backend language',    'Go',                           '1.22+',    'All microservices; CGO_ENABLED=0 static binaries'],
        ['HTTP router',         'chi v5',                       '5.x',      'Lightweight HTTP router for all Go services'],
        ['Config management',   'Viper',                        '1.x',      'YAML config + env var overrides'],
        ['IAM auth',            'JWT (HMAC-SHA256) + bcrypt',   '—',        'Token issuance and password hashing'],
        ['IAM authz',           'Casbin v2 + MongoDB adapter',  '2.x',      'RBAC policy enforcement'],
        ['Message broker',      'NATS',                         '2.x',      'Internal pub/sub, WebSocket bridge for browser'],
        ['Primary DB',          'MongoDB',                      '7.x',      'Diagram persistence, mnemonic catalog, IAM'],
        ['Cache / State',       'Redis',                        '7.x',      'Real-time TM cache, heartbeat, configuration'],
        ['Time-series DB',      'InfluxDB 3 OSS',               '3.x',      'Long-term telemetry storage and replay'],
      ].map(([l, t, v, r], i) => new TableRow({ children: [
        dCell(l, 2400, i % 2 === 0 ? C.offWhite : C.white),
        dCell(t, 2200, i % 2 === 0 ? C.offWhite : C.white),
        dCell(v, 1360, i % 2 === 0 ? C.offWhite : C.white),
        dCell(r, 3400, i % 2 === 0 ? C.offWhite : C.white),
      ] })),
    ],
  }),
  spacer(), para([bold('Table 4: ', { color: C.blue }), sp('Technology Stack Summary')], { alignment: AlignmentType.CENTER }),
];

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 3 – FRONTEND DESIGN
// ══════════════════════════════════════════════════════════════════════════
const sec3 = [
  pageBreak(), h1('3.  Frontend Design'),

  h2('3.1  Application Structure'),
  para('The frontend source tree under src/ is organised as follows:'),
  bullet('main.ts — application bootstrap: creates the Vue app instance, installs Vue Router, and mounts the application to the #app DOM element.'),
  bullet('App.vue — root component containing a single <router-view /> with no layout wrapper; all layout is per-page.'),
  bullet('router/index.ts — defines 4 routes with navigation guards (see Section 3.2).'),
  bullet('types.ts — all shared TypeScript interfaces: ScadaNodeData, TelemetryBinding, BindingRule, ScadaLinkData, NatsConfig, TARGET_PROPS, CATEGORY_TARGET_PROPS, PALETTE_ITEMS.'),
  bullet('pages/ — DiagramList.vue, EditorPage.vue, ViewerPage.vue, LoginPage.vue.'),
  bullet('components/ — X6Canvas.vue, ElementPalette.vue, Inspector.vue, TelemetryBindingEditor.vue, TcCommandSelectorModal.vue, TcCommandQueuePanel.vue, PortContextMenu.vue.'),
  bullet('nodes/ — 30 Vue SFC node components implementing each SCADA shape, plus composables: useNodeData.ts, useGsapSpin.ts, useGsapTween.ts, usePositionAnim.ts.'),
  bullet('graph/setupGraph.ts — Graph factory function: plugin initialization and all 30 SCADA shape registrations.'),
  bullet('telemetry/X6NatsTelemetry.ts — telemetry engine class managing NATS subscription, binding evaluation, and X6 property application.'),
  bullet('telemetry/telemetryStore.ts — shared in-memory mnemonic→value Map (flat key-value store).'),
  bullet('services/auth.ts — JWT session management (composable useAuth() with reactive singleton state).'),
  bullet('services/diagramStorage.ts — REST diagram CRUD with localStorage fallback (class DiagramStorage with static methods).'),
  bullet('services/mnemonicStore.ts — mnemonic catalog cache (fetched once per session, stored in memory).'),
  bullet('stores/commandQueueStore.ts — reactive TC command queue singleton (no Pinia dependency).'),

  h2('3.2  Routing and Navigation Guard Design'),
  para('The Vue Router is configured in hash mode. Four routes are defined:'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [1800, 2000, 1200, 1760, 2600],
    rows: [
      new TableRow({ children: [hCell('Route', 1800), hCell('Component', 2000), hCell('Public?', 1200), hCell('Auth Required', 1760), hCell('Allowed Roles', 2600)] }),
      ...[
        ['/login',        'LoginPage',    'Yes', 'No',  '—'],
        ['/',             'DiagramList',  'Yes', 'No',  '—'],
        ['/editor/:id',   'EditorPage',   'No',  'Yes', 'operator, admin, super_admin'],
        ['/viewer/:id',   'ViewerPage',   'Yes', 'No',  '— (read-only for unauthenticated)'],
      ].map(([r, c, p, a, roles], i) => new TableRow({ children: [
        dCell(r,     1800, i % 2 === 0 ? C.offWhite : C.white),
        dCell(c,     2000, i % 2 === 0 ? C.offWhite : C.white),
        dCell(p,     1200, i % 2 === 0 ? C.offWhite : C.white),
        dCell(a,     1760, i % 2 === 0 ? C.offWhite : C.white),
        dCell(roles, 2600, i % 2 === 0 ? C.offWhite : C.white),
      ] })),
    ],
  }),
  spacer(), para([bold('Table 5: ', { color: C.blue }), sp('Route Definitions')], { alignment: AlignmentType.CENTER }),
  spacer(),
  para('Navigation guard logic (router.beforeEach()):'),
  numbered('Calls auth.restoreSession() on every navigation to rehydrate stored JWT from localStorage.'),
  numbered('If route.meta.public AND path === "/login" AND user is already logged in: redirects to "/".'),
  numbered('If route.meta.requireAuth AND user is not logged in: redirects to /login?redirect=fullPath.'),
  numbered('If route defines required roles AND user does not hold any of those roles: redirects to "/" (or /login if not authenticated).'),

  h2('3.3  Page Component Design'),
  h3('3.3.1  LoginPage.vue'),
  para('Renders a username + password form. On submit, calls auth.login(). On success, redirects to query.redirect (if set) or "/" as default. Login errors are displayed inline below the form without page navigation.'),

  h3('3.3.2  DiagramList.vue'),
  para('Fetches DiagramStorage.getAllDiagrams() on component mount. Displays diagram cards showing name, description, and created/updated timestamps. Per-card actions:'),
  bullet('View button — navigates to /viewer/:id.'),
  bullet('Edit button — visible only if canEdit (operator, admin, super_admin); navigates to /editor/:id.'),
  bullet('Delete button — calls DiagramStorage.deleteDiagram(id) with confirmation.'),
  bullet('New Diagram button — generates a new id via DiagramStorage.generateId() and navigates to /editor/:newId.'),
  bullet('Auto View toggle — sends PATCH /diagrams/:id to update autoViewInclude and autoViewDuration.'),
  para('Auto View slideshow mode: loops through all diagrams with autoViewInclude=true, dwelling on each for its autoViewDuration seconds, then advancing to the next.'),

  h3('3.3.3  EditorPage.vue'),
  para('Mounts X6Canvas.vue in edit mode (readOnly=false). Layout:'),
  bullet('Left panel: ElementPalette.vue — lists all 30 SCADA shape categories, drag-and-drop onto canvas.'),
  bullet('Right panel: Inspector.vue — node/edge property editor plus TelemetryBindingEditor.vue (Monaco-powered binding configuration).'),
  bullet('Top bar: undo/redo/fit/grid/group/ungroup/z-order/zoom controls, Save button (calls DiagramStorage.saveDiagram()), View button (opens /viewer/:id).'),
  para('Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo), Ctrl+C (copy), Ctrl+V (paste), Ctrl+A (select all), Delete (remove selected), arrow keys (nudge 1px or 10px with Shift).'),

  h3('3.3.4  ViewerPage.vue'),
  para('Mounts X6Canvas.vue in read-only mode. On mount, starts X6NatsTelemetry engine. The top bar auto-hides and re-appears when the mouse enters the top 20px of the viewport. Features:'),
  bullet('NATS status badge: shows "⚡ Live" (connected) or "○ Idle" (disconnected).'),
  bullet('Heartbeat badge: shows "♥ Data" (CONNECTED) or "♥ DATA_BREAK" (break state).'),
  bullet('Diagram selector dropdown for quick navigation between diagrams.'),
  bullet('Unauthenticated viewer banner: read-only mode label with Login link, shown when !auth.isLoggedIn.'),
  bullet('TC Queue button: shows badge with queued command count; opens TcCommandQueuePanel.vue on click. Hidden for unauthenticated users.'),
  bullet('Auto View controls: Pause/Resume button and skip controls.'),
  bullet('Hover tooltip: popover showing the list of mnemonics from node.data.hoverMnemonics with live values sourced from telemetryStore.'),

  h2('3.4  Canvas Engine Design (AntV X6)'),
  para('The createGraph() factory function in setupGraph.ts produces the X6 Graph instance in one of two modes, controlled by the readOnly parameter:'),
  h3('3.4.1  Edit Mode (readOnly = false)'),
  para('Dot grid background. All plugins loaded. Full interacting configuration enabled. Rubber-band multi-select. Keyboard shortcuts active. Edge tools rendered on hover. Manhattan router with rounded connector. Snap-to-grid at 10px intervals. Snapline tolerance of 10px. History stack limited to 100 entries.'),
  h3('3.4.2  View Mode (readOnly = true)'),
  para('No grid background. Only the Scroller plugin loaded. nodeMovable=false, edgeMovable=false, magnetConnectable=false. Pan enabled via mouse drag. Rubber-band selection disabled. All edge tools suppressed.'),
  h3('3.4.3  Plugin Configuration'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2000, 2000, 5360],
    rows: [
      new TableRow({ children: [hCell('Plugin', 2000), hCell('Mode', 2000), hCell('Configuration', 5360)] }),
      ...[
        ['Scroller',    'Both',         'pannable=Ctrl+Meta modifier (editor) / always (viewer), autoResize=true'],
        ['Selection',   'Editor only',  'rubberband=true, multiple=true, showNodeSelectionBox=true, showEdgeSelectionBox=true'],
        ['Snapline',    'Editor only',  'sharp=true, tolerance=10'],
        ['History',     'Editor only',  'stackSize=100'],
        ['Clipboard',   'Editor only',  'enabled=true'],
        ['Keyboard',    'Editor only',  'global=true, binds Ctrl+Z/Y/C/V/A/Delete/arrow keys'],
        ['Transform',   'Editor only',  'resizing min 20×20, rotating grid=15°, aspect ratio preserved except Rect shape'],
      ].map(([p, m, c], i) => new TableRow({ children: [
        dCell(p, 2000, i % 2 === 0 ? C.offWhite : C.white),
        dCell(m, 2000, i % 2 === 0 ? C.offWhite : C.white),
        dCell(c, 5360, i % 2 === 0 ? C.offWhite : C.white),
      ] })),
    ],
  }),
  spacer(), para([bold('Table 6: ', { color: C.blue }), sp('X6 Plugin Configuration')], { alignment: AlignmentType.CENTER }),
  spacer(),
  h3('3.4.4  Port System'),
  para('All SCADA nodes expose four standard port groups: left, right, top, bottom. Each port is rendered as a 5px radius magnet circle. Specialised switch nodes (SP2T, DP3T, TransferSwitch, etc.) use a custom scada-switch-port layout registered with Graph.registerPortLayout(), which positions ports at proportional coordinates matching the SVG internal connecting dots.'),
  h3('3.4.5  Edge Design'),
  para('Edges are created with two attribute layers: attrs.line (stroke color #6b7280, 1.5px width, classic arrowhead marker) and attrs.wrap (16px transparent stroke for easy hit-testing and selection). Default data: { flowActive: false, flowDirection: 1, telemetryBindings: [] }.'),

  h2('3.5  SCADA Node Component Architecture'),
  para('All 30 node components follow an identical architectural pattern:'),
  bullet('Vue 3 SFC (Single File Component) with a <template> containing only SVG markup — no HTML wrapper elements.'),
  bullet('useNodeData(defaultW, defaultH) composable used in <script setup> to bridge X6 reactive data to Vue reactivity.'),
  bullet('d = computed ScadaNodeData object, w = computed width, h = computed height — all visual attributes reference these.'),
  bullet('No direct NATS subscriptions inside node components. X6NatsTelemetry calls node.setData(), which triggers the change:data event, which useNodeData bridges to Vue refs.'),
  spacer(),
  h3('3.5.1  useNodeData Composable'),
  para('Design of the useNodeData(defaultW, defaultH) composable:'),
  numbered('inject("getNode") from x6-vue-shape provides the X6 Node instance to the SFC.'),
  numbered('onMounted: reads initial data and size from the node, registers change:data and change:size event handlers.'),
  numbered('onChange handler: shallow-copies getData() result into _d.value ref, triggering Vue template re-render for next animation frame.'),
  numbered('onUnmounted: removes all event listeners to prevent memory leaks.'),
  numbered('Returns: { d: computed(() => _d.value), w: computed(() => _w.value), h: computed(() => _h.value) }.'),
  spacer(),
  h3('3.5.2  Animation Composables'),
  bullet('useGsapSpin.ts — GSAP continuous rotation tween for momentum wheel and DTG gyroscope SVG groups.'),
  bullet('useGsapTween.ts — GSAP to() tween for smooth value transitions (battery charge level, gauge needle).'),
  bullet('usePositionAnim.ts — position animation for thruster thrust indicator and switch state transitions.'),
  spacer(),
  h3('3.5.3  Node Category to X6 Shape Mapping'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2400, 2400, 1760, 2800],
    rows: [
      new TableRow({ children: [hCell('Category', 2400), hCell('X6 Shape', 2400), hCell('Default Size', 1760), hCell('Port Layout', 2800)] }),
      ...[
        ['Valve',           'scada-valve',          '80×60',    'DEFAULT (L/R/T/B)'],
        ['Tank',            'scada-tank',           '80×130',   'NO_ITEM'],
        ['Gauge',           'scada-gauge',          '100×100',  'NO_ITEM'],
        ['TWTA',            'scada-twta',           '170×115',  'LR'],
        ['Battery',         'scada-battery',        '60×128',   'SUBTLE_TB'],
        ['MomentumWheel',   'scada-momentumwheel',  '195×185',  'NO_ITEM'],
        ['DTG',             'scada-dtg',            '255×190',  'NO_ITEM'],
        ['SP2T',            'scada-sp2t',           '70×90',    'SP2T (L, R1@25%, R2@75%)'],
        ['SP2TC',           'scada-sp2tc',          '90×90',    'SP2TC'],
        ['SP2TNoBg',        'scada-sp2t-nobg',      '70×90',    'SP2T'],
        ['Switch3P',        'scada-switch3p',       '90×90',    'SW3P (T/B/L/R)'],
        ['Switch4P',        'scada-switch4p',       '90×90',    'SW3P'],
        ['DP3T',            'scada-dp3t',           '70×120',   'DP3T (L1/L2, R1/R2/R3)'],
        ['TransferSwitch',  'scada-transferswitch', '70×70',    'XFR (L1/L2, R1/R2)'],
        ['Indicator',       'scada-indicator',      '50×50',    'DEFAULT'],
        ['Thruster',        'scada-thruster',       '80×100',   'DEFAULT'],
        ['Diode',           'scada-diode',          '100×80',   'LR_EDGE (in/out)'],
        ['ZenerDiode',      'scada-zenerdiode',     '100×80',   'LR_EDGE'],
        ['Resistor',        'scada-resistor',       '100×44',   'LR_EDGE'],
        ['TelemetryTable',  'scada-telemetrytable', '300×120',  'DEFAULT'],
        ['Image',           'scada-image',          '160×120',  'DEFAULT'],
        ['Circle',          'scada-circle',         '60×60',    'NO_ITEM'],
        ['Rect',            'scada-rect',           '120×80',   'NO_ITEM'],
        ['TextLabel',       'scada-textlabel',      '120×40',   'none'],
        ['DriverAmplifier', 'scada-driver-amp',     '170×115',  'LR'],
        ['TWTADA',          'scada-twta-da',        '280×130',  'LR'],
        ['RFDownConverter', 'scada-rf-downconv',    '160×100',  'LR'],
        ['RFUpConverter',   'scada-rf-upconv',      '160×100',  'LR'],
        ['LNA',             'scada-lna',            '160×100',  'LR'],
        ['Receiver',        'scada-receiver',       '210×110',  'LR'],
        ['FPGA',            'scada-fpga',           '185×150',  'NO_ITEM'],
      ].map(([cat, shape, size, ports], i) => new TableRow({ children: [
        dCell(cat,   2400, i % 2 === 0 ? C.offWhite : C.white),
        dCell(shape, 2400, i % 2 === 0 ? C.offWhite : C.white),
        dCell(size,  1760, i % 2 === 0 ? C.offWhite : C.white),
        dCell(ports, 2800, i % 2 === 0 ? C.offWhite : C.white),
      ] })),
    ],
  }),
  spacer(), para([bold('Table 7: ', { color: C.blue }), sp('SCADA Node Category to X6 Shape Mapping')], { alignment: AlignmentType.CENTER }),

  h2('3.6  ScadaNodeData Type System'),
  para('The types.ts module defines all shared TypeScript interfaces used across the frontend:'),
  h3('3.6.1  TelemetryBinding Interface'),
  bullet('id: string — unique binding identifier within the node.'),
  bullet('topic: string — mnemonic key (e.g. "P_TEMP_1"). Looked up in telemetryStore.'),
  bullet('targetProp: string — name of the ScadaNodeData property to update, or "__multi__" for script mode.'),
  bullet('rules: BindingRule[] — ordered list of conditional value substitution rules.'),
  bullet('transform: string — inline JS expression using variable "v" (legacy short-form).'),
  bullet('transformScript: string — JS function body using variables "value" and "TM" accessor.'),
  bullet('script: string — multi-property JS function body returning Record<string, string> for __multi__ bindings.'),
  bullet('subsystem: string — subsystem filter hint for Monaco autocomplete.'),
  bullet('rangeValues: string[] — expected state values for BINARY mnemonics (editor hint only).'),
  spacer(),
  h3('3.6.2  BindingRule Interface'),
  bullet('condition: string — JS expression using variables "value" and "TM". Evaluated in order; first truthy match wins.'),
  bullet('value: string — result value written to targetProp when condition is truthy.'),
  spacer(),
  h3('3.6.3  ScadaNodeData'),
  para('The ScadaNodeData interface carries all visual state for a node. Fields span multiple categories: label (display text), statusText, statusColor, fill, stroke, strokeWidth (appearance); level, temperature, gaugeValue, gaugeMin, gaugeMax, wheelSpeed, wheelDirection, chargeLevel, isCharging, thrustLevel, position (domain-specific domain fields); visible, opacity, angle, isInvalid, alarm (generic state); and telemetryBindings: TelemetryBinding[] (the binding configuration array). All fields are optional except id and label.'),
  spacer(),
  h3('3.6.4  TARGET_PROPS and CATEGORY_TARGET_PROPS'),
  para('TARGET_PROPS is a record of over 20 bindable property names with their display labels and type metadata. CATEGORY_TARGET_PROPS is a per-category allow-list that restricts which TARGET_PROPS are shown in the Inspector UI for a given node category. For example, a Tank node exposes level, fill, stroke, statusColor, visible — but not gaugeValue or wheelSpeed.'),

  h2('3.7  Diagram Storage Service Design'),
  para('The DiagramStorage class provides static methods for all diagram CRUD operations. It implements a backend-first pattern with localStorage fallback for resilience during network interruptions.'),
  bullet('getAllDiagrams(): Fetches from backend (GET /diagrams). On failure, returns diagrams from localStorage. Merges autoview overrides from a separate AUTOVIEW_CACHE_KEY. Adds any localStorage-only diagrams not yet synced.'),
  bullet('getDiagram(id): Fetches from backend (GET /diagrams/{id}). On HTTP 404 or network failure, falls back to the localStorage entry for that id.'),
  bullet('saveDiagram(diagram): Posts to backend (POST /diagrams). On failure, stores the full diagram JSON in localStorage fallback.'),
  bullet('patchDiagram(id, fields): Always writes autoview fields to AUTOVIEW_CACHE_KEY first as a failsafe, then PATCHes the backend.'),
  bullet('deleteDiagram(id): Deletes from backend (DELETE /diagrams/{id}). Always removes from localStorage and autoview cache regardless of backend response.'),
  bullet('generateId(): Returns "diagram_{Date.now()}_{9 random alphanumeric chars}".'),
  bullet('exportDiagram(diagram): Returns JSON.stringify with 2-space indentation for browser download.'),
  bullet('importDiagram(jsonString): Parses JSON, validates presence of id, name, and modelData fields, then calls saveDiagram.'),
  spacer(),
  para([bold('API base URL resolution order: '), sp('VITE_DIAGRAM_API_URL env var → VITE_GATEWAY_URL env var → http://{window.location.hostname}/gateway/api/go/v1')]),

  h2('3.8  Authentication Service Design'),
  para('The auth.ts module exports a useAuth() composable backed by a reactive singleton state object. This ensures all components share a single authentication state without a Pinia store.'),
  bullet('Session shape: { accessToken, refreshToken, expiresAt (ms epoch), user: AuthUser | null }.'),
  bullet('Persisted to localStorage key "spasdacs-auth-v1" as JSON.'),
  bullet('Token refresh: auto-triggered when expiresAt - Date.now() < 20000 ms (20-second buffer before expiry).'),
  bullet('Base URL: {protocol}//{hostname}/iam/api/v1'),
  bullet('login(u, p): POST /auth/login → setSession(response).'),
  bullet('logout(): POST /auth/logout → clearSession(), removes localStorage entry.'),
  bullet('refreshIfNeeded(force): POST /auth/refresh if expiring soon or force=true.'),
  bullet('hasAnyRole(roles[]): checks session.user.roles against the provided list.'),
  bullet('isLoggedIn getter: Boolean(state.session?.accessToken).'),
  bullet('fetchWithFallback: tries candidate base URLs in order; re-throws non-404/405 errors immediately without trying the next candidate.'),

  h2('3.9  Command Queue Store Design'),
  para('The commandQueueStore.ts module implements a reactive singleton (using Vue\'s reactive() API, no Pinia dependency) for the TC command queue.'),
  bullet('State: { items: QueuedCommand[] }.'),
  bullet('QueuedCommand: { uid: string, cmdDesc: string, dataPart: string }.'),
  bullet('UID generation: "cq-{Date.now()}-{monotonically incrementing counter}".'),
  bullet('enqueueCommands(cmds[]): appends one or more commands to the queue.'),
  bullet('dequeueCommand(uid): removes the command with matching uid.'),
  bullet('reorderCommand(from, to): splice-based move operation to reorder the queue.'),
  bullet('clearQueue(): empties all items.'),
  para('Used by TcCommandQueuePanel.vue (dispatch panel with reorder and send controls) and ViewerPage.vue (badge showing queue length).'),
];

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 4 – BACKEND MICROSERVICES DESIGN
// ══════════════════════════════════════════════════════════════════════════
const sec4 = [
  pageBreak(), h1('4.  Backend Microservices Design'),

  h2('4.1  Common Service Pattern'),
  para('All Go microservices follow the same cmd/internal/service package layout:'),
  bullet('cmd/main.go — reads configuration via config.Load(), establishes client connections (Redis, MongoDB, NATS as needed), and calls service.Start(ctx).'),
  bullet('internal/ — domain-specific logic: handler, monitor, subscriber, etc. packages.'),
  bullet('service/service.go — Start(ctx context.Context) method that wires all internal dependencies and starts goroutines.'),
  para('Shared root packages available to all services:'),
  bullet('models/ — Redis key constants, mnemonic document schemas, NATS subject constants.'),
  bullet('clients/ — Redis client factory, MongoDB client factory, InfluxDB client factory, NATS client factory, WebSocket subscriber.'),
  bullet('config/ — YAML Viper loader with environment variable override support.'),
  spacer(),
  para('Configuration defaults (Viper): redis.addr=localhost:6379, mongo.uri=mongodb://localhost:27017, mongo.database=astra, service.log_level=info, nats.url=nats://localhost:4222, nats.poll_interval_ms=800, nats.snapshot_interval_s=30.'),

  h2('4.2  Ingest Service Design'),
  para('The ingest service manages N concurrent ChainSubscriber goroutines, one per entry in the chains[] YAML configuration array.'),
  h3('4.2.1  ChainConfig'),
  para('Each chain configuration carries: Name (string), Type ("TM" | "SCOS"), Host (string), Port (int).'),
  h3('4.2.2  WSSubscriber'),
  para('The WSSubscriber client connects to ws://{host}:{port}/ws, sends the subscribe handshake JSON if Type=="TM", and invokes registered callbacks: OnConnect(), OnDisconnect(), OnMessage(msg []byte).'),
  h3('4.2.3  TM Message Pipeline'),
  numbered('ParseTMPacket(msg) extracts param, proc_value, and err_desc from the JSON message.'),
  numbered('If err_desc contains "break": sets heartbeat to DATA_BREAK, clears chain Redis keys.'),
  numbered('On valid data: writes to Redis pipeline: HSET TM_{CHAIN}_MAP param value, HSET TM_{CHAIN}_PKT param rawMsg, WriteToUnifiedMap (TM_MAP with chain suffix rules), SET HEARTBEAT_{CHAIN} "OK" with TTL=2s.'),
  numbered('Executes pipeline.Exec() in batch.'),
  h3('4.2.4  SCOS Message Pipeline'),
  numbered('ParseSCOSPacket(msg) extracts the paramlist array.'),
  numbered('For each param in paramlist: HSET TM_{CHAIN}_MAP, HSET PKT, WriteToUnifiedMap.'),
  numbered('SET HEARTBEAT_{CHAIN} "OK" TTL=2s. Empty paramlist triggers DATA_BREAK.'),
  h3('4.2.5  NATS Publishing'),
  para('Ingest publishes incremental updates to NATS subject tm.{chain_name}.tm_map as a JSON array of single-key objects [{mnemonic:value}, ...]. A full snapshot is published to tm.{chain_name}.tm_map/full every 30s (configurable snapshot_interval_s).'),
  h3('4.2.6  Auto-Reconnect'),
  para('Exponential backoff: configurable initial delay (default 1s), max delay (default 30s), and multiplier (default 2). All reconnect attempts logged at WARN level. Delay resets to initial on successful connection.'),
  h3('4.2.7  Heartbeat States'),
  bullet('CONNECTED — set on WebSocket connect.'),
  bullet('DATA_BREAK — set on break detection in TM err_desc, or on empty SCOS paramlist.'),
  bullet('CONNECTION_FAILED — set on WebSocket disconnect.'),

  h2('4.3  Gateway Service Design'),
  para('The gateway service runs an HTTP server on port 8090 (configurable) using the chi v5 router. All routes are mounted under the prefix /api/go/v1. The service also serves the compiled frontend SPA static assets and provides the NATS WebSocket bridge.'),
  h3('4.3.1  Handler Types'),
  bullet('TelemetryHandler — reads Redis TM_MAP, returns JSON telemetry values.'),
  bullet('ChainsHandler — reads Redis HEARTBEAT keys, returns chain status map.'),
  bullet('LimitsHandler — reads Redis LIMIT_FAILURES, returns limit violation map.'),
  bullet('SimulatorHandler — reads/writes Redis SIMULATOR_STATUS.'),
  bullet('UDTMHandler — reads Redis UDTM map, returns current user display telemetry map.'),
  bullet('DTMHandler — reads/writes Redis DTM values, publishes DTM_PROCEDURES_UPDATED NATS notification.'),
  bullet('MnemonicsHandler — queries MongoDB tm_mnemonics, uses Redis for caching.'),
  bullet('UDTMCrudHandler — MongoDB + Redis CRUD for UDTM versioned documents.'),
  bullet('DTMCrudHandler — MongoDB + Redis CRUD for DTM procedure documents.'),
  bullet('MapsHandler — reads arbitrary Redis hashes by name (GET /maps/{name}).'),
  bullet('SpasdacsHandler — MongoDB diagram CRUD (GetDiagrams, GetDiagram, PostDiagram, PatchDiagram, DeleteDiagram).'),
  bullet('TelemetryUploadHandler — accepts CSV/JSON file upload, bulk-upserts to MongoDB tm_mnemonics.'),
  bullet('TelecommandUploadHandler — accepts TC catalog upload, bulk-upserts to MongoDB tc_mnemonics.'),
  h3('4.3.2  SpasdacsHandler Operations'),
  bullet('GetDiagrams: Find all documents in spasdacs collection with projection to metadata fields only (no modelData). Returns array of SpasdacsMeta.'),
  bullet('GetDiagram: FindOne by _id string field. Returns full document including modelData.'),
  bullet('PostDiagram: ReplaceOne with upsert=true keyed on the _id field. Preserves createdAt timestamp on update by reading existing document first.'),
  bullet('PatchDiagram: UpdateOne with $set on autoViewInclude, autoViewDuration, and updatedAt fields only.'),
  bullet('DeleteDiagram: DeleteOne by _id. Returns HTTP 404 if not found.'),
  h3('4.3.3  CORS and NATS Bridge'),
  para('CORS is configured to accept requests from any origin on the CHECKNET (all origins allowed in CHECKNET-isolated deployments). The gateway also serves a NATS WebSocket proxy endpoint so browsers can reach the NATS server through the gateway port, eliminating the need to expose NATS port 9222 directly.'),

  h2('4.4  IAM Service Design'),
  para('The IAM service runs independently on port 8093. It uses the MongoDB "iam" database. Package structure: handlers/, middleware/, models/, repository/, service/.'),
  h3('4.4.1  JWT Design'),
  para('Access token payload: sub (userId), username, roles[], exp, iat. Algorithm: HMAC-SHA256. TTL: 15 minutes. Secret from config/env.'),
  h3('4.4.2  Refresh Token Design'),
  para('Opaque 32 random bytes, returned raw to client. Stored in MongoDB refresh_tokens collection as SHA-256(rawToken) hash with a TTL index on expiresAt (7 days). Breach of MongoDB does not expose raw tokens.'),
  h3('4.4.3  Password Security'),
  para('bcrypt with cost=12 minimum. Plain passwords are never stored, logged, or returned in API responses.'),
  h3('4.4.4  Casbin RBAC'),
  para('Model: standard RBAC with resources and actions. Adapter: MongoDB adapter reading casbin_rules collection. Policy loaded at startup and refreshed on changes. Enforcer is shared across all request handlers via middleware.'),
  h3('4.4.5  First-Startup Seed'),
  para('seed.go checks if the users collection is empty. If empty: inserts 4 default roles (super_admin, admin, operator, viewer) and a default admin user (username: admin, password: Admin@123! bcrypt-hashed at cost=12).'),
  h3('4.4.6  Auth Middleware'),
  bullet('RequireAuth: extracts Bearer token from Authorization header, validates JWT signature and expiry, injects userID and roles into the request context.'),
  bullet('RequirePermission(resource, action): calls casbin.Enforce(role, resource, action) for each role the authenticated user holds. Returns HTTP 403 if none match.'),
  bullet('RequireSuperAdmin(): checks roles slice contains "super_admin". Returns HTTP 403 otherwise.'),
  bullet('RequireSelfOrPermission(resource, action, idParam): allows the request if the authenticated user\'s ID matches the {idParam} URL parameter, OR if the user holds the required Casbin permission. Supports self-service profile updates.'),

  h2('4.5  Limiter Service Design'),
  para('The limiter subscribes to NATS tm.*.tm_map or polls Redis TM_MAP at a configurable interval. For each mnemonic with enableLimit=true:'),
  numbered('Reads current value from TM_MAP.'),
  numbered('Reads upper, lower, and tolerance from MongoDB tm_mnemonics.'),
  numbered('ANALOG check: value < (lower − tolerance) OR value > (upper + tolerance) → limit failure.'),
  numbered('On failure: writes to Redis LIMIT_FAILURES hash as JSON {value, upper, lower, timestamp}.'),
  numbered('On recovery: removes from LIMIT_FAILURES hash.'),
  para('Hysteresis suppression: a mnemonic must cross the limit by the tolerance amount to enter failure state, and must recover by the same amount to clear. This prevents rapid toggling on noisy channels.'),

  h2('4.6  Comparator Service Design'),
  para('The comparator monitors configured chain pairs (e.g., TM1 vs TM2) defined in YAML. For each mnemonic with enableComparison=true:'),
  bullet('Mode A (BINARY/exact match): compares string values from TM_{CHAIN1}_MAP and TM_{CHAIN2}_MAP. Any difference is a mismatch.'),
  bullet('Mode B (ANALOG/tolerance): mismatch if |value1 − value2| > tolerance.'),
  para('Mismatches are written to Redis CHAIN_MISMATCHES hash as JSON {chain1Value, chain2Value, timestamp}. The gateway exposes this via GET /chain-mismatches.'),

  h2('4.7  Chain Monitor Service Design'),
  para('The chainmon service periodically polls all HEARTBEAT_{CHAIN} keys in Redis (configurable poll interval). For each chain, it publishes a JSON object to NATS subject chain.status.{chain_name}:'),
  codePara('{ "chain": "TM1", "status": "CONNECTED", "timestamp": "2026-03-26T10:00:00Z" }'),
  para('The gateway subscribes to chain.status.* and broadcasts the status to browser clients via Server-Sent Events or WebSocket. The browser ViewerPage uses this to drive the heartbeat badge.'),

  h2('4.8  Storage Service Design'),
  para('The storage service subscribes to NATS tm.*.tm_map. For each mnemonic with enableStorage=true:'),
  numbered('Converts value string to float64.'),
  numbered('Writes to InfluxDB measurement "telemetry" with tags: chain (string), subsystem (string), mnemonic (string), and field: value (float64).'),
  numbered('Uses batched writes with a configurable flush interval to reduce InfluxDB write amplification.'),
  para('Configuration: InfluxDB URL, token, org, and database name are all configurable via YAML.'),

  h2('4.9  Simulator Service Design'),
  para('On start, the simulator reads the tm_mnemonics collection from MongoDB to get the full mnemonic catalog. Data generation:'),
  bullet('ANALOG mnemonics: generates a random float64 value uniformly distributed within [range[0], range[1]].'),
  bullet('BINARY mnemonics: cycles through the valid state strings in range[] in order.'),
  para('Writes generated values directly to Redis TM_MAP keys as if it were a live ingest chain, using the synthetic chain name "SIMULATOR". Also publishes to NATS subject tm.simulated.tm_map. Start/stop is controlled by the Redis key SIMULATOR_STATUS ("running" | "stopped"). Status is readable via GET /simulator-status.'),

  h2('4.10  UMACS-TC Service Design'),
  para('The umacs-tc service reads its operational configuration from Redis UMACS_ENV_VARIABLES on startup (host, port, source, priority, executionMode). Falls back to YAML config if the Redis key is absent.'),
  para('It exposes a REST endpoint POST /tc/dispatch accepting a JSON body: { cmdDesc, dataPart, priority, subsystem }. On receiving a dispatch request:'),
  numbered('Formats a UMACS TC API request with source, priority, executionMode, cmdDesc, dataPart.'),
  numbered('Connects to the UMACS TCP socket at configured TcIP:TcPort.'),
  numbered('Sends the formatted request and reads the acknowledgement response.'),
  numbered('Publishes the result to NATS subject tc.status as JSON { cmdDesc, status, timestamp }.'),
  para('The umacs-tc-emulator implements the identical interface but writes the dispatch record to Redis TC_LOG hash instead of connecting to a live UMACS socket. Used for integration testing.'),

  h2('4.11  Launcher Design'),
  para('The launcher reads launcher.yaml with a list of service definitions: { name, binary, config, startDelay }. Responsibilities:'),
  bullet('Starts each service as a subprocess using exec.Cmd with the configured binary path and --config flag.'),
  bullet('Monitors process health using goroutines waiting on cmd.Wait().'),
  bullet('On crash: restarts the service with configurable backoff (initial, max, multiplier).'),
  bullet('Provides an aggregate health status HTTP endpoint showing running/crashed/starting state for all services.'),
  bullet('Graceful shutdown: on receiving SIGINT or SIGTERM, sends SIGTERM to all child processes and waits for them to exit before the launcher process exits.'),
];

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 5 – DATA DESIGN
// ══════════════════════════════════════════════════════════════════════════
const sec5 = [
  pageBreak(), h1('5.  Data Design'),

  h2('5.1  MongoDB Schema Design'),

  h3('5.1.1  spasdacs Collection (astra database)'),
  para('Stores diagram documents. One document per diagram:'),
  codePara('{'),
  codePara('  _id: string,              // e.g. "diagram_1748123456789_abc123def"'),
  codePara('  name: string,             // display name (unique per deployment)'),
  codePara('  description: string,'),
  codePara('  modelData: object,        // AntV X6 serialised graph JSON'),
  codePara('  backgroundColor: string, // CSS color e.g. "#0f1419"'),
  codePara('  autoViewInclude: bool,    // default true'),
  codePara('  autoViewDuration: int,    // seconds, default 30'),
  codePara('  createdAt: string,        // RFC3339 UTC'),
  codePara('  updatedAt: string         // RFC3339 UTC'),
  codePara('}'),

  h3('5.1.2  tm_mnemonics Collection (astra database)'),
  para('Stores one document per TM mnemonic parameter. Documents are uploaded in bulk via the telemetry upload endpoint:'),
  codePara('{'),
  codePara('  _id: string,                  // mnemonic ID / frame parameter ID'),
  codePara('  subsystem: string,'),
  codePara('  type: string,                 // "ANALOG" | "BINARY"'),
  codePara('  processingType: string,       // "STATUS" | "EUCN-16B" | etc.'),
  codePara('  range: [min, max] | [states], // ANALOG: [float, float]; BINARY: [string, ...]'),
  codePara('  limits: [lower, upper],       // editable limit pair'),
  codePara('  expectedValue: string,'),
  codePara('  tolerance: number | string,   // FlexFloat64 — accepts both'),
  codePara('  unit: string,'),
  codePara('  digitalStatus: string,'),
  codePara('  cdbMnemonic: string,'),
  codePara('  sourceFile: string,'),
  codePara('  enableComparison: bool,'),
  codePara('  enableLimit: bool,'),
  codePara('  enableStorage: bool'),
  codePara('}'),

  h3('5.1.3  IAM Users Collection (iam database)'),
  codePara('{'),
  codePara('  _id: ObjectId,'),
  codePara('  username: string,        // unique index'),
  codePara('  email: string,           // unique index'),
  codePara('  passwordHash: string,    // bcrypt cost 12'),
  codePara('  fullName: string,'),
  codePara('  roles: [string],         // role name strings'),
  codePara('  isActive: bool,'),
  codePara('  createdAt: time.Time,'),
  codePara('  updatedAt: time.Time'),
  codePara('}'),

  h3('5.1.4  IAM Roles Collection (iam database)'),
  codePara('{'),
  codePara('  _id: ObjectId,'),
  codePara('  name: string,            // unique index'),
  codePara('  description: string,'),
  codePara('  permissions: [string],   // e.g. ["telemetry:read", "commands:write"]'),
  codePara('  createdAt: time.Time,'),
  codePara('  updatedAt: time.Time'),
  codePara('}'),

  h3('5.1.5  IAM refresh_tokens Collection (iam database)'),
  para('Has a TTL index on expiresAt field set to 7 days. Documents are automatically deleted by MongoDB after expiry:'),
  codePara('{'),
  codePara('  _id: ObjectId,'),
  codePara('  tokenHash: string,       // SHA-256 of raw token bytes (hex)'),
  codePara('  userId: ObjectId,'),
  codePara('  expiresAt: time.Time,    // TTL index — auto-deleted after 7 days'),
  codePara('  createdAt: time.Time'),
  codePara('}'),

  h2('5.2  Redis Key Design'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2800, 1400, 5160],
    rows: [
      new TableRow({ children: [hCell('Redis Key Pattern', 2800), hCell('Type', 1400), hCell('Description', 5160)] }),
      ...[
        ['TM_{CHAIN}_MAP',         'Hash',   'Per-chain telemetry map. Key=mnemonic, Value=processed value string. Populated by ingest per-chain.'],
        ['TM_MAP',                 'Hash',   'Unified merge of all chain maps. Same mnemonic from multiple chains: last received value wins. Chain priority determined by config order.'],
        ['TM_{CHAIN}_PKT',         'Hash',   'Raw packet messages per chain. Key=mnemonic, Value=raw WebSocket JSON message for debug.'],
        ['HEARTBEAT_{CHAIN}',      'String', 'Chain heartbeat state. Value: "CONNECTED", "DATA_BREAK", or "CONNECTION_FAILED". TTL=2s; absence implies stale.'],
        ['LIMIT_FAILURES',         'Hash',   'Current limit violations. Key=mnemonic, Value=JSON {value, upper, lower, timestamp}. Written by limiter.'],
        ['CHAIN_MISMATCHES',       'Hash',   'Cross-chain value mismatches. Key=mnemonic, Value=JSON {chain1Value, chain2Value, timestamp}. Written by comparator.'],
        ['SIMULATOR_STATUS',       'String', '"running" or "stopped". Controls simulator service start/stop.'],
        ['UMACS_ENV_VARIABLES',    'Hash',   'UMACS TC runtime config: tcIp, tcPort, source, priority, executionMode. Read by umacs-tc on startup.'],
        ['TC_LOG',                 'Hash',   'TC dispatch log written by umacs-tc-emulator. Key=uid, Value=JSON dispatch record.'],
        ['UDTM_MAP',               'Hash',   'User Display Telemetry Map current version values. Key=mnemonic, Value=user-defined display string.'],
      ].map(([k, t, d], i) => new TableRow({ children: [
        dCell(k, 2800, i % 2 === 0 ? C.offWhite : C.white),
        dCell(t, 1400, i % 2 === 0 ? C.offWhite : C.white),
        dCell(d, 5160, i % 2 === 0 ? C.offWhite : C.white),
      ] })),
    ],
  }),
  spacer(), para([bold('Table 8: ', { color: C.blue }), sp('Redis Key Design')], { alignment: AlignmentType.CENTER }),

  h2('5.3  NATS Subject Design'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2800, 1960, 2200, 2400],
    rows: [
      new TableRow({ children: [hCell('Subject', 2800), hCell('Publisher', 1960), hCell('Subscriber(s)', 2200), hCell('Payload', 2400)] }),
      ...[
        ['tm.{chain}.tm_map',         'ingest',       'gateway→browser, limiter, comparator, storage',   'JSON array [{mnem:value},...]'],
        ['tm.{chain}.tm_map/full',     'ingest',       'gateway→browser, late-joining clients',           'JSON object {mnem:value,...}'],
        ['tm.{chain}.heartbeat',       'ingest',       'chainmon, gateway→browser',                       '"OK" / "DATA_BREAK" / "CONNECTION_FAILED"'],
        ['chain.status.{chain}',       'chainmon',     'gateway→browser',                                 'JSON {chain, status, timestamp}'],
        ['tc.dispatch',                'gateway',      'umacs-tc or umacs-tc-emulator',                   'JSON {cmdDesc, dataPart, userId, timestamp}'],
        ['tc.status',                  'umacs-tc',     'gateway→browser',                                 'JSON {cmdDesc, status, timestamp}'],
        ['DTM_PROCEDURES_UPDATED',     'gateway DTM',  'frontend subscribers',                            'empty notification string'],
      ].map(([s, pub, sub, pay], i) => new TableRow({ children: [
        dCell(s,   2800, i % 2 === 0 ? C.offWhite : C.white),
        dCell(pub, 1960, i % 2 === 0 ? C.offWhite : C.white),
        dCell(sub, 2200, i % 2 === 0 ? C.offWhite : C.white),
        dCell(pay, 2400, i % 2 === 0 ? C.offWhite : C.white),
      ] })),
    ],
  }),
  spacer(), para([bold('Table 9: ', { color: C.blue }), sp('NATS Subject Design')], { alignment: AlignmentType.CENTER }),

  h2('5.4  AntV X6 modelData Schema'),
  para('The canvas state is serialized by X6\'s toJSON() method as a cells array containing both node and edge objects:'),
  codePara('{'),
  codePara('  "cells": ['),
  codePara('    {'),
  codePara('      "id": "node-uuid",'),
  codePara('      "shape": "scada-valve",'),
  codePara('      "position": { "x": 400, "y": 200 },'),
  codePara('      "size": { "width": 80, "height": 60 },'),
  codePara('      "data": { /* ScadaNodeData — full node data + telemetryBindings */ },'),
  codePara('      "ports": { "items": [ /* port definitions */ ] },'),
  codePara('      "zIndex": 10,'),
  codePara('      "angle": 0'),
  codePara('    },'),
  codePara('    {'),
  codePara('      "id": "edge-uuid",'),
  codePara('      "shape": "edge",'),
  codePara('      "source": { "cell": "node-uuid", "port": "right" },'),
  codePara('      "target": { "cell": "node-uuid2", "port": "left" },'),
  codePara('      "attrs": { "line": { /* stroke, markers */ }, "wrap": { /* hit area */ } },'),
  codePara('      "data": { /* ScadaLinkData — includes telemetryBindings */ }'),
  codePara('    }'),
  codePara('  ]'),
  codePara('}'),
  para('The entire cells array is stored as-is in the modelData field of the MongoDB spasdacs document. No server-side interpretation of cell data occurs; the schema is owned by the frontend.'),
];

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 6 – INTERFACE DESIGN
// ══════════════════════════════════════════════════════════════════════════
const sec6 = [
  pageBreak(), h1('6.  Interface Design'),

  h2('6.1  TM WebSocket Protocol (SCC to Ingest)'),
  para('The ingest service connects to each configured SCC/PCC WebSocket endpoint and implements the following message protocol:'),
  h3('6.1.1  TM Chain Subscribe Request'),
  codePara('{ "action": "subscribe", "params": ["Frame-id", "OBT"] }'),
  h3('6.1.2  TM Data Message'),
  codePara('{ "param_id": "",'),
  codePara('  "param": "P_TEMP_1",'),
  codePara('  "source_info": "",'),
  codePara('  "raw_count": "1234",'),
  codePara('  "proc_value": "47.3",'),
  codePara('  "time_stamp": "2026-03-26T10:00:00Z",'),
  codePara('  "upper_limit": "70",'),
  codePara('  "lower_limit": "0",'),
  codePara('  "err_desc": "" }'),
  para('A data break is indicated when err_desc contains the substring "break". In this case param_id and proc_value may be empty. Ingest sets HEARTBEAT to DATA_BREAK and clears the chain Redis map.'),
  h3('6.1.3  SCOS/SMON Subscribe Request'),
  codePara('{ "action": "subscribe" }'),
  h3('6.1.4  SCOS Data Message'),
  para('Delivered approximately every 4 seconds:'),
  codePara('{ "paramlist": [{"param": "S_CURR_1", "value": "2.45"}, ...],'),
  codePara('  "stream": "SMON1",'),
  codePara('  "seqcount": "12345",'),
  codePara('  "time": "2026-03-26T10:00:00Z",'),
  codePara('  "error": "" }'),

  h2('6.2  NATS Message Format (Ingest to Frontend)'),
  h3('6.2.1  Incremental Update'),
  para('Published to tm.{chain}.tm_map on each ingest cycle. Contains only the parameters updated in that cycle:'),
  codePara('[{"P_TEMP_1":"47.3"},{"P_PRESS_1":"1013.2"},{"S_CURR_1":"2.45"}]'),
  h3('6.2.2  Full Snapshot'),
  para('Published to tm.{chain}.tm_map/full every 30 seconds (configurable). Contains the complete current state of the chain map:'),
  codePara('{"P_TEMP_1":"47.3","P_PRESS_1":"1013.2","S_CURR_1":"2.45",...}'),
  h3('6.2.3  Heartbeat'),
  para('Published to tm.{chain}.heartbeat as a plain string (not JSON):'),
  codePara('"OK"'),
  codePara('"DATA_BREAK"'),
  codePara('"CONNECTION_FAILED"'),

  h2('6.3  Frontend NATS Subscription Design'),
  para('X6NatsTelemetry subscribes to three subjects per diagram session load. The prefix string is configurable from the NATS settings modal in ViewerPage:'),
  bullet('{prefix}.tm_map — incremental updates. Parsed as JSON array of single-key objects. Each object is merged into the internal telemetry map. Drives binding evaluation on every message.'),
  bullet('{prefix}.tm_map/full — full snapshot. Received on first connect (and on reconnect to re-sync). Replaces the internal map with the full server-side state, ensuring no stale values after a reconnect.'),
  bullet('{prefix}.heartbeat — plain string. "OK" is coerced to "1" for truthy checks. Exposed via the onHeartbeat(status) callback which ViewerPage uses to update the heartbeat badge.'),
  para('The X6NatsTelemetry class exposes: start(graph, subscribePrefix), stop(), onConnectionChange(cb), onHeartbeat(cb).'),
];

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 7 – SECURITY DESIGN
// ══════════════════════════════════════════════════════════════════════════
const sec7 = [
  pageBreak(), h1('7.  Security Design'),

  h2('7.1  Authentication Flow'),
  para('The complete login and session lifecycle:'),
  numbered('User submits username and password to POST /iam/api/v1/auth/login.'),
  numbered('IAM service looks up the user document by username. Returns HTTP 401 if not found or isActive=false.'),
  numbered('bcrypt.CompareHashAndPassword(storedHash, submittedPassword) — returns HTTP 401 on mismatch.'),
  numbered('Generates JWT access token (HMAC-SHA256, 15-minute expiry) containing {sub, username, roles[], exp, iat}.'),
  numbered('Generates opaque refresh token (32 random bytes, crypto/rand). Stores SHA-256(raw) in refresh_tokens collection with TTL=7 days. Returns raw bytes to client.'),
  numbered('Returns JSON: { access_token, refresh_token, expires_in, user }.'),
  numbered('Frontend stores the session as JSON in localStorage key "spasdacs-auth-v1".'),
  numbered('All protected API requests send: Authorization: Bearer {access_token}.'),
  numbered('When access token is within 20 seconds of expiry: frontend calls POST /auth/refresh with the refresh token.'),
  numbered('IAM computes SHA-256 of the submitted refresh token, finds the matching document, validates TTL, issues a new access token.'),

  h2('7.2  RBAC Design'),
  para('Casbin RBAC model. Policy format: p, role, resource, action. Example rules:'),
  codePara('p, admin, *, *'),
  codePara('p, operator, telemetry, read'),
  codePara('p, operator, commands, write'),
  codePara('p, viewer, telemetry, read'),
  spacer(),
  para('Middleware enforcement: for each protected route, authorizer.RequirePermission(resource, action) calls casbin.Enforce(role, resource, action) for each role the authenticated user holds. Access is granted if any role permits the action. Returns HTTP 403 if no role permits.'),
  para('Policy rules are stored in the MongoDB casbin_rules collection via the Casbin MongoDB adapter, ensuring RBAC policy persists across service restarts.'),

  h2('7.3  Unauthenticated Direct Viewer'),
  para('The /viewer/:id route is marked public (meta.public=true, meta.requireAuth=false) in the Vue Router. This enables unauthenticated users to view live telemetry diagrams.'),
  bullet('ViewerPage.vue checks !auth.isLoggedIn on mount and on every navigation guard.'),
  bullet('If not logged in: shows a read-only banner, hides the TC Queue button, and hides all Edit controls.'),
  bullet('Diagram and telemetry API requests to the Gateway do not require authentication (public endpoints).'),
  bullet('TC dispatch (POST /tc/dispatch): always requires a valid Bearer token. The IAM middleware on that route returns HTTP 401 for requests without a token. The frontend never shows the dispatch button to unauthenticated users.'),

  h2('7.4  Token Security'),
  bullet('JWT: payload contains only userId, username, roles[], exp, iat. No sensitive personal data. Secret key loaded from config env var (never hardcoded).'),
  bullet('Refresh token: opaque random bytes stored as SHA-256 hash in MongoDB. Database compromise does not expose raw tokens that could be replayed elsewhere.'),
  bullet('Password: bcrypt cost=12. Never logged, never returned in any API response. Password change operation revokes all existing refresh tokens for the user.'),
  bullet('Session cleanup: POST /auth/logout deletes all refresh_tokens documents for the user. Passwords change also triggers refresh token revocation.'),
];

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 8 – TELEMETRY BINDING ENGINE DESIGN
// ══════════════════════════════════════════════════════════════════════════
const sec8 = [
  pageBreak(), h1('8.  Telemetry Binding Engine Design'),

  h2('8.1  Architecture Overview'),
  para('X6NatsTelemetry manages the complete pipeline from network message to SVG re-render:'),
  para('NATS message → JSON parse → applyValues(map) → for each node with bindings → evaluate bindings → coerce value by prop type → tween or instant apply → X6 node.setData() → Vue change:data event → Vue computed re-render → SVG attribute update.'),
  para('The engine operates entirely on the X6 graph object and the shared telemetryStore Map. It has no knowledge of Vue internals and does not import any Vue APIs directly.'),

  h2('8.2  Property Classification'),
  para('Bindable properties are classified into four groups, each with a distinct application path:'),
  bullet('COLOR_PROPS {statusColor, stroke, fill}: string values, applied instantly via node.setData() patch.'),
  bullet('NUMERIC_PROPS {level, gaugeValue, wheelSpeed, chargeLevel, opacity, strokeWidth, x, y, width, height, angle, position, ...}: float64 values, applied via the tween engine over TWEEN_MS=500ms for smooth animation.'),
  bullet('BOOLEAN_PROPS {flowActive, isCharging, visible, isInvalid, alarm, ...}: coerced from string or number ("true"/"1"/"yes" → true, all else → false), applied instantly.'),
  bullet('GEO_PROPS {x, y, width, height, angle, visible}: applied via X6 model methods (setPosition, setSize, prop("angle"), setVisible) rather than setData(). This ensures X6 internal geometry model stays consistent.'),

  h2('8.3  Binding Evaluation Pipeline'),
  para('For each TelemetryBinding on each node in the diagram, the following pipeline runs on every NATS message:'),
  numbered('If targetProp === "__multi__" and script is present: evaluates script(value, TM) with the TM accessor object. The script returns a Record<string, string>. Each key-value pair is distributed to the appropriate instant or numeric map.'),
  numbered('Gets rawValue = tmStore.get(binding.topic). If no value exists for the topic, skip this binding cycle.'),
  numbered('If rules[] is present: iterates rules in order. Evaluates each BindingRule.condition as new Function("value", "TM", ...). First truthy condition returns that rule\'s value. Remaining rules skipped.'),
  numbered('If transformScript is present: evaluates as new Function("value", "TM", ...) with the full TM accessor.'),
  numbered('If transform is present (legacy short-form): evaluates as new Function("v", ...) with single value argument.'),
  numbered('Coerces the result string to the appropriate type based on the targetProp classification (Section 8.2).'),
  numbered('If NUMERIC: adds to numeric map for tween processing. Also adds {propRaw: result} to the instant setData() patch so text overlays update immediately.'),
  numbered('Otherwise: adds to instant map for immediate application.'),

  h3('8.3.1  TM Accessor'),
  para('buildTMAccessor() constructs a JavaScript Proxy over the flat telemetryStore Map. The Proxy handler intercepts property gets:'),
  bullet('TM["P_TEMP_1"] — direct mnemonic lookup in the flat store.'),
  bullet('TM["SUBSYSTEM_A"]["P_TEMP"] — subsystem-scoped lookup using a nested Proxy.'),
  para('This allows scripts to navigate the telemetry space either with full mnemonic keys or with subsystem scoping, without requiring the script author to know how values are stored internally.'),

  h2('8.4  Tween Engine'),
  para('All NUMERIC property transitions are animated using a custom requestAnimationFrame-based tween engine (not GSAP):'),
  bullet('Easing function: EaseOutCubic — f(t) = 1 − (1−t)³.'),
  bullet('Active tweens stored in Map<"cellId:prop", Tween> where each Tween carries: from, to, startTime (performance.now() at tween start), onUpdate callback.'),
  bullet('Animation loop: a single rAF loop runs while the tweens map is non-empty. Each frame computes t = (now − startTime) / TWEEN_MS, clamps to [0,1], computes easedValue = from + (to − from) * easeOutCubic(t), calls onUpdate(easedValue).'),
  bullet('On t >= 1: tween is completed, entry removed from the map.'),
  bullet('New incoming value for an in-progress tween: restarts the tween from the current animated value (not the stale from value) to the new target. This prevents visual jumps.'),
  bullet('TWEEN_MS = 500ms — matches the 500ms latency budget from SRS-N-23.'),

  h2('8.5  GEO Offset Design'),
  para('Problem: a telemetry value representing an absolute position (e.g., "thruster position = 47") has no meaning if the diagram element was placed at canvas x=500. Setting x=47 would move the element off-screen.'),
  para('Solution: captureGeoBaseValues() is called when the engine starts. It snapshots the designed (authored) canvas position of every node that has a GEO binding (x, y, width, height, angle). At apply time: actual = base + tmValue. So TM=0 produces no movement (element stays at designed position), TM=50 moves the element 50px from its designed position. This makes GEO bindings relative to the authored layout.'),

  h2('8.6  Flow Animation Design'),
  para('Edge flow animation is implemented with CSS keyframes and compositor-offloaded animation for zero JS overhead per frame:'),
  numbered('On system start, inject CSS keyframes once into the document: x6FlowFwd (stroke-dashoffset: 0 → −12, 0.4s linear infinite), x6FlowBwd (stroke-dashoffset: 0 → +12, 0.4s linear infinite).'),
  numbered('When binding sets flowActive=true: edge.attr("line/strokeDasharray", "8 4"); edge.attr("line/style", "animation:x6FlowFwd 0.4s linear infinite"). Direction reversed by setting x6FlowBwd for flowDirection=−1.'),
  numbered('When flowActive=false: clear strokeDasharray and style attrs.'),
  numbered('A flowingEdges Set tracks currently animated edges to skip redundant DOM operations on edges that haven\'t changed flow state.'),
  para('The browser\'s GPU compositor runs the stroke-dashoffset animation independently of the JavaScript thread, maintaining smooth 60fps flow animation regardless of binding evaluation load.'),

  h2('8.7  Momentum Wheel and Battery Animations'),
  h3('8.7.1  Momentum Wheel'),
  para('The MomentumWheel node uses a delta-time driven continuous rotation that runs independently of the NATS binding cycle. Each animation frame:'),
  bullet('degStep = |wheelSpeed| × (360 / 6000) × dt_ms — proportional rotation per millisecond.'),
  bullet('wheelAngle += direction × degStep, modulo 360.'),
  bullet('Written to node.setData({wheelAngle}) — useNodeData composable propagates to SVG transform.'),
  bullet('wheelSpeed=0 stops rotation; negative wheelSpeed reverses direction.'),
  h3('8.7.2  Battery Charging Animation'),
  para('When isCharging=true, an independent animation loop runs:'),
  bullet('batteryAnim += BATTERY_ANIM_SPEED (= 30%/s) × dt_ms / 1000, modulo 100.'),
  bullet('BatteryNode.vue uses batteryAnim value to offset the charging gradient fill position, producing a rising fill effect.'),
  bullet('When isCharging=false, batteryAnim is reset to 0 and the loop halts.'),
];

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 9 – ERROR HANDLING AND RESILIENCE DESIGN
// ══════════════════════════════════════════════════════════════════════════
const sec9 = [
  pageBreak(), h1('9.  Error Handling and Resilience Design'),

  h2('9.1  Frontend Error Handling'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2800, 2280, 4280],
    rows: [
      new TableRow({ children: [hCell('Scenario', 2800), hCell('Detection', 2280), hCell('Response', 4280)] }),
      ...[
        ['NATS connection failure',      'connectNats() catch block',                      'onConnectionChange(false) → viewer shows "○ Idle" badge'],
        ['NATS disconnect',              'monitorConnection() status stream',               'onConnectionChange(false) → badge updates'],
        ['NATS reconnect',               'status.type === "reconnect"',                     'onConnectionChange(true) → badge updates, requests full snapshot'],
        ['Backend API failure (save)',   'DiagramStorage.saveDiagram() catch',              'Falls back to localStorage; logs warning to console'],
        ['Backend API failure (list)',   'DiagramStorage.getAllDiagrams() catch',            'Returns localStorage-only diagram list'],
        ['Diagram not found',            'GET /diagrams/{id} returns HTTP 404',             'ViewerPage / EditorPage shows "Diagram not found" error state'],
        ['JWT expired mid-session',      'Any IAM API call returns HTTP 401',               'auth.refreshIfNeeded(force=true) attempted; if fails → logout + redirect /login'],
        ['Transform script error',       'try/catch in applyTransform()',                   'console.warn with binding id; binding skipped for this evaluation cycle'],
        ['Multi-binding script error',   'try/catch in applyValues()',                      'console.warn with cell id; that binding skipped for this cycle'],
        ['Mnemonic not in store',        'tmStore.get() returns undefined',                 'Binding evaluation skipped; no setData() call; node retains last value'],
      ].map(([s, d, r], i) => new TableRow({ children: [
        dCell(s, 2800, i % 2 === 0 ? C.offWhite : C.white),
        dCell(d, 2280, i % 2 === 0 ? C.offWhite : C.white),
        dCell(r, 4280, i % 2 === 0 ? C.offWhite : C.white),
      ] })),
    ],
  }),
  spacer(), para([bold('Table 10: ', { color: C.blue }), sp('Frontend Error Handling')], { alignment: AlignmentType.CENTER }),

  h2('9.2  Backend Error Handling'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [2800, 2280, 4280],
    rows: [
      new TableRow({ children: [hCell('Scenario', 2800), hCell('Detection', 2280), hCell('Response', 4280)] }),
      ...[
        ['SCC WebSocket disconnect',    'OnDisconnect callback fires',                    'setHeartbeat(CONNECTION_FAILED), clearChainRedis(), start auto-reconnect backoff loop'],
        ['SCC data break (TM)',         '"break" in err_desc field',                      'setHeartbeat(DATA_BREAK), clearChainRedis(), continue reconnect loop'],
        ['Redis pipeline error',        'pipe.Exec() returns non-nil error',              'log.Error with chain and error; continue processing next message'],
        ['MongoDB query error',         'mongo driver returns error',                     'HTTP 500 with JSON {"error": "internal server error"}; original error logged'],
        ['JWT validation failure',      'middleware.RequireAuth detects invalid/expired', 'HTTP 401 {"error": "unauthorized"}'],
        ['Casbin permission denied',    'Enforcer.Enforce() returns false',               'HTTP 403 {"error": "forbidden"}'],
        ['NATS publish failure',        'nc.Publish() returns non-nil error',             'log.Error; ingest continues processing; data not lost from Redis'],
        ['InfluxDB write failure',      'Write API returns error',                        'log.Error; batch retried on next flush interval'],
        ['Service crash (subprocess)',  'Launcher cmd.Wait() returns non-nil error',      'Restart with configurable exponential backoff (initial, max, multiplier)'],
        ['Config file missing',         'Viper config.Load() returns error',              'Service exits with non-zero code; Launcher marks service crashed'],
      ].map(([s, d, r], i) => new TableRow({ children: [
        dCell(s, 2800, i % 2 === 0 ? C.offWhite : C.white),
        dCell(d, 2280, i % 2 === 0 ? C.offWhite : C.white),
        dCell(r, 4280, i % 2 === 0 ? C.offWhite : C.white),
      ] })),
    ],
  }),
  spacer(), para([bold('Table 11: ', { color: C.blue }), sp('Backend Error Handling')], { alignment: AlignmentType.CENTER }),

  h2('9.3  WebSocket Reconnection Design'),
  para('The WSSubscriber implements exponential backoff for all SCC WebSocket connections:'),
  bullet('Initial delay: configurable (default 1s).'),
  bullet('On each disconnect: delay = min(delay × multiplier, maxDelay).'),
  bullet('Max delay: configurable (default 30s).'),
  bullet('Delay resets to initial on a successful connection establishment.'),
  bullet('All reconnect attempts logged at WARN level with chain name, attempt count, and next delay.'),
  para('This design ensures that a brief SCC restart does not cause a flood of reconnect attempts, while still recovering quickly from short outages.'),
];

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 10 – CONFIGURATION DESIGN
// ══════════════════════════════════════════════════════════════════════════
const sec10 = [
  pageBreak(), h1('10.  Configuration Design'),

  h2('10.1  YAML Configuration Structure'),
  para('Each microservice has its own config.yaml loaded at startup via Viper. Environment variables prefixed with the service name can override any YAML value.'),
  h3('10.1.1  Ingest Service Example Configuration'),
  codePara('service:'),
  codePara('  name: ingest'),
  codePara('  log_level: info'),
  codePara(''),
  codePara('redis:'),
  codePara('  addr: localhost:6379'),
  codePara('  password: ""'),
  codePara('  db: 0'),
  codePara(''),
  codePara('mongo:'),
  codePara('  uri: mongodb://localhost:27017'),
  codePara('  database: astra'),
  codePara(''),
  codePara('nats:'),
  codePara('  url: nats://localhost:4222'),
  codePara('  name: tm-ingest'),
  codePara('  subject_prefix: tm'),
  codePara('  poll_interval_ms: 800'),
  codePara('  snapshot_interval_s: 30'),
  codePara(''),
  codePara('websocket:'),
  codePara('  retry_initial: "1s"'),
  codePara('  retry_max: "30s"'),
  codePara('  retry_multiplier: 2'),
  codePara(''),
  codePara('chains:'),
  codePara('  - name: TM1'),
  codePara('    type: TM'),
  codePara('    host: 192.168.1.100'),
  codePara('    port: 9001'),
  codePara('  - name: SMON1'),
  codePara('    type: SCOS'),
  codePara('    host: 192.168.1.100'),
  codePara('    port: 9002'),

  h3('10.1.2  IAM Service Example Configuration'),
  codePara('service:'),
  codePara('  name: iam'),
  codePara('  log_level: info'),
  codePara('  port: 8093'),
  codePara(''),
  codePara('mongo:'),
  codePara('  uri: mongodb://localhost:27017'),
  codePara('  database: iam'),
  codePara(''),
  codePara('jwt:'),
  codePara('  secret: "change-me-in-production"'),
  codePara('  access_token_ttl: "15m"'),
  codePara('  refresh_token_ttl: "168h"'),
  codePara(''),
  codePara('bcrypt:'),
  codePara('  cost: 12'),

  h2('10.2  Frontend Environment Variables (Vite)'),
  para('These variables are set in the .env file at the project root and compiled into the frontend bundle by Vite at build time. At runtime, they can also be overridden by injecting window._env_ values from the static file server.'),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [3200, 3160, 3000],
    rows: [
      new TableRow({ children: [hCell('Variable', 3200), hCell('Default', 3160), hCell('Purpose', 3000)] }),
      ...[
        ['VITE_DIAGRAM_API_URL', 'http://{hostname}/gateway/api/go/v1', 'Gateway REST API base URL'],
        ['VITE_GATEWAY_URL',     'http://{hostname}/gateway/api/go/v1', 'Alias for diagram API URL'],
        ['VITE_IAM_URL',         'http://{hostname}/iam/api/v1',        'IAM service base URL'],
        ['VITE_NATS_URL',        'ws://{hostname}:9222',                'NATS WebSocket URL (shown as default in NATS config modal)'],
      ].map(([v, d, p], i) => new TableRow({ children: [
        dCell(v, 3200, i % 2 === 0 ? C.offWhite : C.white),
        dCell(d, 3160, i % 2 === 0 ? C.offWhite : C.white),
        dCell(p, 3000, i % 2 === 0 ? C.offWhite : C.white),
      ] })),
    ],
  }),
  spacer(), para([bold('Table 12: ', { color: C.blue }), sp('Frontend Environment Variables')], { alignment: AlignmentType.CENTER }),

  h2('10.3  Launcher Configuration'),
  para('The launcher.yaml defines the startup order, binary paths, and config file locations for all managed services:'),
  codePara('services:'),
  codePara('  - name: iam'),
  codePara('    binary: ./iam/iam'),
  codePara('    config: ./iam/config.yaml'),
  codePara('    start_delay: 0s'),
  codePara('  - name: ingest'),
  codePara('    binary: ./ingest/ingest'),
  codePara('    config: ./ingest/config.yaml'),
  codePara('    start_delay: 2s'),
  codePara('  - name: gateway'),
  codePara('    binary: ./gateway/gateway'),
  codePara('    config: ./gateway/config.yaml'),
  codePara('    start_delay: 3s'),
  codePara('  - name: limiter'),
  codePara('    binary: ./limiter/limiter'),
  codePara('    config: ./limiter/config.yaml'),
  codePara('    start_delay: 5s'),
  codePara('  - name: comparator'),
  codePara('    binary: ./comparator/comparator'),
  codePara('    config: ./comparator/config.yaml'),
  codePara('    start_delay: 5s'),
  codePara('  - name: chainmon'),
  codePara('    binary: ./chainmon/chainmon'),
  codePara('    config: ./chainmon/config.yaml'),
  codePara('    start_delay: 5s'),
  codePara('  - name: storage'),
  codePara('    binary: ./storage/storage'),
  codePara('    config: ./storage/config.yaml'),
  codePara('    start_delay: 5s'),
  codePara('  - name: simulator'),
  codePara('    binary: ./simulator/simulator'),
  codePara('    config: ./simulator/config.yaml'),
  codePara('    start_delay: 6s'),
  codePara('  - name: umacs-tc'),
  codePara('    binary: ./umacs-tc/umacs-tc'),
  codePara('    config: ./umacs-tc/config.yaml'),
  codePara('    start_delay: 4s'),
];

// ══════════════════════════════════════════════════════════════════════════
//  SECTION 11 – REQUIREMENTS TRACEABILITY
// ══════════════════════════════════════════════════════════════════════════
const sec11 = [
  pageBreak(), h1('11.  Requirements Traceability'),

  para('The following table maps key design decisions documented in this SDD back to the SRS requirements they implement. This provides a bidirectional link between the requirements specification and the detailed design.'),
  spacer(),
  new Table({
    width: { size: 9360, type: WidthType.DXA }, columnWidths: [4560, 4800],
    rows: [
      new TableRow({ children: [hCell('Design Decision', 4560), hCell('SRS Requirement(s)', 4800)] }),
      ...[
        ['AntV X6 chosen as graph/canvas engine',                         'SRS-N-01, SRS-N-02, SRS-N-03, SRS-N-04'],
        ['useNodeData composable pattern (zero-copy Vue reactivity)',      'SRS-N-23 (sub-500ms latency)'],
        ['500ms easeOutCubic tween for NUMERIC props',                     'SRS-N-27 (blink/state change visual feedback)'],
        ['CSS flow animation (GPU compositor, zero JS overhead)',          'SRS-N-28 (limit violation visual indicator)'],
        ['NATS pub/sub instead of REST polling for telemetry',            'SRS-N-23 (500ms end-to-end latency requirement)'],
        ['Backend-first + localStorage fallback in DiagramStorage',       'SRS-N-07, SRS-N-08 (diagram persistence with resilience)'],
        ['Hash-mode Vue Router (no server-side route config)',            'SRS-N-34 (browser-only, no installation)'],
        ['JWT 15-minute TTL + 7-day opaque refresh token',                'SRS-N-83, SRS-N-84'],
        ['bcrypt password hashing at cost=12',                            'SRS-N-82'],
        ['Casbin RBAC with MongoDB adapter (policy persists restarts)',   'SRS-N-85'],
        ['GEO offset binding (base + tmValue for position)',              'SRS-N-17 (x/y position binding to telemetry)'],
        ['Public /viewer/:id route (no auth required)',                   'SRS-N-32, SRS-N-87 (unauthenticated direct viewer)'],
        ['TC dispatch blocked in viewer and unauthenticated contexts',     'SRS-N-43, SRS-N-87'],
        ['Reactive commandQueueStore (Vue reactive singleton)',           'SRS-N-50 (TC history log, queue management)'],
        ['DiagramStorage.patchDiagram with AUTOVIEW_CACHE_KEY failsafe', 'SRS-N-37 (autoViewInclude/Duration persistence)'],
        ['FlexFloat64 tolerance decoder (accepts string or number)',       'SRS-N-71 (backward compatibility with old catalogs)'],
        ['Proportional port layout via custom X6 registerPortLayout()',   'SCADA diagram accuracy requirement'],
        ['TM_MAP unified merge with chain priority order',                'SRS-N-96 (comparator reads unified map)'],
        ['HEARTBEAT_{CHAIN} Redis key TTL=2s (stale detection)',          'SRS-N-99 (chainmon health watchdog)'],
        ['Launcher exponential backoff restart on service crash',         'SRS-N-99 (service reliability and availability)'],
        ['30-node SCADA shape library with useNodeData pattern',          'SRS-N-09 (custom shape library per project)'],
        ['Monaco Editor in TelemetryBindingEditor Inspector',             'SRS-N-19 (Monaco autocomplete from mnemonic catalog)'],
        ['11 independent Go microservices with chi v5 router',            'SRS-N design constraints Section 3.4'],
        ['CGO_ENABLED=0 static binaries',                                 'SRS-N constraint – cross-platform portability'],
        ['InfluxDB batched writes with configurable flush interval',      'SRS-N-100 (storage service performance)'],
      ].map(([d, r], i) => new TableRow({ children: [
        dCell(d, 4560, i % 2 === 0 ? C.offWhite : C.white),
        dCell(r, 4800, i % 2 === 0 ? C.offWhite : C.white),
      ] })),
    ],
  }),
  spacer(), para([bold('Table 13: ', { color: C.blue }), sp('Design Decision to SRS Requirements Traceability')], { alignment: AlignmentType.CENTER }),
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
  ...sec5,
  ...sec6,
  ...sec7,
  ...sec8,
  ...sec9,
  ...sec10,
  ...sec11,
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
  const out = 'Software Design Document-SPASDACS Nova.docx';
  fs.writeFileSync(out, buffer);
  console.log('Generated:', out, '(' + (buffer.length / 1024).toFixed(1) + ' KB)');
}).catch(err => { console.error('Error:', err); process.exit(1); });
