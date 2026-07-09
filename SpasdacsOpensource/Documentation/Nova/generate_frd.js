const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, LevelFormat, TableOfContents,
  Bookmark, PageBreak
} = require('docx');
const fs = require('fs');

// ── Colors ────────────────────────────────────────────────────────────────
const C = {
  navy:     '1A1A2E',
  blue:     '2E75B6',
  lightBlue:'BDD7EE',
  teal:     '00A99D',
  cyan:     '00EAFF',
  white:    'FFFFFF',
  offWhite: 'F2F7FC',
  gray:     'D6DCE4',
  darkGray: '595959',
  black:    '000000',
  green:    '375623',
  greenBg:  'E2EFDA',
};

// ── Borders ───────────────────────────────────────────────────────────────
const thinBorder  = { style: BorderStyle.SINGLE, size: 1,  color: C.gray };
const thickBorder = { style: BorderStyle.SINGLE, size: 4,  color: C.blue };
const cellBorders = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };
const noBorder    = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders   = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ── Helpers ───────────────────────────────────────────────────────────────
const sp = (text, opts = {}) => new TextRun({ text, font: 'Arial', size: 22, ...opts });
const bold = (text, opts = {}) => sp(text, { bold: true, ...opts });

function para(children, opts = {}) {
  const arr = typeof children === 'string' ? [sp(children)] : children;
  return new Paragraph({ children: arr, spacing: { after: 100 }, ...opts });
}

function h1(text, bookmarkId) {
  const runs = bookmarkId
    ? [new Bookmark({ id: bookmarkId, children: [new TextRun({ text, font: 'Arial', size: 32, bold: true, color: C.navy })] })]
    : [new TextRun({ text, font: 'Arial', size: 32, bold: true, color: C.navy })];
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: runs, spacing: { before: 360, after: 180 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.blue, space: 6 } } });
}
function h2(text, bookmarkId) {
  const runs = bookmarkId
    ? [new Bookmark({ id: bookmarkId, children: [new TextRun({ text, font: 'Arial', size: 26, bold: true, color: C.blue })] })]
    : [new TextRun({ text, font: 'Arial', size: 26, bold: true, color: C.blue })];
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: runs, spacing: { before: 240, after: 120 } });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text, font: 'Arial', size: 24, bold: true, color: C.darkGray })], spacing: { before: 180, after: 80 } });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    children: [sp(text)],
    spacing: { after: 60 },
  });
}

function numbered(children, level = 0) {
  const arr = typeof children === 'string' ? [sp(children)] : children;
  return new Paragraph({
    numbering: { reference: 'numbers', level },
    children: arr,
    spacing: { after: 80 },
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function headerCell(text, w, opts = {}) {
  return new TableCell({
    borders: cellBorders,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: C.navy, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [sp(text, { bold: true, color: C.white })], alignment: AlignmentType.CENTER })],
    ...opts,
  });
}

function dataCell(text, w, shade = C.white, align = AlignmentType.LEFT) {
  return new TableCell({
    borders: cellBorders,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [sp(text)], alignment: align })],
  });
}

function dataCellRuns(runs, w, shade = C.white) {
  return new TableCell({
    borders: cellBorders,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: shade, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: runs })],
  });
}

function sectionDivider() {
  return new Paragraph({ spacing: { after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.lightBlue, space: 4 } }, children: [] });
}

