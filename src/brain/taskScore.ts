/**
 * Task fitness adapters (E6.*) — Fresh Start Rapier state only.
 */
import type { AeroType } from '../creature/types';
import type { SpawnedCreature } from '../physics/spawn';
import {
  FALL_PENALTY,
  JUMP_HEIGHT_SCALE,
  FLIGHT_AERO_AREA_FULL,
  FLIGHT_AERO_MATCH_FLOOR,
  FLIGHT_AIR_SCALE,
  FLIGHT_GLIDER_DIST_SCALE,
  FLIGHT_HEIGHT_SCALE,
  FLIGHT_LANDING_REWARD_MULT,
  FLIGHT_MEAN_HEIGHT_SCALE,
  FLIGHT_PARA_IMPACT_SCALE,
  FLIGHT_SOFT_LAND_Y,
  FLIGHT_WING_DIST_SCALE,
  MIN_DESIGNED_HEAD_Y,
  MOTOR_DIST_SCALE,
  CLIMB_HEIGHT_SCALE,
  ROUGH_DIST_SCALE,
  SPRINT_CHECKPOINT_BONUS,
  SPRINT_DIST_SCALE,
  SPRINT_FALL_PROGRESS_FLOOR,
  SPRINT_FINISH_BONUS,
  SPRINT_FINISH_TIME_SCALE,
  SPEED_DIST_SCALE,
  SPEED_PEAK_SCALE,
  STAY_UPRIGHT_SCALE,
  HANG_TIME_SCALE,
  LONG_JUMP_DIST_SCALE,
} from './constants';
import {
  runLiftQuality,
  runUprightQuality,
  scoreRunPerformance,
  type EpisodeResult,
  updateFallState,
} from './fitness';
import {
  applyRegionScore,
  emptyScoreRegionAccum,
  type ScoreRegionAccum,
} from './scoreRegions';
import {
  courseRaceTime,
  emptyCourseMarkerAccum,
  type CourseMarkerAccum,
} from './courseMarkers';
import { isFlightTask, type TaskId } from './types';
import { avgJointX, minJointY } from './observations';

export interface TaskEpisodeMetrics extends EpisodeResult {
  peakHeight: number;
  airTime: number;
  /** Mean min-joint Y while fully airborne (flight sustain signal). */
  meanAirHeight: number;
  /** Peak mean horizontal joint speed (m/s). */
  peakSpeed: number;
  /** C2.9 — accumulated time-in-zone penalty. */
  regionPenalty: number;
  /** C2.9 — touch-once reward + landing total. */
  regionReward: number;
  /** C2.10 — true after start line (or immediately if no start). */
  courseArmed: boolean;
  /** C2.10 — checkpoints hit in order this episode. */
  checkpointsHit: number;
  /** C2.10 — true after valid finish overlap. */
  finished: boolean;
  /**
   * C2.10 — race elapsed at finish (seconds since start line); null if unfinished.
   */
  finishTime: number | null;
  /**
   * C2.10 — race clock at episode end (running or finished); null if never armed.
   */
  raceTime: number | null;
  /** Simulated seconds elapsed when the episode ended (may be early on landing). */
  episodeTime: number;
}

export function emptyMetrics(): TaskEpisodeMetrics {
  return {
    fitness: 0,
    distance: 0,
    fell: false,
    footLifts: 0,
    uprightQuality: 1,
    peakHeight: 0,
    airTime: 0,
    meanAirHeight: 0,
    peakSpeed: 0,
    regionPenalty: 0,
    regionReward: 0,
    courseArmed: false,
    checkpointsHit: 0,
    finished: false,
    finishTime: null,
    raceTime: null,
    episodeTime: 0,
  };
}

type ScoredBase = EpisodeResult & {
  peakHeight: number;
  airTime: number;
  meanAirHeight: number;
  peakSpeed: number;
  fitness: number;
};

function withRegionScore(
  base: ScoredBase,
  accum: ScoreRegionAccum,
  landingMult = 1,
): Omit<
  TaskEpisodeMetrics,
  | 'courseArmed'
  | 'checkpointsHit'
  | 'finished'
  | 'finishTime'
  | 'raceTime'
  | 'episodeTime'
