"use client";

import { m, type Transition, type TargetAndTransition, type VariantLabels } from "framer-motion";
import { type ReactNode } from "react";

interface MotionDivProps {
  children: ReactNode;
  className?: string;
  initial?: boolean | TargetAndTransition | VariantLabels;
  animate?: boolean | TargetAndTransition | VariantLabels;
  transition?: Transition;
}

export function MotionDiv({ children, className, initial, animate, transition }: MotionDivProps) {
  return (
    <m.div className={className} initial={initial} animate={animate} transition={transition}>
      {children}
    </m.div>
  );
}