# Capability ADR — Score regions (penalty / reward / landing)

## Status

Accepted / Implemented

## Goal

Author axis-aligned penalty, reward, and landing regions in Environment Studio so training fitness can discourage keep-out zones, grant one-shot bonuses, and heavily reward airborne→touchdown landings — without new Rapier geometry.

## Design (non-Rapier)

- Schema: `EnvironmentDesign.regions: EnvScoreRegion[]` (`penalty` | `reward` | `landing`)
- Geometry: AABB centered at `(x, y)` with size `w×h`
- **Penalty:** time-in-zone — while any creature joint overlaps, accumulate `rate * dt`
- **Reward:** touch-once — on first overlap of a reward region, add flat `rate` once
- **Landing:** touch-once after `airTime ≥ LANDING_MIN_AIR_TIME`; foot joints preferred (else non-wheel); default rate high (`SCORE_REGION_DEFAULT_LANDING_RATE`)
- Apply: `fitness = max(0, baseFitness − penalty + reward + landing×mult)` after task base score (specialist flight goals raise `mult`)
- **End on landing:** when `featureFlags.endEpisodeOnLanding` is on, a credited landing ends that individual's try immediately (headless eval breaks; live cohort / H2H freezes the member; batch/heat ends once every member has fallen or landed and at least one landed). Not scored as a fall.
- No Rapier bodies, sensors, or collision-group changes
- Visual overlays only (editor + sim snapshot); landing uses distinct amber styling
- Gated by `featureFlags.scoreRegions` (scoring) + `featureFlags.endEpisodeOnLanding` (early stop)

## Explicit non-goals

- Rapier sensors / solid hazard colliders
- Episode-end on penalty / reward enter (landing only)
- Auto-derived pit-gap regions
- Object identity sensors in observations (loco pack stays contact/terrain, optional raycasts)

## Smoke gate

- File: `scripts/smoke-tasks.mts` — `assertScoreRegions` (+ landing airborne gate + end-on-landing)
- npm script: `npm run smoke:tasks` / `smoke:all`
- Pass criteria: penalty lowers fitness; reward raises once; landing ignored before airtime then credits once; credited landing ends episode early when flag on; import validates kinds; flag off ignores regions

## Rollback

`featureFlags.scoreRegions = false` (authoring UI tools hidden; eval ignores `regions`).
`featureFlags.endEpisodeOnLanding = false` (landing still scores; episodes run full length / fall-stop only).
