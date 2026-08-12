/**
 * Two-point ramp authoring — top-surface endpoints with magnetic edge snap.
 * Solves EnvObstacle fields for the existing thin-cuboid spawn model.
 */
import { ENV_EDITOR_GRID, snapToGrid } from '../editor/grid';
import {
  GROUND_Y,
  OBSTACLE_MAX_SIZE,
  OBSTACLE_MIN_SIZE,
} from '../physics/constants';
import { defaultObstacle } from '../physics/obstacles';
import {
  previewObstacleVisuals,
  previewTowerVisuals,
} from './envPreview';
import type { EnvironmentDesign, EnvObstacle } from './types';

export interface Vec2 {
  x: number;
  y: number;
}

export interface RampSnapSegment {
  a: Vec2;
  b: Vec2;
}

export interface RampSnapGeometry {
  /** Prefer these for flush junctions (corners / endpoints). */
  points: Vec2[];
  /** Horizontal/vertical (and tilted) surface edges to project onto. */
  segments: RampSnapSegment[];
}

/** Matches defaultObstacle('ramp').h — kept below spawn thickness cap via min length. */
export const DEFAULT_RAMP_DRAW_THICKNESS = 1.4;

/** World-unit magnet radius for corners / edges / ground. */
export const RAMP_SNAP_RADIUS = 2.25;

/**
 * Treat points this far below the ground plane as underground.
 * Ramps flush on y=0 still have bottom corners slightly under the plane —
 * those must not become snap magnets (they spawn invisible humps).
 */
const GROUND_SNAP_EPS = 1e-4;

/** Min run so spawn `min(h, w*0.35)` does not thin the authored slab. */
export function minRampDrawLength(
  thickness: number = DEFAULT_RAMP_DRAW_THICKNESS,
): number {
  return Math.max(OBSTACLE_MIN_SIZE, thickness / 0.35 + 1e-4);
}

/** Authored ramp top endpoints stay on/above the walkable ground plane. */
export function clampRampEndpointToGround(p: Vec2): Vec2 {
  return {
    x: p.x,
    y: Math.max(GROUND_Y, Number.isFinite(p.y) ? p.y : GROUND_Y),
  };
}

function aboveGround(p: Vec2): boolean {
  return p.y >= GROUND_Y - GROUND_SNAP_EPS;
}

/** Keep only the portion of an edge at/above the ground plane. */
function clipSegmentAboveGround(
  a: Vec2,
  b: Vec2,
): RampSnapSegment | null {
  const aOk = aboveGround(a);
  const bOk = aboveGround(b);
  if (aOk && bOk) return { a, b };
  if (!aOk && !bOk) return null;
  const dy = b.y - a.y;
  if (Math.abs(dy) < 1e-12) return null;
  const t = (GROUND_Y - a.y) / dy;
  if (t < 0 || t > 1) return null;
  const hit: Vec2 = { x: a.x + t * (b.x - a.x), y: GROUND_Y };
  return aOk ? { a, b: hit } : { a: hit, b };
}

function nearly(a: number, b: number, eps = 1e-9): boolean {
  return Math.abs(a - b) <= eps;
}

function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function pushUniquePoint(points: Vec2[], p: Vec2, eps = 1e-6): void {
  for (const q of points) {
    if (Math.abs(q.x - p.x) <= eps && Math.abs(q.y - p.y) <= eps) return;
  }
  points.push(p);
}

function pushUniqueSegment(
  segments: RampSnapSegment[],
  a: Vec2,
  b: Vec2,
  eps = 1e-6,
): void {
  if (dist2(a, b) < eps * eps) return;
  for (const s of segments) {
    const same =
      (nearly(s.a.x, a.x, eps) &&
        nearly(s.a.y, a.y, eps) &&
        nearly(s.b.x, b.x, eps) &&
        nearly(s.b.y, b.y, eps)) ||
      (nearly(s.a.x, b.x, eps) &&
        nearly(s.a.y, b.y, eps) &&
        nearly(s.b.x, a.x, eps) &&
        nearly(s.b.y, a.y, eps));
    if (same) return;
  }
  segments.push({ a, b });
}

function cuboidCorners(
  x: number,
  y: number,
  hx: number,
  hy: number,
  rot: number,
): Vec2[] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const locals: Array<[number, number]> = [
    [-hx, -hy],
    [hx, -hy],
    [hx, hy],
    [-hx, hy],
  ];
  return locals.map(([lx, ly]) => ({
    x: x + lx * c - ly * s,
    y: y + lx * s + ly * c,
  }));
}

