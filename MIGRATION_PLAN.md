# ExportBlock 데이터 분석 및 마이그레이션 계획

> 목적: 외부로 노출되어서는 안 되는 진료·연락 데이터를 코드에 하드코딩하지 않고, 로컬 브라우저에서 사용자가 직접 가져와 현재 Renewd 앱 데이터로 빠짐없이 이전한다.

## 1. 분석 원칙

- 환자명, 연락처, 상담 내용, 처방 세부 내용은 코드·문서·GitHub Pages에 포함하지 않는다.
- 앱은 가져오기 로직만 제공하고, 실제 데이터는 사용자가 브라우저에서 직접 선택한 파일에서만 읽는다.
- 마이그레이션 결과에는 원본 추적값, 검증 카운트, 미매칭 항목을 남겨 누락 여부를 확인한다.
- 원본 데이터는 서버로 업로드하지 않고 GitHub Pages 환경의 브라우저 안에서만 파싱한다.

## 2. ExportBlock 구조 요약

로컬 분석 결과, 해당 export는 Notion DB export 형태로 보인다.

| 항목 | 관찰 결과 |
| --- | --- |
| 전체 파일 | 340개 |
| CSV | 2개 |
| Markdown | 338개 |
| CSV 행 수 | 각 336행 |
| Markdown 원문 크기 | 대부분 짧은 업무 메모 형태 |
| 주요 CSV 필드 | DONE, 이름, 하일라이트, 명료화, 행동목록, 날짜, 완료, 메모, 가이드, 날짜DP, 생성일시, D-day |
| 주요 Markdown 속성 | DONE, 날짜, D-day, 가이드, 명료화, 메모, 행동목록 |

두 CSV는 동일한 DB를 다른 열 순서로 export한 중복본일 가능성이 높다. 최종 구현에서는 두 CSV를 모두 읽되, 행 해시와 원본 page id 기준으로 중복을 제거해야 한다.

## 3. 데이터 패턴

이 export는 환자 마스터가 아니라 **리텐션·연락·경과확인 업무 큐**에 가깝다.

| 패턴 | 의미 |
| --- | --- |
| DONE Yes/No | 완료된 연락업무와 미완료 연락업무가 공존 |
| 날짜, D-day | 업무 예정일 또는 경과일 관리 |
| 연락/전화/문자/카톡 | 연락 채널이 파일명과 메모에 섞여 있음 |
| 해독/본약/처방/경과/해피콜 | 다이어트 한의원 프로그램 단계가 자연어로 기록됨 |
| 부재중/확인/완료/환불/문제 | 연락 결과나 리스크 상태가 자연어로 기록됨 |
| 2자리 숫자 suffix | 생년 또는 환자 구분자로 추정되는 값이 일부 제목에 섞여 있음 |
| 여러 사람 표기 | 한 업무가 복수 환자 또는 관계자를 함께 참조하는 케이스 존재 |

따라서 현재 앱은 단순 `messages` 배열만으로는 부족하고, `careTasks`를 중심으로 환자, 방문, 처방, 메시지 이력을 연결해야 한다.

## 4. 현재 구현 보완 방향

### 4.1 신규 엔티티

```js
careTasks: [
  {
    id,
    patientId,
    sourceImportId,
    sourceRecordId,
    title,
    summary,
    dueDate,
    createdAt,
    status,
    priority,
    category,
    channel,
    phase,
    outcome,
    owner,
    memo,
    checklist,
    snoozedUntil,
    completedAt,
    dataQualityFlags
  }
]
```

추가로 필요한 보조 엔티티:

| 엔티티 | 역할 |
| --- | --- |
| `imports` | 가져오기 batch, 원본 파일 수, 행 수, 검증 결과, 롤백 기준 |
| `sourceRecords` | 원본 row/page의 해시, 원본 파일 식별자, 매핑 상태 |
| `patientAliases` | 이름, 생년 suffix, 별칭을 환자와 연결 |
| `contactAttempts` | 전화/문자/카톡 시도, 결과, 다음 액션 |
| `carePrograms` | 해독, 본약, 재처방, 소퍼 등 프로그램 단계 |
| `dataQualityIssues` | 환자 미매칭, 중복 의심, 날짜 누락, 복수 환자 연결 등 |

### 4.2 기존 엔티티 변경

| 현재 | 보완 |
| --- | --- |
| `messages` | 실제 발송 기록만 저장하고, 예정/할 일은 `careTasks`로 분리 |
| `appointments` | 연락 업무에서 예약 전환된 경우 `sourceTaskId` 연결 |
| `visits` | 경과확인, 처방 후 확인, 환불 이슈를 방문/상담 이벤트로 연결 |
| `patients` | alias, 생년 suffix, 선호 연락채널, 마지막 연락결과 필드 추가 |
| `reports` | careTask 완료 후 리포트 발행/발송으로 전환 가능하게 연결 |

### 4.3 화면 보완

