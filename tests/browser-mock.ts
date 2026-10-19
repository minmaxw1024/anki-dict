import { vi } from "vitest";

/** In-memory stand-in for `browser.storage.local`. */
export function createBrowserMock() {
  let store: Record<string, unknown> = {};

  const pick = (keys: string | string[] | null) => {
    if (keys === null) return structuredClone(store);
    const list = Array.isArray(keys) ? keys : [keys];
    return Object.fromEntries(
      list.filter((k) => k in store).map((k) => [k, structuredClone(store[k])]),
    );
  };

  const local = {
    get: vi.fn(async (keys: string | string[] | null) => pick(keys)),
    set: vi.fn(async (items: Record<string, unknown>) => {
      store = { ...store, ...structuredClone(items) };
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) delete store[key];
    }),
    getBytesInUse: vi.fn(async () => JSON.stringify(store).length),
  };

  return {
    browser: { storage: { local } },
    get store() {
      return store;
    },
    seed(data: Record<string, unknown>) {
      store = structuredClone(data);
    },
  };
}
