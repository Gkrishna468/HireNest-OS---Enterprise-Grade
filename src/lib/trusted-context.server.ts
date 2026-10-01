let AsyncLocalStorage: any;
try {
  const asyncHooks = (eval('require')('async_hooks'));
  AsyncLocalStorage = asyncHooks.AsyncLocalStorage;
} catch {
  AsyncLocalStorage = class {
    run(store: any, callback: Function) { return callback(); }
    getStore() { return undefined; }
  };
}

export interface TrustedServiceIdentity {
  type: "SERVICE";
  service: string;
}

export const trustedContextStorage: any = new (AsyncLocalStorage as any)();

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
  return store?.type === "SERVICE";
}
