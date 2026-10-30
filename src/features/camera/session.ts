// The camera owns authentication. Keep only this viewer's session in memory.
export function watchCameraSession(access?: string, refresh?: string) {
  if (!access) return () => {};
  let token = access,
    renewal = refresh,
    stopped = false;
  let rotation: Promise<void> | null = null;
  async function rotate() {
    if (!renewal) return;
    if (rotation) return rotation;
    rotation = (async () => {
      const response = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: renewal }),
        keepalive: true,
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("Camera session refresh failed");
      const { details } = (await response.json()) as {
        details: { accessToken: string; refreshToken: string };
      };
      token = details.accessToken;
      renewal = details.refreshToken;
    })();
    try {
      await rotation;
    } finally {
      rotation = null;
    }
  }
  const logoutRequest = () =>
    fetch("/api/v1/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: "{}",
      keepalive: true,
      signal: AbortSignal.timeout(10000),
    });
  const timer = refresh
    ? window.setInterval(
        () => {
          void rotate().catch(() => {});
        },
        8 * 60 * 1000,
      )
    : null;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (timer !== null) clearInterval(timer);
    window.removeEventListener("pagehide", stop);
    void (async () => {
      try {
        if (rotation) await rotation;
        const response = await logoutRequest();
        if (response.status === 401 && renewal) {
          await rotate();
          await logoutRequest();
        }
      } catch {
        /* The existing camera session expiry remains the final bound. */
      }
    })();
  };
  window.addEventListener("pagehide", stop);
  return stop;
}
