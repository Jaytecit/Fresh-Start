import { useEffect, useRef } from 'react';
import type { CreatureDesign } from '../creature/types';
import { PRESETS } from '../creature/presets';
import { ENV_EDITOR_GRID, snapToGrid } from '../editor/grid';
import { paintCreatureWorldGhost } from '../library/creaturePreviewPaint';
import { isFeatureEnabled } from '../port/featureFlags';
import { drawParallaxSky } from '../sim/parallaxSky';
import {
  clearCanvas,
  drawCourseMarkers,
  drawGround,
  drawGrid,
  drawObstacles,
  drawScoreRegions,
  drawTerrain,
  drawTower,
} from '../sim/render';
import { drawSimAxisRulers } from '../sim/simRulers';
import {
  createEnvCamera,
  ENV_CAM_ZOOM_MAX,
  ENV_CAM_ZOOM_MIN,
  screenToWorld,
  worldToScreen,
  type Camera,
} from '../sim/Camera';
import {
  handleWorldPos,
  hitHandle,
  hitTerrainEndpoint,
  hitTestEnv,
  localToWorld,
  markerHandles,
  moveMarker,
  moveObstacle,
  moveRegion,
  moveSpawn,
  moveTower,
  obstacleHandles,
  placeCourseMarkerAt,
  placeObstacleAt,
  placeScoreRegionAt,
  placeSpawnAt,
  placeTowerAt,
  regionHandles,
  resizeMarkerByCorner,
  resizeObstacleByCorner,
  resizeRegionByCorner,
  resizeTowerByHandle,
  rotateMarker,
  rotateObstacle,
  rotateRegion,
  selectionFootprint,
  setTerrainEndpoint,
  stairFromDrag,
  terrainEndpointWorld,
  towerHandles,
  worldToLocal,
  type Footprint,
  type HandleId,
  type TerrainEndpoint,
} from './envEditOps';
import {
  previewCourseMarkers,
  previewObstacleVisuals,
  previewScoreRegions,
  previewTerrainVisual,
  previewTowerVisuals,
} from './envPreview';
import {
  isPlaceMarkerTool,
  isPlaceObstacleTool,
  isPlaceRegionTool,
  type EnvSelectionList,
  type EnvTool,
} from './envSelection';
import {
  deleteSelectables,
  duplicateSelection,
  moveSelection,
  multiSelectionFootprint,
  primarySelection,
  rotateSelection,
  selectableInRect,
  sameSelectable,
  toggleSelectable,
  type EnvSelectable,
} from './envSelectionOps';
import {
  collectRampSnapGeometry,
  rampFromTopEndpoints,
  snapRampEndpoint,
  type Vec2,
} from './rampDraw';
import { resolveSpawn, type EnvironmentDesign } from './types';

interface Props {
  environment: EnvironmentDesign;
  onChange: (env: EnvironmentDesign) => void;
  tool: EnvTool;
  onToolChange?: (tool: EnvTool) => void;
  snapEnabled: boolean;
  selection: EnvSelectionList;
  onSelect: (sel: EnvSelectionList) => void;
  /** Current creature (or empty → Simple Hopper) drawn ghosted at spawn for scale. */
  referenceDesign?: CreatureDesign;
  /** Bottom chrome height in CSS px for camera framing. */
  viewportInsetBottom?: number;
}

type DragState =
  | {
      kind: 'moveObstacle';
      id: string;
      lastX: number;
      lastY: number;
      moved: boolean;
    }
  | {
      kind: 'moveRegion';
      id: string;
      lastX: number;
      lastY: number;
      moved: boolean;
    }
  | {
      kind: 'moveMarker';
      id: string;
      lastX: number;
      lastY: number;
      moved: boolean;
    }
  | {
      kind: 'moveTower';
      lastX: number;
      moved: boolean;
    }
  | {
      kind: 'moveSpawn';
      lastX: number;
      lastY: number;
      moved: boolean;
    }
  | {
      kind: 'resizeObstacle';
      id: string;
      handle: 'nw' | 'ne' | 'sw' | 'se';
      moved: boolean;
    }
  | {
      kind: 'resizeRegion';
      id: string;
      handle: 'nw' | 'ne' | 'sw' | 'se';
      moved: boolean;
    }
  | {
      kind: 'resizeMarker';
      id: string;
      handle: 'nw' | 'ne' | 'sw' | 'se';
      moved: boolean;
    }
  | {
      kind: 'rotateObstacle';
      id: string;
      moved: boolean;
    }
  | {
      kind: 'rotateRegion';
      id: string;
      moved: boolean;
    }
  | {
      kind: 'rotateMarker';
      id: string;
      moved: boolean;
    }
  | {
      kind: 'moveMulti';
      lastX: number;
      lastY: number;
      moved: boolean;
    }
  | {
      kind: 'rotateMulti';
      startAngle: number;
      baseEnv: EnvironmentDesign;
      moved: boolean;
    }
  | {
      kind: 'marquee';
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      additive: boolean;
    }
  | {
      kind: 'resizeTower';
      handle: 'towerLeft' | 'towerRight' | 'towerTop';
      moved: boolean;
    }
  | {
      kind: 'resizeTerrain';
      endpoint: TerrainEndpoint;
      moved: boolean;
    }
  | {
      kind: 'drawRamp';
      a: Vec2;
      b: Vec2;
      moved: boolean;
    }
  | {
      kind: 'drawStair';
      a: Vec2;
      b: Vec2;
      moved: boolean;
    };

