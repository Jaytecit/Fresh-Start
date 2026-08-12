/**
 * C5 — JSON import/export for creatures, trained models, and environments.
 */
import { cloneAppearance } from '../appearance/types';
import type { NetworkShape, TaskId } from '../brain/types';
import { cloneDesign, type CreatureDesign } from '../creature/types';
import { isAeroType } from '../editor/aeroValidation';
import { clampTerrain } from '../env/terrainMath';
import { clampAuthoredCurriculum } from '../env/courseCurriculum';
import { clampScoreRegion } from '../brain/scoreRegions';
import { clampCourseMarker } from '../brain/courseMarkers';
import {
  cloneEnvironment,
  defaultSpawn,
  isCourseMarkerKind,
  isEnvTheme,
  isObstacleKind,
  isScoreRegionKind,
  type EnvironmentDesign,
  type EnvCourseMarker,
  type EnvObstacle,
  type EnvScoreRegion,
  type EnvSpawn,
  type EnvTerrain,
  type EnvTower,
} from '../env/types';
import {
  clampFootMass,
  clampLaunchPadApex,
  clampWheelMass,
} from '../physics/constants';
import { clampTower } from '../physics/tower';
import {
  decodeWeights,
  encodeWeights,
  type BoxingModelMeta,
  type DanceCurriculumMeta,
  type JoustingModelMeta,
} from './savedModels';

export type JsonResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export interface CreatureExport {
  kind: 'freshstart-creature';
  version: 1;
  design: CreatureDesign;
}

export interface ModelExport {
  kind: 'freshstart-model';
  version: 1;
  name: string;
  task: TaskId;
  shape: NetworkShape;
  weightsB64: string;
  fitness: number;
  design: CreatureDesign;
  danceMeta?: DanceCurriculumMeta;
  boxingMeta?: BoxingModelMeta;
  joustingMeta?: JoustingModelMeta;
}

export interface EnvironmentExport {
  kind: 'freshstart-environment';
  version: 2;
  environment: EnvironmentDesign;
}

const TASK_IDS: ReadonlySet<string> = new Set([
  'run',
  'jump',
  'climb',
  'motor',
  'flight',
  'flight_wing',
  'flight_glider',
  'flight_para',
  'flight_height',
  'flight_distance',
  'rough',
  'sprint',
  'speed',
  'stay',
  'hang',
  'longjump',
  'clear_bar',
  'hop',
  'motor_ramp',
  'motor_gap',
  'motor_hurdles',
  'motor_sprint',
  'boxing',
  'jousting',
  'dance',
]);

function isTaskId(v: unknown): v is TaskId {
  return typeof v === 'string' && TASK_IDS.has(v);
}

function isBoxingModelMeta(v: unknown): v is BoxingModelMeta {
  if (!v || typeof v !== 'object') return false;
  const meta = v as Partial<BoxingModelMeta>;
  return (
    (meta.divisionId === 'upright' ||
      meta.divisionId === 'grounded' ||
      meta.divisionId === 'open-frame') &&
    meta.ruleVersion === 1 &&
    meta.obsPackVersion === 2 &&
    meta.brainHz === 30
  );
}

function isJoustingModelMeta(v: unknown): v is JoustingModelMeta {
  if (!v || typeof v !== 'object') return false;
  const meta = v as Partial<JoustingModelMeta>;
  return (
    meta.ruleVersion === 1 &&
    meta.obsPackVersion === 1 &&
    meta.brainHz === 30
  );
}

function isNetworkShape(v: unknown): v is NetworkShape {
  if (!v || typeof v !== 'object') return false;
  const s = v as Partial<NetworkShape>;
  return (
    typeof s.inputCount === 'number' &&
    typeof s.hiddenCount === 'number' &&
    typeof s.outputCount === 'number' &&
    typeof s.weightCount === 'number'
  );
}

export function exportCreatureJson(design: CreatureDesign): string {
  const payload: CreatureExport = {
    kind: 'freshstart-creature',
    version: 1,
    design: cloneDesign(design),
  };
  return JSON.stringify(payload, null, 2);
}

