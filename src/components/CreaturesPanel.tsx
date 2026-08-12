import { useMemo, useState } from 'react';
import type { TaskId } from '../brain/types';
import { PRESETS } from '../creature/presets';
import { ULTI_GROOVE_BOT_II } from '../creature/ultiGrooveBotII';
import { cloneDesign, type CreatureDesign } from '../creature/types';
import type { BestEverEntry } from '../library/bestEver';
import { bodyFingerprint } from '../library/bestEver';
import type { CreaturePackage } from '../library/creaturePackages';
import {
  exportCreaturePackage,
  packageSkillOverride,
} from '../library/creaturePackages';
import { exportCreatureJson } from '../library/jsonIO';
import type { SavedModel } from '../library/savedModels';
import {
  FLYING_SUBCATEGORIES,
  SKILL_CATEGORIES,
  inferSkillPlacement,
  optionLabel,
  placementKey,
  resolveSkillPlacement,
  validPlacementOptions,
  type SkillCategoryId,
  type SkillPlacement,
} from '../library/skillCategories';
import { isFeatureEnabled } from '../port/featureFlags';
import { SECRET_GOALS } from '../secrets/definitions';
import type { SecretGoalDiscovery } from '../secrets/progress';
import { CapabilityPanel } from './CapabilityPanel';
import { CreatureDesignPreview } from './CreatureDesignPreview';
import { ModelsHub } from './ModelsHub';
import { PublicCreationsHub } from './PublicCreationsHub';

/** Preset-like bodies that are not in PRESETS[] (shown once under Presets). */
const EXTRA_PRESETS: CreatureDesign[] = [ULTI_GROOVE_BOT_II];

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
  onImportJson?: () => void;
  /** C6 — share current elite (body + trained brain). */
  onShareModel?: () => void;
  shareBusy?: boolean;
  canShareModel?: boolean;
  /** C7 — open a public gallery share into the workspace. */
  onOpenPublicShare?: (id: string) => void;
  presetSkillOverrides?: Record<string, SkillPlacement>;
  currentSkillOverride?: SkillPlacement | null;
  onSetSkillPlacement?: (
    key: CreaturesBrowseKey,
    placement: SkillPlacement | null,
  ) => void;
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

type LibraryEntry = {
  key: CreaturesBrowseKey;
  label: string;
  kind: 'preset' | 'library';
  design: CreatureDesign;
  override: SkillPlacement | null;
};

function entryPlacement(entry: LibraryEntry): SkillPlacement {
  return resolveSkillPlacement(entry.design, entry.override);
}

function groupedEntries(entries: LibraryEntry[]): Map<
  SkillCategoryId,
  Map<string, LibraryEntry[]>