> {
  return {
    ...base,
    fitness: Math.max(0, applyRegionScore(base.fitness, accum, landingMult)),
    regionPenalty: accum.penalty,
    regionReward: accum.reward + accum.landingReward * Math.max(0, landingMult),
  };
}

function withCourseMetrics(
  metrics: Omit<
    TaskEpisodeMetrics,
    | 'courseArmed'
    | 'checkpointsHit'
    | 'finished'
    | 'finishTime'
    | 'raceTime'
    | 'episodeTime'
  >,
  courseAccum?: CourseMarkerAccum,
  episodeSimTime = 0,
): TaskEpisodeMetrics {
  if (!courseAccum) {
    return {
      ...metrics,
      courseArmed: false,
      checkpointsHit: 0,
      finished: false,
      finishTime: null,
      raceTime: null,
      episodeTime: episodeSimTime,
    };
  }
  return {
    ...metrics,
    courseArmed: courseAccum.armed,
    checkpointsHit: courseAccum.checkpointsHit,
    finished: courseAccum.finished,
    finishTime: courseAccum.finishTime,
    raceTime: courseRaceTime(courseAccum, episodeSimTime),
    episodeTime: episodeSimTime,
  };
}

function applyUprightGate(
  creature: SpawnedCreature,
  task: TaskId,
  baseFitness: number,
  uprightMean: number,
): { fitness: number; uprightQuality: number } {
  if (
    isFlightTask(task) ||
    task === 'hang' ||
    creature.designedHeadY < MIN_DESIGNED_HEAD_Y
  ) {
    return { fitness: baseFitness, uprightQuality: 1 };
  }
  const uprightQuality = runUprightQuality(uprightMean);
  return { fitness: baseFitness * uprightQuality, uprightQuality };
}

function scoreSprint(
  creature: SpawnedCreature,
  startX: number,
  fell: boolean,
  course: CourseMarkerAccum,
  uprightMean: number,
  /** Best forward progress this episode (meters); defaults to end pose. */
  peakDistance?: number,
): { fitness: number; uprightQuality: number; distance: number } {
  const endDistance = avgJointX(creature) - startX;
  // Credit peak progress so a mid-episode climb survives a later tumble.
  const distance = Math.max(0, peakDistance ?? endDistance, endDistance);
  const progressCredit =
    course.checkpointsHit * SPRINT_CHECKPOINT_BONUS +
    distance * SPRINT_DIST_SCALE;
  let fitness = progressCredit;
  if (course.finished && course.finishTime != null) {
    const timeBonus =
      SPRINT_FINISH_BONUS +
      SPRINT_FINISH_TIME_SCALE / Math.max(0.5, course.finishTime);
    fitness += timeBonus;
  }
  if (fell) {
    // Keep a floor of peak progress so fall penalty cannot fully erase a climb.
    fitness = Math.max(
      progressCredit * SPRINT_FALL_PROGRESS_FLOOR,
      fitness - FALL_PENALTY,
    );
  }
  const gated = applyUprightGate(
    creature,
    'sprint',
    Math.max(0, fitness),
    uprightMean,
  );
  return { ...gated, distance };
}

