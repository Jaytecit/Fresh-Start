/**
 * Training setup dock: recipes + knobs in compact columns.
 */
import { useState, type ReactNode } from 'react';
import {
  clampEpisodeSeconds,
  clampPhaseClockHz,
  EPISODE_SECONDS_MAX,
  EPISODE_SECONDS_MIN,
  formatEpisodeSeconds,
  formatPhaseClockHz,
  PHASE_CLOCK_HZ_MAX,
  PHASE_CLOCK_HZ_MIN,
} from '../brain/constants';
import {
  BREED_STRICTNESS,
  MUTATION_STYLES,
  TRAINING_RECIPES,
  breedStrictnessFromTournament,
  type BreedStrictness,
  type GaKnobSet,
  type MutationStyleId,
  type RecipeId,
  type StartFromMode,
} from '../brain/trainingRecipes';

interface Props {
  knobs: GaKnobSet;
  disabled: boolean;
  savedBrainOptions: { id: string; name: string }[];
  onChange: (next: GaKnobSet) => void;
  /** Show schedule toggles. */
  showSchedules?: boolean;
}

const POP_PRESETS = [6, 12, 24, 36, 48, 80] as const;
const BATCH_PRESETS = [4, 6, 8, 12, 24] as const;
const ROUND_PRESETS = [25, 50, 100, 200] as const;

function Group({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="train-setup-group">
      <h4 className="train-setup-group-title">{title}</h4>
      <div className="train-setup-group-body">{children}</div>
    </section>
  );
}

function Field({
  label,
  title,
  children,
}: {
  label: string;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="train-field">
      <span className="train-field-label" title={title}>
        {label}
      </span>
      <div className="button-row wrap train-field-controls">{children}</div>
    </div>
  );
}

