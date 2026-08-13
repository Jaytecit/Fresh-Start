import type { TaskId } from '../brain/types';
import type { BestEverEntry } from '../library/bestEver';
import { inferSavedModelKind, goalTitleForTask } from '../library/fileVocabulary';
import type { SavedModel } from '../library/savedModels';

interface Props {
  task: TaskId;
  savedModels: SavedModel[];
  bestEverList: BestEverEntry[];
  evolving: boolean;
  onContinue: (m: SavedModel) => void;
  onDelete: (id: string) => void;
  /** H7 — load a saved dance brain into Disco freestyle (not Free evolve). */
  onLoadDanceFreestyle?: (m: SavedModel) => void;
  /** When set, only show brains whose body fingerprint matches. */
  bodyFingerprint?: string | null;
  /** Show the full best-ever ledger (all tasks), not only the active task. */
  showAllBestEver?: boolean;
}

function bodyFpFromModel(model: SavedModel): string {
  const i = model.designFingerprint.indexOf(':');
  return i >= 0 ? model.designFingerprint.slice(i + 1) : model.designFingerprint;
}

function bodyFpFromBest(entry: BestEverEntry): string {
  const i = entry.recipeFingerprint.indexOf(':');
  return i >= 0 ? entry.recipeFingerprint.slice(i + 1) : entry.recipeFingerprint;
}

/** B12 — model picker / models hub (Creatures tab). */
export function ModelsHub({
  task,
  savedModels,
  bestEverList,
  evolving,
  onContinue,
  onDelete,
  onLoadDanceFreestyle,
  bodyFingerprint = null,
  showAllBestEver = false,
}: Props) {
  const models = (bodyFingerprint
    ? savedModels.filter((m) => bodyFpFromModel(m) === bodyFingerprint)
    : savedModels
  ).filter((m) => inferSavedModelKind(m) === 'trained');
  const forTask = models.filter((m) => m.task === task);
  const others = models.filter((m) => m.task !== task);
  const danceModels = models.filter((m) => m.task === 'dance');
  const best = showAllBestEver
    ? bodyFingerprint
      ? bestEverList.filter((e) => bodyFpFromBest(e) === bodyFingerprint)
      : bestEverList
    : bestEverList.filter((e) => e.task === task);

  return (
    <section>
      <h2>Trained</h2>
      <p className="hint muted">
        {bodyFingerprint
          ? 'Trained creatures bound to this body. Use trained loads body + brain + goal.'
          : 'Trained creatures (body + brain + goal). Use trained loads them into the workspace.'}
      </p>

      {best.length > 0 && (
        <>
          <h3 className="subhead">
            {showAllBestEver ? 'Best ever' : `Best ever · ${task}`}
          </h3>
          <ul className="stats">
            {best.map((e) => (
              <li key={`${e.task}-${e.recipeFingerprint}`}>
                {e.task}: {e.fitness.toFixed(3)} · {e.designName}
              </li>
            ))}
          </ul>
        </>
      )}

      <h3 className="subhead">This goal · {goalTitleForTask(task)}</h3>
      {forTask.length === 0 ? (
        <p className="hint muted">No trained creatures for this goal.</p>
      ) : (
        <div className="button-col">
          {forTask.slice(0, 12).map((m) => (
            <div key={m.id} className="library-row">
              <button
                type="button"
                disabled={evolving}
                onClick={() =>
                  m.task === 'dance' && onLoadDanceFreestyle
                    ? onLoadDanceFreestyle(m)
                    : onContinue(m)
                }
                title={
                  m.task === 'dance'
                    ? `Load into Disco freestyle · fit ${m.fitness.toFixed(3)}`
                    : `Use trained · ${m.designName} · ${m.task} · fit ${m.fitness.toFixed(3)}`
                }
              >
                Use trained · {m.name}
                <span className="hint muted">
                  {' '}
                  · {goalTitleForTask(m.task)} · {m.fitness.toFixed(2)}
                  {m.designName ? ` · ${m.designName}` : ''}
                </span>
              </button>
              <button
                type="button"
                className="danger-ghost"
                onClick={() => onDelete(m.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {onLoadDanceFreestyle && danceModels.length > 0 && task !== 'dance' && (
        <>
          <h3 className="subhead">Dance · load into Disco</h3>
          <p className="hint muted">
            Dance brains open freestyle in Disco (not Free evolve).
          </p>
          <div className="button-col">
            {danceModels.slice(0, 8).map((m) => (
              <div key={m.id} className="library-row">
                <button
                  type="button"
                  disabled={evolving}
                  onClick={() => onLoadDanceFreestyle(m)}
                  title={
                    m.danceMeta
                      ? `stage ${m.danceMeta.stage} · obs v${m.danceMeta.obsPackVersion}`
                      : 'Load dance freestyle'
                  }
                >
                  {m.name}
                  <span className="hint muted">
                    {m.danceMeta ? ` · ${m.danceMeta.stage}` : ' · dance'}
                  </span>
                </button>
                <button
                  type="button"
                  className="danger-ghost"
                  onClick={() => onDelete(m.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {others.length > 0 && (
        <>
          <h3 className="subhead">Other goals</h3>
          <div className="button-col">
            {others.slice(0, 12).map((m) => (
              <div key={m.id} className="library-row">
                <button
                  type="button"
                  disabled={evolving}
                  onClick={() => onContinue(m)}
                title={`Use trained · ${m.designName} · ${m.task} · fit ${m.fitness.toFixed(3)}`}
              >
                Use trained · {m.name}
                <span className="hint muted">
                  {' '}
                  · {goalTitleForTask(m.task)} · {m.fitness.toFixed(2)}
                  {m.designName ? ` · ${m.designName}` : ''}
                </span>
                </button>
                <button
                  type="button"
                  className="danger-ghost"
                  onClick={() => onDelete(m.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