export function scoreTaskPerformance(
  task: TaskId,
  creature: SpawnedCreature,
  startX: number,
  fell: boolean,
  footLifts: number,
  peakHeight: number,
  airTime: number,
  uprightMean = 1,
  meanAirHeight = 0,
  regionAccum: ScoreRegionAccum = emptyScoreRegionAccum(),
  courseAccum?: CourseMarkerAccum,
  peakSpeed = 0,
  /** Episode sim time (s) — used for live/final race clock. */
  episodeSimTime = 0,
  /** Best forward progress (m) this episode — sprint uses peak, not end pose. */
  peakDistance?: number,
  /** Peak descending |vy| near the ground (parachute soft-land). */
  impactSpeed = 0,
  /** Forward meters traveled while fully airborne (glider range). */
  airborneTravel = 0,
): TaskEpisodeMetrics {
  const course = courseAccum ?? emptyCourseMarkerAccum([]);
  const finish = (
    base: Omit<
      TaskEpisodeMetrics,
      | 'courseArmed'
      | 'checkpointsHit'
      | 'finished'
      | 'finishTime'
      | 'raceTime'
      | 'episodeTime'
    >,
  ): TaskEpisodeMetrics =>
    withCourseMetrics(base, courseAccum, episodeSimTime);

  // H6 — dance is imitation-trained; no GA episode scoring.
  if (task === 'dance') {
    return finish(
      withRegionScore(
        {
          fitness: 0,
          distance: avgJointX(creature) - startX,
          fell,
          footLifts,
          uprightQuality: uprightMean,
          peakHeight,
          airTime,
          meanAirHeight,
          peakSpeed,
        },
        regionAccum,
      ),
    );
  }

  if (task === 'run') {
    const r = scoreRunPerformance(creature, startX, fell, footLifts, uprightMean);
    return finish(
      withRegionScore(
        { ...r, peakHeight, airTime, meanAirHeight, peakSpeed },
        regionAccum,
      ),
    );
  }

  if (task === 'speed') {
    const distance = avgJointX(creature) - startX;
    const base =
      Math.max(0, peakSpeed) / SPEED_PEAK_SCALE +
      Math.max(0, distance) / SPEED_DIST_SCALE -
      (fell ? FALL_PENALTY : 0);
    const gated = applyUprightGate(creature, task, Math.max(0, base), uprightMean);
    return finish(
      withRegionScore(
        {
          fitness: gated.fitness,
          distance,
          fell,
          footLifts,
          uprightQuality: gated.uprightQuality,
          peakHeight,
          airTime,
          meanAirHeight,
          peakSpeed,
        },
        regionAccum,
      ),
    );
  }

  if (task === 'sprint') {
    const s = scoreSprint(
      creature,
      startX,
      fell,
      course,
      uprightMean,
      peakDistance,
    );
    return finish(
      withRegionScore(
        {
          fitness: s.fitness,
          distance: s.distance,
          fell,
          footLifts,
          uprightQuality: s.uprightQuality,
          peakHeight,
          airTime,
          meanAirHeight,
          peakSpeed,
        },
        regionAccum,
      ),
    );
  }

  if (task === 'stay') {
    const distance = avgJointX(creature) - startX;
    const base =
      uprightMean / STAY_UPRIGHT_SCALE - (fell ? FALL_PENALTY : 0);
    return finish(
      withRegionScore(
        {
          fitness: Math.max(0, base),
          distance,
          fell,
          footLifts,
          uprightQuality: uprightMean,
          peakHeight,
          airTime,
          meanAirHeight,
          peakSpeed,
        },
        regionAccum,
      ),
    );
  }

  if (task === 'jump') {
    const heightScore = Math.max(0, peakHeight) / JUMP_HEIGHT_SCALE;
    const airScore = airTime * 0.15;
    const base = heightScore + airScore - (fell ? FALL_PENALTY : 0);
    const gated = applyUprightGate(creature, task, Math.max(0, base), uprightMean);
    return finish(
      withRegionScore(
        {
          fitness: gated.fitness,
          distance: avgJointX(creature) - startX,
          fell,
          footLifts,
          uprightQuality: gated.uprightQuality,
          peakHeight,
          airTime,
          meanAirHeight,
          peakSpeed,
        },
        regionAccum,
      ),
    );
  }

  if (task === 'hang') {
    const base =
      airTime * HANG_TIME_SCALE +
      Math.max(0, peakHeight) / JUMP_HEIGHT_SCALE * 0.15 -
      (fell ? FALL_PENALTY : 0);
    return finish(
      withRegionScore(
        {
          fitness: Math.max(0, base),
          distance: avgJointX(creature) - startX,
          fell,
          footLifts,
          uprightQuality: 1,
          peakHeight,
          airTime,
          meanAirHeight,
          peakSpeed,
        },
        regionAccum,
      ),
    );
  }

  if (task === 'longjump') {
    const distance = avgJointX(creature) - startX;
    const base =
      Math.max(0, distance) / LONG_JUMP_DIST_SCALE +
      airTime * 0.05 -
      (fell ? FALL_PENALTY : 0);
    const gated = applyUprightGate(creature, task, Math.max(0, base), uprightMean);
    return finish(
      withRegionScore(
        {
          fitness: gated.fitness,
          distance,
          fell,
          footLifts,
          uprightQuality: gated.uprightQuality,
          peakHeight,
          airTime,
          meanAirHeight,
          peakSpeed,
        },
        regionAccum,
      ),
    );
  }

  if (task === 'climb') {
    const height = Math.max(0, peakHeight) / CLIMB_HEIGHT_SCALE;
    const forward = Math.max(0, avgJointX(creature) - startX) * 0.05;
    const base = height + forward - (fell ? FALL_PENALTY : 0);
    const gated = applyUprightGate(creature, task, Math.max(0, base), uprightMean);
    return finish(
      withRegionScore(
        {
          fitness: gated.fitness,
          distance: avgJointX(creature) - startX,
          fell,
          footLifts,
          uprightQuality: gated.uprightQuality,
          peakHeight,
          airTime,
          meanAirHeight,
          peakSpeed,
        },
        regionAccum,
      ),
    );
  }

  if (task === 'motor') {
    const distance = avgJointX(creature) - startX;
    const base =
      Math.max(0, distance) / MOTOR_DIST_SCALE - (fell ? FALL_PENALTY : 0);
    const gated = applyUprightGate(creature, task, Math.max(0, base), uprightMean);
    return finish(
      withRegionScore(
        {
          fitness: gated.fitness,
          distance,
          fell,
          footLifts,
          uprightQuality: gated.uprightQuality,
          peakHeight,
          airTime,
          meanAirHeight,
          peakSpeed,
        },
        regionAccum,
      ),
    );
  }

  if (task === 'rough') {
    const distance = avgJointX(creature) - startX;
    const liftQuality = runLiftQuality(distance, footLifts);
    const gated = applyUprightGate(
      creature,
      task,
      Math.max(0, distance) / ROUGH_DIST_SCALE,
      uprightMean,
    );
    const fitness = gated.fitness * liftQuality - (fell ? FALL_PENALTY : 0);
    return finish(
      withRegionScore(
        {
          fitness,
          distance,
          fell,
          footLifts,
          uprightQuality: gated.uprightQuality,
          peakHeight,
          airTime,
          meanAirHeight,
          peakSpeed,
        },
        regionAccum,
      ),
    );
  }

  const distance = Math.max(0, peakDistance ?? avgJointX(creature) - startX);
  const peakScore = Math.max(0, peakHeight) / FLIGHT_HEIGHT_SCALE;
  const meanScore = Math.max(0, meanAirHeight) / FLIGHT_MEAN_HEIGHT_SCALE;
  const airScore = airTime / FLIGHT_AIR_SCALE;
  const landMult = isFlightTask(task) && task !== 'flight'
    ? FLIGHT_LANDING_REWARD_MULT
    : 1;

  if (task === 'flight_wing') {
    const distScore = distance / FLIGHT_WING_DIST_SCALE;
    const base =
      (peakScore * 0.3 + meanScore * 0.4 + airScore * 0.25 + distScore * 0.05) *
        aeroPresenceScale(creature, 'wing') -
      (fell ? FALL_PENALTY * 0.5 : 0);
    return finish(
      withRegionScore(
        {
          fitness: base,
          distance,
          fell,
          footLifts,
          uprightQuality: 1,
          peakHeight,
          airTime,
          meanAirHeight,
          peakSpeed,
        },
        regionAccum,
        landMult,
      ),
    );
  }

  if (task === 'flight_glider') {
    const glideDist =
      Math.max(distance * 0.35, airborneTravel) / FLIGHT_GLIDER_DIST_SCALE;
    const base =
      (glideDist * 0.45 + meanScore * 0.35 + airScore * 0.2) *
        aeroPresenceScale(creature, 'glider') -
      (fell ? FALL_PENALTY * 0.5 : 0);
    return finish(
      withRegionScore(
        {
          fitness: base,
          distance,
          fell,
          footLifts,
          uprightQuality: 1,
          peakHeight,
          airTime,
          meanAirHeight,
          peakSpeed,
        },
        regionAccum,
        landMult,
      ),
    );
  }

  if (task === 'flight_para') {
    const soft =
      1 / (1 + Math.max(0, impactSpeed) / FLIGHT_PARA_IMPACT_SCALE);
    const floatScore = airTime / (1 + Math.max(0, peakHeight) * 0.08);
    const base =
      (floatScore * 0.45 + meanScore * 0.25 + soft * 0.3) *
        aeroPresenceScale(creature, 'parachute') -
      (fell ? FALL_PENALTY * 0.35 : 0);
    return finish(
      withRegionScore(
        {
          fitness: base,
          distance,
          fell,
          footLifts,
          uprightQuality: 1,
          peakHeight,
          airTime,
          meanAirHeight,
          peakSpeed,
        },
        regionAccum,
        landMult,
      ),
    );
  }

  // flight — sustain mean airborne height; peak alone (one-flap) is weak.
  const fitness =
    peakScore * 0.2 +
    meanScore * 0.5 +
    airScore * 0.3 -
    (fell ? FALL_PENALTY * 0.5 : 0);
  return finish(
    withRegionScore(
      {
        fitness,
        distance: avgJointX(creature) - startX,
        fell,
        footLifts,
        uprightQuality: 1,
        peakHeight,
        airTime,
        meanAirHeight,
        peakSpeed,
      },
      regionAccum,
    ),
  );
}

