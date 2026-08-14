import { goalTitleForTask } from '../library/fileVocabulary';
import type { SavedModel } from '../library/savedModels';

export interface CombatBodyGroup {
  key: string;
  label: string;
  models: SavedModel[];
}

export interface CombatBrainTaskGroup {
  task: string;
  title: string;
  models: SavedModel[];
}

function sortBrains(models: SavedModel[]): SavedModel[] {
  return [...models].sort(
    (a, b) => b.fitness - a.fitness || b.savedAt - a.savedAt,
  );
}

function bodyNameKey(model: SavedModel): string {
  return (model.designName || 'Creature').trim().toLowerCase() || 'creature';
}

/** Unique bodies from saved combat models, each with fitness-sorted brains. */
export function groupCombatModelsByBody(
  models: SavedModel[],
): CombatBodyGroup[] {
  const map = new Map<string, SavedModel[]>();
  for (const model of models) {
    const key = bodyNameKey(model);
    const list = map.get(key);
    if (list) list.push(model);
    else map.set(key, [model]);
  }
  const groups: CombatBodyGroup[] = [];
  for (const [key, list] of map) {
    const brains = sortBrains(list);
    const latest = [...list].sort((a, b) => b.savedAt - a.savedAt)[0];
    groups.push({
      key,
      label: (latest.designName || 'Creature').trim() || 'Creature',
      models: brains,
    });
  }
  groups.sort((a, b) => a.label.localeCompare(b.label) || a.key.localeCompare(b.key));
  return groups;
}

export function combatBodyGroupForModel(
  groups: CombatBodyGroup[],
  modelId: string,
): CombatBodyGroup | undefined {
  return groups.find((group) => group.models.some((m) => m.id === modelId));
}

/** Best brain on a body; prefers a matching task (e.g. the current race goal). */
export function pickSuitableBrain(
  models: SavedModel[],
  preferredTask?: string,
): SavedModel | undefined {
  if (models.length === 0) return undefined;
  if (preferredTask) {
    const match = models.find((m) => m.task === preferredTask);
    if (match) return match;
  }
  return models[0];
}

export function groupBrainsByTask(
  models: SavedModel[],
  preferredTask?: string,
): CombatBrainTaskGroup[] {
  const map = new Map<string, SavedModel[]>();
  for (const model of models) {
    const list = map.get(model.task);
    if (list) list.push(model);
    else map.set(model.task, [model]);
  }
  const tasks = [...map.keys()].sort((a, b) => {
    if (a === preferredTask) return -1;
    if (b === preferredTask) return 1;
    return goalTitleForTask(a).localeCompare(goalTitleForTask(b));
  });
  return tasks.map((task) => ({
    task,
    title: goalTitleForTask(task),
    models: sortBrains(map.get(task) ?? []),
  }));
}
