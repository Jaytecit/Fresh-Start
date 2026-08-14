# Capability ADR — Course markers (start / finish / checkpoint)

## Status

Accepted / Implemented

## Goal

Author start, checkpoint, and finish markers in Environment Studio so timed courses and completion rewards can score without new Rapier geometry.

## Design (non-Rapier)

- Schema: `EnvironmentDesign.markers: EnvCourseMarker[]` (`start` | `checkpoint` | `finish`)
- Geometry: thin vertical AABB (trigger volume) centered at `(x, y)` with size `w×h`
- **Start:** arm the course when any joint overlaps (required before finish credit if a start exists); records `startTime` and starts the race clock
- **Checkpoint:** ordered by `order` (0-based); must hit in sequence while armed
- **Finish:** grants completion when armed and all prior checkpoints hit; records `finishTime` as **race elapsed** (`simTime − startTime`), not absolute episode time
- Live HUD / Stats show READY until start, then a running race timer
- Scoring: any env that authors **both** a start and a finish pays checkpoint + flat finish bonuses on **every** goal (via `applyCourseScore`). Sprint / Motor sprint also keep a finish-time bonus. Fall keeps a progress floor on sprint travel so mid-episode climbs are not wiped by later tumbles. Finish-only or start-only layouts do not pay the shared bonus.
- Course curriculum (`courseCurriculum` flag): progressive finish windows on Gauntlet **or Studio-authored** `environment.curriculum` stages keep full geometry while moving spawn/finish
- No Rapier bodies, sensors, or collision-group changes
- Visual overlays only (editor + sim snapshot)
- Gated by `featureFlags.courseMarkers`

## Explicit non-goals

- Rapier sensors / solid finish-line colliders
- Auto-generated marker layouts from obstacles
- Replacing score regions (markers are orthogonal)

## Smoke gate

- File: `scripts/smoke-tasks.mts` — `assertCourseMarkers`
- npm script: `npm run smoke:tasks` / `smoke:all`
- Pass criteria: ordered checkpoints gate finish; finish time recorded; start+finish pays checkpoint/finish bonuses on non-sprint goals; finish-only does not; import validates kinds; flag off ignores markers

## Rollback

`featureFlags.courseMarkers = false` (authoring UI tools hidden; eval ignores `markers`).
