"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import KinaseCard from "@/components/ui/KinaseCard";

type GroupFilter = "All" | "AGC" | "CAMK" | "CK1" | "CMGC" | "STE" | "TK" | "TKL" | "Atypical";

const GROUPS: GroupFilter[] = ["All", "AGC", "CAMK", "CK1", "CMGC", "STE", "TK", "TKL", "Atypical"];

const ORGAN_SYSTEMS = [
  "All",
  "Nervous",
  "Cardiovascular",
  "Respiratory",
  "Hepatic",
  "Renal",
  "Immune",
  "Gastrointestinal",
  "Endocrine",
  "Musculoskeletal",
  "Integumentary",
  "Hematopoietic",
];

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

interface KinaseListItem {
  gene_symbol: string;
  name: string;
  group: string;
  subfamily?: string;
  pdis_score: number;
  organ_systems_impacted: string[];
  diseases_associated: string[];
}

interface KinasesResponse {
  kinases: KinaseListItem[];
  total: number;
  page: number;
  totalPages: number;
}

function CardSkeleton() {
  return (
    <div className="bg-slate-900/40 backdrop-blur-sm border border-white/10 rounded-2xl p-6 h-full">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-6 w-20 rounded-md bg-white/5 animate-shimmer" />
            <div className="h-5 w-12 rounded-full bg-white/5 animate-shimmer" />
          </div>
          <div className="h-4 w-full rounded bg-white/5 animate-shimmer" />
          <div className="h-4 w-3/4 rounded bg-white/5 animate-shimmer" />
          <div className="flex gap-1.5 mt-2">
            <div className="h-5 w-16 rounded-md bg-white/5 animate-shimmer" />
            <div className="h-5 w-14 rounded-md bg-white/5 animate-shimmer" />
          </div>
        </div>
        <div className="h-14 w-14 rounded-full bg-white/5 animate-shimmer flex-shrink-0" />
      </div>
    </div>
  );
}

