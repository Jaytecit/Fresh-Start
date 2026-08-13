# SOLEMN SANDBOX — FULL PRODUCT STRUCTURE, UX & CONSISTENCY AUDIT

You are being asked to perform a **complete structural audit of Solemn Sandbox as both a software project and a user-facing product**.

This application has grown organically and rapidly. Features have often been added as new ideas occurred rather than according to a predefined architecture.

Assume, until proven otherwise, that:

- related functions may exist in unrelated locations
- the same capability may exist more than once
- different names may be used for the same concept
- similar controls may behave differently
- controls may appear in places that make sense only to the developer
- navigation may rely on prior knowledge of the application
- settings may be scattered
- terminology may be inconsistent
- panels may contain unrelated responsibilities
- some features may be difficult to discover
- some workflows may require unnecessary movement between screens
- different modules may reinvent the same UI or behaviour
- code ownership may be unclear
- shared capabilities may have local implementations
- menu hierarchy may have grown accidentally
- old features, experiments or abandoned implementations may still exist
- UI hierarchy may not reflect conceptual hierarchy
- important features may be buried while minor features receive prominent placement
- names may describe implementation rather than user intent

The developer knows where everything is because they built the application.

**A new user does not.**

Your job is to redesign the organisation of the application so that a new user can understand it naturally.

---

# CRITICAL RULE

## DO NOT BEGIN REFACTORING YET.

The first stage is **investigation and design only**.

Do not rename files.

Do not move components.

Do not delete anything.

Do not consolidate implementations.

Do not change navigation.

Do not redesign the interface.

Do not modify working behaviour.

First understand the entire application.

---

# PRIMARY OBJECTIVE

Determine what every part of Solemn Sandbox is for and establish a coherent system governing:

- navigation
- feature location
- tool location
- control placement
- naming
- terminology
- panel responsibilities
- application hierarchy
- shared tools
- reusable components
- settings
- workflows
- user progression
- discoverability
- code ownership
- UI consistency

The end result should feel like **one deliberately designed application**, not a collection of features accumulated over time.

---

# PART 1 — COMPLETE APPLICATION INVENTORY

Inspect the entire repository.

Do not restrict yourself to obvious entry points.

Find and catalogue:

- pages
- views
- routes
- workspaces
- sandboxes
- simulations
- editors
- inspectors
- sidebars
- toolbars
- menus
- context menus
- command palettes
- control panels
- floating panels
- overlays
- modals
- dialogs
- drawers
- tabs
- accordions
- settings
- preferences
- configuration screens
- import/export systems
- save/load systems
- sharing systems
- presets
- templates
- tutorials
- help systems
- debug interfaces
- developer tools
- experimental interfaces
- visualisation tools
- analysis tools
- playback controls
- camera controls
- simulation controls
- parameter editors
- object inspectors
- global controls
- local controls

Also identify systems that exist in code but are difficult or impossible to reach from the normal interface.

Create a document:

`PRODUCT_STRUCTURE_AUDIT.md`

---

# PART 2 — USER-FACING FEATURE MAP

For every user-facing capability, record:

- what it does
- where it currently lives
- how the user reaches it
- what it is called
- whether the same or similar capability exists elsewhere
- whether its current location is logical
- whether its name is understandable
- whether it is global or context-specific
- whether it belongs where it currently appears

Do not evaluate features individually only.

Evaluate their relationship to the rest of the application.

---

# PART 3 — NAVIGATION AUDIT

Map the complete navigation structure.

Determine:

- what the top-level destinations are
- whether those destinations represent meaningful concepts
- whether the hierarchy is too deep
- whether important features are buried
- whether minor tools occupy excessive prominence
- whether users have to remember where things are
- whether similar things appear in different branches
- whether users can predict where a feature should live
- whether there are dead ends
- whether users lose context
- whether navigation changes unexpectedly between modules
- whether the same navigation concept uses different UI patterns

Produce a proposed navigation model that obeys this test:

> If a user knows WHAT they want to do, they should be able to make a reasonable guess WHERE to find it.

---

# PART 4 — WORKFLOW / LEAD-THROUGH AUDIT

Identify the major things a user can attempt to accomplish.

