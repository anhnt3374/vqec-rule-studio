import { useEffect, useState } from "react";
export interface WhepSource {
  url: string;
  token: string;
}
export function useWhep(source: WhepSource | null) {
  const [stream, setStream] = useState<MediaStream | null>(null),
    [status, setStatus] = useState("Local scene");
  useEffect(() => {
    if (!source) {
      setStream(null);
      setStatus("Local scene");
      return;
    }
    const peer = new RTCPeerConnection(),
      controller = new AbortController();
    let disposed = false,
      resource: string | null = null;
    const headers: Record<string, string> = {
      "Content-Type": "application/sdp",
    };
    if (source.token) headers.Authorization = `Bearer ${source.token}`;
    setStatus("Connecting AI stream…");
    setStream(null);
    peer.addTransceiver("video", { direction: "recvonly" });
    peer.ontrack = (e) => {
      if (!disposed) setStream(e.streams[0] ?? new MediaStream([e.track]));
    };
    peer.onconnectionstatechange = () => {
      if (!disposed) {
        if (peer.connectionState === "connected") {
          clearTimeout(timer);
          setStatus("AI stream · connected");
        }
        if (["failed", "disconnected"].includes(peer.connectionState))
          setStatus("AI stream disconnected · reconnect via Source");
      }
    };
    const timer = window.setTimeout(() => {
      controller.abort();
      if (!disposed) {
        peer.close();
        setStream(null);
        setStatus(
          "AI stream timed out · check endpoint, access and certificate",
        );
      }
    }, 12000);
    async function connect() {
      try {
        const endpoint = new URL(source!.url);
        if (
          !["https:", "http:"].includes(endpoint.protocol) ||
          endpoint.username ||
          endpoint.password
        )
          throw new Error(
            "Use an HTTP(S) WHEP URL without embedded credentials.",
          );
        await peer.setLocalDescription(await peer.createOffer());
        await new Promise<void>((resolve) => {
          if (peer.iceGatheringState === "complete") {
            resolve();
            return;
          }
          const timeout = setTimeout(resolve, 2000);
          peer.addEventListener(
            "icegatheringstatechange",
            () => {
              if (peer.iceGatheringState === "complete") {
                clearTimeout(timeout);
                resolve();
              }
            },
            { signal: controller.signal },
          );
        });
        if (disposed) return;
        const response = await fetch(endpoint, {
          method: "POST",
          headers,
          body: peer.localDescription!.sdp,
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error(`WHEP returned HTTP ${response.status}`);
        const location = response.headers.get("Location");
        if (location) {
          const candidate = new URL(location, endpoint);
          if (candidate.origin === endpoint.origin) resource = candidate.href;
        }
        const answer = await response.text();
        if (disposed) return;
        await peer.setRemoteDescription({ type: "answer", sdp: answer });
      } catch (error) {
        clearTimeout(timer);
        peer.close();
        if (!disposed) {
          setStream(null);
          setStatus(
            `Stream unavailable: ${error instanceof Error ? error.message : "connection failed"}`,
          );
        }
      }
    }
    void connect();
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller.abort();
      peer.close();
      if (resource)
        void fetch(resource, {
          method: "DELETE",
          headers: source.token
            ? { Authorization: `Bearer ${source.token}` }
            : {},
          keepalive: true,
        }).catch(() => {});
    };
  }, [source]);
  return { stream, status };
}
