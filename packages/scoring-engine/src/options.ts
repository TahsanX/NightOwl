/** Typed readers for profile-supplied factor options, with a documented default. */

export function numberOption(
  options: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const value = options[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function stringListOption(
  options: Record<string, unknown>,
  key: string,
  fallback: string[],
): string[] {
  const value = options[key];
  return Array.isArray(value) && value.every((v) => typeof v === 'string')
    ? (value as string[])
    : fallback;
}
