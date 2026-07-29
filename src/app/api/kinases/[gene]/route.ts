import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { deriveGroup, parseMutationCode } from "@/lib/kinase-utils";

const chemblIdCache = new Map<string, string>();

async function resolveChemblId(uniprotId: string): Promise<string | null> {
  if (!uniprotId) return null;
  const cached = chemblIdCache.get(uniprotId);
  if (cached !== undefined) return cached;
  try {
    const url = `https://www.ebi.ac.uk/chembl/api/data/target?target_components__accession=${uniprotId}&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    const target = data?.targets?.[0];
    const chemblId = target?.target_chembl_id || null;
    chemblIdCache.set(uniprotId, chemblId ?? "");
    return chemblId;
  } catch {
    chemblIdCache.set(uniprotId, "");
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { gene: string } }
) {
  try {
    const { gene } = params;

    if (!gene) {
      return NextResponse.json(
        { error: "Gene symbol is required" },
        { status: 400 }
      );
    }

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db!;

    const geneRegex = `^${gene.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;

    // First fetch the kinase doc to get uniprot_id for ChEMBL lookup
    const kinaseDoc = await db.collection("kinases").findOne({
      gene_symbol: { $regex: geneRegex, $options: "i" },
    });

    if (!kinaseDoc) {
      return NextResponse.json(
        { error: `Kinase "${gene}" not found` },
        { status: 404 }
      );
    }

    // Resolve ChEMBL target ID from UniProt
    const chemblId = await resolveChemblId(kinaseDoc.uniprot_id);

    // Fetch remaining data in parallel
    const [pdisDoc, structures, bioactivities, expression, variants, diseasesDoc] = await Promise.all([
      db.collection("pdis").findOne({
        gene_symbol: { $regex: geneRegex, $options: "i" },
      }),
      db.collection("structures").find({
        gene_symbols: { $regex: geneRegex, $options: "i" },
      }).limit(20).toArray().catch(() => []),
      db.collection("bioactivities").find({
        $or: [
          { target_chembl_id: chemblId || "__NONE__" },
          { target_gene_symbol: { $regex: geneRegex, $options: "i" } },
        ],
      }).sort({ source: -1, standard_value: 1 }).limit(200).toArray().catch(() => []),
      db.collection("expression").find({
        gene_symbol: { $regex: geneRegex, $options: "i" },
      }).toArray().catch(() => []),
      db.collection("variants").find({
        gene_symbol: { $regex: geneRegex, $options: "i" },
      }).toArray().catch(() => []),
      db.collection("diseases").findOne({
        gene_symbol: { $regex: geneRegex, $options: "i" },
      }).catch(() => null),
    ]);

    // Build the unified kinase profile
    const kinase = {
      gene_symbol: kinaseDoc.gene_symbol,
      name: kinaseDoc.full_name || "Unknown",
      alias: "",
      organism: "Human",
      uniprot_id: kinaseDoc.uniprot_id,
      pdb_id: structures.length > 0 ? structures[0].pdb_id : "",
      group: kinaseDoc.group || deriveGroup(kinaseDoc.keywords || []),
      subfamily: kinaseDoc.subfamily || "",
      family: "",
      classification: {
        group: kinaseDoc.group || deriveGroup(kinaseDoc.keywords || []),
        subfamily: kinaseDoc.subfamily || "",
        family: "",
      },
      pdis_score: {
        overall_score: (pdisDoc?.pdis_total || 0) / 100,
        citation_component: pdisDoc?.components?.citation || 0,
        clinical_component: pdisDoc?.components?.clinical_trials || 0,
        structure_component: pdisDoc?.components?.structure || 0,
        patent_component: pdisDoc?.components?.patent_proxy || 0,
        fda_approval_status: pdisDoc?.components?.fda_approved ? "FDA Approved" : "Not FDA Approved",
      },
      pathways: [],
      tissue_expressions: expression.map((e) => ({
        tissue_name: e.tissue_site,
        tpm_value: e.median_tpm,
        organ_system: e.organ_system,
        tau_specificity: e.tau,
        protein_abundance: e.median_tpm > 80 ? "High" : e.median_tpm > 40 ? "Medium" : "Low",
        data_source: e.source || "curated",
      })),
      mutations: variants.map((v) => ({
        mutation_code: v.mutation_code,
        position: (() => {
          const p = v.position;
          if (p && p > 0) return p;
          const mc = v.mutation_code;
          if (typeof mc === "string") {
            return parseMutationCode(mc).position;
          }
          return 0;
        })(),
        pathogenicity: v.pathogenicity === "Pathogenic" ? "pathogenic" : v.pathogenicity === "Uncertain Significance" ? "variant_of_uncertain_significance" : v.pathogenicity.toLowerCase().replace(/\s+/g, "_"),
        associated_diseases: v.drug_resistance_context ? [v.drug_resistance_context] : [],
        drug_resistance_effects: v.drug_resistance_context ? [{
          drug_name: v.drug_resistance_context,
          fold_resistance: 0,
          mechanism: v.is_gatekeeper ? "gatekeeper" : "resistance",
        }] : [],
        organ_systems_affected: [],
        wildtype_aa: v.wildtype_aa,
        mutant_aa: v.mutant_aa,
        is_gatekeeper: v.is_gatekeeper,
        source_title: v.source_title,
        pubmed_id: v.pubmed_id,
      })),
      ligand_assays: bioactivities.map((b) => {
        let valueNm = typeof b.standard_value === "number" ? b.standard_value : parseFloat(b.standard_value) || 0;
        const units = (b.standard_units || "").toLowerCase();
        if (units.includes("nm")) { /* already nM */ }
        else if (units.includes("um") || units.includes("µm")) valueNm *= 1000;
        else if (units.includes("mm")) valueNm *= 1_000_000;
        else if (units.includes("pm") || units.includes("nmol")) valueNm /= 1000;
        const isPubChem = b.source === "pubchem";
        return {
          ligand_name: b.compound_name || (isPubChem ? `PubChem CID ${b.pubchem_cid}` : b.compound_id || "Unknown"),
          chembl_id: b.compound_id,
          pubchem_cid: b.pubchem_cid || null,
          binding_type: b.binding_type || b.assay_type || "",
          assay_type: b.assay_type || "",
          value_nm: valueNm,
          relation: b.standard_relation || "=",
          target_conformation: "",
          source: b.source || "chembl",
          reference: {
            pubmed_id: b.pubmed_ids?.length ? (Array.isArray(b.pubmed_ids) ? b.pubmed_ids[0] : b.pubmed_ids) : "",
            doi: b.doi || "",
            journal: b.document_journal || "",
            year: b.document_year || null,
          },
        };
      }),
      key_references: await buildReferences(gene, variants, bioactivities, structures),
      organ_systems_impacted: Array.from(new Set(expression.map((e) => e.organ_system).filter(Boolean))),
      diseases_associated: (diseasesDoc?.diseases || []).map((d: { disease_id: string; description: string; omim_id: string }) => ({
        name: d.disease_id,
        description: d.description,
        omim_id: d.omim_id,
      })),
      structures: structures.map((s) => ({
        pdb_id: s.pdb_id,
        title: s.title,
        resolution: s.resolution,
        experimental_method: s.experimental_method,
        bound_ligands: s.bound_ligands,
      })),
      domains: kinaseDoc.domain_boundaries || [],
      protein_sequence: kinaseDoc.protein_sequence || "",
      seq_length: kinaseDoc.seq_length || 0,
      ec_number: kinaseDoc.ec_number || "",
      keywords: kinaseDoc.keywords || [],
    };

    return NextResponse.json(kinase);
  } catch (error) {
    console.error(`GET /api/kinases/${params.gene} error:`, error);
    return NextResponse.json(
      { error: "Failed to fetch kinase profile" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildReferences(
  gene: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variants: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bioactivities: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  structures: any[]
): Promise<Array<{ pubmed_id: string; citation_text: string; doi?: string; relevance_tag: string }>> {
  const refs: Array<{ pubmed_id: string; citation_text: string; doi?: string; relevance_tag: string }> = [];
  const seen = new Set<string>();

  // 1. Collect pubmed_ids from variants
  for (const v of variants) {
    if (v.pubmed_id && !seen.has(String(v.pubmed_id))) {
      seen.add(String(v.pubmed_id));
      refs.push({
        pubmed_id: String(v.pubmed_id),
        citation_text: v.source_title || `Variant study for ${gene}`,
        relevance_tag: "variant",
      });
    }
  }

  // 2. Collect pubmed_ids from bioactivities
  for (const b of bioactivities) {
    const pid = b.pubmed_ids || b.pubmed_id;
    if (pid && !seen.has(String(pid))) {
      seen.add(String(pid));
      refs.push({
        pubmed_id: String(pid),
        citation_text: `Bioactivity assay`,
        relevance_tag: "bioactivity",
      });
    }
  }

  // 3. Collect from structures (RCSB links)
  for (const s of structures) {
    if (s.pdb_id && !seen.has(`pdb:${s.pdb_id}`)) {
      seen.add(`pdb:${s.pdb_id}`);
      refs.push({
        pubmed_id: "",
        citation_text: `PDB: ${s.pdb_id}${s.title ? " — " + s.title : ""}`,
        relevance_tag: "structure",
      });
    }
  }

  // 4. Fetch top PubMed results for this gene
  try {
    const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmax=10&sort=relevance&term=${encodeURIComponent(gene + " kinase")}&retmode=json`;
    const searchResp = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
    const searchData = await searchResp.json();
    const ids: string[] = searchData?.esearchresult?.idlist || [];

    if (ids.length > 0) {
      const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`;
      const fetchResp = await fetch(fetchUrl, { signal: AbortSignal.timeout(5000) });
      const fetchData = await fetchResp.json();

      for (const id of ids) {
        const doc = fetchData?.result?.[id];
        if (doc && !seen.has(id)) {
          seen.add(id);
          const authors = doc.authors?.slice(0, 3).map((a: Record<string, string>) => a.name).join(", ") || "";
          const year = doc.pubdate?.slice(0, 4) || "";
          refs.push({
            pubmed_id: id,
            citation_text: `${authors}${authors ? " " : ""}(${year}) ${doc.title || ""}`.trim(),
            doi: doc.articleids?.find((a: Record<string, string>) => a.idtype === "doi")?.value,
            relevance_tag: "review",
          });
        }
      }
    }
  } catch {
    // PubMed query failed — continue with what we have
  }

  return refs;
}
