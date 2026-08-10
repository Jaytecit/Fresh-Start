/**
 * A5 — visual pose smoothing (render-only).
 * Extrapolates agent poses by leftover accumulator time using velocities.
 * Does not touch Rapier or change the fixed-dt step.
 */
import { FIXED_DT } from '../physics/constants';
import type { AgentSnapshot, SimulationSnapshot } from './simulation';

/** Muscle visuals store world endpoints at bone centers — rebind after bone extrapolate. */
function nearestBoneId(
  bones: AgentSnapshot['bones'],
  x: number,
  y: number,
): number | undefined {
  let bestId: number | undefined;
  let bestD = Infinity;
  for (const b of bones) {
    const dx = b.x - x;
    const dy = b.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      bestId = b.id;
    }
  }
  return bestId;
}

function extrapolateAgent(agent: AgentSnapshot, dt: number): AgentSnapshot {
  if (dt <= 1e-9) return agent;
  const bones = agent.bones.map((b) => ({
    ...b,
    x: b.x + b.vx * dt,
    y: b.y + b.vy * dt,
    angle: b.angle + b.omega * dt,
  }));
  const boneById = new Map(bones.map((b) => [b.id, b]));
  const joints = agent.joints.map((j) => ({
    ...j,
    x: j.x + j.vx * dt,
    y: j.y + j.vy * dt,
  }));
  const jointById = new Map(joints.map((j) => [j.id, j]));
  return {
    ...agent,
    joints,
    bones,
    struts: agent.struts.map((s) => {
      const a = jointById.get(s.startJointId);
      const b = jointById.get(s.endJointId);
      return {
        ...s,
        ax: a?.x ?? s.ax,
        ay: a?.y ?? s.ay,
        bx: b?.x ?? s.bx,
        by: b?.y ?? s.by,
      };
    }),
    muscles: agent.muscles.map((m) => {
      const aId = nearestBoneId(agent.bones, m.ax, m.ay);
      const bId = nearestBoneId(agent.bones, m.bx, m.by);
      const a = aId !== undefined ? boneById.get(aId) : undefined;
      const b = bId !== undefined ? boneById.get(bId) : undefined;
      return {
        ...m,
        ax: a?.x ?? m.ax,
        ay: a?.y ?? m.ay,
        bx: b?.x ?? m.bx,
        by: b?.y ?? m.by,
      };
    }),
  };
}

export function applyVisualPoseSmoothing(
  snap: SimulationSnapshot,
  extrapolateDt: number,
): SimulationSnapshot {
  // Guard: leftover must stay sub-frame. Multi-tick debt (e.g. Max train speed
  // under load) would look like the model exploding.
  const dt = Math.min(Math.max(0, extrapolateDt), FIXED_DT);
  if (dt <= 1e-9) return snap;
  const agents = snap.agents.map((a) => extrapolateAgent(a, dt));
  const focused = agents.find((a) => a.focused) ?? agents[0];
  return {
    ...snap,
    agents,
    joints: focused?.joints ?? snap.joints,
    bones: focused?.bones ?? snap.bones,
    struts: focused?.struts ?? snap.struts,
    muscles: focused?.muscles ?? snap.muscles,
  };
}
