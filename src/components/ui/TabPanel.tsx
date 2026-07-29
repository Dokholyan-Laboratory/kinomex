"use client";

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
  color?: string;
}

const countColors: Record<string, string> = {
  "kinome-cyan": "bg-kinome-cyan/20 text-kinome-cyan border-kinome-cyan/30",
  "kinome-violet": "bg-kinome-violet/20 text-kinome-violet border-kinome-violet/30",
  "kinome-emerald": "bg-kinome-emerald/20 text-kinome-emerald border-kinome-emerald/30",
  "amber": "bg-amber-400/20 text-amber-400 border-amber-400/30",
  "rose": "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

const accentBorders: Record<string, string> = {
  "kinome-cyan": "border-l-kinome-cyan",
  "kinome-violet": "border-l-kinome-violet",
  "kinome-emerald": "border-l-kinome-emerald",
  "amber": "border-l-amber-400",
  "rose": "border-l-rose-500",
};

interface TabPanelProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: ReactNode;
  className?: string;
}

export default function TabPanel({
  tabs,
  activeTab,
  onTabChange,
  children,
  className,
}: TabPanelProps) {
  return (
    <div className={className}>
      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/40 backdrop-blur-sm border border-white/10 rounded-xl mb-6">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors duration-200 flex-1 justify-center border-l-2",
                `${accentBorders[tab.color ?? ""] ?? "border-l-transparent"}`,
                isActive
                  ? "text-white"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon && <span className="flex-shrink-0">{tab.icon}</span>}
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold rounded-full border ${countColors[tab.color ?? ""] ?? "bg-white/10 text-slate-300 border-white/20"}`}>
                    {tab.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