/** Top-surface endpoints of an authored ramp cuboid (local ±hx, +hy). */
export function rampTopEndpoints(o: EnvObstacle): { a: Vec2; b: Vec2 } {
  const w = Math.min(OBSTACLE_MAX_SIZE, Math.max(OBSTACLE_MIN_SIZE, Math.abs(o.w)));
  const h = Math.min(
    OBSTACLE_MAX_SIZE,
    Math.max(OBSTACLE_MIN_SIZE, Math.abs(Math.min(o.h, o.w * 0.35))),
  );
  const rot = o.rot ?? 0;
  const hx = w / 2;
  const hy = h / 2;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return {
    a: {
      x: o.x - hx * c - hy * s,
      y: o.y - hx * s + hy * c,
    },
    b: {
      x: o.x + hx * c - hy * s,
      y: o.y + hx * s + hy * c,
    },
  };
}

/**
 * Collect magnetic snap targets from ground + spawned cuboid edges/corners
 * (obstacles + tower). Geometry matches preview/physics visuals.
 */
export function collectRampSnapGeometry(
  env: EnvironmentDesign,
): RampSnapGeometry {
  const points: Vec2[] = [];
  const segments: RampSnapSegment[] = [];

  // Infinite ground walk line — free X, locked Y.
  const groundSpan = 500;
  pushUniqueSegment(
    segments,
    { x: -groundSpan, y: GROUND_Y },
    { x: groundSpan, y: GROUND_Y },
  );

  const visuals = [
    ...previewObstacleVisuals(env.obstacles),
    ...(env.tower ? previewTowerVisuals(env.tower) : []),
  ];

  for (const v of visuals) {
    const corners = cuboidCorners(v.x, v.y, v.hx, v.hy, v.rot);
    for (const p of corners) {
      if (aboveGround(p)) pushUniquePoint(points, p);
    }
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i]!;
      const b = corners[(i + 1) % corners.length]!;
      const clipped = clipSegmentAboveGround(a, b);
      if (clipped) pushUniqueSegment(segments, clipped.a, clipped.b);
    }
  }

  return { points, segments };
}

function projectToSegment(
  p: Vec2,
  a: Vec2,
  b: Vec2,
): { point: Vec2; dist: number } {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const ab2 = abx * abx + aby * aby;
  if (ab2 < 1e-16) {
    return { point: { ...a }, dist: Math.hypot(apx, apy) };
  }
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2));
  const point = { x: a.x + t * abx, y: a.y + t * aby };
  return { point, dist: Math.hypot(p.x - point.x, p.y - point.y) };
}

export interface SnapRampEndpointOptions {
  geometry: RampSnapGeometry;
  /** Grid snap only when no magnetic hit (secondary). */
  gridSnap?: boolean;
  radius?: number;
}

/**
 * Magnetic corner → edge → (optional) grid. Corners win over edge mids so
 * platform junctions stay flush (no lip / overhang).
 */
export function snapRampEndpoint(
  x: number,
  y: number,
  opts: SnapRampEndpointOptions,
): Vec2 {
  const radius = opts.radius ?? RAMP_SNAP_RADIUS;
  const p = { x, y };
  let bestPoint: Vec2 | null = null;
  let bestDist = radius;

  for (const q of opts.geometry.points) {
    const d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d <= bestDist) {
      bestDist = d;
      bestPoint = q;
    }
  }
  if (bestPoint) return clampRampEndpointToGround(bestPoint);

  for (const seg of opts.geometry.segments) {
    const { point, dist } = projectToSegment(p, seg.a, seg.b);
    if (dist <= bestDist) {
      bestDist = dist;
      bestPoint = point;
    }
  }
  if (bestPoint) return clampRampEndpointToGround(bestPoint);

  if (opts.gridSnap) {
    return clampRampEndpointToGround(snapToGrid(x, y, true, ENV_EDITOR_GRID));
  }
  return clampRampEndpointToGround(p);
}

/**
 * Build a ramp whose top-surface ends sit exactly on A and B.
 * Order free (LTR/RTL, up/down). Returns null if too short/long.
 */
export function rampFromTopEndpoints(
  a: Vec2,
  b: Vec2,
  thickness: number = DEFAULT_RAMP_DRAW_THICKNESS,
): EnvObstacle | null {
  // Never author a top surface that dives under the infinite ground — that
  // reads as an invisible hump / single-wave bump in play.
  const aG = clampRampEndpointToGround(a);
  const bG = clampRampEndpointToGround(b);
  const dx = bG.x - aG.x;
  const dy = bG.y - aG.y;
  const len = Math.hypot(dx, dy);
  const minLen = minRampDrawLength(thickness);
  if (!(len >= minLen) || len > OBSTACLE_MAX_SIZE) return null;
  if (!Number.isFinite(thickness) || thickness < OBSTACLE_MIN_SIZE) return null;

  const rot = Math.atan2(dy, dx);
  const hy = thickness / 2;
  const midX = (aG.x + bG.x) / 2;
  const midY = (aG.y + bG.y) / 2;
  const s = Math.sin(rot);
  const c = Math.cos(rot);
  // Center = top mid − hy · n, n = (−sin, cos) = local +Y.
  const x = midX + hy * s;
  const y = midY - hy * c;

  const base = defaultObstacle('ramp');
  return {
    ...base,
    x,
    y,
    w: len,
    h: thickness,
    rot,
  };
}
