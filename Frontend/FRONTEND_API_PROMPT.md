# Frontend API Layer — React (Vite) + `fetch`

> **Prompt for the AI:** Set up (or extend) the API layer of this React frontend using **exactly** the files, naming and patterns described below. It is the client side of the backend in [`backend/BACKEND_BOILERPLATE_PROMPT.md`](../backend/BACKEND_BOILERPLATE_PROMPT.md). Do not add other patterns: no axios, no React Query / SWR, no Redux, no per-feature fetch wrappers, no hard-coded URL strings in components. When I ask to call a new backend route, follow the **"Adding a new API call"** checklist at the end. Keep code short and comment only where the "why" is not obvious.

---

## 1. Tech stack

| Purpose | Choice |
|---|---|
| HTTP | native `fetch` wrapped once in `services/apiHelper.js` |
| Auth tokens | access token in a cookie (short-lived), refresh token in `localStorage` |
| Server state | plain `useState` / `useEffect` + two small hooks (`useApiList`, cached loaders) |
| Env | Vite `import.meta.env.VITE_*` |

Plain JavaScript (ES modules, `.js` / `.jsx`), no TypeScript.

---

## 2. Folder structure

```
Frontend/
├── .env                     # real values (git-ignored)
├── .env.example             # VITE_API_BASE_URL=http://localhost:3000/api/v1
└── src/
    ├── config/
    │   └── env.js           # reads import.meta.env once
    ├── services/
    │   ├── apiHelper.js     # THE only place that calls fetch: base URL, token, refresh, errors
    │   ├── endpoints.js     # every backend route as a constant or builder function
    │   ├── tokenCookies.js  # get/save/clear access + refresh tokens
    │   ├── auth.service.js  # login / register / me / logout (multi-step: stores tokens)
    │   └── <feature>.service.js  # only when a call needs extra logic (see §6)
    ├── hooks/
    │   ├── useApiList.js    # server-paged list (page, limit, filters, reload)
    │   └── use<Thing>.js    # cached one-time loaders (e.g. useReference)
    ├── context/             # SessionContext (current user), role contexts that load shared data
    └── pages/ · components/ # import { get, post, … } + endpoint constants; no raw URLs
```

### Naming rules
| Thing | Rule | Example |
|---|---|---|
| Collection route | `UPPER_SNAKE` constant | `ADMIN_STUDENTS = '/admin/students'` |
| Route with ids | builder function, every id through `encodeURIComponent` | `ADMIN_STUDENT(userId)` |
| Sub-route | built from its parent | `` ADMIN_STUDENT_STATUS = (id) => `${ADMIN_STUDENT(id)}/status` `` |
| Service file | `<feature>.service.js`, named function exports | `uploadMedia(file, { folder })` |
| Hook | `use<Thing>.js`, named export | `useApiList`, `useReference` |

---

## 3. Request flow

```
component / context / hook
      │  get(ENDPOINT, { params })  ·  post(ENDPOINT_FN(id), body)
      ▼
services/apiHelper.js  request()
      │  1. reject absolute URLs / query strings in the path (token stays on our API origin)
      │  2. access cookie expired but refresh token present → refresh first
      │  3. add  Authorization: Bearer <access>  ·  JSON body (or FormData as-is)
      │  4. fetch(VITE_API_BASE_URL + endpoint + ?params)
      │  5. 401 → refreshSession() once (shared across calls and tabs) → retry once
      │  6. parse JSON · !ok → throw ApiError(message, status, data)
      ▼
backend /api/v1/...  →  JSON  { ...resource }  |  { results, page, limit, totalPages, totalResults }
                            errors: { code, message, details? }
```

