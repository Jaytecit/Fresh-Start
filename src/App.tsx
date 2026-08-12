import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ELITE_COUNT,
  LIVE_BATCH_SIZE,
  LIVE_MAX_GENERATIONS,
  LIVE_POPULATION_SIZE,
  MUTATION_RESET_RATE,
  MUTATION_SIGMA,
  TOURNAMENT_SIZE,
  clampEpisodeSeconds,
  EPISODE_SECONDS,
  EPISODE_SECONDS_MAX,
  EPISODE_SECONDS_MIN,
  formatEpisodeSeconds,
  BRAIN_HZ,
  BRAIN_HZ_FAST,
  type BrainHz,
} from "./brain/constants";
import {
  boxingEligibility,
  getBoxingDivision,
  type BoxingDivisionId,
} from "./boxing/divisions";
import {
  DEFAULT_SPARRING_OPPONENT_ID,
  normalizeSparringOpponentId,
  resolveSparringOpponent,
  sparringOpponentLabel,
  sparringOpponentsForDivision,
  type SparringOpponentId,
} from "./boxing/sparringOpponents";
import {
  BOXING_PRIORITY_KEYS,
  BOXING_PRIORITY_LABELS,
  DEFAULT_BOXING_PRIORITIES,
  type BoxingPriorities,
} from "./boxing/rewards";
import {
  DEFAULT_JOUST_SPARRING_ID,
  resolveJoustSparringOpponent,
  JOUST_SPARRING_OPPONENTS,
  joustSparringOpponentLabel,
  type JoustSparringId,
} from "./jousting/sparringOpponents";
import { joustingEligibility } from "./jousting/eligibility";
import {
  DEFAULT_JOUSTING_PRIORITIES,
  JOUSTING_PRIORITY_KEYS,
  JOUSTING_PRIORITY_LABELS,
  type JoustingPriorities,
} from "./jousting/scorecard";
import {
  DEFAULT_GOAL_PRIORITIES,
  DEFAULT_RUN_STAGES,
  relevantPriorityKeys,
  type GoalPriorities,
} from "./brain/goalPriorities";
import {
  buildCurriculumFromMarkers,
  clearAuthoredCurriculum,
  ensureCourseGates,
  moveCheckpointOrder,
  patchCurriculumStage,
  placeEvenCheckpoints,
} from "./env/courseAuthoring";
import {
  applyCourseCurriculumStage,
  clampCourseStageIndex,
  hasCourseCurriculum,
  resolveCourseCurriculum,
} from "./env/courseCurriculum";
import {
  defaultGaKnobSet,
  loadGaKnobSet,
  saveGaKnobSet,
  type GaKnobSet,
} from "./brain/trainingRecipes";
import {
  collapseMuscleDrivesToChannels,
  countBrainActuatorChannels,
  designHasActuators,
  normalizeDriveGroup,
} from "./brain/driveGroups";
import {
  fitMultiTrackImitation,
  refineDanceBrain,
} from "./brain/danceCurriculum";
import { DANCE_OBS_PACK_VERSION } from "./brain/danceObs";
import {
  fitImitation,
  imitationFitness,
} from "./brain/imitate";
import type {
  EvolutionProgress,
  Genome,
  NetworkShape,
  TaskId,
} from "./brain/types";
import { adaptEliteToDesign } from "./brain/adaptElite";
import {
  analyzeTrainTelemetry,
  appendTrainTelemetryGen,
  beginTrainTelemetrySession,
  exportTrainTelemetryJson,
  finalizeTrainTelemetry,
  morphSummaryForGenes,
  telemetryFilename,
  TRAIN_TELEMETRY_WINDOW,
  type TrainTelemetrySession,
} from "./brain/trainTelemetry";
import {
  anyDiscoAutoEnabled,
  createDiscoAudioPlayer,
  createDiscoAutoTickState,
  DEFAULT_DISCO_AUTO,
  DEFAULT_DISCO_MOTION,
  DEFAULT_DISCO_REACTIVITY,
  DEFAULT_DISCO_ROUTING,
  DEFAULT_DISCO_TRACK_NAME,
  DEFAULT_DISCO_TRACK_URL,
  tickDiscoAuto,
  type DiscoAutoFlags,
  type DiscoBandRouting,
  type DiscoMotionControls,
  type DiscoReactivityGains,
} from "./audio/audioAnalysis";
import { MultiTrackDanceDataset } from "./audio/discoDataset";
import { discoDancerOffsets, resolveDiscoDrives } from "./audio/discoMode";
import {
  addPlaylistFiles,
  disposePlaylist,
  playlistFingerprint,
  removePlaylistTrack,
  type DiscoPlaylistTrack,
} from "./audio/discoPlaylist";
import {
  DiscoRecordBuffer,
  DISCO_RECORD_MIN_SAMPLES,
} from "./audio/discoRecord";
import {
  analyzeAudioFile,
  lookaheadAtTime,
} from "./audio/trackAnalysis";
import { ULTI_GROOVE_BOT_II } from "./creature/ultiGrooveBotII";
import {
  addBodyPartToBone,
  addBodyPartToJoint,
  removeBodyPart,
  updateBodyPart,
} from "./appearance/bodyPartOps";
import { getBodyPart } from "./appearance/bodyPartCatalog";
import {
  CLOTH_DEFAULT_FINENESS,
  CLOTH_DEFAULT_STIFFNESS,
  CLOTH_DEFAULT_WEIGHT,
  CLOTH_MAX_COLS,
  CLOTH_MAX_ROWS,
  CLOTH_MIN_CELL,
  CLOTH_MAX_CELL,
} from "./appearance/clothConstants";
import {
  addCapePreset,
  addCoveringGarment,
  removeClothGarment,
  updateClothGarment,
} from "./appearance/clothOps";
import {
  jointHasGooglyEyes,
  setJointGooglyEyes,
} from "./appearance/googlyEyes";
import { emptyAppearance } from "./appearance/types";
import { BodyPartCatalogPicker } from "./components/BodyPartCatalogPicker";
import { CollapsiblePanel } from "./components/CollapsiblePanel";
import { ContextStrip } from "./components/ContextStrip";
import {
  CreaturesPanel,
  type CreaturesBrowseKey,
} from "./components/CreaturesPanel";
import { type DiscoSlotState } from "./components/DiscoSlotsPanel";
import { DiscoCurriculumPanel } from "./components/DiscoCurriculumPanel";
import { DiscoTrackLearnPanel } from "./components/DiscoTrackLearnPanel";
import { DiscoZonePanel } from "./components/DiscoZonePanel";
import { BoxingSkillPanel, type BoxingMatchOpponent } from "./components/BoxingSkillPanel";
import { JoustingSkillPanel, type JoustMatchOpponent } from "./components/JoustingSkillPanel";
import {
  HeadToHeadPanel,
  headToHeadEntriesFromModels,
} from "./components/HeadToHeadPanel";
import { GoalInfoCard } from "./components/GoalInfoCard";
import { NetworkVisualizer } from "./components/NetworkVisualizer";
import { TrainingSetupPanel } from "./components/TrainingSetupPanel";
import { PerfDiagnostics } from "./components/PerfDiagnostics";
import { RewardsBreakdown } from "./components/RewardsBreakdown";
import {
  SandboxShell,
  SandboxTabRail,
  type SandboxTab,
  type SandboxTabId,
} from "./components/SandboxShell";
import { SecretGoalRevealOverlay } from "./components/SecretGoalRevealOverlay";
import { StatsPanel } from "./components/StatsPanel";
import { HelpTip } from "./components/HelpTip";
import { TutorialHelpPanel } from "./components/TutorialHelpPanel";
import {
  TutorialPanel,
  type TutorialJump,
} from "./components/TutorialPanel";
import { TrophyCabinet } from "./components/TrophyCabinet";
import { WorldDock } from "./components/WorldDock";
import { CreatureDock } from "./components/CreatureDock";
import { HoverHelpProvider } from "./help/HoverHelpContext";
import {
  loadHoverHelpEnabled,
  saveHoverHelpEnabled,
} from "./help/hoverHelp";
import { FLOPPY_CHAIN, PRESETS } from "./creature/presets";
import { buildHintsForSkill } from "./creature/buildHints";
import { cloneDesign, type CreatureDesign } from "./creature/types";
import { EditorCanvas, type EditTool } from "./editor/EditorCanvas";
import {
  jointsSelection,
  selectedJointIds,
  type EditorSelection,
} from "./editor/selection";
import {
  deleteSelection as deleteJointSelection,
  duplicateSelection,
  mirrorDuplicateSelection,
  selectionSummary,
} from "./editor/selectionOps";
import { createCamera } from "./sim/Camera";
import {
  AERO_TYPES,
  aeroTypeLabel,
  wingPairOk,
} from "./editor/aeroValidation";
import { AERO_AREA_SLIDER_MAX } from "./editor/flightMetrics";
import {
  assignDriveGroup,
  boneHasMuscle,
  clearDriveGroup,
  updateBone,
  updateJoint,
} from "./editor/editOps";
import { isFeatureEnabled } from "./port/featureFlags";
import { discoFloorEnv } from "./env/discoEnv";
import { boxingRingEnv, isBoxingRingEnv } from "./env/boxingRingEnv";
import { joustLaneEnv, isJoustLaneEnv } from "./env/joustLaneEnv";
import {
  DEFAULT_DISCO_BALL_X,
  DEFAULT_DISCO_BALL_Y,
  DEFAULT_DISCO_PUPPET_MODE,
  FOOT_MASS_DEFAULT,
  FOOT_MASS_MAX,
  FOOT_MASS_MIN,
  JOUST_MAX_SECONDS,
  WHEEL_MASS_DEFAULT,
  WHEEL_MASS_MAX,
  WHEEL_MASS_MIN,
  ANTI_SCOOT,
  ANTI_SCOOT_MAX,
  clampFootMass,
  clampWheelMass,
  type DiscoPuppetMode,
} from "./physics/constants";
import { EnvEditorCanvas } from "./env/EnvEditorCanvas";
import type { EnvSelectionList, EnvTool } from "./env/envSelection";
import {
  deleteSelectables,
  duplicateSelection as duplicateEnvSelection,
  rotateSelection as rotateEnvSelection,
} from "./env/envSelectionOps";
import { setTerrainAmplitude, studioSineTerrain } from "./env/terrainMath";
import {
  cloneEnvironment,
  ENV_THEMES,
  flatGroundEnv,
  THEME_CSS,
  type EnvironmentDesign,
} from "./env/types";
import {
  defaultGoalForSkill,
  getGoal,
  goalsForSkill,
  saveActiveGoalId,
  type GoalId,
} from "./goals/catalog";
import { BUNDLED_MODELS } from "./library/bundledModels";
import {
  designCandidatePool,
  resolveDesignForModel,
} from "./library/resolveModelDesign";
import {
  bodyFingerprint,
  considerBestEver,
  loadBestEver,
  type BestEverEntry,
} from "./library/bestEver";
import {
  deletePackage,
  loadCreaturePackages,
  saveNewPackage,
  savePackageRevision,
  setPackageSkillPlacement,
  type CreaturePackage,
} from "./library/creaturePackages";
import {
  deleteEnvironmentPackage,
  duplicateEnvironmentPackage,
  listEnvironmentsForUi,
  saveNewEnvironmentPackage,
  type EnvironmentPackage,
} from "./library/environmentPackages";
import {
  captureDiscoSetup,
  danceBrainFromSetup,
  deleteDiscoSetup,
  exportDiscoSetupJson,
  loadDiscoSetups,
  saveDiscoSetup,
  type DiscoSetup,
} from "./library/discoSetups";
import {
  EXPERIMENT_PACK_VERSION,
  exportExperimentPackJson,
  exportRecipeJson,
  loadNamedRecipes,
  saveNamedRecipe,
  type TrainingRecipeSave,
} from "./library/experimentPacks";
import {
  downloadText,
  exportCreatureJson,
  exportEnvironmentJson,
  exportModelJson,
  importCreatureJson,
  importEnvironmentJson,
  importModelJson,
} from "./library/jsonIO";
import {
  isValidSkillPlacement,
  loadAllPresetSkillOverrides,
  savePresetSkillOverride,
  type SkillPlacement,
} from "./library/skillCategories";
import { createShare, fetchShare } from "./library/shareApi";
import { clampCourseMarker } from "./brain/courseMarkers";
import {
  deleteSavedModel,
  loadSavedModels,
  modelToSeed,
  saveModel,
  shapesCompatible,
  trainedModelName,
  type SavedModel,
} from "./library/savedModels";
import {
  ShareDialog,
  type ShareDialogPhase,
} from "./components/ShareDialog";
import type { TaskEpisodeMetrics } from "./brain/taskScore";
import { evaluateSecretGoals } from "./secrets/eval";
import {
  listDiscoveries,
  recordDiscovery,
  type SecretGoalDiscovery,
} from "./secrets/progress";
import { SimCanvas } from "./sim/SimCanvas";
import {
  shapeForDanceDesign,
  shapeForBoxingDesign,
  shapeForJoustingDesign,
  shapeForDesign,
  Simulation,
  type BoxingMatchResult,
  type JoustMatchResult,
  type DriveMode,
  type EpisodeCompleteSnapshot,
  type HeadToHeadResult,
  type LiveBrainProbe,
  type LiveFocusStats,
} from "./sim/simulation";
import {
  saveActiveSkill,
  SKILLS,
  type SkillId,
} from "./skills/skills";
const OBSERVE_SPEEDS = [0.25, 1, 2, 4] as const;
const TRAIN_SPEEDS = [1, 4, 16, 0] as const; // 0 = max
/** edit = creature builder · world = env studio preview · sim = train/play */
type Mode = "edit" | "world" | "sim";
const BUILTIN_FLAT_ENV_ID = "builtin_flat_ground";
const MAX_UNDO = 80;
const idleProgress = (): EvolutionProgress => ({
  generation: 0,
  evaluated: 0,
  populationSize: 0,
  bestFitness: 0,
  meanFitness: 0,
  running: false,
  status: "Idle",
});
function ensureAppearance(design: CreatureDesign): CreatureDesign {
  if (design.appearance) return design;
  return { ...design, appearance: emptyAppearance() };
}

const LANDING_SKILL: SkillId = "walking";
const LANDING_GOAL: GoalId = "run";
const LANDING_PRESET = FLOPPY_CHAIN;

