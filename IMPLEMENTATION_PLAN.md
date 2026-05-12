# 다이어트 전문 한의원 환자관리·리포트 시스템 구현계획

> 코드네임: **Renewd** (가칭) — 한의사가 직접 쓰는 다이어트 한의원 진료·리텐션·환자 리포트 SaaS

---

## 0. 실사용 가능성 진단

현재 기획은 환자 등록, 방문기록, 재방문 알림, 예약, 통계의 뼈대가 있어 **다이어트 한의원용 CRM 목업으로는 활용 가능**하다. 다만 실제 한의원이 돈을 내고 계속 쓸 시스템이 되려면 다음 보완이 필요하다.

| 영역 | 현재 상태 | 실사용 보완 방향 |
|---|---|---|
| 핵심 사용자 | 원장·실장 분리 전제 | **한의사 1인이 진료, 처방, 메시지, 리포트까지 처리**하는 워크벤치 중심 |
| 진료 기록 | 처치·처방·체성분 중심 | SOAP, 변증, 맥·설·복진, 식욕·야식·배변·부종, 금기·주의 체크 추가 |
| 리텐션 | 문자 발송 중심 | 환자 상태별 다음 액션 추천, SMS/LMS 문자, 콜 결과, 예약 전환, 리포트 발송 연동 |
| 환자 가치 | 내부 관리 화면 위주 | 인바디 검사지처럼 환자에게 전달 가능한 **시각 리포트 발행** 필요 |
| 안전성 | 특이사항 메모 수준 | 복용약, 기저질환, 임신·수유, 혈압, 이상반응, 체중 급변 경고 |
| 증거성 | 자유 텍스트 위주 | 데이터 출처, 측정일, 수정 이력, 서명, 리포트 버전 관리 |
| 운영성 | 예약·매출 기본 | 패키지 잔여, 상담 전환, 처방 종료, 재구매 타이밍, 마케팅 동의 분리 |

결론: 단순 CRM이 아니라 **"한의사 진료 운영 OS + 환자 리포트 엔진"**으로 잡아야 실제 사용성이 생긴다.

---

## 1. 제품 원칙

### 1.1 목적

다이어트 전문 한의원에서 한의사가 환자별 감량 과정, 처방, 시술, 생활관리, 재방문 메시지를 한 화면에서 관리하고, 환자에게는 신뢰 가능한 경과 리포트를 제공한다.

### 1.2 핵심 가설

- 다이어트 한의원의 재방문은 "다음 방문을 기억시키는 것"뿐 아니라 **환자가 변화 근거를 납득하는 것**에서 발생한다.
- 한의사는 실장처럼 많은 사람에게 연락해야 하지만, 메시지의 내용은 단순 영업 문구가 아니라 **진료 판단과 다음 계획**을 반영해야 한다.
- 환자 리포트는 체중 변화보다 더 넓게, 체성분·증상·생활지표·한의학적 평가·처방 계획을 시각화해야 한다.

### 1.3 사용자

- **주 사용자: 한의사/원장 겸 운영자** — 진료, 처방, 고객관리 메시지, 리포트 발행, 운영 지표 확인
- **보조 사용자: 코디네이터/데스크** — 접수, 예약, 결제, 동의서, 단순 안내 발송
- **수신 사용자: 환자** — SMS/LMS 문자, 보안 링크, PDF 리포트, 다음 방문 안내 수신

### 1.4 안전 원칙

- 시스템의 자동 문구와 인사이트는 **진료 보조**이며, 최종 진단·처방·리포트 발행은 한의사가 승인한다.
- 리포트에는 데이터 출처, 측정일, 담당 한의사, 주의사항, 다음 내원 계획을 남긴다.
- 민감정보, 사진, 리포트 공유, 마케팅 수신은 목적별로 분리 동의한다.

---

## 2. 핵심 기능 (Must-Have)

### 2.1 환자 등록 및 초진 문진

