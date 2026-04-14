import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  isTransitioning: boolean;
  direction?: "left" | "right";
  children: ReactNode;
}

export function TransitionLayer({
  isTransitioning,
  direction = "left",
  children,
}: Props) {
  const xOut = direction === "left" ? -400 : 400;
  const xIn = direction === "left" ? 400 : -400;

  return (
    <AnimatePresence mode="wait">
      {!isTransitioning && (
        <motion.div
          key="canvas-active"
          initial={{ x: xIn, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: xOut, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
