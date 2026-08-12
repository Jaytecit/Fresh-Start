/**
 * K1 — static Boxing ring made only from existing G1 box obstacles.
 */
import {
  BOXING_RING_HALF_WIDTH,
  BOXING_RING_WALL_HEIGHT,
  BOXING_RING_WALL_WIDTH,
} from '../physics/constants';
import type { EnvironmentDesign, EnvObstacle } from './types';
import { defaultSpawn } from './types';

function wall(id: string, x: number): EnvObstacle {
  return {
    id,
    kind: 'box',
    x,
    y: BOXING_RING_WALL_HEIGHT / 2,
    w: BOXING_RING_WALL_WIDTH,
    h: BOXING_RING_WALL_HEIGHT,
  };
}

export function boxingRingEnv(name = 'Boxing Ring'): EnvironmentDesign {
  return {
    name,
    theme: 'slate',
    obstacles: [
      wall(
        'boxing-wall-l',
        -(BOXING_RING_HALF_WIDTH + BOXING_RING_WALL_WIDTH / 2),
      ),
      wall(
        'boxing-wall-r',
        BOXING_RING_HALF_WIDTH + BOXING_RING_WALL_WIDTH / 2,
      ),
    ],
    regions: [],
    markers: [],
    spawn: defaultSpawn(),
  };
}

export function isBoxingRingEnv(env: EnvironmentDesign): boolean {
  return env.obstacles.some((obstacle) => obstacle.id === 'boxing-wall-l');
}
