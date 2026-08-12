/**
 * F4 / C2 — Environment design schema.
 * Obstacles: `staticObstacles` (G1 / C2.1). Terrain: `terrainHeightfield` (G3 / C2.3).
 * Tower: `launchTower` (C2.4). Score regions: C2.9 (penalty/reward AABBs, score-only).
 * Course markers: C2.10 (start/finish/checkpoint, score-only).
 * Spawn: creature offset for train/play.
 */

import {
  SPAWN_MAX_X,
  SPAWN_MAX_Y,
  SPAWN_MIN_X,
  SPAWN_MIN_Y,
} from '../physics/constants';

export type EnvTheme = 'plain' | 'dusk' | 'mint' | 'slate';

export type ObstacleKind = 'box' | 'ramp' | 'stair' | 'pit' | 'loop' | 'pad';

export const OBSTACLE_KINDS: ObstacleKind[] = [
  'box',
  'ramp',
  'stair',
  'pit',
  'loop',
  'pad',
];

/** Stair rise direction within the footprint (default right = low→high along +X). */
export type StairAscend = 'right' | 'left';

export interface EnvObstacle {
  id: string;
  kind: ObstacleKind;
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  /**
   * Stair only — which side is the lowest step.
   * Omitted → `'right'` (ascends left→right). Drag create sets from drag direction.
   */
  ascend?: StairAscend;
  /**
   * Pad only — approximate launch apex in ruler units (500…5000).
   * Omitted → default `LAUNCH_PAD_APEX_H`.
   */
  launchApex?: number;
}

export function isObstacleKind(value: string): value is ObstacleKind {
  return (OBSTACLE_KINDS as string[]).includes(value);
}

/**
 * C2.9 — score-only AABB (no Rapier).
 * Penalty: time-in-zone. Reward: touch-once. Landing: touch-once after airborne.
 */
export type ScoreRegionKind = 'penalty' | 'reward' | 'landing';

export const SCORE_REGION_KINDS: ScoreRegionKind[] = [
  'penalty',
  'reward',
  'landing',
];

export interface EnvScoreRegion {
  id: string;
  kind: ScoreRegionKind;
  /** Center X. */
  x: number;
  /** Center Y. */
  y: number;
  w: number;
  h: number;
  /** Radians; omitted → axis-aligned. */
  rot?: number;
  /**
   * Magnitude (≥ 0). Penalty: fitness / second while overlapping.
   * Reward: flat fitness bonus on first touch.
   */
  rate: number;
}

export function isScoreRegionKind(value: string): value is ScoreRegionKind {
  return (SCORE_REGION_KINDS as string[]).includes(value);
}

/**
 * C2.10 — score-only course markers (no Rapier).
 * Start arms the course; checkpoints are ordered; finish completes when armed.
 */
export type CourseMarkerKind = 'start' | 'checkpoint' | 'finish';

export const COURSE_MARKER_KINDS: CourseMarkerKind[] = [
  'start',
  'checkpoint',
  'finish',
];

export interface EnvCourseMarker {
  id: string;
  kind: CourseMarkerKind;
  /** Center X. */
  x: number;
  /** Center Y. */
  y: number;
  w: number;
  h: number;
  /** Radians; omitted → axis-aligned. */
  rot?: number;
  /** Checkpoint sequence index (0-based). Ignored for start/finish. */
  order?: number;
}

export function isCourseMarkerKind(value: string): value is CourseMarkerKind {
  return (COURSE_MARKER_KINDS as string[]).includes(value);
}

export interface EnvTerrain {
  startX: number;
  endX: number;
  samples: number[];
  amplitude: number;
  /** Procedural sine frequency; omitted on hand-drawn profiles. */
  waves?: number;
}

export interface EnvTower {
  x: number;
  baseW: number;
  height: number;
}

/** World offset applied when spawning the creature (design coords + spawn). */
export interface EnvSpawn {
  x: number;
  y: number;
}

/**
 * Authored progressive course window (Environment Studio).
 * Each stage keeps full obstacle geometry; finish/checkpoints are filtered.
 */
export interface AuthoredCurriculumStage {
  id: string;
  label: string;
  /**
   * Finish gate: checkpoint order index, or `'finish'` for the env finish marker.
   */
  finishAt: number | 'finish';
  /**
   * Include base checkpoints with order ≤ this value.
   * Use -1 for start→stage-finish only.
   */
  maxCheckpointOrder: number;
  /** Optional spawn override; default = env.spawn. */
  spawn?: EnvSpawn;
  /** Fitness threshold to advance after an evolve finish. */
  threshold: number;
}

export interface AuthoredCourseCurriculum {
  stages: AuthoredCurriculumStage[];
}