- Components **never** call `fetch` and never build URLs by hand; they import a helper + an endpoint.
- Query strings go in `options.params` (`undefined` / `null` values are skipped), never in the endpoint string.
- Every failure is an `ApiError` with `.message` (the backend's `message`), `.status` and `.data` (full error body, incl. `details`).
- When the refresh token is rejected, tokens are cleared and the `cv-session-expired` window event fires; `SessionContext` listens and shows sign-in.

### Response shapes the frontend relies on
```json
// single resource / action
{ "id": "...", "name": "..." }
// paged list (all list endpoints)
{ "results": [], "page": 1, "limit": 10, "totalPages": 1, "totalResults": 0 }
// error (any status >= 400)
{ "code": 400, "message": "Validation failed", "details": [{ "field": "name", "message": "name is required" }] }
// login / refresh
{ "user": {}, "tokens": { "access": { "token": "", "expiresAt": "" }, "refresh": { "token": "", "expiresAt": "" } } }
```
`DELETE` returns `204` with no body → the helper resolves to `null`.

---

## 4. Core files (create these exactly)

### `src/services/apiHelper.js`
```js
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './tokenCookies';
import { REFRESH_TOKENS } from './endpoints';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

// Fired when the session can't be renewed, so the app can show the sign-in screen.
export const SESSION_EXPIRED_EVENT = 'cv-session-expired';

// One refresh at a time: concurrent 401s all wait for the same new token pair.
// Each refresh token works once (rotation; reuse revokes the session), so tabs also take
// a shared lock, and skip the refresh if another tab already renewed the tokens.
const withRefreshLock = (fn) =>
  navigator.locks ? navigator.locks.request('cv-refresh-tokens', fn) : fn();

let refreshing = null;
export function refreshSession() {
  if (!refreshing) {
    const accessBefore = getAccessToken();
    refreshing = withRefreshLock(async () => {
      const accessNow = getAccessToken();
      if (accessNow && accessNow !== accessBefore) return true; // renewed by another tab
      const refreshToken = getRefreshToken();
      if (!refreshToken) return false;
      try {
        const { tokens } = await request('POST', REFRESH_TOKENS, { refreshToken }, { auth: false, retry: false });
        saveTokens(tokens);
        return true;
      } catch {
        clearTokens();
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
        return false;
      }
    }).finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request(method, endpoint, data, options = {}) {
  // Accept relative API routes only, so the access token stays on this API origin.
  if (
    typeof endpoint !== 'string' ||
    !endpoint.startsWith('/') ||
    endpoint.startsWith('//') ||
    /[\\?#]/.test(endpoint)
  ) {
    throw new Error('Pass a relative API endpoint; use options.params for query parameters');
  }
  const { params, auth = true, retry = true, headers: extraHeaders, ...fetchOptions } = options;
  // Access token cookie already expired: renew before sending rather than after a 401.
  if (auth && retry && !getAccessToken() && getRefreshToken()) await refreshSession();
  const url = new URL(`${API_BASE_URL}${endpoint}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    });
  }
  const headers = new Headers(extraHeaders);
  const token = auth ? getAccessToken() : null;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
  if (data !== undefined && !isForm) headers.set('Content-Type', 'application/json');
  const response = await fetch(url, {
    ...fetchOptions,
    redirect: 'error',
    method,
    headers,
    body: data === undefined ? undefined : isForm ? data : JSON.stringify(data),
  });
  if (response.status === 401 && auth && retry && getRefreshToken() && (await refreshSession())) {
    return request(method, endpoint, data, { ...options, retry: false });
  }
  const text = await response.text();
  let result = text || null;
  if (text && response.headers.get('content-type')?.includes('json')) {
    try {
      result = JSON.parse(text);
    } catch {
      /* Keep non-JSON error text available. */
    }
  }
  if (!response.ok)
    throw new ApiError(result?.message || `Request failed (${response.status})`, response.status, result);
  return result;
}

export const get = (endpoint, options) => request('GET', endpoint, undefined, options);
export const getById = (endpoint, id, options) => {
  if (id === undefined || id === null || id === '') throw new Error('An ID is required');
  return get(`${endpoint.replace(/\/$/, '')}/${encodeURIComponent(id)}`, options);
};
export const post = (endpoint, data, options) => request('POST', endpoint, data, options);
export const patch = (endpoint, data, options) => request('PATCH', endpoint, data, options);
export const put = (endpoint, data, options) => request('PUT', endpoint, data, options);
export const del = (endpoint, options) => request('DELETE', endpoint, undefined, options);
export { del as delete };
```

**Options** (last argument of every helper):

| Option | Default | Use |
|---|---|---|
| `params` | – | query string object: `{ page, limit, search, status }` |
| `auth` | `true` | `false` for public routes (login, register, public lists) |
| `retry` | `true` | `false` to skip the refresh-and-retry on 401 |
| `signal` | – | `AbortController.signal` to cancel (uploads, search-as-you-type) |
| `headers` | – | extra headers; never set `Authorization` yourself |

### `src/services/tokenCookies.js`
```js
const ACCESS_COOKIE = 'codivia_access_token';
const REFRESH_KEY = 'codivia_refresh_token';

