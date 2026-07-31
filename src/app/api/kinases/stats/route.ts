import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
  try {
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db!;

    const [totalKinases, groupDist, pdisAgg, totalVariants, totalStructures, totalDiseases, totalBioactivities, topMutated, topDruggable] = await Promise.all([
      db.collection("kinases").countDocuments(),
      db.collection("kinases").aggregate([
        { $group: { _id: "$group", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray().catch(() => []),
      db.collection("pdis").aggregate([
        { $group: { _id: null, avg: { $avg: "$pdis_total" } } },
      ]).toArray().catch(() => []),
      db.collection("variants").countDocuments().catch(() => 0),
      db.collection("structures").countDocuments().catch(() => 0),
      db.collection("diseases").countDocuments().catch(() => 0),
      db.collection("bioactivities").countDocuments().catch(() => 0),
      db.collection("variants").aggregate([
        { $group: { _id: "$gene_symbol", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]).toArray().catch(() => []),
      db.collection("pdis").find().sort({ pdis_total: -1 }).limit(10).toArray().catch(() => []),
    ]);

    const groupDistribution: Record<string, number> = {
      AGC: 0, CAMK: 0, CK1: 0, CMGC: 0, STE: 0, TK: 0, TKL: 0, Atypical: 0,
    };
    for (const g of groupDist) {
      if (g._id && groupDistribution.hasOwnProperty(g._id)) {
        groupDistribution[g._id] = g.count;
      }
    }

    const averagePDIS = Number.isFinite(pdisAgg[0]?.avg) ? pdisAgg[0].avg / 100 : null;

    // Resolve group for top druggable kinases
    const druggableGenes = topDruggable.map((d) => d.gene_symbol).filter(Boolean);
    const druggableKinaseDocs = await db.collection("kinases").find({ gene_symbol: { $in: druggableGenes } }).toArray().catch(() => []);
    const druggableGroupMap = new Map(druggableKinaseDocs.map((k) => [k.gene_symbol, k.group || "Atypical"]));

    const response = {
      totalKinases,
      groupDistribution,
      averagePDIS: averagePDIS === null ? null : Math.round(averagePDIS * 1000) / 1000,
      totalLigands: totalBioactivities,
      totalVariants,
      totalStructures,
      totalDiseases,
      topMutatedKinases: topMutated.map((m) => ({
        gene_symbol: m._id,
        name: m._id,
        mutation_count: m.count,
        pdis_score: null,
      })),
      topDruggableKinases: topDruggable.map((d) => ({
        gene_symbol: d.gene_symbol,
        name: d.gene_symbol,
        pdis_score: d.pdis_total / 100,
        group: druggableGroupMap.get(d.gene_symbol) || "Atypical",
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/kinases/stats error:", error);
    return NextResponse.json(
      { error: "Failed to compute kinome statistics" },
      { status: 500 }
    );
  }
}
