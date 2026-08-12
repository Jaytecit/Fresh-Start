/**
 * Builtin Gauntlet course — multi-skill obstacle run with start/finish gates.
 * Geometry is ENV_WORLD_SCALE × the original studio export (gauntlet_env.json).
 */
import type { EnvironmentDesign, EnvCourseMarker } from './types';

export const BUILTIN_GAUNTLET_ENV_ID = 'builtin_gauntlet';

/** Full-course markers (start arms race timer; finish completes when armed). */
export function gauntletMarkers(): EnvCourseMarker[] {
  return [
    {
      id: 'gauntlet_start',
      kind: 'start',
      x: 10,
      y: 7.5,
      w: 3,
      h: 15,
    },
    {
      id: 'gauntlet_finish',
      kind: 'finish',
      x: 650,
      y: 7.5,
      w: 3,
      h: 15,
    },
  ];
}

/** Full Gauntlet environment (practice + curriculum base). */
export function gauntletEnv(): EnvironmentDesign {
  return {
    name: 'Gauntlet',
    theme: 'mint',
    obstacles: [
      {
        id: '0f6d7697-2dc7-4327-8d83-1c5b4bcb355d',
        kind: 'ramp',
        x: 64.3263123715574,
        y: 11.094458545291321,
        w: 108.76153931568293,
        h: 1.0184759261907583,
        rot: 0.22065837354731932,
      },
      {
        id: '02b882ef-3155-42af-be75-8de4f255b5fd',
        kind: 'box',
        x: 121.25,
        y: 11.25,
        w: 12.5,
        h: 22.5,
      },
      {
        id: 'b69a200c-8442-423c-9b77-905046266a6e',
        kind: 'stair',
        x: 127.5,
        y: 17.5,
        w: 75,
        h: 20,
      },
      {
        id: 'c9f06078-92c2-4138-ae02-8b23acd97867',
        kind: 'box',
        x: 193.75,
        y: 8.75,
        w: 17.5,
        h: 17.5,
      },
      {
        id: '10f66e22-2f57-43a7-99e4-0ac65d5514c8',
        kind: 'ramp',
        x: 222.5,
        y: 17.5,
        w: 54.61677677090389,
        h: 0.6,
        rot: -0.7340125517741346,
      },
      {
        id: 'a9890b85-a875-4387-b3f4-367e5fec6ac9',
        kind: 'pit',
        x: 372.5000000047887,
        y: 0,
        w: 70,
        h: 20,
      },
      {
        id: '63c3f6d1-0086-45f6-bbb4-02d60fb99f20',
        kind: 'ramp',
        x: 497.5,
        y: 10,
        w: 44.986367379752375,
        h: 2.734364638074368,
        rot: -0.4,
      },
    ],
    regions: [
      {
        id: '7a0bb29f-77ae-4fd0-95e5-1989492fce03',
        kind: 'penalty',
        x: 222.5,
        y: 17.5,
        w: 40,
        h: 35,
        rate: 1,
      },
      {
        id: '2cf46365-44c7-4dcb-8ce9-8c23786d1278',
        kind: 'penalty',
        x: 372.5,
        y: 10,
        w: 70,
        h: 20,
        rate: 1,
      },
    ],
    markers: gauntletMarkers(),
    tower: {
      x: 255,
      baseW: 60,
      height: 37.5,
    },
    spawn: {
      x: 0,
      y: 0,
    },
  };
}
