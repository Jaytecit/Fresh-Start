# Solemn Sandbox — Restructure Plan

Ordered implementation phases for the product-structure audit. **Do not start a later phase until explicitly instructed.**

Source of truth for *what* and *why*: [`PRODUCT_STRUCTURE_AUDIT.md`](./PRODUCT_STRUCTURE_AUDIT.md).  
Rules for *how UI should look* after each phase: [`UX_CONVENTIONS.md`](./UX_CONVENTIONS.md).

Physics contract is unchanged throughout: Rapier remains the sole integrator; no scattered constants; `npm run smoke:all` after physics-adjacent work. Track leftover *product features* in `TASKS.md`; this file tracks *organisation* only.

---

## Principles

1. Small migrations with a working app after every phase.
2. Copy and confirmation before shell changes; shell before code splits; code splits before physics-adjacent consolidation.
3. Never delete a system solely because search shows no imports — classify, then confirm.
4. Preserve every user-facing capability. Re-home, do not remove.
5. Prefer one authoritative implementation when two UIs do the same job.

---

## Phase 0 — Vocabulary and safety (recommended first)

**Status:** Done 2026-08-13.

**Goal:** The current shell starts speaking one language; irreversible wipes ask first.

| | |
| --- | --- |
| **Priority** | P0–P1 |
| **Effort** | SMALL |
| **Risk** | LOW |
| **Depends on** | Nothing |

**Scope**

- Replace user-visible mismatches: Save current → Save body; Head-to-head → Combat; Creatures (when meaning the tab) → Creature Library or Library; Observe → Watch speed (if touching those labels); Env → Environment where space allows; World dock label → Course (or keep World until Phase 3 and only fix docs — prefer one pass).
- Fix Disco strip hint: controls live in the Disco dock, not the Skill panel.
- Align `docs/TUTORIAL.md`, `TutorialPanel.tsx`, `tutorialHelpContent.ts`.
- Confirm **Clear** (body) and **Clear all** (course).
- Deduplicate Train evolve-row Save/Export/Share vs Files (keep one cluster).

**Files**

- `src/components/TutorialPanel.tsx`, `src/help/tutorialHelpContent.ts`, `docs/TUTORIAL.md`
- `src/components/ContextStrip.tsx`
- `src/App.tsx` (Clear handlers, Train buttons, dock labels if included)
- `src/components/WorldDock.tsx`, `src/components/WorkspaceFiles.tsx` as needed
- README quick-start strings if they still say Creatures / Head-to-head

**Must not change**

- Tab ids, feature flags, save payloads, physics, evolve, share API

**Tests before** — none automated required.  
**Tests after** — manual first-loop; `npm run smoke:all` not required unless App evolve handlers are touched beyond JSX.

**Rollback** — revert the commit.

**Checkpoint:** A new user can follow Tutorial without hitting a missing button name. Accidental Clear is recoverable via cancel.

---

## Phase 1 — Navigation grouping (labels and order)

**Status:** Done 2026-08-13.

**Goal:** Header order matches the first-session loop. Skill is no longer a peer destination.

| | |
| --- | --- |
| **Priority** | P1 |
| **Effort** | MEDIUM |
| **Risk** | MEDIUM |
| **Depends on** | Phase 0 copy so labels already match |

**Scope**

- Reorder tabs: Tutorial · Creature builder · Train · Combat · Environment builder · Creature Library · Trophy room. (Disco still skill-gated.)
- Remove **Skill** from the header rail. Move Build essentials + Feel notes into the Build sidebar (and keep GoalInfoCard where Train/Build need it).
- Skill chips remain **only** on the context strip.
- Optional: rename visible labels toward canonical (Build, Course, Library, Trophies) while **keeping internal ids** (`edit`, `world`, `creatures`, `discoveries`, `h2h`).

**Files**

- `src/App.tsx` (`sandboxTabs`, `onSandboxTabChange`, skillPanel merge)
- `src/components/SandboxShell.tsx` (`TAB_TIPS`)
- Tutorial jump buttons that target `skill`

**Must not change**

- `enterDiscoSkill` / boxing / joust enter paths, except they no longer depend on opening the Skill tab
- Full-bleed Library / Tutorial / Trophies behaviour (Phase 4)

