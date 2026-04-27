export interface PersistedQueryRecord<T> {
  updatedAt: number;
  data: T;
}

const STORAGE_PREFIX = "hayer:query:";

function getStorage() {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function toStorageKey(key: string | readonly unknown[]) {
  const suffix = typeof key === "string" ? key : JSON.stringify(key);
  return `${STORAGE_PREFIX}${suffix}`;
}

export function readPersistedQuery<T>(key: string | readonly unknown[], maxAgeMs: number): PersistedQueryRecord<T> | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(toStorageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedQueryRecord<T>;
    if (!parsed || typeof parsed.updatedAt !== "number") return null;
    if (Date.now() - parsed.updatedAt > maxAgeMs) {
      storage.removeItem(toStorageKey(key));
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writePersistedQuery<T>(key: string | readonly unknown[], value: PersistedQueryRecord<T>) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(toStorageKey(key), JSON.stringify(value));
  } catch {
    // Ignore storage quota / private mode failures.
  }
}
