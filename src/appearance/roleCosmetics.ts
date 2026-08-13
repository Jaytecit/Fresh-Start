/**
 * Role cosmetics (glove noses, head disc size). Draw-time only — never Rapier.
 */
import type { BodyPartAttachment } from './types';

/** Same Kenney red nose FistiBot wears on its gloves. */
export const GLOVE_NOSE_ASSET_ID = 'monster/default/nose_red';
export const GLOVE_NOSE_SCALE = 0.76;
export const GLOVE_NOSE_ROTATION = -1.3;

/** Head joints draw at 3× a normal joint disc (2× the previous 1.5× head). */
export const HEAD_JOINT_VISUAL_SCALE = 3;

export function syntheticGloveNoseParts(
  joints: readonly { id: number; isGlove?: boolean }[],
  existing?: readonly BodyPartAttachment[] | null,
): BodyPartAttachment[] {
  const occupied = new Set<number>();
  for (const part of existing ?? []) {
    if (part.jointId !== undefined) occupied.add(part.jointId);
  }
  const parts: BodyPartAttachment[] = [];
  for (const joint of joints) {
    if (!joint.isGlove || occupied.has(joint.id)) continue;
    parts.push({
      assetId: GLOVE_NOSE_ASSET_ID,
      jointId: joint.id,
      scale: GLOVE_NOSE_SCALE,
      rotation: GLOVE_NOSE_ROTATION,
    });
  }
  return parts;
}
