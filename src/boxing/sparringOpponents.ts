/**
 * Versioned Boxing sparring partners.
 * Level 1 is a random-weight dummy; Level 2 is the bundled BoxoBot V2T brain.
 */
import { BOXING_OBS_COUNT } from '../brain/boxingObs';
import { countDesignActuatorChannels } from '../brain/driveGroups';
import { cloneWeights, createRng, makeShape, randomWeights } from '../brain/network';
import type { NetworkShape } from '../brain/types';
import { BOXOBOT } from '../creature/boxoBot';
import { cloneDesign, type CreatureDesign } from '../creature/types';
import boxoBotV2TRaw from '../library/bundled/BoxoBot_V2T.json';
import { importModelJson } from '../library/jsonIO';
import type { BoxingDivisionId } from './divisions';
import { GROUNDED_FIGHTER } from './referenceFighters';

export type SparringOpponentId = 'dummy' | 'boxobot-v2t';

export interface SparringOpponentDef {
  id: SparringOpponentId;
  level: 1 | 2;
  /** Short name without the dummy body suffix. */
  shortLabel: string;
  description: string;
  divisions: readonly BoxingDivisionId[];
}

export const DEFAULT_SPARRING_OPPONENT_ID: SparringOpponentId = 'dummy';

export const SPARRING_OPPONENTS: readonly SparringOpponentDef[] = [
  {
    id: 'dummy',
    level: 1,
    shortLabel: 'Dummy',
    description:
      'Random-weight punching bag. Learn stance, range, and landing hits.',
    divisions: ['upright', 'grounded', 'open-frame'],
  },
  {
    id: 'boxobot-v2t',
    level: 2,
    shortLabel: 'BoxoBot V2T',
    description: 'Trained upright boxer that punches back.',
    divisions: ['upright', 'open-frame'],
  },
] as const;

const parsedV2T = importModelJson(JSON.stringify(boxoBotV2TRaw));
if (!parsedV2T.ok) {
  throw new Error(`Bundled BoxoBot V2T is invalid: ${parsedV2T.error}`);
}

export const BOXOBOT_V2: CreatureDesign = cloneDesign(parsedV2T.value.design);
export const BOXOBOT_V2T_NAME = parsedV2T.value.name;
export const BOXOBOT_V2T_FITNESS = parsedV2T.value.fitness;
const BOXOBOT_V2T_SHAPE: NetworkShape = { ...parsedV2T.value.shape };
const BOXOBOT_V2T_WEIGHTS = parsedV2T.value.weights;

function boxingShapeFor(design: CreatureDesign): NetworkShape {
  const channels = countDesignActuatorChannels(design, true);
  return makeShape(Math.max(channels, 1), BOXING_OBS_COUNT);
}

export function dummySparringDesign(
  divisionId: BoxingDivisionId,
): CreatureDesign {
  if (divisionId === 'grounded') return cloneDesign(GROUNDED_FIGHTER);
  return cloneDesign(BOXOBOT);
}

export function sparringOpponentsForDivision(
  divisionId: BoxingDivisionId,
): readonly SparringOpponentDef[] {
  return SPARRING_OPPONENTS.filter((item) =>
    item.divisions.includes(divisionId),
  );
}

export function normalizeSparringOpponentId(
  divisionId: BoxingDivisionId,
  id: SparringOpponentId,
): SparringOpponentId {
  if (sparringOpponentsForDivision(divisionId).some((item) => item.id === id)) {
    return id;
  }
  return DEFAULT_SPARRING_OPPONENT_ID;
}

export function sparringOpponentLabel(
  id: SparringOpponentId,
  divisionId: BoxingDivisionId,
): string {
  if (id === 'boxobot-v2t') return BOXOBOT_V2T_NAME;
  const body = dummySparringDesign(divisionId);
  return `Dummy (${body.name})`;
}

export function sparringSelectValue(id: SparringOpponentId): string {
  return `sparring:${id}`;
}

export function parseSparringSelectValue(
  value: string,
): SparringOpponentId | null {
  if (value === 'sparring:dummy') return 'dummy';
  if (value === 'sparring:boxobot-v2t') return 'boxobot-v2t';
  return null;
}

export interface ResolvedSparringOpponent {
  id: SparringOpponentId;
  name: string;
  level: 1 | 2;
  trained: boolean;
  design: CreatureDesign;
  shape: NetworkShape;
  weights: Float32Array;
}

export function resolveSparringOpponent(
  divisionId: BoxingDivisionId,
  opponentId: SparringOpponentId = DEFAULT_SPARRING_OPPONENT_ID,
  seed = 1,
): ResolvedSparringOpponent {
  const id = normalizeSparringOpponentId(divisionId, opponentId);
  if (id === 'boxobot-v2t') {
    const design = cloneDesign(BOXOBOT_V2);
    const expected = boxingShapeFor(design);
    if (
      expected.inputCount !== BOXOBOT_V2T_SHAPE.inputCount ||
      expected.hiddenCount !== BOXOBOT_V2T_SHAPE.hiddenCount ||
      expected.outputCount !== BOXOBOT_V2T_SHAPE.outputCount ||
      expected.weightCount !== BOXOBOT_V2T_SHAPE.weightCount ||
      BOXOBOT_V2T_WEIGHTS.length !== BOXOBOT_V2T_SHAPE.weightCount
    ) {
      throw new Error('BoxoBot V2T brain does not match its body');
    }
    return {
      id,
      name: BOXOBOT_V2T_NAME,
      level: 2,
      trained: true,
      design,
      shape: { ...BOXOBOT_V2T_SHAPE },
      weights: cloneWeights(BOXOBOT_V2T_WEIGHTS),
    };
  }

  const design = dummySparringDesign(divisionId);
  const shape = boxingShapeFor(design);
  return {
    id: 'dummy',
    name: sparringOpponentLabel('dummy', divisionId),
    level: 1,
    trained: false,
    design,
    shape,
    weights: randomWeights(shape, createRng(seed + 991)),
  };
}
