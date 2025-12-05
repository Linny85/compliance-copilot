/**
 * Converts a fractional value to a percentage (always treats input as 0..1 unit).
 * Invalid, null, or negative inputs return 0.
 */
export function toPct(value: number | null | undefined): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.round(numeric * 100);
}

/**
 * Converts a value to a unit (0-1 range)
 * Handles both 0-1 and 0-100 inputs.
 */
export function toUnit(value: number | null | undefined): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return numeric > 1 ? numeric / 100 : numeric;
}

/**
 * Clamps a percentage value to 0-100 range.
 */
export function clampPct(value: number | null | undefined): number {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}
