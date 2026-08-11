/**
 * C2.7 — parallax sky / clouds for directional travel cues (render-only).
 * Deterministic layout (no Math.random). Scrolls on BOTH camera axes so
 * horizontal and vertical travel stay readable at any height / framing.
 */
import type { EnvTheme } from '../env/types';
import { THEME_SKY } from '../env/types';
import type { Camera } from './Camera';

function hash01(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function wrap(v: number, period: number): number {
  const m = ((v % period) + period) % period;
  return m;
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

/**
 * Fill sky gradient + layered ridges / clouds / motes scrolled by camera X & Y.
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

  // Far ridges — slow X + slight Y so climbing reveals more sky above them.
  const ridgeParallaxX = 0.1;
  const ridgeParallaxY = 0.04;
  const ridgePeriod = 420;
  const ridgeShift = wrap(-scrollX * ridgeParallaxX, ridgePeriod);
  const ridgeY = fh * 0.7 + scrollY * ridgeParallaxY;
  ctx.fillStyle = sky.ridge;
  ctx.beginPath();
  ctx.moveTo(0, Math.min(fh * 0.95, ridgeY + 40));
  for (let x = -ridgePeriod; x <= w + ridgePeriod; x += 36) {
    const wx = x + ridgeShift;
    const n =
      Math.sin(wx * 0.02) * 18 +
      Math.sin(wx * 0.051 + 1.7) * 10 +
      Math.sin(wx * 0.011) * 28;
    ctx.lineTo(x, ridgeY - n);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Mid ridges (stronger X cue).
  const midPeriod = 320;
  const midShift = wrap(-scrollX * 0.22, midPeriod);
  const midY = fh * 0.78 + scrollY * 0.08;
  ctx.fillStyle = sky.ridge.replace(/[\d.]+\)$/, '0.35)');
  ctx.beginPath();
  ctx.moveTo(0, midY + 30);
  for (let x = -midPeriod; x <= w + midPeriod; x += 28) {
    const wx = x + midShift;
    const n = Math.sin(wx * 0.035) * 12 + Math.sin(wx * 0.09 + 0.8) * 6;
    ctx.lineTo(x, midY - n);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  type Layer = {
    px: number;
    py: number;
    periodX: number;
    periodY: number;
    count: number;
    scale: number;
    fill: string;
    salt: number;
    kind: 'cloud' | 'mote';
  };

  const layers: Layer[] = [
    {
      px: 0.14,
      py: 0.1,
      periodX: 980,
      periodY: 720,
      count: 8,
      scale: 1.15,
      fill: sky.cloud,
      salt: 1,
      kind: 'cloud',
    },
    {
      px: 0.28,
      py: 0.18,
      periodX: 720,
      periodY: 560,
      count: 7,
      scale: 0.9,
      fill: sky.cloudHi,
      salt: 2,
      kind: 'cloud',
    },
    {
      px: 0.42,
      py: 0.26,
      periodX: 540,
      periodY: 420,
      count: 9,
      scale: 0.7,
      fill: sky.cloudHi,
      salt: 3,
      kind: 'cloud',
    },
    {
      px: 0.2,
      py: 0.32,
      periodX: 640,
      periodY: 480,
      count: 28,
      scale: 1,
      fill: sky.cloudHi.replace(/[\d.]+\)$/, '0.35)'),
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
      fill: sky.cloud.replace(/[\d.]+\)$/, '0.28)'),
      salt: 12,
      kind: 'mote',
    },
  ];

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
      for (let kx = -1; kx <= 1; kx++) {
        for (let ky = -1; ky <= 1; ky++) {
          const sx = x0 + kx * layer.periodX - 60;
          const sy = y0 + ky * layer.periodY - 40;
          if (sx < -140 || sx > w + 140 || sy < -100 || sy > fh + 100) continue;
          if (layer.kind === 'cloud') {
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

  // Near haze streaks — strongest horizontal motion cue near the horizon band.
  const streakPeriod = 280;
  const streakShift = wrap(-scrollX * 0.65, streakPeriod);
  const streakYBase = fh * 0.62 + scrollY * 0.12;
  ctx.strokeStyle = sky.haze;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.35;
  for (let i = 0; i < 14; i++) {
    const u = hash01(i, 77);
    const y = streakYBase + (u - 0.5) * fh * 0.2;
    if (y < 0 || y > fh) continue;
    const x = wrap(u * streakPeriod + streakShift, streakPeriod) - 40;
    for (let k = -1; k <= 2; k++) {
      const sx = x + k * streakPeriod;
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.lineTo(sx + 36 + u * 40, y + (hash01(i, 78) - 0.5) * 4);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}
