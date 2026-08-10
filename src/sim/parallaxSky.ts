/**
 * C2.7 — parallax sky / clouds for directional travel cues (render-only).
 * Deterministic layout (no Math.random).
 */
import type { EnvTheme } from '../env/types';
import { THEME_SKY } from '../env/types';
import type { Camera } from './Camera';

function hash01(i: number, salt: number): number {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453123;
  return x - Math.floor(x);
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

function wrapX(x: number, period: number): number {
  const m = ((x % period) + period) % period;
  return m;
}

/**
 * Fill sky gradient + layered ridges / clouds scrolled by camera.
 * High-altitude wisps intensify when the camera looks up.
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

  const g = ctx.createLinearGradient(0, 0, 0, fh);
  g.addColorStop(0, sky.zenith);
  g.addColorStop(0.45, sky.mid);
  g.addColorStop(0.82, sky.horizon);
  g.addColorStop(1, sky.haze);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Far ridges — slow scroll with distance.
  const ridgeParallax = 0.08;
  const ridgePeriod = 420;
  const ridgeShift = wrapX(-cam.x * cam.zoom * ridgeParallax, ridgePeriod);
  ctx.fillStyle = sky.ridge;
  ctx.beginPath();
  ctx.moveTo(0, fh * 0.72);
  for (let x = -ridgePeriod; x <= w + ridgePeriod; x += 40) {
    const wx = x + ridgeShift;
    const n =
      Math.sin(wx * 0.02) * 18 +
      Math.sin(wx * 0.051 + 1.7) * 10 +
      Math.sin(wx * 0.011) * 28;
    ctx.lineTo(x, fh * 0.68 - n);
  }
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Mid + near cloud bands.
  const layers: Array<{
    parallax: number;
    period: number;
    count: number;
    yBase: number;
    ySpan: number;
    scale: number;
    fill: string;
    salt: number;
  }> = [
    {
      parallax: 0.18,
      period: 900,
      count: 7,
      yBase: 0.18,
      ySpan: 0.22,
      scale: 1.1,
      fill: sky.cloud,
      salt: 1,
    },
    {
      parallax: 0.35,
      period: 640,
      count: 6,
      yBase: 0.28,
      ySpan: 0.2,
      scale: 0.85,
      fill: sky.cloudHi,
      salt: 2,
    },
  ];

  for (const layer of layers) {
    const shift = -cam.x * cam.zoom * layer.parallax;
    for (let i = 0; i < layer.count; i++) {
      const u = hash01(i, layer.salt);
      const v = hash01(i, layer.salt + 9);
      const baseX = u * layer.period;
      const x = wrapX(baseX + shift, layer.period) - 80;
      // Tile a couple of periods across the viewport.
      for (let k = -1; k <= 1; k++) {
        const sx = x + k * layer.period;
        if (sx < -120 || sx > w + 120) continue;
        const sy = fh * (layer.yBase + v * layer.ySpan);
        const sc = layer.scale * (0.75 + hash01(i, layer.salt + 3) * 0.55);
        drawCloudBlob(ctx, sx, sy, sc, layer.fill);
      }
    }
  }

  // High-altitude wisps when looking up (helps tall launches).
  const altitude = Math.max(0, cam.y - 8);
  if (altitude > 0.5) {
    const intensity = Math.min(1, altitude / 80);
    const hiFill =
      altitude > 40
        ? sky.cloudHi.replace(/[\d.]+\)$/, `${0.12 + intensity * 0.22})`)
        : sky.cloud;
    const shift = -cam.x * cam.zoom * 0.12;
    const period = 1100;
    for (let i = 0; i < 10; i++) {
      const u = hash01(i, 40);
      const v = hash01(i, 41);
      const x = wrapX(u * period + shift, period) - 60;
      const y = fh * (0.06 + v * 0.35 * (1 - Math.min(0.5, cam.y / 400)));
      // Screen Y for high world — bias toward top when cam is high.
      const yBias = Math.min(fh * 0.5, altitude * 0.15);
      drawCloudBlob(
        ctx,
        x,
        Math.max(8, y - yBias * intensity),
        0.55 + u * 0.5,
        hiFill,
      );
    }
  }
}