For each major workflow, map the actual sequence.

Examples may include:

- creating something
- loading something
- editing something
- running a simulation
- inspecting results
- changing simulation parameters
- changing visualisation
- saving
- exporting
- importing
- sharing
- duplicating
- resetting
- experimenting
- comparing
- learning how something works

Do not assume these examples are complete.

Discover the real workflows from the application.

For every workflow determine:

1. What does the user want?
2. Where do they start?
3. What steps are required?
4. Where do they have to change UI context?
5. Where could they become confused?
6. What knowledge does the current design assume?
7. Are controls presented when they become relevant?
8. Are there unnecessary steps?
9. Are there multiple ways to perform the same operation?
10. Does the application provide a clear next action?

Flag workflows that rely on developer knowledge.

---

# PART 5 — DUPLICATED FUNCTIONALITY AUDIT

Search aggressively for features that perform the same conceptual operation.

Examples:

- multiple Reset buttons
- different Save implementations
- different Export implementations
- multiple parameter editors
- repeated camera controls
- repeated playback controls
- multiple ways of changing speed
- duplicated preset systems
- duplicated selectors
- multiple object inspectors
- module-specific implementations of global functionality
- multiple settings systems

Do not identify duplicates merely by code similarity.

Identify **conceptual duplication**.

Example:

`clearScene()`, `resetWorld()`, `newSimulation()`, and `wipeCurrentState()`

could potentially represent variations of the same user concept despite having different implementations.

For every duplicate or near-duplicate determine whether it should become:

- one shared implementation
- one shared UI component
- one shared service
- one global command
- one standard interaction pattern

or whether there is a genuine reason for the differences.

---

# PART 6 — TERMINOLOGY AND NAMING AUDIT

Build a complete vocabulary of meaningful user-facing concepts.

Look for:

- synonyms
- near-synonyms
- inconsistent singular/plural usage
- technical names exposed unnecessarily
- developer terminology
- abbreviations
- legacy names
- conflicting names
- multiple names for the same thing
- identical names for different things

Examples of potential inconsistency:

- Scene / World / Environment
- Object / Entity / Agent
- Run / Play / Start / Simulate
- Stop / Pause / Freeze
- Restart / Reset / Clear
- Parameters / Properties / Settings / Configuration
- Load / Import / Open
- Save / Export / Download
- Sandbox / Experiment / Simulation

These are examples only.

Discover the actual terminology used in Solemn Sandbox.

Create a proposed **Canonical Vocabulary**.

For every important concept specify:

`Canonical term`

`Meaning`

`Terms it replaces`

`Where it should be used`

No user-facing concept should have multiple names without a deliberate reason.

---

# PART 7 — CONTROL PLACEMENT AUDIT

Inspect every significant control.

Classify it as:

### GLOBAL
Affects the entire application.

### WORKSPACE
Affects the current major environment/workspace.

### DOCUMENT / PROJECT
Affects the currently loaded creation.

### OBJECT
Affects a selected object/entity.

### TOOL
Changes what the pointer/user interaction does.

### SIMULATION
Controls execution of the simulation.

### VIEW
Changes only how something is displayed.

### ANALYSIS
Changes or displays inspection/measurement information.

### DEVELOPER
Debugging, diagnostics or development-only functionality.

Determine whether each control currently appears in the correct conceptual location.

Controls with the same scope should generally live together.

---

# PART 8 — PANEL RESPONSIBILITY AUDIT

For every substantial panel, sidebar, toolbar or modal determine:

> What is this UI element responsible for?

If that answer requires several unrelated concepts joined by “and”, investigate whether it has accumulated too many responsibilities.

Example:

Bad:

> This panel controls simulation speed AND camera settings AND exporting AND selected-object properties.

Potentially better:

Simulation Controls  
View Controls  
Export  
Inspector

Do not split panels merely to create more panels.

The objective is **clear conceptual ownership**, not fragmentation.

---

# PART 9 — CONSISTENCY AUDIT

Compare equivalent interactions across the entire application.

Look for inconsistencies involving:

