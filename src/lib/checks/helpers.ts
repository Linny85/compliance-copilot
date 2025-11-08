/**
 * Derives a metric key from a check code
 * @example deriveMetricKey("NIS2-BACKUP-AGE") => "nis2.backup.age"
 */
export function deriveMetricKey(code: string): string {
  return code
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '');
}
