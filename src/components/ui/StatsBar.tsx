"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

interface StatsData {
  totalKinases: number;
  totalLigands: number;
  totalVariants: number;
  totalStructures: number;
  totalDiseases: number;
}

interface StatsBarProps {
  stats: StatsData;
}

interface StatItem {
  label: string;
  value: number;
  icon: JSX.Element;
  color: string;
}

function AnimatedNumber({ value, duration = 1.2 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const startTime = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!inView) return;

    const animate = (timestamp: number) => {
      if (startTime.current === null) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [inView, value, duration]);

  return <span ref={ref} className="tabular-nums">{display.toLocaleString()}</span>;
}

function KinaseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
    </svg>
  );
}

function LigandIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function VariantIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function StructureIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function DiseaseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

const colorMap: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  "kinome-cyan": {
    bg: "bg-kinome-cyan/5",
    text: "text-kinome-cyan",
    border: "border-kinome-cyan/15",
    iconBg: "bg-kinome-cyan/15",
  },
  "kinome-violet": {
    bg: "bg-kinome-violet/5",
    text: "text-kinome-violet",
    border: "border-kinome-violet/15",
    iconBg: "bg-kinome-violet/15",
  },
  "kinome-emerald": {
    bg: "bg-kinome-emerald/5",
    text: "text-kinome-emerald",
    border: "border-kinome-emerald/15",
    iconBg: "bg-kinome-emerald/15",
  },
  "amber-400": {
    bg: "bg-amber-400/5",
    text: "text-amber-400",
    border: "border-amber-400/15",
    iconBg: "bg-amber-400/15",
  },
  "kinome-rose": {
    bg: "bg-kinome-rose/5",
    text: "text-kinome-rose",
    border: "border-kinome-rose/15",
    iconBg: "bg-kinome-rose/15",
  },
};

export default function StatsBar({ stats }: StatsBarProps) {
  const statItems: StatItem[] = [
    { label: "Total Kinases", value: stats.totalKinases, icon: <KinaseIcon />, color: "kinome-cyan" },
    { label: "Ligand Assays", value: stats.totalLigands, icon: <LigandIcon />, color: "kinome-violet" },
    { label: "Known Variants", value: stats.totalVariants, icon: <VariantIcon />, color: "kinome-emerald" },
    { label: "3D Structures", value: stats.totalStructures, icon: <StructureIcon />, color: "amber-400" },
    { label: "Disease Annotations", value: stats.totalDiseases, icon: <DiseaseIcon />, color: "kinome-rose" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {statItems.map((item, idx) => {
        const colors = colorMap[item.color];
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: idx * 0.08 }}
            className={`backdrop-blur-sm border rounded-2xl p-4 ${colors.bg} ${colors.border}`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${colors.iconBg} ${colors.text}`}>
                {item.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 font-medium truncate">{item.label}</p>
                <p className={`text-xl font-bold ${colors.text}`}>
                  <AnimatedNumber value={item.value} />
                </p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