export function exportModelJson(opts: {
  name: string;
  task: TaskId;
  shape: NetworkShape;
  weights: Float32Array;
  fitness: number;
  design: CreatureDesign;
  danceMeta?: DanceCurriculumMeta;
  boxingMeta?: BoxingModelMeta;
  joustingMeta?: JoustingModelMeta;
}): string {
  const payload: ModelExport = {
    kind: 'freshstart-model',
    version: 1,
    name: opts.name,
    task: opts.task,
    shape: { ...opts.shape },
    weightsB64: encodeWeights(opts.weights),
    fitness: opts.fitness,
    design: cloneDesign(opts.design),
    ...(opts.danceMeta ? { danceMeta: { ...opts.danceMeta } } : {}),
    ...(opts.boxingMeta ? { boxingMeta: { ...opts.boxingMeta } } : {}),
    ...(opts.joustingMeta ? { joustingMeta: { ...opts.joustingMeta } } : {}),
  };
  return JSON.stringify(payload, null, 2);
}

export function importModelJson(raw: string): JsonResult<{
  name: string;
  task: TaskId;
  shape: NetworkShape;
  weights: Float32Array;
  fitness: number;
  design: CreatureDesign;
  danceMeta?: DanceCurriculumMeta;
  boxingMeta?: BoxingModelMeta;
  joustingMeta?: JoustingModelMeta;
}> {
  try {
    const data = JSON.parse(raw) as Partial<ModelExport>;
    if (data.kind !== 'freshstart-model') {
      return { ok: false, error: 'Invalid model JSON: expected freshstart-model' };
    }
    if (data.version !== 1) {
      return {
        ok: false,
        error: 'Invalid model JSON: unsupported version',
      };
    }
    if (!isTaskId(data.task) || !isNetworkShape(data.shape)) {
      return { ok: false, error: 'Invalid model JSON: bad task/shape' };
    }
    if (data.task === 'boxing' && !isBoxingModelMeta(data.boxingMeta)) {
      return {
        ok: false,
        error: 'Invalid Boxing model JSON: incompatible division/brain metadata',
      };
    }
    if (data.task === 'jousting' && !isJoustingModelMeta(data.joustingMeta)) {
      return {
        ok: false,
        error: 'Invalid Jousting model JSON: incompatible brain metadata',
      };
    }
    if (
      typeof data.shape.inputCount !== 'number' ||
      !Number.isFinite(data.shape.inputCount) ||
      typeof data.shape.hiddenCount !== 'number' ||
      !Number.isFinite(data.shape.hiddenCount) ||
      typeof data.shape.outputCount !== 'number' ||
      !Number.isFinite(data.shape.outputCount) ||
      typeof data.shape.weightCount !== 'number' ||
      !Number.isFinite(data.shape.weightCount)
    ) {
      return { ok: false, error: 'Invalid model JSON: bad task/shape' };
    }
    if (typeof data.weightsB64 !== 'string' || !data.weightsB64) {
      return { ok: false, error: 'Invalid model JSON: missing weights' };
    }
    const designResult = data.design
      ? importCreatureJson(
          JSON.stringify({
            kind: 'freshstart-creature',
            version: 1,
            design: data.design,
          }),
        )
      : { ok: false as const, error: 'Invalid model JSON: missing design' };
    if (!designResult.ok) {
      return { ok: false, error: designResult.error };
    }
    let weights: Float32Array;
    try {
      weights = decodeWeights(data.weightsB64);
    } catch {
      return { ok: false, error: 'Invalid model JSON: bad weights encoding' };
    }
    if (weights.length !== data.shape.weightCount) {
      return { ok: false, error: 'Invalid model JSON: weight count mismatch' };
    }
    return {
      ok: true,
      value: {
        name: (typeof data.name === 'string' && data.name.trim()) || 'ImportedT',
        task: data.task,
        shape: { ...data.shape },
        weights,
        fitness: typeof data.fitness === 'number' ? data.fitness : 0,
        design: designResult.value,
        ...(data.danceMeta ? { danceMeta: { ...data.danceMeta } } : {}),
        ...(data.boxingMeta ? { boxingMeta: { ...data.boxingMeta } } : {}),
        ...(data.joustingMeta ? { joustingMeta: { ...data.joustingMeta } } : {}),
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function importCreatureJson(raw: string): JsonResult<CreatureDesign> {
  try {
    const data = JSON.parse(raw) as Partial<CreatureExport> &
      Partial<ModelExport> &
      Partial<CreatureDesign>;
    // Accept creature wrapper, trained-model wrapper (design nested), or bare design.
    const design =
      (data.kind === 'freshstart-creature' || data.kind === 'freshstart-model') &&
      data.design
        ? data.design
        : (data as CreatureDesign);

    if (!design || !Array.isArray(design.joints) || !Array.isArray(design.bones)) {
      return { ok: false, error: 'Invalid creature JSON: missing joints/bones' };
    }
    if (!Array.isArray(design.muscles)) {
      return { ok: false, error: 'Invalid creature JSON: missing muscles' };
    }
    const footMassRaw = (design as { footMass?: unknown }).footMass;
    const footMass =
      typeof footMassRaw === 'number' ? clampFootMass(footMassRaw) : undefined;
    const wheelMassRaw = (design as { wheelMass?: unknown }).wheelMass;
    const wheelMass =
      typeof wheelMassRaw === 'number' ? clampWheelMass(wheelMassRaw) : undefined;

    return {
      ok: true,
      value: {
        name: design.name || 'Imported',
        joints: design.joints.map((j) => ({ ...j })),
        bones: design.bones.map((b) => {
          const next = { ...b };
          if (next.rigid !== true) delete next.rigid;
          if (next.aeroType !== undefined && !isAeroType(next.aeroType)) {
            delete next.aeroType;
          }
          if ((next.aeroArea ?? 0) <= 0) {
            delete next.aeroArea;
            delete next.aeroType;
          }
          // Rigid struts cannot host aero.
          if (next.rigid === true) {
            delete next.aeroArea;
            delete next.aeroType;
          }
          return next;
        }),
        muscles: design.muscles.map((m) => ({ ...m })).filter((m) => {
          const a = design.bones.find((b) => b.id === m.startBoneId);
          const b = design.bones.find((bb) => bb.id === m.endBoneId);
          // Drop muscles that target rigid struts (invalid after G8).
          if (a?.rigid === true || b?.rigid === true) return false;
          return true;
        }),
        appearance: cloneAppearance(design.appearance),
        ...(footMass !== undefined ? { footMass } : {}),
        ...(wheelMass !== undefined ? { wheelMass } : {}),
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function exportEnvironmentJson(environment: EnvironmentDesign): string {
  const payload: EnvironmentExport = {
    kind: 'freshstart-environment',
    version: 2,
    environment: cloneEnvironment(environment),
  };
  return JSON.stringify(payload, null, 2);
}

export function importEnvironmentJson(raw: string): JsonResult<EnvironmentDesign> {
  try {
    const data = JSON.parse(raw) as Partial<EnvironmentExport> &
      Partial<EnvironmentDesign>;
    const fileVersion =
      data.kind === 'freshstart-environment' && typeof data.version === 'number'
        ? data.version
        : 1;
    if (fileVersion < 2) {
      return {
        ok: false,
        error:
          'Environment JSON is from before the 5× world scale — rebuild in Environment Studio (v1 imports were cleared)',
      };
    }
    const environment =
      data.kind === 'freshstart-environment' && data.environment
        ? data.environment
        : (data as EnvironmentDesign);

    if (!environment || typeof environment.name !== 'string') {
      return { ok: false, error: 'Invalid environment JSON: missing name' };
    }
    if (!isEnvTheme(environment.theme ?? '')) {
      return { ok: false, error: 'Invalid environment JSON: bad theme' };
    }
    if (!Array.isArray(environment.obstacles)) {
      return { ok: false, error: 'Invalid environment JSON: missing obstacles' };
    }
    const obstacles: EnvObstacle[] = [];
    for (const raw of environment.obstacles) {
      const o = raw as Partial<EnvObstacle>;
      if (!o || typeof o.id !== 'string' || !isObstacleKind(o.kind ?? '')) {
        return { ok: false, error: 'Invalid environment JSON: bad obstacle' };
      }
      if (
        typeof o.x !== 'number' ||
        typeof o.y !== 'number' ||
        typeof o.w !== 'number' ||
        typeof o.h !== 'number'
      ) {
        return { ok: false, error: 'Invalid environment JSON: obstacle numbers' };
      }
      obstacles.push({
        id: o.id,
        kind: o.kind!,
        x: o.x,
        y: o.y,
        w: o.w,
        h: o.h,
        ...(typeof o.rot === 'number' ? { rot: o.rot } : {}),
        ...(o.kind === 'stair' && (o.ascend === 'left' || o.ascend === 'right')
          ? { ascend: o.ascend }
          : {}),
        ...(o.kind === 'pad' && typeof o.launchApex === 'number'
          ? { launchApex: o.launchApex }
          : {}),
      });
    }
    const regions: EnvScoreRegion[] = [];
    if (environment.regions !== undefined && environment.regions !== null) {
      if (!Array.isArray(environment.regions)) {
        return { ok: false, error: 'Invalid environment JSON: bad regions' };
      }
      for (const raw of environment.regions) {
        const r = raw as Partial<EnvScoreRegion>;
        if (!r || typeof r.id !== 'string' || !isScoreRegionKind(r.kind ?? '')) {
          return { ok: false, error: 'Invalid environment JSON: bad region' };
        }
        if (
          typeof r.x !== 'number' ||
          typeof r.y !== 'number' ||
          typeof r.w !== 'number' ||
          typeof r.h !== 'number' ||
          typeof r.rate !== 'number'
        ) {
          return {
            ok: false,
            error: 'Invalid environment JSON: region numbers',
          };
        }
        regions.push(
          clampScoreRegion({
            id: r.id,
            kind: r.kind!,
            x: r.x,
            y: r.y,
            w: r.w,
            h: r.h,
            rate: r.rate,
            ...(typeof r.rot === 'number' ? { rot: r.rot } : {}),
          }),
        );
      }
    }
    const markers: EnvCourseMarker[] = [];
    if (environment.markers !== undefined && environment.markers !== null) {
      if (!Array.isArray(environment.markers)) {
        return { ok: false, error: 'Invalid environment JSON: bad markers' };
      }
      for (const raw of environment.markers) {
        const m = raw as Partial<EnvCourseMarker>;
        if (!m || typeof m.id !== 'string' || !isCourseMarkerKind(m.kind ?? '')) {
          return { ok: false, error: 'Invalid environment JSON: bad marker' };
        }
        if (
          typeof m.x !== 'number' ||
          typeof m.y !== 'number' ||
          typeof m.w !== 'number' ||
          typeof m.h !== 'number'
        ) {
          return {
            ok: false,
            error: 'Invalid environment JSON: marker numbers',
          };
        }
        markers.push(
          clampCourseMarker({
            id: m.id,
            kind: m.kind!,
            x: m.x,
            y: m.y,
            w: m.w,
            h: m.h,
            ...(typeof m.rot === 'number' ? { rot: m.rot } : {}),
            ...(m.kind === 'checkpoint' && typeof m.order === 'number'
              ? { order: m.order }
              : {}),
          }),
        );
      }
    }
    let terrain: EnvTerrain | undefined;
    if (environment.terrain !== undefined && environment.terrain !== null) {
      const rawT = environment.terrain as Partial<EnvTerrain>;
      if (
        typeof rawT.startX !== 'number' ||
        typeof rawT.endX !== 'number' ||
        typeof rawT.amplitude !== 'number' ||
        !Array.isArray(rawT.samples) ||
        rawT.samples.length < 2 ||
        !rawT.samples.every((s) => typeof s === 'number' && Number.isFinite(s))
      ) {
        return { ok: false, error: 'Invalid environment JSON: bad terrain' };
      }
      terrain = {
        startX: rawT.startX,
        endX: rawT.endX,
        amplitude: rawT.amplitude,
        samples: rawT.samples.slice(),
        ...(typeof rawT.waves === 'number' && Number.isFinite(rawT.waves)
          ? { waves: rawT.waves }
          : {}),
      };
    }
    let tower: EnvTower | undefined;
    if (environment.tower !== undefined && environment.tower !== null) {
      const rawTower = environment.tower as Partial<EnvTower>;
      if (
        typeof rawTower.x !== 'number' ||
        typeof rawTower.baseW !== 'number' ||
        typeof rawTower.height !== 'number'
      ) {
        return { ok: false, error: 'Invalid environment JSON: bad tower' };
      }
      tower = {
        x: rawTower.x,
        baseW: rawTower.baseW,
        height: rawTower.height,
      };
    }
    let spawn: EnvSpawn = defaultSpawn();
    if (environment.spawn !== undefined && environment.spawn !== null) {
      const rawSpawn = environment.spawn as Partial<EnvSpawn>;
      if (typeof rawSpawn.x !== 'number' || typeof rawSpawn.y !== 'number') {
        return { ok: false, error: 'Invalid environment JSON: bad spawn' };
      }
      spawn = { x: rawSpawn.x, y: rawSpawn.y };
    }
    const curriculum = clampAuthoredCurriculum(
      environment.curriculum as Parameters<typeof clampAuthoredCurriculum>[0],
    );
    let value = cloneEnvironment({
      ...(environment as EnvironmentDesign),
      obstacles,
      regions,
      markers,
      curriculum,
      terrain,
      tower,
      spawn,
    });
    value = cloneEnvironment({
      ...value,
      obstacles: value.obstacles.map((o) =>
        o.kind === 'pad'
          ? { ...o, launchApex: clampLaunchPadApex(o.launchApex) }
          : o,
      ),
      terrain: value.terrain ? clampTerrain(value.terrain) : undefined,
      tower: value.tower ? clampTower(value.tower) : undefined,
    });
    return { ok: true, value };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
