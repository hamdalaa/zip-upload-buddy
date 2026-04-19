interface Bucket {
  count: number;
  resetAt: number;
}

export class TokenRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  consume(key: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (current.count >= max) {
      return false;
    }
    current.count += 1;
    return true;
  }
}
