const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 5, windowMs = 60_000) {
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || rec.reset < now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (rec.count >= limit) return false;
  rec.count++;
  return true;
}