**Tests after** — every Tutorial jump still lands; Box/Joust/Disco still enter from the strip; Combat dock still opens from Combat tab.

**Rollback** — restore Skill tab and previous order.

**Checkpoint:** Header is a plausible map. Skill is chosen on the strip.

---

## Phase 2 — Disco as a first-class mode (visual)

**Status:** Done 2026-08-13.

**Goal:** Dancing does not look like a broken Train tab.

| | |
| --- | --- |
| **Priority** | P1 |
| **Effort** | MEDIUM |
| **Risk** | MEDIUM |
| **Depends on** | Phase 1 |

**Scope**

- When Skill is Disco, the mode rail/tab selection and dock label show **Disco** as the place you are, not Train-with-a-pink-dock.
- Implementation may still use `sandboxTab === "train"` internally; do not rename ids yet.
- Sidebar content for Disco is dance help, not GA recipes.

**Must not change**

- Audio graph, record/learn, slots, curriculum behaviour

**Tests after** — disco smokes; manual record → learn → save dancer.

**Checkpoint:** Users can answer “where is Disco?” with a mode name.

---

## Phase 3 — Combat door is one door

**Status:** Done 2026-08-13.

**Goal:** Play vs train is explicit; dead panels gone.

| | |
| --- | --- |
| **Priority** | P1–P2 |
| **Effort** | SMALL–MEDIUM |
| **Risk** | LOW (UI delete) / HIGH if scoring is touched — **do not touch scoring here** |
| **Depends on** | Phase 0 |

**Scope**

- Combat sidebar becomes a scoreboard (or is emptied in favour of the dock).
- Skill Box/Joust sidebar copy: “Train this body in Train. Play a match in Combat.”
- Move `headToHeadEntriesFromModels` into `src/combat/`.
- Delete unmounted `BoxingSkillPanel.tsx`, `JoustingSkillPanel.tsx`, `HeadToHeadPanel` UI after confirming tests and smokes do not import them.
- Delete `src/zones/zones.ts` if still zero importers.

**Must not change**

- CombatDock start/stop, corner resolve, boxing/joust scoring, collision groups

**Tests after** — `npm run smoke:all` (boxing + jousting suites). Manual Combat match + Train sparring.

**Checkpoint:** One match UI. Orphan panels gone.

---

## Phase 4 — Library and help chrome

**Status:** Done 2026-08-13.

**Goal:** Collections are obvious; help is global.

| | |
| --- | --- |
| **Priority** | P1–P2 |
| **Effort** | MEDIUM |
| **Risk** | MEDIUM |
| **Depends on** | Phase 0–1 |

**Scope**

- Library shelves labelled **Bodies**, **Trained**, **Public creations** (already close).
- Hover help control in the header (in addition to Tutorial).
- Decide Library full-bleed vs overlay; default recommendation: keep full-bleed but show a compact “Workspace: Body / Brain” reminder and a **Back to sandbox** control.
- Capability panel remains on Library detail; duplicate a short readiness hint into Build Inspect later if needed (optional in this phase).

**Must not change**

- Package / saved-model schemas, share API, public gallery

**Tests after** — share smoke; manual Use body / Use trained / Open public.

---

## Phase 5 — Extract App.tsx UI (behaviour freeze)

**Status:** Done 2026-08-13.

**Goal:** App orchestrates; panels live in files.

| | |
| --- | --- |
| **Priority** | P0 (structural) but **after** user-facing nav is stable |
| **Effort** | LARGE |
| **Risk** | MEDIUM |
| **Depends on** | Phases 1–4 so extracted files match the new IA |

**Scope**

Move JSX only, props in / callbacks out:

- Build sidebar + inspector blocks → `CreatureBuilderPanel` / keep `CreatureDock`
- Train sidebar → `TrainSidebar`
- Train dock → `TrainDock`
- Course sidebar → `CourseSidebar`
- Disco composition already partial — finish wiring in one parent
- Share/file hidden inputs stay with I/O helpers

**Must not change**

- State location yet (still in App). This is not a Redux rewrite.

