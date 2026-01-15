/**
 * Client-side rate limiting utility
 * Prevents brute-force attacks on login and API abuse
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  blockedUntil: number | null;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_BLOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes block

const API_MAX_REQUESTS = 100;
const API_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Check if login is rate limited
 */
export function checkLoginRateLimit(identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
  blockedUntil: Date | null;
  message?: string;
} {
  const key = `login:${identifier}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // No previous attempts
  if (!entry) {
    return { allowed: true, remainingAttempts: LOGIN_MAX_ATTEMPTS, blockedUntil: null };
  }

  // Check if currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const remainingSeconds = Math.ceil((entry.blockedUntil - now) / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil: new Date(entry.blockedUntil),
      message: `Too many login attempts. Try again in ${minutes}m ${seconds}s`,
    };
  }

  // Check if window has expired, reset if so
  if (now - entry.firstAttempt > LOGIN_WINDOW_MS) {
    rateLimitStore.delete(key);
    return { allowed: true, remainingAttempts: LOGIN_MAX_ATTEMPTS, blockedUntil: null };
  }

  // Check remaining attempts
  const remainingAttempts = LOGIN_MAX_ATTEMPTS - entry.attempts;
  if (remainingAttempts <= 0) {
    // Block the user
    entry.blockedUntil = now + LOGIN_BLOCK_DURATION_MS;
    rateLimitStore.set(key, entry);
    return {
      allowed: false,
      remainingAttempts: 0,
      blockedUntil: new Date(entry.blockedUntil),
      message: 'Too many login attempts. Please try again later.',
    };
  }

  return { allowed: true, remainingAttempts, blockedUntil: null };
}

/**
 * Record a login attempt
 */
export function recordLoginAttempt(identifier: string, success: boolean): void {
  const key = `login:${identifier}`;
  const now = Date.now();

  if (success) {
    // Clear rate limit on successful login
    rateLimitStore.delete(key);
    return;
  }

  const entry = rateLimitStore.get(key);
  if (!entry || now - entry.firstAttempt > LOGIN_WINDOW_MS) {
    rateLimitStore.set(key, {
      attempts: 1,
      firstAttempt: now,
      blockedUntil: null,
    });
  } else {
    entry.attempts++;
    rateLimitStore.set(key, entry);
  }
}

/**
 * Check API rate limit
 */
export function checkApiRateLimit(identifier: string): {
  allowed: boolean;
  remainingRequests: number;
} {
  const key = `api:${identifier}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.firstAttempt > API_WINDOW_MS) {
    rateLimitStore.set(key, {
      attempts: 1,
      firstAttempt: now,
      blockedUntil: null,
    });
    return { allowed: true, remainingRequests: API_MAX_REQUESTS - 1 };
  }

  entry.attempts++;
  const remaining = API_MAX_REQUESTS - entry.attempts;
  rateLimitStore.set(key, entry);

  return {
    allowed: remaining >= 0,
    remainingRequests: Math.max(0, remaining),
  };
}

/**
 * Clear rate limit for an identifier
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(`login:${identifier}`);
  rateLimitStore.delete(`api:${identifier}`);
}

/**
 * Get formatted time remaining until unblock
 */
export function getBlockTimeRemaining(blockedUntil: Date | null): string {
  if (!blockedUntil) return '';
  
  const now = Date.now();
  const remaining = blockedUntil.getTime() - now;
  
  if (remaining <= 0) return '';
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}
