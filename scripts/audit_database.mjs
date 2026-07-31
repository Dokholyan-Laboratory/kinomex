#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kinomex";
const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg?.slice("--output=".length);

const syntheticQueries = {
  bioactivities: { $or: [{ source: "dev_seed" }, { assay_chembl_id: /^CHEMBL_DEV_/ }] },
  diseases: { "diseases.disease_accession": /^DEV:/ },
  expression: { source: { $in: ["dev_seed", "basal", "curated"] } },
  pdis: { source: "dev_seed" },
  structures: { $or: [{ source: "dev_seed" }, { pdb_id: /^8DEV/ }] },
  variants: { source: { $in: ["dev_seed", "curated"] } },
};

function visitNumbers(value, prefix, stats) {
  if (typeof value === "number") {
    const item = stats[prefix] ?? { count: 0, finite: 0, nonFinite: 0, min: null, max: null };
    item.count += 1;
    if (Number.isFinite(value)) {
      item.finite += 1;
      item.min = item.min === null ? value : Math.min(item.min, value);
      item.max = item.max === null ? value : Math.max(item.max, value);
    } else {
      item.nonFinite += 1;
    }
    stats[prefix] = item;
    return;
  }
  if (Array.isArray(value)) {
    for (const entry of value) visitNumbers(entry, `${prefix}[]`, stats);
    return;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    for (const [key, entry] of Object.entries(value)) {
      if (key === "_id") continue;
      visitNumbers(entry, prefix ? `${prefix}.${key}` : key, stats);
    }
  }
}

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  const collections = (await db.listCollections().toArray())
    .map((entry) => entry.name)
    .filter((name) => !name.startsWith("system."))
    .sort();

  const report = {
    generatedAt: new Date().toISOString(),
    database: db.databaseName,
    policy: "Numeric ranges are descriptive; only provenance/pattern evidence marks records synthetic.",
    collections: {},
    totals: { documents: 0, syntheticDocuments: 0, nonFiniteNumbers: 0 },
  };

  for (const name of collections) {
    const collection = db.collection(name);
    const documents = await collection.find({}).toArray();
    const numericFields = {};
    for (const document of documents) visitNumbers(document, "", numericFields);
    const sources = await collection.aggregate([
      { $group: { _id: { $ifNull: ["$source", "<missing>"] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();
    const syntheticCount = syntheticQueries[name]
      ? await collection.countDocuments(syntheticQueries[name])
      : 0;
    const nonFiniteNumbers = Object.values(numericFields)
      .reduce((sum, item) => sum + item.nonFinite, 0);

    report.collections[name] = {
      documents: documents.length,
      syntheticDocuments: syntheticCount,
      sources: sources.map((item) => ({ source: item._id, count: item.count })),
      numericFields,
      nonFiniteNumbers,
    };
    report.totals.documents += documents.length;
    report.totals.syntheticDocuments += syntheticCount;
    report.totals.nonFiniteNumbers += nonFiniteNumbers;
  }

  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (outputPath) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, json, "utf8");
  }
  process.stdout.write(json);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
