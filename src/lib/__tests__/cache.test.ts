import { CacheStore } from "@/lib/cache";

describe("CacheStore", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("stores and retrieves values", () => {
    const cache = new CacheStore(1000);
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("returns undefined for missing keys", () => {
    const cache = new CacheStore();
    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("expires entries after TTL", () => {
    const cache = new CacheStore(100);
    cache.set("key", "value");
    jest.advanceTimersByTime(101);
    expect(cache.get("key")).toBeUndefined();
  });

  it("supports per-entry TTL override", () => {
    const cache = new CacheStore(1000);
    cache.set("short", "value", 50);
    jest.advanceTimersByTime(51);
    expect(cache.get("short")).toBeUndefined();
  });

  it("has returns true for existing keys", () => {
    const cache = new CacheStore();
    cache.set("key", "value");
    expect(cache.has("key")).toBe(true);
  });

  it("has returns false for missing keys", () => {
    const cache = new CacheStore();
    expect(cache.has("key")).toBe(false);
  });

  it("has returns false for expired keys", () => {
    const cache = new CacheStore(50);
    cache.set("key", "value");
    jest.advanceTimersByTime(51);
    expect(cache.has("key")).toBe(false);
  });

  it("delete removes a key", () => {
    const cache = new CacheStore();
    cache.set("key", "value");
    expect(cache.delete("key")).toBe(true);
    expect(cache.get("key")).toBeUndefined();
  });

  it("delete returns false for missing key", () => {
    const cache = new CacheStore();
    expect(cache.delete("nonexistent")).toBe(false);
  });

  it("clear removes all entries", () => {
    const cache = new CacheStore();
    cache.set("a", 1);
    cache.set("b", 2);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it("size returns correct count", () => {
    const cache = new CacheStore();
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.size).toBe(2);
  });

  it("size excludes expired entries", () => {
    const cache = new CacheStore(50);
    cache.set("a", 1);
    jest.advanceTimersByTime(51);
    expect(cache.size).toBe(1);
    expect(cache.get("a")).toBeUndefined();
  });

  it("stores various value types", () => {
    const cache = new CacheStore();
    cache.set("num", 42);
    cache.set("obj", { foo: "bar" });
    cache.set("arr", [1, 2, 3]);
    cache.set("bool", true);
    expect(cache.get("num")).toBe(42);
    expect(cache.get("obj")).toEqual({ foo: "bar" });
    expect(cache.get("arr")).toEqual([1, 2, 3]);
    expect(cache.get("bool")).toBe(true);
  });

  it("overwrites existing keys", () => {
    const cache = new CacheStore();
    cache.set("key", "old");
    cache.set("key", "new");
    expect(cache.get("key")).toBe("new");
  });
});
