import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchCameraSession } from "@/features/camera/session";
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "window",
    Object.assign(new EventTarget(), { setInterval: globalThis.setInterval }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const ok = () => Promise.resolve(new Response("{}", { status: 200 }));
const renewed = () =>
  Promise.resolve(
    new Response(
      JSON.stringify({
        details: { accessToken: "new-access", refreshToken: "new-refresh" },
      }),
      { status: 200 },
    ),
  );
describe("camera-owned session cleanup", () => {
  it("does nothing for a raw WHEP source without a camera login", () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    watchCameraSession()();
    expect(fetch).not.toHaveBeenCalled();
  });
  it("logs out once even if pagehide and unmount both happen", async () => {
    const fetch = vi.fn().mockImplementation(ok);
    vi.stubGlobal("fetch", fetch);
    const stop = watchCameraSession("own-access");
    window.dispatchEvent(new Event("pagehide"));
    stop();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer own-access",
    );
  });
  it("rotates only its own camera session and uses renewed access on logout", async () => {
    const fetch = vi
      .fn()
      .mockImplementationOnce(renewed)
      .mockImplementationOnce(ok);
    vi.stubGlobal("fetch", fetch);
    const stop = watchCameraSession("access", "refresh");
    await vi.advanceTimersByTimeAsync(8 * 60 * 1000);
    expect(fetch.mock.calls[0][0]).toBe("/api/v1/auth/refresh");
    stop();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer new-access",
    );
    await vi.advanceTimersByTimeAsync(20 * 60 * 1000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("refreshes expired access before retrying logout, with bounded requests", async () => {
    const fetch = vi
      .fn()
      .mockImplementationOnce(() =>
        Promise.resolve(new Response("{}", { status: 401 })),
      )
      .mockImplementationOnce(renewed)
      .mockImplementationOnce(ok);
    vi.stubGlobal("fetch", fetch);
    const stop = watchCameraSession("expired", "refresh");
    stop();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[1][0]).toBe("/api/v1/auth/refresh");
    expect(fetch.mock.calls[2][1].headers.Authorization).toBe(
      "Bearer new-access",
    );
  });
});
