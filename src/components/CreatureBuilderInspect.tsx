import {
  addBodyPartToBone,
  addBodyPartToJoint,
  removeBodyPart,
  updateBodyPart,
} from "../appearance/bodyPartOps";
import { getBodyPart } from "../appearance/bodyPartCatalog";
import {
  CLOTH_DEFAULT_STIFFNESS,
  CLOTH_DEFAULT_WEIGHT,
  CLOTH_MAX_COLS,
  CLOTH_MAX_ROWS,
  CLOTH_MIN_CELL,
  CLOTH_MAX_CELL,
} from "../appearance/clothConstants";
import {
  addCapePreset,
  addCoveringGarment,
  removeClothGarment,
  updateClothGarment,
} from "../appearance/clothOps";
import {
  jointHasGooglyEyes,
  setJointGooglyEyes,
} from "../appearance/googlyEyes";
import { emptyAppearance } from "../appearance/types";
import { BodyPartCatalogPicker } from "./BodyPartCatalogPicker";
import {
  assignDriveGroup,
  boneHasMuscle,
  clearDriveGroup,
  updateBone,
  updateJoint,
} from "../editor/editOps";
import {
  AERO_TYPES,
  aeroTypeLabel,
  wingPairOk,
} from "../editor/aeroValidation";
import { AERO_AREA_SLIDER_MAX } from "../editor/flightMetrics";
import type { EditTool } from "../editor/EditorCanvas";
import {
  jointsSelection,
  type EditorSelection,
} from "../editor/selection";
import {
  deleteSelection as deleteJointSelection,
  duplicateSelection,
  mirrorDuplicateSelection,
  selectionSummary,
} from "../editor/selectionOps";
import { normalizeDriveGroup } from "../brain/driveGroups";
import type { CreatureDesign } from "../creature/types";
import type { SkillId } from "../skills/skills";
import {
  FOOT_MASS_MAX,
  FOOT_MASS_MIN,
  WHEEL_MASS_MAX,
  WHEEL_MASS_MIN,
} from "../physics/constants";
import { isFeatureEnabled } from "../port/featureFlags";

const OBSERVE_SPEEDS = [0.25, 1, 2, 4] as const;

export interface CreatureBuilderInspectProps {
  tool: EditTool;
  onToolChange: (tool: EditTool) => void;
  editPhysics: boolean;
  design: CreatureDesign;
  commitDesign: (next: CreatureDesign) => void;
  selection: EditorSelection;
  setSelection: (sel: EditorSelection | null) => void;
  skill: SkillId;
  clothDraftPins: number[];
  setClothDraftPins: (
    next: number[] | ((prev: number[]) => number[]),
  ) => void;
  clothDraftFineness: number;
  setClothDraftFineness: (n: number) => void;
  clothDraftWeight: number;
  setClothDraftWeight: (n: number) => void;
  clothDraftStiffness: number;
  setClothDraftStiffness: (n: number) => void;
  boneRigid: boolean;
  setBoneRigid: (v: boolean) => void;
  undo: () => void;
  undoCount: number;
  clearDesign: () => void;
  snapEnabled: boolean;
  setSnapEnabled: (v: boolean) => void;
  footMass: number;
  applyFootMass: (n: number) => void;
  wheelMass: number;
  applyWheelMass: (n: number) => void;
  hasCreature: boolean;
  markedFootCount: number;
  markedWheelCount: number;
  evolveRunning: boolean;
  matchRunning: boolean;
  onStartEditPhysics: () => void;
  onStopEditPhysics: () => void;
  onResetDrop: () => void;
  observeSpeed: number;
  onObserveSpeedChange: (speed: number) => void;
}

function useInspect(p: CreatureBuilderInspectProps) {
  return {
    ...p,
    setTool: p.onToolChange,
    evolveProgress: { running: p.evolveRunning },
    h2hRunning: p.matchRunning,
    startEditPhysics: p.onStartEditPhysics,
    stopEditPhysics: p.onStopEditPhysics,
    setObserveSpeed: p.onObserveSpeedChange,
  };
}


/** Build-dock tool extras: cloth pins, solid strut, undo / clear, hints. */
export function CreatureBuilderToolsExtras(props: CreatureBuilderInspectProps) {
  const {
    tool,
    editPhysics,
    clothDraftPins,
    setClothDraftPins,
    clothDraftFineness,
    setClothDraftFineness,
    clothDraftWeight,
    setClothDraftWeight,
    setClothDraftStiffness,
    clothDraftStiffness,
    design,
    commitDesign,
    setSelection,
    boneRigid,
    setBoneRigid,
    undo,
    undoCount,
    clearDesign,
  } = useInspect(props);
  const setTool = props.onToolChange;
  return (
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
                  className="danger-ghost"
                  onClick={clearDesign}
                  disabled={editPhysics}
                  title="Remove joints, bones, and muscles from the workspace"
                >
                  Clear body
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
}

/** Build-dock options: snap, masses, physics settle. */
export function CreatureBuilderOptions(props: CreatureBuilderInspectProps) {
  const {
    snapEnabled,
    setSnapEnabled,
    editPhysics,
    footMass,
    applyFootMass,
    hasCreature,
    markedFootCount,
    wheelMass,
    applyWheelMass,
    markedWheelCount,
    evolveProgress,
    h2hRunning,
    startEditPhysics,
    stopEditPhysics,
    onResetDrop,
    observeSpeed,
    setObserveSpeed,
  } = useInspect(props);
  return (
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
                title="Mass for joints marked as feet — applies in Build, Play, Train, and Disco"
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
                title="Mass for joints marked as wheels — applies in Build, Play, Train, and Disco"
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
                      onClick={onResetDrop}
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
}

/** Build-dock selection inspectors (joint / bone / cloth / part / muscle). */
export function CreatureBuilderInspector(props: CreatureBuilderInspectProps) {
  const {
    selection,
    design,
    commitDesign,
    setSelection,
    editPhysics,
    clothDraftFineness,
    clothDraftWeight,
    clothDraftStiffness,
    footMass,
    applyFootMass,
    wheelMass,
    applyWheelMass,
    skill,
  } = useInspect(props);
  return (
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
}
