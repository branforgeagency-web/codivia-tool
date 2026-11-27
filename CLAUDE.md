# CLAUDE.md — CODIVIA (medical-coding practice platform)

Claude: this file is the project map. **Read it before exploring.** Go straight to the files named
here instead of scanning the repo, and read only the part of a big file you need (the workspace
files are 300–1000 lines). Keep this file up to date when structure or rules change (see the end).

---

## 1. What the product is

Students code real-format medical charts (ICD-10-CM, CPT, HCPCS, ICD-10-PCS, modifiers, MS-DRG) in an
Epic-like workspace, get scored with a reason per check, track progress and build a certificate and
resume. Admins upload charts, allocate them to students by department, answer physician queries and
review performance.

- **Roles: `admin`, `student`, `auditor`** (auditor re-added 2026-11-26). Admin creates auditors
  (Users page → Auditors tab) and assigns students to them **per department**; the auditor reviews
  those students' submitted charts and agrees with or adjusts the score.
- Students **self-register** at public `/auth/register`; admin "Add student" is optional.
- **Charts come only from admin upload** (`/admin/uploads`). Seed scripts are dev-only.
- Firebase was removed (2026-11-12); auth is the backend JWT API.

## 2. Repo layout

```
Frontend/   React 18 + Vite 7 SPA (plain JS/JSX, ES modules). Dev server :8080
backend/    Node 20 + Express 5 + Mongoose 9 (CommonJS). API :3000 under /api/v1
prototypes/ coder-phase1.html — old static prototype, reference only
amplify.yml AWS Amplify build of Frontend/ only (Frontend/dist)
```

## 3. Commands

| Task | Command (run inside the folder) |
|---|---|
| Frontend dev / build | `cd Frontend && npm run dev` · `npm run build` · `npm run format` (prettier) |
| Backend dev / start | `cd backend && npm run dev` (nodemon) · `npm start` |
| Backend tests | `cd backend && node --test test/` (node:test, models stubbed — no DB needed) |
| Seeds (dev) | `npm run seed:admin | seed:departments | seed:codes | seed:fees | seed:guidelines | seed:reference | seed:resume-templates | seed:charts` |
| Migration | `npm run migrate:encounter-types` (opt-in backfill) |

Env: copy `backend/.env.example` → `backend/.env`, `Frontend/.env.example` → `Frontend/.env`
(`VITE_API_BASE_URL=http://localhost:3000/api/v1`). Never commit `.env`.

## 4. Coding conventions (the full rules live in two docs — follow them exactly)

- Backend patterns: [backend/BACKEND_BOILERPLATE_PROMPT.md](backend/BACKEND_BOILERPLATE_PROMPT.md)
  (§10 = "Adding a new module" checklist).
- Frontend API patterns: [Frontend/FRONTEND_API_PROMPT.md](Frontend/FRONTEND_API_PROMPT.md)
  (ends with an "Adding a new API call" checklist).

Short version:

**Backend** — layer per feature: `config/<f>.js` (enums, limits) → `models/<f>.model.js` →
`validations/<f>.validation.js` (Joi `{params,query,body}`) → `services/<f>.service.js` (all logic,
throws `ApiError`) → `controllers/<f>.controller.js` (thin) → `routes/v1/<f>.route.js` (mounted in
`routes/v1/index.js`). Register each new file in that folder's `index.js`. No TypeScript, no classes,
no `try/catch`/`catchAsync` (Express 5 forwards async errors). Guard routes with
`auth()` / `auth(ROLES.STUDENT)` from `middlewares/auth.js`. Paged lists return
`{ results, page, limit, totalPages, totalResults }`; errors `{ code, message, details? }`.

