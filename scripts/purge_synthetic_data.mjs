#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { EJSON } from "bson";
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kinomex";
const apply = process.argv.includes("--apply");
const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
const backupRoot = path.resolve("data-audit", "backups", stamp);

const targets = {
  bioactivities: { $or: [{ source: "dev_seed" }, { assay_chembl_id: /^CHEMBL_DEV_/ }] },
  diseases: { "diseases.disease_accession": /^DEV:/ },
  expression: { source: { $in: ["dev_seed", "basal", "curated"] } },
  pdis: { source: "dev_seed" },
  structures: { $or: [{ source: "dev_seed" }, { pdb_id: /^8DEV/ }] },
  variants: { source: { $in: ["dev_seed", "curated"] } },
};

async function main() {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
  const db = mongoose.connection.db;
  const plan = {};
  for (const [name, query] of Object.entries(targets)) {
    plan[name] = await db.collection(name).countDocuments(query);
  }

  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", wouldDelete: plan }, null, 2));
    console.log("Re-run with --apply to back up and delete these records.");
    await mongoose.disconnect();
    return;
  }

  await fs.mkdir(backupRoot, { recursive: true });
  const deleted = {};
  for (const [name, query] of Object.entries(targets)) {
    const collection = db.collection(name);
    const documents = await collection.find(query).toArray();
    const payload = documents.map((document) => EJSON.stringify(document)).join("\n") + (documents.length ? "\n" : "");
    await fs.writeFile(path.join(backupRoot, `${name}.ndjson.gz`), gzipSync(payload));
    const result = await collection.deleteMany(query);
    deleted[name] = result.deletedCount;
    if (result.deletedCount !== documents.length) {
      throw new Error(`${name}: backed up ${documents.length} but deleted ${result.deletedCount}`);
    }
  }
  const manifest = {
    createdAt: new Date().toISOString(),
    database: db.databaseName,
    backupFormat: "gzip-compressed newline-delimited MongoDB Extended JSON",
    deleted,
  };
  await fs.writeFile(path.join(backupRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(JSON.stringify({ mode: "applied", backupRoot, deleted }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