- 기본정보: 이름, 전화번호, 생년월일, 성별, 직업, 가입경로
- 신체정보: 키, 시작 체중, 목표 체중, 허리둘레, 최근 3개월 체중 변화
- 금기·주의: 알러지, 복용약, 기저질환, 임신·수유, 혈압, 심혈관 병력, 정신건강 관련 복약, 당뇨·갑상선 질환
- 생활문진: 식욕, 야식, 폭식, 배변, 월경, 부종, 냉증, 스트레스
- 동의항목: 진료기록, 민감정보, SMS/LMS 문자, 리포트 전송, 사진 촬영, 마케팅 활용
- 초진 체크리스트: 처방 전 확인 누락, 고위험 환자 알림, 추가 문진 필요 여부

### 2.2 한의사 워크벤치

한의사가 출근 후 바로 보는 첫 화면이다.

- 오늘 예약·초진·재진·시술 큐
- 오늘 메시지 발송 필요 환자
- 처방 종료·다음 방문·이탈 위험 통합 알림
- 리포트 발행 대기 환자
- 고위험/주의 환자: 체중 급변, 혈압, 복약 충돌 가능성, 이상반응 메모
- 환자 검색 후 즉시 액션: 방문기록, 문자 발송, 리포트 발행, 예약 잡기

### 2.3 방문 기록 작성

방문 1건은 `Visit` 엔티티로 관리한다. 30~60초 입력을 목표로 하되, 초진과 재진의 입력 밀도를 다르게 한다.

- 방문일, 차트번호, 담당 한의사
- SOAP: Subjective, Objective, Assessment, Plan
- 한의학 평가: 변증, 맥진, 설진, 복진, 한열, 담음/습담, 기허/혈허, 간울, 비위 상태
- 의학적 체크: 혈압, 복용약 변경, 이상반응, 금기 신호
- 처치: 침, 약침, 부항, 매선, 카복시, 전기자극, 체외충격파 등
- 처방한약: 제형, 일수, 복용법, 복약 주의, 복약 시작일, 중단 기준
- 체성분: 체중, 체지방률, 골격근량, BMI, 내장지방, 허리둘레, 기초대사량
- 기기 데이터: 체성분 측정기 CSV/PDF 원본값, 수동 입력값, 측정일, 기기명
- 비용, 결제수단, 패키지 차감
- 다음 방문 예정일, 다음 리포트 발행 예정일

### 2.4 재방문·처방 종료 알림

| 트랙 | 트리거 | 기본 액션 |
|---|---|---|
| 다음 방문 D-day | 방문기록의 다음 방문 예정일 기준 D-3, D-1, D-day | SMS/LMS, 예약 링크, 통화 메모 |
| 처방 종료 | 처방 일수 + 복용 시작일 기준 종료 3일 전 | 복약 확인, 재진 권유, 이상반응 질문 |
| 감량 정체 | 2~3회 방문 동안 체중·체지방 변화 미흡 | 리포트 발행, 생활관리 상담 |
| 이탈 위험 | 마지막 방문 30~60일 | 상태별 메시지, 콜 결과, 스누즈 |
| 장기 미방 | 마지막 방문 60일 초과 | 재시작 캠페인, 수신거부/종료 처리 |

알림 액션:

- SMS/LMS 문자 발송
- 통화 메모: 예약확정, 추후연락, 거절, 수신거부, 재처방 문의
- 스누즈: 3일, 7일, 다음 생리 후, 출장 후, 환자 요청일
- 액션 결과에 따른 다음 알림 자동 생성

### 2.5 SMS/LMS 문자 발송

이 제품의 기본 발송 채널은 **SMS/LMS 문자**로 잡는다.

