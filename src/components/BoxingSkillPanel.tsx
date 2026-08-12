import { useMemo, useState } from 'react';
import {
  BOXING_DIVISIONS,
  boxingEligibility,
  type BoxingDivisionId,
} from '../boxing/divisions';
import {
  BOXOBOT_V2T_FITNESS,
  DEFAULT_SPARRING_OPPONENT_ID,
  parseSparringSelectValue,
  sparringOpponentLabel,
  sparringOpponentsForDivision,
  sparringSelectValue,
  type SparringOpponentId,
} from '../boxing/sparringOpponents';
import type { CreatureDesign } from '../creature/types';
import { BUNDLED_MODELS } from '../library/bundledModels';
import type { CreaturePackage } from '../library/creaturePackages';
import {
  designCandidatePool,
  resolveDesignForModel,
} from '../library/resolveModelDesign';
import type { SavedModel } from '../library/savedModels';
import { shapeForBoxingDesign, type BoxingMatchResult } from '../sim/simulation';

export type BoxingMatchOpponent =
  | { kind: 'saved'; model: SavedModel }
  | { kind: 'sparring'; id: SparringOpponentId };

interface Props {
  currentDesign: CreatureDesign;
  savedModels: SavedModel[];
  packages: CreaturePackage[];
  divisionId: BoxingDivisionId;
  onDivisionChange: (divisionId: BoxingDivisionId) => void;
  busy: boolean;
  running: boolean;
  progress: {
    episodeT: number;
    episodeDuration: number;
    points: [number, number];
  } | null;
  lastResult: BoxingMatchResult | null;
  onStartMatch: (options: {
    modelA: SavedModel;
    opponent: BoxingMatchOpponent;
    divisionId: BoxingDivisionId;
  }) => void;
  onStopMatch: () => void;
  onOpenTrain: () => void;
}

function defaultFighterBValue(divisionId: BoxingDivisionId): string {
  const available = sparringOpponentsForDivision(divisionId);
  if (available.some((item) => item.id === 'boxobot-v2t')) {
    return sparringSelectValue('boxobot-v2t');
  }
  return sparringSelectValue(DEFAULT_SPARRING_OPPONENT_ID);
}

