import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const TASK_KEYWORDS = [
  ["refund", /환불|취소/],
  ["issue", /문제|주의|확인필요/],
  ["missed_call", /부재중/],
  ["happy_call", /해피콜/],
  ["progress_check", /경과|잘\s*먹|잘먹|확인/],
  ["prescription", /처방|재처방|비대면/],
  ["appointment", /예약|내원/],
  ["contact", /연락|전화|문자|카톡|채널/]
];

const PHASE_KEYWORDS = [
  ["detox", /해독/],
  ["main_medicine", /본약/],
  ["sopher", /소퍼/],
  ["remote_prescription", /비대면/],
  ["retention", /해피콜|경과|연락|전화|문자|카톡/]
];

const CHANNEL_KEYWORDS = [
  ["sms", /문자/],
  ["kakao", /카톡|카카오|채널/],
  ["phone", /전화|부재중/]
];

export async function buildExportBlockBundle(sourceDir, options = {}) {
  const root = path.resolve(sourceDir);
  const files = await listFiles(root);
  const csvFiles = files.filter((file) => file.toLowerCase().endsWith(".csv"));
  const mdFiles = files.filter((file) => file.toLowerCase().endsWith(".md"));
  const now = new Date().toISOString();
  const instanceId = options.instanceId || "clinic-main";
  const importHash = hashText(JSON.stringify({
    rootName: path.basename(root),
    fileCount: files.length,
    csvCount: csvFiles.length,
    mdCount: mdFiles.length
  })).slice(0, 16);
  const importBatchId = options.importBatchId || `imp_${compactDate(now)}_${importHash}`;

  const csvRows = await readCanonicalCsvRows(csvFiles);
  const markdownPages = await readMarkdownPages(mdFiles);
  const markdownByTitle = groupBy(markdownPages, (page) => page.normalizedTitle);

  const sourceRecords = [];
  const careTasks = [];
  const patientAliases = new Map();
  const dataQualityIssues = [];

  for (const row of csvRows) {
    const rowTitle = String(row.data["이름"] || "").trim();
    const normalizedTitle = normalizeTitle(rowTitle);
    const matchedMarkdown = normalizedTitle ? markdownByTitle.get(normalizedTitle) || [] : [];
    const sourceRecordId = `src_csv_${row.hash.slice(0, 24)}`;
    const sourceRecord = {
      id: sourceRecordId,
      schemaVersion: 1,
      instanceId,
      importBatchId,
      sourceType: "notion_csv_row",
      sourceHash: row.hash,
      csvFileIndexes: row.csvFileIndexes,
      rowIndexes: row.rowIndexes,
      raw: row.data,
      matchedMarkdownIds: matchedMarkdown.map((page) => page.id),
      createdAt: now,
      updatedAt: now
    };
    sourceRecords.push(sourceRecord);

    const taskId = `task_${row.hash.slice(0, 24)}`;
    const textForClassify = [
      rowTitle,
      row.data["명료화"],
      row.data["행동목록"],
      row.data["메모"],
      row.data["하일라이트"]
    ].filter(Boolean).join(" ");
    const status = parseDone(row.data["DONE"]) ? "done" : "open";
    const dueDate = normalizeDate(row.data["날짜"]);
    const task = {
      id: taskId,
      schemaVersion: 1,
      instanceId,
      importBatchId,
      sourceRecordId,
      patientId: null,
      patientMatchStatus: rowTitle ? "needs_review" : "unmatched",
      title: rowTitle || "(untitled task)",
      summary: valueOrNull(row.data["명료화"]),
      memo: valueOrNull(row.data["메모"]),
      checklist: splitChecklist(row.data["행동목록"]),
      owner: valueOrNull(row.data["가이드"]),
      dueDate,
      dueDateDisplay: valueOrNull(row.data["날짜DP"]),
      dueStateOriginal: valueOrNull(row.data["D-day"]),
      createdAt: normalizeDateTime(row.data["생성일시"]) || now,
      completedAt: status === "done" ? now : null,
      updatedAt: now,
      status,
      priority: inferPriority(row.data["하일라이트"], textForClassify),
      category: inferCategory(textForClassify),
      channel: inferChannel(textForClassify),
      phase: inferPhase(textForClassify),
      outcome: inferOutcome(textForClassify),
      rawLabel: rowTitle || null,
      dataQualityFlags: buildTaskQualityFlags(row, matchedMarkdown)
    };
    careTasks.push(task);

    if (rowTitle) {
      const aliasId = `alias_${hashText(normalizedTitle || rowTitle).slice(0, 24)}`;
      const current = patientAliases.get(aliasId) || {
        id: aliasId,
        schemaVersion: 1,
        instanceId,
        importBatchId,
        rawLabel: rowTitle,
        normalizedKey: normalizedTitle,
        patientId: null,
        matchStatus: "needs_review",
        sourceRecordIds: [],
        taskIds: [],
        createdAt: now,
        updatedAt: now
      };
      current.sourceRecordIds.push(sourceRecordId);
      current.taskIds.push(taskId);
      current.updatedAt = now;
      patientAliases.set(aliasId, current);
    }

    for (const flag of task.dataQualityFlags) {
      dataQualityIssues.push({
        id: `dq_${taskId}_${flag}`,
        schemaVersion: 1,
        instanceId,
        importBatchId,
        sourceRecordId,
        taskId,
        type: flag,
        status: "open",
        createdAt: now,
        updatedAt: now
      });
    }
  }

  for (const page of markdownPages) {
    sourceRecords.push({
      id: page.id,
      schemaVersion: 1,
      instanceId,
      importBatchId,
      sourceType: "notion_markdown_page",
      sourceHash: page.hash,
      pageId: page.pageId,
      title: page.title,
      normalizedTitle: page.normalizedTitle,
      properties: page.properties,
      body: page.body,
      raw: page.raw,
      createdAt: now,
      updatedAt: now
    });
  }

  const rawCsvRows = csvRows.reduce((sum, row) => sum + row.rowIndexes.length, 0);
  const importDoc = {
    id: importBatchId,
    schemaVersion: 1,
    instanceId,
    sourceKind: "notion_exportblock",
    sourceRootName: path.basename(root),
    status: options.dryRun ? "dry_run" : "ready",
    counts: {
      files: files.length,
      csvFiles: csvFiles.length,
      markdownFiles: mdFiles.length,
      rawCsvRows,
      canonicalCsvRows: csvRows.length,
      duplicateCsvRowsCollapsed: Math.max(0, rawCsvRows - csvRows.length),
      careTasks: careTasks.length,
      sourceRecords: sourceRecords.length,
      patientAliases: patientAliases.size,
      dataQualityIssues: dataQualityIssues.length
    },
    createdAt: now,
    updatedAt: now
  };

  return {
    importBatchId,
    instanceId,
    summary: importDoc.counts,
    collections: {
      imports: [importDoc],
      sourceRecords,
      careTasks,
      patientAliases: Array.from(patientAliases.values()),
      dataQualityIssues
    }
  };
}

