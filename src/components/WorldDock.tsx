import type { ReactNode } from 'react';
import { clampCourseMarker } from '../brain/courseMarkers';
import { courseGateSummary } from '../env/courseAuthoring';
import {
  clampLaunchPadApex,
  LAUNCH_PAD_APEX_H,
  LAUNCH_PAD_APEX_MAX,
  LAUNCH_PAD_APEX_MIN,
  TERRAIN_DEFAULT_AMPLITUDE,
  TERRAIN_DEFAULT_WAVES,
  TERRAIN_MAX_AMPLITUDE,
  TERRAIN_MAX_WAVES,
  TERRAIN_MIN_WAVES,
} from '../physics/constants';
import { isFeatureEnabled } from '../port/featureFlags';
import {
  PLACE_MARKER_TOOLS,
  PLACE_OBSTACLE_TOOLS,
  PLACE_REGION_TOOLS,
  type EnvSelectionList,
  type EnvTool,
} from '../env/envSelection';
import { selectionLabel } from '../env/envEditOps';
import { primarySelection } from '../env/envSelectionOps';
import type {
  AuthoredCurriculumStage,
  EnvironmentDesign,
  EnvCourseMarker,
  EnvObstacle,
} from '../env/types';

interface Props {
  tool: EnvTool;
  onToolChange: (tool: EnvTool) => void;
  snapEnabled: boolean;
  onSnapChange: (snap: boolean) => void;
  environment: EnvironmentDesign;
  selection: EnvSelectionList;
  onSelect: (sel: EnvSelectionList) => void;
  onPatchMarker: (id: string, patch: Partial<EnvCourseMarker>) => void;
  onPatchObstacle: (id: string, patch: Partial<EnvObstacle>) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected?: () => void;
  onRotateSelected?: () => void;
  onUndo: () => void;
  undoDisabled: boolean;
  onSineTerrain: () => void;
  onClearTerrain: () => void;
  onPatchTerrain?: (patch: { amplitude?: number; waves?: number }) => void;
  onClearTower: () => void;
  /** Remove obstacles, regions, markers, terrain, tower, curriculum; reset spawn. */
  onClearAll: () => void;
  /** Ensure start + finish gates exist. */
  onEnsureCourse?: () => void;
  /** Drop N evenly spaced checkpoints between start and finish. */
  onPlaceEvenCheckpoints?: (count: number) => void;
  /** Reorder selected / listed checkpoint (−1 earlier, +1 later). */
  onMoveCheckpoint?: (id: string, delta: -1 | 1) => void;
  /** Build progressive stages from checkpoints + finish. */
  onBuildCurriculum?: () => void;
  onClearCurriculum?: () => void;
  onPatchCurriculumStage?: (
    stageId: string,
    patch: Partial<Pick<AuthoredCurriculumStage, 'label' | 'threshold'>>,
  ) => void;
  collapsed?: boolean;
  files?: ReactNode;
}

function markerTag(m: EnvCourseMarker): string {
  if (m.kind === 'start') return 'START';
  if (m.kind === 'finish') return 'FINISH';
  return `CP${(m.order ?? 0) + 1}`;
}

function orderedMarkers(env: EnvironmentDesign): EnvCourseMarker[] {
  const markers = (env.markers ?? []).map(clampCourseMarker);
  const starts = markers.filter((m) => m.kind === 'start');
  const cps = markers
    .filter((m) => m.kind === 'checkpoint')
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const finishes = markers.filter((m) => m.kind === 'finish');
  return [...starts, ...cps, ...finishes];
}

