/**
 * Design → render visuals for Environment Studio (no Rapier).
 * Geometry mirrors spawn in physics/obstacles.ts and physics/tower.ts.
 */
import {
  OBSTACLE_DEFAULT_RAMP_ROT,
  OBSTACLE_LOOP_SEGMENTS,
  OBSTACLE_MAX_SIZE,
  OBSTACLE_MIN_SIZE,
  OBSTACLE_STAIR_STEPS,
  TOWER_DECK_THICKNESS,
  TOWER_MIN_HEIGHT,
  TOWER_STEM_WIDTH_RATIO,
} from '../physics/constants';
import type { ObstacleVisual } from '../physics/obstacles';
import { clampTower, type TowerCuboidVisual } from '../physics/tower';
import { terrainPolyline } from './terrainMath';
import { clampScoreRegion } from '../brain/scoreRegions';
import { clampCourseMarker } from '../brain/courseMarkers';
import type {
  EnvCourseMarker,
  EnvObstacle,
  EnvScoreRegion,
  EnvTerrain,
  EnvTower,
  ObstacleKind,
} from './types';

function clampSize(v: number): number {
  if (!Number.isFinite(v)) return OBSTACLE_MIN_SIZE;
  return Math.min(OBSTACLE_MAX_SIZE, Math.max(OBSTACLE_MIN_SIZE, Math.abs(v)));
}

function pushCuboid(
  visuals: ObstacleVisual[],
  kind: ObstacleKind,
  x: number,
  y: number,
  hx: number,
  hy: number,
  rot: number,
): void {
  const safeHx = Math.max(OBSTACLE_MIN_SIZE / 2, hx);
  const safeHy = Math.max(OBSTACLE_MIN_SIZE / 2, hy);
  visuals.push({ kind, x, y, hx: safeHx, hy: safeHy, rot });
}

function rotateAround(
  px: number,
  py: number,
  ox: number,
  oy: number,
  rot: number,
): { x: number; y: number } {
  if (!rot) return { x: px, y: py };
  const dx = px - ox;
  const dy = py - oy;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return { x: ox + dx * c - dy * s, y: oy + dx * s + dy * c };
}

function previewOne(o: EnvObstacle): ObstacleVisual[] {
  const visuals: ObstacleVisual[] = [];
  switch (o.kind) {
    case 'box': {
      const w = clampSize(o.w);
      const h = clampSize(o.h);
      pushCuboid(visuals, 'box', o.x, o.y, w / 2, h / 2, o.rot ?? 0);
      break;
    }
    case 'ramp': {
      const w = clampSize(o.w);
      const h = clampSize(Math.min(o.h, o.w * 0.35));
      const rot = o.rot ?? OBSTACLE_DEFAULT_RAMP_ROT;
      pushCuboid(visuals, 'ramp', o.x, o.y, w / 2, h / 2, rot);
      break;
    }
    case 'pad': {
      const w = clampSize(o.w);
      const h = clampSize(Math.min(o.h, o.w * 0.45));
      pushCuboid(visuals, 'pad', o.x, o.y, w / 2, h / 2, o.rot ?? 0);
      break;
    }
    case 'stair': {
      const w = clampSize(o.w);
      const h = clampSize(o.h);
      const n = OBSTACLE_STAIR_STEPS;
      const stepW = w / n;
      const ox = o.x + w / 2;
      const oy = o.y + h / 2;
      const baseRot = o.rot ?? 0;
      const ascendRight = (o.ascend ?? 'right') !== 'left';
      for (let i = 0; i < n; i++) {
        const top = ((i + 1) / n) * h;
        const hy = top / 2;
        const hx = stepW / 2;
        const col = ascendRight ? i : n - 1 - i;
        const cx = o.x + (col + 0.5) * stepW;
        const cy = o.y + hy;
        const p = rotateAround(cx, cy, ox, oy, baseRot);
        pushCuboid(visuals, 'stair', p.x, p.y, hx, hy, baseRot);
      }
      break;
    }
    case 'pit': {
      const gap = clampSize(o.w);
      const wallH = clampSize(o.h);
      const platformW = Math.max(10, gap);
      const hy = wallH / 2;
      const hx = platformW / 2;
      const cy = o.y + hy;
      const baseRot = o.rot ?? 0;
      for (const cx of [o.x - gap / 2 - hx, o.x + gap / 2 + hx]) {
        const p = rotateAround(cx, cy, o.x, cy, baseRot);
        pushCuboid(visuals, 'pit', p.x, p.y, hx, hy, baseRot);
      }
      break;
    }
    case 'loop': {
      const radius = clampSize(Math.max(o.w, o.h)) / 2;
      const segments = OBSTACLE_LOOP_SEGMENTS;
      const thickness = Math.max(OBSTACLE_MIN_SIZE, radius * 0.12);
      const arc = (2 * Math.PI) / segments;
      const slabLen = radius * arc * 1.05;
      const baseRot = o.rot ?? 0;
      for (let i = 0; i < segments; i++) {
        const angle = -Math.PI / 2 + arc * (i + 0.5);
        if (Math.sin(angle) < -0.55) continue;
        const cx = o.x + radius * Math.cos(angle);
        const cy = o.y + radius * Math.sin(angle);
        const p = rotateAround(cx, cy, o.x, o.y, baseRot);
        pushCuboid(
          visuals,
          'loop',
          p.x,
          p.y,
          slabLen / 2,
          thickness / 2,
          angle + Math.PI / 2 + baseRot,
        );
      }
      break;
    }
    default:
      break;
  }
  return visuals;
}

export function previewObstacleVisuals(
  obstacles: readonly EnvObstacle[],
): ObstacleVisual[] {
  const out: ObstacleVisual[] = [];
  for (const o of obstacles) out.push(...previewOne(o));
  return out;
}

export function previewTowerVisuals(tower: EnvTower): TowerCuboidVisual[] {
  const t = clampTower(tower);
  const visuals: TowerCuboidVisual[] = [];
  const deckHy = Math.min(TOWER_DECK_THICKNESS / 2, t.height / 4);
  const deckTop = t.height;
  const deckCy = deckTop - deckHy;
  const stemTop = Math.max(deckCy - deckHy, TOWER_MIN_HEIGHT * 0.25);
  const stemHy = stemTop / 2;
  const stemHx = (t.baseW * TOWER_STEM_WIDTH_RATIO) / 2;
  const deckHx = t.baseW / 2;
  if (stemHy > 1e-4 && stemHx > 1e-4) {
    visuals.push({
      x: t.x,
      y: stemHy,
      hx: stemHx,
      hy: stemHy,
      rot: 0,
      part: 'stem',
    });
  }
  visuals.push({
    x: t.x,
    y: deckCy,
    hx: deckHx,
    hy: deckHy,
    rot: 0,
    part: 'deck',
  });
  return visuals;
}

export function previewTerrainVisual(
  terrain: EnvTerrain | undefined,
): { points: { x: number; y: number }[] } | null {
  if (!terrain || terrain.samples.length < 2) return null;
  return { points: terrainPolyline(terrain) };
}

/** C2.9 — clamped regions for editor/sim overlays. */
export function previewScoreRegions(
  regions: readonly EnvScoreRegion[] | undefined,
): EnvScoreRegion[] {
  if (!regions || regions.length === 0) return [];
  return regions.map(clampScoreRegion);
}

/** C2.10 — clamped course markers for editor/sim overlays. */
export function previewCourseMarkers(
  markers: readonly EnvCourseMarker[] | undefined,
): EnvCourseMarker[] {
  if (!markers || markers.length === 0) return [];
  return markers.map(clampCourseMarker);
}
