import { ENV_WORLD_SCALE } from '../physics/constants';

/** World-unit editor grid for joint placement. */
export const EDITOR_GRID = 0.5;

/** Environment Studio snap grid — ENV_WORLD_SCALE × creature grid. */
export const ENV_EDITOR_GRID = EDITOR_GRID * ENV_WORLD_SCALE;

export function snapToGrid(x: number, y: number, enabled: boolean, grid = EDITOR_GRID): {
  x: number;
  y: number;
} {
  if (!enabled) return { x, y };
  return {
    x: Math.round(x / grid) * grid,
    y: Math.round(y / grid) * grid,
  };
}