/** Morphology match 0.25…1 for bones tagged with the specialist aero type. */
export function aeroPresenceScale(
  creature: SpawnedCreature,
  type: AeroType,
): number {
  let area = 0;
  for (const b of creature.bones) {
    if (b.aeroType === type && (b.aeroArea ?? 0) > 0) {
      area += b.aeroArea ?? 0;
    }
  }
  if (area <= 0) return FLIGHT_AERO_MATCH_FLOOR;
  const t = Math.min(1, area / FLIGHT_AERO_AREA_FULL);
  return FLIGHT_AERO_MATCH_FLOOR + (1 - FLIGHT_AERO_MATCH_FLOOR) * t;
}

/** Track peak / airtime / mean airborne height (all joints above ground contact). */
export function updateJumpFlightTrackers(
  creature: SpawnedCreature,
  dt: number,
  peakHeight: number,
  airTime: number,
  airHeightIntegral = 0,
  airborneY = 0.55,
  impactSpeed = 0,
  airborneTravel = 0,
  prevAvgX: number | null = null,
): {
  peakHeight: number;
  airTime: number;
  airHeightIntegral: number;
  meanAirHeight: number;
  impactSpeed: number;
  airborneTravel: number;
  avgX: number;
} {
  const y = minJointY(creature);
  const avgX = avgJointX(creature);
  const nextPeak = Math.max(peakHeight, y);
  const airborne = creature.joints.every(
    (j) => j.body.translation().y > airborneY,
  );
  let nextAir = airTime;
  let nextIntegral = airHeightIntegral;
  let nextTravel = airborneTravel;
  let nextImpact = impactSpeed;
  if (airborne) {
    nextAir += dt;
    nextIntegral += y * dt;
    if (prevAvgX != null) {
      nextTravel += Math.max(0, avgX - prevAvgX);
    }
  } else if (y < FLIGHT_SOFT_LAND_Y) {
    let vySum = 0;
    for (const j of creature.joints) vySum += j.body.linvel().y;
    const vy = vySum / Math.max(1, creature.joints.length);
    if (vy < 0) nextImpact = Math.max(nextImpact, -vy);
  }
  return {
    peakHeight: nextPeak,
    airTime: nextAir,
    airHeightIntegral: nextIntegral,
    meanAirHeight: nextAir > 1e-6 ? nextIntegral / nextAir : 0,
    impactSpeed: nextImpact,
    airborneTravel: nextTravel,
    avgX,
  };
}

