import type { MutableRefObject } from "react";
import {
  BOXING_PRIORITY_KEYS,
  BOXING_PRIORITY_LABELS,
  type BoxingPriorities,
} from "../boxing/rewards";
import { designHasActuators } from "../brain/driveGroups";
import {
  relevantPriorityKeys,
  type GoalPriorities,
} from "../brain/goalPriorities";
import {
  exportTrainTelemetryJson,
  telemetryFilename,
  TRAIN_TELEMETRY_WINDOW,
  type TrainTelemetrySession,
} from "../brain/trainTelemetry";
import type { GaKnobSet } from "../brain/trainingRecipes";
import type {
  EvolutionProgress,
  Genome,
  NetworkShape,
  TaskId,
} from "../brain/types";
import type { TaskEpisodeMetrics } from "../brain/taskScore";
import { cloneDesign, type CreatureDesign } from "../creature/types";
import {
  clampCourseStageIndex,
  hasCourseCurriculum,
  resolveCourseCurriculum,
} from "../env/courseCurriculum";
import { cloneEnvironment, type EnvironmentDesign } from "../env/types";
import { getGoal, type GoalId } from "../goals/catalog";
import {
  JOUSTING_PRIORITY_KEYS,
  JOUSTING_PRIORITY_LABELS,
  type JoustingPriorities,
} from "../jousting/scorecard";
import { displayNameForTrained } from "../library/fileVocabulary";
import {
  EXPERIMENT_PACK_VERSION,
  exportExperimentPackJson,
  exportRecipeJson,
  loadNamedRecipes,
  saveNamedRecipe,
  type TrainingRecipeSave,
} from "../library/experimentPacks";
import type { EnvironmentPackage } from "../library/environmentPackages";
import { downloadText } from "../library/jsonIO";
import { isFeatureEnabled } from "../port/featureFlags";
import type {
  DriveMode,
  LiveBrainProbe,
  LiveFocusStats,
} from "../sim/simulation";
import type { SkillId } from "../skills/skills";
import { CollapsiblePanel } from "./CollapsiblePanel";
import { GoalInfoCard } from "./GoalInfoCard";
import { NetworkVisualizer } from "./NetworkVisualizer";
import { PerfDiagnostics } from "./PerfDiagnostics";
import { RewardsBreakdown } from "./RewardsBreakdown";
import { StatsPanel } from "./StatsPanel";

export interface TrainSidebarProps {
  hasCreature: boolean;
  trainHelpDismissed: boolean;
  setTrainHelpDismissed: (v: boolean) => void;
  design: CreatureDesign;
  activeTask: TaskId;
  mode: "edit" | "world" | "sim";
  simTime: number;
  evolveProgress: EvolutionProgress;
  skill: SkillId;
  goalId: GoalId;
  boxingPriorities: BoxingPriorities;
  setBoxingPriorities: (
    next: BoxingPriorities | ((p: BoxingPriorities) => BoxingPriorities),
  ) => void;
  joustingPriorities: JoustingPriorities;
  setJoustingPriorities: (
    next:
      | JoustingPriorities
      | ((p: JoustingPriorities) => JoustingPriorities),
  ) => void;
  goalPriorities: GoalPriorities;
  setGoalPriorities: (
    next: GoalPriorities | ((p: GoalPriorities) => GoalPriorities),
  ) => void;
  stageTrainerOn: boolean;
  setStageTrainerOn: (v: boolean) => void;
  courseCurriculumOn: boolean;
  setCourseCurriculumOn: (v: boolean) => void;
  activeEnvPackageId: string | null;
  courseBaseForResolve: () => EnvironmentDesign | null;
  applyCourseStage: (
    packageId: string | null,
    stageIndex: number,
    opts?: { selectSprint?: boolean; baseEnv?: EnvironmentDesign },
  ) => boolean;
  courseBaseEnvRef: MutableRefObject<EnvironmentDesign | null>;
  envPackages: EnvironmentPackage[];
  setEnvDesign: (env: EnvironmentDesign) => void;
  setCourseStageIndex: (n: number) => void;
  courseStageIndex: number;
  trainMoreOpen: boolean;
  setTrainMoreOpen: (updater: boolean | ((v: boolean) => boolean)) => void;
  raycastObservationsOn: boolean;
  setRaycastObservationsOn: (v: boolean) => void;
  onRaycastSim: (on: boolean) => void;
  raceRecord: boolean;
  setRaceRecord: (v: boolean) => void;
  messyBodies: boolean;
  setMessyBodies: (v: boolean) => void;
  morphEvolveOn: boolean;
  setMorphEvolveOn: (v: boolean) => void;
  structuralMorphOn: boolean;
  setStructuralMorphOn: (v: boolean) => void;
  trainTelemetryOn: boolean;
  setTrainTelemetryOn: (v: boolean) => void;
  trainTelemetrySession: TrainTelemetrySession | null;
  trainTelemetrySessionRef: MutableRefObject<TrainTelemetrySession | null>;
  setTrainTelemetrySession: (s: TrainTelemetrySession | null) => void;
  finalizeAndMaybeDownloadTelemetry: (
    session: TrainTelemetrySession,
    download: boolean,
  ) => TrainTelemetrySession;
  gaKnobs: GaKnobSet;
  setGaKnobs: (next: GaKnobSet | ((k: GaKnobSet) => GaKnobSet)) => void;
  namedRecipes: TrainingRecipeSave[];
  setNamedRecipes: (next: TrainingRecipeSave[]) => void;
  bestGenome: { shape: NetworkShape; genome: Genome } | null;
  envDesign: EnvironmentDesign;
  controlsOpen: boolean;
  setControlsOpen: (updater: boolean | ((v: boolean) => boolean)) => void;
  liveBrain: LiveBrainProbe | null;
  driveMode: DriveMode;
  liveStats: LiveFocusStats | null;
  lastMetrics: TaskEpisodeMetrics | null;
  statsOpen: boolean;
  setStatsOpen: (updater: boolean | ((v: boolean) => boolean)) => void;
  rewardsOpen: boolean;
  setRewardsOpen: (updater: boolean | ((v: boolean) => boolean)) => void;
  perfFps: number;
  perfFrameMs: number;
  diagOpen: boolean;
  setDiagOpen: (updater: boolean | ((v: boolean) => boolean)) => void;
}

