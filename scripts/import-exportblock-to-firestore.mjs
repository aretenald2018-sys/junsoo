#!/usr/bin/env node
import { buildExportBlockBundle, flattenBundle } from "./lib/exportblock-parser.mjs";
import { getAdminFirestore, writeDocuments } from "./lib/firestore-admin.mjs";
import { writeDocumentsViaRest } from "./lib/firestore-rest.mjs";

const DEFAULT_SOURCE = "C:\\Users\\USER\\Documents\\ExportBlock-55f789b2-74b8-426c-9cd0-264ee03f0d4e-Part-1";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const source = args.source || process.env.RENEWD_EXPORTBLOCK_SOURCE || DEFAULT_SOURCE;
  const instanceId = args.instance || process.env.RENEWD_INSTANCE_ID || "clinic-main";
  const rootCollection = args.root || process.env.RENEWD_ROOT_COLLECTION || "_instances";
  const databaseId = args.database || args.target || process.env.RENEWD_FIRESTORE_DATABASE_ID || "renewd-clinic";
  const dryRun = Boolean(args["dry-run"] || args.dryRun);

  const bundle = await buildExportBlockBundle(source, { instanceId, dryRun });
  const docs = flattenBundle(bundle);

  printSafeSummary({
    mode: dryRun ? "dry-run" : "write",
    source: "<redacted>",
    projectId: args.project || process.env.RENEWD_FIRESTORE_PROJECT_ID || "<adc/default>",
    databaseId,
    rootCollection,
    instanceId,
    importBatchId: bundle.importBatchId,
    summary: bundle.summary,
    totalFirestoreDocuments: docs.length
  });

  if (dryRun) return;
  if (!args.yes) {
    throw new Error("실제 Firestore 쓰기는 --yes 플래그가 필요합니다. 먼저 --dry-run으로 검증하세요.");
  }

  const useAdmin = Boolean(args["service-account"] || process.env.GOOGLE_APPLICATION_CREDENTIALS);
  const written = useAdmin
    ? await writeDocuments(await getAdminFirestore({
        projectId: args.project || "exercise-management",
        databaseId,
        serviceAccount: args["service-account"]
      }), { rootCollection, instanceId }, docs)
    : await writeDocumentsViaRest({ projectId: args.project || "exercise-management", databaseId, rootCollection, instanceId }, docs);
  printSafeSummary({ written, importBatchId: bundle.importBatchId });
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      out[key] = true;
    } else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

function printSafeSummary(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error?.message || error}\n`);
  process.exit(1);
});