- 무료 발송 API가 아니라 문자 중계사에 건당 비용을 지불한다.
- 시스템 연동은 SOLAPI, NHN Cloud Notification, Naver Cloud SENS, Aligo, Bizppurio 같은 문자 발송 사업자 중 하나를 선택한다.
- 한의원 대표번호 또는 휴대폰 번호를 발신번호로 사전 등록하고, 통신서비스 이용증명원 등 증빙을 제출한다.
- 짧은 예약 안내는 SMS, 리포트 링크와 설명 문구는 LMS로 자동 분기한다.
- 진료 관련 정보성 안내와 마케팅 문자를 분리한다.
- 광고성·이벤트성 문자는 사전 수신동의, `(광고)` 표시, 무료 수신거부(080 등) 문구가 필요하다.
- 진료 예약, 처방 종료, 리포트 발행 안내처럼 환자 진료 흐름에 직접 필요한 문자는 정보성 안내로 분류하되, 문구에 할인·이벤트·구매 유도 표현을 섞지 않는다.
- 2026-05 확인 기준 예시 단가: SOLAPI는 월 기본료/API 사용료 없이 건당 과금이며 SMS 18원, LMS 45원, MMS 110원(VAT 별도)을 공지하고 있다. 실제 단가는 발송량, 계약, 사업자에 따라 달라진다.

### 2.6 환자용 리포트 발행

인바디 검사지처럼 환자에게 전달 가능한 A4/PDF/보안 링크 리포트를 발행한다. 단, 체성분만 보여주는 것이 아니라 한의학적·의학적·의공학적 지표를 함께 해석한다.

#### 리포트 구성

1. **요약**
   - 시작 대비 체중, 체지방률, 근육량, 허리둘레 변화
   - 목표 달성률, 최근 감량 속도, 다음 목표
2. **체성분 추이**
   - 체중, 체지방률, 골격근량, BMI, 내장지방, 기초대사량
   - 측정 오차 가능성, 동일 조건 측정 여부
3. **한의학적 평가**
   - 선택형 변증: 습담, 비위허약, 간울, 기허, 혈허, 어혈, 한열 불균형 등
   - 증상 스코어: 식욕, 야식, 부종, 냉증, 배변, 스트레스
   - 한의사가 직접 승인한 해석 문구
4. **의학적·안전 체크**
   - 복용약, 혈압, 월경·임신 가능성, 갑상선/당뇨/심혈관 관련 주의
   - 이상반응 및 복약 중단 기준
5. **의공학·생활 데이터**
   - 체성분 기기 원본값
   - 체성분계 CSV/PDF 원본, 환자 식이 메모, 한의사 관찰 기록
   - 데이터 품질 표시: 직접 측정, 환자 입력, 외부 기기, 추정값
6. **처방·시술 계획**
   - 이번 처방/시술, 기대 관찰 지표, 다음 내원 전 체크할 것
   - 생활관리 미션: 식사, 수분, 음주, 야식 빈도
7. **다음 방문 안내**
   - 다음 내원 권장일, 예약 상태, 알림 예정일

#### 리포트 발행 정책

- 초진 리포트, 2~4주 경과 리포트, 정체기 리포트, 종결 리포트 템플릿 제공
- 리포트는 한의사 승인 후 발행하며 수정 이력을 남긴다.
- 환자용 리포트는 진단서가 아니며, 진료기록과 연결된 설명 자료로 관리한다.
- PDF 다운로드, 프린트, 보안 링크, SMS/LMS 문자 전송을 지원한다.
- 마케팅 활용 가능한 전후 사진·후기와 환자 개인 리포트는 분리 관리한다.

### 2.7 환자 목록 및 상세

- 검색: 이름, 전화번호, 차트번호, 태그
- 상태 필터: 신규, 진행중, 리포트 대기, 이탈위험, 장기미방, 종료
- 정렬: 최근 방문순, 다음 액션 임박순, 감량률순, 누적 결제순
- 환자 상세 탭:
  1. 개요
  2. 방문 이력
  3. 체성분·증상 추이
  4. 리포트
  5. 사진
  6. 처방·시술
  7. 결제
  8. 메시지 이력

### 2.8 예약·패키지·결제

- 월/주/일 예약 캘린더
- 초진/재진/시술별 기본 소요시간
- 노쇼·취소·완료 상태
- 패키지 잔여 회차, 만료일, 자동 차감
- 결제 내역, 미수금, 재결제 필요 알림

