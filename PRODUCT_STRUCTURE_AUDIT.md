# Solemn Sandbox — Product Structure Audit

**Status:** Design complete. Implementation follows [`RESTRUCTURE_PLAN.md`](./RESTRUCTURE_PLAN.md). Phases 0–2 shipped 2026-08-13.  
**Date:** 2026-08-13  
**Scope:** Entire repository as a user-facing product and as a software project.  
**Judged as:** An intelligent new user who has never seen Solemn Sandbox.

Companion documents:

- [`UX_CONVENTIONS.md`](./UX_CONVENTIONS.md) — rulebook for future UI work
- [`RESTRUCTURE_PLAN.md`](./RESTRUCTURE_PLAN.md) — ordered implementation phases

---

## 1. Executive Summary

Solemn Sandbox is a capable 2D creature sandbox: draw a body, pick a challenge, evolve a brain, then play, dance, or fight. The *capabilities* are strong. The *organisation* is not yet one application.

The product currently presents **eight peer header tabs** that mix three different kinds of thing:

| Kind | Current tabs |
| --- | --- |
| Onboarding | Tutorial |
| Context / help | Skill |
| Work modes (canvas + dock) | Creature builder, Train, Combat, Environment builder |
| Collections | Creature Library, Trophy room |

A new user cannot reliably guess which of those is “where I am working” versus “where I look things up.” Skill is also a persistent strip above the canvas. Disco is a skill that silently replaces the Train dock. Combat is a tab *and* a pair of skills (Box / Joust). Environment is a tab, a dock labelled **World**, a sidebar titled **Environment Studio**, and a strip control labelled **Env**.

The same creation is called **body**, **creature**, **package**, **current**, **design**, and **workspace**. Saving is split into **Save body**, **Save brain**, **Save trained**, **Save dancer**, **Save recipe**, **Save env**, and **Save…** (Disco setups). Tutorial copy still says **Save current** and **Head-to-head**.

Two files own almost all product behaviour: `src/App.tsx` (~8,028 lines) and `src/sim/simulation.ts` (~6,108 lines). Domain folders under physics, creature, editor, and env are relatively healthy. Several older combat panels remain in the tree but are not mounted.

**This audit does not recommend removing features.** It recommends giving every capability one name, one home, and one authoritative implementation.

Highest-leverage moves (design only, until instructed):

1. Collapse navigation into **rooms** (Learn / Sandbox / Library / Trophies) plus **sandbox modes** (Build, Train, Combat, Disco, Course).
2. Adopt the canonical vocabulary in section 9.
3. Make Skill / Goal / Environment *context*, not destinations.
4. Promote Disco to a first-class sandbox mode when that skill is active.
5. Deduplicate save/share controls and confirm destructive wipes.
6. Extract `App.tsx` by surface; grow `src/combat/` instead of twin boxing/joust stacks.

---

## 2. Current Product Map

### 2.1 What the product is

A single-page Vite + React application. There are no URL routes. State lives in `App`. The user moves between **tabs**; some tabs swap the canvas, some swap only the sidebar, some replace the whole shell with a full-bleed room.

### 2.2 Top-level destinations

Rendered in `src/App.tsx` (~7653) via `SandboxTabRail` in `src/components/SandboxShell.tsx`. Default landing tab: **Tutorial**.

| Tab label | Internal id | What the user actually gets |
| --- | --- | --- |
| Tutorial | `tutorial` | Full-bleed `TutorialPanel`. No canvas, strip, or dock. |
| Skill | `skill` | Sidebar: skill title, build essentials, feel notes. Canvas follows the *current skill* (Disco/Box/Joust may enter sim). Context strip already duplicates Skill. |
| Trophy room | `discoveries` | Full-bleed `TrophyCabinet`. |
| Creature builder | `edit` | `EditorCanvas` + sidebar “Creature” + dock **Creature**. |
| Creature Library | `creatures` | Full-bleed `CreaturesPanel` (Bodies + Trained + Public creations). |
| Train | `train` | `SimCanvas` + sidebar Train + dock **Train**, *or* dock **Disco** if skill is Disco, *or* boxing/joust arena if those skills are active. Empty body bounces to Creature builder. |
| Combat | `h2h` | Sidebar blurb + dock **Combat**. Canvas stays whatever sim is already showing. |
| Environment builder | `world` | `EnvEditorCanvas` + sidebar “Environment Studio” + dock **World**. |

Combat and Trophy room are omitted when `headToHead` / `discoveryUi` flags are off.

**Not first-class tabs (embedded or skill-gated):**

- Disco — skill **Disco** hijacks Train (and Skill) into `enterDiscoSkill()`
- Models Hub — heading **Trained** inside Creature Library (`ModelsHub.tsx`)
- Public creations — section inside Creature Library
- Physics settle — Creature builder stays on Edit tab but runs sim under idle muscles

### 2.3 Persistent chrome (when not full-bleed)

```
Topbar:  Solemn Sandbox  |  tabs  |  Immersive
Strip:   Skill · Goal · Env          (ContextStrip)
Status:  Body · Brain · Bound        (WorkspaceStatus)
Body:    Sidebar panel  |  Viewport canvas
Dock:    Creature | World | Train | Disco | Combat
```

Full-bleed rooms (Tutorial, Creature Library, Trophy room) hide strip, sidebar, canvas, and dock. The user loses Skill/Goal/Env and Body/Brain status until they return.

### 2.4 Inventory of UI surfaces

#### Shell and chrome

| Surface | Path | User-facing name |
| --- | --- | --- |
| Tab rail | `SandboxShell.tsx` | aria “Sandbox panels” |
| Brand | `App.tsx` | “Solemn Sandbox” / tagline |
| Immersive | `App.tsx` | Immersive / Exit immersive |
| Context strip | `ContextStrip.tsx` | Skill / Goal / Env |
| Workspace status | `WorkspaceStatus.tsx` | Body / Brain / Bound |
| Hover help | `HelpTip.tsx` + `HoverHelpContext.tsx` | Tips when Tutorial “Hover help” is on |
| Flash notice | `App.tsx` | message + Dismiss |
| Boot error | `App.tsx` | Failed to start |
| Loading | `App.tsx` | Loading physics… |

#### Canvases

| Canvas | Path | Used when |
| --- | --- | --- |
| Creature editor | `editor/EditorCanvas.tsx` | Creature builder |
| Environment editor | `env/EnvEditorCanvas.tsx` | Environment builder |
| Simulation | `sim/SimCanvas.tsx` | Train, Combat, Disco, physics settle, world preview |

#### Docks (bottom, over canvas)

