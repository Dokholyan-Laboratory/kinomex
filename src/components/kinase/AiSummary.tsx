"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TissueExpression {
  tissue_name: string;
  organ_system: string;
  tpm_value: number;
  protein_abundance: string;
  tau_specificity: number;
}

interface MutationData {
  mutation_code: string;
  pathogenicity: string;
  associated_diseases: string[];
  drug_resistance_effects: { drug_name: string }[];
}

interface LigandAssay {
  ligand_name: string;
  binding_type: string;
  assay_type: string;
  value_nm: number;
}

interface Domain {
  name: string;
  start: number;
  end: number;
}

interface Disease {
  name: string;
  description: string;
  omim_id: string;
}

interface SummaryData {
  gene_symbol: string;
  name: string;
  pdis_score?: { overall_score: number };
  classification: { group: string; family: string; subfamily: string };
  domains?: Domain[];
  tissue_expressions: TissueExpression[];
  ligand_assays: LigandAssay[];
  mutations: MutationData[];
  diseases_associated: Disease[];
  key_references: { pubmed_id: string; relevance_tag: string }[];
  organ_systems_impacted: string[];
}



function formatScore(score: number): string {
  return (score * 100).toFixed(0);
}

function bestAffinity(ligands: LigandAssay[]): string {
  const sorted = ligands.filter(l => l.value_nm > 0).sort((a, b) => a.value_nm - b.value_nm);
  if (sorted.length === 0) return "";
  const best = sorted[0];
  if (best.value_nm < 1) return `${best.ligand_name} (${best.value_nm.toFixed(2)} nM)`;
  if (best.value_nm < 10) return `${best.ligand_name} (${best.value_nm.toFixed(1)} nM)`;
  return `${best.ligand_name} (${best.value_nm.toFixed(0)} nM)`;
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-300 leading-relaxed">{children}</p>;
}

