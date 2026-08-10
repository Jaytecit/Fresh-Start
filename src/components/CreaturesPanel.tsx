import { useMemo, useState } from 'react';
import type { TaskId } from '../brain/types';
import { DISCO_DANCER } from '../creature/discoDancer';
import { PRESETS } from '../creature/presets';
import { ULTI_GROOVE_BOT_II } from '../creature/ultiGrooveBotII';
import { cloneDesign, type CreatureDesign } from '../creature/types';
import type { BestEverEntry } from '../library/bestEver';
import { bodyFingerprint } from '../library/bestEver';
import type { CreaturePackage } from '../library/creaturePackages';
import { exportCreaturePackage } from '../library/creaturePackages';
import type { SavedModel } from '../library/savedModels';
import { isFeatureEnabled } from '../port/featureFlags';
import { SECRET_GOALS } from '../secrets/definitions';
import type { SecretGoalDiscovery } from '../secrets/progress';
import { CapabilityPanel } from './CapabilityPanel';
import { CreatureDesignPreview } from './CreatureDesignPreview';
import { ModelsHub } from './ModelsHub';

/** Preset-like bodies that are not in PRESETS[] (shown once under Presets). */
const EXTRA_PRESETS: CreatureDesign[] = [DISCO_DANCER, ULTI_GROOVE_BOT_II];

export type CreaturesBrowseKey =
  | 'current'
  | `preset:${string}`
  | `pkg:${string}`;

function findPresetByName(name: string): CreatureDesign | undefined {
  return (
    PRESETS.find((p) => p.name === name) ??
    EXTRA_PRESETS.find((p) => p.name === name)
  );
}

interface Props {
  currentDesign: CreatureDesign;
  packages: CreaturePackage[];
  savedModels: SavedModel[];
  bestEverList: BestEverEntry[];
  discoveries: SecretGoalDiscovery[];
  activeTask: TaskId;
  evolving: boolean;
  onOpenInEditor: (key: CreaturesBrowseKey) => void;
  onDeletePackage: (id: string) => void;
  onContinueModel: (m: SavedModel) => void;
  onDeleteModel: (id: string) => void;
  onLoadDanceFreestyle?: (m: SavedModel) => void;
  onDownloadText: (filename: string, text: string) => void;
}

function resolveBrowseDesign(
  key: CreaturesBrowseKey,
  current: CreatureDesign,
  packages: CreaturePackage[],
): { design: CreatureDesign; label: string; kind: string } | null {
  if (key === 'current') {
    return {
      design: current,
      label: current.name || 'Current',
      kind: 'Current design',
    };
  }
  if (key.startsWith('preset:')) {
    const preset = findPresetByName(key.slice('preset:'.length));
    if (!preset) return null;
    return { design: preset, label: preset.name, kind: 'Preset' };
  }
  if (key.startsWith('pkg:')) {
    const pkg = packages.find((p) => p.id === key.slice('pkg:'.length));
    if (!pkg) return null;
    return {
      design: {
        ...cloneDesign(pkg.design),
        appearance: pkg.appearance,
        name: pkg.displayName,
      },
      label: pkg.displayName,
      kind: 'Library',
    };
  }
  return null;
}

