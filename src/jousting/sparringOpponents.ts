/**
 * Versioned Jousting sparring partners.
 * Level 1 is a random-weight dummy on the trainee body; Level 2 is JoustBot.
 */
import { JOUST_OBS_COUNT } from '../brain/joustObs';
import { countDesignActuatorChannels } from '../brain/driveGroups';
import { createRng, makeShape, randomWeights } from '../brain/network';
import type { NetworkShape } from '../brain/types';
import { JOUSTBOT } from '../creature/joustBot';
import { cloneDesign, type CreatureDesign } from '../creature/types';

export type JoustSparringId = 'dummy' | 'joustbot';

export interface JoustSparringDef {
  id: JoustSparringId;
  level: 1 | 2;
  shortLabel: string;
  description: string;
}

export const DEFAULT_JOUST_SPARRING_ID: JoustSparringId = 'dummy';

export const JOUST_SPARRING_OPPONENTS: readonly JoustSparringDef[] = [
  {
    id: 'dummy',
    level: 1,
    shortLabel: 'Dummy',
    description:
      'Random-weight mirror of your body. Learn to charge, aim the lance, and stay up.',
  },
  {
    id: 'joustbot',
    level: 2,
    shortLabel: 'JoustBot',
    description: 'Bundled lance body with a random-weight brain that still charges.',
  },
] as const;

function joustShapeFor(design: CreatureDesign): NetworkShape {
  const channels = countDesignActuatorChannels(design, true);
  return makeShape(Math.max(channels, 1), JOUST_OBS_COUNT);
}

export function joustSparringSelectValue(id: JoustSparringId): string {
  return `joust:${id}`;
}

export function parseJoustSparringSelectValue(
  value: string,
): JoustSparringId | null {
  if (value === 'joust:dummy') return 'dummy';
  if (value === 'joust:joustbot') return 'joustbot';
  return null;
}

export function joustSparringOpponentLabel(
  id: JoustSparringId,
  traineeName: string,
): string {
  if (id === 'joustbot') return JOUSTBOT.name;
  return `Dummy (${traineeName || 'you'})`;
}

export interface ResolvedJoustSparring {
  id: JoustSparringId;
  name: string;
  level: 1 | 2;
  trained: boolean;
  design: CreatureDesign;
  shape: NetworkShape;
  weights: Float32Array;
}

export function resolveJoustSparringOpponent(
  traineeDesign: CreatureDesign,
  opponentId: JoustSparringId = DEFAULT_JOUST_SPARRING_ID,
  seed = 1,
): ResolvedJoustSparring {
  if (opponentId === 'joustbot') {
    const design = cloneDesign(JOUSTBOT);
    const shape = joustShapeFor(design);
    return {
      id: 'joustbot',
      name: JOUSTBOT.name,
      level: 2,
      trained: false,
      design,
      shape,
      weights: randomWeights(shape, createRng(seed + 991)),
    };
  }
  const design = cloneDesign(traineeDesign);
  const shape = joustShapeFor(design);
  return {
    id: 'dummy',
    name: joustSparringOpponentLabel('dummy', traineeDesign.name),
    level: 1,
    trained: false,
    design,
    shape,
    weights: randomWeights(shape, createRng(seed + 991)),
  };
}
