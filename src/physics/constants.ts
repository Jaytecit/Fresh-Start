/** Tunable Keiwan-inspired physics constants (Rapier world scale). */

export const FIXED_DT = 1 / 60;

/**
 * Environment world units vs creature authoring units.
 * Env Studio grid / obstacle / course sizes are this many times larger than
 * creature-editor joints so courses read at creature scale in the shared world.
 */
export const ENV_WORLD_SCALE = 5;

/** Evolution default gravity is -50 Unity units; retuned for Rapier meter-ish scale. */
export const GRAVITY_Y = -38;

export const JOINT_RADIUS = 0.28;
export const BONE_HALF_WIDTH = 0.14;

/**
 * Soft CCD prediction distance (m) on creature joints/bones when moving fast.
 * Prevents tunneling into static obstacles; 0 disables.
 * Applied only when body speed ≥ SOFT_CCD_SPEED_GATE so slow ground gait /
 * idle plant-brake feel stays intact.
 * See docs/adr/20260806-creature-soft-ccd.md.
 */
export const SOFT_CCD_PREDICTION = 0.5;
/** Min |linvel| (m/s) before soft CCD prediction is armed on a body. */
export const SOFT_CCD_SPEED_GATE = 24;

export const DEFAULT_JOINT_MASS = 1.0;
export const DEFAULT_BONE_MASS = 1.0;

/** K4/K5 — non-solving Boxing probe and ring constants. */
export const BOXING_GLOVE_PROBE_RADIUS = JOINT_RADIUS * 1.35;
export const BOXING_TARGET_PROBE_RADIUS = JOINT_RADIUS * 1.65;
export const BOXING_MIN_CLOSING_SPEED = 0.35;
export const BOXING_MAX_POWER = 80;
export const BOXING_HIT_COOLDOWN = 0.16;
export const BOXING_SPAWN_X = 12;
export const BOXING_RING_HALF_WIDTH = 27.5;
export const BOXING_RING_WALL_WIDTH = 1.75;
export const BOXING_RING_WALL_HEIGHT = 17.5;
export const BOXING_MATCH_SECONDS = 45;
/** Instant upright below this counts as down (knockdown clock). */
export const BOXING_DOWN_UPRIGHT = 0.35;
/** Instant upright at/above this (and not fallen) beats the count. */
export const BOXING_RECOVER_UPRIGHT = 0.5;
/** Joint clearance below this counts as fallen / on the canvas. */
export const BOXING_DOWN_CLEARANCE = 0.12;
/** Referee 10-count length (seconds) while a fighter is down. */
export const BOXING_COUNT_SECONDS = 10;
/**
 * Rare TKO: head hit must be this hard (gloveMass × closingSpeed, cap BOXING_MAX_POWER).
 * Typical scored punches sit well below this; only committed, heavy shots qualify.
 */
export const BOXING_TKO_MIN_POWER = 40;
/** Rare TKO: fraction of relative speed aimed at the head centre. */
export const BOXING_TKO_MIN_ACCURACY = 0.88;
/** Lateral gap between parallel training pairs (spatial isolation). */
export const BOXING_TRAIN_PAIR_GAP = 80;

/** L4/L5 — non-solving Jousting probe and lane constants. */
export const JOUST_LANCE_PROBE_RADIUS = JOINT_RADIUS * 1.7;
export const JOUST_TARGET_PROBE_RADIUS = JOINT_RADIUS * 1.65;
export const JOUST_MIN_CLOSING_SPEED = 0.45;
export const JOUST_MAX_POWER = 120;
export const JOUST_HIT_COOLDOWN = 0.2;
export const JOUST_SPAWN_X = 50;
export const JOUST_LANE_HALF_WIDTH = 70;
export const JOUST_LANE_WALL_WIDTH = 2;
export const JOUST_LANE_WALL_HEIGHT = 18;
export const JOUST_MAX_SECONDS = 12;
export const JOUST_AFTERMATH_SECONDS = 2.5;
/** Lateral gap between parallel joust training pairs (lane is long). */
export const JOUST_TRAIN_PAIR_GAP = 220;

/** SpringJoint-like restore toward rest length (Evolution: spring=1000, damper=50). */
export const MUSCLE_SPRING = 360;
export const MUSCLE_DAMPER = 24;

