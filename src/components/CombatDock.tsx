import {
  BOXING_DIVISIONS,
  type BoxingDivisionId,
} from '../boxing/divisions';
import {
  BOXOBOT_V2T_FITNESS,
  sparringOpponentLabel,
  sparringOpponentsForDivision,
} from '../boxing/sparringOpponents';
import {
  JOUSTING_DIVISIONS,
  type JoustingDivisionId,
} from '../jousting/eligibility';
import {
  joustSparringOpponentLabel,
  joustSparringOpponentsForDivision,
} from '../jousting/sparringOpponents';
import {
  RACE_DIVISIONS,
  type RaceDivisionId,
} from '../race/divisions';
import { GOAL_CATALOG, type GoalId } from '../goals/catalog';
import type { SavedModel } from '../library/savedModels';
import {
  combatCornerKey,
  parseCombatCornerKey,
  type CombatCornerValue,
  type CombatMode,
} from '../combat/types';
import {
  COMBAT_ROUND_COUNTS,
  roundLengthLabel,
  roundSecondsOptions,
} from '../combat/format';
import type { BoxingMatchResult, HeadToHeadResult, JoustMatchResult } from '../sim/simulation';

interface Props {
  mode: CombatMode;
  onModeChange: (mode: CombatMode) => void;
  cornerA: CombatCornerValue;
  cornerB: CombatCornerValue;
  onCornerAChange: (value: CombatCornerValue) => void;
  onCornerBChange: (value: CombatCornerValue) => void;
  workspaceReady: boolean;
  workspaceLabel: string;
  boxingModels: SavedModel[];
  joustingModels: SavedModel[];
  raceModels: SavedModel[];
  divisionId: BoxingDivisionId;
  onDivisionChange: (id: BoxingDivisionId) => void;
  joustingDivisionId: JoustingDivisionId;
  onJoustingDivisionChange: (id: JoustingDivisionId) => void;
  raceDivisionId: RaceDivisionId;
  onRaceDivisionChange: (id: RaceDivisionId) => void;
  raceGoalId: GoalId;
  onRaceGoalChange: (id: GoalId) => void;
  useCurrentEnv: boolean;
  onUseCurrentEnvChange: (on: boolean) => void;
  envName: string;
  busy: boolean;
  boxingRunning: boolean;
  joustingRunning: boolean;
  raceRunning: boolean;
  boxingProgress: {
    episodeT: number;
    episodeDuration: number;
    points: [number, number];
    countRemaining?: [number, number];
    down?: [boolean, boolean];
    reason?: string | null;
    roundIndex?: number;
    roundCount?: number;
  } | null;
  joustingProgress: {
    episodeT: number;
    episodeDuration: number;
    totals: [number, number];
    phase: string;
    roundIndex?: number;
    roundCount?: number;
  } | null;
  raceProgress: {
    episodeT: number;
    episodeDuration: number;
    roundIndex?: number;
    roundCount?: number;
  } | null;
  lastBoxing: BoxingMatchResult | null;
  lastJoust: JoustMatchResult | null;
  lastRace: HeadToHeadResult | null;
  rounds: number;
  onRoundsChange: (n: number) => void;
  roundSeconds: number;
  onRoundSecondsChange: (n: number) => void;
  onStart: () => void;
  onStop: () => void;
  sloMo: boolean;
  onSloMoChange: (on: boolean) => void;
  collapsed?: boolean;
}