| Dock | Path | Columns / job |
| --- | --- | --- |
| Creature | `CreatureDock.tsx` + large inspector in `App.tsx` | Tools, Body, Inspect, Files |
| World | `WorldDock.tsx` | Files, Tools, Course, Curriculum, Terrain, Edit |
| Train | inline in `App.tsx` | Drive, evolve actions, Watch & view, Progress, Files, Training setup |
| Disco | `DiscoZonePanel.tsx` + learn / slots / curriculum | Track, dance, routing, dancers |
| Combat | `CombatDock.tsx` | Mode, Corners, Match |

#### Sidebars (left panel of the active tab)

| Panel | Built in | Title |
| --- | --- | --- |
| Skill | `App.tsx` ~4309 | Skill + Build essentials + Feel notes |
| Creature | `App.tsx` ~4469 | Creature / Building for {skill} |
| Train | `App.tsx` ~5711 | Train (how-to, priorities, recipes, brain viz, stats, rewards, diagnostics) |
| Combat | `App.tsx` ~6349 | Combat (instructions + last result) |
| Environment Studio | `App.tsx` ~4382 | Environment Studio + Env library |

#### Full-bleed rooms

| Room | Path |
| --- | --- |
| Tutorial | `TutorialPanel.tsx` (guided + Quick start from `docs/TUTORIAL.md`) |
| Creature Library | `CreaturesPanel.tsx` |
| Trophy Room | `TrophyCabinet.tsx` (H1 “Trophy Room”; tab says “Trophy room”) |

#### Overlays / dialogs

| Surface | Path |
| --- | --- |
| Share Creature | `ShareDialog.tsx` |
| Secret Goal Discovered | `SecretGoalRevealOverlay.tsx` |
| From tutorial | `TutorialHelpPanel.tsx` |
| Hidden file inputs | `App.tsx` ~7926 (JSON import) |

#### Supporting widgets

Goal picker, env picker, goal info card, capability panel, body-part catalog, design preview, network visualizer, stats, rewards breakdown, perf diagnostics, training setup, workspace files, collapsible panel, disco track-learn / curriculum / slots.

### 2.5 Skills, goals, environments

**Skills** (`src/skills/skills.ts`): Walk, Jump, Fly, Motor, Free, Box, Joust, Disco.

**Goals** (`src/goals/catalog.ts`): Run, Max Speed, Sprint Finish, Stay Tall, Rough terrain, Jump Height, Hang Time, Long Jump, Clear the Bar, Hop Series, Climb, Motor, Ramp Jump, Gap Cross, Hurdles, Motor Sprint, Flight, Flight Height, Flight Distance, Wing Flight, Glider Range, Parachute Drop, Boxing Points, Jousting Pass, Dance. Internally `GoalId = TaskId`.

**Environments:** builtin Flat Ground plus user packages; boxing/joust hide Env in the strip and apply skill arenas in App.

### 2.6 Systems that exist in code but are hard to reach

| Item | Status |
| --- | --- |
| `BoxingSkillPanel.tsx` | Implemented, **not mounted** |
| `JoustingSkillPanel.tsx` | Implemented, **not mounted** |
| `HeadToHeadPanel` UI | Not mounted; only `headToHeadEntriesFromModels` is imported |
| `zones/zones.ts` | Deprecated re-export; **zero importers** |
| Flags off: `shareCodes`, `eliteReplay`, `finishedModels`, `arenaChampionship`, `worldObjects`, `jointAngularLimits`, `cosmeticsRenderModes` | No UI |
| `sandboxLayoutV2` | `true` but **never read** |
| `taskJump`…`taskLongJump` | `true` but **never read** (catalog already lists goals) |
| Legacy stacked sidebar | Only if `sandboxMenuShell` is false |
| Capability panel | Library detail only, not in the builder |
| Hover help toggle | Only inside Tutorial, not in chrome |
| Follow camera | Automatic in sim; no user toggle |

---

## 3. Current Navigation Map

### 3.1 Hierarchy as implemented

```
App
├── Immersive exit (when immersive)
├── Topbar
│   ├── Brand
│   ├── Tabs: Tutorial | Skill | Trophy room? | Creature builder |
│   │         Creature Library | Train | Combat? | Environment builder
│   └── Immersive
├── Full-bleed: Tutorial | Creature Library | Trophy room
└── SandboxShell (other tabs)
    ├── ContextStrip: Skill · Goal · Env
    ├── WorkspaceStatus: Body · Brain · Bound
    ├── Sidebar (active tab body)
    ├── Viewport: Editor | EnvEditor | Sim
    │   └── optional TutorialHelpPanel
    └── Dock: Creature | World | Train | Disco | Combat
```

### 3.2 Tab change side effects (`onSandboxTabChange`, `App.tsx` ~2623)

- **Creature builder** — leave Disco/Box/Joust skills; return to edit (unless physics settle is on).
- **Environment builder** — leave special skills; enter world mode.
- **Train** — empty body → bounce to edit; Disco/Box/Joust → enter those arenas *while staying on Train tab*; otherwise start sim.
- **Skill** — may enter Disco/Box/Joust sim without switching to Train.
- **Combat / Library / Trophy / Tutorial** — tab only; Combat reuses current canvas.

This is the core navigation surprise: **opening a tab is not a pure view change.** Train and Skill can teleport the simulation into a different arena. Combat does not start a match; it only reveals a dock.

### 3.3 Whether destinations represent meaningful concepts

| Tab | Meaningful to a new user? |
| --- | --- |
| Tutorial | Yes — learning |
| Skill | Weak — Skill is already on the strip; this tab is a help page |
| Trophy room | Yes — collection, but placed too early in the rail |
| Creature builder | Yes — making a body |
| Creature Library | Yes — browsing saved work |
| Train | Yes — evolving |
| Combat | Yes — playing matches, but overlaps Box/Joust skills |
| Environment builder | Yes — making a course |

### 3.4 Depth, burial, prominence

- Hierarchy is **shallow** (one row of tabs) but **conceptually mixed**.
- **Buried:** Public creations, trained shelf, Disco (no tab), hover-help toggle, Capability panel, training recipes (“More training options”), Environment Studio library (collapsed).
- **Over-prominent:** Skill tab (help content), Trophy room (before any create/train loop), Combat as a peer of Train even though most users train first.
- **Remember-where:** Save trained lives in Train dock *and* Files; Use body lives in Library *and* Creature Load dropdown; Env pick lives in strip *and* Env library; Skill pick lives in strip *and* Skill tab.

### 3.5 Dead ends and context loss

- Full-bleed rooms drop Skill/Goal/Env and Body/Brain chips. Returning does not always restore the same canvas mode.
- Opening Train with no joints silently sends the user to Creature builder.
- Disco hint in the strip says “track & learn live in the **Skill panel**”; the controls are in the **Disco dock**.
- Combat tab does not explain that Box/Joust *training* still happens under Train.

