import {
  computeJoustingFitness,
  DEFAULT_JOUSTING_PRIORITIES,
  type JoustFitnessBreakdown,
  type JoustingPriorities,
} from '../jousting/scorecard';
import {
  DEFAULT_JOUST_SPARRING_ID,
  resolveJoustSparringOpponent,
  type JoustSparringId,
} from '../jousting/sparringOpponents';
import { meanHitAccuracy, meanHitPower } from '../jousting/scoring';
import type { CreatureDesign } from '../creature/types';
import { cloneDesign } from '../creature/types';
import { joustLaneEnv } from '../env/joustLaneEnv';
import {
  FIXED_DT,
  JOUST_AFTERMATH_SECONDS,
  JOUST_MAX_SECONDS,
} from '../physics/constants';
import {
  shapeForJoustingDesign,
  Simulation,
  type JoustMatchResult,
} from '../sim/simulation';
import { JOUST_OBS_PACK_VERSION } from './joustObs';
import { breedNextGeneration, meanFitness, mutate } from './ga';
import { cloneWeights, createRng, randomWeights } from './network';
import type { Genome, NetworkShape } from './types';

export interface JoustingTrainingGeneration {
  generation: number;
  bestFitness: number;
  meanFitness: number;
  runBestFitness: number;
  hitQuality: number;
  stayUp: number;
  unhorse: number;
  knockback: number;
  commit: number;
  hits: number;
  attempts: number;
  meanPower: number;
  meanAccuracy: number;
  breakdown: JoustFitnessBreakdown;
}

export interface JoustingTrainingResult {
  shape: NetworkShape;
  genome: Genome;
  generations: JoustingTrainingGeneration[];
  opponentName: string;
}

export interface JoustingTrainingOptions {
  design: CreatureDesign;
  opponentId?: JoustSparringId;
  generations?: number;
  populationSize?: number;
  episodeSeconds?: number;
  seed?: number;
  seedGenome?: { shape: NetworkShape; weights: Float32Array };
  priorities?: JoustingPriorities;
  onGeneration?: (row: JoustingTrainingGeneration) => void;
}

export function exportJoustingTrainingTelemetry(
  result: JoustingTrainingResult,
  designName: string,
): string {
  return JSON.stringify(
    {
      version: 1,
      task: 'jousting',
      designName,
      observationPackVersion: JOUST_OBS_PACK_VERSION,
      opponentName: result.opponentName,
      bestFitness: result.genome.fitness,
      generations: result.generations,
    },
    null,
    2,
  );
}

export async function evaluateJoustingGenome(options: {
  design: CreatureDesign;
  shape: NetworkShape;
  weights: Float32Array;
  opponentDesign: CreatureDesign;
  opponentShape: NetworkShape;
  opponentWeights: Float32Array;
  episodeSeconds: number;
  priorities?: JoustingPriorities;
}): Promise<JoustMatchResult> {
  const simulation = new Simulation();
  await simulation.init();
  let result: JoustMatchResult | null = null;
  try {
    simulation.setEnvironment(joustLaneEnv());
    simulation.startJoustMatch({
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
      episodeSeconds: options.episodeSeconds,
      priorities: options.priorities,
      onFinished: (finished) => {
        result = finished;
      },
    });
    const steps =
      Math.ceil(
        (options.episodeSeconds + JOUST_AFTERMATH_SECONDS) / FIXED_DT,
      ) + 40;
    for (let step = 0; step < steps && !result; step++) {
      simulation.step(FIXED_DT);
    }
  } finally {
    simulation.world?.free();
    simulation.world = null;
  }
  if (!result) throw new Error('Jousting evaluation did not finish');
  return result;
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** L6 — seeded GA against a dummy or JoustBot partner. */
export async function evolveJoustingBrain(
  options: JoustingTrainingOptions,
): Promise<JoustingTrainingResult> {
  const generations = Math.max(1, Math.round(options.generations ?? 10));
  const populationSize = Math.max(4, Math.round(options.populationSize ?? 12));
  const episodeSeconds = Math.max(6, options.episodeSeconds ?? JOUST_MAX_SECONDS);
  const priorities = options.priorities ?? DEFAULT_JOUSTING_PRIORITIES;
  const rng = createRng(options.seed ?? 1);
  const shape = shapeForJoustingDesign(options.design);
  const opponent = resolveJoustSparringOpponent(
    options.design,
    options.opponentId ?? DEFAULT_JOUST_SPARRING_ID,
    options.seed ?? 1,
  );
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
  const rows: JoustingTrainingGeneration[] = [];

  for (let generation = 0; generation < generations; generation++) {
    let generationBest: JoustMatchResult | null = null;
    let generationBestFitness = -Infinity;
    let generationBestBreakdown: JoustFitnessBreakdown | null = null;
    for (const genome of population) {
      const result = await evaluateJoustingGenome({
        design: options.design,
        shape,
        weights: genome.weights,
        opponentDesign: opponent.design,
        opponentShape: opponent.shape,
        opponentWeights: opponent.weights,
        episodeSeconds,
        priorities,
      });
      const breakdown = computeJoustingFitness(
        result.scorecard,
        result.winner,
        priorities,
      );
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

    const own = generationBest!.scorecard.hits[0];
    const row: JoustingTrainingGeneration = {
      generation,
      bestFitness: generationBestFitness,
      meanFitness: meanFitness(population),
      runBestFitness: best.fitness,
      hitQuality: generationBest!.scorecard.fighters[0].hitQuality,
      stayUp: generationBest!.scorecard.fighters[0].stayUp,
      unhorse: generationBest!.scorecard.fighters[0].unhorse,
      knockback: generationBest!.scorecard.fighters[0].knockback,
      commit: generationBest!.scorecard.fighters[0].commit,
      hits: own.hits,
      attempts: own.attempts,
      meanPower: meanHitPower(own),
      meanAccuracy: meanHitAccuracy(own),
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
    opponentName: opponent.name,
  };
}
