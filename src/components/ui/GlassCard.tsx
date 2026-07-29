"use client";

import { type ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type GlowColor = "cyan" | "violet" | "emerald";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: GlowColor;
  hoverable?: boolean;
}

const glowClasses: Record<GlowColor, { base: string; hover: string }> = {
  cyan: {
    base: "border-kinome-cyan/10",
    hover: "hover:border-kinome-cyan/30 hover:shadow-glow-cyan",
  },
  violet: {
    base: "border-kinome-violet/10",
    hover: "hover:border-kinome-violet/30 hover:shadow-glow-violet",
  },
  emerald: {
    base: "border-kinome-emerald/10",
    hover: "hover:border-kinome-emerald/30 hover:shadow-glow-emerald",
  },
};

export default function GlassCard({
  children,
  className,
  glowColor = "cyan",
  hoverable = false,
}: GlassCardProps) {
  const glow = glowClasses[glowColor];

  return (
    <motion.div
      whileHover={
        hoverable
          ? { scale: 1.01, y: -2 }
          : undefined
      }
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "bg-slate-900/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6",
        glow.base,
        hoverable && "cursor-pointer transition-colors duration-300",
        hoverable && glow.hover,
        className
      )}
    >
      {children}
    </motion.div>
  );
}
