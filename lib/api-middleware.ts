import { NextResponse } from "next/server";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 120;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const keyedBuckets = new Map<string, Bucket>();

function getBucket(key: string): Bucket {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    const fresh: Bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, fresh);
    return fresh;
  }
  return b;
}

function getKeyedBucket(key: string, windowMs: number): Bucket {
  const now = Date.now();
  const b = keyedBuckets.get(key);
  if (!b || now >= b.resetAt) {
    const fresh: Bucket = { count: 0, resetAt: now + windowMs };
    keyedBuckets.set(key, fresh);
    return fresh;
  }
  return b;
}

export type RateLimitResult =
  | { ok: true; headers: Record<string, string> }
  | { ok: false; response: NextResponse };

export function withRateLimit(request: Request, token: string): RateLimitResult;
export function withRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { limited: boolean };
export function withRateLimit(
  first: Request | string,
  second: string | number,
  third?: number
): RateLimitResult | { limited: boolean } {
  if (first instanceof Request) {
    const token = second as string;
    const b = getBucket(token);
    b.count += 1;
    const remaining = Math.max(0, MAX_REQUESTS - b.count);
    const headers: Record<string, string> = {
      "X-RateLimit-Limit": String(MAX_REQUESTS),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(Math.ceil(b.resetAt / 1000)),
    };
    if (b.count > MAX_REQUESTS) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: "Too many requests" },
          {
            status: 429,
            headers: {
              ...headers,
              "Retry-After": String(Math.ceil((b.resetAt - Date.now()) / 1000)),
            },
          }
        ),
      };
    }
    return { ok: true, headers };
  }

  const key = first;
  const maxRequests = second as number;
  const windowMs = third!;
  const b = getKeyedBucket(key, windowMs);
  b.count += 1;
  if (b.count > maxRequests) {
    return { limited: true };
  }
  return { limited: false };
}
