import {
  BRAIN_DT,
  BRAIN_HZ,
  ELITE_COUNT,
  EPISODE_SECONDS,
  GHOST_OPACITY,
  LIVE_BATCH_SIZE,
  LIVE_MAX_GENERATIONS,
  LIVE_POPULATION_SIZE,
  MUTATION_RESET_RATE,
  MUTATION_SIGMA,
  OBS_COUNT,
  RAYCAST_OBS_COUNT,
  TOURNAMENT_SIZE,
  type BrainHz,
} from '../brain/constants';
import {
  collapseMuscleDrivesToChannels,
  countBrainActuatorChannels,
  countDesignActuatorChannels,
  designHasActuators,
  expandChannelDrives,
  extractWheelDrives,
} from '../brain/driveGroups';
import {
  breedNextGeneration,
  meanFitness,
  mutate,
  type BreedOptions,
} from '../brain/ga';
import {
  adaptiveEpisodeSeconds,
  annealedMutationSigma,
} from '../brain/trainingRecipes';
import {
  applyGoalPriorities,
  DEFAULT_GOAL_PRIORITIES,
  type GoalPriorities,
} from '../brain/goalPriorities';
import {
  cloneWeights,
  createRng,
  evaluateNetwork,
  makeShape,
  randomWeights,
} from '../brain/network';
import { transplantWeights } from '../brain/transplantWeights';
import {
  createFootLiftState,
  instantUprightQuality,
  updateFootLiftState,
  type FootLiftState,
} from '../brain/fitness';
import {
  emptyMetrics,
  scoreTaskPerformance,
  updateFallState,
  updateJumpFlightTrackers,
  type TaskEpisodeMetrics,
} from '../brain/taskScore';
import {
  activeCourseMarkers,
  emptyCourseMarkerAccum,
  updateCourseMarkerAccum,
  type CourseMarkerAccum,
} from '../brain/courseMarkers';
import {
  activeScoreRegions,
  emptyScoreRegionAccum,
  shouldEndEpisodeOnLanding,
  updateScoreRegionAccum,
  type ScoreRegionAccum,
} from '../brain/scoreRegions';
import {
  avgJointVelX,
  avgJointX,
  buildObservations,
} from '../brain/observations';
import {
  buildDanceObservations,
  DANCE_OBS_COUNT,
} from '../brain/danceObs';
import {
  BOXING_OBS_COUNT,
  buildBoxingObservations,
} from '../brain/boxingObs';
import {
  JOUST_OBS_COUNT,
  buildJoustObservations,
} from '../brain/joustObs';
import {
  buildRaycastObservations,
  raycastObsEnabled,
} from '../brain/raycastObs';
import type {
  EvolutionProgress,
  Genome,
  NetworkShape,
  TaskId,
} from '../brain/types';
import { isFlightTask, isMotorTask } from '../brain/types';
import { CLEAR_BAR_HEIGHT } from '../brain/constants';
import type { AudioBands } from '../audio/audioAnalysis';
import type { AeroType, CreatureDesign } from '../creature/types';
import { cloneDesign } from '../creature/types';
import {
  boxingEligibility,
  type BoxingDivisionId,
} from '../boxing/divisions';
import {
  createBoxingHitTracker,
  createBoxingProbes,
  detectBoxingHits,
  type BoxingHitTracker,
  type BoxingProbeSet,
} from '../boxing/hitProbes';
import { enableBoxingOpponentContact } from '../boxing/opponentContact';
import {
  computeBoxingTrainingFitness,
  createBoxingBehaviorMetrics,
  DEFAULT_BOXING_PRIORITIES,
  updateBoxingBehaviorMetrics,
  type BoxingBehaviorMetrics,
  type BoxingPriorities,
} from '../boxing/rewards';
import {
  createBoxingMatchScore,
  recordBoxingHit,
  type BoxingHitEvent,
  type BoxingMatchScore,
  type BoxingOwner,
} from '../boxing/scoring';
import { joustingEligibility } from '../jousting/eligibility';
import {
  createJoustHitTracker,
  createJoustProbes,
  detectJoustHits,
  type JoustHitTracker,
  type JoustProbeSet,
} from '../jousting/hitProbes';
import { enableJoustOpponentContact } from '../jousting/opponentContact';
import {
  createJoustPassState,
  updateJoustPass,
  type JoustClashReason,
  type JoustPassPhase,
  type JoustPassState,
} from '../jousting/pass';
import {
  computeJoustingFitness,
  createJoustScorecard,
  DEFAULT_JOUSTING_PRIORITIES,
  freezeJoustScorecard,
  joustWinner,
  type JoustingPriorities,
  type JoustScorecard,
} from '../jousting/scorecard';
import {
  recordJoustHit,
  type JoustHitEvent,
  type JoustOwner,
} from '../jousting/scoring';
import {
  applyMuscleForces,
  type MuscleForceOptions,
  type MuscleVisualState,
  type RuntimeMuscle,
} from '../control/muscleDrive';
import { sineMuscleOutputs } from '../control/sineDriver';
import { applyAeroForces } from '../physics/aeroForces';
import {
  destroyCourse,
  destroyRoughCourse,
  applyWorldGripToCourse,
  spawnClearBarCourse,
  spawnClimbCourse,
  spawnMotorGapCourse,
  spawnMotorHurdlesCourse,
  spawnMotorRampCourse,
  spawnRoughCourse,
  type CourseHandle,
  type RoughCourseHandle,
} from '../physics/course';
import {
  ANGULAR_DAMPING,
  ANTI_SCOOT,
  BOXING_MATCH_SECONDS,
  BOXING_SPAWN_X,
  BOXING_TRAIN_PAIR_GAP,
  JOUST_AFTERMATH_SECONDS,
  JOUST_MAX_SECONDS,
  JOUST_SPAWN_X,
  JOUST_TRAIN_PAIR_GAP,
  DEFAULT_DISCO_PUPPET_MODE,
  DEFAULT_JOINT_MASS,
  FOOT_MASS_DEFAULT,
  WHEEL_MASS_DEFAULT,
  clampFootMass,
  clampWheelMass,
  DISCO_PUPPET_MODES,
  FIXED_DT,
  FOOT_FRICTION,
  LINEAR_DAMPING,
  WORLD_GRIP,
  type DiscoPuppetMode,
} from '../physics/constants';
import {
  applyWorldGripToObstacles,
  destroyObstacles,
  spawnStaticObstacles,
  type ObstacleHandle,
  type ObstacleVisual,
} from '../physics/obstacles';
import {
  applyWorldGripToTerrain,
  destroyTerrain,
  spawnTerrainHeightfield,
  type TerrainHandle,
  type TerrainVisual,
} from '../physics/terrain';
import {
  applyWorldGripToTower,
  destroyTower,
  spawnLaunchTower,
  type TowerCuboidVisual,
  type TowerHandle,
} from '../physics/tower';
import {
  applyLaunchPads,
  createLaunchPadCooldown,
  isLaunchBoosting,
  resetLaunchPadCooldown,
  type LaunchPadCooldown,
} from '../physics/launchPad';
import {
  applyPlantSlideBrake,
  clampAntiScoot,
} from '../physics/plantSlideBrake';
import {
  applyGroundFriction,
  clampWorldGrip,
  createWorld,
  initRapier,
  RAPIER,
} from '../physics/world';
import { applyMotorTorques } from '../physics/motorDrive';
import {
  createStallTracker,
  finalizeStallDiagnostics,
  noteStallProgress,
  type StallDiagnostics,
  type StallTracker,
} from '../physics/obstacleContactProbe';
import {
  applyMessyBodyJitter,
  applyMorphToDesign,
  cloneMorphGenes,
  mutateMorphGenes,
  zeroMorphGenes,
} from '../creature/morphGenes';
import {
  cloneTopology,
  morphForTopology,
  mutateStructure,
  remapPaddedActuatorDrives,
  structureChannelBudget,
} from '../creature/structureGenes';
import { isFeatureEnabled } from '../port/featureFlags';
import {
  cloneEnvironment,
  flatGroundEnv,
  resolveSpawn,
  type EnvironmentDesign,
  type EnvCourseMarker,
  type EnvScoreRegion,
} from '../env/types';
import {
  applyFootFriction,
  clampFootFriction,
  destroyCreature,
  spawnCreature,
  syncCreatureSoftCcd,
  type SpawnOffset,
  type SpawnedCreature,
} from '../physics/spawn';

export type DriveMode = 'manual' | 'sine' | 'idle' | 'brain' | 'disco';

export interface AgentSnapshot {
  joints: {
    id: number;
    x: number;
    y: number;
    radius: number;
    vx: number;
    vy: number;
    isGlove?: boolean;
    isLance?: boolean;
    isHitTarget?: boolean;
    isHead?: boolean;
    hitValue?: number;
  }[];
  bones: {
    id: number;
    x: number;
    y: number;
    angle: number;
    halfLength: number;
    halfWidth: number;
    vx: number;
    vy: number;
    omega: number;
    /** G10 — structural aero type (render canopy morph). */
    aeroType?: AeroType;
    /** G10 — runtime parachute inflation 0…1 (cosmetic canopy). */
    chuteInflation?: number;
  }[];
  /** G8 — rigid strut visuals (joint endpoints; no capsule pose). */
  struts: {
    id: number;
    startJointId: number;
    endJointId: number;
    ax: number;
    ay: number;
    bx: number;
    by: number;
  }[];
  muscles: MuscleVisualState[];
  opacity: number;
  focused: boolean;
  /** Per-agent cosmetics (disco multi-dancer / mirrored slots). */
  appearance?: import('../appearance/types').AppearanceRig;
}

/** A7 — focused MLP probe for live network visualization. */
export interface LiveBrainProbe {
  shape: NetworkShape;
  weights: Float32Array;
  inputs: Float32Array;
  outputs: Float32Array;
  hidden: Float32Array;
  /** Population index when evolving; -1 for solo / Play best. */
  genomeIndex: number;
  focusIndex: number;
}

/** B6 — live episode trackers for the focused creature. */
export interface LiveFocusStats {
  distance: number;
  footLifts: number;
  peakHeight: number;
  airTime: number;
  fell: boolean;
  uprightQuality: number;
  fitness: number;
  /** C2.10 — race clock armed after start line. */
  courseArmed: boolean;
  /** C2.10 — elapsed race seconds; null until start. */
  raceTime: number | null;
  checkpointsHit: number;
  finished: boolean;
}

export interface SimulationSnapshot {
  joints: AgentSnapshot['joints'];
  bones: AgentSnapshot['bones'];
  struts: AgentSnapshot['struts'];
  muscles: MuscleVisualState[];
  time: number;
  agents: AgentSnapshot[];
  focusX: number;
  focusY: number;
  cameraFollow: boolean;
  evolve: EvolutionProgress | null;
  /** Cosmetic rig from current design (render-only). */
  appearance?: import('../appearance/types').AppearanceRig;
  /** Skip muscle strokes when drawing. */
  hideMuscles?: boolean;
  /** Skip bone capsules + joint dots when drawing. */
  hideBones?: boolean;
  /** Skip solid strut lines when drawing (G8). */
  hideSolidStruts?: boolean;
  task: TaskId;
  /** Leftover fixed-dt accumulator — used for A5 visual pose smoothing. */
  extrapolateDt: number;
  /** Focused creature brain (live evolve or brain drive). */
  brain?: LiveBrainProbe | null;
  /** G1 — static obstacle visuals for render (empty when flag off / none). */
  obstacles: ObstacleVisual[];
  /** G3 — heightfield polyline for render. */
  terrain: TerrainVisual | null;
  /** C2.4 — launch tower cuboids for render. */
  tower: TowerCuboidVisual[];
  /** C2.9 — score region overlays (score-only; empty when flag off). */
  scoreRegions: EnvScoreRegion[];
  /** C2.10 — course marker overlays (score-only; empty when flag off). */
  courseMarkers: EnvCourseMarker[];
  /** C2.7 — environment theme for parallax / sky. */
  theme: import('../env/types').EnvTheme;
  /** Live focused episode stats (evolve cohort or solo watch). */
  liveStats: LiveFocusStats | null;
  /** Most recent completed episode metrics. */
  lastEpisodeMetrics: TaskEpisodeMetrics | null;
  /** I6 — dual-model gauntlet HUD when active. */
  headToHead: HeadToHeadSnapshot | null;
  /** K5 — active or just-finished Boxing points match. */
  boxing?: BoxingMatchSnapshot | null;
  /** L5 — active or just-finished Jousting pass. */
  jousting?: JoustMatchSnapshot | null;
}

interface CohortMember {
  creature: SpawnedCreature;
  genomeIndex: number;
  weights: Float32Array;
  brainDrives: number[];
  brainAccumulator: number;
  /** Last obs / hidden / outs for A7 live viz (filled on brain tick). */
  lastObs: Float32Array;
  lastHidden: Float32Array;
  startX: number;
  fallTime: number;
  fell: boolean;
  /** C2.9 — successful landing credited; try freezes (not a fall). */
  landed: boolean;
  footLifts: number;
  planted: FootLiftState;
  muscleVisual: MuscleVisualState[];
  peakHeight: number;
  airTime: number;
  airHeightIntegral: number;
  impactSpeed: number;
  airborneTravel: number;
  prevAvgX: number;
  uprightSum: number;
  uprightSteps: number;
  peakSpeed: number;
  /** Best forward progress (avgJointX − startX) this episode. */
  peakDistance: number;
  regionAccum: ScoreRegionAccum;
  courseAccum: CourseMarkerAccum;
  /** D16 — stall contact tracker (telemetry). */
  stall: StallTracker;
  /** Per-member design when cohort members differ (H2H). */
  memberDesign?: CreatureDesign;
  /** Per-member MLP shape when cohort members differ (H2H). */
  memberShape?: NetworkShape;
}

interface DiscoDancerRuntime {
  design: CreatureDesign;
  creature: SpawnedCreature;
  muscleVisual: MuscleVisualState[];
  resolveDrives: () => number[];
}

export interface DiscoDancerSlot {
  design: CreatureDesign;
  offsetX: number;
}

export interface HeadToHeadEntry {
  design: CreatureDesign;
  shape: NetworkShape;
  weights: Float32Array;
}

export interface HeadToHeadResult {
  fitness: [number, number];
  metrics: [TaskEpisodeMetrics, TaskEpisodeMetrics];
}

export interface HeadToHeadOptions {
  entries: [HeadToHeadEntry, HeadToHeadEntry];
  task: TaskId;
  episodeSeconds?: number;
  onProgress?: (episodeT: number, episodeDuration: number) => void;
  onFinished?: (result: HeadToHeadResult) => void;
}

export interface HeadToHeadSnapshot {
  episodeT: number;
  episodeDuration: number;
  fitness: [number, number];
  names: [string, string];
}

export type BoxingMatchEntry = HeadToHeadEntry;

export interface BoxingMatchResult {
  score: BoxingMatchScore;
  winner: BoxingOwner | null;
  reason: 'points' | 'draw';
  episodeDuration: number;
  upright: [number, number];
  behavior: BoxingBehaviorMetrics;
}

export interface BoxingMatchOptions {
  entries: [BoxingMatchEntry, BoxingMatchEntry];
  divisionId: BoxingDivisionId;
  episodeSeconds?: number;
  onProgress?: (snapshot: BoxingMatchSnapshot) => void;
  onFinished?: (result: BoxingMatchResult) => void;
}

/** K6 — batched live Boxing GA (parallel trainee↔sparring pairs). */
export interface BoxingLiveEvolveOptions {
  design: CreatureDesign;
  divisionId: BoxingDivisionId;
  opponentDesign: CreatureDesign;
  /** Omit to use a seeded random dummy brain for the sparring body. */
  opponentWeights?: Float32Array;
  populationSize?: number;
  batchSize?: number;
  maxGenerations?: number;
  episodeSeconds?: number;
  seed?: number;
  seedGenome?: { shape: NetworkShape; weights: Float32Array };
  breed?: BreedOptions;
  priorities?: BoxingPriorities;
  onProgress?: (p: EvolutionProgress) => void;
  onFinished?: (best: Genome, shape: NetworkShape) => void;
}

export interface BoxingMatchSnapshot {
  episodeT: number;
  episodeDuration: number;
  divisionId: BoxingDivisionId;
  ruleVersion: 1;
  names: [string, string];
  points: [number, number];
  hits: [number, number];
  lastHit: BoxingHitEvent | null;
  finished: boolean;
  winner: BoxingOwner | null;
}

export type JoustMatchEntry = HeadToHeadEntry;

export interface JoustMatchResult {
  scorecard: JoustScorecard;
  winner: JoustOwner | null;
  reason: JoustClashReason | 'draw';
  episodeDuration: number;
}

export interface JoustMatchOptions {
  entries: [JoustMatchEntry, JoustMatchEntry];
  episodeSeconds?: number;
  priorities?: JoustingPriorities;
  onProgress?: (snapshot: JoustMatchSnapshot) => void;
  onFinished?: (result: JoustMatchResult) => void;
}

export interface JoustLiveEvolveOptions {
  design: CreatureDesign;
  opponentDesign: CreatureDesign;
  opponentWeights?: Float32Array;
  populationSize?: number;
  batchSize?: number;
  maxGenerations?: number;
  episodeSeconds?: number;
  seed?: number;
  seedGenome?: { shape: NetworkShape; weights: Float32Array };
  breed?: BreedOptions;
  priorities?: JoustingPriorities;
  onProgress?: (p: EvolutionProgress) => void;
  onFinished?: (best: Genome, shape: NetworkShape) => void;
}

export interface JoustMatchSnapshot {
  episodeT: number;
  episodeDuration: number;
  names: [string, string];
  totals: [number, number];
  hits: [number, number];
  phase: JoustPassPhase;
  clashReason: JoustClashReason | null;
  lastHit: JoustHitEvent | null;
  finished: boolean;
  winner: JoustOwner | null;
}

/** E5 — champion / replay metrics snapshot for secret evaluation. */
export interface EpisodeCompleteSnapshot {
  task: TaskId;
  metrics: TaskEpisodeMetrics;
  design: CreatureDesign;
  episodeSeconds: number;
  generation?: number;
  context: 'evolve' | 'replay';
  /** Population mean fitness at gen complete (evolve champion emit only). */
  meanFitness?: number;
  /** Run-best fitness so far (evolve champion emit only). */
  runBestFitness?: number;
  /** Population size for the evolve run (evolve champion emit only). */
  populationSize?: number;
  /** D16 — stall / contact diagnostics for gen champion (evolve only). */
  stall?: StallDiagnostics | null;
  /** D17 — morph genes for gen champion (evolve only). */
  morph?: Genome['morph'];
}

interface SoloEpisodeWatch {
  design: CreatureDesign;
  task: TaskId;
  startX: number;
  fallTime: number;
  fell: boolean;
  /** C2.9 — successful landing credited; ends watch early. */
  landed: boolean;
  footLifts: number;
  planted: FootLiftState;
  peakHeight: number;
  airTime: number;
  airHeightIntegral: number;
  impactSpeed: number;
  airborneTravel: number;
  prevAvgX: number;
  uprightSum: number;
  uprightSteps: number;
  peakSpeed: number;
  peakDistance: number;
  regionAccum: ScoreRegionAccum;
  courseAccum: CourseMarkerAccum;
  episodeT: number;
  episodeDuration: number;
}

interface LiveEvolveState {
  design: CreatureDesign;
  task: TaskId;
  shape: NetworkShape;
  population: Genome[];
  popSize: number;
  batchSize: number;
  maxGenerations: number;
  generation: number;
  batchIndex: number;
  batchCount: number;
  episodeT: number;
  episodeDuration: number;
  /** Base try length before adaptive schedule (D12). */
  baseEpisodeSeconds: number;
  focusIndex: number;
  rng: () => number;
  bestOverall: Genome;
  /** Metrics for current-generation champion (reset each gen). */
  genBestMetrics: TaskEpisodeMetrics | null;
  genBestFitness: number;
  /** Stall diagnostics for current-generation champion. */
  genBestStall: StallDiagnostics | null;
  /** Morph genes for current-generation champion. */
  genBestMorph: Genome['morph'];
  /**
   * HUD mean: average of genomes scored so far this generation.
   * Kept across breed (population fitness is zeroed for the next gen).
   */
  displayMeanFitness: number;
  stopRequested: boolean;
  status: string;
  breed: Required<
    Pick<
      BreedOptions,
      | 'eliteCount'
      | 'tournamentSize'
      | 'mutationSigma'
      | 'mutationResetRate'
      | 'crossover'
    >
  > & {
    annealMutation: boolean;
    shortTriesFirst: boolean;
    stopAfterFall: boolean;
  };
  /** D13 — score-mix priorities (not physics). */
  priorities: GoalPriorities;
  /** D17 — soft morph evolve. */
  morphEvolve: boolean;
  /** D18 — grow/prune topology with padded brain. */
  structuralMorphEvolve: boolean;
  /** D18 — padded muscle-channel region size (wheels follow). */
  maxMuscleChannels: number;
  /** D14/D17 — per-episode messy body jitter. */
  messyBodies: boolean;
  onProgress?: (p: EvolutionProgress) => void;
  onFinished?: (best: Genome, shape: NetworkShape) => void;
}

interface BoxingLivePair {
  genomeIndex: number;
  trainee: CohortMember;
  sparring: CohortMember;
  probes: [BoxingProbeSet, BoxingProbeSet];
  hitTracker: BoxingHitTracker;
  score: BoxingMatchScore;
  behavior: BoxingBehaviorMetrics;
}

interface BoxingLiveEvolveState {
  design: CreatureDesign;
  divisionId: BoxingDivisionId;
  shape: NetworkShape;
  opponentDesign: CreatureDesign;
  opponentShape: NetworkShape;
  opponentWeights: Float32Array;
  population: Genome[];
  popSize: number;
  batchSize: number;
  maxGenerations: number;
  generation: number;
  batchIndex: number;
  batchCount: number;
  episodeT: number;
  episodeDuration: number;
  /** Focused pair index within the current batch. */
  focusIndex: number;
  rng: () => number;
  bestOverall: Genome;
  displayMeanFitness: number;
  stopRequested: boolean;
  status: string;
  breed: {
    eliteCount: number;
    tournamentSize: number;
    mutationSigma: number;
    mutationResetRate: number;
    crossover: boolean;
  };
  priorities: BoxingPriorities;
  pairs: BoxingLivePair[];
  onProgress?: (p: EvolutionProgress) => void;
  onFinished?: (best: Genome, shape: NetworkShape) => void;
}

interface JoustLivePair {
  genomeIndex: number;
  trainee: CohortMember;
  sparring: CohortMember;
  probes: [JoustProbeSet, JoustProbeSet];
  hitTracker: JoustHitTracker;
  scorecard: JoustScorecard;
  pass: JoustPassState;
  frozen: boolean;
}

interface JoustLiveEvolveState {
  design: CreatureDesign;
  shape: NetworkShape;
  opponentDesign: CreatureDesign;
  opponentShape: NetworkShape;
  opponentWeights: Float32Array;
  population: Genome[];
  popSize: number;
  batchSize: number;
  maxGenerations: number;
  generation: number;
  batchIndex: number;
  batchCount: number;
  episodeT: number;
  episodeDuration: number;
  focusIndex: number;
  rng: () => number;
  bestOverall: Genome;
  displayMeanFitness: number;
  stopRequested: boolean;
  status: string;
  breed: {
    eliteCount: number;
    tournamentSize: number;
    mutationSigma: number;
    mutationResetRate: number;
    crossover: boolean;
  };
  priorities: JoustingPriorities;
  pairs: JoustLivePair[];
  onProgress?: (p: EvolutionProgress) => void;
  onFinished?: (best: Genome, shape: NetworkShape) => void;
}

