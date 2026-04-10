import { describe, it, expect, beforeEach, vi } from "vitest";

const STORAGE_KEY = "nyc-transit-own-bike";

// Mock localStorage for Node test environment
const store = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  get length() { return store.size; },
  key: (_i: number) => null as string | null,
};

vi.stubGlobal("localStorage", localStorageMock);

describe("own-bike preference localStorage", () => {
  beforeEach(() => {
    store.clear();
  });

  it("returns null when no preference is set", () => {
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("stores 'true' when preference is set", () => {
    localStorage.setItem(STORAGE_KEY, "true");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
  });

  it("removes preference when cleared", () => {
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.removeItem(STORAGE_KEY);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("survives other localStorage changes", () => {
    localStorage.setItem(STORAGE_KEY, "true");
    localStorage.setItem("other-key", "value");
    expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
  });

  it("treats non-'true' values as falsy", () => {
    localStorage.setItem(STORAGE_KEY, "false");
    expect(localStorage.getItem(STORAGE_KEY) === "true").toBe(false);

    localStorage.setItem(STORAGE_KEY, "1");
    expect(localStorage.getItem(STORAGE_KEY) === "true").toBe(false);
  });
});
