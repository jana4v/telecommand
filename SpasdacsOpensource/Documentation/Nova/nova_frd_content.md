**FUNCTIONAL REQUIREMENTS DOCUMENT**

SPAcecraft Status Display And Commanding Software

***SPASDACS Nova***

  -----------------------------------------------------------------------
  **Document No.**      SCG-GRCD2-SW-2025-02
  --------------------- -------------------------------------------------
  **Version**           2.0

  **Date**              March 2026

  **Prepared by**       GEOSAT RF & Payload Checkout Division-2

  **Organisation**      Spacecraft Checkout Group, UR RAO Satellite
                        Centre, ISRO, Bangalore

  **Supersedes**        SCG-GRCD2-SW-2021-01 (SPASDACS 1.0 FRD)
  -----------------------------------------------------------------------

**UR RAO SATELLITE CENTRE**

INDIAN SPACE RESEARCH ORGANISATION

BANGALORE

# Change History

  ------------------------------------------------------------------------------
   **Version**  **Date**     **Affected       **Change    **Description**
                             Section**        Type**      
  ------------- ------------ ---------------- ----------- ----------------------
       1.0      02/08/2021   All              New         Initial release -
                                                          SPASDACS 1.0

       2.0      March 2026   All sections     Major       SPASDACS Nova -
                                              Addition    complete redesign as
                                                          browser-based SPA with
                                                          NATS telemetry, TC
                                                          commanding, and
                                                          MongoDB persistence
  ------------------------------------------------------------------------------

# Table of Contents