**Tests after** — `npm run smoke:all` plus a full manual loop (build, train, save, combat, disco, course, library, trophies, tutorial jumps).

**Rollback** — revert extract commits (keep them atomic per surface).

**Checkpoint:** `App.tsx` still owns state but is no longer the place new buttons accumulate.

---

## Phase 6 — Shared Files and View components

**Goal:** One Files pattern, one View toggle pattern.

| | |
| --- | --- |
| **Priority** | P2 |
| **Effort** | MEDIUM |
| **Risk** | LOW |
| **Depends on** | Phase 5 |

**Scope**

- Extend `WorkspaceFiles` to Course (Save course / Export / Import) and Disco payloads with typed slots.
- Shared `ViewToggles` for hide muscles/bones/struts.
- Shared confirm helper for destroy/overwrite.

**Must not change**

- JSON schemas (`jsonIO.ts` payloads)

---

## Phase 7 — Combat code consolidation

**Goal:** One contact/probe implementation; distinct scorecards.

| | |
| --- | --- |
| **Priority** | P0 |
| **Effort** | MEDIUM |
| **Risk** | HIGH |
| **Depends on** | Phase 3 (dead UI gone), ADR if collision groups change — **prefer no group change** |

**Scope**

- Lift identical opponent-contact bitmasks and hit-probe mechanics into `src/combat/` or `src/physics/` as appropriate.
- Keep `boxing/rewards.ts` and `jousting/scorecard.ts` as the rule tables.
- Single match-start helper used by App and training code.

**Must not change**

- Scores, divisions, eligibility, Rapier groups (unless an ADR says otherwise)
- Fixed-dt loop

**Tests after** — **required:** `npm run smoke:all`, especially boxing and jousting smokes. Compare scorecard fixtures if present.

**Rollback** — revert; this is the first physics-adjacent consolidation.

---

## Phase 8 — Identifier rename (optional)

**Goal:** Code ids match product language.

| | |
| --- | --- |
| **Priority** | P3 |
| **Effort** | MEDIUM |
| **Risk** | MEDIUM |
| **Depends on** | Phases 1–5 |

**Scope**

- `h2h` → `combat`, `world` tab → `course`, `discoveries` → `trophies` if cheap
- CSS class rename (`h2h-*`, leftover `zone-*`)
- `DiscoZonePanel` → `DiscoDock`

**Must not change**

- `localStorage` keys without a read-fallback (Skill already has a zone fallback — copy that pattern)

---

## Phase 9 — Simulation facade (last)

**Goal:** `simulation.ts` is a facade over mode modules.

| | |
| --- | --- |
| **Priority** | P0 structurally, **last** operationally |
| **Effort** | LARGE |
| **Risk** | HIGH |
| **Depends on** | Phase 5 and 7. Never combine with a UX redesign in the same commit. |

**Scope**

- Extract disco / boxing / joust / live-evolve facades behind the existing `Simulation` class API so App does not change.
- Document design dual-writer (React vs `this.design` during morph) before merging.

**Must not change**

- Step order, `resetForces` / `resetTorques`, determinism, unseeded random

**Tests after** — `npm run smoke:all` is mandatory. Treat any fitness drift as a blocker.

---

## Explicitly out of scope (unless product asks)

- Removing Disco, Combat, secrets, morph, recipes, or public sharing
- New Settings app
- URL routing
- Rewriting Rapier integration
- Enabling `worldObjects`, `arenaChampionship`, `jointAngularLimits` without a product decision (open questions in the audit)
- Giant-bang rewrite of `App.tsx` + `simulation.ts` together

---

## Recommended first implementation phase

Phase 0 shipped 2026-08-13 (copy, confirmation, Train Files de-duplication).
Phase 1 shipped 2026-08-13 (Skill off the header; tab order + canonical labels).
Phase 2 shipped 2026-08-13 (Disco as a first-class mode).
Phase 3 shipped 2026-08-13 (Combat door is one door).
Phase 4 shipped 2026-08-13 (Library shelves, workspace reminder, header hover help).
Phase 5 shipped 2026-08-13 (Extract App.tsx UI; state still in App).

After Phase 5 feels quiet, **Phase 6** (Shared Files and View components) is next.
