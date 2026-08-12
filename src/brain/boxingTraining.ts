import type { BoxingDivisionId } from '../boxing/divisions';
import {
  DEFAULT_SPARRING_OPPONENT_ID,
  resolveSparringOpponent,
  type SparringOpponentId,
} from '../boxing/sparringOpponents';
import {
  computeBoxingTrainingFitness,
  DEFAULT_BOXING_PRIORITIES,
  type BoxingFitnessBreakdown,
  type BoxingPriorities,
} from '../boxing/rewards';
import {
  meanHitAccuracy,
  meanHitPower,
} from '../boxing/scoring';
import type { CreatureDesign } from '../creature/types';
import { cloneDesign } from '../creature/types';
import { boxingRingEnv } from '../env/boxingRingEnv';
import { FIXED_DT } from '../physics/constants';
import {
  shapeForBoxingDesign,
  Simulation,
  type BoxingMatchResult,
} from '../sim/simulation';
import { BOXING_OBS_PACK_VERSION } from './boxingObs';
import { breedNextGeneration, meanFitness, mutate } from './ga';
import { cloneWeights, createRng, randomWeights } from './network';
import type { Genome, NetworkShape } from './types';

export interface BoxingTrainingGeneration {
  generation: number;
  bestFitness: number;
  meanFitness: number;
  runBestFitness: number;
  pointsFor: number;
  pointsAgainst: number;
  attempts: number;
  hits: number;
  hitRate: number;
  meanPower: number;
  peakPower: number;
  meanAccuracy: number;
  upright: number;
  inactivitySeconds: number;
  engagementFrac: number;
  farFrac: number;
  clinchFrac: number;
  breakdown: BoxingFitnessBreakdown;
}

export interface BoxingTrainingResult {
  shape: NetworkShape;
  genome: Genome;
  generations: BoxingTrainingGeneration[];
  divisionId: BoxingDivisionId;
  opponentName: string;
}

export interface BoxingTrainingOptions {
  design: CreatureDesign;
  divisionId: BoxingDivisionId;
  opponentId?: SparringOpponentId;
  generations?: number;
  populationSize?: number;
  episodeSeconds?: number;
  seed?: number;
  seedGenome?: { shape: NetworkShape; weights: Float32Array };
  priorities?: BoxingPriorities;
  onGeneration?: (row: BoxingTrainingGeneration) => void;
}

export function exportBoxingTrainingTelemetry(
  result: BoxingTrainingResult,
  designName: string,
): string {
  return JSON.stringify(
    {
      version: 2,
      task: 'boxing',
      designName,
      divisionId: result.divisionId,
      divisionRuleVersion: 1,
      observationPackVersion: BOXING_OBS_PACK_VERSION,
      opponentName: result.opponentName,
      bestFitness: result.genome.fitness,
      generations: result.generations,
    },
    null,
    2,
  );
}

export function sparringDesignForDivision(
  divisionId: BoxingDivisionId,
): CreatureDesign {
  return resolveSparringOpponent(
    divisionId,
    DEFAULT_SPARRING_OPPONENT_ID,
  ).design;
}

export function boxingTrainingFitness(
  result: BoxingMatchResult,
  priorities: BoxingPriorities = DEFAULT_BOXING_PRIORITIES,
): number {
  return computeBoxingTrainingFitness(result, priorities).fitness;
}

export function boxingTrainingFitnessBreakdown(
  result: BoxingMatchResult,
  priorities: BoxingPriorities = DEFAULT_BOXING_PRIORITIES,
): BoxingFitnessBreakdown {
  return computeBoxingTrainingFitness(result, priorities);
}