/** Train mode sidebar — how-to, priorities, senses, brain viz. Dock holds Evolve. */
export function TrainSidebar(p: TrainSidebarProps) {
  const {
    hasCreature,
    trainHelpDismissed,
    setTrainHelpDismissed,
    design,
    activeTask,
    mode,
    simTime,
    evolveProgress,
    skill,
    goalId,
    boxingPriorities,
    setBoxingPriorities,
    joustingPriorities,
    setJoustingPriorities,
    goalPriorities,
    setGoalPriorities,
    stageTrainerOn,
    setStageTrainerOn,
    courseCurriculumOn,
    setCourseCurriculumOn,
    activeEnvPackageId,
    courseBaseForResolve,
    applyCourseStage,
    courseBaseEnvRef,
    envPackages,
    setEnvDesign,
    setCourseStageIndex,
    courseStageIndex,
    trainMoreOpen,
    setTrainMoreOpen,
    raycastObservationsOn,
    setRaycastObservationsOn,
    onRaycastSim,
    raceRecord,
    setRaceRecord,
    messyBodies,
    setMessyBodies,
    morphEvolveOn,
    setMorphEvolveOn,
    structuralMorphOn,
    setStructuralMorphOn,
    trainTelemetryOn,
    setTrainTelemetryOn,
    trainTelemetrySession,
    trainTelemetrySessionRef,
    setTrainTelemetrySession,
    finalizeAndMaybeDownloadTelemetry,
    gaKnobs,
    setGaKnobs,
    namedRecipes,
    setNamedRecipes,
    bestGenome,
    envDesign,
    controlsOpen,
    setControlsOpen,
    liveBrain,
    driveMode,
    liveStats,
    lastMetrics,
    statsOpen,
    setStatsOpen,
    rewardsOpen,
    setRewardsOpen,
    perfFps,
    perfFrameMs,
    diagOpen,
    setDiagOpen,
  } = p;
  const vizShape = liveBrain?.shape ?? bestGenome?.shape ?? null;
  return (
          <div className="panel-stack">
            <section>
              <h2>Train</h2>
              {!hasCreature && (
                <p className="hint muted">
                  Load or build a creature first — empty designs stay in Build.
                </p>
              )}
              {isFeatureEnabled("trainDockIa") &&
                hasCreature &&
                !trainHelpDismissed && (
                  <div className="train-help-strip">
                    <strong>How to train</strong>
                    <ol>
                      <li>Pick Skill, Goal, and Environment above</li>
                      <li>Press Evolve — many brains try the course</li>
                      <li>Play best to watch the winner</li>
                      <li>
                        Save trained stores{" "}
                        <code>{displayNameForTrained(design.name || "Creature", activeTask)}</code>{" "}
                        (body + brain + goal)
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
              {skill === "boxing" && isFeatureEnabled("boxingMode") ? (
                <p className="hint muted">
                  Train this body in Train. Play a match in Combat.
                </p>
              ) : skill === "jousting" && isFeatureEnabled("joustingMode") ? (
                <p className="hint muted">
                  Train this body in Train. Play a pass in Combat.
                </p>
              ) : null}
              {isFeatureEnabled("goalCatalog") &&
                skill !== "disco" &&
                skill !== "boxing" &&
                skill !== "jousting" && (
                  <GoalInfoCard goal={getGoal(goalId)} skill={skill} />
                )}
              {!designHasActuators(
                design,
                isFeatureEnabled("motorWheels"),
              ) &&
                hasCreature && (
                <p className="hint muted">
                  Add at least one muscle or wheel in Build first.
                </p>
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
                            onRaycastSim(on);
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
                    Watch / train speed live in the bottom dock.
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
}