/** Course bottom dock — tools under the Environment builder canvas. */
export function WorldDock({
  tool,
  onToolChange,
  snapEnabled,
  onSnapChange,
  environment,
  selection,
  onSelect,
  onPatchMarker,
  onPatchObstacle,
  onDeleteSelected,
  onDuplicateSelected,
  onRotateSelected,
  onUndo,
  undoDisabled,
  onSineTerrain,
  onClearTerrain,
  onPatchTerrain,
  onClearTower,
  onClearAll,
  onEnsureCourse,
  onPlaceEvenCheckpoints,
  onMoveCheckpoint,
  onBuildCurriculum,
  onClearCurriculum,
  onPatchCurriculumStage,
  collapsed,
  files,
}: Props) {
  const primary = primarySelection(selection);
  const label =
    selection.length > 1
      ? `${selection.length} selected`
      : selectionLabel(environment, primary);
  const markers = orderedMarkers(environment);
  const checkpoints = markers.filter((m) => m.kind === 'checkpoint');
  const gateSummary = courseGateSummary(environment);
  const stages = environment.curriculum?.stages ?? [];
  const selectedMarker =
    primary?.kind === 'marker'
      ? markers.find((m) => m.id === primary.id) ?? null
      : null;
  const selectedObstacle =
    primary?.kind === 'obstacle'
      ? environment.obstacles.find((o) => o.id === primary.id) ?? null
      : null;

  if (collapsed) {
    return (
      <div className="dock-summary">
        <div className="button-row wrap">
          <button
            type="button"
            className={tool === 'select' ? 'active' : ''}
            onClick={() => onToolChange('select')}
          >
            Select
          </button>
          {PLACE_OBSTACLE_TOOLS.filter(
            (t) => t !== 'pad' || isFeatureEnabled('launchPads'),
          ).map((t) => (
            <button
              key={t}
              type="button"
              className={tool === t ? 'active' : ''}
              onClick={() => onToolChange(t)}
            >
              {t}
            </button>
          ))}
          {isFeatureEnabled('scoreRegions') &&
            PLACE_REGION_TOOLS.map((t) => (
              <button
                key={t}
                type="button"
                className={tool === t ? 'active' : ''}
                onClick={() => onToolChange(t)}
              >
                {t}
              </button>
            ))}
          {isFeatureEnabled('courseMarkers') &&
            PLACE_MARKER_TOOLS.map((t) => (
              <button
                key={t}
                type="button"
                className={tool === t ? 'active' : ''}
                onClick={() => onToolChange(t)}
              >
                {t}
              </button>
            ))}
          {isFeatureEnabled('launchTower') && (
            <button
              type="button"
              className={tool === 'tower' ? 'active' : ''}
              onClick={() => onToolChange('tower')}
            >
              Tower
            </button>
          )}
          <button
            type="button"
            className={tool === 'spawn' ? 'active' : ''}
            onClick={() => onToolChange('spawn')}
          >
            Spawn
          </button>
          {isFeatureEnabled('terrainHeightfield') && (
            <button
              type="button"
              className={tool === 'terrain' ? 'active' : ''}
              onClick={() => onToolChange('terrain')}
            >
              Hills
            </button>
          )}
        </div>
        <span className="dock-summary-stats">{label}</span>
      </div>
    );
  }

  return (
    <div className="dock-full course-dock">
      <div className="course-dock-grid">
        {files ? <div className="dock-col">{files}</div> : null}
        <div className="dock-col">
        <h3 className="subhead">Tools</h3>
        <div className="button-row wrap">
          <button
            type="button"
            className={tool === 'select' ? 'active' : ''}
            onClick={() => onToolChange('select')}
          >
            Select
          </button>
          {isFeatureEnabled('staticObstacles') &&
            PLACE_OBSTACLE_TOOLS.filter(
              (t) => t !== 'pad' || isFeatureEnabled('launchPads'),
            ).map((t) => (
              <button
                key={t}
                type="button"
                className={tool === t ? 'active' : ''}
                onClick={() => onToolChange(t)}
                title={
                  t === 'pad'
                    ? 'Launch pad — contact boost; set approximate height on the selected pad'
                    : undefined
                }
              >
                + {t}
              </button>
            ))}
          {isFeatureEnabled('scoreRegions') &&
            PLACE_REGION_TOOLS.map((t) => (
              <button
                key={t}
                type="button"
                className={tool === t ? 'active' : ''}
                onClick={() => onToolChange(t)}
                title={
                  t === 'penalty'
                    ? 'Penalty zone — fitness drains while inside'
                    : t === 'landing'
                      ? 'Landing zone — heavy once bonus after airborne (foot touch)'
                      : 'Reward zone — one-time bonus on first touch'
                }
              >
                + {t}
              </button>
            ))}
          {isFeatureEnabled('courseMarkers') &&
            PLACE_MARKER_TOOLS.map((t) => (
              <button
                key={t}
                type="button"
                className={tool === t ? 'active' : ''}
                onClick={() => onToolChange(t)}
                title={
                  t === 'start'
                    ? 'Start marker — arms the course (needed with finish for bonuses)'
                    : t === 'checkpoint'
                      ? 'Checkpoint — in-order bonus when the env has start + finish'
                      : 'Finish marker — completion bonus when armed (needs a start)'
                }
              >
                + {t}
              </button>
            ))}
          {isFeatureEnabled('launchTower') && (
            <button
              type="button"
              className={tool === 'tower' ? 'active' : ''}
              onClick={() => onToolChange('tower')}
            >
              Tower
            </button>
          )}
          <button
            type="button"
            className={tool === 'spawn' ? 'active' : ''}
            onClick={() => onToolChange('spawn')}
            title="Set where creatures spawn when training / playing"
          >
            Spawn
          </button>
          {isFeatureEnabled('terrainHeightfield') && (
            <button
              type="button"
              className={tool === 'terrain' ? 'active' : ''}
              onClick={() => onToolChange('terrain')}
              title="Draw the ground surface — drag on the canvas to paint hills"
            >
              Draw hills
            </button>
          )}
        </div>
        <p className="hint muted">
          Ramp: drag start→end (snaps flush to ground / object edges). Other
          tools: click to place · drag to move · handles resize · Alt/Space pan ·
          Del remove (spawn resets to origin). Penalty = time in zone; reward =
          touch once; landing = heavy touch after airtime. Markers = start /
          checkpoint / finish course gates.
        </p>

        {isFeatureEnabled('launchPads') &&
          selectedObstacle?.kind === 'pad' && (
            <div className="marker-inspector" style={{ marginTop: '0.5rem' }}>
              <h3 className="subhead">Launch pad</h3>
              <label className="field-row">
                <span>Height ~</span>
                <input
                  type="range"
                  min={LAUNCH_PAD_APEX_MIN}
                  max={LAUNCH_PAD_APEX_MAX}
                  step={10}
                  value={clampLaunchPadApex(
                    selectedObstacle.launchApex ?? LAUNCH_PAD_APEX_H,
                  )}
                  onChange={(e) =>
                    onPatchObstacle(selectedObstacle.id, {
                      launchApex: clampLaunchPadApex(Number(e.target.value)),
                    })
                  }
                />
                <span className="val">
                  {clampLaunchPadApex(
                    selectedObstacle.launchApex ?? LAUNCH_PAD_APEX_H,
                  )}
                </span>
              </label>
              <p className="hint muted">
                Approximate apex in ruler units ({LAUNCH_PAD_APEX_MIN}–
                {LAUNCH_PAD_APEX_MAX}). Default {LAUNCH_PAD_APEX_H}.
              </p>
            </div>
          )}
      </div>

      {isFeatureEnabled('courseMarkers') && (
        <div className="dock-col">
          <h3 className="subhead">Course</h3>
          <div className="button-row wrap">
            <button
              type="button"
              onClick={() => onEnsureCourse?.()}
              title="Add start near spawn and finish past the course if missing"
            >
              Ensure start + finish
            </button>
            <button
              type="button"
              onClick={() => onPlaceEvenCheckpoints?.(3)}
              disabled={!gateSummary.hasStart || !gateSummary.hasFinish}
              title="Place 3 evenly spaced checkpoints between start and finish"
            >
              + 3 checkpoints
            </button>
            <button
              type="button"
              className={tool === 'checkpoint' ? 'active' : ''}
              onClick={() => onToolChange('checkpoint')}
              title="Click canvas to place the next checkpoint"
            >
              + checkpoint
            </button>
          </div>
          <p className="hint muted">
            {gateSummary.hasStart ? 'Start' : 'No start'} ·{' '}
            {gateSummary.checkpointCount} CP ·{' '}
            {gateSummary.hasFinish ? 'Finish' : 'No finish'}
            {gateSummary.stageCount > 0
              ? ` · ${gateSummary.stageCount} train stages`
              : ''}
            . Sprint uses these gates; Train → course stages needs a curriculum.
          </p>

          {markers.length === 0 ? (
            <p className="hint muted">
              No gates yet — Ensure start + finish, then add checkpoints.
            </p>
          ) : (
            <div className="button-row wrap marker-list">
              {markers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={
                    primary?.kind === 'marker' && primary.id === m.id
                      ? 'active'
                      : ''
                  }
                  onClick={() => {
                    onToolChange('select');
                    onSelect([{ kind: 'marker', id: m.id }]);
                  }}
                  title={`${markerTag(m)} @ (${m.x.toFixed(1)}, ${m.y.toFixed(1)})`}
                >
                  {markerTag(m)}
                </button>
              ))}
            </div>
          )}

          {selectedMarker && (
            <div className="marker-inspector">
              <label className="field-row">
                <span>X</span>
                <input
                  type="number"
                  step={0.1}
                  value={selectedMarker.x}
                  onChange={(e) =>
                    onPatchMarker(selectedMarker.id, {
                      x: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="field-row">
                <span>Y</span>
                <input
                  type="number"
                  step={0.1}
                  value={selectedMarker.y}
                  onChange={(e) =>
                    onPatchMarker(selectedMarker.id, {
                      y: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="field-row">
                <span>W</span>
                <input
                  type="number"
                  step={0.1}
                  min={0.12}
                  value={selectedMarker.w}
                  onChange={(e) =>
                    onPatchMarker(selectedMarker.id, {
                      w: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="field-row">
                <span>H</span>
                <input
                  type="number"
                  step={0.1}
                  min={0.12}
                  value={selectedMarker.h}
                  onChange={(e) =>
                    onPatchMarker(selectedMarker.id, {
                      h: Number(e.target.value),
                    })
                  }
                />
              </label>
              {selectedMarker.kind === 'checkpoint' && onMoveCheckpoint && (
                <div className="button-row wrap" style={{ marginTop: '0.35rem' }}>
                  <button
                    type="button"
                    disabled={
                      checkpoints[0]?.id === selectedMarker.id
                    }
                    onClick={() => onMoveCheckpoint(selectedMarker.id, -1)}
                    title="Hit earlier in the course"
                  >
                    Earlier
                  </button>
                  <button
                    type="button"
                    disabled={
                      checkpoints[checkpoints.length - 1]?.id ===
                      selectedMarker.id
                    }
                    onClick={() => onMoveCheckpoint(selectedMarker.id, 1)}
                    title="Hit later in the course"
                  >
                    Later
                  </button>
                </div>
              )}
              <p className="hint muted" style={{ marginTop: '0.35rem' }}>
                Drag on canvas or edit numbers. Gates are score-only boxes
                (joint center must enter).
              </p>
            </div>
          )}

          {isFeatureEnabled('courseCurriculum') && (
            <div style={{ marginTop: '0.65rem' }}>
              <h3 className="subhead">Curriculum</h3>
              <div className="button-row wrap">
                <button
                  type="button"
                  onClick={() => onBuildCurriculum?.()}
                  disabled={!gateSummary.hasFinish}
                  title="One stage per checkpoint, then full finish — for Train course stages"
                >
                  Build stages from checkpoints
                </button>
                <button
                  type="button"
                  disabled={stages.length === 0}
                  onClick={() => onClearCurriculum?.()}
                >
                  Clear stages
                </button>
              </div>
              {stages.length === 0 ? (
                <p className="hint muted">
                  Place checkpoints, then Build stages. Save the course and enable
                  Train → course stages.
                </p>
              ) : (
                <div className="marker-inspector" style={{ marginTop: '0.35rem' }}>
                  {stages.map((s, i) => (
                    <div
                      key={s.id}
                      className="field-row"
                      style={{ alignItems: 'center', gap: '0.35rem' }}
                    >
                      <span
                        className="muted"
                        style={{ minWidth: '1.5rem' }}
                        title={s.label}
                      >
                        {i + 1}.
                      </span>
                      <input
                        type="text"
                        value={s.label}
                        style={{ flex: 1, minWidth: 0 }}
                        onChange={(e) =>
                          onPatchCurriculumStage?.(s.id, {
                            label: e.target.value,
                          })
                        }
                        title="Stage label"
                      />
                      <span className="muted">fit≥</span>
                      <input
                        type="number"
                        step={1}
                        min={0}
                        value={s.threshold}
                        style={{ width: '4rem' }}
                        onChange={(e) =>
                          onPatchCurriculumStage?.(s.id, {
                            threshold: Number(e.target.value),
                          })
                        }
                        title="Fitness to advance after evolve"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isFeatureEnabled('terrainHeightfield') && (
        <div className="dock-col">
          <h3 className="subhead">Terrain</h3>
          <div className="button-row wrap">
            <button type="button" onClick={onSineTerrain}>
              Sine hills
            </button>
            <button
              type="button"
              disabled={!environment.terrain}
              onClick={onClearTerrain}
            >
              Clear terrain
            </button>
          </div>
          {onPatchTerrain && (
            <div className="dock-col" style={{ marginTop: '0.4rem', gap: '0.25rem' }}>
              <label className="toggle-row">
                <span>Difficulty</span>
                <input
                  type="range"
                  min={0.2}
                  max={Math.min(24, TERRAIN_MAX_AMPLITUDE)}
                  step={0.1}
                  value={environment.terrain?.amplitude ?? TERRAIN_DEFAULT_AMPLITUDE}
                  onChange={(e) =>
                    onPatchTerrain({ amplitude: Number(e.target.value) })
                  }
                  title="Hill height (scales a drawn or sine surface)"
                />
                <span className="muted">
                  {(environment.terrain?.amplitude ?? TERRAIN_DEFAULT_AMPLITUDE).toFixed(1)}
                </span>
              </label>
              <label className="toggle-row">
                <span>Frequency</span>
                <input
                  type="range"
                  min={TERRAIN_MIN_WAVES}
                  max={TERRAIN_MAX_WAVES}
                  step={0.25}
                  value={environment.terrain?.waves ?? TERRAIN_DEFAULT_WAVES}
                  onChange={(e) =>
                    onPatchTerrain({ waves: Number(e.target.value) })
                  }
                  title="Rebuilds sine hills — more waves, rougher ground"
                />
                <span className="muted">
                  {(environment.terrain?.waves ?? TERRAIN_DEFAULT_WAVES).toFixed(1)}
                </span>
              </label>
            </div>
          )}
          <p className="hint muted">
            Draw hills on the canvas, or generate sine ground. Difficulty scales
            height; frequency rebuilds the sine. Drag Start / End dots to cover
            more ground.
          </p>
        </div>
      )}

      <div className="dock-col">
        <h3 className="subhead">Edit</h3>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={snapEnabled}
            onChange={(e) => onSnapChange(e.target.checked)}
          />
          Snap to grid
        </label>
        <p className="hint muted" style={{ marginTop: '0.2rem' }}>
          Drag a box to multi-select. D duplicate · R rotate 90°. Stairs: drag
          left or right so the lowest step sits on that side.
        </p>
        <div className="button-row wrap" style={{ marginTop: '0.35rem' }}>
          <button type="button" onClick={onUndo} disabled={undoDisabled}>
            Undo
          </button>
          <button
            type="button"
            disabled={selection.length === 0 || !onDuplicateSelected}
            onClick={onDuplicateSelected}
            title="Duplicate selection (D)"
          >
            Duplicate
          </button>
          <button
            type="button"
            disabled={selection.length === 0 || !onRotateSelected}
            onClick={onRotateSelected}
            title="Rotate selection −90° (R)"
          >
            Rotate
          </button>
          <button
            type="button"
            className="danger-ghost"
            disabled={selection.length === 0}
            onClick={onDeleteSelected}
            title={
              primary?.kind === 'spawn'
                ? 'Reset spawn to (0, 0)'
                : 'Remove selection'
            }
          >
            {primary?.kind === 'spawn' ? 'Reset spawn' : 'Delete'}
          </button>
          {isFeatureEnabled('launchTower') && (
            <button
              type="button"
              disabled={!environment.tower}
              onClick={onClearTower}
            >
              Clear tower
            </button>
          )}
          <button
            type="button"
            className="danger-ghost"
            onClick={() => {
              const empty =
                environment.obstacles.length === 0 &&
                !(environment.regions && environment.regions.length > 0) &&
                !(environment.markers && environment.markers.length > 0) &&
                !environment.terrain &&
                !environment.tower &&
                !environment.curriculum &&
                (environment.spawn?.x ?? 0) === 0 &&
                (environment.spawn?.y ?? 0) === 0;
              if (!empty) {
                const ok = window.confirm(
                  'Clear this course? Obstacles, terrain, markers, and scoring regions will be removed. Library saves are kept.',
                );
                if (!ok) return;
              }
              onClearAll();
            }}
            title="Remove all obstacles, regions, markers, terrain, tower, and curriculum; reset spawn"
          >
            Clear course
          </button>
        </div>
        <p className="hint muted" style={{ marginTop: '0.35rem' }}>
          {label}
        </p>
        </div>
      </div>
    </div>
  );
}
