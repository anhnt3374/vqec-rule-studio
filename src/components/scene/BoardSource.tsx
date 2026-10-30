import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { connectBoard } from "@/features/camera/board";
import type { WhepSource } from "@/hooks/useWhep";
export function BoardSource({
  connect,
}: {
  connect: (source: WhepSource) => void;
}) {
  const [available, setAvailable] = useState(false),
    [username, setUsername] = useState("admin"),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    void fetch("./studio-config.json", { signal: abort.signal })
      .then((r) => r.json())
      .then((config) => setAvailable(config.boardApi === true))
      .catch(() => {});
    return () => abort.abort();
  }, []);
  if (!available) return null;
  return (
    <form
      className="source-section"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const source = await connectBoard(username, password);
          setPassword("");
          connect(source);
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Cannot connect to camera.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <span className="eyebrow">THIS BOARD · AI CAMERA</span>
      <p>
        Connect using the existing camera account. The studio obtains the AI
        media URL from the camera service. Password and tokens stay in memory.
      </p>
      <label className="field">
        Camera username
        <input
          autoComplete="username"
          required
          value={username}
          disabled={busy}
          onChange={(e) => setUsername(e.target.value)}
        />
      </label>
      <label className="field mt-3">
        Camera password
        <input
          autoComplete="current-password"
          type="password"
          required
          value={password}
          disabled={busy}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && (
        <p role="alert" className="text-rose-700">
          {error}
        </p>
      )}
      <Button type="submit" className="mt-3" disabled={busy}>
        <Radio />
        {busy ? "Connecting…" : "Connect board AI"}
      </Button>
    </form>
  );
}