export async function evaluateBoxingGenome(options: {
  design: CreatureDesign;
  shape: NetworkShape;
  weights: Float32Array;
  divisionId: BoxingDivisionId;
  opponentDesign: CreatureDesign;
  opponentShape: NetworkShape;
  opponentWeights: Float32Array;
  episodeSeconds: number;
}): Promise<BoxingMatchResult> {
  const simulation = new Simulation();
  await simulation.init();
  let result: BoxingMatchResult | null = null;
  try {
    simulation.setEnvironment(boxingRingEnv());
    simulation.startBoxingMatch({
      entries: [
        {
          design: cloneDesign(options.design),
          shape: options.shape,
          weights: cloneWeights(options.weights),
        },
        {
          design: cloneDesign(options.opponentDesign),
          shape: options.opponentShape,
          weights: cloneWeights(options.opponentWeights),
        },
      ],
      divisionId: options.divisionId,
      episodeSeconds: options.episodeSeconds,
      onFinished: (finished) => {
        result = finished;
      },
    });
    const steps = Math.ceil(options.episodeSeconds / FIXED_DT) + 1;
    for (let step = 0; step < steps && !result; step++) {
      simulation.step(FIXED_DT);
    }
  } finally {
    simulation.world?.free();
    simulation.world = null;
  }
  if (!result) throw new Error('Boxing evaluation did not finish');
  return result;
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** K6 — seeded GA against a versioned division sparring partner. */
export async function evolveBoxingBrain(
  options: BoxingTrainingOptions,
): Promise<BoxingTrainingResult> {
  const generations = Math.max(1, Math.round(options.generations ?? 10));
  const populationSize = Math.max(4, Math.round(options.populationSize ?? 12));
  const episodeSeconds = Math.max(4, options.episodeSeconds ?? 12);
  const priorities = options.priorities ?? DEFAULT_BOXING_PRIORITIES;
  const rng = createRng(options.seed ?? 1);
  const shape = shapeForBoxingDesign(options.design);
  const opponent = resolveSparringOpponent(
    options.divisionId,
    options.opponentId ?? DEFAULT_SPARRING_OPPONENT_ID,
    options.seed ?? 1,
  );
  const opponentDesign = opponent.design;
  const opponentShape = opponent.shape;
  const opponentWeights = opponent.weights;
  const seedGenome =
    options.seedGenome &&
    options.seedGenome.shape.inputCount === shape.inputCount &&
    options.seedGenome.shape.hiddenCount === shape.hiddenCount &&
    options.seedGenome.shape.outputCount === shape.outputCount &&
    options.seedGenome.weights.length === shape.weightCount
      ? options.seedGenome
      : null;
  let population: Genome[] = [];
  if (seedGenome) {
    population.push({ weights: cloneWeights(seedGenome.weights), fitness: 0 });
    while (population.length < populationSize) {
      population.push({
        weights: mutate(seedGenome.weights, rng),
        fitness: 0,
      });
    }
  } else {
    population = Array.from({ length: populationSize }, () => ({
      weights: randomWeights(shape, rng),
      fitness: 0,
    }));
  }
  let best: Genome = {
    weights: cloneWeights(population[0].weights),
    fitness: -Infinity,
  };
  const rows: BoxingTrainingGeneration[] = [];

  for (let generation = 0; generation < generations; generation++) {
    let generationBest: BoxingMatchResult | null = null;
    let generationBestFitness = -Infinity;
    let generationBestBreakdown: BoxingFitnessBreakdown | null = null;
    for (const genome of population) {
      const result = await evaluateBoxingGenome({
        design: options.design,
        shape,
        weights: genome.weights,
        divisionId: options.divisionId,
        opponentDesign,
        opponentShape,
        opponentWeights,
        episodeSeconds,
      });
      const breakdown = boxingTrainingFitnessBreakdown(result, priorities);
      genome.fitness = breakdown.fitness;
      if (genome.fitness > generationBestFitness) {
        generationBestFitness = genome.fitness;
        generationBest = result;
        generationBestBreakdown = breakdown;
      }
      if (genome.fitness > best.fitness) {
        best = {
          weights: cloneWeights(genome.weights),
          fitness: genome.fitness,
        };
      }
      await yieldToUi();
    }

    const own = generationBest!.score.fighters[0];
    const rival = generationBest!.score.fighters[1];
    const behavior = generationBest!.behavior.fighters[0];
    const steps = Math.max(1, behavior.steps);
    const row: BoxingTrainingGeneration = {
      generation,
      bestFitness: generationBestFitness,
      meanFitness: meanFitness(population),
      runBestFitness: best.fitness,
      pointsFor: own.points,
      pointsAgainst: rival.points,
      attempts: own.attempts,
      hits: own.hits,
      hitRate: own.attempts > 0 ? own.hits / own.attempts : 0,
      meanPower: meanHitPower(own),
      peakPower: own.peakPower,
      meanAccuracy: meanHitAccuracy(own),
      upright: generationBest!.upright[0],
      inactivitySeconds: behavior.maxAttemptIdleSeconds,
      engagementFrac: behavior.engagementSteps / steps,
      farFrac: behavior.farSteps / steps,
      clinchFrac: behavior.clinchSteps / steps,
      breakdown: generationBestBreakdown!,
    };
    rows.push(row);
    options.onGeneration?.(row);
    if (generation + 1 < generations) {
      population = breedNextGeneration(population, populationSize, rng, {
        crossover: true,
      });
    }
  }

  return {
    shape,
    genome: best,
    generations: rows,
    divisionId: options.divisionId,
    opponentName: opponent.name,
  };
}
