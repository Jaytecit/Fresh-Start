/**
 * Environment Studio multi-select transforms — marquee, duplicate, rotate.
 */
import { ENV_EDITOR_GRID } from '../editor/grid';
import { clampCourseMarker } from '../brain/courseMarkers';
import { clampScoreRegion } from '../brain/scoreRegions';
import {
  markerFootprint,
  obstacleFootprint,
  regionFootprint,
  towerFootprint,
  type Footprint,
} from './envEditOps';
import type { EnvSelection } from './envSelection';
import type {
  EnvironmentDesign,
  EnvCourseMarker,
  EnvObstacle,
  EnvScoreRegion,
} from './types';

export const ENV_DUPLICATE_OFFSET = ENV_EDITOR_GRID * 2;

export type EnvSelectable = NonNullable<EnvSelection>;

let idSeq = 0;
function newId(prefix: string): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${prefix}_${Date.now().toString(36)}_${(idSeq++).toString(36)}`;
}

export function selectionKey(item: EnvSelectable): string {
  if (item.kind === 'obstacle' || item.kind === 'region' || item.kind === 'marker') {
    return `${item.kind}:${item.id}`;
  }
  return item.kind;
}

export function sameSelectable(a: EnvSelectable, b: EnvSelectable): boolean {
  return selectionKey(a) === selectionKey(b);
}

export function primarySelection(
  items: readonly EnvSelectable[],
): EnvSelectable | null {
  return items.length > 0 ? items[items.length - 1]! : null;
}

export function toggleSelectable(
  items: readonly EnvSelectable[],
  hit: EnvSelectable,
): EnvSelectable[] {
  const key = selectionKey(hit);
  const filtered = items.filter((i) => selectionKey(i) !== key);
  if (filtered.length !== items.length) return filtered;
  return [...items, hit];
}

function footprintOf(
  env: EnvironmentDesign,
  item: EnvSelectable,
): Footprint | null {
  if (item.kind === 'obstacle') {
    const o = env.obstacles.find((x) => x.id === item.id);
    return o ? obstacleFootprint(o) : null;
  }
  if (item.kind === 'region') {
    const r = (env.regions ?? []).find((x) => x.id === item.id);
    return r ? regionFootprint(r) : null;
  }
  if (item.kind === 'marker') {
    const m = (env.markers ?? []).find((x) => x.id === item.id);
    return m ? markerFootprint(m) : null;
  }
  if (item.kind === 'tower' && env.tower) return towerFootprint(env.tower);
  if (item.kind === 'spawn') {
    const s = env.spawn ?? { x: 0, y: 0 };
    return { cx: s.x, cy: s.y, hw: 0.4, hh: 0.4, rot: 0 };
  }
  return null;
}

/** Axis-aligned bounds of a (possibly rotated) footprint. */
function aabbOf(fp: Footprint): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  const c = Math.cos(fp.rot);
  const s = Math.sin(fp.rot);
  const corners: Array<[number, number]> = [
    [-fp.hw, -fp.hh],
    [fp.hw, -fp.hh],
    [fp.hw, fp.hh],
    [-fp.hw, fp.hh],
  ];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [lx, ly] of corners) {
    const x = fp.cx + lx * c - ly * s;
    const y = fp.cy + lx * s + ly * c;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  return { minX, maxX, minY, maxY };
}

export function selectableInRect(
  env: EnvironmentDesign,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): EnvSelectable[] {
  const minX = Math.min(x0, x1);
  const maxX = Math.max(x0, x1);
  const minY = Math.min(y0, y1);
  const maxY = Math.max(y0, y1);
  const out: EnvSelectable[] = [];

  const overlaps = (fp: Footprint | null): boolean => {
    if (!fp) return false;
    const b = aabbOf(fp);
    return !(b.maxX < minX || b.minX > maxX || b.maxY < minY || b.minY > maxY);
  };

  for (const o of env.obstacles) {
    if (overlaps(obstacleFootprint(o))) out.push({ kind: 'obstacle', id: o.id });
  }
  for (const r of env.regions ?? []) {
    if (overlaps(regionFootprint(r))) out.push({ kind: 'region', id: r.id });
  }
  for (const m of env.markers ?? []) {
    if (overlaps(markerFootprint(m))) out.push({ kind: 'marker', id: m.id });
  }
  if (env.tower && overlaps(towerFootprint(env.tower))) {
    out.push({ kind: 'tower' });
  }
  return out;
}

export function multiSelectionFootprint(
  env: EnvironmentDesign,
  items: readonly EnvSelectable[],
): Footprint | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let any = false;
  for (const item of items) {
    const fp = footprintOf(env, item);
    if (!fp) continue;
    const b = aabbOf(fp);
    minX = Math.min(minX, b.minX);
    maxX = Math.max(maxX, b.maxX);
    minY = Math.min(minY, b.minY);
    maxY = Math.max(maxY, b.maxY);
    any = true;
  }
  if (!any) return null;
  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    hw: Math.max(0.25, (maxX - minX) / 2),
    hh: Math.max(0.25, (maxY - minY) / 2),
    rot: 0,
  };
}

function transformPoint(
  x: number,
  y: number,
  ox: number,
  oy: number,
  angle: number,
  mirrorX: boolean,
  dx: number,
  dy: number,
): { x: number; y: number; dRot: number } {
  let lx = x - ox;
  let ly = y - oy;
  if (mirrorX) lx = -lx;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const rx = lx * c - ly * s;
  const ry = lx * s + ly * c;
  const dRot = angle + (mirrorX ? Math.PI : 0);
  return { x: ox + rx + dx, y: oy + ry + dy, dRot };
}

function mapObstacle(
  o: EnvObstacle,
  ox: number,
  oy: number,
  angle: number,
  mirrorX: boolean,
  dx: number,
  dy: number,
  newIds: boolean,
): EnvObstacle {
  const fp = obstacleFootprint(o);
  const p = transformPoint(fp.cx, fp.cy, ox, oy, angle, mirrorX, dx, dy);
  const rot = (o.rot ?? 0) + p.dRot;
  const base: EnvObstacle = {
    ...o,
    id: newIds ? newId('obs') : o.id,
    rot,
  };
  if (o.kind === 'stair') {
    return {
      ...base,
      x: p.x - o.w / 2,
      y: p.y - o.h / 2,
    };
  }
  if (o.kind === 'pit') {
    return {
      ...base,
      x: p.x,
      y: Math.max(0, p.y - o.h / 2),
    };
  }
  return { ...base, x: p.x, y: p.y };
}

function mapRegion(
  r: EnvScoreRegion,
  ox: number,
  oy: number,
  angle: number,
  mirrorX: boolean,
  dx: number,
  dy: number,
  newIds: boolean,
): EnvScoreRegion {
  const p = transformPoint(r.x, r.y, ox, oy, angle, mirrorX, dx, dy);
  return clampScoreRegion({
    ...r,
    id: newIds ? newId('region') : r.id,
    x: p.x,
    y: p.y,
    rot: (r.rot ?? 0) + p.dRot,
  });
}

function mapMarker(
  m: EnvCourseMarker,
  ox: number,
  oy: number,
  angle: number,
  mirrorX: boolean,
  dx: number,
  dy: number,
  newIds: boolean,
): EnvCourseMarker {
  const p = transformPoint(m.x, m.y, ox, oy, angle, mirrorX, dx, dy);
  return clampCourseMarker({
    ...m,
    id: newIds ? newId('marker') : m.id,
    x: p.x,
    y: p.y,
    rot: (m.rot ?? 0) + p.dRot,
  });
}

function applyTransform(
  env: EnvironmentDesign,
  items: readonly EnvSelectable[],
  angle: number,
  mirrorX: boolean,
  dx: number,
  dy: number,
  newIds: boolean,
): { env: EnvironmentDesign; items: EnvSelectable[] } {
  const fp = multiSelectionFootprint(env, items);
  if (!fp) return { env, items: [...items] };
  const ox = fp.cx;
  const oy = fp.cy;

  const obsIds = new Set(
    items.filter((i) => i.kind === 'obstacle').map((i) => (i as { id: string }).id),
  );
  const regionIds = new Set(
    items.filter((i) => i.kind === 'region').map((i) => (i as { id: string }).id),
  );
  const markerIds = new Set(
    items.filter((i) => i.kind === 'marker').map((i) => (i as { id: string }).id),
  );
  const includeTower = items.some((i) => i.kind === 'tower');

  const nextItems: EnvSelectable[] = [];
  let obstacles = env.obstacles.slice();
  let regions = (env.regions ?? []).slice();
  let markers = (env.markers ?? []).slice();
  let tower = env.tower;

  if (newIds) {
    for (const o of env.obstacles) {
      if (!obsIds.has(o.id)) continue;
      const mapped = mapObstacle(o, ox, oy, angle, mirrorX, dx, dy, true);
      obstacles.push(mapped);
      nextItems.push({ kind: 'obstacle', id: mapped.id });
    }
    for (const r of env.regions ?? []) {
      if (!regionIds.has(r.id)) continue;
      const mapped = mapRegion(r, ox, oy, angle, mirrorX, dx, dy, true);
      regions.push(mapped);
      nextItems.push({ kind: 'region', id: mapped.id });
    }
    for (const m of env.markers ?? []) {
      if (!markerIds.has(m.id)) continue;
      const mapped = mapMarker(m, ox, oy, angle, mirrorX, dx, dy, true);
      markers.push(mapped);
      nextItems.push({ kind: 'marker', id: mapped.id });
    }
    // Tower is singular — duplicate becomes a no-op (keep selection).
    if (includeTower && tower) nextItems.push({ kind: 'tower' });
  } else {
    obstacles = obstacles.map((o) => {
      if (!obsIds.has(o.id)) return o;
      const mapped = mapObstacle(o, ox, oy, angle, mirrorX, dx, dy, false);
      nextItems.push({ kind: 'obstacle', id: mapped.id });
      return mapped;
    });
    regions = regions.map((r) => {
      if (!regionIds.has(r.id)) return r;
      const mapped = mapRegion(r, ox, oy, angle, mirrorX, dx, dy, false);
      nextItems.push({ kind: 'region', id: mapped.id });
      return mapped;
    });
    markers = markers.map((m) => {
      if (!markerIds.has(m.id)) return m;
      const mapped = mapMarker(m, ox, oy, angle, mirrorX, dx, dy, false);
      nextItems.push({ kind: 'marker', id: mapped.id });
      return mapped;
    });
    if (includeTower && tower) {
      const p = transformPoint(tower.x, tower.height / 2, ox, oy, angle, mirrorX, dx, dy);
      tower = { ...tower, x: p.x };
      nextItems.push({ kind: 'tower' });
    }
  }

  return {
    env: { ...env, obstacles, regions, markers, tower },
    items: nextItems.length > 0 ? nextItems : [...items],
  };
}

export function moveSelection(
  env: EnvironmentDesign,
  items: readonly EnvSelectable[],
  dx: number,
  dy: number,
): EnvironmentDesign {
  return applyTransform(env, items, 0, false, dx, dy, false).env;
}

export function rotateSelection(
  env: EnvironmentDesign,
  items: readonly EnvSelectable[],
  angle: number,
): EnvironmentDesign {
  return applyTransform(env, items, angle, false, 0, 0, false).env;
}

export function duplicateSelection(
  env: EnvironmentDesign,
  items: readonly EnvSelectable[],
): { env: EnvironmentDesign; items: EnvSelectable[] } {
  return applyTransform(
    env,
    items,
    0,
    false,
    ENV_DUPLICATE_OFFSET,
    ENV_DUPLICATE_OFFSET,
    true,
  );
}

export function deleteSelectables(
  env: EnvironmentDesign,
  items: readonly EnvSelectable[],
): EnvironmentDesign {
  const obsIds = new Set(
    items.filter((i) => i.kind === 'obstacle').map((i) => (i as { id: string }).id),
  );
  const regionIds = new Set(
    items.filter((i) => i.kind === 'region').map((i) => (i as { id: string }).id),
  );
  const markerIds = new Set(
    items.filter((i) => i.kind === 'marker').map((i) => (i as { id: string }).id),
  );
  const dropTower = items.some((i) => i.kind === 'tower');
  const dropTerrain = items.some((i) => i.kind === 'terrain');
  let spawn = env.spawn;
  if (items.some((i) => i.kind === 'spawn')) spawn = { x: 0, y: 0 };
  return {
    ...env,
    obstacles: env.obstacles.filter((o) => !obsIds.has(o.id)),
    regions: (env.regions ?? []).filter((r) => !regionIds.has(r.id)),
    markers: (env.markers ?? []).filter((m) => !markerIds.has(m.id)),
    tower: dropTower ? undefined : env.tower,
    terrain: dropTerrain ? undefined : env.terrain,
    spawn,
  };
}
