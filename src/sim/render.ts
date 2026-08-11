import {
  drawClothMesh,
  drawClothPinMarkers,
  previewClothGarment,
  stepClothGarment,
} from '../appearance/cloth';
import {
  drawGooglyEye,
  GOOGLY_BEAD_FRAC,
  GOOGLY_DOME_RADIUS,
  resolveGooglyEyeOffset,
  restGooglyPupil,
  stepGooglyEye,
} from '../appearance/googlyEyes';
import { resolveBodyPartPose } from '../appearance/bodyPartOps';
import type { AppearanceRig, BodyPartAttachment, ClothGarmentDef } from '../appearance/types';
import { getBodyPart, getBodyPartImage } from '../appearance/bodyPartCatalog';
import {
  PARA_VIS_BULGE,
  PARA_VIS_EDITOR_INFLATION,
  PARA_VIS_FILL,
  PARA_VIS_WIDTH_SCALE,
} from '../appearance/parachuteVisual';
import { driveGroupStrokeColor, normalizeDriveGroup } from '../brain/driveGroups';
import type { CreatureDesign } from '../creature/types';
import { EDITOR_GRID } from '../editor/grid';
import { GROUND_Y } from '../physics/constants';
import { isFeatureEnabled } from '../port/featureFlags';
import {
  type Camera,
  screenToWorld,
  worldToScreen,
  writeWorldToScreen,
} from './Camera';
import type { EnvCourseMarker } from '../env/types';
import type { AgentSnapshot, SimulationSnapshot } from './simulation';

/** Resolve sprite pose from a live agent (bone- or joint-anchored). */
function resolveAgentBodyPartPose(
  agent: Pick<AgentSnapshot, 'joints' | 'bones'>,
  part: BodyPartAttachment,
): { x: number; y: number; angle: number } | null {
  const rot = part.rotation ?? 0;
  if (part.boneId !== undefined) {
    const bone = agent.bones.find((b) => b.id === part.boneId);
    if (!bone) return null;
    // Bone body angle is capsule local-Y along length; sprite follows bone tangent.
    const baseAngle = bone.angle + Math.PI / 2;
    const t = Math.min(1, Math.max(0, part.along ?? 0.5));
    // Project along bone length from center: (t - 0.5) * full length
    const alongOff = (t - 0.5) * bone.halfLength * 2;
    const ax = Math.cos(baseAngle);
    const ay = Math.sin(baseAngle);
    return {
      x: bone.x + ax * alongOff + (part.offsetX ?? 0),
      y: bone.y + ay * alongOff + (part.offsetY ?? 0),
      angle: baseAngle + rot,
    };
  }
  if (part.jointId !== undefined) {
    const joint = agent.joints.find((j) => j.id === part.jointId);
    if (!joint) return null;
    return {
      x: joint.x + (part.offsetX ?? 0),
      y: joint.y + (part.offsetY ?? 0),
      angle: rot,
    };
  }
  return null;
}

function drawBodyPartSprite(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  part: BodyPartAttachment,
  pose: { x: number; y: number; angle: number },
  selected = false,
): void {
  const def = getBodyPart(part.assetId);
  const img = getBodyPartImage(part.assetId);
  if (!def || !img) return;
  const p = worldToScreen(cam, w, h, pose.x, pose.y);
  // scale is world units (matches editor footprints / creature proportions).
  const scale = (part.scale ?? def.defaultScale) * cam.zoom;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(-pose.angle);
  if (part.mirror) ctx.scale(-1, 1);
  ctx.drawImage(img, -scale * def.pivotX, -scale * def.pivotY, scale, scale);
  if (selected) {
    ctx.strokeStyle = '#f0c040';
    ctx.lineWidth = 2;
    ctx.strokeRect(-scale * 0.5, -scale * 0.5, scale, scale);
  }
  ctx.restore();
}

