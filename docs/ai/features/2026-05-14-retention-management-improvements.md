# Retention Management Improvements

## Request

An end user asked for the retention management page to match the annotated screenshot:

- Add direct row delete from the retention/patient list actions.
- Allow status or retention-stage changes directly from the list row.
- Show recent and next scheduled contact/visit dates from the retention schedule instead of relying on manual entry only.
- Keep the retention list in sync with the patient detail "Care Tasks" tab.
- Later nice-to-haves: template settings, owner/status filters, done/incomplete summary, due-date alerts, memo preview, bulk edits, bulk registration, safer delete confirmation, and undo.

## Shared Understanding

- Goal: make the retention page a working queue where staff can see each patient's current retention stage, next scheduled action, recent action date, report state, and row actions without opening the detail page.
- Non-goals: external SMS/email delivery, Firestore rules/index changes, data migration scripts, broad visual redesign, and optional bulk/alert/filter features unless a later plan slice explicitly adds them.
- User flow: staff opens Retention Management, scans the patient directory, edits status/stage inline, opens or edits the active care task when needed, deletes a patient or care task only after confirmation, and can verify the same data in Patient Detail > Care Tasks.
- Data assumptions: `careTasks` should remain the source of truth for retention schedule rows. Existing patient lifecycle `status` is separate from retention task `status` unless an execution slice explicitly maps them.
- Open questions:
  - The screenshot's "status" options mix lifecycle and action labels (`in progress`, `progress call`, `happy call`, `message`). Default execution should model this as a retention-stage/action selector backed by `careTasks`, not as the existing patient lifecycle status, unless the user says otherwise.
  - Patient row delete should probably remove linked mutable records to avoid orphan data. The execution slice must show counts in the confirmation before deleting.

## Current Code Notes

- `app.js` owns the single-page UI and data helpers.
- `renderRetention()` renders the retention page and calls `renderPatientDirectoryCard()`.
- `renderPatientDirectoryCard()` currently shows patient lifecycle status, latest visit, next visit, report state, and edit/open actions.
- `renderCareTaskTab(patient)` already displays patient care tasks with DONE, due date, status, category, channel, action name, memo, edit, and delete.
- `delete-care-task` and `toggle-care-task-done` handlers already exist.
- `defaultActionTemplates()` already defines 7-day, 42-day, and 70-day default templates.
- `createInitialCareTasks()` already creates selected template tasks for new patients.
- `patientSortValue()` currently derives latest/next dates from visits, not care tasks.
- No `sw.js` or `STATIC_ASSETS` file was found in the current file list, so the service-worker cache rule is not expected to apply unless such a file appears later.

## Decision Log

- Decision: keep this as a multi-slice UI/data-binding plan, not one large execution.
- Reason: deletion, inline stage editing, and schedule derivation touch different behaviors and need separate verification.
- Reversible: yes, each slice can be reverted independently if kept scoped to the listed files.

## Execution Slices

### Slice 1: Safe Patient Row Delete

- Goal: add a Delete action to the retention patient directory row.
- Scope: add a `delete-patient` action, a `deletePatient(id)` helper, and a row button in `renderPatientDirectoryCard()`.
- Likely files: `app.js`, possibly `styles.css` if action buttons need spacing.
- Do not change: Firestore rules, Firestore indexes, migration scripts, care task templates, row status/stage behavior.
- Implementation notes: confirmation should include linked record counts for visits, body compositions, reports, payments, photos, appointments, messages, and care tasks. Delete the patient and linked mutable records together, then `saveDb()` and `render()`.
- Verification: run `npm.cmd run check`; serve locally; open Retention Management; delete a test patient; confirm the row disappears and linked records no longer appear in detail/queue/calendar.
- Done proof: command output for `npm.cmd run check`, HTTP 200 for the local URL, and UI proof that a test patient delete removed the row after confirmation.
- Next-session prompt: `Read docs/ai/features/2026-05-14-retention-management-improvements.md and implement Slice 1 only: Safe Patient Row Delete. Do not implement inline status/stage editing or schedule derivation in this session.`

### Slice 2: Inline Retention Stage Selector

- Goal: allow the list row stage to be changed immediately without opening the modal.
- Scope: render a compact selector in the patient directory status/stage column and persist the change through existing data save flow.
- Likely files: `app.js`, `styles.css`.
- Do not change: patient deletion, schedule generation, Firestore rules/indexes, migration scripts.
- Implementation notes: prefer a care-task-backed retention stage helper. If the patient has an open care task, update that task's category/channel/action label from the selected option. If no open task exists, create one due today from the selected stage. Keep existing patient lifecycle `status` unchanged unless the user explicitly wants it mapped.
- Verification: run `npm.cmd run check`; open Retention Management; change a row stage; refresh; confirm the selected stage persists and Patient Detail > Care Tasks reflects the same task update.
- Done proof: check output, HTTP 200, and UI proof of row selector persistence plus matching care task detail.
- Next-session prompt: `Read docs/ai/features/2026-05-14-retention-management-improvements.md and implement Slice 2 only: Inline Retention Stage Selector. Do not implement patient delete or schedule summary changes in this session.`

