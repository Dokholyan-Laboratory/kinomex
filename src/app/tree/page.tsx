"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import KinomePhyloTree from "@/components/visualizations/KinomePhyloTree";

type TreeKinase = {
  gene_symbol: string;
  group: string;
  family: string;
  pdis_score: number;
  full_name: string;
};

type GroupFilter = "All" | "AGC" | "CAMK" | "CK1" | "CMGC" | "STE" | "TK" | "TKL" | "Atypical";

const GROUPS: GroupFilter[] = ["All", "AGC", "CAMK", "CK1", "CMGC", "STE", "TK", "TKL", "Atypical"];

const GROUP_COLORS: Record<string, string> = {
  AGC: "#38bdf8",
  CAMK: "#a855f7",
  CK1: "#f59e0b",
  CMGC: "#34d399",
  STE: "#f43f5e",
  TK: "#3b82f6",
  TKL: "#f97316",
  Atypical: "#94a3b8",
};

const groupPillStyles: Record<GroupFilter, string> = {
  All: "border-kinome-cyan/30 text-kinome-cyan bg-kinome-cyan/10",
  AGC: "border-kinome-cyan/30 text-kinome-cyan bg-kinome-cyan/10",
  CAMK: "border-kinome-violet/30 text-kinome-violet bg-kinome-violet/10",
  CK1: "border-amber-500/30 text-amber-400 bg-amber-500/10",
  CMGC: "border-kinome-emerald/30 text-kinome-emerald bg-kinome-emerald/10",
  STE: "border-rose-500/30 text-rose-400 bg-rose-500/10",
  TK: "border-blue-500/30 text-blue-400 bg-blue-500/10",
  TKL: "border-orange-500/30 text-orange-400 bg-orange-500/10",
  Atypical: "border-slate-500/30 text-slate-400 bg-slate-500/10",
};

const groupActiveStyles: Record<GroupFilter, string> = {
  All: "border-kinome-cyan text-white bg-kinome-cyan/25 shadow-glow-cyan",
  AGC: "border-kinome-cyan text-white bg-kinome-cyan/25 shadow-glow-cyan",
  CAMK: "border-kinome-violet text-white bg-kinome-violet/25 shadow-glow-violet",
  CK1: "border-amber-500 text-white bg-amber-500/25 shadow-[0_0_20px_rgba(245,158,11,0.15)]",
  CMGC: "border-kinome-emerald text-white bg-kinome-emerald/25 shadow-glow-emerald",
  STE: "border-rose-500 text-white bg-rose-500/25 shadow-[0_0_20px_rgba(244,63,94,0.15)]",
  TK: "border-blue-500 text-white bg-blue-500/25 shadow-[0_0_20px_rgba(59,130,246,0.15)]",
  TKL: "border-orange-500 text-white bg-orange-500/25 shadow-[0_0_20px_rgba(249,115,22,0.15)]",
  Atypical: "border-slate-400 text-white bg-slate-400/25 shadow-[0_0_20px_rgba(148,163,184,0.15)]",
};

function TreeSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b0f19]/80 backdrop-blur-xl shadow-2xl overflow-hidden" style={{ minHeight: 500 }}>
      <div className="px-6 py-4 border-b border-white/10">
        <div className="h-5 w-56 rounded bg-white/5 animate-shimmer" />
        <div className="flex gap-3 mt-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-4 w-14 rounded-full bg-white/5 animate-shimmer" />
          ))}
        </div>
      </div>
      <div className="flex items-center justify-center" style={{ height: 600 }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full border-4 border-white/5 border-t-kinome-cyan/60 animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-500">Loading kinome tree...</p>
        </div>
      </div>
    </div>
  );
}

