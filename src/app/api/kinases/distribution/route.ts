import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { resolveOrganGenes } from "@/lib/kinase-utils";
import { escapeRegExp, isKinaseGroup } from "@/lib/api-validation";

export const dynamic = "force-dynamic";

const NUM_BUCKETS = 20;
const BUCKET_WIDTH = 100 / NUM_BUCKETS;

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

    if (search.length > 100 || organ_system.length > 50 || !isKinaseGroup(group)) {
      return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
    }

    const cacheKey = JSON.stringify({ search, group, organ_system });
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
    if (organ_system) {
      const organGenes = await resolveOrganGenes(db, organ_system);
      matchStage.gene_symbol = { $in: organGenes };
    }

    const kinaseDocs = await db
      .collection("kinases")
      .find(matchStage, { projection: { gene_symbol: 1 } })
      .toArray();
    const genes = kinaseDocs.map((k) => k.gene_symbol).filter(Boolean) as string[];

    const buckets = Array.from({ length: NUM_BUCKETS }, (_, i) => ({
      min: i * BUCKET_WIDTH,
      max: (i + 1) * BUCKET_WIDTH,
      count: 0,
    }));

    if (genes.length > 0) {
      const pdisDocs = await db.collection("pdis")
        .find({ gene_symbol: { $in: genes } })
        .toArray();
      const scoreMap = new Map<string, number>();
      for (const p of pdisDocs) {
        if (p.gene_symbol && typeof p.pdis_total === "number") {
          scoreMap.set(p.gene_symbol, p.pdis_total);
        }
      }
      for (const gene of genes) {
        const score = scoreMap.get(gene) ?? 0;
        const idx = Math.min(NUM_BUCKETS - 1, Math.max(0, Math.floor(score / BUCKET_WIDTH)));
        buckets[idx].count += 1;
      }
    }

    const response = { buckets, total: genes.length };
    setCache(cacheKey, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/kinases/distribution error:", error);
    return NextResponse.json(
      { error: "Failed to compute PDIS distribution" },
      { status: 500 }
    );
  }
}
