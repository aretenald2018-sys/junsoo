#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { getAdminFirestore, writeDocuments } from "./lib/firestore-admin.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inPath = args.in;
  if (!inPath) throw new Error("--in <backup.ndjson> 경로가 필요합니다.");

  const instanceId = args.instance || process.env.RENEWD_INSTANCE_ID || "clinic-main";
  const rootCollection = args.root || process.env.RENEWD_ROOT_COLLECTION || "_instances";
  const databaseId = args.database || process.env.RENEWD_FIRESTORE_DATABASE_ID || "renewd-clinic";
  const dryRun = Boolean(args["dry-run"] || args.dryRun);

  const text = await readFile(inPath, "utf8");
  const docs = text.split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));

  const summary = docs.reduce((acc, doc) => {
    acc[doc.collectionName] = (acc[doc.collectionName] || 0) + 1;
    return acc;
  }, {});

  process.stdout.write(JSON.stringify({
    mode: dryRun ? "dry-run" : "write",
    in: inPath,
    databaseId,
    rootCollection,
    instanceId,
    summary,
    totalFirestoreDocuments: docs.length
  }, null, 2) + "\n");

  if (dryRun) return;
  if (!args.yes) throw new Error("실제 Firestore 쓰기는 --yes 플래그가 필요합니다.");

  const db = await getAdminFirestore({
    projectId: args.project,
    databaseId,
    serviceAccount: args["service-account"]
  });
  const written = await writeDocuments(db, { rootCollection, instanceId }, docs);
  process.stdout.write(JSON.stringify({ written }, null, 2) + "\n");
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

main().catch((error) => {
  process.stderr.write(`${error?.message || error}\n`);
  process.exit(1);
});