export interface LiveEvolveOptions {
  design: CreatureDesign;
  task?: TaskId;
  populationSize?: number;
  batchSize?: number;
  maxGenerations?: number;
  episodeSeconds?: number;
  seed?: number;
  /** D5 — seed population from a compatible elite genome. */
  seedGenome?: {
    shape: NetworkShape;
    weights: Float32Array;
    morph?: Genome['morph'];
    topology?: Genome['topology'];
  };
  /** D10–D12 — GA search knobs (defaults match constants). */
  breed?: BreedOptions & {
    annealMutation?: boolean;
    shortTriesFirst?: boolean;
    stopAfterFall?: boolean;
  };
  /** D13 — fitness priority remapping. */
  priorities?: GoalPriorities;
  /** D17 — evolve morph genes with the brain. */
  morphEvolve?: boolean;
  /** D18 — grow/prune joints/bones/muscles (requires morphEvolve). */
  structuralMorphEvolve?: boolean;
  /** D14/D17 — jitter mass/length each spawn. */
  messyBodies?: boolean;
  /** D7 deepen — append raycast whiskers to loco observations. */
  raycastObservations?: boolean;
  onProgress?: (p: EvolutionProgress) => void;
  onFinished?: (best: Genome, shape: NetworkShape) => void;
}

export interface ShapeForDesignOptions {
  /** Append raycast whiskers (requires feature flag). */
  raycast?: boolean;
}

/** Whether motor-wheel joints add dedicated brain channels. */
function includeWheelActuators(): boolean {
  return isFeatureEnabled('motorWheels');
}

/** Loco observation input count for the current raycast setting. */
export function locoObsInputCount(raycast?: boolean): number {
  return raycastObsEnabled(raycast) ? RAYCAST_OBS_COUNT : OBS_COUNT;
}

/** MLP shape for a design after drive-group collapse (+ wheel channels). */
export function shapeForDesign(
  design: CreatureDesign,
  opts?: ShapeForDesignOptions,
): NetworkShape {
  const channels = countDesignActuatorChannels(
    design,
    includeWheelActuators(),
  );
  return makeShape(Math.max(channels, 1), locoObsInputCount(opts?.raycast));
}

/** H6 — dance MLP shape (pose + audio bands). Wheels stay idle in disco. */
export function shapeForDanceDesign(design: CreatureDesign): NetworkShape {
  const channels = countBrainActuatorChannels(design.muscles);
  return makeShape(Math.max(channels, 1), DANCE_OBS_COUNT);
}

/** K6 — Boxing brains use an opponent-relative observation pack. */
export function shapeForBoxingDesign(design: CreatureDesign): NetworkShape {
  const channels = countDesignActuatorChannels(
    design,
    includeWheelActuators(),
  );
  return makeShape(Math.max(channels, 1), BOXING_OBS_COUNT);
}

/** L6 — Jousting brains use an opponent-relative observation pack. */
export function shapeForJoustingDesign(design: CreatureDesign): NetworkShape {
  const channels = countDesignActuatorChannels(
    design,
    includeWheelActuators(),
  );
  return makeShape(Math.max(channels, 1), JOUST_OBS_COUNT);
}

function zeroActuatorDrives(design: CreatureDesign): number[] {
  return new Array(
    countDesignActuatorChannels(design, includeWheelActuators()),
  ).fill(0);
}

function mirrorBoxingDesign(design: CreatureDesign): CreatureDesign {
  const mirrored = cloneDesign(design);
  mirrored.joints = mirrored.joints.map((joint) => ({ ...joint, x: -joint.x }));
  return mirrored;
}

/** Pad per-muscle disco frames into full channel layout (wheel tail = 0). */
function channelDrivesFromMuscleDrives(
  design: CreatureDesign,
  muscleDrives: ArrayLike<number>,
): number[] {
  const n = countDesignActuatorChannels(design, includeWheelActuators());
  const out = new Array(n).fill(0);
  const collapsed = collapseMuscleDrivesToChannels(
    design.muscles,
    muscleDrives,
  );
  for (let i = 0; i < collapsed.length; i++) {
    out[i] = collapsed[i] ?? 0;
  }
  return out;
}

export interface DiscoSamplePayload {
  obs: Float32Array;
  muscleDrives: number[];
}

function agentFromCreature(
  creature: SpawnedCreature,
  muscles: MuscleVisualState[],
  opacity: number,
  focused: boolean,
  appearance?: import('../appearance/types').AppearanceRig,
): AgentSnapshot {
  const jointPose = new Map<number, { x: number; y: number }>();
  const joints = creature.joints.map((j) => {
    const t = j.body.translation();
    const v = j.body.linvel();
    jointPose.set(j.id, { x: t.x, y: t.y });
    return {
      id: j.id,
      x: t.x,
      y: t.y,
      radius: j.radius,
      vx: v.x,
      vy: v.y,
      isGlove: j.isGlove,
      isLance: j.isLance,
      isHitTarget: j.isHitTarget,
      isHead: j.isHead,
      hitValue: j.hitValue,
    };
  });
  return {
    joints,
    bones: creature.bones.map((b) => {
      const t = b.body.translation();
      const v = b.body.linvel();
      return {
        id: b.id,
        x: t.x,
        y: t.y,
        angle: b.body.rotation(),
        halfLength: b.halfLength,
        halfWidth: b.halfWidth,
        vx: v.x,
        vy: v.y,
        omega: b.body.angvel(),
        aeroType: b.aeroType,
        chuteInflation: b.chuteInflation,
      };
    }),
    struts: creature.struts.map((s) => {
      const a = jointPose.get(s.startJointId) ?? { x: 0, y: 0 };
      const b = jointPose.get(s.endJointId) ?? { x: 0, y: 0 };
      return {
        id: s.id,
        startJointId: s.startJointId,
        endJointId: s.endJointId,
        ax: a.x,
        ay: a.y,
        bx: b.x,
        by: b.y,
      };
    }),
    muscles: muscles.slice(),
    opacity,
    focused,
    appearance,
  };
}

function resetCreatureForces(creature: SpawnedCreature): void {
  for (const b of creature.bones) {
    b.body.resetForces(true);
    b.body.resetTorques(true);
  }
  for (const j of creature.joints) {
    j.body.resetForces(true);
    j.body.resetTorques(true);
  }
}

/** Disco puppet body tune — gravityScale + damping on all creature bodies. */
function applyCreatureBodyTune(
  creature: SpawnedCreature,
  gravityScale: number,
  linearDamping: number,
  angularDamping: number,
): void {
  for (const j of creature.joints) {
    j.body.setGravityScale(gravityScale, true);
    j.body.setLinearDamping(linearDamping);
    j.body.setAngularDamping(angularDamping);
  }
  for (const b of creature.bones) {
    b.body.setGravityScale(gravityScale, true);
    b.body.setLinearDamping(linearDamping);
    b.body.setAngularDamping(angularDamping);
  }
}

function resetCreatureBodyTune(creature: SpawnedCreature): void {
  applyCreatureBodyTune(creature, 1, LINEAR_DAMPING, ANGULAR_DAMPING);
}

function setRigidBodyMass(body: RAPIER.RigidBody, mass: number): void {
  const m = Math.max(0.05, mass);
  for (let i = 0; i < body.numColliders(); i++) {
    body.collider(i).setMass(m);
  }
}

/** Weigh marked feet (Edit / Play / Train / Disco). */
function applyFootMass(creature: SpawnedCreature, footMass: number): void {
  const m = clampFootMass(footMass);
  for (const j of creature.joints) {
    if (j.isFoot && !j.isWheel) setRigidBodyMass(j.body, m);
  }
}

/** Weigh marked wheels (Edit / Play / Train / Disco). */
function applyWheelMass(creature: SpawnedCreature, wheelMass: number): void {
  const m = clampWheelMass(wheelMass);
  for (const j of creature.joints) {
    if (j.isWheel) setRigidBodyMass(j.body, m);
  }
}

function designFootMass(design: CreatureDesign | null | undefined): number {
  if (design?.footMass !== undefined) return clampFootMass(design.footMass);
  return FOOT_MASS_DEFAULT;
}

function designWheelMass(design: CreatureDesign | null | undefined): number {
  if (design?.wheelMass !== undefined) return clampWheelMass(design.wheelMass);
  return WHEEL_MASS_DEFAULT;
}

function jointAuthorMass(
  design: CreatureDesign | null | undefined,
  j: { id: number; isFoot?: boolean; isWheel?: boolean; mass?: number },
): number {
  if (j.isWheel && design?.wheelMass !== undefined) {
    return clampWheelMass(design.wheelMass);
  }
  if (j.isFoot && design?.footMass !== undefined) {
    return clampFootMass(design.footMass);
  }
  if (j.isWheel) return designWheelMass(design);
  if (j.isFoot) return designFootMass(design);
  return j.mass ?? DEFAULT_JOINT_MASS;
}

/** Restore joint masses from the design (feet/wheels honor design masses). */
function restoreJointMassesFromDesign(
  creature: SpawnedCreature,
  design: CreatureDesign | null | undefined,
): void {
  const byId = new Map(
    (design?.joints ?? []).map((j) => [j.id, jointAuthorMass(design, j)]),
  );
  for (const j of creature.joints) {
    setRigidBodyMass(
      j.body,
      byId.get(j.id) ?? jointAuthorMass(design, j),
    );
  }
}

function applyExtraForces(
  creature: SpawnedCreature,
  design: CreatureDesign | null | undefined,
  channelDrives: ArrayLike<number>,
  opts?: { skipAero?: boolean },
): void {
  if (isFeatureEnabled('motorWheels')) {
    const fields = design ?? {
      muscles: [] as CreatureDesign['muscles'],
      joints: creature.joints.map((j) => ({ isWheel: j.isWheel })),
    };
    applyMotorTorques(
      creature,
      extractWheelDrives(fields, channelDrives, true),
    );
  }
  if (!opts?.skipAero && isFeatureEnabled('aeroLikeForces')) {
    applyAeroForces(creature);
  }
}

export class Simulation {
  world: RAPIER.World | null = null;
  creature: SpawnedCreature | null = null;
  design: CreatureDesign | null = null;
  running = false;
  driveMode: DriveMode = 'idle';
  /** Active scoring task for evolve / HUD. */
  task: TaskId = 'run';
  /**
   * D1 — simulated-time multiplier. ≤0 means “max” (large step budget).
   * Physics still advances only in FIXED_DT substeps.
   */
  timeScale = 1;
  /** When false, live-evolve snapshot omits non-focused cohort members. */
  showGhostPack = true;
  manualDrives: number[] = [];
  /** Optional provider for solo-creature disco drive frames (H2). */
  discoDriveProvider: (() => number[]) | null = null;
  /** H6 — live audio bands for dance-brain observations (freestyle). */
  audioObsProvider: (() => AudioBands | null) | null = null;
  /** H7 — offline lookahead features synced to playback / episode time. */
  audioLookaheadProvider: (() => ArrayLike<number> | null) | null = null;
  /**
   * H6 — called at BRAIN_HZ while solo disco is driving, for imitation record.
   * Payload obs is dance-sized (pose + audio); muscleDrives are per-muscle.
   */
  discoSampleHook: ((payload: DiscoSamplePayload) => void) | null = null;
  private discoSampleAccumulator = 0;
  private discoSampleObsBuf = new Float32Array(DANCE_OBS_COUNT);
  /** Disco-only puppet feel (does not affect evolve/edit). */
  discoPuppetMode: DiscoPuppetMode = DEFAULT_DISCO_PUPPET_MODE;
  /**
   * When true, disco muscle force options apply (reactive + freestyle).
   * Cleared on leave-disco; set by setDiscoPuppetMode.
   */
  discoArenaFeel = false;
  /** Mass applied to joints marked as feet (all modes). */
  footMass = FOOT_MASS_DEFAULT;
  wheelMass = WHEEL_MASS_DEFAULT;
  /** @deprecated Use footMass — alias for Disco setup wiring. */
  get discoFootMass(): number {
    return this.footMass;
  }
  set discoFootMass(v: number) {
    this.footMass = clampFootMass(v);
  }
  /** Hide muscle strokes in render. */
  hideMuscles = false;
  /** Hide bone capsules + joint dots in render. */
  hideBones = false;
  /** Hide solid strut lines in render (G8). */
  hideSolidStruts = false;
  time = 0;
  /**
   * Brain / control update rate. Default Keiwan 30 Hz; 60 Hz = one eval per
   * physics step. Disco imitation sampling stays at BRAIN_HZ for dataset parity.
   */
  brainHz: BrainHz = BRAIN_HZ;
  private muscleVisual: MuscleVisualState[] = [];
  private accumulator = 0;
  private brainShape: NetworkShape | null = null;
  private brainWeights: Float32Array | null = null;
  /** Channel-length drives when brain is active; expanded before forces. */
  private brainDrives: number[] = [];
  private brainAccumulator = 0;
  /** D7 deepen — loco brains use raycast whiskers when true. */
  private raycastObservations = false;
  private obsBuf = new Float32Array(OBS_COUNT);
  private outBuf = new Float32Array(16);
  private hidBuf = new Float32Array(32);
  /** Solo / Play-best last activations for A7. */
  private lastSoloObs = new Float32Array(OBS_COUNT);
  private lastSoloHidden = new Float32Array(32);

  private cohort: CohortMember[] = [];
  private discoDancers: DiscoDancerRuntime[] = [];
  private h2h: {
    task: TaskId;
    episodeT: number;
    episodeDuration: number;
    onProgress?: (episodeT: number, episodeDuration: number) => void;
    onFinished?: (result: HeadToHeadResult) => void;
  } | null = null;
  private h2hFinished: HeadToHeadResult | null = null;
  private boxing: {
    divisionId: BoxingDivisionId;
    episodeT: number;
    episodeDuration: number;
    score: BoxingMatchScore;
    probes: [BoxingProbeSet, BoxingProbeSet];
    hitTracker: BoxingHitTracker;
    behavior: BoxingBehaviorMetrics;
    onProgress?: (snapshot: BoxingMatchSnapshot) => void;
    onFinished?: (result: BoxingMatchResult) => void;
  } | null = null;
  private boxingFinished: BoxingMatchResult | null = null;
  private boxingPreviousBrainHz: BrainHz | null = null;
  /** Focused fighter index for Boxing / H2H exhibition brain viz (0 = A, 1 = B). */
  private duelFocusIndex = 0;
  private boxingLive: BoxingLiveEvolveState | null = null;
  private jousting: {
    episodeT: number;
    episodeDuration: number;
    scorecard: JoustScorecard;
    probes: [JoustProbeSet, JoustProbeSet];
    hitTracker: JoustHitTracker;
    pass: JoustPassState;
    priorities: JoustingPriorities;
    onProgress?: (snapshot: JoustMatchSnapshot) => void;
    onFinished?: (result: JoustMatchResult) => void;
  } | null = null;
  private joustingFinished: JoustMatchResult | null = null;
  private joustingLive: JoustLiveEvolveState | null = null;
  private live: LiveEvolveState | null = null;
  private course: CourseHandle | null = null;
  private roughCourse: RoughCourseHandle | null = null;
  private environment: EnvironmentDesign = flatGroundEnv();
  private envObstacles: ObstacleHandle | null = null;
  private envTerrain: TerrainHandle | null = null;
  private envTower: TowerHandle | null = null;
  /** Per-creature launch-pad cooldown (WeakMap keys = SpawnedCreature). */
  private launchPadCooldowns = new WeakMap<SpawnedCreature, LaunchPadCooldown>();
  /** Surface collider μ; default WORLD_GRIP (materials — not Train-dock). */
  private worldGrip = WORLD_GRIP;
  /** Marked foot collider μ; default FOOT_FRICTION (materials only). */
  private footGrip = FOOT_FRICTION;
  /** Universal plant anti-scoot (Train-dock); default ANTI_SCOOT. */
  private antiScoot = ANTI_SCOOT;
  private soloWatch: SoloEpisodeWatch | null = null;
  /** B6/B10 — last completed episode metrics for Train panels. */
  private lastEpisodeMetrics: TaskEpisodeMetrics | null = null;
  /** E5 — fired after live-gen champion score or solo replay episode. */
  onEpisodeComplete: ((snap: EpisodeCompleteSnapshot) => void) | null = null;

  async init(): Promise<void> {
    await initRapier();
    // Idempotent: React Strict Mode remounts must not orphan a live World
    // (stale body handles against a second World poison Rapier WASM → unreachable).
    if (this.world) return;
    this.world = createWorld(this.worldGrip);
  }

  get isEvolving(): boolean {
    return this.live !== null || this.boxingLive !== null || this.joustingLive !== null;
  }

  get isHeadToHead(): boolean {
    return this.h2h !== null;
  }

  get isBoxing(): boolean {
    return this.boxing !== null || this.boxingLive !== null;
  }

  get isJousting(): boolean {
    return this.jousting !== null || this.joustingLive !== null;
  }

  private pinBoxingControllerRate(): void {
    if (this.boxingPreviousBrainHz === null) {
      this.boxingPreviousBrainHz = this.brainHz;
    }
    this.brainHz = BRAIN_HZ;
  }

  private restoreControllerRateAfterBoxing(): void {
    if (this.boxingPreviousBrainHz === null) return;
    this.brainHz = this.boxingPreviousBrainHz;
    this.boxingPreviousBrainHz = null;
  }

  private clearJoustingState(): void {
    this.jousting = null;
    this.joustingFinished = null;
    this.joustingLive = null;
  }

  get isMultiDisco(): boolean {
    return this.discoDancers.length > 0;
  }

  loadDesign(design: CreatureDesign): void {
    if (!this.world) throw new Error('Simulation not initialized');
    this.clearDiscoDancers();
    this.abortHeadToHead();
    this.restoreControllerRateAfterBoxing();
    this.boxing = null;
    this.boxingFinished = null;
    this.boxingLive = null;
    this.clearJoustingState();
    this.clearCohort();
    this.live = null;
    this.soloWatch = null;
    if (this.creature) {
      destroyCreature(this.world, this.creature);
      this.creature = null;
    }
    this.syncCourseForTask(this.task);
    this.syncEnvironmentGeometry();
    this.design = design;
    this.creature = this.spawnCreatureWithGrip(
      design,
      resolveSpawn(this.environment),
    );
    this.manualDrives = zeroActuatorDrives(design);
    this.brainDrives = zeroActuatorDrives(design);
    this.time = 0;
    this.accumulator = 0;
    this.brainAccumulator = 0;
    this.running = true;
    this.footMass = designFootMass(design);
    this.wheelMass = designWheelMass(design);
    if (this.driveMode === 'disco') {
      this.applyDiscoPuppetBodyTune();
    } else {
      this.applyAuthorMassTune();
    }
  }

  /** H2 — switch disco puppet feel; re-tunes staged dancers / solo disco body. */
  setDiscoPuppetMode(mode: DiscoPuppetMode): void {
    this.discoPuppetMode = mode;
    this.discoArenaFeel = true;
    this.applyDiscoPuppetBodyTune();
  }

  /** Channel-length brain drives (dance refine / diagnostics). */
  getBrainChannelDrives(): number[] {
    return this.brainDrives.slice();
  }

  /** Mass for marked foot joints — applies in every mode. */
  setFootMass(mass: number): void {
    this.footMass = clampFootMass(mass);
    this.applyAuthorMassTune();
  }

  /** Mass for marked wheel joints — applies in every mode. */
  setWheelMass(mass: number): void {
    this.wheelMass = clampWheelMass(mass);
    this.applyAuthorMassTune();
  }

  /** @deprecated Use setFootMass — Disco panel / setups still call this. */
  setDiscoFootMass(mass: number): void {
    this.setFootMass(mass);
  }

  private discoMuscleForceOptions(): MuscleForceOptions {
    const t = DISCO_PUPPET_MODES[this.discoPuppetMode];
    return {
      springMult: t.springMult,
      damperMult: t.damperMult,
      maxForceMult: t.maxForceMult,
      restLengthDrive: t.restLengthDrive,
    };
  }

  private applyAuthorMassTune(): void {
    for (const d of this.discoDancers) {
      applyFootMass(d.creature, this.footMass);
      applyWheelMass(d.creature, this.wheelMass);
    }
    if (this.creature && this.discoDancers.length === 0) {
      applyFootMass(this.creature, this.footMass);
      applyWheelMass(this.creature, this.wheelMass);
    }
  }

  private applyDiscoPuppetBodyTune(): void {
    const t = DISCO_PUPPET_MODES[this.discoPuppetMode];
    for (const d of this.discoDancers) {
      applyCreatureBodyTune(
        d.creature,
        t.gravityScale,
        t.linearDamping,
        t.angularDamping,
      );
      applyFootMass(d.creature, this.footMass);
      applyWheelMass(d.creature, this.wheelMass);
    }
    // Solo arena creature (empty slots) — App only retunes while in Disco.
    if (this.creature && this.discoDancers.length === 0) {
      applyCreatureBodyTune(
        this.creature,
        t.gravityScale,
        t.linearDamping,
        t.angularDamping,
      );
      applyFootMass(this.creature, this.footMass);
      applyWheelMass(this.creature, this.wheelMass);
    }
  }

  /** Restore spawn defaults after leaving the disco arena. */
  clearDiscoPuppetBodyTune(): void {
    this.discoArenaFeel = false;
    if (this.creature && this.discoDancers.length === 0) {
      resetCreatureBodyTune(this.creature);
      restoreJointMassesFromDesign(this.creature, this.design);
      this.applyAuthorMassTune();
    }
  }

  /**
   * Watch a single brain-driven episode (Play best) and emit metrics at the end.
   * Call after loadDesign + setBrain.
   */
  beginSoloEpisodeWatch(episodeSeconds = EPISODE_SECONDS): void {
    if (!this.creature || !this.design) return;
    const markers = activeCourseMarkers(this.environment);
    resetLaunchPadCooldown(this.launchCooldownFor(this.creature));
    this.soloWatch = {
      design: cloneDesign(this.design),
      task: this.task,
      startX: avgJointX(this.creature),
      fallTime: 0,
      fell: false,
      landed: false,
      footLifts: 0,
      planted: createFootLiftState(this.creature.joints.length),
      peakHeight: 0,
      airTime: 0,
      airHeightIntegral: 0,
      impactSpeed: 0,
      airborneTravel: 0,
      prevAvgX: avgJointX(this.creature),
      uprightSum: 0,
      uprightSteps: 0,
      peakSpeed: 0,
      peakDistance: 0,
      regionAccum: emptyScoreRegionAccum(),
      courseAccum: emptyCourseMarkerAccum(markers),
      episodeT: 0,
      episodeDuration: episodeSeconds,
    };
  }

  clearSoloEpisodeWatch(): void {
    this.soloWatch = null;
  }

  setTask(task: TaskId): void {
    this.task = task;
    if (this.world && !this.live) {
      this.syncCourseForTask(task);
    }
  }

  setShowGhostPack(show: boolean): void {
    this.showGhostPack = show;
  }

  private syncCourseForTask(task: TaskId): void {
    if (!this.world) return;
    destroyCourse(this.world, this.course);
    this.course = null;
    destroyRoughCourse(this.world, this.roughCourse);
    this.roughCourse = null;
    if (task === 'climb' && isFeatureEnabled('climbCourse')) {
      this.course = spawnClimbCourse(this.world, this.worldGrip);
    }
    if (task === 'rough' && isFeatureEnabled('roughTerrainCourse')) {
      this.roughCourse = spawnRoughCourse(this.world, this.worldGrip);
    }
    if (task === 'clear_bar') {
      this.course = spawnClearBarCourse(
        this.world,
        this.worldGrip,
        CLEAR_BAR_HEIGHT,
      );
    }
    if (task === 'motor_ramp') {
      this.course = spawnMotorRampCourse(this.world, this.worldGrip);
    }
    if (task === 'motor_gap') {
      this.course = spawnMotorGapCourse(this.world, this.worldGrip);
    }
    if (task === 'motor_hurdles') {
      this.course = spawnMotorHurdlesCourse(this.world, this.worldGrip);
    }
  }

  /** Active terrain for obs / plant / fall (course preferred over studio). */
  activeTerrain(): EnvironmentDesign['terrain'] {
    return this.observationContext().terrain;
  }

  private activeTerrainVisual(): TerrainVisual | null {
    return this.roughCourse?.terrain.visual ?? this.envTerrain?.visual ?? null;
  }

  /** Apply Environment Studio design (G1 / G3 / C2.4 when flagged). */
  setEnvironment(env: EnvironmentDesign): void {
    this.environment = cloneEnvironment(env);
    if (this.world) this.syncEnvironmentGeometry();
  }

  getEnvironment(): EnvironmentDesign {
    return cloneEnvironment(this.environment);
  }

  getWorldGrip(): number {
    return this.worldGrip;
  }

  getFootGrip(): number {
    return this.footGrip;
  }

  getAntiScoot(): number {
    return this.antiScoot;
  }

