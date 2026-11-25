let fallbackId = 0;

export function createClientId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  fallbackId += 1;
  return `formcraft-${Date.now().toString(36)}-${fallbackId.toString(36)}`;
}
