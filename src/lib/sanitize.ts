import DOMPurify from 'dompurify';

/**
 * Sanitization utilities for user input
 * Prevents XSS attacks and ensures data integrity
 */

// Configure DOMPurify with strict settings
const purifyConfig = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br'],
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true,
};

/**
 * Sanitize HTML content - removes all dangerous tags/attributes
 * Use this for any user-generated HTML content before rendering
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';
  return DOMPurify.sanitize(dirty, purifyConfig) as string;
}

/**
 * Sanitize plain text - strips ALL HTML and returns plain text
 * Use this for text inputs, names, etc.
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  // Remove all HTML tags and decode entities
  const stripped = DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
  // Trim whitespace and normalize spaces
  return stripped.trim().replace(/\s+/g, ' ');
}

/**
 * Sanitize for SQL-safe text (additional layer, not a replacement for parameterized queries)
 * Removes potentially dangerous characters
 */
export function sanitizeForDatabase(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return sanitizeText(input)
    .replace(/['";\\]/g, '') // Remove quotes and backslashes
    .substring(0, 1000); // Limit length
}

/**
 * Sanitize phone number - only allows digits, +, -, (, ), and spaces
 */
export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/[^\d+\-() ]/g, '').substring(0, 20);
}

/**
 * Sanitize email - lowercase and trim, basic format check
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  return email.toLowerCase().trim().substring(0, 255);
}

/**
 * Sanitize numeric input - returns only digits
 */
export function sanitizeNumeric(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input.replace(/\D/g, '');
}

/**
 * Sanitize URL - validates and returns safe URL or empty string
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';
  
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.href;
  } catch {
    return '';
  }
}

/**
 * Sanitize object - recursively sanitize all string values in an object
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = { ...obj };
  for (const key in result) {
    const value = result[key];
    if (typeof value === 'string') {
      (result as Record<string, unknown>)[key] = sanitizeText(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = sanitizeObject(value as Record<string, unknown>);
    }
  }
  return result;
}

/**
 * Escape special characters for use in URLs
 */
export function escapeForUrl(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return encodeURIComponent(sanitizeText(input));
}

/**
 * Check if string contains potentially dangerous content
 */
export function containsDangerousContent(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick, onerror, etc.
    /data:/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /expression\s*\(/i,
    /url\s*\(/i,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(input));
}
