export async function getAdminFirestore(options = {}) {
  const { initializeApp, getApps, cert, applicationDefault } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  const projectId = options.projectId || process.env.RENEWD_FIRESTORE_PROJECT_ID || process.env.GCLOUD_PROJECT || undefined;
  const serviceAccountPath = options.serviceAccount || process.env.GOOGLE_APPLICATION_CREDENTIALS || "";

  if (!getApps().length) {
    if (serviceAccountPath) {
      const { readFile } = await import("node:fs/promises");
      const account = JSON.parse(await readFile(serviceAccountPath, "utf8"));
      initializeApp({ credential: cert(account), projectId: projectId || account.project_id });
    } else {
      initializeApp({ credential: applicationDefault(), projectId });
    }
  }

  const databaseId = options.databaseId || process.env.RENEWD_FIRESTORE_DATABASE_ID || "renewd-clinic";
  return databaseId && databaseId !== "(default)" ? getFirestore(databaseId) : getFirestore();
}

export function instanceCollection(db, rootCollection, instanceId, collectionName) {
  return db.collection(rootCollection).doc(instanceId).collection(collectionName);
}

export async function writeDocuments(db, options, docs) {
  const rootCollection = options.rootCollection || "_instances";
  const instanceId = options.instanceId || "clinic-main";
  const chunkSize = 400;
  let written = 0;

  for (let i = 0; i < docs.length; i += chunkSize) {
    const batch = db.batch();
    for (const item of docs.slice(i, i + chunkSize)) {
      const ref = instanceCollection(db, rootCollection, instanceId, item.collectionName).doc(item.id);
      batch.set(ref, item.data, { merge: true });
      written += 1;
    }
    await batch.commit();
  }

  return written;
}

export async function readInstanceCollections(db, options, collectionNames) {
  const rootCollection = options.rootCollection || "_instances";
  const instanceId = options.instanceId || "clinic-main";
  const out = [];
  for (const collectionName of collectionNames) {
    const snap = await instanceCollection(db, rootCollection, instanceId, collectionName).get();
    for (const doc of snap.docs) {
      out.push({ collectionName, id: doc.id, data: doc.data() });
    }
  }
  return out;
}
