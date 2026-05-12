# Firestore 기반 Renewd 마이그레이션 설계

> 대상: `C:\Users\USER\Desktop\Tomato Project\tomatofarm(for lite version)`의 Firebase/Firestore 인프라를 활용하되, 토마토 팜 운영 데이터와 병원 데이터를 논리적으로 분리한다. ExportBlock 원문 데이터는 코드나 GitHub 저장소에 넣지 않는다.

## 1. 결론

가능하다. 다만 환자 연락·진료 메모가 섞인 데이터이므로, 토마토 팜의 기존 `users/{userId}/...` 구조에 얹으면 안 된다. 다음 둘 중 하나로 분리해야 한다.

| 방식 | 권장도 | 설명 |
| --- | --- | --- |
| 별도 Firestore database | 높음 | 같은 Firebase/GCP 프로젝트 안에 `renewd-clinic` 같은 별도 database를 만들고 병원 데이터만 저장 |
| 동일 `(default)` DB의 별도 root namespace | 중간 | 기존 DB 안에 `_renewdClinic/{instanceId}/...`처럼 완전히 다른 루트 컬렉션으로 저장 |

장기적으로는 **별도 database + import/export 어댑터**가 가장 좋다. 단기 구현은 같은 `(default)` DB의 별도 root namespace가 가장 빠르다.

현재 `exercise-management` Firebase 프로젝트에는 병원 데이터 전용 Firestore database `renewd-clinic`을 생성했다. 생성 직후 기본 규칙은 닫혀 있어 브라우저 제3자 접근은 차단된다.

## 2. 현재 Tomato Project 확인 결과

토마토 팜 프로젝트는 Firebase Web SDK와 Cloud Functions Admin SDK를 함께 사용한다.

| 확인 항목 | 관찰 |
| --- | --- |
| Firebase project | 토마토 팜용 Firebase 프로젝트가 이미 설정되어 있음 |
| 브라우저 데이터 접근 | `data/data-core.js`에서 Firebase Web SDK 초기화 |
| 기존 사용자 데이터 경로 | `users/{ownerId}/{collection}` 중심 |
| 서버 접근 | `functions/index.js`에서 Firebase Admin SDK 사용 |
| 앱 구조 | Vanilla JS, 빌드 도구 없이 정적 앱 + Firebase |
| 주의점 | 토마토 팜 `data.js/data-core.js` 계층을 병원 데이터와 섞으면 도메인이 오염됨 |

따라서 Renewd 쪽은 토마토 팜의 `data-core.js`를 재사용하지 말고, **별도 adapter 파일**로 Firestore 대상만 주입받아야 한다.

## 3. 권장 Firestore 구조

### 3.1 별도 database 방식

```text
project: existing-tomato-firebase-project
database: renewd-clinic

_instances/{instanceId}
_instances/{instanceId}/patients/{patientId}
_instances/{instanceId}/patientAliases/{aliasId}
_instances/{instanceId}/careTasks/{taskId}
_instances/{instanceId}/contactAttempts/{attemptId}
_instances/{instanceId}/visits/{visitId}
_instances/{instanceId}/bodyCompositions/{bodyId}
_instances/{instanceId}/reports/{reportId}
_instances/{instanceId}/messages/{messageId}
_instances/{instanceId}/sourceRecords/{sourceRecordId}
_instances/{instanceId}/imports/{importBatchId}
_instances/{instanceId}/dataQualityIssues/{issueId}
```

장점:

- 토마토 팜 데이터와 DB 단위로 분리된다.
- 보안 규칙, 인덱스, 백업, 이전 작업을 병원 데이터 기준으로 독립 관리하기 쉽다.
- 나중에 다른 Firebase 프로젝트로 옮길 때 `databaseId`와 `projectId`만 바꾸는 구조를 만들 수 있다.

주의:

- Firebase/Firestore 다중 database는 공식적으로 가능하지만, 클라이언트 SDK의 named database API는 문서상 preview 표시가 남아 있다. 환자 데이터 마이그레이션은 브라우저 직쓰기보다 Admin SDK 기반 CLI/서버 경로를 우선한다.

### 3.2 동일 DB 별도 namespace 방식

```text
database: (default)

_renewdClinic/{instanceId}
_renewdClinic/{instanceId}/patients/{patientId}
_renewdClinic/{instanceId}/careTasks/{taskId}
...
```

장점:

- 지금 Firebase 프로젝트에 바로 적용하기 쉽다.
- Web SDK 기본 DB만 쓰므로 구현 리스크가 낮다.

단점:

- 물리 DB는 토마토 팜과 같기 때문에 보안 규칙과 백업 관리가 섞인다.
- 실수로 rules가 넓게 열려 있으면 환자 데이터가 노출될 수 있다.

## 4. 보안 원칙

환자 데이터는 GitHub Pages 브라우저에서 Firebase config만으로 직접 쓰는 구조를 피한다.

권장 순서:

1. 로컬 import CLI 또는 Cloud Function에서 Admin SDK로 마이그레이션한다.
2. Firestore Security Rules는 병원 namespace를 기본 deny로 둔다.
3. 운영 앱에서 환자 데이터를 직접 조회하려면 Firebase Auth 또는 서버 프록시를 붙인다.
4. App Check는 봇 차단 보조 수단일 뿐, 사용자 권한 제어로 보지 않는다.
5. 원본 export 파일과 서비스 계정 키는 저장소에 커밋하지 않는다.

