/**
 * H9 — Cosmetic cloth (Verlet panel). Render-only; never writes to Rapier.
 */
import {
  CLOTH_CONSTRAINT_ITERS,
  CLOTH_DAMPING,
  CLOTH_DEFAULT_COLOR,
  CLOTH_DEFAULT_STIFFNESS,
  CLOTH_DEFAULT_WEIGHT,
  CLOTH_GRAVITY,
  CLOTH_MAX_DT,
  CLOTH_STROKE_COLOR,
} from './clothConstants';
import { clothRestPositions } from './clothOps';
import type { ClothGarmentDef, ClothPinDef } from './types';
import type { Camera } from '../sim/Camera';
import { writeWorldToScreen } from '../sim/Camera';

export interface ClothParticle {
  x: number;
  y: number;
  px: number;
  py: number;
  pinned: boolean;
}

export interface ClothRuntime {
  garmentId: string;
  cols: number;
  rows: number;
  cellSize: number;
  particles: ClothParticle[];
  /** Structural + shear rest lengths parallel to particles edges. */
  constraints: { a: number; b: number; rest: number }[];
}

export type ClothPoseSource = {
  joints: { id: number; x: number; y: number }[];
  bones: {
    id: number;
    x: number;
    y: number;
    angle: number;
    halfLength: number;
  }[];
};

const runtimes = new Map<string, ClothRuntime>();

export function resetClothStates(prefix?: string): void {
  if (!prefix) {
    runtimes.clear();
    return;
  }
  for (const key of [...runtimes.keys()]) {
    if (key.startsWith(prefix)) runtimes.delete(key);
  }
}

function buildConstraints(
  cols: number,
  rows: number,
  cellSize: number,
): ClothRuntime['constraints'] {
  const constraints: ClothRuntime['constraints'] = [];
  const idx = (r: number, c: number) => r * cols + c;
  const shear = cellSize * Math.SQRT2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = idx(r, c);
      if (c + 1 < cols) {
        constraints.push({ a: i, b: idx(r, c + 1), rest: cellSize });
      }
      if (r + 1 < rows) {
        constraints.push({ a: i, b: idx(r + 1, c), rest: cellSize });
      }
      if (c + 1 < cols && r + 1 < rows) {
        constraints.push({ a: i, b: idx(r + 1, c + 1), rest: shear });
        constraints.push({ a: idx(r, c + 1), b: idx(r + 1, c), rest: shear });
      }
    }
  }
  return constraints;
}

function ensureRuntime(key: string, garment: ClothGarmentDef): ClothRuntime {
  let rt = runtimes.get(key);
  const count = garment.cols * garment.rows;
  if (
    !rt ||
    rt.garmentId !== garment.id ||
    rt.cols !== garment.cols ||
    rt.rows !== garment.rows ||
    Math.abs(rt.cellSize - garment.cellSize) > 1e-6 ||
    rt.particles.length !== count
  ) {
    const rest = clothRestPositions(garment);
    const pinSet = new Set(garment.pins.map((p) => p.particleIndex));
    rt = {
      garmentId: garment.id,
      cols: garment.cols,
      rows: garment.rows,
      cellSize: garment.cellSize,
      particles: rest.map((p, i) => ({
        x: p.x,
        y: p.y,
        px: p.x,
        py: p.y,
        pinned: pinSet.has(i),
      })),
      constraints: buildConstraints(garment.cols, garment.rows, garment.cellSize),
    };
    runtimes.set(key, rt);
  } else {
    const pinSet = new Set(garment.pins.map((p) => p.particleIndex));
    for (let i = 0; i < rt.particles.length; i++) {
      rt.particles[i]!.pinned = pinSet.has(i);
    }
  }
  return rt;
}

