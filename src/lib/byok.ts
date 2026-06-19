// BYOK — bring your own Anthropic API key for unlimited usage.
// The key is stored ONLY in this browser's localStorage and sent to our proxy
// per-request (over HTTPS) so it can make the Anthropic call on your behalf.
// It is never persisted on our servers. Clearing it here removes it completely.

const KEY = "openpath_byok";

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setApiKey(key: string): void {
  localStorage.setItem(KEY, key.trim());
}

export function clearApiKey(): void {
  localStorage.removeItem(KEY);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

/** Plausible-shape check (not a guarantee the key is valid). */
export function looksValid(key: string): boolean {
  const k = key.trim();
  return k.startsWith("sk-ant-") && k.length > 20;
}