export interface EnvironmentDesign {
  name: string;
  theme: EnvTheme;
  obstacles: EnvObstacle[];
  /** C2.9 penalty / reward AABBs (score-only; optional). */
  regions?: EnvScoreRegion[];
  /** C2.10 start / finish / checkpoint markers (score-only; optional). */
  markers?: EnvCourseMarker[];
  /**
   * Optional progressive stages derived from markers (Studio “Build curriculum”).
   * Used by Train → course stages when present.
   */
  curriculum?: AuthoredCourseCurriculum;
  terrain?: EnvTerrain;
  tower?: EnvTower;
  /** Creature spawn; omitted / invalid → origin. */
  spawn?: EnvSpawn;
}

export const ENV_THEMES: EnvTheme[] = ['plain', 'dusk', 'mint', 'slate'];

export const THEME_CSS: Record<
  EnvTheme,
  { bg: string; panel: string; canvasClear: string }
> = {
  plain: { bg: '#0d121a', panel: '#151c27', canvasClear: '#0d121a' },
  dusk: { bg: '#1a1218', panel: '#241820', canvasClear: '#1a1218' },
  mint: { bg: '#0d1816', panel: '#142420', canvasClear: '#0d1816' },
  slate: { bg: '#12151a', panel: '#1a1f27', canvasClear: '#12151a' },
};

/** Sky gradient + cloud tint for parallax (render-only). */
export const THEME_SKY: Record<
  EnvTheme,
  {
    zenith: string;
    mid: string;
    horizon: string;
    haze: string;
    cloud: string;
    cloudHi: string;
    ridge: string;
  }
> = {
  plain: {
    zenith: '#0b1424',
    mid: '#1a2a42',
    horizon: '#3a4a62',
    haze: 'rgba(90, 120, 160, 0.22)',
    cloud: 'rgba(210, 220, 235, 0.22)',
    cloudHi: 'rgba(230, 235, 245, 0.28)',
    ridge: 'rgba(40, 55, 75, 0.55)',
  },
  dusk: {
    zenith: '#140c18',
    mid: '#2a1830',
    horizon: '#5a3040',
    haze: 'rgba(160, 90, 100, 0.2)',
    cloud: 'rgba(220, 180, 170, 0.2)',
    cloudHi: 'rgba(240, 200, 190, 0.26)',
    ridge: 'rgba(50, 30, 40, 0.55)',
  },
  mint: {
    zenith: '#0a1816',
    mid: '#143028',
    horizon: '#2a5048',
    haze: 'rgba(80, 140, 120, 0.2)',
    cloud: 'rgba(190, 220, 210, 0.2)',
    cloudHi: 'rgba(210, 235, 225, 0.26)',
    ridge: 'rgba(30, 50, 45, 0.55)',
  },
  slate: {
    zenith: '#0e1218',
    mid: '#1a222c',
    horizon: '#3a4555',
    haze: 'rgba(100, 115, 130, 0.2)',
    cloud: 'rgba(200, 210, 220, 0.2)',
    cloudHi: 'rgba(220, 228, 235, 0.26)',
    ridge: 'rgba(35, 42, 52, 0.55)',
  },
};

export function defaultSpawn(): EnvSpawn {
  return { x: 0, y: 0 };
}

export function clampSpawn(spawn: EnvSpawn): EnvSpawn {
  const x = Number.isFinite(spawn.x) ? spawn.x : 0;
  const y = Number.isFinite(spawn.y) ? spawn.y : 0;
  return {
    x: Math.min(SPAWN_MAX_X, Math.max(SPAWN_MIN_X, x)),
    y: Math.min(SPAWN_MAX_Y, Math.max(SPAWN_MIN_Y, y)),
  };
}

export function resolveSpawn(env: EnvironmentDesign): EnvSpawn {
  return env.spawn ? clampSpawn(env.spawn) : defaultSpawn();
}

export function flatGroundEnv(name = 'Flat Ground'): EnvironmentDesign {
  return {
    name,
    theme: 'plain',
    obstacles: [],
    regions: [],
    markers: [],
    spawn: defaultSpawn(),
  };
}

export function cloneEnvironment(env: EnvironmentDesign): EnvironmentDesign {
  return {
    name: env.name,
    theme: env.theme,
    obstacles: env.obstacles.map((o) => ({ ...o })),
    regions: (env.regions ?? []).map((r) => ({
      ...r,
      ...(typeof r.rot === 'number' ? { rot: r.rot } : {}),
    })),
    markers: (env.markers ?? []).map((m) => ({
      ...m,
      ...(typeof m.rot === 'number' ? { rot: m.rot } : {}),
    })),
    curriculum: env.curriculum
      ? {
          stages: env.curriculum.stages.map((s) => ({
            ...s,
            ...(s.spawn ? { spawn: clampSpawn(s.spawn) } : {}),
          })),
        }
      : undefined,
    terrain: env.terrain
      ? { ...env.terrain, samples: env.terrain.samples.slice() }
      : undefined,
    tower: env.tower ? { ...env.tower } : undefined,
    spawn: clampSpawn(env.spawn ?? defaultSpawn()),
  };
}

export function isEnvTheme(value: string): value is EnvTheme {
  return (ENV_THEMES as string[]).includes(value);
}