export function resolveClothPinWorld(
  pose: ClothPoseSource,
  pin: ClothPinDef,
): { x: number; y: number } | null {
  if (pin.boneId !== undefined) {
    const bone = pose.bones.find((b) => b.id === pin.boneId);
    if (!bone) return null;
    const baseAngle = bone.angle + Math.PI / 2;
    const t = Math.min(1, Math.max(0, pin.along ?? 0.5));
    const alongOff = (t - 0.5) * bone.halfLength * 2;
    const ax = Math.cos(baseAngle);
    const ay = Math.sin(baseAngle);
    return {
      x: bone.x + ax * alongOff + (pin.offsetX ?? 0),
      y: bone.y + ay * alongOff + (pin.offsetY ?? 0),
    };
  }
  if (pin.jointId !== undefined) {
    const joint = pose.joints.find((j) => j.id === pin.jointId);
    if (!joint) return null;
    return {
      x: joint.x + (pin.offsetX ?? 0),
      y: joint.y + (pin.offsetY ?? 0),
    };
  }
  return null;
}

function applyPins(
  rt: ClothRuntime,
  garment: ClothGarmentDef,
  pose: ClothPoseSource,
): void {
  for (const pin of garment.pins) {
    const world = resolveClothPinWorld(pose, pin);
    if (!world) continue;
    const p = rt.particles[pin.particleIndex];
    if (!p) continue;
    p.x = world.x;
    p.y = world.y;
    p.px = world.x;
    p.py = world.y;
    p.pinned = true;
  }
}

function satisfyConstraints(rt: ClothRuntime, iters: number): void {
  const n = Math.max(1, Math.min(16, Math.round(iters)));
  for (let iter = 0; iter < n; iter++) {
    for (const c of rt.constraints) {
      const a = rt.particles[c.a]!;
      const b = rt.particles[c.b]!;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.hypot(dx, dy);
      if (dist < 1e-8) {
        dx = c.rest;
        dy = 0;
        dist = c.rest;
      }
      const diff = (dist - c.rest) / dist;
      const bothFree = !a.pinned && !b.pinned;
      const share = bothFree ? 0.5 : 1;
      if (!a.pinned) {
        a.x += dx * diff * share;
        a.y += dy * diff * share;
      }
      if (!b.pinned) {
        b.x -= dx * diff * share;
        b.y -= dy * diff * share;
      }
    }
  }
}

/**
 * Step one garment. Returns particle positions for drawing.
 */
export function stepClothGarment(
  key: string,
  garment: ClothGarmentDef,
  pose: ClothPoseSource,
  dtRaw: number,
): ClothRuntime {
  const dt = Math.min(CLOTH_MAX_DT, Math.max(1 / 240, dtRaw));
  const rt = ensureRuntime(key, garment);
  applyPins(rt, garment, pose);

  const weight = garment.weight ?? CLOTH_DEFAULT_WEIGHT;
  const stiffness = garment.stiffness ?? CLOTH_DEFAULT_STIFFNESS;
  // Heavier cloth also damps a bit more so it doesn't flutter wildly.
  const damp = Math.exp(-CLOTH_DAMPING * (0.75 + 0.25 * weight) * dt);
  const gravity = CLOTH_GRAVITY * weight;
  for (const p of rt.particles) {
    if (p.pinned) continue;
    const vx = (p.x - p.px) * damp;
    const vy = (p.y - p.py) * damp;
    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy + gravity * dt * dt;
  }

  applyPins(rt, garment, pose);
  // Finer meshes need a few more iterations to stay near rest lengths.
  const densityBoost = 1 + Math.log2(Math.max(4, garment.cols * garment.rows)) / 8;
  satisfyConstraints(rt, CLOTH_CONSTRAINT_ITERS * stiffness * densityBoost);
  applyPins(rt, garment, pose);
  return rt;
}

