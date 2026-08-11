/** Selection for Environment Studio canvas. */

export type EnvSelection =
  | { kind: 'obstacle'; id: string }
  | { kind: 'region'; id: string }
  | { kind: 'marker'; id: string }
  | { kind: 'tower' }
  | { kind: 'spawn' }
  | { kind: 'terrain' }
  | null;

/** Multi-select list; empty = none. Last item is primary for inspector/handles. */
export type EnvSelectionList = NonNullable<EnvSelection>[];

export type EnvTool =
  | 'select'
  | 'box'
  | 'ramp'
  | 'stair'
  | 'pit'
  | 'loop'
  | 'pad'
  | 'penalty'
  | 'reward'
  | 'landing'
  | 'start'
  | 'checkpoint'
  | 'finish'
  | 'tower'
  | 'spawn';

export const PLACE_OBSTACLE_TOOLS: Exclude<
  EnvTool,
  | 'select'
  | 'tower'
  | 'spawn'
  | 'penalty'
  | 'reward'
  | 'landing'
  | 'start'
  | 'checkpoint'
  | 'finish'
>[] = ['box', 'ramp', 'stair', 'pit', 'loop', 'pad'];

export const PLACE_REGION_TOOLS: Extract<
  EnvTool,
  'penalty' | 'reward' | 'landing'
>[] = ['penalty', 'reward', 'landing'];

export const PLACE_MARKER_TOOLS: Extract<
  EnvTool,
  'start' | 'checkpoint' | 'finish'
>[] = ['start', 'checkpoint', 'finish'];

export function isPlaceObstacleTool(
  tool: EnvTool,
): tool is (typeof PLACE_OBSTACLE_TOOLS)[number] {
  return (PLACE_OBSTACLE_TOOLS as string[]).includes(tool);
}

export function isPlaceRegionTool(
  tool: EnvTool,
): tool is (typeof PLACE_REGION_TOOLS)[number] {
  return (PLACE_REGION_TOOLS as string[]).includes(tool);
}

export function isPlaceMarkerTool(
  tool: EnvTool,
): tool is (typeof PLACE_MARKER_TOOLS)[number] {
  return (PLACE_MARKER_TOOLS as string[]).includes(tool);
}