export function TrainingSetupPanel({
  knobs,
  disabled,
  savedBrainOptions,
  onChange,
  showSchedules = true,
}: Props) {
  const strictness = breedStrictnessFromTournament(knobs.tournamentSize);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const patch = (partial: Partial<GaKnobSet>) => {
    const next = { ...knobs, ...partial };
    next.batchSize = Math.max(1, Math.min(next.batchSize, next.populationSize));
    next.phaseClockHz = clampPhaseClockHz(next.phaseClockHz);
    onChange(next);
  };

  return (
    <div className="training-setup">
      <div className="train-setup-header">
        <h3 className="subhead">Training setup</h3>
        {disabled && (
          <p className="hint muted train-setup-lock">
            Locked while evolving — Stop to change.
          </p>
        )}
      </div>

      <div className="train-setup-columns">
        <Group title="Recipe">
          <div className="button-row wrap train-field-controls">
            {TRAINING_RECIPES.map((r) => (
              <button
                key={r.id}
                type="button"
                className={knobs.recipeId === r.id ? 'active' : ''}
                disabled={disabled}
                title={r.pitch}
                onClick={() => {
                  const recipe = TRAINING_RECIPES.find((x) => x.id === r.id);
                  if (!recipe) return;
                  const next = {
                    ...knobs,
                    ...recipe.apply(knobs),
                    recipeId: r.id as RecipeId,
                  };
                  next.batchSize = Math.max(
                    1,
                    Math.min(next.batchSize, next.populationSize),
                  );
                  next.phaseClockHz = clampPhaseClockHz(next.phaseClockHz);
                  onChange(next);
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </Group>

        <Group title="Population">
          <Field
            label="How many try"
            title="populationSize — More brains each round. Higher is usually smarter but slower."
          >
            {POP_PRESETS.map((n) => (
              <button
                key={n}
                type="button"
                className={knobs.populationSize === n ? 'active' : ''}
                disabled={disabled}
                onClick={() => patch({ populationSize: n })}
              >
                {n}
              </button>
            ))}
          </Field>
          <Field
            label="How many you watch"
            title="batchSize — Only the on-screen pack. Learning uses everyone in How many try."
          >
            {BATCH_PRESETS.filter((n) => n <= knobs.populationSize).map((n) => (
              <button
                key={n}
                type="button"
                className={knobs.batchSize === n ? 'active' : ''}
                disabled={disabled}
                onClick={() => patch({ batchSize: n })}
              >
                {n}
              </button>
            ))}
          </Field>
          <Field
            label="Try length"
            title="episodeSeconds — Simulated seconds each creature gets per round."
          >
            <label className="slider-row train-try-slider">
              <span className="muted">{EPISODE_SECONDS_MIN}s</span>
              <input
                type="range"
                min={EPISODE_SECONDS_MIN}
                max={EPISODE_SECONDS_MAX}
                step={1}
                disabled={disabled}
                value={clampEpisodeSeconds(knobs.episodeSeconds)}
                onChange={(e) =>
                  patch({ episodeSeconds: Number(e.target.value) })
                }
              />
              <span className="val">
                {formatEpisodeSeconds(
                  clampEpisodeSeconds(knobs.episodeSeconds),
                )}
              </span>
            </label>
          </Field>
          <Field
            label="Rhythm"
            title="Phase clock the brain sees (sin/cos). 2.5 Hz is a typical walk/flap. 0 turns it off so gaits must come from the body. Brains trained at one rate expect that rate."
          >
            <label className="slider-row train-try-slider train-rhythm-slider">
              <span className="muted">{PHASE_CLOCK_HZ_MIN}</span>
              <input
                type="range"
                min={PHASE_CLOCK_HZ_MIN}
                max={PHASE_CLOCK_HZ_MAX}
                step={0.1}
                disabled={disabled}
                value={clampPhaseClockHz(knobs.phaseClockHz)}
                onChange={(e) =>
                  patch({ phaseClockHz: Number(e.target.value) })
                }
              />
              <span className="val">
                {formatPhaseClockHz(knobs.phaseClockHz)}
              </span>
            </label>
          </Field>
        </Group>

        <Group title="Search">
          <Field
            label="Mutation"
            title="Careful = small tweaks. Wild = big random changes when stuck."
          >
            {MUTATION_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                className={knobs.mutationStyle === s.id ? 'active' : ''}
                disabled={disabled}
                title={`${s.hint} (σ≈${s.sigma})`}
                onClick={() =>
                  patch({
                    mutationStyle: s.id as MutationStyleId,
                    mutationSigma: s.sigma,
                    mutationResetRate: s.resetRate,
                  })
                }
              >
                {s.label}
              </button>
            ))}
          </Field>
          <Field label="Start from">
            {(
              [
                ['fresh', 'Fresh random'],
                ['saved', 'Saved brain…'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={knobs.startFrom === id ? 'active' : ''}
                disabled={
                  disabled ||
                  (id === 'saved' && savedBrainOptions.length === 0)
                }
                title={
                  id === 'fresh'
                    ? 'Evolve fresh starts random brains. Use Keep training on the dock to improve this run’s best.'
                    : 'Copy a trained brain from the library, then Evolve from saved'
                }
                onClick={() => patch({ startFrom: id as StartFromMode })}
              >
                {label}
              </button>
            ))}
            {knobs.startFrom === 'saved' && savedBrainOptions.length > 0 && (
              <select
                className="train-knob-select"
                value={knobs.savedModelId ?? ''}
                disabled={disabled}
                aria-label="Saved brain"
                onChange={(e) =>
                  patch({ savedModelId: e.target.value || null })
                }
              >
                <option value="">Pick…</option>
                {savedBrainOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </Group>

        <Group title="Breeding">
          <button
            type="button"
            className="train-setup-advanced-toggle"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            <span>{advancedOpen ? 'Hide options' : 'Show options'}</span>
            <span aria-hidden>{advancedOpen ? '▾' : '▸'}</span>
          </button>
          {advancedOpen ? (
            <>
              <Field
                label="Champions"
                title="ELITE_COUNT — Always copy the top scorers into the next round unchanged"
              >
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={knobs.eliteCount === n ? 'active' : ''}
                    disabled={disabled}
                    onClick={() => patch({ eliteCount: n })}
                  >
                    {n}
                  </button>
                ))}
              </Field>
              <Field
                label="Who breeds"
                title="TOURNAMENT_SIZE — Stricter = exploit best; looser = more variety"
              >
                {(Object.keys(BREED_STRICTNESS) as BreedStrictness[]).map(
                  (id) => {
                    const def = BREED_STRICTNESS[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        className={strictness === id ? 'active' : ''}
                        disabled={disabled}
                        title={def.hint}
                        onClick={() =>
                          patch({ tournamentSize: def.tournamentSize })
                        }
                      >
                        {def.label}
                      </button>
                    );
                  },
                )}
              </Field>
              <Field
                label="Rounds"
                title="maxGenerations — Stop after N generations"
              >
                {ROUND_PRESETS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={knobs.maxGenerations === n ? 'active' : ''}
                    disabled={disabled}
                    onClick={() => patch({ maxGenerations: n })}
                  >
                    {n}
                  </button>
                ))}
              </Field>
              {showSchedules && (
                <div className="train-toggle-grid">
                  <label
                    className="toggle-row"
                    title="Start exploratory, then fine-tune automatically."
                  >
                    <input
                      type="checkbox"
                      checked={knobs.annealMutation}
                      disabled={disabled}
                      onChange={(e) =>
                        patch({ annealMutation: e.target.checked })
                      }
                    />
                    Settle down over time
                  </label>
                  <label
                    className="toggle-row"
                    title="Spend less time on early chaos; longer tests later."
                  >
                    <input
                      type="checkbox"
                      checked={knobs.shortTriesFirst}
                      disabled={disabled}
                      onChange={(e) =>
                        patch({ shortTriesFirst: e.target.checked })
                      }
                    />
                    Short tries first
                  </label>
                  <label
                    className="toggle-row"
                    title="Don’t waste time on faces-down runs."
                  >
                    <input
                      type="checkbox"
                      checked={knobs.stopAfterFall}
                      disabled={disabled}
                      onChange={(e) =>
                        patch({ stopAfterFall: e.target.checked })
                      }
                    />
                    Stop after a fall
                  </label>
                  <label
                    className="toggle-row"
                    title="Children blend two good brains, then mutate."
                  >
                    <input
                      type="checkbox"
                      checked={knobs.crossover}
                      disabled={disabled}
                      onChange={(e) => patch({ crossover: e.target.checked })}
                    />
                    Mix two parents
                  </label>
                </div>
              )}
            </>
          ) : (
            <p className="hint muted train-setup-advanced-hint">
              Champions, breed strictness, rounds &amp; schedules
            </p>
          )}
        </Group>
      </div>
    </div>
  );
}
