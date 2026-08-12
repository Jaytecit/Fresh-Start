/**
 * Course curriculum — progressive spawn/finish windows on a base environment.
 * Extends stage training for checkpointed courses (e.g. Gauntlet + authored).
 */
import { COURSE_MARKER_DEFAULT_H, COURSE_MARKER_DEFAULT_W } from '../brain/constants';
import { orderedCheckpoints } from '../brain/courseMarkers';
import { isFeatureEnabled } from '../port/featureFlags';
import { BUILTIN_GAUNTLET_ENV_ID, gauntletEnv } from './gauntletEnv';
import {
  clampSpawn,
  cloneEnvironment,
  resolveSpawn,
  type AuthoredCourseCurriculum,
  type AuthoredCurriculumStage,
  type EnvironmentDesign,
  type EnvCourseMarker,
  type EnvSpawn,
} from './types';

export interface CourseCurriculumStage {
  id: string;
  label: string;
  /** Prefer Sprint so checkpoints + finish score. */
  goalId: 'sprint';
  spawn: EnvSpawn;
  /** Stage finish gate center. */
  finishX: number;
  finishY: number;
  /**
   * Include base checkpoints with order ≤ this value.
   * Use -1 for start→finish only (no checkpoints).
   */
  maxCheckpointOrder: number;
  /** Fitness threshold to advance after an evolve finish. */
  threshold: number;
}

export interface CourseCurriculum {
  packageId: string;
  displayName: string;
  baseEnv: () => EnvironmentDesign;
  stages: CourseCurriculumStage[];
}

/**
 * Gauntlet: progressive finish gates along the authored course.
 * Base env has start+finish only (no mid checkpoints); stages place their own finish.
 * Positions match `gauntletEnv()` (ENV_WORLD_SCALE geometry), not the pre-scale export.
 * Thresholds scale with sprint distance credit so a stage still requires reaching its gate.
 */
export const GAUNTLET_CURRICULUM: CourseCurriculum = {
  packageId: BUILTIN_GAUNTLET_ENV_ID,
  displayName: 'Gauntlet',
  baseEnv: gauntletEnv,
  stages: [
    {
      id: 'stairs',
      label: 'Clear the stairs',
      goalId: 'sprint',
      spawn: { x: 0, y: 0 },
      finishX: 200,
      finishY: 15,
      maxCheckpointOrder: -1,
      threshold: 30,
    },
    {
      id: 'tower',
      label: 'Reach the tower',
      goalId: 'sprint',
      spawn: { x: 0, y: 0 },
      finishX: 255,
      finishY: 40,
      maxCheckpointOrder: -1,
      threshold: 50,
    },
    {
      id: 'pit',
      label: 'Cross the pit',
      goalId: 'sprint',
      spawn: { x: 0, y: 0 },
      finishX: 425,
      finishY: 10,
      maxCheckpointOrder: -1,
      threshold: 70,
    },
    {
      id: 'full',
      label: 'Full gauntlet',
      goalId: 'sprint',
      spawn: { x: 0, y: 0 },
      finishX: 650,
      finishY: 7.5,
      maxCheckpointOrder: -1,
      threshold: 90,
    },
  ],
};

const BUILTIN_CURRICULA: CourseCurriculum[] = [GAUNTLET_CURRICULUM];

function finishPoseForAuthoredStage(
  env: EnvironmentDesign,
  stage: AuthoredCurriculumStage,
): { x: number; y: number } | null {
  if (stage.finishAt === 'finish') {
    const finish = (env.markers ?? []).find((m) => m.kind === 'finish');
    if (!finish) return null;
    return { x: finish.x, y: finish.y };
  }
  const order = Math.max(0, Math.floor(stage.finishAt));
  const cps = orderedCheckpoints(env.markers ?? []);
  const cp = cps.find((m) => (m.order ?? 0) === order) ?? cps[order];
  if (!cp) return null;
  return { x: cp.x, y: cp.y };
}

/** Map Studio-authored stages onto the runtime curriculum shape. */
export function courseCurriculumFromAuthored(
  env: EnvironmentDesign,
  packageId = 'authored',
): CourseCurriculum | null {
  if (!isFeatureEnabled('courseCurriculum')) return null;
  const authored = env.curriculum;
  if (!authored || authored.stages.length === 0) return null;
  const base = cloneEnvironment(env);
  // Staged windows should always see full markers from the snapshot.
  const stages: CourseCurriculumStage[] = [];
  for (const s of authored.stages) {
    const pose = finishPoseForAuthoredStage(base, s);
    if (!pose) continue;
    stages.push({
      id: s.id,
      label: s.label || 'Stage',
      goalId: 'sprint',
      spawn: s.spawn ? clampSpawn(s.spawn) : resolveSpawn(base),
      finishX: pose.x,
      finishY: pose.y,
      maxCheckpointOrder: Math.max(-1, Math.floor(s.maxCheckpointOrder)),
      threshold: Math.max(0, Number.isFinite(s.threshold) ? s.threshold : 0),
    });
  }
  if (stages.length === 0) return null;
  return {
    packageId,
    displayName: base.name || 'Course',
    baseEnv: () => cloneEnvironment(base),
    stages,
  };
}

