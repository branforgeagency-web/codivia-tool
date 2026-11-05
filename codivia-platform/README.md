# CODIVIA Platform — source code

Medical-coding practice platform: students code real-format charts, get scored with a reason, track progress, and build a certificate and resume. Admins allocate charts and review performance; auditors have a read-only view.

- **Build:** `CODIVIA-BUILD-APP-1102A` (marker is in `public/app.html`)
- **Live URL:** https://codivia-platform.web.app/app.html
- **Firebase project:** `codivia-platform`
- **Content:** 11,400 charts across 22 departments · 171,568 codes (ICD-10-CM, CPT, HCPCS, ICD-10-PCS)

---

## 1. Tech stack

| Layer | What |
|---|---|
| UI | React 18 (UMD build from unpkg), written with `React.createElement` (aliased as `e`) — no JSX, **no build step** |
| Auth | Firebase Authentication (email + password) |
| Database | Cloud Firestore |
| Files | Firebase Storage (student certificates, uploaded charts) |
| Hosting | Firebase Hosting |
| Fonts | Google Fonts — IBM Plex Sans / Mono, Bricolage Grotesque, Caveat, Gochi Hand |

The app is plain HTML + CSS + JavaScript. Every file in `public/` is served as-is.

## 2. Run locally

Any static web server works (the files must be served over http, not opened with `file://`):

```bash
cd public
python3 -m http.server 8080
# open http://localhost:8080/app.html
```

or `npx serve public`, or `firebase serve`.

## 3. Deploy

```bash
npm i -g firebase-tools
firebase login
firebase deploy --only hosting      # project is set in .firebaserc
```

## 4. Folder structure

```
public/
  app.html                     entry page — loads everything below in order
  css/app.css                  all styles (base app + sign-in screen)
  js/
    firebase.js                Firebase init + window.CV_FB data API (ES module)
    brand.js                   logo paths
    codedb-loader.js           decompresses the code database in the browser
    app/                       the React app, split by feature (loaded in this order)
      00-config.js             code systems, modifiers, POA, DEPTS (department list)
      01-allocation.js         chart allocation model, helpers
      02-app-root.js           App root: auth state, role routing
      03-login.js              sign-in / Start free screen + guest mode
      04-topbar.js
      05-student-app.js        student workspace shell + result saving
      06-dashboard.js
      07-coding-guidelines.js
      08-departments-progress.js
      09-code-search.js        Code Search, Drug Reference, Find-a-Code
      10-certificates.js
      11-resume.js             resume builder (35 templates)
      12-dept-queue.js         chart queue per department
      13-coder.js              coding screen, scoring, result modal
      14-admin.js              admin overview, departments, chart browser, performance
      15-admin-upload.js       admin chart upload + PHI scan
      16-admin-allocate.js     bulk allocate, students list, allocation modals
      17-auditor.js
      18-boot.js               mounts React into #root
  data/
    charts/<DEPT>.js           charts, one file per department (window.CHART_DATA[DEPT])
    codes/code-db.js           full code set, gzip + base64
    codes/icd-*.js             Alphabetic Index, External Cause Index, Tabular notes,
                               Neoplasm Table, Table of Drugs (gzip + base64)
    coding-guide.js            Coding Guidelines reference content
  assets/
    brand/                     logo.png, logo-white.png
    departments/               department images used on the sign-in screen
tools/
  export-charts-json.mjs       exports all charts to plain JSON (node tools/export-charts-json.mjs)
firebase.json, .firebaserc     hosting config
```

**Important:** the files in `js/app/` are classic scripts that share one global scope (they are one program split into files). Keep the load order in `app.html`. Moving to ES modules or a bundler (e.g. Vite) is a reasonable next step.

## 5. Chart data

`window.CHART_DATA` is an object keyed by department. Each chart:

