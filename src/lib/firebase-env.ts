// src/lib/firebase-env.ts
export const getEnvVar = (name: string): string | undefined => {
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name];
  }
  if (typeof window !== 'undefined' && (window as any).__ENV) {
      const meta = (window as any).__ENV;
      return meta[name] || meta[`VITE_${name}`];
  }
  return undefined;
};