/** Human-readable score terms for B10 rewards breakdown (pure; no physics). */
export interface ScoreTerm {
  label: string;
  value: string;
  note?: string;
}

export function explainTaskScore(
  task: TaskId,
  metrics: TaskEpisodeMetrics,
): ScoreTerm[] {
  const terms: ScoreTerm[] = [
    { label: 'Fitness', value: metrics.fitness.toFixed(3) },
  ];
  const dist = metrics.distance;
  const lifts = metrics.footLifts;
  const liftQ = runLiftQuality(dist, lifts);

  if (task === 'run' || task === 'rough') {
    terms.push(
      { label: 'Distance', value: `${dist.toFixed(2)} m` },
      {
        label: 'Foot lifts',
        value: String(lifts),
        note: `lift quality ${liftQ.toFixed(2)}`,
      },
      { label: 'Upright', value: metrics.uprightQuality.toFixed(2) },
    );
  } else if (task === 'speed') {
    terms.push(
      {
        label: 'Peak speed',
        value: `${metrics.peakSpeed.toFixed(2)} m/s`,
        note: `÷ ${SPEED_PEAK_SCALE}`,
      },
      {
        label: 'Distance',
        value: `${dist.toFixed(2)} m`,
        note: `÷ ${SPEED_DIST_SCALE}`,
      },
      { label: 'Upright', value: metrics.uprightQuality.toFixed(2) },
    );
  } else if (task === 'sprint') {
    terms.push(
      { label: 'Checkpoints', value: String(metrics.checkpointsHit) },
      {
        label: 'Finished',
        value: metrics.finished ? 'yes' : 'no',
        note:
          metrics.finishTime != null
            ? `t=${metrics.finishTime.toFixed(2)}s`
            : undefined,
      },
      { label: 'Distance', value: `${dist.toFixed(2)} m` },
      { label: 'Upright', value: metrics.uprightQuality.toFixed(2) },
    );
  } else if (task === 'stay') {
    terms.push(
      {
        label: 'Upright mean',
        value: metrics.uprightQuality.toFixed(2),
        note: `÷ ${STAY_UPRIGHT_SCALE}`,
      },
    );
  } else if (task === 'jump') {
    terms.push(
      {
        label: 'Peak height',
        value: `${metrics.peakHeight.toFixed(2)} m`,
        note: `÷ ${JUMP_HEIGHT_SCALE}`,
      },
      {
        label: 'Air time',
        value: `${metrics.airTime.toFixed(2)} s`,
        note: '× 0.15',
      },
      { label: 'Upright', value: metrics.uprightQuality.toFixed(2) },
    );
  } else if (task === 'hang') {
    terms.push(
      {
        label: 'Air time',
        value: `${metrics.airTime.toFixed(2)} s`,
        note: `× ${HANG_TIME_SCALE}`,
      },
      {
        label: 'Peak height',
        value: `${metrics.peakHeight.toFixed(2)} m`,
      },
    );
  } else if (task === 'longjump') {
    terms.push(
      {
        label: 'Distance',
        value: `${dist.toFixed(2)} m`,
        note: `÷ ${LONG_JUMP_DIST_SCALE}`,
      },
      {
        label: 'Air time',
        value: `${metrics.airTime.toFixed(2)} s`,
      },
      { label: 'Upright', value: metrics.uprightQuality.toFixed(2) },
    );
  } else if (task === 'climb') {
    terms.push(
      {
        label: 'Peak height',
        value: `${metrics.peakHeight.toFixed(2)} m`,
        note: `÷ ${CLIMB_HEIGHT_SCALE}`,
      },
      {
        label: 'Forward',
        value: `${dist.toFixed(2)} m`,
        note: '× 0.05',
      },
      { label: 'Upright', value: metrics.uprightQuality.toFixed(2) },
    );
  } else if (task === 'motor') {
    terms.push(
      {
        label: 'Distance',
        value: `${dist.toFixed(2)} m`,
        note: `÷ ${MOTOR_DIST_SCALE}`,
      },
      { label: 'Upright', value: metrics.uprightQuality.toFixed(2) },
    );
  } else if (isFlightTask(task)) {
    terms.push(
      {
        label: 'Mean air height',
        value: `${metrics.meanAirHeight.toFixed(2)} m`,
        note: `÷ ${FLIGHT_MEAN_HEIGHT_SCALE}`,
      },
      {
        label: 'Air time',
        value: `${metrics.airTime.toFixed(2)} s`,
        note: `÷ ${FLIGHT_AIR_SCALE}`,
      },
      {
        label: 'Peak height',
        value: `${metrics.peakHeight.toFixed(2)} m`,
        note: `÷ ${FLIGHT_HEIGHT_SCALE}`,
      },
      {
        label: 'Distance',
        value: `${dist.toFixed(2)} m`,
      },
    );
  }

  if (metrics.fell) {
    terms.push({
      label: 'Fall penalty',
      value: isFlightTask(task)
        ? `−${(FALL_PENALTY * 0.5).toFixed(2)}`
        : `−${FALL_PENALTY.toFixed(2)}`,
    });
  }
  if (metrics.regionPenalty > 0) {
    terms.push({
      label: 'Zone penalty',
      value: `−${metrics.regionPenalty.toFixed(2)}`,
      note: 'time in penalty zones',
    });
  }
  if (metrics.regionReward > 0) {
    terms.push({
      label: 'Zone / landing reward',
      value: `+${metrics.regionReward.toFixed(2)}`,
      note: 'touch-once',
    });
  }
  if (metrics.courseArmed || metrics.checkpointsHit > 0 || metrics.finished) {
    const race =
      metrics.raceTime != null ? `${metrics.raceTime.toFixed(2)}s` : '—';
    terms.push({
      label: 'Course timer',
      value: metrics.finished ? `finish ${race}` : race,
      note: metrics.finished
        ? `${metrics.checkpointsHit} CP · race clock`
        : metrics.courseArmed
          ? `${metrics.checkpointsHit} CP · since start`
          : 'waiting for start',
    });
  }
  return terms;
}