**Frontend** — never call `fetch` or write URLs in components. Use `get/post/put/patch/del` from
`src/services/apiHelper.js` + a constant/builder from `src/services/endpoints.js` (ids through
`encodeURIComponent`, query strings in `options.params`). Page URLs live in `src/routes/paths.js`;
routes in `src/routes/AppRoutes.jsx` (lazy pages, per role). Shared data: `SessionContext`,
`StudentContext`, `AdminContext`; reference lists via `useReference()`; paged lists via `useApiList`.
Styling: plain CSS (`src/styles/app.css`, `refinements.css` — large, grep it; workspace has
`workspace.css`), colours from `src/theme/theme.js` → CSS variables. Bootstrap Icons for icons.

**General** — keep code short, comment only the "why", match the surrounding style.

## 5. Where things are (task → files)

| Task | Look here first |
|---|---|
| Sign-in / sign-up / tokens | FE `pages/auth/Login.jsx`, `services/auth.service.js`, `tokenCookies.js`, `context/SessionContext.jsx` · BE `auth.*`, `token.service.js`, `middlewares/auth.js`, `config/users.js`, `validations/custom.validation.js` |
| **Workspace EHR shell** (2026-11-27 layout) | `workspace/ehr/` — import everything from `ehr/index.js`. `shell/` (SystemBar, PatientTabs, Storyboard, ActivityTabs, BottomBar) · `activities/` (one file per tab; **`registry.js` = tab list/order**, `when(chart)` hides a tab; WorkspacePage maps keys → screens in `views`) · `chart-review/` (`CR_TABS`, `CR_FILTERS`, `chartReviewRows`; `PreviewPane` opens BELOW the list with a drag bar; rows with `detail` (referrals) show a structured form; a tab can set `tools` (own disabled toolbar buttons) and `compactFilters` (text filter behind "Filters"), e.g. Rad with modality boxes in `CR_FILTERS.rad`, a filter with `default: true` starts ticked; `preview: 'right'` opens the preview beside the list (toolbar switch below/beside); Rad rows carry `imaging` → `ImagingReport.jsx`); encounter rows show a wide **visit report** (`lib/visitModel.js` + `sidebar/VisitReport.jsx`), and "Display in Chart Sidebar" pins it as its own closable Visit Report tab in the right panel (`pinnedIds` in WorkspacePage, keys `pin:<row id>`) · Notes activity = `activities/NotesActivity.jsx` (note-type tabs, list by date, read-only note toolbar; the old `Documents.jsx` panel is no longer used there) · `sidebar/` (`SidePanel` = **Coding** · Reports · (pinned Visit Report tabs) · To Do; tab state `sideTab` in WorkspacePage; `REPORTS` list) · `ui/` (ActivityHeader, Card, KvTable, EhrTable, Note, QueryList, ReportView) · `lib/chartText.js` (names, `visitSections`, vitals, meds, dates), `lib/useDragWidth.js` (drag-resize width of the right panel, saved in localStorage). Old flat files in `ehr/` (Activities, MoreActivities, EhrShell, SidePanel, ChartReview, chartReviewData, ReportView) are unused leftovers |
| Where the student codes | Right panel › **Coding** tab (`codingPanel` in WorkspacePage), beside Chart Review / Notes etc.; no separate Coding activity (denial charts keep a "Denial Work" activity for the claim + remit, with `DenialRight` in the panel). ADD DX, Fix, Go to fix and Alt+1–5 open it (`goCoding`). Edits/scrubber panel (acknowledge, notes, comments) sits under **To Do** |
| Patient demographics (DOB, address, employer, contacts, code status …) | BE `config/demographics.js` (tabs, sections, labels, upload aliases) → `chart.patient.details` (Mixed, chart + chartUpload models) → sent as `chart.demographics` by `getMyChart`; read from upload files by `readChartText` |
| **Coding workspace** (student codes a chart) | `Frontend/src/pages/student/workspace/`: `WorkspacePage.jsx` (state, autosave, submit), `Sections.jsx` (tabs/steps UI), `model.js` (chart setting, steps, helpers), `edits.js` (live claim-scrubber edits), `Denial.jsx`, `Documents.jsx`, `Encoder.jsx`, `CodeEntry.jsx`, `Modals.jsx`, `Result.jsx`, `constants.js` |
| Student chart work API (autosave, defer, transfer, query, comment) | BE `routes/v1/myChart.route.js` → `myChart.controller.js` → `myChart.service.js` + `chartWork.service.js`, model `chartWork.model.js` |
| Workspace autosave / **offline safety** | FE `src/offline/` (`useDraftSync` = IndexedDB device copy + server sync + retry + keepalive on close; `RecoveryPrompt`, `SyncStatus`, `OfflineBanner`, `useUnsavedGuard`) · settings & wording BE `config/drafts.js` → `chart.draftSync` · sign-out clears device copies (`SessionContext`) |
| Submitting + **grading** | `PUT /chart-results/:chartId` → `chartResult.service.js` → `utils/gradeWork.js` (one point per check) |
| Chart data shape | `models/chart.model.js` (answerKey, keyMeta, documents, encounterType, billingType, workType, previousRecords) |
| OP/IP, billing type, Dx classes | `backend/src/config/encounter.js` · FE `workspace/model.js` (`settingOf`) |
| Work types / statuses / option lists | `config/workQueue.js`, `data/workQueueReference.data.js`, `reference.service.js` (`GET /reference/work-queue`) |
| Admin upload of charts | FE `pages/admin/Upload.jsx`, `UploadCase.jsx` · BE `chartUpload.*`, `middlewares/uploadChartFile.js` (pdf/docx/doc extraction) |
| Upload auto-fill (file → form fields) | BE `utils/readChartText.js` (blocks `===== CHART SETUP / CHART / ORIGINAL CODING / DENIAL / ANSWER KEY =====`, `Label: value`, `TYPE \| CODE \| desc \| why` rows), words in `config/chartImport.js`; `importChartFile` in `chartUpload.service.js`; test `test/readChartText.test.js` |
| Admin students / departments / allocation | FE `pages/admin/*`, `pages/admin/components/*` · BE `adminStudent.*`, `adminDepartment.*`, `allocation.service.js`, `departmentPool.*` |
| Admin Users page (Students + Auditors tabs) | FE `pages/admin/Students.jsx` (tabs, `?tab=auditors`), `pages/admin/Auditors.jsx`, `components/admin/AuditorCard.jsx`, `components/AssignStudentsForm.jsx`; Add/Edit/Status forms take `role` · BE `adminAuditor.*` (`/admin/auditors`), model `auditAssignment.model.js` (one auditor per student+dept) |
| **Auditor role** (coding audit) | FE `pages/auditor/` (`AuditStation.jsx` = dashboard, `AuditQueue.jsx`, `AuditorStudents.jsx`, `AuditReview.jsx`), `layouts/AuditorLayout.jsx`, `styles/auditor.css` · BE `chartAudit.*` (`/audits`), model `chartAudit.model.js`, `config/auditors.js` (finding types, priority < 80%) |
| Student sees audit | FE `workspace/AuditFeedback.jsx`, "Audited" tag in `DeptQueue.jsx` · data = `ChartResult.audit` |
| Physician queries (admin answers) | FE `pages/admin/Queries.jsx` · BE `adminQuery.*` |
| Code search / ICD index & notes | FE `components/code-search/FindACode.jsx`, `services/codeDb.js`, `public/data/codes/*.js` · BE `code.*`, `icd*.model.js` |
| Medicare fees (RVU) | BE `fee.*`, `scripts/seedFees.js`, data `backend/src/data/RVU26A|B|C/` |
| Progress / certificates / resume | `myProgress.*`, `certificate.*`, `resume.*` · FE `pages/student/Progress.jsx`, `CertificatePage.jsx`, `resume/` |
| Audit log | BE `audit.*`, `utils/auditDiff.js`, `config/auditLog.js` · FE `pages/admin/AuditLog.jsx` |
| Media (S3) | BE `media.*`, `middlewares/uploadMedia.js` · FE `services/media.service.js` |
| Navigation / sidebar | FE `config/navigation.js`, `components/layout/Sidebar.jsx` |