/** Active contract/expand force scale (Evolution MaxForce ≈ 1500). */
export const MUSCLE_MAX_FORCE = 720;

export const GROUND_RESTITUTION = 0.05;
/**
 * Universal surface grip (Train-dock slider).
 * Applied to ground, ramps, stairs/boxes/pits/loops, terrain, and tower with
 * CoefficientCombineRule.Max so contact μ ≈ this value (not averaged down by
 * body/foot μ). Runtime range [0, WORLD_GRIP_MAX].
 */
export const WORLD_GRIP = 1.85;
/**
 * Train UI / clamp ceiling for world grip.
 * Rapier allows any μ ≥ 0 with no engine hard-max; with Max combine,
 * 10 is a practical near-lock contact coefficient.
 */
export const WORLD_GRIP_MAX = 10;
/** @deprecated Use WORLD_GRIP — kept for older call sites / smokes. */
export const GROUND_FRICTION = WORLD_GRIP;
/** @deprecated Use WORLD_GRIP */
export const RAMP_FRICTION = WORLD_GRIP;
/** @deprecated Use WORLD_GRIP_MAX */
export const RAMP_FRICTION_MAX = WORLD_GRIP_MAX;
/** Bone capsules / generic body material. */
export const BODY_FRICTION = 0.55;
export const BODY_RESTITUTION = 0.02;
/**
 * Ball joint colliders — stickier than bones so contact surfaces grip.
 * Feet use FOOT_FRICTION; unmarked joints use JOINT_FRICTION; wheels keep
 * BODY_FRICTION so motor carts still roll.
 */
export const JOINT_FRICTION = 1.35;
/** Optimal default grip for marked non-wheel foot nodes. */
export const FOOT_FRICTION = 2.2;
/** Train UI / clamp ceiling for marked foot-node grip. */
export const FOOT_FRICTION_MAX = 10;

export const LINEAR_DAMPING = 0.08;
export const ANGULAR_DAMPING = 0.12;
/**
 * Ball joints resist rolling more than bones (rolling spheres ignore μ).
 * Feet use FOOT_ANGULAR_DAMPING; wheels keep ANGULAR_DAMPING.
 */
export const JOINT_ANGULAR_DAMPING = 0.45;
export const FOOT_ANGULAR_DAMPING = 0.85;

/** Floor plane y of top surface. */
export const GROUND_Y = 0;

/**
 * Plant slide / purchase band (Idle settle + Evolve/brain).
 * Skipped for flight/motor tasks. Strength scales with Train-dock Anti-scoot.
 */
export const PLANT_SLIDE_Y = 0.42;
/**
 * @deprecated Flat plants no longer use bidirectional X damp — they use the
 * same adverse-direction along-surface brake as ramps (`SURFACE_TANGENT_BRAKE`).
 * Kept for older call sites / smokes that still import the name.
 */
export const PLANT_SLIDE_BRAKE = 0.45;
/**
 * Ball-foot purchase (scaled by Train-dock Anti-scoot):
 * - SURFACE_ANTI_ROLL: |angvel| kill per fixed step on any planted surface
 * - SURFACE_STANCE_STICK: bidirectional along-surface damp when |along| is
 *   below STANCE_STICK_SPEED (kills muscle-driven micro-skid so feet plant)
 * - SURFACE_TANGENT_BRAKE: adverse along-surface kill above the stick band
 *   (tilted: downhill only; flat: opposite of intended gait — default −X
 *   so fast +X is kept; mirrored corners pass forwardX = −1).
 * Coulomb μ alone does not stop rolling spheres.
 */
export const SURFACE_ANTI_ROLL = 0.95;
export const SURFACE_TANGENT_BRAKE = 0.95;
/** Along-surface speed (m/s) below which stance stick is bidirectional. */
export const STANCE_STICK_SPEED = 0.5;
/**
 * Bidirectional along-surface kill per fixed step inside the stick band
 * (scaled by Anti-scoot). Keeps planted feet from jittering under muscle load.
 */
export const SURFACE_STANCE_STICK = 0.85;
/**
 * Train-dock Anti-scoot default (1 = tuned SURFACE_* response).
 * Runtime range [0, ANTI_SCOOT_MAX]; 0 disables plant purchase.
 */
