import { AsyncLocalStorage } from "async_hooks";

export interface TrustedServiceIdentity {
  type: "SERVICE";
  service: string;
}

export const trustedContextStorage = new AsyncLocalStorage<TrustedServiceIdentity>();

/**
 * Executes a function block under a trusted service identity
 */
export function runAsTrustedService<T>(identity: TrustedServiceIdentity, fn: () => Promise<T>): Promise<T> {
  return trustedContextStorage.run(identity, fn);
}

/**
 * Returns the current trusted service identity if active
 */
export function getTrustedServiceIdentity(): TrustedServiceIdentity | undefined {
  return trustedContextStorage.getStore();
}

/**
 * Checks if the current execution context is an explicitly trusted service
 */
export function isTrustedServiceContext(): boolean {
  const store = trustedContextStorage.getStore();
  return store?.type === "SERVICE";
}
