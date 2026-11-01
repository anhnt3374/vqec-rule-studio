import { setRuntimeAccess } from "@/features/runtime/store";
import type { WhepSource } from "@/hooks/useWhep";
interface Envelope<T> {
  details: T;
}
async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  token?: string,
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new Error(
      `Camera API: HTTP ${response.status}. ${response.status === 401 ? "Check the existing camera account." : response.status === 429 ? "Session limit reached. Close an existing viewer and retry." : response.status === 503 ? "AI stream is not ready yet." : "Check camera service availability."}`,
    );
  return ((await response.json()) as Envelope<T>).details;
}
export async function connectBoard(
  username: string,
  password: string,
): Promise<WhepSource> {
  const session = await request<{
    accessToken: string;
    refreshToken: string;
    navigateTo: string;
  }>("/api/v1/auth/login", "POST", { username, password });
  try {
    if (session.navigateTo !== "LIVE_VIEW")
      throw new Error(
        "Complete account setup in the existing camera web UI first.",
      );
    const cameras = await request<{ items: { id: string; name: string }[] }>(
      "/api/v1/cameras",
      "GET",
      undefined,
      session.accessToken,
    );
    const camera = cameras.items[0];
    if (!camera) throw new Error("No camera is available.");
    const media = await request<{
      whepUrl: string;
      mediaToken: string;
      streamType: string;
      aiEnabled: boolean;
    }>(
      `/api/v1/cameras/${camera.id}/live-stream?streamType=AI`,
      "GET",
      undefined,
      session.accessToken,
    );
    const url = new URL(media.whepUrl, location.origin);
    if (media.streamType !== "AI" || url.origin !== location.origin)
      throw new Error("Camera did not return a local AI stream.");
    setRuntimeAccess(session.accessToken);
    return {
      url: url.href,
      token: media.mediaToken,
      sessionAccess: session.accessToken,
      sessionRefresh: session.refreshToken,
      cameraName: camera.name,
    };
  } catch (error) {
    await fetch("/api/v1/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    }).catch(() => {});
    throw error;
  }
}
