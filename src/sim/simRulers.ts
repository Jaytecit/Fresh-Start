/**
 * A6 — edge-pinned height / distance rulers (always on the visualizer frame).
 */
import { type Camera, worldToScreen } from './Camera';

function pickStep(worldPerPx: number): number {
  // Aim for ~50–90 px between major ticks.
  const target = worldPerPx * 70;
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000];
  for (const c of candidates) {
    if (c >= target * 0.55) return c;
  }
  return 1000;
}

function isMajorTick(v: number, step: number): boolean {
  const r = Math.abs(v / step);
  return Math.abs(r - Math.round(r)) < 1e-6;
}

/**
 * Left edge = height (Y). Bottom edge = distance (X).
 * Labels stay screen-fixed so travel is readable at any camera pose.
 */
export function drawSimAxisRulers(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
): void {
  const inset = Math.max(0, cam.insetBottom ?? 0);
  const fh = Math.max(1, h - inset);
  const worldPerPx = 1 / Math.max(1e-6, cam.zoom);
  const major = pickStep(worldPerPx);
  const minor = major >= 10 ? major / 5 : major / 2;

  const worldLeft = cam.x - w / (2 * cam.zoom);
  const worldRight = cam.x + w / (2 * cam.zoom);
  const worldBottom = cam.y - fh / (2 * cam.zoom);
  const worldTop = cam.y + fh / (2 * cam.zoom);

  const leftPad = 36;
  const bottomY = fh - 2;
  const barH = 22;
  const barW = 34;

  ctx.save();
  ctx.font = '10px "Segoe UI", system-ui, sans-serif';
  ctx.textBaseline = 'middle';

  // —— Left height ruler ——
  ctx.fillStyle = 'rgba(8, 12, 18, 0.55)';
  ctx.fillRect(0, 0, barW, fh);
  ctx.strokeStyle = 'rgba(212, 160, 74, 0.65)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(barW - 0.5, 0);
  ctx.lineTo(barW - 0.5, fh);
  ctx.stroke();

  ctx.textAlign = 'right';
  const y0 = Math.floor(worldBottom / minor) * minor;
  for (let y = y0; y <= worldTop + minor; y += minor) {
    if (Math.abs(y) < 1e-9) y = 0;
    const p = worldToScreen(cam, w, h, cam.x, y);
    if (p.y < 2 || p.y > fh - 2) continue;
    const isMajor = isMajorTick(y, major);
    const tick = isMajor ? 10 : 5;
    ctx.strokeStyle = isMajor
      ? 'rgba(230, 200, 120, 0.85)'
      : 'rgba(140, 160, 180, 0.45)';
    ctx.beginPath();
    ctx.moveTo(barW - tick, p.y);
    ctx.lineTo(barW, p.y);
    ctx.stroke();
    if (isMajor) {
      ctx.fillStyle = 'rgba(230, 235, 242, 0.9)';
      ctx.fillText(formatTick(y), barW - 12, p.y);
    }
  }
  ctx.fillStyle = 'rgba(212, 160, 74, 0.85)';
  ctx.save();
  ctx.translate(11, 14);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('height', 0, 0);
  ctx.restore();

  // —— Bottom distance ruler ——
  ctx.fillStyle = 'rgba(8, 12, 18, 0.55)';
  ctx.fillRect(0, bottomY - barH, w, barH + inset + 2);
  ctx.strokeStyle = 'rgba(212, 160, 74, 0.65)';
  ctx.beginPath();
  ctx.moveTo(0, bottomY - barH + 0.5);
  ctx.lineTo(w, bottomY - barH + 0.5);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const x0 = Math.floor(worldLeft / minor) * minor;
  for (let x = x0; x <= worldRight + minor; x += minor) {
    if (Math.abs(x) < 1e-9) x = 0;
    const p = worldToScreen(cam, w, h, x, cam.y);
    if (p.x < leftPad || p.x > w - 4) continue;
    const isMajor = isMajorTick(x, major);
    const tick = isMajor ? 10 : 5;
    ctx.strokeStyle = isMajor
      ? 'rgba(230, 200, 120, 0.85)'
      : 'rgba(140, 160, 180, 0.45)';
    ctx.beginPath();
    ctx.moveTo(p.x, bottomY - barH);
    ctx.lineTo(p.x, bottomY - barH + tick);
    ctx.stroke();
    if (isMajor) {
      ctx.fillStyle = 'rgba(230, 235, 242, 0.9)';
      ctx.fillText(formatTick(x), p.x, bottomY - barH + 11);
    }
  }
  ctx.fillStyle = 'rgba(212, 160, 74, 0.85)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('distance', w - 8, bottomY - barH / 2);

  ctx.restore();
}

function formatTick(v: number): string {
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Math.abs(v - Math.round(v)) < 1e-6) return String(Math.round(v));
  return v.toFixed(1);
}
