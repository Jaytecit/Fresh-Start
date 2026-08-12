/**
 * Static joint/bone/muscle sketch (editor library + share pages).
 * No physics, no training, no mutation of the design.
 */
import type { CreatureDesign } from '../creature/types';

export function paintCreaturePreview(
  ctx: CanvasRenderingContext2D,
  design: CreatureDesign,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(12, 18, 28, 0.95)';
  ctx.fillRect(0, 0, width, height);

  if (design.joints.length === 0) {
    ctx.fillStyle = 'rgba(160, 175, 195, 0.75)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Empty design', width / 2, height / 2);
    return;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const j of design.joints) {
    minX = Math.min(minX, j.x);
    maxX = Math.max(maxX, j.x);
    minY = Math.min(minY, j.y);
    maxY = Math.max(maxY, j.y);
  }
  const pad = 18;
  const spanX = Math.max(0.5, maxX - minX);
  const spanY = Math.max(0.5, maxY - minY);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const ox = (width - spanX * scale) / 2;
  const oy = (height - spanY * scale) / 2;
  const mapX = (x: number) => ox + (x - minX) * scale;
  const mapY = (y: number) => height - (oy + (y - minY) * scale);

  const jointAt = (id: number) => design.joints.find((j) => j.id === id);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const m of design.muscles) {
    const a = design.bones.find((b) => b.id === m.startBoneId);
    const b = design.bones.find((bone) => bone.id === m.endBoneId);
    if (!a || !b) continue;
    const aj0 = jointAt(a.startJointId);
    const aj1 = jointAt(a.endJointId);
    const bj0 = jointAt(b.startJointId);
    const bj1 = jointAt(b.endJointId);
    if (!aj0 || !aj1 || !bj0 || !bj1) continue;
    const mx0 = (aj0.x + aj1.x) / 2;
    const my0 = (aj0.y + aj1.y) / 2;
    const mx1 = (bj0.x + bj1.x) / 2;
    const my1 = (bj0.y + bj1.y) / 2;
    ctx.strokeStyle = 'rgba(220, 90, 110, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(mapX(mx0), mapY(my0));
    ctx.lineTo(mapX(mx1), mapY(my1));
    ctx.stroke();
  }

  for (const bone of design.bones) {
    const a = jointAt(bone.startJointId);
    const b = jointAt(bone.endJointId);
    if (!a || !b) continue;
    ctx.strokeStyle = bone.rigid
      ? 'rgba(180, 200, 220, 0.95)'
      : 'rgba(120, 160, 200, 0.9)';
    ctx.lineWidth = bone.rigid ? 3.5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(mapX(a.x), mapY(a.y));
    ctx.lineTo(mapX(b.x), mapY(b.y));
    ctx.stroke();
  }

  for (const j of design.joints) {
    const r = j.isWheel ? 5.5 : j.isFoot ? 5 : 4;
    ctx.beginPath();
    ctx.arc(mapX(j.x), mapY(j.y), r, 0, Math.PI * 2);
    if (j.isGlove) ctx.fillStyle = 'rgba(211, 95, 85, 0.95)';
    else if (j.isHitTarget) ctx.fillStyle = 'rgba(224, 184, 90, 0.95)';
    else if (j.isFoot) ctx.fillStyle = 'rgba(90, 200, 140, 0.95)';
    else if (j.isHead) ctx.fillStyle = 'rgba(230, 200, 90, 0.95)';
    else if (j.isWheel) ctx.fillStyle = 'rgba(210, 160, 80, 0.95)';
    else ctx.fillStyle = 'rgba(210, 220, 235, 0.95)';
    ctx.fill();
  }
}

/**
 * World-space ghost silhouette at spawn (Environment Studio scale reference).
 * Design coords map 1:1 into world, offset by spawn.
 */
export function paintCreatureWorldGhost(
  ctx: CanvasRenderingContext2D,
  design: CreatureDesign,
  spawnX: number,
  spawnY: number,
  toScreen: (wx: number, wy: number) => { x: number; y: number },
  zoom: number,
): void {
  if (design.joints.length === 0) return;

  const jointAt = (id: number) => design.joints.find((j) => j.id === id);
  const map = (x: number, y: number) => toScreen(x + spawnX, y + spawnY);

  ctx.save();
  ctx.globalAlpha = 0.38;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const m of design.muscles) {
    const a = design.bones.find((b) => b.id === m.startBoneId);
    const b = design.bones.find((bone) => bone.id === m.endBoneId);
    if (!a || !b) continue;
    const aj0 = jointAt(a.startJointId);
    const aj1 = jointAt(a.endJointId);
    const bj0 = jointAt(b.startJointId);
    const bj1 = jointAt(b.endJointId);
    if (!aj0 || !aj1 || !bj0 || !bj1) continue;
    const p0 = map((aj0.x + aj1.x) / 2, (aj0.y + aj1.y) / 2);
    const p1 = map((bj0.x + bj1.x) / 2, (bj0.y + bj1.y) / 2);
    ctx.strokeStyle = 'rgba(200, 110, 130, 0.9)';
    ctx.lineWidth = Math.max(1.2, 2 * zoom);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  for (const bone of design.bones) {
    const a = jointAt(bone.startJointId);
    const b = jointAt(bone.endJointId);
    if (!a || !b) continue;
    const p0 = map(a.x, a.y);
    const p1 = map(b.x, b.y);
    ctx.strokeStyle = 'rgba(170, 200, 230, 0.95)';
    ctx.lineWidth = Math.max(1.4, (bone.rigid ? 3 : 2.2) * zoom);
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }

  for (const j of design.joints) {
    const p = map(j.x, j.y);
    const r = Math.max(2.5, (j.isWheel || j.isFoot ? 4.5 : 3.5) * zoom);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200, 220, 240, 0.95)';
    ctx.fill();
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const j of design.joints) {
    minX = Math.min(minX, j.x);
    maxX = Math.max(maxX, j.x);
    maxY = Math.max(maxY, j.y);
  }
  const label = map((minX + maxX) / 2, maxY + 0.6);
  ctx.globalAlpha = 0.55;
  ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = 'rgba(180, 200, 220, 0.95)';
  ctx.textAlign = 'center';
  ctx.fillText('Scale ref', label.x, label.y);
  ctx.restore();
}
