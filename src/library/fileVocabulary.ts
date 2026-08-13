/**
 * Shared Body / Brain / Trained labels, names, and filenames.
 */
import type { TaskId } from '../brain/types';
import { GOAL_CATALOG, getGoal, type GoalId } from '../goals/catalog';
import type { SavedModel } from './savedModels';

const UNNAMED = new Set([
  '',
  'custom',
  'creature',
  'imported',
  'importedt',
  'untitled',
]);

export function isUnnamedBody(name: string | undefined | null): boolean {
  return UNNAMED.has((name ?? '').trim().toLowerCase());
}

/** Null when the body may be saved; otherwise a short reason. */
export function unnamedBodyReason(name: string | undefined | null): string | null {
  return isUnnamedBody(name) ? 'Name this body first' : null;
}

export function goalTitleForTask(task: TaskId | GoalId | string): string {
  const fromId = GOAL_CATALOG.find((g) => g.id === task || g.task === task);
  if (fromId) return fromId.title;
  try {
    return getGoal(task as GoalId).title;
  } catch {
    return task;
  }
}

/** Disco-style trained display name: `Hopper · Boxing`. */
export function displayNameForTrained(
  bodyName: string | undefined,
  task: TaskId | GoalId | string,
): string {
  const body = (bodyName ?? '').trim() || 'Creature';
  return `${body} · ${goalTitleForTask(task)}`;
}

function slug(value: string): string {
  const s = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'creature';
}

export function bodyFileName(bodyName: string | undefined): string {
  return `${slug(bodyName || 'creature')}.body.json`;
}

export function brainFileName(
  bodyName: string | undefined,
  task: TaskId | GoalId | string,
): string {
  return `${slug(bodyName || 'creature')}-${slug(goalTitleForTask(task))}.brain.json`;
}

export function trainedFileName(
  bodyName: string | undefined,
  task: TaskId | GoalId | string,
): string {
  return `${slug(bodyName || 'creature')}-${slug(goalTitleForTask(task))}.trained.json`;
}

export function inferSavedModelKind(model: SavedModel): 'brain' | 'trained' {
  if (model.kind === 'brain' || model.kind === 'trained') return model.kind;
  if (model.boxingDesign || model.joustingDesign) return 'trained';
  return 'trained';
}
