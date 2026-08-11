import { useEffect, useRef } from 'react';
import type { CreatureDesign } from '../creature/types';
import { paintCreaturePreview } from '../library/creaturePreviewPaint';

interface Props {
  design: CreatureDesign;
  width?: number;
  height?: number;
}

/** Read-only joint/bone/muscle sketch for the Creatures browser. */
export function CreatureDesignPreview({
  design,
  width = 260,
  height = 160,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintCreaturePreview(ctx, design, width, height);
  }, [design, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="creature-design-preview"
      style={{ width, height }}
      width={width}
      height={height}
      aria-label={`Preview of ${design.name || 'creature'}`}
    />
  );
}