export const ANTI_SCOOT = 1;
export const ANTI_SCOOT_MAX = 3;
/** @deprecated Use SURFACE_ANTI_ROLL */
export const RAMP_ANTI_ROLL = SURFACE_ANTI_ROLL;
/** @deprecated Use SURFACE_TANGENT_BRAKE */
export const RAMP_TANGENT_BRAKE = SURFACE_TANGENT_BRAKE;
/** @deprecated Use PLANT_SLIDE_Y */
export const IDLE_PLANT_Y = PLANT_SLIDE_Y;
/** @deprecated Use PLANT_SLIDE_BRAKE */
export const IDLE_PLANT_BRAKE = PLANT_SLIDE_BRAKE;

/** Motor wheel torque scale — applied as addTorque each fixed step. */
export const MOTOR_TORQUE_SCALE = 28;

/** Aero-like coefficients — area lift/drag when structural part type is omitted. */
export const AERO_DRAG_COEFF = 0.55;
export const AERO_LIFT_COEFF = 0.85;
/**
 * Cap velocity magnitude used in aero force math.
 * Launch-pad ballistic speeds (~100–300) make v² drag/lift explode joints into NaN
 * and panic Rapier WASM; flapping/glide stay well below this.
 */
export const AERO_SPEED_FORCE_CAP = 48;

/**
 * Wing — downstroke lift (world +Y) from descending wing speed.
 * Symmetric paddle pressure self-brakes flaps and cancels over a cycle;
 * this model only authorizes lift on the downstroke (feathered recovery).
 */
export const WING_FLAP_LIFT_COEFF = 18;
/** Light residual paddle drag so wings still feel air both ways. */
export const WING_PADDLE_DRAG_COEFF = 0.35;

/** Glider — rigid sail AoA lift/drag. */
export const GLIDER_LIFT_COEFF = 1.05;
export const GLIDER_DRAG_COEFF = 0.35;

/**
 * Parachute — inflation drag (jointed canopy chain).
 * Inflates when cupped into relative wind; streams edge-on with low drag.
 */
export const PARA_DRAG_COEFF = 2.4;
export const PARA_INFLATE_RATE = 4.5;
export const PARA_DEFLATE_RATE = 2.2;
/** Residual drag scale when fully streamed (inflation ≈ 0). */
export const PARA_STREAM_DRAG_SCALE = 0.08;

/** Static obstacle size clamps (full widths before half-extents). */
export const OBSTACLE_MIN_SIZE = 0.6;
/**
 * Authored env geometry max — large enough for Environment Studio’s 5× world
 * scale plus wide course framing. Soft cap only; not “infinite” so Rapier/JSON
 * stay sane.
 */
export const OBSTACLE_MAX_SIZE = 10000;
/** Default ramp tilt (rad) when EnvObstacle.rot omitted. */
export const OBSTACLE_DEFAULT_RAMP_ROT = -0.4;
/** Stair step count for authored stair obstacles. */
export const OBSTACLE_STAIR_STEPS = 4;
/** Loop ring segment count (open at bottom). */
export const OBSTACLE_LOOP_SEGMENTS = 10;

/** Terrain heightfield clamps. */
export const TERRAIN_MIN_SAMPLES = 2;
export const TERRAIN_MAX_SAMPLES = 512;
export const TERRAIN_MIN_WIDTH = 5;
export const TERRAIN_MAX_WIDTH = 10000;
export const TERRAIN_MAX_AMPLITUDE = 1000;
/** Environment Studio default drawable / sine span. */
export const TERRAIN_DEFAULT_START_X = 0;
export const TERRAIN_DEFAULT_END_X = 40;
export const TERRAIN_DEFAULT_AMPLITUDE = 1.2;
export const TERRAIN_DEFAULT_SAMPLES = 41;
export const TERRAIN_DEFAULT_WAVES = 2.5;
export const TERRAIN_MIN_WAVES = 0.5;
export const TERRAIN_MAX_WAVES = 12;
/** Obs[8] divisor — grade ≈ dy/dx / TERRAIN_GRADE_SCALE. */
export const TERRAIN_GRADE_SCALE = 2;

/**
 * Rough-terrain course (task-owned sine heightfield).
 * Starts ahead of typical spawn so the creature enters hills on flat ground.
 */
