import { createRng, gaussian, randomWeights } from './network';
import { WEIGHT_INIT_SIGMA } from './constants';
import type { NetworkShape } from './types';

/** True when `from` can prefix-expand (or match) into `to`. Shrinking inputs is refused. */
export function canTransplantShapes(
  from: NetworkShape,
  to: NetworkShape,
): boolean {
  return from.inputCount <= to.inputCount;
}

/** Same hidden/output, fewer or more input channels — weightCount follows. */
export function shapeWithInputCount(
  from: NetworkShape,
  inputCount: number,
): NetworkShape {
  const { hiddenCount, outputCount } = from;
  return {
    inputCount,
    hiddenCount,
    outputCount,
    weightCount:
      hiddenCount * inputCount +
      hiddenCount +
      outputCount * hiddenCount +
      outputCount,
  };
}

/**
 * Drop extra input columns (e.g. raycast whiskers) while keeping hidden/output.
 * Used so a loco+raycast brain can prefix-transfer into combat/dance packs.
 */
export function trimInputPrefix(
  fromShape: NetworkShape,
  fromWeights: Float32Array,
  keepInputs: number,
): { shape: NetworkShape; weights: Float32Array } | null {
  if (keepInputs <= 0 || keepInputs > fromShape.inputCount) return null;
  if (fromWeights.length !== fromShape.weightCount) return null;
  if (keepInputs === fromShape.inputCount) {
    return { shape: fromShape, weights: fromWeights };
  }

  const toShape = shapeWithInputCount(fromShape, keepInputs);
  const fi = fromShape.inputCount;
  const fh = fromShape.hiddenCount;
  const fo = fromShape.outputCount;
  const ti = keepInputs;

  const fromW1End = fh * fi;
  const fromB1End = fromW1End + fh;
  const fromW2End = fromB1End + fo * fh;

  const toW1End = fh * ti;
  const toB1End = toW1End + fh;
  const toW2End = toB1End + fo * fh;

  const out = new Float32Array(toShape.weightCount);
  for (let h = 0; h < fh; h++) {
    for (let i = 0; i < ti; i++) {
      out[h * ti + i] = fromWeights[h * fi + i]!;
    }
    out[toW1End + h] = fromWeights[fromW1End + h]!;
  }
  for (let o = 0; o < fo; o++) {
    for (let h = 0; h < fh; h++) {
      out[toB1End + o * fh + h] = fromWeights[fromB1End + o * fh + h]!;
    }
    out[toW2End + o] = fromWeights[fromW2End + o]!;
  }
  return { shape: toShape, weights: out };
}

/**
 * Copy overlapping MLP weights from `fromShape` into a new vector sized for
 * `toShape`. Shared hidden/output rows and prefix input columns are preserved;
 * new actuator channels, hidden units, and extra inputs are randomly initialized.
 */
export function transplantWeights(
  fromShape: NetworkShape,
  fromWeights: Float32Array,
  toShape: NetworkShape,
  rng?: () => number,
): Float32Array | null {
  if (!canTransplantShapes(fromShape, toShape)) return null;
  if (fromWeights.length !== fromShape.weightCount) return null;

  const rand = rng ?? createRng(0xadab7e11);
  const out = randomWeights(toShape, rand);

  const fi = fromShape.inputCount;
  const fh = fromShape.hiddenCount;
  const fo = fromShape.outputCount;
  const ti = toShape.inputCount;
  const th = toShape.hiddenCount;
  const to = toShape.outputCount;
  const sharedInputs = Math.min(fi, ti);

  const fromW1End = fh * fi;
  const fromB1End = fromW1End + fh;
  const fromW2End = fromB1End + fo * fh;

  const toW1End = th * ti;
  const toB1End = toW1End + th;
  const toW2End = toB1End + to * th;

  const sharedHidden = Math.min(fh, th);
  const sharedOutput = Math.min(fo, to);

  for (let h = 0; h < sharedHidden; h++) {
    for (let i = 0; i < sharedInputs; i++) {
      out[h * ti + i] = fromWeights[h * fi + i]!;
    }
    out[toW1End + h] = fromWeights[fromW1End + h]!;
  }

  for (let o = 0; o < sharedOutput; o++) {
    for (let h = 0; h < sharedHidden; h++) {
      out[toB1End + o * th + h] = fromWeights[fromB1End + o * fh + h]!;
    }
    out[toW2End + o] = fromWeights[fromW2End + o]!;
  }

  return out;
}

/** Small jitter on transplanted weights so new channels are not stuck at zero grad. */
export function jitterTransplantedWeights(
  weights: Float32Array,
  rng?: () => number,
  sigma = WEIGHT_INIT_SIGMA * 0.05,
): Float32Array {
  const rand = rng ?? createRng(0x1771ee);
  const out = new Float32Array(weights);
  for (let i = 0; i < out.length; i++) {
    out[i] += gaussian(rand, sigma);
  }
  return out;
}
