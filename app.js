(() => {
  "use strict";

  const STORAGE_KEY = "renewd.clinic.v1";
  const AUTH_SESSION_KEY = "renewd.auth.session.v1";
  const AUTH_USER = "joonsoo";
  const AUTH_SALT = "renewd-local-gate-v1";
  const AUTH_HASH = "73172ab99dd1c2d57380bd78e77c85c113418e1dc64797fdb29f2902be6f1eb4";
  const DATE_LOCALE = "ko-KR";

  const state = {
    authenticated: sessionStorage.getItem(AUTH_SESSION_KEY) === "ok",
    view: "dashboard",
    currentPatientId: null,
    detailTab: "overview",
    patientSearch: "",
    patientFilter: "all",
    reportPatientId: null,
    csvPreviewRows: []
  };

  const icons = {
    dashboard: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12 12 4l9 8"/><path d="M5 10v10h14V10"/></svg>',
    patients: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="4"/><path d="M2 22c0-4 4-6 7-6s7 2 7 6"/><circle cx="17" cy="9" r="3"/><path d="M22 21c0-3-2-4.5-5-4.5"/></svg>',
    reports: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>',
    retention: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    calendar: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
    stats: '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-2"/></svg>'
  };

  let db = state.authenticated ? loadDb() : null;
  initActivePatient();

  render();

  document.addEventListener("click", handleClick);
  document.addEventListener("submit", handleSubmit);
  document.addEventListener("input", handleInput);
  document.addEventListener("change", handleChange);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  function loadDb() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return normalizeDb(JSON.parse(saved));
    } catch (error) {
      console.warn(error);
    }
    const seeded = seedDb();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  function normalizeDb(value) {
    const seeded = seedDb();
    return {
      ...seeded,
      ...value,
      patients: Array.isArray(value.patients) ? value.patients : seeded.patients,
      visits: Array.isArray(value.visits) ? value.visits : seeded.visits,
      bodyCompositions: Array.isArray(value.bodyCompositions) ? value.bodyCompositions : seeded.bodyCompositions,
      reports: Array.isArray(value.reports) ? value.reports : seeded.reports,
      payments: Array.isArray(value.payments) ? value.payments : seeded.payments,
      photos: Array.isArray(value.photos) ? value.photos : seeded.photos,
      appointments: Array.isArray(value.appointments) ? value.appointments : seeded.appointments,
      messages: Array.isArray(value.messages) ? value.messages : seeded.messages
    };
  }

  function saveDb() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  function initActivePatient() {
    if (!db) return;
    if (!state.currentPatientId && db.patients.length) state.currentPatientId = db.patients[0].id;
    if (!state.reportPatientId && db.patients.length) state.reportPatientId = db.patients[0].id;
  }

  function seedDb() {
    const patients = [
      {
        id: "p_lee",
        chartNo: "C-2026-0118",
        name: "샘플환자 A",
        phone: "000-0000-0001",
        birth: "1992-03-14",
        gender: "여",
        occupation: "사무직",
        source: "샘플 유입",
        height: 163,
        startWeight: 71.4,
        targetWeight: 58,
        waist: 86,
        status: "active",
        primaryDoctor: "김원장",
        notes: "샘플 메모. 야간 식사 빈도 높음.",
        allergies: "견과류",
        medications: "샘플 복용약",
        conditions: "샘플 주의질환",
        pregnancy: "해당없음",
        consents: { privacy: true, sensitive: true, sms: true, report: true, photo: true, marketing: false },
        createdAt: "2026-01-18"
      },
      {
        id: "p_jung",
        chartNo: "C-2026-0501",
        name: "샘플환자 B",
        phone: "000-0000-0002",
        birth: "1997-08-22",
        gender: "여",
        occupation: "프리랜서",
        source: "샘플 소개",
        height: 166,
        startWeight: 67.2,
        targetWeight: 57,
        waist: 82,
        status: "active",
        primaryDoctor: "김원장",
        notes: "샘플 메모. 최근 체중 정체.",
        allergies: "",
        medications: "",
        conditions: "샘플 주의사항",
        pregnancy: "해당없음",
        consents: { privacy: true, sensitive: true, sms: true, report: true, photo: false, marketing: false },
        createdAt: "2026-05-01"
      },
      {
        id: "p_choi",
        chartNo: "C-2026-0328",
        name: "샘플환자 C",
        phone: "000-0000-0003",
        birth: "1984-11-02",
        gender: "여",
        occupation: "자영업",
        source: "검색",
        height: 158,
        startWeight: 73,
        targetWeight: 62,
        waist: 91,
        status: "retention_risk",
        primaryDoctor: "김원장",
        notes: "고혈압 병력. 마지막 방문 이후 연락 필요.",
        allergies: "",
        medications: "고혈압약",
        conditions: "고혈압",
        pregnancy: "해당없음",
        consents: { privacy: true, sensitive: true, sms: true, report: true, photo: false, marketing: false },
        createdAt: "2026-03-28"
      }
    ];

    const visits = [
      {
        id: "v_lee_1",
        patientId: "p_lee",
        date: "2026-01-18",
        doctor: "김원장",
        visitType: "초진",
        treatments: "침, 약침",
        herbName: "비만탕 가감",
        prescriptionDays: 30,
        dosage: "1일 2회",
        cautions: "심계, 불면, 소화불량 발생 시 연락",
        subjective: "야식, 복부 부종, 식욕 증가",
        assessment: "습담 경향, 비위 기능 저하",
        plan: "한약 30일, 식사 기록, 2주 후 경과 확인",
        nextVisitDate: "2026-02-02",
        cost: 320000,
        createdAt: "2026-01-18"
      },
      {
        id: "v_lee_2",
        patientId: "p_lee",
        date: "2026-02-02",
        doctor: "김원장",
        visitType: "재진",
        treatments: "침, 카복시",
        herbName: "비만탕 가감",
        prescriptionDays: 30,
        dosage: "1일 2회",
        cautions: "불면 시 저녁 복용 시간 조정",
        subjective: "야식 감소, 부종 완화",
        assessment: "체중 감소 양호",
        plan: "카복시 병행, 다음 방문 시 체성분 재측정",
        nextVisitDate: "2026-03-01",
        cost: 280000,
        createdAt: "2026-02-02"
      },
      {
        id: "v_lee_3",
        patientId: "p_lee",
        date: "2026-03-01",
        doctor: "김원장",
        visitType: "재진",
        treatments: "침, 약침, 한약",
        herbName: "비만탕 가감",
        prescriptionDays: 30,
        dosage: "1일 2회",
        cautions: "심계, 불면 관찰",
        subjective: "평일 점심 거르는 경우 있음",
        assessment: "감량 지속, 근육량 보존 필요",
        plan: "식사 간격 조정, 한약 30일",
        nextVisitDate: "2026-03-22",
        cost: 320000,
        createdAt: "2026-03-01"
      },
      {
        id: "v_lee_4",
        patientId: "p_lee",
        date: "2026-03-22",
        doctor: "김원장",
        visitType: "재진",
        treatments: "매선, 부항",
        herbName: "",
        prescriptionDays: 0,
        dosage: "",
        cautions: "매선 후 부기 안내",
        subjective: "복부 둘레 감소 체감",
        assessment: "체지방 감소 양호",
        plan: "매선 5회권 시작",
        nextVisitDate: "2026-04-12",
        cost: 450000,
        createdAt: "2026-03-22"
      },
      {
        id: "v_lee_5",
        patientId: "p_lee",
        date: "2026-04-12",
        doctor: "김원장",
        visitType: "재진",
        treatments: "침, 약침, 카복시",
        herbName: "비만탕 가감",
        prescriptionDays: 30,
        dosage: "1일 2회",
        cautions: "심계, 불면, 소화불량 발생 시 연락",
        subjective: "카복시 통증 호소 없음. 야간 식사 줄이기 시도 중.",
        assessment: "시작 대비 7kg 이상 감소. 목표까지 추가 감량 필요.",
        plan: "한약 30일 추가. 5회차 경과 리포트 발행.",
        nextVisitDate: "2026-05-12",
        cost: 320000,
        createdAt: "2026-04-12"
      },
      {
        id: "v_jung_1",
        patientId: "p_jung",
        date: "2026-05-01",
        doctor: "김원장",
        visitType: "초진",
        treatments: "침",
        herbName: "감비탕 가감",
        prescriptionDays: 15,
        dosage: "1일 2회",
        cautions: "월경 변화, 두근거림 확인",
        subjective: "야식과 단 음식 선호",
        assessment: "간울, 식욕 조절 어려움",
        plan: "15일 후 재진",
        nextVisitDate: "2026-05-16",
        cost: 220000,
        createdAt: "2026-05-01"
      },
      {
        id: "v_choi_1",
        patientId: "p_choi",
        date: "2026-03-28",
        doctor: "김원장",
        visitType: "초진",
        treatments: "침, 부항",
        herbName: "비만탕 저자극 처방",
        prescriptionDays: 15,
        dosage: "1일 2회",
        cautions: "혈압 변화, 어지러움 관찰",
        subjective: "고혈압약 복용 중. 복부 비만 고민.",
        assessment: "고혈압 병력으로 보수적 처방",
        plan: "혈압 확인 후 처방 지속 여부 판단",
        nextVisitDate: "2026-04-12",
        cost: 240000,
        createdAt: "2026-03-28"
      }
    ];

    const bodyCompositions = [
      body("bc_lee_1", "p_lee", "v_lee_1", "2026-01-18", 71.4, 34.2, 22.7, 26.9, 10, 86, 1360, "InBody CSV"),
      body("bc_lee_2", "p_lee", "v_lee_2", "2026-02-02", 69.8, 33.5, 22.6, 26.3, 9, 84, 1362, "InBody CSV"),
      body("bc_lee_3", "p_lee", "v_lee_3", "2026-03-01", 67.5, 32.4, 22.5, 25.4, 9, 81, 1365, "InBody CSV"),
      body("bc_lee_4", "p_lee", "v_lee_4", "2026-03-22", 65.8, 31.2, 22.3, 24.8, 8, 79, 1358, "InBody CSV"),
      body("bc_lee_5", "p_lee", "v_lee_5", "2026-04-12", 64.2, 30.1, 22.4, 24.2, 8, 77, 1361, "InBody CSV"),
      body("bc_jung_1", "p_jung", "v_jung_1", "2026-05-01", 67.2, 33.8, 21.8, 24.4, 9, 82, 1328, "수동 입력"),
      body("bc_choi_1", "p_choi", "v_choi_1", "2026-03-28", 73, 36.1, 22.1, 29.2, 11, 91, 1344, "수동 입력")
    ];

    const reports = [
      {
        id: "r_lee_1",
        patientId: "p_lee",
        type: "경과 리포트",
        status: "issued",
        title: "4회차 감량 경과 리포트",
        periodStart: "2026-01-18",
        periodEnd: "2026-03-22",
        doctorComment: "체중과 허리둘레가 함께 감소하고 있습니다. 다음 단계에서는 근육량 보존과 규칙적인 식사 간격을 우선 관리합니다.",
        issuedAt: "2026-03-22",
        createdAt: "2026-03-22"
      }
    ];

    const payments = [
      { id: "pay_1", patientId: "p_lee", date: "2026-01-18", item: "초진 + 한약 30일", amount: 320000, method: "카드", status: "paid" },
      { id: "pay_2", patientId: "p_lee", date: "2026-03-22", item: "매선 5회권", amount: 450000, method: "카드", status: "paid" },
      { id: "pay_3", patientId: "p_jung", date: "2026-05-01", item: "초진 + 한약 15일", amount: 220000, method: "계좌이체", status: "paid" }
    ];

    const appointments = [
      { id: "appt_1", patientId: "p_lee", date: "2026-05-12", time: "09:30", type: "재진", status: "reserved", memo: "처방 종료 상담" },
      { id: "appt_2", patientId: "p_jung", date: "2026-05-16", time: "11:00", type: "재진", status: "reserved", memo: "15일 경과 확인" },
      { id: "appt_3", patientId: "p_choi", date: "2026-05-17", time: "15:00", type: "재시작 상담", status: "tentative", memo: "문자 후 예약 유도" }
    ];

    return {
      clinic: { name: "리뉴드 한의원", doctor: "김원장", phone: "02-1234-5678" },
      patients,
      visits,
      bodyCompositions,
      reports,
      payments,
      photos: [],
      appointments,
      messages: [
        { id: "msg_1", patientId: "p_lee", date: "2026-05-12", channel: "LMS", template: "리포트 + 재진 안내", body: "경과 리포트가 준비되었습니다. 재진 예약을 권해드립니다.", status: "queued" }
      ]
    };
  }

  function body(id, patientId, visitId, measuredAt, weight, bodyFatRate, skeletalMuscle, bmi, visceralFatLevel, waist, bmr, source) {
    return { id, patientId, visitId, measuredAt, weight, bodyFatRate, skeletalMuscle, bmi, visceralFatLevel, waist, bmr, source, deviceName: source.includes("InBody") ? "InBody" : "", rawFileName: "" };
  }

  function render() {
    if (!state.authenticated) {
      document.getElementById("app").innerHTML = renderLogin();
      closeModal();
      return;
    }
    document.getElementById("app").innerHTML = `
      <div class="app">
        ${renderSidebar()}
        <main class="main">
          ${renderTopbar()}
          <section class="content">${renderView()}</section>
        </main>
      </div>
    `;
  }

  function renderLogin() {
    return `
      <main class="auth-shell">
        <section class="auth-panel">
          <div class="auth-brand">
            <div class="brand-mark">R</div>
            <div>
              <div class="brand-name">Renewd</div>
              <div class="brand-sub">다이어트 한의원 운영 시스템</div>
            </div>
          </div>
          <form class="auth-card" data-form="login" autocomplete="off">
            <div>
              <div class="auth-title">로그인</div>
              <div class="auth-sub">승인된 계정으로만 진료 운영 화면에 접근할 수 있습니다.</div>
            </div>
            <div class="field">
              <label>아이디</label>
              <input class="input" name="loginId" autocomplete="username" autofocus />
            </div>
            <div class="field">
              <label>비밀번호</label>
              <input class="input" name="loginPassword" type="password" autocomplete="current-password" />
            </div>
            <button class="btn primary auth-submit" type="submit">접속</button>
            <div class="auth-note">공용 PC에서는 브라우저를 닫기 전에 로그아웃하세요.</div>
          </form>
        </section>
      </main>
    `;
  }

  function renderSidebar() {
    const counts = getNavCounts();
    const navs = [
      ["dashboard", "대시보드", counts.dashboard],
      ["patients", "환자 목록", db.patients.length],
      ["reports", "리포트 발행", counts.reports],
      ["retention", "리텐션 관리", counts.retention],
      ["calendar", "예약 캘린더", counts.calendar],
      ["stats", "통계", ""]
    ];
    return `
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">R</div>
          <div>
            <div class="brand-name">Renewd</div>
            <div class="brand-sub">정적 배포형 진료 운영 앱</div>
          </div>
        </div>
        <div class="nav-group">
          <div class="nav-label">메인</div>
          ${navs.map(([view, label, count]) => `
            <button class="nav-item ${state.view === view ? "active" : ""}" data-action="set-view" data-view="${view}">
              ${icons[view]} <span>${label}</span>${count !== "" ? `<span class="nav-count">${count}</span>` : ""}
            </button>
          `).join("")}
        </div>
        <div class="sidebar-foot">
          <div class="doctor-card">
            <div class="avatar">김</div>
            <div>
              <div class="strong">김원장</div>
              <div class="muted" style="font-size:12px">한의사 · 고객관리</div>
            </div>
          </div>
        </div>
      </aside>
    `;
  }

  function renderTopbar() {
    const meta = {
      dashboard: ["대시보드", "오늘의 진료, 리포트, 재방문 큐"],
      patients: ["환자 목록", "환자 정보를 검색하고 CRUD합니다"],
      detail: [currentPatient()?.name || "환자 상세", "방문, 체성분, 리포트, 결제, 사진, 메시지 관리"],
      reports: ["리포트 발행", "체성분과 진료 기록 기반 환자용 리포트"],
      retention: ["리텐션 관리", "다음 방문, 처방 종료, 장기 미방문 관리"],
      calendar: ["예약 캘린더", "예약 CRUD와 노쇼/완료 관리"],
      stats: ["통계", "로컬 데이터 기반 운영 지표"]
    }[state.view] || ["Renewd", ""];
    return `
      <header class="topbar">
        <div>
          <div class="topbar-title">${esc(meta[0])}</div>
          <div class="topbar-sub">${esc(meta[1])}</div>
        </div>
        <div class="topbar-actions">
          <button class="btn secondary" data-action="export-json">데이터 백업</button>
          <button class="btn secondary" data-action="import-json">복원</button>
          <button class="btn secondary" data-action="logout">로그아웃</button>
          <button class="btn primary" data-action="new-patient">+ 환자</button>
          <input id="json-import-file" type="file" accept="application/json,.json" hidden />
        </div>
      </header>
    `;
  }

  function renderView() {
    switch (state.view) {
      case "patients": return renderPatients();
      case "detail": return renderPatientDetail();
      case "reports": return renderReports();
      case "retention": return renderRetention();
      case "calendar": return renderCalendar();
      case "stats": return renderStats();
      default: return renderDashboard();
    }
  }

  function renderDashboard() {
    const queue = buildCareQueue();
    const todayAppointments = db.appointments.filter((a) => a.date === todayISO()).sort(byDateTime);
    const reportDue = db.patients.filter((p) => needsReport(p.id));
    const risk = queue.filter((q) => ["이탈위험", "처방 종료", "다음 방문"].includes(q.type));
    return `
      <div class="page-head">
        <div>
          <div class="page-title">안녕하세요, 김원장님</div>
          <div class="page-sub">GitHub Pages에서도 동작하도록 모든 데이터는 이 브라우저에 저장됩니다.</div>
        </div>
        <div class="spacer"></div>
        <button class="btn secondary" data-action="new-visit">방문기록</button>
        <button class="btn secondary" data-action="open-import-body">체성분 가져오기</button>
        <button class="btn primary" data-action="new-report">리포트 발행</button>
      </div>
      <div class="grid cols-4" style="margin-bottom:16px">
        ${kpi("오늘 예약", todayAppointments.length, "건", "예약 캘린더 기준")}
        ${kpi("케어 필요", queue.length, "명", "방문/처방/이탈 큐")}
        ${kpi("리포트 대기", reportDue.length, "명", "최근 기록 기준")}
        ${kpi("문자 대기", db.messages.filter((m) => m.status === "queued").length, "건", "API 연동 전 대기")}
      </div>
      <div class="grid cols-2">
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title">오늘의 진료·케어 큐</div>
              <div class="card-sub">문자 API 없이도 발송 대기 기록까지 남깁니다.</div>
            </div>
          </div>
          <div class="card-body">
            ${queue.length ? `<table>
              <thead><tr><th>환자</th><th>분류</th><th>사유</th><th>액션</th></tr></thead>
              <tbody>${queue.slice(0, 8).map((q) => renderQueueRow(q)).join("")}</tbody>
            </table>` : empty("오늘 처리할 케어 큐가 없습니다.")}
          </div>
        </div>
        <div class="stack">
          <div class="card">
            <div class="card-head"><div class="card-title">오늘 예약</div></div>
            <div class="card-body">
              ${todayAppointments.length ? todayAppointments.map((a) => renderAppointmentLine(a)).join("") : empty("오늘 예약이 없습니다.")}
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div class="card-title">체성분 입력 경로</div></div>
            <div class="card-body stack">
              <div class="callout">InBody 등 체성분계에서 CSV를 내보낸 뒤 업로드하면 환자별 측정값으로 저장됩니다. 현재 앱은 환자 정보, 방문기록, 체성분, 처방·시술, 결제, 사진, 리포트, 문자 기록만 다룹니다.</div>
              <button class="btn tonal" data-action="open-import-body">CSV 가져오기</button>
              <button class="btn secondary" data-action="new-body">수동 입력</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderPatients() {
    const filtered = db.patients
      .filter((p) => state.patientFilter === "all" || p.status === state.patientFilter)
      .filter((p) => {
        const text = `${p.name} ${p.phone} ${p.chartNo} ${p.notes}`.toLowerCase();
        return text.includes(state.patientSearch.toLowerCase());
      })
      .sort((a, b) => latestDateForPatient(b.id).localeCompare(latestDateForPatient(a.id)));
    return `
      <div class="page-head">
        <div>
          <div class="page-title">환자 목록</div>
          <div class="page-sub">환자 정보를 생성, 수정, 삭제하고 상세 탭에서 관련 데이터를 관리합니다.</div>
        </div>
        <div class="spacer"></div>
        <button class="btn secondary" data-action="open-import-body">체성분 CSV</button>
        <button class="btn primary" data-action="new-patient">+ 새 환자</button>
      </div>
      <div class="card">
        <div class="card-head toolbar">
          <input class="input" style="max-width:320px" placeholder="이름, 전화번호, 차트번호 검색" value="${esc(state.patientSearch)}" data-action="patient-search" />
          <select class="select" style="max-width:180px" data-action="patient-filter">
            ${option("all", "전체", state.patientFilter)}
            ${option("new", "신규", state.patientFilter)}
            ${option("active", "진행중", state.patientFilter)}
            ${option("retention_risk", "이탈위험", state.patientFilter)}
            ${option("closed", "종료", state.patientFilter)}
          </select>
          <div class="spacer"></div>
          <span class="badge">${filtered.length}명</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>환자</th><th>상태</th><th>최근 방문</th><th>다음 방문</th><th>체중 변화</th><th>리포트</th><th>액션</th></tr></thead>
            <tbody>
              ${filtered.map((p) => {
                const metrics = patientMetrics(p.id);
                const lastVisit = latestVisit(p.id);
                const next = nextVisitDate(p.id);
                return `<tr class="clickable" data-action="open-patient" data-id="${p.id}">
                  <td>${patientLabel(p)}</td>
                  <td>${statusBadge(p.status)}</td>
                  <td>${lastVisit ? formatDate(lastVisit.date) : "-"}</td>
                  <td>${next ? formatDate(next) : "-"}</td>
                  <td>${metrics.deltaWeight === null ? "-" : badge(`${fmtSigned(metrics.deltaWeight)}kg`, metrics.deltaWeight <= 0 ? "green" : "red")}</td>
                  <td>${needsReport(p.id) ? badge("발행대기", "amber") : badge("최신", "green")}</td>
                  <td>
                    <button class="btn small secondary" data-action="edit-patient" data-id="${p.id}">수정</button>
                    <button class="btn small ghost" data-action="open-patient" data-id="${p.id}">열기</button>
                  </td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderPatientDetail() {
    const patient = currentPatient();
    if (!patient) return emptyPage("환자를 찾을 수 없습니다.");
    const tabs = [
      ["overview", "개요"],
      ["visits", "방문 이력"],
      ["body", "체성분"],
      ["reports", "리포트"],
      ["photos", "사진"],
      ["prescriptions", "처방·시술"],
      ["payments", "결제"],
      ["messages", "문자"]
    ];
    return `
      <div class="page-head">
        <button class="btn ghost" data-action="set-view" data-view="patients">← 환자 목록</button>
        <div class="spacer"></div>
        <button class="btn secondary" data-action="edit-patient" data-id="${patient.id}">환자 수정</button>
        <button class="btn secondary" data-action="new-message" data-patient-id="${patient.id}">문자 기록</button>
        <button class="btn secondary" data-action="new-report" data-patient-id="${patient.id}">리포트</button>
        <button class="btn primary" data-action="new-visit" data-patient-id="${patient.id}">+ 방문기록</button>
      </div>
      <div class="detail-head">
        <div class="avatar" style="width:50px;height:50px;font-size:18px">${esc(patient.name[0])}</div>
        <div>
          <div class="patient-name">${esc(patient.name)} ${statusBadge(patient.status)}</div>
          <div class="muted">${esc(patient.gender)} · ${age(patient.birth)}세 · ${esc(patient.phone)} · ${esc(patient.chartNo)}</div>
          <div class="row" style="margin-top:8px;flex-wrap:wrap">
            ${badge(`담당 ${patient.primaryDoctor || "미지정"}`, "blue")}
            ${patient.consents.sms ? badge("문자 동의", "green") : badge("문자 미동의", "red")}
            ${patient.consents.report ? badge("리포트 동의", "green") : badge("리포트 미동의", "red")}
            ${patient.medications ? badge("복용약 확인", "amber") : ""}
          </div>
        </div>
      </div>
      <div class="tabs">
        ${tabs.map(([key, label]) => `<button class="tab ${state.detailTab === key ? "active" : ""}" data-action="set-detail-tab" data-tab="${key}">${label}</button>`).join("")}
      </div>
      ${renderDetailTab(patient)}
    `;
  }

  function renderDetailTab(patient) {
    switch (state.detailTab) {
      case "visits": return renderVisitTab(patient);
      case "body": return renderBodyTab(patient);
      case "reports": return renderReportTab(patient);
      case "photos": return renderPhotoTab(patient);
      case "prescriptions": return renderPrescriptionTab(patient);
      case "payments": return renderPaymentTab(patient);
      case "messages": return renderMessageTab(patient);
      default: return renderOverviewTab(patient);
    }
  }

  function renderOverviewTab(patient) {
    const metrics = patientMetrics(patient.id);
    const visits = visitsFor(patient.id);
    const bodies = bodiesFor(patient.id);
    return `
      <div class="grid cols-2">
        <div class="stack">
          <div class="card">
            <div class="card-head"><div class="card-title">핵심 지표</div></div>
            <div class="card-body">
              <div class="metric-grid">
                ${metric("시작 체중", patient.startWeight ? `${patient.startWeight}kg` : "-", "환자 등록값")}
                ${metric("현재 체중", metrics.latestWeight !== null ? `${metrics.latestWeight}kg` : "-", metrics.deltaWeight !== null ? `${fmtSigned(metrics.deltaWeight)}kg` : "")}
                ${metric("목표 체중", patient.targetWeight ? `${patient.targetWeight}kg` : "-", metrics.goalRemain !== null ? `남은 ${metrics.goalRemain.toFixed(1)}kg` : "")}
                ${metric("방문 수", visits.length, "저장된 방문기록")}
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div class="card-title">체중 추이</div><div class="spacer"></div><button class="btn small secondary" data-action="new-body" data-patient-id="${patient.id}">체성분 추가</button></div>
            <div class="card-body">${renderWeightChart(bodies)}</div>
          </div>
          <div class="card">
            <div class="card-head"><div class="card-title">최근 방문</div></div>
            <div class="card-body">${visits.slice(-3).reverse().map(renderVisitItem).join("") || empty("방문기록이 없습니다.")}</div>
          </div>
        </div>
        <div class="stack">
          <div class="card">
            <div class="card-head"><div class="card-title">주의 정보</div></div>
            <div class="card-body stack tight">
              ${infoLine("알러지", patient.allergies || "없음")}
              ${infoLine("복용약", patient.medications || "없음")}
              ${infoLine("기저질환", patient.conditions || "없음")}
              ${infoLine("임신/수유", patient.pregnancy || "미확인")}
              ${patient.notes ? `<div class="callout warning">${esc(patient.notes)}</div>` : ""}
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div class="card-title">다음 액션</div></div>
            <div class="card-body stack tight">
              ${buildCareQueue(patient.id).map((q) => `<div class="row"><span>${badge(q.type, q.badge)}</span><div>${esc(q.reason)}</div><div class="spacer"></div><button class="btn small secondary" data-action="${q.action}" data-patient-id="${patient.id}">${q.actionLabel}</button></div>`).join("") || empty("열린 액션이 없습니다.")}
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div class="card-title">데이터 보관</div></div>
            <div class="card-body stack tight">
              ${infoLine("체성분", `${bodies.length}건`)}
              ${infoLine("리포트", `${reportsFor(patient.id).length}건`)}
              ${infoLine("사진", `${photosFor(patient.id).length}건`)}
              ${infoLine("문자 기록", `${messagesFor(patient.id).length}건`)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderVisitTab(patient) {
    const visits = visitsFor(patient.id).slice().reverse();
    return `
      <div class="page-head">
        <div><div class="page-title" style="font-size:18px">방문 이력</div><div class="page-sub">SOAP, 처방, 시술, 다음 방문일을 CRUD합니다.</div></div>
        <div class="spacer"></div>
        <button class="btn primary" data-action="new-visit" data-patient-id="${patient.id}">+ 방문기록</button>
      </div>
      <div class="card"><div class="card-body">${visits.map(renderVisitItem).join("") || empty("방문기록이 없습니다.")}</div></div>
    `;
  }

  function renderVisitItem(visit) {
    return `
      <div class="timeline-item">
        <div class="row">
          <div class="strong">${formatDate(visit.date)} · ${esc(visit.visitType || "방문")}</div>
          <span class="badge">${esc(visit.doctor || "-")}</span>
          ${visit.herbName ? badge(`처방 ${visit.prescriptionDays || 0}일`, "blue") : ""}
          <div class="spacer"></div>
          <button class="btn small secondary" data-action="edit-visit" data-id="${visit.id}">수정</button>
          <button class="btn small ghost" data-action="delete-visit" data-id="${visit.id}">삭제</button>
        </div>
        <div class="muted" style="margin-top:6px">${esc(visit.treatments || "시술 없음")}</div>
        <div style="margin-top:8px">${esc(visit.assessment || "")}</div>
        <div class="muted" style="margin-top:6px">계획: ${esc(visit.plan || "-")} · 다음 방문 ${visit.nextVisitDate ? formatDate(visit.nextVisitDate) : "-"}</div>
      </div>
    `;
  }

  function renderBodyTab(patient) {
    const bodies = bodiesFor(patient.id).slice().reverse();
    return `
      <div class="page-head">
        <div><div class="page-title" style="font-size:18px">체성분</div><div class="page-sub">수동 입력 또는 InBody류 CSV 가져오기로 저장합니다.</div></div>
        <div class="spacer"></div>
        <button class="btn secondary" data-action="open-import-body" data-patient-id="${patient.id}">CSV 가져오기</button>
        <button class="btn primary" data-action="new-body" data-patient-id="${patient.id}">+ 체성분</button>
      </div>
      <div class="grid cols-2">
        <div class="card">
          <div class="card-head"><div class="card-title">체중 추이</div></div>
          <div class="card-body">${renderWeightChart(bodies.slice().reverse())}</div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">체성분 목록</div></div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>측정일</th><th>체중</th><th>체지방률</th><th>근육량</th><th>출처</th><th>액션</th></tr></thead>
              <tbody>${bodies.map((b) => `<tr>
                <td>${formatDate(b.measuredAt)}</td>
                <td>${num(b.weight)}kg</td>
                <td>${num(b.bodyFatRate)}%</td>
                <td>${num(b.skeletalMuscle)}kg</td>
                <td>${esc(b.source || "수동 입력")}</td>
                <td><button class="btn small secondary" data-action="edit-body" data-id="${b.id}">수정</button><button class="btn small ghost" data-action="delete-body" data-id="${b.id}">삭제</button></td>
              </tr>`).join("")}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function renderReportTab(patient) {
    const reports = reportsFor(patient.id).slice().reverse();
    return `
      <div class="page-head">
        <div><div class="page-title" style="font-size:18px">리포트</div><div class="page-sub">저장된 체성분과 방문기록으로 환자용 리포트를 생성합니다.</div></div>
        <div class="spacer"></div>
        <button class="btn primary" data-action="new-report" data-patient-id="${patient.id}">+ 리포트</button>
      </div>
      <div class="grid cols-2">
        <div class="card">
          <div class="card-head"><div class="card-title">리포트 이력</div></div>
          <div class="card-body stack">
            ${reports.map((r) => `<div class="row">
              <div>
                <div class="strong">${esc(r.title)}</div>
                <div class="muted">${formatDate(r.periodStart)} - ${formatDate(r.periodEnd)} · ${esc(r.status)}</div>
              </div>
              <div class="spacer"></div>
              <button class="btn small secondary" data-action="preview-report" data-id="${r.id}">보기</button>
              <button class="btn small secondary" data-action="edit-report" data-id="${r.id}">수정</button>
              <button class="btn small ghost" data-action="delete-report" data-id="${r.id}">삭제</button>
            </div>`).join("") || empty("리포트가 없습니다.")}
          </div>
        </div>
        <div>${renderReportPreview(patient, reports[0])}</div>
      </div>
    `;
  }

  function renderPhotoTab(patient) {
    const photos = photosFor(patient.id).slice().reverse();
    return `
      <div class="page-head">
        <div><div class="page-title" style="font-size:18px">사진</div><div class="page-sub">환자 동의가 있는 경우 내부 경과 비교용 사진을 저장합니다.</div></div>
        <div class="spacer"></div>
        <button class="btn primary" data-action="new-photo" data-patient-id="${patient.id}" ${patient.consents.photo ? "" : "disabled"}>+ 사진</button>
      </div>
      ${patient.consents.photo ? "" : `<div class="callout warning" style="margin-bottom:16px">사진 촬영 동의가 없어 사진 추가를 막았습니다. 환자 수정에서 동의를 먼저 갱신하세요.</div>`}
      <div class="photo-grid">
        ${photos.map((photo) => `<div class="photo-card">
          <img src="${photo.dataUrl}" alt="${esc(photo.type)} 사진" />
          <div class="photo-meta">
            <div class="strong">${esc(photo.type)} · ${formatDate(photo.date)}</div>
            <div class="muted">${esc(photo.memo || "")}</div>
            <button class="btn small ghost" data-action="delete-photo" data-id="${photo.id}">삭제</button>
          </div>
        </div>`).join("") || empty("저장된 사진이 없습니다.")}
      </div>
    `;
  }

  function renderPrescriptionTab(patient) {
    const visits = visitsFor(patient.id).slice().reverse();
    return `
      <div class="card">
        <div class="card-head"><div class="card-title">처방·시술 이력</div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>방문일</th><th>처방</th><th>일수</th><th>복용법</th><th>시술</th><th>주의</th></tr></thead>
            <tbody>${visits.map((v) => `<tr>
              <td>${formatDate(v.date)}</td>
              <td>${esc(v.herbName || "-")}</td>
              <td>${v.prescriptionDays || "-"}</td>
              <td>${esc(v.dosage || "-")}</td>
              <td>${esc(v.treatments || "-")}</td>
              <td>${esc(v.cautions || "-")}</td>
            </tr>`).join("")}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderPaymentTab(patient) {
    const payments = paymentsFor(patient.id).slice().reverse();
    return `
      <div class="page-head">
        <div><div class="page-title" style="font-size:18px">결제</div><div class="page-sub">결제와 미수금을 관리합니다.</div></div>
        <div class="spacer"></div>
        <button class="btn primary" data-action="new-payment" data-patient-id="${patient.id}">+ 결제</button>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>일자</th><th>항목</th><th>금액</th><th>수단</th><th>상태</th><th>액션</th></tr></thead>
            <tbody>${payments.map((p) => `<tr>
              <td>${formatDate(p.date)}</td><td>${esc(p.item)}</td><td>${money(p.amount)}</td><td>${esc(p.method)}</td><td>${statusBadge(p.status)}</td>
              <td><button class="btn small secondary" data-action="edit-payment" data-id="${p.id}">수정</button><button class="btn small ghost" data-action="delete-payment" data-id="${p.id}">삭제</button></td>
            </tr>`).join("")}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderMessageTab(patient) {
    const messages = messagesFor(patient.id).slice().reverse();
    return `
      <div class="page-head">
        <div><div class="page-title" style="font-size:18px">문자</div><div class="page-sub">실제 API 연동 전까지는 발송 대기/기록만 저장합니다.</div></div>
        <div class="spacer"></div>
        <button class="btn primary" data-action="new-message" data-patient-id="${patient.id}" ${patient.consents.sms ? "" : "disabled"}>+ 문자 기록</button>
      </div>
      ${patient.consents.sms ? "" : `<div class="callout warning" style="margin-bottom:16px">문자 수신 동의가 없어 문자 기록 추가를 막았습니다.</div>`}
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>일자</th><th>채널</th><th>템플릿</th><th>상태</th><th>본문</th><th>액션</th></tr></thead>
            <tbody>${messages.map((m) => `<tr>
              <td>${formatDate(m.date)}</td><td>${esc(m.channel)}</td><td>${esc(m.template)}</td><td>${statusBadge(m.status)}</td><td>${esc(m.body)}</td>
              <td><button class="btn small secondary" data-action="edit-message" data-id="${m.id}">수정</button><button class="btn small ghost" data-action="delete-message" data-id="${m.id}">삭제</button></td>
            </tr>`).join("")}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderReports() {
    const patient = getPatient(state.reportPatientId) || db.patients[0];
    const report = patient ? reportsFor(patient.id).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] : null;
    return `
      <div class="page-head">
        <div>
          <div class="page-title">리포트 발행</div>
          <div class="page-sub">실제 저장된 방문·체성분 데이터만 사용합니다.</div>
        </div>
        <div class="spacer"></div>
        <select class="select" style="max-width:240px" data-action="report-patient">
          ${db.patients.map((p) => option(p.id, `${p.name} · ${p.chartNo}`, patient?.id)).join("")}
        </select>
        <button class="btn primary" data-action="new-report" data-patient-id="${patient?.id || ""}">+ 리포트</button>
      </div>
      ${patient ? `<div class="grid cols-2">
        <div class="stack">
          <div class="card">
            <div class="card-head"><div class="card-title">발행 대상</div></div>
            <div class="card-body stack tight">
              ${patientLabel(patient)}
              ${infoLine("체성분", `${bodiesFor(patient.id).length}건`)}
              ${infoLine("방문기록", `${visitsFor(patient.id).length}건`)}
              ${infoLine("리포트 동의", patient.consents.report ? "동의" : "미동의")}
              <button class="btn secondary" data-action="open-patient" data-id="${patient.id}">환자 상세 열기</button>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div class="card-title">이전 리포트</div></div>
            <div class="card-body stack">
              ${reportsFor(patient.id).slice().reverse().map((r) => `<div class="row"><div><div class="strong">${esc(r.title)}</div><div class="muted">${formatDate(r.createdAt)} · ${esc(r.status)}</div></div><div class="spacer"></div><button class="btn small secondary" data-action="preview-report" data-id="${r.id}">보기</button></div>`).join("") || empty("리포트가 없습니다.")}
            </div>
          </div>
        </div>
        ${renderReportPreview(patient, report)}
      </div>` : emptyPage("환자가 없습니다.")}
    `;
  }

  function renderReportPreview(patient, report) {
    const bodies = bodiesFor(patient.id);
    const metrics = patientMetrics(patient.id);
    const visits = visitsFor(patient.id);
    const firstDate = bodies[0]?.measuredAt || visits[0]?.date || patient.createdAt;
    const lastDate = bodies[bodies.length - 1]?.measuredAt || visits[visits.length - 1]?.date || todayISO();
    const comment = report?.doctorComment || autoReportComment(patient.id);
    return `
      <div class="report-paper">
        <div class="row">
          <div>
            <div class="report-title">${esc(patient.name)} 님 감량 경과 리포트</div>
            <div class="report-meta">${esc(db.clinic.name)} · 담당 ${esc(patient.primaryDoctor || db.clinic.doctor)} · ${formatDate(firstDate)} - ${formatDate(lastDate)}</div>
          </div>
          <div class="spacer"></div>
          ${report ? badge(report.status === "issued" ? "발행됨" : "초안", report.status === "issued" ? "green" : "amber") : badge("미리보기", "blue")}
        </div>
        <div class="report-section">
          <div class="metric-grid">
            ${metric("체중 변화", metrics.deltaWeight !== null ? `${fmtSigned(metrics.deltaWeight)}kg` : "-", metrics.latestWeight !== null ? `${metrics.startWeight} → ${metrics.latestWeight}kg` : "")}
            ${metric("체지방률", metrics.deltaFat !== null ? `${fmtSigned(metrics.deltaFat)}%p` : "-", "체성분 측정값")}
            ${metric("골격근량", metrics.deltaMuscle !== null ? `${fmtSigned(metrics.deltaMuscle)}kg` : "-", "체성분 측정값")}
            ${metric("목표까지", metrics.goalRemain !== null ? `${metrics.goalRemain.toFixed(1)}kg` : "-", `목표 ${patient.targetWeight || "-"}kg`)}
          </div>
        </div>
        <div class="report-section">
          <div class="report-section-title">체성분 추이</div>
          ${renderWeightChart(bodies)}
        </div>
        <div class="report-section">
          <div class="report-section-title">진료 요약</div>
          <div class="stack tight">
            ${visits.slice(-3).map((v) => `<div><b>${formatDate(v.date)}</b> · ${esc(v.assessment || "-")} <span class="muted">계획: ${esc(v.plan || "-")}</span></div>`).join("") || "방문기록이 없습니다."}
          </div>
        </div>
        <div class="report-section">
          <div class="report-section-title">원장 코멘트</div>
          <div class="callout">${esc(comment)}</div>
        </div>
        <div class="report-section row">
          <button class="btn secondary" data-action="print-report">프린트</button>
          ${report ? `<button class="btn secondary" data-action="edit-report" data-id="${report.id}">수정</button>` : ""}
          <button class="btn primary" data-action="new-report" data-patient-id="${patient.id}">리포트 저장</button>
        </div>
      </div>
    `;
  }

  function renderRetention() {
    const queue = buildCareQueue();
    return `
      <div class="page-head">
        <div>
          <div class="page-title">리텐션 관리</div>
          <div class="page-sub">처방 종료, 다음 방문일, 장기 미방문을 기준으로 표시합니다.</div>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>환자</th><th>분류</th><th>사유</th><th>마지막 방문</th><th>액션</th></tr></thead>
            <tbody>${queue.map((q) => {
              const p = getPatient(q.patientId);
              return `<tr>
                <td>${patientLabel(p)}</td>
                <td>${badge(q.type, q.badge)}</td>
                <td>${esc(q.reason)}</td>
                <td>${formatDate(latestVisit(q.patientId)?.date || "")}</td>
                <td><button class="btn small secondary" data-action="open-patient" data-id="${q.patientId}">상세</button><button class="btn small tonal" data-action="new-message" data-patient-id="${q.patientId}">문자 기록</button></td>
              </tr>`;
            }).join("")}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderCalendar() {
    const year = 2026;
    const month = 5;
    const cells = calendarCells(year, month);
    return `
      <div class="page-head">
        <div>
          <div class="page-title">예약 캘린더</div>
          <div class="page-sub">정적 앱에서도 예약은 저장·수정·삭제됩니다.</div>
        </div>
        <div class="spacer"></div>
        <button class="btn primary" data-action="new-appointment">+ 예약</button>
      </div>
      <div class="card">
        <div class="card-head"><div class="card-title">2026년 5월</div></div>
        <div class="card-body">
          <div class="calendar-grid">
            ${["일", "월", "화", "수", "목", "금", "토"].map((d) => `<div class="cal-head">${d}</div>`).join("")}
            ${cells.map((cell) => {
              const date = `${year}-${String(month).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
              const appointments = db.appointments.filter((a) => a.date === date).sort(byDateTime);
              return `<div class="cal-cell ${cell.off ? "off" : ""} ${date === todayISO() ? "today" : ""}">
                <div class="cal-num">${cell.day}</div>
                ${!cell.off ? appointments.map((a) => {
                  const p = getPatient(a.patientId);
                  return `<button class="cal-event" data-action="edit-appointment" data-id="${a.id}">${esc(a.time)} ${esc(p?.name || "환자")} · ${esc(a.type)}</button>`;
                }).join("") : ""}
              </div>`;
            }).join("")}
          </div>
        </div>
      </div>
    `;
  }

  function renderStats() {
    const visits = db.visits.length;
    const revenue = db.payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const active = db.patients.filter((p) => p.status === "active").length;
    const reports = db.reports.length;
    return `
      <div class="page-head">
        <div>
          <div class="page-title">통계</div>
          <div class="page-sub">현재 브라우저에 저장된 데이터 기준입니다.</div>
        </div>
      </div>
      <div class="grid cols-4" style="margin-bottom:16px">
        ${kpi("전체 환자", db.patients.length, "명", `진행중 ${active}명`)}
        ${kpi("방문기록", visits, "건", "저장된 Visit")}
        ${kpi("리포트", reports, "건", "초안/발행 포함")}
        ${kpi("매출", Math.round(revenue / 10000), "만원", "결제완료 기준")}
      </div>
      <div class="grid cols-2">
        <div class="card"><div class="card-head"><div class="card-title">환자별 체중 변화</div></div><div class="card-body">${renderPatientDeltaBars()}</div></div>
        <div class="card"><div class="card-head"><div class="card-title">문자 발송 대기</div></div><div class="card-body">${db.messages.filter((m) => m.status === "queued").map((m) => `<div class="row"><span>${esc(getPatient(m.patientId)?.name || "-")}</span><span class="badge">${esc(m.channel)}</span><div class="spacer"></div><span class="muted">${esc(m.template)}</span></div>`).join("") || empty("대기 문자가 없습니다.")}</div></div>
      </div>
    `;
  }

  function handleClick(event) {
    const el = event.target.closest("[data-action]");
    if (!el) return;
    const action = el.dataset.action;
    if (!["patient-search", "patient-filter", "report-patient"].includes(action)) event.preventDefault();
    event.stopPropagation();

    switch (action) {
      case "set-view":
        state.view = el.dataset.view;
        render();
        break;
      case "open-patient":
        state.currentPatientId = el.dataset.id;
        state.reportPatientId = el.dataset.id;
        state.view = "detail";
        state.detailTab = "overview";
        render();
        break;
      case "set-detail-tab":
        state.detailTab = el.dataset.tab;
        render();
        break;
      case "new-patient":
        openPatientModal();
        break;
      case "edit-patient":
        openPatientModal(el.dataset.id);
        break;
      case "new-visit":
        openVisitModal(null, el.dataset.patientId);
        break;
      case "edit-visit":
        openVisitModal(el.dataset.id);
        break;
      case "delete-visit":
        deleteVisit(el.dataset.id);
        break;
      case "new-body":
        openBodyModal(null, el.dataset.patientId);
        break;
      case "edit-body":
        openBodyModal(el.dataset.id);
        break;
      case "delete-body":
        deleteRecord("bodyCompositions", el.dataset.id, "체성분 기록을 삭제했습니다.");
        break;
      case "open-import-body":
        openBodyImportModal(el.dataset.patientId);
        break;
      case "sample-csv":
        fillSampleCsv();
        break;
      case "preview-csv":
        previewCsvImport();
        break;
      case "confirm-csv":
        confirmCsvImport();
        break;
      case "new-report":
        openReportModal(null, el.dataset.patientId);
        break;
      case "edit-report":
        openReportModal(el.dataset.id);
        break;
      case "preview-report":
        openReportPreviewModal(el.dataset.id);
        break;
      case "delete-report":
        deleteRecord("reports", el.dataset.id, "리포트를 삭제했습니다.");
        break;
      case "print-report":
        window.print();
        break;
      case "new-photo":
        openPhotoModal(el.dataset.patientId);
        break;
      case "delete-photo":
        deleteRecord("photos", el.dataset.id, "사진을 삭제했습니다.");
        break;
      case "new-payment":
        openPaymentModal(null, el.dataset.patientId);
        break;
      case "edit-payment":
        openPaymentModal(el.dataset.id);
        break;
      case "delete-payment":
        deleteRecord("payments", el.dataset.id, "결제 기록을 삭제했습니다.");
        break;
      case "new-message":
        openMessageModal(null, el.dataset.patientId);
        break;
      case "edit-message":
        openMessageModal(el.dataset.id);
        break;
      case "delete-message":
        deleteRecord("messages", el.dataset.id, "문자 기록을 삭제했습니다.");
        break;
      case "new-appointment":
        openAppointmentModal();
        break;
      case "edit-appointment":
        openAppointmentModal(el.dataset.id);
        break;
      case "delete-appointment":
        deleteRecord("appointments", el.dataset.id, "예약을 삭제했습니다.");
        break;
      case "export-json":
        exportJson();
        break;
      case "import-json":
        document.getElementById("json-import-file")?.click();
        break;
      case "logout":
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        state.authenticated = false;
        db = null;
        render();
        break;
      case "close-modal":
        closeModal();
        break;
      case "reset-demo":
        if (confirm("저장된 데이터를 초기 샘플로 되돌릴까요?")) {
          localStorage.removeItem(STORAGE_KEY);
          location.reload();
        }
        break;
      default:
        break;
    }
  }

  function handleInput(event) {
    const el = event.target;
    if (el.dataset.action === "patient-search") {
      state.patientSearch = el.value;
      render();
    }
  }

  function handleChange(event) {
    const el = event.target;
    if (el.dataset.action === "patient-filter") {
      state.patientFilter = el.value;
      render();
      return;
    }
    if (el.dataset.action === "report-patient") {
      state.reportPatientId = el.value;
      render();
      return;
    }
    if (el.id === "json-import-file") {
      importJsonFile(el.files?.[0]);
      return;
    }
    if (el.id === "csv-file") {
      readTextFile(el.files?.[0], (text) => {
        const target = document.getElementById("csv-text");
        if (target) target.value = text;
        previewCsvImport();
      });
    }
  }

  async function handleSubmit(event) {
    const form = event.target.closest("form[data-form]");
    if (!form) return;
    event.preventDefault();
    const type = form.dataset.form;
    if (type === "login") {
      await handleLoginForm(form);
      return;
    }
    if (type === "patient") savePatientForm(form);
    if (type === "visit") saveVisitForm(form);
    if (type === "body") saveBodyForm(form);
    if (type === "report") saveReportForm(form);
    if (type === "payment") savePaymentForm(form);
    if (type === "message") saveMessageForm(form);
    if (type === "appointment") saveAppointmentForm(form);
    if (type === "photo") await savePhotoForm(form);
  }

  async function handleLoginForm(form) {
    const values = formValues(form);
    const loginId = String(values.loginId || "").trim();
    const password = String(values.loginPassword || "");
    const hash = await sha256Hex(`${AUTH_SALT}:${loginId}:${password}`);
    if (loginId !== AUTH_USER || hash !== AUTH_HASH) {
      toast("아이디 또는 비밀번호가 맞지 않습니다.");
      form.querySelector("[name='loginPassword']")?.focus();
      return;
    }
    sessionStorage.setItem(AUTH_SESSION_KEY, "ok");
    state.authenticated = true;
    db = loadDb();
    initActivePatient();
    render();
    toast("로그인했습니다.");
  }

  async function sha256Hex(text) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function openPatientModal(id) {
    const patient = id ? getPatient(id) : null;
    const p = patient || {
      id: "",
      chartNo: nextChartNo(),
      name: "",
      phone: "",
      birth: "",
      gender: "여",
      occupation: "",
      source: "",
      height: "",
      startWeight: "",
      targetWeight: "",
      waist: "",
      status: "new",
      primaryDoctor: "김원장",
      notes: "",
      allergies: "",
      medications: "",
      conditions: "",
      pregnancy: "해당없음",
      consents: { privacy: true, sensitive: true, sms: true, report: true, photo: false, marketing: false },
      createdAt: todayISO()
    };
    openModal(patient ? "환자 수정" : "새 환자 등록", `
      <form data-form="patient" class="stack">
        <input type="hidden" name="id" value="${esc(p.id)}" />
        <div class="form-grid cols-3">
          ${field("차트번호", "chartNo", p.chartNo, "text", true)}
          ${field("이름", "name", p.name, "text", true)}
          ${field("전화번호", "phone", p.phone, "tel", true)}
          ${field("생년월일", "birth", p.birth, "date")}
          ${selectField("성별", "gender", p.gender, [["여", "여"], ["남", "남"], ["기타", "기타"]])}
          ${selectField("상태", "status", p.status, [["new", "신규"], ["active", "진행중"], ["retention_risk", "이탈위험"], ["closed", "종료"]])}
          ${field("직업", "occupation", p.occupation)}
          ${field("유입 경로", "source", p.source)}
          ${field("담당 한의사", "primaryDoctor", p.primaryDoctor)}
          ${field("키(cm)", "height", p.height, "number")}
          ${field("시작 체중(kg)", "startWeight", p.startWeight, "number")}
          ${field("목표 체중(kg)", "targetWeight", p.targetWeight, "number")}
          ${field("허리둘레(cm)", "waist", p.waist, "number")}
          ${selectField("임신/수유", "pregnancy", p.pregnancy, [["해당없음", "해당없음"], ["임신 가능성", "임신 가능성"], ["임신 중", "임신 중"], ["수유 중", "수유 중"], ["미확인", "미확인"]])}
          <div></div>
          ${textareaField("알러지", "allergies", p.allergies, "예: 견과류")}
          ${textareaField("복용약", "medications", p.medications, "예: 혈압약, 갑상선약")}
          ${textareaField("기저질환", "conditions", p.conditions, "예: 고혈압, 당뇨")}
          ${textareaField("특이사항", "notes", p.notes, "진료 전 확인할 메모", "wide")}
        </div>
        <div class="callout">SMS/LMS, 리포트 링크, 사진, 마케팅 동의는 목적별로 분리 저장됩니다.</div>
        <div class="form-grid cols-3">
          ${checkField("개인정보 동의", "consentPrivacy", p.consents.privacy)}
          ${checkField("민감정보 동의", "consentSensitive", p.consents.sensitive)}
          ${checkField("문자 수신 동의", "consentSms", p.consents.sms)}
          ${checkField("리포트 링크 동의", "consentReport", p.consents.report)}
          ${checkField("사진 촬영 동의", "consentPhoto", p.consents.photo)}
          ${checkField("마케팅 수신 동의", "consentMarketing", p.consents.marketing)}
        </div>
        ${modalActions(patient ? "저장" : "등록")}
      </form>
    `, { wide: true });
  }

  function savePatientForm(form) {
    const v = formValues(form);
    if (!v.name || !v.phone || !v.chartNo) return toast("이름, 전화번호, 차트번호는 필수입니다.");
    const data = {
      id: v.id || uid("p"),
      chartNo: v.chartNo,
      name: v.name,
      phone: v.phone,
      birth: v.birth,
      gender: v.gender,
      occupation: v.occupation,
      source: v.source,
      height: toNumber(v.height),
      startWeight: toNumber(v.startWeight),
      targetWeight: toNumber(v.targetWeight),
      waist: toNumber(v.waist),
      status: v.status,
      primaryDoctor: v.primaryDoctor,
      notes: v.notes,
      allergies: v.allergies,
      medications: v.medications,
      conditions: v.conditions,
      pregnancy: v.pregnancy,
      consents: {
        privacy: !!v.consentPrivacy,
        sensitive: !!v.consentSensitive,
        sms: !!v.consentSms,
        report: !!v.consentReport,
        photo: !!v.consentPhoto,
        marketing: !!v.consentMarketing
      },
      createdAt: getPatient(v.id)?.createdAt || todayISO()
    };
    upsert(db.patients, data);
    state.currentPatientId = data.id;
    state.reportPatientId = data.id;
    state.view = "detail";
    closeModal();
    saveDb();
    render();
    toast("환자 정보를 저장했습니다.");
  }

  function openVisitModal(id, patientId) {
    const visit = id ? db.visits.find((v) => v.id === id) : null;
    const selectedPatientId = visit?.patientId || patientId || state.currentPatientId || db.patients[0]?.id;
    const v = visit || {
      id: "",
      patientId: selectedPatientId,
      date: todayISO(),
      doctor: "김원장",
      visitType: "재진",
      treatments: "",
      herbName: "",
      prescriptionDays: 30,
      dosage: "1일 2회",
      cautions: "",
      subjective: "",
      assessment: "",
      plan: "",
      nextVisitDate: addDays(todayISO(), 30),
      cost: ""
    };
    openModal(visit ? "방문기록 수정" : "방문기록 작성", `
      <form data-form="visit" class="stack">
        <input type="hidden" name="id" value="${esc(v.id)}" />
        <div class="form-grid cols-3">
          ${selectField("환자", "patientId", v.patientId, db.patients.map((p) => [p.id, `${p.name} · ${p.chartNo}`]))}
          ${field("방문일", "date", v.date, "date", true)}
          ${field("담당의", "doctor", v.doctor, "text", true)}
          ${selectField("방문 유형", "visitType", v.visitType, [["초진", "초진"], ["재진", "재진"], ["상담", "상담"], ["시술", "시술"]])}
          ${field("시술", "treatments", v.treatments, "text", false, "예: 침, 약침, 카복시")}
          ${field("진료비", "cost", v.cost, "number")}
          ${field("처방명", "herbName", v.herbName)}
          ${field("처방 일수", "prescriptionDays", v.prescriptionDays, "number")}
          ${field("복용법", "dosage", v.dosage)}
          ${textareaField("주의사항", "cautions", v.cautions, "복약 중단 기준, 주의 증상")}
          ${textareaField("S: 주관적 호소", "subjective", v.subjective)}
          ${textareaField("A: 평가", "assessment", v.assessment)}
          ${textareaField("P: 계획", "plan", v.plan)}
          ${field("다음 방문 예정일", "nextVisitDate", v.nextVisitDate, "date", true)}
        </div>
        <div class="callout">다음 방문 예정일은 리텐션 큐의 기준이므로 필수입니다.</div>
        ${modalActions(visit ? "저장" : "등록")}
      </form>
    `, { wide: true });
  }

  function saveVisitForm(form) {
    const v = formValues(form);
    if (!v.patientId || !v.date || !v.nextVisitDate) return toast("환자, 방문일, 다음 방문일은 필수입니다.");
    const visit = {
      id: v.id || uid("v"),
      patientId: v.patientId,
      date: v.date,
      doctor: v.doctor,
      visitType: v.visitType,
      treatments: v.treatments,
      herbName: v.herbName,
      prescriptionDays: toNumber(v.prescriptionDays) || 0,
      dosage: v.dosage,
      cautions: v.cautions,
      subjective: v.subjective,
      assessment: v.assessment,
      plan: v.plan,
      nextVisitDate: v.nextVisitDate,
      cost: toNumber(v.cost) || 0,
      createdAt: db.visits.find((x) => x.id === v.id)?.createdAt || todayISO()
    };
    upsert(db.visits, visit);
    if (visit.cost > 0 && !db.payments.some((p) => p.visitId === visit.id)) {
      db.payments.push({ id: uid("pay"), patientId: visit.patientId, visitId: visit.id, date: visit.date, item: visit.herbName || visit.treatments || "진료비", amount: visit.cost, method: "미기록", status: "paid" });
    }
    state.currentPatientId = visit.patientId;
    state.view = "detail";
    state.detailTab = "visits";
    closeModal();
    saveDb();
    render();
    toast("방문기록을 저장했습니다.");
  }

  function openBodyModal(id, patientId) {
    const body = id ? db.bodyCompositions.find((b) => b.id === id) : null;
    const b = body || {
      id: "",
      patientId: patientId || state.currentPatientId || db.patients[0]?.id,
      visitId: "",
      measuredAt: todayISO(),
      weight: "",
      bodyFatRate: "",
      skeletalMuscle: "",
      bmi: "",
      visceralFatLevel: "",
      waist: "",
      bmr: "",
      source: "수동 입력",
      deviceName: "",
      rawFileName: ""
    };
    openModal(body ? "체성분 수정" : "체성분 입력", `
      <form data-form="body" class="stack">
        <input type="hidden" name="id" value="${esc(b.id)}" />
        <div class="form-grid cols-3">
          ${selectField("환자", "patientId", b.patientId, db.patients.map((p) => [p.id, `${p.name} · ${p.chartNo}`]))}
          ${selectField("연결 방문", "visitId", b.visitId || "", [["", "연결 안 함"], ...visitsFor(b.patientId).map((v) => [v.id, `${v.date} · ${v.visitType}`])])}
          ${field("측정일", "measuredAt", b.measuredAt, "date", true)}
          ${field("체중(kg)", "weight", b.weight, "number", true)}
          ${field("체지방률(%)", "bodyFatRate", b.bodyFatRate, "number")}
          ${field("골격근량(kg)", "skeletalMuscle", b.skeletalMuscle, "number")}
          ${field("BMI", "bmi", b.bmi, "number")}
          ${field("내장지방 레벨", "visceralFatLevel", b.visceralFatLevel, "number")}
          ${field("허리둘레(cm)", "waist", b.waist, "number")}
          ${field("기초대사량(kcal)", "bmr", b.bmr, "number")}
          ${field("출처", "source", b.source)}
          ${field("기기명", "deviceName", b.deviceName)}
        </div>
        ${modalActions(body ? "저장" : "등록")}
      </form>
    `);
  }

  function saveBodyForm(form) {
    const v = formValues(form);
    if (!v.patientId || !v.measuredAt || !v.weight) return toast("환자, 측정일, 체중은 필수입니다.");
    const record = {
      id: v.id || uid("bc"),
      patientId: v.patientId,
      visitId: v.visitId,
      measuredAt: v.measuredAt,
      weight: toNumber(v.weight),
      bodyFatRate: toNumber(v.bodyFatRate),
      skeletalMuscle: toNumber(v.skeletalMuscle),
      bmi: toNumber(v.bmi),
      visceralFatLevel: toNumber(v.visceralFatLevel),
      waist: toNumber(v.waist),
      bmr: toNumber(v.bmr),
      source: v.source || "수동 입력",
      deviceName: v.deviceName,
      rawFileName: db.bodyCompositions.find((x) => x.id === v.id)?.rawFileName || ""
    };
    upsert(db.bodyCompositions, record);
    state.currentPatientId = record.patientId;
    state.view = "detail";
    state.detailTab = "body";
    closeModal();
    saveDb();
    render();
    toast("체성분 기록을 저장했습니다.");
  }

  function openBodyImportModal(patientId) {
    state.csvPreviewRows = [];
    const patientOptions = db.patients.map((p) => option(p.id, `${p.name} · ${p.chartNo}`, patientId || state.currentPatientId)).join("");
    openModal("체성분 CSV 가져오기", `
      <div class="stack">
        <div class="callout">CSV 헤더 예시: name, phone, measuredAt, weight, bodyFatRate, skeletalMuscle, bmi, visceralFatLevel, waist, bmr. 환자는 name 또는 phone으로 매칭합니다. 특정 환자를 선택하면 CSV에 이름이 없어도 해당 환자에게 저장됩니다.</div>
        <div class="form-grid">
          <div class="field"><label>기본 환자</label><select class="select" id="csv-default-patient"><option value="">CSV 값으로 매칭</option>${patientOptions}</select></div>
          <div class="field"><label>CSV 파일</label><input class="input" id="csv-file" type="file" accept=".csv,text/csv" /></div>
        </div>
        <div class="field">
          <label>CSV 내용</label>
          <textarea class="textarea" id="csv-text" rows="10" placeholder="CSV 파일을 선택하거나 내용을 붙여넣으세요."></textarea>
        </div>
        <div class="row">
          <button class="btn secondary" data-action="sample-csv">샘플 채우기</button>
          <button class="btn tonal" data-action="preview-csv">미리보기</button>
        </div>
        <div id="csv-preview">${empty("CSV 미리보기를 실행하세요.")}</div>
        <div class="modal-foot" style="margin:0 -20px -20px">
          <button class="btn ghost" data-action="close-modal">닫기</button>
          <button class="btn primary" data-action="confirm-csv">가져오기</button>
        </div>
      </div>
    `, { wide: true, noFoot: true });
  }

  function fillSampleCsv() {
    const target = document.getElementById("csv-text");
    if (!target) return;
    target.value = [
      "name,phone,measuredAt,weight,bodyFatRate,skeletalMuscle,bmi,visceralFatLevel,waist,bmr",
      "샘플환자 A,000-0000-0001,2026-05-12,63.7,29.8,22.5,24.0,8,76,1364",
      "샘플환자 B,000-0000-0002,2026-05-16,66.8,33.1,21.9,24.2,9,81,1330"
    ].join("\n");
    previewCsvImport();
  }

  function previewCsvImport() {
    const text = document.getElementById("csv-text")?.value || "";
    const defaultPatientId = document.getElementById("csv-default-patient")?.value || "";
    const rows = parseBodyCsv(text, defaultPatientId);
    state.csvPreviewRows = rows;
    const root = document.getElementById("csv-preview");
    if (!root) return;
    root.innerHTML = rows.length ? `
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>상태</th><th>환자</th><th>측정일</th><th>체중</th><th>체지방률</th><th>근육량</th><th>메시지</th></tr></thead>
            <tbody>${rows.map((r) => `<tr>
              <td>${r.patientId && !r.error ? badge("가능", "green") : badge("확인필요", "red")}</td>
              <td>${esc(getPatient(r.patientId)?.name || r.name || "-")}</td>
              <td>${esc(r.measuredAt || "-")}</td>
              <td>${esc(r.weight || "-")}</td>
              <td>${esc(r.bodyFatRate || "-")}</td>
              <td>${esc(r.skeletalMuscle || "-")}</td>
              <td>${esc(r.error || "")}</td>
            </tr>`).join("")}</tbody>
          </table>
        </div>
      </div>
    ` : empty("가져올 행이 없습니다.");
  }

  function confirmCsvImport() {
    if (!state.csvPreviewRows.length) previewCsvImport();
    const valid = state.csvPreviewRows.filter((r) => r.patientId && !r.error);
    if (!valid.length) return toast("저장 가능한 CSV 행이 없습니다.");
    valid.forEach((r) => {
      const existing = db.bodyCompositions.find((b) => b.patientId === r.patientId && b.measuredAt === r.measuredAt);
      const record = {
        id: existing?.id || uid("bc"),
        patientId: r.patientId,
        visitId: "",
        measuredAt: r.measuredAt,
        weight: toNumber(r.weight),
        bodyFatRate: toNumber(r.bodyFatRate),
        skeletalMuscle: toNumber(r.skeletalMuscle),
        bmi: toNumber(r.bmi),
        visceralFatLevel: toNumber(r.visceralFatLevel),
        waist: toNumber(r.waist),
        bmr: toNumber(r.bmr),
        source: "CSV 가져오기",
        deviceName: r.deviceName || "InBody/체성분계",
        rawFileName: document.getElementById("csv-file")?.files?.[0]?.name || ""
      };
      upsert(db.bodyCompositions, record);
    });
    closeModal();
    saveDb();
    state.view = "detail";
    state.detailTab = "body";
    state.currentPatientId = valid[0].patientId;
    render();
    toast(`${valid.length}건의 체성분 기록을 가져왔습니다.`);
  }

  function openReportModal(id, patientId) {
    const report = id ? db.reports.find((r) => r.id === id) : null;
    const selectedPatientId = report?.patientId || patientId || state.reportPatientId || state.currentPatientId || db.patients[0]?.id;
    const patient = getPatient(selectedPatientId);
    const bodies = bodiesFor(selectedPatientId);
    const r = report || {
      id: "",
      patientId: selectedPatientId,
      type: "경과 리포트",
      status: "draft",
      title: `${patient?.name || ""} 감량 경과 리포트`,
      periodStart: bodies[0]?.measuredAt || patient?.createdAt || todayISO(),
      periodEnd: bodies[bodies.length - 1]?.measuredAt || todayISO(),
      doctorComment: autoReportComment(selectedPatientId),
      issuedAt: ""
    };
    openModal(report ? "리포트 수정" : "리포트 저장", `
      <form data-form="report" class="stack">
        <input type="hidden" name="id" value="${esc(r.id)}" />
        <div class="form-grid">
          ${selectField("환자", "patientId", r.patientId, db.patients.map((p) => [p.id, `${p.name} · ${p.chartNo}`]))}
          ${selectField("유형", "type", r.type, [["초진 리포트", "초진 리포트"], ["경과 리포트", "경과 리포트"], ["정체기 리포트", "정체기 리포트"], ["종결 리포트", "종결 리포트"]])}
          ${field("제목", "title", r.title, "text", true)}
          ${selectField("상태", "status", r.status, [["draft", "초안"], ["issued", "발행"], ["revoked", "철회"]])}
          ${field("기간 시작", "periodStart", r.periodStart, "date")}
          ${field("기간 종료", "periodEnd", r.periodEnd, "date")}
          ${textareaField("원장 코멘트", "doctorComment", r.doctorComment, "환자에게 보일 해석", "wide")}
        </div>
        <div class="callout">리포트는 체성분과 방문기록을 자동 요약하지만, 발행 전 원장 코멘트 확인이 필요합니다.</div>
        ${modalActions(report ? "저장" : "저장")}
      </form>
    `);
  }

  function saveReportForm(form) {
    const v = formValues(form);
    if (!v.patientId || !v.title) return toast("환자와 제목은 필수입니다.");
    const record = {
      id: v.id || uid("r"),
      patientId: v.patientId,
      type: v.type,
      status: v.status,
      title: v.title,
      periodStart: v.periodStart,
      periodEnd: v.periodEnd,
      doctorComment: v.doctorComment,
      issuedAt: v.status === "issued" ? todayISO() : "",
      createdAt: db.reports.find((x) => x.id === v.id)?.createdAt || todayISO()
    };
    upsert(db.reports, record);
    state.currentPatientId = record.patientId;
    state.reportPatientId = record.patientId;
    closeModal();
    saveDb();
    render();
    toast("리포트를 저장했습니다.");
  }

  function openReportPreviewModal(id) {
    const report = db.reports.find((r) => r.id === id);
    const patient = report ? getPatient(report.patientId) : null;
    if (!report || !patient) return;
    openModal("리포트 미리보기", renderReportPreview(patient, report), { wide: true, noFoot: false });
  }

  function openPhotoModal(patientId) {
    openModal("사진 추가", `
      <form data-form="photo" class="stack">
        <input type="hidden" name="patientId" value="${esc(patientId || state.currentPatientId)}" />
        <div class="form-grid">
          ${field("촬영일", "date", todayISO(), "date", true)}
          ${selectField("구분", "type", "전면", [["전면", "전면"], ["측면", "측면"], ["후면", "후면"], ["복부", "복부"], ["기타", "기타"]])}
          <div class="field wide"><label>이미지 파일</label><input class="input" name="photoFile" type="file" accept="image/*" required /></div>
          ${textareaField("메모", "memo", "", "내부 비교용 메모", "wide")}
        </div>
        ${modalActions("저장")}
      </form>
    `);
  }

  async function savePhotoForm(form) {
    const v = formValues(form);
    const file = form.querySelector('input[name="photoFile"]')?.files?.[0];
    if (!v.patientId || !file) return toast("환자와 이미지 파일은 필수입니다.");
    const dataUrl = await readFileAsDataUrl(file);
    db.photos.push({ id: uid("photo"), patientId: v.patientId, date: v.date, type: v.type, memo: v.memo, dataUrl });
    state.currentPatientId = v.patientId;
    state.detailTab = "photos";
    closeModal();
    saveDb();
    render();
    toast("사진을 저장했습니다.");
  }

  function openPaymentModal(id, patientId) {
    const payment = id ? db.payments.find((p) => p.id === id) : null;
    const p = payment || { id: "", patientId: patientId || state.currentPatientId, date: todayISO(), item: "", amount: "", method: "카드", status: "paid" };
    openModal(payment ? "결제 수정" : "결제 추가", `
      <form data-form="payment" class="stack">
        <input type="hidden" name="id" value="${esc(p.id)}" />
        <div class="form-grid">
          ${selectField("환자", "patientId", p.patientId, db.patients.map((x) => [x.id, `${x.name} · ${x.chartNo}`]))}
          ${field("일자", "date", p.date, "date", true)}
          ${field("항목", "item", p.item, "text", true)}
          ${field("금액", "amount", p.amount, "number", true)}
          ${selectField("수단", "method", p.method, [["카드", "카드"], ["현금", "현금"], ["계좌이체", "계좌이체"], ["미기록", "미기록"]])}
          ${selectField("상태", "status", p.status, [["paid", "결제완료"], ["unpaid", "미수"], ["refunded", "환불"]])}
        </div>
        ${modalActions(payment ? "저장" : "등록")}
      </form>
    `);
  }

  function savePaymentForm(form) {
    const v = formValues(form);
    if (!v.patientId || !v.item || !v.amount) return toast("환자, 항목, 금액은 필수입니다.");
    upsert(db.payments, { id: v.id || uid("pay"), patientId: v.patientId, date: v.date, item: v.item, amount: toNumber(v.amount), method: v.method, status: v.status });
    state.currentPatientId = v.patientId;
    state.detailTab = "payments";
    closeModal();
    saveDb();
    render();
    toast("결제 기록을 저장했습니다.");
  }

  function openMessageModal(id, patientId) {
    const message = id ? db.messages.find((m) => m.id === id) : null;
    const patient = getPatient(message?.patientId || patientId || state.currentPatientId);
    const m = message || {
      id: "",
      patientId: patient?.id || "",
      date: todayISO(),
      channel: "LMS",
      template: "리포트 + 재진 안내",
      status: "queued",
      body: `${patient?.name || ""} 님, 경과 리포트와 다음 방문 안내드립니다.`
    };
    openModal(message ? "문자 기록 수정" : "문자 발송 대기 등록", `
      <form data-form="message" class="stack">
        <input type="hidden" name="id" value="${esc(m.id)}" />
        <div class="form-grid">
          ${selectField("환자", "patientId", m.patientId, db.patients.map((p) => [p.id, `${p.name} · ${p.phone}`]))}
          ${field("일자", "date", m.date, "date", true)}
          ${selectField("채널", "channel", m.channel, [["SMS", "SMS"], ["LMS", "LMS"]])}
          ${selectField("템플릿", "template", m.template, [["리포트 + 재진 안내", "리포트 + 재진 안내"], ["다음 방문 안내", "다음 방문 안내"], ["처방 종료 안내", "처방 종료 안내"], ["장기 미방문 안내", "장기 미방문 안내"], ["직접 작성", "직접 작성"]])}
          ${selectField("상태", "status", m.status, [["queued", "발송대기"], ["sent", "발송기록"], ["failed", "실패"], ["canceled", "취소"]])}
          <div></div>
          ${textareaField("본문", "body", m.body, "실제 API 연동 전에는 발송하지 않고 기록만 저장합니다.", "wide")}
        </div>
        <div class="callout warning">현재는 문자 API 미연동 상태입니다. 저장 시 발송 대기/기록만 남습니다.</div>
        ${modalActions(message ? "저장" : "등록")}
      </form>
    `);
  }

  function saveMessageForm(form) {
    const v = formValues(form);
    if (!v.patientId || !v.body) return toast("환자와 본문은 필수입니다.");
    upsert(db.messages, { id: v.id || uid("msg"), patientId: v.patientId, date: v.date, channel: v.channel, template: v.template, status: v.status, body: v.body });
    state.currentPatientId = v.patientId;
    state.detailTab = "messages";
    closeModal();
    saveDb();
    render();
    toast("문자 기록을 저장했습니다.");
  }

  function openAppointmentModal(id) {
    const appt = id ? db.appointments.find((a) => a.id === id) : null;
    const a = appt || { id: "", patientId: state.currentPatientId || db.patients[0]?.id, date: todayISO(), time: "10:00", type: "재진", status: "reserved", memo: "" };
    openModal(appt ? "예약 수정" : "예약 추가", `
      <form data-form="appointment" class="stack">
        <input type="hidden" name="id" value="${esc(a.id)}" />
        <div class="form-grid">
          ${selectField("환자", "patientId", a.patientId, db.patients.map((p) => [p.id, `${p.name} · ${p.phone}`]))}
          ${field("날짜", "date", a.date, "date", true)}
          ${field("시간", "time", a.time, "time", true)}
          ${selectField("유형", "type", a.type, [["초진", "초진"], ["재진", "재진"], ["시술", "시술"], ["재시작 상담", "재시작 상담"]])}
          ${selectField("상태", "status", a.status, [["reserved", "예약"], ["done", "완료"], ["no_show", "노쇼"], ["canceled", "취소"], ["tentative", "미확정"]])}
          ${field("메모", "memo", a.memo)}
        </div>
        <div class="modal-foot" style="margin:0 -20px -20px">
          ${appt ? `<button class="btn danger" data-action="delete-appointment" data-id="${a.id}">삭제</button>` : ""}
          <div class="spacer"></div>
          <button type="button" class="btn ghost" data-action="close-modal">취소</button>
          <button class="btn primary" type="submit">${appt ? "저장" : "등록"}</button>
        </div>
      </form>
    `, { noFoot: true });
  }

  function saveAppointmentForm(form) {
    const v = formValues(form);
    if (!v.patientId || !v.date || !v.time) return toast("환자, 날짜, 시간은 필수입니다.");
    upsert(db.appointments, { id: v.id || uid("appt"), patientId: v.patientId, date: v.date, time: v.time, type: v.type, status: v.status, memo: v.memo });
    state.currentPatientId = v.patientId;
    closeModal();
    saveDb();
    render();
    toast("예약을 저장했습니다.");
  }

  function openModal(title, body, options = {}) {
    document.getElementById("modal-root").innerHTML = `
      <div class="modal-scrim" role="dialog" aria-modal="true">
        <div class="modal ${options.wide ? "wide" : ""}">
          <div class="modal-head">
            <div class="modal-title">${esc(title)}</div>
            <div class="spacer"></div>
            <button class="btn small ghost" data-action="close-modal">닫기</button>
          </div>
          <div class="modal-body">${body}</div>
          ${options.noFoot || body.includes('class="modal-foot"') ? "" : `<div class="modal-foot"><button class="btn ghost" data-action="close-modal">닫기</button></div>`}
        </div>
      </div>
    `;
  }

  function closeModal() {
    document.getElementById("modal-root").innerHTML = "";
  }

  function modalActions(label) {
    return `<div class="modal-foot" style="margin:0 -20px -20px"><button type="button" class="btn ghost" data-action="close-modal">취소</button><button class="btn primary" type="submit">${esc(label)}</button></div>`;
  }

  function buildCareQueue(onlyPatientId) {
    const today = todayISO();
    const patients = onlyPatientId ? db.patients.filter((p) => p.id === onlyPatientId) : db.patients;
    const out = [];
    patients.forEach((p) => {
      const last = latestVisit(p.id);
      if (last) {
        const lastGap = daysBetween(last.date, today);
        if (last.nextVisitDate) {
          const dueGap = daysBetween(today, last.nextVisitDate);
          if (dueGap <= 3 && dueGap >= -10) out.push(queueItem(p.id, "다음 방문", dueGap < 0 ? `${Math.abs(dueGap)}일 지남` : `D-${dueGap}`, "amber", "new-message", "문자"));
        }
        if (lastGap >= 30) out.push(queueItem(p.id, "이탈위험", `마지막 방문 ${lastGap}일 전`, lastGap >= 60 ? "red" : "amber", "new-message", "문자"));
        if (last.herbName && last.prescriptionDays) {
          const endDate = addDays(last.date, Number(last.prescriptionDays));
          const endGap = daysBetween(today, endDate);
          if (endGap <= 3 && endGap >= -10) out.push(queueItem(p.id, "처방 종료", endGap < 0 ? `종료 ${Math.abs(endGap)}일 지남` : `종료 D-${endGap}`, "red", "new-message", "문자"));
        }
      }
      if (needsReport(p.id)) out.push(queueItem(p.id, "리포트", "체성분/방문 기록 업데이트 후 리포트 미발행", "blue", "new-report", "리포트"));
    });
    return out;
  }

  function queueItem(patientId, type, reason, badgeColor, action, actionLabel) {
    return { patientId, type, reason, badge: badgeColor, action, actionLabel };
  }

  function renderQueueRow(q) {
    const p = getPatient(q.patientId);
    return `<tr>
      <td>${patientLabel(p)}</td>
      <td>${badge(q.type, q.badge)}</td>
      <td>${esc(q.reason)}</td>
      <td><button class="btn small secondary" data-action="open-patient" data-id="${q.patientId}">상세</button><button class="btn small tonal" data-action="${q.action}" data-patient-id="${q.patientId}">${q.actionLabel}</button></td>
    </tr>`;
  }

  function needsReport(patientId) {
    const bodies = bodiesFor(patientId);
    if (!bodies.length) return false;
    const latestBodyDate = bodies[bodies.length - 1].measuredAt;
    const latestReport = reportsFor(patientId).filter((r) => r.status !== "revoked").sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
    return !latestReport || latestReport.periodEnd < latestBodyDate;
  }

  function getNavCounts() {
    return {
      dashboard: buildCareQueue().length,
      reports: db.patients.filter((p) => needsReport(p.id)).length,
      retention: buildCareQueue().filter((q) => q.type !== "리포트").length,
      calendar: db.appointments.filter((a) => a.date === todayISO()).length
    };
  }

  function parseBodyCsv(text, defaultPatientId) {
    const rows = parseCsv(text);
    return rows.map((row) => {
      const normalized = {};
      Object.entries(row).forEach(([key, value]) => normalized[normalizeHeader(key)] = value);
      const phone = cleanPhone(normalized.phone || normalized.tel || normalized.mobile || normalized["전화번호"]);
      const name = normalized.name || normalized.patient || normalized["환자명"] || normalized["이름"] || "";
      const patient = defaultPatientId ? getPatient(defaultPatientId) : db.patients.find((p) => cleanPhone(p.phone) === phone || p.name === name);
      const measuredAt = normalizeDate(normalized.measuredat || normalized.date || normalized["측정일"] || normalized["검사일"]);
      const record = {
        patientId: patient?.id || "",
        name,
        phone,
        measuredAt,
        weight: normalized.weight || normalized["체중"] || normalized.bodyweight,
        bodyFatRate: normalized.bodyfatrate || normalized.fatpercent || normalized["체지방률"],
        skeletalMuscle: normalized.skeletalmuscle || normalized.muscle || normalized["골격근량"] || normalized["근육량"],
        bmi: normalized.bmi || normalized["bmi"],
        visceralFatLevel: normalized.visceralfatlevel || normalized.visceralfat || normalized["내장지방레벨"] || normalized["내장지방"],
        waist: normalized.waist || normalized["허리둘레"],
        bmr: normalized.bmr || normalized["기초대사량"],
        deviceName: normalized.device || normalized.devicename || normalized["기기명"] || "체성분계"
      };
      if (!record.patientId) record.error = "환자 매칭 실패";
      else if (!record.measuredAt) record.error = "측정일 없음";
      else if (!record.weight) record.error = "체중 없음";
      return record;
    });
  }

  function parseCsv(text) {
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return [];
    const headers = splitCsvLine(lines[0]);
    return lines.slice(1).map((line) => {
      const values = splitCsvLine(line);
      const row = {};
      headers.forEach((header, index) => row[header] = values[index] || "");
      return row;
    });
  }

  function splitCsvLine(line) {
    const cells = [];
    let current = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        quoted = !quoted;
      } else if (ch === "," && !quoted) {
        cells.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  function normalizeHeader(value) {
    return String(value || "").toLowerCase().replace(/\s|_|-|\.|\(|\)|%/g, "");
  }

  function normalizeDate(value) {
    if (!value) return "";
    const text = String(value).trim();
    const match = text.match(/^(\d{4})[./-]?(\d{1,2})[./-]?(\d{1,2})/);
    if (!match) return "";
    return `${match[1]}-${String(match[2]).padStart(2, "0")}-${String(match[3]).padStart(2, "0")}`;
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `renewd-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJsonFile(file) {
    if (!file) return;
    readTextFile(file, (text) => {
      try {
        const imported = normalizeDb(JSON.parse(text));
        Object.keys(db).forEach((key) => delete db[key]);
        Object.assign(db, imported);
        saveDb();
        render();
        toast("백업 데이터를 복원했습니다.");
      } catch (error) {
        toast("JSON 복원에 실패했습니다.");
      }
    });
  }

  function deleteVisit(id) {
    if (!confirm("방문기록을 삭제할까요? 연결된 체성분은 삭제하지 않습니다.")) return;
    db.visits = db.visits.filter((v) => v.id !== id);
    saveDb();
    render();
    toast("방문기록을 삭제했습니다.");
  }

  function deleteRecord(collection, id, message) {
    if (!confirm("삭제할까요?")) return;
    db[collection] = db[collection].filter((x) => x.id !== id);
    saveDb();
    render();
    toast(message);
  }

  function patientMetrics(patientId) {
    const patient = getPatient(patientId);
    const bodies = bodiesFor(patientId);
    const first = bodies[0];
    const latest = bodies[bodies.length - 1];
    const startWeight = first?.weight ?? patient?.startWeight ?? null;
    const latestWeight = latest?.weight ?? null;
    const deltaWeight = startWeight !== null && latestWeight !== null ? round(latestWeight - startWeight) : null;
    const goalRemain = patient?.targetWeight && latestWeight !== null ? round(latestWeight - patient.targetWeight) : null;
    return {
      startWeight,
      latestWeight,
      deltaWeight,
      goalRemain,
      deltaFat: first && latest && first.bodyFatRate !== "" && latest.bodyFatRate !== "" ? round(latest.bodyFatRate - first.bodyFatRate) : null,
      deltaMuscle: first && latest && first.skeletalMuscle !== "" && latest.skeletalMuscle !== "" ? round(latest.skeletalMuscle - first.skeletalMuscle) : null
    };
  }

  function autoReportComment(patientId) {
    const patient = getPatient(patientId);
    const metrics = patientMetrics(patientId);
    if (!patient) return "";
    if (metrics.deltaWeight === null) return "체성분 기록이 부족합니다. 다음 방문에서 체성분을 측정한 뒤 리포트를 보완하세요.";
    const direction = metrics.deltaWeight < 0 ? "감량이 진행 중입니다" : "체중 변화가 크지 않습니다";
    return `${patient.name} 님은 시작 대비 ${fmtSigned(metrics.deltaWeight)}kg 변화가 확인되어 ${direction}. 다음 방문에서는 체성분 변화와 복약 반응을 함께 확인하고, 무리한 감량보다 안전한 지속 관리를 우선합니다.`;
  }

  function renderWeightChart(bodies) {
    const data = bodies.filter((b) => b.weight !== "" && b.weight !== null).sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
    if (!data.length) return `<div class="chart">${empty("체성분 데이터가 없습니다.")}</div>`;
    const width = 720;
    const height = 260;
    const pad = { l: 44, r: 22, t: 24, b: 38 };
    const weights = data.map((d) => Number(d.weight));
    const min = Math.floor(Math.min(...weights) - 2);
    const max = Math.ceil(Math.max(...weights) + 2);
    const x = (i) => pad.l + (width - pad.l - pad.r) * (data.length === 1 ? 0.5 : i / (data.length - 1));
    const y = (value) => pad.t + (height - pad.t - pad.b) * (1 - (value - min) / Math.max(1, max - min));
    const path = data.map((d, i) => `${i ? "L" : "M"}${x(i)} ${y(d.weight)}`).join(" ");
    const area = `${path} L${x(data.length - 1)} ${height - pad.b} L${x(0)} ${height - pad.b} Z`;
    const grid = [min, Math.round((min + max) / 2), max].map((v) => `<line x1="${pad.l}" y1="${y(v)}" x2="${width - pad.r}" y2="${y(v)}" stroke="#E9ECEF" stroke-dasharray="3 3"/><text x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#868E96">${v}</text>`).join("");
    const points = data.map((d, i) => `<circle cx="${x(i)}" cy="${y(d.weight)}" r="4" fill="#fff" stroke="#2563EB" stroke-width="2"/><text x="${x(i)}" y="${y(d.weight) - 10}" text-anchor="middle" font-size="11" font-weight="700">${num(d.weight)}</text><text x="${x(i)}" y="${height - 12}" text-anchor="middle" font-size="10" fill="#868E96">${shortDate(d.measuredAt)}</text>`).join("");
    return `<div class="chart"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><defs><linearGradient id="weightArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3B82F6" stop-opacity="0.18"/><stop offset="100%" stop-color="#3B82F6" stop-opacity="0"/></linearGradient></defs>${grid}<path d="${area}" fill="url(#weightArea)"/><path d="${path}" fill="none" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${points}</svg></div>`;
  }

  function renderPatientDeltaBars() {
    const rows = db.patients.map((p) => ({ p, m: patientMetrics(p.id) })).filter((x) => x.m.deltaWeight !== null);
    if (!rows.length) return empty("체성분 데이터가 없습니다.");
    const max = Math.max(...rows.map((x) => Math.abs(x.m.deltaWeight)), 1);
    return rows.map(({ p, m }) => {
      const width = Math.round(Math.abs(m.deltaWeight) / max * 100);
      const color = m.deltaWeight <= 0 ? "var(--green-600)" : "var(--red-600)";
      return `<div style="margin:10px 0">
        <div class="row"><div class="strong" style="width:80px">${esc(p.name)}</div><div class="spacer"></div><span>${fmtSigned(m.deltaWeight)}kg</span></div>
        <div style="height:10px;background:var(--gray-200);border-radius:999px;overflow:hidden"><span style="display:block;height:100%;width:${width}%;background:${color}"></span></div>
      </div>`;
    }).join("");
  }

  function getPatient(id) { return db.patients.find((p) => p.id === id); }
  function currentPatient() { return getPatient(state.currentPatientId); }
  function visitsFor(patientId) { return db.visits.filter((v) => v.patientId === patientId).sort((a, b) => a.date.localeCompare(b.date)); }
  function bodiesFor(patientId) { return db.bodyCompositions.filter((b) => b.patientId === patientId).sort((a, b) => a.measuredAt.localeCompare(b.measuredAt)); }
  function reportsFor(patientId) { return db.reports.filter((r) => r.patientId === patientId); }
  function paymentsFor(patientId) { return db.payments.filter((p) => p.patientId === patientId); }
  function photosFor(patientId) { return db.photos.filter((p) => p.patientId === patientId); }
  function messagesFor(patientId) { return db.messages.filter((m) => m.patientId === patientId); }
  function latestVisit(patientId) { return visitsFor(patientId).slice(-1)[0]; }
  function latestDateForPatient(patientId) { return latestVisit(patientId)?.date || getPatient(patientId)?.createdAt || ""; }
  function nextVisitDate(patientId) { return latestVisit(patientId)?.nextVisitDate || ""; }

  function upsert(collection, record) {
    const index = collection.findIndex((item) => item.id === record.id);
    if (index >= 0) collection[index] = record;
    else collection.push(record);
  }

  function formValues(form) {
    const data = {};
    new FormData(form).forEach((value, key) => {
      if (data[key] !== undefined) data[key] = Array.isArray(data[key]) ? [...data[key], value] : [data[key], value];
      else data[key] = value;
    });
    form.querySelectorAll('input[type="checkbox"]').forEach((input) => data[input.name] = input.checked);
    return data;
  }

  function field(label, name, value = "", type = "text", required = false, placeholder = "") {
    return `<div class="field"><label>${esc(label)}${required ? " *" : ""}</label><input class="input" name="${esc(name)}" type="${type}" value="${esc(value ?? "")}" placeholder="${esc(placeholder)}" ${required ? "required" : ""} ${type === "number" ? 'step="0.1"' : ""}/></div>`;
  }

  function textareaField(label, name, value = "", placeholder = "", extraClass = "") {
    return `<div class="field ${extraClass}"><label>${esc(label)}</label><textarea class="textarea" name="${esc(name)}" rows="3" placeholder="${esc(placeholder)}">${esc(value ?? "")}</textarea></div>`;
  }

  function selectField(label, name, value, options) {
    return `<div class="field"><label>${esc(label)}</label><select class="select" name="${esc(name)}">${options.map(([v, text]) => option(v, text, value)).join("")}</select></div>`;
  }

  function checkField(label, name, checked) {
    return `<label class="row" style="align-items:center"><input type="checkbox" name="${esc(name)}" ${checked ? "checked" : ""}/> <span class="strong">${esc(label)}</span></label>`;
  }

  function option(value, label, selected) {
    return `<option value="${esc(value)}" ${String(value) === String(selected) ? "selected" : ""}>${esc(label)}</option>`;
  }

  function kpi(label, value, unit, note) {
    return `<div class="card kpi"><div class="kpi-label">${esc(label)}</div><div class="kpi-value">${esc(value)}<span style="font-size:14px;color:var(--gray-600);font-weight:800">${esc(unit)}</span></div><div class="kpi-note">${esc(note)}</div></div>`;
  }

  function metric(label, value, note) {
    return `<div class="metric"><div class="metric-label">${esc(label)}</div><div class="metric-value">${esc(value)}</div><div class="metric-note">${esc(note || "")}</div></div>`;
  }

  function infoLine(label, value) {
    return `<div class="row"><div class="muted" style="width:90px">${esc(label)}</div><div class="strong">${esc(value)}</div></div>`;
  }

  function patientLabel(patient) {
    if (!patient) return "-";
    return `<div class="row"><div class="avatar small">${esc(patient.name[0] || "?")}</div><div><div class="strong">${esc(patient.name)}</div><div class="muted" style="font-size:12px">${esc(patient.phone)} · ${esc(patient.chartNo)}</div></div></div>`;
  }

  function renderAppointmentLine(a) {
    const p = getPatient(a.patientId);
    return `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--gray-200)">
      <div class="strong" style="width:54px">${esc(a.time)}</div>
      <div><div class="strong">${esc(p?.name || "-")}</div><div class="muted" style="font-size:12px">${esc(a.type)} · ${esc(a.memo || "")}</div></div>
      <div class="spacer"></div>${statusBadge(a.status)}
      <button class="btn small secondary" data-action="edit-appointment" data-id="${a.id}">수정</button>
    </div>`;
  }

  function statusBadge(value) {
    const map = {
      new: ["신규", "blue"],
      active: ["진행중", "green"],
      retention_risk: ["이탈위험", "amber"],
      closed: ["종료", ""],
      paid: ["결제완료", "green"],
      unpaid: ["미수", "red"],
      refunded: ["환불", ""],
      queued: ["발송대기", "amber"],
      sent: ["발송기록", "green"],
      failed: ["실패", "red"],
      canceled: ["취소", ""],
      reserved: ["예약", "blue"],
      done: ["완료", "green"],
      no_show: ["노쇼", "red"],
      tentative: ["미확정", "amber"]
    };
    const item = map[value] || [value || "-", ""];
    return badge(item[0], item[1]);
  }

  function badge(text, color = "") {
    return `<span class="badge ${color}">${esc(text)}</span>`;
  }

  function empty(text) {
    return `<div class="empty">${esc(text)}</div>`;
  }

  function emptyPage(text) {
    return `<div class="card"><div class="card-body">${empty(text)}</div></div>`;
  }

  function toast(message) {
    const root = document.getElementById("toast-root");
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  function toNumber(value) {
    if (value === "" || value === null || value === undefined) return "";
    const n = Number(String(value).replace(/,/g, ""));
    return Number.isFinite(n) ? n : "";
  }

  function num(value) {
    if (value === "" || value === null || value === undefined) return "-";
    return Number(value).toLocaleString(DATE_LOCALE, { maximumFractionDigits: 1 });
  }

  function money(value) {
    return `${Number(value || 0).toLocaleString(DATE_LOCALE)}원`;
  }

  function round(value) {
    return Math.round(Number(value) * 10) / 10;
  }

  function fmtSigned(value) {
    if (value === null || value === undefined || value === "") return "-";
    return `${value > 0 ? "+" : ""}${num(value)}`;
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(DATE_LOCALE, { year: "numeric", month: "2-digit", day: "2-digit" });
  }

  function shortDate(value) {
    if (!value) return "";
    const [, m, d] = value.match(/^\d{4}-(\d{2})-(\d{2})/) || [];
    return m && d ? `${Number(m)}/${Number(d)}` : value;
  }

  function todayISO() {
    return "2026-05-12";
  }

  function addDays(dateStr, days) {
    const date = new Date(`${dateStr}T00:00:00`);
    date.setDate(date.getDate() + Number(days || 0));
    return date.toISOString().slice(0, 10);
  }

  function daysBetween(from, to) {
    const a = new Date(`${from}T00:00:00`);
    const b = new Date(`${to}T00:00:00`);
    return Math.round((b - a) / 86400000);
  }

  function age(birth) {
    if (!birth) return "-";
    const year = Number(birth.slice(0, 4));
    return Number.isFinite(year) ? 2026 - year : "-";
  }

  function byDateTime(a, b) {
    return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
  }

  function calendarCells(year, month) {
    const first = new Date(year, month - 1, 1);
    const startDay = first.getDay();
    const days = new Date(year, month, 0).getDate();
    const prevDays = new Date(year, month - 1, 0).getDate();
    const cells = [];
    for (let i = startDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, off: true });
    for (let day = 1; day <= days; day++) cells.push({ day, off: false });
    let next = 1;
    while (cells.length % 7) cells.push({ day: next++, off: true });
    return cells;
  }

  function nextChartNo() {
    const next = db.patients.length + 1;
    return `C-2026-${String(next).padStart(4, "0")}`;
  }

  function cleanPhone(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function readTextFile(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => callback(String(reader.result || ""));
    reader.readAsText(file, "utf-8");
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
})();
