export interface Camera {
  x: number;
  y: number;
  zoom: number;
  /**
   * Screen pixels reserved at the bottom (e.g. train dock).
   * Shifts the optical center upward so world framing stays above chrome.
   */
  insetBottom?: number;
}

/** Creature editor / play default (px per world unit). */
export const CREATURE_CAM_ZOOM_DEFAULT = 48;

/**
 * Environment Studio default — 5× wider framing than the creature builder
 * (same world units; lower zoom shows more course).
 */
export const ENV_CAM_ZOOM_DEFAULT = CREATURE_CAM_ZOOM_DEFAULT / 5;
export const ENV_CAM_ZOOM_MIN = 2;
export const ENV_CAM_ZOOM_MAX = 140;
export const ENV_CAM_Y_DEFAULT = 8;

export function createCamera(): Camera {
  return { x: 0, y: 2.2, zoom: CREATURE_CAM_ZOOM_DEFAULT, insetBottom: 0 };
}

export function createEnvCamera(): Camera {
  return {
    x: 20,
    y: ENV_CAM_Y_DEFAULT,
    zoom: ENV_CAM_ZOOM_DEFAULT,
    insetBottom: 0,
  };
}

function framingHeight(canvasH: number, insetBottom: number | undefined): number {
  const inset = Math.max(0, insetBottom ?? 0);
  return Math.max(1, canvasH - inset);
}

export function worldToScreen(
  cam: Camera,
  canvasW: number,
  canvasH: number,
  wx: number,
  wy: number,
): { x: number; y: number } {
  const out = { x: 0, y: 0 };
  writeWorldToScreen(cam, canvasW, canvasH, wx, wy, out);
  return out;
}

/** Hot-path variant — writes into `out` to avoid per-call allocations. */
export function writeWorldToScreen(
  cam: Camera,
  canvasW: number,
  canvasH: number,
  wx: number,
  wy: number,
  out: { x: number; y: number },
): void {
  const h = framingHeight(canvasH, cam.insetBottom);
  out.x = canvasW / 2 + (wx - cam.x) * cam.zoom;
  out.y = h / 2 - (wy - cam.y) * cam.zoom;
}

export function screenToWorld(
  cam: Camera,
  canvasW: number,
  canvasH: number,
  sx: number,
  sy: number,
): { x: number; y: number } {
  const h = framingHeight(canvasH, cam.insetBottom);
  return {
    x: cam.x + (sx - canvasW / 2) / cam.zoom,
    y: cam.y - (sy - h / 2) / cam.zoom,
  };
}