export function BoxingSkillPanel({
  currentDesign,
  savedModels,
  packages,
  divisionId,
  onDivisionChange,
  busy,
  running,
  progress,
  lastResult,
  onStartMatch,
  onStopMatch,
  onOpenTrain,
}: Props) {
  const [modelAId, setModelAId] = useState('');
  const [fighterBValue, setFighterBValue] = useState(() =>
    defaultFighterBValue(divisionId),
  );
  const division = BOXING_DIVISIONS.find((item) => item.id === divisionId)!;
  const currentEligibility = boxingEligibility(currentDesign, divisionId);
  const pool = useMemo(
    () => designCandidatePool(packages, BUNDLED_MODELS, currentDesign),
    [packages, currentDesign],
  );
  const eligibleModels = savedModels.filter((model) => {
    if (
      model.task !== 'boxing' ||
      model.boxingMeta?.divisionId !== divisionId ||
      model.boxingMeta.ruleVersion !== division.ruleVersion ||
      model.boxingMeta.obsPackVersion !== 2 ||
      model.boxingMeta.brainHz !== 30
    ) {
      return false;
    }
    const design = model.boxingDesign ?? resolveDesignForModel(model, pool);
    if (!design || !boxingEligibility(design, divisionId).eligible) return false;
    const expected = shapeForBoxingDesign(design);
    return (
      expected.inputCount === model.shape.inputCount &&
      expected.outputCount === model.shape.outputCount &&
      expected.weightCount === model.shape.weightCount
    );
  });
  const sparringOptions = sparringOpponentsForDivision(divisionId);
  const modelA = eligibleModels.find((model) => model.id === modelAId);
  const sparringB = parseSparringSelectValue(fighterBValue);
  const modelB = eligibleModels.find((model) => model.id === fighterBValue);
  const opponent: BoxingMatchOpponent | null = sparringB
    ? { kind: 'sparring', id: sparringB }
    : modelB
      ? { kind: 'saved', model: modelB }
      : null;
  const sameSavedFighters =
    opponent?.kind === 'saved' && modelA?.id === opponent.model.id;

  return (
    <div className="h2h-panel">
      <h2>Boxing</h2>
      <p className="hint muted">
        Timed points fights. Only marked gloves can score on an opponent&apos;s
        marked targets; ordinary body contacts remain non-solving. Train against
        Dummy (Level 1) or BoxoBot V2T (Level 2), then match a saved fighter
        against either bundled opponent without a second save.
      </p>

      <label className="field-row">
        <span>Division</span>
        <select
          value={divisionId}
          disabled={busy || running}
          onChange={(event) => {
            const next = event.target.value as BoxingDivisionId;
            onDivisionChange(next);
            setModelAId('');
            setFighterBValue(defaultFighterBValue(next));
          }}
        >
          {BOXING_DIVISIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · v{item.ruleVersion}
            </option>
          ))}
        </select>
      </label>
      <p className="hint muted">{division.description}</p>

      <h3 className="subhead">Current fighter</h3>
      {currentEligibility.eligible ? (
        <p className="hint">
          Eligible · mass {currentEligibility.metrics.totalMass.toFixed(2)} ·{' '}
          {currentEligibility.metrics.gloves} gloves ·{' '}
          {currentEligibility.metrics.targets} targets
        </p>
      ) : (
        <ul className="stats">
          {currentEligibility.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="primary"
        disabled={busy || running}
        onClick={onOpenTrain}
      >
        Open Train tab
      </button>

      <h3 className="subhead">Points match</h3>
      {eligibleModels.length < 1 ? (
        <p className="hint muted">
          Train and save a {division.name} fighter, then match it against Dummy
          or BoxoBot V2T.
        </p>
      ) : (
        <>
          <label className="field-row">
            <span>Fighter A</span>
            <select
              value={modelAId}
              disabled={busy || running}
              onChange={(event) => setModelAId(event.target.value)}
            >
              <option value="">Choose model</option>
              {eligibleModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} · {model.fitness.toFixed(2)}
                </option>
              ))}
            </select>
          </label>
          <label className="field-row">
            <span>Fighter B</span>
            <select
              value={fighterBValue}
              disabled={busy || running}
              onChange={(event) => setFighterBValue(event.target.value)}
            >
              {sparringOptions.map((item) => (
                <option key={item.id} value={sparringSelectValue(item.id)}>
                  Level {item.level} · {sparringOpponentLabel(item.id, divisionId)}
                  {item.id === 'boxobot-v2t'
                    ? ` · ${BOXOBOT_V2T_FITNESS.toFixed(0)}`
                    : ''}
                </option>
              ))}
              {eligibleModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} · {model.fitness.toFixed(2)}
                </option>
              ))}
            </select>
          </label>
          <div className="button-row">
            <button
              type="button"
              className="primary"
              disabled={busy || running || !modelA || !opponent || sameSavedFighters}
              onClick={() => {
                if (modelA && opponent) {
                  onStartMatch({ modelA, opponent, divisionId });
                }
              }}
            >
              Start match
            </button>
            {running && (
              <button type="button" onClick={onStopMatch}>
                Stop
              </button>
            )}
          </div>
        </>
      )}

      {running && progress && (
        <p className="hint">
          {progress.episodeT.toFixed(1)} / {progress.episodeDuration.toFixed(0)}s
          {' · '}A {progress.points[0]}–{progress.points[1]} B
        </p>
      )}
      {lastResult && !running && (
        <p className="hint">
          Result · A {lastResult.score.fighters[0].points}–{
            lastResult.score.fighters[1].points
          } B ·{' '}
          {lastResult.winner === null
            ? 'draw'
            : `fighter ${lastResult.winner === 0 ? 'A' : 'B'} wins`}
        </p>
      )}
    </div>
  );
}
