# Codivia project analysis

Reviewed the `redesign` working tree on 28 November 2026, including the in-progress EHR and chart-media changes. This is a repository-level review covering the main product flows, technical structure, and verification gaps. [CLAUDE.md](CLAUDE.md) is the detailed file map and record of product decisions. The [frontend API guide](Frontend/FRONTEND_API_PROMPT.md) and [backend guide](backend/BACKEND_BOILERPLATE_PROMPT.md) describe implementation conventions.

## Product and architecture

Codivia is a medical-coding training platform. Administrators prepare and allocate practice charts, students code cases and receive scores, and assigned auditors can review submissions and adjust the official score.

| Area | Implementation |
| --- | --- |
| Frontend | React 18 and Vite. Role-specific routes and layouts support student, admin, and auditor workflows. Session and feature contexts share data, while `apiHelper.js` handles HTTP and token refresh. [Routes](Frontend/src/routes/AppRoutes.jsx) · [API client](Frontend/src/services/apiHelper.js) |
| Backend | Express 5 exposes `/api/v1`. Route middleware handles authentication, permissions, and Joi validation. Controllers delegate to services, which use MongoDB through Mongoose. [API registry](backend/src/routes/v1/index.js) · [Application setup](backend/src/app.js) |
| Storage | MongoDB stores users, allocations, charts, drafts, results, audit records, and reference data. IndexedDB stores local coding drafts. S3 stores chart files and attachments. [Models](backend/src/models/index.js) · [Offline module](Frontend/src/offline/index.js) · [Media service](backend/src/services/media.service.js) |
| Reference material | Code search, guidelines, fee schedules, and lookup lists support the workspace. Seed scripts load reference data, and several code datasets ship as static frontend assets. [Backend scripts](backend/package.json) · [Frontend code data loader](Frontend/src/services/codeDb.js) |
| Hosting | The repository includes an Amplify build for the frontend, with the API origin configured separately through `VITE_API_BASE_URL`. The backend starts as a separate Node process. [Amplify build](amplify.yml) · [Backend entry](backend/src/index.js) · [Frontend environment example](Frontend/.env.example) |

## How work moves through the system

1. **Admin import and allocation.** Admins import a chart file, review the extracted content and answer key, publish the chart, and allocate work. The parser handles visit narrative, previous records, episodes, separate notes, and structured clinical rows. [Upload screen](Frontend/src/pages/admin/UploadCase.jsx) · [Parser](backend/src/utils/readChartText.js) · [Upload service](backend/src/services/chartUpload.service.js) · [Allocation service](backend/src/services/allocation.service.js)
2. **Student chart review and coding.** The workspace loads the assigned chart and existing work. Chart Review turns encounter records, documents, and clinical data into table rows and previews. The side panel holds coding steps, reports, and To Do. `ehr/index.js` is the entry point for the active EHR modules. [Workspace](Frontend/src/pages/student/workspace/WorkspacePage.jsx) · [EHR entry](Frontend/src/pages/student/workspace/ehr/index.js) · [Chart Review data](Frontend/src/pages/student/workspace/ehr/chart-review/chartReviewData.js)
3. **Drafts and submission.** The workspace persists drafts locally and syncs them to the server. Students can also defer or transfer work, add comments, and send physician queries. A pending query blocks submission. The backend grades submissions against the chart answer key and records the result. [Draft sync](Frontend/src/offline/useDraftSync.js) · [Work service](backend/src/services/chartWork.service.js) · [Grading](backend/src/utils/gradeWork.js)
4. **Audit and progress.** Auditors review submissions for assigned student and department pairs. A completed audit can change the official result while retaining the automatic score. Audits are tied to a submission, so a new submission returns the chart to the review queue. Student progress, certificates, and resumes have separate modules. [Audit service](backend/src/services/chartAudit.service.js) · [Progress service](backend/src/services/myProgress.service.js) · [Certificates](backend/src/services/certificate.service.js) · [Resumes](backend/src/services/resume.service.js)

## Findings and follow-up

| Finding | Impact and next check |
| --- | --- |
| Chart media uses a configured object URL. [URL enrichment](backend/src/utils/chartMedia.js) · [Media service](backend/src/services/media.service.js) | The API controls access to the chart payload. The media origin controls access to the returned attachment URL. Verify the deployed media policy with synthetic files and confirm that its access rules match the intended audience for attachments and source charts. |
| Media attaches before the admin saves the chart. Removing an attachment in the form removes its reference from local state. [Upload form](Frontend/src/pages/admin/UploadCase.jsx) | Replacing or removing attachments, or abandoning the form, can leave unreferenced objects. Verify the bucket lifecycle and cleanup behavior for those cases. |
| Submission and final audit each write to multiple collections in separate operations. The audit result update includes a submission timestamp guard. [Submission writes](backend/src/services/chartWork.service.js) · [Audit writes](backend/src/services/chartAudit.service.js) | A partial write or overlapping submit and audit can leave result and work state temporarily out of sync. Exercise retries and concurrent actions against MongoDB, including the case where a guarded result update matches zero records. |
| The EHR tree still contains old flat components alongside the active feature directories. [EHR entry](Frontend/src/pages/student/workspace/ehr/index.js) | Use the exports in `ehr/index.js` when tracing runtime behavior. Similar filenames make it easy to edit an inactive component, particularly in Chart Review. |
| The workspace coordinates chart loading, EHR views, editing, draft recovery, and submission in one page. [Workspace](Frontend/src/pages/student/workspace/WorkspacePage.jsx) | Browser coverage would be most valuable around chart navigation during autosave, offline recovery, and submission after a physician query is answered. No frontend test script is defined in the [package manifest](Frontend/package.json). |

## Verification

- `npm.cmd run build` in `Frontend` succeeded under Node `v26.11.1`.
- `node --test test/*.test.js` in `backend` passed all 36 tests. Coverage includes token refresh, audit behavior, admin work, progress, chart parsing, and media upload with mocked storage.
- Browser workflows, MongoDB integration, live S3 access, and deployed routing remain unverified. The findings about access and multi-write consistency are based on source inspection.

## Local entry points

Use the examples in [Frontend/.env.example](Frontend/.env.example) and [backend/.env.example](backend/.env.example) to configure local services. Run `npm ci` in each package, then `npm run dev` in each directory. The frontend example points to `http://localhost:3000/api/v1`. The [backend package scripts](backend/package.json) list the seed commands for creating the reference data needed by a fresh database.
