import { useMemo, useState } from 'react';
import { joustingEligibility } from '../jousting/eligibility';
import {
  DEFAULT_JOUST_SPARRING_ID,
  JOUST_SPARRING_OPPONENTS,
  joustSparringOpponentLabel,
  joustSparringSelectValue,
  parseJoustSparringSelectValue,
  type JoustSparringId,
} from '../jousting/sparringOpponents';
import type { CreatureDesign } from '../creature/types';
import { BUNDLED_MODELS } from '../library/bundledModels';
import type { CreaturePackage } from '../library/creaturePackages';
import {
  designCandidatePool,
  resolveDesignForModel,
} from '../library/resolveModelDesign';
import type { SavedModel } from '../library/savedModels';
import { shapeForJoustingDesign, type JoustMatchResult } from '../sim/simulation';

export type JoustMatchOpponent =
  | { kind: 'saved'; model: SavedModel }
  | { kind: 'sparring'; id: JoustSparringId };

interface Props {
  currentDesign: CreatureDesign;
  savedModels: SavedModel[];
  packages: CreaturePackage[];
  busy: boolean;
  running: boolean;
  progress: {
    episodeT: number;
    episodeDuration: number;
    totals: [number, number];
    phase: string;
  } | null;
  lastResult: JoustMatchResult | null;
  onStartMatch: (options: {
    modelA: SavedModel;
    opponent: JoustMatchOpponent;
  }) => void;
  onStopMatch: () => void;
  onOpenTrain: () => void;
}

export function JoustingSkillPanel({
  currentDesign,
  savedModels,
  packages,
  busy,
  running,
  progress,
  lastResult,
  onStartMatch,
  onStopMatch,
  onOpenTrain,
}: Props) {
  const [modelAId, setModelAId] = useState('');
  const [fighterBValue, setFighterBValue] = useState(
    joustSparringSelectValue(DEFAULT_JOUST_SPARRING_ID),
  );
  const currentEligibility = joustingEligibility(currentDesign);
  const pool = useMemo(
    () => designCandidatePool(packages, BUNDLED_MODELS, currentDesign),
    [packages, currentDesign],
  );
  const eligibleModels = savedModels.filter((model) => {
    if (
      model.task !== 'jousting' ||
      model.joustingMeta?.ruleVersion !== 1 ||
      model.joustingMeta.obsPackVersion !== 1 ||
      model.joustingMeta.brainHz !== 30
    ) {
      return false;
    }
    const design = model.joustingDesign ?? resolveDesignForModel(model, pool);
    if (!design || !joustingEligibility(design).eligible) return false;
    const expected = shapeForJoustingDesign(design);
    return (
      expected.inputCount === model.shape.inputCount &&
      expected.outputCount === model.shape.outputCount &&
      expected.weightCount === model.shape.weightCount
    );
  });
  const modelA = eligibleModels.find((model) => model.id === modelAId);
  const sparringB = parseJoustSparringSelectValue(fighterBValue);
  const modelB = eligibleModels.find((model) => model.id === fighterBValue);
  const opponent: JoustMatchOpponent | null = sparringB
    ? { kind: 'sparring', id: sparringB }
    : modelB
      ? { kind: 'saved', model: modelB }
      : null;
  const sameSavedFighters =
    opponent?.kind === 'saved' && modelA?.id === opponent.model.id;
  const winnerLabel =
    lastResult == null
      ? null
      : lastResult.winner === null
        ? 'Draw'
        : lastResult.winner === 0
          ? 'A wins'
          : 'B wins';

  return (
    <div className="h2h-panel">
      <h2>Jousting</h2>
      <p className="hint muted">
        Single-pass charges from opposite ends of a long lane. The scorecard
        (lance hit, stay up, unhorse, knockback) is the match result and the
        training reward. Mark a lance tip and at least one target or head.
      </p>

      <h3 className="subhead">Current jouster</h3>
      {currentEligibility.eligible ? (
        <p className="hint">
          Eligible · mass {currentEligibility.metrics.totalMass.toFixed(2)} ·{' '}
          {currentEligibility.metrics.lances} lance ·{' '}
          {currentEligibility.metrics.targets} targets
        </p>
      ) : (
        <ul className="stats">
          {currentEligibility.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      <label className="field-row">
        <span>Jouster A</span>
        <select
          value={modelAId}
          disabled={busy || running}
          onChange={(event) => setModelAId(event.target.value)}
        >
          <option value="">Saved jousting brain…</option>
          {eligibleModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field-row">
        <span>Jouster B</span>
        <select
          value={fighterBValue}
          disabled={busy || running}
          onChange={(event) => setFighterBValue(event.target.value)}
        >
          {JOUST_SPARRING_OPPONENTS.map((item) => (
            <option key={item.id} value={joustSparringSelectValue(item.id)}>
              Level {item.level} ·{' '}
              {joustSparringOpponentLabel(item.id, currentDesign.name)}
            </option>
          ))}
          {eligibleModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
      </label>

      {progress && (
        <p className="hint">
          {progress.phase} · {progress.episodeT.toFixed(1)}s /{' '}
          {progress.episodeDuration.toFixed(1)}s · A{' '}
          {progress.totals[0].toFixed(1)} · B {progress.totals[1].toFixed(1)}
        </p>
      )}
      {winnerLabel && lastResult && (
        <p className="hint">
          {winnerLabel} · {lastResult.reason} · A{' '}
          {lastResult.scorecard.fighters[0].total.toFixed(1)} · B{' '}
          {lastResult.scorecard.fighters[1].total.toFixed(1)}
        </p>
      )}

      <div className="row-actions" style={{ marginTop: '0.65rem' }}>
        {running ? (
          <button type="button" onClick={onStopMatch}>
            Stop pass
          </button>
        ) : (
          <button
            type="button"
            className="primary"
            disabled={busy || !modelA || !opponent || sameSavedFighters}
            onClick={() => {
              if (!modelA || !opponent) return;
              onStartMatch({ modelA, opponent });
            }}
          >
            Start pass
          </button>
        )}
        <button type="button" disabled={busy || running} onClick={onOpenTrain}>
          Open Train
        </button>
      </div>
      {sameSavedFighters && (
        <p className="hint muted">Pick two different saved brains, or a dummy.</p>
      )}
    </div>
  );
}
