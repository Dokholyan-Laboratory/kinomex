"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DrugResistanceEffect {
  drug_name: string;
  fold_resistance: number;
  mechanism: string;
}

interface MutationData {
  mutation_code: string;
  position: number;
  pathogenicity: string;
  associated_diseases: string[];
  drug_resistance_effects: DrugResistanceEffect[];
  organ_systems_affected: string[];
}

interface MutationTableProps {
  mutations: MutationData[];
}

const pathogenicityConfig: Record<string, { label: string; color: string }> = {
  pathogenic: { label: "Pathogenic", color: "bg-rose-500/15 text-rose-400 border border-rose-500/20" },
  likely_pathogenic: { label: "Likely Pathogenic", color: "bg-orange-500/15 text-orange-400 border border-orange-500/20" },
  variant_of_uncertain_significance: { label: "VUS", color: "bg-amber-500/15 text-amber-400 border border-amber-500/20" },
  likely_benign: { label: "Likely Benign", color: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" },
  benign: { label: "Benign", color: "bg-green-500/15 text-green-400 border border-green-500/20" },
};

function getPathogenicityConfig(pathogenicity: string) {
  return (
    pathogenicityConfig[pathogenicity] ?? {
      label: pathogenicity,
      color: "bg-slate-500/15 text-slate-400 border border-slate-500/20",
    }
  );
}

function ExpandableRow({
  mutation,
  index,
}: {
  mutation: MutationData;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = getPathogenicityConfig(mutation.pathogenicity);
  const hasEffects = mutation.drug_resistance_effects.length > 0;

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <>
      <tr className={`group ${index % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
        <td className="px-4 py-3">
          <span className="text-slate-200 font-mono font-medium text-sm">
            {mutation.mutation_code}
          </span>
        </td>
        <td className="px-4 py-3 text-slate-400 tabular-nums">{mutation.position}</td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {mutation.associated_diseases.slice(0, 3).map((disease) => (
              <span
                key={disease}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/5 text-slate-300 border border-white/5"
              >
                {disease}
              </span>
            ))}
            {mutation.associated_diseases.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/5 text-slate-500 border border-white/5">
                +{mutation.associated_diseases.length - 3}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-1">
            {mutation.organ_systems_affected.slice(0, 2).map((organ) => (
              <span
                key={organ}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-kinome-violet/10 text-kinome-violet/80 border border-kinome-violet/15"
              >
                {organ}
              </span>
            ))}
            {mutation.organ_systems_affected.length > 2 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/5 text-slate-500 border border-white/5">
                +{mutation.organ_systems_affected.length - 2}
              </span>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          {hasEffects ? (
            <button
              onClick={toggle}
              className="inline-flex items-center gap-1 text-xs text-kinome-cyan hover:text-kinome-cyan/80 transition-colors"
            >
              <span>{mutation.drug_resistance_effects.length} effect{mutation.drug_resistance_effects.length !== 1 ? "s" : ""}</span>
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ) : (
            <span className="text-slate-600 text-xs">—</span>
          )}
        </td>
      </tr>
      {hasEffects && expanded && (
        <tr>
          <td colSpan={6} className="px-4 py-0">
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="py-3 pl-4 border-l-2 border-kinome-cyan/30 ml-2 mb-3 space-y-2">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    Drug Resistance Effects
                  </p>
                  {mutation.drug_resistance_effects.map((effect, i) => (
                    <div
                      key={`${effect.drug_name}-${i}`}
                      className="flex items-start gap-4 p-3 rounded-lg bg-white/[0.03] border border-white/5"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-slate-200 font-medium">{effect.drug_name}</span>
                          <span className="text-xs text-amber-400 font-mono tabular-nums">
                            {effect.fold_resistance}x fold
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">{effect.mechanism}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </td>
        </tr>
      )}
    </>
  );
}

export default function MutationTable({ mutations }: MutationTableProps) {
  if (mutations.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-slate-500 text-sm">
        No mutation data available for this kinase.
      </div>
    );
  }

  return (
    <>
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">
            Mutations
            <span className="ml-2 text-slate-500 font-normal">({mutations.length})</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Mutation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Position
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Pathogenicity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Associated Diseases
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Organ Systems
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Drug Resistance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {mutations.map((mutation, idx) => (
                <ExpandableRow key={`${mutation.mutation_code}-${idx}`} mutation={mutation} index={idx} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="glass-card px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Pathogenicity Legend:</span>
        {Object.entries(pathogenicityConfig).map(([key, cfg]) => (
          <span key={key} className="inline-flex items-center gap-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${cfg.color}`}>
              {cfg.label}
            </span>
            {key === "variant_of_uncertain_significance" && (
              <span className="text-[10px] text-slate-400">(Variant of Uncertain Significance)</span>
            )}
          </span>
        ))}
      </div>
    </>
  );
}
