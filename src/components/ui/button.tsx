import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";
const variants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4 shrink-0",
  {
    variants: {
      variant: {
        default: "bg-sky-500 text-slate-950 hover:bg-sky-400",
        outline:
          "border border-slate-700 bg-transparent hover:bg-slate-800 text-slate-200",
        ghost: "hover:bg-slate-800 text-slate-400 hover:text-white",
        destructive:
          "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30",
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