export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  // Fallback when parallax sky is off — flat theme-agnostic clear.
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1a2332');
  g.addColorStop(1, '#0d121a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Draw a light world grid in the visible camera region. */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  grid = EDITOR_GRID,
): void {
  const topLeft = screenToWorld(cam, w, h, 0, 0);
  const bottomRight = screenToWorld(cam, w, h, w, h);
  const minX = Math.min(topLeft.x, bottomRight.x);
  const maxX = Math.max(topLeft.x, bottomRight.x);
  const minY = Math.min(topLeft.y, bottomRight.y);
  const maxY = Math.max(topLeft.y, bottomRight.y);

  const startX = Math.floor(minX / grid) * grid;
  const startY = Math.floor(minY / grid) * grid;

  ctx.save();
  ctx.lineWidth = 1;
  for (let x = startX; x <= maxX + grid; x += grid) {
    const a = worldToScreen(cam, w, h, x, minY);
    const b = worldToScreen(cam, w, h, x, maxY);
    const major = Math.round(x / grid) % 2 === 0;
    ctx.strokeStyle = major ? 'rgba(90, 110, 130, 0.35)' : 'rgba(90, 110, 130, 0.15)';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let y = startY; y <= maxY + grid; y += grid) {
    const a = worldToScreen(cam, w, h, minX, y);
    const b = worldToScreen(cam, w, h, maxX, y);
    const major = Math.round(y / grid) % 2 === 0;
    ctx.strokeStyle = major ? 'rgba(90, 110, 130, 0.35)' : 'rgba(90, 110, 130, 0.15)';
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();
}

/** Ground halfspace fill + horizon line (distance ticks live on the A6 edge ruler). */
export function drawGround(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
): void {
  const left = worldToScreen(cam, w, h, 0, GROUND_Y);
  ctx.strokeStyle = '#5a6a7a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, left.y);
  ctx.lineTo(w, left.y);
  ctx.stroke();

  ctx.fillStyle = '#152028';
  ctx.fillRect(0, left.y, w, h - left.y);
}

export function drawObstacles(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  obstacles: SimulationSnapshot['obstacles'],
): void {
  if (!obstacles || obstacles.length === 0) return;
  for (const o of obstacles) {
    const c = worldToScreen(cam, w, h, o.x, o.y);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(-o.rot);
    const rw = o.hx * 2 * cam.zoom;
    const rh = o.hy * 2 * cam.zoom;
    ctx.fillStyle = obstacleFill(o.kind);
    ctx.strokeStyle =
      o.kind === 'pad'
        ? 'rgba(255, 210, 120, 0.9)'
        : 'rgba(180, 200, 220, 0.55)';
    ctx.lineWidth = o.kind === 'pad' ? 2 : 1.5;
    ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
    ctx.strokeRect(-rw / 2, -rh / 2, rw, rh);
    if (o.kind === 'pad' && rw > 10) {
      // Up-chevrons so the pad reads as a launcher in the editor/sim.
      ctx.strokeStyle = 'rgba(255, 230, 160, 0.85)';
      ctx.lineWidth = 1.5;
      const midY = -rh * 0.05;
      for (const ox of [-rw * 0.22, 0, rw * 0.22]) {
        ctx.beginPath();
        ctx.moveTo(ox - 5, midY + 4);
        ctx.lineTo(ox, midY - 5);
        ctx.lineTo(ox + 5, midY + 4);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

/** C2.9 — translucent score-only AABB overlays. */
export function drawScoreRegions(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  regions: SimulationSnapshot['scoreRegions'] | undefined,
): void {
  if (!regions || regions.length === 0) return;
  for (const r of regions) {
    const c = worldToScreen(cam, w, h, r.x, r.y);
    const rw = r.w * cam.zoom;
    const rh = r.h * cam.zoom;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(-(r.rot ?? 0));
    if (r.kind === 'penalty') {
      ctx.fillStyle = 'rgba(190, 70, 70, 0.28)';
      ctx.strokeStyle = 'rgba(220, 110, 100, 0.75)';
    } else if (r.kind === 'landing') {
      ctx.fillStyle = 'rgba(210, 160, 50, 0.32)';
      ctx.strokeStyle = 'rgba(240, 190, 70, 0.9)';
    } else {
      ctx.fillStyle = 'rgba(70, 160, 100, 0.28)';
      ctx.strokeStyle = 'rgba(110, 200, 140, 0.75)';
    }
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
    ctx.strokeRect(-rw / 2, -rh / 2, rw, rh);
    ctx.setLineDash([]);
    ctx.restore();
  }
}

/** C2.10 — translucent course marker overlays (start / checkpoint / finish). */
export function drawCourseMarkers(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  markers: EnvCourseMarker[] | SimulationSnapshot['courseMarkers'] | undefined,
): void {
  if (!markers || markers.length === 0) return;
  for (const m of markers) {
    const c = worldToScreen(cam, w, h, m.x, m.y);
    const rw = m.w * cam.zoom;
    const rh = m.h * cam.zoom;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(-(m.rot ?? 0));
    if (m.kind === 'start') {
      ctx.fillStyle = 'rgba(60, 200, 220, 0.28)';
      ctx.strokeStyle = 'rgba(90, 230, 240, 0.85)';
    } else if (m.kind === 'checkpoint') {
      ctx.fillStyle = 'rgba(220, 160, 50, 0.28)';
      ctx.strokeStyle = 'rgba(240, 190, 70, 0.85)';
    } else {
      ctx.fillStyle = 'rgba(140, 220, 60, 0.28)';
      ctx.strokeStyle = 'rgba(170, 240, 90, 0.85)';
    }
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
    ctx.strokeRect(-rw / 2, -rh / 2, rw, rh);
    ctx.setLineDash([]);
    const label =
      m.kind === 'checkpoint'
        ? `CP${(m.order ?? 0) + 1}`
        : m.kind === 'start'
          ? 'START'
          : 'FINISH';
    ctx.font = '600 10px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle =
      m.kind === 'start'
        ? 'rgba(160, 240, 250, 0.95)'
        : m.kind === 'checkpoint'
          ? 'rgba(250, 210, 120, 0.95)'
          : 'rgba(190, 250, 120, 0.95)';
    ctx.fillText(label, 0, -rh / 2 - 4);
    ctx.restore();
  }
}

export function drawTower(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  tower: SimulationSnapshot['tower'],
): void {
  if (!tower || tower.length === 0) return;
  for (const o of tower) {
    const c = worldToScreen(cam, w, h, o.x, o.y);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(-o.rot);
    const rw = o.hx * 2 * cam.zoom;
    const rh = o.hy * 2 * cam.zoom;
    ctx.fillStyle =
      o.part === 'deck'
        ? 'rgba(130, 115, 90, 0.85)'
        : 'rgba(95, 100, 115, 0.8)';
    ctx.strokeStyle = 'rgba(200, 190, 160, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-rw / 2, -rh / 2, rw, rh);
    ctx.strokeRect(-rw / 2, -rh / 2, rw, rh);
    ctx.restore();
  }
}

export function drawTerrain(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  terrain: SimulationSnapshot['terrain'],
): void {
  if (!terrain || terrain.points.length < 2) return;
  ctx.save();
  ctx.beginPath();
  const first = worldToScreen(cam, w, h, terrain.points[0].x, terrain.points[0].y);
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < terrain.points.length; i++) {
    const p = worldToScreen(cam, w, h, terrain.points[i].x, terrain.points[i].y);
    ctx.lineTo(p.x, p.y);
  }
  const last = terrain.points[terrain.points.length - 1];
  const groundL = worldToScreen(cam, w, h, last.x, GROUND_Y);
  const groundF = worldToScreen(cam, w, h, terrain.points[0].x, GROUND_Y);
  ctx.lineTo(groundL.x, groundL.y);
  ctx.lineTo(groundF.x, groundF.y);
  ctx.closePath();
  ctx.fillStyle = 'rgba(70, 95, 85, 0.45)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(140, 180, 150, 0.75)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < terrain.points.length; i++) {
    const p = worldToScreen(cam, w, h, terrain.points[i].x, terrain.points[i].y);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
}

function obstacleFill(kind: string): string {
  switch (kind) {
    case 'ramp':
      return 'rgba(90, 120, 100, 0.75)';
    case 'stair':
      return 'rgba(100, 110, 130, 0.8)';
    case 'pit':
      return 'rgba(110, 90, 80, 0.8)';
    case 'loop':
      return 'rgba(90, 100, 130, 0.7)';
    case 'pad':
      return 'rgba(200, 140, 60, 0.88)';
    default:
      return 'rgba(80, 100, 120, 0.8)';
  }
}

export function drawSnapshot(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  snap: SimulationSnapshot,
  options?: { skipScenery?: boolean; clothDt?: number },
): void {
  if (!options?.skipScenery) {
    drawTerrain(ctx, cam, w, h, snap.terrain);
    drawTower(ctx, cam, w, h, snap.tower);
    drawObstacles(ctx, cam, w, h, snap.obstacles);
    drawScoreRegions(ctx, cam, w, h, snap.scoreRegions);
    drawCourseMarkers(ctx, cam, w, h, snap.courseMarkers);
  }
  const agents =
    snap.agents.length > 0
      ? snap.agents
      : [
          {
            joints: snap.joints,
            bones: snap.bones,
            struts: snap.struts,
            muscles: snap.muscles,
            opacity: 1,
            focused: true,
            appearance: snap.appearance,
          },
        ];

  // Ghosts first, focused creature last (on top) — Keiwan layering.
  const ordered = agents.slice().sort((a, b) => {
    if (a.focused === b.focused) return 0;
    return a.focused ? 1 : -1;
  });

  const clothDt = options?.clothDt ?? 1 / 60;
  for (const agent of ordered) {
    const agentIndex = agents.indexOf(agent);
    ctx.save();
    ctx.globalAlpha = agent.opacity;
    drawAgent(
      ctx,
      cam,
      w,
      h,
      agent,
      agent.appearance ?? snap.appearance,
      clothDt,
      `a${agentIndex}`,
      snap.hideMuscles === true,
      snap.hideBones === true,
    );
    ctx.restore();
  }

  drawCourseTimerHud(ctx, w, snap);
}

/** C2.10 — race clock HUD (starts when the model crosses the start line). */
function drawCourseTimerHud(
  ctx: CanvasRenderingContext2D,
  w: number,
  snap: SimulationSnapshot,
): void {
  const markers = snap.courseMarkers;
  if (!markers || markers.length === 0) return;
  const hasStart = markers.some((m) => m.kind === 'start');
  const stats = snap.liveStats;
  if (!stats && !hasStart) return;

  const armed = stats?.courseArmed ?? false;
  const finished = stats?.finished ?? false;
  const raceTime = stats?.raceTime ?? null;
  let label: string;
  if (!armed) {
    label = 'READY';
  } else if (finished) {
    label = `FINISH ${(raceTime ?? 0).toFixed(2)}s`;
  } else {
    label = (raceTime ?? 0).toFixed(2);
  }

  const pad = 10;
  const boxW = Math.min(168, Math.max(110, w * 0.22));
  const boxH = 36;
  const x = w - boxW - pad;
  const y = pad;

  ctx.save();
  ctx.fillStyle = 'rgba(8, 14, 18, 0.55)';
  ctx.strokeStyle = finished
    ? 'rgba(120, 220, 160, 0.85)'
    : armed
      ? 'rgba(200, 230, 210, 0.55)'
      : 'rgba(160, 180, 190, 0.4)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, boxW, boxH, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = finished
    ? 'rgba(160, 240, 190, 0.95)'
    : armed
      ? 'rgba(230, 245, 238, 0.95)'
      : 'rgba(180, 200, 205, 0.75)';
  ctx.font = armed && !finished
    ? '600 18px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
    : '600 13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + boxW / 2, y + boxH / 2);
  ctx.restore();
}

/** Scratch points for agent draw — reused to avoid per-part allocations. */
const _scrA = { x: 0, y: 0 };
const _scrB = { x: 0, y: 0 };
const _scrC = { x: 0, y: 0 };

function muscleStrokeStyle(
  action: SimulationSnapshot['muscles'][number]['action'],
): string {
  if (action === 'contract') return '#e85d4c';
  if (action === 'expand') return '#4c8fe8';
  return '#8a6a5a';
}

function muscleWidthBucket(
  drive: number,
  action: SimulationSnapshot['muscles'][number]['action'],
): number {
  const width = 2 + Math.abs(drive) * 4 + (action === 'idle' ? 0 : 1);
  // Quantize so same-style muscles can share a single stroke.
  return Math.max(1, Math.round(width * 2) / 2);
}

function drawStrut(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  selected = false,
): void {
  writeWorldToScreen(cam, w, h, ax, ay, _scrA);
  writeWorldToScreen(cam, w, h, bx, by, _scrB);
  ctx.lineCap = 'round';
  ctx.strokeStyle = selected ? '#f0c040' : '#3a4554';
  ctx.lineWidth = Math.max(3, 0.22 * cam.zoom);
  ctx.beginPath();
  ctx.moveTo(_scrA.x, _scrA.y);
  ctx.lineTo(_scrB.x, _scrB.y);
  ctx.stroke();
  ctx.strokeStyle = selected ? '#f5d76e' : '#5a6a7c';
  ctx.lineWidth = Math.max(1.5, 0.12 * cam.zoom);
  ctx.beginPath();
  ctx.moveTo(_scrA.x, _scrA.y);
  ctx.lineTo(_scrB.x, _scrB.y);
  ctx.stroke();
}

function drawAgent(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  agent: {
    joints: SimulationSnapshot['joints'];
    bones: SimulationSnapshot['bones'];
    struts?: SimulationSnapshot['struts'];
    muscles: SimulationSnapshot['muscles'];
  },
  appearance?: AppearanceRig,
  dt = 1 / 60,
  creatureKey = 'agent',
  hideMuscles = false,
  hideBones = false,
): void {
  if (!hideMuscles && agent.muscles.length > 0) {
    // Batch by (action color, quantized width) — one beginPath/stroke per bucket.
    const buckets = new Map<
      string,
      { style: string; width: number; segs: number[] }
    >();
    for (const m of agent.muscles) {
      const width = muscleWidthBucket(m.drive, m.action);
      const style = muscleStrokeStyle(m.action);
      const key = `${m.action}:${width}`;
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { style, width, segs: [] };
        buckets.set(key, bucket);
      }
      writeWorldToScreen(cam, w, h, m.ax, m.ay, _scrA);
      writeWorldToScreen(cam, w, h, m.bx, m.by, _scrB);
      bucket.segs.push(_scrA.x, _scrA.y, _scrB.x, _scrB.y);
    }
    ctx.lineCap = 'round';
    for (const bucket of buckets.values()) {
      ctx.strokeStyle = bucket.style;
      ctx.lineWidth = bucket.width;
      ctx.beginPath();
      const segs = bucket.segs;
      for (let i = 0; i < segs.length; i += 4) {
        ctx.moveTo(segs[i], segs[i + 1]);
        ctx.lineTo(segs[i + 2], segs[i + 3]);
      }
      ctx.stroke();
    }
  }

  if (!hideBones) {
    for (const bone of agent.bones) {
      if (
        isFeatureEnabled('parachuteCanopyVisual') &&
        bone.aeroType === 'parachute'
      ) {
        drawParachuteBone(
          ctx,
          cam,
          w,
          h,
          bone.x,
          bone.y,
          bone.angle,
          bone.halfLength,
          bone.halfWidth,
          bone.chuteInflation ?? 0,
          PARA_VIS_FILL,
        );
      } else {
        drawBone(
          ctx,
          cam,
          w,
          h,
          bone.x,
          bone.y,
          bone.angle,
          bone.halfLength,
          bone.halfWidth,
        );
      }
    }
    const struts = agent.struts ?? [];
    for (const s of struts) {
      drawStrut(ctx, cam, w, h, s.ax, s.ay, s.bx, s.by);
    }
  }

  const hideSkeleton = hideBones || appearance?.hideSkeleton === true;
  if (!hideSkeleton) {
    ctx.fillStyle = '#d8dde6';
    ctx.strokeStyle = '#2a3340';
    ctx.lineWidth = 1.5;
    for (const joint of agent.joints) {
      writeWorldToScreen(cam, w, h, joint.x, joint.y, _scrA);
      const r = joint.radius * cam.zoom;
      ctx.beginPath();
      ctx.arc(_scrA.x, _scrA.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  const clothGarments =
    isFeatureEnabled('cosmeticCloth') && appearance?.cloth?.length
      ? appearance.cloth
      : [];
  const clothPose = { joints: agent.joints, bones: agent.bones };
  const steppedCloth = new Map<
    string,
    { garment: ClothGarmentDef; particles: { x: number; y: number }[] }
  >();
  for (const garment of clothGarments) {
    const rt = stepClothGarment(
      `${creatureKey}:cloth:${garment.id}`,
      garment,
      clothPose,
      dt,
    );
    steppedCloth.set(garment.id, {
      garment,
      particles: rt.particles.map((p) => ({ x: p.x, y: p.y })),
    });
  }

  for (const { garment, particles } of steppedCloth.values()) {
    if ((garment.layer ?? 'under') !== 'under') continue;
    drawClothMesh(
      ctx,
      cam,
      w,
      h,
      garment.cols,
      garment.rows,
      particles,
      garment.color,
    );
  }

  if (isFeatureEnabled('spriteBodyParts') && appearance?.bodyParts?.length) {
    for (const part of appearance.bodyParts) {
      const pose = resolveAgentBodyPartPose(agent, part);
      if (!pose) continue;
      drawBodyPartSprite(ctx, cam, w, h, part, pose);
    }
  }

  for (const { garment, particles } of steppedCloth.values()) {
    if ((garment.layer ?? 'under') !== 'over') continue;
    drawClothMesh(
      ctx,
      cam,
      w,
      h,
      garment.cols,
      garment.rows,
      particles,
      garment.color,
    );
  }

  if (isFeatureEnabled('googlyEyes') && appearance?.googlyEyes?.length) {
    appearance.googlyEyes.forEach((eye, idx) => {
      const joint = agent.joints.find((j) => j.id === eye.jointId);
      if (!joint) return;
      const dome = eye.domeRadius ?? GOOGLY_DOME_RADIUS;
      const pupilR = dome * GOOGLY_BEAD_FRAC;
      const pupil = stepGooglyEye(
        `${creatureKey}:eye:${idx}`,
        joint.vx ?? 0,
        joint.vy ?? 0,
        dome,
        pupilR,
        dt,
      );
      const off = resolveGooglyEyeOffset(eye);
      const p = worldToScreen(
        cam,
        w,
        h,
        joint.x + off.x,
        joint.y + off.y,
      );
      drawGooglyEye(ctx, p.x, p.y, cam.zoom, pupil);
    });
  }
}

export function drawDesign(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  design: CreatureDesign,
  opts?: {
    selectedJointId?: number | null;
    /** Multi-select highlight (C1.11); takes precedence over selectedJointId. */
    selectedJointIds?: number[] | null;
    selectedBoneId?: number | null;
    selectedMuscleId?: number | null;
    selectedBodyPartIndex?: number | null;
    selectedClothIndex?: number | null;
    /** H9 — joints staged as cloth pins while material-drawing. */
    clothDraftJointIds?: number[] | null;
    hoverJointId?: number | null;
    hoverBoneId?: number | null;
    dragPreview?: {
      kind: 'bone' | 'muscle';
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
    } | null;
  },
): void {
  const selectedJoints = new Set(opts?.selectedJointIds ?? []);
  if (opts?.selectedJointId != null) selectedJoints.add(opts.selectedJointId);
  const clothDraftJoints = new Set(opts?.clothDraftJointIds ?? []);
  const jointPos = new Map(design.joints.map((j) => [j.id, j]));
  const boneCenter = new Map<number, { x: number; y: number }>();

  for (const bone of design.bones) {
    const a = jointPos.get(bone.startJointId);
    const b = jointPos.get(bone.endJointId);
    if (!a || !b) continue;
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    boneCenter.set(bone.id, { x: cx, y: cy });
    const selected =
      opts?.selectedBoneId === bone.id || opts?.hoverBoneId === bone.id;
    if (
      isFeatureEnabled('rigidStruts') &&
      bone.rigid === true
    ) {
      drawStrut(ctx, cam, w, h, a.x, a.y, b.x, b.y, selected);
      continue;
    }
    const angle = Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2;
    const halfLength = Math.hypot(b.x - a.x, b.y - a.y) / 2;
    const aero = (bone.aeroArea ?? 0) > 0;
    const aeroFill =
      bone.aeroType === 'wing'
        ? '#7ec8a0'
        : bone.aeroType === 'parachute'
          ? PARA_VIS_FILL
          : bone.aeroType === 'glider'
            ? '#6ab0c8'
            : '#6ab0c8';
    const fill = selected ? '#f0c040' : aero ? aeroFill : '#6a8aaa';
    if (
      isFeatureEnabled('parachuteCanopyVisual') &&
      bone.aeroType === 'parachute' &&
      aero
    ) {
      drawParachuteBone(
        ctx,
        cam,
        w,
        h,
        cx,
        cy,
        angle,
        halfLength,
        0.14,
        PARA_VIS_EDITOR_INFLATION,
        fill,
      );
    } else {
      drawBone(ctx, cam, w, h, cx, cy, angle, halfLength, 0.14, fill);
    }
  }

  for (const muscle of design.muscles) {
    const a = boneCenter.get(muscle.startBoneId);
    const b = boneCenter.get(muscle.endBoneId);
    if (!a || !b) continue;
    const pa = worldToScreen(cam, w, h, a.x, a.y);
    const pb = worldToScreen(cam, w, h, b.x, b.y);
    const g = normalizeDriveGroup(muscle.driveGroup);
    const selected = opts?.selectedMuscleId === muscle.id;
    ctx.strokeStyle = selected
      ? '#f0c040'
      : g !== undefined
        ? driveGroupStrokeColor(g)
        : '#c07060';
    ctx.lineWidth = selected ? 4 : 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
    ctx.setLineDash([]);
    if (g !== undefined) {
      const mx = (pa.x + pb.x) / 2;
      const my = (pa.y + pb.y) / 2;
      ctx.fillStyle = driveGroupStrokeColor(g);
      ctx.font = '11px "Segoe UI", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`G${g}`, mx, my - 4);
    }
  }

  if (opts?.dragPreview) {
    const p = opts.dragPreview;
    const a = worldToScreen(cam, w, h, p.fromX, p.fromY);
    const b = worldToScreen(cam, w, h, p.toX, p.toY);
    ctx.strokeStyle = p.kind === 'muscle' ? '#e09070' : '#f0c040';
    ctx.lineWidth = p.kind === 'muscle' ? 3 : 4;
    ctx.setLineDash([8, 5]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const joint of design.joints) {
    const p = worldToScreen(cam, w, h, joint.x, joint.y);
    const selected =
      selectedJoints.has(joint.id) || opts?.hoverJointId === joint.id;
    const clothPin = clothDraftJoints.has(joint.id);
    const r = 0.28 * cam.zoom;
    ctx.fillStyle = selected ? '#f0c040' : clothPin ? '#c9a0e8' : '#d8dde6';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = clothPin ? '#6a3d9a' : '#2a3340';
    ctx.lineWidth = clothPin ? 2.5 : 1.5;
    ctx.stroke();
    if (clothPin) {
      ctx.strokeStyle = 'rgba(160, 100, 220, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (joint.isWheel) {
      ctx.strokeStyle = '#d4a04a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (joint.isFoot) {
      ctx.fillStyle = '#3d9a6a';
      ctx.beginPath();
      ctx.arc(p.x, p.y + r * 0.85, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    if (joint.isHead) {
      ctx.fillStyle = '#c45c4a';
      ctx.beginPath();
      ctx.arc(p.x, p.y - r * 0.85, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const editorClothPose = {
    joints: design.joints.map((j) => ({ id: j.id, x: j.x, y: j.y })),
    bones: design.bones.map((b) => {
      const a = jointPos.get(b.startJointId) ?? { x: 0, y: 0 };
      const c = jointPos.get(b.endJointId) ?? { x: 0, y: 0 };
      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const len = Math.hypot(dx, dy);
      return {
        id: b.id,
        x: (a.x + c.x) * 0.5,
        y: (a.y + c.y) * 0.5,
        angle: Math.atan2(dx, dy),
        halfLength: len * 0.5,
      };
    }),
  };

  const editorCloth =
    isFeatureEnabled('cosmeticCloth') && design.appearance?.cloth?.length
      ? design.appearance.cloth
      : [];

  for (let i = 0; i < editorCloth.length; i++) {
    const garment = editorCloth[i]!;
    if ((garment.layer ?? 'under') !== 'under') continue;
    const particles = previewClothGarment(garment, editorClothPose);
    drawClothMesh(
      ctx,
      cam,
      w,
      h,
      garment.cols,
      garment.rows,
      particles,
      garment.color,
      opts?.selectedClothIndex === i,
    );
    if (opts?.selectedClothIndex === i) {
      drawClothPinMarkers(ctx, cam, w, h, garment, particles);
    }
  }

  // Body-part preview (bone/joint anchored).
  if (isFeatureEnabled('spriteBodyParts') && design.appearance?.bodyParts?.length) {
    design.appearance.bodyParts.forEach((part, index) => {
      const pose = resolveBodyPartPose(design, part);
      if (!pose) return;
      drawBodyPartSprite(
        ctx,
        cam,
        w,
        h,
        part,
        pose,
        opts?.selectedBodyPartIndex === index,
      );
    });
  }

  for (let i = 0; i < editorCloth.length; i++) {
    const garment = editorCloth[i]!;
    if ((garment.layer ?? 'under') !== 'over') continue;
    const particles = previewClothGarment(garment, editorClothPose);
    drawClothMesh(
      ctx,
      cam,
      w,
      h,
      garment.cols,
      garment.rows,
      particles,
      garment.color,
      opts?.selectedClothIndex === i,
    );
    if (opts?.selectedClothIndex === i) {
      drawClothPinMarkers(ctx, cam, w, h, garment, particles);
    }
  }

  // Static googly preview in the editor (beads at rest).
  if (isFeatureEnabled('googlyEyes') && design.appearance?.googlyEyes?.length) {
    for (const eye of design.appearance.googlyEyes) {
      const joint = jointPos.get(eye.jointId);
      if (!joint) continue;
      const dome = eye.domeRadius ?? GOOGLY_DOME_RADIUS;
      const off = resolveGooglyEyeOffset(eye);
      const p = worldToScreen(
        cam,
        w,
        h,
        joint.x + off.x,
        joint.y + off.y,
      );
      drawGooglyEye(ctx, p.x, p.y, cam.zoom, restGooglyPupil(dome));
    }
  }
}

function drawBone(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  x: number,
  y: number,
  angle: number,
  halfLength: number,
  halfWidth: number,
  fill = '#7a9bb8',
): void {
  // Capsule ≈ thick round-capped stroke along bone local +Y (Rapier orientation).
  // Avoids per-bone save/translate/rotate/roundRect.
  const dx = -Math.sin(angle) * halfLength;
  const dy = Math.cos(angle) * halfLength;
  writeWorldToScreen(cam, w, h, x - dx, y - dy, _scrA);
  writeWorldToScreen(cam, w, h, x + dx, y + dy, _scrB);
  const wid = Math.max(1, halfWidth * 2 * cam.zoom);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2a3340';
  ctx.lineWidth = wid + 2;
  ctx.beginPath();
  ctx.moveTo(_scrA.x, _scrA.y);
  ctx.lineTo(_scrB.x, _scrB.y);
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = wid;
  ctx.beginPath();
  ctx.moveTo(_scrA.x, _scrA.y);
  ctx.lineTo(_scrB.x, _scrB.y);
  ctx.stroke();
}

/**
 * Inflation-driven canopy: endpoints stay on bone tips; mid control point
 * bulges along world +Y so a descending chute reads as a filled bowl.
 * At inflation ≈ 0 the chord is straight (matches drawBone).
 */
function drawParachuteBone(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  x: number,
  y: number,
  angle: number,
  halfLength: number,
  halfWidth: number,
  inflation: number,
  fill = PARA_VIS_FILL,
): void {
  const t = Math.min(1, Math.max(0, inflation));
  const open = t * t;
  const dx = -Math.sin(angle) * halfLength;
  const dy = Math.cos(angle) * halfLength;
  const ax = x - dx;
  const ay = y - dy;
  const bx = x + dx;
  const by = y + dy;
  const bulge = PARA_VIS_BULGE * halfLength * open;
  const cx = (ax + bx) * 0.5;
  const cy = (ay + by) * 0.5 + bulge;
  writeWorldToScreen(cam, w, h, ax, ay, _scrA);
  writeWorldToScreen(cam, w, h, bx, by, _scrB);
  writeWorldToScreen(cam, w, h, cx, cy, _scrC);
  const widthMul = 1 + (PARA_VIS_WIDTH_SCALE - 1) * open;
  const wid = Math.max(1, halfWidth * 2 * cam.zoom * widthMul);
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2a3340';
  ctx.lineWidth = wid + 2;
  ctx.beginPath();
  ctx.moveTo(_scrA.x, _scrA.y);
  ctx.quadraticCurveTo(_scrC.x, _scrC.y, _scrB.x, _scrB.y);
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = wid;
  ctx.beginPath();
  ctx.moveTo(_scrA.x, _scrA.y);
  ctx.quadraticCurveTo(_scrC.x, _scrC.y, _scrB.x, _scrB.y);
  ctx.stroke();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