### 3.6 Navigation pattern inconsistency

- Some tabs swap canvas + dock (Build, Train, World).
- Some tabs only swap sidebar (Skill, Combat).
- Some tabs replace the entire shell (Tutorial, Library, Trophies).
- Disco is a skill, not a tab, but occupies the Train dock slot.

**Predictability test (current):** *If a user knows WHAT they want to do, can they guess WHERE?* Often no — especially for Disco, sharing, trained creatures, and environment save-vs-select.

---

## 4. Major User Workflows

### 4.1 First session (intended)

1. Land on Tutorial (good).
2. Jump to Skill / Builder / Train via chapter buttons.
3. Evolve → Play best → Save trained → Library.

**Friction:** Tutorial still says **Save current**, **Creatures** (tab is **Creature Library**), and **Head-to-head**. Hover help is on by default but the toggle is only in Tutorial. The first-loop chapter order (Skill then body then Train) fights the tab order (Tutorial, Skill, Trophy, Builder…).

### 4.2 Create / edit a creature

**Want:** A body that can train.  
**Start:** Creature builder, Library → Use body, or dock Load.  
**Steps:** Tools (joint/bone/muscle/select/cloth) → Inspect flags (foot, wheel, glove, lance, aero, eyes) → Name → Save body.  
**Context changes:** Leaving Disco/Box/Joust. Physics settle keeps Edit tab but runs sim.  
**Assumed knowledge:** Muscles (or wheels) before Evolve; triangles brace; combat marks are joint flags; aero types live on bones.  
**Confusion:** Tab “Creature builder” vs dock “Creature” vs library “Bodies”. **Clear** wipes the design with no confirm. Tutorial “Save current” ≠ button **Save body**.

### 4.3 Train / evolve

**Want:** A brain that scores well on a goal.  
**Start:** Strip Skill+Goal+Env, then Train (needs a body).  
**Steps:** Evolve → watch pack → Play best → Keep training / Save trained. Sidebar holds priorities, recipes, network, stats, rewards.  
**Multiple paths:** Evolve vs Keep training vs Continue (legacy) vs Training setup “start from saved brain”; Play best vs Drive → Brain; Save trained in the evolve row **and** Files.  
**Assumed knowledge:** Recipe ≠ brain; Observe speed applies after Stop; Bound/fingerprint; ghost pack.  
**Confusion:** Opening Train on Disco/Box/Joust does not show the generic Train dock.

### 4.4 Author an environment

**Want:** A custom course for training or racing.  
**Start:** Environment builder.  
**Steps:** Place obstacles/regions/markers → Save env → pick it in the strip Env control.  
**Assumed knowledge:** Saving is not the same as selecting for Train. Sprint needs start/finish. Curriculum must be built here, then enabled in Train.  
**Confusion:** Four names for one room (see §8). **Clear all** has no confirm.

### 4.5 Disco / dance

**Want:** Music-reactive motion, then optionally a learned dancer.  
**Start:** Strip Skill **Disco** (or Train/Skill while Disco is active).  
**Steps:** Load track → Start dancing → route bands → Record → Learn → Freestyle → Save dancer; optional slots and curriculum.  
**Context:** Train tab, Disco dock. Goal hidden. Hint points at Skill panel.  
**Assumed knowledge:** Solo-only for record/learn; dance task ≠ Free evolve; Save dancer ≠ Save trained.

### 4.6 Combat (race / boxing / joust)

**Want:** Two creatures compete.  
**Start:** Combat tab (play) *or* Skill Box/Joust + Train (practice).  
**Steps:** Mode → corners (workspace / house / saved) → Start match/pass → Stop.  
**Assumed knowledge:** Workspace corner needs a trained brain; boxing eligibility (gloves/targets/mass); race needs two models or workspace+saved.  
**Confusion:** Skill Box vs Combat Boxing; Start match vs Start pass; tab id `h2h`; orphaned skill panels in code.

### 4.7 Library, share, public

**Want:** Find, reuse, or publish work.  
**Start:** Creature Library, or Share trained from Train.  
**Steps:** Use body / Use trained / Open public share (confirm replace) / Create link.  
**Assumed knowledge:** Body ≠ trained; public list is opt-in; unnamed bodies cannot save.

### 4.8 Secrets / trophies

**Want:** See what was unlocked by experiment.  
**Start:** Overlay on discovery; later Trophy room. Library also lists “Achievements for this body.”  
**Assumed knowledge:** Secret goals are not the Goal strip.

### 4.9 Simulation transport (there is no Play)

There is **no global Play/Pause for physics**. Train uses Evolve/Stop, Drive modes, Reset pose. Disco uses audio Play/Pause plus Start dancing. Combat uses Start/Stop match. Speeds: Observe ×, Train ×, Physics settle ×. Camera follow is automatic.

### 4.10 Workflows that rely on developer knowledge

- Bound / fingerprint / mismatch
- Observe speed “after stop”
- Disco controls living in Train’s dock slot
- Curriculum authored in World then enabled in Train
- Boxing/joust training vs Combat matches as two different UIs
- Feature-flagged controls appearing/disappearing
- Import type mismatches (“use Import trained”)
- `r{revision}` and recipe fingerprints in library lists

---

## 5. UX Problems

1. **Eight peer tabs, three kinds of destination.** Rooms, modes, and help compete.
2. **Skill is duplicated** (strip + tab). The tab is a pamphlet, not a workplace.
3. **Disco is undiscoverable as a place.** Users look for a Disco tab and find a skill that steals Train.
4. **Combat vs Box/Joust skills** — two doors into related but different activities (play vs train).
5. **Full-bleed rooms drop working context.** Library and Tutorial feel like leaving the app.
6. **No Settings.** Hover help, anti-scoot, recipes, telemetry, ghost pack, raycasts, morph, immersive — scattered.
7. **Destructive Clear / Clear all** without confirmation.
8. **Tutorial vocabulary lags the UI** (Save current, Head-to-head, Creatures).
9. **Strip Disco hint is wrong** (“Skill panel” vs Disco dock).
10. **Capability / flight readiness** only in Library, not while building.
11. **Train sidebar vs Train dock** splits “how to train” from “do the training.”
12. **Immersive** is a rare action with permanent topbar placement (acceptable) while hover help (frequent for newcomers) is buried.
13. **Keyboard shortcuts exist but are not listed** in Tutorial or a cheatsheet; editor vs environment shortcuts disagree.
14. **Status chips use expert words** (Bound, mismatch, session unsaved) without a plain-language expansion on first sight.

---

## 6. Navigation Problems

