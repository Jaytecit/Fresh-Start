/** Short contextual help shown when jumping from a Tutorial chapter. */

export type TutorialHelpKey =
  | 'map-skill'
  | 'map-edit'
  | 'map-creatures'
  | 'first-loop-edit'
  | 'first-loop-skill'
  | 'first-loop-train'
  | 'first-loop-creatures'
  | 'building-edit'
  | 'training-train'
  | 'training-creatures'
  | 'wander-world'
  | 'wander-discoveries'
  | 'wander-h2h'
  | 'advanced-train'
  | 'advanced-world'
  | 'stuck-edit'
  | 'stuck-train';

export interface TutorialHelpContent {
  title: string;
  body: string[];
}

export const TUTORIAL_HELP: Record<TutorialHelpKey, TutorialHelpContent> = {
  'map-skill': {
    title: 'Skill panel',
    body: [
      'Skill is the family of challenges you are in — walk, jump, fly, motor, free, or disco.',
      'The strip above the canvas also switches Skill, Goal, and Env without leaving the view.',
    ],
  },
  'map-edit': {
    title: 'Creature builder',
    body: [
      'Draw a body with joints, bones, and muscles — or load a preset.',
      'Triangles hold shape better than long floppy chains. Save current stores the body in your library.',
    ],
  },
  'map-creatures': {
    title: 'Creature Library',
    body: [
      'Browse presets, saved bodies, brains, and trophies tied to a design.',
      'Open a body in the editor to change it. Training still happens under Train.',
    ],
  },
  'first-loop-edit': {
    title: 'Step 1 — Load a body',
    body: [
      'Pick a preset such as Simple Hopper. You can redraw later; the loop matters more than perfection.',
    ],
  },
  'first-loop-skill': {
    title: 'Step 2 — Pick a challenge',
    body: [
      'Try Skill → Walk, Goal → Run, Env → Flat Ground.',
      'Those three controls live on the strip above the canvas when you leave this panel.',
    ],
  },
  'first-loop-train': {
    title: 'Step 3 — Evolve',
    body: [
      'Press Evolve. Ghost outlines are other try-outs in the pack.',
      'Play best watches the winner alone; Save model keeps a brain you like.',
    ],
  },
  'first-loop-creatures': {
    title: 'Step 4 — Find what you saved',
    body: [
      'Saved brains and bodies land here. Continue a model from Train’s Start-from once you have one.',
    ],
  },
  'building-edit': {
    title: 'Drawing tips',
    body: [
      'Brace with triangles. Add at least one muscle. Mark feet if the goal cares about stepping.',
      'Physics settle previews how the body rests before you train.',
    ],
  },
  'training-train': {
    title: 'Training room',
    body: [
      'Evolve tries many brains. If nothing improves, simplify the body or flatten the env.',
      'Keep training continues from the elite of the current run.',
    ],
  },
  'training-creatures': {
    title: 'Saved brains',
    body: [
      'Models you save appear here, grouped with the body they belong to.',
    ],
  },
  'wander-world': {
    title: 'Environment builder',
    body: [
      'Author hills, boxes, ramps, launch pads, and markers. Save an env, then pick it from the Env strip.',
    ],
  },
  'wander-discoveries': {
    title: 'Trophy room',
    body: [
      'Secret goals unlock while you experiment. Locked plaques stay quiet until earned.',
    ],
  },
  'wander-h2h': {
    title: 'Head-to-Head',
    body: [
      'Pit two saved brains against each other on a goal. Save two models first.',
    ],
  },
  'advanced-train': {
    title: 'Fine-tuning a run',
    body: [
      'Training setup holds the knobs: recipe, pack size, try length, mutation style, and who breeds.',
      'Priorities tilt the score mix for the selected goal. The Rewards panel shows exactly what earned the points.',
    ],
  },
  'advanced-world': {
    title: 'Scoring the course itself',
    body: [
      'Penalty and reward zones, start / checkpoint / finish markers, and launch pads all change how a course scores.',
      'Save the env, then pick it from the Env strip before training.',
    ],
  },
  'stuck-edit': {
    title: 'Empty or floppy body?',
    body: [
      'Load a preset, or place joints and brace with triangles / solid struts.',
      'Evolve needs muscles (or wheels) on the body.',
    ],
  },
  'stuck-train': {
    title: 'Back to training',
    body: [
      'If Evolve is greyed out, add muscles or wheels in the builder first.',
      'After a good run, Save model so you do not lose the brain.',
    ],
  },
};

export function getTutorialHelp(
  key: string | null,
): TutorialHelpContent | null {
  if (!key) return null;
  return TUTORIAL_HELP[key as TutorialHelpKey] ?? null;
}
