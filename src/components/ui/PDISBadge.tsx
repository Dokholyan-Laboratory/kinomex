"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getScoreColor } from "@/lib/kinase-utils";

type BadgeSize = "sm" | "md" | "lg";

interface PDISBadgeProps {
  score: number | null;
  size?: BadgeSize;
}

const sizeConfig: Record<
  BadgeSize,
  { container: string; text: string; radius: number; stroke: number; fontSize: string }
> = {
  sm: {
    container: "w-10 h-10",
    text: "text-[10px]",
    radius: 16,
    stroke: 3,
    fontSize: "10",
  },
  md: {
    container: "w-14 h-14",
    text: "text-xs",
    radius: 22,
    stroke: 4,
    fontSize: "12",
  },
  lg: {
    container: "w-20 h-20",
    text: "text-base",
    radius: 32,
    stroke: 5,
    fontSize: "16",
  },
};

export default function PDISBadge({ score, size = "md" }: PDISBadgeProps) {
  const config = sizeConfig[size];
  const hasScore = score !== null && Number.isFinite(score);
  const numericScore = hasScore ? score : 0;
  const color = hasScore ? getScoreColor(numericScore) : "#64748b";
  const circumference = 2 * Math.PI * config.radius;
  const dashOffset = circumference - Math.min(numericScore, 1) * circumference;
  const center = (config.radius * 2 + config.stroke * 2) / 2;

  return (
    <div className={cn("relative flex items-center justify-center", config.container)}>
      <svg
        className="w-full h-full -rotate-90"
        viewBox={`0 0 ${config.radius * 2 + config.stroke * 2} ${config.radius * 2 + config.stroke * 2}`}
      >
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={config.radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={config.stroke}
        />
        {/* Animated score ring */}
        {hasScore && <motion.circle
          cx={center}
          cy={center}
          r={config.radius}
          fill="none"
          stroke={color}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />}
        {/* Glow filter */}
        <defs>
          <filter id={`glow-${size}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {hasScore && <motion.circle
          cx={center}
          cy={center}
          r={config.radius}
          fill="none"
          stroke={color}
          strokeWidth={config.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          opacity={0.3}
          filter={`url(#glow-${size})`}
        />}
      </svg>
      <span
        className={cn(
          "absolute font-bold tabular-nums",
          config.text
        )}
        style={{ color }}
      >
        {hasScore ? numericScore.toFixed(2) : "N/A"}
      </span>
    </div>
  );
}
