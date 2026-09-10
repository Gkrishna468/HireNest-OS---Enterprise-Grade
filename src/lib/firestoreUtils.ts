/**
 * Utility functions for Firestore operations and payload sanitization
 */

/**
 * Recursively removes `undefined` properties and replaces undefined values
 * within objects and arrays to prevent Firestore's fatal:
 * "Unsupported field value: undefined" errors.
 */
export function sanitizeFirestorePayload<T>(data: T): T {
  if (data === undefined) {
    return null as any;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (data instanceof Date) {
    return data.toISOString() as any;
  }
  // Preserve Firestore FieldValue sentinels or Timestamps if present
  if ((data as any)?._methodName || typeof (data as any)?.toMillis === 'function') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestorePayload(item)) as any;
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      const sanitized = sanitizeFirestorePayload(value);
      if (sanitized !== undefined) {
        cleanObj[key] = sanitized;
      }
    }
  }
  return cleanObj as T;
}
