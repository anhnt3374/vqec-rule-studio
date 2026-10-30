import { BoardSource } from "./BoardSource";
import { useRef, useState } from "react";
import { Upload, Radio, Image } from "lucide-react";
import { useStudio } from "@/stores/studio";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { WhepSource } from "@/hooks/useWhep";
export function SourceDialog({
  open,
  onClose,
  connect,
  disconnect,
  editable,
}: {
  open: boolean;
  onClose: () => void;
  connect: (source: WhepSource) => void;
  disconnect: () => void;
  editable: boolean;
}) {
  const s = useStudio(),
    file = useRef<HTMLInputElement>(null),
    [url, setUrl] = useState(""),
    [token, setToken] = useState(""),
    [error, setError] = useState("");
  async function upload(chosen: File) {
    setError("");
    if (
      !chosen.type.startsWith("image/") &&
      !chosen.type.startsWith("video/")
    ) {
      setError("Choose an image or browser-compatible video.");
      return;
    }
    if (chosen.size > 20 * 1024 * 1024) {
      setError("Use a file under 20 MB for local browser storage.");
      return;
    }
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(chosen);
      });
      const type = chosen.type.startsWith("video/") ? "video" : "image";
      const ratio = await new Promise<number>((resolve, reject) => {
        if (type === "image") {
          const image = new window.Image();
          image.onload = () =>
            resolve(image.naturalWidth / image.naturalHeight);
          image.onerror = reject;
          image.src = data;
        } else {
          const video = document.createElement("video");
          video.preload = "metadata";
          video.onloadedmetadata = () =>
            resolve(video.videoWidth / video.videoHeight);
          video.onerror = reject;
          video.src = data;
        }
      });
      if (!Number.isFinite(ratio) || ratio <= 0)
        throw new Error("Invalid media dimensions");
      disconnect();
      s.background(data, ratio, type);
      onClose();
    } catch {
      setError(
        "Cannot read this media. Try a PNG, JPEG or MP4 supported by your browser.",
      );
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={onClose}
      title="Camera source"
      description="Use a local scene for drawing, or view the existing AI stream through its browser WHEP endpoint."
    >
      <div className="space-y-4">
        <BoardSource
          connect={(source) => {
            connect(source);
            onClose();
          }}
        />
        <div className="source-section">
          <span className="eyebrow">LOCAL SCENE</span>
          <p>Image or video · up to 20 MB · saved with the draft</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={!editable}
              onClick={() => file.current?.click()}
            >
              <Upload />
              Upload media
            </Button>
            <Button
              variant="ghost"
              disabled={!editable}
              onClick={() => {
                disconnect();
                s.background("./scene.svg", 16 / 9, "image");
                onClose();
              }}
            >
              <Image />
              Demo scene
            </Button>
          </div>
          <input
            className="hidden"
            type="file"
            ref={file}
            accept="image/*,video/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </div>
        <form
          className="source-section"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            try {
              const endpoint = new URL(url);
              if (
                !["http:", "https:"].includes(endpoint.protocol) ||
                endpoint.username ||
                endpoint.password
              )
                throw Error();
              connect({ url, token });
              setToken("");
              onClose();
            } catch {
              setError(
                "Enter an HTTP(S) WHEP URL without embedded credentials.",
              );
            }
          }}
        >
          <span className="eyebrow">EXISTING AI STREAM</span>
          <label className="field mt-3">
            WHEP endpoint
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://camera/…/whep"
            />
          </label>
          <label className="field mt-3">
            Media token (optional, memory only)
            <input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </label>
          <p>
            RTSP must be exposed by the existing service as WHEP. The camera
            service must allow this origin and access. No proxy or
            authentication service is included.
          </p>
          <div className="flex gap-2">
            <Button type="submit">
              <Radio />
              Connect
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                disconnect();
                onClose();
              }}
            >
              Disconnect
            </Button>
          </div>
        </form>
        {error && (
          <p className="text-rose-700 text-xs" role="alert">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