export function getAccessToken() {
  const cookie = document.cookie.split('; ').find((v) => v.startsWith(`${ACCESS_COOKIE}=`));
  return cookie ? decodeURIComponent(cookie.slice(ACCESS_COOKIE.length + 1)) : null;
}

// The cookie expires with the token, so an expired token simply disappears.
export function setAccessToken(token, expiresAt) {
  const expiry = new Date(expiresAt);
  if (typeof token !== 'string' || !token || !Number.isFinite(expiry.getTime()) || expiry <= new Date()) {
    throw new Error('A valid access token and future expiry are required');
  }
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ACCESS_COOKIE}=${encodeURIComponent(token)}; Path=/; Expires=${expiry.toUTCString()}; SameSite=Lax${secure}`;
}

export function clearAccessToken() {
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ACCESS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}

// Never sent as a cookie; only POST /auth/refresh-tokens and /auth/logout receive it.
// TODO: move to an HttpOnly cookie set by the backend so page scripts cannot read it.
export function getRefreshToken() {
  try { return localStorage.getItem(REFRESH_KEY); } catch { return null; }
}
export function setRefreshToken(token) {
  try { localStorage.setItem(REFRESH_KEY, token); } catch { /* private mode: session ends with the access token */ }
}
export function clearRefreshToken() {
  try { localStorage.removeItem(REFRESH_KEY); } catch { /* ignore */ }
}

// Store both tokens from a login / refresh response.
export function saveTokens(tokens) {
  setAccessToken(tokens.access.token, tokens.access.expiresAt);
  if (tokens.refresh?.token) setRefreshToken(tokens.refresh.token);
}

export function clearTokens() {
  clearAccessToken();
  clearRefreshToken();
}
```

### `src/services/endpoints.js`
Paths are relative to `VITE_API_BASE_URL` (which already ends in `/api/v1`). Group by feature, one comment line per group saying who may call it and the body/query it takes.
```js
// Auth
export const LOGIN = '/auth/login';
export const REGISTER = '/auth/register';
export const REFRESH_TOKENS = '/auth/refresh-tokens';
export const LOGOUT = '/auth/logout';
export const ME = '/auth/me';

// Admin Students (admin only)
export const ADMIN_STUDENTS = '/admin/students';                       // GET ?status=&search=&page=&limit=  · POST
export const ADMIN_STUDENT = (userId) => `${ADMIN_STUDENTS}/${encodeURIComponent(userId)}`; // GET · PATCH · DELETE
export const ADMIN_STUDENT_STATUS = (userId) => `${ADMIN_STUDENT(userId)}/status`;          // PATCH { status }

// Media (multipart/form-data) → { key, url, name, size, mimeType, folder }
export const MEDIA_UPLOAD = '/media-upload';
```

### `src/services/auth.service.js`
```js
import { get, post } from './apiHelper';
import { LOGIN, LOGOUT, ME, REGISTER } from './endpoints';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './tokenCookies';

// Returns { user, tokens }; tokens are stored, so later calls are signed in.
export async function login(email, password) {
  const result = await post(LOGIN, { email, password }, { auth: false });
  saveTokens(result.tokens);
  return result;
}

export function register(name, email, password) {
  return post(REGISTER, { name, email, password }, { auth: false });
}

// The signed-in user, or null when there is no session (or it can't be renewed).
export async function getCurrentUser() {
  if (!getAccessToken() && !getRefreshToken()) return null;
  try {
    return await get(ME);
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      clearTokens();
      return null;
    }
    throw err;
  }
}

// Revokes the refresh token on the server, then forgets both tokens locally.
export async function logout() {
  const refreshToken = getRefreshToken();
  clearTokens();
  if (!refreshToken) return;
  try {
    await post(LOGOUT, { refreshToken }, { auth: false });
  } catch {
    /* already expired or revoked */
  }
}
```

