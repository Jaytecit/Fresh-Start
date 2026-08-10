/**
 * Environment Studio helpers — course gates + authored curriculum stages.
 */
import { COURSE_MARKER_DEFAULT_H } from '../brain/constants';
import {
  clampCourseMarker,
  defaultCourseMarker,
  nextCheckpointOrder,
  orderedCheckpoints,
} from '../brain/courseMarkers';
import {
  clampSpawn,
  cloneEnvironment,
  resolveSpawn,
  type AuthoredCourseCurriculum,
  type AuthoredCurriculumStage,
  type EnvironmentDesign,
  type EnvSpawn,
} from './types';

const DEFAULT_STAGE_THRESHOLD_BASE = 6;
const DEFAULT_STAGE_THRESHOLD_STEP = 4;

function newId(prefix: string): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** Furthest useful X for a default finish gate. */
export function suggestFinishX(env: EnvironmentDesign): number {
  let maxX = 20;
  for (const o of env.obstacles) {
    maxX = Math.max(maxX, o.x + o.w / 2);
  }
  if (env.tower) {
    maxX = Math.max(maxX, env.tower.x + env.tower.baseW / 2 + 8);
  }
  if (env.terrain) {
    maxX = Math.max(maxX, env.terrain.endX);
  }
  for (const m of env.markers ?? []) {
    if (m.kind === 'checkpoint' || m.kind === 'finish') {
      maxX = Math.max(maxX, m.x);
    }
  }
  return Math.ceil(maxX + 4);
}

/**
 * Ensure a start near spawn and a finish ahead of the course.
 * Does not remove existing checkpoints.
 */
export function ensureCourseGates(env: EnvironmentDesign): EnvironmentDesign {
  const next = cloneEnvironment(env);
  const markers = [...(next.markers ?? [])].map(clampCourseMarker);
  const spawn = resolveSpawn(next);
  let start = markers.find((m) => m.kind === 'start');
  if (!start) {
    start = clampCourseMarker({
      ...defaultCourseMarker('start'),
      x: spawn.x + 2,
      y: COURSE_MARKER_DEFAULT_H / 2,
    });
    markers.push(start);
  }
  let finish = markers.find((m) => m.kind === 'finish');
  if (!finish) {
    finish = clampCourseMarker({
      ...defaultCourseMarker('finish'),
      x: suggestFinishX({ ...next, markers }),
      y: COURSE_MARKER_DEFAULT_H / 2,
    });
    markers.push(finish);
  }
  next.markers = markers;
  return next;
}

/** Append a checkpoint at x (auto order). */
export function addCheckpointAt(
  env: EnvironmentDesign,
  x: number,
  y = COURSE_MARKER_DEFAULT_H / 2,
): EnvironmentDesign {
  const next = cloneEnvironment(env);
  const markers = [...(next.markers ?? [])];
  const order = nextCheckpointOrder(markers);
  markers.push(
    clampCourseMarker({
      ...defaultCourseMarker('checkpoint'),
      x,
      y: Math.max(COURSE_MARKER_DEFAULT_H / 2, y),
      order,
    }),
  );
  next.markers = markers;
  return next;
}

/** Swap checkpoint order with neighbor (−1 earlier, +1 later). */
export function moveCheckpointOrder(
  env: EnvironmentDesign,
  checkpointId: string,
  delta: -1 | 1,
): EnvironmentDesign {
  const next = cloneEnvironment(env);
  const cps = orderedCheckpoints(next.markers ?? []);
  const idx = cps.findIndex((m) => m.id === checkpointId);
  if (idx < 0) return next;
  const swap = idx + delta;
  if (swap < 0 || swap >= cps.length) return next;
  const a = cps[idx];
  const b = cps[swap];
  const orderA = a.order ?? idx;
  const orderB = b.order ?? swap;
  next.markers = (next.markers ?? []).map((m) => {
    if (m.id === a.id) return clampCourseMarker({ ...m, order: orderB });
    if (m.id === b.id) return clampCourseMarker({ ...m, order: orderA });
    return m;
  });
  return next;
}

/** Re-number checkpoint orders 0..n-1 in current sorted order. */
export function renumberCheckpoints(env: EnvironmentDesign): EnvironmentDesign {
  const next = cloneEnvironment(env);
  const cps = orderedCheckpoints(next.markers ?? []);
  const orderById = new Map(cps.map((m, i) => [m.id, i]));
  next.markers = (next.markers ?? []).map((m) => {
    if (m.kind !== 'checkpoint') return m;
    const order = orderById.get(m.id);
    return order === undefined ? m : clampCourseMarker({ ...m, order });
  });
  return next;
}