export function curriculumForPackageId(
  packageId: string | null | undefined,
): CourseCurriculum | null {
  if (!isFeatureEnabled('courseCurriculum')) return null;
  if (!packageId) return null;
  return BUILTIN_CURRICULA.find((c) => c.packageId === packageId) ?? null;
}

/**
 * Resolve curriculum for Train: authored stages on the env win; else builtin package.
 * Pass the full (unstaged) environment when available.
 */
export function resolveCourseCurriculum(
  packageId: string | null | undefined,
  env?: EnvironmentDesign | null,
): CourseCurriculum | null {
  if (!isFeatureEnabled('courseCurriculum')) return null;
  if (env?.curriculum?.stages.length) {
    return courseCurriculumFromAuthored(env, packageId ?? 'authored');
  }
  return curriculumForPackageId(packageId);
}

/** True when Train can offer course-stage progression for this env/package. */
export function hasCourseCurriculum(
  packageId: string | null | undefined,
  env?: EnvironmentDesign | null,
): boolean {
  return resolveCourseCurriculum(packageId, env) != null;
}

export function clampAuthoredCurriculum(
  raw: AuthoredCourseCurriculum | null | undefined,
): AuthoredCourseCurriculum | undefined {
  if (!raw || !Array.isArray(raw.stages) || raw.stages.length === 0) {
    return undefined;
  }
  const stages: AuthoredCurriculumStage[] = [];
  for (const s of raw.stages) {
    if (!s || typeof s.id !== 'string') continue;
    const finishAt =
      s.finishAt === 'finish'
        ? 'finish'
        : Number.isFinite(s.finishAt)
          ? Math.max(0, Math.floor(s.finishAt as number))
          : null;
    if (finishAt === null) continue;
    stages.push({
      id: s.id,
      label: typeof s.label === 'string' && s.label.trim() ? s.label : 'Stage',
      finishAt,
      maxCheckpointOrder: Math.max(
        -1,
        Math.floor(
          Number.isFinite(s.maxCheckpointOrder) ? s.maxCheckpointOrder : -1,
        ),
      ),
      threshold: Math.max(
        0,
        Number.isFinite(s.threshold) ? s.threshold : 0,
      ),
      ...(s.spawn &&
      typeof s.spawn.x === 'number' &&
      typeof s.spawn.y === 'number'
        ? { spawn: clampSpawn(s.spawn) }
        : {}),
    });
  }
  return stages.length > 0 ? { stages } : undefined;
}

function stageFinishMarker(stage: CourseCurriculumStage): EnvCourseMarker {
  return {
    id: `curriculum_finish_${stage.id}`,
    kind: 'finish',
    x: stage.finishX,
    y: stage.finishY,
    w: COURSE_MARKER_DEFAULT_W,
    h: COURSE_MARKER_DEFAULT_H,
  };
}

/**
 * Apply a curriculum stage: spawn + start + allowed checkpoints + stage finish.
 * Keeps full obstacle/tower/region geometry from the base env.
 */
export function applyCourseCurriculumStage(
  curriculum: CourseCurriculum,
  stageIndex: number,
): EnvironmentDesign {
  const stages = curriculum.stages;
  const idx = Math.max(0, Math.min(stages.length - 1, Math.floor(stageIndex)));
  const stage = stages[idx];
  const base = cloneEnvironment(curriculum.baseEnv());
  const start = (base.markers ?? []).find((m) => m.kind === 'start');
  const checkpoints = (base.markers ?? [])
    .filter(
      (m) =>
        m.kind === 'checkpoint' &&
        (m.order ?? 0) <= stage.maxCheckpointOrder,
    )
    .map((m) => ({ ...m }));

  const markers: EnvCourseMarker[] = [];
  if (start) markers.push({ ...start });
  markers.push(...checkpoints);
  markers.push(stageFinishMarker(stage));

  return {
    ...base,
    name: `${curriculum.displayName} · ${stage.label}`,
    spawn: { ...stage.spawn },
    markers,
    // Staged window is ephemeral — do not carry nested curriculum into play/save.
    curriculum: undefined,
  };
}

export function clampCourseStageIndex(
  curriculum: CourseCurriculum,
  index: number,
): number {
  if (curriculum.stages.length === 0) return 0;
  return Math.max(0, Math.min(curriculum.stages.length - 1, Math.floor(index)));
}
