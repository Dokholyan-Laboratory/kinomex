"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ChatInterface from "@/components/chat/ChatInterface";

const EXAMPLE_QUERIES = [
  "Find all TK family kinases expressed in the brain with Type II allosteric inhibitors",
  "Which kinases are associated with glioblastoma?",
  "Show kinases with PDIS score above 0.5",
  "Find kinases with DFG-out conformation inhibitors",
  "What kinases are mutated in colorectal cancer?",
];

interface SearchResult {
  gene_symbol: string;
  name: string;
  group: string;
  pdis_score: number;
  ligand_count?: number;
  mutation_count?: number;
  disease_count?: number;
  organ_systems_impacted: string[];
  fda_approval_status?: string;
}

interface ParsedFilters {
  groups: string[];
  tissues: string[];
  diseases: string[];
  bindingTypes: string[];
  minPdis: number | null;
  maxPdis: number | null;
}

interface SearchResponse {
  results: SearchResult[];
  parsedFilters: ParsedFilters;
  totalMatches: number;
}

function ParsedFilterTag({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-kinome-violet/10 text-kinome-violet border border-kinome-violet/20">
      <span className="text-slate-500">{label}:</span>
      {value}
    </span>
  );
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"search" | "chat">("search");
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [parsedFilters, setParsedFilters] = useState<ParsedFilters | null>(null);
  const [totalMatches, setTotalMatches] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [compareSet, setCompareSet] = useState<Set<string>>(new Set());
  const [compareData, setCompareData] = useState<SearchResult[]>([]);
  const [sortBy, setSortBy] = useState<"relevance" | "pdis" | "name" | "gene_symbol">("relevance");

  const sortedResults = useMemo(() => {
    if (!results.length) return [];
    const sorted = [...results];
    switch (sortBy) {
      case "pdis":
        sorted.sort((a, b) => b.pdis_score - a.pdis_score);
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "gene_symbol":
        sorted.sort((a, b) => a.gene_symbol.localeCompare(b.gene_symbol));
        break;
      case "relevance":
      default:
        break; // keep server-side order
    }
    return sorted;
  }, [results, sortBy]);

  useEffect(() => {
    if (query.trim()) handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);

    try {
      const res = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      if (!res.ok) throw new Error("API unavailable");
      const data: SearchResponse = await res.json();
      setResults(data.results || []);
      setParsedFilters(data.parsedFilters || null);
      setTotalMatches(data.totalMatches || 0);
    } catch {
      setResults([]);
      setParsedFilters(null);
      setTotalMatches(0);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleExampleClick = useCallback((example: string) => {
    setQuery(example);
  }, []);

  const toggleCompare = useCallback((gene: string) => {
    setCompareSet((prev) => {
      const next = new Set(prev);
      if (next.has(gene)) {
        next.delete(gene);
      } else if (next.size < 4) {
        next.add(gene);
      }
      return next;
    });
  }, []);

  const clearCompare = useCallback(() => {
    setCompareSet(new Set());
    setCompareData([]);
  }, []);

  const handleCompare = useCallback(async () => {
    if (compareSet.size < 2) return;
    const genes = Array.from(compareSet);
    const fetched: SearchResult[] = [];
    for (const gene of genes) {
      try {
        const res = await fetch(`/api/kinases/${gene}`);
        if (res.ok) {
          const data = await res.json();
          fetched.push({
            gene_symbol: data.gene_symbol || gene,
            name: data.full_name || "",
            group: data.classification?.group || "",
            pdis_score: data.pdis_score?.overall_score || 0,
            ligand_count: data.ligand_assays?.length || 0,
            mutation_count: data.mutations?.length || 0,
            disease_count: data.diseases_associated?.length || 0,
            organ_systems_impacted: data.organ_systems_impacted || [],
          });
        }
      } catch {}
    }
    setCompareData(fetched);
  }, [compareSet]);

  return (
    <div className="min-h-screen pb-20 pt-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-2">
            AI-Powered Kinase Search
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Ask questions in natural language and get intelligent results from the kinome database
          </p>
          {/* Mode toggle */}
          <div className="flex items-center justify-center gap-1 mt-5 bg-white/5 rounded-xl p-1 max-w-[200px] mx-auto border border-white/10">
            <button
              onClick={() => setMode("search")}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                mode === "search"
                  ? "bg-kinome-cyan/20 text-kinome-cyan shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Search
            </button>
            <button
              onClick={() => setMode("chat")}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                mode === "chat"
                  ? "bg-kinome-cyan/20 text-kinome-cyan shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Chat
            </button>
          </div>
        </motion.div>

        {mode === "search" && (<>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="max-w-3xl mx-auto mb-6"
        >
          <div className="bg-slate-900/40 backdrop-blur-sm border border-white/10 rounded-2xl p-5">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Ask about kinases, diseases, tissues, inhibitors..."
              rows={3}
              className="w-full px-4 py-3 text-sm text-slate-200 placeholder-slate-500 bg-slate-800/50 border border-white/10 rounded-xl outline-none focus:border-kinome-cyan/40 focus:ring-1 focus:ring-kinome-cyan/20 transition-all duration-200 resize-none"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-slate-600">Press Enter to search</span>
              <button
                onClick={handleSearch}
                disabled={loading || !query.trim()}
                className="px-6 py-2 text-sm font-medium text-white bg-kinome-cyan/20 hover:bg-kinome-cyan/30 border border-kinome-cyan/30 rounded-xl backdrop-blur-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Searching...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {EXAMPLE_QUERIES.map((example, i) => (
              <button
                key={i}
                onClick={() => handleExampleClick(example)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 rounded-lg transition-all duration-200 text-left leading-relaxed"
              >
                {example}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto mb-8"
            >
              <div className="bg-slate-900/40 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center">
                <div className="w-12 h-12 rounded-full border-4 border-white/5 border-t-kinome-cyan/60 animate-spin mx-auto mb-4" />
                <p className="text-sm text-slate-400 animate-pulse">Analyzing your query...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {parsedFilters && !loading && searched && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto mb-6"
          >
            <div className="bg-slate-900/40 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-kinome-violet" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Extracted Filters
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {parsedFilters.groups.map((g) => (
                  <ParsedFilterTag key={`g-${g}`} label="Group" value={g} />
                ))}
                {parsedFilters.tissues.map((t) => (
                  <ParsedFilterTag key={`t-${t}`} label="Tissue" value={t} />
                ))}
                {parsedFilters.diseases.map((d) => (
                  <ParsedFilterTag key={`d-${d}`} label="Disease" value={d} />
                ))}
                {parsedFilters.bindingTypes.map((b) => (
                  <ParsedFilterTag key={`b-${b}`} label="Binding" value={b} />
                ))}
                {parsedFilters.minPdis !== null && (
                  <ParsedFilterTag label="Min PDIS" value={parsedFilters.minPdis.toFixed(2)} />
                )}
                {parsedFilters.maxPdis !== null && (
                  <ParsedFilterTag label="Max PDIS" value={parsedFilters.maxPdis.toFixed(2)} />
                )}
                {parsedFilters.groups.length === 0 &&
                  parsedFilters.tissues.length === 0 &&
                  parsedFilters.diseases.length === 0 &&
                  parsedFilters.bindingTypes.length === 0 &&
                  parsedFilters.minPdis === null &&
                  parsedFilters.maxPdis === null && (
                    <span className="text-xs text-slate-500">No structured filters extracted (free-text search)</span>
                  )}
              </div>
            </div>
          </motion.div>
        )}

        {!loading && searched && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-3xl mx-auto mb-8"
          >
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <p className="text-sm text-slate-500">
                  <span className="text-white font-medium">{totalMatches}</span> result{totalMatches !== 1 ? "s" : ""} found
                </p>
                <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                  {[
                    { key: "relevance", label: "Relevance" },
                    { key: "pdis", label: "PDIS" },
                    { key: "name", label: "Name" },
                    { key: "gene_symbol", label: "Gene" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setSortBy(opt.key as typeof sortBy)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors ${
                        sortBy === opt.key
                          ? "bg-kinome-cyan/20 text-kinome-cyan"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {compareSet.size >= 2 && (
                <button
                  onClick={handleCompare}
                  className="px-4 py-1.5 text-xs font-medium text-kinome-cyan bg-kinome-cyan/10 hover:bg-kinome-cyan/20 border border-kinome-cyan/30 rounded-lg transition-colors"
                >
                  Compare {compareSet.size} kinases
                </button>
              )}
              {compareSet.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">{compareSet.size}/4 selected</span>
                  <button
                    onClick={clearCompare}
                    className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {sortedResults.map((result, idx) => {
                const isSelected = compareSet.has(result.gene_symbol);
                return (
                  <motion.div
                    key={result.gene_symbol}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(idx * 0.03, 0.5) }}
                    className={`bg-slate-900/40 backdrop-blur-sm border rounded-2xl p-5 transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "border-kinome-cyan/40 shadow-glow-cyan"
                        : "border-white/10 hover:border-white/20"
                    }`}
                    onClick={() => toggleCompare(result.gene_symbol)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <a
                            href={`/kinases/${result.gene_symbol}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-lg font-bold text-white hover:text-kinome-cyan transition-colors"
                          >
                            {result.gene_symbol}
                          </a>
                          <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">{result.group}</span>
                          {result.fda_approval_status && (
                            <span className="text-xs text-kinome-emerald bg-kinome-emerald/10 px-2 py-0.5 rounded-full border border-kinome-emerald/20">
                              FDA Approved
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-1 mb-2">{result.name}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          {result.ligand_count !== undefined && (
                            <span>{result.ligand_count} ligands</span>
                          )}
                          {result.mutation_count !== undefined && (
                            <span>{result.mutation_count} mutations</span>
                          )}
                          {result.disease_count !== undefined && (
                            <span>{result.disease_count} diseases</span>
                          )}
                        </div>
                        {result.organ_systems_impacted.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {result.organ_systems_impacted.slice(0, 4).map((o) => (
                              <span key={o} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-500 border border-white/5">
                                {o}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-center gap-2">
                        <div className="relative w-12 h-12">
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
                            <circle
                              cx="24"
                              cy="24"
                              r="20"
                              fill="none"
                              stroke={result.pdis_score >= 0.45 ? "#34d399" : result.pdis_score >= 0.25 ? "#38bdf8" : "#f59e0b"}
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeDasharray={2 * Math.PI * 20}
                              strokeDashoffset={2 * Math.PI * 20 - (result.pdis_score) * 2 * Math.PI * 20}
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                            {result.pdis_score.toFixed(2)}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="text-[10px] text-kinome-cyan font-medium">Selected</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="max-w-3xl mx-auto text-center py-16">
            <svg className="mx-auto h-16 w-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-slate-400 mb-1">No results found</h3>
            <p className="text-sm text-slate-500">
              {!searched
                ? ""
                : "Try rephrasing your query or using different keywords"}
            </p>
          </div>
        )}

        <AnimatePresence>
          {compareData.length >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.4 }}
              className="max-w-5xl mx-auto mt-10"
            >
              <div className="bg-slate-900/40 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">
                    Side-by-Side Comparison
                    <span className="text-sm font-normal text-slate-400 ml-2">({compareData.length} kinases)</span>
                  </h3>
                  <button
                    onClick={clearCompare}
                    className="text-xs text-slate-400 hover:text-white transition-colors"
                  >
                    Clear selection
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-5 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-32">Property</th>
                        {compareData.map((k) => (
                          <th key={k.gene_symbol} className="px-5 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                            {k.gene_symbol}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <ComparisonRow label="Full Name" values={compareData.map((k) => k.name)} />
                      <ComparisonRow label="Group" values={compareData.map((k) => k.group)} />
                      <ComparisonRow label="PDIS Score" values={compareData.map((k) => k.pdis_score.toFixed(2))} highlight />
                      <ComparisonRow
                        label="Tissues"
                        values={compareData.map((k) => k.organ_systems_impacted.slice(0, 3).join(", ") || "\u2014")}
                      />
                      <ComparisonRow
                        label="Ligands"
                        values={compareData.map((k) => String(k.ligand_count ?? 0))}
                      />
                      <ComparisonRow
                        label="Mutations"
                        values={compareData.map((k) => String(k.mutation_count ?? 0))}
                      />
                      <ComparisonRow
                        label="Diseases"
                        values={compareData.map((k) => String(k.disease_count ?? 0))}
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>)}

      {mode === "chat" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-3xl mx-auto"
        >
          <ChatInterface />
        </motion.div>
      )}
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  values,
  highlight = false,
}: {
  label: string;
  values: string[];
  highlight?: boolean;
}) {
  return (
    <tr className="hover:bg-white/[0.02] transition-colors">
      <td className="px-5 py-3 text-xs text-slate-500 font-medium">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`px-5 py-3 text-sm ${highlight ? "text-kinome-cyan font-semibold tabular-nums" : "text-slate-300"}`}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}
