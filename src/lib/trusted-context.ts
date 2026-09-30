export interface TrustedServiceIdentity {
  type: "SERVICE";
  service: string;
}

/**
 * Returns false. Server-side context is not available in browser.
 */
export function isTrustedServiceContext(): boolean {
  return false;
}

/**
 * Executes function directly. Server-side trust context is not available in browser.
 */
export async function runAsTrustedService<T>(
  identityOrFn: TrustedServiceIdentity | (() => Promise<T>),
  maybeFn?: () => Promise<T>
): Promise<T> {
  let fn: () => Promise<T>;
  if (typeof identityOrFn === "function") {
    fn = identityOrFn;
  } else {
    fn = maybeFn!;
  }
  return fn();
}

/**
 * Returns undefined. Trusted context storage is not available in browser.
 */
export function getTrustedServiceIdentity(): TrustedServiceIdentity | undefined {
  return undefined;
}
