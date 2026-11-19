import { NextRequest } from "next/server";

export interface RateLimitOptions {
  windowMs?: number; // Duration of window (default 60,000 ms = 1 min)
  maxRequests?: number; // Max requests allowed per window (default 5)
  keyPrefix?: string; // Prefix for cache keys
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds: number;
  message?: string;
}

// In-memory sliding log rate limiter storage
// Map<key, array of request timestamps in ms>
const rateLimitStore = new Map<string, number[]>();
const MAX_ENTRIES = 5000;

// Periodic cleanup to avoid memory leaks in serverless runtimes
let lastCleanup = Date.now();
function cleanupExpired(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < 60_000) return; // Cleanup at most once per minute
  lastCleanup = now;

  for (const [key, timestamps] of rateLimitStore.entries()) {
    const valid = timestamps.filter((t) => now - t < windowMs);
    if (valid.length === 0) {
      rateLimitStore.delete(key);
    } else {
      rateLimitStore.set(key, valid);
    }
  }

  // Hard safety limit to protect process memory
  if (rateLimitStore.size > MAX_ENTRIES) {
    rateLimitStore.clear();
  }
}

/**
 * Extracts a robust client identifier from NextRequest and optional user context
 */
export function getClientIdentifier(req: NextRequest, userIdOrEmail?: string | number | null): string {
  if (userIdOrEmail) {
    return `user:${String(userIdOrEmail).toLowerCase().trim()}`;
  }

  // Fallback to client IP headers
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const cfIp = req.headers.get("cf-connecting-ip");

  const rawIp = forwarded ? forwarded.split(",")[0].trim() : realIp || cfIp || "127.0.0.1";
  return `ip:${rawIp}`;
}

/**
 * Enterprise Sliding Window Rate Limit Checker
 * Calculates remaining requests within a moving 60-second window.
 */
export function checkSlidingWindowRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const windowMs = options.windowMs || 60_000; // 1 minute
  const maxRequests = options.maxRequests || 5; // 5 requests / min
  const prefix = options.keyPrefix || "ai-rate-limit";
  const key = `${prefix}:${identifier}`;

  cleanupExpired(windowMs);

  const now = Date.now();
  const existing = rateLimitStore.get(key) || [];
  const validTimestamps = existing.filter((timestamp) => now - timestamp < windowMs);

  if (validTimestamps.length >= maxRequests) {
    const oldestTimestamp = validTimestamps[0];
    const retryAfterMs = Math.max(1000, oldestTimestamp + windowMs - now);
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      resetSeconds: retryAfterSeconds,
      retryAfterSeconds,
      message: `AI কোটা সুরক্ষার জন্য প্রতি মিনিটে সর্বোচ্চ ${maxRequests}টি প্রশ্ন করা যাবে। অনুগ্রহ করে ${retryAfterSeconds} সেকেন্ড পর আবার চেষ্টা করুন। (Rate limit exceeded: maximum ${maxRequests} queries per minute. Please try again in ${retryAfterSeconds} seconds.)`,
    };
  }

  validTimestamps.push(now);
  rateLimitStore.set(key, validTimestamps);

  const remaining = Math.max(0, maxRequests - validTimestamps.length);
  const resetSeconds = Math.ceil(windowMs / 1000);

  return {
    success: true,
    limit: maxRequests,
    remaining,
    resetSeconds,
    retryAfterSeconds: 0,
  };
}