- buttons
- toggles
- sliders
- dropdowns
- tabs
- icon meanings
- tooltips
- confirmation behaviour
- destructive actions
- reset behaviour
- keyboard shortcuts
- drag interactions
- selection
- deselection
- hover behaviour
- disabled states
- contextual controls
- save status
- undo/redo
- errors
- notifications
- loading
- panel expansion
- numeric inputs
- units
- labels
- terminology
- iconography

Create explicit rules for repeated interaction patterns.

---

# PART 10 — GLOBAL VS LOCAL CAPABILITY AUDIT

Determine which capabilities should belong to the application globally and which should belong to individual sandbox modules.

Pay particular attention to things such as:

- simulation lifecycle
- play
- pause
- step
- restart
- speed
- camera
- selection
- object inspection
- measurement
- history
- undo
- presets
- saving
- importing
- exporting
- screenshots
- sharing
- help
- diagnostics

Do not force everything into global systems.

Determine the correct scope based on meaning.

But where the same concept exists repeatedly, prefer a common contract and shared implementation.

---

# PART 11 — CODE OWNERSHIP AUDIT

After understanding the product structure, inspect the source architecture.

Identify cases where:

- UI components contain business logic
- modules own functionality that should be shared
- shared systems contain module-specific logic
- several components mutate the same state
- utility folders have become dumping grounds
- files have unclear ownership
- components are excessively large
- similarly named files have unrelated responsibilities
- unrelated concerns exist in the same module
- code paths bypass central systems
- two systems can independently change the same thing

Do NOT refactor these yet.

Document them.

---

# PART 12 — DEAD / LEGACY / EXPERIMENTAL SYSTEMS

Identify:

- unreachable UI
- abandoned components
- old feature implementations
- unused helpers
- dead routes
- legacy compatibility layers
- superseded systems
- unused CSS
- stale feature flags
- temporary debug features
- proof-of-concept code that became permanent
- duplicate versions of systems

Do not delete them yet.

Classify each as:

- KEEP
- CONSOLIDATE
- REPLACE
- DEPRECATE
- DELETE CANDIDATE
- UNKNOWN — REQUIRES INVESTIGATION

Deletion must never occur solely because something appears unused from a basic text search.

---

# PART 13 — DESIGN THE TARGET INFORMATION ARCHITECTURE

After the audit, propose the ideal conceptual structure for Solemn Sandbox.

Ignore the existing folder structure initially.

Ask:

> If Solemn Sandbox were being designed today, with every current feature already known, how should the application be organised?

Create the proposed hierarchy.

For example only:

Solemn Sandbox
├── Home
├── Create
├── Explore
├── Current Sandbox
│   ├── Simulation
│   ├── Objects
│   ├── Inspector
│   ├── View
│   └── Analysis
├── Library
├── Share
└── Settings

DO NOT adopt that example unless the actual application supports it.

Derive the hierarchy from the product.

---

# PART 14 — DESIGN A CANONICAL UI SYSTEM

Specify the intended responsibilities of persistent UI areas.

For example:

- application header
- primary navigation
- contextual toolbar
- workspace
- inspector
- simulation transport
- status area
- notifications
- dialogs

Again, derive the correct model from the real application.

The important principle is:

**A user should learn the interface once.**

Moving to another sandbox or module should not require learning an entirely different application.

---

# PART 15 — CREATE THE CONSOLIDATION MAP

For every major inconsistency or duplication propose:

CURRENT

→

TARGET

For example:

`Module A camera speed slider`  
`Module B camera speed slider`  
`Module C camera settings modal`

→

`Shared View Controls / Camera Settings`

Do this for all major repeated concepts.

---

# PART 16 — MIGRATION SAFETY

This application is large and currently functional.

A successful restructuring must not destroy behaviour.

Create a migration plan that proceeds incrementally.

Each migration step must specify:

- exact scope
- files/systems involved
- behaviour that must remain unchanged
- tests required before the change
- tests required afterward
- rollback point
- dependencies
- risks

Prefer **small migrations with working checkpoints** over a giant rewrite.

---

# PART 17 — PRIORITISATION

Rank findings using:

### P0 — STRUCTURAL DANGER
Conflicting ownership, dangerous duplication, fragile state, or architecture likely to cause bugs.

