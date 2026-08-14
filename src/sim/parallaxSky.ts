/**
 * C2.7 — parallax sky / clouds for directional travel cues (render-only).
 * Deterministic layout (no Math.random). Scrolls on BOTH camera axes so
 * horizontal and vertical travel stay readable at any height / framing.
 */
import type { EnvTheme } from '../env/types';
import { THEME_SKY } from '../env/types';
import { GROUND_Y } from '../physics/constants';
import { worldToScreen, type Camera } from './Camera';

function hash01(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function wrap(v: number, period: number): number {
  const m = ((v % period) + period) % period;
  return m;
}

function withAlpha(rgba: string, a: number): string {
  return rgba.replace(/[\d.]+\)$/, `${a})`);
}

/** Inclusive tile indices so wrapped sprites cover [min, max] screen range. */
function tileRange(
  origin: number,
  period: number,
  min: number,
  max: number,
): { k0: number; k1: number } {
  return {
    k0: Math.floor((min - origin) / period),
    k1: Math.ceil((max - origin) / period),
  };
}

function drawCloudBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  fill: string,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, 28 * scale, 12 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 18 * scale, y + 2 * scale, 16 * scale, 9 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 20 * scale, y + 1 * scale, 18 * scale, 10 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 4 * scale, y - 8 * scale, 14 * scale, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Soft star / dust mote — readable altitude cue when looking up. */
function drawMote(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill: string,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Always-positive ridge height so valleys sit on the horizon, not under it. */
function ridgeLift(
  wx: number,
  floor: number,
  amp: number,
  f0: number,
  f1: number,
  f2: number,
  phase: number,
): number {
  const a = Math.abs(Math.sin(wx * f0 + phase));
  const b = Math.abs(Math.sin(wx * f1 + phase * 1.7));
  const c = Math.abs(Math.sin(wx * f2 + phase * 0.4));
  const shape = Math.pow(a, 0.62) * 0.52 + Math.pow(b, 0.7) * 0.33 + c * 0.15;
  return floor + amp * shape;
}

function drawRidgeBand(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  groundY: number,
  shift: number,
  period: number,
  step: number,
  fill: string,
  heightAt: (wx: number) => number,
): void {
  const closeY = Math.min(h, Math.max(groundY, 0));
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, closeY);
  for (let x = -period; x <= w + period; x += step) {
    ctx.lineTo(x, groundY - heightAt(x + shift));
  }
  ctx.lineTo(w, closeY);
  ctx.lineTo(0, closeY);
  ctx.closePath();
  ctx.fill();
}

function drawPine(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  height: number,
  fill: string,
): void {
  const trunkH = height * 0.16;
  const trunkW = Math.max(1.6, height * 0.055);
  ctx.fillStyle = fill;
  ctx.fillRect(x - trunkW * 0.5, baseY - trunkH, trunkW, trunkH);
  for (let i = 0; i < 3; i++) {
    const t = i / 3;
    const top = baseY - height + t * height * 0.42;
    const bottom = baseY - trunkH * 0.4 - (2 - i) * height * 0.1;
    const half = height * (0.2 + t * 0.17);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x + half, bottom);
    ctx.lineTo(x - half, bottom);
    ctx.closePath();
    ctx.fill();
  }
}