### `src/hooks/useApiList.js` (server-paged lists)
```js
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { get } from '../services/apiHelper.js';

/**
 *   const list = useApiList(ADMIN_STUDENTS, { params: { status, search }, reloadKey: version });
 *   list.results · list.data (whole response) · list.loading · list.error · list.reload()
 *   <Pagination {...list.pagerProps} itemLabel="students" />
 * - Sends ?page=&limit= with the params; back to page 1 when params change.
 * - Empty / undefined params are left out of the URL.
 */
export function useApiList(endpoint, { params = {}, limit = 10, initialPage = 1, reloadKey, enabled = true } = {}) {
  const [page, setPage] = useState(Math.max(1, Number(initialPage) || 1));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const clean = useMemo(
    () => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(params)],
  );
  const paramsKey = JSON.stringify(clean);
  const lastParams = useRef(paramsKey);

  useEffect(() => {
    if (lastParams.current === paramsKey) return;
    lastParams.current = paramsKey;
    setPage(1);
  }, [paramsKey]);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    get(endpoint, { params: { ...clean, page, limit } })
      .then((r) => {
        if (cancelled) return;
        if (r.totalPages && page > r.totalPages) setPage(r.totalPages); // rows removed: last page
        else setData(r);
      })
      .catch((e) => !cancelled && setError(e.message || 'Could not load data.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, paramsKey, page, limit, reloadKey, tick, enabled]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const total = data?.totalResults || 0;

  return {
    data,
    results: data?.results || [],
    total,
    loading,
    error,
    page,
    setPage,
    reload,
    totalPages: data?.totalPages || 1,
    pagerProps: { page, pageSize: data?.limit || limit, total, totalPages: data?.totalPages, onPageChange: setPage },
  };
}
```

### Cached one-time loader (reference data shared by many screens)
```js
// hooks/useReference.js — GET once per page load, every caller shares the same promise/result.
let pending = null;
let loaded = null;

export function loadReference() {
  if (loaded) return Promise.resolve(loaded);
  if (!pending) {
    pending = get(REFERENCE_WORK_QUEUE)
      .then((r) => (loaded = r))
      .finally(() => { pending = null; });
  }
  return pending;
}
// useReference() wraps loadReference() in useState/useEffect and exposes { ref, error, retry }.
```

---

## 5. Handling patterns (use these in components)

### Read one resource on mount
```jsx
const [chart, setChart] = useState(null);
const [error, setError] = useState('');

useEffect(() => {
  let cancelled = false;
  get(ADMIN_CHART(chartId))
    .then((r) => !cancelled && setChart(r))
    .catch((e) => !cancelled && setError(e.message));
  return () => { cancelled = true; }; // ignore late answers after unmount / id change
}, [chartId]);
```

### Paged, filtered list
```jsx
const [search, setSearch] = useState('');
const debounced = useDebounced(search, 300);
const list = useApiList(ADMIN_STUDENTS, { params: { status, search: debounced }, reloadKey: version });

{list.error && <ErrorNote>{list.error}</ErrorNote>}
{list.results.map((s) => <StudentRow key={s.id} student={s} />)}
<Pagination {...list.pagerProps} itemLabel="students" />
```

### Mutation (create / update / delete) from a form or dialog
```jsx
const [busy, setBusy] = useState(false);
const [error, setError] = useState('');
const [fieldErrors, setFieldErrors] = useState({});

async function onSubmit(e) {
  e.preventDefault();
  setBusy(true);
  setError('');
  setFieldErrors({});
  try {
    const saved = await patch(ADMIN_STUDENT(student.id), form);
    onSaved(saved);   // parent bumps its reloadKey / updates local state
    onClose();
  } catch (err) {
    // Joi validation errors: { details: [{ field, message }] } → show next to each input
    const details = err.data?.details || [];
    setFieldErrors(Object.fromEntries(details.map((d) => [d.field, d.message])));
    setError(details.length ? '' : err.message);
  } finally {
    setBusy(false);
  }
}
```
Simple confirm dialogs pass the call itself: `onConfirm={() => patch(ADMIN_STUDENT_STATUS(id), { status })}` and let `ConfirmDialog` handle busy/error.

