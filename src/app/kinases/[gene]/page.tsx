"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import TabPanel from "@/components/ui/TabPanel";
import PDISBadge from "@/components/ui/PDISBadge";
import GroupBadge, { type KinaseGroup } from "@/components/ui/GroupBadge";
import LigandTable from "@/components/kinase/LigandTable";
import MutationTable from "@/components/kinase/MutationTable";
import AiSummary from "@/components/kinase/AiSummary";
import dynamic from "next/dynamic";

const NGLViewer = dynamic(() => import("@/components/kinase/NGLViewer"), { ssr: false });

interface TissueExpression {
  tissue_name: string;
  organ_system: string;
  tpm_value: number;
  protein_abundance: string;
  tau_specificity: number;
  data_source: string;
}

interface KeyReference {
  pubmed_id: string;
  citation_text: string;
  doi?: string;
  relevance_tag: string;
}

interface MutationData {
  mutation_code: string;
  position: number;
  pathogenicity: string;
  associated_diseases: string[];
  drug_resistance_effects: { drug_name: string; fold_resistance: number; mechanism: string }[];
  organ_systems_affected: string[];
}

interface LigandAssay {
  ligand_name: string;
  chembl_id?: string;
  binding_type: string;
  assay_type: string;
  value_nm: number;
  relation: string;
  target_conformation?: string;
  reference: { pubmed_id: string; doi?: string; title?: string; year?: number };
}

interface PDISScore {
  overall_score: number;
  citation_component: number;
  clinical_component: number;
  structure_component: number;
  patent_component: number;
  fda_approval_status: string;
}

interface KinaseDetail {
  gene_symbol: string;
  name: string;
  uniprot_id: string;
  ec_number?: string;
  classification: { group: string; family: string; subfamily: string };
  pdis_score: PDISScore;
  tissue_expressions: TissueExpression[];
  mutations: MutationData[];
  ligand_assays: LigandAssay[];
  key_references: KeyReference[];
  organ_systems_impacted: string[];
  diseases_associated: { name: string; description: string; omim_id: string }[];
  pathways?: { reactome_id: string; pathway_name: string; role: string }[];
  domains?: { name: string; start: number; end: number }[];
}

const TABS = [
  { id: "structure", label: "Structure", color: "kinome-cyan", icon: <TabIcon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /> },
  { id: "expression", label: "Distribution", color: "amber", icon: <TabIcon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
  { id: "chemical", label: "Ligands", color: "kinome-cyan", icon: <TabIcon d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /> },
  { id: "mutations", label: "Mutations", color: "kinome-violet", icon: <TabIcon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /> },
  { id: "diseases", label: "Diseases", color: "rose", icon: <TabIcon d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /> },
  { id: "references", label: "References", color: "kinome-emerald", icon: <TabIcon d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> },
];

function TabIcon({ d }: { d: string }) {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
    </svg>
  );
}

function DetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-3 mb-8">
        <div className="h-4 w-48 rounded bg-white/5 animate-shimmer" />
        <div className="h-10 w-40 rounded bg-white/5 animate-shimmer" />
        <div className="h-5 w-96 rounded bg-white/5 animate-shimmer" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="h-24 rounded-2xl bg-white/5 animate-shimmer" />
        <div className="h-24 rounded-2xl bg-white/5 animate-shimmer" />
        <div className="h-24 rounded-2xl bg-white/5 animate-shimmer" />
      </div>
      <div className="h-12 rounded-xl bg-white/5 animate-shimmer mb-6" />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-white/5 animate-shimmer" />
        ))}
      </div>
    </div>
  );
}

function NotFound({ gene }: { gene: string }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
      <div className="text-6xl mb-6 opacity-30">
        <svg className="mx-auto h-20 w-20 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-300 mb-2">
        Kinase &quot;{gene}&quot; not found
      </h2>
      <p className="text-slate-500 mb-6">The requested gene symbol does not exist in our database.</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-kinome-cyan/20 hover:bg-kinome-cyan/30 border border-kinome-cyan/30 rounded-xl transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Dashboard
      </Link>
    </div>
  );
}