1. Tab order: Tutorial → Skill → **Trophy room** → Creature builder. Trophies before making anything.
2. Opening Train is a **mode machine**, not a view: empty body bounce; skill-arena hijack.
3. Combat tab does not take over the canvas into a match until Start; users may think Combat is broken if they expected an arena swap like Disco.
4. Similar things in different branches: Env picker (strip) vs Env library (World sidebar); Load (Creature dock) vs Use body (Library).
5. Dead end: Skill tab for boxing/joust only tells you to go to Combat and Train.
6. Pattern mixing: tab-as-room vs tab-as-sidebar vs skill-as-mode.
7. Internal ids leak conceptually: `h2h`, `world`, `discoveries`, `zone` legacy.

**Proposed navigation test:** If the user knows the verb (draw, train, fight, dance, save, browse, learn), the first click should be obvious. Today dance, save-trained, and “use a public creature” fail that test.

---

## 7. Duplicate Capabilities

Conceptual duplicates (not merely similar code).

### 7.1 Reset / clear / restart

| Label | Where | Effect | Recommendation |
| --- | --- | --- | --- |
| Clear | Creature dock | Wipe design | Confirm; canonical **Clear body** |
| Clear all | World dock | Wipe env contents | Confirm; **Clear course** |
| Clear terrain / tower / stages / pins / buffer / dataset / slot | Various | Partial wipe | Keep local; same confirm pattern when irreversible |
| Reset pose | Train, Disco | Respawn creature | Shared **Reset pose** |
| Reset drop | Physics settle | Respawn settle | Same family as Reset pose |
| Reset spawn | World | Spawn marker to origin | Local |
| Reseed | Train | New RNG seed | Keep; developer-adjacent, collapse under More |
| Stop | Evolve / Combat / record | Halt process | Keep; not a reset |
| Undo | Creature, World | History pop | Shared pattern; add Ctrl+Z to World |

### 7.2 Save / load / import / export / share

| Family | Surfaces | Target |
| --- | --- | --- |
| Body | Creature Files, Library Use body, Load select, Import body | One **Files** contract; Library is the browser |
| Trained | Train evolve row **and** Files; ModelsHub Use trained; Import trained; Share | One action cluster: Save / Export / Share / Import trained |
| Brain-only | Train Files **Save brain** | Keep as advanced under Files |
| Env | World Files; Env library; strip Env picker; Import env | Save in World; **select** only in strip |
| Disco | Save setup; Save dancer; slot Load | Keep local; name payloads |
| Recipes | Save recipe; Export experiment pack | Advanced Train |

### 7.3 Playback / speed / camera

Observe × (Train + physics settle), Train ×, Disco Play/Pause (dock + track panel), three cameras, automatic follow, Immersive, Hide muscles/bones (Train **and** Disco, shared state).

**Target:** Shared view-toggles; one speed model with labels **Watch speed** and **Train speed**; Disco keeps audio transport.

### 7.4 Inspectors / presets / selectors

- Creature Inspect vs World selection inspector vs Training setup vs Disco gains vs Capability panel vs Combat corners
- Load select vs Library vs Disco slot loader vs Env picker vs Goal picker vs Skill strip vs Skill tab vs recipes vs sparring selects

**Target:** One inspector region per sandbox mode; one library browser; Goal/Skill/Env stay in the strip only.

### 7.5 Combat stacks

Live UI: `CombatDock`. Dead UI: `BoxingSkillPanel`, `JoustingSkillPanel`, `HeadToHeadPanel`. Parallel code: `boxing/*` ≈ `jousting/*` (hit probes, scoring, opponent contact, sparring, training helpers).

**Target:** Grow `src/combat/`; one match UI; keep scoring rules distinct.

---

## 8. Terminology Conflicts

| Cluster | Names in use | Problem |
| --- | --- | --- |
| The place | Sandbox, World, Environment, Environment Studio, Env, Course | User cannot name the room |
| The body | Creature, Body, Design, Package, Current, Workspace, Model | Same object, many labels |
| The mind | Brain, Trained, Model, Dancer, Elite, Genome | Overlap |
| The challenge | Skill, Goal, Task, Zone (legacy), Skill category (library taxonomy) | Skill ≠ Goal ≠ Task ≠ library category |
| The run | Train, Evolve, Keep training, Continue, Play best, Simulate, Drive | Three “go” verbs |
| Stop | Stop, Pause (audio), Idle | Different systems |
| Wipe | Clear, Reset, Delete, Remove, Reseed | Destructive vs respawn |
| Persist | Save, Export, Import, Load, Use, Open, Share, Download | Different payloads, same verbs |
| Compete | Combat, Head-to-Head, Race, Match, Pass, Heat, Corners | Legacy + new |
| Disco | Disco, Zone, Dance, Freestyle, Start dancing, Puppet | Three dance ideas |
| Secrets | Trophy room, discoveries, Secret goals, Achievements, Goals | Secrets ≠ Goal picker |
| Files | Package, Saved model, Bundled, Best ever, Experiment pack, Setup | Library internals leaked |

Tutorial vs UI mismatches: **Save current** vs **Save body**; **Creatures** vs **Creature Library**; **Head-to-head** vs **Combat**.

---

## 9. Canonical Vocabulary

No user-facing concept should have two names without a deliberate reason. Code identifiers may lag; UI and docs must not.

