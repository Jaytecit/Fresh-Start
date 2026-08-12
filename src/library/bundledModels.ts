/**
 * Default / bundled models library (F3).
 * Fresh Start–authored bodies only (from presets + Ulti Groove Bot II).
 * Appearance starts empty — googly eyes are an opt-in joint add-on.
 */
import { emptyAppearance, type AppearanceRig } from '../appearance/types';
import { BOXOBOT_V2 } from '../boxing/sparringOpponents';
import { BOXOBOT } from '../creature/boxoBot';
import { PRESETS } from '../creature/presets';
import { ULTI_GROOVE_BOT_II } from '../creature/ultiGrooveBotII';
import { cloneDesign, type CreatureDesign } from '../creature/types';

export interface BundledModel {
  id: string;
  displayName: string;
  design: CreatureDesign;
  appearance: AppearanceRig;
  tags: string[];
}

export const BUNDLED_MODELS: BundledModel[] = [
  ...PRESETS.map((p) => ({
    id: `builtin_${p.name.toLowerCase().replace(/\s+/g, '_')}`,
    displayName: p.name,
    design: cloneDesign(p),
    appearance: emptyAppearance(),
    tags:
      p.name === BOXOBOT.name || p.name === BOXOBOT_V2.name
        ? (['boxing', 'preset'] as string[])
        : (['preset'] as string[]),
  })),
  {
    id: 'builtin_ulti_groove_bot_ii',
    displayName: ULTI_GROOVE_BOT_II.name,
    design: cloneDesign(ULTI_GROOVE_BOT_II),
    appearance: emptyAppearance(),
    tags: ['disco', 'preset'],
  },
];

export function getBundledModel(id: string): BundledModel | undefined {
  return BUNDLED_MODELS.find((m) => m.id === id);
}
