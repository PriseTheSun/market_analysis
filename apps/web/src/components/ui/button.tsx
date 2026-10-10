// Adapted from shadcn/ui (MIT): docs/licenses/shadcn-ui.txt.
import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
const variants = cva("button", {
  variants: {
    variant: {
      default: "primary",
      outline: "button-outline",
      ghost: "ghost",
      destructive: "destructive",
    },
    size: { default: "", small: "small", icon: "icon-button" },
  },
  defaultVariants: { variant: "default", size: "default" },
});
export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof variants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={clsx(variants({ variant, size }), className)} {...props} />
  );
}
