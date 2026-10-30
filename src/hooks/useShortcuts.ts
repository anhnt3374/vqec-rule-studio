import { useEffect } from "react";
import { useStudio } from "@/stores/studio";
export function useShortcuts({
  remove,
  duplicate,
}: {
  remove: () => void;
  duplicate: () => void;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest(
          'input,textarea,select,[contenteditable="true"],[role="dialog"]',
        )
      )
        return;
      const s = useStudio.getState(),
        modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (s.editing) void s.save(false, true);
      }
      if (!s.editing || s.busy) return;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) s.redo();
        else s.undo();
      }
      if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        s.redo();
      }
      if (s.active?.type === "System") return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        remove();
      }
      if (modifier && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [remove, duplicate]);
}
