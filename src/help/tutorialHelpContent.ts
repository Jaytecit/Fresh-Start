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
    title: 'Skill strip',
    body: [
      'Skill is the family of challenges you are in — walk, jump, fly, motor, free, or disco.',
      'Change Skill, Goal, and Environment on the strip above the canvas. There is no Skill tab.',
    ],
  },
  'map-edit': {
    title: 'Build',
    body: [
      'Draw a body with joints, bones, and muscles — or load a preset.',
      'Triangles hold shape better than long floppy chains. Save body stores the body in your library.',
    ],
  },
  'map-creatures': {
    title: 'Library',
    body: [
      'Bodies, Trained, and Public creations live here. Use body or Use trained to load them.',
      'The workspace reminder shows what is loaded. Back to sandbox returns to Build, Train, Combat, or Course.',
    ],
  },
  'first-loop-edit': {
    title: 'Step 2 — The body',
    body: [
      'A Floppy Chain is already loaded. You can redraw or pick another preset; the loop matters more than perfection.',
    ],
  },
  'first-loop-skill': {
    title: 'Step 1 — The challenge',
    body: [
      'Walk, Run, and Flat Ground are already selected. Change them on the strip above the canvas if you want a different challenge.',
    ],
  },
  'first-loop-train': {
    title: 'Step 3 — Evolve',
    body: [
      'Press Evolve. Ghost outlines are other try-outs in the pack.',
      'Play best watches the winner alone; Save trained keeps body + brain + goal.',
    ],
  },
  'first-loop-creatures': {
    title: 'Step 4 — Find what you saved',
    body: [
      'Bodies, Trained, and Public creations land here. Use body or Use trained to load them.',
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
      'Evolve fresh starts a new search with random brains. If nothing improves, simplify the body or flatten the course.',
      'Keep training continues from the best brain of this run.',
    ],
  },
  'training-creatures': {
    title: 'Trained creatures',
    body: [
      'Bodies and trained creatures you save appear here. Use body or Use trained to load them. Rename a trained creature from the Trained list.',
    ],
  },
  'wander-world': {
    title: 'Course',
    body: [
      'Author hills, boxes, ramps, launch pads, and markers. Save a course, then pick it from the Environment strip.',
    ],
  },
  'wander-discoveries': {
    title: 'Trophies',
    body: [
      'Secret goals unlock while you experiment. Locked plaques stay quiet until earned.',
    ],
  },
  'wander-h2h': {
    title: 'Combat',
    body: [
      'Race, box, or joust from the Combat dock. Pick a body, then a matching brain — or use this workspace once it has a brain.',
    ],
  },
  'advanced-train': {
    title: 'Fine-tuning a run',
    body: [
      'Training setup holds the knobs: recipe, pack size, try length, rhythm clock, mutation style, and who breeds.',
      'Priorities tilt the score mix for the selected goal. The Rewards panel shows exactly what earned the points.',
    ],
  },
  'advanced-world': {
    title: 'Scoring the course itself',
    body: [
      'Penalty and reward zones, start / checkpoint / finish markers, and launch pads all change how a course scores. An env with both start and finish pays checkpoint and finish bonuses on every goal.',
      'Save the course, then pick it from the Environment strip before training.',
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
      'If Evolve is greyed out, add muscles or wheels in Build first.',
      'After a good run, Save trained so you do not lose the brain.',
    ],
  },
};

export function getTutorialHelp(
  key: string | null,
): TutorialHelpContent | null {
  if (!key) return null;
  return TUTORIAL_HELP[key as TutorialHelpKey] ?? null;
}