const HANDLE_HIT_R = 0.28;

export function EnvEditorCanvas({
  environment,
  onChange,
  tool,
  onToolChange,
  snapEnabled,
  selection,
  onSelect,
  referenceDesign,
  viewportInsetBottom = 0,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camRef = useRef<Camera>(createEnvCamera());
  const panRef = useRef({ active: false, lastX: 0, lastY: 0 });
  const dragRef = useRef<DragState | null>(null);
  const spaceRef = useRef(false);
  const envRef = useRef(environment);
  const toolRef = useRef(tool);
  const snapRef = useRef(snapEnabled);
  const selectionRef = useRef(selection);
  const onChangeRef = useRef(onChange);
  const onSelectRef = useRef(onSelect);
  const onToolChangeRef = useRef(onToolChange);
  const insetRef = useRef(viewportInsetBottom);
  const referenceDesignRef = useRef(referenceDesign);
  /** Hover snap while ramp tool is armed (before / during draw). */
  const rampHoverRef = useRef<Vec2 | null>(null);

  if (!dragRef.current) {
    envRef.current = environment;
  }
  if (
    toolRef.current !== tool &&
    (dragRef.current?.kind === 'drawRamp' ||
      dragRef.current?.kind === 'drawStair')
  ) {
    dragRef.current = null;
    rampHoverRef.current = null;
  }
  toolRef.current = tool;
  snapRef.current = snapEnabled;
  selectionRef.current = selection;
  onChangeRef.current = onChange;
  onSelectRef.current = onSelect;
  onToolChangeRef.current = onToolChange;
  insetRef.current = viewportInsetBottom;
  referenceDesignRef.current = referenceDesign;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const paint = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = rect.width;
      const h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cam = camRef.current;
      cam.insetBottom = insetRef.current;

      const env = envRef.current;
      if (isFeatureEnabled('parallaxSky')) {
        drawParallaxSky(ctx, cam, w, h, env.theme);
      } else {
        clearCanvas(ctx, w, h);
      }
      if (snapRef.current) {
        drawGrid(ctx, cam, w, h, ENV_EDITOR_GRID);
      }
      drawGround(ctx, cam, w, h);
      drawTerrain(ctx, cam, w, h, previewTerrainVisual(env.terrain));
      if (env.tower) {
        drawTower(ctx, cam, w, h, previewTowerVisuals(env.tower));
      }
      drawObstacles(ctx, cam, w, h, previewObstacleVisuals(env.obstacles));
      if (isFeatureEnabled('scoreRegions')) {
        drawScoreRegions(ctx, cam, w, h, previewScoreRegions(env.regions));
      }
      if (isFeatureEnabled('courseMarkers')) {
        drawCourseMarkers(ctx, cam, w, h, previewCourseMarkers(env.markers));
      }
      const selected = selectionRef.current;
      const primary = primarySelection(selected);
      if (env.terrain) {
        drawTerrainEndpoints(
          ctx,
          cam,
          w,
          h,
          env.terrain,
          primary?.kind === 'terrain',
        );
      }
      drawSpawnMarker(
        ctx,
        cam,
        w,
        h,
        resolveSpawn(env),
        primary?.kind === 'spawn',
      );

      const ghostDesign =
        referenceDesignRef.current &&
        referenceDesignRef.current.joints.length > 0
          ? referenceDesignRef.current
          : PRESETS[0];
      const spawn = resolveSpawn(env);
      paintCreatureWorldGhost(
        ctx,
        ghostDesign,
        spawn.x,
        spawn.y,
        (wx, wy) => worldToScreen(cam, w, h, wx, wy),
        cam.zoom,
      );

      // Multi-select outlines (non-primary).
      for (const item of selected) {
        if (primary && sameSelectable(item, primary)) continue;
        const fp = selectionFootprint(env, item);
        if (fp) drawSelectionOutline(ctx, cam, w, h, fp, false);
      }

      if (primary && primary.kind !== 'spawn' && primary.kind !== 'terrain') {
        const fp =
          selected.length > 1
            ? multiSelectionFootprint(env, selected)
            : selectionFootprint(env, primary);
        if (fp) {
          if (selected.length > 1) {
            drawSelectionOutline(ctx, cam, w, h, fp, true);
            drawRotateHandle(ctx, cam, w, h, fp);
          } else {
            drawSelectionOverlay(ctx, cam, w, h, fp, primary, env);
          }
        }
      }

      const marquee = dragRef.current?.kind === 'marquee' ? dragRef.current : null;
      if (marquee) {
        drawMarquee(ctx, cam, w, h, marquee);
      }

      const drawRamp = dragRef.current?.kind === 'drawRamp' ? dragRef.current : null;
      if (drawRamp) {
        drawRampRubberBand(ctx, cam, w, h, drawRamp.a, drawRamp.b);
      } else if (toolRef.current === 'ramp' && rampHoverRef.current) {
        drawRampSnapCursor(ctx, cam, w, h, rampHoverRef.current);
      }

      const drawStair =
        dragRef.current?.kind === 'drawStair' ? dragRef.current : null;
      if (drawStair) {
        drawStairRubberBand(ctx, cam, w, h, drawStair.a, drawStair.b);
      }

      if (isFeatureEnabled('simAxisRulers')) {
        drawSimAxisRulers(ctx, cam, w, h);
      }

      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (e.code === 'Space') {
        spaceRef.current = true;
        if (!inField) e.preventDefault();
      }
      if (inField) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const sel = selectionRef.current;
        if (sel.length === 0) return;
        e.preventDefault();
        const next = deleteSelectables(envRef.current, sel);
        envRef.current = next;
        onSelectRef.current([]);
        onChangeRef.current(next);
      }
      if (e.key === 'Escape') {
        if (
          dragRef.current?.kind === 'drawRamp' ||
          dragRef.current?.kind === 'drawStair'
        ) {
          dragRef.current = null;
          rampHoverRef.current = null;
          e.preventDefault();
          return;
        }
        onSelectRef.current([]);
        onToolChangeRef.current?.('select');
      }
      if (e.key === 'v' || e.key === 'V') {
        if (
          dragRef.current?.kind === 'drawRamp' ||
          dragRef.current?.kind === 'drawStair'
        ) {
          dragRef.current = null;
        }
        rampHoverRef.current = null;
        onToolChangeRef.current?.('select');
      }
      if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey) {
        const sel = selectionRef.current;
        if (sel.length === 0) return;
        e.preventDefault();
        const result = duplicateSelection(envRef.current, sel);
        envRef.current = result.env;
        onSelectRef.current(result.items);
        onChangeRef.current(result.env);
      }
      if (e.key === 'r' || e.key === 'R') {
        const sel = selectionRef.current;
        if (sel.length === 0) return;
        e.preventDefault();
        const next = rotateSelection(envRef.current, sel, -Math.PI / 2);
        envRef.current = next;
        onChangeRef.current(next);
      }
      if (e.key === 'g' || e.key === 'G') {
        // Snap toggle is owned by App via WorldDock; Escape/tool only here.
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spaceRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const clientToLocal = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      w: rect.width,
      h: rect.height,
    };
  };

  const finishDrag = () => {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.kind === 'drawRamp') {
      dragRef.current = null;
      const ramp = rampFromTopEndpoints(drag.a, drag.b);
      if (ramp) {
        const next = {
          ...envRef.current,
          obstacles: [...envRef.current.obstacles, ramp],
        };
        envRef.current = next;
        onSelectRef.current([{ kind: 'obstacle', id: ramp.id }]);
        onChangeRef.current(next);
        rampHoverRef.current = null;
      }
      return;
    }
    if (drag.kind === 'drawStair') {
      dragRef.current = null;
      const stair = stairFromDrag(drag.a, drag.b);
      if (stair) {
        const next = {
          ...envRef.current,
          obstacles: [...envRef.current.obstacles, stair],
        };
        envRef.current = next;
        onSelectRef.current([{ kind: 'obstacle', id: stair.id }]);
        onChangeRef.current(next);
      }
      return;
    }
    if (drag.kind === 'marquee') {
      dragRef.current = null;
      const hits = selectableInRect(
        envRef.current,
        drag.startX,
        drag.startY,
        drag.endX,
        drag.endY,
      );
      if (drag.additive) {
        const merged = [...selectionRef.current];
        for (const h of hits) {
          if (!merged.some((m) => sameSelectable(m, h))) merged.push(h);
        }
        onSelectRef.current(merged);
      } else {
        onSelectRef.current(hits);
      }
      return;
    }
    dragRef.current = null;
    if ('moved' in drag && drag.moved) {
      onChangeRef.current(envRef.current);
    }
  };

  const snapWorldForRamp = (wx: number, wy: number): Vec2 => {
    const geometry = collectRampSnapGeometry(envRef.current);
    return snapRampEndpoint(wx, wy, {
      geometry,
      gridSnap: snapRef.current,
    });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(e.pointerId);

    if (e.button === 1 || (e.button === 0 && (e.altKey || spaceRef.current))) {
      panRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
      return;
    }

    if (e.button === 2) {
      if (
        dragRef.current?.kind === 'drawRamp' ||
        dragRef.current?.kind === 'drawStair'
      ) {
        dragRef.current = null;
        return;
      }
      const { x, y, w, h } = clientToLocal(e);
      const world = screenToWorld(camRef.current, w, h, x, y);
      const hit = hitTestEnv(envRef.current, world.x, world.y);
      if (hit) {
        const next = deleteSelectables(envRef.current, [hit]);
        envRef.current = next;
        onSelectRef.current([]);
        onChangeRef.current(next);
      }
      return;
    }

    if (e.button !== 0) return;

    const { x, y, w, h } = clientToLocal(e);
    const world = screenToWorld(camRef.current, w, h, x, y);
    const snapped = snapToGrid(world.x, world.y, snapRef.current, ENV_EDITOR_GRID);
    const currentTool = toolRef.current;
    const env = envRef.current;

    if (currentTool === 'ramp') {
      const a = snapWorldForRamp(world.x, world.y);
      rampHoverRef.current = a;
      dragRef.current = { kind: 'drawRamp', a, b: a, moved: false };
      return;
    }

    if (currentTool === 'stair') {
      dragRef.current = {
        kind: 'drawStair',
        a: snapped,
        b: snapped,
        moved: false,
      };
      return;
    }

    if (isPlaceObstacleTool(currentTool)) {
      const obs = placeObstacleAt(currentTool, snapped.x, snapped.y);
      const next = { ...env, obstacles: [...env.obstacles, obs] };
      envRef.current = next;
      onSelectRef.current([{ kind: 'obstacle', id: obs.id }]);
      onChangeRef.current(next);
      return;
    }

    if (isPlaceRegionTool(currentTool) && isFeatureEnabled('scoreRegions')) {
      const region = placeScoreRegionAt(currentTool, snapped.x, snapped.y);
      const next = {
        ...env,
        regions: [...(env.regions ?? []), region],
      };
      envRef.current = next;
      onSelectRef.current([{ kind: 'region', id: region.id }]);
      onChangeRef.current(next);
      return;
    }

    if (isPlaceMarkerTool(currentTool) && isFeatureEnabled('courseMarkers')) {
      const marker = placeCourseMarkerAt(
        currentTool,
        snapped.x,
        snapped.y,
        env.markers ?? [],
      );
      const next = {
        ...env,
        markers: [...(env.markers ?? []), marker],
      };
      envRef.current = next;
      onSelectRef.current([{ kind: 'marker', id: marker.id }]);
      onChangeRef.current(next);
      return;
    }

    if (currentTool === 'tower') {
      if (!env.tower) {
        const tower = placeTowerAt(snapped.x);
        const next = { ...env, tower };
        envRef.current = next;
        onSelectRef.current([{ kind: 'tower' }]);
        onChangeRef.current(next);
      } else {
        onSelectRef.current([{ kind: 'tower' }]);
      }
      return;
    }

    if (currentTool === 'spawn') {
      const spawn = placeSpawnAt(snapped.x, snapped.y);
      const next = { ...env, spawn };
      envRef.current = next;
      onSelectRef.current([{ kind: 'spawn' }]);
      onChangeRef.current(next);
      return;
    }

    // Terrain endpoints are always grabbable when hills exist.
    const terrainEnd = hitTerrainEndpoint(env.terrain, world.x, world.y);
    if (terrainEnd && env.terrain) {
      onSelectRef.current([{ kind: 'terrain' }]);
      dragRef.current = {
        kind: 'resizeTerrain',
        endpoint: terrainEnd,
        moved: false,
      };
      return;
    }

    // Select tool — handles on primary / multi footprint.
    const selected = selectionRef.current;
    const primary = primarySelection(selected);
    const groupFp =
      selected.length > 1 ? multiSelectionFootprint(env, selected) : null;
    const singleFp = primary ? selectionFootprint(env, primary) : null;
    const fp = groupFp ?? singleFp;

    if (fp && primary && selected.length > 1) {
      const rotateHit = hitHandle(
        world.x,
        world.y,
        fp,
        ['rotate'],
        HANDLE_HIT_R,
      );
      if (rotateHit === 'rotate') {
        dragRef.current = {
          kind: 'rotateMulti',
          startAngle: Math.atan2(world.y - fp.cy, world.x - fp.cx),
          baseEnv: env,
          moved: false,
        };
        return;
      }
      if (
        Math.abs(worldToLocal(world.x, world.y, fp).lx) <= fp.hw &&
        Math.abs(worldToLocal(world.x, world.y, fp).ly) <= fp.hh
      ) {
        dragRef.current = {
          kind: 'moveMulti',
          lastX: world.x,
          lastY: world.y,
          moved: false,
        };
        return;
      }
    }

    if (
      fp &&
      primary &&
      selected.length === 1 &&
      (primary.kind === 'obstacle' ||
        primary.kind === 'tower' ||
        primary.kind === 'region' ||
        primary.kind === 'marker')
    ) {
      const handles =
        primary.kind === 'tower'
          ? towerHandles()
          : primary.kind === 'region'
            ? regionHandles()
            : primary.kind === 'marker'
              ? markerHandles()
              : (() => {
                const o = env.obstacles.find((x) => x.id === primary.id);
                return o ? obstacleHandles(o) : [];
              })();
      const handle = hitHandle(
        world.x,
        world.y,
        fp,
        handles,
        HANDLE_HIT_R,
      );
      if (handle) {
        if (primary.kind === 'tower') {
          if (
            handle === 'towerLeft' ||
            handle === 'towerRight' ||
            handle === 'towerTop'
          ) {
            dragRef.current = {
              kind: 'resizeTower',
              handle,
              moved: false,
            };
          }
        } else if (primary.kind === 'region') {
          if (handle === 'rotate') {
            dragRef.current = {
              kind: 'rotateRegion',
              id: primary.id,
              moved: false,
            };
          } else if (
            handle === 'nw' ||
            handle === 'ne' ||
            handle === 'sw' ||
            handle === 'se'
          ) {
            dragRef.current = {
              kind: 'resizeRegion',
              id: primary.id,
              handle,
              moved: false,
            };
          }
        } else if (primary.kind === 'marker') {
          if (handle === 'rotate') {
            dragRef.current = {
              kind: 'rotateMarker',
              id: primary.id,
              moved: false,
            };
          } else if (
            handle === 'nw' ||
            handle === 'ne' ||
            handle === 'sw' ||
            handle === 'se'
          ) {
            dragRef.current = {
              kind: 'resizeMarker',
              id: primary.id,
              handle,
              moved: false,
            };
          }
        } else if (handle === 'rotate') {
          dragRef.current = {
            kind: 'rotateObstacle',
            id: primary.id,
            moved: false,
          };
        } else if (
          handle === 'nw' ||
          handle === 'ne' ||
          handle === 'sw' ||
          handle === 'se'
        ) {
          dragRef.current = {
            kind: 'resizeObstacle',
            id: primary.id,
            handle,
            moved: false,
          };
        }
        return;
      }
    }

    const hit = hitTestEnv(env, world.x, world.y);
    if (!hit) {
      dragRef.current = {
        kind: 'marquee',
        startX: world.x,
        startY: world.y,
        endX: world.x,
        endY: world.y,
        additive: e.shiftKey,
      };
      if (!e.shiftKey) onSelectRef.current([]);
      return;
    }

    if (e.shiftKey) {
      onSelectRef.current(toggleSelectable(selected, hit));
    } else if (
      selected.length > 1 &&
      selected.some((s) => sameSelectable(s, hit))
    ) {
      // Keep multi-selection and start group move.
      dragRef.current = {
        kind: 'moveMulti',
        lastX: world.x,
        lastY: world.y,
        moved: false,
      };
      return;
    } else {
      onSelectRef.current([hit]);
    }

    if (hit.kind === 'obstacle') {
      dragRef.current = {
        kind: 'moveObstacle',
        id: hit.id,
        lastX: world.x,
        lastY: world.y,
        moved: false,
      };
    } else if (hit.kind === 'region') {
      dragRef.current = {
        kind: 'moveRegion',
        id: hit.id,
        lastX: world.x,
        lastY: world.y,
        moved: false,
      };
    } else if (hit.kind === 'marker') {
      dragRef.current = {
        kind: 'moveMarker',
        id: hit.id,
        lastX: world.x,
        lastY: world.y,
        moved: false,
      };
    } else if (hit.kind === 'tower') {
      dragRef.current = {
        kind: 'moveTower',
        lastX: world.x,
        moved: false,
      };
    } else if (hit.kind === 'spawn') {
      dragRef.current = {
        kind: 'moveSpawn',
        lastX: world.x,
        lastY: world.y,
        moved: false,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (panRef.current.active) {
      const dx = e.clientX - panRef.current.lastX;
      const dy = e.clientY - panRef.current.lastY;
      panRef.current.lastX = e.clientX;
      panRef.current.lastY = e.clientY;
      camRef.current.x -= dx / camRef.current.zoom;
      camRef.current.y += dy / camRef.current.zoom;
      return;
    }

    const { x, y, w, h } = clientToLocal(e);
    const world = screenToWorld(camRef.current, w, h, x, y);

    if (toolRef.current === 'ramp' || dragRef.current?.kind === 'drawRamp') {
      const snapped = snapWorldForRamp(world.x, world.y);
      rampHoverRef.current = snapped;
      const dragRamp = dragRef.current;
      if (dragRamp?.kind === 'drawRamp') {
        dragRamp.b = snapped;
        if (
          Math.hypot(snapped.x - dragRamp.a.x, snapped.y - dragRamp.a.y) > 1e-4
        ) {
          dragRamp.moved = true;
        }
      }
    } else {
      rampHoverRef.current = null;
    }

    const drag = dragRef.current;
    if (!drag || drag.kind === 'drawRamp') return;

    if (drag.kind === 'drawStair') {
      const snapped = snapToGrid(
        world.x,
        world.y,
        snapRef.current,
        ENV_EDITOR_GRID,
      );
      drag.b = snapped;
      if (Math.hypot(snapped.x - drag.a.x, snapped.y - drag.a.y) > 1e-4) {
        drag.moved = true;
      }
      return;
    }

    if (drag.kind === 'marquee') {
      drag.endX = world.x;
      drag.endY = world.y;
      return;
    }

    let env = envRef.current;

    if (drag.kind === 'moveMulti') {
      let dx = world.x - drag.lastX;
      let dy = world.y - drag.lastY;
      if (snapRef.current) {
        const fp = multiSelectionFootprint(env, selectionRef.current);
        if (fp) {
          const snapped = snapToGrid(fp.cx + dx, fp.cy + dy, true, ENV_EDITOR_GRID);
          dx = snapped.x - fp.cx;
          dy = snapped.y - fp.cy;
        }
      }
      if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return;
      env = moveSelection(env, selectionRef.current, dx, dy);
      drag.lastX = world.x;
      drag.lastY = world.y;
      drag.moved = true;
      envRef.current = env;
      return;
    }

    if (drag.kind === 'rotateMulti') {
      const fp = multiSelectionFootprint(drag.baseEnv, selectionRef.current);
      if (!fp) return;
      const ang = Math.atan2(world.y - fp.cy, world.x - fp.cx);
      const delta = ang - drag.startAngle;
      env = rotateSelection(drag.baseEnv, selectionRef.current, delta);
      drag.moved = true;
      envRef.current = env;
      return;
    }

    if (drag.kind === 'moveObstacle') {
      let dx = world.x - drag.lastX;
      let dy = world.y - drag.lastY;
      if (snapRef.current) {
        const o = env.obstacles.find((ob) => ob.id === drag.id);
        if (o) {
          const snapped = snapToGrid(o.x + dx, o.y + dy, true, ENV_EDITOR_GRID);
          dx = snapped.x - o.x;
          dy = snapped.y - o.y;
        }
      }
      if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return;
      env = {
        ...env,
        obstacles: env.obstacles.map((o) =>
          o.id === drag.id ? moveObstacle(o, dx, dy) : o,
        ),
      };
      drag.lastX = world.x;
      drag.lastY = world.y;
      drag.moved = true;
      envRef.current = env;
      return;
    }

    if (drag.kind === 'moveRegion') {
      let dx = world.x - drag.lastX;
      let dy = world.y - drag.lastY;
      const regions = env.regions ?? [];
      if (snapRef.current) {
        const r = regions.find((reg) => reg.id === drag.id);
        if (r) {
          const snapped = snapToGrid(r.x + dx, r.y + dy, true, ENV_EDITOR_GRID);
          dx = snapped.x - r.x;
          dy = snapped.y - r.y;
        }
      }
      if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return;
      env = {
        ...env,
        regions: regions.map((r) =>
          r.id === drag.id ? moveRegion(r, dx, dy) : r,
        ),
      };
      drag.lastX = world.x;
      drag.lastY = world.y;
      drag.moved = true;
      envRef.current = env;
      return;
    }

    if (drag.kind === 'moveMarker') {
      let dx = world.x - drag.lastX;
      let dy = world.y - drag.lastY;
      const markers = env.markers ?? [];
      if (snapRef.current) {
        const m = markers.find((mark) => mark.id === drag.id);
        if (m) {
          const snapped = snapToGrid(m.x + dx, m.y + dy, true, ENV_EDITOR_GRID);
          dx = snapped.x - m.x;
          dy = snapped.y - m.y;
        }
      }
      if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return;
      env = {
        ...env,
        markers: markers.map((m) =>
          m.id === drag.id ? moveMarker(m, dx, dy) : m,
        ),
      };
      drag.lastX = world.x;
      drag.lastY = world.y;
      drag.moved = true;
      envRef.current = env;
      return;
    }

    if (drag.kind === 'moveTower' && env.tower) {
      let dx = world.x - drag.lastX;
      if (snapRef.current) {
        const snapped = snapToGrid(env.tower.x + dx, 0, true, ENV_EDITOR_GRID);
        dx = snapped.x - env.tower.x;
      }
      if (Math.abs(dx) < 1e-9) return;
      env = { ...env, tower: moveTower(env.tower, dx) };
      drag.lastX = world.x;
      drag.moved = true;
      envRef.current = env;
      return;
    }

    if (drag.kind === 'moveSpawn') {
      const cur = resolveSpawn(env);
      let dx = world.x - drag.lastX;
      let dy = world.y - drag.lastY;
      if (snapRef.current) {
        const snapped = snapToGrid(cur.x + dx, cur.y + dy, true, ENV_EDITOR_GRID);
        dx = snapped.x - cur.x;
        dy = snapped.y - cur.y;
      }
      if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return;
      env = { ...env, spawn: moveSpawn(cur, dx, dy) };
      drag.lastX = world.x;
      drag.lastY = world.y;
      drag.moved = true;
      envRef.current = env;
      return;
    }

    if (drag.kind === 'resizeObstacle') {
      const snapped = snapToGrid(world.x, world.y, snapRef.current, ENV_EDITOR_GRID);
      env = {
        ...env,
        obstacles: env.obstacles.map((o) =>
          o.id === drag.id
            ? resizeObstacleByCorner(o, drag.handle, snapped.x, snapped.y)
            : o,
        ),
      };
      drag.moved = true;
      envRef.current = env;
      return;
    }

    if (drag.kind === 'resizeRegion') {
      const snapped = snapToGrid(world.x, world.y, snapRef.current, ENV_EDITOR_GRID);
      const regions = env.regions ?? [];
      env = {
        ...env,
        regions: regions.map((r) =>
          r.id === drag.id
            ? resizeRegionByCorner(r, drag.handle, snapped.x, snapped.y)
            : r,
        ),
      };
      drag.moved = true;
      envRef.current = env;
      return;
    }

    if (drag.kind === 'resizeMarker') {
      const snapped = snapToGrid(world.x, world.y, snapRef.current, ENV_EDITOR_GRID);
      const markers = env.markers ?? [];
      env = {
        ...env,
        markers: markers.map((m) =>
          m.id === drag.id
            ? resizeMarkerByCorner(m, drag.handle, snapped.x, snapped.y)
            : m,
        ),
      };
      drag.moved = true;
      envRef.current = env;
      return;
    }

    if (drag.kind === 'rotateObstacle') {
      env = {
        ...env,
        obstacles: env.obstacles.map((o) =>
          o.id === drag.id ? rotateObstacle(o, world.x, world.y) : o,
        ),
      };
      drag.moved = true;
      envRef.current = env;
      return;
    }

    if (drag.kind === 'rotateRegion') {
      env = {
        ...env,
        regions: (env.regions ?? []).map((r) =>
          r.id === drag.id ? rotateRegion(r, world.x, world.y) : r,
        ),
      };
      drag.moved = true;
      envRef.current = env;
      return;
    }

    if (drag.kind === 'rotateMarker') {
      env = {
        ...env,
        markers: (env.markers ?? []).map((m) =>
          m.id === drag.id ? rotateMarker(m, world.x, world.y) : m,
        ),
      };
      drag.moved = true;
      envRef.current = env;
      return;
    }

    if (drag.kind === 'resizeTower' && env.tower) {
      const snapped = snapToGrid(world.x, world.y, snapRef.current, ENV_EDITOR_GRID);
      env = {
        ...env,
        tower: resizeTowerByHandle(
          env.tower,
          drag.handle,
          snapped.x,
          snapped.y,
        ),
      };
      drag.moved = true;
      envRef.current = env;
      return;
    }

    if (drag.kind === 'resizeTerrain' && env.terrain) {
      const snapped = snapToGrid(world.x, world.y, snapRef.current, ENV_EDITOR_GRID);
      env = {
        ...env,
        terrain: setTerrainEndpoint(env.terrain, drag.endpoint, snapped.x),
      };
      drag.moved = true;
      envRef.current = env;
    }
  };

  const onPointerUp = () => {
    panRef.current.active = false;
    finishDrag();
  };

  // Native non-passive wheel — React 19 registers onWheel as passive.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      camRef.current.zoom = Math.max(
        ENV_CAM_ZOOM_MIN,
        Math.min(ENV_CAM_ZOOM_MAX, camRef.current.zoom * factor),
      );
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="viewport-canvas"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

function drawSelectionOutline(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  fp: Footprint,
  primary: boolean,
): void {
  const corners: HandleId[] = ['nw', 'ne', 'se', 'sw'];
  ctx.save();
  ctx.strokeStyle = primary
    ? 'rgba(120, 200, 255, 0.95)'
    : 'rgba(120, 200, 255, 0.45)';
  ctx.lineWidth = primary ? 1.5 : 1;
  ctx.setLineDash(primary ? [5, 4] : [3, 3]);
  ctx.beginPath();
  for (let i = 0; i < corners.length; i++) {
    const p = handleWorldPos(fp, corners[i]);
    const s = worldToScreen(cam, w, h, p.x, p.y);
    if (i === 0) ctx.moveTo(s.x, s.y);
    else ctx.lineTo(s.x, s.y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawRotateHandle(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  fp: Footprint,
): void {
  const p = handleWorldPos(fp, 'rotate');
  const s = worldToScreen(cam, w, h, p.x, p.y);
  const topMid = localToWorld(0, fp.hh, fp);
  const a = worldToScreen(cam, w, h, topMid.x, topMid.y);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(s.x, s.y);
  ctx.strokeStyle = 'rgba(120, 200, 255, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(180, 230, 255, 0.95)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(40, 80, 120, 0.9)';
  ctx.stroke();
  ctx.restore();
}

function drawMarquee(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  marquee: { startX: number; startY: number; endX: number; endY: number },
): void {
  const a = worldToScreen(cam, w, h, marquee.startX, marquee.startY);
  const b = worldToScreen(cam, w, h, marquee.endX, marquee.endY);
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const rw = Math.abs(b.x - a.x);
  const rh = Math.abs(b.y - a.y);
  ctx.save();
  ctx.fillStyle = 'rgba(100, 180, 255, 0.12)';
  ctx.strokeStyle = 'rgba(120, 200, 255, 0.85)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.fillRect(x, y, rw, rh);
  ctx.strokeRect(x, y, rw, rh);
  ctx.restore();
}

function drawSelectionOverlay(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  fp: Footprint,
  sel: EnvSelectable,
  env: EnvironmentDesign,
): void {
  drawSelectionOutline(ctx, cam, w, h, fp, true);

  const handles: HandleId[] =
    sel.kind === 'tower'
      ? towerHandles()
      : sel.kind === 'region'
        ? regionHandles()
        : sel.kind === 'marker'
          ? markerHandles()
          : sel.kind === 'obstacle'
            ? (() => {
              const o = env.obstacles.find((x) => x.id === sel.id);
              return o ? obstacleHandles(o) : ['nw', 'ne', 'sw', 'se'];
            })()
          : [];

  ctx.save();
  for (const id of handles) {
    const p = handleWorldPos(fp, id);
    const s = worldToScreen(cam, w, h, p.x, p.y);
    if (id === 'rotate') {
      drawRotateHandle(ctx, cam, w, h, fp);
    } else {
      ctx.fillStyle = 'rgba(180, 230, 255, 0.95)';
      ctx.strokeStyle = 'rgba(40, 80, 120, 0.9)';
      ctx.lineWidth = 1.5;
      ctx.fillRect(s.x - 4, s.y - 4, 8, 8);
      ctx.strokeRect(s.x - 4, s.y - 4, 8, 8);
    }
  }
  ctx.restore();
}

function drawTerrainEndpoints(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  terrain: NonNullable<EnvironmentDesign['terrain']>,
  selected: boolean,
): void {
  ctx.save();
  for (const which of ['start', 'end'] as const) {
    const p = terrainEndpointWorld(terrain, which);
    const s = worldToScreen(cam, w, h, p.x, p.y);
    const ground = worldToScreen(cam, w, h, p.x, 0);
    ctx.strokeStyle = selected
      ? 'rgba(140, 220, 170, 0.9)'
      : 'rgba(110, 180, 140, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(ground.x, ground.y);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = selected
      ? 'rgba(160, 240, 190, 0.95)'
      : 'rgba(130, 200, 160, 0.9)';
    ctx.strokeStyle = 'rgba(30, 70, 50, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, selected ? 7 : 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = '600 10px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = selected ? '#c8f0d8' : '#9bc4ae';
    ctx.fillText(which === 'start' ? 'Start' : 'End', s.x + 9, s.y - 8);
  }
  ctx.restore();
}

function drawRampSnapCursor(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  p: Vec2,
): void {
  const s = worldToScreen(cam, w, h, p.x, p.y);
  ctx.save();
  ctx.strokeStyle = 'rgba(120, 220, 255, 0.95)';
  ctx.fillStyle = 'rgba(120, 220, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(s.x, s.y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s.x - 10, s.y);
  ctx.lineTo(s.x + 10, s.y);
  ctx.moveTo(s.x, s.y - 10);
  ctx.lineTo(s.x, s.y + 10);
  ctx.stroke();
  ctx.restore();
}

function drawRampRubberBand(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  a: Vec2,
  b: Vec2,
): void {
  const draft = rampFromTopEndpoints(a, b);
  if (draft) {
    drawObstacles(ctx, cam, w, h, previewObstacleVisuals([draft]));
  }
  const sa = worldToScreen(cam, w, h, a.x, a.y);
  const sb = worldToScreen(cam, w, h, b.x, b.y);
  ctx.save();
  ctx.strokeStyle = 'rgba(140, 230, 255, 0.95)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(sa.x, sa.y);
  ctx.lineTo(sb.x, sb.y);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const s of [sa, sb]) {
    ctx.fillStyle = 'rgba(160, 240, 255, 0.95)';
    ctx.strokeStyle = 'rgba(30, 80, 120, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawStairRubberBand(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  a: Vec2,
  b: Vec2,
): void {
  const draft = stairFromDrag(a, b);
  if (draft) {
    drawObstacles(ctx, cam, w, h, previewObstacleVisuals([draft]));
  }
  const sa = worldToScreen(cam, w, h, a.x, a.y);
  const sb = worldToScreen(cam, w, h, b.x, b.y);
  ctx.save();
  ctx.strokeStyle = 'rgba(180, 210, 255, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(sa.x, sa.y);
  ctx.lineTo(sb.x, sb.y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawSpawnMarker(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  w: number,
  h: number,
  spawn: { x: number; y: number },
  selected: boolean,
): void {
  const p = worldToScreen(cam, w, h, spawn.x, spawn.y);
  const r = Math.max(6, cam.zoom * 0.18);
  ctx.save();
  // Ground pin
  ctx.strokeStyle = selected
    ? 'rgba(255, 210, 90, 0.95)'
    : 'rgba(240, 180, 70, 0.85)';
  ctx.fillStyle = selected
    ? 'rgba(255, 210, 90, 0.35)'
    : 'rgba(240, 180, 70, 0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Crosshair
  ctx.beginPath();
  ctx.moveTo(p.x - r * 1.6, p.y);
  ctx.lineTo(p.x + r * 1.6, p.y);
  ctx.moveTo(p.x, p.y - r * 1.6);
  ctx.lineTo(p.x, p.y + r * 1.6);
  ctx.stroke();
  // Flag pole + banner
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x, p.y - r * 3.2);
  ctx.stroke();
  ctx.fillStyle = selected
    ? 'rgba(255, 200, 80, 0.9)'
    : 'rgba(230, 160, 50, 0.85)';
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - r * 3.2);
  ctx.lineTo(p.x + r * 1.8, p.y - r * 2.6);
  ctx.lineTo(p.x, p.y - r * 2);
  ctx.closePath();
  ctx.fill();
  ctx.font = '600 11px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = selected ? '#ffe6a0' : '#d4a85a';
  ctx.fillText('Spawn', p.x + r * 2, p.y - r * 2.4);
  ctx.restore();
}
