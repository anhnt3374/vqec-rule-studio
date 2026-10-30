import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm" />
        <DialogPrimitive.Content className="dialog-content fixed left-1/2 top-1/2 z-50 w-[430px] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-700 bg-[#171e29] p-6 shadow-2xl">
          <DialogPrimitive.Title className="text-lg font-semibold text-white">
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 mb-5 text-sm text-slate-400">
            {description}
          </DialogPrimitive.Description>
          {children}
          <DialogPrimitive.Close
            aria-label="Close dialog"
            className="absolute right-4 top-4 text-slate-400"
          >
            <X size={17} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
