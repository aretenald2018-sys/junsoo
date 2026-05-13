#!/usr/bin/env node

const LOAD_ENDPOINT = "https://asia-northeast3-exercise-management.cloudfunctions.net/renewdLoadClinicData";
const SAVE_ENDPOINT = "https://asia-northeast3-exercise-management.cloudfunctions.net/renewdSaveClinicData";

const ACTION_TEMPLATES = [
  {
    id: "tpl_happy_call_7d",
    name: "1주 뒤 해피콜",
    category: "happy_call",
    channel: "phone",
    offsetDays: 7,
    defaultTime: "10:00",
    description: "신규 등록 후 복약/식이 적응 확인",
    active: true
  },
  {
    id: "tpl_progress_42d",
    name: "6주 뒤 경과 확인",
    category: "progress_check",
    channel: "sms",
    offsetDays: 42,
    defaultTime: "10:00",
    description: "초기 감량 추이와 재방문 필요 여부 확인",
    active: true
  },
  {
    id: "tpl_progress_70d",
    name: "10주 뒤 경과 확인",
    category: "progress_check",
    channel: "sms",
    offsetDays: 70,
    defaultTime: "10:00",
    description: "중기 정체기/처방 연장 여부 확인",
    active: true
  },
  {
    id: "tpl_contact",
    name: "연락",
    category: "contact",
    channel: "phone",
    offsetDays: 0,
    defaultTime: "10:00",
    description: "일반 연락 예정",
    active: true
  },
  {
    id: "tpl_missed_call",
    name: "부재중 재연락",
    category: "missed_call",
    channel: "phone",
    offsetDays: 0,
    defaultTime: "10:00",
    description: "부재중 이후 재연락",
    active: true
  },
  {
    id: "tpl_prescription_end",
    name: "처방 종료 안내",
    category: "prescription",
    channel: "sms",
    offsetDays: 21,
    defaultTime: "10:00",
    description: "처방 종료 전후 복약 반응 확인",
    active: true
  },
  {
    id: "tpl_appointment",
    name: "예약/내원 확인",
    category: "appointment",
    channel: "sms",
    offsetDays: 0,
    defaultTime: "10:00",
    description: "예약 또는 내원 확인",
    active: true
  },
  {
    id: "tpl_issue",
    name: "주의 이슈 확인",
    category: "issue",
    channel: "phone",
    offsetDays: 0,
    defaultTime: "10:00",
    description: "환불, 민원, 특이 이슈 확인",
    active: true
  },
  {
    id: "tpl_general_followup",
    name: "팔로업",
    category: "general_followup",
    channel: "sms",
    offsetDays: 0,
    defaultTime: "10:00",
    description: "일반 팔로업",
    active: true
  }
];

const MUTABLE_COLLECTIONS = [
  "patients",
  "visits",
  "bodyCompositions",
  "reports",
  "payments",
  "photos",
  "appointments",
  "messages",
  "careTasks",
  "actionTemplates"
];

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const loginId = args.login || process.env.RENEWD_LOGIN_ID;
  const password = args.password || process.env.RENEWD_LOGIN_PASSWORD;
  if (!loginId || !password) {
    throw new Error("RENEWD_LOGIN_ID / RENEWD_LOGIN_PASSWORD 또는 --login / --password가 필요합니다.");
  }

  const loaded = await postJson(LOAD_ENDPOINT, { loginId, password });
  const collections = loaded.collections || {};
  const patients = collections.patients || [];
  const patientMap = new Map(patients.map((patient) => [patient.id, patient]));
  const existingTemplates = new Map((collections.actionTemplates || []).map((template) => [template.id, template]));
  const actionTemplates = ACTION_TEMPLATES.map((template) => ({
    ...template,
    ...(existingTemplates.get(template.id) || {}),
    createdAt: existingTemplates.get(template.id)?.createdAt || "2026-05-13"
  }));

  const careTasks = (collections.careTasks || []).map((task) => normalizeCareTask(task, patientMap));
  const summary = {
    patients: patients.length,
    careTasksBefore: (collections.careTasks || []).length,
    careTasksAfter: careTasks.length,
    actionTemplates: actionTemplates.length,
    done: careTasks.filter((task) => task.status === "done").length,
    open: careTasks.filter((task) => task.status !== "done").length
  };

  process.stdout.write(JSON.stringify({
    mode: args.yes ? "write" : "dry-run",
    countsBefore: loaded.counts,
    summary
  }, null, 2) + "\n");

  if (!args.yes) return;

  const saveCollections = {};
  MUTABLE_COLLECTIONS.forEach((name) => {
    saveCollections[name] = collections[name] || [];
  });
  saveCollections.careTasks = careTasks;
  saveCollections.actionTemplates = actionTemplates;

  const saved = await postJson(SAVE_ENDPOINT, {
    sessionToken: loaded.sessionToken,
    collections: saveCollections
  });
  process.stdout.write(JSON.stringify({ saved: saved.counts }, null, 2) + "\n");
}

function normalizeCareTask(task, patientMap) {
  const template = templateForTask(task);
  const patient = patientMap.get(task.patientId);
  const createdAt = task.createdAt || patient?.createdAt || "2026-05-13";
  const dueDate = task.dueDate || createdAt;
  const status = task.status === "done" ? "done" : task.status === "canceled" ? "canceled" : "open";
  return {
    ...task,
    actionTemplateId: task.actionTemplateId || template.id,
    actionName: task.actionName || task.title || template.name,
    title: task.title || task.actionName || template.name,
    category: task.category || template.category,
    channel: task.channel && task.channel !== "unknown" ? task.channel : template.channel,
    dueDate,
    dueTime: task.dueTime || template.defaultTime || "10:00",
    offsetDays: Number.isFinite(Number(task.offsetDays)) ? Number(task.offsetDays) : daysBetween(createdAt, dueDate),
    status,
    completedAt: status === "done" ? (task.completedAt || dueDate) : "",
    schemaVersion: 2,
    migratedAt: "2026-05-13"
  };
}

function templateForTask(task) {
  const category = task.category || "";
  const text = `${task.title || ""} ${task.summary || ""} ${task.memo || ""}`.toLowerCase();
  if (category === "happy_call" || text.includes("해피콜")) return byId("tpl_happy_call_7d");
  if (category === "progress_check" || text.includes("경과")) return byId("tpl_progress_42d");
  if (category === "missed_call" || text.includes("부재")) return byId("tpl_missed_call");
  if (category === "prescription" || text.includes("처방")) return byId("tpl_prescription_end");
  if (category === "appointment" || text.includes("예약") || text.includes("내원")) return byId("tpl_appointment");
  if (category === "issue" || category === "refund" || text.includes("환불")) return byId("tpl_issue");
  if (category === "contact" || text.includes("연락") || text.includes("전화")) return byId("tpl_contact");
  return byId("tpl_general_followup");
}

function byId(id) {
  return ACTION_TEMPLATES.find((template) => template.id === id) || ACTION_TEMPLATES[0];
}

function daysBetween(from, to) {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b - a) / 86400000);
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${JSON.stringify(data).slice(0, 500)}`);
  }
  return data;
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