| Canonical term | Meaning | Replaces | Where used |
| --- | --- | --- | --- |
| **Solemn Sandbox** | The application | — | Brand |
| **Sandbox** | The working canvas (build / train / play / dance / course) | World (as app), Experiment | Room name |
| **Tutorial** | Optional guided learning | Quick start remains a *view inside* Tutorial | Learn room |
| **Library** | Browser of saved work | Creature Library, Models Hub, Packages (UI) | Room name; H1 **Library** |
| **Bodies** | Saved or preset creatures without requiring a brain | Packages, Current, Presets (keep Presets as a *section*) | Library section; Files |
| **Body** | The creature design in the workspace | Design, Creature (when meaning the figure), Package | Status, Files, inspector |
| **Brain** | Controller weights for a body + goal | Genome (never in UI), Model (when meaning weights only) | Status, advanced Files |
| **Trained** | Body + brain + goal together | Model, Finished model, Saved model (UI) | Library section, Save trained |
| **Skill** | Family of challenges (Walk, Jump, Fly, Motor, Free, Box, Joust, Disco) | Zone | Context strip only (not a top-level tab) |
| **Goal** | What training scores | Task (UI), Zone (legacy) | Context strip, Train, Combat race |
| **Environment** | The course / ground | Env, World, Studio (UI chrome) | Strip label **Environment** (or **Course** if space); tab **Course** |
| **Course** | An authored environment used for training or racing | World (dock), Environment Studio (H2) | Builder mode + dock label |
| **Build** | Draw and inspect the body | Creature builder, Edit, Creature (dock) | Mode + dock |
| **Train** | Evolve and watch brains | Simulate, Run (when meaning evolve) | Mode |
| **Evolve** | Start / resume a genetic search | Continue (legacy button) | Primary Train action |
| **Keep training** | Resume from current elites | Continue | Secondary Train action |
| **Play best** | Watch the current elite alone | Playback | Train |
| **Watch speed** | Sim speed when not evolving | Observe | View controls |
| **Train speed** | Sim speed while evolving | — | View controls |
| **Reset pose** | Respawn the creature on the course | Reset drop (settle can say Reset pose) | Sim / Disco / settle |
| **Clear body** | Wipe the design | Clear | Build; confirm |
| **Clear course** | Wipe authored geometry | Clear all | Course; confirm |
| **Combat** | Play a race, boxing match, or joust | Head-to-Head, H2H, Heat | Mode |
| **Match** | One boxing fight or race | Heat | Combat |
| **Pass** | One jousting charge | — | Combat (joust only; the difference is real) |
| **Corners** | Who is in a match | This workspace vs Library trained vs House | Combat |
| **Disco** | Music-reactive dance mode | Zone | Mode (first-class when skill is Disco) |
| **Dancer** | A learned disco brain + body | Dance model | Disco Files / slots |
| **Setup** | Named Disco stage configuration | — | Disco only |
| **Share** | Create a public link for a trained creature | Share codes (unused) | Dialog **Share** |
| **Public creations** | Opt-in gallery | Gallery | Library section |
| **Trophies** | Unlocked secret goals | Discoveries, Trophy Room vs Trophy room | Room **Trophies** |
| **Secret** | A hidden goal, not in the Goal strip | Achievements (Library can say “Secrets for this body”) | Overlay + Trophies |
| **Bound** | Brain matches this body’s shape | Fingerprint (UI) | Status; tooltip explains |
| **Inspect** | Properties of the selection | — | Build / Course docks |
| **Files** | Name, save, import, export for the current mode | — | Each mode dock |
| **House** | Built-in sparring opponent | Dummy, bundled | Combat corners |

**Deliberate dual names (keep both):**

- **Bone** vs **Solid strut** — different physics.
- **Muscle** vs **Wheel / motor** — different actuators.
- **Save** vs **Export** — library vs download.
- **Import** vs **Use** — file vs library pick.
- **Stop** (halt evolve/match) vs **Pause** (audio).

---

## 10. Control Scope Analysis

| Scope | Examples today | Correct home |
| --- | --- | --- |
| **GLOBAL** | Immersive, hover help, brand | Application header / Settings |
| **WORKSPACE** | Skill, Goal, Environment, Body/Brain/Bound | Persistent strip (not a tab) |
| **DOCUMENT** | Name, Save body/env/trained, Import/Export | Files column of the active mode |
| **OBJECT** | Joint/bone/muscle/cloth inspectors; env selection | Inspect in Build / Course docks |
| **TOOL** | joint/bone/muscle/select/cloth; env place tools | Tools column of Build / Course |
| **SIMULATION** | Evolve, Stop, Play best, Drive, Reset pose, speeds | Train / Combat / Disco docks |
| **VIEW** | Hide muscles/bones, ghost pack, greenscreen, camera | View cluster in the active sim dock |
| **ANALYSIS** | Stats, Rewards, Network, Diagnostics, telemetry | Train sidebar (advanced) |
| **DEVELOPER** | Reseed, telemetry download, perf diagnostics, feature flags | Diagnostics / advanced; flags stay code-side |

Misplaced today: hover help (Tutorial-only); Skill tab (global context presented as a room); Capability panel (object analysis only in Library); Save trained duplicated in two Train clusters; Combat sidebar vs dock split (sidebar is almost empty).

---

## 11. Panel Responsibility Analysis

| UI element | Current job | Verdict |
| --- | --- | --- |
| Header tabs | Destinations + modes + help | Too many kinds. Split rooms vs modes. |
| Skill sidebar | Help text for the active skill | Merge into Build sidebar / contextual help. Not a tab. |
| Creature sidebar | “Building for {skill}” intro | Thin; dock does the work. Keep as mode help. |
| Creature dock | Tools + Body + Inspect + Files | Coherent. Large inspector still lives in App. |
| Train sidebar | Tutorial strip + priorities + recipes + viz + stats + rewards + diagnostics | Overloaded. Split **Train help / score** vs **Advanced**. |
| Train dock | Drive + evolve + view + files + setup | Overloaded but the right *place*. Collapse setup by default. |
| Combat sidebar | Copy + last result | Almost redundant with dock. Make it scoreboard-only or drop. |
| Combat dock | Mode, corners, start/stop | Clean ownership. |
| World sidebar | Studio status + env library | Library list duplicates strip Env. Keep status; move “pick for training” exclusively to strip. |
| World dock | Tools + course + curriculum + terrain + edit + files | Busy but one domain (the course). Keep; group more tightly. |
| Disco dock | Audio + routing + slots + curriculum | Correct owner; too much at once. Progressive disclosure. |
| Creature Library | Bodies + trained + public + capabilities + achievements | One room, three shelves — OK if shelves are explicit. |
| Tutorial | Guided + quick start + hover toggle | Hover toggle should also live in global chrome. |
| Feel notes | Physics essay | Keep collapsed; not a tab. |

Do not split World or Creature docks merely to have more panels. Do split Train sidebar responsibilities.

---

## 12. Consistency Problems

| Pattern | Inconsistency | Rule (see UX_CONVENTIONS) |
| --- | --- | --- |
| Destructive | Library delete confirms; Clear body / Clear course do not | Confirm irreversible wipes |
| Overwrite | Package overwrite confirms; some disco slot loads alert | Confirm overwrite of named library items |
| Shortcuts | Build: Ctrl+D copy; Course: D duplicate. Course has V/R/Esc; Build does not. Course Undo is button-only | Same verbs, same keys where the verb exists |
| Selection | Build multi-select vs Course multi-select vs none in sim | Document per mode |
| Primary action | Evolve vs Start match vs Start dancing vs Use body | One filled primary per dock |
| Toggle | Hover help is a labelled toggle; Immersive is a button; Hide muscles are checkboxes | Toggles for persistent prefs; buttons for modes |
| Tabs | Header tabs vs skill chips vs library shelves vs tutorial Guided/Quick start | One visual language for “places”; chips for mutually exclusive context |
| Naming | Trophy room vs Trophy Room; Env vs Environment | Canonical vocab |
| Disabled | Evolve greyed without explanation unless the user finds tutorial “need muscles” | Disabled + tooltip reason |
| Units | Meters in stats; sliders sometimes unitless | Always show unit |
| Notifications | `flashNotice` vs `window.confirm` vs `window.alert` vs overlay | In-app dialogs, not `window.alert` |
| Save status | Bound/unsaved in chips; no dirty indicator on env/body | Status chip is the dirty/bound indicator — make it readable |
| Undo | Creature and World have undo; Train/Disco/Combat do not (correct — different domain) | Undo for authoring only |
| Dock collapse | Shared Expand/Collapse | Keep |
| Load vs Use | Dock **Load** select vs Library **Use body** | Library: Use; dock: Load is acceptable if both say the payload |

