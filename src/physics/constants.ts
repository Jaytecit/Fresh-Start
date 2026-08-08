/** Tunable Keiwan-inspired physics constants (Rapier world scale). */

export const FIXED_DT = 1 / 60;

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
 * - SURFACE_TANGENT_BRAKE: adverse along-surface kill on **every** surface
 *   (tilted: downhill only; flat: world-left / −X only so +X forward is kept).
 * Coulomb μ alone does not stop rolling spheres.
 */
export const SURFACE_ANTI_ROLL = 0.95;
export const SURFACE_TANGENT_BRAKE = 0.95;
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

/** Motor wheel torque scale (E6.5) — applied as addTorque each fixed step. */
export const MOTOR_TORQUE_SCALE = 28;

/** Aero-like coefficients (E6.6) — Fresh Start design, not parent tables. */
export const AERO_DRAG_COEFF = 0.55;
export const AERO_LIFT_COEFF = 0.85;

/**
 * G10 wing — downstroke lift (world +Y) from descending wing speed.
 * Symmetric paddle pressure self-brakes flaps and cancels over a cycle;
 * this model only authorizes lift on the downstroke (feathered recovery).
 */
export const WING_FLAP_LIFT_COEFF = 18;
/** Light residual paddle drag so wings still feel air both ways. */
export const WING_PADDLE_DRAG_COEFF = 0.35;

/** G10 glider — rigid sail AoA lift/drag. */
export const GLIDER_LIFT_COEFF = 1.05;
export const GLIDER_DRAG_COEFF = 0.35;

/**
 * G10 parachute — inflation drag (jointed canopy chain).
 * Inflates when cupped into relative wind; streams edge-on with low drag.
 */
export const PARA_DRAG_COEFF = 2.4;
export const PARA_INFLATE_RATE = 4.5;
export const PARA_DEFLATE_RATE = 2.2;
/** Residual drag scale when fully streamed (inflation ≈ 0). */
export const PARA_STREAM_DRAG_SCALE = 0.08;

/** G1 static obstacle size clamps (full widths before half-extents). */
export const OBSTACLE_MIN_SIZE = 0.12;
export const OBSTACLE_MAX_SIZE = 40;
/** Default ramp tilt (rad) when EnvObstacle.rot omitted. */
export const OBSTACLE_DEFAULT_RAMP_ROT = -0.4;
/** Stair step count for authored stair obstacles. */
export const OBSTACLE_STAIR_STEPS = 4;
/** Loop ring segment count (open at bottom). */
export const OBSTACLE_LOOP_SEGMENTS = 10;

/** G3 terrain heightfield clamps. */
export const TERRAIN_MIN_SAMPLES = 2;
export const TERRAIN_MAX_SAMPLES = 256;
export const TERRAIN_MIN_WIDTH = 1;
export const TERRAIN_MAX_WIDTH = 200;
export const TERRAIN_MAX_AMPLITUDE = 20;
/** Obs[8] divisor — grade ≈ dy/dx / TERRAIN_GRADE_SCALE. */
export const TERRAIN_GRADE_SCALE = 2;

/**
 * E6.8 rough-terrain course (task-owned sine heightfield).
 * Starts ahead of typical spawn so the creature enters hills on flat ground.
 */
export const ROUGH_COURSE_START_X = 3;
export const ROUGH_COURSE_END_X = 43;
export const ROUGH_COURSE_AMPLITUDE = 1.2;
export const ROUGH_COURSE_SAMPLES = 41;
export const ROUGH_COURSE_WAVES = 2.5;

/** Environment Studio creature spawn marker clamps (world units). */
export const SPAWN_MIN_X = -200;
export const SPAWN_MAX_X = 200;
export const SPAWN_MIN_Y = 0;
export const SPAWN_MAX_Y = 80;

/**
 * H2 disco arena walls — inner faces near ±DISCO_WALL_X (ruler units).
 * Pair with DISCO_CAM_ZOOM_* so the full floor fits at default zoom-out.
 */
export const DISCO_WALL_X = 50;
export const DISCO_WALL_W = 0.7;
export const DISCO_WALL_H = 24;
/** SimCanvas zoom floor / default overview for the disco arena. */
export const DISCO_CAM_ZOOM_MIN = 8;
export const DISCO_CAM_ZOOM_DEFAULT = 8;
export const DISCO_CAM_Y = 6;

/** Default disco-ball world position (render FX; drag to reposition). */
export const DEFAULT_DISCO_BALL_X = 0;
export const DEFAULT_DISCO_BALL_Y = 17;
/** Soft clamp for dragging the ball inside the arena. */
export const DISCO_BALL_X_MAX = DISCO_WALL_X * 0.92;
export const DISCO_BALL_Y_MIN = 2;
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
 * Disco-only mass for joints marked `isFoot` (heavier feet resist float-away).
 * Evolve/Edit keep authored / DEFAULT_JOINT_MASS.
 */
export const DISCO_FOOT_MASS_MIN = 1;
export const DISCO_FOOT_MASS_MAX = 96;
export const DISCO_FOOT_MASS_DEFAULT = 96;

/** C2.4 launch tower clamps / proportions. */
export const TOWER_MIN_BASE_W = 0.6;
export const TOWER_MAX_BASE_W = 30;
export const TOWER_MIN_HEIGHT = 0.8;
export const TOWER_MAX_HEIGHT = 40;
/** Deck slab thickness (world units). */
export const TOWER_DECK_THICKNESS = 0.22;
/** Stem width as a fraction of baseW. */
export const TOWER_STEM_WIDTH_RATIO = 0.42;
