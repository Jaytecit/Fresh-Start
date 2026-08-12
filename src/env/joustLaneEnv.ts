/**
 * L1 — static Jousting lane made only from existing G1 box obstacles.
 */
import {
  JOUST_LANE_HALF_WIDTH,
  JOUST_LANE_WALL_HEIGHT,
  JOUST_LANE_WALL_WIDTH,
} from '../physics/constants';
import type { EnvironmentDesign, EnvObstacle } from './types';
import { defaultSpawn } from './types';

function wall(id: string, x: number): EnvObstacle {
  return {
    id,
    kind: 'box',
    x,
    y: JOUST_LANE_WALL_HEIGHT / 2,
    w: JOUST_LANE_WALL_WIDTH,
    h: JOUST_LANE_WALL_HEIGHT,
  };
}

export function joustLaneEnv(name = 'Jousting Lane'): EnvironmentDesign {
  return {
    name,
    theme: 'mint',
    obstacles: [
      wall(
        'joust-wall-l',
        -(JOUST_LANE_HALF_WIDTH + JOUST_LANE_WALL_WIDTH / 2),
      ),
      wall(
        'joust-wall-r',
        JOUST_LANE_HALF_WIDTH + JOUST_LANE_WALL_WIDTH / 2,
      ),
    ],
    regions: [],
    markers: [],
    spawn: defaultSpawn(),
  };
}

export function isJoustLaneEnv(env: EnvironmentDesign): boolean {
  return env.obstacles.some((obstacle) => obstacle.id === 'joust-wall-l');
}
