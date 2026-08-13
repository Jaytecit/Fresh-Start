# Solemn Sandbox — UX Conventions

Authoritative rulebook for future UI work. Derived from the product audit (`PRODUCT_STRUCTURE_AUDIT.md`). Vocabulary here is **user-facing**. Code identifiers may lag; do not leak them into labels.

If a new control disagrees with this document, change the control or update this document deliberately. Do not invent a third synonym.

---

## 1. Navigation

### Rooms vs modes

- **Rooms** are places: **Tutorial**, **Sandbox**, **Library**, **Trophies**.
- **Modes** are verbs inside Sandbox: **Build**, **Train**, **Combat**, **Disco**, **Course**.
- Header navigation must not mix a third kind of thing (help pamphlets, taxonomies, settings dumps) as peer tabs.

Header tabs (internal ids in parentheses may lag):

| Tab | Kind |
| --- | --- |
| Tutorial | Room: Tutorial |
| Build (`edit`) | Mode: Build |
| Train (`train`) | Mode: Train. Relabels to **Disco** when that skill is active |
| Combat (`h2h`) | Mode: Combat |
| Course (`world`) | Mode: Course |
| Library (`creatures`) | Room: Library |
| Trophies (`discoveries`) | Room: Trophies |

Skill / Goal / Environment live on the context strip — never as a header tab.

### Predictability

If the user knows the verb, the first click must be guessable:

| Verb | Home |
| --- | --- |
| Learn the app | Tutorial |
| Draw or edit a body | Build |
| Evolve a brain | Train |
| Fight or race | Combat |
| Dance to music | Disco |
| Author a course | Course |
| Browse or reuse work | Library |
| See unlocked secrets | Trophies |
| Change Skill / Goal / Environment | Context strip — never a separate room |

### Context must survive

- Skill, Goal, Environment, and Body/Brain/Bound stay visible in Sandbox.
- Full-bleed rooms may hide the canvas, but returning must restore the previous mode.
- Library stays full-bleed (not an overlay). It shows a compact **Workspace: Body / Brain / Bound** reminder and **Back to sandbox**.
- Switching modes must not reset Skill/Goal/Environment unless the mode *requires* an arena (Box, Joust, Disco). Those switches must be explained in the sidebar, not silent.

### Opening a mode is a view change

Tab/mode changes must not bounce the user elsewhere without saying why (today: Train with an empty body silently opens Build). If a mode cannot run, stay put, disable the primary action, and state the reason.

---

## 2. Terminology

Use the canonical vocabulary in `PRODUCT_STRUCTURE_AUDIT.md` §9. Summary of hard rules:

| Use | Do not use in UI |
| --- | --- |
| Body | Design, package, current, creature (when you mean the saved figure) |
| Brain | Genome, weights (except advanced tooltips) |
| Trained | Model, finished model |
| Skill | Zone, task family |
| Goal | Task |
| Environment / Course | World, Env, Studio |
| Build | Edit, Creature builder (in new copy) |
| Evolve / Keep training / Play best | Continue, Simulate, Playback |
| Watch speed / Train speed | Observe |
| Combat | Head-to-Head, H2H, Heat |
| Trophies / Secret | Discoveries, Achievements (unless listing trophies for a body) |
| Share | Share codes |
| Reset pose | Reset drop (except a tooltip that it respawns) |
| Clear body / Clear course | Bare “Clear” / “Clear all” |

**Creature** remains allowed in prose (“your creature pancakes”) but not as a Files noun.

**Task** may appear in developer diagnostics only.

---

## 3. Control placement

Place a control by **scope**, not by which file was convenient.

| Scope | Lives in |
| --- | --- |
| GLOBAL | Header (Immersive, later Help) |
| WORKSPACE | Context strip + status chips |
| DOCUMENT | Files column of the active mode dock |
| OBJECT | Inspect column |
| TOOL | Tools column |
| SIMULATION | Transport cluster of Train / Combat / Disco |
| VIEW | View cluster of the sim dock |
| ANALYSIS | Mode sidebar, behind progressive disclosure |
| DEVELOPER | Diagnostics / advanced; never the first row of a dock |