export default function TreePage() {
  const [kinases, setKinases] = useState<TreeKinase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<GroupFilter>("All");
  const [selectedGene, setSelectedGene] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedKinaseData, setSelectedKinaseData] = useState<TreeKinase | null>(null);

  useEffect(() => {
    fetch("/api/kinases?limit=600")
      .then((r) => {
        if (!r.ok) throw new Error("API unavailable");
        return r.json();
      })
      .then((data) => {
        const mapped: TreeKinase[] = (data.kinases || []).map((k: Record<string, unknown>) => ({
          gene_symbol: (k.gene_symbol as string) || "",
          group: (k.group as string) || "",
          family: (k.subfamily as string) || "",
          pdis_score: (k.pdis_score as number) || 0,
          full_name: (k.name as string) || "",
        }));
        setKinases(mapped);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedGene) {
      setSelectedKinaseData(null);
      return;
    }
    fetch(`/api/kinases/${selectedGene}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setSelectedKinaseData({
          gene_symbol: data.gene_symbol || selectedGene,
          group: data.classification?.group || "",
          family: data.classification?.family || "",
          pdis_score: data.pdis_score?.overall_score || 0,
          full_name: data.full_name || "",
        });
      })
      .catch(() => {
        setSelectedKinaseData(kinases.find((k) => k.gene_symbol === selectedGene) || null);
      });
  }, [selectedGene, kinases]);

  const handleSelectKinase = useCallback((gene: string) => {
    setSelectedGene(gene);
    setPanelOpen(true);
  }, []);

  const handleClosePanel = useCallback(() => {
    setPanelOpen(false);
    setTimeout(() => setSelectedGene(null), 300);
  }, []);

  const treeData = useMemo(() => {
    let filtered = kinases;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (k) =>
          k.gene_symbol.toLowerCase().includes(q) ||
          k.full_name.toLowerCase().includes(q),
      );
    }
    return filtered;
  }, [kinases, searchQuery]);

  return (
    <div className="min-h-screen pb-20 pt-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
            Kinome Evolutionary Tree
          </h1>
          <p className="text-sm text-slate-400">
            Interactive radial phylogenetic visualization of the human kinome
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6 space-y-4"
        >
          <div className="relative max-w-md">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search kinases on the tree..."
              className="w-full pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl outline-none focus:border-kinome-cyan/40 focus:ring-1 focus:ring-kinome-cyan/20 transition-all duration-200"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {GROUPS.map((group) => {
              const isActive = activeGroup === group;
              return (
                <button
                  key={group}
                  onClick={() => setActiveGroup(group)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full border backdrop-blur-sm transition-all duration-200 ${
                    isActive ? groupActiveStyles[group] : groupPillStyles[group]
                  }`}
                >
                  {group}
                </button>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {loading ? (
            <TreeSkeleton />
          ) : kinases.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0b0f19]/80 backdrop-blur-xl shadow-2xl p-16 text-center">
              <svg className="mx-auto h-16 w-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
              <h3 className="text-lg font-medium text-slate-400 mb-1">No kinase data available</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Run the ETL data ingestion pipeline to populate the database with kinome data from UniProt, PDB, ChEMBL, and other sources.
              </p>
            </div>
          ) : (
            <KinomePhyloTree
              kinases={treeData}
              onSelectKinase={handleSelectKinase}
              selectedGroup={activeGroup === "All" ? undefined : activeGroup}
              searchQuery={searchQuery}
            />
          )}
        </motion.div>

        {!loading && kinases.length > 0 && (
          <div className="mt-4 text-sm text-slate-500">
            Showing {treeData.length} of {kinases.length} kinases
            {activeGroup !== "All" && ` in ${activeGroup}`}
          </div>
        )}
      </div>

      <AnimatePresence>
        {panelOpen && selectedKinaseData && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={handleClosePanel}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0b0f19]/95 backdrop-blur-xl border-l border-white/10 z-50 overflow-y-auto"
            >
              <div className="p-6">
                <button
                  onClick={handleClosePanel}
                  className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-white">{selectedKinaseData.gene_symbol}</h2>
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${GROUP_COLORS[selectedKinaseData.group]}20`,
                        color: GROUP_COLORS[selectedKinaseData.group],
                        border: `1px solid ${GROUP_COLORS[selectedKinaseData.group]}30`,
                      }}
                    >
                      {selectedKinaseData.group}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {selectedKinaseData.full_name}
                  </p>
                </div>

                <div className="space-y-4">
                  <DetailRow label="Gene Symbol" value={selectedKinaseData.gene_symbol} />
                  <DetailRow label="Full Name" value={selectedKinaseData.full_name} />
                  <DetailRow label="Group" value={selectedKinaseData.group} color={GROUP_COLORS[selectedKinaseData.group]} />
                  <DetailRow label="Family" value={selectedKinaseData.family} />
                  <DetailRow label="PDIS Score" value={selectedKinaseData.pdis_score.toFixed(2)} color="#34d399" />
                </div>

                <div className="mt-8">
                  <a
                    href={`/kinases/${selectedKinaseData.gene_symbol}`}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-kinome-cyan/20 hover:bg-kinome-cyan/30 border border-kinome-cyan/30 rounded-xl transition-colors w-full justify-center"
                  >
                    View Full Details
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-slate-500 w-28 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-200 font-medium" style={color ? { color } : undefined}>
        {value}
      </span>
    </div>
  );
}