export function flattenBundle(bundle) {
  return Object.entries(bundle.collections).flatMap(([collectionName, docs]) =>
    docs.map((doc) => ({ collectionName, id: doc.id, data: doc }))
  );
}

async function listFiles(root) {
  const out = [];
  async function walk(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      if (entry.isFile()) out.push(full);
    }
  }
  await walk(root);
  return out;
}

async function readCanonicalCsvRows(csvFiles) {
  const seen = new Map();
  for (let fileIndex = 0; fileIndex < csvFiles.length; fileIndex += 1) {
    const text = await readFile(csvFiles[fileIndex], "utf8");
    const rows = parseCsv(text);
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const data = rows[rowIndex];
      const hash = hashText(stableStringify(data));
      const existing = seen.get(hash);
      if (existing) {
        existing.csvFileIndexes.push(fileIndex);
        existing.rowIndexes.push(rowIndex);
      } else {
        seen.set(hash, { hash, data, csvFileIndexes: [fileIndex], rowIndexes: [rowIndex] });
      }
    }
  }
  return Array.from(seen.values());
}

async function readMarkdownPages(mdFiles) {
  const pages = [];
  for (const file of mdFiles) {
    const raw = await readFile(file, "utf8");
    const pageId = extractPageId(file);
    const title = extractMarkdownTitle(file, raw);
    const properties = extractMarkdownProperties(raw);
    const body = extractMarkdownBody(raw);
    const hash = hashText(raw);
    pages.push({
      id: `src_md_${(pageId || hash).slice(0, 24)}`,
      pageId,
      title,
      normalizedTitle: normalizeTitle(title),
      properties,
      body,
      raw,
      hash
    });
  }
  return pages;
}

