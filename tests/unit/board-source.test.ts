import { afterEach, describe, expect, it, vi } from "vitest";
import { connectBoard } from "@/features/camera/board";
afterEach(() => vi.unstubAllGlobals());
const reply = (details: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify({ details }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
describe("existing board API integration", () => {
  it("gets the AI URL from camera metadata and keeps auth out of configuration", async () => {
    vi.stubGlobal("location", { origin: "https://board:8444" });
    const fetch = vi
      .fn()
      .mockImplementationOnce(() =>
        reply({ accessToken: "access", navigateTo: "LIVE_VIEW" }),
      )
      .mockImplementationOnce(() =>
        reply({ items: [{ id: "camera-id", name: "Board camera" }] }),
      )
      .mockImplementationOnce(() =>
        reply({
          whepUrl: "/api/v1/media/ai/whep",
          mediaToken: "media",
          streamType: "AI",
          aiEnabled: true,
        }),
      );
    vi.stubGlobal("fetch", fetch);
    const source = await connectBoard("admin", "secret");
    expect(source.url).toBe("https://board:8444/api/v1/media/ai/whep");
    expect(source.cameraName).toBe("Board camera");
    expect(source.token).toBe("media");
    expect(source.sessionAccess).toBe("access");
    expect(fetch.mock.calls[2][0]).toContain("streamType=AI");
  });
  it("logs out its own session if metadata discovery fails", async () => {
    const fetch = vi
      .fn()
      .mockImplementationOnce(() =>
        reply({ accessToken: "access", navigateTo: "LIVE_VIEW" }),
      )
      .mockImplementationOnce(() => reply({}, 503))
      .mockImplementationOnce(() => reply({ success: true }));
    vi.stubGlobal("fetch", fetch);
    await expect(connectBoard("admin", "secret")).rejects.toThrow("HTTP 503");
    expect(fetch.mock.calls[2][0]).toBe("/api/v1/auth/logout");
  });
  it("does not create another session on rejected login", async () => {
    const fetch = vi.fn().mockImplementation(() => reply({}, 401));
    vi.stubGlobal("fetch", fetch);
    await expect(connectBoard("admin", "bad")).rejects.toThrow("HTTP 401");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("rejects an unexpected external media URL and logs out", async () => {
    vi.stubGlobal("location", { origin: "https://board:8444" });
    const fetch = vi
      .fn()
      .mockImplementationOnce(() =>
        reply({ accessToken: "access", navigateTo: "LIVE_VIEW" }),
      )
      .mockImplementationOnce(() =>
        reply({ items: [{ id: "camera-id", name: "Board camera" }] }),
      )
      .mockImplementationOnce(() =>
        reply({
          whepUrl: "https://elsewhere/stream",
          mediaToken: "media",
          streamType: "AI",
        }),
      )
      .mockImplementationOnce(() => reply({ success: true }));
    vi.stubGlobal("fetch", fetch);
    await expect(connectBoard("admin", "secret")).rejects.toThrow(
      "local AI stream",
    );
    expect(fetch.mock.calls[3][0]).toBe("/api/v1/auth/logout");
  });
});