  /** Clamp Train-dock Anti-scoot (plant purchase on every surface). */
  setAntiScoot(value: number): void {
    this.antiScoot = clampAntiScoot(value);
  }

  /** Clamp and live-apply friction to every currently spawned marked foot. */
  setFootGrip(friction: number): void {
    this.footGrip = clampFootFriction(friction);
    applyFootFriction(this.creature, this.footGrip);
    for (const member of this.cohort) {
      applyFootFriction(member.creature, this.footGrip);
    }
    for (const dancer of this.discoDancers) {
      applyFootFriction(dancer.creature, this.footGrip);
    }
  }

  private spawnCreatureWithGrip(
    design: CreatureDesign,
    offset?: SpawnOffset,
  ): SpawnedCreature {
    if (!this.world) throw new Error('Simulation not initialized');
    const creature = offset
      ? spawnCreature(this.world, design, offset)
      : spawnCreature(this.world, design);
    applyFootFriction(creature, this.footGrip);
    return creature;
  }

  /** @deprecated Use getWorldGrip */
  getRampFriction(): number {
    return this.worldGrip;
  }

  /** Clamp to [0, WORLD_GRIP_MAX] and push onto all walkable surfaces. */
  setWorldGrip(friction: number): void {
    this.worldGrip = clampWorldGrip(friction);
    applyGroundFriction(this.world, this.worldGrip);
    applyWorldGripToObstacles(this.envObstacles, this.worldGrip);
    applyWorldGripToTerrain(this.envTerrain, this.worldGrip);
    applyWorldGripToTower(this.envTower, this.worldGrip);
    applyWorldGripToCourse(this.course, this.worldGrip);
    if (this.roughCourse) {
      applyWorldGripToTerrain(this.roughCourse.terrain, this.worldGrip);
    }
  }

  /** @deprecated Use setWorldGrip */
  setRampFriction(friction: number): void {
    this.setWorldGrip(friction);
  }

  /** Live env obstacle handle (smoke / diagnostics). */
  getEnvObstacles(): ObstacleHandle | null {
    return this.envObstacles;
  }

  private observationContext(): {
    terrain: EnvironmentDesign['terrain'];
    timeSec: number;
  } {
    const timeSec = this.time;
    if (this.roughCourse?.design) {
      return { terrain: this.roughCourse.design, timeSec };
    }
    if (
      isFeatureEnabled('terrainHeightfield') &&
      this.environment.terrain &&
      this.environment.terrain.samples.length >= 2
    ) {
      return { terrain: this.environment.terrain, timeSec };
    }
    return { terrain: undefined, timeSec };
  }

  private syncEnvironmentGeometry(): void {
    if (!this.world) return;
    destroyObstacles(this.world, this.envObstacles);
    this.envObstacles = null;
    destroyTerrain(this.world, this.envTerrain);
    this.envTerrain = null;
    destroyTower(this.world, this.envTower);
    this.envTower = null;
    if (
      isFeatureEnabled('staticObstacles') &&
      this.environment.obstacles.length > 0
    ) {
      this.envObstacles = spawnStaticObstacles(
        this.world,
        this.environment.obstacles,
        this.worldGrip,
      );
    }
    if (
      isFeatureEnabled('terrainHeightfield') &&
      this.environment.terrain &&
      this.environment.terrain.samples.length >= 2
    ) {
      this.envTerrain = spawnTerrainHeightfield(
        this.world,
        this.environment.terrain,
        this.worldGrip,
      );
    }
    if (isFeatureEnabled('launchTower') && this.environment.tower) {
      this.envTower = spawnLaunchTower(
        this.world,
        this.environment.tower,
        this.worldGrip,
      );
    }
  }

  reset(): void {
    if (this.live) return;
    if (this.design) this.loadDesign(this.design);
  }

  /** Enable/disable raycast whiskers for loco play / evolve (feature-flagged). */
  setRaycastObservations(on: boolean): void {
    this.raycastObservations = raycastObsEnabled(on);
  }

  getRaycastObservations(): boolean {
    return this.raycastObservations;
  }

  /** Attach a genome for driveMode = 'brain' (single-creature play). */
  setBrain(shape: NetworkShape, weights: Float32Array): void {
    this.brainShape = shape;
    this.brainWeights = weights;
    this.brainDrives = new Array(shape.outputCount).fill(0);
    this.brainAccumulator = 0;
    if (this.outBuf.length < shape.outputCount) {
      this.outBuf = new Float32Array(shape.outputCount);
    }
    if (this.obsBuf.length < shape.inputCount) {
      this.obsBuf = new Float32Array(shape.inputCount);
    }
    // Infer raycast pack from brain input size when playing a saved genome.
    if (
      shape.inputCount === RAYCAST_OBS_COUNT &&
      isFeatureEnabled('raycastObservations')
    ) {
      this.raycastObservations = true;
    } else if (shape.inputCount === OBS_COUNT) {
      this.raycastObservations = false;
    }
  }

  /** Toggle brain eval rate (30 Hz default ↔ 60 Hz). Muscle forces stay at FIXED_DT. */
  setBrainHz(hz: BrainHz): void {
    // Boxing pins the controller at training rate; stash the UI choice for restore.
    if (this.boxing || this.boxingFinished || this.boxingLive || this.jousting || this.joustingFinished || this.joustingLive) {
      this.boxingPreviousBrainHz = hz;
      return;
    }
    if (this.brainHz === hz) return;
    this.brainHz = hz;
    this.brainAccumulator = 0;
    for (const member of this.cohort) {
      member.brainAccumulator = 0;
    }
  }

  private get brainDt(): number {
    return 1 / this.brainHz;
  }

  clearBrain(): void {
    this.brainShape = null;
    this.brainWeights = null;
    this.brainDrives = [];
    this.brainAccumulator = 0;
  }

  setManualDrive(index: number, value: number): void {
    if (index >= 0 && index < this.manualDrives.length) {
      this.manualDrives[index] = Math.max(-1, Math.min(1, value));
    }
  }

  setAllManual(value: number): void {
    for (let i = 0; i < this.manualDrives.length; i++) {
      this.manualDrives[i] = value;
    }
  }

  /**
   * H5 — spawn up to six lateral disco dancers sharing one audio player.
   * Each slot supplies its own drive resolver (muscle count / design aware).
   */
  startMultiDisco(
    slots: DiscoDancerSlot[],
    resolveDrives: (index: number, design: CreatureDesign) => number[],
  ): void {
    if (!this.world) throw new Error('Simulation not initialized');
    if (slots.length === 0) {
      this.clearDiscoDancers();
      return;
    }

    this.clearCohort();
    this.live = null;
    this.h2h = null;
    this.h2hFinished = null;
    this.restoreControllerRateAfterBoxing();
    this.boxing = null;
    this.boxingFinished = null;
    this.boxingLive = null;
    this.clearJoustingState();
    this.soloWatch = null;
    this.clearBrain();
    if (this.creature) {
      destroyCreature(this.world, this.creature);
      this.creature = null;
    }
    this.clearDiscoDancers();

    const spawn = resolveSpawn(this.environment);
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const creature = this.spawnCreatureWithGrip(slot.design, {
        x: slot.offsetX,
        y: spawn.y,
      });
      this.discoDancers.push({
        design: slot.design,
        creature,
        muscleVisual: [],
        resolveDrives: () => resolveDrives(i, slot.design),
      });
    }

