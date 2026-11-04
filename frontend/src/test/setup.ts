import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, String(value));
    },
  };
}

if (typeof window !== "undefined" && !window.localStorage) {
  const storage = createMemoryStorage();
  Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
  Object.defineProperty(globalThis, "localStorage", {
    value: storage,
    configurable: true,
  });
}
if (typeof window !== "undefined" && !window.sessionStorage) {
  const storage = createMemoryStorage();
  Object.defineProperty(window, "sessionStorage", { value: storage, configurable: true });
  Object.defineProperty(globalThis, "sessionStorage", {
    value: storage,
    configurable: true,
  });
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  window.sessionStorage.clear();
});