// ── Document ──────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: '\u25E6', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
        ],
      },
      {
        reference: 'numbers',
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.DECIMAL, text: '%2.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1080, hanging: 360 } } } },
        ],
      },
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
    // ── COVER PAGE ─────────────────────────────────────────────────────────
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      children: [
        new Paragraph({ spacing: { before: 1440, after: 360 }, children: [] }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: 'FUNCTIONAL REQUIREMENTS DOCUMENT', font: 'Arial', size: 40, bold: true, color: C.navy })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: 'SPAcecraft Status Display And Commanding Software', font: 'Arial', size: 28, color: C.blue })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 480 },
          children: [new TextRun({ text: 'SPASDACS Nova', font: 'Arial', size: 36, bold: true, color: C.teal, italics: true })],
        }),
        sectionDivider(),
        new Paragraph({ spacing: { after: 120 }, children: [] }),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2800, 6560],
          rows: [
            new TableRow({ children: [
              new TableCell({ borders: noBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: C.navy, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 180, right: 180 }, children: [para([bold('Document No.', { color: C.white })])] }),
              new TableCell({ borders: noBorders, width: { size: 6560, type: WidthType.DXA }, shading: { fill: C.offWhite, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 180, right: 180 }, children: [para('SCG-GRCD2-SW-2025-02')] }),
            ] }),
            new TableRow({ children: [
              new TableCell({ borders: noBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: C.navy, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 180, right: 180 }, children: [para([bold('Version', { color: C.white })])] }),
              new TableCell({ borders: noBorders, width: { size: 6560, type: WidthType.DXA }, shading: { fill: C.white, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 180, right: 180 }, children: [para('2.0')] }),
            ] }),
            new TableRow({ children: [
              new TableCell({ borders: noBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: C.navy, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 180, right: 180 }, children: [para([bold('Date', { color: C.white })])] }),
              new TableCell({ borders: noBorders, width: { size: 6560, type: WidthType.DXA }, shading: { fill: C.offWhite, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 180, right: 180 }, children: [para('March 2026')] }),
            ] }),
            new TableRow({ children: [
              new TableCell({ borders: noBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: C.navy, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 180, right: 180 }, children: [para([bold('Prepared by', { color: C.white })])] }),
              new TableCell({ borders: noBorders, width: { size: 6560, type: WidthType.DXA }, shading: { fill: C.white, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 180, right: 180 }, children: [para('GEOSAT RF & Payload Checkout Division-2')] }),
            ] }),
            new TableRow({ children: [
              new TableCell({ borders: noBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: C.navy, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 180, right: 180 }, children: [para([bold('Organisation', { color: C.white })])] }),
              new TableCell({ borders: noBorders, width: { size: 6560, type: WidthType.DXA }, shading: { fill: C.offWhite, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 180, right: 180 }, children: [para('Spacecraft Checkout Group, UR RAO Satellite Centre, ISRO, Bangalore')] }),
            ] }),
            new TableRow({ children: [
              new TableCell({ borders: noBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: C.navy, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 180, right: 180 }, children: [para([bold('Supersedes', { color: C.white })])] }),
              new TableCell({ borders: noBorders, width: { size: 6560, type: WidthType.DXA }, shading: { fill: C.white, type: ShadingType.CLEAR }, margins: { top: 100, bottom: 100, left: 180, right: 180 }, children: [para('SCG-GRCD2-SW-2021-01 (SPASDACS 1.0 FRD)')] }),
            ] }),
          ],
        }),
        new Paragraph({ spacing: { before: 2400, after: 120 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'UR RAO SATELLITE CENTRE', font: 'Arial', size: 22, bold: true, color: C.navy })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: 'INDIAN SPACE RESEARCH ORGANISATION', font: 'Arial', size: 22, color: C.darkGray })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'BANGALORE', font: 'Arial', size: 22, color: C.darkGray })] }),
        pageBreak(),
      ],
    },

    // ── MAIN CONTENT ───────────────────────────────────────────────────────
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1260, left: 1440 } },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: 0 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.blue, space: 4 } },
            children: [
              sp('FUNCTIONAL REQUIREMENTS DOCUMENT', { bold: true, color: C.navy }),
              sp('  |  SPASDACS Nova  |  Doc No: SCG-GRCD2-SW-2025-02  |  Version 2.0', { color: C.darkGray }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.blue, space: 4 } },
            children: [
              sp('Page '),
              new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 22 }),
              sp(' of '),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 22 }),
              sp('   |   URSC QUALITY POLICY: COMMITTED TO TOTAL QUALITY AND ZERO DEFECT IN SPACE SYSTEMS AND SERVICES', { color: C.darkGray, size: 18 }),
            ],
          })],
        }),
      },
      children: [

        // ── 1. CHANGE HISTORY ─────────────────────────────────────────────
        h1('Change History', 'ch'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1200, 1400, 2200, 1560, 3000],
          rows: [
            new TableRow({ tableHeader: true, children: [
              headerCell('Version', 1200), headerCell('Date', 1400), headerCell('Affected Section', 2200), headerCell('Change Type', 1560), headerCell('Description', 3000),
            ] }),
            new TableRow({ children: [
              dataCell('1.0', 1200, C.offWhite, AlignmentType.CENTER), dataCell('02/08/2021', 1400, C.white), dataCell('All', 2200, C.offWhite), dataCell('New', 1560, C.white), dataCell('Initial release - SPASDACS 1.0', 3000, C.offWhite),
            ] }),
            new TableRow({ children: [
              dataCell('2.0', 1200, C.lightBlue, AlignmentType.CENTER), dataCell('March 2026', 1400, C.white), dataCell('All sections', 2200, C.lightBlue), dataCell('New', 1560, C.white), dataCell('SPASDACS Nova — complete redesign as browser-based SPA with NATS telemetry, TC commanding, MongoDB persistence, IAM/RBAC (NV-77..89), Audit Log (NV-90..95), Diagram Library (NV-96..100), ACSS/UMACS automation (NV-101..103), binding intelligence (NV-73..76). Incorporates all DRC-02/03/04/07/08/09/11/13.1 action items. Unauthenticated Viewer access (read-only, no TC) also specified.', 3000, C.lightBlue),
            ] }),
          ],
        }),
        pageBreak(),

        // ── TOC ───────────────────────────────────────────────────────────
        h1('Table of Contents'),
        new TableOfContents('Table of Contents', { hyperlink: true, headingStyleRange: '1-3' }),
        pageBreak(),

        // ── 1. INTRODUCTION ───────────────────────────────────────────────
        h1('1.  Introduction', 'intro'),
        para('This document describes the functional requirements of SPASDACS Nova (version 2.0), the SPAcecraft Status Display And Commanding Software. SPASDACS Nova is a complete redesign and enhancement of SPASDACS 1.0, evolving from a desktop-installed tool into a fully browser-based, real-time spacecraft monitoring and commanding application.'),
        para('SPASDACS Nova introduces a modern single-page application (SPA) architecture powered by Vue 3, an AntV X6 graphical diagram engine, NATS-based live telemetry streaming, MongoDB-backed diagram persistence, and an integrated telecommand execution workflow.'),
        para([
          sp('Version 2.0 of this document incorporates all action items from the '),
          sp('Software DRC Meeting Closeout Note (SCG-GRCD2-SW-2021-02-1, dated 09/11/2021)', { bold: true }),
          sp(' that were deferred for implementation in the next version of SPASDACS. These cover: automated ACSS/UMACS interface (DRC-02), auto-completion and type-detection in the binding editor (DRC-03, DRC-04), default multi-stream TM subscription (DRC-07), proper user account administration and RBAC (DRC-08), audit logging of visual attribute changes (DRC-09), central diagram repository (DRC-11), and simplified binding interface (DRC-13.1). New requirements are identified with IDs NV-73 through NV-103.'),
        ]),
        para('This document supersedes the SPASDACS 1.0 Functional Requirements Document (SCG-GRCD2-SW-2021-01).'),

        // ── 2. SCOPE ──────────────────────────────────────────────────────
        h1('2.  Scope', 'scope'),
        para('SPASDACS Nova enables spacecraft engineers and operators to:'),
        bullet('Design interactive subsystem block diagrams using a browser-based graphical editor'),
        bullet('Bind telemetry mnemonics and visual rules to diagram elements'),
        bullet('Monitor live spacecraft telemetry via NATS subscriptions in a read-only viewer'),
        bullet('Issue telecommands through a structured command queue workflow'),
        bullet('Manage multiple diagram pages with automated slideshow (Auto View) capability'),
        bullet('Persist all diagram data and settings in a MongoDB backend, with offline localStorage fallback'),
        para('The software is intended for use during spacecraft integration, checkout, and operations phases.', { spacing: { before: 120, after: 100 } }),

        // ── 3. SYSTEM OVERVIEW ────────────────────────────────────────────
        h1('3.  System Overview', 'sysoverview'),
        para('SPASDACS Nova is a three-tier web application:'),

        h2('3.1  Frontend (SPA)', 'fe'),
        para('A Vue 3 single-page application served through a web browser. It comprises three primary pages and several reusable components:'),
        bullet('Landing Page (Diagram List) - diagram catalog management'),
        bullet('Diagram Editor - interactive graphical diagram authoring'),
        bullet('Diagram Viewer - real-time telemetry monitoring display'),

        h2('3.2  Backend Gateway', 'be'),
        para('A Go-language HTTP gateway service that provides:'),
        bullet('REST API for diagram CRUD operations (MongoDB-backed)'),
        bullet('Telemetry mnemonic catalog lookup endpoints'),
        bullet('Telecommand record retrieval endpoints'),
        bullet('Reverse proxying to backend microservices (ingest, limiter, storage, simulator)'),

        h2('3.3  Data Layer', 'dl'),
        para('Diagram data is persisted in MongoDB. The frontend also uses browser localStorage as an offline fallback cache. NATS messaging is used for real-time telemetry data distribution.'),

        h2('3.4  Technology Stack', 'tech'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2600, 6760],
          rows: [
            new TableRow({ tableHeader: true, children: [headerCell('Component', 2600), headerCell('Technology', 6760)] }),
            new TableRow({ children: [dataCell('Frontend Framework', 2600, C.offWhite), dataCell('Vue 3 (Composition API, TypeScript)', 6760)] }),
            new TableRow({ children: [dataCell('Diagram Engine', 2600, C.white), dataCell('AntV X6 (graph/node/edge library)', 6760, C.white)] }),
            new TableRow({ children: [dataCell('Animations', 2600, C.offWhite), dataCell('GSAP (GreenSock Animation Platform)', 6760, C.offWhite)] }),
            new TableRow({ children: [dataCell('Backend', 2600, C.white), dataCell('Go (Chi router)', 6760, C.white)] }),
            new TableRow({ children: [dataCell('Database', 2600, C.offWhite), dataCell('MongoDB', 6760, C.offWhite)] }),
            new TableRow({ children: [dataCell('Telemetry Transport', 2600, C.white), dataCell('NATS (WebSocket bridge)', 6760, C.white)] }),
            new TableRow({ children: [dataCell('Routing', 2600, C.offWhite), dataCell('Vue Router 4 (Hash History)', 6760, C.offWhite)] }),
            new TableRow({ children: [dataCell('Build Tool', 2600, C.white), dataCell('Vite', 6760, C.white)] }),
            new TableRow({ children: [dataCell('Reverse Proxy', 2600, C.offWhite), dataCell('Nginx', 6760, C.offWhite)] }),
          ],
        }),
        pageBreak(),

        // ── 4. USER ROLES ─────────────────────────────────────────────────
        h1('4.  User Roles', 'roles'),
        para('SPASDACS Nova implements four built-in authenticated roles managed by the IAM service, plus one unauthenticated access mode. Authenticated roles are enforced at the API gateway layer via Casbin policy rules (see Section 5.9).'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1800, 1400, 3360, 2800],
          rows: [
            new TableRow({ tableHeader: true, children: [headerCell('Role', 1800), headerCell('IAM Key', 1400), headerCell('Capabilities', 3360), headerCell('Access Scope', 2800)] }),
            new TableRow({ children: [
              dataCell('Direct Viewer (Unauthenticated)', 1800, C.gray),
              dataCell('— (no login)', 1400, C.gray),
              new TableCell({ borders: cellBorders, width: { size: 3360, type: WidthType.DXA }, shading: { fill: C.gray, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [para('Open Diagram Viewer directly (read-only telemetry display)'), para('Run Auto View slideshow'), para([bold('No Telecommanding — TC Queue is hidden and all TC API calls are blocked')])] }),
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: C.gray, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [para('Viewer page (read-only) only. No Editor, no TC, no Library, no User Management, no Audit Log.')] }),
            ] }),
            new TableRow({ children: [
              dataCell('Super Administrator', 1800, C.offWhite),
              dataCell('super_admin', 1400, C.offWhite),
              new TableCell({ borders: cellBorders, width: { size: 3360, type: WidthType.DXA }, shading: { fill: C.white, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [para('Manage IAM roles and Casbin endpoint permissions'), para('Create, modify, and delete roles (non-built-in)'), para('Assign/revoke permissions on any API route')] }),
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: C.offWhite, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [para('IAM administration console only; inherits all admin capabilities')] }),
            ] }),
            new TableRow({ children: [
              dataCell('Administrator', 1800, C.white),
              dataCell('admin', 1400, C.white),
              new TableCell({ borders: cellBorders, width: { size: 3360, type: WidthType.DXA }, shading: { fill: C.offWhite, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [para('Create, edit, export, import, publish, and delete diagrams'), para('Configure telemetry and TC bindings'), para('Manage users: create, deactivate, assign roles'), para('Access Audit Log and Diagram Library administration')] }),
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: C.white, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [para('Full access: Landing Page, Editor, Viewer, User Management, Audit Log, Diagram Library')] }),
            ] }),
            new TableRow({ children: [
              dataCell('Operator', 1800, C.offWhite),
              dataCell('operator', 1400, C.offWhite),
              new TableCell({ borders: cellBorders, width: { size: 3360, type: WidthType.DXA }, shading: { fill: C.white, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [para('View real-time telemetry diagrams'), para('Issue telecommands via the TC Queue'), para('Run Auto View slideshows'), para('Import diagrams from the Diagram Library')] }),
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: C.offWhite, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [para('Landing Page (view/import), Viewer, TC Queue, Diagram Library (browse/import)')] }),
            ] }),
            new TableRow({ children: [
              dataCell('Viewer', 1800, C.white),
              dataCell('viewer', 1400, C.white),
              new TableCell({ borders: cellBorders, width: { size: 3360, type: WidthType.DXA }, shading: { fill: C.offWhite, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [para('View real-time telemetry diagrams (read-only)'), para('Run Auto View slideshows'), para('Browse Diagram Library (no import)')] }),
              new TableCell({ borders: cellBorders, width: { size: 2800, type: WidthType.DXA }, shading: { fill: C.white, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [para('Landing Page (view only), Viewer (read-only). No Editor, TC, or Library import access.')] }),
            ] }),
          ],
        }),

        // ── 5. FUNCTIONAL REQUIREMENTS ────────────────────────────────────
        h1('5.  Functional Requirements', 'fr'),
        para('The following table lists all functional requirements for SPASDACS Nova. Requirements from SPASDACS 1.0 are retained (FR-01 to FR-10) and extended; new Nova requirements are identified with the "NV-" prefix.'),

        // ── 5.1 Landing Page ──────────────────────────────────────────────
        h2('5.1  Landing Page (Diagram Management)', 'fr-landing'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1100, 8260],
          rows: [
            new TableRow({ tableHeader: true, children: [headerCell('Req. ID', 1100), headerCell('Description', 8260)] }),
            new TableRow({ children: [dataCell('NV-01', 1100, C.lightBlue), dataCell('The system shall provide a landing page displaying a catalog of all saved subsystem diagrams as visual cards.', 8260)] }),
            new TableRow({ children: [dataCell('NV-02', 1100, C.white), dataCell('The system shall allow users to create a new blank diagram with an auto-generated unique identifier.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-03', 1100, C.offWhite), dataCell('The system shall allow users to view any saved diagram in the read-only Viewer page directly from the landing page.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-04', 1100, C.white), dataCell('The system shall allow users to edit any saved diagram in the Editor page directly from the landing page.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-05', 1100, C.offWhite), dataCell('The system shall allow users to export any diagram as a JSON file download.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-06', 1100, C.white), dataCell('The system shall allow users to import a diagram from a JSON file, assigning a new unique ID to the imported diagram.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-07', 1100, C.offWhite), dataCell('The system shall allow users to delete a diagram after confirming a time-based password (format: DDMMYYYYHHMM) to prevent accidental deletion.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-08', 1100, C.white), dataCell('The system shall persist diagram data to a MongoDB backend via REST API, with transparent fallback to browser localStorage when the backend is unavailable.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-09', 1100, C.offWhite), dataCell('The landing page title shall display "SPASDACS Nova" with the GSAP glow animation matching the Editor and Viewer pages for visual consistency.', 8260, C.offWhite)] }),
          ],
        }),

        // ── 5.2 Auto View ─────────────────────────────────────────────────
        h2('5.2  Auto View (Automated Slideshow)', 'fr-autoview'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1100, 8260],
          rows: [
            new TableRow({ tableHeader: true, children: [headerCell('Req. ID', 1100), headerCell('Description', 8260)] }),
            new TableRow({ children: [dataCell('NV-10', 1100, C.lightBlue), dataCell('The system shall provide an Auto View feature on the landing page that cycles through selected diagrams in the Viewer page automatically.', 8260)] }),
            new TableRow({ children: [dataCell('NV-11', 1100, C.white), dataCell('The user shall be able to configure a global Auto View display duration (in seconds) that applies to all diagrams without a per-diagram override.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-12', 1100, C.offWhite), dataCell('Each diagram card on the landing page shall have a per-diagram toggle to include or exclude it from the Auto View cycle; all diagrams shall be included by default.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-13', 1100, C.white), dataCell('Each diagram card shall allow configuration of an individual display duration (5-3600 seconds). When set to a non-zero value, it overrides the global duration for that diagram only. When set to zero, the global duration applies.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-14', 1100, C.offWhite), dataCell('Per-diagram Auto View settings (include/exclude flag and duration) shall be persisted to the MongoDB backend via a lightweight PATCH API call (without re-uploading full diagram model data). Browser localStorage shall serve as a fallback cache.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-15', 1100, C.white), dataCell('The Auto View Viewer shall use per-diagram setTimeout scheduling to eliminate blank-screen transitions. Diagram rendering shall complete before the next timer is started.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-16', 1100, C.offWhite), dataCell('Auto View cycling shall advance directly by loading the next diagram\'s data and rendering it into the existing canvas instance (no page reload), then updating the browser URL for navigation history.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-17', 1100, C.white), dataCell('The Viewer page shall provide a Pause/Resume control during Auto View. When paused, the current diagram shall remain displayed indefinitely until resumed.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-18', 1100, C.offWhite), dataCell('Auto View shall gracefully skip diagrams that fail to load (network error, corrupt data) and continue cycling without freezing.', 8260, C.offWhite)] }),
          ],
        }),

        // ── 5.3 Diagram Editor ────────────────────────────────────────────
        h2('5.3  Diagram Editor', 'fr-editor'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1100, 8260],
          rows: [
            new TableRow({ tableHeader: true, children: [headerCell('Req. ID', 1100), headerCell('Description', 8260)] }),
            new TableRow({ children: [dataCell('FR-01', 1100, C.lightBlue), dataCell('The system shall allow users to create subsystem block diagrams using basic shapes: rectangles, circles, ellipses, triangles, diamond, hexagon, parallelogram, cylinder and connecting lines/edges.', 8260)] }),
            new TableRow({ children: [dataCell('FR-02', 1100, C.white), dataCell('The system shall allow users to import custom shapes or images (PNG, JPG, SVG) as diagram nodes via drag-and-drop or file selection.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-19', 1100, C.offWhite), dataCell('The Editor shall be fully browser-based (no installation required), accessible via a standard web browser.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-20', 1100, C.white), dataCell('The Editor shall provide a collapsible left-panel shape palette organised by category (Basic Shapes, Connectors, Annotations).', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-21', 1100, C.offWhite), dataCell('The Editor shall support unlimited undo and redo of all editing operations (Ctrl+Z / Ctrl+Y).', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-22', 1100, C.white), dataCell('The Editor shall provide a toggleable grid overlay to assist in precise element alignment.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-23', 1100, C.offWhite), dataCell('The Editor shall support zoom in/out controls and a fit-to-view function to display the full diagram within the viewport.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-24', 1100, C.white), dataCell('The Editor shall support grouping of multiple selected nodes into a named group, and ungrouping of existing groups.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-25', 1100, C.offWhite), dataCell('Groups shall support collapse (minimise to group header) and expand operations.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-26', 1100, C.white), dataCell('The Editor shall support Z-order operations: Bring to Front, Bring Forward, Send Backward, Send to Back.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-27', 1100, C.offWhite), dataCell('The Editor shall allow configuration of diagram canvas background colour and canvas size (Standard, Wide, Custom).', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-28', 1100, C.white), dataCell('The Editor shall allow pasting of image data directly from the system clipboard (Ctrl+V) as diagram nodes.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-29', 1100, C.offWhite), dataCell('Diagrams shall be saved to the backend via a REST POST API call. Unsaved changes shall be indicated in the toolbar.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-30', 1100, C.white), dataCell('The Editor shall provide a "View" button to open the current diagram in the Viewer page.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-31', 1100, C.offWhite), dataCell('Edge (connector) visual properties shall be configurable: stroke colour, stroke width, and opacity.', 8260, C.offWhite)] }),
          ],
        }),

        // ── 5.4 Telemetry Binding ─────────────────────────────────────────
        h2('5.4  Telemetry Binding Editor', 'fr-binding'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1100, 8260],
          rows: [
            new TableRow({ tableHeader: true, children: [headerCell('Req. ID', 1100), headerCell('Description', 8260)] }),
            new TableRow({ children: [dataCell('FR-03', 1100, C.lightBlue), dataCell('The system shall allow telemetry mnemonic parameters to be associated with diagram elements via an element properties editor.', 8260)] }),
            new TableRow({ children: [dataCell('FR-04', 1100, C.white), dataCell('The system shall update visual attributes (background colour, border colour, text content, visibility, opacity) of diagram elements based on incoming telemetry values and configured rules.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-32', 1100, C.offWhite), dataCell('The Telemetry Binding Editor shall be accessible by double-clicking any node in the Editor page. It shall present a tabbed interface: Simple (guided), Advanced (raw JSON), and Preview.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-33', 1100, C.white), dataCell('The Simple tab shall provide subsystem-filtered mnemonic selection using a searchable dropdown list populated from the gateway mnemonic catalog.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-34', 1100, C.offWhite), dataCell('The Hover Display section shall allow selection of telemetry mnemonics to display in the tooltip when a user hovers over the element in Viewer. Subsystem and mnemonic selection shall use searchable dropdowns consistent with the Simple tab.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-35', 1100, C.white), dataCell('The Telecommands section shall allow one or more TC commands to be associated with a diagram element. Command selection shall use the same searchable subsystem/mnemonic dropdown pattern.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-36', 1100, C.offWhite), dataCell('The binding editor shall support colour rules: defining fill and border colour changes triggered when a mnemonic value equals a specified string or numeric threshold.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-37', 1100, C.white), dataCell('The binding editor shall support visibility rules: showing or hiding an element based on mnemonic value conditions.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-38', 1100, C.offWhite), dataCell('The binding editor shall support discrete state range mapping: mapping numeric mnemonic ranges to human-readable state labels.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-39', 1100, C.white), dataCell('The Advanced tab shall allow direct editing of the element data JSON for fine-grained binding configuration.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-40', 1100, C.offWhite), dataCell('The Preview tab shall display the current serialised binding configuration for review before saving.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-73', 1100, C.white), dataCell('The binding editor shall automatically detect and display the parameter type (Digital/Binary or Analog) for a selected mnemonic by querying the mnemonic catalog metadata. The user shall not be required to manually specify whether a parameter is Digital or Analog.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-74', 1100, C.offWhite), dataCell('When a mnemonic is selected and its type is Digital/Binary, the colour-rule and visibility-rule value fields shall present a dropdown of all valid status strings sourced from the mnemonic\'s range field in the catalog. When the type is Analog, the limit input fields shall be pre-populated with the mnemonic\'s defined limit values as default alert thresholds.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-75', 1100, C.white), dataCell('The Viewer shall subscribe to all configured TM streams by default when a diagram is opened, without requiring the user to select a stream. An optional per-mnemonic TM stream prefix override shall be available in the binding editor for advanced cases where the same mnemonic appears on multiple streams.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-76', 1100, C.offWhite), dataCell('The Simple tab of the Telemetry Binding Editor shall provide a guided step flow: (1) select subsystem, (2) select mnemonic — at which point type, unit, and valid values or limits are auto-populated per NV-73 and NV-74, (3) configure the visual rule with pre-filled defaults. The total number of user interactions required to produce a valid, working binding for a common Digital or Analog parameter shall not exceed four actions from opening the editor to saving.', 8260, C.offWhite)] }),
          ],
        }),

        // ── 5.5 Viewer ────────────────────────────────────────────────────
        h2('5.5  Diagram Viewer', 'fr-viewer'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1100, 8260],
          rows: [
            new TableRow({ tableHeader: true, children: [headerCell('Req. ID', 1100), headerCell('Description', 8260)] }),
            new TableRow({ children: [dataCell('FR-05', 1100, C.lightBlue), dataCell('The system shall display real-time telemetry updates by applying visual rule changes to diagram elements as telemetry values arrive.', 8260)] }),
            new TableRow({ children: [dataCell('FR-06', 1100, C.white), dataCell('The system shall support multiple schematic pages (diagrams), each loadable individually or cycled via Auto View.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('FR-07', 1100, C.offWhite), dataCell('The system shall display telemetry values in a hover tooltip when the user moves the cursor over a bound diagram element.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('FR-08', 1100, C.white), dataCell('The system shall generate visual alerts (element colour change, alert indicator) when telemetry values cross defined limits or match alert conditions.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('FR-09', 1100, C.offWhite), dataCell('The system shall indicate NATS connection status to the user, including heartbeat health, and notify when the telemetry data link is lost.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('FR-10', 1100, C.white), dataCell('The system shall visually indicate subsystem state changes through colour and content updates bound to telemetry parameters.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-41', 1100, C.offWhite), dataCell('The Viewer page shall be read-only; no diagram editing shall be possible from the Viewer.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-42', 1100, C.white), dataCell('The Viewer header bar shall auto-hide when idle and reveal on mouse hover within 6 pixels of the top edge of the viewport.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-43', 1100, C.offWhite), dataCell('The hover tooltip shall support two display modes: Simple (mnemonic/value list) and Dict (structured table with dynamic columns for object-valued mnemonics).', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-44', 1100, C.white), dataCell('The tooltip shall support real-time mnemonic value search/filter within the displayed tooltip.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-45', 1100, C.offWhite), dataCell('The user shall be able to pin any tooltip as a persistent floating panel. Multiple panels may be pinned simultaneously. Pinned panels shall be draggable to any position on the viewport.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-46', 1100, C.white), dataCell('Pinned telemetry panels shall refresh their mnemonic values independently at a configurable interval.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-47', 1100, C.offWhite), dataCell('The Viewer shall connect to a configurable NATS WebSocket server. Connection parameters (server URL, prefix, credentials) shall be editable via a modal settings panel.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-48', 1100, C.white), dataCell('The Viewer shall provide a diagram switcher control in the header to navigate directly to any saved diagram.', 8260, C.white)] }),
          ],
        }),

        // ── 5.6 TC Commanding ─────────────────────────────────────────────
        h2('5.6  Telecommand (TC) Commanding', 'fr-tc'),
        para('These requirements implement the "Direct telecommand capability" identified as a future enhancement in SPASDACS 1.0 (section 8.1).'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1100, 8260],
          rows: [
            new TableRow({ tableHeader: true, children: [headerCell('Req. ID', 1100), headerCell('Description', 8260)] }),
            new TableRow({ children: [dataCell('NV-49', 1100, C.lightBlue), dataCell('The system shall allow telecommand (TC) mnemonics to be bound to diagram elements during editing.', 8260)] }),
            new TableRow({ children: [dataCell('NV-50', 1100, C.white), dataCell('In the Viewer page, double-clicking a diagram element that has bound TC commands shall open a TC Command Selector modal — only when the user is authenticated with operator or admin role. In Direct Viewer mode (unauthenticated), double-click on elements with TC bindings shall have no effect; no TC modal shall appear.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-51', 1100, C.offWhite), dataCell('The TC Command Selector modal shall fetch and display all TC command records bound to the selected element from the gateway endpoint (/telecommand/record).', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-52', 1100, C.white), dataCell('The TC Command Selector shall present commands in a tabular list with: checkbox selection, command name, command type badge, and a Data Part dropdown (populated from available data parts for that command).', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-53', 1100, C.offWhite), dataCell('The user shall be able to select multiple commands simultaneously using individual checkboxes or a Select All control.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-54', 1100, C.white), dataCell('Clicking "Add to TC Queue" in the TC Command Selector shall append the selected commands with their chosen data parts to the TC Command Queue without closing the modal.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-55', 1100, C.offWhite), dataCell('The TC Command Queue shall be a persistent ordered list maintained as a reactive singleton store, visible across the session.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-56', 1100, C.white), dataCell('The Viewer navbar shall display a "TC Queue" button with a live count badge indicating the number of commands currently queued. This button shall be visible only to authenticated users with operator or admin role. In Direct Viewer mode (unauthenticated), the TC Queue button shall not be rendered.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-57', 1100, C.offWhite), dataCell('The TC Command Queue Panel shall allow the user to reorder commands by drag-and-drop or using up/down arrow buttons.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-58', 1100, C.white), dataCell('The TC Command Queue Panel shall allow deletion of individual commands from the queue.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-59', 1100, C.offWhite), dataCell('The TC Command Queue Panel shall provide a "Send Commands" button to dispatch all queued commands in sequence to the backend.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-60', 1100, C.white), dataCell('The TC Command Queue Panel shall provide a "Clear All" button that empties the queue and closes the panel.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-61', 1100, C.offWhite), dataCell('The TC Command Queue Panel shall auto-close when all commands have been individually deleted, leaving an empty queue.', 8260, C.offWhite)] }),
          ],
        }),

        // ── 5.7 Data Persistence ──────────────────────────────────────────
        h2('5.7  Data Persistence and API', 'fr-persist'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1100, 8260],
          rows: [
            new TableRow({ tableHeader: true, children: [headerCell('Req. ID', 1100), headerCell('Description', 8260)] }),
            new TableRow({ children: [dataCell('NV-62', 1100, C.lightBlue), dataCell('The backend gateway shall expose a REST API for diagram management: POST (create/update), GET (list all metadata), GET /{id} (full diagram), PATCH /{id} (partial update), DELETE /{id}.', 8260)] }),
            new TableRow({ children: [dataCell('NV-63', 1100, C.white), dataCell('The PATCH /{id} endpoint shall accept partial diagram fields (e.g., autoViewInclude, autoViewDuration) and update only those fields in MongoDB using $set, without requiring the full modelData to be re-submitted.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-64', 1100, C.offWhite), dataCell('The GET /diagrams endpoint shall return only diagram metadata (id, name, description, timestamps, autoViewInclude, autoViewDuration) without modelData, for efficient landing page loading.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-65', 1100, C.white), dataCell('The frontend DiagramStorage service shall transparently fall back to browser localStorage for all CRUD operations when the backend API is unavailable.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-66', 1100, C.offWhite), dataCell('Auto View per-diagram settings shall be cached in browser localStorage (key: spasdacs_autoview_cache) and merged with backend data on load to provide offline continuity.', 8260, C.offWhite)] }),
          ],
        }),

        // ── 5.8 Mnemonic Catalog ──────────────────────────────────────────
        h2('5.8  Telemetry Mnemonic Catalog', 'fr-mnem'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1100, 8260],
          rows: [
            new TableRow({ tableHeader: true, children: [headerCell('Req. ID', 1100), headerCell('Description', 8260)] }),
            new TableRow({ children: [dataCell('NV-67', 1100, C.lightBlue), dataCell('The system shall fetch the list of available telemetry subsystems from the gateway (/telemetry/subsystems).', 8260)] }),
            new TableRow({ children: [dataCell('NV-68', 1100, C.white), dataCell('The system shall fetch the full list of live telemetry mnemonic keys from the gateway (/tm/mnemonics).', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-69', 1100, C.offWhite), dataCell('The system shall fetch enriched mnemonic catalog metadata (subsystem, unit, type) from the gateway (/mnemonics/tm) and merge with live keys.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-70', 1100, C.white), dataCell('The system shall support subsystem-scoped mnemonic loading (/get/mnemonics/tm/{subsystem}) to reduce payload size when browsing a single subsystem.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-71', 1100, C.offWhite), dataCell('The system shall fetch TC subsystems (/telecommand/subsystems) and TC command lists (/mnemonics/tc/{subsystem} or /mnemonics/tc/all) for use in the binding editor and TC selector.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-72', 1100, C.white), dataCell('All mnemonic catalog fetches shall use Promise.allSettled so that individual endpoint failures do not prevent other data from loading.', 8260, C.white)] }),
          ],
        }),

        // ── 5.9 User Authentication and Access Control ────────────────────
        h2('5.9  User Authentication and Access Control', 'fr-auth'),
        para('These requirements formalise the DRC action item (DRC-08) mandating proper user account administration. The IAM (Identity and Access Management) service is implemented as a dedicated Go microservice with JWT authentication and Casbin RBAC enforcement.'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1100, 8260],
          rows: [
            new TableRow({ tableHeader: true, children: [headerCell('Req. ID', 1100), headerCell('Description', 8260)] }),
            new TableRow({ children: [dataCell('NV-77', 1100, C.lightBlue), dataCell('The Diagram Viewer page shall be accessible without login in a read-only "Direct Viewer" mode. An unauthenticated user may open any diagram URL directly and see live telemetry updates. All other pages (Editor, Landing Page administration, User Management, Audit Log) shall redirect unauthenticated requests to the login page. Unauthenticated API calls to write, delete, or TC endpoints shall receive HTTP 401.', 8260)] }),
            new TableRow({ children: [dataCell('NV-78', 1100, C.white), dataCell('The system shall issue a short-lived JWT access token (15-minute TTL) and a long-lived refresh token (7-day TTL) upon successful login. The access token shall be used as a Bearer token for all subsequent API calls. The refresh token shall be used to obtain a new access token without re-entering credentials.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-79', 1100, C.offWhite), dataCell('The system shall define four built-in roles: super_admin (IAM administration — manages roles and Casbin endpoint permissions), admin (full system access across all services), operator (read/write telemetry and telecommand access), and viewer (read-only telemetry access). Built-in roles shall not be deletable.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-80', 1100, C.white), dataCell('The admin and super_admin accounts shall be system-seeded on first startup and shall not be removable via the user management interface. Their initial passwords shall be configurable via the deployment configuration and shall not be stored in plaintext.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-81', 1100, C.offWhite), dataCell('When a new user account is created through the SPASDACS Nova interface, the account shall be assigned the viewer role by default. The first registered/created user shall NOT be automatically granted administrator or operator privileges — administrator role assignment requires an existing admin-level user. Note: the unauthenticated "Direct Viewer" mode (NV-77) is a separate access path and is not a user account; it has no session, no TC access, and no profile.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-82', 1100, C.white), dataCell('Only a user with the admin role or higher shall be able to assign, modify, or revoke roles for other user accounts. A user with operator or viewer role shall not be able to elevate their own or any other account\'s role.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-83', 1100, C.offWhite), dataCell('The super_admin role shall have exclusive authority to create, update, and delete custom roles, and to assign or remove Casbin endpoint-level permissions from any role. Built-in role permissions shall not be modifiable except by super_admin.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-84', 1100, C.white), dataCell('The system shall provide a User Management page accessible only to users with the admin role or higher. This page shall list all registered users with their roles and active/inactive status, and shall support creating users, deactivating accounts, and assigning roles.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-85', 1100, C.offWhite), dataCell('The system shall enforce role-based access control on all backend API endpoints via Casbin policy rules. The operator role shall have read/write access to telemetry and telecommand endpoints. The viewer role shall have read-only access. All diagram editing, user management, audit, and configuration endpoints shall be restricted to admin or super_admin.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-86', 1100, C.white), dataCell('The system shall provide a user profile page where any authenticated user can view their own profile (username, email, full name, assigned roles) and change their own password. Password change shall require confirmation of the current password.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-87', 1100, C.offWhite), dataCell('The system shall provide a logout function that revokes the user\'s refresh token server-side. Subsequent API calls using the revoked refresh token shall be rejected with HTTP 401. All active refresh tokens for a user shall be revoked on password change.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-88', 1100, C.white), dataCell('The frontend shall store the JWT access token in memory (not in localStorage or sessionStorage) to reduce XSS exposure. The refresh token shall be stored in an httpOnly, SameSite=Strict cookie.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-89', 1100, C.offWhite), dataCell('Page-level access control shall be enforced as follows: (1) Diagram Viewer — accessible without login (Direct Viewer mode, read-only, TC hidden); (2) TC Commanding workflow (NV-49..NV-61) — requires authenticated operator or admin role; if unauthenticated, the TC Queue button and double-click TC trigger shall not appear; (3) Diagram Editor and Telemetry Binding Editor — require admin or operator role; (4) Landing Page diagram management (create, delete, edit) — requires authenticated session; (5) User Management and Audit Log pages — require admin or super_admin role.', 8260, C.offWhite)] }),
          ],
        }),

        // ── 5.10 Audit Trail ──────────────────────────────────────────────
        h2('5.10  Audit Trail', 'fr-audit'),
        para('These requirements implement the DRC action item (DRC-09) mandating a logging feature for all changes to spacecraft element visual attributes.'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1100, 8260],
          rows: [
            new TableRow({ tableHeader: true, children: [headerCell('Req. ID', 1100), headerCell('Description', 8260)] }),
            new TableRow({ children: [dataCell('NV-90', 1100, C.lightBlue), dataCell('The system shall maintain an audit log of all changes made to spacecraft element visual attribute bindings. Each audit record shall capture: the authenticated user, the UTC timestamp, the diagram ID and element ID, the attribute name changed (e.g., colour rule, bound mnemonic), the previous value, and the new value.', 8260)] }),
            new TableRow({ children: [dataCell('NV-91', 1100, C.white), dataCell('Audit records shall be stored in a dedicated MongoDB collection (spasdacs_audit) and shall be immutable. No API endpoint shall permit update or deletion of individual audit records.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-92', 1100, C.offWhite), dataCell('The system shall create an audit record when any of the following binding editor save actions occur: adding, modifying, or removing a mnemonic binding; adding, modifying, or removing a colour rule; adding, modifying, or removing a visibility rule; adding, modifying, or removing a hover-display mnemonic; and adding, modifying, or removing a TC command association on an element.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-93', 1100, C.white), dataCell('The system shall provide an Audit Log page accessible to users with the admin role or higher. The page shall display records in reverse chronological order and shall support filtering by: diagram ID, element ID, user, and UTC date range.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-94', 1100, C.offWhite), dataCell('The audit log display shall show at minimum: timestamp, username, diagram name, element identifier, attribute changed, previous value, and new value. Values shall be rendered in a human-readable format rather than raw JSON where possible.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-95', 1100, C.white), dataCell('The backend gateway shall expose a read-only REST endpoint (GET /audit/spasdacs) returning paginated audit records, accepting query parameters for filtering by diagramId, userId, from (ISO date), and to (ISO date). This endpoint shall be accessible only to admin and super_admin roles.', 8260, C.white)] }),
          ],
        }),

        // ── 5.11 Diagram Library ──────────────────────────────────────────
        h2('5.11  Diagram Library and Cross-Project Import', 'fr-library'),
        para('These requirements implement the DRC action item (DRC-11) mandating a formal central repository mechanism for diagrams, replacing the informal file-copy workaround noted in the DRC closeout.'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1100, 8260],
          rows: [
            new TableRow({ tableHeader: true, children: [headerCell('Req. ID', 1100), headerCell('Description', 8260)] }),
            new TableRow({ children: [dataCell('NV-96', 1100, C.lightBlue), dataCell('The system shall provide a central Diagram Library — a curated repository of diagrams tagged with one or more project labels (e.g., spacecraft mission name). The Diagram Library shall be distinct from a user\'s personal working catalog and shall serve as a shared resource across users and projects.', 8260)] }),
            new TableRow({ children: [dataCell('NV-97', 1100, C.white), dataCell('A user with the admin role shall be able to publish any diagram from a working catalog to the Diagram Library, associating it with a project label and optional description. The published copy shall include the full diagram model and binding data.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-98', 1100, C.offWhite), dataCell('Any authenticated user shall be able to browse the Diagram Library filtered by project label and import any library diagram into their working catalog. The import operation shall create a new independent copy with a new unique ID; the library source diagram shall remain unchanged.', 8260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NV-99', 1100, C.white), dataCell('The Diagram Library shall be stored in a dedicated MongoDB collection (spasdacs_library). The backend gateway shall expose: GET /library/diagrams?project= (list by project), POST /library/diagrams (publish to library — admin only), and a POST /diagrams action to copy a library diagram into the user\'s working catalog.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-100', 1100, C.offWhite), dataCell('The landing page shall include a "Browse Library" button that opens a modal displaying the Diagram Library with project filter tabs and a per-diagram Import action. On import, the new diagram card shall appear immediately in the user\'s working catalog without a page reload.', 8260, C.offWhite)] }),
          ],
        }),

        // ── 5.12 ACSS / UMACS Interface Automation ────────────────────────
        h2('5.12  ACSS / UMACS Interface Automation', 'fr-acss'),
        para([
          sp('These requirements implement the DRC action item (DRC-02) to automate the SPASDACS interface with ACSS instead of requiring manual parameter entry. '),
          sp('Note:', { bold: true, color: C.blue }),
          sp(' Full implementation of NV-101 and NV-102 is contingent on finalisation of the UMACS database schema and interfaces. Until that prerequisite is met, the system shall operate using configuration-file-defined parameters per NV-103.'),
        ]),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1100, 8260],
          rows: [
            new TableRow({ tableHeader: true, children: [headerCell('Req. ID', 1100), headerCell('Description', 8260)] }),
            new TableRow({ children: [dataCell('NV-101', 1100, C.lightBlue), dataCell('[Deferred — pending UMACS schema] The system shall automate the interface with ACSS by reading all required UMACS connection parameters (TC IP, TC port, data server IP, API request source, priority, execution mode, and subsystem) directly from the UMACS database schema via the backend configuration layer. Users shall not be required to manually enter these parameters during normal operation.', 8260)] }),
            new TableRow({ children: [dataCell('NV-102', 1100, C.white), dataCell('[Deferred — pending UMACS schema] The backend gateway shall expose a read-only endpoint (GET /umacs/config) returning the current UMACS environment configuration as populated from the UMACS database. The Viewer settings modal shall display this configuration in a read-only status panel so operators can verify active ACSS connection parameters without consulting external tools.', 8260, C.white)] }),
            new TableRow({ children: [dataCell('NV-103', 1100, C.offWhite), dataCell('If the UMACS database is unavailable at system startup, all UMACS parameters shall fall back to the values defined in the deployment configuration file. The Viewer settings modal shall clearly indicate whether parameters are sourced from the live UMACS database or from the configuration-file fallback.', 8260, C.offWhite)] }),
          ],
        }),
        pageBreak(),

        // ── 6. USER WORKFLOW ──────────────────────────────────────────────
        h1('6.  User Workflow', 'workflow'),

        h2('6.1  Diagram Authoring Workflow', 'wf-author'),
        numbered('User opens a browser and navigates to the SPASDACS Nova URL. The system checks for an active session; if not authenticated, the user is redirected to the login page.'),
        numbered('User enters their username and password. On success, the system issues a JWT access token (stored in memory) and stores a refresh token in an httpOnly cookie. The user is redirected to the landing page.'),
        numbered('User clicks "Create diagram" to open a new blank diagram in the Editor.'),
        numbered('User adds shapes from the shape palette by clicking or drag-and-drop onto the canvas.'),
        numbered('User connects elements using edge connectors. Edge colour, width, and opacity are configured in the properties panel.'),
        numbered('User double-clicks an element to open the Telemetry Binding Editor.'),
        numbered('In the Simple tab, user selects a subsystem from the dropdown, then selects a telemetry mnemonic for the element label or tooltip.'),
        numbered('User configures colour rules and/or visibility rules based on expected mnemonic values.'),
        numbered('User adds hover display mnemonics and binds TC commands in the respective binding editor sections.'),
        numbered('User clicks Save to persist the diagram to the MongoDB backend.'),
        numbered('User clicks View to open the diagram in the Viewer.'),

        h2('6.2  Real-time Monitoring Workflow (Authenticated)', 'wf-monitor'),
        numbered('Authenticated user (any role) opens a diagram from the landing page or navigates to a diagram URL directly in the Viewer page.'),
        numbered('The Viewer connects to the configured NATS WebSocket server.'),
        numbered('Incoming telemetry messages update element colours, text, and visibility per bound rules.'),
        numbered('User hovers over an element to see a tooltip with live mnemonic values.'),
        numbered('User optionally pins the tooltip as a draggable persistent panel.'),
        numbered('On alert condition, the affected element changes colour to the configured alert colour.'),
        numbered('NATS connection status and heartbeat are shown in the header bar.'),
        numbered('If the user has operator or admin role, the TC Queue button is visible in the header for TC access.'),

        h2('6.3  Direct Viewer Workflow (Without Login)', 'wf-directview'),
        para([sp('This workflow applies to unauthenticated access — no login required. This mode is intentionally provided for operations room displays and shared monitoring screens.', { italics: true })]),
        numbered('User navigates directly to a diagram Viewer URL (e.g., /viewer/{diagramId}) without logging in.'),
        numbered('The system renders the Viewer page in Direct Viewer mode — read-only, no authentication gate.'),
        numbered('The Viewer connects to the configured NATS WebSocket server and displays live telemetry updates.'),
        numbered('Hover tooltips, pinned panels, and Auto View slideshow are fully functional.'),
        numbered([bold('TC Queue button is not shown'), sp(' — no telecommand capability is available in Direct Viewer mode.')]),
        numbered([bold('Editor access is not available'), sp(' — navigating to the Editor URL redirects to the login page.')]),
        numbered('The NATS connection settings modal is accessible in read-only mode to show the current server configuration.'),

        h2('6.4  Telecommanding Workflow (Operator / Admin only)', 'wf-tc'),
        numbered([sp('Authenticated user ('), bold('operator or admin role required'), sp(') opens a diagram in the Viewer page. If the user is not logged in, they are redirected to the login page — TC is not available in Direct Viewer mode.')]),
        numbered('User double-clicks a diagram element that has bound TC commands. The TC Command Selector modal opens (only visible to operator/admin).'),
        numbered('The TC Command Selector modal opens, fetching command records from the gateway.'),
        numbered('User reviews available commands, selects Data Parts from dropdowns, and checks desired commands.'),
        numbered('User clicks "Add to TC Queue" — selected commands are appended to the TC Queue.'),
        numbered('User repeats from other elements as needed; the TC Queue count badge updates in real time.'),
        numbered('User clicks the TC Queue button in the navbar to open the Queue Panel.'),
        numbered('User reorders commands via drag-and-drop or arrow buttons.'),
        numbered('User clicks "Send Commands" to dispatch the queue to the backend in sequence.'),

        h2('6.5  Auto View Workflow', 'wf-autoview'),
        numbered('On the landing page, the user configures per-diagram Auto View participation and duration for each diagram card.'),
        numbered('Settings are automatically saved to MongoDB via PATCH after an 800 ms debounce.'),
        numbered('User sets the global fallback duration and clicks "Start Auto View".'),
        numbered('The Viewer page opens on the first included diagram.'),
        numbered('After the configured duration, the next included diagram is loaded directly into the canvas (no page reload).'),
        numbered('The browser URL is updated to reflect the current diagram for bookmarking.'),
        numbered('User may pause/resume the slideshow using the Pause button in the Viewer header.'),

        h2('6.6  User Administration Workflow (Admin only)', 'wf-admin'),
        numbered('Administrator navigates to the User Management page (accessible from the main navigation for admin/super_admin roles only).'),
        numbered('Administrator creates a new user account by entering username, email, full name, and initial password. The account is assigned the viewer role by default.'),
        numbered('Administrator assigns the appropriate role (operator, admin) to the new user as required.'),
        numbered('To deactivate a user, the administrator sets the account to inactive. The deactivated user\'s refresh tokens are immediately revoked.'),
        numbered('Super Administrator may create or modify custom roles and assign or remove Casbin endpoint permissions from the IAM administration console.'),

        h2('6.7  Diagram Library Workflow', 'wf-library'),
        numbered('Administrator opens a diagram in the working catalog and clicks "Publish to Library".'),
        numbered('Administrator selects a project label (e.g., "RISAT-1A Checkout") and optionally enters a description, then confirms.'),
        numbered('The diagram is copied to the Diagram Library collection. The original in the working catalog is unchanged.'),
        numbered('A user (operator or above) clicks "Browse Library" on the landing page.'),
        numbered('User filters by project label, locates the desired diagram, and clicks Import.'),
        numbered('A new independent copy of the diagram appears in the user\'s working catalog, ready for use.'),
        pageBreak(),

        // ── 7. GUI OVERVIEW ───────────────────────────────────────────────
        h1('7.  Graphical User Interface Overview', 'gui'),

        h2('7.1  Landing Page', 'gui-landing'),
        para('The landing page consists of:'),
        bullet('Top navigation bar with SPASDACS Nova brand title (GSAP glow animation), action buttons (Import, Create, Browse Library), user avatar/logout control'),
        bullet('Diagram card grid — each card shows: diagram name, description, auto-view settings (include toggle, duration input, save indicator), and action buttons (View, Edit, Export, Delete)'),
        bullet('Auto View control bar — global duration input, Start Auto View button, diagram inclusion summary'),
        bullet('Browse Library modal — project filter tabs, diagram cards with import action'),
        bullet('Empty state illustration when no diagrams exist'),

        h2('7.2  Editor Page', 'gui-editor'),
        para('The Editor page consists of:'),
        bullet('Top bar: SPASDACS Nova title with GSAP animation, undo/redo/fit/grid toolbar, Z-order toolbar, group/ungroup controls, zoom controls, View button, Save button'),
        bullet('Left panel: collapsible shape palette with basic shapes and connector types'),
        bullet('Central canvas: AntV X6 interactive diagram canvas with grid overlay'),
        bullet('Right panel: node/edge property editor with background colour, canvas size, and element text configuration'),
        bullet('Telemetry Binding Editor: modal dialog opened by double-clicking a node — tabbed interface (Simple, Advanced, Preview)'),

        h2('7.3  Viewer Page', 'gui-viewer'),
        para([sp('The Viewer page is accessible '), bold('with or without login'), sp('. Components marked [Auth] are visible only to authenticated users with operator/admin role; components marked [Admin] require admin/super_admin role.')]),
        para('The Viewer page consists of:'),
        bullet('Auto-hiding top header: SPASDACS Nova title, diagram selector dropdown, NATS status indicator, Fit button, Back button, Auto View pause/resume button'),
        bullet('[Auth — operator/admin] TC Queue button with live count badge'),
        bullet('[Auth — any role] Edit button (navigates to Editor page; hidden in Direct Viewer mode)'),
        bullet('Full-screen diagram canvas: AntV X6 read-only display with live telemetry updates'),
        bullet('Hover tooltip: floating panel showing mnemonic values for the hovered element; supports Simple and Dict display modes, search filter, and pin-to-viewport'),
        bullet('Pinned panels: draggable persistent telemetry display panels positioned freely on the viewport'),
        bullet('[Auth — operator/admin] TC Command Selector modal: table-based command selector with checkbox, command name, type badge, and Data Part dropdown'),
        bullet('[Auth — operator/admin] TC Command Queue panel: ordered command list with drag-reorder, delete, Send, and Clear All controls'),
        bullet('NATS configuration modal: server URL, prefix, username, and password fields; UMACS/ACSS parameter status panel (per NV-102/NV-103)'),
        pageBreak(),

        h2('7.4  Authentication Pages', 'gui-auth'),
        para('Authentication-related pages consist of:'),
        bullet('Login page: username and password fields, login button, "Forgot password" placeholder — presented to unauthenticated users before accessing any page'),
        bullet('User profile page: read-only display of username, email, full name, and roles; password change form (current password + new password + confirmation)'),

        h2('7.5  User Management Page', 'gui-usermgmt'),
        para('Available to admin and super_admin roles. Consists of:'),
        bullet('User list table: username, email, full name, roles, active/inactive status, created date, and action buttons (Edit Role, Deactivate/Activate)'),
        bullet('Create User form modal: username, email, full name, initial password, role assignment dropdown'),
        bullet('Role assignment dropdown for each user row'),

        h2('7.6  Audit Log Page', 'gui-audit'),
        para('Available to admin and super_admin roles. Consists of:'),
        bullet('Filter bar: diagram ID text input, element ID text input, username dropdown, date-range picker (from/to), Apply Filters button'),
        bullet('Audit record table: timestamp, user, diagram name, element ID, attribute changed, previous value, new value — sorted newest first'),
        bullet('Pagination controls for navigating large result sets'),

        // ── 8. NON-FUNCTIONAL ─────────────────────────────────────────────
        h1('8.  Non-Functional Requirements', 'nfr'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1100, 2000, 6260],
          rows: [
            new TableRow({ tableHeader: true, children: [headerCell('Req. ID', 1100), headerCell('Category', 2000), headerCell('Description', 6260)] }),
            new TableRow({ children: [dataCell('NF-01', 1100, C.lightBlue), dataCell('Availability', 2000, C.lightBlue), dataCell('The system shall operate fully in a browser without requiring any client-side software installation.', 6260, C.lightBlue)] }),
            new TableRow({ children: [dataCell('NF-02', 1100, C.white), dataCell('Performance', 2000, C.white), dataCell('The Viewer page shall apply telemetry-driven visual updates within 200 ms of receiving a NATS message.', 6260, C.white)] }),
            new TableRow({ children: [dataCell('NF-03', 1100, C.offWhite), dataCell('Resilience', 2000, C.offWhite), dataCell('The system shall continue to display and interact with diagrams from localStorage when the MongoDB backend is unreachable.', 6260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NF-04', 1100, C.white), dataCell('Scalability', 2000, C.white), dataCell('The mnemonic catalog shall handle a minimum of 3000 live telemetry keys without UI degradation.', 6260, C.white)] }),
            new TableRow({ children: [dataCell('NF-05', 1100, C.offWhite), dataCell('Compatibility', 2000, C.offWhite), dataCell('The application shall be compatible with modern Chromium-based browsers (Chrome, Edge) and Firefox, latest two major versions.', 6260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NF-06', 1100, C.white), dataCell('Usability', 2000, C.white), dataCell('The interface shall provide clear visual feedback for all asynchronous operations (loading spinners, save indicators, error messages).', 6260, C.white)] }),
            new TableRow({ children: [dataCell('NF-07', 1100, C.offWhite), dataCell('Security', 2000, C.offWhite), dataCell('Diagram deletion shall require time-based password confirmation (format: DDMMYYYYHHMM) to prevent accidental data loss.', 6260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NF-08', 1100, C.white), dataCell('Security', 2000, C.white), dataCell('All write, update, and delete API endpoints shall require an authenticated session with appropriate role. The system shall return HTTP 401 for missing or expired tokens and HTTP 403 for insufficient role. Role enforcement shall be applied at the API gateway layer via Casbin, not solely at the frontend.', 6260, C.white)] }),
            new TableRow({ children: [dataCell('NF-09', 1100, C.offWhite), dataCell('Auditability', 2000, C.offWhite), dataCell('All visual attribute binding configuration changes shall be logged with the authenticated user\'s identity and a UTC timestamp. Audit records shall be immutable and retained for a minimum of 12 months or until an administrator explicitly archives them.', 6260, C.offWhite)] }),
            new TableRow({ children: [dataCell('NF-10', 1100, C.white), dataCell('Traceability', 2000, C.white), dataCell('All requirements in this document originating from DRC closeout actions (DRC-02, DRC-03, DRC-04, DRC-07, DRC-08, DRC-09, DRC-11, DRC-13.1) shall be traceable to their source action item via the Req. ID prefix NV-73 onwards. The version 2.0 change history record documents this traceability.', 6260, C.white)] }),
          ],
        }),
        pageBreak(),

        // ── 9. FUTURE ENHANCEMENTS ────────────────────────────────────────
        h1('9.  Future Enhancements', 'future'),
        para([
          sp('The following capabilities are identified for future versions of SPASDACS Nova. '),
          sp('Note:', { bold: true, color: C.blue }),
          sp(' Role-based access control (previously listed here) has been promoted to mandatory requirements NV-77 through NV-89 in Section 5.9 per DRC-08. ACSS/UMACS integration has been partially formalized as NV-101..NV-103 (Section 5.12), pending UMACS database schema finalization. Note that unauthenticated (direct) Viewer access is supported in v2.0 — see NV-77 and NV-89.'),
        ]),
        bullet('Advanced telemetry analytics: trend charts, historical playback, and statistical analysis overlays on diagram elements'),
        bullet('Custom subsystem component libraries: reusable shape/template collections specific to spacecraft subsystems (AOCS, Power, Thermal, RF)'),
        bullet('Multi-user collaborative editing: concurrent diagram authoring with real-time conflict resolution'),
        bullet('TC command acknowledgement feedback: real-time status update in the TC Queue panel after command dispatch, with execution status returned from the spacecraft interface'),
        bullet('Export to PDF/PNG: one-click export of the current viewer canvas with live telemetry state captured'),
        bullet('Alarm sound notification: configurable audio alerts triggered when telemetry limit conditions are reached (DRC-08 noted audio; visual alerts already implemented in FR-08)'),
        bullet('Remote web-based monitoring dashboards: embeddable read-only viewer widget for integration into operations control room displays'),
        bullet('Diagram version history: ability to view a timeline of saved versions and roll back to a prior version of a diagram'),
        bullet('ACSS full automated import (NV-101/NV-102): complete automation of SPASDACS interface with ACSS once the UMACS database schema and interfaces are finalised'),
        bullet('Telemetry parameter validation at bind time: cross-validate mnemonic names against the live UMACS catalog at the moment of binding to prevent invalid mnemonic associations (DRC-13.2)'),

        // ── 10. GLOSSARY ──────────────────────────────────────────────────
        h1('10. Glossary', 'glossary'),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2200, 7160],
          rows: [
            new TableRow({ tableHeader: true, children: [headerCell('Term', 2200), headerCell('Definition', 7160)] }),
            new TableRow({ children: [dataCell('SPASDACS', 2200, C.offWhite), dataCell('SPAcecraft Status Display And Commanding Software', 7160, C.offWhite)] }),
            new TableRow({ children: [dataCell('Nova', 2200, C.white), dataCell('Version 2.0 of SPASDACS; a complete redesign as a browser-based SPA', 7160, C.white)] }),
            new TableRow({ children: [dataCell('SPA', 2200, C.offWhite), dataCell('Single-Page Application — a web application architecture where page content is dynamically updated without full page reloads', 7160, C.offWhite)] }),
            new TableRow({ children: [dataCell('NATS', 2200, C.white), dataCell('A lightweight open-source messaging system used for real-time telemetry data distribution', 7160, C.white)] }),
            new TableRow({ children: [dataCell('Mnemonic', 2200, C.offWhite), dataCell('A short identifier for a telemetry or telecommand parameter (e.g., SC_BATT_VOLT)', 7160, C.offWhite)] }),
            new TableRow({ children: [dataCell('TM', 2200, C.white), dataCell('Telemetry — data received from the spacecraft', 7160, C.white)] }),
            new TableRow({ children: [dataCell('TC', 2200, C.offWhite), dataCell('Telecommand — command transmitted to the spacecraft', 7160, C.offWhite)] }),
            new TableRow({ children: [dataCell('AntV X6', 2200, C.white), dataCell('An open-source graph visualisation library used for the interactive diagram canvas', 7160, C.white)] }),
            new TableRow({ children: [dataCell('GSAP', 2200, C.offWhite), dataCell('GreenSock Animation Platform — used for title entrance and glow animations', 7160, C.offWhite)] }),
            new TableRow({ children: [dataCell('PATCH', 2200, C.white), dataCell('HTTP method for partial resource updates; used to save Auto View settings without re-uploading full diagram model data', 7160, C.white)] }),
            new TableRow({ children: [dataCell('Auto View', 2200, C.offWhite), dataCell('Automated diagram slideshow feature that cycles through selected diagrams at configured intervals', 7160, C.offWhite)] }),
            new TableRow({ children: [dataCell('TC Queue', 2200, C.white), dataCell('An ordered in-session list of telecommands staged for sequential dispatch to the spacecraft', 7160, C.white)] }),
            new TableRow({ children: [dataCell('Data Part', 2200, C.offWhite), dataCell('A specific variant or parameter value associated with a telecommand', 7160, C.offWhite)] }),
            new TableRow({ children: [dataCell('ISRO', 2200, C.white), dataCell('Indian Space Research Organisation', 7160, C.white)] }),
            new TableRow({ children: [dataCell('URSC', 2200, C.offWhite), dataCell('UR Rao Satellite Centre', 7160, C.offWhite)] }),
            new TableRow({ children: [dataCell('IAM', 2200, C.white), dataCell('Identity and Access Management — the Go microservice responsible for user authentication (JWT), user/role management, and Casbin-based RBAC policy enforcement in SPASDACS Nova', 7160, C.white)] }),
            new TableRow({ children: [dataCell('JWT', 2200, C.offWhite), dataCell('JSON Web Token — a compact, signed token used to authenticate API calls after login. Access tokens have a 15-minute TTL; refresh tokens have a 7-day TTL.', 7160, C.offWhite)] }),
            new TableRow({ children: [dataCell('RBAC', 2200, C.white), dataCell('Role-Based Access Control — a security model in which API endpoint permissions are granted to roles rather than individual users. Enforced in SPASDACS Nova via the Casbin policy engine.', 7160, C.white)] }),
            new TableRow({ children: [dataCell('Casbin', 2200, C.offWhite), dataCell('An open-source authorisation library that enforces RBAC and ABAC policies at the API gateway level. Stores policy rules in MongoDB collection iam.casbin_rules.', 7160, C.offWhite)] }),
            new TableRow({ children: [dataCell('Audit Log', 2200, C.white), dataCell('An immutable record of all changes to diagram element visual attribute bindings, stored in the spasdacs_audit MongoDB collection', 7160, C.white)] }),
            new TableRow({ children: [dataCell('Diagram Library', 2200, C.offWhite), dataCell('The central shared repository of published diagrams tagged with project labels, stored in the spasdacs_library MongoDB collection, accessible for cross-project import', 7160, C.offWhite)] }),
            new TableRow({ children: [dataCell('ACSS', 2200, C.white), dataCell('Auto Checkout Support Software — the external system providing spacecraft telecommand and parameter interfaces. SPASDACS Nova interfaces with ACSS via UMACS connection parameters.', 7160, C.white)] }),
            new TableRow({ children: [dataCell('UMACS', 2200, C.offWhite), dataCell('Unified Monitoring and Control Software — the system whose database schema defines TC IP, port, data server, source, priority, execution mode, and subsystem configuration parameters consumed by SPASDACS Nova. ACSS/UMACS integration in SPASDACS Nova is pending UMACS database schema finalisation.', 7160, C.offWhite)] }),
            new TableRow({ children: [dataCell('DRC', 2200, C.white), dataCell('Design Review Committee — the ISRO/URSC review body whose SPASDACS 1.0 closeout document (SCG-GRCD2-SW-2021-02-1, dated 09-11-2021) generated the action items formalised as requirements NV-73 through NV-103 in this document', 7160, C.white)] }),
          ],
        }),
        para('', { spacing: { after: 200 } }),
        sectionDivider(),
        para([sp('End of Document — SPASDACS Nova Functional Requirements Document v2.0', { color: C.darkGray, italics: true, size: 20 })], { alignment: AlignmentType.CENTER }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then(buf => {
  const outPath = 'E:\\Code\\Mainframe\\MainframeAutomation\\SpasdacsOpensource\\Documentation\\Nova\\Functional Requirements Document-SPASDACS Nova.docx';
  fs.writeFileSync(outPath, buf);
  console.log('Written:', outPath);
});