> {
  const groups = new Map<SkillCategoryId, Map<string, LibraryEntry[]>>();
  for (const cat of SKILL_CATEGORIES) {
    groups.set(cat.id, new Map());
  }
  for (const entry of entries) {
    const place = entryPlacement(entry);
    const bucket = groups.get(place.category);
    if (!bucket) continue;
    const sub =
      place.category === 'flying' ? place.flyingSub ?? 'glide' : '';
    const list = bucket.get(sub) ?? [];
    list.push(entry);
    bucket.set(sub, list);
  }
  return groups;
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
  onImportJson,
  onShareModel,
  shareBusy = false,
  canShareModel = false,
  onOpenPublicShare,
  presetSkillOverrides = {},
  currentSkillOverride = null,
  onSetSkillPlacement,
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
  const categorize = isFeatureEnabled('librarySkillCategories');

  const libraryEntries = useMemo<LibraryEntry[]>(() => {
    const presets: LibraryEntry[] = [...PRESETS, ...EXTRA_PRESETS].map(
      (p) => ({
        key: `preset:${p.name}` as const,
        label: p.name,
        kind: 'preset' as const,
        design: p,
        override: presetSkillOverrides[p.name] ?? null,
      }),
    );
    const saved: LibraryEntry[] = isFeatureEnabled('creaturePackages')
      ? packages.map((pkg) => ({
          key: `pkg:${pkg.id}` as const,
          label: isFeatureEnabled('creatureLibrary')
            ? `${pkg.displayName} (r${pkg.revision})`
            : pkg.displayName,
          kind: 'library' as const,
          design: pkg.design,
          override: packageSkillOverride(pkg),
        }))
      : [];
    return [...presets, ...saved];
  }, [packages, presetSkillOverrides]);

  const groups = useMemo(
    () => groupedEntries(libraryEntries),
    [libraryEntries],
  );

  const selectedOverride = browseKey === 'current'
    ? currentSkillOverride
    : browseKey.startsWith('preset:')
      ? presetSkillOverrides[browseKey.slice('preset:'.length)] ?? null
      : selectedPkg
        ? packageSkillOverride(selectedPkg)
        : null;
  const selectedPlacement = resolveSkillPlacement(
    selectedDesign,
    selectedOverride,
  );
  const inferredPlacement = inferSkillPlacement(selectedDesign);
  const categoryOptions = validPlacementOptions(selectedDesign);

  return (
    <div className="creatures-room">
      <header className="creatures-room-header">
        <div>
          <p className="creatures-room-eyebrow">Solemn Sandbox</p>
          <h1>Creature Library</h1>
          <p className="creatures-room-lede">
            Browse bodies by skill, inspect stats, and manage saved brains.
            Disco is a manual category — move a dancer there yourself. Open a
            body in the editor to change it. Train still runs live sessions.
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

          {categorize ? (
            <div className="creatures-skill-groups">
              {SKILL_CATEGORIES.map((cat) => {
                const bucket = groups.get(cat.id);
                const flying =
                  cat.id === 'flying'
                    ? FLYING_SUBCATEGORIES.map((sub) => ({
                        sub: sub.id,
                        label: sub.label,
                        items: bucket?.get(sub.id) ?? [],
                      }))
                    : [{ sub: '', label: '', items: bucket?.get('') ?? [] }];
                const total = flying.reduce((n, g) => n + g.items.length, 0);
                return (
                  <div key={cat.id} className="creatures-skill-group">
                    <h3 className="subhead" title={cat.hint}>
                      {cat.label}
                      <span className="hint muted"> · {total}</span>
                    </h3>
                    {total === 0 ? (
                      <p className="hint muted creatures-skill-empty">
                        {cat.id === 'disco'
                          ? 'Move a body here to dance with it.'
                          : 'None yet.'}
                      </p>
                    ) : cat.id === 'flying' ? (
                      flying.map((g) =>
                        g.items.length === 0 ? null : (
                          <div key={g.sub}>
                            <p className="creatures-skill-sub">{g.label}</p>
                            <div className="button-col creatures-picker-list">
                              {g.items.map((entry) => (
                                <button
                                  key={entry.key}
                                  type="button"
                                  className={
                                    browseKey === entry.key ? 'active' : ''
                                  }
                                  onClick={() => pick(entry.key)}
                                >
                                  {entry.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ),
                      )
                    ) : (
                      <div className="button-col creatures-picker-list">
                        {flying[0].items.map((entry) => (
                          <button
                            key={entry.key}
                            type="button"
                            className={browseKey === entry.key ? 'active' : ''}
                            onClick={() => pick(entry.key)}
                          >
                            {entry.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <>
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
          {categorize && selectedDesign.joints.length > 0 && (
            <label className="creatures-category-row">
              <span>Skill category</span>
              <select
                value={placementKey(selectedPlacement)}
                disabled={!onSetSkillPlacement}
                onChange={(e) => {
                  const next = categoryOptions.find(
                    (o) => placementKey(o) === e.target.value,
                  );
                  if (!next || !onSetSkillPlacement) return;
                  const auto = placementKey(next) === placementKey(inferredPlacement);
                  onSetSkillPlacement(browseKey, auto ? null : next);
                }}
                title="Auto from body type. Disco is manual. Only valid moves are listed."
              >
                {categoryOptions.map((opt) => (
                  <option key={placementKey(opt)} value={placementKey(opt)}>
                    {optionLabel(opt)}
                    {placementKey(opt) === placementKey(inferredPlacement)
                      ? ' · auto'
                      : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
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
            {isFeatureEnabled('jsonImportExport') && (
              <>
                <button
                  type="button"
                  disabled={selectedDesign.joints.length === 0}
                  onClick={() =>
                    onDownloadText(
                      `${(selectedDesign.name || 'creature')
                        .replace(/\s+/g, '_')
                        .toLowerCase()}.json`,
                      exportCreatureJson(selectedDesign),
                    )
                  }
                >
                  Export creature
                </button>
                {onImportJson && (
                  <button
                    type="button"
                    title="Accepts freshstart-creature or freshstart-model JSON"
                    onClick={onImportJson}
                  >
                    Import JSON
                  </button>
                )}
              </>
            )}
            {onShareModel && isFeatureEnabled('creatureSharing') && (
              <button
                type="button"
                disabled={!canShareModel || evolving || shareBusy}
                title="Create a public link for the current trained creature"
                onClick={onShareModel}
              >
                {shareBusy ? 'Sharing…' : 'Share'}
              </button>
            )}
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

        {isFeatureEnabled('publicCreationsLibrary') &&
          isFeatureEnabled('creatureSharing') &&
          onOpenPublicShare && (
            <section className="creatures-careers">
              <PublicCreationsHub
                evolving={evolving}
                onOpen={onOpenPublicShare}
              />
            </section>
          )}
      </div>
    </div>
  );
}
