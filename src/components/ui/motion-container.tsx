"use client";

import { motion, type Variants } from "framer-motion";
import { type ReactNode } from "react";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 20,
    },
  },
};

interface MotionContainerProps {
  children: ReactNode;
  className?: string;
  initial?: boolean;
  delay?: number;
  [key: string]: unknown;
}

export function MotionContainer({
  children,
  className = "",
  initial = true,
  delay = 0,
  ...props
}: MotionContainerProps) {
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial={initial ? "hidden" : false}
      animate="visible"
      transition={{ delayChildren: delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface MotionItemProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  [key: string]: unknown;
}

export function MotionItem({ children, className = "", delay = 0, ...props }: MotionItemProps) {
  return (
    <motion.div
      className={className}
      variants={itemVariants}
      transition={{ delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