### P1 — MAJOR UX CONFUSION
Navigation, terminology or workflows that make major functionality difficult to understand.

### P2 — CONSISTENCY PROBLEM
Equivalent functionality works or appears differently.

### P3 — POLISH
Minor organisational or naming improvements.

Also assign:

- effort: SMALL / MEDIUM / LARGE
- risk: LOW / MEDIUM / HIGH
- user impact: LOW / MEDIUM / HIGH

---

# PART 18 — REQUIRED DOCUMENTATION

Create or update:

`PRODUCT_STRUCTURE_AUDIT.md`

containing:

1. Executive Summary
2. Current Product Map
3. Current Navigation Map
4. Major User Workflows
5. UX Problems
6. Navigation Problems
7. Duplicate Capabilities
8. Terminology Conflicts
9. Canonical Vocabulary
10. Control Scope Analysis
11. Panel Responsibility Analysis
12. Consistency Problems
13. Global vs Local Systems
14. Code Ownership Problems
15. Dead / Legacy Candidates
16. Proposed Information Architecture
17. Proposed UI Architecture
18. Consolidation Map
19. Migration Plan
20. Prioritised Findings
21. Risks
22. Open Questions

Also create:

`UX_CONVENTIONS.md`

This becomes the authoritative rulebook for future development.

It should define:

- navigation conventions
- terminology
- control placement
- panel responsibilities
- button conventions
- destructive action conventions
- simulation controls
- view controls
- inspectors
- settings
- dialogs
- tooltips
- units
- keyboard shortcuts
- naming
- global vs module-specific functionality

And create:

`RESTRUCTURE_PLAN.md`

containing the ordered implementation phases.

---

# IMPORTANT PRODUCT PRINCIPLES

Use these principles throughout the audit.

## ONE CONCEPT — ONE NAME

Do not use several terms for the same user-facing concept without a strong reason.

## ONE RESPONSIBILITY — ONE HOME

Users should not have to search several locations for related controls.

## ONE CAPABILITY — ONE AUTHORITATIVE IMPLEMENTATION

Avoid independent implementations of shared functionality.

## GLOBAL THINGS LOOK GLOBAL

Application-wide functions should not appear to belong to an individual module.

## LOCAL THINGS STAY LOCAL

Module-specific functionality should not pollute global navigation.

## CONTEXT SHOULD DRIVE CONTROLS

Show controls where and when they are relevant.

## LOCATION SHOULD BE PREDICTABLE

A user should be able to guess where something lives.

## COMMON ACTIONS SHOULD BE EASY

Frequency should influence accessibility.

## RARE ACTIONS SHOULD NOT DOMINATE THE INTERFACE

Avoid permanent UI devoted to infrequently used functions.

## DESTRUCTIVE ACTIONS MUST BE CLEAR

Reset, delete, overwrite and destructive operations must never be ambiguous.

## DO NOT MAKE USERS UNDERSTAND THE CODE ARCHITECTURE

UI terminology must describe what the user is doing, not how the software implements it.

## CONSISTENCY BEATS CLEVERNESS

Equivalent things should look and behave equivalently.

---

# VERY IMPORTANT: PRESERVE PRODUCT CAPABILITY

This task is not an excuse to simplify Solemn Sandbox by removing advanced capabilities.

Complex functionality is acceptable.

**Unnecessarily complicated organisation is not.**

The goal is:

> powerful software with understandable organisation.

Not:

> fewer features.

---

# VERY IMPORTANT: DO NOT OPTIMISE FOR THE CURRENT DEVELOPER

Do not assume that something is understandable merely because its location or behaviour can be inferred from the source code.

Judge the application from the perspective of:

> an intelligent new user who has never seen Solemn Sandbox before.

Where useful, mentally model the question:

> “If nobody explained this to me, would I know what to do next?”

---

# DO NOT IMPLEMENT UNTIL THE AUDIT IS COMPLETE

When the investigation is finished:

1. Create the three documents.
2. Summarise the most important findings.
3. Show the proposed target application structure.
4. Show the highest-priority consolidation opportunities.
5. Identify dangerous or high-risk areas.
6. Recommend the first implementation phase.

Then STOP.

Do not begin restructuring until explicitly instructed to proceed.