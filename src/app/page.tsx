"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import KinaseCard from "@/components/ui/KinaseCard";
import SearchBar from "@/components/ui/SearchBar";
import StatsBar from "@/components/ui/StatsBar";

const GROUPS = ["All", "AGC", "CAMK", "CK1", "CMGC", "STE", "TK", "TKL", "Atypical"] as const;

type GroupFilter = (typeof GROUPS)[number];

const groupColors: Record<GroupFilter, string> = {
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

const groupActiveColors: Record<GroupFilter, string> = {
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

interface StatsData {
  totalKinases: number;
  totalLigands: number;
  totalVariants: number;
  totalStructures: number;
  totalDiseases: number;
}

interface KinaseListItem {
  gene_symbol: string;
  name: string;
  group: string;
  subfamily?: string;
  pdis_score: number | null;
  organ_systems_impacted: string[];
  diseases_associated: string[];
  uniprot_id?: string;
}

interface KinasesResponse {
  kinases: KinaseListItem[];
  total: number;
  page: number;
  totalPages: number;
}

function CardSkeleton() {
  return (
    <div className="glass-card p-6 h-full">
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

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-card p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/5 animate-shimmer" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-16 rounded bg-white/5 animate-shimmer" />
              <div className="h-6 w-12 rounded bg-white/5 animate-shimmer" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [kinases, setKinases] = useState<KinaseListItem[]>([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [activeGroup, setActiveGroup] = useState<GroupFilter>("All");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    fetch("/api/kinases/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(console.error);
  }, []);

  // Sync URL search param into state (e.g. from nav quick search)
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    if (urlSearch !== search) {
      setSearch(urlSearch);
    }
    // only run on URL change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchKinases = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (activeGroup !== "All") params.set("group", activeGroup);
      params.set("page", String(pageNum));
      params.set("limit", "24");

      try {
        const res = await fetch(`/api/kinases?${params}`);
        if (!res.ok) {
          if (!append) setKinases([]);
          setTotalPages(0);
          setTotal(0);
          return;
        }
        const data: KinasesResponse = await res.json();
        setKinases((prev) => (append ? [...prev, ...(data.kinases ?? [])] : (data.kinases ?? [])));
        setTotalPages(data.totalPages);
        setTotal(data.total);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search, activeGroup]
  );

  useEffect(() => {
    setPage(1);
    fetchKinases(1, false);
  }, [fetchKinases]);

  const handleSearch = useCallback((query: string) => {
    setSearch(query);
  }, []);

  const handleGroupChange = useCallback((group: GroupFilter) => {
    setActiveGroup(group);
  }, []);

  const handleLoadMore = useCallback(() => {
    const next = page + 1;
    setPage(next);
    fetchKinases(next, true);
  }, [page, fetchKinases]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-4">
              <span className="text-gradient-cyan-violet">KinomeX</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Human Kinome Explorer{" "}
              <span className="text-kinome-cyan font-medium">{stats?.totalKinases ?? "..."}</span> Protein Kinases
            </p>
          </motion.div>
        </div>
      </section>

      {/* Introduction */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass-card border border-kinome-cyan/10 p-5 sm:p-6"
        >
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kinome-cyan/10 text-kinome-cyan">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
              </svg>
            </div>
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-white">Welcome to KinomeX</h2>
              <p className="text-sm text-slate-300 leading-relaxed max-w-5xl">
                KinomeX is an integrated research server for exploring the human protein kinase landscape. It brings together curated evidence from <span className="text-white">UniProt, RCSB PDB, ChEMBL, PubChem, GTEx, ClinVar, PubMed, and ClinicalTrials.gov</span>, connecting kinase identity and classification with molecular structures, ligand bioactivity, tissue expression, pathogenic variants, and disease associations.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed max-w-5xl">
                Browse <span className="text-kinome-cyan font-medium">{stats?.totalKinases ?? "500+"} human kinases</span>, compare kinase groups, inspect interactive structures and expression profiles, or search for genes, tissues, diseases, and therapeutic evidence. Each kinase is accompanied by a <span className="text-kinome-violet font-medium">Pharmaceutical Development Interest Score (PDIS)</span> that summarizes publication activity, clinical investigation, structural coverage, compound diversity, and approved-drug evidence. PDIS is intended as an exploration and prioritization aid—not a measure of biological importance or clinical recommendation.
              </p>
              <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-medium text-slate-300">
                <span className="rounded-full border border-cyan-400/15 bg-cyan-400/5 px-3 py-1">Integrated public data</span>
                <span className="rounded-full border border-violet-400/15 bg-violet-400/5 px-3 py-1">Interactive molecular profiles</span>
                <span className="rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-1">Evidence-based prioritization</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 mb-10">
        {stats ? <StatsBar stats={stats} /> : <StatsSkeleton />}
      </section>

      {/* Filters & Search */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-4"
        >
          {/* Search */}
          <div className="max-w-xl">
            <SearchBar onSearch={handleSearch} initialValue={search} placeholder="Search kinases by name, gene symbol, or alias..." />
          </div>

          {/* Group pills */}
          <div className="flex flex-wrap gap-2">
            {GROUPS.map((group) => {
              const isActive = activeGroup === group;
              return (
                <button
                  key={group}
                  onClick={() => handleGroupChange(group)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full border backdrop-blur-sm transition-all duration-200 ${
                    isActive ? groupActiveColors[group] : `${groupColors[group]} hover:brightness-125`
                  }`}
                >
                  {group}
                </button>
              );
            })}
          </div>
        </motion.div>
      </section>

      {/* Results count */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
        <p className="text-sm text-slate-500">
          {loading ? "Searching..." : `${total} kinase${total !== 1 ? "s" : ""} found`}
        </p>
      </section>

      {/* Kinase Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : kinases.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4 opacity-40">
              <svg className="mx-auto h-16 w-16 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-400 mb-1">No kinases found</h3>
            <p className="text-sm text-slate-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <>
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

            {page < totalPages && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-8 py-3 text-sm font-medium text-white bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 rounded-xl backdrop-blur-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading...
                    </span>
                  ) : (
                    `Load More (${kinases.length} of ${total})`
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-kinome-navy flex items-center justify-center text-slate-400">Loading KinomeX...</div>}>
      <HomePageContent />
    </Suspense>
  );
}
