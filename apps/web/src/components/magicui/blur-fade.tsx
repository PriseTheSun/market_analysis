// Adapted from Magic UI Blur Fade (MIT). Local, single block entrance with reduced motion.
// Source: https://github.com/magicuidesign/magicui/blob/main/apps/www/registry/magicui/blur-fade.tsx
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
export function BlurFade({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0.85, y: 6, filter: "blur(1px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