function StructureTab({ kinase, onStructureCount }: { kinase: KinaseDetail; onStructureCount?: (count: number) => void }) {
  const domains = kinase.domains ?? [];
  const [pdbStructures, setPdbStructures] = useState<Array<{ pdb_id: string; title: string; resolution: number | null; method: string }>>([]);
  const [loadingStructures, setLoadingStructures] = useState(true);
  const [selectedPdb, setSelectedPdb] = useState<string | null>(null);

  useEffect(() => {
    const gene = kinase.gene_symbol;
    if (!gene) return;
    setLoadingStructures(true);

    fetch("https://search.rcsb.org/rcsbsearch/v2/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: {
          type: "terminal",
          service: "text",
          parameters: {
            attribute: "rcsb_polymer_entity_container_identifiers.reference_sequence_identifiers.database_accession",
            operator: "exact_match",
            value: kinase.uniprot_id || "",
          },
        },
        return_type: "entry",
        request_options: {
          results_content_type: ["experimental"],
          sort: [{ sort_by: "score", direction: "desc" }],
          paginate: { start: 0, rows: 20 },
        },
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        const ids = (data.result_set || []).map((r: Record<string, string>) => r.identifier).filter(Boolean);
        if (ids.length === 0) {
          setPdbStructures([]);
          setLoadingStructures(false);
          onStructureCount?.(1);
          return;
        }
        return fetch(`https://data.rcsb.org/rest/v1/core/entry/${ids[0]}`)
          .then((r) => r.json())
          .then((entry) => {
            const method = entry.exptl?.[0]?.method || "X-ray diffraction";
            const resolution = entry.rcsb_entry_info?.resolution_combined?.[0] || null;
            const title = entry.struct?.title || "";
            const structures = ids.map((id: string) => ({ pdb_id: id, title, resolution, method }));
            setPdbStructures(structures);
            setSelectedPdb(ids[0]);
            onStructureCount?.(ids.length);
          });
      })
      .catch(() => {
        setPdbStructures([]);
        onStructureCount?.(1);
      })
      .finally(() => setLoadingStructures(false));
  }, [kinase.gene_symbol, kinase.uniprot_id, onStructureCount]);

  const hasPdb = pdbStructures.length > 0;

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">3D Structure</h3>
          {selectedPdb && (
            <a
              href={`https://www.rcsb.org/structure/${selectedPdb}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-kinome-cyan hover:underline"
            >
              View on RCSB PDB ↗
            </a>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Viewer */}
          <div className="flex-1 min-w-0 max-w-[640px]">
            {loadingStructures ? (
              <div className="aspect-video rounded-xl bg-slate-900/60 border border-white/5 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-10 h-10 rounded-full border-2 border-white/5 border-t-kinome-cyan/60 animate-spin mx-auto mb-3" />
                  <p className="text-sm text-slate-500">Fetching structures from RCSB PDB...</p>
                </div>
              </div>
            ) : hasPdb ? (
              <div className="rounded-xl overflow-hidden border border-white/5 h-[320px]">
                <NGLViewer key={selectedPdb} pdbId={selectedPdb} domains={domains} />
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-white/5 h-[320px]">
                <NGLViewer alphafoldId={kinase.uniprot_id} domains={domains} />
              </div>
            )}

            {domains.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                {domains.map((d, i) => {
                  const colors = ["#38bdf8","#34d399","#a855f7","#f59e0b","#f472b6","#22d3ee","#fb923c","#818cf8","#2dd4bf","#e879f9"];
                  return (
                    <span key={d.name} className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colors[i % colors.length] }} />
                      {d.name}
                    </span>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-slate-600 mt-3">
              Source: {hasPdb ? `RCSB PDB (Experimental) — ${selectedPdb}` : "AlphaFold Database (AI Prediction)"}
            </p>
          </div>

          {/* Right: Available structures list */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden h-full flex flex-col">
              <div className="px-4 py-3 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">
                  {pdbStructures.length > 0
                    ? `Available Structures (${pdbStructures.length})`
                    : "Structure Info"}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[320px]">
                {pdbStructures.length === 0 && !loadingStructures ? (
                  <div className="px-4 py-4 space-y-3">
                    <div className="bg-kinome-violet/10 border border-kinome-violet/20 rounded-lg px-3 py-2.5">
                      <p className="text-xs font-semibold text-kinome-violet">AlphaFold Predicted Model</p>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">UniProt</span>
                        <span className="text-slate-300 font-mono">{kinase.uniprot_id || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Gene</span>
                        <span className="text-slate-300">{kinase.gene_symbol || "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Source</span>
                        <span className="text-slate-300">AlphaFold DB</span>
                      </div>
                    </div>
                    <a
                      href={`https://alphafold.ebi.ac.uk/entry/${kinase.uniprot_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 w-full px-3 py-2 text-xs font-medium text-kinome-violet bg-kinome-violet/10 hover:bg-kinome-violet/20 border border-kinome-violet/20 rounded-lg transition-colors"
                    >
                      View on AlphaFold DB
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {pdbStructures.map((s) => (
                      <button
                        key={s.pdb_id}
                        onClick={() => setSelectedPdb(s.pdb_id)}
                        className={`w-full text-left px-4 py-3 transition-colors ${
                          selectedPdb === s.pdb_id
                            ? "bg-kinome-cyan/10 border-l-2 border-kinome-cyan"
                            : "hover:bg-white/[0.03] border-l-2 border-transparent"
                        }`}
                      >
                        <div className="font-mono text-sm font-medium text-kinome-cyan">{s.pdb_id}</div>
                        <div className="text-xs text-slate-400 mt-1 truncate">{s.method}</div>
                        {s.resolution != null && (
                          <div className="text-xs text-slate-500 mt-0.5">{s.resolution.toFixed(2)} Å</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpressionTab({ tissues }: { tissues: TissueExpression[] }) {
  const sorted = [...tissues].sort((a, b) => b.tpm_value - a.tpm_value);
  const maxTpm = Math.max(...sorted.map((t) => t.tpm_value), 1);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Tissue Expression Profile</h3>
        {sorted.length === 0 ? (
          <p className="text-slate-500 text-sm">No expression data available.</p>
        ) : (
          <div className="space-y-2">
            {sorted.map((tissue) => (
              <div key={tissue.tissue_name} className="flex items-center gap-3">
                <span className="w-40 text-sm text-slate-300 truncate text-right flex-shrink-0">
                  {tissue.tissue_name}
                </span>
                <div className="flex-1 h-5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(tissue.tpm_value / maxTpm) * 100}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, rgba(56,189,248,0.6), rgba(168,85,247,0.6))`,
                    }}
                  />
                </div>
                <span className="w-20 text-xs text-slate-400 tabular-nums text-right">
                  {tissue.tpm_value.toFixed(1)} TPM
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-white">Expression Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Tissue</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Organ System</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">TPM <InfoTip text="Transcripts Per Million — a normalized measure of gene expression level from RNA-seq data." /></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Abundance</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Tau <InfoTip text="Tissue specificity index (0–1), where 0 means uniform expression across tissues and 1 means exclusive to one tissue." /></th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.map((t, i) => (
                <tr key={t.tissue_name} className={i % 2 === 0 ? "bg-white/[0.02]" : ""}>
                  <td className="px-4 py-3 text-slate-200 font-medium">{t.tissue_name}</td>
                  <td className="px-4 py-3 text-slate-400">{t.organ_system}</td>
                  <td className="px-4 py-3 text-slate-300 tabular-nums">{t.tpm_value.toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <AbundanceBadge abundance={t.protein_abundance} />
                  </td>
                  <td className="px-4 py-3 text-slate-400 tabular-nums">{t.tau_specificity.toFixed(2)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{t.data_source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InfoTip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement>(null);

  const showTooltip = () => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.top - 8, left: r.left + r.width / 2 });
    }
    setShow(true);
  };

  const hideTooltip = () => setShow(false);

  return (
    <span className="inline-flex items-center">
      <span
        ref={ref}
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-slate-500/50 text-[9px] text-slate-500 cursor-help hover:border-kinome-cyan/50 hover:text-kinome-cyan transition-colors"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        tabIndex={0}
        role="button"
        aria-label="More information"
      >
        ?
      </span>
      {show && typeof document !== "undefined" && createPortal(
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.15 }}
          className="fixed z-50 px-3 py-1.5 text-xs leading-tight text-white bg-slate-800/95 backdrop-blur-sm rounded-lg border border-white/10 shadow-lg pointer-events-none w-56 text-center"
          style={{ top: pos.top, left: pos.left, transform: "translateX(-50%) translateY(-100%)" }}
        >
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800/95" />
        </motion.div>,
        document.body
      )}
    </span>
  );
}

function AbundanceBadge({ abundance }: { abundance: string }) {
  const colors: Record<string, string> = {
    high: "bg-kinome-emerald/15 text-kinome-emerald border border-kinome-emerald/20",
    moderate: "bg-kinome-cyan/15 text-kinome-cyan border border-kinome-cyan/20",
    low: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    undetectable: "bg-slate-500/15 text-slate-400 border border-slate-500/20",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[abundance] ?? colors.undetectable}`}>
      {abundance}
    </span>
  );
}

function ReferencesTab({ references }: { references: KeyReference[] }) {
  const relevanceColors: Record<string, string> = {
    review: "bg-kinome-cyan/15 text-kinome-cyan border border-kinome-cyan/20",
    structural: "bg-kinome-violet/15 text-kinome-violet border border-kinome-violet/20",
    functional: "bg-kinome-emerald/15 text-kinome-emerald border border-kinome-emerald/20",
    clinical: "bg-rose-500/15 text-rose-400 border border-rose-500/20",
    "drug discovery": "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    "pathway analysis": "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  };

  function getTagColor(tag: string): string {
    const lower = tag.toLowerCase();
    for (const [key, val] of Object.entries(relevanceColors)) {
      if (lower.includes(key)) return val;
    }
    return "bg-slate-500/15 text-slate-400 border border-slate-500/20";
  }

  return (
    <div className="space-y-3">
      {references.length === 0 ? (
        <div className="glass-card p-8 text-center text-slate-500 text-sm">
          No references available.
        </div>
      ) : (
        references.map((ref, idx) => (
          <motion.div
            key={ref.pubmed_id ?? idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.5) }}
            className="glass-card p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 leading-relaxed mb-2">
                  {ref.citation_text}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${getTagColor(ref.relevance_tag)}`}>
                    {ref.relevance_tag}
                  </span>
                  {ref.pubmed_id && (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${ref.pubmed_id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-kinome-cyan hover:text-kinome-cyan/80 transition-colors"
                    >
                      PubMed
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                  {ref.doi && (
                    <a
                      href={`https://doi.org/${ref.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-kinome-violet hover:text-kinome-violet/80 transition-colors"
                    >
                      DOI
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}

function DiseasesTab({ diseases }: { diseases: { name: string; description: string; omim_id: string }[] }) {
  return (
    <div className="space-y-3">
      {diseases.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm rounded-2xl bg-slate-900/40 backdrop-blur-sm border border-rose-500/20">
          No disease associations reported for this kinase.
        </div>
      ) : (
        diseases.map((disease, idx) => (
          <motion.div
            key={disease.name ?? idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.5) }}
            className="p-5 rounded-2xl bg-slate-900/40 backdrop-blur-sm border border-rose-500/20"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold text-white mb-2">
                  {disease.omim_id ? (
                    <a
                      href={`https://omim.org/entry/${disease.omim_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-kinome-cyan transition-colors"
                    >
                      {disease.name}
                      <svg className="w-3 h-3 inline ml-1 -mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    disease.name
                  )}
                </h4>
                {disease.description && (
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {disease.description}
                  </p>
                )}
              </div>
              {disease.omim_id && (
                <a
                  href={`https://omim.org/entry/${disease.omim_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-colors flex-shrink-0"
                >
                  OMIM:{disease.omim_id}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </motion.div>
        ))
      )}
    </div>
  );
}

export default function KinaseDetailPage() {
  const params = useParams();
  const gene = params.gene as string;

  const [kinase, setKinase] = useState<KinaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("structure");
  const [structureCount, setStructureCount] = useState(0);

  useEffect(() => {
    if (!gene) return;
    setLoading(true);
    setNotFound(false);

    fetch(`/api/kinases/${gene}`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          setLoading(false);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data) setKinase(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [gene]);

  if (loading) return <DetailSkeleton />;
  if (notFound) return <NotFound gene={gene} />;
  if (!kinase) return null;

  const group = (kinase.classification?.group ?? "") as KinaseGroup;

  const tabCounts: Record<string, number> = {
    structure: structureCount,
    expression: kinase.tissue_expressions?.length ?? 0,
    chemical: kinase.ligand_assays?.length ?? 0,
    mutations: kinase.mutations?.length ?? 0,
    diseases: kinase.diseases_associated?.length ?? 0,
    references: kinase.key_references?.length ?? 0,
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <nav className="flex items-center gap-1.5 text-sm text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition-colors">
            Home
          </Link>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/" className="hover:text-slate-300 transition-colors">
            {group}
          </Link>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-300 font-medium">{kinase.gene_symbol}</span>
        </nav>
      </div>

      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                {kinase.gene_symbol}
              </h1>
              {group && <GroupBadge group={group} />}
            </div>
            <p className="text-base text-slate-400 leading-relaxed mb-3 max-w-2xl">
              {kinase.name}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              {kinase.uniprot_id && (
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-600">UniProt:</span>
                  <a
                    href={`https://www.uniprot.org/uniprot/${kinase.uniprot_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-kinome-cyan hover:text-kinome-cyan/80 transition-colors"
                  >
                    {kinase.uniprot_id}
                  </a>
                </span>
              )}
              {kinase.ec_number && (
                <span>
                  <span className="text-slate-600">EC:</span> {kinase.ec_number}
                </span>
              )}
              {kinase.classification?.family && (
                <span>
                  <span className="text-slate-600">Family:</span> {kinase.classification.family}
                </span>
              )}
              {kinase.classification?.subfamily && (
                <span>
                  <span className="text-slate-600">Subfamily:</span> {kinase.classification.subfamily}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-2 mt-4 text-sm">
              {kinase.organ_systems_impacted.length > 0 && (
                <div>
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1.5">Organ Systems</span>
                  <div className="flex flex-wrap gap-1.5">
                    {kinase.organ_systems_impacted.map((system) => (
                      <span
                        key={system}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/5 text-slate-300 border border-white/5"
                      >
                        {system}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {kinase.diseases_associated.length > 0 && (
                <div>
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1.5">Disease Associations</span>
                  <div className="flex flex-wrap gap-1.5">
                    {kinase.diseases_associated.map((disease) => (
                      <span
                        key={disease.name}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/5 text-rose-400/80 border border-rose-500/10"
                      >
                        {disease.omim_id ? (
                          <a
                            href={`https://omim.org/entry/${disease.omim_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {disease.name}
                          </a>
                        ) : (
                          disease.name
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PDIS Score */}
          <div className="flex-shrink-0">
            <div className="glass-card p-4 flex flex-col items-center gap-2">
              <PDISBadge score={kinase.pdis_score.overall_score} size="lg" />
              <span className="text-xs text-slate-500 font-medium">PDIS Score</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* AI Summary */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <AiSummary data={kinase} />
      </section>

      {/* Tabs */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <TabPanel tabs={TABS.map(t => ({ ...t, count: tabCounts[t.id] ?? 0 }))} activeTab={activeTab} onTabChange={setActiveTab}>
          {activeTab === "structure" && <StructureTab kinase={kinase} onStructureCount={setStructureCount} />}
          {activeTab === "expression" && <ExpressionTab tissues={kinase.tissue_expressions ?? []} />}
          {activeTab === "chemical" && <LigandTable ligands={kinase.ligand_assays ?? []} />}
          {activeTab === "mutations" && <MutationTable mutations={kinase.mutations ?? []} />}
          {activeTab === "diseases" && <DiseasesTab diseases={kinase.diseases_associated ?? []} />}
          {activeTab === "references" && <ReferencesTab references={kinase.key_references ?? []} />}
        </TabPanel>
      </section>
    </div>
  );
}



