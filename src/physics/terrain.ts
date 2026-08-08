/**
 * G3 — Rapier heightfield from Environment Studio terrain (C2.3).
 */
import type { EnvTerrain } from '../env/types';
import { terrainHeightsForRapier, terrainPolyline } from '../env/terrainMath';
import { GROUND_RESTITUTION, WORLD_GRIP } from './constants';
import { clampWorldGrip, groundCollisionGroups, RAPIER } from './world';

export interface TerrainVisual {
  points: { x: number; y: number }[];
}

export interface TerrainHandle {
  body: RAPIER.RigidBody;
  visual: TerrainVisual;
}

export function spawnTerrainHeightfield(
  world: RAPIER.World,
  terrain: EnvTerrain,
  worldGrip: number = WORLD_GRIP,
): TerrainHandle | null {
  const { heights, midX, width } = terrainHeightsForRapier(terrain);
  if (heights.length < 2 || width < 1e-6) return null;

  const groups = groundCollisionGroups();
  const grip = clampWorldGrip(worldGrip);
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(midX, 0),
  );
  world.createCollider(
    RAPIER.ColliderDesc.heightfield(heights, { x: width, y: 1 })
      .setFriction(grip)
      .setRestitution(GROUND_RESTITUTION)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Max)
      .setCollisionGroups(groups)
      .setSolverGroups(groups),
    body,
  );
  return {
    body,
    visual: { points: terrainPolyline(terrain) },
  };
}

export function applyWorldGripToTerrain(
  handle: TerrainHandle | null,
  friction: number,
): void {
  if (!handle) return;
  const grip = clampWorldGrip(friction);
  for (let ci = 0; ci < handle.body.numColliders(); ci++) {
    const col = handle.body.collider(ci);
    col.setFriction(grip);
    col.setFrictionCombineRule(RAPIER.CoefficientCombineRule.Max);
  }
}

export function destroyTerrain(
  world: RAPIER.World,
  handle: TerrainHandle | null,
): void {
  if (!handle) return;
  world.removeRigidBody(handle.body);
}
