import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ELITE_COUNT,
  LIVE_BATCH_SIZE,
  LIVE_MAX_GENERATIONS,
  LIVE_POPULATION_SIZE,
  MUTATION_RESET_RATE,
  MUTATION_SIGMA,
  TOURNAMENT_SIZE,
  EPISODE_SECONDS,
  BRAIN_HZ,
  OBS_COUNT,
  RAYCAST_OBS_COUNT,
  type BrainHz,
} from "./brain/constants";
import {
  boxingEligibility,
  type BoxingDivisionId,
} from "./boxing/divisions";
import {
  DEFAULT_SPARRING_OPPONENT_ID,
  normalizeSparringOpponentId,
  resolveSparringOpponent,
  type SparringOpponentId,
} from "./boxing/sparringOpponents";
import {
  DEFAULT_BOXING_PRIORITIES,
  type BoxingPriorities,
} from "./boxing/rewards";
import {
  DEFAULT_JOUST_SPARRING_ID,
  normalizeJoustSparringId,
  resolveJoustSparringOpponent,
  type JoustSparringId,
} from "./jousting/sparringOpponents";
import {
  joustingEligibility,
  type JoustingDivisionId,
} from "./jousting/eligibility";
import { raceEligibility, type RaceDivisionId } from "./race/divisions";
import {
  DEFAULT_JOUSTING_PRIORITIES,
  type JoustingPriorities,
} from "./jousting/scorecard";
import {
  DEFAULT_GOAL_PRIORITIES,
  DEFAULT_RUN_STAGES,
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
  resolveCourseCurriculum,
} from "./env/courseCurriculum";
import {
  defaultGaKnobSet,
  loadGaKnobSet,
  saveGaKnobSet,
  applyRecipe,
  type GaKnobSet,
} from "./brain/trainingRecipes";
import {
  collapseMuscleDrivesToChannels,
  designHasActuators,
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
import {
  obsPackFamily,
  type EvolutionProgress,
  type Genome,
  type NetworkShape,
  type TaskId,
} from "./brain/types";
import { adaptEliteToDesign } from "./brain/adaptElite";
import { BOXING_OBS_PACK_VERSION } from "./brain/boxingObs";
import { JOUST_OBS_PACK_VERSION } from "./brain/joustObs";
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
  CLOTH_DEFAULT_FINENESS,
  CLOTH_DEFAULT_STIFFNESS,
  CLOTH_DEFAULT_WEIGHT,
} from "./appearance/clothConstants";
import { removeClothGarment } from "./appearance/clothOps";
import { emptyAppearance } from "./appearance/types";
import { ContextStrip } from "./components/ContextStrip";
import { CourseSidebar } from "./components/CourseSidebar";
import { CreatureBuilderPanel } from "./components/CreatureBuilderPanel";
import {
  CreatureBuilderInspector,
  CreatureBuilderOptions,
  CreatureBuilderToolsExtras,
  type CreatureBuilderInspectProps,
} from "./components/CreatureBuilderInspect";
import { DiscoDock } from "./components/DiscoDock";
import { DiscoSidebar } from "./components/DiscoSidebar";
import { TrainDock } from "./components/TrainDock";
import { TrainSidebar } from "./components/TrainSidebar";
import {
  CreaturesPanel,
  type CreaturesBrowseKey,
} from "./components/CreaturesPanel";
import { type DiscoSlotState } from "./components/DiscoSlotsPanel";
import { CombatDock } from "./components/CombatDock";
import { CombatScoreboard } from "./components/CombatScoreboard";
import { WorkspaceFiles } from "./components/WorkspaceFiles";
import { WorkspaceStatus } from "./components/WorkspaceStatus";
import type { BrainStatus } from "./components/WorkspaceStatus";
import { headToHeadEntriesFromModels } from "./combat/headToHeadEntries";
import {
  resolveBoxingCorner,
  resolveJoustCorner,
} from "./combat/resolveCorners";
import {
  type CombatCornerValue,
  type CombatMode,
} from "./combat/types";
import {
  COMBAT_ROUNDS_DEFAULT,
  COMBAT_SLOMO_TIME_SCALE,
  clampCombatRounds,
  clampRoundSeconds,
  defaultRoundSeconds,
} from "./combat/format";
import {
  bodyFileName,
  displayNameForTrained,
  goalTitleForTask,
  trainedFileName,
  unnamedBodyReason,
} from "./library/fileVocabulary";
import {
  bodyFitsSkill,
  bodyIsUnsaved,
  combatCornerLoadsIntoScene,
  explicitLoadDenialReason,
  trainSceneBody,
  unsavedLeaveNotice,
} from "./library/tabScenePolicy";
import {
  SandboxShell,
  SandboxTabRail,
  type SandboxTab,
  type SandboxTabId,
} from "./components/SandboxShell";
import { SecretGoalRevealOverlay } from "./components/SecretGoalRevealOverlay";
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
} from "./editor/selectionOps";
import { createCamera } from "./sim/Camera";
import { isFeatureEnabled } from "./port/featureFlags";
import { discoFloorEnv } from "./env/discoEnv";
import { boxingRingEnv, isBoxingRingEnv } from "./env/boxingRingEnv";
import { joustLaneEnv, isJoustLaneEnv } from "./env/joustLaneEnv";
import {
  DEFAULT_DISCO_BALL_X,
  DEFAULT_DISCO_BALL_Y,
  DEFAULT_DISCO_PUPPET_MODE,
  FOOT_MASS_DEFAULT,
  JOUST_MAX_SECONDS,
  WHEEL_MASS_DEFAULT,
  WHEEL_RADIUS_DEFAULT,
  ANTI_SCOOT,
  ANTI_SCOOT_MAX,
  clampFootMass,
  clampWheelMass,
  clampWheelRadius,
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
  bodyFpFromModel,
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
  loadNamedRecipes,
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
  findSavedModelByName,
  loadSavedModels,
  modelToSeed,
  renameSavedModel,
  replaceSavedModel,
  saveModel,
  shapesCompatible,
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
  type SkillId,
} from "./skills/skills";
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
    roundIndex?: number;
    roundCount?: number;
  } | null>(null);
  const [h2hResult, setH2hResult] = useState<HeadToHeadResult | null>(null);
  const [boxingRunning, setBoxingRunning] = useState(false);
  const [boxingProgress, setBoxingProgress] = useState<{
    episodeT: number;
    episodeDuration: number;
    points: [number, number];
    countRemaining?: [number, number];
    down?: [boolean, boolean];
    reason?: string | null;
    roundIndex?: number;
    roundCount?: number;
  } | null>(null);
  const [boxingResult, setBoxingResult] = useState<BoxingMatchResult | null>(
    null,
  );
  const [boxingDivisionId, setBoxingDivisionId] =
    useState<BoxingDivisionId>("upright");
  const [boxingSparringId, setBoxingSparringId] =
    useState<SparringOpponentId>(DEFAULT_SPARRING_OPPONENT_ID);
  /** Metadata for the in-sim Boxing live evolve session (best-ever ledger on finish). */
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
    roundIndex?: number;
    roundCount?: number;
  } | null>(null);
  const [joustingResult, setJoustingResult] = useState<JoustMatchResult | null>(
    null,
  );
  const [joustingSparringId, setJoustingSparringId] =
    useState<JoustSparringId>(DEFAULT_JOUST_SPARRING_ID);
  const [joustingDivisionId, setJoustingDivisionId] =
    useState<JoustingDivisionId>("mounted");
  const [raceDivisionId, setRaceDivisionId] =
    useState<RaceDivisionId>("upright");
  const joustingLiveMetaRef = useRef<{
    design: CreatureDesign;
  } | null>(null);
  const [combatMode, setCombatMode] = useState<CombatMode>("boxing");
  const [combatRounds, setCombatRounds] = useState(COMBAT_ROUNDS_DEFAULT);
  const [combatRoundSeconds, setCombatRoundSeconds] = useState(() =>
    defaultRoundSeconds("boxing"),
  );
  const [combatSloMo, setCombatSloMo] = useState(false);
  const [combatCornerA, setCombatCornerA] = useState<CombatCornerValue>({
    kind: "workspace",
  });
  const [combatCornerB, setCombatCornerB] = useState<CombatCornerValue>({
    kind: "house",
    id: DEFAULT_SPARRING_OPPONENT_ID,
  });
  const [combatRaceGoalId, setCombatRaceGoalId] = useState<GoalId>("sprint");
  const [combatUseCurrentEnv, setCombatUseCurrentEnv] = useState(true);
  const [savedBrainLabel, setSavedBrainLabel] = useState<string | null>(null);
  const importIntentRef = useRef<"body" | "trained">("trained");
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
  const [sandboxTab, setSandboxTabRaw] = useState<SandboxTabId>("tutorial");
  const lastSandboxModeRef = useRef<SandboxTabId>("edit");
  const setSandboxTab = (tab: SandboxTabId) => {
    if (tab === "edit" || tab === "train" || tab === "world" || tab === "h2h") {
      lastSandboxModeRef.current = tab;
    }
    setSandboxTabRaw(tab);
  };
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
  const savedBrainLabelRef = useRef(savedBrainLabel);
  const designBaselineRef = useRef(
    `${LANDING_PRESET.name}\n${bodyFingerprint(LANDING_PRESET)}`,
  );
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
  savedBrainLabelRef.current = savedBrainLabel;
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
  const persistLibraryModel = useCallback(
    (opts: Parameters<typeof saveModel>[0]): boolean => {
      const existing = findSavedModelByName(opts.name);
      if (existing) {
        const ok = window.confirm(
          `A trained creature named "${existing.name}" already exists. Overwrite it?\n\nCancel keeps the old one. Rename it in Library first if you want to keep both.`,
        );
        if (!ok) return false;
        if (!replaceSavedModel(existing.id, opts)) saveModel(opts);
      } else {
        saveModel(opts);
      }
      refreshModels();
      return true;
    },
    [refreshModels],
  );
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
    const combatMatchRunning =
      boxingRunning || joustingRunning || h2hRunning;
    const scale = evolveProgress.running
      ? trainSpeed
      : combatMatchRunning && combatSloMo
        ? COMBAT_SLOMO_TIME_SCALE
        : observeSpeed;
    simulation.timeScale = scale;
  }, [
    boxingRunning,
    combatSloMo,
    evolveProgress.running,
    h2hRunning,
    joustingRunning,
    observeSpeed,
    trainSpeed,
    simulation,
  ]);
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
  const wheelRadius = clampWheelRadius(
    design.wheelRadius ?? WHEEL_RADIUS_DEFAULT,
  );
  const markedFootCount = design.joints.filter((j) => j.isFoot).length;
  const markedWheelCount = design.joints.filter((j) => j.isWheel).length;

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
      bestGenomeRef.current = promoted;
      setEvolveProgress((prev) => ({
        ...prev,
        running: false,
        bestFitness: promoted.genome.fitness,
        status: "Paused — elite saved",
      }));
      return promoted;
    }
    return bestGenomeRef.current;
  }, [simulation]);

  const returnToEdit = useCallback(() => {
    const elite = captureLiveElite();
    simulation.clearScene();
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
    }
    setLiveBrain(null);
    setEditPhysics(false);
    simulation.running = false;
    setMode("edit");
    setSandboxTab("edit");
    setDockInset(0);
  }, [captureLiveElite, simulation]);
  /** World tab — env studio preview on SimCanvas (no train dock). */
  const enterWorld = useCallback(() => {
    const elite = captureLiveElite();
    if (!elite) {
      setEvolveProgress(idleProgress());
    } else {
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
  }, [captureLiveElite, simulation]);

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
    persistLibraryModel({
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
  }, [
    activeDiscoDesign,
    danceGenome,
    danceStage,
    discoPlaylist,
    persistLibraryModel,
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
    setSandboxTab("train");
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

  useEffect(() => {
    setJoustingSparringId((id) =>
      normalizeJoustSparringId(joustingDivisionId, id),
    );
  }, [joustingDivisionId]);

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
    const scene = cloneDesign(
      trainSceneBody(
        designRef.current,
        "boxing",
        boxingDivisionId,
        joustingDivisionId,
      ),
    );
    if (scene.joints.length > 0) {
      simulation.loadDesign(scene);
      simulation.setTask("boxing");
    } else {
      simulation.clearScene();
    }
    setDriveMode("idle");
    driveModeRef.current = "idle";
    simulation.driveMode = "idle";
    setMode("sim");
  }, [
    applyBoxingEnvironment,
    boxingDivisionId,
    captureLiveElite,
    joustingDivisionId,
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
    const scene = cloneDesign(
      trainSceneBody(
        designRef.current,
        "jousting",
        boxingDivisionId,
        joustingDivisionId,
      ),
    );
    if (scene.joints.length > 0) {
      simulation.loadDesign(scene);
      simulation.setTask("jousting");
    } else {
      simulation.clearScene();
    }
    setDriveMode("idle");
    driveModeRef.current = "idle";
    simulation.driveMode = "idle";
    setMode("sim");
  }, [
    applyJoustingEnvironment,
    boxingDivisionId,
    captureLiveElite,
    joustingDivisionId,
    simulation,
  ]);

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
    [raycastObservationsOn, simulation],
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

  const applyWheelRadius = useCallback(
    (radius: number) => {
      const r = clampWheelRadius(radius);
      commitDesign({ ...designRef.current, wheelRadius: r });
      simulation.setWheelRadius(r);
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
  }, [raycastObservationsOn, simulation]);
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
    simulation.setPhaseClockHz(gaKnobs.phaseClockHz);
  }, [gaKnobs.phaseClockHz, simulation]);
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

  const markDesignBaseline = (body: CreatureDesign) => {
    designBaselineRef.current = `${body.name}\n${bodyFingerprint(body)}`;
  };

  const denyLoad = (message: string) => {
    setFlashNotice(message);
  };

  const flagUnsavedOnLeave = (fromTab: SandboxTabId) => {
    const body = designRef.current;
    const notice = unsavedLeaveNotice({
      fromTab,
      bodyUnsaved: bodyIsUnsaved(
        body,
        designBaselineRef.current,
        `${body.name}\n${bodyFingerprint(body)}`,
      ),
      brainUnsaved: !!bestGenomeRef.current && !savedBrainLabelRef.current,
    });
    if (notice) setFlashNotice(notice);
  };

  const combatWorkspaceElite = () =>
    bestGenome
      ? {
          design,
          shape: bestGenome.shape,
          weights: bestGenome.genome.weights,
        }
      : null;

  const resolveCombatCornerFighter = (
    corner: CombatCornerValue,
    mode: CombatMode,
  ) => {
    const pool = designCandidatePool(packages, BUNDLED_MODELS, design);
    const workspace = combatWorkspaceElite();
    if (mode === "boxing") {
      return resolveBoxingCorner(corner, {
        workspace,
        models: savedModels,
        pool,
        divisionId: boxingDivisionId,
        seed: runSeed,
      });
    }
    if (mode === "joust") {
      return resolveJoustCorner(corner, {
        workspace,
        models: savedModels,
        pool,
        traineeDesign: design,
        seed: runSeed,
        divisionId: joustingDivisionId,
      });
    }
    if (corner.kind === "workspace") {
      if (!workspace) return null;
      return {
        design: cloneDesign(workspace.design),
        shape: workspace.shape,
        weights: workspace.weights,
      };
    }
    if (corner.kind === "saved") {
      const model = savedModels.find((m) => m.id === corner.modelId);
      if (!model) return null;
      const body = resolveDesignForModel(model, pool);
      if (!body) return null;
      const seed = modelToSeed(model);
      return {
        design: cloneDesign(body),
        shape: seed.shape,
        weights: seed.weights,
      };
    }
    return null;
  };

  const combatCornerDenial = (
    corner: CombatCornerValue,
    mode: CombatMode,
  ): string | null => {
    const fighter = resolveCombatCornerFighter(corner, mode);
    if (!fighter) {
      if (corner.kind === "workspace") {
        return "Train a brain for this workspace before loading it into Combat.";
      }
      return "Could not load that Combat selection.";
    }
    if (mode === "boxing") {
      const eligibility = boxingEligibility(fighter.design, boxingDivisionId);
      if (!eligibility.eligible) {
        return `${fighter.design.name} is not valid for ${boxingDivisionId}: ${eligibility.reasons.join(" ")}`;
      }
    } else if (mode === "joust") {
      const eligibility = joustingEligibility(fighter.design, joustingDivisionId);
      if (!eligibility.eligible) {
        return `${fighter.design.name} is not valid for ${joustingDivisionId}: ${eligibility.reasons.join(" ")}`;
      }
    } else {
      const eligibility = raceEligibility(fighter.design, raceDivisionId);
      if (!eligibility.eligible) {
        return `${fighter.design.name} is not valid for ${raceDivisionId} racing: ${eligibility.reasons.join(" ")}`;
      }
    }
    return null;
  };

  const previewCombatCorner = (corner: CombatCornerValue, mode: CombatMode) => {
    const workspaceReady = !!bestGenome && design.joints.length > 0;
    if (!combatCornerLoadsIntoScene(corner, workspaceReady)) {
      simulation.clearScene();
      return;
    }
    const fighter = resolveCombatCornerFighter(corner, mode);
    if (!fighter) {
      simulation.clearScene();
      return;
    }
    simulation.loadDesign(fighter.design);
    setDriveMode("idle");
    driveModeRef.current = "idle";
    simulation.driveMode = "idle";
  };

  const enterCombatArena = (
    mode: CombatMode,
    previewCorner: CombatCornerValue = combatCornerA,
  ) => {
    captureLiveElite();
    setEditPhysics(false);
    setH2hRunning(false);
    setH2hProgress(null);
    setBoxingRunning(false);
    setBoxingProgress(null);
    setJoustingRunning(false);
    setJoustingProgress(null);
    if (mode === "boxing") {
      if (skill === "disco") leaveDiscoSkill(false);
      if (skill === "jousting") leaveJoustingSkill(false);
      setSkill("boxing");
      saveActiveSkill("boxing");
      const next = defaultGoalForSkill("boxing");
      setGoalId(next.id);
      saveActiveGoalId(next.id);
      applyBoxingEnvironment();
      simulation.setTask("boxing");
    } else if (mode === "joust") {
      if (skill === "disco") leaveDiscoSkill(false);
      if (skill === "boxing") leaveBoxingSkill(false);
      setSkill("jousting");
      saveActiveSkill("jousting");
      const next = defaultGoalForSkill("jousting");
      setGoalId(next.id);
      saveActiveGoalId(next.id);
      applyJoustingEnvironment();
      simulation.setTask("jousting");
    } else {
      if (skill === "disco") leaveDiscoSkill(true);
      if (skill === "boxing") leaveBoxingSkill(true);
      if (skill === "jousting") leaveJoustingSkill(true);
      simulation.setTask(getGoal(combatRaceGoalId).task);
    }
    simulation.clearScene();
    setDriveMode("idle");
    driveModeRef.current = "idle";
    simulation.driveMode = "idle";
    setMode("sim");
    setSandboxTab("h2h");
    if (previewCorner.kind === "workspace") return;
    const workspaceReady = !!bestGenome && design.joints.length > 0;
    if (combatCornerLoadsIntoScene(previewCorner, workspaceReady)) {
      const denied = combatCornerDenial(previewCorner, mode);
      if (!denied) previewCombatCorner(previewCorner, mode);
    }
  };

  const onCombatCornerAChange = (value: CombatCornerValue) => {
    const denied = combatCornerDenial(value, combatMode);
    if (denied) {
      denyLoad(denied);
      return;
    }
    setCombatCornerA(value);
    if (sandboxTabRef.current === "h2h") {
      previewCombatCorner(value, combatMode);
    }
  };

  const onCombatCornerBChange = (value: CombatCornerValue) => {
    const denied = combatCornerDenial(value, combatMode);
    if (denied) {
      denyLoad(denied);
      return;
    }
    setCombatCornerB(value);
  };

  const maybeTransferWorkspaceElite = (fromTask: TaskId, toTask: TaskId) => {
    if (!isFeatureEnabled("crossSkillTransfer")) return;
    if (fromTask === toTask) return;
    const elite = bestGenomeRef.current;
    if (!elite) return;
    const destFamily = obsPackFamily(toTask);
    if (destFamily === "boxing" || destFamily === "jousting") {
      const destSkill = destFamily === "boxing" ? "boxing" : "jousting";
      if (
        !bodyFitsSkill(
          designRef.current,
          destSkill,
          boxingDivisionId,
          joustingDivisionId,
        )
      ) {
        return;
      }
    }
    const adapted = adaptEliteToDesign(elite, designRef.current, {
      task: toTask,
      sourceTask: fromTask,
      raycast:
        destFamily === "loco" &&
        isFeatureEnabled("raycastObservations") &&
        raycastObservationsOn,
    });
    if (adapted && adapted !== elite) {
      setBestGenome(adapted);
      bestGenomeRef.current = adapted;
      setSavedBrainLabel(null);
      if (toTask === "dance") {
        setDanceGenome({
          shape: adapted.shape,
          genome: adapted.genome,
        });
      }
      setGaKnobs((k) => applyRecipe("fine_tune", k));
      const destLabel = goalTitleForTask(toTask);
      setEvolveProgress((prev) => ({
        ...prev,
        running: false,
        status:
          toTask === "dance"
            ? `${goalTitleForTask(fromTask)} brain adapted for ${destLabel} — Refine in the Disco dock`
            : `${goalTitleForTask(fromTask)} brain adapted for ${destLabel} — Keep training to refine`,
      }));
      return;
    }
    if (!adapted && obsPackFamily(fromTask) !== destFamily) {
      setFlashNotice(
        `That ${goalTitleForTask(fromTask)} brain cannot seed ${goalTitleForTask(toTask)}. Save it, then Evolve fresh.`,
      );
    }
  };

  const selectSkill = (id: SkillId) => {
    if (id === "disco" && !isFeatureEnabled("discoMode")) return;
    if (id === "boxing" && !isFeatureEnabled("boxingMode")) return;
    if (id === "jousting" && !isFeatureEnabled("joustingMode")) return;
    const prev = skill;
    const fromTask = activeTaskRef.current;
    const tab = sandboxTabRef.current;
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
      maybeTransferWorkspaceElite(fromTask, "dance");
      return;
    }
    if (id === "boxing") {
      const next = defaultGoalForSkill(id);
      setGoalId(next.id);
      saveActiveGoalId(next.id);
      if (tab === "h2h") {
        setCombatMode("boxing");
        enterCombatArena("boxing");
        maybeTransferWorkspaceElite(fromTask, "boxing");
        return;
      }
      if (tab === "train") {
        enterBoxingSkill();
        maybeTransferWorkspaceElite(fromTask, "boxing");
        return;
      }
      applyBoxingEnvironment();
      simulation.setTask(next.task);
      maybeTransferWorkspaceElite(fromTask, "boxing");
      return;
    }
    if (id === "jousting") {
      const next = defaultGoalForSkill(id);
      setGoalId(next.id);
      saveActiveGoalId(next.id);
      if (tab === "h2h") {
        setCombatMode("joust");
        enterCombatArena("joust");
        maybeTransferWorkspaceElite(fromTask, "jousting");
        return;
      }
      if (tab === "train") {
        enterJoustingSkill();
        maybeTransferWorkspaceElite(fromTask, "jousting");
        return;
      }
      applyJoustingEnvironment();
      simulation.setTask(next.task);
      maybeTransferWorkspaceElite(fromTask, "jousting");
      return;
    }
    const next = defaultGoalForSkill(id);
    setGoalId(next.id);
    saveActiveGoalId(next.id);
    simulation.setTask(next.task);
    captureLiveElite();
    maybeTransferWorkspaceElite(fromTask, next.task);
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
      denyLoad(err instanceof Error ? err.message : String(err));
      return false;
    }
  };

  const startEditPhysics = () => {
    if (design.joints.length === 0) {
      denyLoad("Add at least one joint before enabling physics.");
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
    if (tab !== sandboxTab) flagUnsavedOnLeave(sandboxTab);
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
      setEditPhysics(false);
      if (!simulation.world) {
        setSandboxTab("train");
        return;
      }
      if (simulation.isEvolving) {
        setSandboxTab("train");
        return;
      }
      if (skill === "disco" && isFeatureEnabled("discoMode")) {
        enterDiscoSkill();
        setSandboxTab("train");
        return;
      }
      if (skill === "boxing" && isFeatureEnabled("boxingMode")) {
        enterBoxingSkill();
        setSandboxTab("train");
        return;
      }
      if (skill === "jousting" && isFeatureEnabled("joustingMode")) {
        enterJoustingSkill();
        setSandboxTab("train");
        return;
      }
      if (design.joints.length === 0) {
        const scene = cloneDesign(
          trainSceneBody(
            design,
            skill,
            boxingDivisionId,
            joustingDivisionId,
          ),
        );
        if (scene.joints.length > 0) {
          simulation.loadDesign(scene);
          simulation.setTask(getGoal(goalId).task);
          setDriveMode("idle");
          driveModeRef.current = "idle";
          simulation.driveMode = "idle";
          setMode("sim");
          setSandboxTab("train");
          return;
        }
        returnToEdit();
        return;
      }
      startSim();
      return;
    }
    if (tab === "h2h") {
      if (skill === "disco") leaveDiscoSkill(true);
      enterCombatArena(combatMode);
      return;
    }
    if (tab === "skill") {
      // Skill is context on the strip, not a destination.
      if (skill === "disco" && isFeatureEnabled("discoMode")) {
        enterDiscoSkill();
        return;
      }
      if (skill === "boxing" && isFeatureEnabled("boxingMode")) {
        enterBoxingSkill();
        setSandboxTab("train");
        return;
      }
      if (skill === "jousting" && isFeatureEnabled("joustingMode")) {
        enterJoustingSkill();
        setSandboxTab("train");
        return;
      }
      returnToEdit();
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
    const tab = sandboxTabRef.current;
    if (tab === "train" && (skill === "boxing" || skill === "jousting")) {
      const denied = explicitLoadDenialReason(
        next,
        skill,
        boxingDivisionId,
        joustingDivisionId,
      );
      if (denied) {
        denyLoad(denied);
        return;
      }
    }
    commitDesign(next);
    markDesignBaseline(next);
    setSaveName(next.name || "Custom");
    if (creatureKey !== undefined) setSelectedCreatureKey(creatureKey);
    if (tab === "h2h") return;
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
    if (m.task === "boxing" && (!m.boxingMeta || !isFeatureEnabled("boxingMode"))) {
      denyLoad("Imported Boxing model is incompatible or Boxing is disabled.");
      return;
    }
    if (m.task === "jousting" && (!m.joustingMeta || !isFeatureEnabled("joustingMode"))) {
      denyLoad("Imported Jousting model is incompatible or Jousting is disabled.");
      return;
    }
    loadPreset(m.design, "custom");
    setGoalId(m.task as GoalId);
    saveActiveGoalId(m.task as GoalId);
    simulation.setTask(m.task);
    setBestGenome({
      shape: m.shape,
      genome: { weights: m.weights, fitness: m.fitness },
    });
    if (opts.persistToLibrary && isFeatureEnabled("savedModels")) {
      persistLibraryModel({
        name: m.name,
        task: m.task,
        shape: m.shape,
        genome: { weights: m.weights, fitness: m.fitness },
        design: m.design,
        ...(m.danceMeta ? { danceMeta: m.danceMeta } : {}),
        ...(m.boxingMeta ? { boxingMeta: m.boxingMeta } : {}),
        ...(m.joustingMeta ? { joustingMeta: m.joustingMeta } : {}),
      });
    }
    setSavedBrainLabel(m.name);
    if (m.task === "boxing") {
      if (skill === "disco") leaveDiscoSkill(false);
      setSkill("boxing");
      saveActiveSkill("boxing");
      applyBoxingEnvironment();
      if (sandboxTabRef.current !== "h2h") {
        simulation.loadDesign(m.design);
        simulation.setTask("boxing");
        setMode("sim");
      }
      return;
    }
    if (m.task === "jousting") {
      if (skill === "disco") leaveDiscoSkill(false);
      setSkill("jousting");
      saveActiveSkill("jousting");
      applyJoustingEnvironment();
      if (sandboxTabRef.current !== "h2h") {
        simulation.loadDesign(m.design);
        simulation.setTask("jousting");
        setMode("sim");
      }
      return;
    }
    if (mode === "sim" && !simulation.isEvolving && sandboxTabRef.current !== "h2h") {
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
    const unnamedShare = unnamedBodyReason(design.name);
    if (unnamedShare) {
      setShareDialogPhase("error");
      setShareDialogError(unnamedShare);
      return;
    }
    const name = displayNameForTrained(design.name, activeTask);
    const boxingMeta =
      activeTask === "boxing"
        ? ({
            divisionId: boxingDivisionId,
            ruleVersion: 1,
            obsPackVersion: BOXING_OBS_PACK_VERSION,
            brainHz: 30,
          } as const)
        : undefined;
    const joustingMeta =
      activeTask === "jousting"
        ? ({
            ruleVersion: 1,
            obsPackVersion: JOUST_OBS_PACK_VERSION,
            brainHz: 30,
            divisionId: joustingDivisionId,
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
      if (preset) {
        loadPreset(preset, key);
        setBestGenome(null);
        setSavedBrainLabel(null);
      }
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
      setBestGenome(null);
      setSavedBrainLabel(null);
    }
  };

  const applyTrainBrain = (id: string) => {
    if (id === "__session__") return;
    if (id === "__none__") {
      setBestGenome(null);
      setSavedBrainLabel(null);
      simulation.clearBrain();
      setDriveMode("idle");
      driveModeRef.current = "idle";
      simulation.driveMode = "idle";
      return;
    }
    const model = savedModels.find((m) => m.id === id);
    if (!model) return;
    if (
      model.task === "dance" ||
      model.task === "boxing" ||
      model.task === "jousting"
    ) {
      continueFromModel(model);
      return;
    }
    const body = designRef.current;
    if (bodyFpFromModel(model) !== bodyFingerprint(body)) {
      denyLoad("That brain is not for this body.");
      return;
    }
    const seed = modelToSeed(model);
    const expected = shapeForDesign(body, {
      raycast:
        isFeatureEnabled("raycastObservations") && raycastObservationsOn,
    });
    if (!shapesCompatible(model.shape, expected)) {
      denyLoad(
        "Saved brain does not fit that body — use Fit from the Train dock, or pick a matching trained creature.",
      );
      return;
    }
    if (simulation.isEvolving) simulation.abortLiveEvolve();
    setGoalId(model.task as GoalId);
    saveActiveGoalId(model.task as GoalId);
    setBestGenome({
      shape: seed.shape,
      genome: {
        weights: seed.weights,
        fitness: model.fitness,
        morph: seed.morph,
      },
    });
    setSavedBrainLabel(model.name);
    if (simulation.world) {
      if (!simulation.creature && body.joints.length > 0) {
        simulation.loadDesign(body);
      }
      simulation.setTask(model.task);
      simulation.setBrain(seed.shape, seed.weights);
      setDriveMode("brain");
      driveModeRef.current = "brain";
      simulation.driveMode = "brain";
      setMode("sim");
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
    const empty =
      design.joints.length === 0 &&
      design.bones.length === 0 &&
      design.muscles.length === 0;
    if (!empty) {
      const ok = window.confirm(
        "Clear this body? Joints, bones, and muscles in the workspace will be removed. Library saves are kept.",
      );
      if (!ok) return;
    }
    commitDesign({
      name: "Custom",
      joints: [],
      bones: [],
      muscles: [],
      appearance: emptyAppearance(),
    });
    markDesignBaseline({
      name: "Custom",
      joints: [],
      bones: [],
      muscles: [],
    });
    setSaveName("Custom");
    setSelectedCreatureKey("custom");
    setBestGenome(null);
    setSavedBrainLabel(null);
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
    if (gaKnobs.startFrom === "saved" && gaKnobs.savedModelId) {
      const model = savedModels.find((m) => m.id === gaKnobs.savedModelId);
      if (!model || model.task === "dance") return undefined;
      const expected =
        activeTask === "boxing"
          ? shapeForBoxingDesign(design)
          : activeTask === "jousting"
            ? shapeForJoustingDesign(design)
            : shapeForDesign(design, shapeOpts);
      if (shapesCompatible(model.shape, expected)) {
        return modelToSeed(model);
      }
      if (isFeatureEnabled("crossSkillTransfer")) {
        const seed = modelToSeed(model);
        const adapted = adaptEliteToDesign(
          {
            shape: seed.shape,
            genome: {
              weights: seed.weights,
              fitness: model.fitness,
              morph: seed.morph,
            },
          },
          design,
          {
            task: activeTask,
            sourceTask: model.task,
            raycast: shapeOpts.raycast,
          },
        );
        if (adapted) {
          return {
            shape: adapted.shape,
            weights: adapted.genome.weights,
            morph: adapted.genome.morph,
          };
        }
      }
      setFlashNotice(
        "Saved brain shape/task mismatch — pick a matching creature and goal first.",
      );
      return undefined;
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
        setFlashNotice(
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
              setSavedBrainLabel(null);
              if (meta && isFeatureEnabled("bestEverLedger")) {
                considerBestEver("boxing", genome.fitness, meta.design);
                setBestEverList(loadBestEver());
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
      const eligibility = joustingEligibility(trainingDesign, joustingDivisionId);
      if (!eligibility.eligible) {
        setFlashNotice(`Not eligible for ${joustingDivisionId}: ${eligibility.reasons.join(" ")}`);
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
        joustingDivisionId,
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
          divisionId: joustingDivisionId,
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
              setSavedBrainLabel(null);
              if (meta && isFeatureEnabled("bestEverLedger")) {
                considerBestEver("jousting", genome.fitness, meta.design);
                setBestEverList(loadBestEver());
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
      joustingDivisionId,
      joustingPriorities,
      joustingSparringId,
      observeSpeed,
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
      const resolved = resolveEvolveSeed(seedFrom);
      if (
        !seedFrom &&
        isFeatureEnabled("trainStartFrom") &&
        gaKnobs.startFrom === "saved" &&
        gaKnobs.savedModelId &&
        !resolved
      ) {
        return;
      }
      startBoxingLiveEvolve(
        resolved
          ? { shape: resolved.shape, weights: resolved.weights }
          : undefined,
      );
      return;
    }
    if (activeTask === "jousting") {
      if (!isFeatureEnabled("joustingMode")) {
        setError("Jousting skill is disabled.");
        return;
      }
      const resolved = resolveEvolveSeed(seedFrom);
      if (
        !seedFrom &&
        isFeatureEnabled("trainStartFrom") &&
        gaKnobs.startFrom === "saved" &&
        gaKnobs.savedModelId &&
        !resolved
      ) {
        return;
      }
      startJoustingLiveEvolve(
        resolved
          ? { shape: resolved.shape, weights: resolved.weights }
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
        gaKnobs.startFrom === "saved" &&
        gaKnobs.savedModelId &&
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
        status: seedFrom
          ? `Keep training (${activeTask})…`
          : resolvedSeed
            ? `Evolve from saved (${activeTask})…`
            : `Evolve fresh (${activeTask})…`,
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
          setSavedBrainLabel(null);
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
      const locoSized =
        bestGenome.shape.inputCount === OBS_COUNT ||
        bestGenome.shape.inputCount === RAYCAST_OBS_COUNT;
      const adapted = adaptEliteToDesign(bestGenome, design, {
        task: "boxing",
        sourceTask: locoSized ? "run" : "boxing",
        raycast: false,
      });
      if (!adapted) {
        setError(
          "Brain layout mismatch — the creature changed too much to continue.",
        );
        return;
      }
      if (adapted !== bestGenome) setBestGenome(adapted);
      startBoxingLiveEvolve({
        shape: adapted.shape,
        weights: adapted.genome.weights,
      });
      return;
    }
    if (activeTask === "jousting") {
      const locoSized =
        bestGenome.shape.inputCount === OBS_COUNT ||
        bestGenome.shape.inputCount === RAYCAST_OBS_COUNT;
      const adapted = adaptEliteToDesign(bestGenome, design, {
        task: "jousting",
        sourceTask: locoSized ? "run" : "jousting",
        raycast: false,
      });
      if (!adapted) {
        setError(
          "Brain layout mismatch — the creature changed too much to continue.",
        );
        return;
      }
      if (adapted !== bestGenome) setBestGenome(adapted);
      startJoustingLiveEvolve({
        shape: adapted.shape,
        weights: adapted.genome.weights,
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
    const pool = designCandidatePool(packages, BUNDLED_MODELS, design);
    const embedded =
      model.task === "boxing"
        ? model.boxingDesign
        : model.task === "jousting"
          ? model.joustingDesign
          : null;
    const body = embedded ?? resolveDesignForModel(model, pool);
    if (!body) {
      denyLoad("Could not find the body bound to that trained creature.");
      return;
    }
    const seed = modelToSeed(model);
    if (model.task === "boxing") {
      if (
        !model.boxingMeta ||
        model.boxingMeta.ruleVersion !== 1 ||
        model.boxingMeta.obsPackVersion !== BOXING_OBS_PACK_VERSION ||
        model.boxingMeta.brainHz !== 30
      ) {
        denyLoad("Saved Boxing model uses incompatible division or brain metadata.");
        return;
      }
      if (!shapesCompatible(seed.shape, shapeForBoxingDesign(body))) {
        denyLoad("Saved Boxing model shape does not match its fighter body.");
        return;
      }
      if (skill === "disco") leaveDiscoSkill(false);
      if (simulation.isEvolving) simulation.abortLiveEvolve();
      simulation.abortBoxingMatch();
      loadPreset(body, "custom");
      setSkill("boxing");
      saveActiveSkill("boxing");
      setGoalId("boxing");
      saveActiveGoalId("boxing");
      setBoxingDivisionId(model.boxingMeta.divisionId);
      setBestGenome({
        shape: seed.shape,
        genome: { weights: seed.weights, fitness: model.fitness },
      });
      setSavedBrainLabel(model.name);
      simulation.loadDesign(body);
      simulation.setTask("boxing");
      simulation.setBrain(seed.shape, seed.weights);
      setMode("sim");
      return;
    }
    if (model.task === "jousting") {
      if (
        !model.joustingMeta ||
        model.joustingMeta.ruleVersion !== 1 ||
        model.joustingMeta.obsPackVersion !== JOUST_OBS_PACK_VERSION ||
        model.joustingMeta.brainHz !== 30
      ) {
        denyLoad("Saved Jousting model uses incompatible brain metadata.");
        return;
      }
      if (!shapesCompatible(seed.shape, shapeForJoustingDesign(body))) {
        denyLoad("Saved Jousting model shape does not match its body.");
        return;
      }
      if (skill === "disco") leaveDiscoSkill(false);
      if (simulation.isEvolving) simulation.abortLiveEvolve();
      simulation.abortJoustMatch();
      loadPreset(body, "custom");
      setSkill("jousting");
      saveActiveSkill("jousting");
      setGoalId("jousting");
      saveActiveGoalId("jousting");
      if (model.joustingMeta.divisionId) {
        setJoustingDivisionId(model.joustingMeta.divisionId);
      }
      setBestGenome({
        shape: seed.shape,
        genome: { weights: seed.weights, fitness: model.fitness },
      });
      setSavedBrainLabel(model.name);
      simulation.loadDesign(body);
      simulation.setTask("jousting");
      simulation.setBrain(seed.shape, seed.weights);
      setMode("sim");
      return;
    }
    const expected = shapeForDesign(body, {
      raycast:
        isFeatureEnabled("raycastObservations") && raycastObservationsOn,
    });
    if (!shapesCompatible(model.shape, expected)) {
      denyLoad(
        "Saved brain does not fit that body — use Fit from the Train dock, or pick a matching trained creature.",
      );
      return;
    }
    if (skill === "disco") leaveDiscoSkill(false);
    if (simulation.isEvolving) simulation.abortLiveEvolve();
    loadPreset(body, "custom");
    setGoalId(model.task as GoalId);
    saveActiveGoalId(model.task as GoalId);
    setBestGenome({
      shape: seed.shape,
      genome: { weights: seed.weights, fitness: model.fitness, morph: seed.morph },
    });
    setSavedBrainLabel(model.name);
    simulation.loadDesign(body);
    simulation.setTask(model.task);
    simulation.setBrain(seed.shape, seed.weights);
    setMode("sim");
  };
  const stopH2h = useCallback(() => {
    simulation.abortHeadToHead();
    setH2hRunning(false);
    setH2hProgress(null);
    setDriveMode("idle");
    simulation.driveMode = "idle";
  }, [simulation]);

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
      cornerA: CombatCornerValue;
      cornerB: CombatCornerValue;
      divisionId: BoxingDivisionId;
    }) => {
      const pool = designCandidatePool(packages, BUNDLED_MODELS, design);
      const workspace =
        bestGenome
          ? {
              design,
              shape: bestGenome.shape,
              weights: bestGenome.genome.weights,
            }
          : null;
      const fighterA = resolveBoxingCorner(opts.cornerA, {
        workspace,
        models: savedModels,
        pool,
        divisionId: opts.divisionId,
        seed: runSeed,
      });
      const fighterB = resolveBoxingCorner(opts.cornerB, {
        workspace,
        models: savedModels,
        pool,
        divisionId: opts.divisionId,
        seed: runSeed + 1,
      });
      if (!fighterA || !fighterB) {
        denyLoad("Could not resolve both Boxing fighter designs.");
        return;
      }
      const expectedA = shapeForBoxingDesign(fighterA.design);
      const expectedB = shapeForBoxingDesign(fighterB.design);
      if (
        !shapesCompatible(fighterA.shape, expectedA) ||
        !shapesCompatible(fighterB.shape, expectedB)
      ) {
        denyLoad("A Boxing brain does not match its fighter body.");
        return;
      }
      try {
        captureLiveElite();
        simulation.abortJoustMatch();
        applyBoxingEnvironment();
        simulation.startBoxingMatch({
          entries: [
            {
              design: cloneDesign(fighterA.design),
              shape: fighterA.shape,
              weights: fighterA.weights,
            },
            {
              design: cloneDesign(fighterB.design),
              shape: fighterB.shape,
              weights: fighterB.weights,
            },
          ],
          divisionId: opts.divisionId,
          episodeSeconds: combatRoundSeconds,
          roundCount: combatRounds,
          onProgress: (snapshot) => {
            setBoxingProgress({
              episodeT: snapshot.episodeT,
              episodeDuration: snapshot.episodeDuration,
              points: snapshot.points,
              countRemaining: snapshot.countRemaining,
              down: snapshot.down,
              reason: snapshot.reason,
              roundIndex: snapshot.roundIndex,
              roundCount: snapshot.roundCount,
            });
          },
          onFinished: (result) => {
            setBoxingResult(result);
            setBoxingRunning(false);
            setBoxingProgress(null);
          },
        });
        setMode("sim");
        setSandboxTab("h2h");
        setDriveMode("brain");
        simulation.driveMode = "brain";
        setBoxingRunning(true);
        setBoxingResult(null);
        setBoxingProgress({
          episodeT: 0,
          episodeDuration: combatRoundSeconds,
          points: [0, 0],
          countRemaining: [0, 0],
          down: [false, false],
          reason: null,
          roundIndex: 1,
          roundCount: combatRounds,
        });
      } catch (err) {
        denyLoad(err instanceof Error ? err.message : String(err));
      }
    },
    [
      applyBoxingEnvironment,
      bestGenome,
      captureLiveElite,
      combatRoundSeconds,
      combatRounds,
      design,
      packages,
      runSeed,
      savedModels,
      simulation,
    ],
  );

  const startJoustMatch = useCallback(
    (opts: {
      cornerA: CombatCornerValue;
      cornerB: CombatCornerValue;
      divisionId: JoustingDivisionId;
    }) => {
      const pool = designCandidatePool(packages, BUNDLED_MODELS, design);
      const workspace =
        bestGenome
          ? {
              design,
              shape: bestGenome.shape,
              weights: bestGenome.genome.weights,
            }
          : null;
      const fighterA = resolveJoustCorner(opts.cornerA, {
        workspace,
        models: savedModels,
        pool,
        traineeDesign: design,
        seed: runSeed,
        divisionId: opts.divisionId,
      });
      const fighterB = resolveJoustCorner(opts.cornerB, {
        workspace,
        models: savedModels,
        pool,
        traineeDesign: fighterA?.design ?? design,
        seed: runSeed + 1,
        divisionId: opts.divisionId,
      });
      if (!fighterA || !fighterB) {
        denyLoad("Could not resolve both Jousting designs.");
        return;
      }
      const expectedA = shapeForJoustingDesign(fighterA.design);
      const expectedB = shapeForJoustingDesign(fighterB.design);
      if (
        !shapesCompatible(fighterA.shape, expectedA) ||
        !shapesCompatible(fighterB.shape, expectedB)
      ) {
        denyLoad("A Jousting brain does not match its body.");
        return;
      }
      try {
        captureLiveElite();
        applyJoustingEnvironment();
        simulation.startJoustMatch({
          entries: [
            {
              design: cloneDesign(fighterA.design),
              shape: fighterA.shape,
              weights: fighterA.weights,
            },
            {
              design: cloneDesign(fighterB.design),
              shape: fighterB.shape,
              weights: fighterB.weights,
            },
          ],
          episodeSeconds: combatRoundSeconds,
          roundCount: combatRounds,
          divisionId: opts.divisionId,
          priorities: joustingPriorities,
          onProgress: (snapshot) => {
            setJoustingProgress({
              episodeT: snapshot.episodeT,
              episodeDuration: snapshot.episodeDuration,
              totals: snapshot.totals,
              phase: snapshot.phase,
              roundIndex: snapshot.roundIndex,
              roundCount: snapshot.roundCount,
            });
          },
          onFinished: (result) => {
            setJoustingResult(result);
            setJoustingRunning(false);
            setJoustingProgress(null);
          },
        });
        setMode("sim");
        setSandboxTab("h2h");
        setDriveMode("brain");
        simulation.driveMode = "brain";
        setJoustingRunning(true);
        setJoustingResult(null);
        setJoustingProgress({
          episodeT: 0,
          episodeDuration: combatRoundSeconds,
          totals: [0, 0],
          phase: "charge",
          roundIndex: 1,
          roundCount: combatRounds,
        });
      } catch (err) {
        denyLoad(err instanceof Error ? err.message : String(err));
      }
    },
    [
      applyJoustingEnvironment,
      bestGenome,
      captureLiveElite,
      combatRoundSeconds,
      combatRounds,
      design,
      joustingPriorities,
      packages,
      runSeed,
      savedModels,
      simulation,
    ],
  );

  const startCombat = () => {
    if (combatMode === "boxing") {
      startBoxingMatch({
        cornerA: combatCornerA,
        cornerB: combatCornerB,
        divisionId: boxingDivisionId,
      });
      return;
    }
    if (combatMode === "joust") {
      startJoustMatch({
        cornerA: combatCornerA,
        cornerB: combatCornerB,
        divisionId: joustingDivisionId,
      });
      return;
    }
    const pool = designCandidatePool(packages, BUNDLED_MODELS, design);
    const entryOf = (corner: CombatCornerValue) => {
      if (corner.kind === "workspace") {
        if (!bestGenome) return null;
        return {
          design: cloneDesign(design),
          shape: bestGenome.shape,
          weights: bestGenome.genome.weights,
        };
      }
      if (corner.kind === "saved") {
        const model = savedModels.find((m) => m.id === corner.modelId);
        if (!model) return null;
        const pair = headToHeadEntriesFromModels(model, model, pool);
        return pair?.entries[0] ?? null;
      }
      return null;
    };
    const a = entryOf(combatCornerA);
    const b = entryOf(combatCornerB);
    if (!a || !b) {
      denyLoad("Pick two trained creatures (this workspace or the library).");
      return;
    }
    const raceA = raceEligibility(a.design, raceDivisionId);
    const raceB = raceEligibility(b.design, raceDivisionId);
    if (!raceA.eligible || !raceB.eligible) {
      const reasons = [
        ...(!raceA.eligible
          ? [`${a.design.name}: ${raceA.reasons.join(" ")}`]
          : []),
        ...(!raceB.eligible
          ? [`${b.design.name}: ${raceB.reasons.join(" ")}`]
          : []),
      ];
      denyLoad(
        `Both racers must meet ${raceDivisionId} division rules. ${reasons.join(" ")}`,
      );
      return;
    }
    try {
      captureLiveElite();
      simulation.clearDiscoDancers();
      simulation.abortJoustMatch();
      simulation.abortBoxingMatch();
      const task = getGoal(combatRaceGoalId).task;
      if (combatUseCurrentEnv) {
        simulation.setEnvironment(envDesignRef.current);
      }
      simulation.setTask(task);
      setGoalId(combatRaceGoalId);
      saveActiveGoalId(combatRaceGoalId);
      simulation.startHeadToHead({
        entries: [a, b],
        task,
        divisionId: raceDivisionId,
        episodeSeconds: combatRoundSeconds,
        roundCount: combatRounds,
        onProgress: (episodeT, episodeDuration, round) => {
          setH2hProgress({
            episodeT,
            episodeDuration,
            roundIndex: round?.index,
            roundCount: round?.count,
          });
        },
        onFinished: (result) => {
          setH2hResult(result);
          setH2hRunning(false);
          setH2hProgress(null);
        },
      });
      setMode("sim");
      setSandboxTab("h2h");
      setDriveMode("brain");
      simulation.driveMode = "brain";
      setH2hRunning(true);
      setH2hResult(null);
      setH2hProgress({
        episodeT: 0,
        episodeDuration: combatRoundSeconds,
        roundIndex: 1,
        roundCount: combatRounds,
      });
    } catch (err) {
      denyLoad(err instanceof Error ? err.message : String(err));
    }
  };

  const stopCombat = () => {
    if (combatMode === "boxing") stopBoxingMatch();
    else if (combatMode === "joust") stopJoustMatch();
    else stopH2h();
  };

  const onCombatModeChange = (mode: CombatMode) => {
    setCombatMode(mode);
    setCombatRoundSeconds(defaultRoundSeconds(mode));
    setCombatCornerA({ kind: "workspace" });
    if (mode === "boxing") {
      setCombatCornerB({ kind: "house", id: DEFAULT_SPARRING_OPPONENT_ID });
    } else if (mode === "joust") {
      setCombatCornerB({ kind: "house", id: "dummy" });
    } else {
      setCombatCornerB({ kind: "workspace" });
    }
    enterCombatArena(mode, { kind: "workspace" });
  };

  const persistTrained = (opts: { download: boolean; kind: "brain" | "trained" }) => {
    if (!bestGenome) {
      setError("No elite genome to save.");
      return;
    }
    const unnamed = unnamedBodyReason(design.name);
    if (unnamed) {
      setFlashNotice(unnamed);
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
    const name = displayNameForTrained(design.name, activeTask);
    const boxingMeta =
      activeTask === "boxing"
        ? ({
            divisionId: boxingDivisionId,
            ruleVersion: 1,
            obsPackVersion: BOXING_OBS_PACK_VERSION,
            brainHz: 30,
          } as const)
        : undefined;
    const joustingMeta =
      activeTask === "jousting"
        ? ({
            ruleVersion: 1,
            obsPackVersion: JOUST_OBS_PACK_VERSION,
            brainHz: 30,
            divisionId: joustingDivisionId,
          } as const)
        : undefined;
    if (
      !persistLibraryModel({
        name,
        task: activeTask,
        shape: adapted.shape,
        genome: adapted.genome,
        design,
        kind: opts.kind,
        ...(boxingMeta ? { boxingMeta } : {}),
        ...(joustingMeta ? { joustingMeta } : {}),
      })
    ) {
      return;
    }
    setSavedBrainLabel(name);
    markDesignBaseline(design);
    if (opts.download) {
      downloadText(
        trainedFileName(design.name, activeTask),
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
    }
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
    const unnamed = unnamedBodyReason(saveName.trim() || design.name);
    if (unnamed) {
      setFlashNotice(unnamed);
      return;
    }
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
    markDesignBaseline({ ...design, name });
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
  const expectedWorkspaceShape =
    !bestGenome || !hasCreature
      ? null
      : activeTask === "boxing"
        ? shapeForBoxingDesign(design)
        : activeTask === "jousting"
          ? shapeForJoustingDesign(design)
          : shapeForDesign(design, {
              raycast:
                isFeatureEnabled("raycastObservations") && raycastObservationsOn,
            });
  const workspaceBound =
    !!bestGenome &&
    hasCreature &&
    !!expectedWorkspaceShape &&
    shapesCompatible(bestGenome.shape, expectedWorkspaceShape);
  const workspaceBrain: BrainStatus =
    !bestGenome || !hasCreature
      ? { kind: "none" }
      : expectedWorkspaceShape &&
          !shapesCompatible(bestGenome.shape, expectedWorkspaceShape)
        ? { kind: "mismatch" }
        : savedBrainLabel
          ? { kind: "saved", label: savedBrainLabel }
          : {
              kind: "session",
              goalTitle: goalTitleForTask(activeTask),
            };
  const trainBodyFp = hasCreature ? bodyFingerprint(design) : "";
  const trainBrainModels = trainBodyFp
    ? savedModels.filter((m) => {
        if (bodyFpFromModel(m) !== trainBodyFp) return false;
        if (skill === "disco") return m.task === "dance";
        return m.task !== "dance";
      })
    : [];
  const trainSavedBrain = savedBrainLabel
    ? trainBrainModels.find((m) => m.name === savedBrainLabel)
    : undefined;
  const trainBrainValue = !bestGenome
    ? "__none__"
    : trainSavedBrain
      ? trainSavedBrain.id
      : "__session__";
  const trainBrainOptions = [
    {
      value: "__none__",
      label:
        trainBrainModels.length === 0 && !bestGenome
          ? "No brains"
          : "None",
    },
    ...(bestGenome && !trainSavedBrain
      ? [
          {
            value: "__session__",
            label: `Session · ${goalTitleForTask(activeTask)} (unsaved)`,
          },
        ]
      : []),
    ...trainBrainModels.map((m) => ({
      value: m.id,
      label: `${m.name} · ${m.fitness.toFixed(1)}`,
    })),
  ];
  const trainBodyGroups = [
    { options: [{ value: "custom", label: "Current" }] },
    {
      label: "Presets",
      options: [
        ...PRESETS.map((p) => ({
          value: `preset:${p.name}`,
          label: p.name,
        })),
        {
          value: `preset:${ULTI_GROOVE_BOT_II.name}`,
          label: ULTI_GROOVE_BOT_II.name,
        },
      ],
    },
    ...(isFeatureEnabled("creaturePackages") && packages.length > 0
      ? [
          {
            label: "Bodies",
            options: packages.map((pkg) => ({
              value: `pkg:${pkg.id}`,
              label: pkg.displayName,
            })),
          },
        ]
      : []),
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
          <CourseSidebar
            envDesign={envDesign}
            envPackages={envPackages}
            libraryOpen={worldLibOpen}
            onLibraryToggle={() => setWorldLibOpen((v) => !v)}
            onCommitEnv={commitEnv}
            onClearSelection={() => setEnvSelection([])}
            onRefreshPackages={refreshEnvPackages}
          />
        );

        const editPanel = (
          <CreatureBuilderPanel
            skill={skill}
            design={design}
            goalId={goalId}
            boxingDivisionId={boxingDivisionId}
            joustingDivisionId={joustingDivisionId}
            onBoxingDivisionChange={setBoxingDivisionId}
            onJoustingDivisionChange={setJoustingDivisionId}
            feelNotesOpen={feelNotesOpen}
            onFeelNotesToggle={() => setFeelNotesOpen((v) => !v)}
          />
        );

        const builderInspect: CreatureBuilderInspectProps = {
          tool,
          onToolChange: (t) => {
            setTool(t);
            if (t !== "cloth") setClothDraftPins([]);
          },
          editPhysics,
          design,
          commitDesign,
          selection,
          setSelection,
          skill,
          clothDraftPins,
          setClothDraftPins,
          clothDraftFineness,
          setClothDraftFineness,
          clothDraftWeight,
          setClothDraftWeight,
          clothDraftStiffness,
          setClothDraftStiffness,
          boneRigid,
          setBoneRigid,
          undo,
          undoCount,
          clearDesign,
          snapEnabled,
          setSnapEnabled,
          footMass,
          applyFootMass,
          wheelMass,
          applyWheelMass,
          wheelRadius,
          applyWheelRadius,
          hasCreature,
          markedFootCount,
          markedWheelCount,
          evolveRunning: evolveProgress.running,
          matchRunning: h2hRunning,
          onStartEditPhysics: startEditPhysics,
          onStopEditPhysics: stopEditPhysics,
          onResetDrop: () => {
            if (syncDesignToSim(design)) {
              setSandboxTab("edit");
              simulation.timeScale = observeSpeed;
            }
          },
          observeSpeed,
          onObserveSpeedChange: setObserveSpeed,
        };

        const creatureDockToolsExtras = (
          <CreatureBuilderToolsExtras {...builderInspect} />
        );
        const creatureDockOptions = (
          <CreatureBuilderOptions {...builderInspect} />
        );
        const creatureDockInspector = (
          <CreatureBuilderInspector {...builderInspect} />
        );

        const trainPanel = (
          <TrainSidebar
            hasCreature={hasCreature}
            trainHelpDismissed={trainHelpDismissed}
            setTrainHelpDismissed={setTrainHelpDismissed}
            design={design}
            activeTask={activeTask}
            mode={mode}
            simTime={simTime}
            evolveProgress={evolveProgress}
            skill={skill}
            goalId={goalId}
            boxingPriorities={boxingPriorities}
            setBoxingPriorities={setBoxingPriorities}
            joustingPriorities={joustingPriorities}
            setJoustingPriorities={setJoustingPriorities}
            goalPriorities={goalPriorities}
            setGoalPriorities={setGoalPriorities}
            stageTrainerOn={stageTrainerOn}
            setStageTrainerOn={setStageTrainerOn}
            courseCurriculumOn={courseCurriculumOn}
            setCourseCurriculumOn={setCourseCurriculumOn}
            activeEnvPackageId={activeEnvPackageId}
            courseBaseForResolve={courseBaseForResolve}
            applyCourseStage={applyCourseStage}
            courseBaseEnvRef={courseBaseEnvRef}
            envPackages={envPackages}
            setEnvDesign={setEnvDesign}
            setCourseStageIndex={setCourseStageIndex}
            courseStageIndex={courseStageIndex}
            trainMoreOpen={trainMoreOpen}
            setTrainMoreOpen={setTrainMoreOpen}
            raycastObservationsOn={raycastObservationsOn}
            setRaycastObservationsOn={setRaycastObservationsOn}
            onRaycastSim={(on) => simulation.setRaycastObservations(on)}
            raceRecord={raceRecord}
            setRaceRecord={setRaceRecord}
            messyBodies={messyBodies}
            setMessyBodies={setMessyBodies}
            morphEvolveOn={morphEvolveOn}
            setMorphEvolveOn={setMorphEvolveOn}
            structuralMorphOn={structuralMorphOn}
            setStructuralMorphOn={setStructuralMorphOn}
            trainTelemetryOn={trainTelemetryOn}
            setTrainTelemetryOn={setTrainTelemetryOn}
            trainTelemetrySession={trainTelemetrySession}
            trainTelemetrySessionRef={trainTelemetrySessionRef}
            setTrainTelemetrySession={setTrainTelemetrySession}
            finalizeAndMaybeDownloadTelemetry={finalizeAndMaybeDownloadTelemetry}
            gaKnobs={gaKnobs}
            setGaKnobs={setGaKnobs}
            namedRecipes={namedRecipes}
            setNamedRecipes={setNamedRecipes}
            bestGenome={bestGenome}
            envDesign={envDesign}
            controlsOpen={controlsOpen}
            setControlsOpen={setControlsOpen}
            liveBrain={liveBrain}
            driveMode={driveMode}
            liveStats={liveStats}
            lastMetrics={lastMetrics}
            statsOpen={statsOpen}
            setStatsOpen={setStatsOpen}
            rewardsOpen={rewardsOpen}
            setRewardsOpen={setRewardsOpen}
            perfFps={perfFps}
            perfFrameMs={perfFrameMs}
            diagOpen={diagOpen}
            setDiagOpen={setDiagOpen}
          />
        );

        const h2hPanel = isFeatureEnabled("headToHead") ? (
          <CombatScoreboard
            mode={combatMode}
            boxingRunning={boxingRunning}
            joustingRunning={joustingRunning}
            raceRunning={h2hRunning}
            boxingProgress={boxingProgress}
            joustingProgress={joustingProgress}
            raceProgress={h2hProgress}
            lastBoxing={boxingResult}
            lastJoust={joustingResult}
            lastRace={h2hResult}
          />
        ) : null;

        const trainDock = (
          <TrainDock
            collapsed={
              isFeatureEnabled("sandboxMenuShell") ? dockCollapsed : false
            }
            evolveProgress={evolveProgress}
            h2hRunning={h2hRunning}
            h2hProgress={h2hProgress}
            h2hResult={h2hResult}
            driveMode={driveMode}
            onDriveModeChange={(id) => {
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
            bestGenome={bestGenome}
            design={design}
            onResetPose={() => simulation.reset()}
            brainHz={brainHz}
            setBrainHz={setBrainHz}
            manualDrives={manualDrives}
            updateManual={updateManual}
            goalId={goalId}
            activeEnvPackageId={activeEnvPackageId}
            courseBaseForResolve={courseBaseForResolve}
            observeSpeed={observeSpeed}
            setObserveSpeed={setObserveSpeed}
            trainSpeed={trainSpeed}
            setTrainSpeed={setTrainSpeed}
            episodeSeconds={episodeSeconds}
            setEpisodeSeconds={setEpisodeSeconds}
            setGaKnobs={setGaKnobs}
            onSetLiveEpisodeSeconds={(s) => {
              if (evolveProgress.running) simulation.setEpisodeSeconds(s);
            }}
            showGhostPack={showGhostPack}
            setShowGhostPack={setShowGhostPack}
            raceRecord={raceRecord}
            setRaceRecord={setRaceRecord}
            discoHideMuscles={discoHideMuscles}
            setDiscoHideMuscles={setDiscoHideMuscles}
            onHideMusclesSim={(hide) => {
              simulation.hideMuscles = hide;
            }}
            discoHideBones={discoHideBones}
            setDiscoHideBones={setDiscoHideBones}
            onHideBonesSim={(hide) => {
              simulation.hideBones = hide;
            }}
            hideSolidStruts={hideSolidStruts}
            setHideSolidStruts={setHideSolidStruts}
            onHideStrutsSim={(hide) => {
              simulation.hideSolidStruts = hide;
            }}
            envDesign={envDesign}
            runSeed={runSeed}
            setRunSeed={setRunSeed}
            antiScoot={antiScoot}
            setAntiScoot={setAntiScoot}
            trainTelemetryOn={trainTelemetryOn}
            trainTelemetrySession={trainTelemetrySession}
            startEvolve={startEvolve}
            stopEvolve={stopEvolve}
            playBest={playBest}
            continueFromBest={continueFromBest}
            onFocusPrev={() => simulation.focusPrevCreature()}
            onFocusNext={() => simulation.focusNextCreature()}
            saveName={saveName}
            setSaveName={setSaveName}
            commitDesign={commitDesign}
            hasCreature={hasCreature}
            persistTrained={persistTrained}
            importIntentRef={importIntentRef}
            fileInputRef={fileInputRef}
            shareCurrentElite={() => void shareCurrentElite()}
            shareBusy={shareBusy}
            activeTask={activeTask}
            boxingSparringId={boxingSparringId}
            setBoxingSparringId={setBoxingSparringId}
            boxingDivisionId={boxingDivisionId}
            joustingSparringId={joustingSparringId}
            setJoustingSparringId={setJoustingSparringId}
            joustingDivisionId={joustingDivisionId}
            setJoustingDivisionId={setJoustingDivisionId}
            gaKnobs={gaKnobs}
            savedModels={savedModels}
          />
        );

        const discoDock = isFeatureEnabled("discoMode") ? (
          <DiscoDock
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
            learn={{
              recording: discoRecording,
              recordSamples: discoRecordCount,
              recordDurationSec: discoRecordDuration,
              learning: discoLearning,
              learnProgress: discoLearnProgress,
              hasDanceBrain: !!danceGenome,
              freestyle: discoFreestyle,
              soloOk: discoSoloOk,
              onToggleRecord: toggleDiscoRecord,
              onLearn: () => {
                void learnDiscoDance();
              },
              onToggleFreestyle: toggleDiscoFreestyle,
              onSaveDance: saveDanceModel,
              onClearRecord: clearDiscoRecord,
              onLoadFile: async (file) => {
                await discoPlayer.loadFile(file);
                setDiscoTrack(file.name);
                setDiscoPlaying(false);
                setDiscoTrackTime(0);
                const d = discoPlayer.duration();
                setDiscoTrackDuration(Number.isFinite(d) ? d : 0);
              },
            }}
            curriculum={
              isFeatureEnabled("discoDanceCurriculum")
                ? {
                    tracks: discoPlaylist,
                    activeTrackId: discoPlaylistActiveId,
                    datasetSamples: curriculumSamples,
                    datasetDurationSec: curriculumDuration,
                    learning: curriculumLearning,
                    refining: curriculumRefining,
                    learnProgress: curriculumLearnProgress,
                    refineProgress: curriculumRefineProgress,
                    recording: curriculumRecording,
                    onAddFiles: addCurriculumFiles,
                    onRemoveTrack: removeCurriculumTrack,
                    onSelectTrack: (id) => {
                      void selectCurriculumTrack(id);
                    },
                    onAnalyzeAll: () => {
                      void analyzeCurriculumAll();
                    },
                    onRecordCurriculum: startCurriculumRecord,
                    onStopRecord: stopCurriculumRecord,
                    onLearnCurriculum: () => {
                      void learnCurriculum();
                    },
                    onRefine: () => {
                      void refineCurriculum();
                    },
                    onClearDataset: clearCurriculumDataset,
                  }
                : null
            }
          />
        ) : null;

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
            files={
              <div className="workspace-files">
                <h3 className="subhead">Files</h3>
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
                <div className="button-row wrap">
                  <button type="button" onClick={saveCurrentEnv}>
                    Save course
                  </button>
                  {isFeatureEnabled("jsonImportExport") && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          downloadText(
                            `${envDesign.name.replace(/\s+/g, "_").toLowerCase()}_env.json`,
                            exportEnvironmentJson(envDesign),
                          )
                        }
                      >
                        Export course
                      </button>
                      <button
                        type="button"
                        onClick={() => envFileInputRef.current?.click()}
                      >
                        Import course
                      </button>
                    </>
                  )}
                </div>
              </div>
            }
          />
        );

        const renameBody = (name: string) => {
          setSaveName(name);
          if (design.name !== name) commitDesign({ ...design, name });
        };
        const bodyLoadSelect = (
          <label className="field-row">
            <span>Load</span>
            <select
              value={selectedCreatureKey}
              disabled={editPhysics}
              onChange={(e) => loadCreatureByKey(e.target.value)}
              aria-label="Load body"
            >
              <option value="custom">Current</option>
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
                <optgroup label="Bodies">
                  {packages.map((pkg) => (
                    <option key={pkg.id} value={`pkg:${pkg.id}`}>
                      {pkg.displayName}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
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
            files={
              <WorkspaceFiles
                bodyName={saveName}
                onBodyNameChange={renameBody}
                hasBody={hasCreature}
                hasBrain={!!bestGenome}
                disabled={editPhysics}
                loadControl={bodyLoadSelect}
                showSaveBody={isFeatureEnabled("creaturePackages")}
                onSaveBody={saveCurrentPackage}
                showExportBody={isFeatureEnabled("jsonImportExport")}
                onExportBody={() =>
                  downloadText(bodyFileName(design.name), exportCreatureJson(design))
                }
                showImportBody={isFeatureEnabled("jsonImportExport")}
                onImportBody={() => {
                  importIntentRef.current = "body";
                  fileInputRef.current?.click();
                }}
              />
            }
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
            onRenameModel={(id, name) => {
              const clash = savedModels.find(
                (m) =>
                  m.id !== id &&
                  m.name.trim().toLowerCase() === name.trim().toLowerCase(),
              );
              if (clash) {
                const ok = window.confirm(
                  `A trained creature named "${clash.name}" already exists. Replace it with this one?`,
                );
                if (!ok) return;
                deleteSavedModel(clash.id);
              }
              const prev = savedModels.find((m) => m.id === id);
              const updated = renameSavedModel(id, name);
              if (!updated) return;
              refreshModels();
              if (prev && savedBrainLabel === prev.name) {
                setSavedBrainLabel(updated.name);
              }
            }}
            onDeleteModel={(id) => {
              deleteSavedModel(id);
              refreshModels();
            }}
            onLoadDanceFreestyle={loadDanceFreestyle}
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
            workspaceBodyName={design.name}
            workspaceBrain={workspaceBrain}
            workspaceBound={workspaceBound}
            onBackToSandbox={() =>
              onSandboxTabChange(lastSandboxModeRef.current)
            }
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

        const boxingModels = savedModels.filter((m) => m.task === "boxing");
        const joustingModels = savedModels.filter((m) => m.task === "jousting");
        const raceModels = savedModels.filter(
          (m) => m.task !== "boxing" && m.task !== "jousting" && m.task !== "dance",
        );
        const combatDock = isFeatureEnabled("headToHead") ? (
          <CombatDock
            mode={combatMode}
            onModeChange={onCombatModeChange}
            cornerA={combatCornerA}
            cornerB={combatCornerB}
            onCornerAChange={onCombatCornerAChange}
            onCornerBChange={onCombatCornerBChange}
            workspaceReady={!!bestGenome && hasCreature}
            workspaceLabel={design.name || "unnamed"}
            boxingModels={boxingModels}
            joustingModels={joustingModels}
            raceModels={raceModels}
            divisionId={boxingDivisionId}
            onDivisionChange={setBoxingDivisionId}
            joustingDivisionId={joustingDivisionId}
            onJoustingDivisionChange={setJoustingDivisionId}
            raceDivisionId={raceDivisionId}
            onRaceDivisionChange={setRaceDivisionId}
            raceGoalId={combatRaceGoalId}
            onRaceGoalChange={setCombatRaceGoalId}
            useCurrentEnv={combatUseCurrentEnv}
            onUseCurrentEnvChange={setCombatUseCurrentEnv}
            envName={envDesign.name}
            busy={evolveProgress.running}
            boxingRunning={boxingRunning}
            joustingRunning={joustingRunning}
            raceRunning={h2hRunning}
            boxingProgress={boxingProgress}
            joustingProgress={joustingProgress}
            raceProgress={h2hProgress}
            lastBoxing={boxingResult}
            lastJoust={joustingResult}
            lastRace={h2hResult}
            rounds={combatRounds}
            onRoundsChange={(n) => setCombatRounds(clampCombatRounds(n))}
            roundSeconds={combatRoundSeconds}
            onRoundSecondsChange={(n) =>
              setCombatRoundSeconds(clampRoundSeconds(combatMode, n))
            }
            onStart={startCombat}
            onStop={stopCombat}
            sloMo={combatSloMo}
            onSloMoChange={setCombatSloMo}
            collapsed={dockCollapsed}
          />
        ) : null;

        const discoSkillActive =
          skill === "disco" && isFeatureEnabled("discoMode");
        const discoPanel = (
          <DiscoSidebar hasCreature={hasCreature} design={design} />
        );

        const sandboxTabs: SandboxTab[] = [
          {
            id: "tutorial",
            label: "Tutorial",
            // Full-bleed viewport owns this tab; no side panel body.
            content: null,
          },
          { id: "edit", label: "Build", content: editPanel },
          {
            id: "train",
            label: discoSkillActive ? "Disco" : "Train",
            content: discoSkillActive ? discoPanel : trainPanel,
            tip: discoSkillActive
              ? "Disco — load a track, start dancing, and learn in the dock under the canvas."
              : undefined,
          },
          ...(isFeatureEnabled("headToHead") && h2hPanel
            ? [{ id: "h2h" as const, label: "Combat", content: h2hPanel }]
            : []),
          { id: "world", label: "Course", content: worldPanel },
          {
            id: "creatures",
            label: "Library",
            // Full-bleed viewport owns this tab; no side panel body.
            content: null,
          },
          ...(isFeatureEnabled("discoveryUi")
            ? [
                {
                  id: "discoveries" as const,
                  label: "Trophies",
                  // Full-bleed viewport owns this tab; no side panel body.
                  content: null,
                },
              ]
            : []),
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
              <button
                type="button"
                className={hoverHelpEnabled ? "active" : ""}
                aria-pressed={hoverHelpEnabled}
                onClick={() => onHoverHelpChange(!hoverHelpEnabled)}
                title="Deeper tips when you point at controls"
              >
                Hover help
              </button>
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
                    <>
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
                          skill !== "boxing" &&
                          skill !== "jousting"
                        }
                        envDisabled={evolveProgress.running}
                        showBodyBrain={sandboxTab === "train"}
                        bodyValue={selectedCreatureKey}
                        bodyGroups={trainBodyGroups}
                        onSelectBody={loadCreatureByKey}
                        brainValue={trainBrainValue}
                        brainOptions={trainBrainOptions}
                        onSelectBrain={applyTrainBrain}
                        bodyBrainDisabled={evolveProgress.running}
                      />
                      <WorkspaceStatus
                        bodyName={design.name}
                        brain={workspaceBrain}
                        bound={workspaceBound}
                      />
                    </>
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
                    : sandboxTab === "h2h" && combatDock
                      ? combatDock
                      : mode === "world"
                        ? worldDock
                        : mode === "edit" ||
                            (editPhysics && sandboxTab === "edit")
                          ? creatureDock
                          : mode === "sim" && skill === "disco" && discoDock
                            ? discoDock
                            : mode === "sim" && !editPhysics
                              ? trainDock
                              : null
                }
                dockLabel={
                  sandboxTab === "h2h"
                    ? "Combat"
                    : mode === "world"
                      ? "Course"
                      : mode === "edit" ||
                          (editPhysics && sandboxTab === "edit")
                        ? "Build"
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
                  {worldPanel}
                  {(mode === "edit" || editPhysics) && editPanel}
                  {!editPhysics && mode === "sim" && skill === "disco" && (
                    <>
                      {discoPanel}
                      {discoDock}
                    </>
                  )}
                  {!editPhysics &&
                    mode === "sim" &&
                    skill !== "disco" && (
                    <>
                      {trainDock}
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
              if (kind === "freshstart-model") {
                if (importIntentRef.current === "body") {
                  setFlashNotice("That file is a trained creature. Use Import trained.");
                  return;
                }
                const result = importModelJson(text);
                if (!result.ok) {
                  setFlashNotice(result.error);
                  return;
                }
                applyImportedModel(result.value, { persistToLibrary: true });
                return;
              }
              if (importIntentRef.current === "trained") {
                setFlashNotice("That file is a body only. Use Import body.");
                return;
              }
              const result = importCreatureJson(text);
              if (!result.ok) {
                setFlashNotice(result.error);
                return;
              }
              loadPreset(result.value, "custom");
              setBestGenome(null);
              setSavedBrainLabel(null);
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