---

## 3. 데이터 모델 (요약)

```text
User
 ├─ id, name, role(doctor | coordinator | admin)
 ├─ licenseNo(optional), clinicId
 └─ notificationPrefs

Patient
 ├─ id, chartNo, name, phone, birth, gender, occupation, source
 ├─ height, startWeight, targetWeight, waist, goalMemo
 ├─ status(new | active | report_due | retention_risk | dormant | closed)
 ├─ tags[], primaryDoctorId
 ├─ consents{privacy, sensitive, alimtalk, reportLink, photo, marketing}
 └─ createdAt, updatedAt

ClinicalProfile
 ├─ patientId
 ├─ allergies[], medications[], conditions[]
 ├─ pregnancyStatus, lactationStatus, bloodPressureRisk
 ├─ lifestyle{appetite, nightEating, sleep, bowel, edema, coldness, stress, activity}
 └─ safetyFlags[]

Visit
 ├─ id, patientId, visitDate, doctorId, visitType(first | followup)
 ├─ soap{subjective, objective, assessment, plan}
 ├─ koreanAssessmentId, medicalCheckId, bodyCompositionId
 ├─ treatments[], prescriptionId
 ├─ nextVisitDate, nextReportDueDate
 ├─ memo, cost, paymentMethod, packageDeducted
 └─ signedAt, amendedFromVisitId

KoreanMedicineAssessment
 ├─ id, visitId
 ├─ patterns[]  (습담, 비위허약, 간울, 기허, 혈허, 어혈 등)
 ├─ pulse, tongue, abdomen
 ├─ symptomScore{appetite, craving, edema, coldness, sleep, bowel, stress}
 └─ doctorInterpretation

BodyComposition
 ├─ id, visitId, measuredAt, deviceName
 ├─ weight, bodyFatRate, skeletalMuscle, bmi, visceralFat, waist, bmr
 ├─ rawFileUrl(optional), qualityFlag
 └─ source(manual | inbody | wearable | imported)

Prescription
 ├─ id, visitId
 ├─ herbName, formulaMemo, dosage, days, startDate
 ├─ instruction, cautions[], stopCriteria[]
 └─ endDate

Report
 ├─ id, patientId, reportType(first | progress | plateau | final)
 ├─ periodStart, periodEnd, includedVisitIds[]
 ├─ summaryMetrics{}, sections[], charts[]
 ├─ doctorComment, patientMessage
 ├─ status(draft | pending_sign | issued | revoked)
 ├─ issuedBy, issuedAt, version
 └─ delivery{pdfUrl, secureLink, sentAt, channel}

Reminder
 ├─ id, patientId, type(next_visit | prescription_end | report_due | retention | no_show)
 ├─ dueDate, priority, status(open | snoozed | done | dismissed)
 ├─ recommendedAction, note, action(call | sms | lms | report)
 └─ result

MessageLog
 ├─ id, patientId, templateId, channel, body
 ├─ consentSnapshot, sentBy, sentAt
 └─ result(delivered | failed | opted_out)

AuditLog
 ├─ id, actorId, targetType, targetId
 ├─ action, beforeHash, afterHash, ip, userAgent
 └─ createdAt
```

---

## 4. 화면 구성

### 4.1 글로벌 네비게이션

1. 대시보드 — 한의사 워크벤치
2. 환자 목록
3. 리포트 발행
4. 리텐션 관리
5. 예약 캘린더
6. 통계
7. 설정

### 4.2 주요 화면

| # | 화면 | 목적 |
|---|---|---|
| S1 | 대시보드 | 오늘 진료, 메시지, 리포트, 고위험 환자 큐 |
| S2 | 환자 목록 | 빠른 검색, 다음 액션 기준 정렬 |
| S3 | 환자 상세 | 진료·체성분·리포트·메시지 전체 히스토리 |
| S4 | 방문기록 작성 | 재진 60초, 초진 3분 내 기록 |
| S5 | 리포트 발행 | 환자용 PDF/보안 링크 생성·검토·발송 |
| S6 | 리텐션 관리 | 이탈위험, 처방종료, 리포트 대기 일괄 관리 |
| S7 | 예약 캘린더 | 진료·시술 슬롯 운영 |
| S8 | 통계 | 재방문, 리포트 발행, 매출, 패키지 지표 |
| S9 | 환자 등록 | 초진 온보딩과 동의 관리 |

