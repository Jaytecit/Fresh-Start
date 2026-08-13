import { useMemo, useState } from 'react';
import {
  SECRET_CATEGORIES,
  SECRET_GOALS,
  type SecretGoalCategory,
  type SecretGoalDefinition,
  type SecretGoalFlavor,
} from '../secrets/definitions';
import type { SecretGoalDiscovery } from '../secrets/progress';

interface Props {
  discoveries: SecretGoalDiscovery[];
}

function flavorClass(flavor: SecretGoalFlavor): string {
  return `trophy-flavor trophy-flavor-${flavor}`;
}

function categoryLabel(category: SecretGoalCategory | 'all'): string {
  if (category === 'all') return 'All shelves';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function flavorLabel(flavor: SecretGoalFlavor): string {
  return flavor.charAt(0).toUpperCase() + flavor.slice(1);
}

/** B11 / E5.5 — full-bleed Trophy Room (no sidebar / canvas). */
export function TrophyCabinet({ discoveries }: Props) {
  const [category, setCategory] = useState<SecretGoalCategory | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const found = useMemo(
    () => new Map(discoveries.map((d) => [d.secretGoalId, d])),
    [discoveries],
  );
  const n = discoveries.length;
  const total = SECRET_GOALS.length;
  const progress = total > 0 ? Math.round((n / total) * 100) : 0;

  const visible =
    category === 'all'
      ? SECRET_GOALS
      : SECRET_GOALS.filter((def) => def.category === category);

  const selectedDef: SecretGoalDefinition | undefined = selectedId
    ? SECRET_GOALS.find((g) => g.id === selectedId)
    : visible.find((g) => found.has(g.id)) ?? visible[0];
  const selectedEntry = selectedDef ? found.get(selectedDef.id) : undefined;
  const selectedUnlocked = !!selectedEntry;

  return (
    <div className="trophy-room">
      <div className="trophy-room-atmosphere" aria-hidden />
      <header className="trophy-room-header">
        <div className="trophy-room-brand">
          <p className="trophy-room-eyebrow">Solemn Sandbox</p>
          <h1>Trophies</h1>
          <p className="trophy-room-lede">
            Hidden goals unlocked while training and experimenting. Locked
            plaques stay silent until earned.
          </p>
        </div>
        <div className="trophy-room-progress" aria-label="Discovery progress">
          <span className="trophy-room-count">
            {n}
            <span className="muted"> / {total}</span>
          </span>
          <div className="trophy-room-bar">
            <div
              className="trophy-room-bar-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="hint muted">{progress}% collected</span>
        </div>
      </header>

      <div className="trophy-filters trophy-room-filters" role="tablist">
        <button
          type="button"
          className={category === 'all' ? 'active' : undefined}
          onClick={() => setCategory('all')}
        >
          All ({n}/{total})
        </button>
        {SECRET_CATEGORIES.map((cat) => {
          const catTotal = SECRET_GOALS.filter((g) => g.category === cat).length;
          const catFound = SECRET_GOALS.filter(
            (g) => g.category === cat && found.has(g.id),
          ).length;
          return (
            <button
              key={cat}
              type="button"
              className={category === cat ? 'active' : undefined}
              onClick={() => setCategory(cat)}
            >
              {categoryLabel(cat)} ({catFound}/{catTotal})
            </button>
          );
        })}
      </div>

      <div className="trophy-room-body">
        <div className="trophy-shelf" role="list">
          {visible.map((def) => {
            const entry = found.get(def.id);
            const unlocked = !!entry;
            const active = selectedDef?.id === def.id;
            return (
              <button
                key={def.id}
                type="button"
                role="listitem"
                className={
                  unlocked
                    ? `trophy-plaque unlocked ${flavorClass(def.flavor)}${active ? ' selected' : ''}`
                    : `trophy-plaque locked${active ? ' selected' : ''}`
                }
                onClick={() => setSelectedId(def.id)}
                title={
                  unlocked
                    ? def.title
                    : 'Locked secret trophy'
                }
              >
                <span className="trophy-plaque-mark" aria-hidden>
                  {unlocked ? '◆' : '◇'}
                </span>
                <span className="trophy-title">
                  {unlocked ? def.title : '???'}
                </span>
                <span className="trophy-meta">
                  {unlocked
                    ? `${def.category} · ${flavorLabel(def.flavor)}`
                    : 'Sealed'}
                </span>
              </button>
            );
          })}
        </div>

        {selectedDef && (
          <aside className="trophy-room-detail">
            <p className="trophy-room-eyebrow">
              {selectedUnlocked ? 'On display' : 'Still sealed'}
            </p>
            <h2>{selectedUnlocked ? selectedDef.title : 'Unknown plaque'}</h2>
            {selectedUnlocked ? (
              <>
                <p className="trophy-room-detail-desc">
                  {selectedDef.description}
                </p>
                <ul className="trophy-room-detail-meta">
                  <li>
                    <span className="muted">Shelf</span>{' '}
                    {categoryLabel(selectedDef.category)}
                  </li>
                  <li>
                    <span className="muted">Flavor</span>{' '}
                    {flavorLabel(selectedDef.flavor)}
                  </li>
                  {selectedEntry?.discoveredAt && (
                    <li>
                      <span className="muted">Found</span>{' '}
                      {selectedEntry.discoveredAt.slice(0, 10)}
                    </li>
                  )}
                  {selectedEntry?.activeTask && (
                    <li>
                      <span className="muted">During</span>{' '}
                      {selectedEntry.activeTask}
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <p className="trophy-room-detail-desc muted">
                Keep experimenting. This plaque reveals itself when the right
                mishap, triumph, or disaster finds you.
              </p>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
