import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readPersistedQuery, writePersistedQuery } from "./queryStorage";

describe("queryStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it("reads a persisted query inside its TTL", () => {
    writePersistedQuery(["catalog", "bootstrap"], {
      updatedAt: Date.now(),
      data: { ok: true },
    });

    expect(readPersistedQuery<{ ok: boolean }>(["catalog", "bootstrap"], 5 * 60_000)).toEqual({
      updatedAt: Date.now(),
      data: { ok: true },
    });
  });

  it("expires persisted data outside its TTL", () => {
    writePersistedQuery(["catalog", "bootstrap"], {
      updatedAt: Date.now(),
      data: { ok: true },
    });

    vi.advanceTimersByTime(5 * 60_000 + 1);

    expect(readPersistedQuery<{ ok: boolean }>(["catalog", "bootstrap"], 5 * 60_000)).toBeNull();
  });
});
