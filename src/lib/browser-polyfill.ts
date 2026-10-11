// Polyfill process object for browser environments to prevent errors in packages like google-logging-utils
if (typeof window !== 'undefined') {
  const g = window as any;
  if (!g.process) {
    g.process = {
      env: {
        NODE_ENV: 'production',
        GOOGLE_SDK_NODE_LOGGING: 'false',
      },
      argv: [],
      platform: 'browser',
      nextTick: (fn: Function) => setTimeout(fn, 0),
    };
  } else if (!g.process.env) {
    g.process.env = {
      NODE_ENV: 'production',
      GOOGLE_SDK_NODE_LOGGING: 'false',
    };
  } else {
    g.process.env.GOOGLE_SDK_NODE_LOGGING = g.process.env.GOOGLE_SDK_NODE_LOGGING || 'false';
    g.process.env.NODE_ENV = g.process.env.NODE_ENV || 'production';
  }
}

export {};
