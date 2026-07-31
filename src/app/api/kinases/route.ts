import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { resolveOrganGenes } from "@/lib/kinase-utils";
import {
  escapeRegExp,
  isKinaseGroup,
  isSafeSort,
  parseFiniteNumber,
} from "@/lib/api-validation";

export const dynamic = "force-dynamic";

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

    const search = (searchParams.get("search") || "").trim();
    const group = (searchParams.get("group") || "").trim();
    const organ_system = (searchParams.get("organ_system") || "").trim();
    const minPDIS = parseFiniteNumber(searchParams.get("minPDIS"), 0);
    const maxPDIS = parseFiniteNumber(searchParams.get("maxPDIS"), 1);
    const parsedPage = parseFiniteNumber(searchParams.get("page"), 1);
    const parsedLimit = parseFiniteNumber(searchParams.get("limit"), 20);
    const sort = searchParams.get("sort") || "gene_symbol";

    if (
      search.length > 100 || organ_system.length > 50 || !isKinaseGroup(group) ||
      minPDIS === null || maxPDIS === null || minPDIS < 0 || maxPDIS > 1 || minPDIS > maxPDIS ||
      parsedPage === null || parsedLimit === null || !Number.isInteger(parsedPage) ||
      !Number.isInteger(parsedLimit) || parsedPage < 1 || parsedLimit < 1 || !isSafeSort(sort)
    ) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }

    const page = parsedPage;
    const limit = Math.min(100, parsedLimit);
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
      const escapedSearch = escapeRegExp(search);
      matchStage.$or = [
        { gene_symbol: { $regex: escapedSearch, $options: "i" } },
        { full_name: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (group) {
      matchStage.group = group;
    }

    // Gene-level filters (organ system, PDIS range) are resolved to gene
    // lists up-front so the total count and pagination only cover matches.
    const geneConditions: Record<string, unknown>[] = [];

    if (organ_system) {
      const organGenes = await resolveOrganGenes(db, organ_system);
      if (organGenes.length === 0) {
        // No kinases match this organ system — return empty
        return NextResponse.json({ kinases: [], total: 0, page, totalPages: 0 });
      }
      geneConditions.push({ gene_symbol: { $in: organGenes } });
    }

    if (minPDIS > 0 || maxPDIS < 1) {
      // pdis collection stores scores on a 0-100 scale; resolve matching genes
      // BEFORE pagination so totals and pages reflect only in-range kinases.
      const minTotal = Math.round(minPDIS * 100);
      const maxTotal = Math.round(maxPDIS * 100);
      const pdisDocs = await db.collection("pdis")
        .find({ pdis_total: { $gte: minTotal, $lte: maxTotal } })
        .toArray();
      const pdisGenes = new Set((pdisDocs.map((p) => p.gene_symbol)).filter(Boolean) as string[]);
      if (minPDIS === 0) {
        // Kinases without a PDIS record score 0 and fall inside [0, maxPDIS].
        const allGenes = await db.collection("kinases").distinct("gene_symbol");
        for (const g of allGenes) {
          if (g && !pdisGenes.has(g)) pdisGenes.add(g);
        }
      }
      if (pdisGenes.size === 0) {
        return NextResponse.json({ kinases: [], total: 0, page, totalPages: 0 });
      }
      geneConditions.push({ gene_symbol: { $in: Array.from(pdisGenes) } });
    }

    if (geneConditions.length > 0) {
      matchStage.$and = geneConditions;
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
        { $match: { gene_symbol: { $in: geneSymbols } } },
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

    const totalPages = Math.ceil(total / limit);

    const response = { kinases: enriched, total, page, totalPages };
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