function defaultThreshold(stageIndex: number): number {
  return DEFAULT_STAGE_THRESHOLD_BASE + stageIndex * DEFAULT_STAGE_THRESHOLD_STEP;
}

/**
 * Build progressive stages from ordered checkpoints + finish.
 * Each checkpoint becomes a stage finish; final stage uses the real finish gate.
 */
export function buildCurriculumFromMarkers(
  env: EnvironmentDesign,
): AuthoredCourseCurriculum | null {
  const gated = ensureCourseGates(env);
  const cps = orderedCheckpoints(gated.markers ?? []);
  const finish = (gated.markers ?? []).find((m) => m.kind === 'finish');
  if (!finish) return null;

  const stages: AuthoredCurriculumStage[] = [];
  cps.forEach((cp, i) => {
    stages.push({
      id: cp.id || newId('stage'),
      label: `Reach CP${i + 1}`,
      finishAt: i,
      maxCheckpointOrder: i - 1,
      threshold: defaultThreshold(i),
    });
  });
  stages.push({
    id: finish.id || newId('full'),
    label: cps.length > 0 ? 'Full course' : 'Reach finish',
    finishAt: 'finish',
    maxCheckpointOrder: cps.length > 0 ? cps.length - 1 : -1,
    threshold: defaultThreshold(stages.length),
  });

  return { stages };
}

export function clearAuthoredCurriculum(
  env: EnvironmentDesign,
): EnvironmentDesign {
  const next = cloneEnvironment(env);
  delete next.curriculum;
  return next;
}

export function patchCurriculumStage(
  env: EnvironmentDesign,
  stageId: string,
  patch: Partial<Pick<AuthoredCurriculumStage, 'label' | 'threshold' | 'spawn'>>,
): EnvironmentDesign {
  const next = cloneEnvironment(env);
  const curriculum = next.curriculum;
  if (!curriculum) return next;
  next.curriculum = {
    stages: curriculum.stages.map((s) => {
      if (s.id !== stageId) return s;
      const spawn =
        patch.spawn !== undefined
          ? patch.spawn
            ? clampSpawn(patch.spawn)
            : undefined
          : s.spawn;
      return {
        ...s,
        ...(patch.label !== undefined ? { label: patch.label } : {}),
        ...(patch.threshold !== undefined
          ? {
              threshold: Math.max(
                0,
                Number.isFinite(patch.threshold) ? patch.threshold : s.threshold,
              ),
            }
          : {}),
        ...(patch.spawn !== undefined
          ? spawn
            ? { spawn }
            : { spawn: undefined }
          : {}),
      };
    }),
  };
  return next;
}

/** Place evenly spaced checkpoints between start and finish. */
export function placeEvenCheckpoints(
  env: EnvironmentDesign,
  count: number,
): EnvironmentDesign {
  const n = Math.max(0, Math.min(12, Math.floor(count)));
  let next = ensureCourseGates(env);
  const start = (next.markers ?? []).find((m) => m.kind === 'start');
  const finish = (next.markers ?? []).find((m) => m.kind === 'finish');
  if (!start || !finish || n === 0) return next;
  // Drop existing checkpoints, keep start/finish/others.
  next.markers = (next.markers ?? []).filter((m) => m.kind !== 'checkpoint');
  const x0 = start.x;
  const x1 = finish.x;
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / (n + 1);
    const x = x0 + (x1 - x0) * t;
    next = addCheckpointAt(next, x, COURSE_MARKER_DEFAULT_H / 2);
  }
  return renumberCheckpoints(next);
}

export function courseGateSummary(env: EnvironmentDesign): {
  hasStart: boolean;
  hasFinish: boolean;
  checkpointCount: number;
  stageCount: number;
} {
  const markers = env.markers ?? [];
  return {
    hasStart: markers.some((m) => m.kind === 'start'),
    hasFinish: markers.some((m) => m.kind === 'finish'),
    checkpointCount: markers.filter((m) => m.kind === 'checkpoint').length,
    stageCount: env.curriculum?.stages.length ?? 0,
  };
}

/** Default spawn helper for stage inspector. */
export function stageSpawnOrDefault(
  stage: AuthoredCurriculumStage,
  env: EnvironmentDesign,
): EnvSpawn {
  return stage.spawn ? clampSpawn(stage.spawn) : resolveSpawn(env);
}