## 5. 마이그레이션 가능 범위

현재 ExportBlock은 다음 단위로 빠짐없이 이전 가능하다.

| 원본 | 저장 대상 |
| --- | --- |
| CSV canonical row | `careTasks` |
| CSV row 원본 | `sourceRecords` |
| Markdown page | `sourceRecords` 또는 `careTasks.rawNoteRef` |
| DONE | task status |
| 날짜/D-day | dueDate, dueState |
| 명료화/행동목록/메모/가이드 | summary, checklist, memo, owner |
| 이름 필드 | patient alias 후보, patient matching queue |
| 연락/전화/문자/카톡 키워드 | contact channel, contact attempt type |
| 해독/본약/처방/경과/해피콜 | care program phase |

중요: 자동 환자 매칭은 100% 확정하지 않는다. 기존 데이터에는 이름, 생년 suffix, 행동 문구가 한 필드에 섞인 케이스가 있으므로 `needs_review` 상태를 둬야 한다.

## 6. 이식성 설계

향후 Firebase 계정이나 DB를 바꿔도 쉽게 옮기려면 앱이 Firestore 경로를 직접 알면 안 된다.

```js
const renewdDataTarget = {
  provider: "firestore",
  projectId: "...",
  databaseId: "renewd-clinic",
  rootCollection: "_instances",
  instanceId: "clinic-main",
  schemaVersion: 1
};
```

필수 규칙:

- Firestore `DocumentReference` 타입을 저장하지 않고, 모든 관계는 문자열 ID로 저장한다.
- 모든 문서에 `schemaVersion`, `instanceId`, `importBatchId`, `createdAt`, `updatedAt`를 둔다.
- 원본 식별자는 `sourceRecordId`와 `sourceHash`로 저장해 재실행해도 중복 생성되지 않게 한다.
- export/import는 collection별 NDJSON 또는 JSON bundle로 제공한다.
- 새 Firebase 프로젝트로 갈 때는 `projectId`, `databaseId`, credentials만 바꿔 같은 importer를 재사용한다.

## 7. 실제 구현 단계

1. `patient` 프로젝트에 Firestore adapter 추가
2. `careTasks`, `imports`, `sourceRecords`, `patientAliases` 스키마를 앱 데이터 모델에 추가
3. ExportBlock parser를 브라우저/Node 양쪽에서 재사용 가능한 순수 함수로 분리
4. Admin SDK 기반 `import-exportblock-to-firestore` CLI 작성
5. dry-run 모드로 파일 수, row 수, Markdown 수, 생성 예정 문서 수 검증
6. 실제 import 실행 시 batch write 400건 이하로 분할 저장
7. import report 저장
8. rollback 명령 제공
9. Firestore export 명령 제공
10. Firebase target config를 바꿔 다른 프로젝트/DB로 restore 테스트

## 8. 필요한 명령 예시

별도 database를 쓸 경우:

```powershell
firebase.cmd firestore:databases:create renewd-clinic --location=asia-northeast3
```

로컬 dry-run:

```powershell
node scripts/import-exportblock-to-firestore.mjs --dry-run --source "C:\Users\USER\Documents\ExportBlock-55f789b2-74b8-426c-9cd0-264ee03f0d4e-Part-1"
```

실제 import:

```powershell
node scripts/import-exportblock-to-firestore.mjs --source "C:\Users\USER\Documents\ExportBlock-55f789b2-74b8-426c-9cd0-264ee03f0d4e-Part-1" --project exercise-management --database renewd-clinic --instance clinic-main --yes
```

다른 Firebase 프로젝트로 이전:

```powershell
node scripts/export-renewd-firestore.mjs --out ".\backup\renewd.ndjson"
node scripts/import-renewd-firestore.mjs --in ".\backup\renewd.ndjson" --project NEW_PROJECT_ID --database renewd-clinic
```

위 명령은 설계 예시이며, 실제 스크립트에는 서비스 계정 경로 또는 Application Default Credentials를 환경변수로 받게 해야 한다. 데이터 파일 경로와 credentials는 코드에 하드코딩하지 않는다.

로컬에서 실제 import를 실행하려면 다음 중 하나가 필요하다.

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\secure\renewd-admin-key.json"
```

또는 `--service-account "C:\secure\renewd-admin-key.json"` 옵션을 사용한다. 서비스 계정 키 파일은 저장소에 커밋하지 않는다.

## 9. 최종 권장안

1. **개발/검증**: 기존 토마토 Firebase 프로젝트의 별도 root namespace에 dry-run과 테스트 import
2. **운영 전환**: 가능하면 같은 프로젝트의 별도 Firestore database `renewd-clinic` 생성
3. **장기 보안**: 환자 데이터 앱은 Firebase Auth 또는 서버 프록시로만 접근
4. **이전성**: 모든 데이터를 NDJSON export/import 가능한 순수 JSON 문서로 유지

이 방식이면 현재 ExportBlock 데이터를 전부 Firestore에 저장하면서도, 토마토 팜 데이터와 사실상 별도로 관리할 수 있고, 나중에 Firebase 계정이나 DB를 바꿀 때도 importer/exporter만 재실행하면 된다.