[Change History [2](#change-history)](#change-history)

[Table of Contents [3](#table-of-contents)](#table-of-contents)

[1. Introduction [4](#introduction)](#introduction)

[2. Scope [4](#scope)](#scope)

[3. System Overview [4](#system-overview)](#system-overview)

[3.1 Frontend (SPA) [4](#frontend-spa)](#frontend-spa)

[3.2 Backend Gateway [4](#backend-gateway)](#backend-gateway)

[3.3 Data Layer [5](#data-layer)](#data-layer)

[3.4 Technology Stack [5](#technology-stack)](#technology-stack)

[4. User Roles [6](#user-roles)](#user-roles)

[5. Functional Requirements
[6](#functional-requirements)](#functional-requirements)

[5.1 Landing Page (Diagram Management)
[6](#landing-page-diagram-management)](#landing-page-diagram-management)

[5.2 Auto View (Automated Slideshow)
[7](#auto-view-automated-slideshow)](#auto-view-automated-slideshow)

[5.3 Diagram Editor [7](#diagram-editor)](#diagram-editor)

[5.4 Telemetry Binding Editor
[8](#telemetry-binding-editor)](#telemetry-binding-editor)

[5.5 Diagram Viewer [9](#diagram-viewer)](#diagram-viewer)

[5.6 Telecommand (TC) Commanding
[10](#telecommand-tc-commanding)](#telecommand-tc-commanding)

[5.7 Data Persistence and API
[11](#data-persistence-and-api)](#data-persistence-and-api)

[5.8 Telemetry Mnemonic Catalog
[11](#telemetry-mnemonic-catalog)](#telemetry-mnemonic-catalog)

[6. User Workflow [12](#user-workflow)](#user-workflow)

[6.1 Diagram Authoring Workflow
[12](#diagram-authoring-workflow)](#diagram-authoring-workflow)

[6.2 Real-time Monitoring Workflow
[12](#real-time-monitoring-workflow)](#real-time-monitoring-workflow)

[6.3 Telecommanding Workflow
[12](#telecommanding-workflow)](#telecommanding-workflow)

[6.4 Auto View Workflow [12](#auto-view-workflow)](#auto-view-workflow)

[7. Graphical User Interface Overview
[14](#graphical-user-interface-overview)](#graphical-user-interface-overview)

[7.1 Landing Page [14](#landing-page)](#landing-page)

[7.2 Editor Page [14](#editor-page)](#editor-page)

[7.3 Viewer Page [14](#viewer-page)](#viewer-page)

[8. Non-Functional Requirements
[15](#non-functional-requirements)](#non-functional-requirements)

[9. Future Enhancements
[16](#future-enhancements)](#future-enhancements)

[10. Glossary [16](#glossary)](#glossary)

# 1. Introduction

This document describes the functional requirements of SPASDACS Nova
(version 2.0), the SPAcecraft Status Display And Commanding Software.
SPASDACS Nova is a complete redesign and enhancement of SPASDACS 1.0,
evolving from a desktop-installed tool into a fully browser-based,
real-time spacecraft monitoring and commanding application.

SPASDACS Nova introduces a modern single-page application (SPA)
architecture powered by Vue 3, an AntV X6 graphical diagram engine,
NATS-based live telemetry streaming, MongoDB-backed diagram persistence,
and an integrated telecommand execution workflow.

This document supersedes the SPASDACS 1.0 Functional Requirements
Document (SCG-GRCD2-SW-2021-01).

# 2. Scope

SPASDACS Nova enables spacecraft engineers and operators to:

- Design interactive subsystem block diagrams using a browser-based
  graphical editor

- Bind telemetry mnemonics and visual rules to diagram elements

- Monitor live spacecraft telemetry via NATS subscriptions in a
  read-only viewer

- Issue telecommands through a structured command queue workflow

- Manage multiple diagram pages with automated slideshow (Auto View)
  capability

- Persist all diagram data and settings in a MongoDB backend, with
  offline localStorage fallback

The software is intended for use during spacecraft integration,
checkout, and operations phases.

# 3. System Overview

SPASDACS Nova is a three-tier web application:

## 3.1 Frontend (SPA)

A Vue 3 single-page application served through a web browser. It
comprises three primary pages and several reusable components:

- Landing Page (Diagram List) - diagram catalog management

- Diagram Editor - interactive graphical diagram authoring

- Diagram Viewer - real-time telemetry monitoring display

## 3.2 Backend Gateway

A Go-language HTTP gateway service that provides:

- REST API for diagram CRUD operations (MongoDB-backed)

- Telemetry mnemonic catalog lookup endpoints

- Telecommand record retrieval endpoints

- Reverse proxying to backend microservices (ingest, limiter, storage,
  simulator)

## 3.3 Data Layer

Diagram data is persisted in MongoDB. The frontend also uses browser
localStorage as an offline fallback cache. NATS messaging is used for
real-time telemetry data distribution.

## 3.4 Technology Stack

  -----------------------------------------------------------------------
  **Component**       **Technology**
  ------------------- ---------------------------------------------------
  Frontend Framework  Vue 3 (Composition API, TypeScript)

  Diagram Engine      AntV X6 (graph/node/edge library)

  Animations          GSAP (GreenSock Animation Platform)

  Backend             Go (Chi router)

  Database            MongoDB

  Telemetry Transport NATS (WebSocket bridge)

  Routing             Vue Router 4 (Hash History)

  Build Tool          Vite

  Reverse Proxy       Nginx
  -----------------------------------------------------------------------

# 4. User Roles

+--------------+---------------------------+---------------------------+
| **Role**     | **Capabilities**          | **Access Level**          |
+==============+===========================+===========================+
| Admin /      | Create, edit, export,     | Full access to Landing    |
| Engineer     | import and delete         | Page, Editor, and Viewer  |
|              | diagrams                  |                           |
|              |                           |                           |
|              | Configure telemetry and   |                           |
|              | TC bindings               |                           |
|              |                           |                           |
|              | Manage auto-view settings |                           |
+--------------+---------------------------+---------------------------+
| Operator     | View real-time telemetry  | Read access to Landing    |
|              | diagrams                  | Page and Viewer; TC Queue |
|              |                           | interaction               |
|              | Issue telecommands via    |                           |
|              | the TC Queue              |                           |
|              |                           |                           |
|              | Run Auto View slideshows  |                           |
+--------------+---------------------------+---------------------------+

# 5. Functional Requirements

The following table lists all functional requirements for SPASDACS Nova.
Requirements from SPASDACS 1.0 are retained (FR-01 to FR-10) and
extended; new Nova requirements are identified with the \"NV-\" prefix.

## 5.1 Landing Page (Diagram Management)

  -----------------------------------------------------------------------
  **Req.   **Description**
  ID**     
  -------- --------------------------------------------------------------
  NV-01    The system shall provide a landing page displaying a catalog
           of all saved subsystem diagrams as visual cards.

  NV-02    The system shall allow users to create a new blank diagram
           with an auto-generated unique identifier.

  NV-03    The system shall allow users to view any saved diagram in the
           read-only Viewer page directly from the landing page.

  NV-04    The system shall allow users to edit any saved diagram in the
           Editor page directly from the landing page.

  NV-05    The system shall allow users to export any diagram as a JSON
           file download.

  NV-06    The system shall allow users to import a diagram from a JSON
           file, assigning a new unique ID to the imported diagram.

  NV-07    The system shall allow users to delete a diagram after
           confirming a time-based password (format: DDMMYYYYHHMM) to
           prevent accidental deletion.

  NV-08    The system shall persist diagram data to a MongoDB backend via
           REST API, with transparent fallback to browser localStorage
           when the backend is unavailable.

  NV-09    The landing page title shall display \"SPASDACS Nova\" with
           the GSAP glow animation matching the Editor and Viewer pages
           for visual consistency.
  -----------------------------------------------------------------------

## 5.2 Auto View (Automated Slideshow)

  -----------------------------------------------------------------------
  **Req.   **Description**
  ID**     
  -------- --------------------------------------------------------------
  NV-10    The system shall provide an Auto View feature on the landing
           page that cycles through selected diagrams in the Viewer page
           automatically.

  NV-11    The user shall be able to configure a global Auto View display
           duration (in seconds) that applies to all diagrams without a
           per-diagram override.

  NV-12    Each diagram card on the landing page shall have a per-diagram
           toggle to include or exclude it from the Auto View cycle; all
           diagrams shall be included by default.

  NV-13    Each diagram card shall allow configuration of an individual
           display duration (5-3600 seconds). When set to a non-zero
           value, it overrides the global duration for that diagram only.
           When set to zero, the global duration applies.

  NV-14    Per-diagram Auto View settings (include/exclude flag and
           duration) shall be persisted to the MongoDB backend via a
           lightweight PATCH API call (without re-uploading full diagram
           model data). Browser localStorage shall serve as a fallback
           cache.

  NV-15    The Auto View Viewer shall use per-diagram setTimeout
           scheduling to eliminate blank-screen transitions. Diagram
           rendering shall complete before the next timer is started.

  NV-16    Auto View cycling shall advance directly by loading the next
           diagram\'s data and rendering it into the existing canvas
           instance (no page reload), then updating the browser URL for
           navigation history.

  NV-17    The Viewer page shall provide a Pause/Resume control during
           Auto View. When paused, the current diagram shall remain
           displayed indefinitely until resumed.

  NV-18    Auto View shall gracefully skip diagrams that fail to load
           (network error, corrupt data) and continue cycling without
           freezing.
  -----------------------------------------------------------------------

## 5.3 Diagram Editor

  -----------------------------------------------------------------------
  **Req.   **Description**
  ID**     
  -------- --------------------------------------------------------------
  FR-01    The system shall allow users to create subsystem block
           diagrams using basic shapes: rectangles, circles, ellipses,
           triangles, diamond, hexagon, parallelogram, cylinder and
           connecting lines/edges.

  FR-02    The system shall allow users to import custom shapes or images
           (PNG, JPG, SVG) as diagram nodes via drag-and-drop or file
           selection.

  NV-19    The Editor shall be fully browser-based (no installation
           required), accessible via a standard web browser.

  NV-20    The Editor shall provide a collapsible left-panel shape
           palette organised by category (Basic Shapes, Connectors,
           Annotations).

  NV-21    The Editor shall support unlimited undo and redo of all
           editing operations (Ctrl+Z / Ctrl+Y).

  NV-22    The Editor shall provide a toggleable grid overlay to assist
           in precise element alignment.

  NV-23    The Editor shall support zoom in/out controls and a
           fit-to-view function to display the full diagram within the
           viewport.

  NV-24    The Editor shall support grouping of multiple selected nodes
           into a named group, and ungrouping of existing groups.

  NV-25    Groups shall support collapse (minimise to group header) and
           expand operations.

  NV-26    The Editor shall support Z-order operations: Bring to Front,
           Bring Forward, Send Backward, Send to Back.

  NV-27    The Editor shall allow configuration of diagram canvas
           background colour and canvas size (Standard, Wide, Custom).

  NV-28    The Editor shall allow pasting of image data directly from the
           system clipboard (Ctrl+V) as diagram nodes.

  NV-29    Diagrams shall be saved to the backend via a REST POST API
           call. Unsaved changes shall be indicated in the toolbar.

  NV-30    The Editor shall provide a \"View\" button to open the current
           diagram in the Viewer page.

  NV-31    Edge (connector) visual properties shall be configurable:
           stroke colour, stroke width, and opacity.
  -----------------------------------------------------------------------

## 5.4 Telemetry Binding Editor

  -----------------------------------------------------------------------
  **Req.   **Description**
  ID**     
  -------- --------------------------------------------------------------
  FR-03    The system shall allow telemetry mnemonic parameters to be
           associated with diagram elements via an element properties
           editor.

  FR-04    The system shall update visual attributes (background colour,
           border colour, text content, visibility, opacity) of diagram
           elements based on incoming telemetry values and configured
           rules.

  NV-32    The Telemetry Binding Editor shall be accessible by
           double-clicking any node in the Editor page. It shall present
           a tabbed interface: Simple (guided), Advanced (raw JSON), and
           Preview.

  NV-33    The Simple tab shall provide subsystem-filtered mnemonic
           selection using a searchable dropdown list populated from the
           gateway mnemonic catalog.

  NV-34    The Hover Display section shall allow selection of telemetry
           mnemonics to display in the tooltip when a user hovers over
           the element in Viewer. Subsystem and mnemonic selection shall
           use searchable dropdowns consistent with the Simple tab.

  NV-35    The Telecommands section shall allow one or more TC commands
           to be associated with a diagram element. Command selection
           shall use the same searchable subsystem/mnemonic dropdown
           pattern.

  NV-36    The binding editor shall support colour rules: defining fill
           and border colour changes triggered when a mnemonic value
           equals a specified string or numeric threshold.

  NV-37    The binding editor shall support visibility rules: showing or
           hiding an element based on mnemonic value conditions.

  NV-38    The binding editor shall support discrete state range mapping:
           mapping numeric mnemonic ranges to human-readable state
           labels.

  NV-39    The Advanced tab shall allow direct editing of the element
           data JSON for fine-grained binding configuration.

  NV-40    The Preview tab shall display the current serialised binding
           configuration for review before saving.
  -----------------------------------------------------------------------

## 5.5 Diagram Viewer

  -----------------------------------------------------------------------
  **Req.   **Description**
  ID**     
  -------- --------------------------------------------------------------
  FR-05    The system shall display real-time telemetry updates by
           applying visual rule changes to diagram elements as telemetry
           values arrive.

  FR-06    The system shall support multiple schematic pages (diagrams),
           each loadable individually or cycled via Auto View.

  FR-07    The system shall display telemetry values in a hover tooltip
           when the user moves the cursor over a bound diagram element.

  FR-08    The system shall generate visual alerts (element colour
           change, alert indicator) when telemetry values cross defined
           limits or match alert conditions.

  FR-09    The system shall indicate NATS connection status to the user,
           including heartbeat health, and notify when the telemetry data
           link is lost.

  FR-10    The system shall visually indicate subsystem state changes
           through colour and content updates bound to telemetry
           parameters.

  NV-41    The Viewer page shall be read-only; no diagram editing shall
           be possible from the Viewer.

  NV-42    The Viewer header bar shall auto-hide when idle and reveal on
           mouse hover within 6 pixels of the top edge of the viewport.

  NV-43    The hover tooltip shall support two display modes: Simple
           (mnemonic/value list) and Dict (structured table with dynamic
           columns for object-valued mnemonics).

  NV-44    The tooltip shall support real-time mnemonic value
           search/filter within the displayed tooltip.

  NV-45    The user shall be able to pin any tooltip as a persistent
           floating panel. Multiple panels may be pinned simultaneously.
           Pinned panels shall be draggable to any position on the
           viewport.

  NV-46    Pinned telemetry panels shall refresh their mnemonic values
           independently at a configurable interval.

  NV-47    The Viewer shall connect to a configurable NATS WebSocket
           server. Connection parameters (server URL, prefix,
           credentials) shall be editable via a modal settings panel.

  NV-48    The Viewer shall provide a diagram switcher control in the
           header to navigate directly to any saved diagram.
  -----------------------------------------------------------------------

## 5.6 Telecommand (TC) Commanding

These requirements implement the \"Direct telecommand capability\"
identified as a future enhancement in SPASDACS 1.0 (section 8.1).

  -----------------------------------------------------------------------
  **Req.   **Description**
  ID**     
  -------- --------------------------------------------------------------
  NV-49    The system shall allow telecommand (TC) mnemonics to be bound
           to diagram elements during editing.

  NV-50    In the Viewer page, double-clicking a diagram element that has
           bound TC commands shall open a TC Command Selector modal.

  NV-51    The TC Command Selector modal shall fetch and display all TC
           command records bound to the selected element from the gateway
           endpoint (/telecommand/record).

  NV-52    The TC Command Selector shall present commands in a tabular
           list with: checkbox selection, command name, command type
           badge, and a Data Part dropdown (populated from available data
           parts for that command).

  NV-53    The user shall be able to select multiple commands
           simultaneously using individual checkboxes or a Select All
           control.

  NV-54    Clicking \"Add to TC Queue\" in the TC Command Selector shall
           append the selected commands with their chosen data parts to
           the TC Command Queue without closing the modal.

  NV-55    The TC Command Queue shall be a persistent ordered list
           maintained as a reactive singleton store, visible across the
           session.

  NV-56    The Viewer navbar shall display a \"TC Queue\" button with a
           live count badge indicating the number of commands currently
           queued.

  NV-57    The TC Command Queue Panel shall allow the user to reorder
           commands by drag-and-drop or using up/down arrow buttons.

  NV-58    The TC Command Queue Panel shall allow deletion of individual
           commands from the queue.

  NV-59    The TC Command Queue Panel shall provide a \"Send Commands\"
           button to dispatch all queued commands in sequence to the
           backend.

  NV-60    The TC Command Queue Panel shall provide a \"Clear All\"
           button that empties the queue and closes the panel.

  NV-61    The TC Command Queue Panel shall auto-close when all commands
           have been individually deleted, leaving an empty queue.
  -----------------------------------------------------------------------

## 5.7 Data Persistence and API

  -----------------------------------------------------------------------
  **Req.   **Description**
  ID**     
  -------- --------------------------------------------------------------
  NV-62    The backend gateway shall expose a REST API for diagram
           management: POST (create/update), GET (list all metadata), GET
           /{id} (full diagram), PATCH /{id} (partial update), DELETE
           /{id}.

  NV-63    The PATCH /{id} endpoint shall accept partial diagram fields
           (e.g., autoViewInclude, autoViewDuration) and update only
           those fields in MongoDB using \$set, without requiring the
           full modelData to be re-submitted.

  NV-64    The GET /diagrams endpoint shall return only diagram metadata
           (id, name, description, timestamps, autoViewInclude,
           autoViewDuration) without modelData, for efficient landing
           page loading.

  NV-65    The frontend DiagramStorage service shall transparently fall
           back to browser localStorage for all CRUD operations when the
           backend API is unavailable.

  NV-66    Auto View per-diagram settings shall be cached in browser
           localStorage (key: spasdacs_autoview_cache) and merged with
           backend data on load to provide offline continuity.
  -----------------------------------------------------------------------

## 5.8 Telemetry Mnemonic Catalog

  -----------------------------------------------------------------------
  **Req.   **Description**
  ID**     
  -------- --------------------------------------------------------------
  NV-67    The system shall fetch the list of available telemetry
           subsystems from the gateway (/telemetry/subsystems).

  NV-68    The system shall fetch the full list of live telemetry
           mnemonic keys from the gateway (/tm/mnemonics).

  NV-69    The system shall fetch enriched mnemonic catalog metadata
           (subsystem, unit, type) from the gateway (/mnemonics/tm) and
           merge with live keys.

  NV-70    The system shall support subsystem-scoped mnemonic loading
           (/get/mnemonics/tm/{subsystem}) to reduce payload size when
           browsing a single subsystem.

  NV-71    The system shall fetch TC subsystems (/telecommand/subsystems)
           and TC command lists (/mnemonics/tc/{subsystem} or
           /mnemonics/tc/all) for use in the binding editor and TC
           selector.

  NV-72    All mnemonic catalog fetches shall use Promise.allSettled so
           that individual endpoint failures do not prevent other data
           from loading.
  -----------------------------------------------------------------------

# 6. User Workflow

## 6.1 Diagram Authoring Workflow

1.  User navigates to the SPASDACS Nova landing page.

2.  User clicks \"Create diagram\" to open a new blank diagram in the
    Editor.

3.  User adds shapes from the shape palette by clicking or drag-and-drop
    onto the canvas.

4.  User connects elements using edge connectors. Edge colour, width,
    and opacity are configured in the properties panel.

5.  User double-clicks an element to open the Telemetry Binding Editor.

6.  In the Simple tab, user selects a subsystem from the dropdown, then
    selects a telemetry mnemonic for the element label or tooltip.

7.  User configures colour rules and/or visibility rules based on
    expected mnemonic values.

8.  User adds hover display mnemonics and binds TC commands in the
    respective binding editor sections.

9.  User clicks Save to persist the diagram to the MongoDB backend.

10. User clicks View to open the diagram in the Viewer.

## 6.2 Real-time Monitoring Workflow

11. User opens a diagram in the Viewer page.

12. The Viewer connects to the configured NATS WebSocket server.

13. Incoming telemetry messages update element colours, text, and
    visibility per bound rules.

14. User hovers over an element to see a tooltip with live mnemonic
    values.

15. User optionally pins the tooltip as a draggable persistent panel.

16. On alert condition, the affected element changes colour to the
    configured alert colour.

17. NATS connection status and heartbeat are shown in the header bar.

## 6.3 Telecommanding Workflow

18. User opens a diagram in the Viewer page.

19. User double-clicks a diagram element that has bound TC commands.

20. The TC Command Selector modal opens, fetching command records from
    the gateway.

21. User reviews available commands, selects Data Parts from dropdowns,
    and checks desired commands.

22. User clicks \"Add to TC Queue\" --- selected commands are appended
    to the TC Queue.

23. User repeats from other elements as needed; the TC Queue count badge
    updates in real time.

24. User clicks the TC Queue button in the navbar to open the Queue
    Panel.

25. User reorders commands via drag-and-drop or arrow buttons.

26. User clicks \"Send Commands\" to dispatch the queue to the backend
    in sequence.

## 6.4 Auto View Workflow

27. On the landing page, the user configures per-diagram Auto View
    participation and duration for each diagram card.

28. Settings are automatically saved to MongoDB via PATCH after an 800
    ms debounce.

29. User sets the global fallback duration and clicks \"Start Auto
    View\".

30. The Viewer page opens on the first included diagram.

31. After the configured duration, the next included diagram is loaded
    directly into the canvas (no page reload).

32. The browser URL is updated to reflect the current diagram for
    bookmarking.

33. User may pause/resume the slideshow using the Pause button in the
    Viewer header.

# 7. Graphical User Interface Overview

## 7.1 Landing Page

The landing page consists of:

- Top navigation bar with SPASDACS Nova brand title (GSAP glow
  animation) and action buttons (Import, Create)

- Diagram card grid --- each card shows: diagram name, description,
  auto-view settings (include toggle, duration input, save indicator),
  and action buttons (View, Edit, Export, Delete)

- Auto View control bar --- global duration input, Start Auto View
  button, diagram inclusion summary

- Empty state illustration when no diagrams exist

## 7.2 Editor Page

The Editor page consists of:

- Top bar: SPASDACS Nova title with GSAP animation, undo/redo/fit/grid
  toolbar, Z-order toolbar, group/ungroup controls, zoom controls, View
  button, Save button

- Left panel: collapsible shape palette with basic shapes and connector
  types

- Central canvas: AntV X6 interactive diagram canvas with grid overlay

- Right panel: node/edge property editor with background colour, canvas
  size, and element text configuration

- Telemetry Binding Editor: modal dialog opened by double-clicking a
  node --- tabbed interface (Simple, Advanced, Preview)

## 7.3 Viewer Page

The Viewer page consists of:

- Auto-hiding top header: SPASDACS Nova title, diagram selector
  dropdown, NATS status indicator, Fit button, TC Queue button (with
  count badge), Back button, Edit button, Auto View pause/resume button

- Full-screen diagram canvas: AntV X6 read-only display with live
  telemetry updates

- Hover tooltip: floating panel showing mnemonic values for the hovered
  element; supports Simple and Dict display modes, search filter, and
  pin-to-viewport

- Pinned panels: draggable persistent telemetry display panels
  positioned freely on the viewport

- TC Command Selector modal: table-based command selector with checkbox,
  command name, type badge, and Data Part dropdown

- TC Command Queue panel: ordered command list with drag-reorder,
  delete, Send, and Clear All controls

- NATS configuration modal: server URL, prefix, username, and password
  fields

# 8. Non-Functional Requirements

  ------------------------------------------------------------------------
  **Req.   **Category**    **Description**
  ID**                     
  -------- --------------- -----------------------------------------------
  NF-01    Availability    The system shall operate fully in a browser
                           without requiring any client-side software
                           installation.

  NF-02    Performance     The Viewer page shall apply telemetry-driven
                           visual updates within 200 ms of receiving a
                           NATS message.

  NF-03    Resilience      The system shall continue to display and
                           interact with diagrams from localStorage when
                           the MongoDB backend is unreachable.

  NF-04    Scalability     The mnemonic catalog shall handle a minimum of
                           3000 live telemetry keys without UI
                           degradation.

  NF-05    Compatibility   The application shall be compatible with modern
                           Chromium-based browsers (Chrome, Edge) and
                           Firefox, latest two major versions.

  NF-06    Usability       The interface shall provide clear visual
                           feedback for all asynchronous operations
                           (loading spinners, save indicators, error
                           messages).

  NF-07    Security        Diagram deletion shall require time-based
                           password confirmation (format: DDMMYYYYHHMM) to
                           prevent accidental data loss.
  ------------------------------------------------------------------------

# 9. Future Enhancements

The following capabilities are identified for future versions of
SPASDACS Nova:

- Advanced telemetry analytics: trend charts, historical playback, and
  statistical analysis overlays on diagram elements

- Custom subsystem component libraries: reusable shape/template
  collections specific to spacecraft subsystems (AOCS, Power, Thermal,
  RF)

- Role-based access control: authentication and authorisation to
  separate admin and operator access

- Multi-user collaborative editing: concurrent diagram authoring with
  conflict resolution

- TC command acknowledgement feedback: real-time status update in the TC
  Queue panel after command dispatch

- Export to PDF/PNG: one-click export of the current viewer canvas with
  live telemetry state

- Alarm sound notification: configurable audio alerts when telemetry
  limit conditions are triggered

- Remote web-based monitoring dashboards: embeddable viewer for
  integration into operations control room displays

- Diagram version history: ability to roll back to a prior saved version
  of a diagram

# 10. Glossary

  -----------------------------------------------------------------------
  **Term**         **Definition**
  ---------------- ------------------------------------------------------
  SPASDACS         SPAcecraft Status Display And Commanding Software

  Nova             Version 2.0 of SPASDACS; a complete redesign as a
                   browser-based SPA

  SPA              Single-Page Application --- a web application
                   architecture where page content is dynamically updated
                   without full page reloads

  NATS             A lightweight open-source messaging system used for
                   real-time telemetry data distribution

  Mnemonic         A short identifier for a telemetry or telecommand
                   parameter (e.g., SC_BATT_VOLT)

  TM               Telemetry --- data received from the spacecraft

  TC               Telecommand --- command transmitted to the spacecraft

  AntV X6          An open-source graph visualisation library used for
                   the interactive diagram canvas

  GSAP             GreenSock Animation Platform --- used for title
                   entrance and glow animations

  PATCH            HTTP method for partial resource updates; used to save
                   Auto View settings without re-uploading full diagram
                   model data

  Auto View        Automated diagram slideshow feature that cycles
                   through selected diagrams at configured intervals

  TC Queue         An ordered in-session list of telecommands staged for
                   sequential dispatch to the spacecraft

  Data Part        A specific variant or parameter value associated with
                   a telecommand

  ISRO             Indian Space Research Organisation

  URSC             UR Rao Satellite Centre
  -----------------------------------------------------------------------

*End of Document --- SPASDACS Nova Functional Requirements Document
v2.0*