/** Short scoring legend for a goal (B4), without live metrics. */
export function scoringLegendForTask(task: TaskId): string {
  const zoneNote =
    ' Env zones: penalty time-in-zone · reward touch-once. Course markers for Sprint.';
  switch (task) {
    case 'run':
      return (
        'Forward distance × foot-lift quality × upright − fall.' + zoneNote
      );
    case 'speed':
      return 'Peak horizontal speed + travel × upright − fall.' + zoneNote;
    case 'sprint':
      return (
        'Peak forward progress + ordered checkpoints + finish-time bonus × upright; fall keeps a progress floor. Place start/finish in World.' +
        zoneNote
      );
    case 'stay':
      return 'Mean supported upright posture − fall.' + zoneNote;
    case 'rough':
      return (
        'Hill distance × foot-lift quality × upright − fall.' + zoneNote
      );
    case 'jump':
      return 'Peak height + air time × upright − fall.' + zoneNote;
    case 'hang':
      return 'Air time (primary) + light peak height − fall.' + zoneNote;
    case 'longjump':
      return 'Horizontal jump distance + light air time × upright − fall.' + zoneNote;
    case 'climb':
      return 'Peak height + slight forward × upright − fall.' + zoneNote;
    case 'motor':
      return 'Wheeled forward distance × upright − fall.' + zoneNote;
    case 'flight':
      return (
        'Mean airborne height (50%) + air time (30%) + peak (20%) − light fall. One-flap coasts score poorly.' +
        zoneNote
      );
    case 'flight_wing':
      return (
        'Wing climb/sustain (peak + mean + air) × wing aero match; landing zones heavily weighted. Place launch pad + landing.' +
        zoneNote
      );
    case 'flight_glider':
      return (
        'Airborne range + mean height × glider aero match; landing zones heavily weighted. Place launch pad + landing.' +
        zoneNote
      );
    case 'flight_para':
      return (
        'Float time + soft descent × parachute aero match; landing zones heavily weighted. Place launch pad + landing.' +
        zoneNote
      );
    case 'dance':
      return 'Disco imitation fitness (1 / (1 + MSE)); not GA-evolved.';
    default:
      return 'Task fitness from episode metrics.' + zoneNote;
  }
}

export { updateFallState };
