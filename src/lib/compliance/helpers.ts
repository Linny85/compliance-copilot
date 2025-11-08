/**
 * Converts a value to a percentage (0-100 range)
 * Handles both 0-1 and 0-100 inputs
 */
export function toPct(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (value <= 1) return Math.round(value * 100);
  return Math.round(value);
}

/**
 * Converts a value to a unit (0-1 range)
 * Handles both 0-1 and 0-100 inputs
 */
export function toUnit(value: number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (value > 1) return value / 100;
  return value;
}

/**
 * Clamps a percentage value to 0-100 range
 */
export function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}