export const ROUGH_COURSE_START_X = 15;
export const ROUGH_COURSE_END_X = 215;
export const ROUGH_COURSE_AMPLITUDE = 6;
export const ROUGH_COURSE_SAMPLES = 41;
export const ROUGH_COURSE_WAVES = 2.5;

/** Environment Studio creature spawn marker clamps (world units). */
export const SPAWN_MIN_X = -10000;
export const SPAWN_MAX_X = 10000;
export const SPAWN_MIN_Y = 0;
export const SPAWN_MAX_Y = 4000;

/**
 * H2 disco arena walls — inner faces near ±DISCO_WALL_X (ruler units).
 * Pair with DISCO_CAM_ZOOM_* so the full floor fits at default zoom-out.
 */
export const DISCO_WALL_X = 250;
export const DISCO_WALL_W = 3.5;
export const DISCO_WALL_H = 120;
/** SimCanvas zoom floor / default overview for the disco arena. */
export const DISCO_CAM_ZOOM_MIN = 1.6;
export const DISCO_CAM_ZOOM_DEFAULT = 1.6;
export const DISCO_CAM_Y = 30;

/** Default disco-ball world position (render FX; drag to reposition). */
export const DEFAULT_DISCO_BALL_X = 0;
export const DEFAULT_DISCO_BALL_Y = 85;
/** Soft clamp for dragging the ball inside the arena. */
export const DISCO_BALL_X_MAX = DISCO_WALL_X * 0.92;
export const DISCO_BALL_Y_MIN = 10;
export const DISCO_BALL_Y_MAX = DISCO_WALL_H * 0.95;

/**
 * H2 disco puppet modes — disco-arena only. Evolve/Edit use base muscle
 * constants and default gravityScale / damping from spawn.
 */
export type DiscoPuppetMode =
  | 'natural'
  | 'stiffStrings'
  | 'marionette'
  | 'fullPuppet';

export interface DiscoPuppetTune {
  springMult: number;
  damperMult: number;
  maxForceMult: number;
  /** Rapier rigid-body gravity scale (1 = world gravity). */
  gravityScale: number;
  linearDamping: number;
  angularDamping: number;
  /**
   * When > 0, drive also shifts effective rest length:
   * rest * (1 - drive * restLengthDrive). Contract shortens the “string”.
   */
  restLengthDrive: number;
}

export const DISCO_PUPPET_MODES: Record<DiscoPuppetMode, DiscoPuppetTune> = {
  natural: {
    springMult: 1,
    damperMult: 1,
    maxForceMult: 1,
    gravityScale: 1,
    linearDamping: LINEAR_DAMPING,
    angularDamping: ANGULAR_DAMPING,
    restLengthDrive: 0,
  },
  stiffStrings: {
    springMult: 3.5,
    damperMult: 2.5,
    maxForceMult: 1.8,
    gravityScale: 1,
    linearDamping: LINEAR_DAMPING,
    angularDamping: ANGULAR_DAMPING,
    restLengthDrive: 0,
  },
  marionette: {
    springMult: 4.5,
    damperMult: 3,
    maxForceMult: 1.5,
    gravityScale: 0.35,
    linearDamping: 0.14,
    angularDamping: 0.22,
    restLengthDrive: 0.22,
  },
  fullPuppet: {
    springMult: 7,
    damperMult: 4.5,
    maxForceMult: 1.2,
    gravityScale: 0.08,
    linearDamping: 0.28,
    angularDamping: 0.4,
    restLengthDrive: 0.35,
  },
};

export const DISCO_PUPPET_MODE_LABELS: {
  id: DiscoPuppetMode;
  label: string;
}[] = [
  { id: 'natural', label: 'Natural' },
  { id: 'stiffStrings', label: 'Stiff strings' },
  { id: 'marionette', label: 'Marionette' },
  { id: 'fullPuppet', label: 'Full puppet' },
];

export const DEFAULT_DISCO_PUPPET_MODE: DiscoPuppetMode = 'fullPuppet';

/**
 * Mass for joints marked `isFoot` (heavier feet plant harder).
 * Used in Edit / Play / Train / Disco when `CreatureDesign.footMass` is set.
 * Default matches DEFAULT_JOINT_MASS so unmarked designs keep prior feel.
 */