export default function AiSummary({ data }: { data: SummaryData }) {
  const [expanded, setExpanded] = useState(false);
  const g = data.gene_symbol;
  const name = data.name;
  const group = data.classification?.group || "";
  const family = data.classification?.family || "";
  const subfamily = data.classification?.subfamily || "";

  const nTissues = data.tissue_expressions.length;
  const sortedTissues = [...data.tissue_expressions].sort((a, b) => b.tpm_value - a.tpm_value);
  const topTissue = sortedTissues[0];
  const nSystems = data.organ_systems_impacted.length;
  const nLigands = data.ligand_assays.length;
  const nMutations = data.mutations.length;
  const nDiseases = data.diseases_associated.length;
  const nRefs = data.key_references.length;
  const nDomains = data.domains?.length || 0;
  const pdis = data.pdis_score?.overall_score;

  const pathCounts: Record<string, number> = {};
  for (const m of data.mutations) {
    const p = m.pathogenicity || "Unknown";
    pathCounts[p] = (pathCounts[p] || 0) + 1;
  }
  const pathDetails = Object.entries(pathCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([p, c]) => {
      const label = p.toLowerCase() === "variant_of_uncertain_significance" ? "VUS" : p;
      return `${c} ${label}`;
    })
    .join(", ");

  const drugResistant = data.mutations.filter(m => m.drug_resistance_effects.length > 0).length;
  const bindingTypes = Array.from(new Set(data.ligand_assays.map(l => l.binding_type)));

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-kinome-cyan/10 border border-kinome-cyan/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-kinome-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="text-left">
            <h2 className="text-sm font-semibold text-white group-hover:text-kinome-cyan transition-colors">
              AI Summary
            </h2>
            <p className="text-[11px] text-slate-500">
              {expanded ? "Hide" : "Show"} narrative summary of {g}
            </p>
          </div>
        </div>
        <motion.svg
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-4 h-4 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-6 border-t border-white/5">
              <div className="pt-4 space-y-3">

                <Para>
                  {g} ({name}) is a member of the {group} kinase group
                  {family ? `, ${family} family` : ""}
                  {subfamily ? `, ${subfamily} subfamily` : ""}.
                  {pdis !== undefined && (
                    <>
                      {" "}It has a PDIS score of {pdis.toFixed(2)} ({formatScore(pdis)}/100),
                      {pdis >= 0.7
                        ? " indicating high pharmaceutical interest and prioritization for drug development."
                        : pdis >= 0.4
                        ? " reflecting moderate pharmaceutical interest across available evidence."
                        : " suggesting limited pharmaceutical characterization to date."}
                    </>
                  )}
                </Para>

                <Para>
                  {nDomains === 0
                    ? `No domain architecture annotations are currently available for ${g}.`
                    : (() => {
                        const names = data.domains!.map(d => d.name).join(", ");
                        const totalLen = Math.max(...data.domains!.map(d => d.end));
                        let s = `The ${g} protein spans ${totalLen} residues and contains ${nDomains} annotated domain${nDomains > 1 ? "s" : ""}: ${names}`;
                        const groupDesc: Record<string, string> = {
                          TK: "characteristic of receptor or non-receptor tyrosine kinases that catalyze phosphotransfer to tyrosine residues.",
                          TKL: "typical of tyrosine kinase-like kinases that function in TGF-β and MAPK signaling cascades.",
                          AGC: "a group that includes PKA, PKC, and PKG families involved in second-messenger signaling.",
                          CAMK: "consistent with calcium/calmodulin-dependent kinases that respond to intracellular calcium signals.",
                          CMGC: "encompassing CDK, MAPK, GSK, and CLK families that regulate the cell cycle and transcription.",
                          STE: "part of the STE kinase family that functions upstream of MAPK signaling modules.",
                          CK1: "a casein kinase 1 family member involved in Wnt signaling and circadian rhythm regulation.",
                        };
                        s += groupDesc[group] || `belonging to the ${group} group of the human kinome.`;
                        return s;
                      })()
                  }
                </Para>

                <Para>
                  {nTissues === 0
                    ? `Expression data for ${g} are not currently available.`
                    : <>
                        {g} is expressed across {nTissues} tissue{nTissues > 1 ? "s" : ""}
                        {nSystems > 0 && <> spanning {nSystems} organ system{nSystems > 1 ? "s" : ""} ({data.organ_systems_impacted.join(", ")})</>}.
                        {topTissue && <>
                          {" "}Highest expression is observed in {topTissue.tissue_name} at{" "}
                          {topTissue.tpm_value.toFixed(0)} TPM
                          {topTissue.protein_abundance ? ` with ${topTissue.protein_abundance.toLowerCase()} protein abundance` : ""}.
                        </>}
                        {topTissue && topTissue.tau_specificity > 0.8 && <>
                          {" "}The high tissue specificity (τ = {topTissue.tau_specificity.toFixed(2)}) suggests a specialized physiological role.
                        </>}
                        {topTissue && topTissue.tau_specificity > 0.5 && topTissue.tau_specificity <= 0.8 && <>
                          {" "}Moderate tissue specificity (τ = {topTissue.tau_specificity.toFixed(2)}) indicates broad but regulated expression.
                        </>}
                        {topTissue && topTissue.tau_specificity <= 0.5 && <>
                          {" "}Low tissue specificity (τ = {topTissue.tau_specificity.toFixed(2)}) suggests ubiquitous or housekeeping-type expression.
                        </>}
                      </>
                  }
                </Para>

                <Para>
                  {nMutations > 0 || nLigands > 0 || nDiseases > 0
                    ? <>
                        {nMutations > 0 && <>
                          {nMutations} mutation{nMutations > 1 ? "s" : ""} have been cataloged for {g}
                          {pathDetails ? <> ({pathDetails})</> : ""}.
                          {drugResistant > 0 && <>
                            {" "}Of these, {drugResistant} {drugResistant > 1 ? "are" : "is"} associated with drug resistance
                            {(() => {
                              const drugNames = Array.from(new Set(
                                data.mutations
                                  .filter(m => m.drug_resistance_effects.length > 0)
                                  .flatMap(m => m.drug_resistance_effects.map(e => e.drug_name))
                              ));
                              return drugNames.length > 0 ? <> ({drugNames.join(", ")})</> : null;
                            })()}.
                          </>}
                          {" "}
                        </>}
                        {nLigands > 0 && <>
                          {nLigands} ligand assay{nLigands > 1 ? "s" : ""} have been reported
                          {bindingTypes.length > 0 && <> ({bindingTypes.join(", ")})</>}
                          {bestAffinity(data.ligand_assays) && <>, with the highest affinity observed for {bestAffinity(data.ligand_assays)}</>}.
                          {" "}
                        </>}
                        {nDiseases > 0 && <>
                          {g} is implicated in {nDiseases} disease{nDiseases > 1 ? "s" : ""}: {data.diseases_associated.map(d => d.name).join(", ")}.
                        </>}
                      </>
                    : `No mutations, ligand assays, or disease associations have been recorded for ${g} in the current database.`
                  }
                </Para>

                {nRefs > 0 && (() => {
                  const tagCounts: Record<string, number> = {};
                  for (const r of data.key_references) {
                    const tag = r.relevance_tag || "general";
                    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                  }
                  const tagStr = Object.entries(tagCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([t, c]) => `${c} ${t}`)
                    .join(", ");
                  const s = `The current literature includes ${nRefs} reference${nRefs > 1 ? "s" : ""}${tagStr ? ` covering ${tagStr}` : ""}. Together, these data position ${g} as ${
                    pdis !== undefined && pdis >= 0.7
                      ? "a well-characterized kinase with substantial pharmaceutical and clinical relevance."
                      : pdis !== undefined && pdis >= 0.4
                      ? "a kinase with moderate characterization and emerging therapeutic interest."
                      : "a comparatively understudied kinase that may represent a novel research opportunity."
                  }`;
                  return <Para>{s}</Para>;
                })()}

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
