import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isRecoverableChunkError, registerChunkRecovery } from "./chunkRecovery";

function makeRecoverableEvent(type: string, payload: unknown) {
  return Object.assign(new Event(type, { cancelable: true }), { payload });
}

function makeUnhandledRejectionEvent(reason: unknown) {
  return Object.assign(new Event("unhandledrejection", { cancelable: true }), { reason });
}

describe("chunk recovery", () => {
  beforeEach(() => {
    sessionStorage.clear();
    document.body.innerHTML = "";
    window.history.pushState({}, "", "/brands");
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("detects recoverable dynamic import failures", () => {
    expect(isRecoverableChunkError(new Error("Failed to fetch dynamically imported module"))).toBe(true);
    expect(isRecoverableChunkError(new Error("ChunkLoadError: Loading chunk 7 failed."))).toBe(true);
    expect(isRecoverableChunkError(new Error("Random render failure"))).toBe(false);
  });

  it("reloads once on the first recoverable preload failure", () => {
    const reload = vi.fn();
    const cleanup = registerChunkRecovery({
      reload,
      now: () => 1000,
    });

    const event = makeRecoverableEvent("vite:preloadError", new Error("Failed to fetch dynamically imported module"));
    window.dispatchEvent(event);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(JSON.parse(sessionStorage.getItem("hayer:chunk-recovery:v1") ?? "{}")).toEqual({
      path: "/brands",
      attemptedAt: 1000,
    });

    cleanup();
  });

  it("shows fallback instead of looping when the same tab already retried once", () => {
    sessionStorage.setItem(
      "hayer:chunk-recovery:v1",
      JSON.stringify({ path: "/brands", attemptedAt: 5000 }),
    );

    const reload = vi.fn();
    const onFallback = vi.fn();
    const cleanup = registerChunkRecovery({
      reload,
      onFallback,
      now: () => 5500,
      settleDelayMs: 60_000,
    });

    const event = makeUnhandledRejectionEvent(new Error("ChunkLoadError: Loading chunk 17 failed."));
    window.dispatchEvent(event);

    expect(reload).not.toHaveBeenCalled();
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);

    cleanup();
  });

  it("ignores unrelated runtime errors", () => {
    const reload = vi.fn();
    const onFallback = vi.fn();
    const cleanup = registerChunkRecovery({
      reload,
      onFallback,
    });

    window.dispatchEvent(new ErrorEvent("error", { message: "ResizeObserver loop completed" }));

    expect(reload).not.toHaveBeenCalled();
    expect(onFallback).not.toHaveBeenCalled();

    cleanup();
  });

  it("clears the pending recovery flag after a stable settle window", () => {
    sessionStorage.setItem(
      "hayer:chunk-recovery:v1",
      JSON.stringify({ path: "/brands", attemptedAt: 2000 }),
    );

    const cleanup = registerChunkRecovery({
      now: () => 2500,
      settleDelayMs: 5000,
    });

    vi.advanceTimersByTime(5000);

    expect(sessionStorage.getItem("hayer:chunk-recovery:v1")).toBeNull();

    cleanup();
  });
});
