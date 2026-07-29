import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { parseQuery } from "@/lib/query-parser";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "A 'query' string is required" }, { status: 400 });
    }

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db!;

    const filters = parseQuery(query);

    // Build match stage
    const matchStage: Record<string, unknown> = {};
    if (filters.groups.length === 1) {
      matchStage.group = filters.groups[0];
    } else if (filters.groups.length > 1) {
      matchStage.group = { $in: filters.groups };
    }

    // Free-text search on gene_symbol and full_name
    const textMatch: Record<string, unknown> = {};
    if (filters.freeText.length > 0) {
      const tokenConditions = filters.freeText.map((tok) => {
        const escaped = tok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return {
          $or: [
            { gene_symbol: { $regex: escaped, $options: "i" } },
            { full_name: { $regex: escaped, $options: "i" } },
          ],
        };
      });
      textMatch.$and = tokenConditions;
    }

    const finalMatch = { ...matchStage, ...textMatch };

    // 1. Text-based kinase search
    const kinasePromises: Promise<{ gene_symbol: string; full_name: string; group: string }[]>[] = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db.collection("kinases").find(finalMatch).limit(200).toArray() as Promise<any[]>,
    ];

    // 2. Disease-based search — query disease collection and find matching kinases
    if (filters.diseases.length > 0) {
      const diseaseRegex = filters.diseases.map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      kinasePromises.push(
        db.collection("diseases")
          .find({ "diseases.description": { $regex: diseaseRegex, $options: "i" } })
          .project({ gene_symbol: 1 })
          .limit(200)
          .toArray()
          .then((docs) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const genes = Array.from(new Set(docs.map((d: any) => d.gene_symbol).filter(Boolean))) as string[];
            if (!genes.length) return [];
            return db.collection("kinases")
              .find({ gene_symbol: { $in: genes } })
              .limit(200)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .toArray() as Promise<any[]>;
          })
          .catch(() => [])
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kinaseResults: any[][] = await Promise.all(kinasePromises) as any[][];
    const seen = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniqueKinases: any[] = [];
    for (const k of kinaseResults.flat()) {
      const g = k.gene_symbol;
      if (g && !seen.has(g)) {
        seen.add(g);
        uniqueKinases.push(k);
      }
    }

    // Get PDIS scores
    const geneSymbols = uniqueKinases.map((k) => k.gene_symbol).filter(Boolean);
    const [pdisDocs, varCounts, diseaseDocs, expDocs] = await Promise.all([
      db.collection("pdis").find({ gene_symbol: { $in: geneSymbols } }).toArray(),
      db.collection("variants").aggregate([
        { $match: { gene_symbol: { $in: geneSymbols } } },
        { $group: { _id: "$gene_symbol", count: { $sum: 1 } } },
      ]).toArray().catch(() => []),
      db.collection("diseases").find({ gene_symbol: { $in: geneSymbols } }).toArray().catch(() => []),
      db.collection("expression").aggregate([
        { $match: { gene_symbol: { $in: geneSymbols } } },
        { $group: { _id: "$gene_symbol", systems: { $addToSet: "$organ_system" } } },
      ]).toArray().catch(() => []),
    ]);

    const pdisMap = new Map(pdisDocs.map((p) => [p.gene_symbol, (p.pdis_total || 0) / 100]));
    const varCountMap = new Map(varCounts.map((v) => [v._id, v.count]));
    const diseaseMap = new Map(diseaseDocs.map((d) => [d.gene_symbol, (d.diseases || []).map((dis: { disease_id: string }) => dis.disease_id)]));
    const expMap = new Map(expDocs.map((e) => [e._id, e.systems]));

    let enriched = uniqueKinases.map((k) => ({
      gene_symbol: k.gene_symbol,
      name: k.full_name || "Unknown",
      group: k.group || "Atypical",
      subfamily: k.subfamily || "",
      pdis_score: pdisMap.get(k.gene_symbol) || 0,
      ligand_count: 0,
      mutation_count: varCountMap.get(k.gene_symbol) || 0,
      disease_count: (diseaseMap.get(k.gene_symbol) || []).length,
      organ_systems_impacted: (expMap.get(k.gene_symbol) || []),
      fda_approval_status: false,
    }));

    // Apply PDIS filter
    if (filters.minPdis !== null) {
      enriched = enriched.filter((k) => k.pdis_score >= filters.minPdis!);
    }
    if (filters.maxPdis !== null) {
      enriched = enriched.filter((k) => k.pdis_score <= filters.maxPdis!);
    }

    // Sort: disease matches first, then exact gene match, then by PDIS descending
    const lowerQuery = query.toLowerCase().trim();
    const diseaseGeneSet = new Set<string>();
    if (filters.diseases.length > 0) {
      const diseaseRegex = filters.diseases.map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const diseaseGenes: any[] = await db.collection("diseases")
        .find({ "diseases.description": { $regex: diseaseRegex, $options: "i" } })
        .project({ gene_symbol: 1 })
        .toArray()
        .catch(() => []);
      for (let i = 0; i < diseaseGenes.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((diseaseGenes as any[])[i].gene_symbol) diseaseGeneSet.add((diseaseGenes as any[])[i].gene_symbol);
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enriched.sort((a: any, b: any) => {
      const aDisease = diseaseGeneSet.has(a.gene_symbol) ? 1 : 0;
      const bDisease = diseaseGeneSet.has(b.gene_symbol) ? 1 : 0;
      if (aDisease !== bDisease) return bDisease - aDisease;

      const aGene = String(a.gene_symbol).toLowerCase();
      const bGene = String(b.gene_symbol).toLowerCase();
      const aName = String(a.name).toLowerCase();
      const bName = String(b.name).toLowerCase();

      const aExact = aGene === lowerQuery ? 2 : aName === lowerQuery ? 1 : 0;
      const bExact = bGene === lowerQuery ? 2 : bName === lowerQuery ? 1 : 0;

      if (aExact !== bExact) return bExact - aExact;

      return b.pdis_score - a.pdis_score;
    });

    enriched = enriched.slice(0, 50);

    return NextResponse.json({
      results: enriched,
      parsedFilters: filters,
      totalMatches: enriched.length,
    });
  } catch (error) {
    console.error("POST /api/ai-search error:", error);
    return NextResponse.json({ error: "AI search failed" }, { status: 500 });
  }
}
