const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(ip: string, maxRequests = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}
