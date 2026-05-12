import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);

export async function getFirebaseCliAccessToken() {
  const auth = require(firebaseToolsAuthPath());
  const account = auth.getGlobalDefaultAccount();
  const refreshToken = account?.tokens?.refresh_token;
  if (!refreshToken) {
    throw new Error("Firebase CLI 로그인 토큰을 찾지 못했습니다. firebase.cmd login 후 다시 실행하세요.");
  }
  const token = await auth.getAccessToken(refreshToken, []);
  if (!token?.access_token) throw new Error("Firebase CLI access token 발급에 실패했습니다.");
  return token.access_token;
}

export async function writeDocumentsViaRest(options, docs) {
  const projectId = options.projectId || "exercise-management";
  const databaseId = options.databaseId || "renewd-clinic";
  const rootCollection = options.rootCollection || "_instances";
  const instanceId = options.instanceId || "clinic-main";
  const accessToken = await getFirebaseCliAccessToken();
  const baseName = `projects/${projectId}/databases/${databaseId}/documents`;
  const endpoint = `https://firestore.googleapis.com/v1/${baseName}:commit`;
  let written = 0;

  for (let i = 0; i < docs.length; i += 400) {
    const writes = docs.slice(i, i + 400).map((item) => ({
      update: {
        name: `${baseName}/${rootCollection}/${encodeURIComponent(instanceId)}/${item.collectionName}/${encodeURIComponent(item.id)}`,
        fields: toFirestoreFields({ ...item.data, instanceId })
      }
    }));
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ writes })
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Firestore REST commit 실패: HTTP ${response.status} ${body.slice(0, 500)}`);
    }
    written += writes.length;
  }
  return written;
}

function toFirestoreFields(value) {
  const fields = {};
  for (const [key, item] of Object.entries(value || {})) {
    if (item === undefined) continue;
    fields[key] = toFirestoreValue(item);
  }
  return fields;
}

function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (value && typeof value === "object") return { mapValue: { fields: toFirestoreFields(value) } };
  return { stringValue: String(value) };
}

function firebaseToolsAuthPath() {
  const appData = process.env.APPDATA;
  if (!appData) throw new Error("APPDATA 경로를 찾지 못해 Firebase CLI 토큰을 읽을 수 없습니다.");
  return path.join(appData, "npm", "node_modules", "firebase-tools", "lib", "auth.js");
}
