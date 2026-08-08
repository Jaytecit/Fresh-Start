import { clampCourseMarker } from '../brain/courseMarkers';
import { isFeatureEnabled } from '../port/featureFlags';
import {
  PLACE_MARKER_TOOLS,
  PLACE_OBSTACLE_TOOLS,
  PLACE_REGION_TOOLS,
  type EnvSelection,
  type EnvTool,
} from '../env/envSelection';
import { selectionLabel } from '../env/envEditOps';
import type { EnvironmentDesign, EnvCourseMarker } from '../env/types';

interface Props {
  tool: EnvTool;
  onToolChange: (tool: EnvTool) => void;
  snapEnabled: boolean;
  onSnapChange: (snap: boolean) => void;
  environment: EnvironmentDesign;
  selection: EnvSelection;
  onSelect: (sel: EnvSelection) => void;
  onPatchMarker: (id: string, patch: Partial<EnvCourseMarker>) => void;
  onDeleteSelected: () => void;
  onUndo: () => void;
  undoDisabled: boolean;
  onSineTerrain: () => void;
  onClearTerrain: () => void;
  onClearTower: () => void;
  collapsed?: boolean;
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

/** World bottom dock — tools under the Environment Studio canvas. */
export function WorldDock({
  tool,
  onToolChange,
  snapEnabled,
  onSnapChange,
  environment,
  selection,
  onSelect,
  onPatchMarker,
  onDeleteSelected,
  onUndo,
  undoDisabled,
  onSineTerrain,
  onClearTerrain,
  onClearTower,
  collapsed,
}: Props) {
  const label = selectionLabel(environment, selection);
  const markers = orderedMarkers(environment);
  const selectedMarker =
    selection?.kind === 'marker'
      ? markers.find((m) => m.id === selection.id) ?? null
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
          {PLACE_OBSTACLE_TOOLS.map((t) => (
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
        </div>
        <span className="dock-summary-stats">{label}</span>
      </div>
    );
  }

  return (
    <div className="dock-full">
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
            PLACE_OBSTACLE_TOOLS.map((t) => (
              <button
                key={t}
                type="button"
                className={tool === t ? 'active' : ''}
                onClick={() => onToolChange(t)}
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
                    ? 'Start marker — arms the course'
                    : t === 'checkpoint'
                      ? 'Checkpoint — must hit in order'
                      : 'Finish marker — completion when armed'
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
        </div>
        <p className="hint muted">
          Ramp: drag start→end (snaps flush to ground / object edges). Other
          tools: click to place · drag to move · handles resize · Alt/Space pan ·
          Del remove (spawn resets to origin). Penalty = time in zone; reward =
          touch once. Markers = start / checkpoint / finish course gates.
        </p>
      </div>

      {isFeatureEnabled('courseMarkers') && (
        <div className="dock-col">
          <h3 className="subhead">Markers</h3>
          {markers.length === 0 ? (
            <p className="hint muted">No course markers yet — use + start / checkpoint / finish.</p>
          ) : (
            <div className="button-row wrap marker-list">
              {markers.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={
                    selection?.kind === 'marker' && selection.id === m.id
                      ? 'active'
                      : ''
                  }
                  onClick={() => {
                    onToolChange('select');
                    onSelect({ kind: 'marker', id: m.id });
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
              <p className="hint muted" style={{ marginTop: '0.35rem' }}>
                Drag on canvas or edit numbers. Gates are score-only boxes
                (joint center must enter).
              </p>
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
          <p className="hint muted">
            Drag the Start / End dots on the hills to cover more or less ground.
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
        <div className="button-row wrap" style={{ marginTop: '0.35rem' }}>
          <button type="button" onClick={onUndo} disabled={undoDisabled}>
            Undo
          </button>
          <button
            type="button"
            className="danger-ghost"
            disabled={!selection}
            onClick={onDeleteSelected}
            title={
              selection?.kind === 'spawn'
                ? 'Reset spawn to (0, 0)'
                : 'Remove selection'
            }
          >
            {selection?.kind === 'spawn' ? 'Reset spawn' : 'Delete'}
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
        </div>
        <p className="hint muted" style={{ marginTop: '0.35rem' }}>
          {label}
        </p>
      </div>
    </div>
  );
}
