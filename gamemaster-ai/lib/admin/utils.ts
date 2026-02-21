/**
 * Normalize scenario IDs from unknown input to a deduplicated string array.
 * Returns undefined if input is undefined (no change intended).
 * Returns null if input is invalid format.
 * Returns string[] if valid.
 */
export function normalizeScenarioIds(ids?: unknown): string[] | null | undefined {
  if (ids === undefined) return undefined;
  if (!ids) return [];
  if (!Array.isArray(ids)) return null;
  return Array.from(
    new Set(
      ids.map((id) => String(id).trim()).filter(Boolean)
    )
  );
}