```json
{
  "id": "CARDIO-0001",
  "dept": "CARDIO",
  "deptName": "Cardiology",
  "difficulty": "beginner | intermediate | advanced",
  "title": "…",
  "patient": { "name": "…", "sex": "F", "age": 18 },
  "record": "full clinical note text (sections separated by headings)",
  "answerKey": [ { "code": "I35.0", "desc": "…", "type": "ICD10CM | CPT | HCPCS | ICD10PCS", "why": "rationale" } ],
  "handwritten": false
}
```

| Dept key | Charts | Dept key | Charts |
|---|---|---|---|
| ED_PRO | 150 | GENSURG | 150 |
| ED_FAC | 150 | PEDS | 600 |
| EM | 150 | URO | 600 |
| IM | 600 | ENT | 600 |
| FP | 600 | HEMONC | 600 |
| ORTHO | 600 | IP | 600 |
| CARDIO | 600 | HH | 600 |
| GI | 600 | RAD | 600 |
| OBGYN | 600 | PATH | 600 |
| DERM | 600 | IVR | 600 |
| ANES | 600 | DME | 600 |
| | | **Total** | **11,400** |

Department names, icons and code systems are in `DEPTS` (`js/app/00-config.js`). A department is shown only if it has charts.

## 6. Firestore / Storage data model

All reads and writes go through `window.CV_FB` in `js/firebase.js`.

| Path | Contents |
|---|---|
| `students/{uid}` | profile: name, email, Student ID |
| `students/{uid}/progress/main` | `{ results: { [chartId]: { accuracy, total, correct, dept, at, miss[], wrong[] } }, updatedAt }` |
| `allocations/{uid}` | which departments / chart ranges a student can access |
| `roles/{uid}` | `admin` / `auditor` (no doc = student) |
| `counters/students` | running number for Student IDs |
| `uploadedCharts/{id}` | charts uploaded by admins |
| Storage `certificates/{uid}/…` | certificate files uploaded by students |

`CV_FB` functions: `register, login, logout, resetPassword, getStudent, getRole, getAllocation, setAllocation, listStudents, saveProgress, loadProgress, uploadCert, listCerts, deleteCert, uploadChartFile, saveUploadedChart, listUploadedCharts, deleteUploadedChart`.

Results are saved after each chart is submitted. Only scores and the missed/wrong codes are stored (not rationale text) to stay under Firestore's 1 MiB document limit.

## 7. Roles and access

- **Student:** sees only allocated departments. Allocation is a number N (first N charts) or a range (`allocRange` / `allocCount` / `allocSlice` in `01-allocation.js`). New sign-ups have no departments until an admin allocates them.
- **Admin / Auditor:** set by a `roles/{uid}` document.
- **Guest (no login):** opening the app while signed out starts a guest session with 5 charts in every department. Guest results are kept only in the browser (`localStorage` key `cvx-guest-results`), not in Firestore.
  - `app.html?login=1` — sign-in screen
  - `app.html?signup=1` — Start free (create account)
  - `app.html?signup=1&dept=CARDIO` — Start free with a department pre-selected

## 8. Known items for the team

1. **Guest mode is the default when signed out.** Existing students who don't sign in will practise as guests and their work won't reach Firestore. Consider showing the sign-in screen first and keeping "Continue without signing in" as a secondary option (`02-app-root.js`, `cvxWantsLogin()` in `03-login.js`).
2. **Load size.** All charts (~25 MB) and the code database load on every visit. Recommended: load a department's chart file only when it is opened, or move charts into Firestore/Storage.
3. **React version** is `react@18` (unpinned) from unpkg. Pin an exact version (e.g. `18.3.1`) or bundle it.
4. **Security rules.** Confirm Firestore and Storage rules so students can read/write only their own `students/{uid}` data and only admins can write `allocations`, `roles` and `uploadedCharts`.
5. **CPT descriptions** in the code database are the full official descriptors. CPT descriptor text is licensed by the AMA, so check the licence or replace them with short in-house descriptions.
6. **Patient names:** about 3,280 charts use non-US patient names. Standardise to US names for consistency with US payer settings.
