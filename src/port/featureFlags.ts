/**
 * Runtime feature flags. Disabled flags hide UI and skip related spawn/eval paths.
 */
export const featureFlags = {
  /** Googly eyes on joints. */
  googlyEyes: true,
  /** Sprite body-part library. */
  spriteBodyParts: true,
  /** Render lerp / velocity extrapolate between fixed physics ticks. */
  visualPoseInterpolation: true,
  /** Sim axis rulers (edge-pinned height / distance). */
  simAxisRulers: true,
  /** Parallax sky / clouds behind the sim. */
  parallaxSky: true,
  /** MLP network visualizer. */
  networkVisualizer: true,
  /** Skeleton vs cosmetics render modes. */
  cosmeticsRenderModes: false,

  /** Skill strip tabs (Walk / Jump / Fly / …). */
  skillTabs: true,
  /** @deprecated Use skillTabs */
  zoneTabs: true,
  /** Sandbox menu shell (left tabs + sim bottom dock). */
  sandboxMenuShell: true,
  /** Stats panel. */
  statsPanel: true,
  /** Train/observe speed controls. */
  controlPanel: true,
  /** Performance diagnostics. */
  performanceDiagnostics: true,
  /** Discovery / trophies UI. */
  discoveryUi: true,
  /** Creature library panel. */
  creatureLibrary: true,
  /** Skill categories in the creature library (auto-place + valid moves). */
  librarySkillCategories: true,
  /** Immersive fullscreen. */
  immersiveFullscreen: true,

  /** Marquee multi-select + copy / mirror / scale / rotate. */
  editorMultiSelectTransforms: true,
  /** Share codes. */
  shareCodes: false,
  /** JSON import/export. */
  jsonImportExport: true,
  /** Public share links (Vercel Blob / local share API). */
  creatureSharing: true,
  /** Opt-in public creations library (catalog + Creatures gallery). */
  publicCreationsLibrary: true,

  /** Elite replay. */
  eliteReplay: false,
  /** Best-ever ledger. */
  bestEverLedger: true,
  /** Saved models / continue training. */
  savedModels: true,
  /** Train dock IA + plain labels. */
  trainDockIa: true,
  /** Population / batch / mutation recipes. */
  trainRecipes: true,
  /** Start-from + selection advanced. */
  trainStartFrom: true,
  /** Annealing / adaptive try / crossover. */
  trainSchedules: true,
  /** Goal priorities + stage trainer. */
  goalPriorities: true,
  /** Progressive course windows (Gauntlet spawn/finish stages). */
  courseCurriculum: true,
  /**
   * Optional Rapier raycast whiskers appended to loco observations.
   * UI toggle defaults off; incompatible with brains trained on base OBS_COUNT.
   */
  raycastObservations: true,
  /** Practice extras (rival ghost, messy bodies). */
  trainExperiences: true,
  /** Shareable recipes / experiment packs. */
  experimentPacks: true,
  /** Training telemetry log (gen-champion capture + insights). */
  trainTelemetryLog: true,
  /** Soft morphology evolution (fixed topology morph genes). */
  morphEvolve: true,
  /** Grow/prune joints/bones/muscles (nested under morphEvolve). */
  structuralMorphEvolve: true,

  /** Goal catalog framework. */
  goalCatalog: true,
  /** Secret goal system. */
  secretGoals: true,
  /** Task families. */
  taskJump: true,
  taskClimb: true,
  taskMotor: true,
  taskFlight: true,
  taskRoughTerrain: true,
  taskSprint: true,
  taskSpeed: true,
  taskStay: true,
  taskHang: true,
  taskLongJump: true,

  /** Creature packages repository. */
  creaturePackages: true,
  /** Finished models shelf. */
  finishedModels: false,
  /** Bundled models. */
  bundledModels: true,
  /** Environments repository. */
  environmentsRepo: true,

  /** Climb step course. */
  climbCourse: true,
  /** Static obstacles (authored set). */
  staticObstacles: true,
  /** Terrain heightfield (authored). */
  terrainHeightfield: true,
  /** Task-owned rough terrain course (reuses heightfield spawn). */
  roughTerrainCourse: true,
  /** Launch tower. */
  launchTower: true,
  /** Launch pad obstacle (contact → authored apex boost). */
  launchPads: true,
  /** Score regions (penalty / reward AABBs, time-in-zone). */
  scoreRegions: true,
  /** End individual try once a landing region credits. */
  endEpisodeOnLanding: true,
  /** Start / finish / checkpoint course markers (score-only). */
  courseMarkers: true,
  /** Movable world objects (ball/box/hoop). */
  worldObjects: false,
  /** Wheels / motor wheels. */
  motorWheels: true,
  /** Joint angular limits. */
  jointAngularLimits: false,
  /** Rigid struts / solid connectors (fixed joint, no capsule). */
  rigidStruts: true,
  /** Area lift/drag forces. */
  aeroLikeForces: true,
  /** Structural aero part types (wing / glider / parachute). */
  structuralAeroParts: true,
  /** Inflation-driven parachute bone canopy morph (cosmetic). */
  parachuteCanopyVisual: true,

  /** Disco mode + audio. */
  discoMode: true,
  /** Multi-dancer disco (up to 6 models). */
  multiDisco: true,
  /** Disco dance imitation / freestyle brain. */
  discoDanceLearn: true,
  /** Multi-track dance curriculum (playlist, offline analysis, refine). */
  discoDanceCurriculum: true,
  /** Named Disco stage setup save/load. */
  discoSetups: true,
  /** Cosmetic cloth garments (Verlet panels pinned to skeleton). */
  cosmeticCloth: true,

  /** Arena championship shell. */
  arenaChampionship: false,
  /** Combat tab (race / boxing / joust). */
  headToHead: true,
  /** Combat tab + Body/Brain/Trained vocabulary; sidebars are information-only. */
  sandboxLayoutV2: true,
  /** Dedicated Boxing skill. */
  boxingMode: true,
  /** Dedicated Jousting skill (single-pass scorecard). */
  joustingMode: true,
  /**
   * Prefix-transplant a loco elite onto boxing / joust / dance when switching
   * skill or starting from a saved brain of another goal.
   */
  crossSkillTransfer: true,
} as const;

export type FeatureFlag = keyof typeof featureFlags;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag];
}