### File upload (multipart)
```js
const form = new FormData();
form.append('folder', 'charts');
form.append('file', file, file.name);
await post(MEDIA_UPLOAD, form, { signal }); // helper leaves Content-Type to the browser
```
Validate type/size on the client first (`checkMediaFile`), the server checks again.

### Public (no sign-in) call
```js
const departments = await get(PUBLIC_DEPARTMENTS, { auth: false });
```

### Refresh after a change
Parents keep `const [version, setVersion] = useState(0)` and pass `reloadKey: version` to `useApiList`; children call `onSaved={() => setVersion((v) => v + 1)}`. For polling, call `list.reload()` on an interval only while `document.visibilityState === 'visible'`.

### Status codes to handle in the UI
| Status | Meaning | UI |
|---|---|---|
| `400` | validation (`details[]`) | field messages |
| `401` | session gone after refresh failed | handled globally (sign-in screen) |
| `403` | role/permission | "You don't have access" |
| `404` | not found | empty / not-found state |
| `409` | conflict (duplicate) | message next to the field |
| `429` | rate limited | show `err.message`, let the user retry |
| `5xx` / network | server down | generic error + retry button |

---

## 6. When to add a `<feature>.service.js`

Call `get/post/...` directly from the component when it is one request with a body. Create a service function only when the call needs more than that:

- stores something (tokens → `auth.service.js`),
- builds a special body (FormData, file checks → `media.service.js`),
- chains several requests or reshapes the response for more than one screen.

```js
// services/media.service.js
export async function uploadMedia(file, { folder = 'charts', signal } = {}) {
  checkMediaFile(file, folder);
  const form = new FormData();
  form.append('folder', folder);
  form.append('file', file, file.name);
  return post(MEDIA_UPLOAD, form, signal ? { signal } : undefined);
}
```

Shared data many screens need (current user, a student's departments) is loaded once in a context (`SessionContext`, `AdminContext`, `StudentContext`), not re-fetched by each page.

---

## 7. Conventions checklist

- [ ] No `fetch`, `axios` or URL strings outside `services/apiHelper.js` / `services/endpoints.js`.
- [ ] Every id in a path goes through `encodeURIComponent` inside an endpoint builder.
- [ ] Query parameters go in `{ params }`, never concatenated into the path.
- [ ] Every effect that fetches ignores late responses (`cancelled` flag or `AbortController`).
- [ ] Every request shows a loading state and an error state; buttons are disabled while busy.
- [ ] Show `err.message` from the backend; map `err.data.details` to fields for 400s.
- [ ] Lists use `useApiList` and the backend's paged shape; no client-side paging of server lists.
- [ ] Public routes pass `{ auth: false }`.
- [ ] Never read or set `Authorization` / tokens outside `tokenCookies.js`, `apiHelper.js`, `auth.service.js`.

---

## 8. Adding a new API call — checklist

1. **Backend first**: route exists per the backend boilerplate (`routes/v1/<feature>.route.js`) and you know its method, body, query and response shape.
2. **`endpoints.js`**: add a constant (or builder for ids) in the feature's group, with a one-line comment: method(s), body/query, who may call it.
3. **Call it**:
   - list → `useApiList(ENDPOINT, { params })`
   - single read → `get(ENDPOINT(id))` in an effect with a cancel flag
   - write → `post/patch/put/del` in a submit handler with `busy` / `error` / field errors
   - extra logic (§6) → add a function to `services/<feature>.service.js` and call that
4. **Refresh**: bump the parent's `reloadKey` (or update local state) after a successful write.
5. **Errors**: handle 400 details, 403 and 404 states as in §5.
6. **Test** signed in as each role that can reach the screen, plus an expired access token (refresh path).
