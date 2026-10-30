import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";
const variants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4 shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#0067b3] text-white hover:bg-[#00589a]",
        outline:
          "border border-[#d5e3ef] bg-white/70 hover:bg-sky-50 text-[#0067b3]",
        ghost: "hover:bg-sky-100/70 text-slate-600 hover:text-[#0067b3]",
        destructive:
          "bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 border border-rose-500/30",
      },
      size: { default: "h-8 px-3", sm: "h-7 px-2", icon: "h-8 w-8" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof variants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(variants({ variant, size, className }))} {...props} />
  );
}