Controls with the same scope sit together. Do not put Save trained next to Evolve *and* again under Files.

---

## 4. Panel responsibilities

Each persistent region has one job:

| Region | Job |
| --- | --- |
| Header | Where you are; rare app-wide actions |
| Context strip | What challenge you are on |
| Status | What is loaded |
| Sidebar | Why / how / score — not a second tool belt |
| Combat sidebar | Scoreboard only (live + last result). Match start/stop and corners live in the Combat dock. |
| Canvas | The work |
| Dock | Do the work (tools or transport) + Files |
| Dialog | Decisions that need focus |
| Overlay | Tutorial jump help, secret reveal, flash notice |

If a panel’s purpose needs “and” between unrelated domains (speed **and** camera **and** export **and** inspector), split by scope, not by aesthetic columns.

Do not split a coherent domain (Course tools, Disco routing) into many tiny panels.

Mode chrome lives in dedicated files; `App.tsx` owns state and wires callbacks:

| Mode | Sidebar | Dock |
| --- | --- | --- |
| Build | `CreatureBuilderPanel` | `CreatureDock` + inspect slots |
| Train | `TrainSidebar` | `TrainDock` |
| Combat | `CombatScoreboard` | `CombatDock` |
| Disco | `DiscoSidebar` | `DiscoDock` |
| Course | `CourseSidebar` | `WorldDock` |

New buttons go in the matching panel file, not into `App.tsx` JSX.

---

## 5. Button conventions

- **One primary action** per dock: Evolve, Start match, Start dancing, Use body.
- Primary actions are the filled/default button. Everything else is secondary.
- Labels are verbs + object when the object is not obvious: **Save body**, **Save trained**, **Save course**, not bare **Save**.
- Toggleable tools use `active` on the selected tool. Mutually exclusive tools are a single group.
- Disabled controls need a tooltip (or adjacent hint) stating **why**.
- Icon-only buttons are forbidden unless the same control also has a visible text label or an accessible name that matches the canonical term.

---

## 6. Destructive actions

Irreversible loss of user work requires confirmation:

- Clear body
- Clear course
- Delete library body / trained / disco setup
- Overwrite a named library item
- Open a share that replaces the workspace body

Respawn / halt does **not** confirm:

- Reset pose
- Stop evolve / Stop match
- Pause audio
- Undo

Confirm copy must name the object and the consequence:

> Clear this body? Joints, bones, and muscles in the workspace will be removed. Library saves are kept.

Do not use `window.alert`. Prefer in-app dialogs when touching this UI; `window.confirm` is acceptable until a shared dialog exists.

Dangerous buttons use the existing `danger-ghost` (or successor) style. They never sit in the primary action slot.

---

## 7. Simulation controls

Each sim mode uses the same *slot* with mode-specific verbs:

| Slot | Train | Combat | Disco |
| --- | --- | --- | --- |
| Start | Evolve | Start match / Start pass | Play + Start dancing |
| Halt | Stop | Stop | Pause |
| Watch elite | Play best | — | Freestyle (learned) |
| Continue search | Keep training | — | Learn / Refine |
| Respawn | Reset pose | Reset pose (if offered) | Reset pose |

Do not add a fake global Play that steps physics outside these contracts.

**Watch speed** applies when not evolving. **Train speed** applies while evolving. If a speed is ignored in the current state, say so on the control (today: “after stop”).

Drive modes (Idle / Manual / Oscillate / Brain) are Train-local. Disco drive is Disco-local.

---

## 8. View controls

- Hide muscles / bones / struts, ghost pack, greenscreen: **View**, not Train-specific theology.
- Same view toggles may appear in Train and Disco; they must share labels and state.
- Camera: pan empty space, wheel zoom. Follow is automatic unless a labelled Follow toggle is added (then it is View).
- Immersive hides chrome; it is GLOBAL, not View.

---

## 9. Inspectors

- Authoring modes (Build, Course) always have an **Inspect** column.
- Empty state: “Select a joint, bone, or muscle.” / “Select an object.”
- Inspect shows properties of the **selection**, not training knobs.
- Capability / flight readiness belongs next to the body (Build or Library detail), with the same wording in both places if both exist.
- Numeric fields show units (m, s, kg-equivalent labels already used in physics copy).

