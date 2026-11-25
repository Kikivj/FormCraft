# FormCraft

FormCraft is a React form builder backed by an Express API and MongoDB. It supports authenticated admin workflows for form design and submission management, plus public rendering and submission of published forms.

## Architecture

- `frontend/`: React 19, Vite, React Router-style route handling in `App.jsx`, and Redux Toolkit slices for auth, forms, the builder, and submissions.
- `backend/`: Express 5 API. Mongoose models and validation utilities handle persistence and server-side validation.
- `backend/config/db.js`: Loads `backend/.env` by absolute path and connects Mongoose using `MONGO_URI`.
- `postman/FormCraft.postman_collection.json`: API requests for bootstrap, auth, forms, public submission, and admin submission management.

The browser calls the relative `/api` path by default. Vite proxies `/api` to `http://localhost:5000` during development. In production, configure the frontend API base URL and reverse proxy to route `/api` to the backend with credentials enabled.

## Run locally

Install dependencies at the repository root and in each application directory:

```sh
npm install
npm --prefix frontend install
npm --prefix backend install
```

Copy `backend/.env.example` to `backend/.env`, set the required values, then start both apps:

```sh
npm run dev
```

The Vite frontend defaults to `http://localhost:5173`; the API defaults to `http://localhost:5000`. Check API availability with:

```sh
curl http://localhost:5000/api/health
```

`ADMIN_EMAIL`, `ADMIN_PASSWORD`, and `ADMIN_BOOTSTRAP_TOKEN` are used only for initial admin registration. After creating the first admin, remove the bootstrap token and do not expose these values in frontend configuration. `JWT_SECRET` and `MONGO_URI` remain backend-only secrets.

## Data model and indexes

| Collection | Stored data | Indexes |
| --- | --- | --- |
| `admins` | Normalized unique email, bcrypt password hash, admin role | Unique email and singleton keys |
| `forms` | Name, description, draft/published status, ordered field definitions | `{ status: 1, updatedAt: -1 }`; MongoDB `_id` index |
| `submissions` | `formId`, validated response object, submitted/created/updated timestamps | `{ formId: 1, submittedAt: -1, _id: -1 }`, plus the submitted-at index and MongoDB `_id` index |

Fields are embedded in a form document because they are read and updated with their form. Submissions are separate documents so a form can collect many responses without growing an unbounded embedded array. Each submission stores dynamic answers in `responses` and is associated with its form by `formId`.

## API overview

All paths below are relative to `/api`.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Bootstrap token | Create the initial admin once |
| `POST` | `/auth/login` | Public, rate limited | Start an admin session using an HTTP-only cookie |
| `GET` | `/auth/me` | Admin | Read current admin session |
| `POST` | `/auth/logout` | Public | Clear the admin cookie |
| `POST` / `GET` | `/forms` | Admin | Create a form / list forms |
| `GET` | `/forms/admin/:id` | Admin | Read a form for editing |
| `GET` | `/forms/:id` | Public | Read a published form definition |
| `PUT` / `DELETE` | `/forms/:id` | Admin | Update / delete a form |
| `POST` | `/forms/:id/submissions` | Public, rate limited | Validate and save a response for a published form |
| `GET` | `/forms/:id/submissions?page=1&limit=10` | Admin | Paginated submissions with total and page metadata |
| `GET` / `DELETE` | `/forms/:id/submissions/:submissionId` | Admin | View / delete one submission |

Admin requests use the `formcraft_admin` HTTP-only cookie. Public reads and submissions are allowed only for published forms. Backend validation accepts `TEXT`, `EMAIL`, `NUMBER`, `PHONE`, `TEXTAREA`, `DATE`, `SELECT`, `RADIO`, and `CHECKBOX`, and rejects unknown field keys and invalid configured options.

## Assessment-scale considerations

The data model separates form definitions from responses and has a compound index supporting per-form newest-first submission queries. These choices provide a sound starting point for growth, but **this repository has not been load-tested or benchmarked at 50,000 forms or 10 million submissions**.

Before making that scale claim in production, address these current limits:

1. `GET /forms` currently returns the full form list. Add server-side pagination and bounded response sizes for 50,000+ forms.
2. Submission pagination uses `skip`/`limit`. Deep pages become more expensive as offsets grow; add cursor pagination using `(submittedAt, _id)` while retaining the matching compound index.
3. Public submission requests read the form definition before validating answers. Measure this path and add a bounded cache with invalidation on form updates if database load requires it.
4. Define backup, restore, retention, and archival procedures for millions of responses. Do not rely on unbounded application memory or large exports.
5. Establish production MongoDB topology, connection pool sizing, monitoring, rate limits, and load tests. For a multi-tenant deployment, add tenant ownership to the data model and compound indexes before sharding or tenant isolation is required.

These are scalability tasks, not capabilities verified by this local assessment. Do not claim the 50,000/10-million target without representative load tests and operational evidence.

## API requests

Import `postman/FormCraft.postman_collection.json` into Postman. Set collection variables locally; leave the provided credential values blank in shared collections. The Postman cookie jar retains the HTTP-only session cookie after login.

Recommended flow: bootstrap once if no admin exists, log in, create and publish a form, retrieve it publicly, submit valid and invalid responses, list submissions with pagination, view one response, delete it, then log out. Deletion requests are destructive; use disposable assessment data when exercising them.