---

## 13. Global vs Local Systems

| Capability | Scope | Notes |
| --- | --- | --- |
| Play / pause physics | **Do not force global** | Train has Evolve/Stop; Disco has audio; Combat has match Start/Stop. Shared *contract*: primary start + stop in the dock. |
| Step | Local / absent | No single-step UI; do not invent unless needed |
| Restart pose | Shared command **Reset pose** | Train, Disco, settle |
| Speed | Shared **Watch speed** / **Train speed** | Disco audio rate stays local |
| Camera | Local per canvas | Shared gestures: pan, wheel zoom. Follow stays automatic unless a toggle is added |
| Selection | Local to authoring modes | |
| Inspect | Local to authoring modes | Shared layout: Inspect column |
| Measurement / rulers | View, sim-only | |
| Undo | Authoring only | |
| Presets | Library + dock Load | One library; dock Load is a shortcut |
| Saving | Shared Files pattern, local payload | Body / Trained / Course / Dancer / Setup |
| Import / export | Shared JSON verbs, typed payloads | |
| Share | Global for **Trained** only | |
| Screenshots | Absent | Out of scope |
| Help | Global hover + Tutorial room | |
| Diagnostics | Train-local advanced | |
| Disco routing / puppet | Disco-local | |
| Boxing divisions / joust scorecard | Combat/Train local rules | Shared corner picker |

---

## 14. Code Ownership Problems

**Do not refactor these in this phase. Documented only.**

### 14.1 God objects

| File | Lines | Owns |
| --- | --- | --- |
| `src/App.tsx` | ~8,028 | Shell, all tabs, all docks’ data, evolve, combat, disco, I/O, tutorial, secrets |
| `src/sim/simulation.ts` | ~6,108 | Physics step, GA, disco, boxing, joust, H2H, morph, courses |
| `src/styles.css` | ~2,974 | All chrome; leftover zone/h2h classes |
| `src/env/EnvEditorCanvas.tsx` | ~1,580 | Env studio canvas |
| `src/brain/taskScore.ts` | ~1,302 | Every goal’s scoring |
| `src/secrets/definitions.ts` | ~1,240 | Secret catalog |
| `src/sim/render.ts` | ~1,221 | Draw path |
| `src/editor/EditorCanvas.tsx` | ~1,010 | Creature editor |

`App` holds on the order of **138 `useState` / 35 `useRef`**. Approximately fourteen product concerns share one component.

### 14.2 Healthy folders

`appearance/`, `audio/`, `control/`, `creature/`, `editor/`, `env/` (aside from canvas size), `goals/`, `help/`, `physics/`, `secrets/` (aside from catalog size), `skills/`, new `combat/` (thin — the right seed).

### 14.3 Mixed / dumping grounds

- **`library/`** — packages, saved models, share, disco setups, skill categories, JSON I/O, vocab, preview paint
- **`brain/`** — learning + all-task scoring + combat training helpers + course markers
- **`components/`** — live UI plus three unmounted combat panels
- **`port/featureFlags.ts`** — live gates plus unused backlog keys

### 14.4 Dual writers

- React `design` vs `Simulation.design` (morph / match spawn can diverge until reload)
- React `envDesign` vs sim environment (arena enter/leave stashes `preSpecialEnvRef`)
- Boxing and joust both define opponent contact bitmasks
- App and `brain/boxingTraining.ts` / `joustingTraining.ts` can start matches
- Skill storage: current key + legacy `freshstart_active_zone_v1`

### 14.5 UI containing domain logic

`App.tsx` (eligibility, arena swaps, share validation), `WorldDock.tsx` (physics constants, curriculum), `DiscoZonePanel.tsx` (drive-group normalize, clamps). Dead skill panels still encode match setup.

### 14.6 Bypass of central systems

Arena environments applied ad hoc in App (`applyDiscoEnvironment`, boxing ring, joust lane) rather than one “active arena” service. Deprecated `Simulation` disco foot-mass aliases still referenced from disco paths.

---

## 15. Dead / Legacy Candidates

Deletion must not occur solely because a search looks unused. Classifications:

| Item | Classification | Notes |
| --- | --- | --- |
| `BoxingSkillPanel.tsx` | **DELETE CANDIDATE** | Replaced by CombatDock; confirm no test mounts it |
| `JoustingSkillPanel.tsx` | **DELETE CANDIDATE** | Same |
| `HeadToHeadPanel` UI | **DELETE CANDIDATE** | Keep `headToHeadEntriesFromModels` → move to `combat/` |
| `zones/zones.ts` | **DELETE CANDIDATE** | Zero importers; superseded by `skills/` |
| `featureFlags.zoneTabs` | **DELETE CANDIDATE** | Deprecated alias |
| `featureFlags.sandboxLayoutV2` | **DELETE CANDIDATE** | True, never read |
| Unused `taskJump`…`taskLongJump` flags | **DELETE CANDIDATE** | Catalog is source of truth |
| `shareCodes`, `eliteReplay`, `finishedModels`, `cosmeticsRenderModes` | **DEPRECATE** | Confirm not a near-term TASKS item |
| `worldObjects`, `jointAngularLimits`, `arenaChampionship` | **UNKNOWN — REQUIRES INVESTIGATION** | Plausible future; keep flags until product decision |
| Unused CSS (`zone-tabs`, `context-strip-zones`, `disco-panel`, `save-current-block`, …) | **DELETE CANDIDATE** | After visual confirm |
| `h2h` tab id / `h2h-*` CSS / `headToHead` flag | **CONSOLIDATE** | Rename to combat when touching nav |
| `DiscoZonePanel` filename | **DEPRECATE** naming | Rename when extracting disco |
| Boxing ↔ joust probe/scoring/contact twins | **CONSOLIDATE** | Shared combat contact; keep rule tables distinct |
| `App.tsx` monolith | **CONSOLIDATE** | Split by surface |
| `simulation.ts` monolith | **REPLACE** (facade + mode modules) | High risk; late phase |
| Physics settle as Edit+sim hybrid | **KEEP** | Real product behaviour |
| `combat/` | **KEEP** and grow | |
| Tutorial “Save current” copy | **REPLACE** copy | Low risk |
| Legacy `freshstart_active_zone_v1` | **KEEP** until migrate, then **DELETE** | |