    this.design = slots[0].design;
    this.driveMode = 'disco';
    this.discoDriveProvider = null;
    this.time = 0;
    this.accumulator = 0;
    this.running = true;
    this.applyDiscoPuppetBodyTune();
  }

  clearDiscoDancers(): void {
    if (!this.world) {
      this.discoDancers = [];
      return;
    }
    for (const d of this.discoDancers) {
      destroyCreature(this.world, d.creature);
    }
    this.discoDancers = [];
  }

  /** World-space center of a disco dancer (joint average). */
  discoDancerCenter(index: number): { x: number; y: number } | null {
    const d = this.discoDancers[index];
    if (!d || d.creature.joints.length === 0) return null;
    let x = 0;
    let y = 0;
    for (const j of d.creature.joints) {
      const t = j.body.translation();
      x += t.x;
      y += t.y;
    }
    const n = d.creature.joints.length;
    return { x: x / n, y: y / n };
  }

  /**
   * Hit-test disco dancers for grab/drop placement.
   * Returns the nearest dancer whose joints enclose the point (padded AABB).
   */
  hitTestDiscoDancer(wx: number, wy: number): number | null {
    const PAD = 0.55;
    let best: number | null = null;
    let bestDist = Infinity;
    for (let i = 0; i < this.discoDancers.length; i++) {
      const d = this.discoDancers[i];
      if (d.creature.joints.length === 0) continue;
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let cx = 0;
      let cy = 0;
      for (const j of d.creature.joints) {
        const t = j.body.translation();
        minX = Math.min(minX, t.x);
        maxX = Math.max(maxX, t.x);
        minY = Math.min(minY, t.y);
        maxY = Math.max(maxY, t.y);
        cx += t.x;
        cy += t.y;
      }
      const n = d.creature.joints.length;
      cx /= n;
      cy /= n;
      if (
        wx < minX - PAD ||
        wx > maxX + PAD ||
        wy < minY - PAD ||
        wy > maxY + PAD
      ) {
        continue;
      }
      const dist = Math.hypot(wx - cx, wy - cy);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  /** Translate all rigid bodies of a disco dancer; zeros velocities. */
  translateDiscoDancer(index: number, dx: number, dy: number): void {
    const d = this.discoDancers[index];
    if (!d) return;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return;
    const moveBody = (body: { translation: () => { x: number; y: number }; setTranslation: (t: { x: number; y: number }, wake: boolean) => void; setLinvel: (v: { x: number; y: number }, wake: boolean) => void; setAngvel: (v: number, wake: boolean) => void }) => {
      const t = body.translation();
      body.setTranslation({ x: t.x + dx, y: t.y + dy }, true);
      body.setLinvel({ x: 0, y: 0 }, true);
      body.setAngvel(0, true);
    };
    for (const j of d.creature.joints) moveBody(j.body);
    for (const b of d.creature.bones) moveBody(b.body);
  }

  /** B20/I6 — timed dual-model gauntlet (fixed genomes, cohort of two). */
  startHeadToHead(options: HeadToHeadOptions): void {
    if (!this.world) throw new Error('Simulation not initialized');
    const [a, b] = options.entries;
    const wheelsOn = includeWheelActuators();
    if (
      !designHasActuators(a.design, wheelsOn) ||
      !designHasActuators(b.design, wheelsOn)
    ) {
      throw new Error('Both designs need muscles or wheels for head-to-head');
    }

    this.clearDiscoDancers();
    this.clearCohort();
    this.live = null;
    this.restoreControllerRateAfterBoxing();
    this.boxing = null;
    this.boxingFinished = null;
    this.clearJoustingState();
    this.soloWatch = null;
    this.clearBrain();
    if (this.creature) {
      destroyCreature(this.world, this.creature);
      this.creature = null;
    }

    this.task = options.task;
    this.syncCourseForTask(options.task);
    this.syncEnvironmentGeometry();
    this.h2hFinished = null;

    const spawn = resolveSpawn(this.environment);
    const offsets = [-3.5, 3.5];
    const entries = [a, b];
    const markers = activeCourseMarkers(this.environment);

    for (let i = 0; i < 2; i++) {
      const entry = entries[i];
      const creature = this.spawnCreatureWithGrip(entry.design, {
        x: offsets[i],
        y: spawn.y,
      });
      this.cohort.push({
        creature,
        genomeIndex: i,
        weights: entry.weights,
        brainDrives: new Array(entry.shape.outputCount).fill(0),
        brainAccumulator: 0,
        lastObs: new Float32Array(entry.shape.inputCount),
        lastHidden: new Float32Array(entry.shape.hiddenCount),
        startX: avgJointX(creature),
        fallTime: 0,
        fell: false,
        landed: false,
        footLifts: 0,
        planted: createFootLiftState(creature.joints.length),
        muscleVisual: [],
        peakHeight: 0,
        airTime: 0,
        airHeightIntegral: 0,
        impactSpeed: 0,
        airborneTravel: 0,
        prevAvgX: avgJointX(creature),
        uprightSum: 0,
        uprightSteps: 0,
        peakSpeed: 0,
        peakDistance: 0,
        regionAccum: emptyScoreRegionAccum(),
        courseAccum: emptyCourseMarkerAccum(markers),
        stall: createStallTracker(),
        memberDesign: cloneDesign(entry.design),
        memberShape: entry.shape,
      });
    }

    this.design = a.design;
    this.driveMode = 'brain';
    this.discoDriveProvider = null;
    this.time = 0;
    this.accumulator = 0;
    this.running = true;
    this.h2h = {
      task: options.task,
      episodeT: 0,
      episodeDuration: options.episodeSeconds ?? EPISODE_SECONDS,
      onProgress: options.onProgress,
      onFinished: options.onFinished,
    };
  }

  abortHeadToHead(): void {
    if (!this.h2h && !this.h2hFinished) return;
    const design =
      this.cohort[0]?.memberDesign ?? this.design ?? null;
    this.clearCohort();
    this.h2h = null;
    this.h2hFinished = null;
    if (!this.world || !design) return;
    this.creature = this.spawnCreatureWithGrip(
      design,
      resolveSpawn(this.environment),
    );
    this.design = design;
    this.manualDrives = zeroActuatorDrives(design);
    this.brainDrives = zeroActuatorDrives(design);
    this.driveMode = 'idle';
    this.time = 0;
    this.accumulator = 0;
  }

  /** K5 — start a deterministic, division-matched two-fighter points match. */
  startBoxingMatch(options: BoxingMatchOptions): void {
    if (!this.world) throw new Error('Simulation not initialized');
    if (!isFeatureEnabled('boxingMode')) {
      throw new Error('Boxing skill is disabled');
    }
    const [a, b] = options.entries;
    if (
      !designHasActuators(a.design, includeWheelActuators()) ||
      !designHasActuators(b.design, includeWheelActuators())
    ) {
      throw new Error('Both fighters need muscles to box');
    }
    for (const entry of [a, b]) {
      const eligibility = boxingEligibility(entry.design, options.divisionId);
      if (!eligibility.eligible) {
        throw new Error(
          `${entry.design.name} is not eligible for ${options.divisionId}: ${eligibility.reasons.join(' ')}`,
        );
      }
    }

    this.clearDiscoDancers();
    this.clearCohort();
    this.live = null;
    this.h2h = null;
    this.h2hFinished = null;
    this.boxing = null;
    this.boxingFinished = null;
    this.boxingLive = null;
    this.clearJoustingState();
    this.soloWatch = null;
    this.clearBrain();
    if (this.creature) {
      destroyCreature(this.world, this.creature);
      this.creature = null;
    }

    this.task = 'boxing';
    this.syncCourseForTask('boxing');
    this.syncEnvironmentGeometry();
    const spawn = resolveSpawn(this.environment);
    const entries: [BoxingMatchEntry, BoxingMatchEntry] = [a, b];
    const matchDesigns: [CreatureDesign, CreatureDesign] = [
      cloneDesign(a.design),
      mirrorBoxingDesign(b.design),
    ];
    const probes: BoxingProbeSet[] = [];
    for (let i = 0; i < 2; i++) {
      const entry = entries[i];
      const memberDesign = matchDesigns[i];
      const creature = this.spawnCreatureWithGrip(memberDesign, {
        x: i === 0 ? -BOXING_SPAWN_X : BOXING_SPAWN_X,
        y: spawn.y,
      });
      enableBoxingOpponentContact(creature, i as BoxingOwner);
      this.cohort.push({
        creature,
        genomeIndex: i,
        weights: entry.weights,
        brainDrives: new Array(entry.shape.outputCount).fill(0),
        brainAccumulator: 0,
        lastObs: new Float32Array(entry.shape.inputCount),
        lastHidden: new Float32Array(entry.shape.hiddenCount),
        startX: avgJointX(creature),
        fallTime: 0,
        fell: false,
        landed: false,
        footLifts: 0,
        planted: createFootLiftState(creature.joints.length),
        muscleVisual: [],
        peakHeight: 0,
        airTime: 0,
        airHeightIntegral: 0,
        impactSpeed: 0,
        airborneTravel: 0,
        prevAvgX: avgJointX(creature),
        uprightSum: 0,
        uprightSteps: 0,
        peakSpeed: 0,
        peakDistance: 0,
        regionAccum: emptyScoreRegionAccum(),
        courseAccum: emptyCourseMarkerAccum([]),
        stall: createStallTracker(),
        memberDesign,
        memberShape: entry.shape,
      });
      probes.push(
        createBoxingProbes(this.world, creature, i as BoxingOwner),
      );
    }

    this.design = a.design;
    this.driveMode = 'brain';
    this.discoDriveProvider = null;
    this.time = 0;
    this.accumulator = 0;
    this.running = true;
    this.duelFocusIndex = 0;
    this.pinBoxingControllerRate();
    this.boxing = {
      divisionId: options.divisionId,
      episodeT: 0,
      episodeDuration: options.episodeSeconds ?? BOXING_MATCH_SECONDS,
      score: createBoxingMatchScore(options.divisionId),
      probes: probes as [BoxingProbeSet, BoxingProbeSet],
      hitTracker: createBoxingHitTracker(),
      behavior: createBoxingBehaviorMetrics(),
      onProgress: options.onProgress,
      onFinished: options.onFinished,
    };
  }

  abortBoxingMatch(): void {
    if (!this.boxing && !this.boxingFinished) return;
    const design = this.cohort[0]?.memberDesign ?? this.design ?? null;
    this.clearCohort();
    this.boxing = null;
    this.boxingFinished = null;
    this.restoreControllerRateAfterBoxing();
    if (!this.world || !design) return;
    this.creature = this.spawnCreatureWithGrip(
      design,
      resolveSpawn(this.environment),
    );
    this.design = design;
    this.manualDrives = zeroActuatorDrives(design);
    this.brainDrives = zeroActuatorDrives(design);
    this.driveMode = 'idle';
    this.task = 'boxing';
    this.time = 0;
    this.accumulator = 0;
  }

  /** K6 — batched Boxing GA: parallel trainee↔sparring pairs with ghost pack. */
  startBoxingLiveEvolve(options: BoxingLiveEvolveOptions): void {
    if (!this.world) throw new Error('Simulation not initialized');
    if (!isFeatureEnabled('boxingMode')) {
      throw new Error('Boxing skill is disabled');
    }
    const design = cloneDesign(options.design);
    const eligibility = boxingEligibility(design, options.divisionId);
    if (!eligibility.eligible) {
      throw new Error(
        `${design.name} is not eligible for ${options.divisionId}: ${eligibility.reasons.join(' ')}`,
      );
    }
    if (!designHasActuators(design, includeWheelActuators())) {
      throw new Error('Design has no muscles to control');
    }
    const opponentDesign = cloneDesign(options.opponentDesign);
    if (!boxingEligibility(opponentDesign, options.divisionId).eligible) {
      throw new Error('Sparring partner is not eligible for this division');
    }

    const popSize = options.populationSize ?? LIVE_POPULATION_SIZE;
    const batchSize = Math.max(
      1,
      Math.min(options.batchSize ?? LIVE_BATCH_SIZE, popSize),
    );
    const maxGenerations = options.maxGenerations ?? LIVE_MAX_GENERATIONS;
    const episodeDuration = Math.max(1, options.episodeSeconds ?? EPISODE_SECONDS);
    const breedOpts = options.breed ?? {};
    const breed = {
      eliteCount: breedOpts.eliteCount ?? ELITE_COUNT,
      tournamentSize: breedOpts.tournamentSize ?? TOURNAMENT_SIZE,
      mutationSigma: breedOpts.mutationSigma ?? MUTATION_SIGMA,
      mutationResetRate: breedOpts.mutationResetRate ?? MUTATION_RESET_RATE,
      crossover: breedOpts.crossover ?? true,
    };
    const rng = createRng(options.seed ?? 1);
    const shape = shapeForBoxingDesign(design);
    const opponentShape = shapeForBoxingDesign(opponentDesign);
    if (
      options.opponentWeights &&
      options.opponentWeights.length !== opponentShape.weightCount
    ) {
      throw new Error('Sparring brain does not match the sparring body');
    }
    const opponentWeights = options.opponentWeights
      ? cloneWeights(options.opponentWeights)
      : randomWeights(
          opponentShape,
          createRng((options.seed ?? 1) + 991),
        );

    let resolvedSeed = options.seedGenome;
    if (resolvedSeed) {
      if (
        resolvedSeed.shape.inputCount !== shape.inputCount ||
        resolvedSeed.shape.hiddenCount !== shape.hiddenCount ||
        resolvedSeed.shape.outputCount !== shape.outputCount ||
        resolvedSeed.weights.length !== shape.weightCount
      ) {
        throw new Error(
          'Seed genome shape mismatch — Boxing continue training needs a matching fighter layout.',
        );
      }
    }

    const population: Genome[] = [];
    if (resolvedSeed) {
      population.push({
        weights: cloneWeights(resolvedSeed.weights),
        fitness: 0,
      });
      while (population.length < popSize) {
        population.push({
          weights: mutate(resolvedSeed.weights, rng, {
            mutationSigma: breed.mutationSigma,
            mutationResetRate: breed.mutationResetRate,
          }),
          fitness: 0,
        });
      }
    } else {
      for (let i = 0; i < popSize; i++) {
        population.push({
          weights: randomWeights(shape, rng),
          fitness: 0,
        });
      }
    }

    this.clearDiscoDancers();
    this.clearCohort();
    this.live = null;
    this.h2h = null;
    this.h2hFinished = null;
    this.boxing = null;
    this.boxingFinished = null;
    this.clearJoustingState();
    this.soloWatch = null;
    this.clearBrain();
    if (this.creature) {
      destroyCreature(this.world, this.creature);
      this.creature = null;
    }

    this.task = 'boxing';
    this.syncCourseForTask('boxing');
    this.syncEnvironmentGeometry();
    this.design = design;
    this.driveMode = 'brain';
    this.discoDriveProvider = null;
    this.running = true;
    this.pinBoxingControllerRate();

    this.boxingLive = {
      design,
      divisionId: options.divisionId,
      shape,
      opponentDesign,
      opponentShape,
      opponentWeights,
      population,
      popSize,
      batchSize,
      maxGenerations: Math.max(1, maxGenerations),
      generation: 0,
      batchIndex: 0,
      batchCount: Math.ceil(popSize / batchSize),
      episodeT: 0,
      episodeDuration,
      focusIndex: 0,
      rng,
      bestOverall: {
        weights: cloneWeights(population[0]!.weights),
        fitness: -Infinity,
      },
      displayMeanFitness: 0,
      stopRequested: false,
      status: 'Starting Boxing spar…',
      breed,
      priorities: options.priorities
        ? { ...options.priorities }
        : { ...DEFAULT_BOXING_PRIORITIES },
      pairs: [],
      onProgress: options.onProgress,
      onFinished: options.onFinished,
    };

    this.spawnBoxingLiveBatch();
    this.emitBoxingLiveProgress();
  }

  abortBoxingLiveEvolve(): { shape: NetworkShape; genome: Genome } | null {
    if (!this.boxingLive) return null;
    const design = this.boxingLive.design;
    const shape = this.boxingLive.shape;
    const best = this.boxingLive.bestOverall;
    const promoted =
      best.fitness > -Infinity
        ? {
            shape,
            genome: {
              weights: cloneWeights(best.weights),
              fitness: best.fitness,
            },
          }
        : null;
    this.clearCohort();
    this.boxingLive = null;
    this.restoreControllerRateAfterBoxing();
    if (this.world && design) {
      this.creature = this.spawnCreatureWithGrip(
        design,
        resolveSpawn(this.environment),
      );
      this.design = design;
      this.manualDrives = zeroActuatorDrives(design);
      this.brainDrives = zeroActuatorDrives(design);
    }
    this.driveMode = 'idle';
    this.time = 0;
    this.accumulator = 0;
    return promoted;
  }

  /** L5 — start a deterministic single-pass joust. */
  startJoustMatch(options: JoustMatchOptions): void {
    if (!this.world) throw new Error('Simulation not initialized');
    if (!isFeatureEnabled('joustingMode')) {
      throw new Error('Jousting skill is disabled');
    }
    const [a, b] = options.entries;
    if (
      !designHasActuators(a.design, includeWheelActuators()) ||
      !designHasActuators(b.design, includeWheelActuators())
    ) {
      throw new Error('Both jousters need muscles');
    }
    for (const entry of [a, b]) {
      const eligibility = joustingEligibility(entry.design);
      if (!eligibility.eligible) {
        throw new Error(
          `${entry.design.name} is not eligible for jousting: ${eligibility.reasons.join(' ')}`,
        );
      }
    }

    this.clearDiscoDancers();
    this.clearCohort();
    this.live = null;
    this.h2h = null;
    this.h2hFinished = null;
    this.boxing = null;
    this.boxingFinished = null;
    this.boxingLive = null;
    this.clearJoustingState();
    this.soloWatch = null;
    this.clearBrain();
    if (this.creature) {
      destroyCreature(this.world, this.creature);
      this.creature = null;
    }

    this.task = 'jousting';
    this.syncCourseForTask('jousting');
    this.syncEnvironmentGeometry();
    const spawn = resolveSpawn(this.environment);
    const entries: [JoustMatchEntry, JoustMatchEntry] = [a, b];
    const matchDesigns: [CreatureDesign, CreatureDesign] = [
      cloneDesign(a.design),
      mirrorBoxingDesign(b.design),
    ];
    const probes: JoustProbeSet[] = [];
    for (let i = 0; i < 2; i++) {
      const entry = entries[i];
      const memberDesign = matchDesigns[i];
      const creature = this.spawnCreatureWithGrip(memberDesign, {
        x: i === 0 ? -JOUST_SPAWN_X : JOUST_SPAWN_X,
        y: spawn.y,
      });
      enableJoustOpponentContact(creature, i as JoustOwner);
      this.cohort.push(
        this.makeBoxingCohortMember(
          creature,
          i,
          entry.weights,
          entry.shape,
          memberDesign,
        ),
      );
      probes.push(createJoustProbes(this.world, creature, i as JoustOwner));
    }

    this.design = a.design;
    this.driveMode = 'brain';
    this.discoDriveProvider = null;
    this.time = 0;
    this.accumulator = 0;
    this.running = true;
    this.duelFocusIndex = 0;
    this.pinBoxingControllerRate();
    const pass = createJoustPassState();
    const maxSeconds = options.episodeSeconds ?? JOUST_MAX_SECONDS;
    this.jousting = {
      episodeT: 0,
      episodeDuration: maxSeconds + JOUST_AFTERMATH_SECONDS,
      scorecard: createJoustScorecard(pass),
      probes: probes as [JoustProbeSet, JoustProbeSet],
      hitTracker: createJoustHitTracker(),
      pass,
      priorities: options.priorities
        ? { ...options.priorities }
        : { ...DEFAULT_JOUSTING_PRIORITIES },
      onProgress: options.onProgress,
      onFinished: options.onFinished,
    };
  }

  abortJoustMatch(): void {
    if (!this.jousting && !this.joustingFinished) return;
    const design = this.cohort[0]?.memberDesign ?? this.design ?? null;
    this.clearCohort();
    this.clearJoustingState();
    this.restoreControllerRateAfterBoxing();
    if (!this.world || !design) return;
    this.creature = this.spawnCreatureWithGrip(
      design,
      resolveSpawn(this.environment),
    );
    this.design = design;
    this.manualDrives = zeroActuatorDrives(design);
    this.brainDrives = zeroActuatorDrives(design);
    this.driveMode = 'idle';
    this.task = 'jousting';
    this.time = 0;
    this.accumulator = 0;
  }

  startJoustingLiveEvolve(options: JoustLiveEvolveOptions): void {
    if (!this.world) throw new Error('Simulation not initialized');
    if (!isFeatureEnabled('joustingMode')) {
      throw new Error('Jousting skill is disabled');
    }
    const design = cloneDesign(options.design);
    const eligibility = joustingEligibility(design);
    if (!eligibility.eligible) {
      throw new Error(
        `${design.name} is not eligible for jousting: ${eligibility.reasons.join(' ')}`,
      );
    }
    if (!designHasActuators(design, includeWheelActuators())) {
      throw new Error('Design has no muscles to control');
    }
    const opponentDesign = cloneDesign(options.opponentDesign);
    if (!joustingEligibility(opponentDesign).eligible) {
      throw new Error('Sparring partner is not eligible for jousting');
    }

    const popSize = options.populationSize ?? LIVE_POPULATION_SIZE;
    const batchSize = Math.max(
      1,
      Math.min(options.batchSize ?? LIVE_BATCH_SIZE, popSize),
    );
    const maxGenerations = options.maxGenerations ?? LIVE_MAX_GENERATIONS;
    const chargeSeconds = Math.max(
      6,
      options.episodeSeconds ?? JOUST_MAX_SECONDS,
    );
    const episodeDuration = chargeSeconds + JOUST_AFTERMATH_SECONDS;
    const breedOpts = options.breed ?? {};
    const breed = {
      eliteCount: breedOpts.eliteCount ?? ELITE_COUNT,
      tournamentSize: breedOpts.tournamentSize ?? TOURNAMENT_SIZE,
      mutationSigma: breedOpts.mutationSigma ?? MUTATION_SIGMA,
      mutationResetRate: breedOpts.mutationResetRate ?? MUTATION_RESET_RATE,
      crossover: breedOpts.crossover ?? true,
    };
    const rng = createRng(options.seed ?? 1);
    const shape = shapeForJoustingDesign(design);
    const opponentShape = shapeForJoustingDesign(opponentDesign);
    if (
      options.opponentWeights &&
      options.opponentWeights.length !== opponentShape.weightCount
    ) {
      throw new Error('Sparring brain does not match the sparring body');
    }
    const opponentWeights = options.opponentWeights
      ? cloneWeights(options.opponentWeights)
      : randomWeights(opponentShape, createRng((options.seed ?? 1) + 991));

    let resolvedSeed = options.seedGenome;
    if (resolvedSeed) {
      if (
        resolvedSeed.shape.inputCount !== shape.inputCount ||
        resolvedSeed.shape.hiddenCount !== shape.hiddenCount ||
        resolvedSeed.shape.outputCount !== shape.outputCount ||
        resolvedSeed.weights.length !== shape.weightCount
      ) {
        throw new Error(
          'Seed genome shape mismatch — Jousting continue training needs a matching layout.',
        );
      }
    }

    const population: Genome[] = [];
    if (resolvedSeed) {
      population.push({
        weights: cloneWeights(resolvedSeed.weights),
        fitness: 0,
      });
      while (population.length < popSize) {
        population.push({
          weights: mutate(resolvedSeed.weights, rng, {
            mutationSigma: breed.mutationSigma,
            mutationResetRate: breed.mutationResetRate,
          }),
          fitness: 0,
        });
      }
    } else {
      for (let i = 0; i < popSize; i++) {
        population.push({
          weights: randomWeights(shape, rng),
          fitness: 0,
        });
      }
    }

    this.clearDiscoDancers();
    this.clearCohort();
    this.live = null;
    this.h2h = null;
    this.h2hFinished = null;
    this.boxing = null;
    this.boxingFinished = null;
    this.boxingLive = null;
    this.jousting = null;
    this.joustingFinished = null;
    this.soloWatch = null;
    this.clearBrain();
    if (this.creature) {
      destroyCreature(this.world, this.creature);
      this.creature = null;
    }

    this.task = 'jousting';
    this.syncCourseForTask('jousting');
    this.syncEnvironmentGeometry();
    this.design = design;
    this.driveMode = 'brain';
    this.discoDriveProvider = null;
    this.running = true;
    this.pinBoxingControllerRate();

    this.joustingLive = {
      design,
      shape,
      opponentDesign,
      opponentShape,
      opponentWeights,
      population,
      popSize,
      batchSize,
      maxGenerations: Math.max(1, maxGenerations),
      generation: 0,
      batchIndex: 0,
      batchCount: Math.ceil(popSize / batchSize),
      episodeT: 0,
      episodeDuration,
      focusIndex: 0,
      rng,
      bestOverall: {
        weights: cloneWeights(population[0]!.weights),
        fitness: -Infinity,
      },
      displayMeanFitness: 0,
      stopRequested: false,
      status: 'Starting Jousting pass…',
      breed,
      priorities: options.priorities
        ? { ...options.priorities }
        : { ...DEFAULT_JOUSTING_PRIORITIES },
      pairs: [],
      onProgress: options.onProgress,
      onFinished: options.onFinished,
    };

    this.spawnJoustingLiveBatch();
    this.emitJoustingLiveProgress();
  }

  abortJoustingLiveEvolve(): { shape: NetworkShape; genome: Genome } | null {
    if (!this.joustingLive) return null;
    const design = this.joustingLive.design;
    const shape = this.joustingLive.shape;
    const best = this.joustingLive.bestOverall;
    const promoted =
      best.fitness > -Infinity
        ? {
            shape,
            genome: {
              weights: cloneWeights(best.weights),
              fitness: best.fitness,
            },
          }
        : null;
    this.clearCohort();
    this.joustingLive = null;
    this.restoreControllerRateAfterBoxing();
    if (this.world && design) {
      this.creature = this.spawnCreatureWithGrip(
        design,
        resolveSpawn(this.environment),
      );
      this.design = design;
      this.manualDrives = zeroActuatorDrives(design);
      this.brainDrives = zeroActuatorDrives(design);
    }
    this.driveMode = 'idle';
    this.time = 0;
    this.accumulator = 0;
    return promoted;
  }

  startLiveEvolve(options: LiveEvolveOptions): void {
    if (!this.world) throw new Error('Simulation not initialized');
    const design = options.design;
    if (!designHasActuators(design, includeWheelActuators())) {
      throw new Error('Design has no muscles or wheels to control');
    }

    const popSize = options.populationSize ?? LIVE_POPULATION_SIZE;
    const batchSize = Math.max(
      1,
      Math.min(options.batchSize ?? LIVE_BATCH_SIZE, popSize),
    );
    const maxGenerations = options.maxGenerations ?? LIVE_MAX_GENERATIONS;
    const baseEpisodeSeconds = options.episodeSeconds ?? EPISODE_SECONDS;
    const breedOpts = options.breed ?? {};
    const breed = {
      eliteCount: breedOpts.eliteCount ?? ELITE_COUNT,
      tournamentSize: breedOpts.tournamentSize ?? TOURNAMENT_SIZE,
      mutationSigma: breedOpts.mutationSigma ?? MUTATION_SIGMA,
      mutationResetRate: breedOpts.mutationResetRate ?? MUTATION_RESET_RATE,
      crossover: breedOpts.crossover ?? false,
      annealMutation: breedOpts.annealMutation ?? false,
      shortTriesFirst: breedOpts.shortTriesFirst ?? false,
      stopAfterFall: breedOpts.stopAfterFall ?? false,
    };
    const episodeDuration = adaptiveEpisodeSeconds(
      baseEpisodeSeconds,
      0,
      breed.shortTriesFirst,
    );
    const rng = createRng(options.seed ?? 1);
    const morphEvolve =
      !!options.morphEvolve && isFeatureEnabled('morphEvolve');
    const structuralMorphEvolve =
      morphEvolve &&
      !!options.structuralMorphEvolve &&
      isFeatureEnabled('structuralMorphEvolve');
    const messyBodies =
      !!options.messyBodies && isFeatureEnabled('trainExperiences');
    const raycastOn = raycastObsEnabled(!!options.raycastObservations);
    this.raycastObservations = raycastOn;
    const obsInputs = locoObsInputCount(raycastOn);

    let maxMuscleChannels = countBrainActuatorChannels(design.muscles);
    let shape: NetworkShape;
    if (structuralMorphEvolve) {
      const budget = structureChannelBudget(design, includeWheelActuators());
      maxMuscleChannels = budget.maxMuscleChannels;
      shape = makeShape(budget.outputCount, obsInputs);
    } else {
      shape = shapeForDesign(design, { raycast: raycastOn });
      maxMuscleChannels = countBrainActuatorChannels(design.muscles);
    }

    const mutOpts = {
      mutationSigma: breed.mutationSigma,
      mutationResetRate: breed.mutationResetRate,
    };

    let resolvedSeedGenome = options.seedGenome;
    if (resolvedSeedGenome) {
      let seed = resolvedSeedGenome;
      if (
        seed.shape.inputCount !== shape.inputCount ||
        seed.shape.hiddenCount !== shape.hiddenCount ||
        seed.shape.outputCount !== shape.outputCount ||
        seed.weights.length !== shape.weightCount
      ) {
        const transplanted = transplantWeights(
          seed.shape,
          seed.weights,
          shape,
        );
        if (!transplanted) {
          throw new Error(
            'Seed genome shape mismatch — continue training requires a compatible actuator/obs layout.',
          );
        }
        resolvedSeedGenome = { ...seed, shape, weights: transplanted };
      }
    }

    const baseMorph = morphEvolve ? zeroMorphGenes(design) : undefined;
    const seedMorph =
      morphEvolve && resolvedSeedGenome?.morph
        ? cloneMorphGenes(resolvedSeedGenome.morph)
        : baseMorph
          ? cloneMorphGenes(baseMorph)
          : undefined;
    const seedTopology =
      structuralMorphEvolve
        ? cloneTopology(resolvedSeedGenome?.topology ?? design)
        : undefined;

    const population: Genome[] = [];
    if (resolvedSeedGenome) {
      const elite = cloneWeights(resolvedSeedGenome.weights);
      population.push({
        weights: elite,
        fitness: 0,
        morph: seedMorph ? cloneMorphGenes(seedMorph) : undefined,
        topology: seedTopology ? cloneTopology(seedTopology) : undefined,
      });
      while (population.length < popSize) {
        let topology =
          structuralMorphEvolve && seedTopology
            ? mutateStructure(seedTopology, design, rng)
            : undefined;
        let morph: Genome['morph'];
        if (structuralMorphEvolve && topology) {
          morph = morphForTopology(topology, rng, mutOpts.mutationSigma, true);
        } else if (morphEvolve && seedMorph) {
          morph = mutateMorphGenes(seedMorph, rng, mutOpts.mutationSigma);
        } else {
          morph = undefined;
        }
        population.push({
          weights: mutate(resolvedSeedGenome.weights, rng, mutOpts),
          fitness: 0,
          morph,
          topology,
        });
      }
    } else {
      for (let i = 0; i < popSize; i++) {
        let topology: Genome['topology'];
        let morph: Genome['morph'];
        if (structuralMorphEvolve) {
          topology =
            i === 0
              ? cloneTopology(design)
              : mutateStructure(design, design, rng);
          morph = morphForTopology(
            topology,
            rng,
            mutOpts.mutationSigma,
            i !== 0,
          );
        } else if (morphEvolve && baseMorph) {
          morph =
            i === 0
              ? cloneMorphGenes(baseMorph)
              : mutateMorphGenes(baseMorph, rng, mutOpts.mutationSigma);
        }
        population.push({
          weights: randomWeights(shape, rng),
          fitness: 0,
          morph,
          topology,
        });
      }
    }

    this.clearCohort();
    this.clearDiscoDancers();
    this.h2h = null;
    this.h2hFinished = null;
    this.restoreControllerRateAfterBoxing();
    this.boxing = null;
    this.boxingFinished = null;
    this.boxingLive = null;
    this.clearJoustingState();
    this.soloWatch = null;
    if (this.creature) {
      destroyCreature(this.world, this.creature);
      this.creature = null;
    }
    this.design = design;
    this.clearBrain();
    this.driveMode = 'brain';
    this.running = true;
    this.time = 0;
    this.accumulator = 0;

    const task = options.task ?? this.task;
    this.task = task;
    this.syncCourseForTask(task);
    this.syncEnvironmentGeometry();

    this.live = {
      design,
      task,
      shape,
      population,
      popSize,
      batchSize,
      maxGenerations,
      generation: 0,
      batchIndex: 0,
      batchCount: Math.ceil(popSize / batchSize),
      episodeT: 0,
      episodeDuration,
      baseEpisodeSeconds,
      focusIndex: 0,
      rng,
      bestOverall: {
        weights: cloneWeights(population[0]!.weights),
        fitness: -Infinity,
        morph: population[0]!.morph
          ? cloneMorphGenes(population[0]!.morph)
          : undefined,
        topology: population[0]!.topology
          ? cloneTopology(population[0]!.topology)
          : undefined,
      },
      genBestMetrics: null,
      genBestFitness: -Infinity,
      genBestStall: null,
      genBestMorph: undefined,
      displayMeanFitness: 0,
      stopRequested: false,
      status: 'Starting…',
      breed,
      priorities: options.priorities ?? { ...DEFAULT_GOAL_PRIORITIES },
      morphEvolve,
      structuralMorphEvolve,
      maxMuscleChannels,
      messyBodies,
      onProgress: options.onProgress,
      onFinished: options.onFinished,
    };

    this.spawnCurrentBatch();
    this.emitEvolveProgress();
  }

  /** Finish after the current live batch episode (Keiwan-style stop). */
  requestStopEvolve(): void {
    if (this.live) {
      this.live.stopRequested = true;
      this.live.status = 'Stopping after this batch…';
      this.emitEvolveProgress();
    }
    if (this.boxingLive) {
      this.boxingLive.stopRequested = true;
      this.boxingLive.status = 'Stopping after this batch…';
      this.emitBoxingLiveProgress();
    }
    if (this.joustingLive) {
      this.joustingLive.stopRequested = true;
      this.joustingLive.status = 'Stopping after this batch…';
      this.emitJoustingLiveProgress();
    }
  }

  /**
   * Update per-generation episode length (simulated seconds).
   * Applies to the current live evolve episode and solo replay watches.
   * If the new length is already elapsed, the episode ends on the next step.
   */
  setEpisodeSeconds(seconds: number): void {
    const duration = Number.isFinite(seconds) ? Math.max(1, seconds) : seconds;
    if (this.live) {
      this.live.episodeDuration = duration;
      if (this.live.baseEpisodeSeconds !== undefined) {
        this.live.baseEpisodeSeconds = duration;
      }
      this.emitEvolveProgress();
    }
    if (this.boxingLive) {
      this.boxingLive.episodeDuration = duration;
      this.emitBoxingLiveProgress();
    }
    if (this.joustingLive) {
      this.joustingLive.episodeDuration = duration;
      this.emitJoustingLiveProgress();
    }
    if (this.soloWatch) {
      this.soloWatch.episodeDuration = duration;
    }
    if (this.h2h) {
      this.h2h.episodeDuration = duration;
    }
    if (this.boxing) {
      this.boxing.episodeDuration = duration;
    }
    if (this.jousting) {
      this.jousting.episodeDuration = duration;
    }
  }

  /** Immediately tear down a live evolve session; returns elite if one exists. */
  abortLiveEvolve(): { shape: NetworkShape; genome: Genome } | null {
    if (this.boxingLive) {
      return this.abortBoxingLiveEvolve();
    }
    if (this.joustingLive) {
      return this.abortJoustingLiveEvolve();
    }
    if (!this.live || !this.world) return null;
    const design = this.live.design;
    const shape = this.live.shape;
    const best = this.live.bestOverall;
    const promoted =
      best.fitness > -Infinity
        ? {
            shape,
            genome: {
              weights: cloneWeights(best.weights),
              fitness: best.fitness,
              morph: best.morph ? cloneMorphGenes(best.morph) : undefined,
            },
          }
        : null;
    this.clearCohort();
    this.clearDiscoDancers();
    this.h2h = null;
    this.live = null;
    this.soloWatch = null;
    this.creature = this.spawnCreatureWithGrip(
      design,
      resolveSpawn(this.environment),
    );
    this.design = design;
    this.manualDrives = zeroActuatorDrives(design);
    this.brainDrives = zeroActuatorDrives(design);
    this.driveMode = 'idle';
    this.time = 0;
    this.accumulator = 0;
    return promoted;
  }

  focusNextCreature(): void {
    if (this.joustingLive && this.joustingLive.pairs.length > 0) {
      this.joustingLive.focusIndex =
        (this.joustingLive.focusIndex + 1) % this.joustingLive.pairs.length;
      this.emitJoustingLiveProgress();
      return;
    }
    if (this.boxingLive && this.boxingLive.pairs.length > 0) {
      this.boxingLive.focusIndex =
        (this.boxingLive.focusIndex + 1) % this.boxingLive.pairs.length;
      this.emitBoxingLiveProgress();
      return;
    }
    if (this.live && this.cohort.length > 0) {
      this.live.focusIndex = (this.live.focusIndex + 1) % this.cohort.length;
      this.emitEvolveProgress();
      return;
    }
    if (this.isBoxingView() || this.isHeadToHeadView() || this.isJoustingView()) {
      const n = Math.min(2, this.cohort.length);
      if (n <= 0) return;
      this.duelFocusIndex = (this.duelFocusIndex + 1) % n;
    }
  }

  focusPrevCreature(): void {
    if (this.joustingLive && this.joustingLive.pairs.length > 0) {
      const n = this.joustingLive.pairs.length;
      this.joustingLive.focusIndex =
        (this.joustingLive.focusIndex - 1 + n) % n;
      this.emitJoustingLiveProgress();
      return;
    }
    if (this.boxingLive && this.boxingLive.pairs.length > 0) {
      const n = this.boxingLive.pairs.length;
      this.boxingLive.focusIndex =
        (this.boxingLive.focusIndex - 1 + n) % n;
      this.emitBoxingLiveProgress();
      return;
    }
    if (this.live && this.cohort.length > 0) {
      this.live.focusIndex =
        (this.live.focusIndex - 1 + this.cohort.length) % this.cohort.length;
      this.emitEvolveProgress();
      return;
    }
    if (this.isBoxingView() || this.isHeadToHeadView() || this.isJoustingView()) {
      const n = Math.min(2, this.cohort.length);
      if (n <= 0) return;
      this.duelFocusIndex = (this.duelFocusIndex - 1 + n) % n;
    }
  }

  step(frameDt: number): SimulationSnapshot {
    if (!this.world || !this.running) {
      return this.snapshot();
    }
    if (
      !this.live &&
      !this.boxingLive &&
      !this.joustingLive &&
      !this.creature &&
      this.discoDancers.length === 0 &&
      !this.h2h &&
      !this.h2hFinished &&
      !this.boxing &&
      !this.boxingFinished &&
      !this.jousting &&
      !this.joustingFinished
    ) {
      return this.snapshot();
    }

    // D1: scale how much simulated time is requested; integrator stays FIXED_DT.
    // timeScale ≤ 0 (“Max”) uses a large step budget. Never queue more sim time
    // than that budget can drain — leftover debt was blowing up A5 pose
    // extrapolation (bodies flung by multi-second velocity * dt).
    const scale = this.timeScale <= 0 ? 64 : this.timeScale;
    const maxSteps =
      frameDt <= FIXED_DT + 1e-9 && scale <= 1
        ? 1
        : Math.min(64, Math.max(8, Math.ceil(scale * 8)));
    const simDt = frameDt * scale;
    this.accumulator += Math.min(simDt, maxSteps * FIXED_DT);
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < maxSteps) {
      this.physicsStep(FIXED_DT);
      this.accumulator -= FIXED_DT;
      steps++;
    }
    // Sub-frame remainder only — A5 must never see multi-tick debt.
    if (this.accumulator >= FIXED_DT) {
      this.accumulator %= FIXED_DT;
    }
    return this.snapshot();
  }

  private physicsStep(dt: number): void {
    if (!this.world) return;

    if (this.live) {
      this.physicsStepCohort(dt);
      return;
    }

    if (this.joustingLive) {
      this.physicsStepJoustingLive(dt);
      return;
    }

    if (this.jousting) {
      this.physicsStepJousting(dt);
      return;
    }

    if (this.isJoustingView() && this.joustingFinished) {
      return;
    }

    if (this.boxingLive) {
      this.physicsStepBoxingLive(dt);
      return;
    }

    if (this.boxing) {
      this.physicsStepBoxing(dt);
      return;
    }

    if (this.isBoxingView() && this.boxingFinished) {
      return;
    }

    if (this.h2h) {
      this.physicsStepHeadToHead(dt);
      return;
    }

    if (this.isHeadToHeadView() && this.h2hFinished) {
      return;
    }

    if (this.discoDancers.length > 0) {
      this.physicsStepMultiDisco(dt);
      return;
    }

    if (!this.creature) return;

    if (this.driveMode === 'brain') {
      this.tickBrainSingle(dt);
    }

    const { channelDrives, muscleDrives } = this.resolveActuationSingle();
    if (this.driveMode === 'disco') {
      this.tickDiscoSample(dt, muscleDrives);
    }
    resetCreatureForces(this.creature);
    applyMuscleForces(
      this.creature.muscles,
      muscleDrives,
      this.muscleVisual,
      this.discoArenaFeel ? this.discoMuscleForceOptions() : undefined,
    );
    applyExtraForces(this.creature, this.design, channelDrives, {
      skipAero: isLaunchBoosting(this.launchCooldownFor(this.creature)),
    });

    syncCreatureSoftCcd(this.creature);
    this.world.timestep = dt;
    this.world.step();
    // Plant slide brake: Idle settle + brain/evolve scoot.
    // Skip flight/motor and disco freestyle (dance brain + arena feel).
    const skipPlantBrake =
      isFlightTask(this.task) ||
      isMotorTask(this.task) ||
      (this.discoArenaFeel &&
        this.driveMode === 'brain' &&
        this.brainShape?.inputCount === DANCE_OBS_COUNT);
    if (!skipPlantBrake) {
      applyPlantSlideBrake(
        this.creature,
        this.activeTerrain(),
        this.world,
        this.envObstacles,
        this.antiScoot,
      );
    }
    this.maybeApplyLaunchPads(this.creature);
    this.time += dt;
    this.tickSoloWatch(dt);
  }

  private launchCooldownFor(creature: SpawnedCreature): LaunchPadCooldown {
    let c = this.launchPadCooldowns.get(creature);
    if (!c) {
      c = createLaunchPadCooldown();
      this.launchPadCooldowns.set(creature, c);
    }
    return c;
  }

  /** Smoke / debug — true after any pad has fired for the live creature this run. */
  launchPadSpent(): boolean {
    if (!this.creature) return false;
    const c = this.launchPadCooldowns.get(this.creature);
    return !!c && c.spentPads.size > 0;
  }

  /** Smoke / debug — how many distinct pads have fired this run. */
  launchPadSpentCount(): number {
    if (!this.creature) return 0;
    return this.launchPadCooldowns.get(this.creature)?.spentPads.size ?? 0;
  }

  private maybeApplyLaunchPads(creature: SpawnedCreature | null | undefined): void {
    if (
      !creature ||
      !this.world ||
      !isFeatureEnabled('launchPads') ||
      !this.envObstacles
    ) {
      return;
    }
    applyLaunchPads(
      this.world,
      creature,
      this.envObstacles,
      this.time,
      this.launchCooldownFor(creature),
    );
  }

  /** H6 — emit dance obs + teacher drives at brain rate while disco. */
  private tickDiscoSample(dt: number, muscleDrives: number[]): void {
    if (!this.discoSampleHook || !this.creature) {
      this.discoSampleAccumulator = 0;
      return;
    }
    this.discoSampleAccumulator += dt;
    while (this.discoSampleAccumulator >= BRAIN_DT) {
      this.discoSampleAccumulator -= BRAIN_DT;
      const bands = this.audioObsProvider?.() ?? null;
      const lookahead = this.audioLookaheadProvider?.() ?? null;
      buildDanceObservations(
        this.creature,
        bands,
        this.discoSampleObsBuf,
        this.observationContext(),
        lookahead,
      );
      this.discoSampleHook({
        obs: this.discoSampleObsBuf,
        muscleDrives,
      });
    }
  }

  private tickSoloWatch(dt: number): void {
    const watch = this.soloWatch;
    if (!watch || !this.creature || this.driveMode !== 'brain') return;
    const terrain = this.activeTerrain();
    const regions = activeScoreRegions(this.environment);
    const markers = activeCourseMarkers(this.environment);

    if (!watch.fell) {
      const fall = updateFallState(this.creature, watch.fallTime, dt, terrain);
      watch.fallTime = fall.fallTime;
      if (fall.fell) watch.fell = true;
    }
    watch.peakDistance = Math.max(
      watch.peakDistance,
      avgJointX(this.creature) - watch.startX,
    );
    // Freeze posture / lift accounting after a fall so thrash doesn't erase quality.
    if (!watch.fell) {
      watch.footLifts += updateFootLiftState(
        this.creature,
        watch.planted,
        terrain,
      );
      watch.uprightSum += instantUprightQuality(this.creature);
      watch.uprightSteps++;
      watch.peakSpeed = Math.max(watch.peakSpeed, avgJointVelX(this.creature));
    }
    const track = updateJumpFlightTrackers(
      this.creature,
      dt,
      watch.peakHeight,
      watch.airTime,
      watch.airHeightIntegral,
      0.55,
      watch.impactSpeed,
      watch.airborneTravel,
      watch.prevAvgX,
    );
    watch.peakHeight = track.peakHeight;
    watch.airTime = track.airTime;
    watch.airHeightIntegral = track.airHeightIntegral;
    watch.impactSpeed = track.impactSpeed;
    watch.airborneTravel = track.airborneTravel;
    watch.prevAvgX = track.avgX;
    watch.regionAccum = updateScoreRegionAccum(
      this.creature,
      regions,
      dt,
      watch.regionAccum,
      watch.airTime,
    );
    if (shouldEndEpisodeOnLanding(watch.regionAccum)) {
      watch.landed = true;
    }
    watch.courseAccum = updateCourseMarkerAccum(
      this.creature,
      markers,
      watch.episodeT + dt,
      watch.courseAccum,
    );
    watch.episodeT += dt;

    if (!watch.landed && watch.episodeT < watch.episodeDuration) return;

    const uprightMean =
      watch.uprightSteps > 0 ? watch.uprightSum / watch.uprightSteps : 1;
    const metrics = scoreTaskPerformance(
      watch.task,
      this.creature,
      watch.startX,
      watch.fell,
      watch.footLifts,
      watch.peakHeight,
      watch.airTime,
      uprightMean,
      track.meanAirHeight,
      watch.regionAccum,
      watch.courseAccum,
      watch.peakSpeed,
      watch.episodeT,
      watch.peakDistance,
      watch.impactSpeed,
      watch.airborneTravel,
    );
    const snap: EpisodeCompleteSnapshot = {
      task: watch.task,
      metrics,
      design: watch.design,
      episodeSeconds: watch.episodeDuration,
      context: 'replay',
    };
    this.lastEpisodeMetrics = metrics;
    this.soloWatch = null;
    this.onEpisodeComplete?.(snap);
  }

  private physicsStepMultiDisco(dt: number): void {
    if (!this.world) return;

    const muscleOpts = this.discoMuscleForceOptions();
    let firstDrives: number[] | null = null;
    for (let di = 0; di < this.discoDancers.length; di++) {
      const dancer = this.discoDancers[di];
      const drives = dancer.resolveDrives();
      const n = dancer.creature.muscles.length;
      const muscleDrives =
        drives.length === n
          ? drives
          : Array.from({ length: n }, (_, i) => drives[i] ?? 0);
      if (di === 0) firstDrives = muscleDrives;
      resetCreatureForces(dancer.creature);
      applyMuscleForces(
        dancer.creature.muscles,
        muscleDrives,
        dancer.muscleVisual,
        muscleOpts,
      );
      applyExtraForces(
        dancer.creature,
        dancer.design,
        channelDrivesFromMuscleDrives(dancer.design, muscleDrives),
        {
          skipAero: isLaunchBoosting(this.launchCooldownFor(dancer.creature)),
        },
      );
      if (!isFlightTask(this.task) && !isMotorTask(this.task)) {
        applyPlantSlideBrake(
          dancer.creature,
          this.activeTerrain(),
          this.world,
          this.envObstacles,
          this.antiScoot,
        );
      }
    }

    // H6 — record from the primary dancer when only one is staged.
    if (
      this.discoSampleHook &&
      this.discoDancers.length === 1 &&
      firstDrives
    ) {
      const dancer = this.discoDancers[0];
      this.discoSampleAccumulator += dt;
      while (this.discoSampleAccumulator >= BRAIN_DT) {
        this.discoSampleAccumulator -= BRAIN_DT;
        const bands = this.audioObsProvider?.() ?? null;
        const lookahead = this.audioLookaheadProvider?.() ?? null;
        buildDanceObservations(
          dancer.creature,
          bands,
          this.discoSampleObsBuf,
          this.observationContext(),
          lookahead,
        );
        this.discoSampleHook({
          obs: this.discoSampleObsBuf,
          muscleDrives: firstDrives,
        });
      }
    }

    for (const dancer of this.discoDancers) {
      syncCreatureSoftCcd(dancer.creature);
    }
    this.world.timestep = dt;
    this.world.step();
    this.time += dt;
    for (const dancer of this.discoDancers) {
      this.maybeApplyLaunchPads(dancer.creature);
    }
  }

  private physicsStepBoxing(dt: number): void {
    if (!this.world || !this.boxing || this.cohort.length < 2) return;

    for (let memberIndex = 0; memberIndex < 2; memberIndex++) {
      const member = this.cohort[memberIndex];
      const shape = member.memberShape;
      const memberDesign = member.memberDesign;
      if (!shape || !memberDesign) continue;
      this.tickBoxingBrainMember(memberIndex, shape, dt);
      const muscleDrives = expandChannelDrives(
        memberDesign.muscles,
        member.brainDrives,
      );
      resetCreatureForces(member.creature);
      applyMuscleForces(
        member.creature.muscles,
        muscleDrives,
        member.muscleVisual,
      );
      applyExtraForces(member.creature, memberDesign, member.brainDrives, {
        skipAero: true,
      });
    }

    for (const member of this.cohort.slice(0, 2)) {
      syncCreatureSoftCcd(member.creature);
    }
    this.world.timestep = dt;
    this.world.step();
    this.time += dt;
    this.boxing.episodeT += dt;

    const events = detectBoxingHits(
      this.world,
      this.boxing.probes,
      this.boxing.hitTracker,
      this.boxing.episodeT,
    );
    this.boxing.score.fighters[0].attempts =
      this.boxing.hitTracker.attempts[0];
    this.boxing.score.fighters[1].attempts =
      this.boxing.hitTracker.attempts[1];
    for (const event of events) recordBoxingHit(this.boxing.score, event);

    updateBoxingBehaviorMetrics(
      this.boxing.behavior,
      this.cohort[0].creature,
      this.cohort[1].creature,
      this.boxing.hitTracker.attempts,
      dt,
    );

    const terrain = this.activeTerrain();
    for (const member of this.cohort.slice(0, 2)) {
      applyPlantSlideBrake(
        member.creature,
        terrain,
        this.world,
        this.envObstacles,
        this.antiScoot,
      );
      member.uprightSum += instantUprightQuality(member.creature);
      member.uprightSteps++;
    }

    const progress = this.boxingSnapshot();
    // ~4 Hz HUD refresh (same cadence as live evolve) — every-step React
    // setState flooded the train dock and left the progress bar stuck full.
    const tickHz = Math.floor(this.boxing.episodeT * 4);
    const prevTickHz = Math.floor((this.boxing.episodeT - dt) * 4);
    if (progress && tickHz !== prevTickHz) {
      this.boxing.onProgress?.(progress);
    }
    if (this.boxing.episodeT < this.boxing.episodeDuration) return;

    const points = this.boxing.score.fighters.map((fighter) => fighter.points) as [
      number,
      number,
    ];
    const winner: BoxingOwner | null =
      points[0] === points[1] ? null : points[0] > points[1] ? 0 : 1;
    const result: BoxingMatchResult = {
      score: this.boxing.score,
      winner,
      reason: winner === null ? 'draw' : 'points',
      episodeDuration: this.boxing.episodeDuration,
      upright: [
        this.cohort[0].uprightSteps > 0
          ? this.cohort[0].uprightSum / this.cohort[0].uprightSteps
          : 0,
        this.cohort[1].uprightSteps > 0
          ? this.cohort[1].uprightSum / this.cohort[1].uprightSteps
          : 0,
      ],
      behavior: this.boxing.behavior,
    };
    const onProgress = this.boxing.onProgress;
    const onFinished = this.boxing.onFinished;
    // Final progress tick at episode end (may land between 4 Hz samples).
    if (progress) onProgress?.(progress);
    this.boxing = null;
    this.boxingFinished = result;
    // Keep driveMode 'brain' so chained training spars stay actuated; App
    // clears drive on finishBoxingLiveEvolve / abort.
    onFinished?.(result);
  }

  private makeBoxingCohortMember(
    creature: SpawnedCreature,
    genomeIndex: number,
    weights: Float32Array,
    shape: NetworkShape,
    memberDesign: CreatureDesign,
  ): CohortMember {
    return {
      creature,
      genomeIndex,
      weights,
      brainDrives: new Array(shape.outputCount).fill(0),
      brainAccumulator: 0,
      lastObs: new Float32Array(shape.inputCount),
      lastHidden: new Float32Array(shape.hiddenCount),
      startX: avgJointX(creature),
      fallTime: 0,
      fell: false,
      landed: false,
      footLifts: 0,
      planted: createFootLiftState(creature.joints.length),
      muscleVisual: [],
      peakHeight: 0,
      airTime: 0,
      airHeightIntegral: 0,
      impactSpeed: 0,
      airborneTravel: 0,
      prevAvgX: avgJointX(creature),
      uprightSum: 0,
      uprightSteps: 0,
      peakSpeed: 0,
      peakDistance: 0,
      regionAccum: emptyScoreRegionAccum(),
      courseAccum: emptyCourseMarkerAccum([]),
      stall: createStallTracker(),
      memberDesign,
      memberShape: shape,
    };
  }

  private spawnBoxingLiveBatch(): void {
    if (!this.world || !this.boxingLive) return;
    this.clearCohort();
    const live = this.boxingLive;
    live.pairs = [];
    const start = live.batchIndex * live.batchSize;
    const count = Math.min(live.batchSize, live.popSize - start);
    const spawn = resolveSpawn(this.environment);

    if (this.outBuf.length < Math.max(live.shape.outputCount, live.opponentShape.outputCount)) {
      this.outBuf = new Float32Array(
        Math.max(live.shape.outputCount, live.opponentShape.outputCount),
      );
    }
    if (this.hidBuf.length < Math.max(live.shape.hiddenCount, live.opponentShape.hiddenCount)) {
      this.hidBuf = new Float32Array(
        Math.max(live.shape.hiddenCount, live.opponentShape.hiddenCount),
      );
    }
    if (this.obsBuf.length < BOXING_OBS_COUNT) {
      this.obsBuf = new Float32Array(BOXING_OBS_COUNT);
    }

    for (let i = 0; i < count; i++) {
      const genomeIndex = start + i;
      const genome = live.population[genomeIndex]!;
      const centerX = i * BOXING_TRAIN_PAIR_GAP;
      const traineeDesign = cloneDesign(live.design);
      const sparringDesign = mirrorBoxingDesign(live.opponentDesign);
      const traineeCreature = this.spawnCreatureWithGrip(traineeDesign, {
        x: centerX - BOXING_SPAWN_X,
        y: spawn.y,
      });
      const sparringCreature = this.spawnCreatureWithGrip(sparringDesign, {
        x: centerX + BOXING_SPAWN_X,
        y: spawn.y,
      });
      enableBoxingOpponentContact(traineeCreature, 0);
      enableBoxingOpponentContact(sparringCreature, 1);
      const trainee = this.makeBoxingCohortMember(
        traineeCreature,
        genomeIndex,
        genome.weights,
        live.shape,
        traineeDesign,
      );
      const sparring = this.makeBoxingCohortMember(
        sparringCreature,
        -1,
        live.opponentWeights,
        live.opponentShape,
        sparringDesign,
      );
      const probes: [BoxingProbeSet, BoxingProbeSet] = [
        createBoxingProbes(this.world, traineeCreature, 0),
        createBoxingProbes(this.world, sparringCreature, 1),
      ];
      this.cohort.push(trainee, sparring);
      live.pairs.push({
        genomeIndex,
        trainee,
        sparring,
        probes,
        hitTracker: createBoxingHitTracker(),
        score: createBoxingMatchScore(live.divisionId),
        behavior: createBoxingBehaviorMetrics(),
      });
    }

    live.episodeT = 0;
    live.focusIndex = 0;
    this.time = 0;
    this.accumulator = 0;
    live.status = `Boxing spar · round ${live.generation} · batch ${live.batchIndex + 1}/${live.batchCount}`;
  }

  private physicsStepBoxingLive(dt: number): void {
    if (!this.world || !this.boxingLive || this.boxingLive.pairs.length === 0) {
      return;
    }
    const live = this.boxingLive;

    for (const pair of live.pairs) {
      this.tickBoxingPairMember(
        pair.trainee,
        pair.sparring,
        pair.score,
        0,
        live.episodeT,
        live.episodeDuration,
        dt,
      );
      this.tickBoxingPairMember(
        pair.sparring,
        pair.trainee,
        pair.score,
        1,
        live.episodeT,
        live.episodeDuration,
        dt,
      );
      for (const member of [pair.trainee, pair.sparring]) {
        const shape = member.memberShape;
        const memberDesign = member.memberDesign;
        if (!shape || !memberDesign) continue;
        const muscleDrives = expandChannelDrives(
          memberDesign.muscles,
          member.brainDrives,
        );
        resetCreatureForces(member.creature);
        applyMuscleForces(
          member.creature.muscles,
          muscleDrives,
          member.muscleVisual,
        );
        applyExtraForces(member.creature, memberDesign, member.brainDrives, {
          skipAero: true,
        });
      }
    }

    for (const member of this.cohort) {
      syncCreatureSoftCcd(member.creature);
    }
    this.world.timestep = dt;
    this.world.step();
    this.time += dt;
    live.episodeT += dt;

    const terrain = this.activeTerrain();
    for (const pair of live.pairs) {
      const events = detectBoxingHits(
        this.world,
        pair.probes,
        pair.hitTracker,
        live.episodeT,
      );
      pair.score.fighters[0].attempts = pair.hitTracker.attempts[0];
      pair.score.fighters[1].attempts = pair.hitTracker.attempts[1];
      for (const event of events) recordBoxingHit(pair.score, event);
      updateBoxingBehaviorMetrics(
        pair.behavior,
        pair.trainee.creature,
        pair.sparring.creature,
        pair.hitTracker.attempts,
        dt,
      );
      for (const member of [pair.trainee, pair.sparring]) {
        applyPlantSlideBrake(
          member.creature,
          terrain,
          this.world,
          this.envObstacles,
          this.antiScoot,
        );
        member.uprightSum += instantUprightQuality(member.creature);
        member.uprightSteps++;
      }
    }

    const tickHz = Math.floor(live.episodeT * 4);
    const prevTickHz = Math.floor((live.episodeT - dt) * 4);
    if (tickHz !== prevTickHz) {
      this.emitBoxingLiveProgress();
    }
    if (live.episodeT < live.episodeDuration) return;
    this.finishBoxingLiveBatch();
  }

  private tickBoxingPairMember(
    member: CohortMember,
    opponent: CohortMember,
    score: BoxingMatchScore,
    memberOwner: BoxingOwner,
    episodeT: number,
    episodeDuration: number,
    dt: number,
  ): void {
    const shape = member.memberShape;
    if (!shape || shape.inputCount !== BOXING_OBS_COUNT) return;
    const brainDt = this.brainDt;
    member.brainAccumulator += dt;
    while (member.brainAccumulator >= brainDt) {
      member.brainAccumulator -= brainDt;
      if (this.obsBuf.length < BOXING_OBS_COUNT) {
        this.obsBuf = new Float32Array(BOXING_OBS_COUNT);
      }
      if (this.outBuf.length < shape.outputCount) {
        this.outBuf = new Float32Array(shape.outputCount);
      }
      if (this.hidBuf.length < shape.hiddenCount) {
        this.hidBuf = new Float32Array(shape.hiddenCount);
      }
      const ownPoints = score.fighters[memberOwner].points;
      const opponentPoints =
        score.fighters[memberOwner === 0 ? 1 : 0].points;
      buildBoxingObservations(
        member.creature,
        opponent.creature,
        ownPoints,
        opponentPoints,
        1 - episodeT / episodeDuration,
        episodeT,
        this.obsBuf,
      );
      const outs = evaluateNetwork(
        shape,
        member.weights,
        this.obsBuf,
        this.outBuf,
        this.hidBuf,
      );
      member.lastObs.set(this.obsBuf.subarray(0, shape.inputCount));
      member.lastHidden.set(this.hidBuf.subarray(0, shape.hiddenCount));
      for (let i = 0; i < member.brainDrives.length; i++) {
        member.brainDrives[i] = outs[i] ?? 0;
      }
    }
  }

  private finishBoxingLiveBatch(): void {
    const live = this.boxingLive;
    if (!live) return;

    for (const pair of live.pairs) {
      const uprightTrainee =
        pair.trainee.uprightSteps > 0
          ? pair.trainee.uprightSum / pair.trainee.uprightSteps
          : 0;
      const uprightSpar =
        pair.sparring.uprightSteps > 0
          ? pair.sparring.uprightSum / pair.sparring.uprightSteps
          : 0;
      const points = pair.score.fighters.map((f) => f.points) as [
        number,
        number,
      ];
      const winner: BoxingOwner | null =
        points[0] === points[1] ? null : points[0] > points[1] ? 0 : 1;
      const result = {
        score: pair.score,
        winner,
        upright: [uprightTrainee, uprightSpar] as [number, number],
        behavior: pair.behavior,
        episodeDuration: live.episodeDuration,
      };
      const fitness = computeBoxingTrainingFitness(result, live.priorities).fitness;
      live.population[pair.genomeIndex]!.fitness = fitness;
      if (fitness > live.bestOverall.fitness) {
        live.bestOverall = {
          weights: cloneWeights(live.population[pair.genomeIndex]!.weights),
          fitness,
        };
      }
    }

    const evaluated = Math.min(
      (live.batchIndex + 1) * live.batchSize,
      live.popSize,
    );
    live.displayMeanFitness = meanFitness(live.population.slice(0, evaluated));

    if (live.stopRequested) {
      this.endBoxingLiveEvolve('Stopped — use Play best');
      return;
    }

    if (live.batchIndex + 1 < live.batchCount) {
      live.batchIndex += 1;
      live.status = `Boxing spar · round ${live.generation} · batch ${live.batchIndex + 1}/${live.batchCount}`;
      this.spawnBoxingLiveBatch();
      this.emitBoxingLiveProgress(evaluated);
      return;
    }

    live.population.sort((a, b) => b.fitness - a.fitness);
    live.status = `Round ${live.generation} done · best ${live.population[0]!.fitness.toFixed(3)}`;
    this.emitBoxingLiveProgress(live.popSize);

    if (live.generation + 1 >= live.maxGenerations) {
      this.endBoxingLiveEvolve('Done — use Play best');
      return;
    }

    live.population = breedNextGeneration(
      live.population,
      live.popSize,
      live.rng,
      {
        eliteCount: live.breed.eliteCount,
        tournamentSize: live.breed.tournamentSize,
        mutationSigma: live.breed.mutationSigma,
        mutationResetRate: live.breed.mutationResetRate,
        crossover: live.breed.crossover,
      },
    );
    live.generation += 1;
    live.batchIndex = 0;
    live.batchCount = Math.ceil(live.popSize / live.batchSize);
    live.status = `Boxing spar · round ${live.generation} · batch 1/${live.batchCount}`;
    this.spawnBoxingLiveBatch();
    this.emitBoxingLiveProgress(0);
  }

  private emitBoxingLiveProgress(evaluatedOverride?: number): void {
    const live = this.boxingLive;
    if (!live) return;
    // During an active episode, count completed genomes only (prior batches).
    const scored =
      evaluatedOverride !== undefined
        ? evaluatedOverride
        : Math.min(live.batchIndex * live.batchSize, live.popSize);
    live.onProgress?.({
      generation: live.generation,
      evaluated: scored,
      populationSize: live.popSize,
      bestFitness:
        live.bestOverall.fitness === -Infinity ? 0 : live.bestOverall.fitness,
      meanFitness: live.displayMeanFitness,
      running: true,
      status: live.status,
      batch: live.batchIndex + 1,
      batchCount: live.batchCount,
      focusIndex: live.focusIndex,
      cohortSize: live.pairs.length,
      episodeT: live.episodeT,
      episodeDuration: live.episodeDuration,
    });
  }

  private endBoxingLiveEvolve(status: string): void {
    const live = this.boxingLive;
    if (!live) return;
    const best = live.bestOverall;
    const shape = live.shape;
    const design = live.design;
    const onFinished = live.onFinished;
    const onProgress = live.onProgress;
    this.clearCohort();
    this.boxingLive = null;
    this.restoreControllerRateAfterBoxing();
    if (this.world) {
      this.creature = this.spawnCreatureWithGrip(
        design,
        resolveSpawn(this.environment),
      );
      this.design = design;
      this.manualDrives = zeroActuatorDrives(design);
      this.brainDrives = zeroActuatorDrives(design);
    }
    this.driveMode = 'idle';
    this.time = 0;
    this.accumulator = 0;
    onProgress?.({
      generation: live.generation,
      evaluated: live.popSize,
      populationSize: live.popSize,
      bestFitness: best.fitness === -Infinity ? 0 : best.fitness,
      meanFitness: live.displayMeanFitness,
      running: false,
      status,
      batch: live.batchCount,
      batchCount: live.batchCount,
      episodeT: 0,
      episodeDuration: live.episodeDuration,
    });
    if (best.fitness > -Infinity) {
      onFinished?.(best, shape);
    }
  }

  private physicsStepJousting(dt: number): void {
    if (!this.world || !this.jousting || this.cohort.length < 2) return;
    const frozen = this.jousting.pass.phase === 'done';

    for (let memberIndex = 0; memberIndex < 2; memberIndex++) {
      const member = this.cohort[memberIndex];
      const shape = member.memberShape;
      const memberDesign = member.memberDesign;
      if (!shape || !memberDesign) continue;
      if (!frozen) this.tickJoustingBrainMember(memberIndex, shape, dt);
      const muscleDrives = frozen
        ? member.brainDrives.map(() => 0)
        : expandChannelDrives(memberDesign.muscles, member.brainDrives);
      resetCreatureForces(member.creature);
      applyMuscleForces(
        member.creature.muscles,
        muscleDrives,
        member.muscleVisual,
      );
      applyExtraForces(member.creature, memberDesign, member.brainDrives, {
        skipAero: true,
      });
    }

    for (const member of this.cohort.slice(0, 2)) {
      syncCreatureSoftCcd(member.creature);
    }
    this.world.timestep = dt;
    this.world.step();
    this.time += dt;
    this.jousting.episodeT += dt;

    const events = detectJoustHits(
      this.world,
      this.jousting.probes,
      this.jousting.hitTracker,
      this.jousting.episodeT,
    );
    this.jousting.scorecard.hits[0].attempts =
      this.jousting.hitTracker.attempts[0];
    this.jousting.scorecard.hits[1].attempts =
      this.jousting.hitTracker.attempts[1];
    for (const event of events) {
      recordJoustHit(this.jousting.scorecard.hits, event);
      this.jousting.scorecard.events.push(event);
    }

    const done = updateJoustPass(
      this.jousting.pass,
      this.cohort[0].creature,
      this.cohort[1].creature,
      this.jousting.episodeT,
      dt,
      this.jousting.episodeDuration - JOUST_AFTERMATH_SECONDS,
      events,
    );
    if (done) {
      freezeJoustScorecard(this.jousting.scorecard, this.jousting.priorities);
    }

    const terrain = this.activeTerrain();
    for (const member of this.cohort.slice(0, 2)) {
      applyPlantSlideBrake(
        member.creature,
        terrain,
        this.world,
        this.envObstacles,
        this.antiScoot,
      );
    }

    const progress = this.joustingSnapshot();
    const tickHz = Math.floor(this.jousting.episodeT * 4);
    const prevTickHz = Math.floor((this.jousting.episodeT - dt) * 4);
    if (progress && tickHz !== prevTickHz) {
      this.jousting.onProgress?.(progress);
    }
    if (!done && this.jousting.episodeT < this.jousting.episodeDuration) return;

    freezeJoustScorecard(this.jousting.scorecard, this.jousting.priorities);
    const winner = joustWinner(this.jousting.scorecard);
    const result: JoustMatchResult = {
      scorecard: this.jousting.scorecard,
      winner,
      reason: winner === null ? 'draw' : (this.jousting.pass.clashReason ?? 'draw'),
      episodeDuration: this.jousting.episodeT,
    };
    const onProgress = this.jousting.onProgress;
    const onFinished = this.jousting.onFinished;
    if (progress) onProgress?.(progress);
    this.jousting = null;
    this.joustingFinished = result;
    onFinished?.(result);
  }

  private spawnJoustingLiveBatch(): void {
    if (!this.world || !this.joustingLive) return;
    this.clearCohort();
    const live = this.joustingLive;
    live.pairs = [];
    const start = live.batchIndex * live.batchSize;
    const count = Math.min(live.batchSize, live.popSize - start);
    const spawn = resolveSpawn(this.environment);

    if (this.outBuf.length < Math.max(live.shape.outputCount, live.opponentShape.outputCount)) {
      this.outBuf = new Float32Array(
        Math.max(live.shape.outputCount, live.opponentShape.outputCount),
      );
    }
    if (this.hidBuf.length < Math.max(live.shape.hiddenCount, live.opponentShape.hiddenCount)) {
      this.hidBuf = new Float32Array(
        Math.max(live.shape.hiddenCount, live.opponentShape.hiddenCount),
      );
    }
    if (this.obsBuf.length < JOUST_OBS_COUNT) {
      this.obsBuf = new Float32Array(JOUST_OBS_COUNT);
    }

    for (let i = 0; i < count; i++) {
      const genomeIndex = start + i;
      const genome = live.population[genomeIndex]!;
      const centerX = i * JOUST_TRAIN_PAIR_GAP;
      const traineeDesign = cloneDesign(live.design);
      const sparringDesign = mirrorBoxingDesign(live.opponentDesign);
      const traineeCreature = this.spawnCreatureWithGrip(traineeDesign, {
        x: centerX - JOUST_SPAWN_X,
        y: spawn.y,
      });
      const sparringCreature = this.spawnCreatureWithGrip(sparringDesign, {
        x: centerX + JOUST_SPAWN_X,
        y: spawn.y,
      });
      enableJoustOpponentContact(traineeCreature, 0);
      enableJoustOpponentContact(sparringCreature, 1);
      const trainee = this.makeBoxingCohortMember(
        traineeCreature,
        genomeIndex,
        genome.weights,
        live.shape,
        traineeDesign,
      );
      const sparring = this.makeBoxingCohortMember(
        sparringCreature,
        -1,
        live.opponentWeights,
        live.opponentShape,
        sparringDesign,
      );
      const probes: [JoustProbeSet, JoustProbeSet] = [
        createJoustProbes(this.world, traineeCreature, 0),
        createJoustProbes(this.world, sparringCreature, 1),
      ];
      const pass = createJoustPassState();
      this.cohort.push(trainee, sparring);
      live.pairs.push({
        genomeIndex,
        trainee,
        sparring,
        probes,
        hitTracker: createJoustHitTracker(),
        scorecard: createJoustScorecard(pass),
        pass,
        frozen: false,
      });
    }

    live.episodeT = 0;
    live.focusIndex = 0;
    this.time = 0;
    this.accumulator = 0;
    live.status = `Joust · round ${live.generation} · batch ${live.batchIndex + 1}/${live.batchCount}`;
  }

  private physicsStepJoustingLive(dt: number): void {
    if (!this.world || !this.joustingLive || this.joustingLive.pairs.length === 0) {
      return;
    }
    const live = this.joustingLive;

    for (const pair of live.pairs) {
      if (!pair.frozen) {
        this.tickJoustingPairMember(
          pair.trainee,
          pair.sparring,
          pair.scorecard,
          0,
          live.episodeT,
          live.episodeDuration,
          pair.pass,
          dt,
        );
        this.tickJoustingPairMember(
          pair.sparring,
          pair.trainee,
          pair.scorecard,
          1,
          live.episodeT,
          live.episodeDuration,
          pair.pass,
          dt,
        );
      }
      for (const member of [pair.trainee, pair.sparring]) {
        const shape = member.memberShape;
        const memberDesign = member.memberDesign;
        if (!shape || !memberDesign) continue;
        const muscleDrives = pair.frozen
          ? member.brainDrives.map(() => 0)
          : expandChannelDrives(memberDesign.muscles, member.brainDrives);
        resetCreatureForces(member.creature);
        applyMuscleForces(
          member.creature.muscles,
          muscleDrives,
          member.muscleVisual,
        );
        applyExtraForces(member.creature, memberDesign, member.brainDrives, {
          skipAero: true,
        });
      }
    }

    for (const member of this.cohort) {
      syncCreatureSoftCcd(member.creature);
    }
    this.world.timestep = dt;
    this.world.step();
    this.time += dt;
    live.episodeT += dt;

    const terrain = this.activeTerrain();
    for (const pair of live.pairs) {
      const events = pair.frozen
        ? []
        : detectJoustHits(
            this.world,
            pair.probes,
            pair.hitTracker,
            live.episodeT,
          );
      pair.scorecard.hits[0].attempts = pair.hitTracker.attempts[0];
      pair.scorecard.hits[1].attempts = pair.hitTracker.attempts[1];
      for (const event of events) {
        recordJoustHit(pair.scorecard.hits, event);
        pair.scorecard.events.push(event);
      }
      if (!pair.frozen) {
        const done = updateJoustPass(
          pair.pass,
          pair.trainee.creature,
          pair.sparring.creature,
          live.episodeT,
          dt,
          live.episodeDuration - JOUST_AFTERMATH_SECONDS,
          events,
        );
        if (done) {
          freezeJoustScorecard(pair.scorecard, live.priorities);
          pair.frozen = true;
        }
      }
      for (const member of [pair.trainee, pair.sparring]) {
        applyPlantSlideBrake(
          member.creature,
          terrain,
          this.world,
          this.envObstacles,
          this.antiScoot,
        );
      }
    }

    const tickHz = Math.floor(live.episodeT * 4);
    const prevTickHz = Math.floor((live.episodeT - dt) * 4);
    if (tickHz !== prevTickHz) {
      this.emitJoustingLiveProgress();
    }
    const allDone = live.pairs.every((pair) => pair.frozen);
    if (!allDone && live.episodeT < live.episodeDuration) return;
    this.finishJoustingLiveBatch();
  }

  private tickJoustingPairMember(
    member: CohortMember,
    opponent: CohortMember,
    scorecard: JoustScorecard,
    memberOwner: JoustOwner,
    episodeT: number,
    episodeDuration: number,
    pass: JoustPassState,
    dt: number,
  ): void {
    const shape = member.memberShape;
    if (!shape || shape.inputCount !== JOUST_OBS_COUNT) return;
    const brainDt = this.brainDt;
    member.brainAccumulator += dt;
    while (member.brainAccumulator >= brainDt) {
      member.brainAccumulator -= brainDt;
      if (this.obsBuf.length < JOUST_OBS_COUNT) {
        this.obsBuf = new Float32Array(JOUST_OBS_COUNT);
      }
      if (this.outBuf.length < shape.outputCount) {
        this.outBuf = new Float32Array(shape.outputCount);
      }
      if (this.hidBuf.length < shape.hiddenCount) {
        this.hidBuf = new Float32Array(shape.hiddenCount);
      }
      const ownTotal = scorecard.fighters[memberOwner].total;
      const opponentTotal =
        scorecard.fighters[memberOwner === 0 ? 1 : 0].total;
      buildJoustObservations(
        member.creature,
        opponent.creature,
        ownTotal,
        opponentTotal,
        pass.phase === 'charge' ? 0 : 1,
        1 - episodeT / episodeDuration,
        episodeT,
        this.obsBuf,
      );
      const outs = evaluateNetwork(
        shape,
        member.weights,
        this.obsBuf,
        this.outBuf,
        this.hidBuf,
      );
      member.lastObs.set(this.obsBuf.subarray(0, shape.inputCount));
      member.lastHidden.set(this.hidBuf.subarray(0, shape.hiddenCount));
      for (let i = 0; i < member.brainDrives.length; i++) {
        member.brainDrives[i] = outs[i] ?? 0;
      }
    }
  }

  private finishJoustingLiveBatch(): void {
    const live = this.joustingLive;
    if (!live) return;

    for (const pair of live.pairs) {
      freezeJoustScorecard(pair.scorecard, live.priorities);
      const winner = joustWinner(pair.scorecard);
      const fitness = computeJoustingFitness(
        pair.scorecard,
        winner,
        live.priorities,
      ).fitness;
      live.population[pair.genomeIndex]!.fitness = fitness;
      if (fitness > live.bestOverall.fitness) {
        live.bestOverall = {
          weights: cloneWeights(live.population[pair.genomeIndex]!.weights),
          fitness,
        };
      }
    }

    const evaluated = Math.min(
      (live.batchIndex + 1) * live.batchSize,
      live.popSize,
    );
    live.displayMeanFitness = meanFitness(live.population.slice(0, evaluated));

    if (live.stopRequested) {
      this.endJoustingLiveEvolve('Stopped — use Play best');
      return;
    }

    if (live.batchIndex + 1 < live.batchCount) {
      live.batchIndex += 1;
      live.status = `Joust · round ${live.generation} · batch ${live.batchIndex + 1}/${live.batchCount}`;
      this.spawnJoustingLiveBatch();
      this.emitJoustingLiveProgress(evaluated);
      return;
    }

    live.population.sort((a, b) => b.fitness - a.fitness);
    live.status = `Round ${live.generation} done · best ${live.population[0]!.fitness.toFixed(3)}`;
    this.emitJoustingLiveProgress(live.popSize);

    if (live.generation + 1 >= live.maxGenerations) {
      this.endJoustingLiveEvolve('Done — use Play best');
      return;
    }

    live.population = breedNextGeneration(
      live.population,
      live.popSize,
      live.rng,
      {
        eliteCount: live.breed.eliteCount,
        tournamentSize: live.breed.tournamentSize,
        mutationSigma: live.breed.mutationSigma,
        mutationResetRate: live.breed.mutationResetRate,
        crossover: live.breed.crossover,
      },
    );
    live.generation += 1;
    live.batchIndex = 0;
    live.batchCount = Math.ceil(live.popSize / live.batchSize);
    live.status = `Joust · round ${live.generation} · batch 1/${live.batchCount}`;
    this.spawnJoustingLiveBatch();
    this.emitJoustingLiveProgress(0);
  }

  private emitJoustingLiveProgress(evaluatedOverride?: number): void {
    const live = this.joustingLive;
    if (!live) return;
    const scored =
      evaluatedOverride !== undefined
        ? evaluatedOverride
        : Math.min(live.batchIndex * live.batchSize, live.popSize);
    live.onProgress?.({
      generation: live.generation,
      evaluated: scored,
      populationSize: live.popSize,
      bestFitness:
        live.bestOverall.fitness === -Infinity ? 0 : live.bestOverall.fitness,
      meanFitness: live.displayMeanFitness,
      running: true,
      status: live.status,
      batch: live.batchIndex + 1,
      batchCount: live.batchCount,
      focusIndex: live.focusIndex,
      cohortSize: live.pairs.length,
      episodeT: live.episodeT,
      episodeDuration: live.episodeDuration,
    });
  }

  private endJoustingLiveEvolve(status: string): void {
    const live = this.joustingLive;
    if (!live) return;
    const best = live.bestOverall;
    const shape = live.shape;
    const design = live.design;
    const onFinished = live.onFinished;
    const onProgress = live.onProgress;
    this.clearCohort();
    this.joustingLive = null;
    this.restoreControllerRateAfterBoxing();
    if (this.world) {
      this.creature = this.spawnCreatureWithGrip(
        design,
        resolveSpawn(this.environment),
      );
      this.design = design;
      this.manualDrives = zeroActuatorDrives(design);
      this.brainDrives = zeroActuatorDrives(design);
    }
    this.driveMode = 'idle';
    this.time = 0;
    this.accumulator = 0;
    onProgress?.({
      generation: live.generation,
      evaluated: live.popSize,
      populationSize: live.popSize,
      bestFitness: best.fitness === -Infinity ? 0 : best.fitness,
      meanFitness: live.displayMeanFitness,
      running: false,
      status,
      batch: live.batchCount,
      batchCount: live.batchCount,
      episodeT: 0,
      episodeDuration: live.episodeDuration,
    });
    if (best.fitness > -Infinity) {
      onFinished?.(best, shape);
    }
  }

  private tickJoustingBrainMember(
    memberIndex: number,
    shape: NetworkShape,
    dt: number,
  ): void {
    const member = this.cohort[memberIndex];
    const opponent = this.cohort[memberIndex === 0 ? 1 : 0];
    if (
      !member ||
      !opponent ||
      !this.jousting ||
      shape.inputCount !== JOUST_OBS_COUNT
    ) {
      if (member) this.tickBrainMember(member, shape, dt);
      return;
    }
    const brainDt = this.brainDt;
    member.brainAccumulator += dt;
    while (member.brainAccumulator >= brainDt) {
      member.brainAccumulator -= brainDt;
      if (this.obsBuf.length < JOUST_OBS_COUNT) {
        this.obsBuf = new Float32Array(JOUST_OBS_COUNT);
      }
      if (this.outBuf.length < shape.outputCount) {
        this.outBuf = new Float32Array(shape.outputCount);
      }
      if (this.hidBuf.length < shape.hiddenCount) {
        this.hidBuf = new Float32Array(shape.hiddenCount);
      }
      const ownTotal = this.jousting.scorecard.fighters[memberIndex].total;
      const opponentTotal =
        this.jousting.scorecard.fighters[memberIndex === 0 ? 1 : 0].total;
      buildJoustObservations(
        member.creature,
        opponent.creature,
        ownTotal,
        opponentTotal,
        this.jousting.pass.phase === 'charge' ? 0 : 1,
        1 - this.jousting.episodeT / this.jousting.episodeDuration,
        this.jousting.episodeT,
        this.obsBuf,
      );
      const outs = evaluateNetwork(
        shape,
        member.weights,
        this.obsBuf,
        this.outBuf,
        this.hidBuf,
      );
      member.lastObs.set(this.obsBuf.subarray(0, shape.inputCount));
      member.lastHidden.set(this.hidBuf.subarray(0, shape.hiddenCount));
      for (let i = 0; i < member.brainDrives.length; i++) {
        member.brainDrives[i] = outs[i] ?? 0;
      }
    }
  }

  private physicsStepHeadToHead(dt: number): void {
    if (!this.world || !this.h2h) return;

    for (const member of this.cohort) {
      const shape = member.memberShape;
      if (!shape) continue;
      if (member.fell || member.landed) {
        resetCreatureForces(member.creature);
        continue;
      }
      const memberDesign = member.memberDesign ?? this.design!;
      this.tickBrainMember(member, shape, dt);
      const muscleDrives = expandChannelDrives(
        memberDesign.muscles,
        member.brainDrives,
      );
      resetCreatureForces(member.creature);
      applyMuscleForces(
        member.creature.muscles,
        muscleDrives,
        member.muscleVisual,
      );
      applyExtraForces(member.creature, memberDesign, member.brainDrives, {
        skipAero: isLaunchBoosting(this.launchCooldownFor(member.creature)),
      });

      const fall = updateFallState(
        member.creature,
        member.fallTime,
        dt,
        this.activeTerrain(),
      );
      member.fallTime = fall.fallTime;
      if (fall.fell) member.fell = true;
    }

    for (const member of this.cohort) {
      syncCreatureSoftCcd(member.creature);
    }
    this.world.timestep = dt;
    this.world.step();
    this.time += dt;
    this.h2h.episodeT += dt;

    const terrain = this.activeTerrain();
    if (!isFlightTask(this.h2h.task) && !isMotorTask(this.h2h.task)) {
      for (const member of this.cohort) {
        if (!member.fell && !member.landed) {
          applyPlantSlideBrake(
            member.creature,
            terrain,
            this.world,
            this.envObstacles,
            this.antiScoot,
          );
        }
      }
    }
    for (const member of this.cohort) {
      if (!member.fell && !member.landed) {
        this.maybeApplyLaunchPads(member.creature);
      }
    }

    const regions = activeScoreRegions(this.environment);
    const markers = activeCourseMarkers(this.environment);
    for (const member of this.cohort) {
      member.peakDistance = Math.max(
        member.peakDistance,
        avgJointX(member.creature) - member.startX,
      );
      if (!member.fell && !member.landed) {
        member.footLifts += updateFootLiftState(
          member.creature,
          member.planted,
          terrain,
        );
        member.uprightSum += instantUprightQuality(member.creature);
        member.uprightSteps++;
        member.peakSpeed = Math.max(
          member.peakSpeed,
          avgJointVelX(member.creature),
        );
      }
      const track = updateJumpFlightTrackers(
        member.creature,
        dt,
        member.peakHeight,
        member.airTime,
        member.airHeightIntegral,
        0.55,
        member.impactSpeed,
        member.airborneTravel,
        member.prevAvgX,
      );
      member.peakHeight = track.peakHeight;
      member.airTime = track.airTime;
      member.airHeightIntegral = track.airHeightIntegral;
      member.impactSpeed = track.impactSpeed;
      member.airborneTravel = track.airborneTravel;
      member.prevAvgX = track.avgX;
      member.regionAccum = updateScoreRegionAccum(
        member.creature,
        regions,
        dt,
        member.regionAccum,
        member.airTime,
      );
      if (shouldEndEpisodeOnLanding(member.regionAccum)) {
        member.landed = true;
      }
      member.courseAccum = updateCourseMarkerAccum(
        member.creature,
        markers,
        this.h2h.episodeT,
        member.courseAccum,
      );
    }

    this.h2h.onProgress?.(this.h2h.episodeT, this.h2h.episodeDuration);

    // End early only when landings are in play (do not change fall-only timing).
    const h2hAllSettled =
      this.cohort.length > 0 &&
      this.cohort.some((m) => m.landed) &&
      this.cohort.every((m) => m.fell || m.landed);
    if (this.h2h.episodeT < this.h2h.episodeDuration && !h2hAllSettled) return;

    const task = this.h2h.task;
    const fitness: [number, number] = [0, 0];
    const metrics: [TaskEpisodeMetrics, TaskEpisodeMetrics] = [
      emptyMetrics(),
      emptyMetrics(),
    ];
    for (let i = 0; i < this.cohort.length && i < 2; i++) {
      const member = this.cohort[i];
      const uprightMean =
        member.uprightSteps > 0 ? member.uprightSum / member.uprightSteps : 1;
      const meanAirHeight =
        member.airTime > 1e-6
          ? member.airHeightIntegral / member.airTime
          : 0;
      const result = scoreTaskPerformance(
        task,
        member.creature,
        member.startX,
        member.fell,
        member.footLifts,
        member.peakHeight,
        member.airTime,
        uprightMean,
        meanAirHeight,
        member.regionAccum,
        member.courseAccum,
        member.peakSpeed,
        this.h2h.episodeT,
        member.peakDistance,
        member.impactSpeed,
        member.airborneTravel,
      );
      fitness[i] = result.fitness;
      metrics[i] = result;
    }

    const onFinished = this.h2h.onFinished;
    const episodeDuration = this.h2h.episodeDuration;
    const finished: HeadToHeadResult = { fitness, metrics };
    this.lastEpisodeMetrics = metrics[0];
    this.h2h = null;
    this.h2hFinished = finished;
    this.driveMode = 'idle';
    onFinished?.(finished);
    this.onEpisodeComplete?.({
      task,
      metrics: metrics[0],
      design: this.cohort[0]?.memberDesign ?? this.design!,
      episodeSeconds: episodeDuration,
      context: 'replay',
    });
  }

  private physicsStepCohort(dt: number): void {
    if (!this.world || !this.live) return;

    for (const member of this.cohort) {
      // Freeze actuators after fall/landing so post-settle thrash cannot erase progress.
      if (member.fell || member.landed) {
        resetCreatureForces(member.creature);
        continue;
      }
      this.tickBrainMember(member, this.live.shape, dt);
      const memberDesign = member.memberDesign ?? this.live.design;
      const channelDrives =
        this.live.structuralMorphEvolve
          ? remapPaddedActuatorDrives(
              memberDesign,
              member.brainDrives,
              this.live.maxMuscleChannels,
              includeWheelActuators(),
            )
          : member.brainDrives;
      const muscleDrives = expandChannelDrives(
        memberDesign.muscles,
        channelDrives,
      );
      resetCreatureForces(member.creature);
      applyMuscleForces(
        member.creature.muscles,
        muscleDrives,
        member.muscleVisual,
      );
      applyExtraForces(member.creature, memberDesign, channelDrives, {
        skipAero: isLaunchBoosting(this.launchCooldownFor(member.creature)),
      });

      const fall = updateFallState(
        member.creature,
        member.fallTime,
        dt,
        this.activeTerrain(),
      );
      member.fallTime = fall.fallTime;
      if (fall.fell) member.fell = true;
    }

    for (const member of this.cohort) {
      syncCreatureSoftCcd(member.creature);
    }
    this.world.timestep = dt;
    this.world.step();
    this.time += dt;
    this.live.episodeT += dt;

    const terrain = this.activeTerrain();
    if (!isFlightTask(this.live.task) && !isMotorTask(this.live.task)) {
      for (const member of this.cohort) {
        if (!member.fell && !member.landed) {
          applyPlantSlideBrake(
            member.creature,
            terrain,
            this.world,
            this.envObstacles,
            this.antiScoot,
          );
        }
      }
    }
    for (const member of this.cohort) {
      if (!member.fell && !member.landed) {
        this.maybeApplyLaunchPads(member.creature);
      }
    }

    const regions = activeScoreRegions(this.environment);
    const markers = activeCourseMarkers(this.environment);
    for (const member of this.cohort) {
      const dist = avgJointX(member.creature) - member.startX;
      member.peakDistance = Math.max(member.peakDistance, dist);
      if (this.world) {
        noteStallProgress(
          member.stall,
          this.world,
          member.creature,
          this.envObstacles,
          {
            episodeT: this.live!.episodeT,
            startX: member.startX,
            distance: dist,
            terrain,
          },
        );
      }
      if (!member.fell && !member.landed) {
        member.footLifts += updateFootLiftState(
          member.creature,
          member.planted,
          terrain,
        );
        member.uprightSum += instantUprightQuality(member.creature);
        member.uprightSteps++;
        member.peakSpeed = Math.max(
          member.peakSpeed,
          avgJointVelX(member.creature),
        );
      }
      const track = updateJumpFlightTrackers(
        member.creature,
        dt,
        member.peakHeight,
        member.airTime,
        member.airHeightIntegral,
        0.55,
        member.impactSpeed,
        member.airborneTravel,
        member.prevAvgX,
      );
      member.peakHeight = track.peakHeight;
      member.airTime = track.airTime;
      member.airHeightIntegral = track.airHeightIntegral;
      member.impactSpeed = track.impactSpeed;
      member.airborneTravel = track.airborneTravel;
      member.prevAvgX = track.avgX;
      member.regionAccum = updateScoreRegionAccum(
        member.creature,
        regions,
        dt,
        member.regionAccum,
        member.airTime,
      );
      if (shouldEndEpisodeOnLanding(member.regionAccum)) {
        member.landed = true;
      }
      member.courseAccum = updateCourseMarkerAccum(
        member.creature,
        markers,
        this.live!.episodeT,
        member.courseAccum,
      );
    }

    const allFell =
      this.live.breed.stopAfterFall &&
      this.cohort.length > 0 &&
      this.cohort.every((m) => m.fell);
    // End early only when landings are in play (do not change fall-only timing).
    const allSettled =
      this.cohort.length > 0 &&
      this.cohort.some((m) => m.landed) &&
      this.cohort.every((m) => m.fell || m.landed);

    if (this.live.episodeT >= this.live.episodeDuration || allFell || allSettled) {
      this.finishCurrentBatch();
    } else if (Math.floor(this.live.episodeT * 4) !== Math.floor((this.live.episodeT - dt) * 4)) {
      // ~4 Hz HUD refresh during the episode
      this.emitEvolveProgress();
    }
  }

  private finishCurrentBatch(): void {
    const live = this.live;
    if (!live) return;

    for (const member of this.cohort) {
      const uprightMean =
        member.uprightSteps > 0 ? member.uprightSum / member.uprightSteps : 1;
      const meanAirHeight =
        member.airTime > 1e-6
          ? member.airHeightIntegral / member.airTime
          : 0;
      const result = scoreTaskPerformance(
        live.task,
        member.creature,
        member.startX,
        member.fell,
        member.footLifts,
        member.peakHeight,
        member.airTime,
        uprightMean,
        meanAirHeight,
        member.regionAccum,
        member.courseAccum,
        member.peakSpeed,
        live.episodeT,
        member.peakDistance,
        member.impactSpeed,
        member.airborneTravel,
      );
      result.fitness = applyGoalPriorities(result.fitness, {
        distance: result.distance,
        uprightQuality: result.uprightQuality,
        fell: result.fell,
        priorities: live.priorities,
        task: live.task,
      });
      live.population[member.genomeIndex].fitness = result.fitness;
      if (result.fitness > live.bestOverall.fitness) {
        const g = live.population[member.genomeIndex]!;
        live.bestOverall = {
          weights: cloneWeights(g.weights),
          fitness: result.fitness,
          morph: g.morph ? cloneMorphGenes(g.morph) : undefined,
          topology: g.topology ? cloneTopology(g.topology) : undefined,
        };
      }
      if (result.fitness > live.genBestFitness) {
        live.genBestFitness = result.fitness;
        live.genBestMetrics = result;
        live.genBestMorph = live.population[member.genomeIndex]?.morph
          ? cloneMorphGenes(live.population[member.genomeIndex]!.morph!)
          : undefined;
        if (this.world) {
          live.genBestStall = finalizeStallDiagnostics(
            member.stall,
            this.world,
            member.creature,
            this.envObstacles,
            {
              episodeT: live.episodeT,
              startX: member.startX,
              distance: result.distance,
              terrain: this.activeTerrain(),
            },
          );
        }
      }
    }

    const evaluated = Math.min(
      (live.batchIndex + 1) * live.batchSize,
      live.popSize,
    );
    // Population fitness is cleared on breed; persist a HUD mean from scored genomes.
    live.displayMeanFitness = meanFitness(live.population.slice(0, evaluated));

    if (live.stopRequested) {
      this.endLiveEvolve('Stopped — use Play best');
      return;
    }

    if (live.batchIndex + 1 < live.batchCount) {
      live.batchIndex += 1;
      live.status = `Gen ${live.generation} · batch ${live.batchIndex + 1}/${live.batchCount}`;
      this.spawnCurrentBatch();
      this.emitEvolveProgress(evaluated);
      return;
    }

    // Generation complete
    live.population.sort((a, b) => b.fitness - a.fitness);
    live.status = `Gen ${live.generation} done · best ${live.population[0].fitness.toFixed(3)}`;
    this.emitEvolveProgress(live.popSize);
    this.emitGenChampionEpisode(live);

    if (live.generation + 1 >= live.maxGenerations) {
      this.endLiveEvolve('Done — use Play best');
      return;
    }

    const sigma = annealedMutationSigma(
      live.breed.mutationSigma,
      live.generation + 1,
      live.maxGenerations,
      live.breed.annealMutation,
    );
    live.population = breedNextGeneration(
      live.population,
      live.popSize,
      live.rng,
      {
        eliteCount: live.breed.eliteCount,
        tournamentSize: live.breed.tournamentSize,
        mutationSigma: sigma,
        mutationResetRate: live.breed.mutationResetRate,
        crossover: live.breed.crossover,
        morphEvolve: live.morphEvolve,
        structuralMorphEvolve: live.structuralMorphEvolve,
        structureBase: live.design,
      },
    );
    live.generation += 1;
    live.batchIndex = 0;
    live.batchCount = Math.ceil(live.popSize / live.batchSize);
    live.episodeDuration = adaptiveEpisodeSeconds(
      live.baseEpisodeSeconds,
      live.generation,
      live.breed.shortTriesFirst,
    );
    live.genBestMetrics = null;
    live.genBestFitness = -Infinity;
    live.genBestStall = null;
    live.genBestMorph = undefined;
    live.status = `Gen ${live.generation} · batch 1/${live.batchCount}`;
    this.spawnCurrentBatch();
    this.emitEvolveProgress(0);
  }

  private emitGenChampionEpisode(live: LiveEvolveState): void {
    const metrics = live.genBestMetrics ?? emptyMetrics();
    this.lastEpisodeMetrics = metrics;
    const genBest = live.population[0]?.fitness ?? metrics.fitness;
    this.onEpisodeComplete?.({
      task: live.task,
      metrics,
      design: live.design,
      episodeSeconds: live.episodeDuration,
      generation: live.generation,
      context: 'evolve',
      meanFitness: live.displayMeanFitness,
      runBestFitness:
        live.bestOverall.fitness === -Infinity ? genBest : live.bestOverall.fitness,
      populationSize: live.popSize,
      stall: live.genBestStall,
      morph: live.genBestMorph,
    });
  }

  private endLiveEvolve(status: string): void {
    const live = this.live;
    if (!live || !this.world) return;

    const best = live.bestOverall;
    const shape = live.shape;
    const onFinished = live.onFinished;
    const onProgress = live.onProgress;

    this.clearCohort();
    this.live = null;

    // Leave a single idle creature on screen
    this.creature = this.spawnCreatureWithGrip(
      live.design,
      resolveSpawn(this.environment),
    );
    this.design = live.design;
    this.manualDrives = zeroActuatorDrives(live.design);
    this.brainDrives = zeroActuatorDrives(live.design);
    this.driveMode = 'idle';
    this.time = 0;
    this.accumulator = 0;

    onProgress?.({
      generation: live.generation,
      evaluated: live.popSize,
      populationSize: live.popSize,
      bestFitness: best.fitness === -Infinity ? 0 : best.fitness,
      meanFitness: live.displayMeanFitness,
      running: false,
      status,
      batch: live.batchIndex + 1,
      batchCount: live.batchCount,
      focusIndex: 0,
      episodeT: live.episodeDuration,
      episodeDuration: live.episodeDuration,
    });

    if (best.fitness > -Infinity) {
      onFinished?.(best, shape);
    }
  }

  private spawnCurrentBatch(): void {
    if (!this.world || !this.live) return;
    this.clearCohort();

    const live = this.live;
    const start = live.batchIndex * live.batchSize;
    const count = Math.min(live.batchSize, live.popSize - start);
    if (this.outBuf.length < live.shape.outputCount) {
      this.outBuf = new Float32Array(live.shape.outputCount);
    }
    if (this.hidBuf.length < live.shape.hiddenCount) {
      this.hidBuf = new Float32Array(live.shape.hiddenCount);
    }
    if (this.obsBuf.length < live.shape.inputCount) {
      this.obsBuf = new Float32Array(live.shape.inputCount);
    }

    for (let i = 0; i < count; i++) {
      const genomeIndex = start + i;
      const genome = live.population[genomeIndex]!;
      const topo = genome.topology ?? live.design;
      let memberDesign = applyMorphToDesign(topo, genome.morph);
      if (live.messyBodies) {
        memberDesign = applyMessyBodyJitter(memberDesign, live.rng);
      }
      const creature = this.spawnCreatureWithGrip(
        memberDesign,
        resolveSpawn(this.environment),
      );
      const markers = activeCourseMarkers(this.environment);
      this.cohort.push({
        creature,
        genomeIndex,
        weights: genome.weights,
        brainDrives: new Array(live.shape.outputCount).fill(0),
        brainAccumulator: 0,
        lastObs: new Float32Array(live.shape.inputCount),
        lastHidden: new Float32Array(live.shape.hiddenCount),
        startX: avgJointX(creature),
        fallTime: 0,
        fell: false,
        landed: false,
        footLifts: 0,
        planted: createFootLiftState(creature.joints.length),
        muscleVisual: [],
        peakHeight: 0,
        airTime: 0,
        airHeightIntegral: 0,
        impactSpeed: 0,
        airborneTravel: 0,
        prevAvgX: avgJointX(creature),
        uprightSum: 0,
        uprightSteps: 0,
        peakSpeed: 0,
        peakDistance: 0,
        regionAccum: emptyScoreRegionAccum(),
        courseAccum: emptyCourseMarkerAccum(markers),
        stall: createStallTracker(),
        memberDesign,
      });
    }

    live.episodeT = 0;
    live.focusIndex = 0;
    this.time = 0;
    this.accumulator = 0;
    live.status = `Gen ${live.generation} · batch ${live.batchIndex + 1}/${live.batchCount}`;
  }

  private clearCohort(): void {
    if (!this.world) {
      this.cohort = [];
      return;
    }
    for (const member of this.cohort) {
      destroyCreature(this.world, member.creature);
    }
    this.cohort = [];
  }

  private tickBrainSingle(dt: number): void {
    if (!this.creature || !this.brainShape || !this.brainWeights) return;
    if (this.hidBuf.length < this.brainShape.hiddenCount) {
      this.hidBuf = new Float32Array(this.brainShape.hiddenCount);
    }
    if (this.lastSoloObs.length < this.brainShape.inputCount) {
      this.lastSoloObs = new Float32Array(this.brainShape.inputCount);
    }
    if (this.lastSoloHidden.length < this.brainShape.hiddenCount) {
      this.lastSoloHidden = new Float32Array(this.brainShape.hiddenCount);
    }
    const brainDt = this.brainDt;
    this.brainAccumulator += dt;
    while (this.brainAccumulator >= brainDt) {
      this.brainAccumulator -= brainDt;
      if (this.brainShape.inputCount === DANCE_OBS_COUNT) {
        if (this.obsBuf.length < DANCE_OBS_COUNT) {
          this.obsBuf = new Float32Array(DANCE_OBS_COUNT);
        }
        const bands = this.audioObsProvider?.() ?? null;
        const lookahead = this.audioLookaheadProvider?.() ?? null;
        buildDanceObservations(
          this.creature,
          bands,
          this.obsBuf,
          this.observationContext(),
          lookahead,
        );
      } else if (
        this.raycastObservations ||
        this.brainShape.inputCount === RAYCAST_OBS_COUNT
      ) {
        if (this.obsBuf.length < RAYCAST_OBS_COUNT) {
          this.obsBuf = new Float32Array(RAYCAST_OBS_COUNT);
        }
        buildRaycastObservations(
          this.creature,
          this.world,
          this.obsBuf,
          this.observationContext(),
        );
      } else {
        buildObservations(this.creature, this.obsBuf, this.observationContext());
      }
      const outs = evaluateNetwork(
        this.brainShape,
        this.brainWeights,
        this.obsBuf,
        this.outBuf,
        this.hidBuf,
      );
      this.lastSoloObs.set(this.obsBuf.subarray(0, this.brainShape.inputCount));
      this.lastSoloHidden.set(this.hidBuf.subarray(0, this.brainShape.hiddenCount));
      for (let i = 0; i < this.brainDrives.length; i++) {
        this.brainDrives[i] = outs[i] ?? 0;
      }
    }
  }

  private tickBoxingBrainMember(
    memberIndex: number,
    shape: NetworkShape,
    dt: number,
  ): void {
    const member = this.cohort[memberIndex];
    const opponent = this.cohort[memberIndex === 0 ? 1 : 0];
    if (
      !member ||
      !opponent ||
      !this.boxing ||
      shape.inputCount !== BOXING_OBS_COUNT
    ) {
      if (member) this.tickBrainMember(member, shape, dt);
      return;
    }
    const brainDt = this.brainDt;
    member.brainAccumulator += dt;
    while (member.brainAccumulator >= brainDt) {
      member.brainAccumulator -= brainDt;
      if (this.obsBuf.length < BOXING_OBS_COUNT) {
        this.obsBuf = new Float32Array(BOXING_OBS_COUNT);
      }
      if (this.outBuf.length < shape.outputCount) {
        this.outBuf = new Float32Array(shape.outputCount);
      }
      if (this.hidBuf.length < shape.hiddenCount) {
        this.hidBuf = new Float32Array(shape.hiddenCount);
      }
      const ownPoints = this.boxing.score.fighters[memberIndex].points;
      const opponentPoints =
        this.boxing.score.fighters[memberIndex === 0 ? 1 : 0].points;
      buildBoxingObservations(
        member.creature,
        opponent.creature,
        ownPoints,
        opponentPoints,
        1 - this.boxing.episodeT / this.boxing.episodeDuration,
        this.boxing.episodeT,
        this.obsBuf,
      );
      const outs = evaluateNetwork(
        shape,
        member.weights,
        this.obsBuf,
        this.outBuf,
        this.hidBuf,
      );
      member.lastObs.set(this.obsBuf.subarray(0, shape.inputCount));
      member.lastHidden.set(this.hidBuf.subarray(0, shape.hiddenCount));
      for (let i = 0; i < member.brainDrives.length; i++) {
        member.brainDrives[i] = outs[i] ?? 0;
      }
    }
  }

  private tickBrainMember(
    member: CohortMember,
    shape: NetworkShape,
    dt: number,
  ): void {
    const brainDt = this.brainDt;
    member.brainAccumulator += dt;
    while (member.brainAccumulator >= brainDt) {
      member.brainAccumulator -= brainDt;
      if (
        this.raycastObservations ||
        shape.inputCount === RAYCAST_OBS_COUNT
      ) {
        if (this.obsBuf.length < RAYCAST_OBS_COUNT) {
          this.obsBuf = new Float32Array(RAYCAST_OBS_COUNT);
        }
        buildRaycastObservations(
          member.creature,
          this.world,
          this.obsBuf,
          this.observationContext(),
        );
      } else {
        buildObservations(
          member.creature,
          this.obsBuf,
          this.observationContext(),
        );
      }
      const outs = evaluateNetwork(
        shape,
        member.weights,
        this.obsBuf,
        this.outBuf,
        this.hidBuf,
      );
      member.lastObs.set(this.obsBuf.subarray(0, shape.inputCount));
      member.lastHidden.set(this.hidBuf.subarray(0, shape.hiddenCount));
      for (let i = 0; i < member.brainDrives.length; i++) {
        member.brainDrives[i] = outs[i] ?? 0;
      }
    }
  }

  /**
   * Focused MLP probe for A7. Arrays are live views (mutated on brain ticks) —
   * UI should read them each frame and not retain them across sessions.
   */
  private probeFocusedBrain(): LiveBrainProbe | null {
    if (this.joustingLive && this.joustingLive.pairs.length > 0) {
      const focus = Math.min(
        this.joustingLive.focusIndex,
        Math.max(0, this.joustingLive.pairs.length - 1),
      );
      const member = this.joustingLive.pairs[focus]!.trainee;
      return {
        shape: this.joustingLive.shape,
        weights: member.weights,
        inputs: member.lastObs,
        outputs: Float32Array.from(member.brainDrives),
        hidden: member.lastHidden,
        genomeIndex: member.genomeIndex,
        focusIndex: focus,
      };
    }
    if (this.boxingLive && this.boxingLive.pairs.length > 0) {
      const focus = Math.min(
        this.boxingLive.focusIndex,
        Math.max(0, this.boxingLive.pairs.length - 1),
      );
      const member = this.boxingLive.pairs[focus]!.trainee;
      return {
        shape: this.boxingLive.shape,
        weights: member.weights,
        inputs: member.lastObs,
        outputs: Float32Array.from(member.brainDrives),
        hidden: member.lastHidden,
        genomeIndex: member.genomeIndex,
        focusIndex: focus,
      };
    }
    if (this.live && this.cohort.length > 0) {
      const focus = Math.min(
        this.live.focusIndex,
        Math.max(0, this.cohort.length - 1),
      );
      const member = this.cohort[focus];
      return {
        shape: this.live.shape,
        weights: member.weights,
        inputs: member.lastObs,
        outputs: Float32Array.from(member.brainDrives),
        hidden: member.lastHidden,
        genomeIndex: member.genomeIndex,
        focusIndex: focus,
      };
    }
    if (
      (this.isBoxingView() || this.isHeadToHeadView() || this.isJoustingView()) &&
      this.cohort.length > 0
    ) {
      const focus = Math.min(
        this.duelFocusIndex,
        Math.max(0, Math.min(2, this.cohort.length) - 1),
      );
      const member = this.cohort[focus];
      const shape = member.memberShape;
      if (!shape || member.lastObs.length < shape.inputCount) return null;
      return {
        shape,
        weights: member.weights,
        inputs: member.lastObs,
        outputs: Float32Array.from(member.brainDrives),
        hidden: member.lastHidden,
        genomeIndex: member.genomeIndex,
        focusIndex: focus,
      };
    }
    if (
      this.driveMode === 'brain' &&
      this.brainShape &&
      this.brainWeights &&
      this.brainDrives.length === this.brainShape.outputCount
    ) {
      return {
        shape: this.brainShape,
        weights: this.brainWeights,
        inputs: this.lastSoloObs,
        outputs: Float32Array.from(this.brainDrives),
        hidden: this.lastSoloHidden,
        genomeIndex: -1,
        focusIndex: 0,
      };
    }
    return null;
  }

  /**
   * Channel drives (muscles collapsed + wheel tail) and per-muscle drives
   * for force application.
   */
  private resolveActuationSingle(): {
    channelDrives: number[];
    muscleDrives: number[];
  } {
    const design = this.design;
    const muscles = design?.muscles ?? [];
    const nMuscles = this.creature?.muscles.length ?? 0;
    const nChannels = design
      ? countDesignActuatorChannels(design, includeWheelActuators())
      : countBrainActuatorChannels(muscles);

    if (this.driveMode === 'disco' && this.discoDriveProvider) {
      const frame = this.discoDriveProvider();
      const muscleDrives =
        frame.length === nMuscles
          ? frame.slice()
          : Array.from({ length: nMuscles }, (_, i) => frame[i] ?? 0);
      const channelDrives = design
        ? channelDrivesFromMuscleDrives(design, muscleDrives)
        : collapseMuscleDrivesToChannels(muscles, muscleDrives);
      return { channelDrives, muscleDrives };
    }

    let channelDrives: number[];
    if (this.driveMode === 'sine') {
      channelDrives = sineMuscleOutputs(Math.max(1, nChannels), this.time);
    } else if (this.driveMode === 'manual') {
      channelDrives = Array.from(
        { length: nChannels },
        (_, i) => this.manualDrives[i] ?? 0,
      );
    } else if (this.driveMode === 'brain') {
      if (
        !this.brainShape ||
        this.brainDrives.length !== this.brainShape.outputCount
      ) {
        channelDrives = new Array(nChannels).fill(0);
      } else {
        channelDrives = this.brainDrives.slice();
      }
    } else {
      channelDrives = new Array(nChannels).fill(0);
    }

    return {
      channelDrives,
      muscleDrives: expandChannelDrives(muscles, channelDrives),
    };
  }

  private emitEvolveProgress(evaluatedOverride?: number): void {
    const live = this.live;
    if (!live) return;
    const batchSpan = Math.min(
      live.batchSize,
      live.popSize - live.batchIndex * live.batchSize,
    );
    const episodeFrac = Number.isFinite(live.episodeDuration)
      ? live.episodeT / live.episodeDuration
      : 0;
    const evaluated =
      evaluatedOverride ??
      live.batchIndex * live.batchSize +
        Math.floor(episodeFrac * batchSpan);
    live.onProgress?.({
      generation: live.generation,
      evaluated: Math.min(live.popSize, Math.max(0, evaluated)),
      populationSize: live.popSize,
      bestFitness:
        live.bestOverall.fitness === -Infinity ? 0 : live.bestOverall.fitness,
      meanFitness: live.displayMeanFitness,
      running: true,
      status: live.status,
      batch: live.batchIndex + 1,
      batchCount: live.batchCount,
      focusIndex: live.focusIndex,
      cohortSize: this.cohort.length,
      episodeT: live.episodeT,
      episodeDuration: live.episodeDuration,
    });
  }

  muscles(): RuntimeMuscle[] {
    if (this.h2h && this.cohort.length > 0) {
      return this.cohort[0].creature.muscles;
    }
    if (this.discoDancers.length > 0) {
      return this.discoDancers[0].creature.muscles;
    }
    if (this.live && this.cohort.length > 0) {
      const idx = this.live.focusIndex % this.cohort.length;
      return this.cohort[idx].creature.muscles;
    }
    return this.creature?.muscles ?? [];
  }

  private liveStatsFromMember(
    member: CohortMember,
    task: TaskId,
    episodeSimTime: number,
  ): LiveFocusStats {
    const uprightMean =
      member.uprightSteps > 0 ? member.uprightSum / member.uprightSteps : 1;
    const meanAirHeight =
      member.airTime > 1e-6
        ? member.airHeightIntegral / member.airTime
        : 0;
    const scored = scoreTaskPerformance(
      task,
      member.creature,
      member.startX,
      member.fell,
      member.footLifts,
      member.peakHeight,
      member.airTime,
      uprightMean,
      meanAirHeight,
      member.regionAccum,
      member.courseAccum,
      member.peakSpeed,
      episodeSimTime,
      member.peakDistance,
      member.impactSpeed,
      member.airborneTravel,
    );
    return {
      distance: scored.distance,
      footLifts: scored.footLifts,
      peakHeight: scored.peakHeight,
      airTime: scored.airTime,
      fell: scored.fell,
      uprightQuality: scored.uprightQuality,
      fitness: scored.fitness,
      courseArmed: scored.courseArmed,
      raceTime: scored.raceTime,
      checkpointsHit: scored.checkpointsHit,
      finished: scored.finished,
    };
  }

  private liveStatsFromSolo(): LiveFocusStats | null {
    const watch = this.soloWatch;
    if (!watch || !this.creature) return null;
    const uprightMean =
      watch.uprightSteps > 0 ? watch.uprightSum / watch.uprightSteps : 1;
    const meanAirHeight =
      watch.airTime > 1e-6
        ? watch.airHeightIntegral / watch.airTime
        : 0;
    const scored = scoreTaskPerformance(
      watch.task,
      this.creature,
      watch.startX,
      watch.fell,
      watch.footLifts,
      watch.peakHeight,
      watch.airTime,
      uprightMean,
      meanAirHeight,
      watch.regionAccum,
      watch.courseAccum,
      watch.peakSpeed,
      watch.episodeT,
      watch.peakDistance,
      watch.impactSpeed,
      watch.airborneTravel,
    );
    return {
      distance: scored.distance,
      footLifts: scored.footLifts,
      peakHeight: scored.peakHeight,
      airTime: scored.airTime,
      fell: scored.fell,
      uprightQuality: scored.uprightQuality,
      fitness: scored.fitness,
      courseArmed: scored.courseArmed,
      raceTime: scored.raceTime,
      checkpointsHit: scored.checkpointsHit,
      finished: scored.finished,
    };
  }

  private headToHeadSnapshot(): HeadToHeadSnapshot | null {
    const task = this.h2h?.task ?? this.task;
    if (this.cohort.length < 2) return null;
    const episodeT = this.h2h?.episodeT ?? 0;
    const stats = this.cohort.slice(0, 2).map((m) =>
      this.liveStatsFromMember(m, task, episodeT),
    );
    if (this.h2hFinished) {
      return {
        episodeT: 0,
        episodeDuration: 0,
        fitness: this.h2hFinished.fitness,
        names: [
          this.cohort[0]?.memberDesign?.name ?? 'A',
          this.cohort[1]?.memberDesign?.name ?? 'B',
        ],
      };
    }
    if (!this.h2h) return null;
    return {
      episodeT: this.h2h.episodeT,
      episodeDuration: this.h2h.episodeDuration,
      fitness: [stats[0]?.fitness ?? 0, stats[1]?.fitness ?? 0],
      names: [
        this.cohort[0]?.memberDesign?.name ?? 'A',
        this.cohort[1]?.memberDesign?.name ?? 'B',
      ],
    };
  }

  private boxingSnapshot(): BoxingMatchSnapshot | null {
    if (this.cohort.length < 2) return null;
    const names: [string, string] = [
      this.cohort[0]?.memberDesign?.name ?? 'A',
      this.cohort[1]?.memberDesign?.name ?? 'B',
    ];
    if (this.boxing) {
      return {
        episodeT: this.boxing.episodeT,
        episodeDuration: this.boxing.episodeDuration,
        divisionId: this.boxing.divisionId,
        ruleVersion: 1,
        names,
        points: [
          this.boxing.score.fighters[0].points,
          this.boxing.score.fighters[1].points,
        ],
        hits: [
          this.boxing.score.fighters[0].hits,
          this.boxing.score.fighters[1].hits,
        ],
        lastHit: this.boxing.score.hits.at(-1) ?? null,
        finished: false,
        winner: null,
      };
    }
    if (!this.boxingFinished) return null;
    return {
      episodeT: this.boxingFinished.episodeDuration,
      episodeDuration: this.boxingFinished.episodeDuration,
      divisionId: this.boxingFinished.score.divisionId,
      ruleVersion: this.boxingFinished.score.ruleVersion,
      names,
      points: [
        this.boxingFinished.score.fighters[0].points,
        this.boxingFinished.score.fighters[1].points,
      ],
      hits: [
        this.boxingFinished.score.fighters[0].hits,
        this.boxingFinished.score.fighters[1].hits,
      ],
      lastHit: this.boxingFinished.score.hits.at(-1) ?? null,
      finished: true,
      winner: this.boxingFinished.winner,
    };
  }

  private isHeadToHeadView(): boolean {
    return (
      this.cohort.length >= 2 &&
      this.cohort[0].memberDesign !== undefined &&
      (this.h2h !== null || this.h2hFinished !== null)
    );
  }

  private isBoxingView(): boolean {
    return (
      this.cohort.length >= 2 &&
      this.cohort[0].memberDesign !== undefined &&
      (this.boxing !== null || this.boxingFinished !== null)
    );
  }

  private isJoustingView(): boolean {
    return (
      this.cohort.length >= 2 &&
      this.cohort[0].memberDesign !== undefined &&
      (this.jousting !== null || this.joustingFinished !== null)
    );
  }

  private joustingSnapshot(): JoustMatchSnapshot | null {
    if (this.cohort.length < 2) return null;
    const names: [string, string] = [
      this.cohort[0]?.memberDesign?.name ?? 'A',
      this.cohort[1]?.memberDesign?.name ?? 'B',
    ];
    if (this.jousting) {
      return {
        episodeT: this.jousting.episodeT,
        episodeDuration: this.jousting.episodeDuration,
        names,
        totals: [
          this.jousting.scorecard.fighters[0].total,
          this.jousting.scorecard.fighters[1].total,
        ],
        hits: [
          this.jousting.scorecard.hits[0].hits,
          this.jousting.scorecard.hits[1].hits,
        ],
        phase: this.jousting.pass.phase,
        clashReason: this.jousting.pass.clashReason,
        lastHit: this.jousting.scorecard.events.at(-1) ?? null,
        finished: false,
        winner: null,
      };
    }
    if (!this.joustingFinished) return null;
    return {
      episodeT: this.joustingFinished.episodeDuration,
      episodeDuration: this.joustingFinished.episodeDuration,
      names,
      totals: [
        this.joustingFinished.scorecard.fighters[0].total,
        this.joustingFinished.scorecard.fighters[1].total,
      ],
      hits: [
        this.joustingFinished.scorecard.hits[0].hits,
        this.joustingFinished.scorecard.hits[1].hits,
      ],
      phase: 'done',
      clashReason: this.joustingFinished.scorecard.pass.clashReason,
      lastHit: this.joustingFinished.scorecard.events.at(-1) ?? null,
      finished: true,
      winner: this.joustingFinished.winner,
    };
  }

  private agentCenter(agent: AgentSnapshot): { x: number; y: number } {
    if (agent.joints.length === 0) return { x: 0, y: 2 };
    return {
      x: agent.joints.reduce((s, j) => s + j.x, 0) / agent.joints.length,
      y: agent.joints.reduce((s, j) => s + j.y, 0) / agent.joints.length,
    };
  }

  snapshot(): SimulationSnapshot {
    if (this.live && this.cohort.length > 0) {
      const focus = Math.min(
        this.live.focusIndex,
        Math.max(0, this.cohort.length - 1),
      );
      const appearance = this.live.design.appearance;
      // When ghosts are hidden, only snapshot the focused member — cohort
      // Rapier reads/allocs for undrawn agents are wasted work.
      const agents = this.showGhostPack
        ? this.cohort.map((m, i) =>
            agentFromCreature(
              m.creature,
              m.muscleVisual,
              i === focus ? 1 : GHOST_OPACITY,
              i === focus,
              appearance,
            ),
          )
        : [
            agentFromCreature(
              this.cohort[focus].creature,
              this.cohort[focus].muscleVisual,
              1,
              true,
              appearance,
            ),
          ];
      const focused = this.showGhostPack ? agents[focus] : agents[0];
      let focusX = 0;
      let focusY = 1;
      if (focused.joints.length > 0) {
        focusX =
          focused.joints.reduce((s, j) => s + j.x, 0) / focused.joints.length;
        focusY =
          focused.joints.reduce((s, j) => s + j.y, 0) / focused.joints.length;
      }
      return {
        joints: focused.joints,
        bones: focused.bones,
        struts: focused.struts,
        muscles: focused.muscles,
        time: this.time,
        agents,
        focusX,
        focusY,
        cameraFollow: true,
        appearance: this.live.design.appearance,
        task: this.live.task,
        extrapolateDt: Math.min(this.accumulator, FIXED_DT),
        brain: this.probeFocusedBrain(),
        obstacles: this.envObstacles?.visuals ?? [],
        terrain: this.activeTerrainVisual(),
        tower: this.envTower?.visuals ?? [],
        scoreRegions: activeScoreRegions(this.environment),
        courseMarkers: activeCourseMarkers(this.environment),
        theme: this.environment.theme,
        liveStats: this.liveStatsFromMember(
          this.cohort[focus],
          this.live.task,
          this.live.episodeT,
        ),
        lastEpisodeMetrics: this.lastEpisodeMetrics,
        evolve: {
          generation: this.live.generation,
          evaluated: this.live.batchIndex * this.live.batchSize,
          populationSize: this.live.popSize,
          bestFitness:
            this.live.bestOverall.fitness === -Infinity
              ? 0
              : this.live.bestOverall.fitness,
          meanFitness: this.live.displayMeanFitness,
          running: true,
          status: this.live.status,
          batch: this.live.batchIndex + 1,
          batchCount: this.live.batchCount,
          focusIndex: focus,
          cohortSize: this.cohort.length,
          episodeT: this.live.episodeT,
          episodeDuration: this.live.episodeDuration,
        },
        headToHead: null,
        hideMuscles: this.hideMuscles,
        hideBones: this.hideBones,
        hideSolidStruts: this.hideSolidStruts,
      };
    }

    if (this.joustingLive && this.joustingLive.pairs.length > 0) {
      const live = this.joustingLive;
      const pairFocus = Math.min(
        live.focusIndex,
        Math.max(0, live.pairs.length - 1),
      );
      const focusedPair = live.pairs[pairFocus]!;
      const appearance = live.design.appearance;
      const agents: AgentSnapshot[] = [];
      if (this.showGhostPack) {
        for (let pi = 0; pi < live.pairs.length; pi++) {
          const pair = live.pairs[pi]!;
          const pairFocused = pi === pairFocus;
          const opacity = pairFocused ? 1 : GHOST_OPACITY;
          agents.push(
            agentFromCreature(
              pair.trainee.creature,
              pair.trainee.muscleVisual,
              opacity,
              pairFocused,
              appearance,
            ),
            agentFromCreature(
              pair.sparring.creature,
              pair.sparring.muscleVisual,
              opacity,
              false,
              pair.sparring.memberDesign?.appearance,
            ),
          );
        }
      } else {
        agents.push(
          agentFromCreature(
            focusedPair.trainee.creature,
            focusedPair.trainee.muscleVisual,
            1,
            true,
            appearance,
          ),
          agentFromCreature(
            focusedPair.sparring.creature,
            focusedPair.sparring.muscleVisual,
            1,
            false,
            focusedPair.sparring.memberDesign?.appearance,
          ),
        );
      }
      const tAgent = this.showGhostPack
        ? agents[pairFocus * 2]!
        : agents[0]!;
      const sAgent = this.showGhostPack
        ? agents[pairFocus * 2 + 1]!
        : agents[1]!;
      const c0 = this.agentCenter(tAgent);
      const c1 = this.agentCenter(sAgent);
      const focusX = (c0.x + c1.x) / 2;
      const focusY = (c0.y + c1.y) / 2;
      const focusedCard = focusedPair.scorecard;
      return {
        joints: tAgent.joints,
        bones: tAgent.bones,
        struts: tAgent.struts,
        muscles: tAgent.muscles,
        time: this.time,
        agents,
        focusX,
        focusY,
        cameraFollow: true,
        appearance,
        task: 'jousting',
        extrapolateDt: Math.min(this.accumulator, FIXED_DT),
        brain: this.probeFocusedBrain(),
        obstacles: this.envObstacles?.visuals ?? [],
        terrain: this.activeTerrainVisual(),
        tower: this.envTower?.visuals ?? [],
        scoreRegions: activeScoreRegions(this.environment),
        courseMarkers: activeCourseMarkers(this.environment),
        theme: this.environment.theme,
        liveStats: this.liveStatsFromMember(
          focusedPair.trainee,
          'jousting',
          live.episodeT,
        ),
        lastEpisodeMetrics: this.lastEpisodeMetrics,
        evolve: {
          generation: live.generation,
          evaluated: live.batchIndex * live.batchSize,
          populationSize: live.popSize,
          bestFitness:
            live.bestOverall.fitness === -Infinity
              ? 0
              : live.bestOverall.fitness,
          meanFitness: live.displayMeanFitness,
          running: true,
          status: live.status,
          batch: live.batchIndex + 1,
          batchCount: live.batchCount,
          focusIndex: pairFocus,
          cohortSize: live.pairs.length,
          episodeT: live.episodeT,
          episodeDuration: live.episodeDuration,
        },
        headToHead: null,
        boxing: null,
        jousting: {
          episodeT: live.episodeT,
          episodeDuration: live.episodeDuration,
          names: [
            live.design.name || 'Trainee',
            live.opponentDesign.name || 'Sparring',
          ],
          totals: [
            focusedCard.fighters[0].total,
            focusedCard.fighters[1].total,
          ],
          hits: [focusedCard.hits[0].hits, focusedCard.hits[1].hits],
          phase: focusedPair.pass.phase,
          clashReason: focusedPair.pass.clashReason,
          lastHit: focusedCard.events.at(-1) ?? null,
          finished: focusedPair.frozen,
          winner: null,
        },
        hideMuscles: this.hideMuscles,
        hideBones: this.hideBones,
        hideSolidStruts: this.hideSolidStruts,
      };
    }

    if (this.boxingLive && this.boxingLive.pairs.length > 0) {
      const live = this.boxingLive;
      const pairFocus = Math.min(
        live.focusIndex,
        Math.max(0, live.pairs.length - 1),
      );
      const focusedPair = live.pairs[pairFocus]!;
      const appearance = live.design.appearance;
      const agents: AgentSnapshot[] = [];
      if (this.showGhostPack) {
        for (let pi = 0; pi < live.pairs.length; pi++) {
          const pair = live.pairs[pi]!;
          const pairFocused = pi === pairFocus;
          const opacity = pairFocused ? 1 : GHOST_OPACITY;
          agents.push(
            agentFromCreature(
              pair.trainee.creature,
              pair.trainee.muscleVisual,
              opacity,
              pairFocused,
              appearance,
            ),
            agentFromCreature(
              pair.sparring.creature,
              pair.sparring.muscleVisual,
              opacity,
              false,
              pair.sparring.memberDesign?.appearance,
            ),
          );
        }
      } else {
        agents.push(
          agentFromCreature(
            focusedPair.trainee.creature,
            focusedPair.trainee.muscleVisual,
            1,
            true,
            appearance,
          ),
          agentFromCreature(
            focusedPair.sparring.creature,
            focusedPair.sparring.muscleVisual,
            1,
            false,
            focusedPair.sparring.memberDesign?.appearance,
          ),
        );
      }
      const tAgent = this.showGhostPack
        ? agents[pairFocus * 2]!
        : agents[0]!;
      const sAgent = this.showGhostPack
        ? agents[pairFocus * 2 + 1]!
        : agents[1]!;
      const c0 = this.agentCenter(tAgent);
      const c1 = this.agentCenter(sAgent);
      const focusX = (c0.x + c1.x) / 2;
      const focusY = (c0.y + c1.y) / 2;
      const focusedScore = focusedPair.score;
      return {
        joints: tAgent.joints,
        bones: tAgent.bones,
        struts: tAgent.struts,
        muscles: tAgent.muscles,
        time: this.time,
        agents,
        focusX,
        focusY,
        cameraFollow: true,
        appearance,
        task: 'boxing',
        extrapolateDt: Math.min(this.accumulator, FIXED_DT),
        brain: this.probeFocusedBrain(),
        obstacles: this.envObstacles?.visuals ?? [],
        terrain: this.activeTerrainVisual(),
        tower: this.envTower?.visuals ?? [],
        scoreRegions: activeScoreRegions(this.environment),
        courseMarkers: activeCourseMarkers(this.environment),
        theme: this.environment.theme,
        liveStats: this.liveStatsFromMember(
          focusedPair.trainee,
          'boxing',
          live.episodeT,
        ),
        lastEpisodeMetrics: this.lastEpisodeMetrics,
        evolve: {
          generation: live.generation,
          evaluated: live.batchIndex * live.batchSize,
          populationSize: live.popSize,
          bestFitness:
            live.bestOverall.fitness === -Infinity
              ? 0
              : live.bestOverall.fitness,
          meanFitness: live.displayMeanFitness,
          running: true,
          status: live.status,
          batch: live.batchIndex + 1,
          batchCount: live.batchCount,
          focusIndex: pairFocus,
          cohortSize: live.pairs.length,
          episodeT: live.episodeT,
          episodeDuration: live.episodeDuration,
        },
        headToHead: null,
        boxing: {
          episodeT: live.episodeT,
          episodeDuration: live.episodeDuration,
          divisionId: live.divisionId,
          ruleVersion: 1,
          names: [
            live.design.name || 'Trainee',
            live.opponentDesign.name || 'Sparring',
          ],
          points: [
            focusedScore.fighters[0].points,
            focusedScore.fighters[1].points,
          ],
          hits: [
            focusedScore.fighters[0].hits,
            focusedScore.fighters[1].hits,
          ],
          lastHit: focusedScore.hits.at(-1) ?? null,
          finished: false,
          winner: null,
        },
        jousting: null,
        hideMuscles: this.hideMuscles,
        hideBones: this.hideBones,
        hideSolidStruts: this.hideSolidStruts,
      };
    }

    if (this.isHeadToHeadView() || this.isBoxingView() || this.isJoustingView()) {
      const boxing = this.boxingSnapshot();
      const jousting = this.joustingSnapshot();
      const task: TaskId = jousting
        ? 'jousting'
        : boxing
          ? 'boxing'
          : (this.h2h?.task ?? this.task);
      const focus = Math.min(
        this.duelFocusIndex,
        Math.max(0, Math.min(2, this.cohort.length) - 1),
      );
      const allAgents = this.cohort.slice(0, 2).map((m, i) =>
        agentFromCreature(
          m.creature,
          m.muscleVisual,
          1,
          i === focus,
          m.memberDesign?.appearance,
        ),
      );
      const c0 = this.agentCenter(allAgents[0]);
      const c1 = this.agentCenter(allAgents[1]);
      const focusX = (c0.x + c1.x) / 2;
      const focusY = (c0.y + c1.y) / 2;
      return {
        joints: allAgents[focus]?.joints ?? allAgents[0].joints,
        bones: allAgents[focus]?.bones ?? allAgents[0].bones,
        struts: allAgents[focus]?.struts ?? allAgents[0].struts,
        muscles: allAgents[focus]?.muscles ?? allAgents[0].muscles,
        time: this.time,
        agents: allAgents,
        focusX,
        focusY,
        cameraFollow: true,
        appearance: this.cohort[focus]?.memberDesign?.appearance
          ?? this.cohort[0].memberDesign?.appearance,
        task,
        extrapolateDt: Math.min(this.accumulator, FIXED_DT),
        brain: this.probeFocusedBrain(),
        obstacles: this.envObstacles?.visuals ?? [],
        terrain: this.activeTerrainVisual(),
        tower: this.envTower?.visuals ?? [],
        scoreRegions: activeScoreRegions(this.environment),
        courseMarkers: activeCourseMarkers(this.environment),
        theme: this.environment.theme,
        liveStats: this.liveStatsFromMember(
          this.cohort[focus] ?? this.cohort[0],
          task,
          boxing?.episodeT ?? jousting?.episodeT ?? this.h2h?.episodeT ?? 0,
        ),
        lastEpisodeMetrics: this.lastEpisodeMetrics,
        evolve: null,
        headToHead: boxing || jousting ? null : this.headToHeadSnapshot(),
        boxing,
        jousting,
        hideMuscles: this.hideMuscles,
        hideBones: this.hideBones,
        hideSolidStruts: this.hideSolidStruts,
      };
    }

    if (this.discoDancers.length > 0) {
      const allAgents = this.discoDancers.map((d, i) =>
        agentFromCreature(
          d.creature,
          d.muscleVisual,
          1,
          i === 0,
          d.design.appearance,
        ),
      );
      let focusX = 0;
      let focusY = 2;
      if (allAgents.length > 0) {
        const centers = allAgents.map((a) => this.agentCenter(a));
        focusX = centers.reduce((s, c) => s + c.x, 0) / centers.length;
        focusY = centers.reduce((s, c) => s + c.y, 0) / centers.length;
      }
      const lead = allAgents[0] ?? {
        joints: [],
        bones: [],
        struts: [],
        muscles: [],
        opacity: 1,
        focused: true,
      };
      return {
        joints: lead.joints,
        bones: lead.bones,
        struts: lead.struts,
        muscles: lead.muscles,
        time: this.time,
        agents: allAgents,
        focusX,
        focusY,
        // Arena overview — SimCanvas applies a fixed zoom-out in Disco.
        cameraFollow: false,
        appearance: this.discoDancers[0].design.appearance,
        task: this.task,
        extrapolateDt: Math.min(this.accumulator, FIXED_DT),
        brain: null,
        obstacles: this.envObstacles?.visuals ?? [],
        terrain: this.activeTerrainVisual(),
        tower: this.envTower?.visuals ?? [],
        scoreRegions: activeScoreRegions(this.environment),
        courseMarkers: activeCourseMarkers(this.environment),
        theme: this.environment.theme,
        liveStats: null,
        lastEpisodeMetrics: this.lastEpisodeMetrics,
        evolve: null,
        headToHead: null,
        hideMuscles: this.hideMuscles,
        hideBones: this.hideBones,
        hideSolidStruts: this.hideSolidStruts,
      };
    }

    const primary = this.creature
      ? agentFromCreature(
          this.creature,
          this.muscleVisual,
          1,
          true,
          this.design?.appearance,
        )
      : {
          joints: [],
          bones: [],
          struts: [],
          muscles: [],
          opacity: 1,
          focused: true,
          appearance: this.design?.appearance,
        };

    let focusX = 0;
    let focusY = 2;
    if (primary.joints.length > 0) {
      focusX =
        primary.joints.reduce((s, j) => s + j.x, 0) / primary.joints.length;
      focusY =
        primary.joints.reduce((s, j) => s + j.y, 0) / primary.joints.length;
    }

    return {
      joints: primary.joints,
      bones: primary.bones,
      struts: primary.struts,
      muscles: primary.muscles,
      time: this.time,
      agents: primary.joints.length ? [primary] : [],
      focusX,
      focusY,
      // Follow so high launch-pad flights stay readable on the height ruler.
      cameraFollow: primary.joints.length > 0,
      appearance: this.design?.appearance,
      task: this.task,
      extrapolateDt: Math.min(this.accumulator, FIXED_DT),
      brain: this.probeFocusedBrain(),
      obstacles: this.envObstacles?.visuals ?? [],
      terrain: this.activeTerrainVisual(),
      tower: this.envTower?.visuals ?? [],
      scoreRegions: activeScoreRegions(this.environment),
      courseMarkers: activeCourseMarkers(this.environment),
      theme: this.environment.theme,
      liveStats: this.liveStatsFromSolo(),
      lastEpisodeMetrics: this.lastEpisodeMetrics,
      evolve: null,
      headToHead: null,
      hideMuscles: this.hideMuscles,
      hideBones: this.hideBones,
      hideSolidStruts: this.hideSolidStruts,
    };
  }
}
