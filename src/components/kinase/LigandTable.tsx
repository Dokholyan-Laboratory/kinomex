"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";

interface LigandReference {
  pubmed_id: string;
  doi?: string;
  title?: string;
  year?: number;
}

interface LigandAssay {
  ligand_name: string;
  chembl_id?: string;
  binding_type: string;
  assay_type: string;
  value_nm: number;
  relation: string;
  target_conformation?: string;
  reference: LigandReference;
}

interface LigandTableProps {
  ligands: LigandAssay[];
}

type SortField = "ligand_name" | "value_nm";
type SortDir = "asc" | "desc";

const bindingTypeColors: Record<string, string> = {
  IC50: "bg-kinome-cyan/15 text-kinome-cyan border border-kinome-cyan/20",
  Ki: "bg-kinome-violet/15 text-kinome-violet border border-kinome-violet/20",
  Kd: "bg-kinome-emerald/15 text-kinome-emerald border border-kinome-emerald/20",
  EC50: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
};

function formatValue(nm: number | undefined | null): string {
  if (nm == null || isNaN(nm)) return "—";
  if (nm >= 1_000_000) return `${(nm / 1_000_000).toFixed(1)}M`;
  if (nm >= 1_000) return `${(nm / 1_000).toFixed(1)}k`;
  if (nm >= 1) return nm.toFixed(1);
  if (nm >= 0.001) return `${(nm * 1000).toFixed(1)}pM`;
  return nm.toExponential(1);
}

function SortButton({
  field,
  currentField,
  currentDir,
  onSort,
}: {
  field: SortField;
  currentField: SortField;
  currentDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = currentField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 group"
    >
      <span className={active ? "text-white" : "text-slate-400 group-hover:text-slate-200"}>
        {field === "ligand_name" ? "Ligand Name" : "Value (nM)"}
      </span>
      <svg
        className={`w-3 h-3 transition-colors ${active ? "text-kinome-cyan" : "text-slate-600"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={active && currentDir === "desc" ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"}
        />
      </svg>
    </button>
  );
}

export default function LigandTable({ ligands }: LigandTableProps) {
  const [sortField, setSortField] = useState<SortField>("value_nm");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    return [...ligands].sort((a, b) => {
      let cmp = 0;
      if (sortField === "ligand_name") {
        cmp = a.ligand_name.localeCompare(b.ligand_name);
      } else {
        cmp = a.value_nm - b.value_nm;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [ligands, sortField, sortDir]);

  if (ligands.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-slate-500 text-sm">
        No ligand/binding assay data available for this kinase.
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Binding Assays
          <span className="ml-2 text-slate-500 font-normal">({ligands.length})</span>
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                <SortButton field="ligand_name" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Binding Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Assay
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                <SortButton field="value_nm" currentField={sortField} currentDir={sortDir} onSort={handleSort} />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Conformation
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                Reference
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((ligand, idx) => (
              <motion.tr
                key={`${ligand.ligand_name}-${ligand.binding_type}-${idx}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15, delay: Math.min(idx * 0.02, 0.4) }}
                className={idx % 2 === 0 ? "bg-white/[0.02]" : ""}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-slate-200 font-medium">{ligand.ligand_name}</span>
                    {ligand.chembl_id && (
                      <span className="text-xs text-slate-500">{ligand.chembl_id}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      bindingTypeColors[ligand.binding_type] ?? "bg-slate-500/15 text-slate-400 border border-slate-500/20"
                    }`}
                  >
                    {ligand.binding_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {ligand.assay_type}
                </td>
                <td className="px-4 py-3">
                  <span className="text-slate-200 font-mono tabular-nums text-xs">
                    {ligand.relation !== "=" ? ligand.relation : ""}
                    {formatValue(ligand.value_nm)}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {ligand.target_conformation ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {ligand.reference?.pubmed_id ? (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${ligand.reference.pubmed_id}/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-kinome-cyan hover:text-kinome-cyan/80 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      {ligand.reference.year ?? "PubMed"}
                    </a>
                  ) : (
                    <span className="text-slate-600 text-xs">—</span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