---

## 16. Proposed Information Architecture

If Solemn Sandbox were designed today, with every current feature known:

```
Solemn Sandbox
├── Learn
│   └── Tutorial (guided | quick start | hover-help)
├── Sandbox                          ← the working product
│   ├── Context (always visible)
│   │   ├── Skill
│   │   ├── Goal                     (hidden for Disco)
│   │   ├── Environment              (hidden for Box/Joust arenas)
│   │   └── Body · Brain · Bound
│   ├── Modes
│   │   ├── Build                    (body editor)
│   │   ├── Train                    (evolve / watch)
│   │   ├── Combat                   (race / box / joust play)
│   │   ├── Disco                    (first-class when Skill is Disco; otherwise hidden)
│   │   └── Course                   (environment authoring)
│   ├── Canvas
│   ├── Mode sidebar (help / score / library-of-this-mode)
│   └── Mode dock (tools / transport / files)
├── Library
│   ├── Bodies
│   ├── Trained
│   └── Public creations
└── Trophies
```

**Settings** is not a room yet (too little exclusive UI). Add a small header control later for hover help + diagnostics rather than a ninth tab.

### Why this hierarchy

- **Learn / Sandbox / Library / Trophies** are the only *places*.
- **Build / Train / Combat / Disco / Course** are *verbs on the same canvas*.
- Skill / Goal / Environment stay visible while working — they are not destinations.
- Disco is no longer a surprise Train skin.
- Combat is “play,” Train is “practice,” Skill Box/Joust still *filters goals* and arenas.
- Library shelves match the canonical nouns Bodies / Trained / Public.
- Trophy room is not in the way of the first-create loop.

Header chrome for a new user:

`Solemn Sandbox    Tutorial · Build · Train · Combat · Course · Library · Trophies    Immersive`

Disco appears in that mode rail when Skill is Disco (or always, switching skill to Disco). Skill chips remain on the strip, not in the header.

---

## 17. Proposed UI Architecture

A user should learn the interface once.

| Region | Responsibility | Persistence |
| --- | --- | --- |
| **Application header** | Brand, *room/mode* navigation, Immersive, later Help toggle | Always (hidden in Immersive except exit) |
| **Context strip** | Skill, Goal, Environment | Sandbox room only |
| **Status strip** | Body · Brain · Bound | Sandbox room only; Library may show a compact “now in workspace” |
| **Mode sidebar** | Why this mode / scoreboard / advanced analysis | Sandbox; not a second nav |
| **Workspace canvas** | The creature, course, or match | Sandbox |
| **Mode dock** | Tools or transport + Files | Sandbox; collapsible |
| **Inspector** | Selected object properties | Build and Course docks |
| **Simulation transport** | Evolve/Stop/Play best *or* Match start/stop *or* Dance play/pause | Dock, mode-specific, same slot |
| **View cluster** | Speeds, hide geometry, ghosts | Dock |
| **Library shelves** | Bodies / Trained / Public | Library room |
| **Dialogs** | Share, confirm destroy/overwrite, secret reveal | Overlay |
| **Notifications** | Flash errors/success | Overlay; no `window.alert` |
| **Tutorial help overlay** | After a jump | Canvas overlay with Return |

**Invariant:** Switching Build → Train → Course changes canvas and dock content, not the meaning of header, strip, or Files.

---

## 18. Consolidation Map

CURRENT → TARGET

**Navigation**

- Header: Tutorial, Skill, Trophy room, Creature builder, Creature Library, Train, Combat, Environment builder  
  → Rooms: Tutorial, Library, Trophies + Sandbox modes: Build, Train, Combat, Disco, Course  
- Skill tab  
  → Skill strip + Build sidebar “essentials”  
- Trophy room before Build  
  → Trophies after Library  

**Naming**

- Creature builder / Creature dock / Bodies / Packages  
  → **Build** mode, **Body**, Library **Bodies**  
- Environment builder / World / Env / Environment Studio  
  → **Course** mode, strip **Environment**, Files **Save course**  
- Observe  
  → **Watch speed**  
- Save current (docs)  
  → **Save body**  
- Head-to-Head / h2h  
  → **Combat**  
- Models Hub  
  → Library **Trained** (already the H2; drop “models” from product language)  
- DiscoZonePanel / “Skill panel” disco hint  
  → **Disco** dock; hint points at the dock  

**Files / save**

- Train evolve-row Save/Export/Share **and** Files column duplicates  
  → One Files cluster; evolve row keeps Evolve / Stop / Play best / Keep training only  
- Load select vs Use body  
  → Keep both as shortcuts; same nouns  

**Combat**

- CombatDock + BoxingSkillPanel + JoustingSkillPanel + HeadToHeadPanel  
  → CombatDock only; helpers in `combat/`  
- Twin boxing/joust contact/probe modules  
  → Shared combat contact; distinct scorecards  

**View**

- Hide muscles/bones in Train and Disco  
  → Shared view-toggles component  

**Help**

- Tutorial hover toggle only  
  → Header or Tutorial *and* a status control  
- Train “How to train” + Skill feel notes + GoalInfoCard  
  → Contextual help in the mode sidebar; one voice  

**Code**

- App.tsx panel JSX  
  → `SkillHelpPanel`, `TrainSidebar`, `CourseSidebar`, etc.  
- simulation.ts mode tangle  
  → Facade + `sim/modes/*` (late, high risk)  

---

## 19. Migration Plan

Prefer small migrations with working checkpoints. Each step below is specified further in [`RESTRUCTURE_PLAN.md`](./RESTRUCTURE_PLAN.md).

| Step | Scope | Unchanged behaviour | Tests | Rollback | Risk |
| --- | --- | --- | --- | --- | --- |
| 0 | Copy-only vocabulary (buttons, tutorial, hints) | All mechanics | Manual UI pass; no physics | Revert strings | Low |
| 1 | Confirm Clear body / Clear course | Wipe still wipes after confirm | Manual | Revert | Low |
| 2 | Deduplicate Train save buttons | Same save functions | Share/json smoke | Revert JSX | Low |
| 3 | Tab labels + order (no id rename yet) | Same tab ids | Manual nav | Revert labels | Low |
| 4 | Demote Skill tab content into Build sidebar; hide Skill tab | Skill strip still switches skills | Manual; disco/box/joust enter paths | Restore tab | Medium |
| 5 | Disco mode rail (still may use Train tab id internally) | `enterDiscoSkill` unchanged | Disco smokes | Restore dock hijack | Medium |
| 6 | Delete unmounted combat panels after helper move | CombatDock path | Boxing/joust smokes | Git revert | Low |
| 7 | Extract App sidebars/docks to components (no behaviour change) | Identical UI | `smoke:all` | Revert extract | Medium |
| 8 | Consolidate combat contact/probes | Match scores identical | Boxing/joust smokes | Revert | High |
| 9 | Rename tab ids / CSS (h2h→combat, world→course) | Behaviour identical | Full UI + smoke | Revert | Medium |
| 10 | Simulation facade | Bit-identical stepping | `smoke:all` required | Revert | High |