### 4.3 한의사 친화 UX

- "환자 검색 → 방문기록 → 다음 방문일 → 메시지/리포트"가 한 흐름으로 이어져야 한다.
- 방문기록 작성 중 이전 측정값과 이번 값 차이를 바로 보여준다.
- 변증·증상은 칩과 점수형으로 빠르게 입력하고, 중요한 해석만 텍스트로 남긴다.
- 메시지 문구는 진료내용 기반으로 추천하되, 한의사가 최종 확인한다.
- 환자 리포트는 화면에서 A4 미리보기로 보고 바로 PDF/프린트/SMS·LMS 전송한다.

---

## 5. 디자인 시스템

### 5.1 방향

- 의료 서비스답게 조용하고 신뢰감 있게 만든다.
- 화면은 카드 나열보다 업무 큐, 표, 타임라인, 리포트 미리보기 중심으로 구성한다.
- 브랜드 색은 블루를 유지하되, 위험·주의·성과·중립 색을 명확히 분리해 단조로운 파란 화면을 피한다.

### 5.2 컬러 토큰

```css
--blue-50:  #EFF5FF;
--blue-600: #2563EB;
--green-600:#16A34A; /* 개선, 목표 달성 */
--amber-600:#D97706; /* 주의, 정체 */
--red-600:  #DC2626; /* 위험 */
--slate-900:#212529;
--gray-100: #F4F6F8;
--gray-200: #E9ECEF;
--white:    #FFFFFF;
```

### 5.3 컴포넌트

- DoctorQueueRow
- PatientSearch
- VisitQuickForm
- ClinicalFlag
- BodyMetricTrend
- SymptomScore
- ReportPreview
- ConsentBadge
- MessageTemplatePicker
- Timeline
- AuditTrail

---

## 6. 기술 스택 제안

| 영역 | 선택 | 비고 |
|---|---|---|
| 배포 | GitHub Pages 정적 배포 | 서버 없이 `index.html`, `styles.css`, `app.js`만 필요 |
| Frontend | Vanilla HTML/CSS/JavaScript | 빌드 과정 없이 브라우저에서 즉시 실행 |
| 저장소 | browser `localStorage` | 현재 기기·브라우저 단위 저장, JSON 백업/복원 제공 |
| 파일 입력 | FileReader API | 체성분 CSV, 사진 파일, JSON 백업 복원 |
| 차트 | inline SVG | 외부 차트 라이브러리 없이 체중 추이 렌더링 |
| 리포트 | 브라우저 프린트/PDF 저장 | 환자용 리포트 미리보기 후 인쇄 또는 PDF 저장 |
| 메시지 | SMS/LMS 발송 대기 기록 | 실제 문자 API는 추후 연동 |
| 기기 연동 | CSV 업로드 | InBody류 체성분계 CSV를 헤더 매핑 후 저장 |

### 6.1 현재 구현 범위

- 환자 CRUD
- 방문기록 CRUD
- 체성분 수동 입력 CRUD
- 체성분 CSV 가져오기
- 환자 상세 탭 전환 및 탭별 CRUD
- 리포트 생성·수정·삭제·미리보기
- 사진 저장·삭제
- 결제 CRUD
- 예약 CRUD
- 문자 발송 대기/기록 CRUD
- JSON 백업/복원

### 6.2 현재 구현하지 않는 범위

- 실제 SMS/LMS API 발송
- 서버 DB와 다중 사용자 동기화
- 로그인/권한
- 체성분계 직접 네트워크 연동
- 별도 수집 장치와 계약이 필요한 외부 생체 데이터

---

## 7. 개발 단계

