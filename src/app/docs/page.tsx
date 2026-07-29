"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const tabs = ["About", "Technical", "Encyclopedia"] as const;
type Tab = (typeof tabs)[number];

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
        active
          ? "bg-kinome-cyan/15 text-kinome-cyan border border-kinome-cyan/30"
          : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
      }`}
    >
      {label}
    </button>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-kinome-cyan">
          {icon}
        </div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Card({ title, children, className = "" }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass rounded-2xl p-6 border border-white/10 ${className}`}>
      {title && <h3 className="text-base font-semibold text-white mb-3">{title}</h3>}
      {children}
    </div>
  );
}

function Math({ children }: { children: string }) {
  return (
    <div className="bg-slate-900/80 border border-white/10 rounded-xl px-5 py-3 text-sm font-mono text-kinome-cyan overflow-x-auto my-3">
      {children}
    </div>
  );
}

function AboutTab() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-kinome-cyan/10 border border-kinome-cyan/20 text-kinome-cyan text-xs font-medium mb-6">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          Computational Biophysics Platform
        </div>
        <h1 className="text-4xl font-bold text-gradient-cyan-violet mb-4">KinomeX Documentation</h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          A full-stack computational biophysics platform covering the entire human kinome — 500+ protein kinases
          with structural biology, tissue expression, evolutionary phylogeny, and chemical genomics data.
        </p>
      </div>

      {/* What is a Kinome */}
      <Section title="What is a Kinome?" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}>
        <Card>
          <p className="text-slate-300 leading-relaxed">
            The <strong className="text-white">kinome</strong> is the complete set of protein kinases encoded by a genome.
            Protein kinases are enzymes that catalyze the transfer of a phosphate group from ATP to serine, threonine,
            or tyrosine residues on substrate proteins — a process called <strong className="text-kinome-cyan">phosphorylation</strong>.
          </p>
          <p className="text-slate-300 leading-relaxed mt-3">
            Phosphorylation is the master switch of cellular signaling. It controls cell growth, differentiation,
            metabolism, and apoptosis. Dysregulation of kinase activity is implicated in virtually every major disease,
            making kinases the <strong className="text-white">single most important drug target class</strong> in modern pharmacology.
          </p>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {[
            { n: "500+", label: "Human Kinases", color: "text-kinome-cyan", bg: "bg-kinome-cyan/10" },
            { n: "518+", label: "Canonical Kinome", color: "text-kinome-violet", bg: "bg-kinome-violet/10" },
            { n: "~70", label: "Approved Kinase Drugs", color: "text-kinome-emerald", bg: "bg-kinome-emerald/10" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border border-white/10 rounded-2xl p-5 text-center`}>
              <div className={`text-3xl font-bold ${s.color}`}>{s.n}</div>
              <div className="text-slate-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Architecture */}
      <Section title="Platform Architecture" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}>
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-kinome-cyan font-semibold text-sm uppercase tracking-wide">Frontend</h4>
                <p className="text-slate-400 text-sm mt-1">Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Framer Motion, Recharts</p>
              </div>
              <div>
                <h4 className="text-kinome-violet font-semibold text-sm uppercase tracking-wide">Backend</h4>
                <p className="text-slate-400 text-sm mt-1">Next.js API Routes → raw MongoDB queries via <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs text-kinome-cyan">motor</code> async driver</p>
              </div>
              <div>
                <h4 className="text-kinome-emerald font-semibold text-sm uppercase tracking-wide">Database</h4>
                <p className="text-slate-400 text-sm mt-1">MongoDB 7 (Docker), 7 collections: kinases, structures, bioactivities, expression, variants, pdis, diseases</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h4 className="text-kinome-amber font-semibold text-sm uppercase tracking-wide">ETL Pipeline</h4>
                <p className="text-slate-400 text-sm mt-1">Python 3.x async pipeline with Motor, aiohttp, cursor-based pagination</p>
              </div>
              <div>
                <h4 className="text-kinome-rose font-semibold text-sm uppercase tracking-wide">Data Sources</h4>
                <p className="text-slate-400 text-sm mt-1">UniProt, RCSB PDB, ChEMBL, ClinicalTrials.gov, PubMed, ClinVar, UniProt DISEASE</p>
              </div>
              <div>
                <h4 className="text-slate-300 font-semibold text-sm uppercase tracking-wide">Deployment</h4>
                <p className="text-slate-400 text-sm mt-1">Local dev with Docker, port 3007, MongoDB on 27017</p>
              </div>
            </div>
          </div>
        </Card>
      </Section>

      {/* Pages */}
      <Section title="Pages Overview" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: "Dashboard", path: "/", desc: "Aggregate statistics, top druggable and mutated kinases, PDIS distribution chart." },
            { name: "Kinome Tree", path: "/tree", desc: "Interactive phylogenetic tree with clickable nodes linking to each kinase's detail page." },
            { name: "Explorer", path: "/explorer", desc: "Filterable table of all 500+ kinases by group, PDIS score range, organ system, and search." },
            { name: "AI Search", path: "/search", desc: "Semantic search across kinases, PDIS profiles, structures, and bioactivities." },
            { name: "Kinase Detail", path: "/kinases/[gene]", desc: "Deep-dive page with structure viewer (RCSB PDB live + AlphaFold), tissue expression, mutations, and ligands." },
            { name: "Documentation", path: "/docs", desc: "This page — platform description, technical reference, and kinase encyclopedia." },
          ].map((p) => (
            <Card key={p.name}>
              <div className="flex items-start gap-3">
                <code className="text-xs bg-slate-800 text-kinome-cyan px-2 py-1 rounded-lg whitespace-nowrap">{p.path}</code>
                <div>
                  <h4 className="text-white font-semibold text-sm">{p.name}</h4>
                  <p className="text-slate-400 text-sm mt-1">{p.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}

function TechnicalTab() {
  return (
    <div className="space-y-12">
      {/* PDIS */}
      <Section title="PDIS — Pharmaceutical Development Interest Score" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}>
        <Card title="Definition">
          <p className="text-slate-300 leading-relaxed">
            PDIS is a composite metric that quantifies the pharmaceutical relevance of each kinase.
            It is computed from five weighted components, each capturing a different axis of drug development evidence.
          </p>
        </Card>

        <Card title="Formula">
          <Math>
            PDIS = w₁·f + w₂·g + w₃·h + w₄·m + w₅·a
          </Math>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {[
              { sym: "f", name: "Citation score", w: "w₁ = 0.30", formula: "f = min(1, ln(1 + N_pmid) / 10)", desc: "Log-normalized PubMed publication count" },
              { sym: "g", name: "Clinical trials", w: "w₂ = 0.30", formula: "g = min(1, N_ct / 100)", desc: "Normalized count of ClinicalTrials.gov entries" },
              { sym: "h", name: "Structure quality", w: "w₃ = 0.15", formula: "h = max(0, 1 − (res − 1.0) / 2.5)", desc: "Best PDB resolution (1.0–3.5 Å → 1.0–0.0)" },
              { sym: "m", name: "Patent proxy", w: "w₄ = 0.15", formula: "m = min(1, N_cmp / 50)", desc: "ChEMBL compound diversity count, normalized" },
              { sym: "a", name: "FDA approval", w: "w₅ = 0.10", formula: "a ∈ {0, 1}", desc: "Binary: 1 if any FDA-approved drug targets this kinase" },
            ].map((c) => (
              <div key={c.sym} className="bg-slate-900/60 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-8 h-8 rounded-lg bg-kinome-cyan/15 text-kinome-cyan font-mono font-bold text-sm flex items-center justify-center">{c.sym}</span>
                  <span className="text-white font-semibold text-sm">{c.name}</span>
                </div>
                <Math>{c.formula}</Math>
                <p className="text-slate-400 text-xs mt-1">{c.w} — {c.desc}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Weight Rationale">
          <p className="text-slate-300 text-sm leading-relaxed">
            <strong className="text-white">Citation (0.30):</strong> Publication volume is the strongest proxy for scientific interest and target validation.
            Logarithmic normalization compresses the long tail — the difference between 1 and 10 papers is more meaningful than between 1,000 and 1,010.
          </p>
          <p className="text-slate-300 text-sm leading-relaxed mt-2">
            <strong className="text-white">Clinical trials (0.30):</strong> Equal weight to citations because clinical investment directly predicts drug-to-market probability.
            Linear normalization to a target of 100 trials (typical for well-studied oncology kinases like BRAF, EGFR).
          </p>
          <p className="text-slate-300 text-sm leading-relaxed mt-2">
            <strong className="text-white">Structure (0.15):</strong> Experimental structures enable structure-based drug design. Resolution-based scoring
            maps the 1.0–3.5 Å range linearly to 1.0–0.0 quality, since sub-2.0 Å structures are sufficient for high-confidence ligand modeling.
          </p>
          <p className="text-slate-300 text-sm leading-relaxed mt-2">
            <strong className="text-white">Patent proxy (0.15):</strong> ChEMBL compound count approximates medicinal chemistry investment. Capped at 50 unique compounds.
          </p>
          <p className="text-slate-300 text-sm leading-relaxed mt-2">
            <strong className="text-white">FDA (0.10):</strong> Lowest weight because it is binary — it rewards already-approved targets but should not dominate the ranking of novel targets.
          </p>
        </Card>
      </Section>

      {/* ETL Pipeline */}
      <Section title="ETL Pipeline" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}>
        <Card title="Pipeline Steps">
          <div className="space-y-3">
            {[
              { step: 1, name: "uniprot", desc: "Cursor-based paginated fetch of human kinase entries", api: "rest.uniprot.org/uniprotkb/search", records: "~500" },
              { step: 2, name: "pdb", desc: "RCSB PDB search by UniProt accession + resolution filter", api: "search.rcsb.org/rcsbsearch/v2/query", records: "~70,910" },
              { step: 3, name: "chembl", desc: "Bulk paginated fetch of bioactivity records for human targets", api: "www.ebi.ac.uk/chembl/api/data/activity.json", records: "~50,000" },
              { step: 4, name: "gtex", desc: "Curated tissue expression patterns (basal + curated datasets)", api: "gtexportal.org/api/v2", records: "~34,589" },
              { step: 5, name: "clinvar", desc: "Curated known mutations + NCBI batch queries", api: "eutils.ncbi.nlm.nih.gov/entrez/eutils", records: "~87" },
              { step: 6, name: "diseases", desc: "UniProt DISEASE comment annotations per kinase entry", api: "rest.uniprot.org/uniprotkb/{uid}.json", records: "~1,000+" },
              { step: 7, name: "pdis", desc: "Composite score calculation from all upstream data", api: "PubMed, ClinicalTrials.gov", records: "~1,872" },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-4 bg-slate-900/50 border border-white/10 rounded-xl p-4">
                <div className="w-10 h-10 rounded-xl bg-kinome-violet/15 text-kinome-violet font-bold text-sm flex items-center justify-center flex-shrink-0">
                  {s.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm">{s.name}</span>
                    <code className="text-xs bg-slate-800 text-kinome-emerald px-2 py-0.5 rounded">{s.records}</code>
                  </div>
                  <p className="text-slate-400 text-sm mt-1">{s.desc}</p>
                  <code className="text-xs text-slate-500 mt-1 block">{s.api}</code>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Pagination — Cursor vs Offset">
          <p className="text-slate-300 text-sm leading-relaxed">
            UniProt switched from offset pagination to cursor-based pagination. The correct implementation reads
            the <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs text-kinome-cyan">X-Total-Results</code> header for the total count,
            and the <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs text-kinome-cyan">Link</code> HTTP header (not JSON body) for the next cursor URL.
          </p>
          <Math>
            {"while next_cursor:\n  response = GET(next_cursor)\n  records = parse(response)\n  next_cursor = extract_cursor_from_link_header(response.headers['Link'])"}
          </Math>
        </Card>

        <Card title="Rate Limiting">
          <p className="text-slate-300 text-sm leading-relaxed">
            All external API calls are throttled via <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs text-kinome-cyan">asyncio.sleep()</code>:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
            {[
              { api: "UniProt", rps: "3" },
              { api: "RCSB", rps: "5" },
              { api: "ChEMBL", rps: "3" },
              { api: "GTEx", rps: "2" },
              { api: "NCBI", rps: "2" },
            ].map((r) => (
              <div key={r.api} className="bg-slate-900/60 border border-white/10 rounded-lg p-3 text-center">
                <div className="text-white font-semibold text-sm">{r.api}</div>
                <div className="text-kinome-cyan font-mono text-lg">{r.rps}</div>
                <div className="text-slate-500 text-xs">req/sec</div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* Database Schema */}
      <Section title="Database Schema" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>}>
        <Card title="7 Collections in `kinomex` Database">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-slate-400 font-medium py-2 px-3">Collection</th>
                  <th className="text-left text-slate-400 font-medium py-2 px-3">Documents</th>
                  <th className="text-left text-slate-400 font-medium py-2 px-3">Key Fields</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {[
                  { col: "kinases", n: "500+", fields: "gene_symbol, uniprot_id, group, full_name, keywords" },
                  { col: "structures", n: "70,910", fields: "rcsb_id, uniprot_accession, resolution, gene_symbols, title" },
                  { col: "bioactivities", n: "50,000", fields: "target_chembl_id, standard_type, standard_value, standard_units, value_nm" },
                  { col: "expression", n: "34,589", fields: "gene_symbol, tissue_site, median_tpm, organ_system, data_source" },
                  { col: "variants", n: "87", fields: "gene_symbol, position, ref_aa, alt_aa, clinical_significance, associated_diseases" },
                  { col: "pdis", n: "1,872", fields: "gene_symbol, citation_score, clinical_score, structure_score, patent_score, fda_score, pdis_total" },
                  { col: "diseases", n: "~1,000+", fields: "gene_symbol, uniprot_id, diseases[].disease_id, diseases[].description, diseases[].omim_id" },
                ].map((r) => (
                  <tr key={r.col} className="border-b border-white/5">
                    <td className="py-2.5 px-3"><code className="text-kinome-cyan">{r.col}</code></td>
                    <td className="py-2.5 px-3 font-mono text-kinome-violet">{r.n}</td>
                    <td className="py-2.5 px-3 text-xs text-slate-400">{r.fields}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Section>

      {/* Tree Layout */}
      <Section title="Phylogenetic Tree Layout" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}>
        <Card title="Manning Group Layout">
          <p className="text-slate-300 text-sm leading-relaxed">
            The kinome tree is a radial phylogenetic layout with 9 groups arranged at fixed angular positions.
            Each group occupies a wedge, with kinases distributed along rays within their wedge.
          </p>
          <Math>
            {"angle(group_i) = (i / N_groups) × 2π + offset\nradius(kinase_j) = base + j × spacing\nx = radius × cos(angle)\ny = radius × sin(angle)"}
          </Math>
          <div className="grid grid-cols-3 md:grid-cols-9 gap-2 mt-4">
            {["AGC", "CAMK", "CK1", "CMGC", "STE", "TK", "TKL", "Atypical", "Other"].map((g) => (
              <div key={g} className="text-center py-2 px-1 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-slate-300">
                {g}
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* Data Flow */}
      <Section title="Request Lifecycle" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}>
        <Card>
          <Math>
            {"Browser → Next.js 14 Server Component\n  → API Route (/api/kinases)\n    → MongoDB raw query (motor async)\n    → 7 collections joined in application layer\n  ← JSON response\n← React + Tailwind + Recharts render"}
          </Math>
          <p className="text-slate-300 text-sm mt-3 leading-relaxed">
            All data is served from MongoDB via raw <code className="bg-slate-800 px-1.5 py-0.5 rounded text-xs text-kinome-cyan">db.collection.find()</code> queries —
            no Mongoose models. The API routes join data from multiple collections in application code and return flattened
            response objects that match the frontend component interfaces.
          </p>
        </Card>
      </Section>
    </div>
  );
}

function EncyclopediaTab() {
  return (
    <div className="space-y-12">
      {/* What are kinases */}
      <Section title="What Are Protein Kinases?" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}>
        <Card>
          <p className="text-slate-300 leading-relaxed">
            Protein kinases are enzymes (~2% of the human genome) that regulate virtually every cellular process by
            covalently adding phosphate groups to proteins. The human kinome consists of <strong className="text-white">518 canonical</strong> protein kinases
            and over <strong className="text-white">3,800 kinase-related</strong> genes (pseudokinases, kinase-like domains).
          </p>
          <p className="text-slate-300 leading-relaxed mt-3">
            The catalytic reaction: <strong className="text-kinome-cyan">ATP + Protein → ADP + Phosphoprotein</strong>.
            This reversible modification acts as a molecular switch, toggling protein activity, localization, and interactions.
          </p>
          <p className="text-slate-300 leading-relaxed mt-3">
            Protein kinases share a conserved <strong className="text-white">~250-residue catalytic domain</strong> with two lobes: a small N-terminal lobe
            (β-sheets, αC-helix) and a large C-terminal lobe (α-helices). The active site sits between them, binding ATP and the substrate peptide.
          </p>
        </Card>
      </Section>

      {/* Classification */}
      <Section title="Manning Classification" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}>
        <p className="text-slate-400 text-sm mb-4">
          The human kinome is classified into <strong className="text-white">8 major groups</strong> based on sequence similarity
          within the catalytic domain, established by Manning et al. (2002) and refined by Roskoski (2015).
        </p>

        <div className="space-y-4">
          {[
            {
              group: "AGC",
              full: "cAMP-dependent, cGMP-dependent, and protein kinase C",
              kinases: "~285",
              color: "bg-kinome-cyan",
              examples: "AKT1, PKA, PKC, PKG, PKN, PDK1, SGK, GRK",
              desc: "Regulated by lipids (PIP₃) and second messengers (cAMP, cGMP, Ca²⁺). Central to growth factor signaling (PI3K/AKT), neuronal function, and cardiac regulation. AKT1 is one of the most frequently activated kinases in cancer.",
              drugs: "Alpelisib (PI3K), MK-2206 (AKT)"
            },
            {
              group: "CAMK",
              full: "Calcium/calmodulin-dependent protein kinases",
              kinases: "~243",
              color: "bg-kinome-violet",
              examples: "CaMKII, AMPK, MARK, BRSK, LKB1, DAPK, MLCK",
              desc: "Activated by intracellular calcium/calmodulin complexes. AMPK is the cellular energy sensor — activated when ATP is low. LKB1 is a tumor suppressor that phosphorylates AMPK. DAPK family controls apoptosis.",
              drugs: "Experimental: Compound C (AMPK), STO-609 (CaMKK)"
            },
            {
              group: "CK1",
              full: "Casein kinase 1",
              kinases: "~82",
              color: "bg-kinome-amber",
              examples: "CSNK1A1, CSNK1D, CSNK1E, VRK1, VRK2",
              desc: "Constitutively active serine/threonine kinases. CK1ε/δ regulate circadian rhythm (phosphorylates PER proteins), Wnt signaling, and DNA repair. VRK kinases control nuclear envelope dynamics.",
              drugs: "PF-670462 (CK1ε), Tideglusib (GSK-3/CK1)"
            },
            {
              group: "CMGC",
              full: "CDK, MAPK, GSK3, CLK",
              kinases: "~1,015",
              color: "bg-kinome-rose",
              examples: "CDK1/2/4/6, ERK1/2, JNK, p38, GSK3β, CLK1, DYRK",
              desc: "The largest group. CDKs control cell cycle progression (CDK4/6 → G1/S). MAPK cascades (RAS→RAF→MEK→ERK) transduce mitogenic signals. GSK3β regulates metabolism and development. DYRK kinases are implicated in Down syndrome.",
              drugs: "Palbociclib (CDK4/6), Trametinib (MEK), Ribociclib (CDK4/6)"
            },
            {
              group: "STE",
              full: "Homologs of yeast sterile kinases",
              kinases: "~161",
              color: "bg-kinome-emerald",
              examples: "MEK1/2, MKK3/4/6/7, MLK1-3, MAP3K1-14, TAO",
              desc: "The MAPK kinase kinases (MAP3Ks) and MAPK kinases (MAP2Ks). They form the core signaling cascades: MAP3K → MAP2K → MAPK. MEK1/2 activate ERK1/2; MKK4/7 activate JNK; MKK3/6 activate p38.",
              drugs: "Trametinib (MEK1/2), Cobimetinib (MEK1/2)"
            },
            {
              group: "TK",
              full: "Tyrosine kinases",
              kinases: "~567",
              color: "bg-sky-400",
              examples: "EGFR, HER2, VEGFR, PDGFR, FGFR, MET, RON, SRC, ABL, JAK1-3",
              desc: "Phosphorylate tyrosine residues. Receptor tyrosine kinases (RTKs) are single-pass transmembrane receptors activated by ligand binding. Non-receptor tyrosine kinases (SRC, ABL, JAK) are cytoplasmic. RTKs drive angiogenesis (VEGFR), cell proliferation (EGFR), and immune signaling (JAK/STAT).",
              drugs: "Imatinib (ABL), Gefitinib (EGFR), Sunitinib (multi-RTK), Ruxolitinib (JAK)"
            },
            {
              group: "TKL",
              full: "Tyrosine kinase-like",
              kinases: "~209",
              color: "bg-indigo-400",
              examples: "RAF1, BRAF, ARAF, MLK1-3, MLK2, LCK, BTK, TEC",
              desc: "Structurally similar to tyrosine kinases but often phosphorylate serine/threonine. RAF kinases (BRAF) are key nodes in the RAS-MAPK pathway — BRAF V600E is the most common oncogenic kinase mutation in melanoma. BTK is essential for B-cell signaling.",
              drugs: "Vemurafenib (BRAF), Dabrafenib (BRAF), Ibrutinib (BTK)"
            },
            {
              group: "Atypical",
              full: "Atypical protein kinases",
              kinases: "~1,265",
              color: "bg-amber-400",
              examples: "PIKK family (ATM, ATR, mTOR, DNA-PK, SMG1, TRRAP), Alpha-kinases, TRIB1-3, NIMA",
              desc: "Do not share the canonical bilobal kinase fold. PIKKs (PI3K-related kinases) are massive (~300 kDa) and regulate DNA damage response (ATM/ATR), mRNA surveillance (SMG1), and cell growth (mTOR). Alpha-kinases have a unique fold despite catalyzing the same reaction.",
              drugs: "Rapamycin/everolimus (mTOR), AZD8055 (mTOR), AZD6738 (ATR)"
            },
          ].map((g) => (
            <Card key={g.group}>
              <div className="flex items-start gap-4">
                <div className={`w-16 h-16 rounded-2xl ${g.color}/20 flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-lg font-bold ${g.color}`}>{g.group}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-white font-bold">{g.full}</h3>
                    <code className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded">{g.kinases} kinases</code>
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed mt-2">{g.desc}</p>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div className="bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2">
                      <span className="text-slate-500 text-xs">Key members:</span>
                      <p className="text-slate-300 text-xs mt-0.5">{g.examples}</p>
                    </div>
                    <div className="bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2">
                      <span className="text-slate-500 text-xs">Approved / experimental drugs:</span>
                      <p className="text-kinome-emerald text-xs mt-0.5">{g.drugs}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Structural Anatomy */}
      <Section title="Kinase Structural Anatomy" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>}>
        <Card title="The Canonical Kinase Fold">
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            All eukaryotic protein kinases share a conserved <strong className="text-white">bilobal catalytic domain</strong> (~250 residues)
            with a deep cleft between the two lobes that binds ATP and the substrate.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 flex items-center justify-center">
              <svg viewBox="0 0 440 320" className="w-full max-w-md" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="nLobeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.18"/><stop offset="100%" stopColor="#38bdf8" stopOpacity="0.04"/></linearGradient>
                  <linearGradient id="cLobeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a855f7" stopOpacity="0.18"/><stop offset="100%" stopColor="#a855f7" stopOpacity="0.04"/></linearGradient>
                  <linearGradient id="atpGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4"/><stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1"/></linearGradient>
                  <filter id="softGlow"><feGaussianBlur stdDeviation="1.5" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                </defs>
                {/* N-lobe β-sheet ribbons (flat arrows with direction) */}
                <path d="M75 110 L120 95 L168 100 L175 85 L128 80 L68 95 Z" fill="url(#nLobeGrad)" stroke="#38bdf8" strokeWidth="0.7" opacity="0.5"/>
                <path d="M180 90 L130 88 L70 100 L62 115 L125 108 L182 105 Z" fill="url(#nLobeGrad)" stroke="#38bdf8" strokeWidth="0.7" opacity="0.5"/>
                {/* β-arrowheads */}
                <polygon points="175,85 183,88 180,92" fill="#38bdf8" opacity="0.2"/>
                <polygon points="182,105 190,108 186,112" fill="#38bdf8" opacity="0.2"/>
                {/* αC-helix (coiled ribbon) */}
                <path d="M140 120 Q155 115 165 120 Q175 125 185 118 Q195 111 208 118" fill="none" stroke="#38bdf8" strokeWidth="2.5" opacity="0.35"/>
                <path d="M140 122 Q155 117 165 122 Q175 127 185 120 Q195 113 208 120" fill="none" stroke="#38bdf8" strokeWidth="0.5" opacity="0.15"/>
                <path d="M140 118 Q155 113 165 118 Q175 123 185 116 Q195 109 208 116" fill="none" stroke="#38bdf8" strokeWidth="0.5" opacity="0.15"/>
                {/* G-loop (glycine-rich) */}
                <path d="M155 98 Q170 88 190 92 Q205 95 215 88 Q225 80 235 88" fill="none" stroke="#34d399" strokeWidth="0.8" opacity="0.3" strokeDasharray="2 2"/>
                {/* C-lobe α-helices (coiled ribbons) */}
                <path d="M85 185 Q105 175 125 185 Q145 195 160 183 Q175 171 195 183" fill="none" stroke="#a855f7" strokeWidth="3" opacity="0.3"/>
                <path d="M85 188 Q105 178 125 188 Q145 198 160 186 Q175 174 195 186" fill="none" stroke="#a855f7" strokeWidth="0.5" opacity="0.12"/>
                <path d="M85 182 Q105 172 125 182 Q145 192 160 180 Q175 168 195 180" fill="none" stroke="#a855f7" strokeWidth="0.5" opacity="0.12"/>
                <path d="M75 205 Q95 195 115 205 Q135 215 150 203 Q165 191 185 203" fill="none" stroke="#a855f7" strokeWidth="3" opacity="0.25"/>
                <path d="M75 208 Q95 198 115 208 Q135 218 150 206 Q165 194 185 206" fill="none" stroke="#a855f7" strokeWidth="0.5" opacity="0.10"/>
                <path d="M95 225 Q115 215 135 225 Q155 235 170 223" fill="none" stroke="#a855f7" strokeWidth="2.5" opacity="0.2"/>
                {/* C-lobe β-strand */}
                <path d="M210 200 L245 195 L280 205" fill="none" stroke="#a855f7" strokeWidth="1.5" opacity="0.15"/>
                <polygon points="280,205 288,203 285,210" fill="#a855f7" opacity="0.12"/>

                {/* Hinge connection */}
                <path d="M195 120 Q230 145 210 175" fill="none" stroke="#34d399" strokeWidth="1.2" opacity="0.35" strokeDasharray="4 2"/>

                {/* Activation loop (T-loop) */}
                <path d="M90 215 Q70 240 95 260 Q110 270 130 260" fill="none" stroke="#f43f5e" strokeWidth="1.2" opacity="0.35"/>
                <path d="M90 218 Q70 243 95 263" fill="none" stroke="#f43f5e" strokeWidth="0.4" opacity="0.15" strokeDasharray="1 3"/>
                {/* Phosphorylation site marker */}
                <circle cx="95" cy="258" r="2.5" fill="#f43f5e" opacity="0.2"/>
                <text x="55" y="280" fill="#f43f5e" fontSize="7" fontWeight="500" opacity="0.5">Activation loop (T-loop)</text>

                {/* ATP molecule (ball-and-stick) */}
                <g filter="url(#softGlow)">
                  <ellipse cx="195" cy="150" rx="8" ry="6" fill="url(#atpGrad)" stroke="#f59e0b" strokeWidth="0.5" opacity="0.5"/>
                  <text x="200" y="143" fill="#f59e0b" fontSize="7" fontWeight="600" opacity="0.55">ATP</text>
                  {/* Adenine ring */}
                  <circle cx="190" cy="146" r="1.8" fill="#f59e0b" opacity="0.25"/>
                  <circle cx="197" cy="148" r="1.5" fill="#f59e0b" opacity="0.2"/>
                  <circle cx="193" cy="152" r="1.2" fill="#f59e0b" opacity="0.15"/>
                  {/* Catalytic residues */}
                  <circle cx="175" cy="160" r="1.5" fill="#f43f5e" opacity="0.15"/>
                  <circle cx="180" cy="168" r="1.5" fill="#f43f5e" opacity="0.15"/>
                </g>

                {/* Mg²⁺ ions */}
                <circle cx="200" cy="155" r="1.5" fill="#34d399" opacity="0.2"/>
                <text x="205" y="158" fill="#34d399" fontSize="5" opacity="0.35">Mg²⁺</text>

                {/* Leader lines and labels */}
                <line x1="175" y1="90" x2="260" y2="72" stroke="#38bdf8" strokeWidth="0.4" opacity="0.2"/>
                <text x="262" y="75" fill="#38bdf8" fontSize="7" fontWeight="500" opacity="0.55">N-lobe (β-sheets)</text>

                <line x1="185" y1="195" x2="260" y2="210" stroke="#a855f7" strokeWidth="0.4" opacity="0.2"/>
                <text x="262" y="213" fill="#a855f7" fontSize="7" fontWeight="500" opacity="0.55">C-lobe (α-helices)</text>

                <line x1="230" y1="145" x2="295" y2="130" stroke="#34d399" strokeWidth="0.4" opacity="0.2"/>
                <text x="297" y="133" fill="#34d399" fontSize="7" fontWeight="500" opacity="0.55">Hinge region</text>

                <line x1="170" y1="86" x2="260" y2="52" stroke="#34d399" strokeWidth="0.4" opacity="0.15"/>
                <text x="262" y="55" fill="#34d399" fontSize="7" fontWeight="500" opacity="0.5">G-loop (GxGxxG)</text>

                {/* Catalytic site label */}
                <line x1="185" y1="160" x2="290" y2="168" stroke="#f59e0b" strokeWidth="0.4" opacity="0.15"/>
                <text x="292" y="171" fill="#f59e0b" fontSize="7" fontWeight="500" opacity="0.5">Catalytic site</text>
              </svg>
            </div>
            <div className="space-y-3">
              <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-kinome-cyan opacity-60" /><span className="text-xs font-semibold text-white">N-lobe</span></div>
                <p className="text-slate-400 text-xs mt-1">Small lobe composed of five antiparallel β-strands and the αC-helix. Binds the ATP β/γ-phosphates via the glycine-rich loop (G-loop, GxGxxG motif).</p>
              </div>
              <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-kinome-violet opacity-60" /><span className="text-xs font-semibold text-white">C-lobe</span></div>
                <p className="text-slate-400 text-xs mt-1">Larger lobe predominantly α-helical. Contains the catalytic loop (HRD motif), the DFG motif, and the substrate-binding site. The C-lobe provides most of the catalytic machinery.</p>
              </div>
              <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-kinome-emerald opacity-60" /><span className="text-xs font-semibold text-white">Hinge</span></div>
                <p className="text-slate-400 text-xs mt-1">Connects the two lobes. The linker flexibility allows domain closure upon ATP binding. The hinge region is also the binding site for most Type I ATP-competitive kinase inhibitors.</p>
              </div>
              <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-kinome-rose opacity-60" /><span className="text-xs font-semibold text-white">Activation loop (T-loop)</span></div>
                <p className="text-slate-400 text-xs mt-1">Contains the DFG motif at its N-terminus. Must be phosphorylated (at a conserved Ser/Thr/Tyr) for full activity in most kinases. The T-loop conformation determines DFG-in (active) vs DFG-out (inactive) states.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Active vs Inactive Conformation">
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            Kinases toggle between <strong className="text-kinome-cyan">active</strong> and <strong className="text-kinome-rose">inactive</strong> conformations
            governed by the DFG motif and the αC-helix position. The DFG motif refers to a conserved Asp-Phe-Gly sequence.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/80 border border-kinome-cyan/20 rounded-xl p-4">
              <h4 className="text-kinome-cyan text-sm font-semibold mb-3 text-center">DFG-in (Active state)</h4>
              <svg viewBox="0 0 320 200" className="w-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="actNLobe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15"/><stop offset="100%" stopColor="#38bdf8" stopOpacity="0.04"/></linearGradient>
                  <linearGradient id="actCLobe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a855f7" stopOpacity="0.15"/><stop offset="100%" stopColor="#a855f7" stopOpacity="0.04"/></linearGradient>
                </defs>
                {/* N-lobe */}
                <path d="M65 45 L135 32 L190 55 L185 105 L130 115 L55 100 Z" fill="url(#actNLobe)" stroke="#38bdf8" strokeWidth="0.7" opacity="0.45"/>
                {/* β-strands */}
                <path d="M75 55 L130 48" stroke="#38bdf8" strokeWidth="0.6" opacity="0.2"/>
                <path d="M70 68 L135 60" stroke="#38bdf8" strokeWidth="0.6" opacity="0.2"/>
                <path d="M65 81 L140 72" stroke="#38bdf8" strokeWidth="0.6" opacity="0.2"/>
                {/* αC-helix IN */}
                <path d="M120 70 Q140 63 155 70 Q170 77 180 70" fill="none" stroke="#38bdf8" strokeWidth="3" opacity="0.3"/>
                <text x="175" y="65" fill="#38bdf8" fontSize="7" fontWeight="600" opacity="0.5">αC-IN</text>
                {/* C-lobe */}
                <path d="M75 125 L125 120 L175 128 L185 165 L155 180 L95 183 L55 160 Z" fill="url(#actCLobe)" stroke="#a855f7" strokeWidth="0.7" opacity="0.45"/>
                {/* α-helices */}
                <path d="M85 130 Q105 125 125 130 Q145 135 160 128" fill="none" stroke="#a855f7" strokeWidth="2.5" opacity="0.25"/>
                <path d="M80 148 Q100 143 120 148 Q140 153 155 146" fill="none" stroke="#a855f7" strokeWidth="2" opacity="0.2"/>
                {/* Hinge */}
                <path d="M190 105 Q220 130 195 155" fill="none" stroke="#34d399" strokeWidth="0.8" opacity="0.3"/>
                {/* DFG-in (Asp pointing into pocket) */}
                <circle cx="100" cy="145" r="2.5" fill="#34d399" opacity="0.4"/>
                <text x="55" y="140" fill="#34d399" fontSize="7" fontWeight="500" opacity="0.5">DFG-Asp→</text>
                {/* ATP-binding pocket (open) */}
                <ellipse cx="148" cy="100" rx="16" ry="8" fill="none" stroke="#f59e0b" strokeWidth="0.6" opacity="0.25" strokeDasharray="3 2"/>
                <text x="150" y="96" fill="#f59e0b" fontSize="7" fontWeight="600" opacity="0.45">ATP</text>
                {/* Substrate peptide */}
                <path d="M120 175 Q130 185 140 195" fill="none" stroke="#f59e0b" strokeWidth="0.8" opacity="0.2"/>
                <path d="M115 178 Q125 188 135 198" fill="none" stroke="#f59e0b" strokeWidth="0.4" opacity="0.12"/>
                <text x="145" y="193" fill="#f59e0b" fontSize="7" fontWeight="500" opacity="0.45">Substrate</text>
                {/* Phosphorylation arrow */}
                <path d="M155 100 Q170 110 175 125" fill="none" stroke="#f59e0b" strokeWidth="0.5" opacity="0.15" markerEnd="url(#arrow)"/>
                <text x="178" y="118" fill="#f59e0b" fontSize="6" opacity="0.35">PO₄</text>
              </svg>
              <ul className="text-slate-400 text-xs space-y-0.5 mt-3">
                <li>• DFG-Asp faces <strong className="text-kinome-emerald">inward</strong> toward the ATP pocket</li>
                <li>• αC-helix rotated <strong className="text-kinome-cyan">inward</strong> (αC-IN)</li>
                <li>• Catalytic residues properly aligned</li>
                <li>• ATP and substrate can bind and react</li>
              </ul>
            </div>
            <div className="bg-slate-900/80 border border-kinome-rose/20 rounded-xl p-4">
              <h4 className="text-kinome-rose text-sm font-semibold mb-3 text-center">DFG-out (Inactive state)</h4>
              <svg viewBox="0 0 320 200" className="w-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="inactNLobe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity="0.12"/><stop offset="100%" stopColor="#f43f5e" stopOpacity="0.03"/></linearGradient>
                  <linearGradient id="inactCLobe" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a855f7" stopOpacity="0.12"/><stop offset="100%" stopColor="#a855f7" stopOpacity="0.03"/></linearGradient>
                </defs>
                {/* N-lobe */}
                <path d="M65 45 L135 32 L190 55 L185 105 L130 115 L55 100 Z" fill="url(#inactNLobe)" stroke="#f43f5e" strokeWidth="0.7" opacity="0.4"/>
                <path d="M75 55 L130 48" stroke="#f43f5e" strokeWidth="0.6" opacity="0.15"/>
                <path d="M70 68 L135 60" stroke="#f43f5e" strokeWidth="0.6" opacity="0.15"/>
                {/* αC-helix OUT */}
                <path d="M105 75 Q120 68 135 78 Q150 88 158 82" fill="none" stroke="#f43f5e" strokeWidth="3" opacity="0.25" transform="rotate(15, 130, 75)"/>
                <text x="150" y="72" fill="#f43f5e" fontSize="7" fontWeight="600" opacity="0.45">αC-OUT</text>
                {/* C-lobe */}
                <path d="M75 125 L125 120 L175 128 L185 165 L155 180 L95 183 L55 160 Z" fill="url(#inactCLobe)" stroke="#a855f7" strokeWidth="0.7" opacity="0.4"/>
                <path d="M85 130 Q105 125 125 130 Q145 135 160 128" fill="none" stroke="#a855f7" strokeWidth="2.5" opacity="0.2"/>
                {/* Hinge */}
                <path d="M190 105 Q220 130 195 155" fill="none" stroke="#94a3b8" strokeWidth="0.8" opacity="0.2"/>
                {/* DFG-out (Phe flips out) */}
                <circle cx="85" cy="150" r="3" fill="#f43f5e" opacity="0.35"/>
                <text x="55" y="145" fill="#f43f5e" fontSize="7" fontWeight="500" opacity="0.45">Phe→flipped</text>
                {/* ATP pocket collapsed */}
                <ellipse cx="148" cy="105" rx="8" ry="4" fill="#f43f5e" opacity="0.06"/>
                <text x="140" y="118" fill="#f43f5e" fontSize="6" opacity="0.35">Pocket collapsed</text>
                {/* Type II inhibitor binding pocket (open) */}
                <rect x="150" y="140" width="32" height="10" rx="2" fill="#f59e0b" opacity="0.08"/>
                <text x="153" y="153" fill="#f59e0b" fontSize="7" fontWeight="500" opacity="0.55">Type II drug</text>
                {/* Hydrophobic spine */}
                <path d="M60 115 Q80 120 100 115" fill="none" stroke="#f43f5e" strokeWidth="0.4" opacity="0.12" strokeDasharray="1 2"/>
              </svg>
              <ul className="text-slate-400 text-xs space-y-0.5 mt-3">
                <li>• DFG-Phe flips <strong className="text-kinome-rose">outward</strong>, blocking the ATP pocket</li>
                <li>• αC-helix rotated <strong className="text-kinome-rose">outward</strong> (αC-OUT)</li>
                <li>• Catalytic residues misaligned, no ATP binding</li>
                <li>• Exposes hydrophobic pocket for <strong className="text-kinome-amber">Type II inhibitors</strong></li>
              </ul>
            </div>
          </div>
        </Card>

        <Card title="Receptor Tyrosine Kinase Architecture">
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            Receptor tyrosine kinases (RTKs) are <strong className="text-white">single-pass transmembrane proteins</strong> with an
            extracellular ligand-binding domain — the defining architecture for ~58 human RTKs across 20 families.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 flex items-center justify-center">
              <svg viewBox="0 0 220 320" className="w-full max-w-[180px]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="ecdGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.10"/><stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02"/></linearGradient>
                  <linearGradient id="mbGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15"/><stop offset="50%" stopColor="#f59e0b" stopOpacity="0.08"/><stop offset="100%" stopColor="#f59e0b" stopOpacity="0.15"/></linearGradient>
                </defs>
                {/* Ligand (dimer) */}
                <ellipse cx="70" cy="28" rx="16" ry="10" fill="none" stroke="#34d399" strokeWidth="0.6" opacity="0.2"/>
                <ellipse cx="150" cy="28" rx="16" ry="10" fill="none" stroke="#34d399" strokeWidth="0.6" opacity="0.2"/>
                <text x="95" y="18" fill="#34d399" fontSize="6" fontWeight="600" opacity="0.35">Ligand (GF)</text>
                {/* Extracellular Ig-like domains (β-sandwich folds) */}
                <path d="M60 45 Q80 38 100 45 Q115 52 110 62 Q100 70 80 68 Q60 66 55 56 Q52 50 60 45" fill="url(#ecdGrad)" stroke="#38bdf8" strokeWidth="0.6" opacity="0.3"/>
                <path d="M120 45 Q140 38 160 45 Q175 52 170 62 Q160 70 140 68 Q120 66 115 56 Q112 50 120 45" fill="url(#ecdGrad)" stroke="#38bdf8" strokeWidth="0.6" opacity="0.3"/>
                <path d="M68 72 Q85 67 100 74 Q110 80 105 88 Q95 94 80 92 Q65 90 62 80" fill="url(#ecdGrad)" stroke="#38bdf8" strokeWidth="0.5" opacity="0.25"/>
                <path d="M120 72 Q135 67 150 74 Q160 80 155 88 Q145 94 130 92 Q115 90 112 80" fill="url(#ecdGrad)" stroke="#38bdf8" strokeWidth="0.5" opacity="0.25"/>
                <path d="M72 96 Q88 92 102 98 Q112 103 108 110 Q98 115 84 113 Q70 111 68 103" fill="url(#ecdGrad)" stroke="#38bdf8" strokeWidth="0.5" opacity="0.2"/>
                <path d="M118 96 Q132 92 146 98 Q156 103 152 110 Q142 115 128 113 Q114 111 112 103" fill="url(#ecdGrad)" stroke="#38bdf8" strokeWidth="0.5" opacity="0.2"/>
                {/* Disulfide bonds */}
                <line x1="75" y1="55" x2="95" y2="55" stroke="#f59e0b" strokeWidth="0.3" opacity="0.12"/>
                <line x1="125" y1="55" x2="145" y2="55" stroke="#f59e0b" strokeWidth="0.3" opacity="0.12"/>
                <text x="55" y="125" fill="#38bdf8" fontSize="6" fontWeight="500" opacity="0.5">ECD</text>
                {/* Transmembrane helices */}
                <rect x="80" y="128" width="14" height="30" rx="4" fill="#a855f7" opacity="0.2"/>
                <rect x="126" y="128" width="14" height="30" rx="4" fill="#a855f7" opacity="0.2"/>
                <text x="105" y="149" fill="#a855f7" fontSize="6" fontWeight="500" opacity="0.45">TM</text>
                {/* Membrane bilayer */}
                <rect x="20" y="130" width="180" height="2" rx="1" fill="url(#mbGrad)"/>
                <rect x="20" y="155" width="180" height="2" rx="1" fill="url(#mbGrad)"/>
                <text x="175" y="145" fill="#f59e0b" fontSize="5" fontWeight="500" opacity="0.35">Membrane</text>
                {/* Lipid tails */}
                <path d="M40 130 L45 140 L50 130 L55 140 L60 130 L65 140" fill="none" stroke="#f59e0b" strokeWidth="0.3" opacity="0.08"/>
                <path d="M155 130 L160 140 L165 130 L170 140 L175 130 L180 140" fill="none" stroke="#f59e0b" strokeWidth="0.3" opacity="0.08"/>
                {/* Juxtamembrane region */}
                <path d="M82 158 Q87 165 82 172" fill="none" stroke="#a855f7" strokeWidth="0.4" opacity="0.15"/>
                <path d="M138 158 Q133 165 138 172" fill="none" stroke="#a855f7" strokeWidth="0.4" opacity="0.15"/>
                {/* Kinase domains */}
                <path d="M60 178 L95 175 L100 200 L95 225 L75 235 L55 225 L50 200 Z" fill="url(#ecdGrad)" stroke="#a855f7" strokeWidth="0.6" opacity="0.3"/>
                <path d="M125 178 L160 175 L165 200 L160 225 L140 235 L120 225 L115 200 Z" fill="url(#ecdGrad)" stroke="#a855f7" strokeWidth="0.6" opacity="0.3"/>
                {/* Kinase domain sub-lobes */}
                <path d="M65 182 L88 180 L92 195 L88 208" fill="none" stroke="#38bdf8" strokeWidth="0.4" opacity="0.15"/>
                <path d="M125 182 L148 180 L152 195 L148 208" fill="none" stroke="#38bdf8" strokeWidth="0.4" opacity="0.15"/>
                <text x="62" y="220" fill="#a855f7" fontSize="5" fontWeight="500" opacity="0.4">KD</text>
                <text x="148" y="220" fill="#a855f7" fontSize="5" fontWeight="500" opacity="0.4">KD</text>
                {/* Autophosphorylation sites */}
                <circle cx="88" cy="190" r="1.5" fill="#f59e0b" opacity="0.2"/>
                <circle cx="148" cy="190" r="1.5" fill="#f59e0b" opacity="0.2"/>
                {/* C-terminal tail */}
                <path d="M78 235 Q80 248 75 260" fill="none" stroke="#94a3b8" strokeWidth="0.4" opacity="0.1"/>
                <path d="M142 235 Q140 248 145 260" fill="none" stroke="#94a3b8" strokeWidth="0.4" opacity="0.1"/>
                {/* Trans-auto-phosphorylation arrow */}
                <path d="M100 195 Q110 192 115 195" fill="none" stroke="#f59e0b" strokeWidth="0.5" opacity="0.15" markerEnd="url(#arr)"/>
                <text x="80" y="250" fill="#f59e0b" fontSize="5" opacity="0.25">trans-P</text>
              </svg>
            </div>
            <div className="md:col-span-2 space-y-3">
              <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-kinome-cyan opacity-60" /><span className="text-xs font-semibold text-white">Extracellular domain (ECD)</span></div>
                <p className="text-slate-400 text-xs mt-1">Contains immunoglobulin-like (Ig) domains, fibronectin type-III repeats, or cysteine-rich regions depending on the RTK family (EGFR, VEGFR, FGFR, PDGFR, etc.). The ECD binds the growth factor ligand with high specificity (K<sub>d</sub> ~1–100 pM), triggering receptor dimerization. Disulfide bonds stabilize the folded domains.</p>
              </div>
              <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-kinome-violet opacity-60" /><span className="text-xs font-semibold text-white">Transmembrane helix (TM)</span></div>
                <p className="text-slate-400 text-xs mt-1">Single ~25-residue α-helix spanning the lipid bilayer. The TM domain mediates receptor dimerization via helix-helix packing in the membrane. Some RTKs (e.g., EGFR) exist as pre-formed dimers; others (e.g., VEGFR) dimerize only upon ligand binding. A juxtamembrane region connects TM to the kinase domain.</p>
              </div>
              <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-kinome-amber opacity-60" /><span className="text-xs font-semibold text-white">Intracellular kinase domain (KD)</span></div>
                <p className="text-slate-400 text-xs mt-1">The canonical bilobal catalytic domain. Ligand-induced dimerization brings two kinase domains into close proximity, triggering <strong className="text-white">trans-autophosphorylation</strong> on conserved tyrosine residues within the activation loop. Phosphorylation stabilizes the active conformation and creates SH2-domain docking sites for downstream signaling proteins.</p>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Atypical Kinases: The PIKK Fold">
          <p className="text-slate-300 text-sm leading-relaxed mb-4">
            The <strong className="text-white">PIKK family</strong> (ATM, ATR, mTOR, DNA-PKcs, SMG1, TRRAP) are giant kinases
            (~300–470 kDa) that lack the canonical bilobal fold. Instead, they use an <strong className="text-kinome-amber">α-helical solenoid architecture</strong>
            — a right-handed superhelix of HEAT repeats that forms the kinase domain.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/80 border border-white/10 rounded-xl p-4 flex items-center justify-center">
              <svg viewBox="0 0 360 260" className="w-full max-w-md" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="fatGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity="0.08"/><stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02"/></linearGradient>
                  <linearGradient id="pikGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity="0.10"/><stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02"/></linearGradient>
                  <linearGradient id="fatcGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity="0.08"/><stop offset="100%" stopColor="#34d399" stopOpacity="0.02"/></linearGradient>
                </defs>
                {/* HEAT repeat solenoid backbone */}
                <path d="M40 200 Q55 185 75 190 Q95 195 110 185 Q125 175 145 182 Q165 189 180 175 Q195 161 215 172 Q235 183 250 165 Q265 147 285 158 Q305 169 315 148"
                  fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.3"/>
                <path d="M40 193 Q55 178 75 183 Q95 188 110 178 Q125 168 145 175 Q165 182 180 168 Q195 154 215 165 Q235 176 250 158 Q265 140 285 151 Q305 162 315 141"
                  fill="none" stroke="#f59e0b" strokeWidth="0.5" opacity="0.15"/>
                <path d="M40 207 Q55 192 75 197 Q95 202 110 192 Q125 182 145 189 Q165 196 180 182 Q195 168 215 179 Q235 190 250 172 Q265 154 285 165 Q305 176 315 155"
                  fill="none" stroke="#f59e0b" strokeWidth="0.5" opacity="0.15"/>
                {/* Individual HEAT repeat pairs (α-helix hairpins) */}
                <ellipse cx="58" cy="192" rx="14" ry="6" fill="#f59e0b" opacity="0.08" transform="rotate(-8, 58, 192)"/>
                <ellipse cx="95" cy="186" rx="14" ry="6" fill="#f59e0b" opacity="0.08" transform="rotate(-12, 95, 186)"/>
                <ellipse cx="132" cy="185" rx="14" ry="6" fill="#f59e0b" opacity="0.08" transform="rotate(-5, 132, 185)"/>
                <ellipse cx="170" cy="175" rx="14" ry="6" fill="#f59e0b" opacity="0.08" transform="rotate(-15, 170, 175)"/>
                <ellipse cx="210" cy="175" rx="14" ry="6" fill="#f59e0b" opacity="0.08" transform="rotate(5, 210, 175)"/>
                <ellipse cx="250" cy="165" rx="14" ry="6" fill="#f59e0b" opacity="0.08" transform="rotate(-12, 250, 165)"/>
                <ellipse cx="290" cy="162" rx="14" ry="6" fill="#f59e0b" opacity="0.08" transform="rotate(-3, 290, 162)"/>
                {/* FAT domain (N-terminal) */}
                <path d="M40 100 Q65 80 95 90 Q125 100 140 85 Q155 70 170 85 Q185 100 195 90 Q205 80 215 95"
                  fill="url(#fatGrad)" stroke="#38bdf8" strokeWidth="0.6" opacity="0.25"/>
                <path d="M42 93 Q67 73 97 83 Q127 93 142 78 Q157 63 172 78 Q187 93 197 83"
                  fill="none" stroke="#38bdf8" strokeWidth="0.4" opacity="0.15"/>
                {/* FAT α-helices */}
                <rect x="50" y="88" width="24" height="4" rx="2" fill="#38bdf8" opacity="0.12" transform="rotate(-10, 62, 90)"/>
                <rect x="85" y="85" width="24" height="4" rx="2" fill="#38bdf8" opacity="0.12" transform="rotate(5, 97, 87)"/>
                <rect x="125" y="78" width="24" height="4" rx="2" fill="#38bdf8" opacity="0.12" transform="rotate(-8, 137, 80)"/>
                <rect x="165" y="80" width="24" height="4" rx="2" fill="#38bdf8" opacity="0.12" transform="rotate(3, 177, 82)"/>
                {/* FAT * label */}
                <text x="195" y="78" fill="#38bdf8" fontSize="6" fontWeight="500" opacity="0.4">FAT*</text>

                {/* FRB domain (mTOR-specific) */}
                <ellipse cx="180" cy="110" rx="14" ry="6" fill="none" stroke="#a855f7" strokeWidth="0.5" opacity="0.2"/>
                <text x="178" y="113" fill="#a855f7" fontSize="6" fontWeight="500" opacity="0.4">FRB</text>

                {/* PIK kinase domain (central insertion) */}
                <path d="M130 115 Q160 100 195 115 Q220 125 225 150 Q220 175 195 185 Q160 190 130 180 Q110 165 115 140 Z"
                  fill="url(#pikGrad)" stroke="#f59e0b" strokeWidth="0.7" opacity="0.3"/>
                <text x="148" y="150" fill="#f59e0b" fontSize="8" fontWeight="600" opacity="0.5">PIK</text>
                <text x="145" y="160" fill="#f59e0b" fontSize="6" opacity="0.35">domain</text>
                {/* PIK domain helices */}
                <path d="M140 125 Q155 120 170 125" fill="none" stroke="#f59e0b" strokeWidth="1.2" opacity="0.15"/>
                <path d="M145 135 Q160 130 175 135" fill="none" stroke="#f59e0b" strokeWidth="1.2" opacity="0.15"/>
                <path d="M150 145 Q165 140 180 145" fill="none" stroke="#f59e0b" strokeWidth="1.2" opacity="0.15"/>
                <path d="M150 158 Q165 153 180 158" fill="none" stroke="#f59e0b" strokeWidth="1.2" opacity="0.15"/>
                <path d="M145 170 Q160 165 175 170" fill="none" stroke="#f59e0b" strokeWidth="1.2" opacity="0.15"/>

                {/* FATC domain (C-terminal) */}
                <path d="M290 130 Q310 125 325 135 Q335 142 330 152 Q320 158 305 155"
                  fill="url(#fatcGrad)" stroke="#34d399" strokeWidth="0.6" opacity="0.25"/>
                <text x="310" y="145" fill="#34d399" fontSize="7" fontWeight="500" opacity="0.45">FATC</text>

                {/* FAT-FATC proximity */}
                <path d="M215 95 Q260 105 290 130" fill="none" stroke="#38bdf8" strokeWidth="0.3" opacity="0.12" strokeDasharray="2 3"/>
                <text x="240" y="108" fill="#94a3b8" fontSize="5" opacity="0.2">FAT-FATC clamp</text>

                {/* HEAT label */}
                <text x="55" y="225" fill="#f59e0b" fontSize="7" fontWeight="500" opacity="0.4">HEAT repeat solenoid</text>

                {/* Domain labels with leader lines */}
                <line x1="90" y1="90" x2="60" y2="60" stroke="#38bdf8" strokeWidth="0.3" opacity="0.15"/>
                <text x="20" y="58" fill="#38bdf8" fontSize="7" fontWeight="600" opacity="0.5">FAT</text>

                <line x1="310" y1="140" x2="340" y2="165" stroke="#34d399" strokeWidth="0.3" opacity="0.15"/>
                <text x="330" y="170" fill="#34d399" fontSize="7" fontWeight="600" opacity="0.5">FATC</text>
              </svg>
            </div>
            <div className="space-y-3">
              <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-kinome-amber opacity-60" /><span className="text-xs font-semibold text-white">PIK domain</span></div>
                <p className="text-slate-400 text-xs mt-1">The phosphoinositide 3-kinase-related domain. Despite the name, PIKKs are serine/threonine protein kinases. The PIK domain (~200 residues) is inserted into the FAT domain and uses a distinct α-helical fold built from HEAT repeats — completely different from the bilobal architecture of typical kinases.</p>
              </div>
              <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-kinome-cyan opacity-60" /><span className="text-xs font-semibold text-white">FAT / FATC domains</span></div>
                <p className="text-slate-400 text-xs mt-1">FRAP-ATM-TRRAP (FAT) domain at the N-terminus and FATC at the C-terminus. These flank the PIK domain and form a structural clamp essential for stability and regulation. The FAT domain (~500 residues) itself forms an α-helical solenoid.</p>
              </div>
              <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-kinome-violet opacity-60" /><span className="text-xs font-semibold text-white">Notable members</span></div>
                <p className="text-slate-400 text-xs mt-1"><strong className="text-white">mTOR</strong> (289 kDa) — central regulator of cell growth; targeted by rapamycin/everolimus. <strong className="text-white">ATM</strong> (351 kDa) — primary double-strand break DNA damage sensor. <strong className="text-white">ATR</strong> (301 kDa) — replication stress response kinase. <strong className="text-white">DNA-PKcs</strong> (469 kDa) — non-homologous end-joining repair.</p>
              </div>
            </div>
          </div>
        </Card>
      </Section>

      {/* Biology */}
      <Section title="Kinase Biology Essentials" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}>
        <Card title="Signaling Cascades">
          <p className="text-slate-300 text-sm leading-relaxed">
            Kinases operate in hierarchical <strong className="text-white">signaling cascades</strong> where one kinase phosphorylates and activates another,
            creating signal amplification and integration:
          </p>
          <Math>
            {"Receptor → RAS-GTP → RAF (MAP3K) → MEK (MAP2K) → ERK (MAPK)\n\nSignal amplification: each step activates ~10 molecules\n5-step cascade: 1 receptor → ~10,000 downstream effectors"}
          </Math>
        </Card>

        <Card title="ATP Binding & Catalysis">
          <p className="text-slate-300 text-sm leading-relaxed">
            The conserved catalytic mechanism:
          </p>
          <Math>
            {"Substrate + ATP → [E·S·ATP] → E + ADP + Phosphoprotein\n\nΔG°' ≈ −30.5 kJ/mol (ATP hydrolysis)\nKm(ATP) ≈ 10–100 μM (varies by kinase)\nkcat ≈ 1–100 s⁻¹"}
          </Math>
          <p className="text-slate-300 text-sm leading-relaxed mt-2">
            The glycine-rich loop (GxGxxG) binds the β/γ-phosphate of ATP. The conserved lysine (in subdomain I) and
            aspartate (in subdomain III) coordinate Mg²⁺ ions essential for catalysis. The activation loop
            (T-loop) must be phosphorylated for full activity in most kinases.
          </p>
        </Card>

        <Card title="Disease Relevance">
          <p className="text-slate-300 text-sm leading-relaxed">
            Kinase dysregulation drives disease through multiple mechanisms:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {[
              { mechanism: "Activating mutations", example: "BRAF V600E (melanoma), EGFR L858R (NSCLC)", icon: "↑" },
              { mechanism: "Gene amplification", example: "HER2 (breast), MET (gastric), FGFR2 (cholangiocarcinoma)", icon: "×" },
              { mechanism: "Fusion proteins", example: "BCR-ABL (CML), EML4-ALK (NSCLC), FGFR3-TACC3 (glioblastoma)", icon: "→" },
              { mechanism: "Loss of tumor suppressors", example: "PTEN loss → AKT hyperactivation, LKB1 loss → AMPK silence", icon: "−" },
            ].map((m) => (
              <div key={m.mechanism} className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-kinome-rose/15 text-kinome-rose text-xs flex items-center justify-center font-bold">{m.icon}</span>
                  <span className="text-white font-semibold text-sm">{m.mechanism}</span>
                </div>
                <p className="text-slate-400 text-xs mt-1">{m.example}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Druggable Kinome">
          <p className="text-slate-300 text-sm leading-relaxed">
            ~65 of the 518 kinases are currently &quot;druggable&quot; by small molecules. The ATP-binding site is highly conserved,
            making selectivity the central challenge in kinase drug design. Most approved inhibitors are:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
              <span className="text-kinome-cyan font-semibold text-sm">Type I inhibitors</span>
              <p className="text-slate-400 text-xs mt-1">Bind the active (DFG-in) conformation. Examples: Imatinib, Gefitinib, Vemurafenib.</p>
            </div>
            <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
              <span className="text-kinome-violet font-semibold text-sm">Type II inhibitors</span>
              <p className="text-slate-400 text-xs mt-1">Bind the inactive (DFG-out) conformation. Examples: Sorafenib, Sunitinib, Nilotinib.</p>
            </div>
            <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
              <span className="text-kinome-emerald font-semibold text-sm">Type III inhibitors</span>
              <p className="text-slate-400 text-xs mt-1">Allosteric, bind near but not in the ATP site. Examples: Trametinib (MEK), Ulixertinib (ERK).</p>
            </div>
            <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3">
              <span className="text-kinome-amber font-semibold text-sm">Type IV / PROTACs</span>
              <p className="text-slate-400 text-xs mt-1">Covalent inhibitors or degraders. Examples: Ibrutinib (BTK), ARV-110 (AR degrader).</p>
            </div>
          </div>
        </Card>
      </Section>

      {/* Tissue Distribution */}
      <Section title="Tissue Expression Patterns" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}>
        <Card>
          <p className="text-slate-300 text-sm leading-relaxed">
            Kinases show highly tissue-specific expression patterns. Our database captures expression across
            <strong className="text-white"> 30+ tissue types</strong> using curated data from GTEx and published studies.
            Key patterns:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            {[
              { tissue: "Brain", kinases: "LRRK2, CAMK2, BDNF-TrkB, FYN", note: "Highest kinase density of any tissue" },
              { tissue: "Liver", kinases: "INSR, GSK3β, AMPK, MARK", note: "Metabolic kinase enrichment" },
              { tissue: "Immune", kinases: "JAK1-3, SYK, BTK, ITK, LCK", note: "Cytokine receptor signaling hub" },
            ].map((t) => (
              <div key={t.tissue} className="bg-slate-900/60 border border-white/10 rounded-xl p-4">
                <h4 className="text-white font-semibold text-sm">{t.tissue}</h4>
                <p className="text-kinome-cyan text-xs mt-1">{t.kinases}</p>
                <p className="text-slate-500 text-xs mt-1">{t.note}</p>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      {/* Glossary */}
      <Section title="Glossary" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { term: "Phosphorylation", def: "Covalent addition of a phosphate group (PO₄³⁻) to a serine, threonine, or tyrosine residue." },
            { term: "Kinome", def: "The complete set of protein kinases encoded by a genome." },
            { term: "Catalytic domain", def: "The ~250-residue conserved region responsible for phosphotransferase activity." },
            { term: "Activation loop", def: "A flexible loop (T-loop) between β9 and αF that must be phosphorylated for full catalytic activity." },
            { term: "DFG motif", def: "Asp-Phe-Gly at the start of the activation loop. DFG-in = active; DFG-out = inactive conformation." },
            { term: "Pseudokinase", def: "A kinase-like domain that lacks one or more catalytic residues. ~20% of the kinome." },
            { term: "RTK", def: "Receptor tyrosine kinase — single-pass transmembrane receptor with intrinsic kinase activity." },
            { term: "MAPK cascade", def: "A 3-tiered signaling module: MAP3K → MAP2K → MAPK, e.g., RAF→MEK→ERK." },
            { term: "PDIS", def: "Pharmaceutical Development Interest Score — composite metric of a kinase's drug development potential." },
            { term: "PDB", def: "Protein Data Bank — repository of experimentally determined 3D structures (X-ray, cryo-EM, NMR)." },
            { term: "ChEMBL", def: "Open database of bioactive molecules with drug-like properties and their targets." },
            { term: "UniProt", def: "Universal Protein Resource — comprehensive protein sequence and functional annotation database." },
            { term: "GTEx", def: "Genotype-Tissue Expression project — tissue-specific gene expression data across 54 human tissues." },
            { term: "ClinVar", def: "NCBI database of human genetic variations and their clinical significance." },
            { term: "DISEASE (UniProt)", def: "Curated disease annotations in UniProt comments, linking genes to OMIM IDs and disease descriptions." },
            { term: "ATP", def: "Adenosine triphosphate — the phosphoryl group donor in kinase reactions." },
            { term: "Allosteric", def: "Regulation at a site distant from the active site, inducing conformational change." },
            { term: "PROTAC", def: "Proteolysis-targeting chimeras — bifunctional molecules that recruit E3 ligases to degrade target proteins." },
          ].map((g) => (
            <div key={g.term} className="bg-slate-900/60 border border-white/10 rounded-xl p-4">
              <h4 className="text-kinome-cyan font-semibold text-sm">{g.term}</h4>
              <p className="text-slate-400 text-sm mt-1">{g.def}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* References */}
      <Section title="Key References" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}>
        <Card>
          <div className="space-y-3">
            {[
              "Manning G, Whyte DB, Martinez R, Hunter T, Sudarsanam S. The protein kinase complement of the human genome. Science. 2002;298:1912-1934.",
              "Roskoski R Jr. A historical overview of protein kinases and their targeted drug inhibitors. Pharmacol Res. 2015;100:1-31.",
              "Cohen P. Protein kinases — the major drug targets of the twenty-first century? Nat Rev Drug Discov. 2002;1:309-315.",
              "Blair JA, et al. Structure-guided development of kinase inhibitors. Nat Rev Drug Discov. 2024;23:1-22.",
              "Fabbro D, et al. Protein kinases as target for anticancer drug discovery. Expert Opin Drug Discov. 2024;19:1-19.",
              "Ferguson FM, et al. The kinome at the crossroads of oncology and drug discovery. Nat Rev Cancer. 2024;24:1-21.",
            ].map((ref, i) => (
              <div key={i} className="flex items-start gap-3 bg-slate-900/60 border border-white/10 rounded-lg px-4 py-3">
                <span className="w-6 h-6 rounded bg-kinome-violet/15 text-kinome-violet text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-slate-300 text-sm">{ref}</p>
              </div>
            ))}
          </div>
        </Card>
      </Section>
    </div>
  );
}

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("About");

  return (
    <div className="min-h-screen bg-kinome-deep pt-24 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-10 border-b border-white/10 pb-4">
          {tabs.map((tab) => (
            <TabButton key={tab} label={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)} />
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "About" && <AboutTab />}
            {activeTab === "Technical" && <TechnicalTab />}
            {activeTab === "Encyclopedia" && <EncyclopediaTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
