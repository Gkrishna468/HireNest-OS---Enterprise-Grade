// Browser stub for google-logging-utils to prevent Node logging overhead and browser evaluation errors.

export const env = {
  nodeEnables: 'GOOGLE_SDK_NODE_LOGGING',
};

export const placeholder = () => {};

export function setBackend() {}

export function getStructuredBackend() {
  return {};
}

export function log() {
  return placeholder;
}

export default {
  env,
  placeholder,
  setBackend,
  getStructuredBackend,
  log,
};
