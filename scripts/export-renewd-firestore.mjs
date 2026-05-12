#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getAdminFirestore, readInstanceCollections } from "./lib/firestore-admin.mjs";

const COLLECTIONS = [
  "imports",
  "patients",
  "patientAliases",
  "careTasks",
  "contactAttempts",
  "visits",
  "bodyCompositions",
  "reports",
  "messages",
  "sourceRecords",
  "dataQualityIssues"
];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const instanceId = args.instance || process.env.RENEWD_INSTANCE_ID || "clinic-main";
  const rootCollection = args.root || process.env.RENEWD_ROOT_COLLECTION || "_instances";
  const databaseId = args.database || process.env.RENEWD_FIRESTORE_DATABASE_ID || "renewd-clinic";
  const outPath = args.out || `backup/renewd-${instanceId}-${new Date().toISOString().slice(0, 10)}.ndjson`;

  const db = await getAdminFirestore({
    projectId: args.project,
    databaseId,
    serviceAccount: args["service-account"]
  });
  const docs = await readInstanceCollections(db, { rootCollection, instanceId }, COLLECTIONS);
  await mkdir(path.dirname(path.resolve(outPath)), { recursive: true });
  await writeFile(outPath, docs.map((doc) => JSON.stringify(doc)).join("\n") + "\n", "utf8");

  process.stdout.write(JSON.stringify({
    out: outPath,
    databaseId,
    rootCollection,
    instanceId,
    collections: COLLECTIONS,
    documentCount: docs.length
  }, null, 2) + "\n");
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