function CornerSelect({
  label,
  value,
  onChange,
  workspaceReady,
  workspaceLabel,
  saved,
  house,
  disabled,
}: {
  label: string;
  value: CombatCornerValue;
  onChange: (value: CombatCornerValue) => void;
  workspaceReady: boolean;
  workspaceLabel: string;
  saved: SavedModel[];
  house: { id: string; label: string }[];
  disabled: boolean;
}) {
  return (
    <label className="field-row">
      <span>{label}</span>
      <select
        value={combatCornerKey(value)}
        disabled={disabled}
        onChange={(e) => {
          const next = parseCombatCornerKey(e.target.value);
          if (next) onChange(next);
        }}
      >
        <option value="workspace" disabled={!workspaceReady}>
          {workspaceReady
            ? `This workspace · ${workspaceLabel}`
            : 'This workspace (train a brain first)'}
        </option>
        {house.map((h) => (
          <option key={h.id} value={`house:${h.id}`}>
            {h.label}
          </option>
        ))}
        {saved.map((m) => (
          <option key={m.id} value={`saved:${m.id}`}>
            {m.name} · {m.fitness.toFixed(2)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Bottom-dock match controls for Race / Boxing / Joust. */
export function CombatDock({
  mode,
  onModeChange,
  cornerA,
  cornerB,
  onCornerAChange,
  onCornerBChange,
  workspaceReady,
  workspaceLabel,
  boxingModels,
  joustingModels,
  raceModels,
  divisionId,
  onDivisionChange,
  joustingDivisionId,
  onJoustingDivisionChange,
  raceDivisionId,
  onRaceDivisionChange,
  raceGoalId,
  onRaceGoalChange,
  useCurrentEnv,
  onUseCurrentEnvChange,
  envName,
  busy,
  boxingRunning,
  joustingRunning,
  raceRunning,
  boxingProgress,
  joustingProgress,
  raceProgress,
  lastBoxing,
  lastJoust,
  lastRace,
  rounds,
  onRoundsChange,
  roundSeconds,
  onRoundSecondsChange,
  onStart,
  onStop,
  sloMo,
  onSloMoChange,
  collapsed,
}: Props) {
  const running =
    (mode === 'boxing' && boxingRunning) ||
    (mode === 'joust' && joustingRunning) ||
    (mode === 'race' && raceRunning);
  const locked = busy || running;

  const boxingHouse = sparringOpponentsForDivision(divisionId).map((item) => ({
    id: item.id,
    label: `Level ${item.level} · ${sparringOpponentLabel(item.id, divisionId)}${
      item.id === 'boxobot-v2t' ? ` · ${BOXOBOT_V2T_FITNESS.toFixed(0)}` : ''
    }`,
  }));
  const joustHouse = joustSparringOpponentsForDivision(joustingDivisionId).map(
    (item) => ({
      id: item.id,
      label: `Level ${item.level} · ${joustSparringOpponentLabel(item.id, workspaceLabel)}`,
    }),
  );

  const saved =
    mode === 'boxing' ? boxingModels : mode === 'joust' ? joustingModels : raceModels;
  const house = mode === 'boxing' ? boxingHouse : mode === 'joust' ? joustHouse : [];

  let live = '';
  const roundBit = (index?: number, count?: number) =>
    index && count && count > 1 ? `R${index}/${count} · ` : '';
  if (mode === 'boxing' && boxingRunning && boxingProgress) {
    const count = boxingProgress.countRemaining;
    const down = boxingProgress.down;
    const countBit =
      down && count && (down[0] || down[1])
        ? ` · count ${down[0] ? `A ${count[0]}` : ''}${down[0] && down[1] ? ' / ' : ''}${down[1] ? `B ${count[1]}` : ''}`
        : '';
    live = `${roundBit(boxingProgress.roundIndex, boxingProgress.roundCount)}${boxingProgress.episodeT.toFixed(1)} / ${boxingProgress.episodeDuration.toFixed(0)}s · A ${boxingProgress.points[0]}–${boxingProgress.points[1]} B${countBit}`;
  } else if (mode === 'joust' && joustingRunning && joustingProgress) {
    live = `${roundBit(joustingProgress.roundIndex, joustingProgress.roundCount)}${joustingProgress.phase} · ${joustingProgress.episodeT.toFixed(1)}s · A ${joustingProgress.totals[0].toFixed(1)} · B ${joustingProgress.totals[1].toFixed(1)}`;
  } else if (mode === 'race' && raceRunning && raceProgress) {
    live = `${roundBit(raceProgress.roundIndex, raceProgress.roundCount)}Heat ${raceProgress.episodeT.toFixed(1)}s / ${raceProgress.episodeDuration.toFixed(0)}s`;
  }

  if (collapsed) {
    return (
      <div className="dock-summary">
        <div className="button-row">
          {running ? (
            <button type="button" onClick={onStop}>
              Stop
            </button>
          ) : (
            <button type="button" className="primary" disabled={busy} onClick={onStart}>
              Start
            </button>
          )}
          <button
            type="button"
            className={sloMo ? 'active' : ''}
            disabled={busy}
            aria-pressed={sloMo}
            aria-label="Slo-Mo 0.25 times normal speed"
            title="Slo-Mo · 0.25×"
            onClick={() => onSloMoChange(!sloMo)}
          >
            Slo-Mo
          </button>
        </div>
        <span className="dock-summary-stats">
          {live ||
            (mode === 'boxing' ? 'Boxing' : mode === 'joust' ? 'Joust' : 'Race')}
        </span>
      </div>
    );
  }

  return (
    <div className="dock-full combat-dock">
      <div className="combat-dock-grid">
        <div className="combat-dock-mode">
          <h3 className="subhead">Mode</h3>
          <div className="button-row wrap">
            {(
              [
                ['race', 'Race'],
                ['boxing', 'Boxing'],
                ['joust', 'Joust'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={mode === id ? 'active' : ''}
                disabled={locked}
                onClick={() => onModeChange(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'boxing' && (
            <label className="field-row" style={{ marginTop: '0.4rem' }}>
              <span>Division</span>
              <select
                value={divisionId}
                disabled={locked}
                onChange={(e) =>
                  onDivisionChange(e.target.value as BoxingDivisionId)
                }
              >
                {BOXING_DIVISIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {mode === 'joust' && (
            <label className="field-row" style={{ marginTop: '0.4rem' }}>
              <span>Division</span>
              <select
                value={joustingDivisionId}
                disabled={locked}
                onChange={(e) =>
                  onJoustingDivisionChange(e.target.value as JoustingDivisionId)
                }
              >
                {JOUSTING_DIVISIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {mode === 'race' && (
            <>
              <label className="field-row" style={{ marginTop: '0.4rem' }}>
                <span>Division</span>
                <select
                  value={raceDivisionId}
                  disabled={locked}
                  onChange={(e) =>
                    onRaceDivisionChange(e.target.value as RaceDivisionId)
                  }
                >
                  {RACE_DIVISIONS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-row" style={{ marginTop: '0.4rem' }}>
                <span>Goal</span>
                <select
                  value={raceGoalId}
                  disabled={locked}
                  onChange={(e) => onRaceGoalChange(e.target.value as GoalId)}
                >
                  {GOAL_CATALOG.filter(
                    (g) => g.id !== 'dance' && g.id !== 'boxing' && g.id !== 'jousting',
                  ).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={useCurrentEnv}
                  disabled={locked}
                  onChange={(e) => onUseCurrentEnvChange(e.target.checked)}
                />
                <span>Use current environment ({envName})</span>
              </label>
            </>
          )}
        </div>
        <div className="combat-dock-corners">
          <h3 className="subhead">Corners</h3>
          <CornerSelect
            label="Corner A"
            value={cornerA}
            onChange={onCornerAChange}
            workspaceReady={workspaceReady}
            workspaceLabel={workspaceLabel}
            saved={saved}
            house={house}
            disabled={locked}
          />
          <CornerSelect
            label="Corner B"
            value={cornerB}
            onChange={onCornerBChange}
            workspaceReady={workspaceReady}
            workspaceLabel={workspaceLabel}
            saved={saved}
            house={house}
            disabled={locked}
          />
        </div>
        <div className="combat-dock-run">
          <h3 className="subhead">Match</h3>
          <label className="field-row">
            <span>Rounds</span>
            <select
              value={rounds}
              disabled={locked}
              onChange={(e) => onRoundsChange(Number(e.target.value))}
              aria-label="Number of rounds"
            >
              {COMBAT_ROUND_COUNTS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="field-row">
            <span>{roundLengthLabel(mode)}</span>
            <select
              value={roundSeconds}
              disabled={locked}
              onChange={(e) => onRoundSecondsChange(Number(e.target.value))}
              aria-label={roundLengthLabel(mode)}
            >
              {roundSecondsOptions(mode).map((s) => (
                <option key={s} value={s}>
                  {s}s
                </option>
              ))}
            </select>
          </label>
          <div className="button-row">
            {running ? (
              <button type="button" onClick={onStop}>
                Stop
              </button>
            ) : (
              <button
                type="button"
                className="primary"
                disabled={busy}
                onClick={onStart}
              >
                {mode === 'joust' ? 'Start pass' : 'Start match'}
              </button>
            )}
            <button
              type="button"
              className={sloMo ? 'active' : ''}
              disabled={busy}
              aria-pressed={sloMo}
              aria-label="Slo-Mo 0.25 times normal speed"
              title="Slo-Mo · 0.25×"
              onClick={() => onSloMoChange(!sloMo)}
            >
              Slo-Mo
            </button>
          </div>
          {live && <p className="hint">{live}</p>}
          {mode === 'boxing' && lastBoxing && !boxingRunning && (
            <p className="hint">
              Result · A {lastBoxing.score.fighters[0].points}–
              {lastBoxing.score.fighters[1].points} B ·{' '}
              {lastBoxing.winner === null
                ? 'draw'
                : `corner ${lastBoxing.winner === 0 ? 'A' : 'B'} wins`}
              {lastBoxing.reason === 'tko'
                ? ' by TKO'
                : lastBoxing.reason === 'count-out'
                  ? ' by count-out'
                  : ''}
            </p>
          )}
          {mode === 'joust' && lastJoust && !joustingRunning && (
            <p className="hint">
              {lastJoust.winner === null
                ? 'Draw'
                : lastJoust.winner === 0
                  ? 'A wins'
                  : 'B wins'}{' '}
              · {lastJoust.reason}
            </p>
          )}
          {mode === 'race' && lastRace && !raceRunning && (
            <p className="hint">
              A {lastRace.fitness[0].toFixed(3)}
              {lastRace.fitness[0] >= lastRace.fitness[1] ? ' · winner' : ''}
              {' · '}
              B {lastRace.fitness[1].toFixed(3)}
              {lastRace.fitness[1] > lastRace.fitness[0] ? ' · winner' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