/** Editor / static preview: rest grid with pins snapped to design pose. */
export function previewClothGarment(
  garment: ClothGarmentDef,
  pose: ClothPoseSource,
): { x: number; y: number }[] {
  const rest = clothRestPositions(garment);
  for (const pin of garment.pins) {
    const world = resolveClothPinWorld(pose, pin);
    if (!world) continue;
    const p = rest[pin.particleIndex];
    if (p) {
      p.x = world.x;
      p.y = world.y;
    }
  }
  // Cape-style hang preview when exactly two top-edge pins; coverings keep grid.
  if (garment.pins.length === 2) {
    const a = resolveClothPinWorld(pose, garment.pins[0]!);
    const b = resolveClothPinWorld(pose, garment.pins[1]!);
    const topPins =
      a &&
      b &&
      garment.pins.every((p) => p.particleIndex < garment.cols);
    if (a && b && topPins) {
      for (let r = 0; r < garment.rows; r++) {
        for (let c = 0; c < garment.cols; c++) {
          const i = r * garment.cols + c;
          if (garment.pins.some((p) => p.particleIndex === i)) continue;
          const t = garment.cols <= 1 ? 0 : c / (garment.cols - 1);
          const topX = a.x + (b.x - a.x) * t;
          const topY = a.y + (b.y - a.y) * t;
          rest[i] = {
            x: topX,
            y: topY - r * garment.cellSize,
          };
        }
      }
    }
  }
  return rest;
}

const _scrA = { x: 0, y: 0 };
const _scrB = { x: 0, y: 0 };
const _scrC = { x: 0, y: 0 };

export function drawClothMesh(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  cols: number,
  rows: number,
  particles: { x: number; y: number }[],
  color?: string,
  selected = false,
): void {
  if (particles.length < cols * rows || cols < 2 || rows < 2) return;
  const fill = color ?? CLOTH_DEFAULT_COLOR;
  ctx.save();
  ctx.globalAlpha = selected ? 1 : 0.95;
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const i00 = r * cols + c;
      const i10 = i00 + 1;
      const i01 = i00 + cols;
      const i11 = i01 + 1;
      const p00 = particles[i00]!;
      const p10 = particles[i10]!;
      const p01 = particles[i01]!;
      const p11 = particles[i11]!;
      writeWorldToScreen(cam, w, h, p00.x, p00.y, _scrA);
      writeWorldToScreen(cam, w, h, p10.x, p10.y, _scrB);
      writeWorldToScreen(cam, w, h, p11.x, p11.y, _scrC);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.moveTo(_scrA.x, _scrA.y);
      ctx.lineTo(_scrB.x, _scrB.y);
      ctx.lineTo(_scrC.x, _scrC.y);
      ctx.closePath();
      ctx.fill();
      writeWorldToScreen(cam, w, h, p00.x, p00.y, _scrA);
      writeWorldToScreen(cam, w, h, p11.x, p11.y, _scrB);
      writeWorldToScreen(cam, w, h, p01.x, p01.y, _scrC);
      ctx.beginPath();
      ctx.moveTo(_scrA.x, _scrA.y);
      ctx.lineTo(_scrB.x, _scrB.y);
      ctx.lineTo(_scrC.x, _scrC.y);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.strokeStyle = selected ? '#f0c040' : CLOTH_STROKE_COLOR;
  ctx.lineWidth = selected ? 1.6 : 1;
  ctx.lineJoin = 'round';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = particles[r * cols + c]!;
      const b = particles[r * cols + c + 1]!;
      writeWorldToScreen(cam, w, h, a.x, a.y, _scrA);
      writeWorldToScreen(cam, w, h, b.x, b.y, _scrB);
      ctx.beginPath();
      ctx.moveTo(_scrA.x, _scrA.y);
      ctx.lineTo(_scrB.x, _scrB.y);
      ctx.stroke();
    }
  }
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows - 1; r++) {
      const a = particles[r * cols + c]!;
      const b = particles[(r + 1) * cols + c]!;
      writeWorldToScreen(cam, w, h, a.x, a.y, _scrA);
      writeWorldToScreen(cam, w, h, b.x, b.y, _scrB);
      ctx.beginPath();
      ctx.moveTo(_scrA.x, _scrA.y);
      ctx.lineTo(_scrB.x, _scrB.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawClothPinMarkers(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  garment: ClothGarmentDef,
  particles: { x: number; y: number }[],
): void {
  ctx.fillStyle = '#f0c040';
  ctx.strokeStyle = '#2a3340';
  ctx.lineWidth = 1.5;
  for (const pin of garment.pins) {
    const p = particles[pin.particleIndex];
    if (!p) continue;
    writeWorldToScreen(cam, w, h, p.x, p.y, _scrA);
    ctx.beginPath();
    ctx.arc(_scrA.x, _scrA.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}