### Slice 3: Care-Task Schedule Summary In Patient Directory

- Goal: make the directory's recent date, next date, status/stage, and row action reflect care task schedule data.
- Scope: add helpers that derive a per-patient retention summary from `careTasks`; update directory columns and sort values to use those helpers.
- Likely files: `app.js`, `styles.css` if columns need responsive tightening.
- Do not change: patient deletion, inline selector behavior, template CRUD, migration scripts, Firestore rules/indexes.
- Implementation notes: define deterministic helpers for latest completed/past task, next open task, current stage, and active action. Fall back to visits only when care task data is absent. Keep the detail care task table as the visible source of truth.
- Verification: run `npm.cmd run check`; create a new patient with default templates; confirm 7-day, 42-day, and 70-day tasks appear; confirm the directory next date follows the earliest open care task and changes after marking DONE.
- Done proof: check output, HTTP 200, and UI proof that Retention Management and Patient Detail > Care Tasks show the same schedule state.
- Next-session prompt: `Read docs/ai/features/2026-05-14-retention-management-improvements.md and implement Slice 3 only: Care-Task Schedule Summary In Patient Directory. Do not implement optional filters, alerts, bulk edits, or delete undo.`

### Slice 4: Care Task Sync Polish

- Goal: tighten the patient detail Care Tasks tab so list edits and detail edits are visibly consistent.
- Scope: adjust labels, empty states, sorting, status badges, and action names so the detail table matches the retention list behavior.
- Likely files: `app.js`, `styles.css`.
- Do not change: data schema, migrations, Firestore rules/indexes, patient deletion, template CRUD.
- Implementation notes: keep existing DONE checkbox behavior. Ensure edit/delete from the detail table re-renders the retention page state when returning to it.
- Verification: run `npm.cmd run check`; edit/delete/toggle a care task in Patient Detail > Care Tasks; return to Retention Management and confirm row data updates.
- Done proof: check output, HTTP 200, and UI proof of detail-to-list sync.
- Next-session prompt: `Read docs/ai/features/2026-05-14-retention-management-improvements.md and implement Slice 4 only: Care Task Sync Polish. Do not add optional filters, alerts, or bulk features.`

## Deferred Optional Enhancements

- Automatic schedule template settings beyond the current template CRUD: partially covered by current action template CRUD and new-patient template selection.
- Filters by owner, status, category, channel, and date range: moved to Slice 5 for a lightweight list-level implementation.
- Done/incomplete summary view: moved to Slice 5.
- Due-date notifications for D-3, D-1, and due date: moved to Slice 5 as an inline due badge, not external app/email/SMS notification.
- Memo preview in the directory: moved to Slice 5.
- Bulk status/owner/category edits and bulk action registration: still deferred because this can update many patient/care-task records at once.
- Delete undo or recycle-bin behavior: still deferred because delete recovery affects data retention and remote sync semantics.

### Slice 5: Retention List Quick Filters And Signals

- Goal: implement the low-risk "nice to have" list improvements that make the retention directory easier to scan.
- Scope: add patient-directory filters for owner, retention stage, care-task status, category, channel, and due window; show open/done/overdue counts; add due-date urgency badges and active-task memo preview.
- Likely files: `app.js`, `styles.css`.
- Do not change: data schema, Firestore rules/indexes, migration scripts, bulk edits, undo/recycle-bin behavior, external notifications, SMS/email delivery.
- Implementation notes: keep filters derived from existing `patients` and `careTasks`; use current `retentionSummaryForPatient()` as the source for visible row signals; due-window filters should be relative to `todayISO()`.
- Verification: run `npm.cmd run check`; serve locally; open Retention Management; confirm filters reduce the patient list, counts update, due badges appear for overdue/today/D-1/D-3/D-7, and memo text appears from the active care task.
- Done proof: check output, HTTP 200, and UI proof of filtered list/counts/due badge/memo preview.

## Review Prompt

Read this plan and the changed files from the last execution session. Review for bugs, regressions, missing tests, stale cache/service-worker issues, data-loss risk around deletes, stale retention summaries, and UX breakage. Do not implement new feature work during review.