export const FOOT_MASS_MIN = 1;
export const FOOT_MASS_MAX = 96;
export const FOOT_MASS_DEFAULT = DEFAULT_JOINT_MASS;
/** @deprecated Use FOOT_MASS_MIN — kept for Disco setup JSON compat. */
export const DISCO_FOOT_MASS_MIN = FOOT_MASS_MIN;
/** @deprecated Use FOOT_MASS_MAX */
export const DISCO_FOOT_MASS_MAX = FOOT_MASS_MAX;
/**
 * Historic Disco panel default (heavy plant). New creature designs use
 * FOOT_MASS_DEFAULT unless the author raises the builder slider.
 */
export const DISCO_FOOT_MASS_DEFAULT = 96;

export function clampFootMass(value: number): number {
  if (!Number.isFinite(value)) return FOOT_MASS_DEFAULT;
  return Math.min(FOOT_MASS_MAX, Math.max(FOOT_MASS_MIN, value));
}

/**
 * Mass for joints marked `isWheel` (heavier wheels bias CG for airborne pivot).
 * Same range as foot mass; omit → DEFAULT_JOINT_MASS / joint.mass.
 * When a joint is both foot and wheel, wheel mass wins at spawn / retune.
 */
export const WHEEL_MASS_MIN = FOOT_MASS_MIN;
export const WHEEL_MASS_MAX = FOOT_MASS_MAX;
export const WHEEL_MASS_DEFAULT = DEFAULT_JOINT_MASS;

export function clampWheelMass(value: number): number {
  if (!Number.isFinite(value)) return WHEEL_MASS_DEFAULT;
  return Math.min(WHEEL_MASS_MAX, Math.max(WHEEL_MASS_MIN, value));
}

/** Launch tower clamps / proportions. */
export const TOWER_MIN_BASE_W = 3;
export const TOWER_MAX_BASE_W = 2000;
export const TOWER_MIN_HEIGHT = 4;
export const TOWER_MAX_HEIGHT = 4000;
/** Deck slab thickness (world units). */
export const TOWER_DECK_THICKNESS = 1.1;
/** Stem width as a fraction of baseW. */
export const TOWER_STEM_WIDTH_RATIO = 0.42;

/**
 * Launch pad — vertical boost.
 * Per-pad authored apex (ruler units) → VY = √(2|g|h) × damping compensation.
 * Builder slider clamps to [APEX_MIN, APEX_MAX]; default APEX_H.
 */
export const LAUNCH_PAD_APEX_MIN = 500;
export const LAUNCH_PAD_APEX_MAX = 5000;
export const LAUNCH_PAD_APEX_H = 900;
/** Multiplier on ideal √(2gh) so measured peak ≈ authored apex under drag/scrub. */
export const LAUNCH_PAD_DAMPING_COMP = 1.12;

/** Clamp authored / imported launch apex into the builder range. */
export function clampLaunchPadApex(value: number | undefined): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : LAUNCH_PAD_APEX_H;
  return Math.min(LAUNCH_PAD_APEX_MAX, Math.max(LAUNCH_PAD_APEX_MIN, n));
}

/** Upward linvel for a target approximate apex height. */
export function launchPadVyForApex(apex: number): number {
  const h = clampLaunchPadApex(apex);
  return Math.sqrt(2 * Math.abs(GRAVITY_Y) * h) * LAUNCH_PAD_DAMPING_COMP;
}

/** @deprecated Prefer launchPadVyForApex(pad.launchApex) — default-pad VY. */
export const LAUNCH_PAD_VY = launchPadVyForApex(LAUNCH_PAD_APEX_H);
/** Lift off the deck on fire so contact solve cannot scrub the boost. */
export const LAUNCH_PAD_CLEARANCE = 6;
/**
 * Top-face proximity for foot centers when Rapier contact pairs miss a thin slab.
 * Kept close to the drawn deck (≈ foot radius), not a large halo.
 */
export const LAUNCH_PAD_PROXIMITY = JOINT_RADIUS * 0.55;
/** Re-assert upward speed for this many steps after contact fire. */
export const LAUNCH_PAD_BOOST_STEPS = 8;
/** Default authored pad size (thin deck). */
export const LAUNCH_PAD_DEFAULT_W = 16;
export const LAUNCH_PAD_DEFAULT_H = 1.4;
