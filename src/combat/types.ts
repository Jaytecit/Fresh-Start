import type { SparringOpponentId } from '../boxing/sparringOpponents';
import type { JoustSparringId } from '../jousting/sparringOpponents';

export type CombatMode = 'race' | 'boxing' | 'joust';

export type CombatCornerValue =
  | { kind: 'workspace' }
  | { kind: 'saved'; modelId: string }
  | { kind: 'house'; id: SparringOpponentId | JoustSparringId };

export function combatCornerKey(value: CombatCornerValue): string {
  if (value.kind === 'workspace') return 'workspace';
  if (value.kind === 'saved') return `saved:${value.modelId}`;
  return `house:${value.id}`;
}

export function parseCombatCornerKey(raw: string): CombatCornerValue | null {
  if (raw === 'workspace') return { kind: 'workspace' };
  if (raw.startsWith('saved:')) {
    const modelId = raw.slice('saved:'.length);
    return modelId ? { kind: 'saved', modelId } : null;
  }
  if (raw.startsWith('house:')) {
    const id = raw.slice('house:'.length);
    if (id === 'dummy' || id === 'boxobot-v2t' || id === 'joustbot') {
      return { kind: 'house', id };
    }
  }
  return null;
}
