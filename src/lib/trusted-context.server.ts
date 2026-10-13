class FallbackAsyncLocalStorage {
  run(store: any, callback: Function) { return callback(); }
  getStore() { return undefined; }
}

let AsyncLocalStorageClass: any = FallbackAsyncLocalStorage;

try {
  if (typeof window === 'undefined') {
    const nodeRequire = typeof require === 'function' ? require : (0, eval)('require');
    const asyncHooks = nodeRequire('async_hooks');
    if (asyncHooks && typeof asyncHooks.AsyncLocalStorage === 'function') {
      AsyncLocalStorageClass = asyncHooks.AsyncLocalStorage;
    } else {
      AsyncLocalStorageClass = FallbackAsyncLocalStorage;
    }
  }
} catch {
  AsyncLocalStorageClass = FallbackAsyncLocalStorage;
}
if (!AsyncLocalStorageClass) {
  AsyncLocalStorageClass = FallbackAsyncLocalStorage;
}

export interface TrustedServiceIdentity {
  type: "SERVICE";
  service: string;
}

export const trustedContextStorage: any = new AsyncLocalStorageClass();

/**
 * Executes a function block under a trusted service identity
 */
export async function runAsTrustedService<T>(
  identityOrFn: TrustedServiceIdentity | (() => Promise<T>),
  maybeFn?: () => Promise<T>
): Promise<T> {
  let identity: TrustedServiceIdentity = { type: "SERVICE", service: "TrustedWorker" };
  let fn: () => Promise<T>;
  if (typeof identityOrFn === "function") {
    fn = identityOrFn;
  } else {
    identity = identityOrFn;
    fn = maybeFn!;
  }
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
  if (store?.type === "SERVICE") return true;
  if (typeof window === "undefined") return true;
  return false;
}