---

## 10. Settings and preferences

There is no Settings room yet. Persistent preferences must still have a findable home:

| Preference | Home |
| --- | --- |
| Hover help | Tutorial **and** a header control |
| Skill / Goal | Context strip (already persisted) |
| Ghost pack, anti-scoot, recipes, raycasts, morph, telemetry | Train advanced |
| Immersive | Header |

Do not add a new `localStorage` toggle without a labelled control. Do not hide a preference only inside Tutorial if it affects the whole app.

---

## 11. Dialogs

- **Share** — create link, optional Public creations, copy, open page.
- **Confirm** — destroy / overwrite / replace workspace.
- **Secret reveal** — celebration + Collect Trophy.
- **Tutorial help** — short, with Return to tutorial.

Escape closes non-busy dialogs. Busy share states disable dismiss.

Titles use canonical nouns: **Share trained**, not **Share Creature** if the payload is trained (update when that dialog is touched).

---

## 12. Tooltips and help

- Hover help is optional and global. Default on for new users is acceptable.
- Tooltips describe **what the user will get**, not the flag or function name.
- Tutorial jumps may open a short overlay. They must not replace Tutorial copy that disagrees with the UI.
- When UI labels change, `docs/TUTORIAL.md`, `TutorialPanel`, and `tutorialHelpContent.ts` change in the same pass.

---

## 13. Units, numbers, status

- Fitness: three decimals in lists is fine; docks may use two.
- Time: seconds with `s`.
- Distance/height: metres with `m`.
- Status chips: **Body**, **Brain**, **Bound**. Bound needs a tooltip: “The brain fits this body’s muscles and sensors.”
- Unnamed bodies: “Name this body first” — keep; do not save as `custom` / `untitled`.

---

## 14. Keyboard shortcuts

Authoring modes should converge:

| Action | Shortcut |
| --- | --- |
| Undo | Ctrl/Cmd+Z (Build **and** Course) |
| Select all | Ctrl/Cmd+A (when multi-select exists) |
| Duplicate / copy | Ctrl/Cmd+D |
| Mirror | Ctrl/Cmd+M (Build) |
| Delete | Delete / Backspace |
| Cancel / deselect | Escape |
| Select tool | V (Course today; add to Build when touching shortcuts) |
| Pan | Space or Alt-drag (document both if both exist) |
| Prev / next try-out | ← → or [ ] in Train pack view |

Do not silently bind letter keys in Build that type into Name fields. Document shortcuts in Tutorial advanced and in the Tools hint row.

---

## 15. Naming in code vs UI

| UI | Acceptable code id (until renamed) |
| --- | --- |
| Combat | `h2h`, `headToHead` |
| Course | `world`, `envDesign` |
| Trophies | `discoveries` |
| Skill | `zone` legacy keys |
| Goal | `TaskId`, `activeTask` |
| Trained | `SavedModel` |
| Body | `CreaturePackage`, `design` |

New user-visible strings must not copy the code column.

---

## 16. Global vs module-specific

**Shared contract, shared UI where the concept is the same:** Files (name/save/import/export), view toggles, Reset pose, confirm-destroy, hover tips, dock collapse.

**Module-specific and proud:** Disco band routing, boxing divisions, joust scorecard, course curriculum stages, GA recipes.

Do not promote Disco routing into the header. Do not hide Save trained inside a boxing-only panel.

---

## 17. Feature flags and unfinished UI

- Unfinished behaviour stays behind `src/port/featureFlags.ts`, default off.
- A flag that is on and unread is not a product feature — it is clutter. Do not mention it in UI.
- Do not ship a second panel “just in case” the flag flips. Combat has one match UI (`CombatDock` + `CombatScoreboard`).

---

## 18. Consistency checklist (before merging UI)

- [ ] Label uses canonical vocabulary
- [ ] Control sits in the correct scope region
- [ ] Duplicate of an existing action? Extend that action instead
- [ ] Destructive → confirm; respawn → no confirm
- [ ] Disabled → reason
- [ ] Tutorial / hover tip updated if the label moved
- [ ] Same action in another mode looks and behaves the same