function drawRoundTree(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  height: number,
  fill: string,
): void {
  const trunkH = height * 0.34;
  const trunkW = Math.max(1.8, height * 0.07);
  ctx.fillStyle = fill;
  ctx.fillRect(x - trunkW * 0.5, baseY - trunkH, trunkW, trunkH);
  const r = height * 0.36;
  const cy = baseY - trunkH - r * 0.28;
  ctx.beginPath();
  ctx.ellipse(x, cy, r, r * 0.82, 0, 0, Math.PI * 2);
  ctx.ellipse(x - r * 0.48, cy + r * 0.18, r * 0.52, r * 0.48, 0, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.42, cy + r * 0.2, r * 0.48, r * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBush(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  size: number,
  fill: string,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, baseY - size * 0.38, size * 0.72, size * 0.46, 0, 0, Math.PI * 2);
  ctx.ellipse(x - size * 0.48, baseY - size * 0.24, size * 0.4, size * 0.3, 0, 0, Math.PI * 2);
  ctx.ellipse(x + size * 0.44, baseY - size * 0.22, size * 0.38, size * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
}

type SkySpriteLayer = {
  px: number;
  py: number;
  periodX: number;
  periodY: number;
  count: number;
  scale: number;
  fill: string;
  salt: number;
  kind: 'cloud' | 'mote';
  /** Cloud field sits on this screen Y and wraps upward (peak height). */
  anchorY?: number;
  /** Skip cloud sprites below this screen Y so they are not buried in ridges. */
  maxY?: number;
};

function drawSkySprites(
  ctx: CanvasRenderingContext2D,
  w: number,
  fh: number,
  scrollX: number,
  scrollY: number,
  layers: SkySpriteLayer[],
): void {
  for (const layer of layers) {
    const shiftX = -scrollX * layer.px;
    const shiftY = -scrollY * layer.py;
    for (let i = 0; i < layer.count; i++) {
      const u = hash01(i, layer.salt);
      const v = hash01(i, layer.salt + 9);
      const baseX = u * layer.periodX;
      const baseY = v * layer.periodY;
      const x0 = wrap(baseX + shiftX, layer.periodX);
      const y0 = wrap(baseY + shiftY, layer.periodY);
      const ox = x0 - 60;
      // Anchor clouds on the peak band so rows stack into the sky, not the horizon.
      const oy = layer.anchorY != null ? layer.anchorY - y0 : y0 - 40;
      const { k0: kx0, k1: kx1 } = tileRange(ox, layer.periodX, -140, w + 140);
      const { k0: ky0, k1: ky1 } = tileRange(oy, layer.periodY, -100, fh + 100);
      for (let kx = kx0; kx <= kx1; kx++) {
        for (let ky = ky0; ky <= ky1; ky++) {
          const sx = ox + kx * layer.periodX;
          const sy = oy + ky * layer.periodY;
          if (sx < -140 || sx > w + 140 || sy < -100 || sy > fh + 100) continue;
          if (layer.kind === 'cloud') {
            if (layer.maxY != null && sy > layer.maxY) continue;
            const sc = layer.scale * (0.7 + hash01(i, layer.salt + 3) * 0.6);
            drawCloudBlob(ctx, sx, sy, sc, layer.fill);
          } else {
            const r = 1.2 + hash01(i, layer.salt + 5) * 2.2;
            drawMote(ctx, sx, sy, r, layer.fill);
          }
        }
      }
    }
  }
}

function drawVegetationLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  groundY: number,
  scrollX: number,
  px: number,
  period: number,
  count: number,
  salt: number,
  sizeMul: number,
  fill: string,
): void {
  const shift = wrap(-scrollX * px, period);
  for (let i = 0; i < count; i++) {
    if (hash01(i, salt + 1) < 0.2) continue;
    const u = hash01(i, salt);
    const x0 = wrap(u * period + shift, period) - 36;
    const kind = hash01(i, salt + 2);
    const size = (0.62 + hash01(i, salt + 3) * 0.55) * sizeMul;
    const { k0, k1 } = tileRange(x0, period, -70, w + 70);
    for (let k = k0; k <= k1; k++) {
      const sx = x0 + k * period;
      if (sx < -50 || sx > w + 50) continue;
      if (kind < 0.4) drawPine(ctx, sx, groundY, 36 * size, fill);
      else if (kind < 0.72) drawRoundTree(ctx, sx, groundY, 30 * size, fill);
      else drawBush(ctx, sx, groundY, 15 * size, fill);
    }
  }
}

/**
 * Fill sky gradient + layered ridges / clouds / motes scrolled by camera X & Y.
 * Draw order: sky → behind clouds → far ridges → mid clouds → mid ridges →
 * front clouds / motes → vegetation → haze. Clouds sit at peak height and above.
 */
export function drawParallaxSky(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  theme: EnvTheme = 'plain',
): void {
  const sky = THEME_SKY[theme] ?? THEME_SKY.plain;
  const inset = Math.max(0, cam.insetBottom ?? 0);
  const fh = Math.max(1, h - inset);
  // Horizon in screen space — ridges sit on this line so drawGround cannot bury them.
  const groundY = worldToScreen(cam, w, h, 0, GROUND_Y).y;
  // Visible sky above the ground line; peaks scale with this so they read in-frame.
  const skyH = Math.max(1, Math.min(fh, Math.max(0, groundY)));

  // Keep travel cues zoom-stable: scroll in screen-px of world motion, not zoomed world.
  const scrollX = cam.x * 18;
  const scrollY = cam.y * 18;

  const g = ctx.createLinearGradient(0, 0, 0, fh);
  // Shift gradient stops with altitude so zenith/horizon read while climbing.
  const yBias = Math.min(0.35, Math.max(-0.12, (cam.y - 6) * 0.004));
  g.addColorStop(0, sky.zenith);
  g.addColorStop(Math.min(0.95, 0.42 + yBias), sky.mid);
  g.addColorStop(Math.min(0.98, 0.78 + yBias * 0.5), sky.horizon);
  g.addColorStop(1, sky.haze);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Far peaks sit this far above the horizon; clouds anchor here and wrap upward.
  const farAmp = skyH * 0.52;
  const farPeakY = groundY - farAmp;
  const behindAnchorY = farPeakY + skyH * 0.08;
  const midCloudAnchorY = farPeakY;
  const frontAnchorY = farPeakY - skyH * 0.08;

  // Distant clouds behind the ranges — larger, slower, faded; peek around peaks.
  drawSkySprites(ctx, w, fh, scrollX, scrollY, [
    {
      px: 0.05,
      py: 0.04,
      periodX: 1180,
      periodY: 520,
      count: 7,
      scale: 1.55,
      fill: withAlpha(sky.cloud, 0.15),
      salt: 1,
      kind: 'cloud',
      anchorY: behindAnchorY,
      maxY: behindAnchorY + skyH * 0.06,
    },
  ]);

  // Far ridges — valleys stay on the horizon; peaks rise well into the sky band.
  const farPeriod = 520;
  const farShift = wrap(-scrollX * 0.08, farPeriod);
  const farFloor = skyH * 0.04;
  drawRidgeBand(
    ctx,
    w,
    h,
    groundY,
    farShift,
    farPeriod,
    28,
    sky.ridge,
    (wx) => ridgeLift(wx, farFloor, farAmp, 0.0072, 0.016, 0.038, 0.4),
  );

  // Mid clouds between the two ranges, sitting on the far peak line.
  drawSkySprites(ctx, w, fh, scrollX, scrollY, [
    {
      px: 0.12,
      py: 0.08,
      periodX: 980,
      periodY: 440,
      count: 6,
      scale: 1.2,
      fill: sky.cloud,
      salt: 2,
      kind: 'cloud',
      anchorY: midCloudAnchorY,
      maxY: midCloudAnchorY + 12,
    },
  ]);

  // Mid ridges (stronger X cue), shorter, in front of the far range.
  const midPeriod = 380;
  const midShift = wrap(-scrollX * 0.18, midPeriod);
  const midFloor = skyH * 0.015;
  const midAmp = skyH * 0.26;
  drawRidgeBand(
    ctx,
    w,
    h,
    groundY,
    midShift,
    midPeriod,
    22,
    withAlpha(sky.ridge, 0.42),
    (wx) => ridgeLift(wx, midFloor, midAmp, 0.012, 0.028, 0.06, 1.3),
  );

  // Higher / nearer clouds in front of the ranges, plus altitude motes.
  drawSkySprites(ctx, w, fh, scrollX, scrollY, [
    {
      px: 0.28,
      py: 0.18,
      periodX: 720,
      periodY: 400,
      count: 7,
      scale: 0.9,
      fill: sky.cloudHi,
      salt: 3,
      kind: 'cloud',
      anchorY: frontAnchorY,
      maxY: frontAnchorY + 8,
    },
    {
      px: 0.42,
      py: 0.26,
      periodX: 540,
      periodY: 340,
      count: 8,
      scale: 0.7,
      fill: sky.cloudHi,
      salt: 4,
      kind: 'cloud',
      anchorY: frontAnchorY - skyH * 0.06,
      maxY: frontAnchorY,
    },
    {
      px: 0.2,
      py: 0.32,
      periodX: 640,
      periodY: 480,
      count: 28,
      scale: 1,
      fill: withAlpha(sky.cloudHi, 0.35),
      salt: 11,
      kind: 'mote',
    },
    {
      px: 0.55,
      py: 0.45,
      periodX: 420,
      periodY: 360,
      count: 36,
      scale: 1,
      fill: withAlpha(sky.cloud, 0.28),
      salt: 12,
      kind: 'mote',
    },
  ]);

  // Treeline / bushes along the horizon (in front of ridges, behind the ground fill).
  if (groundY > 8 && groundY < h + 80) {
    const vegScale = Math.min(1.25, Math.max(0.7, skyH / 520));
    drawVegetationLayer(
      ctx,
      w,
      groundY,
      scrollX,
      0.32,
      340,
      16,
      21,
      0.82 * vegScale,
      sky.foliage,
    );
    drawVegetationLayer(
      ctx,
      w,
      groundY,
      scrollX,
      0.48,
      260,
      12,
      31,
      1.08 * vegScale,
      sky.foliageHi,
    );
  }

  // Near haze streaks — strongest horizontal motion cue near the horizon band.
  const streakPeriod = 280;
  const streakShift = wrap(-scrollX * 0.65, streakPeriod);
  const streakYBase = Math.min(fh * 0.62, groundY - 40) + scrollY * 0.02;
  ctx.strokeStyle = sky.haze;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 14; i++) {
    const u = hash01(i, 77);
    const y = streakYBase + (u - 0.5) * fh * 0.2;
    if (y < 0 || y > Math.min(fh, groundY)) continue;
    const x = wrap(u * streakPeriod + streakShift, streakPeriod) - 40;
    const { k0, k1 } = tileRange(x, streakPeriod, -80, w + 80);
    for (let k = k0; k <= k1; k++) {
      const sx = x + k * streakPeriod;
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.lineTo(sx + 36 + u * 40, y + (hash01(i, 78) - 0.5) * 4);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