**Do not** combine 8 and 10. **Do not** move physics constants. **Do not** change Rapier stepping.

---

## 20. Prioritised Findings

| ID | Finding | Pri | Effort | Risk | User impact |
| --- | --- | --- | --- | --- | --- |
| F1 | `App.tsx` + `simulation.ts` dual god-objects; dual writers on design/env | **P0** | LARGE | HIGH | Indirect (bugs, freeze) |
| F2 | Boxing/joust duplicate contact + two match starters | **P0** | MEDIUM | HIGH | Match scoring drift |
| F3 | Clear body / Clear course unconfirmed | **P0** | SMALL | LOW | Data loss |
| F4 | Eight mixed-kind tabs; Skill duplicated; Disco hidden in Train | **P1** | MEDIUM | MEDIUM | HIGH |
| F5 | Environment / World / Env / Studio four-name room | **P1** | SMALL | LOW | HIGH |
| F6 | Body / package / model / trained / dancer save matrix | **P1** | MEDIUM | LOW | HIGH |
| F7 | Tutorial copy lags UI; Disco hint wrong | **P1** | SMALL | LOW | HIGH |
| F8 | Combat vs Box/Joust skill dual door | **P1** | MEDIUM | MEDIUM | HIGH |
| F9 | Full-bleed rooms drop workspace context | **P1** | MEDIUM | MEDIUM | MEDIUM |
| F10 | Duplicate Save trained / Export / Share | **P2** | SMALL | LOW | MEDIUM |
| F11 | Shortcut mismatch Build vs Course | **P2** | SMALL | LOW | MEDIUM |
| F12 | Hover help only in Tutorial | **P2** | SMALL | LOW | MEDIUM |
| F13 | Train sidebar overloaded | **P2** | MEDIUM | LOW | MEDIUM |
| F14 | Dead combat panels + zones + unread flags | **P2** | SMALL | LOW | LOW (dev) |
| F15 | Bound / fingerprint expert chrome | **P2** | SMALL | LOW | MEDIUM |
| F16 | Library skill categories ≠ Skills | **P2** | MEDIUM | LOW | MEDIUM |
| F17 | `window.alert` / mixed confirms | **P2** | SMALL | LOW | LOW |
| F18 | Trophy room vs Trophy Room; h2h ids | **P3** | SMALL | LOW | LOW |
| F19 | DiscoZonePanel / ModelsHub code names | **P3** | SMALL | LOW | LOW |
| F20 | Unused CSS | **P3** | SMALL | LOW | None |

---

## 21. Risks

- **Behaviour is currently working.** Navigation and vocabulary changes can feel like “features disappeared” if Disco or Combat is merely moved.
- **Physics firewall.** Consolidation of boxing/joust contact must not change collision groups or stepping. `npm run smoke:all` after any physics-adjacent work.
- **Simulation god-object.** A premature split of `simulation.ts` is the most likely way to destroy behaviour.
- **Share / public gallery** depends on Vercel APIs; Files UI changes must not alter payloads.
- **Secret goals** depend on silent evaluation; renaming Goal vs Secret in UI must not rename catalog ids.
- **Feature flags** currently hide unfinished systems; deleting unread flags is safe only after confirming they are not a planned gate.
- **Morph evolve** writes `Simulation.design` independently of React — any “single source of truth” project must account for this.
- **Users who know the current tab names** (including the developer) will need a short mapping, not a lecture.

---

## 22. Open Questions

1. Should **Disco** always appear as a sandbox mode, or only when Skill is Disco?
2. Should **Combat** remain a peer of Train, or live under a **Play** grouping?
3. Is **Save brain** (weights only) still needed beside **Save trained**, or can it be advanced-only?
4. Should Library stay full-bleed, or become a sidebar browser that does not drop the canvas?
5. Are `worldObjects`, `jointAngularLimits`, and `arenaChampionship` planned, or abandoned?
6. Should **Follow camera** be user-toggleable?
7. Should **Settings** exist, or is a header Help/Diagnostics control enough?
8. Is **Free** skill still the right name for “all goals, no gates”?
9. Library **skill categories** (Walking/Jumping, Boxer, Multi…) vs strip **Skills** — merge taxonomies or keep library as body-type shelves?
10. Confirm whether any external docs/share pages depend on the strings “Head-to-Head”, “Models”, or “Save current”.

---

## Appendix A — Source map (product-facing)

| Area | Primary files |
| --- | --- |
| Shell | `App.tsx`, `SandboxShell.tsx`, `ContextStrip.tsx`, `WorkspaceStatus.tsx`, `styles.css` |
| Build | `CreatureDock.tsx`, `EditorCanvas.tsx`, `editor/*`, inline inspect in `App.tsx` |
| Train | inline dock/sidebar in `App.tsx`, `TrainingSetupPanel.tsx`, `brain/*` |
| Course | `WorldDock.tsx`, `env/*` |
| Disco | `DiscoZonePanel.tsx`, `DiscoTrackLearnPanel.tsx`, `DiscoSlotsPanel.tsx`, `DiscoCurriculumPanel.tsx`, `audio/*` |
| Combat | `CombatDock.tsx`, `combat/*`, `boxing/*`, `jousting/*` |
| Library | `CreaturesPanel.tsx`, `ModelsHub.tsx`, `PublicCreationsHub.tsx`, `library/*` |
| Trophies | `TrophyCabinet.tsx`, `SecretGoalRevealOverlay.tsx`, `secrets/*` |
| Help | `TutorialPanel.tsx`, `tutorialHelpContent.ts`, `docs/TUTORIAL.md` |
| Gates | `port/featureFlags.ts` |

## Appendix B — Principles used

One concept — one name. One responsibility — one home. One capability — one authoritative implementation. Global things look global. Local things stay local. Context drives controls. Location is predictable. Common actions are easy. Rare actions do not dominate. Destructive actions are clear. Users should not have to understand the code architecture. Consistency beats cleverness. Preserve product capability.
