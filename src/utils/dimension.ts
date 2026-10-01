export const MAX_DIMENSION = 16384;

export function clampDimension(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_DIMENSION, Math.max(1, Math.round(value)));
}

export function normalizeVideoDimension(value: number): number {
  const clamped = clampDimension(value);
  if (clamped % 2 === 0) return clamped;
  return Math.min(MAX_DIMENSION, clamped + 1);
}