function parseCsv(text) {
  const clean = text.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i];
    const next = clean[i + 1];
    if (ch === '"') {
      if (inQuotes && next === '"') {
        value += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(value);
      value = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      value = "";
      continue;
    }
    value += ch;
  }
  row.push(value);
  if (row.some((cell) => cell !== "")) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = (cells[index] || "").trim();
    });
    return obj;
  });
}

function extractPageId(file) {
  const match = path.basename(file).match(/([0-9a-f]{32})(?:\s*\(\d+\))?\.md$/i);
  return match ? match[1].toLowerCase() : null;
}

function extractMarkdownTitle(file, raw) {
  const heading = raw.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  return path.basename(file).replace(/\s+[0-9a-f]{32}(?:\s*\(\d+\))?\.md$/i, "").trim();
}

function extractMarkdownProperties(raw) {
  const properties = {};
  for (const line of raw.split(/\r?\n/).slice(0, 80)) {
    const match = line.match(/^\s*([^:\n]{1,40})\s*:\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    if (/^\d+$/.test(key)) continue;
    properties[key] = match[2].trim();
  }
  return properties;
}

function extractMarkdownBody(raw) {
  const lines = raw.split(/\r?\n/);
  const bodyLines = [];
  let inPropertyBlock = true;
  for (const line of lines) {
    if (line.startsWith("# ")) continue;
    const isProp = /^\s*[^:\n]{1,40}\s*:\s*/.test(line);
    if (inPropertyBlock && (isProp || !line.trim())) continue;
    inPropertyBlock = false;
    bodyLines.push(line);
  }
  return bodyLines.join("\n").trim();
}

function parseDone(value) {
  return /^(yes|true|1|done|완료)$/i.test(String(value || "").trim());
}

function normalizeDate(value) {
  const text = String(value || "").trim();
  const match = text.match(/(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (!match) return null;
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function normalizeDateTime(value) {
  const text = String(value || "").trim();
  const date = normalizeDate(text);
  if (!date) return null;
  return date;
}

function splitChecklist(value) {
  const text = String(value || "").trim();
  if (!text) return [];
  return text.split(/\r?\n|;|ㆍ|•/).map((item) => item.trim()).filter(Boolean);
}

function inferPriority(highlight, text) {
  const joined = `${highlight || ""} ${text || ""}`;
  if (/문제|주의|환불|확인필요|VIP/i.test(joined)) return "high";
  if (String(highlight || "").trim()) return "medium";
  return "normal";
}

function inferCategory(text) {
  return firstKeyword(TASK_KEYWORDS, text) || "general_followup";
}

function inferChannel(text) {
  return firstKeyword(CHANNEL_KEYWORDS, text) || "unknown";
}

function inferPhase(text) {
  return firstKeyword(PHASE_KEYWORDS, text) || "unknown";
}

function inferOutcome(text) {
  if (/부재중/.test(text)) return "missed";
  if (/보냄|완료|연락함|응대중/.test(text)) return "contacted";
  if (/환불/.test(text)) return "refund_requested";
  return "unknown";
}

function firstKeyword(pairs, text) {
  for (const [value, regex] of pairs) {
    if (regex.test(text || "")) return value;
  }
  return null;
}

function buildTaskQualityFlags(row, matchedMarkdown) {
  const flags = [];
  if (!row.data["이름"]) flags.push("missing_label");
  if (!normalizeDate(row.data["날짜"])) flags.push("missing_due_date");
  if (matchedMarkdown.length === 0) flags.push("markdown_unmatched");
  if (matchedMarkdown.length > 1) flags.push("multiple_markdown_matches");
  if (/[,/&·+]/.test(String(row.data["이름"] || ""))) flags.push("possible_multi_patient");
  return flags;
}

function normalizeTitle(title) {
  return String(title || "")
    .replace(/\s+[0-9a-f]{32}(?:\s*\(\d+\))?$/i, "")
    .replace(/\(\d+\)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function valueOrNull(value) {
  const text = String(value || "").trim();
  return text || null;
}

function groupBy(items, getKey) {
  const map = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
}

function hashText(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function compactDate(iso) {
  return iso.replace(/[-:T.Z]/g, "").slice(0, 14);
}