### Phase 1 — 한의사 단독 사용 MVP (6주)

- 환자 등록·검색·상세
- 초진/재진 방문기록
- 체성분·증상 추이
- 다음 방문일·처방 종료 알림
- 환자용 리포트 초안 생성 및 화면 미리보기
- SMS/LMS는 mock 발송

### Phase 2 — 실제 운영 기능 (5주)

- PDF 리포트 발행, 보안 링크, 프린트
- 리포트 발행 이력과 버전 관리
- 리텐션 메시지 템플릿, 통화 결과, 스누즈
- 예약 캘린더, 패키지 잔여, 결제·미수금
- 사진 관리와 전후 비교

### Phase 3 — 자동화·연동 (6주)

- SMS/LMS 실제 연동
- 체성분계 CSV/PDF 업로드 자동 매핑
- 리포트 자동 초안, 고위험 플래그 추천
- 다중 사용자 권한, 감사 로그, 백업
- 통계: 리포트 발행 후 재방문률, 처방 종료 전환율, 이탈 회복률

### Phase 4 — 확장

- 다지점 운영
- EMR/청구 시스템 연계 검토
- 환자 포털
- 비식별 데이터 기반 코호트 분석

---

## 8. 보안·컴플라이언스

- 진료기록부는 의료법상 장기 보존 대상이며, 처방전·검사기록·진단서 부본 등은 항목별 보존기간이 다르다.
- 건강정보는 개인정보보호법상 민감정보에 해당하므로 별도 동의 또는 법령상 근거가 필요하다.
- 환자 리포트, 사진, 문자 수신, 마케팅 수신은 목적별 동의와 철회 이력을 분리한다.
- 전후 사진과 환자 후기는 내부 진료 리포트와 외부 광고 활용을 분리하고, 광고 활용 전 별도 검토가 필요하다.
- 모든 열람·수정·발행·전송은 감사 로그를 남긴다.
- 데이터는 전송 중/저장 시 암호화하고, 이름·전화번호·진료기록·PDF 링크는 접근권한을 제한한다.
- 리포트 보안 링크는 만료일, 재발급, 열람 로그, 공유 차단 옵션을 제공한다.

참고한 공식·공공 출처:

- 의료법 제22조 및 시행규칙 제15조: https://www.law.go.kr/LSW/expcInfoP.do?expcSeq=329321&mode=2
- 개인정보보호법 제23조: https://www.law.go.kr/lsLinkCommonInfo.do?chrClsCd=010202&lsJoLnkSeq=1027416043
- 개인정보보호위원회 처리방침 작성지침 안내: https://m.pipc.go.kr/np/cop/bbs/selectBoardArticle.do?bbsId=BS074&mCode=C020010000&nttId=11133
- SOLAPI 문자 단가와 발신번호 정책: https://www.solapi.com/pricing, https://solapi.com/senderid
- NHN Cloud SMS 발신번호·080 수신거부 정책: https://docs.nhncloud.com/ko/Notification/SMS/ko/console-guide/

---

## 9. 성공 지표

| 지표 | 목표 |
|---|---|
| 방문기록 작성 시간 | 재진 60초 이내 |
| 리포트 발행 시간 | 3분 이내 |
| 30일 재방문률 | +15%p |
| 처방 종료 전 재예약률 | 65% 이상 |
| 리포트 수신 후 재방문 전환율 | 35% 이상 |
| 이탈위험 환자 회복률 | +20% |
| 문자 응답률 | 70% 이상 |
| 환자당 평균 방문 횟수 | +20% |
| 월간 미작성 기록 | 0건 |

---

## 10. 구현 우선순위 결론

처음부터 병원 전체 ERP를 만들기보다, **한의사가 매일 쓰는 4가지 루프**를 먼저 완성한다.

1. 환자 검색
2. 방문기록 작성
3. 다음 액션 예약
4. 환자 리포트 발행·발송

이 루프가 안정화되면 예약, 결제, 패키지, 기기 연동, 다중 직원 권한을 확장한다.
