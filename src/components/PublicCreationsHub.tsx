import { useCallback, useEffect, useState } from 'react';
import type { GalleryEntry } from '../library/galleryTypes';
import {
  absoluteShareUrl,
  fetchGallery,
  sharePagePath,
} from '../library/shareApi';

interface Props {
  evolving: boolean;
  onOpen: (id: string) => void;
}

function taskLabel(task: string): string {
  return task
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** C7 — Public creations gallery (opt-in listed shares). */
export function PublicCreationsHub({ evolving, onOpen }: Props) {
  const [entries, setEntries] = useState<GalleryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await fetchGallery();
    if (!result.ok) {
      setEntries([]);
      setError(result.error);
      setLoading(false);
      return;
    }
    setEntries(result.entries);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <section className="public-creations-hub">
      <div className="public-creations-head">
        <h2>Public creations</h2>
        <button
          type="button"
          disabled={loading}
          onClick={() => void refresh()}
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
      <p className="hint muted">
        Creatures others opted to list when sharing. Open loads into the
        workspace (your saved models stay untouched).
      </p>

      {error && <p className="share-dialog-error">{error}</p>}

      {!error && loading && entries.length === 0 && (
        <p className="hint muted">Loading public creations…</p>
      )}

      {!error && !loading && entries.length === 0 && (
        <p className="hint muted">
          No public creations yet. When you Share, tick “Also list in Public
          creations”.
        </p>
      )}

      {entries.length > 0 && (
        <div className="button-col">
          {entries.map((entry) => (
            <div key={entry.id} className="library-row public-creation-row">
              <button
                type="button"
                disabled={evolving}
                onClick={() => onOpen(entry.id)}
                title={`Open · ${taskLabel(entry.task)} · fit ${entry.fitness.toFixed(3)}`}
              >
                {entry.name.trim() || 'Creature'}
                <span className="hint muted">
                  {' '}
                  · {taskLabel(entry.task)} · {entry.fitness.toFixed(2)}
                </span>
              </button>
              <a
                className="button-link compact"
                href={sharePagePath(entry.id)}
                target="_blank"
                rel="noreferrer"
                title={absoluteShareUrl(entry.id)}
              >
                Page
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
