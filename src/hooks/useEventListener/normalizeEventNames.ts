/**
 * Deduplicate event names while preserving first-occurrence order.
 * Does not mutate the consumer’s array.
 */
export function normalizeEventNames(
  eventName: string | readonly string[],
): string[] {
  if (typeof eventName === 'string') {
    return [eventName]
  }

  const seen = new Set<string>()
  const result: string[] = []

  for (const name of eventName) {
    if (seen.has(name)) {
      continue
    }
    seen.add(name)
    result.push(name)
  }

  return result
}