export default function App() {
  const simulation = useMemo(() => new Simulation(), []);
  const discoPlayer = useMemo(() => createDiscoAudioPlayer(), []);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Non-fatal banner (import / share failures). */
  const [flashNotice, setFlashNotice] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareDialogPhase, setShareDialogPhase] =
    useState<ShareDialogPhase>("confirm");
  const [shareDialogUrl, setShareDialogUrl] = useState("");
  const [shareDialogListed, setShareDialogListed] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareDialogError, setShareDialogError] = useState<string | null>(null);
  const shareBusyRef = useRef(false);
  const [mode, setMode] = useState<Mode>("edit");
  const [tool, setTool] = useState<EditTool>("joint");
  /** G8 — bone tool draws solid struts instead of hinge bones. */
  const [boneRigid, setBoneRigid] = useState(false);
  /** H9 — material-draw cloth: joints clicked as pins (one at a time). */
  const [clothDraftPins, setClothDraftPins] = useState<number[]>([]);
  const [clothDraftFineness, setClothDraftFineness] = useState(
    CLOTH_DEFAULT_FINENESS,
  );
  const [clothDraftWeight, setClothDraftWeight] = useState(
    CLOTH_DEFAULT_WEIGHT,
  );
  const [clothDraftStiffness, setClothDraftStiffness] = useState(
    CLOTH_DEFAULT_STIFFNESS,
  );
  const [snapEnabled, setSnapEnabled] = useState(true);
  /** Edit tab: drop creature idle under gravity to preview natural settle. */
  const [editPhysics, setEditPhysics] = useState(false);
  const [skill, setSkill] = useState<SkillId>(LANDING_SKILL);
  const [goalId, setGoalId] = useState<GoalId>(LANDING_GOAL);
  const [design, setDesign] = useState<CreatureDesign>(() =>
    ensureAppearance(cloneDesign(LANDING_PRESET)),
  );
  const [selection, setSelection] = useState<EditorSelection>(null);
  const [driveMode, setDriveMode] = useState<DriveMode>("idle");
  /** Brain eval rate — 30 Hz default; 60 Hz for feel / CPU A-B tests. */
  const [brainHz, setBrainHz] = useState<BrainHz>(BRAIN_HZ);
  const [manualDrives, setManualDrives] = useState<number[]>([]);
  const [simTime, setSimTime] = useState(0);
  const [undoCount, setUndoCount] = useState(0);
  const [observeSpeed, setObserveSpeed] = useState(1);
  const [trainSpeed, setTrainSpeed] = useState(4);
  const [showGhostPack, setShowGhostPack] = useState(() => {
    try {
      const raw = localStorage.getItem("freshstart_show_ghost_pack_v1");
      if (raw === "0") return false;
      if (raw === "1") return true;
    } catch {
      /* ignore */
    }
    return true;
  });
  const [episodeSeconds, setEpisodeSeconds] = useState<number>(EPISODE_SECONDS);
  const [gaKnobs, setGaKnobs] = useState<GaKnobSet>(() =>
    isFeatureEnabled("trainRecipes") ? loadGaKnobSet() : defaultGaKnobSet(),
  );
  const [antiScoot, setAntiScoot] = useState(() => {
    try {
      const raw = localStorage.getItem("freshstart_anti_scoot_v1");
      if (raw != null) {
        const n = Number(raw);
        if (Number.isFinite(n)) {
          return Math.min(ANTI_SCOOT_MAX, Math.max(0, n));
        }
      }
    } catch {
      /* ignore */
    }
    return ANTI_SCOOT;
  });
  const [trainHelpDismissed, setTrainHelpDismissed] = useState(() => {
    try {
      return localStorage.getItem("freshstart_train_help_v1") === "1";
    } catch {
      return false;
    }
  });
  const [runSeed, setRunSeed] = useState(() => Date.now() % 1_000_000);
  const [goalPriorities, setGoalPriorities] = useState<GoalPriorities>(() => ({
    ...DEFAULT_GOAL_PRIORITIES,
  }));
  const [boxingPriorities, setBoxingPriorities] = useState<BoxingPriorities>(
    () => ({ ...DEFAULT_BOXING_PRIORITIES }),
  );
  const [joustingPriorities, setJoustingPriorities] =
    useState<JoustingPriorities>(() => ({ ...DEFAULT_JOUSTING_PRIORITIES }));
  const [stageTrainerOn, setStageTrainerOn] = useState(false);
  const [courseCurriculumOn, setCourseCurriculumOn] = useState(false);
  const [courseStageIndex, setCourseStageIndex] = useState(0);
  /** Full env snapshot while Train course stages is rewriting spawn/finish. */
  const courseBaseEnvRef = useRef<EnvironmentDesign | null>(null);
  const [raceRecord, setRaceRecord] = useState(false);
  const [messyBodies, setMessyBodies] = useState(false);
  const [raycastObservationsOn, setRaycastObservationsOn] = useState(() => {
    try {
      return localStorage.getItem("freshstart_raycast_obs_v1") === "1";
    } catch {
      return false;
    }
  });
  const [morphEvolveOn, setMorphEvolveOn] = useState(() => {
    try {
      return localStorage.getItem("freshstart_morph_evolve_v1") === "1";
    } catch {
      return false;
    }
  });
  const [structuralMorphOn, setStructuralMorphOn] = useState(() => {
    try {
      return localStorage.getItem("freshstart_structural_morph_v1") === "1";
    } catch {
      return false;
    }
  });
  const [trainTelemetryOn, setTrainTelemetryOn] = useState(() => {
    try {
      return localStorage.getItem("freshstart_train_telemetry_v1") === "1";
    } catch {
      return false;
    }
  });
  const [trainTelemetrySession, setTrainTelemetrySession] =
    useState<TrainTelemetrySession | null>(null);
  const [namedRecipes, setNamedRecipes] = useState<TrainingRecipeSave[]>([]);
  const [liveBrain, setLiveBrain] = useState<LiveBrainProbe | null>(null);
  const [evolveProgress, setEvolveProgress] =
    useState<EvolutionProgress>(idleProgress);
  const [bestGenome, setBestGenome] = useState<{
    shape: NetworkShape;
    genome: Genome;
  } | null>(null);
  const [packages, setPackages] = useState<CreaturePackage[]>([]);
  const [presetSkillOverrides, setPresetSkillOverrides] = useState<
    Record<string, SkillPlacement>
  >(() => loadAllPresetSkillOverrides());
  const [currentSkillOverride, setCurrentSkillOverride] = useState<{
    fp: string;
    placement: SkillPlacement;
  } | null>(null);
  const [saveName, setSaveName] = useState(LANDING_PRESET.name);
  const [savedModels, setSavedModels] = useState<SavedModel[]>([]);
  const [discoTrack, setDiscoTrack] = useState("");
  const [discoGains, setDiscoGains] = useState<DiscoReactivityGains>(() => ({
    ...DEFAULT_DISCO_REACTIVITY,
  }));
  const [discoMotion, setDiscoMotion] = useState<DiscoMotionControls>(() => ({
    ...DEFAULT_DISCO_MOTION,
  }));
  const [discoAuto, setDiscoAuto] = useState<DiscoAutoFlags>(() => ({
    ...DEFAULT_DISCO_AUTO,
  }));
  const [discoSlots, setDiscoSlots] = useState<DiscoSlotState[]>(() => [
    {
      design: cloneDesign(ULTI_GROOVE_BOT_II),
      label: ULTI_GROOVE_BOT_II.name,
    },
    null,
    null,
    null,
    null,
    null,
  ]);
  const [discoRouting, setDiscoRouting] = useState<DiscoBandRouting>(() => ({
    ...DEFAULT_DISCO_ROUTING,
  }));
  const [discoPlaying, setDiscoPlaying] = useState(false);
  const [discoTrackTime, setDiscoTrackTime] = useState(0);
  const [discoTrackDuration, setDiscoTrackDuration] = useState(0);
  const [discoPuppetMode, setDiscoPuppetMode] = useState<DiscoPuppetMode>(
    DEFAULT_DISCO_PUPPET_MODE,
  );
  const [discoHideMuscles, setDiscoHideMuscles] = useState(false);
  const [discoHideBones, setDiscoHideBones] = useState(false);
  const [hideSolidStruts, setHideSolidStruts] = useState(false);
  const [discoGreenscreen, setDiscoGreenscreen] = useState(false);
  const [discoBallPos, setDiscoBallPos] = useState({
    x: DEFAULT_DISCO_BALL_X,
    y: DEFAULT_DISCO_BALL_Y,
  });
  const [discoSetups, setDiscoSetups] = useState<DiscoSetup[]>([]);
  const [discoRecording, setDiscoRecording] = useState(false);
  const [discoRecordCount, setDiscoRecordCount] = useState(0);
  const [discoRecordDuration, setDiscoRecordDuration] = useState(0);
  const [discoLearning, setDiscoLearning] = useState(false);
  const [discoLearnProgress, setDiscoLearnProgress] = useState<{
    epoch: number;
    epochs: number;
    loss: number;
  } | null>(null);
  const [danceGenome, setDanceGenome] = useState<{
    shape: NetworkShape;
    genome: Genome;
  } | null>(null);
  const [danceStage, setDanceStage] = useState<"imitate" | "refine">(
    "imitate",
  );
  const [discoFreestyle, setDiscoFreestyle] = useState(false);
  const [discoPlaylist, setDiscoPlaylist] = useState<DiscoPlaylistTrack[]>(
    [],
  );
  const [discoPlaylistActiveId, setDiscoPlaylistActiveId] = useState<
    string | null
  >(null);
  const [curriculumRecording, setCurriculumRecording] = useState(false);
  const [curriculumSamples, setCurriculumSamples] = useState(0);
  const [curriculumDuration, setCurriculumDuration] = useState(0);
  const [curriculumLearning, setCurriculumLearning] = useState(false);
  const [curriculumRefining, setCurriculumRefining] = useState(false);
  const [curriculumLearnProgress, setCurriculumLearnProgress] = useState<{
    epoch: number;
    epochs: number;
    loss: number;
    holdoutLoss?: number;
  } | null>(null);
  const [curriculumRefineProgress, setCurriculumRefineProgress] = useState<{
    generation: number;
    generations: number;
    bestFitness: number;
    meanFitness: number;
  } | null>(null);
  const discoRecordBufRef = useRef(new DiscoRecordBuffer());
  const discoRecordingRef = useRef(false);
  const curriculumDatasetRef = useRef(new MultiTrackDanceDataset());
  const curriculumRecordingRef = useRef(false);
  const curriculumTrackIdRef = useRef<string | null>(null);
  const discoPlaylistRef = useRef<DiscoPlaylistTrack[]>([]);
  const lookBufRef = useRef(new Float32Array(6));
  /** User environment retained while switching among dedicated skill arenas. */
  const preSpecialEnvRef = useRef<EnvironmentDesign | null>(null);
  const [h2hRunning, setH2hRunning] = useState(false);
  const [h2hProgress, setH2hProgress] = useState<{
    episodeT: number;
    episodeDuration: number;
  } | null>(null);
  const [h2hResult, setH2hResult] = useState<HeadToHeadResult | null>(null);
  const [boxingRunning, setBoxingRunning] = useState(false);
  const [boxingProgress, setBoxingProgress] = useState<{
    episodeT: number;
    episodeDuration: number;
    points: [number, number];
  } | null>(null);
  const [boxingResult, setBoxingResult] = useState<BoxingMatchResult | null>(
    null,
  );
  const [boxingDivisionId, setBoxingDivisionId] =
    useState<BoxingDivisionId>("upright");
  const [boxingSparringId, setBoxingSparringId] =
    useState<SparringOpponentId>(DEFAULT_SPARRING_OPPONENT_ID);
  /** Metadata for the in-sim Boxing live evolve session (elite save on finish). */
  const boxingLiveMetaRef = useRef<{
    design: CreatureDesign;
    divisionId: BoxingDivisionId;
  } | null>(null);
  const [joustingRunning, setJoustingRunning] = useState(false);
  const [joustingProgress, setJoustingProgress] = useState<{
    episodeT: number;
    episodeDuration: number;
    totals: [number, number];
    phase: string;
  } | null>(null);
  const [joustingResult, setJoustingResult] = useState<JoustMatchResult | null>(
    null,
  );
  const [joustingSparringId, setJoustingSparringId] =
    useState<JoustSparringId>(DEFAULT_JOUST_SPARRING_ID);
  const joustingLiveMetaRef = useRef<{
    design: CreatureDesign;
  } | null>(null);
  const [bestEverList, setBestEverList] = useState<BestEverEntry[]>([]);
  const [envDesign, setEnvDesign] = useState<EnvironmentDesign>(() =>
    flatGroundEnv(),
  );
  const [envPackages, setEnvPackages] = useState<EnvironmentPackage[]>([]);
  /** Saved package driving training; null = unsaved World studio draft. */
  const [activeEnvPackageId, setActiveEnvPackageId] = useState<string | null>(
    BUILTIN_FLAT_ENV_ID,
  );
  const [envUndoCount, setEnvUndoCount] = useState(0);
  const [secretRevealQueue, setSecretRevealQueue] = useState<
    SecretGoalDiscovery[]
  >([]);
  const [discoveries, setDiscoveries] = useState<SecretGoalDiscovery[]>([]);
  const [sandboxTab, setSandboxTab] = useState<SandboxTabId>("tutorial");
  const [hoverHelpEnabled, setHoverHelpEnabled] = useState(() =>
    loadHoverHelpEnabled(),
  );
  const [tutorialHelpKey, setTutorialHelpKey] = useState<string | null>(null);
  const [tutorialResume, setTutorialResume] = useState<{
    chapterId: string;
    view: "guided" | "quickstart";
  } | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [dockInset, setDockInset] = useState(0);
  const [feelNotesOpen, setFeelNotesOpen] = useState(false);
  const [trainMoreOpen, setTrainMoreOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(
    () => !isFeatureEnabled("trainDockIa"),
  );
  const [rewardsOpen, setRewardsOpen] = useState(
    () => !isFeatureEnabled("trainDockIa"),
  );
  const [controlsOpen, setControlsOpen] = useState(false);
  const [diagOpen, setDiagOpen] = useState(false);
  const [liveStats, setLiveStats] = useState<LiveFocusStats | null>(null);
  const [lastMetrics, setLastMetrics] = useState<TaskEpisodeMetrics | null>(
    null,
  );
  const [perfFps, setPerfFps] = useState(0);
  const [perfFrameMs, setPerfFrameMs] = useState(0);
  const [immersive, setImmersive] = useState(false);
  /** Edit menu creature picker: `preset:Name` | `pkg:id` | `custom`. */
  const [selectedCreatureKey, setSelectedCreatureKey] = useState(
    () => `preset:${LANDING_PRESET.name}`,
  );
  const [worldThemeOpen, setWorldThemeOpen] = useState(true);
  const [worldLibOpen, setWorldLibOpen] = useState(true);
  const [envTool, setEnvTool] = useState<EnvTool>("select");
  const [envSelection, setEnvSelection] = useState<EnvSelectionList>([]);
  const [envSnapEnabled, setEnvSnapEnabled] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const envFileInputRef = useRef<HTMLInputElement>(null);
  /** Cap RAF → React UI updates (~10 Hz) so the canvas isn't fighting setState. */
  const frameUiLastRef = useRef(0);
  const perfUiLastRef = useRef(0);
  /** Persist Edit pan/zoom across tool/selection changes and remounts. */
  const editorCamRef = useRef(createCamera());
  const designRef = useRef(design);
  const sandboxTabRef = useRef(sandboxTab);
  const bestGenomeRef = useRef(bestGenome);
  const trainTelemetryOnRef = useRef(trainTelemetryOn);
  trainTelemetryOnRef.current = trainTelemetryOn;
  const trainTelemetrySessionRef = useRef<TrainTelemetrySession | null>(null);
  const driveModeRef = useRef(driveMode);
  const discoGainsRef = useRef(discoGains);
  const discoMotionRef = useRef(discoMotion);
  const discoAutoRef = useRef(discoAuto);
  const discoAutoTickRef = useRef(createDiscoAutoTickState());
  const discoSlotsRef = useRef(discoSlots);
  const discoRoutingRef = useRef(discoRouting);
  const undoStackRef = useRef<CreatureDesign[]>([]);
  const envUndoStackRef = useRef<EnvironmentDesign[]>([]);
  const envDesignRef = useRef(envDesign);
  designRef.current = design;
  sandboxTabRef.current = sandboxTab;
  bestGenomeRef.current = bestGenome;
  driveModeRef.current = driveMode;
  discoGainsRef.current = discoGains;
  discoMotionRef.current = discoMotion;
  discoAutoRef.current = discoAuto;
  discoSlotsRef.current = discoSlots;
  discoRoutingRef.current = discoRouting;
  envDesignRef.current = envDesign;
  const activeTask = getGoal(goalId).task;
  const activeTaskRef = useRef(activeTask);
  activeTaskRef.current = activeTask;
  const skillGoals = goalsForSkill(skill);
  const refreshPackages = useCallback(() => {
    if (isFeatureEnabled("creaturePackages")) {
      setPackages(loadCreaturePackages());
    }
  }, []);
  const refreshModels = useCallback(() => {
    if (isFeatureEnabled("savedModels")) {
      setSavedModels(loadSavedModels());
    }
  }, []);
  const refreshEnvPackages = useCallback(() => {
    if (isFeatureEnabled("environmentsRepo")) {
      setEnvPackages(listEnvironmentsForUi());
    }
  }, []);
  useEffect(() => {
    refreshPackages();
    refreshModels();
    refreshEnvPackages();
    if (isFeatureEnabled("bestEverLedger")) {
      setBestEverList(loadBestEver());
    }
    if (isFeatureEnabled("secretGoals") || isFeatureEnabled("discoveryUi")) {
      setDiscoveries(listDiscoveries());
    }
    if (isFeatureEnabled("experimentPacks")) {
      setNamedRecipes(loadNamedRecipes());
    }
    if (isFeatureEnabled("discoSetups")) {
      setDiscoSetups(loadDiscoSetups());
    }
  }, [refreshPackages, refreshModels, refreshEnvPackages]);

  useEffect(() => {
    saveActiveSkill(LANDING_SKILL);
    saveActiveGoalId(LANDING_GOAL);
  }, []);

  useEffect(() => {
    if (!isFeatureEnabled("trainRecipes")) return;
    saveGaKnobSet(gaKnobs);
    setEpisodeSeconds(gaKnobs.episodeSeconds);
  }, [gaKnobs]);

  useEffect(() => {
    try {
      localStorage.setItem("freshstart_anti_scoot_v1", String(antiScoot));
    } catch {
      /* ignore */
    }
    if (!ready) return;
    simulation.setAntiScoot(antiScoot);
  }, [ready, antiScoot, simulation]);

  /** Prefetch bundled disco track once physics is ready. */
  useEffect(() => {
    if (!ready || !isFeatureEnabled("discoMode")) return;
    let cancelled = false;
    void (async () => {
      try {
        await discoPlayer.loadUrl(
          DEFAULT_DISCO_TRACK_URL,
          DEFAULT_DISCO_TRACK_NAME,
        );
        if (cancelled) return;
        setDiscoTrack(DEFAULT_DISCO_TRACK_NAME);
        setDiscoTrackTime(0);
        const d = discoPlayer.duration();
        setDiscoTrackDuration(Number.isFinite(d) ? d : 0);
      } catch (err) {
        console.warn("Default disco track missing or failed to load", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, discoPlayer]);
  useEffect(() => {
    if (!isFeatureEnabled("environmentsRepo")) return;
    const theme = THEME_CSS[envDesign.theme];
    const root = document.documentElement;
    root.style.setProperty("--bg", theme.bg);
    root.style.setProperty("--panel", theme.panel);
  }, [envDesign.theme]);
  useEffect(() => {
    if (!ready || !isFeatureEnabled("environmentsRepo")) return;
    simulation.setEnvironment(envDesign);
  }, [ready, envDesign, simulation]);
  const finalizeAndMaybeDownloadTelemetry = useCallback(
    (session: TrainTelemetrySession, autoDownload: boolean) => {
      const final = finalizeTrainTelemetry(session);
      trainTelemetrySessionRef.current = final;
      setTrainTelemetrySession(final);
      if (autoDownload && final.generations.length > 0) {
        downloadText(
          telemetryFilename(final),
          exportTrainTelemetryJson(final),
        );
      }
      return final;
    },
    [],
  );

  const handleEpisodeComplete = useCallback((snap: EpisodeCompleteSnapshot) => {
    setLastMetrics(snap.metrics);

    if (
      isFeatureEnabled("trainTelemetryLog") &&
      trainTelemetryOnRef.current &&
      snap.context === "evolve" &&
      snap.generation != null &&
      trainTelemetrySessionRef.current
    ) {
      const prev = trainTelemetrySessionRef.current;
      if (prev.generations.length < prev.window) {
        const next = {
          ...appendTrainTelemetryGen(prev, {
            generation: snap.generation,
            task: snap.task,
            episodeSeconds: snap.episodeSeconds,
            bestFitness: snap.metrics.fitness,
            meanFitness: snap.meanFitness ?? 0,
            runBestFitness: snap.runBestFitness ?? snap.metrics.fitness,
            populationSize: snap.populationSize ?? 0,
            metrics: snap.metrics,
            stall: snap.stall ?? null,
            morphSummary: morphSummaryForGenes(snap.morph),
          }),
        };
        next.insights = analyzeTrainTelemetry(next);
        trainTelemetrySessionRef.current = next;
        setTrainTelemetrySession(next);
        if (next.generations.length >= next.window) {
          finalizeAndMaybeDownloadTelemetry(next, true);
        }
      }
    }

    if (!isFeatureEnabled("secretGoals")) return;
    const ids = evaluateSecretGoals({
      task: snap.task,
      metrics: snap.metrics,
      design: snap.design,
      episodeSeconds: snap.episodeSeconds,
      generation: snap.generation,
    });
    if (ids.length === 0) return;
    const fresh: SecretGoalDiscovery[] = [];
    for (const id of ids) {
      const entry: SecretGoalDiscovery = {
        secretGoalId: id,
        discoveredAt: new Date().toISOString(),
        modelName: snap.design.name || "Creature",
        activeTask: snap.task,
        context: snap.context,
        generation: snap.generation,
      };
      if (recordDiscovery(entry)) fresh.push(entry);
    }
    if (fresh.length === 0) return;
    setSecretRevealQueue((q) => [...q, ...fresh]);
    setDiscoveries(listDiscoveries());
  }, [finalizeAndMaybeDownloadTelemetry]);
  useEffect(() => {
    simulation.onEpisodeComplete = handleEpisodeComplete;
    return () => {
      simulation.onEpisodeComplete = null;
    };
  }, [simulation, handleEpisodeComplete]);
  useEffect(() => {
    simulation.setTask(activeTask);
  }, [activeTask, simulation]);
  useEffect(() => {
    const scale = evolveProgress.running ? trainSpeed : observeSpeed;
    simulation.timeScale = scale;
  }, [evolveProgress.running, observeSpeed, trainSpeed, simulation]);
  useEffect(() => {
    const ghosts = showGhostPack || raceRecord;
    simulation.setShowGhostPack(ghosts);
    try {
      localStorage.setItem(
        "freshstart_show_ghost_pack_v1",
        showGhostPack ? "1" : "0",
      );
    } catch {
      /* ignore */
    }
  }, [showGhostPack, raceRecord, simulation]);
  useEffect(() => {
    if (!selection) return;
    if (selection.kind === "joints") {
      const valid = selection.ids.filter((id) =>
        design.joints.some((j) => j.id === id),
      );
      if (valid.length === 0) setSelection(null);
      else if (valid.length !== selection.ids.length) {
        setSelection(jointsSelection(valid));
      }
    } else if (
      selection.kind === "bone" &&
      !design.bones.some((b) => b.id === selection.id)
    ) {
      setSelection(null);
    } else if (
      selection.kind === "muscle" &&
      !design.muscles.some((m) => m.id === selection.id)
    ) {
      setSelection(null);
    } else if (
      selection.kind === "bodyPart" &&
      (!design.appearance ||
        selection.index < 0 ||
        selection.index >= design.appearance.bodyParts.length)
    ) {
      setSelection(null);
    } else if (
      selection.kind === "cloth" &&
      (!design.appearance?.cloth ||
        selection.index < 0 ||
        selection.index >= design.appearance.cloth.length)
    ) {
      setSelection(null);
    }
  }, [design, selection]);
  useEffect(() => {
    if (mode !== "sim" && mode !== "world") setDockInset(0);
  }, [mode]);
  const hasCreature = design.joints.length > 0;
  const footMass = clampFootMass(design.footMass ?? FOOT_MASS_DEFAULT);
  const wheelMass = clampWheelMass(design.wheelMass ?? WHEEL_MASS_DEFAULT);
  const markedFootCount = design.joints.filter((j) => j.isFoot).length;
  const markedWheelCount = design.joints.filter((j) => j.isWheel).length;
  /** Prefer warm-start from this run’s elite on the next Evolve. */
  const preferBestOfRun = useCallback(() => {
    if (!isFeatureEnabled("trainStartFrom")) return;
    setGaKnobs((prev) =>
      prev.startFrom === "fresh"
        ? { ...prev, startFrom: "best_of_run" }
        : prev,
    );
  }, []);

  /**
   * If a live evolve is running, abort it and keep the elite brain.
   * Returns the promoted elite, or the existing bestGenome when already stopped.
   */
  const captureLiveElite = useCallback((): {
    shape: NetworkShape;
    genome: Genome;
  } | null => {
    const promoted = simulation.isEvolving
      ? simulation.abortLiveEvolve()
      : null;
    if (promoted) {
      setBestGenome(promoted);
      preferBestOfRun();
      setEvolveProgress((prev) => ({
        ...prev,
        running: false,
        bestFitness: promoted.genome.fitness,
        status: "Paused — elite saved",
      }));
      return promoted;
    }
    return bestGenomeRef.current;
  }, [preferBestOfRun, simulation]);

  const returnToEdit = useCallback(() => {
    const elite = captureLiveElite();
    if (simulation.isHeadToHead) simulation.abortHeadToHead();
    simulation.abortBoxingMatch();
    simulation.abortJoustMatch();
    simulation.clearDiscoDancers();
    setH2hRunning(false);
    setH2hProgress(null);
    setBoxingRunning(false);
    setBoxingProgress(null);
    setJoustingRunning(false);
    setJoustingProgress(null);
    if (!elite) {
      setEvolveProgress(idleProgress());
    } else {
      setEvolveProgress((prev) => ({
        ...prev,
        running: false,
        bestFitness: elite.genome.fitness,
        status:
          prev.status === "Paused — elite saved"
            ? prev.status
            : "Paused — brain kept",
      }));
      preferBestOfRun();
    }
    setLiveBrain(null);
    setEditPhysics(false);
    simulation.running = false;
    setMode("edit");
    setSandboxTab("edit");
    setDockInset(0);
  }, [captureLiveElite, preferBestOfRun, simulation]);
  /** World tab — env studio preview on SimCanvas (no train dock). */
  const enterWorld = useCallback(() => {
    const elite = captureLiveElite();
    if (!elite) {
      setEvolveProgress(idleProgress());
    } else {
      preferBestOfRun();
      setEvolveProgress((prev) => ({
        ...prev,
        running: false,
        bestFitness: elite.genome.fitness,
        status: "Paused — brain kept",
      }));
    }
    setLiveBrain(null);
    simulation.running = false;
    setMode("world");
    setSandboxTab("world");
    setDockInset(0);
  }, [captureLiveElite, preferBestOfRun, simulation]);

  useEffect(() => {
    if (!hasCreature && mode === "sim") {
      returnToEdit();
    }
  }, [hasCreature, mode, returnToEdit]);
  /** Spawn staged dancer slot(s). One dancer is enough; audio applies only while dancing. */
  const syncMultiDisco = useCallback(() => {
    if (!isFeatureEnabled("multiDisco")) return false;
    if (!simulation.world) return false;
    const active = discoSlotsRef.current.filter(
      (s): s is NonNullable<DiscoSlotState> =>
        s !== null && s.design.joints.length > 0,
    );
    if (active.length === 0) {
      return false;
    }
    const defaults = discoDancerOffsets(active.length);
    simulation.startMultiDisco(
      active.map((slot, i) => ({
        design: slot.design,
        offsetX:
          typeof slot.offsetX === "number" && Number.isFinite(slot.offsetX)
            ? slot.offsetX
            : (defaults[i] ?? 0),
      })),
      (_index, slotDesign) => {
        if (driveModeRef.current !== "disco") {
          return new Array(slotDesign.muscles.length).fill(0);
        }
        return resolveDiscoDrives({
          player: discoPlayer,
          muscleCount: slotDesign.muscles.length,
          muscles: slotDesign.muscles,
          design: slotDesign,
          gains: discoGainsRef.current,
          motion: discoMotionRef.current,
          routing: discoRoutingRef.current,
          timeSec: discoPlayer.currentTime(),
        });
      },
    );
    simulation.driveMode =
      driveModeRef.current === "disco" ? "disco" : "idle";
    return true;
  }, [discoPlayer, simulation]);

  useEffect(() => {
    simulation.discoDriveProvider = () =>
      resolveDiscoDrives({
        player: discoPlayer,
        muscleCount: designRef.current.muscles.length,
        muscles: designRef.current.muscles,
        design: designRef.current,
        gains: discoGainsRef.current,
        motion: discoMotionRef.current,
        routing: discoRoutingRef.current,
        timeSec: discoPlayer.currentTime(),
      });
    return () => {
      simulation.discoDriveProvider = null;
    };
  }, [discoPlayer, simulation]);

  useEffect(() => {
    discoPlaylistRef.current = discoPlaylist;
  }, [discoPlaylist]);

  useEffect(() => {
    if (!isFeatureEnabled("discoDanceLearn")) return;
    simulation.audioObsProvider = () =>
      discoPlayer.hasTrack() ? discoPlayer.getBands() : null;
    return () => {
      simulation.audioObsProvider = null;
    };
  }, [discoPlayer, simulation]);

  useEffect(() => {
    if (
      !isFeatureEnabled("discoDanceLearn") &&
      !isFeatureEnabled("discoDanceCurriculum")
    ) {
      return;
    }
    simulation.audioLookaheadProvider = () => {
      if (!isFeatureEnabled("discoDanceCurriculum")) return null;
      const id = discoPlaylistActiveId;
      const track = discoPlaylistRef.current.find((t) => t.id === id);
      if (!track?.analysis) return null;
      const t = discoPlayer.currentTime();
      return lookaheadAtTime(track.analysis, t, lookBufRef.current);
    };
    return () => {
      simulation.audioLookaheadProvider = null;
    };
  }, [discoPlayer, discoPlaylistActiveId, simulation]);

  useEffect(() => {
    if (!isFeatureEnabled("discoDanceLearn")) return;
    simulation.discoSampleHook = (payload) => {
      const muscles =
        simulation.design?.muscles ??
        designRef.current.muscles;
      const channels = collapseMuscleDrivesToChannels(
        muscles,
        payload.muscleDrives,
      );
      if (discoRecordingRef.current) {
        discoRecordBufRef.current.pushSample(payload.obs, channels);
        setDiscoRecordCount(discoRecordBufRef.current.sampleCount);
        setDiscoRecordDuration(discoRecordBufRef.current.durationSec);
      }
      if (
        isFeatureEnabled("discoDanceCurriculum") &&
        curriculumRecordingRef.current &&
        curriculumTrackIdRef.current
      ) {
        const track = discoPlaylistRef.current.find(
          (t) => t.id === curriculumTrackIdRef.current,
        );
        const primary = discoSlotsRef.current.find(
          (s) => s !== null && s.design.joints.length > 0,
        );
        const body = primary?.design ?? designRef.current;
        curriculumDatasetRef.current.appendSamples(
          curriculumTrackIdRef.current,
          track?.name ?? "track",
          bodyFingerprint(body),
          payload.obs,
          channels,
        );
        setCurriculumSamples(curriculumDatasetRef.current.sampleCount());
        setCurriculumDuration(curriculumDatasetRef.current.durationSec());
      }
    };
    return () => {
      simulation.discoSampleHook = null;
    };
  }, [simulation]);

  useEffect(() => {
    return () => {
      discoPlayer.dispose();
    };
  }, [discoPlayer]);

  /** Keep the dock timeline in sync while a track is playing; drive auto sliders. */
  useEffect(() => {
    if (!discoPlaying) {
      setDiscoTrackTime(discoPlayer.currentTime());
      const d = discoPlayer.duration();
      if (Number.isFinite(d) && d > 0) setDiscoTrackDuration(d);
      discoAutoTickRef.current.initialized = false;
      return;
    }
    let raf = 0;
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const t = discoPlayer.currentTime();
      const d = discoPlayer.duration();
      setDiscoTrackTime(t);
      if (Number.isFinite(d) && d > 0) setDiscoTrackDuration(d);

      const auto = discoAutoRef.current;
      if (anyDiscoAutoEnabled(auto)) {
        const result = tickDiscoAuto({
          bands: discoPlayer.getBands(),
          gains: discoGainsRef.current,
          motion: discoMotionRef.current,
          auto,
          state: discoAutoTickRef.current,
          timeSec: t,
        });
        discoAutoTickRef.current = result.state;
        if (result.changed) {
          discoGainsRef.current = result.gains;
          discoMotionRef.current = result.motion;
          setDiscoGains(result.gains);
          setDiscoMotion(result.motion);
        }
      }

      if (
        discoPlayer.hasTrack() &&
        !discoPlayer.isPlaying() &&
        d > 0 &&
        t >= d - 0.05
      ) {
        setDiscoPlaying(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [discoPlaying, discoPlayer]);

  /** Slot content signature — ignores offsetX so grab/drop does not respawn. */
  const discoStageKey = useMemo(
    () =>
      discoSlots
        .map((s) =>
          s
            ? `${s.label}\0${s.design.name}\0${s.design.joints.length}\0${s.design.bones.length}\0${s.design.muscles.length}\0${s.design.joints.map((j) => `${j.id}:${j.x.toFixed(3)}:${j.y.toFixed(3)}`).join(",")}`
            : "",
        )
        .join("|"),
    [discoSlots],
  );

  /** Keep the disco arena in sync with dancer slots (preview or dancing). */
  useEffect(() => {
    if (!ready) return;
    if (skill !== "disco" || !isFeatureEnabled("discoMode")) return;
    if (syncMultiDisco()) return;
    if (simulation.isMultiDisco) {
      simulation.clearDiscoDancers();
      if (designRef.current.joints.length > 0) {
        simulation.loadDesign(designRef.current);
      }
    }
    // Gains/motion/routing are read from refs inside resolveDrives — omit here
    // so slider tweaks do not respawn dancers. offsetX changes also omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- discoStageKey gates design/load
  }, [ready, skill, discoStageKey, syncMultiDisco, simulation]);

  const applyDiscoEnvironment = useCallback(() => {
    if (!preSpecialEnvRef.current) {
      preSpecialEnvRef.current = cloneEnvironment(envDesignRef.current);
    }
    const discoEnv = discoFloorEnv();
    envDesignRef.current = discoEnv;
    setEnvDesign(discoEnv);
    simulation.setEnvironment(discoEnv);
  }, [simulation]);

  const restorePreDiscoEnvironment = useCallback(() => {
    const prev = preSpecialEnvRef.current;
    if (!prev) return;
    preSpecialEnvRef.current = null;
    const restored = cloneEnvironment(prev);
    envDesignRef.current = restored;
    setEnvDesign(restored);
    simulation.setEnvironment(prev);
  }, [simulation]);

  const applyBoxingEnvironment = useCallback(() => {
    if (!preSpecialEnvRef.current) {
      preSpecialEnvRef.current = cloneEnvironment(envDesignRef.current);
    }
    // Avoid a fresh object each spar — envDesign identity churn rebuilds
    // geometry via the setEnvironment effect and thrashing the train UI.
    if (isBoxingRingEnv(envDesignRef.current)) return;
    const ring = boxingRingEnv();
    envDesignRef.current = ring;
    setEnvDesign(ring);
    simulation.setEnvironment(ring);
  }, [simulation]);

  const restorePreBoxingEnvironment = useCallback(() => {
    const previous = preSpecialEnvRef.current;
    if (!previous) return;
    preSpecialEnvRef.current = null;
    const restored = cloneEnvironment(previous);
    envDesignRef.current = restored;
    setEnvDesign(restored);
    simulation.setEnvironment(previous);
  }, [simulation]);

  const applyJoustingEnvironment = useCallback(() => {
    if (!preSpecialEnvRef.current) {
      preSpecialEnvRef.current = cloneEnvironment(envDesignRef.current);
    }
    if (isJoustLaneEnv(envDesignRef.current)) return;
    const lane = joustLaneEnv();
    envDesignRef.current = lane;
    setEnvDesign(lane);
    simulation.setEnvironment(lane);
  }, [simulation]);

  const restorePreJoustingEnvironment = useCallback(() => {
    const previous = preSpecialEnvRef.current;
    if (!previous) return;
    preSpecialEnvRef.current = null;
    const restored = cloneEnvironment(previous);
    envDesignRef.current = restored;
    setEnvDesign(restored);
    simulation.setEnvironment(previous);
  }, [simulation]);

  const beginDiscoDrive = useCallback(() => {
    if (!discoPlayer.hasTrack()) return;
    setDriveMode("disco");
    driveModeRef.current = "disco";
    if (syncMultiDisco()) {
      simulation.driveMode = "disco";
      simulation.setDiscoPuppetMode(discoPuppetMode);
      return;
    }
    if (simulation.isMultiDisco) {
      simulation.clearDiscoDancers();
    }
    simulation.driveMode = "disco";
    if (designRef.current.joints.length > 0) {
      simulation.loadDesign(designRef.current);
    }
    simulation.setDiscoPuppetMode(discoPuppetMode);
  }, [discoPlayer, discoPuppetMode, simulation, syncMultiDisco]);

  const stopDiscoDrive = useCallback(() => {
    discoPlayer.pause();
    setDiscoPlaying(false);
    setDriveMode("idle");
    driveModeRef.current = "idle";
    simulation.driveMode = "idle";
    discoRecordingRef.current = false;
    setDiscoRecording(false);
    setDiscoFreestyle(false);
    // Keep staged dancers on the floor; drives go silent via driveModeRef.
  }, [discoPlayer, simulation]);

  const activeDiscoDesign = useCallback((): CreatureDesign => {
    const primary = discoSlotsRef.current.find(
      (s) => s !== null && s.design.joints.length > 0,
    );
    return primary?.design ?? designRef.current;
  }, []);

  const discoSoloOk = useMemo(() => {
    const n = discoSlots.filter(
      (s) => s !== null && s.design.joints.length > 0,
    ).length;
    return n <= 1;
  }, [discoSlots]);

  const toggleDiscoRecord = useCallback(() => {
    if (!isFeatureEnabled("discoDanceLearn") || !discoSoloOk) return;
    if (discoRecording) {
      discoRecordingRef.current = false;
      setDiscoRecording(false);
      return;
    }
    if (driveModeRef.current !== "disco") return;
    discoRecordingRef.current = true;
    setDiscoRecording(true);
  }, [discoRecording, discoSoloOk]);

  const clearDiscoRecord = useCallback(() => {
    discoRecordBufRef.current.clear();
    setDiscoRecordCount(0);
    setDiscoRecordDuration(0);
  }, []);

  const learnDiscoDance = useCallback(async () => {
    if (!isFeatureEnabled("discoDanceLearn") || !discoSoloOk) return;
    const buf = discoRecordBufRef.current;
    if (buf.sampleCount < DISCO_RECORD_MIN_SAMPLES) {
      setError(
        `Need at least ${(DISCO_RECORD_MIN_SAMPLES / 30).toFixed(0)}s of disco recording.`,
      );
      return;
    }
    const body = activeDiscoDesign();
    const shape = shapeForDanceDesign(body);
    const dataset = buf.toDataset();
    const warm =
      danceGenome && shapesCompatible(danceGenome.shape, shape)
        ? danceGenome.genome.weights
        : null;
    setDiscoLearning(true);
    setDiscoLearnProgress({ epoch: 0, epochs: 40, loss: 0 });
    try {
      const result = await fitImitation({
        shape,
        dataset,
        seed: (0xd15c0d4e ^ (body.muscles.length * 9973)) >>> 0,
        epochs: 40,
        lr: 0.05,
        batchSize: 32,
        yieldEvery: 1,
        initialWeights: warm,
        onProgress: (p) => setDiscoLearnProgress(p),
      });
      const genome: Genome = {
        weights: result.weights,
        fitness: imitationFitness(result.finalLoss),
      };
      setDanceGenome({ shape, genome });
      setDanceStage("imitate");
      setDiscoLearnProgress({
        epoch: 40,
        epochs: 40,
        loss: result.finalLoss,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDiscoLearning(false);
    }
  }, [activeDiscoDesign, danceGenome, discoSoloOk]);

  const beginDiscoFreestyle = useCallback(() => {
    if (!isFeatureEnabled("discoDanceLearn") || !danceGenome || !discoSoloOk) {
      return;
    }
    discoRecordingRef.current = false;
    setDiscoRecording(false);
    const body = cloneDesign(activeDiscoDesign());
    if (simulation.isMultiDisco) {
      simulation.clearDiscoDancers();
    }
    designRef.current = body;
    setDesign(body);
    simulation.loadDesign(body);
    simulation.setDiscoPuppetMode(discoPuppetMode);
    simulation.setBrain(danceGenome.shape, danceGenome.genome.weights);
    setDriveMode("brain");
    driveModeRef.current = "brain";
    simulation.driveMode = "brain";
    setDiscoFreestyle(true);
    if (!discoPlayer.isPlaying()) {
      discoPlayer.play();
      setDiscoPlaying(true);
    }
  }, [
    activeDiscoDesign,
    danceGenome,
    discoPlayer,
    discoPuppetMode,
    discoSoloOk,
    simulation,
  ]);

  const exitDiscoFreestyle = useCallback(() => {
    setDiscoFreestyle(false);
    simulation.clearBrain();
    if (discoPlayer.hasTrack()) {
      beginDiscoDrive();
    } else {
      setDriveMode("idle");
      driveModeRef.current = "idle";
      simulation.driveMode = "idle";
    }
  }, [beginDiscoDrive, discoPlayer, simulation]);

  const toggleDiscoFreestyle = useCallback(() => {
    if (discoFreestyle) exitDiscoFreestyle();
    else beginDiscoFreestyle();
  }, [beginDiscoFreestyle, discoFreestyle, exitDiscoFreestyle]);

  const saveDanceModel = useCallback(() => {
    if (!danceGenome) {
      setError("No dance brain to save.");
      return;
    }
    const body = activeDiscoDesign();
    saveModel({
      name: `${body.name || "Dancer"} · dance`,
      task: "dance",
      shape: danceGenome.shape,
      genome: danceGenome.genome,
      design: body,
      danceMeta: {
        obsPackVersion: DANCE_OBS_PACK_VERSION,
        stage: danceStage,
        playlistFingerprint: playlistFingerprint(discoPlaylist),
      },
    });
    refreshModels();
  }, [
    activeDiscoDesign,
    danceGenome,
    danceStage,
    discoPlaylist,
    refreshModels,
  ]);

  const refreshDiscoSetups = useCallback(() => {
    if (!isFeatureEnabled("discoSetups")) return;
    setDiscoSetups(loadDiscoSetups());
  }, []);

  /** H8 — name + persist full Disco stage (not audio files). */
  const saveCurrentDiscoSetup = useCallback(() => {
    if (!isFeatureEnabled("discoSetups")) return;
    const suggested =
      discoSlots.find((s) => s)?.label?.trim() ||
      discoTrack.trim() ||
      "Disco setup";
    const name = window.prompt("Name this Disco setup", suggested);
    if (!name?.trim()) return;
    const setup = captureDiscoSetup({
      name: name.trim(),
      gains: discoGains,
      motion: discoMotion,
      auto: discoAuto,
      routing: discoRouting,
      puppetMode: discoPuppetMode,
      footMass,
      hideMuscles: discoHideMuscles,
      hideBones: discoHideBones,
      greenscreen: discoGreenscreen,
      ballX: discoBallPos.x,
      ballY: discoBallPos.y,
      slots: discoSlots,
      trackHint: discoTrack.trim() || undefined,
      danceBrain: danceGenome
        ? {
            shape: danceGenome.shape,
            weights: danceGenome.genome.weights,
            fitness: danceGenome.genome.fitness,
            stage: danceStage,
          }
        : undefined,
    });
    saveDiscoSetup(setup);
    refreshDiscoSetups();
    if (isFeatureEnabled("jsonImportExport")) {
      downloadText(
        `${name.trim().replace(/\s+/g, "_")}_disco_setup.json`,
        exportDiscoSetupJson(setup),
      );
    }
  }, [
    danceGenome,
    danceStage,
    discoAuto,
    footMass,
    discoGains,
    discoGreenscreen,
    discoBallPos.x,
    discoBallPos.y,
    discoHideBones,
    discoHideMuscles,
    discoMotion,
    discoPuppetMode,
    discoRouting,
    discoSlots,
    discoTrack,
    refreshDiscoSetups,
  ]);

  const loadDiscoSetupById = useCallback(
    (id: string) => {
      if (!isFeatureEnabled("discoSetups")) return;
      const setup = loadDiscoSetups().find((s) => s.id === id);
      if (!setup) {
        setError("Disco setup not found.");
        refreshDiscoSetups();
        return;
      }
      if (discoFreestyle) {
        setDiscoFreestyle(false);
        simulation.clearBrain();
        if (driveModeRef.current === "brain") {
          setDriveMode("idle");
          driveModeRef.current = "idle";
          simulation.driveMode = "idle";
        }
      }
      setDiscoGains({ ...setup.gains });
      setDiscoMotion({ ...setup.motion });
      setDiscoAuto({ ...setup.auto });
      discoAutoTickRef.current.initialized = false;
      setDiscoRouting({ ...setup.routing });
      setDiscoPuppetMode(setup.puppetMode);
      simulation.setDiscoPuppetMode(setup.puppetMode);
      setDesign((prev) => ({
        ...prev,
        footMass: clampFootMass(setup.footMass),
      }));
      simulation.setFootMass(setup.footMass);
      setDiscoHideMuscles(setup.hideMuscles);
      simulation.hideMuscles = setup.hideMuscles;
      setDiscoHideBones(setup.hideBones);
      simulation.hideBones = setup.hideBones;
      setDiscoGreenscreen(setup.greenscreen);
      setDiscoBallPos({ x: setup.ballX, y: setup.ballY });
      setDiscoSlots(
        setup.slots.map((s) =>
          s
            ? {
                design: cloneDesign(s.design),
                label: s.label,
                ...(typeof s.offsetX === "number" ? { offsetX: s.offsetX } : {}),
              }
            : null,
        ),
      );
      const brain = danceBrainFromSetup(setup);
      if (brain) {
        setDanceGenome({
          shape: brain.shape,
          genome: { weights: brain.weights, fitness: brain.fitness },
        });
        setDanceStage(brain.stage);
      } else {
        setDanceGenome(null);
        setDanceStage("imitate");
      }
    },
    [discoFreestyle, refreshDiscoSetups, simulation],
  );

  const deleteDiscoSetupById = useCallback(
    (id: string) => {
      if (!isFeatureEnabled("discoSetups")) return;
      const setup = discoSetups.find((s) => s.id === id);
      if (
        setup &&
        !window.confirm(`Delete Disco setup “${setup.name}”?`)
      ) {
        return;
      }
      deleteDiscoSetup(id);
      refreshDiscoSetups();
    },
    [discoSetups, refreshDiscoSetups],
  );

  const addCurriculumFiles = useCallback((files: File[]) => {
    setDiscoPlaylist((prev) => {
      const next = addPlaylistFiles(prev, files);
      if (prev.length === 0 && next.length > 0) {
        const id = next[next.length - 1]!.id;
        queueMicrotask(() => setDiscoPlaylistActiveId(id));
      }
      return next;
    });
  }, []);

  const removeCurriculumTrack = useCallback((id: string) => {
    setDiscoPlaylist((prev) => removePlaylistTrack(prev, id));
    curriculumDatasetRef.current.clearTrack(id);
    setCurriculumSamples(curriculumDatasetRef.current.sampleCount());
    setCurriculumDuration(curriculumDatasetRef.current.durationSec());
    setDiscoPlaylistActiveId((cur) => (cur === id ? null : cur));
  }, []);

  const analyzeCurriculumAll = useCallback(async () => {
    if (!isFeatureEnabled("discoDanceCurriculum")) return;
    for (const track of discoPlaylistRef.current) {
      if (track.analysis || !track.file) continue;
      setDiscoPlaylist((prev) =>
        prev.map((t) =>
          t.id === track.id ? { ...t, analyzing: true, error: null } : t,
        ),
      );
      try {
        const analysis = await analyzeAudioFile(track.file);
        setDiscoPlaylist((prev) =>
          prev.map((t) =>
            t.id === track.id
              ? { ...t, analysis, analyzing: false, error: null }
              : t,
          ),
        );
      } catch (err) {
        setDiscoPlaylist((prev) =>
          prev.map((t) =>
            t.id === track.id
              ? {
                  ...t,
                  analyzing: false,
                  error: err instanceof Error ? err.message : String(err),
                }
              : t,
          ),
        );
      }
    }
  }, []);

  const selectCurriculumTrack = useCallback(
    async (id: string) => {
      setDiscoPlaylistActiveId(id);
      const track = discoPlaylistRef.current.find((t) => t.id === id);
      if (!track?.file) return;
      try {
        await discoPlayer.loadFile(track.file);
        setDiscoTrack(track.name);
        setDiscoPlaying(false);
        setDiscoTrackTime(0);
        const d = discoPlayer.duration();
        setDiscoTrackDuration(Number.isFinite(d) ? d : 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [discoPlayer],
  );

  const startCurriculumRecord = useCallback(() => {
    if (!isFeatureEnabled("discoDanceCurriculum") || !discoSoloOk) return;
    const id = discoPlaylistActiveId;
    if (!id) {
      setError("Select a playlist track to record.");
      return;
    }
    const track = discoPlaylistRef.current.find((t) => t.id === id);
    if (!track?.analysis) {
      setError("Analyze the track before curriculum record.");
      return;
    }
    curriculumTrackIdRef.current = id;
    curriculumRecordingRef.current = true;
    setCurriculumRecording(true);
    if (driveModeRef.current !== "disco") beginDiscoDrive();
    if (!discoPlayer.isPlaying()) {
      discoPlayer.play();
      setDiscoPlaying(true);
    }
  }, [beginDiscoDrive, discoPlayer, discoPlaylistActiveId, discoSoloOk]);

  const stopCurriculumRecord = useCallback(() => {
    curriculumRecordingRef.current = false;
    curriculumTrackIdRef.current = null;
    setCurriculumRecording(false);
  }, []);

  const learnCurriculum = useCallback(async () => {
    if (!isFeatureEnabled("discoDanceCurriculum") || !discoSoloOk) return;
    const ds = curriculumDatasetRef.current;
    if (ds.sampleCount() < DISCO_RECORD_MIN_SAMPLES) {
      setError(
        `Need at least ${(DISCO_RECORD_MIN_SAMPLES / 30).toFixed(0)}s of curriculum recording.`,
      );
      return;
    }
    const body = activeDiscoDesign();
    const shape = shapeForDanceDesign(body);
    const { train, holdout } = ds.splitHoldout(5);
    const warm =
      danceGenome && shapesCompatible(danceGenome.shape, shape)
        ? danceGenome.genome.weights
        : null;
    setCurriculumLearning(true);
    setCurriculumLearnProgress({ epoch: 0, epochs: 80, loss: 0 });
    try {
      const result = await fitMultiTrackImitation({
        shape,
        train,
        holdout,
        seed: (0xc0111c01 ^ (body.muscles.length * 4243)) >>> 0,
        epochs: 80,
        lr: 0.05,
        batchSize: 32,
        initialWeights: warm,
        onProgress: (p) => setCurriculumLearnProgress(p),
      });
      setDanceGenome({
        shape,
        genome: {
          weights: result.weights,
          fitness: imitationFitness(result.finalLoss),
        },
      });
      setDanceStage("imitate");
      setCurriculumLearnProgress({
        epoch: 80,
        epochs: 80,
        loss: result.finalLoss,
        holdoutLoss: result.holdoutLoss,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCurriculumLearning(false);
    }
  }, [activeDiscoDesign, danceGenome, discoSoloOk]);

  const refineCurriculum = useCallback(async () => {
    if (
      !isFeatureEnabled("discoDanceCurriculum") ||
      !discoSoloOk ||
      !danceGenome
    ) {
      return;
    }
    const id = discoPlaylistActiveId;
    const track = discoPlaylistRef.current.find((t) => t.id === id);
    if (!track?.analysis) {
      setError("Select an analyzed playlist track to refine on.");
      return;
    }
    const body = activeDiscoDesign();
    const teacher = curriculumDatasetRef.current.toDataset(
      bodyFingerprint(body),
    );
    setCurriculumRefining(true);
    setCurriculumRefineProgress({
      generation: 0,
      generations: 12,
      bestFitness: 0,
      meanFitness: 0,
    });
    try {
      const result = await refineDanceBrain({
        sim: simulation,
        design: body,
        shape: danceGenome.shape,
        seedWeights: danceGenome.genome.weights,
        analysis: track.analysis,
        seed: (0x7ef1e001 ^ (body.muscles.length * 1337)) >>> 0,
        generations: 12,
        populationSize: 10,
        episodeSeconds: 8,
        teacherDataset: teacher.inputs.length > 0 ? teacher : null,
        onProgress: (p) => setCurriculumRefineProgress(p),
      });
      setDanceGenome({
        shape: result.shape,
        genome: result.best,
      });
      setDanceStage("refine");
      simulation.setBrain(result.shape, result.best.weights);
      simulation.setDiscoPuppetMode(discoPuppetMode);
      setDriveMode("brain");
      driveModeRef.current = "brain";
      simulation.driveMode = "brain";
      setDiscoFreestyle(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCurriculumRefining(false);
    }
  }, [
    activeDiscoDesign,
    danceGenome,
    discoPlaylistActiveId,
    discoPuppetMode,
    discoSoloOk,
    simulation,
  ]);

  const clearCurriculumDataset = useCallback(() => {
    curriculumDatasetRef.current.clear();
    setCurriculumSamples(0);
    setCurriculumDuration(0);
  }, []);

  useEffect(() => {
    return () => {
      disposePlaylist(discoPlaylistRef.current);
    };
  }, []);

  /** Respawn dancers at spawn pose; keep audio + disco drive running. */
  const resetDiscoPose = useCallback(() => {
    if (syncMultiDisco()) {
      simulation.setDiscoPuppetMode(discoPuppetMode);
      return;
    }
    if (designRef.current.joints.length > 0) {
      simulation.loadDesign(designRef.current);
      if (driveModeRef.current === "disco") {
        simulation.driveMode = "disco";
        simulation.setDiscoPuppetMode(discoPuppetMode);
      }
    }
  }, [discoPuppetMode, simulation, syncMultiDisco]);

  /** Enter the Disco skill arena (env + sim viewport). Audio optional until Start dancing. */
  const enterDiscoSkill = useCallback(() => {
    captureLiveElite();
    if (simulation.isHeadToHead) simulation.abortHeadToHead();
    setH2hRunning(false);
    setH2hProgress(null);
    applyDiscoEnvironment();
    if (!syncMultiDisco() && designRef.current.joints.length > 0) {
      simulation.loadDesign(designRef.current);
    }
    simulation.setDiscoPuppetMode(discoPuppetMode);
    simulation.setFootMass(footMass);
    setMode("sim");
    setSandboxTab("skill");
    if (discoPlayer.hasTrack()) {
      beginDiscoDrive();
    } else {
      setDriveMode("idle");
      driveModeRef.current = "idle";
      simulation.driveMode = "idle";
    }
  }, [
    applyDiscoEnvironment,
    beginDiscoDrive,
    captureLiveElite,
    footMass,
    discoPlayer,
    discoPuppetMode,
    simulation,
    syncMultiDisco,
  ]);

  const leaveDiscoSkill = useCallback((restoreEnvironment = true) => {
    stopDiscoDrive();
    if (simulation.isMultiDisco) {
      simulation.clearDiscoDancers();
      if (designRef.current.joints.length > 0) {
        simulation.loadDesign(designRef.current);
      }
    }
    simulation.clearDiscoPuppetBodyTune();
    if (restoreEnvironment) restorePreDiscoEnvironment();
  }, [restorePreDiscoEnvironment, simulation, stopDiscoDrive]);

  useEffect(() => {
    setBoxingSparringId((id) =>
      normalizeSparringOpponentId(boxingDivisionId, id),
    );
  }, [boxingDivisionId]);

  const enterBoxingSkill = useCallback(() => {
    captureLiveElite();
    if (simulation.isHeadToHead) simulation.abortHeadToHead();
    setH2hRunning(false);
    setH2hProgress(null);
    simulation.abortBoxingMatch();
    simulation.abortJoustMatch();
    setBoxingRunning(false);
    setBoxingProgress(null);
    setJoustingRunning(false);
    setJoustingProgress(null);
    simulation.clearDiscoDancers();
    applyBoxingEnvironment();
    const body = designRef.current;
    if (body.joints.length === 0) {
      setError(
        "No creature loaded — build or load a fighter that meets the selected Boxing division rules before training.",
      );
    } else {
      const eligibility = boxingEligibility(body, boxingDivisionId);
      if (!eligibility.eligible) {
        const division = getBoxingDivision(boxingDivisionId);
        setError(
          `Current creature is not suitable for ${division.name} training: ${eligibility.reasons.join(" ")} Your design was kept — adjust the body or pick another division.`,
        );
      } else {
        setError(null);
      }
      simulation.loadDesign(body);
      simulation.setTask("boxing");
    }
    setDriveMode("idle");
    driveModeRef.current = "idle";
    simulation.driveMode = "idle";
    setMode("sim");
    setSandboxTab("skill");
  }, [
    applyBoxingEnvironment,
    boxingDivisionId,
    captureLiveElite,
    simulation,
  ]);

  const leaveBoxingSkill = useCallback((restoreEnvironment = true) => {
    simulation.abortBoxingMatch();
    setBoxingRunning(false);
    setBoxingProgress(null);
    if (restoreEnvironment) restorePreBoxingEnvironment();
  }, [restorePreBoxingEnvironment, simulation]);

  const enterJoustingSkill = useCallback(() => {
    captureLiveElite();
    if (simulation.isHeadToHead) simulation.abortHeadToHead();
    setH2hRunning(false);
    setH2hProgress(null);
    simulation.abortBoxingMatch();
    simulation.abortJoustMatch();
    setBoxingRunning(false);
    setBoxingProgress(null);
    setJoustingRunning(false);
    setJoustingProgress(null);
    simulation.clearDiscoDancers();
    applyJoustingEnvironment();
    const body = designRef.current;
    if (body.joints.length === 0) {
      setError(
        "No creature loaded — mark a lance and a target (or head) before training.",
      );
    } else {
      const eligibility = joustingEligibility(body);
      if (!eligibility.eligible) {
        setError(
          `Current creature is not suitable for jousting: ${eligibility.reasons.join(" ")} Your design was kept — mark a lance tip and a target.`,
        );
      } else {
        setError(null);
      }
      simulation.loadDesign(body);
      simulation.setTask("jousting");
    }
    setDriveMode("idle");
    driveModeRef.current = "idle";
    simulation.driveMode = "idle";
    setMode("sim");
    setSandboxTab("skill");
  }, [applyJoustingEnvironment, captureLiveElite, simulation]);

  const leaveJoustingSkill = useCallback((restoreEnvironment = true) => {
    simulation.abortJoustMatch();
    setJoustingRunning(false);
    setJoustingProgress(null);
    if (restoreEnvironment) restorePreJoustingEnvironment();
  }, [restorePreJoustingEnvironment, simulation]);

  /** H7 — load a saved dance brain into Disco freestyle (not Free evolve). */
  const loadDanceFreestyle = useCallback(
    (model: SavedModel) => {
      if (model.task !== "dance") {
        setError("Not a dance model.");
        return;
      }
      const seed = modelToSeed(model);
      setDanceGenome({
        shape: seed.shape,
        genome: { weights: seed.weights, fitness: model.fitness },
      });
      setDanceStage(model.danceMeta?.stage ?? "imitate");
      if (skill !== "disco") {
        setSkill("disco");
        saveActiveSkill("disco");
        enterDiscoSkill();
      }
      discoRecordingRef.current = false;
      setDiscoRecording(false);
      const body = cloneDesign(activeDiscoDesign());
      if (simulation.isMultiDisco) simulation.clearDiscoDancers();
      designRef.current = body;
      setDesign(body);
      simulation.loadDesign(body);
      simulation.setDiscoPuppetMode(discoPuppetMode);
      simulation.setBrain(seed.shape, seed.weights);
      setDriveMode("brain");
      driveModeRef.current = "brain";
      simulation.driveMode = "brain";
      setDiscoFreestyle(true);
      setMode("sim");
      setSandboxTab("edit");
    },
    [
      activeDiscoDesign,
      discoPuppetMode,
      enterDiscoSkill,
      simulation,
      skill,
    ],
  );

  const commitDesign = useCallback(
    (next: CreatureDesign) => {
      undoStackRef.current.push(cloneDesign(designRef.current));
      if (undoStackRef.current.length > MAX_UNDO) {
        undoStackRef.current.shift();
      }
      setUndoCount(undoStackRef.current.length);
      const applied = ensureAppearance(next);
      const promoted = simulation.isEvolving
        ? simulation.abortLiveEvolve()
        : null;
      setDesign(applied);
      const adapted = adaptEliteToDesign(
        promoted ?? bestGenomeRef.current,
        applied,
        {
          task: activeTaskRef.current,
          raycast:
            isFeatureEnabled("raycastObservations") && raycastObservationsOn,
        },
      );
      if (adapted) {
        const prior = promoted ?? bestGenomeRef.current;
        const transplanted = !!prior && adapted !== prior;
        setBestGenome(adapted);
        preferBestOfRun();
        setEvolveProgress((prev) => ({
          ...prev,
          running: false,
          bestFitness: adapted.genome.fitness,
          status: transplanted
            ? "Brain adapted to new parts — Keep training to refine"
            : promoted
              ? "Paused — elite saved"
              : prev.status === "Idle"
                ? "Paused — brain kept"
                : prev.status,
        }));
      } else {
        const hadElite = !!(promoted ?? bestGenomeRef.current);
        setBestGenome(null);
        setEvolveProgress(idleProgress());
        simulation.clearBrain();
        setGaKnobs((prev) =>
          prev.startFrom === "best_of_run"
            ? { ...prev, startFrom: "fresh" }
            : prev,
        );
        if (driveModeRef.current === "brain") {
          setDriveMode("idle");
          simulation.driveMode = "idle";
        }
        if (hadElite) {
          setError(
            "Brain could not adapt to this body (observation layout changed). Undo the edit or Evolve fresh.",
          );
        }
      }
    },
    [preferBestOfRun, raycastObservationsOn, simulation],
  );

  const applyFootMass = useCallback(
    (mass: number) => {
      const m = clampFootMass(mass);
      commitDesign({ ...designRef.current, footMass: m });
      simulation.setFootMass(m);
    },
    [commitDesign, simulation],
  );

  const applyWheelMass = useCallback(
    (mass: number) => {
      const m = clampWheelMass(mass);
      commitDesign({ ...designRef.current, wheelMass: m });
      simulation.setWheelMass(m);
    },
    [commitDesign, simulation],
  );

  const undo = useCallback(() => {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    setUndoCount(undoStackRef.current.length);
    const promoted = simulation.isEvolving
      ? simulation.abortLiveEvolve()
      : null;
    setDesign(prev);
    const adapted = adaptEliteToDesign(
      promoted ?? bestGenomeRef.current,
      prev,
      {
        task: activeTaskRef.current,
        raycast:
          isFeatureEnabled("raycastObservations") && raycastObservationsOn,
      },
    );
    if (adapted) {
      setBestGenome(adapted);
      preferBestOfRun();
    } else {
      setBestGenome(null);
      setEvolveProgress(idleProgress());
      simulation.clearBrain();
      setGaKnobs((prev) =>
        prev.startFrom === "best_of_run"
          ? { ...prev, startFrom: "fresh" }
          : prev,
      );
      if (driveModeRef.current === "brain") {
        setDriveMode("idle");
        simulation.driveMode = "idle";
      }
    }
  }, [preferBestOfRun, raycastObservationsOn, simulation]);
  const commitEnv = useCallback(
    (
      next: EnvironmentDesign,
      opts?: { packageId?: string | null },
    ) => {
      envUndoStackRef.current.push(cloneEnvironment(envDesignRef.current));
      if (envUndoStackRef.current.length > MAX_UNDO) {
        envUndoStackRef.current.shift();
      }
      setEnvUndoCount(envUndoStackRef.current.length);
      setEnvDesign(cloneEnvironment(next));
      if (opts && "packageId" in opts) {
        setActiveEnvPackageId(opts.packageId ?? null);
      } else {
        setActiveEnvPackageId(null);
      }
    },
    [],
  );
  const undoEnv = useCallback(() => {
    const prev = envUndoStackRef.current.pop();
    if (!prev) return;
    setEnvUndoCount(envUndoStackRef.current.length);
    setEnvDesign(prev);
    setActiveEnvPackageId(null);
    setEnvSelection([]);
  }, []);
  const courseBaseForResolve = useCallback((): EnvironmentDesign | null => {
    if (courseBaseEnvRef.current) return courseBaseEnvRef.current;
    if (activeEnvPackageId) {
      const pkg = envPackages.find((p) => p.id === activeEnvPackageId);
      if (pkg) return pkg.environment;
    }
    return envDesign;
  }, [activeEnvPackageId, envDesign, envPackages]);

  /** Apply a curriculum stage window onto the active course package / draft. */
  const applyCourseStage = useCallback(
    (
      packageId: string | null,
      stageIndex: number,
      opts?: { selectSprint?: boolean; baseEnv?: EnvironmentDesign },
    ) => {
      const base =
        opts?.baseEnv ??
        courseBaseEnvRef.current ??
        (packageId
          ? envPackages.find((p) => p.id === packageId)?.environment
          : null) ??
        envDesign;
      courseBaseEnvRef.current = cloneEnvironment(base);
      const curriculum = resolveCourseCurriculum(packageId, base);
      if (!curriculum) return false;
      const idx = clampCourseStageIndex(curriculum, stageIndex);
      const staged = applyCourseCurriculumStage(curriculum, idx);
      setEnvDesign(staged);
      if (packageId) setActiveEnvPackageId(packageId);
      setCourseStageIndex(idx);
      setEnvSelection([]);
      if (opts?.selectSprint) {
        setGoalId("sprint");
      }
      return true;
    },
    [envDesign, envPackages],
  );

  /** Apply a saved package as the active training / studio environment. */
  const applyTrainingEnv = useCallback(
    (pkg: EnvironmentPackage) => {
      courseBaseEnvRef.current = cloneEnvironment(pkg.environment);
      const curriculum = resolveCourseCurriculum(pkg.id, pkg.environment);
      if (courseCurriculumOn && curriculum) {
        applyCourseStage(pkg.id, 0, {
          selectSprint: true,
          baseEnv: pkg.environment,
        });
        setCourseCurriculumOn(true);
        return;
      }
      setEnvDesign(cloneEnvironment(pkg.environment));
      setActiveEnvPackageId(pkg.id);
      setEnvSelection([]);
      setCourseStageIndex(0);
    },
    [applyCourseStage, courseCurriculumOn],
  );
  const deleteEnvSelected = useCallback(() => {
    if (envSelection.length === 0) return;
    commitEnv(deleteSelectables(envDesignRef.current, envSelection));
    setEnvSelection([]);
  }, [commitEnv, envSelection]);

  const duplicateEnvSelected = useCallback(() => {
    if (envSelection.length === 0) return;
    const result = duplicateEnvSelection(envDesignRef.current, envSelection);
    commitEnv(result.env);
    setEnvSelection(result.items);
  }, [commitEnv, envSelection]);

  const rotateEnvSelected = useCallback(() => {
    if (envSelection.length === 0) return;
    commitEnv(rotateEnvSelection(envDesignRef.current, envSelection, -Math.PI / 2));
  }, [commitEnv, envSelection]);
  useEffect(() => {
    let cancelled = false;
    simulation
      .init()
      .then(() => {
        if (cancelled) return;
        simulation.setEnvironment(envDesignRef.current);
        simulation.setTask(activeTaskRef.current);
        const body = designRef.current;
        if (body.joints.length > 0) {
          simulation.loadDesign(body);
        }
        const tab = sandboxTabRef.current;
        if (tab === "train") {
          setMode("sim");
          simulation.running = true;
        } else if (tab === "world") {
          setMode("world");
          simulation.running = false;
        } else {
          simulation.running = false;
        }
        setReady(true);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [simulation]);
  useEffect(() => {
    simulation.driveMode = driveMode;
  }, [driveMode, simulation]);
  useEffect(() => {
    simulation.setBrainHz(brainHz);
  }, [brainHz, simulation]);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (mode !== "edit" || editPhysics) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      const multi = isFeatureEnabled("editorMultiSelectTransforms");

      if (mod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if (!multi) return;

      if (mod && key === "a") {
        e.preventDefault();
        setSelection(jointsSelection(design.joints.map((j) => j.id)));
        setTool("select");
        return;
      }

      const jointIds = selectedJointIds(selection);
      if (mod && key === "d" && jointIds.length > 0) {
        e.preventDefault();
        const result = duplicateSelection(design, jointIds);
        commitDesign(result.design);
        setSelection(jointsSelection(result.newJointIds));
        return;
      }
      if (mod && key === "m" && jointIds.length > 0) {
        e.preventDefault();
        const result = mirrorDuplicateSelection(design, jointIds);
        commitDesign(result.design);
        setSelection(jointsSelection(result.newJointIds));
        return;
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        jointIds.length > 0
      ) {
        e.preventDefault();
        commitDesign(deleteJointSelection(design, jointIds));
        setSelection(null);
        return;
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selection?.kind === "cloth"
      ) {
        e.preventDefault();
        commitDesign(removeClothGarment(design, selection.index));
        setSelection(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, undo, editPhysics, design, selection, commitDesign]);
  const selectGoal = (id: GoalId) => {
    setGoalId(id);
    saveActiveGoalId(id);
    simulation.setTask(getGoal(id).task);
    // Free-task goals share the same obs/actuator layout — keep the elite brain.
    captureLiveElite();
  };
  const selectSkill = (id: SkillId) => {
    if (id === "disco" && !isFeatureEnabled("discoMode")) return;
    if (id === "boxing" && !isFeatureEnabled("boxingMode")) return;
    if (id === "jousting" && !isFeatureEnabled("joustingMode")) return;
    const prev = skill;
    if (prev === "disco" && id !== "disco") {
      leaveDiscoSkill(id !== "boxing" && id !== "jousting");
    }
    if (prev === "boxing" && id !== "boxing") {
      leaveBoxingSkill(id !== "disco" && id !== "jousting");
    }
    if (prev === "jousting" && id !== "jousting") {
      leaveJoustingSkill(id !== "disco" && id !== "boxing");
    }
    setSkill(id);
    saveActiveSkill(id);
    if (id === "disco") {
      enterDiscoSkill();
      return;
    }
    if (id === "boxing") {
      const next = defaultGoalForSkill(id);
      setGoalId(next.id);
      saveActiveGoalId(next.id);
      enterBoxingSkill();
      return;
    }
    if (id === "jousting") {
      const next = defaultGoalForSkill(id);
      setGoalId(next.id);
      saveActiveGoalId(next.id);
      enterJoustingSkill();
      return;
    }
    const next = defaultGoalForSkill(id);
    setGoalId(next.id);
    saveActiveGoalId(next.id);
    simulation.setTask(next.task);
    captureLiveElite();
  };
  /** Spawn `next` (or the current design) in the sim without changing tabs. */
  const syncDesignToSim = (designOverride?: CreatureDesign) => {
    const next = designOverride ?? design;
    if (next.joints.length === 0) return false;
    if (!simulation.world) return false;
    try {
      const elite = captureLiveElite();
      if (simulation.isHeadToHead) simulation.abortHeadToHead();
      simulation.abortBoxingMatch();
      simulation.abortJoustMatch();
      simulation.clearDiscoDancers();
      setH2hRunning(false);
      setH2hProgress(null);
      setBoxingRunning(false);
      setBoxingProgress(null);
      setJoustingRunning(false);
      setJoustingProgress(null);
      setLiveBrain(null);
      simulation.setTask(activeTask);
      simulation.loadDesign(next);
      setManualDrives(simulation.manualDrives.slice());
      setMode("sim");
      const adapted = adaptEliteToDesign(elite, next, {
        task: activeTaskRef.current,
        raycast:
          isFeatureEnabled("raycastObservations") && raycastObservationsOn,
      });
      if (adapted) {
        setBestGenome(adapted);
        preferBestOfRun();
        simulation.setRaycastObservations(raycastObservationsOn);
        simulation.setBrain(adapted.shape, adapted.genome.weights);
        setDriveMode("brain");
        simulation.driveMode = "brain";
        setEvolveProgress((prev) => ({
          ...prev,
          running: false,
          bestFitness: adapted.genome.fitness,
          status: "Ready — continuing from last brain",
        }));
      } else {
        setDriveMode("idle");
        simulation.driveMode = "idle";
        if (!elite) setEvolveProgress(idleProgress());
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  };

  const startEditPhysics = () => {
    if (design.joints.length === 0) {
      setError("Add at least one joint before enabling physics.");
      return;
    }
    if (syncDesignToSim(design)) {
      setEditPhysics(true);
      setSandboxTab("edit");
      simulation.timeScale = observeSpeed;
    }
  };

  const stopEditPhysics = () => {
    setEditPhysics(false);
    simulation.running = false;
    setMode("edit");
    setSandboxTab("edit");
    setDockInset(0);
  };
  /** Drop the current design into the sim viewport and open Train. */
  const startSim = (designOverride?: CreatureDesign) => {
    const next = designOverride ?? design;
    if (next.joints.length === 0) {
      returnToEdit();
      return;
    }
    setEditPhysics(false);
    if (syncDesignToSim(next)) setSandboxTab("train");
  };
  const onSandboxTabChange = (tab: SandboxTabId) => {
    if (tab === "edit") {
      if (skill === "disco") leaveDiscoSkill();
      if (skill === "boxing") leaveBoxingSkill();
      if (skill === "jousting") leaveJoustingSkill();
      if (editPhysics) {
        // Stay in settle preview if already watching physics on Edit.
        setSandboxTab("edit");
        return;
      }
      returnToEdit();
      return;
    }
    if (tab === "world") {
      if (skill === "disco") leaveDiscoSkill();
      if (skill === "boxing") leaveBoxingSkill();
      if (skill === "jousting") leaveJoustingSkill();
      setEditPhysics(false);
      enterWorld();
      return;
    }
    if (tab === "train") {
      if (design.joints.length === 0) {
        returnToEdit();
        return;
      }
      setEditPhysics(false);
      if (!simulation.world) {
        setSandboxTab("train");
        return;
      }
      if (simulation.isEvolving) {
        setSandboxTab("train");
        return;
      }
      if (simulation.isHeadToHead) {
        setSandboxTab("train");
        setMode("sim");
        return;
      }
      if (skill === "disco" && isFeatureEnabled("discoMode")) {
        enterDiscoSkill();
        setSandboxTab("train");
        return;
      }
      if (skill === "boxing" && isFeatureEnabled("boxingMode")) {
        enterBoxingSkill();
        setSandboxTab("skill");
        return;
      }
      if (skill === "jousting" && isFeatureEnabled("joustingMode")) {
        enterJoustingSkill();
        setSandboxTab("skill");
        return;
      }
      startSim();
      return;
    }
    if (tab === "h2h") {
      setSandboxTab("h2h");
      return;
    }
    if (tab === "skill") {
      setSandboxTab("skill");
      if (skill === "disco" && isFeatureEnabled("discoMode")) {
        enterDiscoSkill();
      }
      if (skill === "boxing" && isFeatureEnabled("boxingMode")) {
        enterBoxingSkill();
      }
      if (skill === "jousting" && isFeatureEnabled("joustingMode")) {
        enterJoustingSkill();
      }
      return;
    }
    if (tab === "discoveries") {
      setSandboxTab("discoveries");
      return;
    }
    if (tab === "creatures") {
      setSandboxTab("creatures");
      return;
    }
    if (tab === "tutorial") {
      setSandboxTab("tutorial");
      setTutorialHelpKey(null);
      return;
    }
    setSandboxTab(tab);
  };

  const onTutorialJump = (jump: TutorialJump) => {
    setTutorialResume({ chapterId: jump.chapterId, view: jump.view });
    setTutorialHelpKey(jump.helpKey);
    onSandboxTabChange(jump.tab);
  };

  const returnToTutorialFromHelp = () => {
    setTutorialHelpKey(null);
    setSandboxTab("tutorial");
  };

  const exitTutorialHelp = () => {
    setTutorialHelpKey(null);
  };

  const onHoverHelpChange = (on: boolean) => {
    setHoverHelpEnabled(on);
    saveHoverHelpEnabled(on);
  };

  const loadPreset = (preset: CreatureDesign, creatureKey?: string) => {
    const next = ensureAppearance(cloneDesign(preset));
    commitDesign(next);
    setSaveName(next.name || "Custom");
    if (creatureKey !== undefined) setSelectedCreatureKey(creatureKey);
    // Keep the sim viewport in sync when picking a body while already simulating.
    if (mode === "sim" && !simulation.isEvolving) {
      if (syncDesignToSim(next) && editPhysics) {
        setSandboxTab("edit");
        simulation.timeScale = observeSpeed;
      }
    }
  };

  const applyImportedModel = (
    m: {
      name: string;
      task: TaskId;
      shape: NetworkShape;
      weights: Float32Array;
      fitness: number;
      design: CreatureDesign;
      danceMeta?: import("./library/savedModels").DanceCurriculumMeta;
      boxingMeta?: import("./library/savedModels").BoxingModelMeta;
      joustingMeta?: import("./library/savedModels").JoustingModelMeta;
    },
    opts: { persistToLibrary: boolean },
  ) => {
    loadPreset(m.design, "custom");
    setGoalId(m.task as GoalId);
    saveActiveGoalId(m.task as GoalId);
    simulation.setTask(m.task);
    setBestGenome({
      shape: m.shape,
      genome: { weights: m.weights, fitness: m.fitness },
    });
    if (m.task === "boxing" && (!m.boxingMeta || !isFeatureEnabled("boxingMode"))) {
      setError("Imported Boxing model is incompatible or Boxing is disabled.");
      return;
    }
    if (m.task === "jousting" && (!m.joustingMeta || !isFeatureEnabled("joustingMode"))) {
      setError("Imported Jousting model is incompatible or Jousting is disabled.");
      return;
    }
    if (opts.persistToLibrary && isFeatureEnabled("savedModels")) {
      saveModel({
        name: m.name,
        task: m.task,
        shape: m.shape,
        genome: { weights: m.weights, fitness: m.fitness },
        design: m.design,
        ...(m.danceMeta ? { danceMeta: m.danceMeta } : {}),
        ...(m.boxingMeta ? { boxingMeta: m.boxingMeta } : {}),
        ...(m.joustingMeta ? { joustingMeta: m.joustingMeta } : {}),
      });
      refreshModels();
    }
    if (m.task === "boxing") {
      if (skill === "disco") leaveDiscoSkill(false);
      setSkill("boxing");
      saveActiveSkill("boxing");
      applyBoxingEnvironment();
      simulation.loadDesign(m.design);
      simulation.setTask("boxing");
      setMode("sim");
      setSandboxTab("skill");
      return;
    }
    if (m.task === "jousting") {
      if (skill === "disco") leaveDiscoSkill(false);
      setSkill("jousting");
      saveActiveSkill("jousting");
      applyJoustingEnvironment();
      simulation.loadDesign(m.design);
      simulation.setTask("jousting");
      setMode("sim");
      setSandboxTab("skill");
      return;
    }
    if (mode === "sim" && !simulation.isEvolving) {
      try {
        const body = ensureAppearance(cloneDesign(m.design));
        simulation.loadDesign(body);
        setManualDrives(simulation.manualDrives.slice());
        simulation.setBrain(m.shape, m.weights);
        setDriveMode("brain");
        simulation.driveMode = "brain";
      } catch (err) {
        setFlashNotice(err instanceof Error ? err.message : String(err));
      }
    }
  };

  const shareCurrentElite = () => {
    if (!isFeatureEnabled("creatureSharing")) return;
    if (shareBusyRef.current) return;
    if (!bestGenome) {
      setFlashNotice("Train or load a brain before sharing.");
      return;
    }
    setShareDialogError(null);
    setShareDialogUrl("");
    setShareDialogListed(false);
    setShareDialogPhase("confirm");
    setShareDialogOpen(true);
  };

  const confirmShareElite = async (opts: { listPublic: boolean }) => {
    if (!isFeatureEnabled("creatureSharing")) return;
    if (shareBusyRef.current) return;
    if (!bestGenome) {
      setShareDialogPhase("error");
      setShareDialogError("Train or load a brain before sharing.");
      return;
    }
    const adapted = adaptEliteToDesign(bestGenome, design, {
      task: activeTask,
      raycast:
        isFeatureEnabled("raycastObservations") && raycastObservationsOn,
    });
    if (!adapted) {
      setShareDialogPhase("error");
      setShareDialogError(
        "Brain layout mismatch — cannot share this elite for the current body.",
      );
      return;
    }
    if (adapted !== bestGenome) setBestGenome(adapted);
    const name = trainedModelName(design.name);
    const boxingMeta =
      activeTask === "boxing"
        ? ({
            divisionId: boxingDivisionId,
            ruleVersion: 1,
            obsPackVersion: 2,
            brainHz: 30,
          } as const)
        : undefined;
    const joustingMeta =
      activeTask === "jousting"
        ? ({
            ruleVersion: 1,
            obsPackVersion: 1,
            brainHz: 30,
          } as const)
        : undefined;
    const json = exportModelJson({
      name,
      task: activeTask,
      shape: adapted.shape,
      weights: adapted.genome.weights,
      fitness: adapted.genome.fitness,
      design,
      ...(boxingMeta ? { boxingMeta } : {}),
      ...(joustingMeta ? { joustingMeta } : {}),
    });
    shareBusyRef.current = true;
    setShareBusy(true);
    setShareDialogPhase("busy");
    setShareDialogError(null);
    setShareDialogUrl("");
    setShareDialogListed(false);
    try {
      const result = await createShare(json, {
        listPublic:
          isFeatureEnabled("publicCreationsLibrary") && opts.listPublic,
      });
      if (!result.ok) {
        setShareDialogPhase("error");
        setShareDialogError(result.error);
        return;
      }
      setShareDialogUrl(result.url);
      setShareDialogListed(result.listed);
      setShareDialogPhase("done");
    } finally {
      shareBusyRef.current = false;
      setShareBusy(false);
    }
  };

  const openSharedCreature = async (shareId: string) => {
    if (!isFeatureEnabled("creatureSharing")) return;
    const result = await fetchShare(shareId);
    if (!result.ok) {
      setFlashNotice(result.error);
      return;
    }
    const ok = window.confirm(
      "Open Shared Creature?\n\nThis will replace the creature currently in the workspace.\nYour saved creatures will not be deleted.",
    );
    if (!ok) return;
    const imported = importModelJson(result.raw);
    if (!imported.ok) {
      setFlashNotice(
        "This shared file is not a valid Solemn Sandbox creature.",
      );
      return;
    }
    applyImportedModel(imported.value, { persistToLibrary: false });
    setSandboxTab("creatures");
    setFlashNotice(`Opened shared creature “${imported.value.name}”.`);
  };
  const loadCreatureByKey = (key: string) => {
    if (key === "custom" || key === "current" || !key) {
      setSelectedCreatureKey("custom");
      return;
    }
    if (key.startsWith("preset:")) {
      const name = key.slice("preset:".length);
      const preset =
        name === ULTI_GROOVE_BOT_II.name
          ? ULTI_GROOVE_BOT_II
          : PRESETS.find((p) => p.name === name);
      if (preset) loadPreset(preset, key);
      return;
    }
    if (key.startsWith("pkg:") && isFeatureEnabled("creaturePackages")) {
      const pkg = packages.find((p) => p.id === key.slice("pkg:".length));
      if (!pkg) return;
      loadPreset(
        {
          ...cloneDesign(pkg.design),
          appearance: pkg.appearance,
          name: pkg.displayName,
        },
        key,
      );
    }
  };

  const openCreatureFromBrowser = (key: CreaturesBrowseKey) => {
    loadCreatureByKey(key);
    if (mode !== "edit") {
      returnToEdit();
    } else {
      setSandboxTab("edit");
    }
  };
  const clearDesign = () => {
    commitDesign({
      name: "Custom",
      joints: [],
      bones: [],
      muscles: [],
      appearance: emptyAppearance(),
    });
    setSaveName("Custom");
    setSelectedCreatureKey("custom");
    returnToEdit();
  };
  const updateManual = (index: number, value: number) => {
    simulation.setManualDrive(index, value);
    setManualDrives((prev) => {
      const next = prev.slice();
      next[index] = value;
      return next;
    });
  };
  const resolveEvolveSeed = (seedFrom?: {
    shape: NetworkShape;
    weights: Float32Array;
    morph?: Genome["morph"];
  }):
    | { shape: NetworkShape; weights: Float32Array; morph?: Genome["morph"] }
    | undefined => {
    if (seedFrom) return seedFrom;
    if (!isFeatureEnabled("trainStartFrom")) return undefined;
    const shapeOpts = {
      task: activeTask,
      raycast:
        isFeatureEnabled("raycastObservations") && raycastObservationsOn,
    };
    if (gaKnobs.startFrom === "best_of_run" && bestGenome) {
      const adapted = adaptEliteToDesign(bestGenome, design, shapeOpts);
      if (adapted) {
        return {
          shape: adapted.shape,
          weights: adapted.genome.weights,
          morph: adapted.genome.morph,
        };
      }
      setError(
        "Brain layout mismatch — cannot continue from last brain. Choose Fresh random or undo body edits.",
      );
      return undefined;
    }
    if (gaKnobs.startFrom === "saved" && gaKnobs.savedModelId) {
      const model = savedModels.find((m) => m.id === gaKnobs.savedModelId);
      if (!model || model.task === "dance") return undefined;
      const expected =
        activeTask === "boxing"
          ? shapeForBoxingDesign(design)
          : activeTask === "jousting"
            ? shapeForJoustingDesign(design)
            : shapeForDesign(design, shapeOpts);
      if (!shapesCompatible(model.shape, expected) || model.task !== activeTask) {
        setError(
          "Saved brain shape/task mismatch — pick a matching creature and goal first.",
        );
        return undefined;
      }
      return modelToSeed(model);
    }
    return undefined;
  };

  const startBoxingLiveEvolve = useCallback(
    (
      seedFrom?: { shape: NetworkShape; weights: Float32Array },
      divisionOverride?: BoxingDivisionId,
    ) => {
      const trainingDesign = cloneDesign(designRef.current);
      const divisionId = divisionOverride ?? boxingDivisionId;
      const eligibility = boxingEligibility(trainingDesign, divisionId);
      if (!eligibility.eligible) {
        setError(
          `Not eligible for ${divisionId}: ${eligibility.reasons.join(" ")}`,
        );
        return;
      }
      if (!designHasActuators(trainingDesign, isFeatureEnabled("motorWheels"))) {
        setError("Add at least one muscle before evolving a boxer.");
        return;
      }

      const popSize = isFeatureEnabled("trainRecipes")
        ? gaKnobs.populationSize
        : LIVE_POPULATION_SIZE;
      const batchSize = isFeatureEnabled("trainRecipes")
        ? Math.min(gaKnobs.batchSize, popSize)
        : LIVE_BATCH_SIZE;
      const trySeconds = isFeatureEnabled("trainRecipes")
        ? gaKnobs.episodeSeconds
        : episodeSeconds;
      const maxGens = isFeatureEnabled("trainRecipes")
        ? gaKnobs.maxGenerations
        : LIVE_MAX_GENERATIONS;
      const opponent = resolveSparringOpponent(
        divisionId,
        boxingSparringId,
        runSeed,
      );

      let resolvedSeed = seedFrom;
      if (resolvedSeed) {
        const shape = shapeForBoxingDesign(trainingDesign);
        if (
          resolvedSeed.shape.inputCount !== shape.inputCount ||
          resolvedSeed.shape.hiddenCount !== shape.hiddenCount ||
          resolvedSeed.shape.outputCount !== shape.outputCount ||
          resolvedSeed.weights.length !== shape.weightCount
        ) {
          setError(
            "Seed genome shape mismatch — Boxing continue training needs a matching fighter layout.",
          );
          return;
        }
      }

      // Parallel pairs need open ground; ring walls only for exhibition matches.
      if (isBoxingRingEnv(envDesignRef.current)) {
        restorePreBoxingEnvironment();
      }
      if (isBoxingRingEnv(envDesignRef.current)) {
        const flat = flatGroundEnv("Boxing Training");
        envDesignRef.current = flat;
        setEnvDesign(flat);
        simulation.setEnvironment(flat);
      }

      setBoxingDivisionId(divisionId);
      setMode("sim");
      setSandboxTab("train");
      simulation.timeScale = trainSpeed;
      setDriveMode("brain");
      simulation.driveMode = "brain";
      boxingLiveMetaRef.current = {
        design: trainingDesign,
        divisionId,
      };

      try {
        simulation.startBoxingLiveEvolve({
          design: trainingDesign,
          divisionId,
          opponentDesign: opponent.design,
          opponentWeights: opponent.weights,
          populationSize: popSize,
          batchSize,
          maxGenerations: Math.max(1, maxGens),
          episodeSeconds: trySeconds,
          seed: runSeed,
          seedGenome: resolvedSeed
            ? { shape: resolvedSeed.shape, weights: resolvedSeed.weights }
            : undefined,
          breed: {
            eliteCount: isFeatureEnabled("trainRecipes")
              ? gaKnobs.eliteCount
              : ELITE_COUNT,
            tournamentSize: isFeatureEnabled("trainRecipes")
              ? gaKnobs.tournamentSize
              : TOURNAMENT_SIZE,
            mutationSigma: isFeatureEnabled("trainRecipes")
              ? gaKnobs.mutationSigma
              : MUTATION_SIGMA,
            mutationResetRate: isFeatureEnabled("trainRecipes")
              ? gaKnobs.mutationResetRate
              : MUTATION_RESET_RATE,
            crossover: isFeatureEnabled("trainSchedules")
              ? gaKnobs.crossover
              : true,
          },
          priorities: isFeatureEnabled("goalPriorities")
            ? { ...boxingPriorities }
            : { ...DEFAULT_BOXING_PRIORITIES },
          onProgress: (p) => setEvolveProgress(p),
          onFinished: (genome, shape) => {
            const meta = boxingLiveMetaRef.current;
            boxingLiveMetaRef.current = null;
            setDriveMode("idle");
            simulation.driveMode = "idle";
            simulation.timeScale = observeSpeed;
            if (Number.isFinite(genome.fitness) && genome.fitness > -Infinity) {
              setBestGenome({ shape, genome });
              preferBestOfRun();
              if (meta) {
                saveModel({
                  name: trainedModelName(
                    `${meta.design.name} ${meta.divisionId}`,
                  ),
                  task: "boxing",
                  shape,
                  genome,
                  design: meta.design,
                  boxingMeta: {
                    divisionId: meta.divisionId,
                    ruleVersion: 1,
                    obsPackVersion: 2,
                    brainHz: 30,
                  },
                });
                refreshModels();
                if (isFeatureEnabled("bestEverLedger")) {
                  considerBestEver("boxing", genome.fitness, meta.design);
                  setBestEverList(loadBestEver());
                }
              }
            }
          },
        });
        setEvolveProgress({
          ...idleProgress(),
          running: true,
          status: "Boxing spar (round 0 · batch 1)…",
          populationSize: popSize,
          batch: 1,
          batchCount: Math.ceil(popSize / Math.max(1, batchSize)),
          episodeDuration: trySeconds,
          episodeT: 0,
        });
      } catch (err) {
        boxingLiveMetaRef.current = null;
        setError(err instanceof Error ? err.message : String(err));
        setEvolveProgress((prev) => ({
          ...prev,
          running: false,
          status: "Error",
        }));
      }
    },
    [
      boxingDivisionId,
      boxingPriorities,
      boxingSparringId,
      episodeSeconds,
      gaKnobs,
      observeSpeed,
      preferBestOfRun,
      refreshModels,
      restorePreBoxingEnvironment,
      runSeed,
      simulation,
      trainSpeed,
    ],
  );

  const startJoustingLiveEvolve = useCallback(
    (seedFrom?: { shape: NetworkShape; weights: Float32Array }) => {
      const trainingDesign = cloneDesign(designRef.current);
      const eligibility = joustingEligibility(trainingDesign);
      if (!eligibility.eligible) {
        setError(`Not eligible for jousting: ${eligibility.reasons.join(" ")}`);
        return;
      }
      if (!designHasActuators(trainingDesign, isFeatureEnabled("motorWheels"))) {
        setError("Add at least one muscle before evolving a jouster.");
        return;
      }

      const popSize = isFeatureEnabled("trainRecipes")
        ? gaKnobs.populationSize
        : LIVE_POPULATION_SIZE;
      const batchSize = isFeatureEnabled("trainRecipes")
        ? Math.min(gaKnobs.batchSize, popSize)
        : LIVE_BATCH_SIZE;
      const trySeconds = isFeatureEnabled("trainRecipes")
        ? Math.max(gaKnobs.episodeSeconds, JOUST_MAX_SECONDS)
        : JOUST_MAX_SECONDS;
      const maxGens = isFeatureEnabled("trainRecipes")
        ? gaKnobs.maxGenerations
        : LIVE_MAX_GENERATIONS;
      const opponent = resolveJoustSparringOpponent(
        trainingDesign,
        joustingSparringId,
        runSeed,
      );

      let resolvedSeed = seedFrom;
      if (resolvedSeed) {
        const shape = shapeForJoustingDesign(trainingDesign);
        if (
          resolvedSeed.shape.inputCount !== shape.inputCount ||
          resolvedSeed.shape.hiddenCount !== shape.hiddenCount ||
          resolvedSeed.shape.outputCount !== shape.outputCount ||
          resolvedSeed.weights.length !== shape.weightCount
        ) {
          setError(
            "Seed genome shape mismatch — Jousting continue training needs a matching layout.",
          );
          return;
        }
      }

      if (isJoustLaneEnv(envDesignRef.current)) {
        restorePreJoustingEnvironment();
      }
      if (isJoustLaneEnv(envDesignRef.current)) {
        const flat = flatGroundEnv("Jousting Training");
        envDesignRef.current = flat;
        setEnvDesign(flat);
        simulation.setEnvironment(flat);
      }

      setMode("sim");
      setSandboxTab("train");
      simulation.timeScale = trainSpeed;
      setDriveMode("brain");
      simulation.driveMode = "brain";
      joustingLiveMetaRef.current = { design: trainingDesign };

      try {
        simulation.startJoustingLiveEvolve({
          design: trainingDesign,
          opponentDesign: opponent.design,
          opponentWeights: opponent.weights,
          populationSize: popSize,
          batchSize,
          maxGenerations: Math.max(1, maxGens),
          episodeSeconds: trySeconds,
          seed: runSeed,
          seedGenome: resolvedSeed
            ? { shape: resolvedSeed.shape, weights: resolvedSeed.weights }
            : undefined,
          breed: {
            eliteCount: isFeatureEnabled("trainRecipes")
              ? gaKnobs.eliteCount
              : ELITE_COUNT,
            tournamentSize: isFeatureEnabled("trainRecipes")
              ? gaKnobs.tournamentSize
              : TOURNAMENT_SIZE,
            mutationSigma: isFeatureEnabled("trainRecipes")
              ? gaKnobs.mutationSigma
              : MUTATION_SIGMA,
            mutationResetRate: isFeatureEnabled("trainRecipes")
              ? gaKnobs.mutationResetRate
              : MUTATION_RESET_RATE,
            crossover: isFeatureEnabled("trainSchedules")
              ? gaKnobs.crossover
              : true,
          },
          priorities: isFeatureEnabled("goalPriorities")
            ? { ...joustingPriorities }
            : { ...DEFAULT_JOUSTING_PRIORITIES },
          onProgress: (p) => setEvolveProgress(p),
          onFinished: (genome, shape) => {
            const meta = joustingLiveMetaRef.current;
            joustingLiveMetaRef.current = null;
            setDriveMode("idle");
            simulation.driveMode = "idle";
            simulation.timeScale = observeSpeed;
            if (Number.isFinite(genome.fitness) && genome.fitness > -Infinity) {
              setBestGenome({ shape, genome });
              preferBestOfRun();
              if (meta) {
                saveModel({
                  name: trainedModelName(meta.design.name),
                  task: "jousting",
                  shape,
                  genome,
                  design: meta.design,
                  joustingMeta: {
                    ruleVersion: 1,
                    obsPackVersion: 1,
                    brainHz: 30,
                  },
                });
                refreshModels();
                if (isFeatureEnabled("bestEverLedger")) {
                  considerBestEver("jousting", genome.fitness, meta.design);
                  setBestEverList(loadBestEver());
                }
              }
            }
          },
        });
        setEvolveProgress({
          ...idleProgress(),
          running: true,
          status: "Jousting pass (round 0 · batch 1)…",
          populationSize: popSize,
          batch: 1,
          batchCount: Math.ceil(popSize / Math.max(1, batchSize)),
          episodeDuration: trySeconds,
          episodeT: 0,
        });
      } catch (err) {
        joustingLiveMetaRef.current = null;
        setError(err instanceof Error ? err.message : String(err));
        setEvolveProgress((prev) => ({
          ...prev,
          running: false,
          status: "Error",
        }));
      }
    },
    [
      episodeSeconds,
      gaKnobs,
      joustingPriorities,
      joustingSparringId,
      observeSpeed,
      preferBestOfRun,
      refreshModels,
      restorePreJoustingEnvironment,
      runSeed,
      simulation,
      trainSpeed,
    ],
  );

  const startEvolve = (seedFrom?: {
    shape: NetworkShape;
    weights: Float32Array;
    morph?: Genome["morph"];
  }) => {
    if (activeTask === "boxing") {
      if (!isFeatureEnabled("boxingMode")) {
        setError("Boxing skill is disabled.");
        return;
      }
      startBoxingLiveEvolve(
        seedFrom
          ? { shape: seedFrom.shape, weights: seedFrom.weights }
          : undefined,
      );
      return;
    }
    if (activeTask === "jousting") {
      if (!isFeatureEnabled("joustingMode")) {
        setError("Jousting skill is disabled.");
        return;
      }
      startJoustingLiveEvolve(
        seedFrom
          ? { shape: seedFrom.shape, weights: seedFrom.weights }
          : undefined,
      );
      return;
    }
    if (!designHasActuators(design, isFeatureEnabled("motorWheels"))) {
      setError("Add at least one muscle or wheel before evolving.");
      return;
    }
    try {
      const resolvedSeed = resolveEvolveSeed(seedFrom);
      if (
        !seedFrom &&
        isFeatureEnabled("trainStartFrom") &&
        ((gaKnobs.startFrom === "saved" && gaKnobs.savedModelId) ||
          (gaKnobs.startFrom === "best_of_run" && bestGenome)) &&
        !resolvedSeed
      ) {
        return;
      }
      const popSize = isFeatureEnabled("trainRecipes")
        ? gaKnobs.populationSize
        : LIVE_POPULATION_SIZE;
      const batchSize = isFeatureEnabled("trainRecipes")
        ? gaKnobs.batchSize
        : LIVE_BATCH_SIZE;
      const trySeconds = isFeatureEnabled("trainRecipes")
        ? gaKnobs.episodeSeconds
        : episodeSeconds;
      const maxGens = isFeatureEnabled("trainRecipes")
        ? gaKnobs.maxGenerations
        : undefined;
      setMode("sim");
      setSandboxTab("train");
      setDriveMode("brain");
      simulation.timeScale = trainSpeed;
      if (
        isFeatureEnabled("trainTelemetryLog") &&
        trainTelemetryOnRef.current
      ) {
        const session = beginTrainTelemetrySession({
          task: activeTask,
          design,
          runSeed,
          knobs: { ...gaKnobs },
          window: TRAIN_TELEMETRY_WINDOW,
        });
        trainTelemetrySessionRef.current = session;
        setTrainTelemetrySession(session);
      } else {
        trainTelemetrySessionRef.current = null;
        setTrainTelemetrySession(null);
      }
      setEvolveProgress({
        ...idleProgress(),
        running: true,
        status: resolvedSeed
          ? `Keep training (${activeTask})…`
          : `Watching live batch (${activeTask})…`,
        populationSize: popSize,
        batch: 1,
        batchCount: Math.ceil(popSize / batchSize),
        episodeDuration: trySeconds,
        episodeT: 0,
      });
      simulation.startLiveEvolve({
        design: cloneDesign(design),
        task: activeTask,
        populationSize: popSize,
        batchSize,
        morphEvolve:
          isFeatureEnabled("morphEvolve") && morphEvolveOn,
        structuralMorphEvolve:
          isFeatureEnabled("structuralMorphEvolve") &&
          morphEvolveOn &&
          structuralMorphOn,
        messyBodies:
          isFeatureEnabled("trainExperiences") && messyBodies,
        raycastObservations:
          isFeatureEnabled("raycastObservations") && raycastObservationsOn,
        episodeSeconds: trySeconds,
        maxGenerations: maxGens,
        seed: runSeed,
        seedGenome: resolvedSeed,
        breed: isFeatureEnabled("trainRecipes")
          ? {
              eliteCount: gaKnobs.eliteCount,
              tournamentSize: gaKnobs.tournamentSize,
              mutationSigma: gaKnobs.mutationSigma,
              mutationResetRate: gaKnobs.mutationResetRate,
              crossover: isFeatureEnabled("trainSchedules")
                ? gaKnobs.crossover
                : false,
              annealMutation: isFeatureEnabled("trainSchedules")
                ? gaKnobs.annealMutation
                : false,
              shortTriesFirst: isFeatureEnabled("trainSchedules")
                ? gaKnobs.shortTriesFirst
                : false,
              stopAfterFall: !Number.isFinite(trySeconds)
                ? true
                : isFeatureEnabled("trainSchedules")
                  ? gaKnobs.stopAfterFall
                  : false,
            }
          : !Number.isFinite(trySeconds)
            ? { stopAfterFall: true }
            : undefined,
        priorities: isFeatureEnabled("goalPriorities")
          ? goalPriorities
          : undefined,
        onProgress: (p) => setEvolveProgress(p),
        onFinished: (genome, shape) => {
          setBestGenome({ shape, genome });
          preferBestOfRun();
          setLiveBrain(null);
          setDriveMode("idle");
          simulation.driveMode = "idle";
          simulation.timeScale = observeSpeed;
          const tel = trainTelemetrySessionRef.current;
          if (
            isFeatureEnabled("trainTelemetryLog") &&
            tel &&
            tel.endedAt == null
          ) {
            finalizeAndMaybeDownloadTelemetry(tel, true);
          }
          if (isFeatureEnabled("bestEverLedger")) {
            considerBestEver(activeTask, genome.fitness, designRef.current);
            setBestEverList(loadBestEver());
          }
          if (
            isFeatureEnabled("goalPriorities") &&
            stageTrainerOn &&
            DEFAULT_RUN_STAGES.some((s) => s.goalId === goalId)
          ) {
            const idx = DEFAULT_RUN_STAGES.findIndex((s) => s.goalId === goalId);
            const step = DEFAULT_RUN_STAGES[idx];
            const next = DEFAULT_RUN_STAGES[idx + 1];
            if (step && next && genome.fitness >= step.threshold) {
              setGoalId(next.goalId as GoalId);
              saveActiveGoalId(next.goalId as GoalId);
              simulation.setTask(getGoal(next.goalId as GoalId).task);
            }
          }
          if (isFeatureEnabled("courseCurriculum") && courseCurriculumOn) {
            const base = courseBaseEnvRef.current;
            const curriculum = resolveCourseCurriculum(
              activeEnvPackageId,
              base,
            );
            if (curriculum) {
              const idx = clampCourseStageIndex(curriculum, courseStageIndex);
              const step = curriculum.stages[idx];
              const next = curriculum.stages[idx + 1];
              if (step && next && genome.fitness >= step.threshold) {
                applyCourseStage(activeEnvPackageId, idx + 1, {
                  selectSprint: true,
                  baseEnv: base ?? undefined,
                });
              }
            }
          }
        },
      });
      setManualDrives([]);
    } catch (err) {
      setEvolveProgress((prev) => ({
        ...prev,
        running: false,
        status: "Error",
      }));
      setError(err instanceof Error ? err.message : String(err));
    }
  };
  const continueFromBest = () => {
    if (!bestGenome) {
      setError("No elite genome to continue from — Evolve first.");
      return;
    }
    if (activeTask === "boxing") {
      if (
        !shapesCompatible(bestGenome.shape, shapeForBoxingDesign(design))
      ) {
        setError(
          "Brain layout mismatch — the creature changed too much to continue.",
        );
        return;
      }
      startBoxingLiveEvolve({
        shape: bestGenome.shape,
        weights: bestGenome.genome.weights,
      });
      return;
    }
    if (activeTask === "jousting") {
      if (
        !shapesCompatible(bestGenome.shape, shapeForJoustingDesign(design))
      ) {
        setError(
          "Brain layout mismatch — the creature changed too much to continue.",
        );
        return;
      }
      startJoustingLiveEvolve({
        shape: bestGenome.shape,
        weights: bestGenome.genome.weights,
      });
      return;
    }
    const adapted = adaptEliteToDesign(bestGenome, design, {
      task: activeTask,
      raycast:
        isFeatureEnabled("raycastObservations") && raycastObservationsOn,
    });
    if (!adapted) {
      setError(
        "Brain layout mismatch — the creature changed too much to continue.",
      );
      return;
    }
    if (adapted !== bestGenome) setBestGenome(adapted);
    startEvolve({
      shape: adapted.shape,
      weights: adapted.genome.weights,
      morph: adapted.genome.morph,
    });
  };
  const continueFromModel = (model: SavedModel) => {
    if (model.task === "dance") {
      loadDanceFreestyle(model);
      return;
    }
    if (model.task === "boxing") {
      if (
        !model.boxingMeta ||
        model.boxingMeta.ruleVersion !== 1 ||
        model.boxingMeta.obsPackVersion !== 2 ||
        model.boxingMeta.brainHz !== 30
      ) {
        setError("Saved Boxing model uses incompatible division or brain metadata.");
        return;
      }
      const boxer = cloneDesign(model.boxingDesign ?? design);
      const seed = modelToSeed(model);
      if (!shapesCompatible(seed.shape, shapeForBoxingDesign(boxer))) {
        setError("Saved Boxing model shape does not match its fighter body.");
        return;
      }
      if (skill === "disco") leaveDiscoSkill(false);
      if (simulation.isEvolving) simulation.abortLiveEvolve();
      simulation.abortBoxingMatch();
      loadPreset(boxer, "custom");
      setSkill("boxing");
      saveActiveSkill("boxing");
      setGoalId("boxing");
      saveActiveGoalId("boxing");
      setBoxingDivisionId(model.boxingMeta.divisionId);
      // Training uses open ground; startBoxingLiveEvolve clears any ring.
      simulation.loadDesign(boxer);
      simulation.setTask("boxing");
      setMode("sim");
      setSandboxTab("train");
      startBoxingLiveEvolve(
        { shape: seed.shape, weights: seed.weights },
        model.boxingMeta.divisionId,
      );
      return;
    }
    if (model.task === "jousting") {
      if (
        !model.joustingMeta ||
        model.joustingMeta.ruleVersion !== 1 ||
        model.joustingMeta.obsPackVersion !== 1 ||
        model.joustingMeta.brainHz !== 30
      ) {
        setError("Saved Jousting model uses incompatible brain metadata.");
        return;
      }
      const jouster = cloneDesign(model.joustingDesign ?? design);
      const seed = modelToSeed(model);
      if (!shapesCompatible(seed.shape, shapeForJoustingDesign(jouster))) {
        setError("Saved Jousting model shape does not match its body.");
        return;
      }
      if (skill === "disco") leaveDiscoSkill(false);
      if (simulation.isEvolving) simulation.abortLiveEvolve();
      simulation.abortJoustMatch();
      loadPreset(jouster, "custom");
      setSkill("jousting");
      saveActiveSkill("jousting");
      setGoalId("jousting");
      saveActiveGoalId("jousting");
      simulation.loadDesign(jouster);
      simulation.setTask("jousting");
      setMode("sim");
      setSandboxTab("train");
      startJoustingLiveEvolve({
        shape: seed.shape,
        weights: seed.weights,
      });
      return;
    }
    const expected = shapeForDesign(design, {
      raycast:
        isFeatureEnabled("raycastObservations") && raycastObservationsOn,
    });
    if (!shapesCompatible(model.shape, expected) || model.task !== activeTask) {
      setError(
        "Saved model shape/task mismatch — load a matching creature and goal first.",
      );
      return;
    }
    startEvolve(modelToSeed(model));
  };
  const stopH2h = useCallback(() => {
    simulation.abortHeadToHead();
    setH2hRunning(false);
    setH2hProgress(null);
    setDriveMode("idle");
    simulation.driveMode = "idle";
  }, [simulation]);

  const startH2hHeat = useCallback(
    (opts: {
      modelA: SavedModel;
      modelB: SavedModel;
      goalId: GoalId;
      useCurrentEnv: boolean;
    }) => {
      const pool = designCandidatePool(packages, BUNDLED_MODELS, design);
      const built = headToHeadEntriesFromModels(opts.modelA, opts.modelB, pool);
      if (!built) {
        setError("Could not resolve creature bodies for both saved models.");
        return;
      }
      try {
        captureLiveElite();
        simulation.clearDiscoDancers();
        simulation.abortJoustMatch();
        simulation.abortBoxingMatch();
        const task = getGoal(opts.goalId).task;
        if (opts.useCurrentEnv) {
          simulation.setEnvironment(envDesignRef.current);
        }
        simulation.setTask(task);
        setGoalId(opts.goalId);
        saveActiveGoalId(opts.goalId);
        simulation.startHeadToHead({
          entries: built.entries,
          task,
          episodeSeconds,
          onProgress: (episodeT, episodeDuration) => {
            setH2hProgress({ episodeT, episodeDuration });
          },
          onFinished: (result) => {
            setH2hResult(result);
            setH2hRunning(false);
            setH2hProgress(null);
          },
        });
        setMode("sim");
        setSandboxTab("train");
        setDriveMode("brain");
        simulation.driveMode = "brain";
        setH2hRunning(true);
        setH2hResult(null);
        setH2hProgress({ episodeT: 0, episodeDuration: episodeSeconds });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [captureLiveElite, design, episodeSeconds, packages, simulation],
  );

  const stopBoxingMatch = useCallback(() => {
    simulation.abortBoxingMatch();
    setBoxingRunning(false);
    setBoxingProgress(null);
    setDriveMode("idle");
    simulation.driveMode = "idle";
  }, [simulation]);

  const stopJoustMatch = useCallback(() => {
    simulation.abortJoustMatch();
    setJoustingRunning(false);
    setJoustingProgress(null);
    setDriveMode("idle");
    simulation.driveMode = "idle";
  }, [simulation]);

  const startBoxingMatch = useCallback(
    (opts: {
      modelA: SavedModel;
      opponent: BoxingMatchOpponent;
      divisionId: BoxingDivisionId;
    }) => {
      const pool = designCandidatePool(packages, BUNDLED_MODELS, design);
      const designA =
        opts.modelA.boxingDesign ?? resolveDesignForModel(opts.modelA, pool);
      const seedA = modelToSeed(opts.modelA);
      let designB: CreatureDesign | null = null;
      let seedB: { shape: NetworkShape; weights: Float32Array } | null = null;
      if (opts.opponent.kind === "sparring") {
        const sparring = resolveSparringOpponent(
          opts.divisionId,
          opts.opponent.id,
          runSeed,
        );
        designB = sparring.design;
        seedB = { shape: sparring.shape, weights: sparring.weights };
      } else {
        designB =
          opts.opponent.model.boxingDesign ??
          resolveDesignForModel(opts.opponent.model, pool);
        seedB = modelToSeed(opts.opponent.model);
      }
      if (!designA || !designB || !seedB) {
        setError("Could not resolve both Boxing fighter designs.");
        return;
      }
      const expectedA = shapeForBoxingDesign(designA);
      const expectedB = shapeForBoxingDesign(designB);
      if (
        !shapesCompatible(seedA.shape, expectedA) ||
        !shapesCompatible(seedB.shape, expectedB)
      ) {
        setError("A Boxing brain does not match its fighter body.");
        return;
      }
      try {
        captureLiveElite();
        simulation.abortJoustMatch();
        applyBoxingEnvironment();
        simulation.startBoxingMatch({
          entries: [
            {
              design: cloneDesign(designA),
              shape: seedA.shape,
              weights: seedA.weights,
            },
            {
              design: cloneDesign(designB),
              shape: seedB.shape,
              weights: seedB.weights,
            },
          ],
          divisionId: opts.divisionId,
          episodeSeconds,
          onProgress: (snapshot) => {
            setBoxingProgress({
              episodeT: snapshot.episodeT,
              episodeDuration: snapshot.episodeDuration,
              points: snapshot.points,
            });
          },
          onFinished: (result) => {
            setBoxingResult(result);
            setBoxingRunning(false);
            setBoxingProgress(null);
          },
        });
        setMode("sim");
        setSandboxTab("skill");
        setDriveMode("brain");
        simulation.driveMode = "brain";
        setBoxingRunning(true);
        setBoxingResult(null);
        setBoxingProgress({
          episodeT: 0,
          episodeDuration: episodeSeconds,
          points: [0, 0],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [
      applyBoxingEnvironment,
      captureLiveElite,
      design,
      episodeSeconds,
      packages,
      runSeed,
      simulation,
    ],
  );

  const startJoustMatch = useCallback(
    (opts: { modelA: SavedModel; opponent: JoustMatchOpponent }) => {
      const pool = designCandidatePool(packages, BUNDLED_MODELS, design);
      const designA =
        opts.modelA.joustingDesign ?? resolveDesignForModel(opts.modelA, pool);
      const seedA = modelToSeed(opts.modelA);
      let designB: CreatureDesign | null = null;
      let seedB: { shape: NetworkShape; weights: Float32Array } | null = null;
      if (opts.opponent.kind === "sparring") {
        const sparring = resolveJoustSparringOpponent(
          designA ?? design,
          opts.opponent.id,
          runSeed,
        );
        designB = sparring.design;
        seedB = { shape: sparring.shape, weights: sparring.weights };
      } else {
        designB =
          opts.opponent.model.joustingDesign ??
          resolveDesignForModel(opts.opponent.model, pool);
        seedB = modelToSeed(opts.opponent.model);
      }
      if (!designA || !designB || !seedB) {
        setError("Could not resolve both Jousting designs.");
        return;
      }
      const expectedA = shapeForJoustingDesign(designA);
      const expectedB = shapeForJoustingDesign(designB);
      if (
        !shapesCompatible(seedA.shape, expectedA) ||
        !shapesCompatible(seedB.shape, expectedB)
      ) {
        setError("A Jousting brain does not match its body.");
        return;
      }
      try {
        captureLiveElite();
        applyJoustingEnvironment();
        simulation.startJoustMatch({
          entries: [
            {
              design: cloneDesign(designA),
              shape: seedA.shape,
              weights: seedA.weights,
            },
            {
              design: cloneDesign(designB),
              shape: seedB.shape,
              weights: seedB.weights,
            },
          ],
          episodeSeconds: JOUST_MAX_SECONDS,
          priorities: joustingPriorities,
          onProgress: (snapshot) => {
            setJoustingProgress({
              episodeT: snapshot.episodeT,
              episodeDuration: snapshot.episodeDuration,
              totals: snapshot.totals,
              phase: snapshot.phase,
            });
          },
          onFinished: (result) => {
            setJoustingResult(result);
            setJoustingRunning(false);
            setJoustingProgress(null);
          },
        });
        setMode("sim");
        setSandboxTab("skill");
        setDriveMode("brain");
        simulation.driveMode = "brain";
        setJoustingRunning(true);
        setJoustingResult(null);
        setJoustingProgress({
          episodeT: 0,
          episodeDuration: JOUST_MAX_SECONDS,
          totals: [0, 0],
          phase: "charge",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [
      applyJoustingEnvironment,
      captureLiveElite,
      design,
      joustingPriorities,
      packages,
      runSeed,
      simulation,
    ],
  );
  const saveBestModel = () => {
    if (!bestGenome) {
      setError("No elite genome to save.");
      return;
    }
    const adapted = adaptEliteToDesign(bestGenome, design, {
      task: activeTask,
      raycast:
        isFeatureEnabled("raycastObservations") && raycastObservationsOn,
    });
    if (!adapted) {
      setError("Brain layout mismatch — cannot save this elite for the current body.");
      return;
    }
    if (adapted !== bestGenome) setBestGenome(adapted);
    const name = trainedModelName(design.name);
    const boxingMeta =
      activeTask === "boxing"
        ? ({
            divisionId: boxingDivisionId,
            ruleVersion: 1,
            obsPackVersion: 2,
            brainHz: 30,
          } as const)
        : undefined;
    const joustingMeta =
      activeTask === "jousting"
        ? ({
            ruleVersion: 1,
            obsPackVersion: 1,
            brainHz: 30,
          } as const)
        : undefined;
    saveModel({
      name,
      task: activeTask,
      shape: adapted.shape,
      genome: adapted.genome,
      design,
      ...(boxingMeta ? { boxingMeta } : {}),
      ...(joustingMeta ? { joustingMeta } : {}),
    });
    downloadText(
      `${name.replace(/\s+/g, "_")}.json`,
      exportModelJson({
        name,
        task: activeTask,
        shape: adapted.shape,
        weights: adapted.genome.weights,
        fitness: adapted.genome.fitness,
        design,
        ...(boxingMeta ? { boxingMeta } : {}),
        ...(joustingMeta ? { joustingMeta } : {}),
      }),
    );
    refreshModels();
  };
  const stopEvolve = () => {
    simulation.requestStopEvolve();
  };
  const playBest = () => {
    if (!bestGenome && !simulation.isEvolving) return;
    try {
      const elite = captureLiveElite();
      if (!elite) return;
      const adapted = adaptEliteToDesign(elite, design, {
        task: activeTask,
        raycast:
          isFeatureEnabled("raycastObservations") && raycastObservationsOn,
      });
      if (!adapted) {
        setError(
          "Brain layout mismatch — the creature changed too much to play.",
        );
        return;
      }
      if (adapted !== elite) setBestGenome(adapted);
      simulation.setTask(activeTask);
      simulation.loadDesign(design);
      setManualDrives(simulation.manualDrives.slice());
      setMode("sim");
      simulation.setRaycastObservations(raycastObservationsOn);
      simulation.setBrain(adapted.shape, adapted.genome.weights);
      setDriveMode("brain");
      simulation.driveMode = "brain";
      if (isFeatureEnabled("secretGoals")) {
        simulation.beginSoloEpisodeWatch(episodeSeconds);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };
  const saveCurrentPackage = () => {
    const name = saveName.trim() || design.name.trim() || "Creature";
    const fp = design.joints.length > 0 ? bodyFingerprint(design) : "";
    const skill =
      currentSkillOverride && currentSkillOverride.fp === fp
        ? currentSkillOverride.placement
        : null;
    const existing = packages.find(
      (p) => p.displayName.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      const ok = window.confirm(
        `A creature named "${existing.displayName}" already exists. Overwrite it?`,
      );
      if (!ok) return;
      const result = savePackageRevision(existing.id, {
        design: { ...design, name },
        appearance: design.appearance,
        displayName: name,
        ...(skill
          ? {
              skillCategory: skill.category,
              flyingSubcategory: skill.flyingSub ?? null,
            }
          : {}),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
    } else {
      const result = saveNewPackage(
        { ...design, name },
        {
          displayName: name,
          appearance: design.appearance,
          source: "user",
          ...(skill
            ? {
                skillCategory: skill.category,
                flyingSubcategory: skill.flyingSub,
              }
            : {}),
        },
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
    }
    if (design.name !== name) {
      commitDesign({ ...design, name });
    }
    setSaveName(name);
    refreshPackages();
    const saved = loadCreaturePackages().find(
      (p) => p.displayName.toLowerCase() === name.toLowerCase(),
    );
    if (saved) setSelectedCreatureKey(`pkg:${saved.id}`);
  };
  const saveCurrentEnv = () => {
    const result = saveNewEnvironmentPackage(envDesign, {
      displayName: envDesign.name,
      source: "user",
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setActiveEnvPackageId(result.value.id);
    refreshEnvPackages();
  };
  const dismissSecretReveal = () => {
    setSecretRevealQueue((q) => q.slice(1));
  };
  const toggleImmersive = useCallback(async () => {
    if (!isFeatureEnabled("immersiveFullscreen")) return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setImmersive(true);
      } else {
        await document.exitFullscreen();
        setImmersive(false);
      }
    } catch {
      setImmersive((v) => !v);
    }
  }, []);
  useEffect(() => {
    if (!isFeatureEnabled("immersiveFullscreen")) return;
    const onFs = () => {
      setImmersive(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /** Open a shared model from `?share=id` without auto-saving into the library. */
  useEffect(() => {
    if (!ready || !isFeatureEnabled("creatureSharing")) return;
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get("share");
    if (!shareId) return;
    params.delete("share");
    const qs = params.toString();
    const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", nextUrl);

    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await openSharedCreature(shareId);
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally once when physics becomes ready.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (error) {
    return (
      <div className="app error">
        {" "}
        <h1>Solemn Sandbox</h1> <p>Failed to start: {error}</p>{" "}
        <button type="button" onClick={() => setError(null)}>
          {" "}
          Dismiss{" "}
        </button>{" "}
      </div>
    );
  }
  const driveButtons: [DriveMode, string][] = [
    ["idle", "Idle"],
    ["manual", "Manual"],
    ["sine", "Oscillate"],
    ["brain", "Brain"],
  ];
  return (
    <HoverHelpProvider enabled={hoverHelpEnabled}>
    <div className={immersive ? "app app-immersive" : "app"}>
      {immersive && isFeatureEnabled("immersiveFullscreen") && (
        <button
          type="button"
          className="immersive-exit"
          onClick={() => void toggleImmersive()}
        >
          Exit immersive
        </button>
      )}

      {(() => {
        const skillPanel = (
          <div className="panel-stack">
            {isFeatureEnabled("skillTabs") && (
              <section>
                <h2>Skill</h2>
                <p className="hint muted">{SKILLS[skill].title}</p>
                <p className="hint muted">{SKILLS[skill].description}</p>
                {(() => {
                  const hints = buildHintsForSkill(skill);
                  return (
                    <div className="hint" style={{ marginTop: "0.5rem" }}>
                      <p className="subhead" style={{ marginBottom: "0.25rem" }}>
                        Build essentials
                      </p>
                      <ul className="stats">
                        {hints.essentials.map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                      <p className="hint muted">{hints.tip}</p>
                      <button
                        type="button"
                        className="primary"
                        style={{ marginTop: "0.5rem" }}
                        onClick={() => {
                          setMode("edit");
                          setSandboxTab("edit");
                        }}
                      >
                        Open Creature builder
                      </button>
                    </div>
                  );
                })()}
                {skill === "boxing" && isFeatureEnabled("boxingMode") ? (
                  <BoxingSkillPanel
                    currentDesign={design}
                    savedModels={savedModels}
                    packages={packages}
                    divisionId={boxingDivisionId}
                    onDivisionChange={(id) => {
                      setBoxingDivisionId(id);
                      const body = designRef.current;
                      if (body.joints.length === 0) return;
                      const eligibility = boxingEligibility(body, id);
                      if (!eligibility.eligible) {
                        const division = getBoxingDivision(id);
                        setError(
                          `Current creature is not suitable for ${division.name} training: ${eligibility.reasons.join(" ")} Your design was kept — adjust the body or pick another division.`,
                        );
                      } else {
                        setError(null);
                      }
                    }}
                    busy={evolveProgress.running || h2hRunning}
                    running={boxingRunning}
                    progress={boxingProgress}
                    lastResult={boxingResult}
                    onStartMatch={startBoxingMatch}
                    onStopMatch={stopBoxingMatch}
                    onOpenTrain={() => {
                      setMode("sim");
                      setSandboxTab("train");
                    }}
                  />
                ) : skill === "jousting" && isFeatureEnabled("joustingMode") ? (
                  <JoustingSkillPanel
                    currentDesign={design}
                    savedModels={savedModels}
                    packages={packages}
                    busy={evolveProgress.running || h2hRunning}
                    running={joustingRunning}
                    progress={joustingProgress}
                    lastResult={joustingResult}
                    onStartMatch={startJoustMatch}
                    onStopMatch={stopJoustMatch}
                    onOpenTrain={() => {
                      setMode("sim");
                      setSandboxTab("train");
                    }}
                  />
                ) : skill === "disco" && isFeatureEnabled("discoMode") ? (
                  <DiscoTrackLearnPanel
                    trackName={discoTrack}
                    hasTrack={discoPlayer.hasTrack()}
                    playing={discoPlaying}
                    dancing={driveMode === "disco"}
                    disabled={evolveProgress.running || h2hRunning || discoLearning}
                    recording={discoRecording}
                    recordSamples={discoRecordCount}
                    recordDurationSec={discoRecordDuration}
                    learning={discoLearning}
                    learnProgress={discoLearnProgress}
                    hasDanceBrain={!!danceGenome}
                    freestyle={discoFreestyle}
                    soloOk={discoSoloOk}
                    minRecordSamples={DISCO_RECORD_MIN_SAMPLES}
                    onToggleRecord={toggleDiscoRecord}
                    onLearn={() => {
                      void learnDiscoDance();
                    }}
                    onToggleFreestyle={toggleDiscoFreestyle}
                    onSaveDance={saveDanceModel}
                    onClearRecord={clearDiscoRecord}
                    onLoadFile={async (file) => {
                      await discoPlayer.loadFile(file);
                      setDiscoTrack(file.name);
                      setDiscoPlaying(false);
                      setDiscoTrackTime(0);
                      const d = discoPlayer.duration();
                      setDiscoTrackDuration(Number.isFinite(d) ? d : 0);
                    }}
                    onPlay={() => {
                      discoPlayer.play();
                      setDiscoPlaying(true);
                      if (discoFreestyle) return;
                      if (driveMode !== "disco") beginDiscoDrive();
                    }}
                    onPause={() => {
                      discoPlayer.pause();
                      setDiscoPlaying(false);
                      setDiscoTrackTime(discoPlayer.currentTime());
                    }}
                    onStartDancing={() => {
                      if (discoFreestyle) {
                        setDiscoFreestyle(false);
                        simulation.clearBrain();
                      }
                      discoPlayer.play();
                      setDiscoPlaying(true);
                      beginDiscoDrive();
                    }}
                    onResetPose={resetDiscoPose}
                  />
                ) : (
                  isFeatureEnabled("goalCatalog") && (
                    <GoalInfoCard goal={getGoal(goalId)} skill={skill} />
                  )
                )}
                {skill === "disco" &&
                  isFeatureEnabled("discoDanceCurriculum") && (
                    <DiscoCurriculumPanel
                      tracks={discoPlaylist}
                      activeTrackId={discoPlaylistActiveId}
                      datasetSamples={curriculumSamples}
                      datasetDurationSec={curriculumDuration}
                      learning={curriculumLearning}
                      refining={curriculumRefining}
                      learnProgress={curriculumLearnProgress}
                      refineProgress={curriculumRefineProgress}
                      hasDanceBrain={!!danceGenome}
                      soloOk={discoSoloOk}
                      disabled={
                        evolveProgress.running ||
                        h2hRunning ||
                        discoLearning ||
                        curriculumLearning ||
                        curriculumRefining
                      }
                      recording={curriculumRecording}
                      onAddFiles={addCurriculumFiles}
                      onRemoveTrack={removeCurriculumTrack}
                      onSelectTrack={(id) => {
                        void selectCurriculumTrack(id);
                      }}
                      onAnalyzeAll={() => {
                        void analyzeCurriculumAll();
                      }}
                      onRecordCurriculum={startCurriculumRecord}
                      onStopRecord={stopCurriculumRecord}
                      onLearnCurriculum={() => {
                        void learnCurriculum();
                      }}
                      onRefine={() => {
                        void refineCurriculum();
                      }}
                      onClearDataset={clearCurriculumDataset}
                    />
                  )}
              </section>
            )}
            <CollapsiblePanel
              title="Feel notes"
              open={feelNotesOpen}
              onToggle={() => setFeelNotesOpen((v) => !v)}
            >
              <p className="hint muted">
                Muscles are always-on springs toward rest length, plus active
                contract / expand forces. Brace with triangles; serial chains
                flop. Parent soft-body physics is never imported.
              </p>
            </CollapsiblePanel>
          </div>
        );

        const trophyRoom =
          isFeatureEnabled("discoveryUi") ? (
            <TrophyCabinet discoveries={discoveries} />
          ) : (
            <div className="trophy-room">
              <p className="hint muted">Discovery UI is disabled.</p>
            </div>
          );
        const showTrophyRoom = sandboxTab === "discoveries";
        const showCreaturesRoom = sandboxTab === "creatures";
        const showTutorialRoom = sandboxTab === "tutorial";
        const showFullBleedRoom =
          showTrophyRoom || showCreaturesRoom || showTutorialRoom;

        const worldPanel = (
          <div className="panel-stack">
            {isFeatureEnabled("environmentsRepo") ? (
              <>
                <section>
                  <h2>Environment Studio</h2>
                  <p className="hint muted">
                    Place and resize on the canvas with the World dock below.
                    Save packages here; pick the training course from the Skill /
                    Goal / Env strip above.
                  </p>
                </section>
                <CollapsiblePanel
                  title="Theme & save"
                  open={worldThemeOpen}
                  onToggle={() => setWorldThemeOpen((v) => !v)}
                >
                <label className="field-row">
                  <span>Name</span>
                  <input
                    type="text"
                    value={envDesign.name}
                    onChange={(e) =>
                      commitEnv({ ...envDesign, name: e.target.value })
                    }
                  />
                </label>
                <label className="field-row">
                  <span>Theme</span>
                  <select
                    value={envDesign.theme}
                    onChange={(e) =>
                      commitEnv({
                        ...envDesign,
                        theme: e.target.value as (typeof ENV_THEMES)[number],
                      })
                    }
                  >
                    {ENV_THEMES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="button-row" style={{ marginTop: "0.35rem" }}>
                  <button type="button" onClick={saveCurrentEnv}>
                    Save env
                  </button>
                  <button
                    type="button"
                    onClick={undoEnv}
                    disabled={envUndoCount === 0}
                  >
                    Undo env
                  </button>
                </div>
                {isFeatureEnabled("jsonImportExport") && (
                  <div className="button-row" style={{ marginTop: "0.35rem" }}>
                    <button
                      type="button"
                      onClick={() =>
                        downloadText(
                          `${envDesign.name.replace(/\s+/g, "_").toLowerCase()}_env.json`,
                          exportEnvironmentJson(envDesign),
                        )
                      }
                    >
                      Export env
                    </button>
                    <button
                      type="button"
                      onClick={() => envFileInputRef.current?.click()}
                    >
                      Import env
                    </button>
                  </div>
                )}
                </CollapsiblePanel>
                <CollapsiblePanel
                  title="Env library"
                  open={worldLibOpen}
                  onToggle={() => setWorldLibOpen((v) => !v)}
                >
                <div className="button-col">
                  {envPackages.map((pkg) => (
                    <div key={pkg.id} className="library-row">
                      <button
                        type="button"
                        onClick={() => {
                          commitEnv(pkg.environment, {
                            packageId: pkg.id,
                          });
                          setEnvSelection([]);
                        }}
                        title={
                          pkg.source === "builtin"
                            ? "Builtin flat ground"
                            : `rev ${pkg.revision}`
                        }
                      >
                        {pkg.displayName}
                        {pkg.source === "builtin" ? " ★" : ""}
                        {pkg.environment.obstacles.length > 0
                          ? ` (${pkg.environment.obstacles.length} obst)`
                          : ""}
                        {pkg.environment.terrain
                          ? ` · terrain`
                          : ""}
                        {pkg.environment.tower ? ` · tower` : ""}
                      </button>
                      {pkg.source !== "builtin" && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              duplicateEnvironmentPackage(pkg.id);
                              refreshEnvPackages();
                            }}
                            title="Duplicate"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            className="danger-ghost"
                            onClick={() => {
                              deleteEnvironmentPackage(pkg.id);
                              refreshEnvPackages();
                            }}
                          >
                            ×
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
                </CollapsiblePanel>
              </>
            ) : (
              <p className="hint muted">Environments disabled.</p>
            )}
          </div>
        );

        const editPanel = (
          <div className="panel-stack">
            <section>
              <h2>Creature</h2>
              {(() => {
                const hints = buildHintsForSkill(skill);
                const boxingLine =
                  skill === "boxing" && isFeatureEnabled("boxingMode")
                    ? boxingEligibility(design, boxingDivisionId)
                    : null;
                const joustLine =
                  skill === "jousting" && isFeatureEnabled("joustingMode")
                    ? joustingEligibility(design)
                    : null;
                return (
                  <div
                    className="hint"
                    style={{
                      marginBottom: "0.65rem",
                      paddingBottom: "0.5rem",
                      borderBottom: "1px solid rgba(120,140,170,0.2)",
                    }}
                  >
                    <p>
                      Building for: <strong>{SKILLS[skill].title}</strong>
                    </p>
                    <ul className="stats">
                      {hints.essentials.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    <p className="hint muted">{hints.tip}</p>
                    {boxingLine && (
                      <p className="hint">
                        {boxingLine.eligible
                          ? `Division ready · ${boxingLine.metrics.gloves} gloves · ${boxingLine.metrics.targets} targets`
                          : `Division gaps: ${boxingLine.reasons[0] ?? "check marks"}`}
                      </p>
                    )}
                    {joustLine && (
                      <p className="hint">
                        {joustLine.eligible
                          ? `Joust ready · ${joustLine.metrics.lances} lance · ${joustLine.metrics.targets} targets`
                          : `Joust gaps: ${joustLine.reasons[0] ?? "check marks"}`}
                      </p>
                    )}
                  </div>
                );
              })()}
              <label className="field-row">
                <span>Load</span>
                <select
                  value={selectedCreatureKey}
                  disabled={editPhysics}
                  onChange={(e) => loadCreatureByKey(e.target.value)}
                  aria-label="Select creature to edit"
                >
                  <option value="custom">Custom (current)</option>
                  <optgroup label="Presets">
                    {PRESETS.map((p) => (
                      <option key={p.name} value={`preset:${p.name}`}>
                        {p.name}
                      </option>
                    ))}
                    <option value={`preset:${ULTI_GROOVE_BOT_II.name}`}>
                      {ULTI_GROOVE_BOT_II.name}
                    </option>
                  </optgroup>
                  {isFeatureEnabled("creaturePackages") && packages.length > 0 && (
                    <optgroup label="Library">
                      {packages.map((pkg) => (
                        <option key={pkg.id} value={`pkg:${pkg.id}`}>
                          {pkg.displayName}
                          {isFeatureEnabled("creatureLibrary")
                            ? ` (r${pkg.revision})`
                            : ""}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>
              {isFeatureEnabled("creaturePackages") &&
                selectedCreatureKey.startsWith("pkg:") && (
                  <div className="button-row" style={{ marginTop: "0.35rem" }}>
                    <button
                      type="button"
                      className="danger-ghost"
                      disabled={editPhysics}
                      onClick={() => {
                        const id = selectedCreatureKey.slice("pkg:".length);
                        const pkg = packages.find((p) => p.id === id);
                        if (!pkg) return;
                        const ok = window.confirm(
                          `Delete library creature "${pkg.displayName}"?`,
                        );
                        if (!ok) return;
                        deletePackage(id);
                        refreshPackages();
                        setSelectedCreatureKey("custom");
                      }}
                    >
                      Delete from library
                    </button>
                  </div>
                )}
              {isFeatureEnabled("creaturePackages") && (
                <div className="save-current-block">
                  <label className="field-row">
                    <span>Name</span>
                    <input
                      type="text"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="Creature name"
                      aria-label="Save name"
                    />
                  </label>
                  <button type="button" onClick={saveCurrentPackage}>
                    Save current
                  </button>
                </div>
              )}
              {isFeatureEnabled("jsonImportExport") && (
                <div className="button-row" style={{ marginTop: "0.35rem" }}>
                  <button
                    type="button"
                    disabled={!hasCreature}
                    onClick={() =>
                      downloadText(
                        `${(design.name || "creature").replace(/\s+/g, "_").toLowerCase()}.json`,
                        exportCreatureJson(design),
                      )
                    }
                    title="Download body only (no brain)"
                  >
                    Export body
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Import JSON
                  </button>
                </div>
              )}
              <p className="hint muted" style={{ marginTop: "0.45rem" }}>
                Build with the dock under the canvas. To export a trained
                fighter with its brain, use{" "}
                <strong>Export creature + brain</strong> on the Train dock.
              </p>
            </section>
          </div>
        );

        const creatureDockToolsExtras = (
          <>
              {isFeatureEnabled("cosmeticCloth") && tool === "cloth" && (
                <div className="inspector">
                  <h3 className="subhead">Material draw</h3>
                  <p className="hint muted">
                    Click joints one at a time to pin fabric (
                    {clothDraftPins.length} pin
                    {clothDraftPins.length === 1 ? "" : "s"}). Need 2+ to create
                    a covering.
                  </p>
                  <label className="slider-row">
                    <span>Fineness</span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={clothDraftFineness}
                      onChange={(e) =>
                        setClothDraftFineness(Number(e.target.value))
                      }
                    />
                    <span className="val">{clothDraftFineness}</span>
                  </label>
                  <label className="slider-row">
                    <span>Weight</span>
                    <input
                      type="range"
                      min={0.25}
                      max={3}
                      step={0.05}
                      value={clothDraftWeight}
                      onChange={(e) =>
                        setClothDraftWeight(Number(e.target.value))
                      }
                    />
                    <span className="val">
                      {clothDraftWeight.toFixed(2)}
                    </span>
                  </label>
                  <label className="slider-row">
                    <span>Stiff</span>
                    <input
                      type="range"
                      min={0.5}
                      max={2.5}
                      step={0.05}
                      value={clothDraftStiffness}
                      onChange={(e) =>
                        setClothDraftStiffness(Number(e.target.value))
                      }
                    />
                    <span className="val">
                      {clothDraftStiffness.toFixed(2)}
                    </span>
                  </label>
                  <div className="button-row wrap">
                    <button
                      type="button"
                      disabled={editPhysics || clothDraftPins.length < 2}
                      onClick={() => {
                        const next = addCoveringGarment(
                          design,
                          clothDraftPins,
                          {
                            fineness: clothDraftFineness,
                            weight: clothDraftWeight,
                            stiffness: clothDraftStiffness,
                          },
                        );
                        commitDesign(next);
                        const idx =
                          (next.appearance?.cloth?.length ?? 1) - 1;
                        setSelection({ kind: "cloth", index: idx });
                        setClothDraftPins([]);
                        setTool("select");
                      }}
                    >
                      Create covering
                    </button>
                    <button
                      type="button"
                      disabled={clothDraftPins.length === 0}
                      onClick={() => setClothDraftPins([])}
                    >
                      Clear pins
                    </button>
                  </div>
                </div>
              )}
              {isFeatureEnabled("rigidStruts") && tool === "bone" && (
                <label
                  className="toggle-row"
                  title="Solid strut: fixed link between joints (no bend, no muscle/aero). Use for triangles and squares."
                >
                  <input
                    type="checkbox"
                    checked={boneRigid}
                    onChange={(e) => setBoneRigid(e.target.checked)}
                    disabled={editPhysics}
                  />
                  Solid strut
                </label>
              )}
              <div className="button-row" style={{ marginTop: "0.45rem" }}>
                <button
                  type="button"
                  onClick={undo}
                  disabled={undoCount === 0 || editPhysics}
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={clearDesign}
                  disabled={editPhysics}
                >
                  Clear
                </button>
              </div>
              <p className="hint">
                {tool === "joint" &&
                  "Click empty space to place · drag a joint to move (bones/muscles resize)."}
                {tool === "select" &&
                  (isFeatureEnabled("editorMultiSelectTransforms")
                    ? "Drag empty space to box-select · Shift-click add · Ctrl+A all · Ctrl+D copy · Ctrl+M mirror · handles scale/rotate · Delete removes."
                    : "Click a joint, bone, muscle, or body part · drag joints/parts · corner handles resize parts.")}
                {tool === "bone" &&
                  (boneRigid && isFeatureEnabled("rigidStruts")
                    ? "Left-drag joint→joint to draw a solid strut (rigid frame)."
                    : "Left-drag joint→joint to draw a hinge bone.")}
                {tool === "muscle" &&
                  "Left-drag hinge-bone→hinge-bone to draw a muscle (not struts)."}
                {tool === "cloth" &&
                  "Click joints one at a time to pin fabric · Create covering when 2+ pins are set."}
              </p>
          </>
        );

        const creatureDockOptions = (
          <>
              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={snapEnabled}
                  onChange={(e) => setSnapEnabled(e.target.checked)}
                  disabled={editPhysics}
                />
                Snap joints to grid
              </label>
              <label
                className="slider-row"
                title="Mass for joints marked as feet — applies in Edit, Play, Train, and Disco"
              >
                <span>Foot weight</span>
                <input
                  type="range"
                  min={FOOT_MASS_MIN}
                  max={FOOT_MASS_MAX}
                  step={0.25}
                  value={footMass}
                  disabled={!hasCreature || markedFootCount === 0}
                  aria-label="Foot weight for marked feet"
                  onChange={(e) => applyFootMass(Number(e.target.value))}
                />
                <span className="val">{footMass.toFixed(2)}</span>
              </label>
              {hasCreature && markedFootCount === 0 && (
                <p className="hint muted">
                  Mark at least one joint as a foot to use foot weight.
                </p>
              )}
              <label
                className="slider-row"
                title="Mass for joints marked as wheels — applies in Edit, Play, Train, and Disco"
              >
                <span>Wheel weight</span>
                <input
                  type="range"
                  min={WHEEL_MASS_MIN}
                  max={WHEEL_MASS_MAX}
                  step={0.25}
                  value={wheelMass}
                  disabled={!hasCreature || markedWheelCount === 0}
                  aria-label="Wheel weight for marked wheels"
                  onChange={(e) => applyWheelMass(Number(e.target.value))}
                />
                <span className="val">{wheelMass.toFixed(2)}</span>
              </label>
              {hasCreature && markedWheelCount === 0 && (
                <p className="hint muted">
                  Mark at least one joint as a wheel to use wheel weight.
                </p>
              )}
              <label
                className="toggle-row"
                title="Drop the creature under gravity with muscles idle"
              >
                <input
                  type="checkbox"
                  checked={editPhysics}
                  disabled={
                    !hasCreature ||
                    evolveProgress.running ||
                    h2hRunning
                  }
                  onChange={(e) => {
                    if (e.target.checked) startEditPhysics();
                    else stopEditPhysics();
                  }}
                />
                Physics settle
              </label>
              {editPhysics && (
                <>
                  <p className="hint muted">
                    Muscles idle — watch how the body rests. Editing is paused
                    until you turn this off.
                  </p>
                  <div className="button-row wrap">
                    <button
                      type="button"
                      onClick={() => {
                        if (syncDesignToSim(design)) {
                          setSandboxTab("edit");
                          simulation.timeScale = observeSpeed;
                        }
                      }}
                    >
                      Reset drop
                    </button>
                    {OBSERVE_SPEEDS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={observeSpeed === s ? "active" : ""}
                        onClick={() => setObserveSpeed(s)}
                        title="Playback speed while settling"
                      >
                        {s}×
                      </button>
                    ))}
                  </div>
                </>
              )}
          </>
        );

        const creatureDockInspector = (
          <>
              {selection?.kind === "joints" &&
                selection.ids.length > 1 &&
                isFeatureEnabled("editorMultiSelectTransforms") &&
                (() => {
                  const summary = selectionSummary(design, selection.ids);
                  return (
                    <div className="inspector">
                      <h3 className="subhead">Selection</h3>
                      <p className="hint muted">
                        {summary.joints} joints · {summary.bones} bones ·{" "}
                        {summary.muscles} muscles
                        {summary.bodyParts > 0
                          ? ` · ${summary.bodyParts} parts`
                          : ""}
                      </p>
                      <div className="button-row wrap">
                        <button
                          type="button"
                          disabled={editPhysics}
                          onClick={() => {
                            const result = duplicateSelection(
                              design,
                              selection.ids,
                            );
                            commitDesign(result.design);
                            setSelection(
                              jointsSelection(result.newJointIds),
                            );
                          }}
                          title="Ctrl+D"
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          disabled={editPhysics}
                          onClick={() => {
                            const result = mirrorDuplicateSelection(
                              design,
                              selection.ids,
                            );
                            commitDesign(result.design);
                            setSelection(
                              jointsSelection(result.newJointIds),
                            );
                          }}
                          title="Ctrl+M"
                        >
                          Mirror
                        </button>
                        <button
                          type="button"
                          disabled={editPhysics}
                          onClick={() => {
                            commitDesign(
                              deleteJointSelection(design, selection.ids),
                            );
                            setSelection(null);
                          }}
                          title="Delete"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="hint muted">
                        Drag inside the box to move · corner handles scale ·
                        top handle rotates.
                      </p>
                      {isFeatureEnabled("cosmeticCloth") &&
                        selection.ids.length === 2 && (
                          <div className="button-row wrap">
                            <button
                              type="button"
                              disabled={editPhysics}
                              onClick={() => {
                                const [a, b] = selection.ids;
                                const next = addCapePreset(design, a!, b!, {
                                  fineness: clothDraftFineness,
                                  weight: clothDraftWeight,
                                  stiffness: clothDraftStiffness,
                                });
                                commitDesign(next);
                                const idx =
                                  (next.appearance?.cloth?.length ?? 1) - 1;
                                setSelection({ kind: "cloth", index: idx });
                              }}
                              title="Pin a flowing cape between the two joints"
                            >
                              Add cape
                            </button>
                          </div>
                        )}
                    </div>
                  );
                })()}

              {selection?.kind === "joints" &&
                selection.ids.length === 1 &&
                (() => {
                  const joint = design.joints.find(
                    (j) => j.id === selection.ids[0],
                  );
                  if (!joint) return null;
                  return (
                    <div className="inspector">
                      <h3 className="subhead">Joint {joint.id}</h3>
                      {isFeatureEnabled("editorMultiSelectTransforms") && (
                        <div className="button-row wrap">
                          <button
                            type="button"
                            disabled={editPhysics}
                            onClick={() => {
                              const result = duplicateSelection(design, [
                                joint.id,
                              ]);
                              commitDesign(result.design);
                              setSelection(
                                jointsSelection(result.newJointIds),
                              );
                            }}
                            title="Ctrl+D"
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            disabled={editPhysics}
                            onClick={() => {
                              const result = mirrorDuplicateSelection(
                                design,
                                [joint.id],
                              );
                              commitDesign(result.design);
                              setSelection(
                                jointsSelection(result.newJointIds),
                              );
                            }}
                            title="Ctrl+M"
                          >
                            Mirror
                          </button>
                        </div>
                      )}
                      <label className="toggle-row">
                        <input
                          type="checkbox"
                          checked={!!joint.isFoot}
                          onChange={() =>
                            commitDesign(
                              updateJoint(design, joint.id, {
                                isFoot: !joint.isFoot,
                              }),
                            )
                          }
                        />
                        Mark as foot
                      </label>
                      {!!joint.isFoot && (
                        <label
                          className="slider-row"
                          title="Shared mass for all marked feet (all modes)"
                        >
                          <span>Foot weight</span>
                          <input
                            type="range"
                            min={FOOT_MASS_MIN}
                            max={FOOT_MASS_MAX}
                            step={0.25}
                            value={footMass}
                            aria-label="Foot weight for marked feet"
                            onChange={(e) =>
                              applyFootMass(Number(e.target.value))
                            }
                          />
                          <span className="val">{footMass.toFixed(2)}</span>
                        </label>
                      )}
                      <label className="toggle-row">
                        <input
                          type="checkbox"
                          checked={!!joint.isHead}
                          onChange={() =>
                            commitDesign(
                              updateJoint(design, joint.id, {
                                isHead: !joint.isHead,
                              }),
                            )
                          }
                        />
                        Mark as head
                      </label>
                      {isFeatureEnabled("boxingMode") && (
                        <>
                          <label className="toggle-row">
                            <input
                              type="checkbox"
                              checked={!!joint.isGlove}
                              onChange={() =>
                                commitDesign(
                                  updateJoint(design, joint.id, {
                                    isGlove: !joint.isGlove,
                                  }),
                                )
                              }
                            />
                            Boxing glove
                          </label>
                          <label className="toggle-row">
                            <input
                              type="checkbox"
                              checked={!!joint.isHitTarget}
                              onChange={() =>
                                commitDesign(
                                  updateJoint(design, joint.id, {
                                    isHitTarget: !joint.isHitTarget,
                                    hitValue: joint.isHitTarget
                                      ? undefined
                                      : (joint.hitValue ?? 1),
                                  }),
                                )
                              }
                            />
                            Boxing hit target
                          </label>
                          {!!joint.isHitTarget && (
                            <label className="slider-row">
                              <span>Target points</span>
                              <input
                                type="range"
                                min={1}
                                max={5}
                                step={1}
                                value={joint.hitValue ?? 1}
                                onChange={(e) =>
                                  commitDesign(
                                    updateJoint(design, joint.id, {
                                      hitValue: Number(e.target.value),
                                    }),
                                  )
                                }
                              />
                              <span className="val">{joint.hitValue ?? 1}</span>
                            </label>
                          )}
                        </>
                      )}
                      {isFeatureEnabled("joustingMode") && skill === "jousting" && (
                        <>
                          <label className="toggle-row">
                            <input
                              type="checkbox"
                              checked={!!joint.isLance}
                              onChange={() =>
                                commitDesign(
                                  updateJoint(design, joint.id, {
                                    isLance: !joint.isLance,
                                  }),
                                )
                              }
                            />
                            Jousting lance
                          </label>
                          <label className="toggle-row">
                            <input
                              type="checkbox"
                              checked={!!joint.isHitTarget}
                              onChange={() =>
                                commitDesign(
                                  updateJoint(design, joint.id, {
                                    isHitTarget: !joint.isHitTarget,
                                    hitValue: joint.isHitTarget
                                      ? undefined
                                      : (joint.hitValue ?? 1),
                                  }),
                                )
                              }
                            />
                            Joust hit target
                          </label>
                        </>
                      )}
                      {isFeatureEnabled("googlyEyes") && (
                        <label className="toggle-row">
                          <input
                            type="checkbox"
                            checked={jointHasGooglyEyes(
                              design.appearance,
                              joint.id,
                            )}
                            onChange={(e) => {
                              const base =
                                design.appearance ?? emptyAppearance();
                              commitDesign({
                                ...design,
                                appearance: setJointGooglyEyes(
                                  base,
                                  joint.id,
                                  e.target.checked,
                                ),
                              });
                            }}
                          />
                          Googly eyes
                        </label>
                      )}
                      <label className="toggle-row">
                        <input
                          type="checkbox"
                          checked={!!joint.isWheel}
                          onChange={() =>
                            commitDesign(
                              updateJoint(design, joint.id, {
                                isWheel: !joint.isWheel,
                                motorStrength: joint.isWheel
                                  ? undefined
                                  : (joint.motorStrength ?? 36),
                              }),
                            )
                          }
                        />
                        Wheel / motor
                      </label>
                      {!!joint.isWheel && (
                        <label
                          className="slider-row"
                          title="Shared mass for all marked wheels (all modes)"
                        >
                          <span>Wheel weight</span>
                          <input
                            type="range"
                            min={WHEEL_MASS_MIN}
                            max={WHEEL_MASS_MAX}
                            step={0.25}
                            value={wheelMass}
                            aria-label="Wheel weight for marked wheels"
                            onChange={(e) =>
                              applyWheelMass(Number(e.target.value))
                            }
                          />
                          <span className="val">{wheelMass.toFixed(2)}</span>
                        </label>
                      )}
                      {joint.isWheel && (
                        <label className="slider-row">
                          <span>Torque</span>
                          <input
                            type="range"
                            min={8}
                            max={80}
                            step={1}
                            value={joint.motorStrength ?? 36}
                            onChange={(e) =>
                              commitDesign(
                                updateJoint(design, joint.id, {
                                  motorStrength: Number(e.target.value),
                                }),
                              )
                            }
                          />
                          <span className="val">
                            {joint.motorStrength ?? 36}
                          </span>
                        </label>
                      )}
                      {isFeatureEnabled("spriteBodyParts") &&
                        (() => {
                          const jointParts =
                            design.appearance?.bodyParts.filter(
                              (p) =>
                                p.jointId === joint.id &&
                                p.boneId === undefined,
                            ) ?? [];
                          return (
                            <>
                              <h4 className="subhead">Body parts</h4>
                              <p className="hint muted">
                                {jointParts.length > 0
                                  ? `${jointParts.length} attached — Select tool to move/resize.`
                                  : "Attach Kenney sprites to this joint."}
                              </p>
                              <BodyPartCatalogPicker
                                onPick={(assetId) => {
                                  const next = addBodyPartToJoint(
                                    design,
                                    joint.id,
                                    assetId,
                                  );
                                  commitDesign(next);
                                  const idx =
                                    (next.appearance?.bodyParts.length ?? 1) -
                                    1;
                                  setSelection({
                                    kind: "bodyPart",
                                    index: idx,
                                  });
                                }}
                              />
                            </>
                          );
                        })()}
                    </div>
                  );
                })()}

              {selection?.kind === "bone" &&
                (() => {
                  const bone = design.bones.find((b) => b.id === selection.id);
                  if (!bone) return null;
                  const structural = isFeatureEnabled("structuralAeroParts");
                  const isStrut =
                    isFeatureEnabled("rigidStruts") && bone.rigid === true;
                  const hasMuscle = boneHasMuscle(design, bone.id);
                  const hasAero = (bone.aeroArea ?? 0) > 0;
                  const boneParts =
                    design.appearance?.bodyParts.filter(
                      (p) => p.boneId === bone.id,
                    ) ?? [];
                  return (
                    <div className="inspector">
                      <h3 className="subhead">
                        {isStrut ? "Strut" : "Bone"} {bone.id}
                      </h3>
                      {isFeatureEnabled("rigidStruts") && (
                        <label
                          className="toggle-row"
                          title={
                            hasMuscle
                              ? "Remove muscles from this bone before making it a solid strut."
                              : "Solid strut locks the two joints; no bend, muscles, or aero."
                          }
                        >
                          <input
                            type="checkbox"
                            checked={isStrut}
                            disabled={editPhysics || (hasMuscle && !isStrut)}
                            onChange={(e) => {
                              if (e.target.checked && hasMuscle) return;
                              commitDesign(
                                updateBone(design, bone.id, {
                                  rigid: e.target.checked,
                                }),
                              );
                            }}
                          />
                          Solid strut
                        </label>
                      )}
                      {isStrut ? (
                        <p className="hint muted">
                          Solid strut — locks these joints. Muscles and aero
                          attach to hinge bones only.
                        </p>
                      ) : (
                        <>
                          <label className="slider-row">
                            <span>Aero</span>
                            <input
                              type="range"
                              min={0}
                              max={AERO_AREA_SLIDER_MAX}
                              step={0.1}
                              value={Math.min(
                                AERO_AREA_SLIDER_MAX,
                                bone.aeroArea ?? 0,
                              )}
                              onChange={(e) =>
                                commitDesign(
                                  updateBone(design, bone.id, {
                                    aeroArea: Number(e.target.value),
                                  }),
                                )
                              }
                            />
                            <span className="val">
                              {(bone.aeroArea ?? 0).toFixed(1)}
                            </span>
                          </label>
                          {structural && hasAero && (
                            <label className="slider-row">
                              <span>Part</span>
                              <select
                                value={bone.aeroType ?? "glider"}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  commitDesign(
                                    updateBone(design, bone.id, {
                                      aeroType:
                                        v === "wing" ||
                                        v === "glider" ||
                                        v === "parachute"
                                          ? v
                                          : undefined,
                                    }),
                                  );
                                }}
                              >
                                {AERO_TYPES.map((t) => (
                                  <option key={t} value={t}>
                                    {aeroTypeLabel(t)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          {!wingPairOk(design) && (
                            <p className="hint muted">
                              Wings should be in pairs (even count).
                            </p>
                          )}
                          <p className="hint muted">
                            {structural
                              ? "Wing: flap lift · Glider: pitch sail · Parachute: inflation drag. Higher area helps heavy bodies take off (see Capabilities → Flight readiness)."
                              : "Area scale for aero-like lift/drag."}
                          </p>
                        </>
                      )}
                      {isFeatureEnabled("spriteBodyParts") && (
                        <>
                          <h4 className="subhead">Body parts</h4>
                          {boneParts.length > 0 && (
                            <p className="hint muted">
                              {boneParts.length} attached — select on canvas
                              (Select tool) to move/resize.
                            </p>
                          )}
                          <BodyPartCatalogPicker
                            onPick={(assetId) => {
                              const next = addBodyPartToBone(
                                design,
                                bone.id,
                                assetId,
                              );
                              commitDesign(next);
                              const idx =
                                (next.appearance?.bodyParts.length ?? 1) - 1;
                              setSelection({ kind: "bodyPart", index: idx });
                            }}
                          />
                        </>
                      )}
                    </div>
                  );
                })()}

              {selection?.kind === "cloth" &&
                (() => {
                  const garment = design.appearance?.cloth?.[selection.index];
                  if (!garment) return null;
                  const pinSummary = garment.pins
                    .map((p) =>
                      p.jointId !== undefined
                        ? `J${p.jointId}`
                        : p.boneId !== undefined
                          ? `B${p.boneId}`
                          : "?",
                    )
                    .join(" · ");
                  const weight = garment.weight ?? CLOTH_DEFAULT_WEIGHT;
                  const stiffness =
                    garment.stiffness ?? CLOTH_DEFAULT_STIFFNESS;
                  return (
                    <div className="inspector">
                      <h3 className="subhead">Cloth</h3>
                      <p className="hint muted">
                        Pins {pinSummary || "none"} · {garment.cols}×
                        {garment.rows} grid
                      </p>
                      <label className="slider-row">
                        <span>Cols</span>
                        <input
                          type="range"
                          min={2}
                          max={CLOTH_MAX_COLS}
                          step={1}
                          value={garment.cols}
                          onChange={(e) =>
                            commitDesign(
                              updateClothGarment(design, selection.index, {
                                cols: Number(e.target.value),
                              }),
                            )
                          }
                        />
                        <span className="val">{garment.cols}</span>
                      </label>
                      <label className="slider-row">
                        <span>Rows</span>
                        <input
                          type="range"
                          min={2}
                          max={CLOTH_MAX_ROWS}
                          step={1}
                          value={garment.rows}
                          onChange={(e) =>
                            commitDesign(
                              updateClothGarment(design, selection.index, {
                                rows: Number(e.target.value),
                              }),
                            )
                          }
                        />
                        <span className="val">{garment.rows}</span>
                      </label>
                      <label className="slider-row">
                        <span>Cell</span>
                        <input
                          type="range"
                          min={CLOTH_MIN_CELL}
                          max={CLOTH_MAX_CELL}
                          step={0.01}
                          value={garment.cellSize}
                          onChange={(e) =>
                            commitDesign(
                              updateClothGarment(design, selection.index, {
                                cellSize: Number(e.target.value),
                              }),
                            )
                          }
                        />
                        <span className="val">
                          {garment.cellSize.toFixed(2)}
                        </span>
                      </label>
                      <label
                        className="slider-row"
                        title="Higher weight = heavier drape"
                      >
                        <span>Weight</span>
                        <input
                          type="range"
                          min={0.25}
                          max={3}
                          step={0.05}
                          value={weight}
                          onChange={(e) =>
                            commitDesign(
                              updateClothGarment(design, selection.index, {
                                weight: Number(e.target.value),
                              }),
                            )
                          }
                        />
                        <span className="val">{weight.toFixed(2)}</span>
                      </label>
                      <label
                        className="slider-row"
                        title="Higher stiffness = less stretchy fabric"
                      >
                        <span>Stiff</span>
                        <input
                          type="range"
                          min={0.5}
                          max={2.5}
                          step={0.05}
                          value={stiffness}
                          onChange={(e) =>
                            commitDesign(
                              updateClothGarment(design, selection.index, {
                                stiffness: Number(e.target.value),
                              }),
                            )
                          }
                        />
                        <span className="val">{stiffness.toFixed(2)}</span>
                      </label>
                      <label className="field-row">
                        <span>Color</span>
                        <input
                          type="color"
                          value={
                            garment.color?.startsWith("#")
                              ? garment.color.slice(0, 7)
                              : "#7848a0"
                          }
                          onChange={(e) =>
                            commitDesign(
                              updateClothGarment(design, selection.index, {
                                color: `${e.target.value}b8`,
                              }),
                            )
                          }
                        />
                      </label>
                      <label className="toggle-row">
                        <input
                          type="checkbox"
                          checked={(garment.layer ?? "under") === "over"}
                          onChange={(e) =>
                            commitDesign(
                              updateClothGarment(design, selection.index, {
                                layer: e.target.checked ? "over" : "under",
                              }),
                            )
                          }
                        />
                        Draw over body parts
                      </label>
                      <div className="button-row">
                        <button
                          type="button"
                          onClick={() => {
                            commitDesign(
                              removeClothGarment(design, selection.index),
                            );
                            setSelection(null);
                          }}
                        >
                          Remove cloth
                        </button>
                      </div>
                    </div>
                  );
                })()}

              {isFeatureEnabled("cosmeticCloth") &&
                (design.appearance?.cloth?.length ?? 0) > 0 &&
                selection?.kind !== "cloth" && (
                  <div className="inspector">
                    <h3 className="subhead">Cloth</h3>
                    <div className="button-row wrap">
                      {design.appearance!.cloth!.map((g, i) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() =>
                            setSelection({ kind: "cloth", index: i })
                          }
                        >
                          Cloth {i + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {selection?.kind === "bodyPart" &&
                (() => {
                  const part = design.appearance?.bodyParts[selection.index];
                  if (!part) return null;
                  const def = getBodyPart(part.assetId);
                  const scale = part.scale ?? def?.defaultScale ?? 0.28;
                  return (
                    <div className="inspector">
                      <h3 className="subhead">
                        Body part · {def?.label ?? part.assetId}
                      </h3>
                      <p className="hint muted">
                        {part.boneId !== undefined
                          ? `Anchored to bone ${part.boneId}`
                          : part.jointId !== undefined
                            ? `Anchored to joint ${part.jointId}`
                            : "Unanchored"}
                      </p>
                      <label className="slider-row">
                        <span>Scale</span>
                        <input
                          type="range"
                          min={0.12}
                          max={2.5}
                          step={0.02}
                          value={scale}
                          onChange={(e) =>
                            commitDesign(
                              updateBodyPart(design, selection.index, {
                                scale: Number(e.target.value),
                              }),
                            )
                          }
                        />
                        <span className="val">{scale.toFixed(2)}</span>
                      </label>
                      <label className="slider-row">
                        <span>Rotation</span>
                        <input
                          type="range"
                          min={-180}
                          max={180}
                          step={1}
                          value={Math.round(
                            (((part.rotation ?? 0) * 180) / Math.PI + 540) %
                              360 -
                              180,
                          )}
                          onChange={(e) =>
                            commitDesign(
                              updateBodyPart(design, selection.index, {
                                rotation:
                                  (Number(e.target.value) * Math.PI) / 180,
                              }),
                            )
                          }
                        />
                        <span className="val">
                          {Math.round(
                            (((part.rotation ?? 0) * 180) / Math.PI + 540) %
                              360 -
                              180,
                          )}
                          °
                        </span>
                      </label>
                      {part.boneId !== undefined && (
                        <label className="slider-row">
                          <span>Along</span>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={part.along ?? 0.5}
                            onChange={(e) =>
                              commitDesign(
                                updateBodyPart(design, selection.index, {
                                  along: Number(e.target.value),
                                }),
                              )
                            }
                          />
                          <span className="val">
                            {(part.along ?? 0.5).toFixed(2)}
                          </span>
                        </label>
                      )}
                      <label className="toggle-row">
                        <input
                          type="checkbox"
                          checked={!!part.mirror}
                          onChange={(e) =>
                            commitDesign(
                              updateBodyPart(design, selection.index, {
                                mirror: e.target.checked,
                              }),
                            )
                          }
                        />
                        Mirror
                      </label>
                      <div className="button-row">
                        <button
                          type="button"
                          onClick={() => {
                            commitDesign(
                              removeBodyPart(design, selection.index),
                            );
                            setSelection(null);
                          }}
                        >
                          Remove part
                        </button>
                      </div>
                    </div>
                  );
                })()}

              {selection?.kind === "muscle" &&
                (() => {
                  const muscle = design.muscles.find(
                    (m) => m.id === selection.id,
                  );
                  if (!muscle) return null;
                  const g = normalizeDriveGroup(muscle.driveGroup);
                  return (
                    <div className="inspector">
                      <h3 className="subhead">Muscle {muscle.id}</h3>
                      <p className="hint muted">
                        {g !== undefined
                          ? `Shared brain channel G${g}`
                          : "Own brain channel (ungrouped)"}
                      </p>
                      <div className="button-row">
                        <button
                          type="button"
                          onClick={() =>
                            commitDesign(assignDriveGroup(design, [muscle.id]))
                          }
                        >
                          New group
                        </button>
                        {g !== undefined && (
                          <button
                            type="button"
                            onClick={() =>
                              commitDesign(clearDriveGroup(design, [muscle.id]))
                            }
                          >
                            Ungroup
                          </button>
                        )}
                      </div>
                      {design.muscles.filter((m) => m.id !== muscle.id).length >
                        0 && (
                        <label className="field-row">
                          <span>Join group</span>
                          <select
                            value={g ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!v) {
                                commitDesign(
                                  clearDriveGroup(design, [muscle.id]),
                                );
                                return;
                              }
                              commitDesign(
                                assignDriveGroup(
                                  design,
                                  [muscle.id],
                                  Number(v),
                                ),
                              );
                            }}
                          >
                            <option value="">—</option>
                            {[
                              ...new Set(
                                design.muscles
                                  .map((m) => normalizeDriveGroup(m.driveGroup))
                                  .filter((x): x is number => x !== undefined),
                              ),
                            ].map((id) => (
                              <option key={id} value={id}>
                                G{id}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                  );
                })()}
          </>
        );

        const vizShape = liveBrain?.shape ?? bestGenome?.shape ?? null;
        const trainPanel = (
          <div className="panel-stack">
            <section>
              <h2>Train</h2>
              {!hasCreature && (
                <p className="hint muted">
                  Load or build a creature first — empty designs stay in Edit.
                </p>
              )}
              {isFeatureEnabled("trainDockIa") &&
                hasCreature &&
                !trainHelpDismissed && (
                  <div className="train-help-strip">
                    <strong>How to train</strong>
                    <ol>
                      <li>Pick Skill, Goal, and Env above</li>
                      <li>Press Evolve — many brains try the course</li>
                      <li>Play best to watch the winner</li>
                      <li>
                        Export creature + brain downloads{" "}
                        <code>{trainedModelName(design.name || "Creature")}</code>{" "}
                        (body + trained weights)
                      </li>
                    </ol>
                    <button
                      type="button"
                      style={{ marginTop: "0.35rem" }}
                      onClick={() => {
                        setTrainHelpDismissed(true);
                        try {
                          localStorage.setItem("freshstart_train_help_v1", "1");
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      Got it
                    </button>
                  </div>
                )}
              <p className="hint muted">
                Goal: <strong>{getGoal(goalId).title}</strong>
                {mode === "sim"
                  ? ` · t = ${simTime.toFixed(1)}s · task ${activeTask}`
                  : ""}
                {evolveProgress.running ? " · ← → focus" : ""}
              </p>
              {!designHasActuators(
                design,
                isFeatureEnabled("motorWheels"),
              ) &&
                hasCreature && (
                <p className="hint muted">
                  Add at least one muscle or wheel in Edit first.
                </p>
              )}
              {activeTask === "boxing" && isFeatureEnabled("boxingMode") && (
                <div className="priority-sliders">
                  <h3 className="subhead">Sparring partner</h3>
                  <p className="hint muted">
                    Level 1 is a random-weight dummy. Level 2 is BoxoBot V2T, a
                    trained boxer that punches back.
                  </p>
                  <label className="field-row">
                    <span>Opponent</span>
                    <select
                      value={boxingSparringId}
                      disabled={evolveProgress.running}
                      onChange={(event) =>
                        setBoxingSparringId(
                          event.target.value as SparringOpponentId,
                        )
                      }
                    >
                      {sparringOpponentsForDivision(boxingDivisionId).map(
                        (item) => (
                          <option key={item.id} value={item.id}>
                            Level {item.level} ·{" "}
                            {sparringOpponentLabel(item.id, boxingDivisionId)}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <p className="hint muted">
                    {
                      sparringOpponentsForDivision(boxingDivisionId).find(
                        (item) => item.id === boxingSparringId,
                      )?.description
                    }
                  </p>
                </div>
              )}
              {isFeatureEnabled("goalPriorities") &&
                activeTask === "boxing" && (
                <div className="priority-sliders">
                  <h3 className="subhead">Boxing priorities</h3>
                  <p className="hint muted">
                    What matters more — tilts the Boxing training score mix,
                    not physics or match points. How many I watch = parallel
                    sparring pairs on screen (Show others for the ghost pack);
                    How many try = full population each round.
                  </p>
                  {BOXING_PRIORITY_KEYS.map((key) => (
                    <label key={key}>
                      <span>{BOXING_PRIORITY_LABELS[key]}</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={boxingPriorities[key]}
                        disabled={evolveProgress.running}
                        onChange={(e) =>
                          setBoxingPriorities((p) => ({
                            ...p,
                            [key]: Number(e.target.value),
                          }))
                        }
                      />
                      <span className="val">
                        {boxingPriorities[key].toFixed(2)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {activeTask === "jousting" && isFeatureEnabled("joustingMode") && (
                <div className="priority-sliders">
                  <h3 className="subhead">Sparring partner</h3>
                  <p className="hint muted">
                    Level 1 is a random-weight dummy of your body. Level 2 is
                    JoustBot, a bundled lance creature.
                  </p>
                  <label className="field-row">
                    <span>Opponent</span>
                    <select
                      value={joustingSparringId}
                      disabled={evolveProgress.running}
                      onChange={(event) =>
                        setJoustingSparringId(
                          event.target.value as JoustSparringId,
                        )
                      }
                    >
                      {JOUST_SPARRING_OPPONENTS.map((item) => (
                        <option key={item.id} value={item.id}>
                          Level {item.level} ·{" "}
                          {joustSparringOpponentLabel(item.id, design.name)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="hint muted">
                    {
                      JOUST_SPARRING_OPPONENTS.find(
                        (item) => item.id === joustingSparringId,
                      )?.description
                    }
                  </p>
                </div>
              )}
              {isFeatureEnabled("goalPriorities") &&
                activeTask === "jousting" && (
                <div className="priority-sliders">
                  <h3 className="subhead">Jousting priorities</h3>
                  <p className="hint muted">
                    What matters more — reweights the same scorecard used to
                    pick a winner. Hit, stay up, unhorse, knockback, and commit.
                  </p>
                  {JOUSTING_PRIORITY_KEYS.map((key) => (
                    <label key={key}>
                      <span>{JOUSTING_PRIORITY_LABELS[key]}</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={joustingPriorities[key]}
                        disabled={evolveProgress.running}
                        onChange={(e) =>
                          setJoustingPriorities((p) => ({
                            ...p,
                            [key]: Number(e.target.value),
                          }))
                        }
                      />
                      <span className="val">
                        {joustingPriorities[key].toFixed(2)}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {isFeatureEnabled("goalPriorities") &&
                activeTask !== "boxing" &&
                activeTask !== "jousting" && (
                <div className="priority-sliders">
                  <h3 className="subhead">Priorities</h3>
                  <p className="hint muted">
                    What matters more — changes the score mix, not physics.
                    Only sliders that affect{" "}
                    <strong>{getGoal(goalId).title}</strong> are shown.
                  </p>
                  {(
                    [
                      ["distance", "Distance"],
                      ["upright", "Stay upright"],
                      ["dontFall", "Don’t fall"],
                    ] as const
                  )
                    .filter(([key]) =>
                      relevantPriorityKeys(getGoal(goalId).task).includes(key),
                    )
                    .map(([key, label]) => (
                    <label key={key}>
                      <span>{label}</span>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={goalPriorities[key]}
                        disabled={evolveProgress.running}
                        onChange={(e) =>
                          setGoalPriorities((p) => ({
                            ...p,
                            [key]: Number(e.target.value),
                          }))
                        }
                      />
                      <span className="val">
                        {goalPriorities[key].toFixed(2)}
                      </span>
                    </label>
                  ))}
                  <label className="toggle-row" style={{ marginTop: "0.35rem" }}>
                    <input
                      type="checkbox"
                      checked={stageTrainerOn}
                      disabled={evolveProgress.running}
                      onChange={(e) => setStageTrainerOn(e.target.checked)}
                    />
                    Train in stages
                  </label>
                  {stageTrainerOn && (
                    <p className="hint muted">
                      Stay tall → Run → Sprint when fitness clears each step.
                    </p>
                  )}
                  {isFeatureEnabled("courseCurriculum") &&
                    hasCourseCurriculum(
                      activeEnvPackageId,
                      courseBaseForResolve(),
                    ) && (
                      <>
                        <label
                          className="toggle-row"
                          style={{ marginTop: "0.35rem" }}
                        >
                          <input
                            type="checkbox"
                            checked={courseCurriculumOn}
                            disabled={evolveProgress.running}
                            onChange={(e) => {
                              const on = e.target.checked;
                              setCourseCurriculumOn(on);
                              const base = courseBaseForResolve();
                              if (on) {
                                if (!base) return;
                                applyCourseStage(activeEnvPackageId, 0, {
                                  selectSprint: true,
                                  baseEnv: base,
                                });
                              } else {
                                const restore =
                                  courseBaseEnvRef.current ??
                                  (activeEnvPackageId
                                    ? envPackages.find(
                                        (p) => p.id === activeEnvPackageId,
                                      )?.environment
                                    : null);
                                if (restore) {
                                  setEnvDesign(cloneEnvironment(restore));
                                  setCourseStageIndex(0);
                                }
                                courseBaseEnvRef.current = null;
                              }
                            }}
                          />
                          Train course stages
                        </label>
                        {courseCurriculumOn && (
                          <p className="hint muted">
                            {(() => {
                              const c = resolveCourseCurriculum(
                                activeEnvPackageId,
                                courseBaseEnvRef.current ??
                                  courseBaseForResolve(),
                              );
                              if (!c) return null;
                              const idx = clampCourseStageIndex(
                                c,
                                courseStageIndex,
                              );
                              const stage = c.stages[idx];
                              return (
                                <>
                                  {stage.label} ({idx + 1}/{c.stages.length})
                                  {idx < c.stages.length - 1
                                    ? ` · next at fit ≥ ${stage.threshold}`
                                    : " · full course"}
                                  . Sprint finish moves forward each clear.
                                  Timer starts at the start line.
                                </>
                              );
                            })()}
                          </p>
                        )}
                      </>
                    )}
                </div>
              )}
              {(isFeatureEnabled("raycastObservations") ||
                isFeatureEnabled("trainExperiences") ||
                isFeatureEnabled("morphEvolve") ||
                isFeatureEnabled("trainTelemetryLog")) && (
                <CollapsiblePanel
                  title="More training options"
                  open={trainMoreOpen}
                  onToggle={() => setTrainMoreOpen((v) => !v)}
                >
                  {isFeatureEnabled("raycastObservations") && (
                    <div style={{ marginTop: "0.25rem" }}>
                      <h3 className="subhead">Senses</h3>
                      <label
                        className="toggle-row"
                        title="Append forward/down Rapier ray whiskers to brain inputs. Requires a fresh evolve (layout change)."
                      >
                        <input
                          type="checkbox"
                          checked={raycastObservationsOn}
                          disabled={evolveProgress.running}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setRaycastObservationsOn(on);
                            simulation.setRaycastObservations(on);
                            try {
                              localStorage.setItem(
                                "freshstart_raycast_obs_v1",
                                on ? "1" : "0",
                              );
                            } catch {
                              /* ignore */
                            }
                          }}
                        />
                        Raycast whiskers
                      </label>
                      <p className="hint muted">
                        5 range sensors (forward / up / down). Helps obstacle
                        courses; changes brain input size — evolve fresh or load
                        a matching model.
                      </p>
                    </div>
                  )}
                  {isFeatureEnabled("trainExperiences") && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <h3 className="subhead">Practice extras</h3>
                      <label className="toggle-row">
                        <input
                          type="checkbox"
                          checked={raceRecord}
                          onChange={(e) => setRaceRecord(e.target.checked)}
                        />
                        Race your record
                      </label>
                      <p className="hint muted">
                        Keep the prior best on screen when playing (ghost pack).
                      </p>
                      <label className="toggle-row">
                        <input
                          type="checkbox"
                          checked={messyBodies}
                          disabled={evolveProgress.running}
                          onChange={(e) => setMessyBodies(e.target.checked)}
                        />
                        Practice with messy bodies
                      </label>
                      <p className="hint muted">
                        Slight mass/length jitter each try (fixed topology).
                      </p>
                    </div>
                  )}
                  {isFeatureEnabled("morphEvolve") && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <h3 className="subhead">Biodiversity</h3>
                      <label
                        className="toggle-row"
                        title="Evolve mass, leg length, aero, and wheels with the brain (same muscle layout)."
                      >
                        <input
                          type="checkbox"
                          checked={morphEvolveOn}
                          disabled={evolveProgress.running}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setMorphEvolveOn(on);
                            if (!on) {
                              setStructuralMorphOn(false);
                              try {
                                localStorage.setItem(
                                  "freshstart_structural_morph_v1",
                                  "0",
                                );
                              } catch {
                                /* ignore */
                              }
                            }
                            try {
                              localStorage.setItem(
                                "freshstart_morph_evolve_v1",
                                on ? "1" : "0",
                              );
                            } catch {
                              /* ignore */
                            }
                          }}
                        />
                        Evolve body traits
                      </label>
                      <p className="hint muted">
                        Soft morph genes: longer/heavier limbs, aero, wheels —
                        not new joints. Off by default for classic brain-only
                        runs.
                      </p>
                      {isFeatureEnabled("structuralMorphEvolve") && (
                        <>
                          <label
                            className="toggle-row"
                            style={{
                              marginTop: "0.35rem",
                              marginLeft: "0.75rem",
                            }}
                            title="Grow/prune joints, bones, and muscles from your design. Brain pads to a fixed max."
                          >
                            <input
                              type="checkbox"
                              checked={structuralMorphOn && morphEvolveOn}
                              disabled={
                                evolveProgress.running || !morphEvolveOn
                              }
                              onChange={(e) => {
                                const on = e.target.checked;
                                setStructuralMorphOn(on);
                                try {
                                  localStorage.setItem(
                                    "freshstart_structural_morph_v1",
                                    on ? "1" : "0",
                                  );
                                } catch {
                                  /* ignore */
                                }
                              }}
                            />
                            Evolve structure
                          </label>
                          <p
                            className="hint muted"
                            style={{ marginLeft: "0.75rem" }}
                          >
                            Grow/prune segments and muscles from your design
                            (padded brain). Requires Evolve body traits.
                          </p>
                        </>
                      )}
                    </div>
                  )}
                  {isFeatureEnabled("trainTelemetryLog") && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <h3 className="subhead">Training log</h3>
                      <label
                        className="toggle-row"
                        title="Capture gen-champion body, metrics, and failure/reward patterns for up to 50 generations."
                      >
                        <input
                          type="checkbox"
                          checked={trainTelemetryOn}
                          disabled={evolveProgress.running}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setTrainTelemetryOn(on);
                            try {
                              localStorage.setItem(
                                "freshstart_train_telemetry_v1",
                                on ? "1" : "0",
                              );
                            } catch {
                              /* ignore */
                            }
                            if (!on) {
                              trainTelemetrySessionRef.current = null;
                              setTrainTelemetrySession(null);
                            }
                          }}
                        />
                        Log next run ({TRAIN_TELEMETRY_WINDOW} gens)
                      </label>
                      <p className="hint muted">
                        Records body, gen-champion metrics, and stall contacts
                        (ramp angle/height, foot slip, what they were touching).
                        Downloads JSON when the window fills or the run ends.
                      </p>
                      {trainTelemetrySession && (
                        <div
                          className="button-row wrap"
                          style={{ marginTop: "0.35rem" }}
                        >
                          <button
                            type="button"
                            disabled={
                              trainTelemetrySession.generations.length === 0
                            }
                            onClick={() => {
                              const final =
                                trainTelemetrySession.endedAt != null
                                  ? trainTelemetrySession
                                  : finalizeAndMaybeDownloadTelemetry(
                                      trainTelemetrySession,
                                      false,
                                    );
                              downloadText(
                                telemetryFilename(final),
                                exportTrainTelemetryJson(final),
                              );
                            }}
                          >
                            Download log (
                            {trainTelemetrySession.generations.length}/
                            {trainTelemetrySession.window})
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </CollapsiblePanel>
              )}
              {isFeatureEnabled("experimentPacks") && (
                <div style={{ marginTop: "0.5rem" }}>
                  <h3 className="subhead">Training recipes</h3>
                  <p className="hint muted">
                    Recipe = how you search. Brain (
                    <code>NameT</code>) = what you learned.
                  </p>
                  <div className="button-row wrap">
                    <button
                      type="button"
                      disabled={evolveProgress.running}
                      onClick={() => {
                        const name = window.prompt(
                          "Name this training recipe",
                          gaKnobs.recipeId,
                        );
                        if (!name?.trim()) return;
                        const recipe: TrainingRecipeSave = {
                          kind: "training_recipe",
                          version: EXPERIMENT_PACK_VERSION,
                          name: name.trim(),
                          knobs: { ...gaKnobs },
                          createdAt: Date.now(),
                        };
                        saveNamedRecipe(recipe);
                        setNamedRecipes(loadNamedRecipes());
                        downloadText(
                          `${name.trim().replace(/\s+/g, "_")}_recipe.json`,
                          exportRecipeJson(recipe),
                        );
                      }}
                    >
                      Save recipe
                    </button>
                    <button
                      type="button"
                      disabled={!bestGenome || evolveProgress.running}
                      title="Export body + env + goal + recipe + brain"
                      onClick={() => {
                        if (!bestGenome) return;
                        const name =
                          window.prompt(
                            "Experiment pack name",
                            `${design.name || "Creature"}_${activeTask}`,
                          ) ?? "";
                        if (!name.trim()) return;
                        downloadText(
                          `${name.trim().replace(/\s+/g, "_")}_pack.json`,
                          exportExperimentPackJson({
                            kind: "experiment_pack",
                            version: EXPERIMENT_PACK_VERSION,
                            name: name.trim(),
                            goalId,
                            task: activeTask,
                            design: cloneDesign(design),
                            environment: cloneEnvironment(envDesign),
                            knobs: { ...gaKnobs },
                            brain: {
                              shape: bestGenome.shape,
                              weights: Array.from(bestGenome.genome.weights),
                              fitness: bestGenome.genome.fitness,
                            },
                            createdAt: Date.now(),
                          }),
                        );
                      }}
                    >
                      Export experiment pack
                    </button>
                  </div>
                  {namedRecipes.length > 0 && (
                    <div className="button-col" style={{ marginTop: "0.35rem" }}>
                      {namedRecipes.slice(0, 6).map((r) => (
                        <button
                          key={`${r.name}-${r.createdAt}`}
                          type="button"
                          disabled={evolveProgress.running}
                          title="Try this setup"
                          onClick={() => {
                            setGaKnobs({ ...r.knobs });
                          }}
                        >
                          Try: {r.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
            {!isFeatureEnabled("trainDockIa") &&
              isFeatureEnabled("controlPanel") && (
                <CollapsiblePanel
                  title="Controls"
                  open={controlsOpen}
                  onToggle={() => setControlsOpen((v) => !v)}
                >
                  <p className="hint muted">
                    Observe / train speed live in the bottom dock.
                  </p>
                </CollapsiblePanel>
              )}
            {isFeatureEnabled("networkVisualizer") && (
              <section>
                <h2>Brain {evolveProgress.running ? "(live)" : ""}</h2>
                <NetworkVisualizer
                  shape={vizShape}
                  weights={
                    liveBrain?.weights ?? bestGenome?.genome.weights ?? null
                  }
                  inputs={liveBrain?.inputs ?? null}
                  outputs={liveBrain?.outputs ?? null}
                  hidden={liveBrain?.hidden ?? null}
                  liveLabel={
                    evolveProgress.running && liveBrain
                      ? activeTask === "boxing"
                        ? `Pair ${liveBrain.focusIndex + 1} · genome ${liveBrain.genomeIndex + 1} · round ${evolveProgress.generation} · batch ${evolveProgress.batch ?? 1}/${evolveProgress.batchCount ?? 1}`
                        : `Focus #${liveBrain.focusIndex + 1} · genome ${liveBrain.genomeIndex + 1} · gen ${evolveProgress.generation}`
                      : liveBrain && driveMode === "brain"
                        ? "Play / brain drive"
                        : null
                  }
                  width={280}
                  height={200}
                />
                <p className="hint muted">
                  Fixed MLP ·{" "}
                  {vizShape
                    ? `${vizShape.inputCount}–${vizShape.hiddenCount}–${vizShape.outputCount}`
                    : "no genome"}
                  {evolveProgress.running
                    ? " · updates while training (← → change focus)"
                    : ""}
                </p>
              </section>
            )}
            {isFeatureEnabled("statsPanel") && (
              <StatsPanel
                live={liveStats}
                last={lastMetrics}
                open={statsOpen}
                onToggle={() => setStatsOpen((v) => !v)}
              />
            )}
            {isFeatureEnabled("statsPanel") && (
              <RewardsBreakdown
                task={activeTask}
                metrics={lastMetrics}
                open={rewardsOpen}
                onToggle={() => setRewardsOpen((v) => !v)}
              />
            )}
            {isFeatureEnabled("performanceDiagnostics") && (
              <PerfDiagnostics
                fps={perfFps}
                frameMs={perfFrameMs}
                open={diagOpen}
                onToggle={() => setDiagOpen((v) => !v)}
              />
            )}
          </div>
        );

        const h2hPanel =
          isFeatureEnabled("headToHead") ? (
            <HeadToHeadPanel
              savedModels={savedModels}
              packages={packages}
              currentDesign={design}
              envDesign={envDesign}
              episodeSeconds={episodeSeconds}
              busy={evolveProgress.running}
              lastResult={h2hResult}
              running={h2hRunning}
              progress={h2hProgress}
              onStartHeat={startH2hHeat}
              onStopHeat={stopH2h}
            />
          ) : null;

        const evolveButtons = (
          <>
            <div className="button-row">
              <HelpTip tip="Evolve tries many brains at once. Ghost outlines are the rest of the pack.">
                <button
                  type="button"
                  disabled={
                    evolveProgress.running ||
                    h2hRunning ||
                    !designHasActuators(
                      design,
                      isFeatureEnabled("motorWheels"),
                    )
                  }
                  onClick={() => startEvolve()}
                >
                  {bestGenome &&
                  isFeatureEnabled("trainStartFrom") &&
                  gaKnobs.startFrom !== "fresh"
                    ? "Evolve (from brain)"
                    : "Evolve"}
                </button>
              </HelpTip>
              <button
                type="button"
                disabled={!evolveProgress.running}
                onClick={stopEvolve}
              >
                Stop
              </button>
              <HelpTip tip="Watch the current best brain alone, without the ghost pack.">
                <button
                  type="button"
                  disabled={!bestGenome || evolveProgress.running || h2hRunning}
                  onClick={playBest}
                >
                  Play best
                </button>
              </HelpTip>
              <HelpTip tip="Continue evolving from this run’s elite instead of starting random.">
                <button
                  type="button"
                  disabled={!bestGenome || evolveProgress.running || h2hRunning}
                  onClick={continueFromBest}
                >
                  {isFeatureEnabled("trainDockIa") ? "Keep training" : "Continue"}
                </button>
              </HelpTip>
              {isFeatureEnabled("savedModels") && (
                <HelpTip tip="Download the current creature body together with its trained brain (JSON). Also stores a copy in Creature Library.">
                  <button
                    type="button"
                    disabled={!bestGenome || evolveProgress.running || h2hRunning}
                    onClick={saveBestModel}
                  >
                    Export creature + brain
                  </button>
                </HelpTip>
              )}
              {isFeatureEnabled("creatureSharing") && (
                <HelpTip tip="Upload this trained creature and copy a public link others can open.">
                  <button
                    type="button"
                    disabled={
                      !bestGenome ||
                      evolveProgress.running ||
                      h2hRunning ||
                      shareBusy
                    }
                    onClick={() => void shareCurrentElite()}
                  >
                    {shareBusy ? "Sharing…" : "Share"}
                  </button>
                </HelpTip>
              )}
            </div>
            {evolveProgress.running && (
              <div className="button-row" style={{ marginTop: "0.35rem" }}>
                <button
                  type="button"
                  onClick={() => simulation.focusPrevCreature()}
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={() => simulation.focusNextCreature()}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        );

        const dockSummary = (
          <div className="dock-summary">
            {evolveButtons}
            <span className="dock-summary-stats">
              {h2hRunning && h2hProgress
                ? `H2H ${h2hProgress.episodeT.toFixed(1)}/${h2hProgress.episodeDuration.toFixed(0)}s`
                : `Gen ${evolveProgress.generation} · Best ${evolveProgress.bestFitness.toFixed(2)}`}
              {isFeatureEnabled("environmentsRepo")
                ? ` · ${envDesign.name}`
                : ""}
            </span>
          </div>
        );

        const discoDock = isFeatureEnabled("discoMode") ? (
          <DiscoZonePanel
            trackName={discoTrack}
            hasTrack={discoPlayer.hasTrack()}
            playing={discoPlaying}
            dancing={driveMode === "disco"}
            trackTime={discoTrackTime}
            trackDuration={discoTrackDuration}
            puppetMode={discoPuppetMode}
            footMass={footMass}
            gains={discoGains}
            motion={discoMotion}
            auto={discoAuto}
            routing={discoRouting}
            slots={discoSlots}
            packages={packages}
            savedModels={savedModels}
            currentDesign={design}
            selection={selection}
            disabled={evolveProgress.running || h2hRunning || discoLearning}
            collapsed={dockCollapsed}
            onPlay={() => {
              discoPlayer.play();
              setDiscoPlaying(true);
              if (discoFreestyle) return;
              if (driveMode !== "disco") beginDiscoDrive();
            }}
            onPause={() => {
              discoPlayer.pause();
              setDiscoPlaying(false);
              setDiscoTrackTime(discoPlayer.currentTime());
            }}
            onStartDancing={() => {
              if (discoFreestyle) {
                setDiscoFreestyle(false);
                simulation.clearBrain();
              }
              discoPlayer.play();
              setDiscoPlaying(true);
              beginDiscoDrive();
            }}
            onResetPose={resetDiscoPose}
            onSeek={(seconds) => {
              discoPlayer.seek(seconds);
              setDiscoTrackTime(discoPlayer.currentTime());
            }}
            onPuppetModeChange={(mode) => {
              setDiscoPuppetMode(mode);
              simulation.setDiscoPuppetMode(mode);
            }}
            onFootMassChange={applyFootMass}
            onGainsChange={setDiscoGains}
            onMotionChange={setDiscoMotion}
            onAutoChange={(next) => {
              setDiscoAuto(next);
              discoAutoTickRef.current.initialized = false;
            }}
            onRoutingChange={setDiscoRouting}
            onSlotsChange={setDiscoSlots}
            hideMuscles={discoHideMuscles}
            hideBones={discoHideBones}
            greenscreen={discoGreenscreen}
            onHideMusclesChange={(hide) => {
              setDiscoHideMuscles(hide);
              simulation.hideMuscles = hide;
            }}
            onHideBonesChange={(hide) => {
              setDiscoHideBones(hide);
              simulation.hideBones = hide;
            }}
            onGreenscreenChange={setDiscoGreenscreen}
            savedSetups={discoSetups}
            onSaveSetup={saveCurrentDiscoSetup}
            onLoadSetup={loadDiscoSetupById}
            onDeleteSetup={deleteDiscoSetupById}
          />
        ) : null;

        const dockFull = (
          <div
            className={
              evolveProgress.running
                ? "dock-full dock-full-train evolve-running"
                : "dock-full dock-full-train"
            }
          >
            {h2hRunning && h2hProgress && (
              <p className="hint h2h-live">
                Head-to-Head heat · {h2hProgress.episodeT.toFixed(1)}s /{" "}
                {h2hProgress.episodeDuration.toFixed(0)}s
              </p>
            )}
            {h2hResult && !h2hRunning && (
              <p className="hint h2h-live">
                Last heat — A {h2hResult.fitness[0].toFixed(3)} · B{" "}
                {h2hResult.fitness[1].toFixed(3)}
              </p>
            )}
            <div className="train-dock-grid">
              <div className="train-dock-drive">
                <h3 className="subhead">Drive</h3>
                <div className="button-row wrap">
                  {driveButtons.map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={driveMode === id ? "active" : ""}
                      disabled={
                        evolveProgress.running ||
                        h2hRunning ||
                        (id === "brain" && !bestGenome)
                      }
                      onClick={() => {
                        if (id === "brain" && bestGenome) {
                          simulation.setBrain(
                            bestGenome.shape,
                            bestGenome.genome.weights,
                          );
                        }
                        if (driveMode === "disco" || simulation.isMultiDisco) {
                          stopDiscoDrive();
                        }
                        setDriveMode(id);
                        simulation.driveMode = id;
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="button-row wrap" style={{ marginTop: "0.25rem" }}>
                  <button
                    type="button"
                    disabled={evolveProgress.running}
                    onClick={() => simulation.reset()}
                  >
                    Reset pose
                  </button>
                </div>
                <label
                  className="toggle-row"
                  style={{ marginTop: "0.3rem" }}
                  title="Brain updates every physics step (60 Hz) instead of every other (30 Hz). Muscle forces always apply at 60 Hz; this only changes how often drives are recomputed. Disco imitation recording stays at 30 Hz."
                >
                  <input
                    type="checkbox"
                    checked={brainHz === BRAIN_HZ_FAST}
                    onChange={(e) =>
                      setBrainHz(e.target.checked ? BRAIN_HZ_FAST : BRAIN_HZ)
                    }
                  />
                  Brain 60 Hz
                  <span className="muted" style={{ marginLeft: "0.35rem" }}>
                    ({brainHz} Hz)
                  </span>
                </label>
                {driveMode === "manual" && (
                  <div className="sliders dock-sliders">
                    {manualDrives.map((v, i) => {
                      const muscleCh = countBrainActuatorChannels(
                        design.muscles,
                      );
                      const label =
                        i < muscleCh
                          ? `M${i + 1}`
                          : `W${i - muscleCh + 1}`;
                      return (
                        <label key={i} className="slider-row">
                          <span>{label}</span>
                          <input
                            type="range"
                            min={-1}
                            max={1}
                            step={0.01}
                            value={v}
                            onChange={(e) =>
                              updateManual(i, Number(e.target.value))
                            }
                          />
                          <span className="val">{v.toFixed(2)}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="train-dock-actions">
                <h3 className="subhead">
                  {isFeatureEnabled("trainDockIa")
                    ? `Train · ${getGoal(goalId).title}`
                    : `Evolve (${getGoal(goalId).title})`}
                </h3>
                {evolveButtons}
                {isFeatureEnabled("environmentsRepo") &&
                  isFeatureEnabled("courseCurriculum") &&
                  hasCourseCurriculum(
                    activeEnvPackageId,
                    courseBaseForResolve(),
                  ) && (
                    <p className="hint muted" style={{ marginTop: "0.25rem" }}>
                      This course has train stages (Train panel) and a start-line
                      race timer. Author stages in Environment Studio → Course.
                    </p>
                  )}
              </div>

              {isFeatureEnabled("controlPanel") && (
                <div className="train-dock-watch">
                  <h3 className="subhead">
                    {isFeatureEnabled("trainDockIa")
                      ? "Watch & view"
                      : "Speed"}
                  </h3>
                  <div className="train-speed-block">
                    <div className="train-speed-row">
                      <span className="train-speed-label">
                        Observe
                        {evolveProgress.running ? " · after stop" : ""}
                      </span>
                      <div className="button-row wrap">
                        {OBSERVE_SPEEDS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={observeSpeed === s ? "active" : ""}
                            onClick={() => setObserveSpeed(s)}
                            title={
                              evolveProgress.running
                                ? "Used when training stops — train speed stays active now"
                                : "Playback speed when not training"
                            }
                          >
                            {s}×
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="train-speed-row">
                      <span className="train-speed-label">
                        Train
                        {evolveProgress.running ? " · active" : ""}
                      </span>
                      <div className="button-row wrap">
                        {TRAIN_SPEEDS.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={trainSpeed === s ? "active" : ""}
                            onClick={() => setTrainSpeed(s)}
                          >
                            {s === 0 ? "Max" : `${s}×`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {!isFeatureEnabled("trainRecipes") && (
                    <label
                      className="slider-row train-try-slider"
                      style={{ marginTop: "0.25rem" }}
                      title="Simulated seconds per generation episode"
                    >
                      <span className="muted">{EPISODE_SECONDS_MIN}s</span>
                      <input
                        type="range"
                        min={EPISODE_SECONDS_MIN}
                        max={EPISODE_SECONDS_MAX}
                        step={1}
                        value={clampEpisodeSeconds(episodeSeconds)}
                        onChange={(e) => {
                          const s = Number(e.target.value);
                          setEpisodeSeconds(s);
                          setGaKnobs((k) => ({ ...k, episodeSeconds: s }));
                          if (evolveProgress.running) {
                            simulation.setEpisodeSeconds(s);
                          }
                        }}
                      />
                      <span className="val">
                        {formatEpisodeSeconds(
                          clampEpisodeSeconds(episodeSeconds),
                        )}
                      </span>
                    </label>
                  )}
                  <div className="train-viz-toggles">
                    <label
                      className="toggle-row"
                      title="Show the rest of the live batch as translucent ghosts"
                    >
                      <input
                        type="checkbox"
                        checked={showGhostPack || raceRecord}
                        onChange={(e) => {
                          setShowGhostPack(e.target.checked);
                          if (!e.target.checked) setRaceRecord(false);
                        }}
                      />
                      {isFeatureEnabled("trainDockIa")
                        ? "Show others"
                        : "Ghost pack"}
                    </label>
                    <label
                      className="toggle-row"
                      title="Hide muscle strokes in the sandbox view"
                    >
                      <input
                        type="checkbox"
                        checked={discoHideMuscles}
                        onChange={(e) => {
                          const hide = e.target.checked;
                          setDiscoHideMuscles(hide);
                          simulation.hideMuscles = hide;
                        }}
                      />
                      Hide muscles
                    </label>
                    <label
                      className="toggle-row"
                      title="Hide hinged bone capsules and joint dots"
                    >
                      <input
                        type="checkbox"
                        checked={discoHideBones}
                        onChange={(e) => {
                          const hide = e.target.checked;
                          setDiscoHideBones(hide);
                          simulation.hideBones = hide;
                        }}
                      />
                      Hide bones
                    </label>
                    {isFeatureEnabled("rigidStruts") && (
                      <label
                        className="toggle-row"
                        title="Hide solid strut lines (rigid frame members)"
                      >
                        <input
                          type="checkbox"
                          checked={hideSolidStruts}
                          onChange={(e) => {
                            const hide = e.target.checked;
                            setHideSolidStruts(hide);
                            simulation.hideSolidStruts = hide;
                          }}
                        />
                        Hide struts
                      </label>
                    )}
                  </div>
                </div>
              )}

              <div className="train-dock-progress">
                <h3 className="subhead">
                  {isFeatureEnabled("trainDockIa") ? "Progress" : "Status"}
                </h3>
                {evolveProgress.populationSize > 0 && (
                  <div className="evolve-bar">
                    <div
                      className="evolve-bar-fill"
                      style={{
                        width: `${Math.min(
                          100,
                          Number.isFinite(evolveProgress.episodeDuration) &&
                            (evolveProgress.episodeDuration ?? 0) > 0
                            ? (100 * (evolveProgress.episodeT ?? 0)) /
                                Math.max(1e-6, evolveProgress.episodeDuration!)
                            : (100 * evolveProgress.evaluated) /
                                Math.max(1, evolveProgress.populationSize),
                        )}%`,
                      }}
                    />
                  </div>
                )}
                <ul className="stats dock-stats train-progress-stats">
                  <li>
                    {isFeatureEnabled("trainDockIa") ? "Round" : "Gen"}{" "}
                    {evolveProgress.generation}
                  </li>
                  <li>
                    Try {(evolveProgress.episodeT ?? 0).toFixed(1)}s /{" "}
                    {formatEpisodeSeconds(
                      evolveProgress.episodeDuration ?? episodeSeconds,
                    )}
                  </li>
                  <li>Best {evolveProgress.bestFitness.toFixed(3)}</li>
                  <li>Mean {evolveProgress.meanFitness.toFixed(3)}</li>
                  {bestGenome && !evolveProgress.running && (
                    <li>Elite {bestGenome.genome.fitness.toFixed(3)}</li>
                  )}
                  {isFeatureEnabled("trainStartFrom") && (
                    <li className="train-progress-seed">
                      Run #{runSeed}{" "}
                      <button
                        type="button"
                        disabled={evolveProgress.running}
                        title="Reseed RNG for the next Evolve"
                        onClick={() => setRunSeed(Date.now() % 1_000_000)}
                      >
                        Reseed
                      </button>
                    </li>
                  )}
                </ul>
                <label
                  className="slider-row train-grip-slider"
                  title="How hard planted feet stick at low speed and resist sliding the wrong way on every surface (ground, ramps, boxes). Fast forward (right) scoot stays free; 0 = off."
                >
                  <span>Anti-scoot</span>
                  <input
                    type="range"
                    min={0}
                    max={ANTI_SCOOT_MAX}
                    step={0.05}
                    value={antiScoot}
                    onChange={(e) => setAntiScoot(Number(e.target.value))}
                  />
                  <span className="val">{antiScoot.toFixed(2)}</span>
                </label>
                <p className={evolveProgress.running ? "hint" : "hint muted"}>
                  {evolveProgress.status}
                </p>
                {isFeatureEnabled("trainTelemetryLog") &&
                  trainTelemetryOn &&
                  trainTelemetrySession && (
                    <div className="train-telemetry-live">
                      <p className="hint">
                        Log: {trainTelemetrySession.generations.length}/
                        {trainTelemetrySession.window} gens
                        {trainTelemetrySession.endedAt
                          ? " · complete"
                          : evolveProgress.running
                            ? " · capturing"
                            : ""}
                      </p>
                      {trainTelemetrySession.morphology && (
                        <p className="hint muted">
                          {trainTelemetrySession.morphology.name} ·{" "}
                          {trainTelemetrySession.morphology.joints}j/
                          {trainTelemetrySession.morphology.bones}b/
                          {trainTelemetrySession.morphology.muscles}m · feet{" "}
                          {trainTelemetrySession.morphology.feet}
                        </p>
                      )}
                      {(() => {
                        const last =
                          trainTelemetrySession.generations[
                            trainTelemetrySession.generations.length - 1
                          ];
                        const cause = last?.stall?.summaryCause;
                        return cause ? (
                          <p className="hint muted" title={cause}>
                            Last stall: {cause}
                          </p>
                        ) : null;
                      })()}
                      {trainTelemetrySession.insights.length > 0 && (
                        <ul className="stats dock-stats train-telemetry-insights">
                          {trainTelemetrySession.insights
                            .slice(0, 5)
                            .map((ins) => (
                              <li key={`${ins.kind}-${ins.label}`}>
                                <span className="muted">{ins.label}:</span>{" "}
                                {ins.detail}
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  )}
              </div>

              {isFeatureEnabled("trainRecipes") && (
                <div className="train-dock-setup">
                  <TrainingSetupPanel
                    knobs={gaKnobs}
                    disabled={evolveProgress.running}
                    hasBestOfRun={!!bestGenome}
                    savedBrainOptions={savedModels
                      .filter((m) => m.task === activeTask)
                      .map((m) => ({ id: m.id, name: m.name }))}
                    onChange={setGaKnobs}
                    showSchedules={isFeatureEnabled("trainSchedules")}
                  />
                </div>
              )}
            </div>
          </div>
        );

        const worldDock = (
          <WorldDock
            tool={envTool}
            onToolChange={setEnvTool}
            snapEnabled={envSnapEnabled}
            onSnapChange={setEnvSnapEnabled}
            environment={envDesign}
            selection={envSelection}
            onSelect={setEnvSelection}
            onPatchMarker={(id, patch) => {
              commitEnv({
                ...envDesign,
                markers: (envDesign.markers ?? []).map((m) =>
                  m.id === id ? clampCourseMarker({ ...m, ...patch }) : m,
                ),
              });
            }}
            onPatchObstacle={(id, patch) => {
              commitEnv({
                ...envDesign,
                obstacles: envDesign.obstacles.map((o) =>
                  o.id === id ? { ...o, ...patch } : o,
                ),
              });
            }}
            onEnsureCourse={() => {
              commitEnv(ensureCourseGates(envDesign));
            }}
            onPlaceEvenCheckpoints={(count) => {
              commitEnv(placeEvenCheckpoints(envDesign, count));
            }}
            onMoveCheckpoint={(id, delta) => {
              commitEnv(moveCheckpointOrder(envDesign, id, delta));
            }}
            onBuildCurriculum={() => {
              const gated = ensureCourseGates(envDesign);
              const curriculum = buildCurriculumFromMarkers(gated);
              if (!curriculum) {
                setError(
                  "Need a finish gate to build curriculum stages.",
                );
                return;
              }
              commitEnv({ ...gated, curriculum });
            }}
            onClearCurriculum={() => {
              commitEnv(clearAuthoredCurriculum(envDesign));
            }}
            onPatchCurriculumStage={(stageId, patch) => {
              commitEnv(patchCurriculumStage(envDesign, stageId, patch));
            }}
            onDeleteSelected={deleteEnvSelected}
            onUndo={undoEnv}
            undoDisabled={envUndoCount === 0}
            onSineTerrain={() => {
              commitEnv({
                ...envDesign,
                terrain: studioSineTerrain({
                  startX: envDesign.terrain?.startX,
                  endX: envDesign.terrain?.endX,
                  amplitude: envDesign.terrain?.amplitude,
                  waves: envDesign.terrain?.waves,
                  sampleCount: envDesign.terrain?.samples.length,
                }),
              });
              setEnvSelection([{ kind: "terrain" }]);
            }}
            onPatchTerrain={(patch) => {
              const prev = envDesign.terrain;
              if (patch.waves != null) {
                commitEnv({
                  ...envDesign,
                  terrain: studioSineTerrain({
                    startX: prev?.startX,
                    endX: prev?.endX,
                    amplitude: patch.amplitude ?? prev?.amplitude,
                    waves: patch.waves,
                    sampleCount: prev?.samples.length,
                  }),
                });
              } else if (patch.amplitude != null) {
                commitEnv({
                  ...envDesign,
                  terrain: prev
                    ? setTerrainAmplitude(prev, patch.amplitude)
                    : studioSineTerrain({ amplitude: patch.amplitude }),
                });
              }
              setEnvSelection([{ kind: "terrain" }]);
            }}
            onClearTerrain={() => {
              commitEnv({ ...envDesign, terrain: undefined });
              setEnvSelection([]);
            }}
            onClearTower={() => {
              commitEnv({ ...envDesign, tower: undefined });
              setEnvSelection([]);
            }}
            onClearAll={() => {
              commitEnv({
                name: envDesign.name,
                theme: envDesign.theme,
                obstacles: [],
                regions: [],
                markers: [],
                spawn: { x: 0, y: 0 },
              });
              setEnvSelection([]);
            }}
            onDuplicateSelected={duplicateEnvSelected}
            onRotateSelected={rotateEnvSelected}
            collapsed={dockCollapsed}
          />
        );

        const creatureDock = (
          <CreatureDock
            tool={tool}
            onToolChange={(t) => {
              setTool(t);
              if (t !== "cloth") setClothDraftPins([]);
            }}
            editPhysics={editPhysics}
            collapsed={dockCollapsed}
            toolsExtras={creatureDockToolsExtras}
            options={creatureDockOptions}
            inspector={creatureDockInspector}
          />
        );

        const viewport =
          mode === "edit" ? (
            <EditorCanvas
              design={design}
              onChange={commitDesign}
              tool={tool}
              snapEnabled={snapEnabled}
              selection={selection}
              onSelect={setSelection}
              cameraRef={editorCamRef}
              boneRigid={boneRigid && isFeatureEnabled("rigidStruts")}
              clothDraftJointIds={clothDraftPins}
              onClothPinJoint={(jointId) => {
                setClothDraftPins((prev) =>
                  prev.includes(jointId)
                    ? prev.filter((id) => id !== jointId)
                    : [...prev, jointId],
                );
              }}
              viewportInsetBottom={
                isFeatureEnabled("sandboxMenuShell") ? dockInset : 0
              }
            />
          ) : mode === "world" ? (
            <EnvEditorCanvas
              environment={envDesign}
              onChange={(env) => commitEnv(env)}
              tool={envTool}
              onToolChange={setEnvTool}
              snapEnabled={envSnapEnabled}
              selection={envSelection}
              onSelect={setEnvSelection}
              referenceDesign={design}
              viewportInsetBottom={
                isFeatureEnabled("sandboxMenuShell") ? dockInset : 0
              }
            />
          ) : (
            <SimCanvas
              simulation={simulation}
              evolveFocusKeys={evolveProgress.running}
              viewportInsetBottom={
                isFeatureEnabled("sandboxMenuShell") ? dockInset : 0
              }
              greenscreen={skill === "disco" && discoGreenscreen}
              discoBallPos={
                skill === "disco" && isFeatureEnabled("discoMode")
                  ? discoBallPos
                  : undefined
              }
              onDiscoBallMoved={
                skill === "disco" && isFeatureEnabled("discoMode")
                  ? setDiscoBallPos
                  : undefined
              }
              discoFxProvider={
                skill === "disco" && isFeatureEnabled("discoMode")
                  ? () => ({
                      bands: discoPlayer.getBands(),
                      timeSec: discoPlayer.currentTime(),
                    })
                  : null
              }
              onDiscoDancerPlaced={(activeIndex, offsetX) => {
                setDiscoSlots((prev) => {
                  const activeIdxs: number[] = [];
                  for (let i = 0; i < prev.length; i++) {
                    if (prev[i] && prev[i]!.design.joints.length > 0) {
                      activeIdxs.push(i);
                    }
                  }
                  const slotIndex = activeIdxs[activeIndex];
                  if (slotIndex === undefined) return prev;
                  const copy = prev.slice();
                  const slot = copy[slotIndex];
                  if (!slot) return prev;
                  copy[slotIndex] = { ...slot, offsetX };
                  return copy;
                });
              }}
              onPerf={(perf) => {
                const now = performance.now();
                if (now - perfUiLastRef.current < 100) return;
                perfUiLastRef.current = now;
                setPerfFps(perf.fps);
                setPerfFrameMs(perf.frameMs);
              }}
              onFrame={(snap) => {
                const now = performance.now();
                if (now - frameUiLastRef.current < 100) return;
                frameUiLastRef.current = now;
                setSimTime(snap.time);
                if (snap.evolve) setEvolveProgress(snap.evolve);
                if (isFeatureEnabled("statsPanel")) {
                  setLiveStats(snap.liveStats);
                  if (snap.lastEpisodeMetrics) {
                    setLastMetrics(snap.lastEpisodeMetrics);
                  }
                }
                if (isFeatureEnabled("networkVisualizer")) {
                  setLiveBrain(snap.brain ?? null);
                }
              }}
            />
          );

        const creaturesPanel = (
          <CreaturesPanel
            currentDesign={design}
            packages={packages}
            savedModels={savedModels}
            bestEverList={bestEverList}
            discoveries={discoveries}
            activeTask={activeTask}
            evolving={evolveProgress.running}
            onOpenInEditor={openCreatureFromBrowser}
            onDeletePackage={(id) => {
              deletePackage(id);
              refreshPackages();
              if (selectedCreatureKey === `pkg:${id}`) {
                setSelectedCreatureKey("custom");
              }
            }}
            onContinueModel={(m) => {
              if (
                isFeatureEnabled("trainStartFrom") &&
                m.task !== "dance"
              ) {
                setGaKnobs((k) => ({
                  ...k,
                  startFrom: "saved",
                  savedModelId: m.id,
                  recipeId: "fine_tune",
                }));
              }
              continueFromModel(m);
            }}
            onDeleteModel={(id) => {
              deleteSavedModel(id);
              refreshModels();
            }}
            onLoadDanceFreestyle={loadDanceFreestyle}
            onDownloadText={downloadText}
            onImportJson={() => fileInputRef.current?.click()}
            onShareModel={
              isFeatureEnabled("creatureSharing")
                ? () => shareCurrentElite()
                : undefined
            }
            shareBusy={shareBusy}
            canShareModel={Boolean(bestGenome) && !evolveProgress.running}
            onOpenPublicShare={
              isFeatureEnabled("publicCreationsLibrary")
                ? (id) => void openSharedCreature(id)
                : undefined
            }
            presetSkillOverrides={presetSkillOverrides}
            currentSkillOverride={
              currentSkillOverride &&
              design.joints.length > 0 &&
              currentSkillOverride.fp === bodyFingerprint(design)
                ? currentSkillOverride.placement
                : null
            }
            onSetSkillPlacement={(key, placement) => {
              if (key === "current") {
                if (
                  placement &&
                  !isValidSkillPlacement(design, placement)
                ) {
                  return;
                }
                setCurrentSkillOverride(
                  placement && design.joints.length > 0
                    ? { fp: bodyFingerprint(design), placement }
                    : null,
                );
                return;
              }
              if (key.startsWith("preset:")) {
                const name = key.slice("preset:".length);
                const preset =
                  name === ULTI_GROOVE_BOT_II.name
                    ? ULTI_GROOVE_BOT_II
                    : PRESETS.find((p) => p.name === name);
                if (
                  placement &&
                  preset &&
                  !isValidSkillPlacement(preset, placement)
                ) {
                  return;
                }
                savePresetSkillOverride(name, placement);
                setPresetSkillOverrides(loadAllPresetSkillOverrides());
                return;
              }
              if (key.startsWith("pkg:")) {
                const result = setPackageSkillPlacement(
                  key.slice("pkg:".length),
                  placement,
                );
                if (!result.ok) {
                  setError(result.error);
                  return;
                }
                refreshPackages();
              }
            }}
          />
        );

        const tutorialPanel = (
          <TutorialPanel
            onJump={onTutorialJump}
            canJumpH2h={isFeatureEnabled("headToHead")}
            canJumpDiscoveries={isFeatureEnabled("discoveryUi")}
            hoverHelpEnabled={hoverHelpEnabled}
            onHoverHelpChange={onHoverHelpChange}
            resumeChapterId={tutorialResume?.chapterId}
            resumeView={tutorialResume?.view}
          />
        );

        const showTutorialHelp =
          !!tutorialHelpKey &&
          !showTutorialRoom &&
          !showCreaturesRoom &&
          !showTrophyRoom;

        const sandboxTabs: SandboxTab[] = [
          {
            id: "tutorial",
            label: "Tutorial",
            // Full-bleed viewport owns this tab; no side panel body.
            content: null,
          },
          { id: "skill", label: "Skill", content: skillPanel },
          ...(isFeatureEnabled("discoveryUi")
            ? [
                {
                  id: "discoveries" as const,
                  label: "Trophy room",
                  // Full-bleed viewport owns this tab; no side panel body.
                  content: null,
                },
              ]
            : []),
          { id: "edit", label: "Creature builder", content: editPanel },
          {
            id: "creatures",
            label: "Creature Library",
            // Full-bleed viewport owns this tab; no side panel body.
            content: null,
          },
          { id: "train", label: "Train", content: trainPanel },
          ...(isFeatureEnabled("headToHead") && h2hPanel
            ? [{ id: "h2h" as const, label: "H2H", content: h2hPanel }]
            : []),
          { id: "world", label: "Environment builder", content: worldPanel },
        ];

        const topbar = (
          <header className="topbar">
            <div className="brand">
              <h1>Solemn Sandbox</h1>
              <p>A serious environment to carry out silly experiments.</p>
            </div>
            {isFeatureEnabled("sandboxMenuShell") && (
              <SandboxTabRail
                tabs={sandboxTabs}
                activeTab={sandboxTab}
                onActiveTabChange={onSandboxTabChange}
              />
            )}
            <div className="topbar-actions">
              {isFeatureEnabled("immersiveFullscreen") && (
                <button
                  type="button"
                  className={immersive ? "active" : ""}
                  onClick={() => void toggleImmersive()}
                  title="Hide chrome and expand the viewport"
                >
                  {immersive ? "Exit immersive" : "Immersive"}
                </button>
              )}
            </div>
          </header>
        );

        if (isFeatureEnabled("sandboxMenuShell")) {
          return (
            <>
              {topbar}
              <SandboxShell
                tabs={sandboxTabs}
                activeTab={sandboxTab}
                onActiveTabChange={onSandboxTabChange}
                hideTabRail
                hideSidebar={showFullBleedRoom}
                contextStrip={
                  showFullBleedRoom || immersive ? null : (
                    <ContextStrip
                      skill={skill}
                      onSelectSkill={selectSkill}
                      showSkillTabs={isFeatureEnabled("skillTabs")}
                      showDiscoSkill={isFeatureEnabled("discoMode")}
                      showBoxingSkill={isFeatureEnabled("boxingMode")}
                      showJoustingSkill={isFeatureEnabled("joustingMode")}
                      goals={skillGoals}
                      goalId={goalId}
                      onSelectGoal={selectGoal}
                      showGoals={isFeatureEnabled("goalCatalog")}
                      envPackages={envPackages}
                      selectedPackageId={activeEnvPackageId}
                      activeEnvName={envDesign.name}
                      onSelectEnv={applyTrainingEnv}
                      showEnv={
                        isFeatureEnabled("environmentsRepo") &&
                        skill !== "boxing"
                      }
                      envDisabled={evolveProgress.running}
                    />
                  )
                }
                viewport={
                  showTutorialRoom
                    ? tutorialPanel
                    : showCreaturesRoom
                      ? creaturesPanel
                      : showTrophyRoom
                        ? trophyRoom
                        : !ready &&
                            (sandboxTab === "train" ||
                              mode === "sim" ||
                              mode === "world")
                          ? (
                            <div className="app loading">
                              <p>Loading physics…</p>
                            </div>
                          )
                          : (
                          <>
                            {viewport}
                            {showTutorialHelp && tutorialHelpKey && (
                              <TutorialHelpPanel
                                helpKey={tutorialHelpKey}
                                onReturn={returnToTutorialFromHelp}
                                onExit={exitTutorialHelp}
                              />
                            )}
                          </>
                        )
                }
                dock={
                  showFullBleedRoom
                    ? null
                    : mode === "world"
                      ? worldDock
                      : mode === "edit" ||
                          (editPhysics && sandboxTab === "edit")
                        ? creatureDock
                        : mode === "sim" && skill === "disco" && discoDock
                          ? discoDock
                          : mode === "sim" && !editPhysics
                            ? dockCollapsed
                              ? dockSummary
                              : dockFull
                            : null
                }
                dockLabel={
                  mode === "world"
                    ? "World"
                    : mode === "edit" ||
                        (editPhysics && sandboxTab === "edit")
                      ? "Creature"
                      : skill === "disco"
                        ? "Disco"
                        : "Train"
                }
                dockCollapsed={dockCollapsed}
                onDockCollapsedChange={setDockCollapsed}
                onDockHeightChange={setDockInset}
              />
            </>
          );
        }

        return (
          <>
            {topbar}
            <div className="main">
              {!showFullBleedRoom && (
                <aside className="sidebar">
                  {skillPanel}
                  {worldPanel}
                  {(mode === "edit" || editPhysics) && editPanel}
                  {!editPhysics && mode === "sim" && skill === "disco" && discoDock}
                  {!editPhysics &&
                    mode === "sim" &&
                    skill !== "disco" && (
                    <>
                      {dockFull}
                      {trainPanel}
                    </>
                  )}
                  {mode === "world" && worldDock}
                  {(mode === "edit" ||
                    (editPhysics && sandboxTab === "edit")) &&
                    creatureDock}
                </aside>
              )}
              <div
                className={
                  showFullBleedRoom ? "viewport viewport-fullbleed" : "viewport"
                }
              >
                {showTutorialRoom
                  ? tutorialPanel
                  : showCreaturesRoom
                    ? creaturesPanel
                    : showTrophyRoom
                      ? trophyRoom
                      : !ready &&
                          (sandboxTab === "train" ||
                            mode === "sim" ||
                            mode === "world")
                        ? (
                          <div className="app loading">
                            <p>Loading physics…</p>
                          </div>
                        )
                        : (
                        <>
                          {viewport}
                          {showTutorialHelp && tutorialHelpKey && (
                            <TutorialHelpPanel
                              helpKey={tutorialHelpKey}
                              onReturn={returnToTutorialFromHelp}
                              onExit={exitTutorialHelp}
                            />
                          )}
                        </>
                      )}
              </div>
            </div>
          </>
        );
      })()}

      {isFeatureEnabled("jsonImportExport") && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const text = await file.text();
              let kind: string | undefined;
              try {
                kind = (JSON.parse(text) as { kind?: string }).kind;
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err));
                return;
              }
              // Trained models (CustomT.json etc.) — body + brain + goal.
              if (kind === "freshstart-model") {
                const result = importModelJson(text);
                if (!result.ok) {
                  setFlashNotice(result.error);
                  return;
                }
                applyImportedModel(result.value, { persistToLibrary: true });
                return;
              }
              const result = importCreatureJson(text);
              if (!result.ok) {
                setFlashNotice(result.error);
                return;
              }
              loadPreset(result.value, "custom");
            }}
          />
          <input
            ref={envFileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const text = await file.text();
              const result = importEnvironmentJson(text);
              if (!result.ok) {
                setFlashNotice(result.error);
                return;
              }
              commitEnv(result.value);
            }}
          />
        </>
      )}

      {isFeatureEnabled("creatureSharing") && (
        <ShareDialog
          open={shareDialogOpen}
          phase={shareDialogPhase}
          url={shareDialogUrl}
          listed={shareDialogListed}
          error={shareDialogError}
          onConfirm={(opts) => void confirmShareElite(opts)}
          onClose={() => {
            if (shareBusy || shareDialogPhase === "busy") return;
            setShareDialogOpen(false);
            setShareDialogError(null);
            setShareDialogPhase("confirm");
          }}
        />
      )}

      {flashNotice && (
        <div className="flash-notice" role="status">
          <p>{flashNotice}</p>
          <button type="button" onClick={() => setFlashNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      {isFeatureEnabled("secretGoals") && (
        <SecretGoalRevealOverlay
          discovery={secretRevealQueue[0] ?? null}
          onDismiss={dismissSecretReveal}
        />
      )}
    </div>
    </HoverHelpProvider>
  );
}