| 화면 | 추가 기능 |
| --- | --- |
| 대시보드 | 오늘 연락업무, 미완료 연락업무, D+ 초과 업무, 부재중 재시도 큐 |
| 리텐션 | 필터: 해독, 본약, 경과, 해피콜, 부재중, 환불, 문제, 채널 |
| 환자 상세 | `케어 업무` 탭 추가, 과거 연락업무와 실제 메시지 기록 분리 |
| 문자 | 단건 발송 기록이 아니라 task 기반 발송, 콜 결과, 스누즈, 재시도 |
| 가져오기 | Notion CSV/Markdown folder import, 환자 매칭 검토, 롤백 |
| 통계 | 완료율, 미완료율, 채널별 시도, 프로그램 단계별 누락, 재방문 전환 |

## 5. 마이그레이션 매핑

| Export 필드 | Renewd 매핑 |
| --- | --- |
| 이름 | 환자 후보 추출, careTask 제목, patientAlias 후보 |
| DONE | `careTasks.status`: Yes는 done, No는 open |
| 날짜 | `careTasks.dueDate` |
| 날짜DP | 표시용 원본 날짜 백업 |
| D-day | 파생값 검증용, 저장 시 재계산 |
| 생성일시 | `careTasks.createdAt` |
| 명료화 | `careTasks.summary` |
| 행동목록 | `careTasks.checklist` |
| 메모 | `careTasks.memo` 또는 source note |
| 가이드 | `careTasks.owner` 또는 담당자 |
| 하일라이트 | `careTasks.priority` 후보 |
| Markdown 본문 | sourceRecords 원본 note 또는 task 상세 |

## 6. 마이그레이션 절차

1. 사용자가 브라우저에서 ExportBlock 폴더를 선택한다.
2. 앱이 CSV 2개와 Markdown 전체를 로컬에서 읽는다.
3. CSV 헤더, 행 수, Markdown page id를 검증한다.
4. 중복 CSV는 행 해시 기준으로 하나의 canonical row로 병합한다.
5. Markdown page id 또는 제목 해시로 CSV row와 page를 연결한다.
6. 환자 후보를 추출하되 자동 확정하지 않는다.
7. 기존 환자와 매칭 가능한 항목은 `matched`, 애매한 항목은 `needs_review`, 매칭 불가 항목은 `unmatched`로 둔다.
8. 업무 유형을 키워드와 날짜 패턴으로 분류한다.
9. 사용자가 매칭 리뷰 화면에서 병합/신규 생성/보류를 선택한다.
10. 최종 반영 시 `importBatchId`를 부여하고 모든 신규 레코드에 출처를 남긴다.
11. 반영 후 import report를 보여준다.
12. 문제가 있으면 해당 batch 전체를 롤백한다.

## 7. 누락 방지 검증

가져오기 완료 후 다음 값을 반드시 화면에 표시한다.

| 검증 항목 | 기준 |
| --- | --- |
| 읽은 CSV 파일 수 | 2개 |
| 읽은 Markdown 파일 수 | 338개 |
| canonical CSV row 수 | 336행 |
| 생성된 careTask 수 | canonical row 수와 일치해야 함 |
| 연결된 Markdown 수 | 연결 성공/실패를 분리 표시 |
| 환자 자동 매칭 수 | 확정 연결 |
| 환자 검토 필요 수 | 사용자가 직접 결정 |
| 날짜 누락 수 | 별도 보정 필요 |
| 중복 의심 수 | 병합 또는 유지 결정 |
| 롤백 가능 여부 | importBatchId 단위 삭제 가능 |

## 8. 개인정보 보호 설계

- export 데이터는 GitHub Pages 정적 파일이나 `app.js`에 절대 포함하지 않는다.
- 폴더 import는 `<input type="file" webkitdirectory multiple>` 또는 다중 파일 선택으로 처리한다.
- 원본 보관이 필요하면 IndexedDB에만 저장하고, JSON 백업 시 사용자가 명시적으로 내보내야 한다.
- 민감 데이터가 포함된 import report는 로컬 앱 화면에만 표시하고, 문서/콘솔/원격 로그로 출력하지 않는다.
- 앱에 분석용 콘솔 로그를 남기지 않는다.
- 배포 저장소에는 parser, mapper, validator 코드만 올린다.

## 9. 구현 순서

1. `careTasks`, `imports`, `sourceRecords`, `patientAliases` 스키마 추가
2. 기존 `messages`를 발송 이력으로 정리하고 task 예정 기능 분리
3. Notion CSV/Markdown local importer 구현
4. import preview와 검증 카운트 화면 구현
5. 환자 매칭 리뷰 화면 구현
6. careTask CRUD와 리텐션 큐 필터 확장
7. task에서 문자 기록/예약/방문기록으로 전환하는 액션 추가
8. batch rollback과 JSON 백업/복원 확장
9. 실제 export를 사용한 로컬 검증
10. 민감 데이터 없이 GitHub Pages 재배포