## 6. Domain rules already decided (don't re-ask, don't undo)

- Workspace must feel like **Epic charge review + denial flow**. The reference PDF contains PHI — never
  copy patient data from it. The EHR shell follows Epic's layout and workflow closely but never uses
  Epic's name, logo or icons (trade dress); evidence linking was removed from the Documents panel.
- Work types: `code`, `review` (charge review), `denial`, `drg` (DRG validation).
- Coding steps order (OP / professional): **E/M → CPT → HCPCS → ICD-10-CM → Modifiers & Dx link**
  (E/M first, user's choice). E/M tab only in `EM`, `ED_PRO`, `ED_FAC` departments.
- OP → first diagnosis is **primary** (OCG IV). IP → **principal** (OCG II). IP facility = ICD-10-PCS,
  POA, abstract, MS-DRG; IP professional = CPT/HCPCS lines, no POA. Legacy charts without
  `encounterType` derive it from the department — never write to them silently.
- **Submit is always enabled**; open edits cost marks; only a **pending physician query** blocks submit.
- Coding steps are **stacked vertically and unlock in order** (2026-11-27): E/M, CPT, HCPCS are done with a
  code or a "None at this visit" tick (`draft.noneSteps`); ICD-10-CM needs ≥1 diagnosis; Modifiers is last.
  Rules + wording: BE `config/codingSteps.js` → `chart.codingSteps`; UI `ehr/ui/StepStack.jsx`. Locks never block Submit.
- Physician queries: **no auto-reply**; admin answers on `/admin/queries`; `cdiResponse` is a suggestion only.
- `chart.previousRecords` drives the workspace "Previous records" panel (admin form editor not built yet).
- Fee schedule: CMS RVU files → `npm run seed:fees` → `fee*` collections; the `codes` collection is untouched.
- Student APIs **never return answer keys** (the auditor's `/audits/:studentId/:chartId` does).
- Audits: completing one sets `ChartResult.accuracy` to the audited score (`autoAccuracy` keeps the
  automatic one); issued certificates are never revoked. An audit belongs to one submission
  (`ChartAudit.resultAt === ChartResult.at`): a resubmission drops the audit and the chart returns to
  the queue. `ChartResult.submission` / `checks` are saved on submit for the auditor and excluded from
  list reads via `ChartResult.RESULT_LIST_FIELDS`.

## 7. How to work with this user (saves credits and rework)

- The user is **not a medical coder**: Claude decides the correct coding behaviour, but **states the
  plan briefly and confirms before editing** non-trivial changes.
- **Don't delete files** — disconnect/unwire features instead (remove the route/import, keep the file).
- **Keep everything dynamic**: labels, option lists, statuses, thresholds and limits come from the backend
  (`config/*.js` / reference DB via an API such as `GET /reference/work-queue`, `GET /audits/meta`), never
  hard-coded in React. Render record fields from the data, not from a fixed field list.
- Don't explore the whole repo: use §5, then `Grep` for the symbol, then read only that range.
- Don't re-read files just edited; don't run broad `ls -R`/`find` over `node_modules` or `public/data`
  (huge generated code-data files — grep them, never read whole).
- Large files: `refinements.css` (~5k lines), `WorkspacePage.jsx`, `Sections.jsx` (~1k each),
  `public/data/codes/*.js`, `backend/src/data/RVU*` — always targeted reads.
- After a backend change touching tested areas, run `node --test test/` in `backend/`.
  After a frontend change, `npm run build` in `Frontend/` catches import/syntax errors.
- Commit only when asked. Working branch is usually `modify`; main branch is `master`.

## 8. Keep this file current

When a task adds a module, route, page, rule or decision that a future session would otherwise have to
rediscover, add one line to the right section above (task map in §5, decisions in §6). Remove lines
that become wrong. Keep it short — this file is loaded on every prompt.