/** Full-bleed creature database / management room. */
export function CreaturesPanel({
  currentDesign,
  packages,
  savedModels,
  bestEverList,
  discoveries,
  activeTask,
  evolving,
  onOpenInEditor,
  onDeletePackage,
  onContinueModel,
  onDeleteModel,
  onLoadDanceFreestyle,
  onDownloadText,
}: Props) {
  const [browseKey, setBrowseKey] = useState<CreaturesBrowseKey>('current');

  const resolved = useMemo(
    () => resolveBrowseDesign(browseKey, currentDesign, packages),
    [browseKey, currentDesign, packages],
  );

  const selectedDesign = resolved?.design ?? currentDesign;
  const selectedFp = useMemo(
    () =>
      selectedDesign.joints.length > 0
        ? bodyFingerprint(selectedDesign)
        : null,
    [selectedDesign],
  );

  const selectedName = (
    resolved?.label ??
    selectedDesign.name ??
    ''
  ).trim();

  const bodyDiscoveries = useMemo(() => {
    if (!selectedName) return [];
    const lower = selectedName.toLowerCase();
    return discoveries.filter(
      (d) => d.modelName.trim().toLowerCase() === lower,
    );
  }, [discoveries, selectedName]);

  const pkgId =
    browseKey.startsWith('pkg:') ? browseKey.slice('pkg:'.length) : null;
  const selectedPkg = pkgId
    ? packages.find((p) => p.id === pkgId) ?? null
    : null;

  const pick = (key: CreaturesBrowseKey) => setBrowseKey(key);

  return (
    <div className="creatures-room">
      <header className="creatures-room-header">
        <div>
          <p className="creatures-room-eyebrow">Solemn Sandbox</p>
          <h1>Creatures</h1>
          <p className="creatures-room-lede">
            Browse bodies, stats, saved brains, and achievements. Open a design
            in the editor to change it; Train still runs live sessions.
          </p>
        </div>
      </header>

      <div className="creatures-room-body">
        <aside className="creatures-picker">
          <h3 className="subhead">Library</h3>
          <div className="button-col creatures-picker-list">
            <button
              type="button"
              className={browseKey === 'current' ? 'active' : ''}
              onClick={() => pick('current')}
            >
              Current · {currentDesign.name || 'Untitled'}
            </button>
          </div>

          <h3 className="subhead">Presets</h3>
          <div className="button-col creatures-picker-list">
            {[...PRESETS, ...EXTRA_PRESETS].map((p) => {
              const key = `preset:${p.name}` as const;
              return (
                <button
                  key={p.name}
                  type="button"
                  className={browseKey === key ? 'active' : ''}
                  onClick={() => pick(key)}
                >
                  {p.name}
                </button>
              );
            })}
          </div>

          {isFeatureEnabled('creaturePackages') && (
            <>
              <h3 className="subhead">Saved library</h3>
              {packages.length === 0 ? (
                <p className="hint muted">No saved packages yet.</p>
              ) : (
                <div className="button-col creatures-picker-list">
                  {packages.map((pkg) => {
                    const key = `pkg:${pkg.id}` as const;
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        className={browseKey === key ? 'active' : ''}
                        onClick={() => pick(key)}
                      >
                        {pkg.displayName}
                        {isFeatureEnabled('creatureLibrary')
                          ? ` (r${pkg.revision})`
                          : ''}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </aside>

        <section className="creatures-detail">
          <h2>
            {resolved?.label ?? 'Creature'}
            {resolved ? (
              <span className="hint muted"> · {resolved.kind}</span>
            ) : null}
          </h2>
          <CreatureDesignPreview
            design={selectedDesign}
            width={420}
            height={260}
          />
          <div className="button-row wrap" style={{ marginTop: '0.55rem' }}>
            <button
              type="button"
              disabled={selectedDesign.joints.length === 0}
              onClick={() => onOpenInEditor(browseKey)}
            >
              Open in editor
            </button>
            {selectedPkg && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onDownloadText(
                      `${selectedPkg.displayName
                        .replace(/\s+/g, '_')
                        .toLowerCase()}_package.json`,
                      exportCreaturePackage(selectedPkg),
                    )
                  }
                >
                  Export package
                </button>
                <button
                  type="button"
                  className="danger-ghost"
                  onClick={() => {
                    const ok = window.confirm(
                      `Delete library creature "${selectedPkg.displayName}"?`,
                    );
                    if (!ok) return;
                    onDeletePackage(selectedPkg.id);
                    setBrowseKey('current');
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>

          {selectedDesign.joints.length > 0 ? (
            <CapabilityPanel
              key={selectedFp ?? (selectedName || 'empty')}
              design={selectedDesign}
              defaultOpen
            />
          ) : (
            <p className="hint muted">No body to inspect.</p>
          )}

          {(isFeatureEnabled('discoveryUi') ||
            isFeatureEnabled('secretGoals')) && (
            <div style={{ marginTop: '0.65rem' }}>
              <h3 className="subhead">Achievements for this body</h3>
              {bodyDiscoveries.length === 0 ? (
                <p className="hint muted">
                  No trophies recorded under this name yet. Full shelves live in
                  Trophy room.
                </p>
              ) : (
                <ul className="stats">
                  {bodyDiscoveries.map((d) => {
                    const def = SECRET_GOALS.find(
                      (g) => g.id === d.secretGoalId,
                    );
                    return (
                      <li key={`${d.secretGoalId}-${d.discoveredAt}`}>
                        {def?.title ?? d.secretGoalId}
                        <span className="hint muted">
                          {' '}
                          · {d.activeTask}
                          {d.generation != null ? ` · gen ${d.generation}` : ''}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </section>

        {isFeatureEnabled('savedModels') && (
          <section className="creatures-careers">
            <ModelsHub
              task={activeTask}
              savedModels={savedModels}
              bestEverList={
                isFeatureEnabled('bestEverLedger') ? bestEverList : []
              }
              evolving={evolving}
              bodyFingerprint={selectedFp}
              showAllBestEver={isFeatureEnabled('bestEverLedger')}
              onContinue={onContinueModel}
              onDelete={onDeleteModel}
              onLoadDanceFreestyle={onLoadDanceFreestyle}
            />
          </section>
        )}
      </div>
    </div>
  );
}
