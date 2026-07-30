import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") || "";
    const group = searchParams.get("group") || "";
    const organ_system = searchParams.get("organ_system") || "";
    const minPDIS = parseFloat(searchParams.get("minPDIS") || "0");
    const maxPDIS = parseFloat(searchParams.get("maxPDIS") || "1");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const sort = searchParams.get("sort") || "gene_symbol";
    const sortDir = sort.startsWith("-") ? -1 : 1;
    const sortField = sort.replace(/^-/, "");

    const cacheKey = JSON.stringify({ search, group, organ_system, minPDIS, maxPDIS, page, limit, sort });
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db!;

    const matchStage: Record<string, unknown> = {};

    if (search) {
      matchStage.$or = [
        { gene_symbol: { $regex: search, $options: "i" } },
        { full_name: { $regex: search, $options: "i" } },
      ];
    }

    if (group) {
      matchStage.group = group;
    }

    // Resolve organ system filter from expression collection
    let organGenes: string[] | null = null;
    if (organ_system) {
      // Map common aliases to database values
      const organAliases: Record<string, string> = {
        nervous: "CNS", brain: "CNS", neuronal: "CNS", neural: "CNS",
        skin: "Skin", dermal: "Skin", integumentary: "Skin",
        hematopoietic: "Other", blood: "Other", haemato: "Other",
      };
      const resolvedOrgan = organAliases[organ_system.toLowerCase()] || organ_system;
      const expDocs = await db.collection("expression").distinct("gene_symbol", {
        organ_system: { $regex: resolvedOrgan, $options: "i" },
      });
      organGenes = (expDocs || []).filter(Boolean) as string[];
      if (organGenes.length > 0) {
        matchStage.gene_symbol = { $in: organGenes };
      } else {
        // No kinases match this organ system — return empty
        return NextResponse.json({ kinases: [], total: 0, page, totalPages: 0 });
      }
    }

    // First get total count from kinases collection
    const total = await db.collection("kinases").countDocuments(matchStage);

    // Get kinases with pagination
    const sortDoc: Record<string, 1 | -1> = { [sortField]: sortDir as 1 | -1 };
    const kinases = await db
      .collection("kinases")
      .find(matchStage)
      .sort(sortDoc)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const geneSymbols = kinases.map((k) => k.gene_symbol).filter(Boolean);

    // Parallel fetch related data
    const [pdisDocs, varCounts, expDocs, diseaseDocs] = await Promise.all([
      db.collection("pdis").find({ gene_symbol: { $in: geneSymbols } }).toArray(),
      db.collection("variants").aggregate([
        { $group: { _id: "$gene_symbol", count: { $sum: 1 } } },
      ]).toArray().catch(() => []),
      db.collection("expression").aggregate([
        { $match: { gene_symbol: { $in: geneSymbols } } },
        { $group: { _id: "$gene_symbol", systems: { $addToSet: "$organ_system" } } },
      ]).toArray().catch(() => []),
      db.collection("diseases").find({ gene_symbol: { $in: geneSymbols } }).toArray().catch(() => []),
    ]);

    // Build lookup maps
    const pdisMap = new Map(pdisDocs.map((p) => [p.gene_symbol, (p.pdis_total || 0) / 100]));
    const varCountMap = new Map(varCounts.map((v) => [v._id, v.count]));
    const expMap = new Map(expDocs.map((e) => [e._id, e.systems]));
    const diseaseMap = new Map(diseaseDocs.map((d) => [d.gene_symbol, (d.diseases || []).map((dis: { disease_id: string; description: string; omim_id: string }) => dis.disease_id)]));

    // Enrich kinases
    const enriched = kinases.map((k) => {
      const gene = k.gene_symbol;
      return {
        gene_symbol: gene,
        name: k.full_name || "Unknown",
        group: k.group || deriveGroup(k.keywords || []),
        subfamily: k.subfamily || "",
        organism: "Human",
        uniprot_id: k.uniprot_id,
        pdis_score: pdisMap.get(gene) || 0,
        organ_systems_impacted: (expMap.get(gene) || []),
        diseases_associated: diseaseMap.get(gene) || [],
        mutation_count: varCountMap.get(gene) || 0,
      };
    });

    // Apply PDIS filter post-enrichment if needed
    let filtered = enriched;
    if (minPDIS > 0 || maxPDIS < 1) {
      filtered = enriched.filter((k) => k.pdis_score >= minPDIS && k.pdis_score <= maxPDIS);
    }

    const totalPages = Math.ceil(total / limit);

    const response = { kinases: filtered, total, page, totalPages };
    if (total > 0) {
      setCache(cacheKey, response);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/kinases error:", error);
    return NextResponse.json(
      { error: "Failed to fetch kinases" },
      { status: 500 }
    );
  }
}

function deriveGroup(keywords: string[]): string {
  const kw = keywords.map((k) => k.toLowerCase());
  if (kw.some((k) => k.includes("tyrosine-protein kinase"))) return "TK";
  if (kw.some((k) => k.includes("serine/threonine-protein kinase"))) return "CMGC";
  if (kw.some((k) => k.includes("kinase"))) return "Atypical";
  return "Atypical";
}