export default function ExplorerPage() {
  const [kinases, setKinases] = useState<KinaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<GroupFilter>("All");
  const [activeOrgan, setActiveOrgan] = useState("All");
  const [minPdis, setMinPdis] = useState(0);
  const [maxPdis, setMaxPdis] = useState(1);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchKinases = useCallback(
    async (pageNum: number) => {
      setLoading(true);

      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (activeGroup !== "All") params.set("group", activeGroup);
      if (activeOrgan !== "All") params.set("organ_system", activeOrgan);
      params.set("minPDIS", String(minPdis));
      params.set("maxPDIS", String(maxPdis));
      params.set("page", String(pageNum));
      params.set("limit", "24");

      try {
        const res = await fetch(`/api/kinases?${params}`);
        if (!res.ok) throw new Error("API unavailable");
        const data: KinasesResponse = await res.json();
        setKinases(data.kinases || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      } catch {
        setKinases([]);
        setTotal(0);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [search, activeGroup, activeOrgan, minPdis, maxPdis],
  );

  useEffect(() => {
    setPage(1);
    fetchKinases(1);
  }, [fetchKinases]);

  const groupBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const k of kinases) {
      counts[k.group] = (counts[k.group] || 0) + 1;
    }
    return counts;
  }, [kinases]);

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
            Kinase Explorer
          </h1>
          <p className="text-sm text-slate-400">
            Browse, search, and filter the human kinome
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="space-y-4 mb-6"
            >
              <div className="relative">
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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search kinases by name or gene symbol..."
                  className="w-full pl-10 pr-4 py-3 text-sm text-slate-200 placeholder-slate-500 bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl outline-none focus:border-kinome-cyan/40 focus:ring-1 focus:ring-kinome-cyan/20 transition-all duration-200"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {GROUPS.map((group) => {
                  const isActive = activeGroup === group;
                  return (
                    <button
                      key={group}
                      onClick={() => setActiveGroup(group)}
                      className={`px-3 py-1 text-xs font-medium rounded-full border backdrop-blur-sm transition-all duration-200 ${
                        isActive ? groupActiveStyles[group] : groupPillStyles[group]
                      }`}
                    >
                      {group}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">Organ System</label>
                  <select
                    value={activeOrgan}
                    onChange={(e) => setActiveOrgan(e.target.value)}
                    className="w-full px-3 py-2 text-sm text-slate-200 bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl outline-none focus:border-kinome-cyan/40 transition-all duration-200 appearance-none cursor-pointer"
                  >
                    {ORGAN_SYSTEMS.map((o) => (
                      <option key={o} value={o} className="bg-slate-900 text-slate-200">
                        {o === "All" ? "All Organ Systems" : o}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="text-xs text-slate-500 mb-1 block">
                    PDIS Range: <span className="text-kinome-cyan">{minPdis.toFixed(2)}</span> – <span className="text-kinome-violet">{maxPdis.toFixed(2)}</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-600 mb-0.5 block">Min</label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={minPdis}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setMinPdis(val);
                          if (val > maxPdis) setMaxPdis(val);
                        }}
                        className="w-full accent-kinome-cyan h-1.5"
                      />
                      <div className="flex justify-between text-[9px] text-slate-600 mt-0.5 px-0.5 select-none">
                        <span>0</span>
                        <span>0.25</span>
                        <span>0.5</span>
                        <span>0.75</span>
                        <span>1</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-600 mb-0.5 block">Max</label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={maxPdis}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setMaxPdis(val);
                          if (val < minPdis) setMinPdis(val);
                        }}
                        className="w-full accent-kinome-violet h-1.5"
                      />
                      <div className="flex justify-between text-[9px] text-slate-600 mt-0.5 px-0.5 select-none">
                        <span>0</span>
                        <span>0.25</span>
                        <span>0.5</span>
                        <span>0.75</span>
                        <span>1</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="mb-4 text-sm text-slate-500">
              {loading ? "Searching..." : `${total} kinase${total !== 1 ? "s" : ""} found`}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : kinases.length === 0 ? (
              <div className="text-center py-20">
                <svg className="mx-auto h-16 w-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-medium text-slate-400 mb-1">No kinases found</h3>
                <p className="text-sm text-slate-500">
                  {total === 0
                    ? "No data in the database. Run the ETL pipeline to populate kinome data."
                    : "Try adjusting your search or filters"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {kinases.map((kinase, idx) => (
                  <motion.div
                    key={kinase.gene_symbol}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.5) }}
                  >
                    <KinaseCard
                      kinase={{
                        gene_symbol: kinase.gene_symbol,
                        full_name: kinase.name,
                        classification: kinase.group,
                        pdis_score: kinase.pdis_score,
                        organ_systems_impacted: kinase.organ_systems_impacted ?? [],
                        diseases_associated: kinase.diseases_associated ?? [],
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            )}

            {!loading && totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    const prev = Math.max(1, page - 1);
                    setPage(prev);
                    fetchKinases(prev);
                  }}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl backdrop-blur-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-400 tabular-nums">
                  Page <span className="text-white font-medium">{page}</span> of {totalPages}
                </span>
                <button
                  onClick={() => {
                    const next = Math.min(totalPages, page + 1);
                    setPage(next);
                    fetchKinases(next);
                  }}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl backdrop-blur-sm transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-slate-900/40 backdrop-blur-sm border border-white/10 rounded-2xl p-5 sticky top-24">
              <h3 className="text-sm font-semibold text-white mb-4">Quick Stats</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Total Results</span>
                  <span className="text-sm font-bold text-kinome-cyan tabular-nums">{total}</span>
                </div>

                <div className="border-t border-white/5 pt-3">
                  <span className="text-xs text-slate-500 block mb-2">Group Breakdown</span>
                  <div className="space-y-1.5">
                    {Object.entries(groupBreakdown)
                      .sort((a, b) => b[1] - a[1])
                      .map(([group, count]) => (
                        <div key={group} className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">{group}</span>
                          <span className="text-xs font-medium text-slate-300 tabular-nums">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="border-t border-white/5 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Active Group</span>
                    <span className="text-xs font-medium text-slate-300">{activeGroup}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400">Organ</span>
                    <span className="text-xs font-medium text-slate-300">{activeOrgan === "All" ? "Any" : activeOrgan}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400">PDIS Range</span>
                    <span className="text-xs font-medium text-slate-300">{minPdis.toFixed(2)}–{maxPdis.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
