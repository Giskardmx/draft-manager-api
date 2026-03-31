# Draft Manager API

A REST API for managing content drafts across their full lifecycle — from raw idea to published post.

Built with Node.js, Express, and TypeScript (strict mode).

---

## Motivation

Content creators often work with drafts scattered across Notion, Google Docs, and local files. There's rarely a single place to track the state of each piece — what's just an idea, what's being written, what's ready to publish.

Draft Manager solves that with a simple pipeline: `IDEA → DRAFT → REVIEW → PUBLISHED`. Each transition has explicit business rules enforced on the server, so the pipeline reflects reality rather than wishful thinking.

---

## Tech stack

- **Runtime:** Node.js 20+
- **Framework:** Express 5
- **Language:** TypeScript 5 (strict mode — `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`)
- **Testing:** Vitest + node-mocks-http

---

## Project structure

```
src/
├── types/           # Interfaces, union types, transition rules
├── data/            # In-memory store — encapsulated, never accessed directly
├── validators/      # Input validation and business rule validators
├── handlers/        # HTTP layer — connects requests to store operations
├── routes/          # Route definitions — maps paths to handlers
└── index.ts         # Entry point
```

Each layer has a single responsibility. Handlers don't touch the store directly. The store knows nothing about HTTP. Validators return results — they never throw.

---

## API

Base URL: `http://localhost:3000`

| Method   | Path           | Description                        |
|----------|----------------|------------------------------------|
| `GET`    | `/drafts`      | List drafts (filterable)           |
| `GET`    | `/drafts/:id`  | Get a single draft                 |
| `POST`   | `/drafts`      | Create a new draft                 |
| `PATCH`  | `/drafts/:id`  | Update fields or advance status    |
| `DELETE` | `/drafts/:id`  | Drop (soft-delete) a draft         |

### Query params — `GET /drafts`

| Param      | Type       | Description                                      |
|------------|------------|--------------------------------------------------|
| `status`   | `string`   | Filter by status. Omit to exclude DROPPED drafts |
| `platform` | `string`   | Filter by platform                               |

### Draft object

```json
{
  "id": "uuid",
  "title": "string",
  "body": "string",
  "status": "IDEA | DRAFT | REVIEW | PUBLISHED | DROPPED",
  "platform": "blog | newsletter | twitter | linkedin",
  "tags": ["string"],
  "estimatedPublishDate": "ISO 8601 — optional",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601"
}
```

### Status transitions

Not all transitions are valid. The server enforces the following rules:

```
IDEA      → DRAFT      (always allowed)
IDEA      → DROPPED    (always allowed)
DRAFT     → REVIEW     (body must be at least 100 characters)
DRAFT     → DROPPED    (always allowed)
REVIEW    → PUBLISHED  (estimatedPublishDate must be set)
REVIEW    → DROPPED    (always allowed)
PUBLISHED → *          (terminal — no transitions allowed)
DROPPED   → *          (terminal — no transitions allowed)
```

Attempting an invalid transition returns `422 Unprocessable Entity` with a descriptive error message.

### Response shape

All endpoints return a consistent wrapper:

```json
{ "data": { ... }, "error": null }
{ "data": null, "error": "Description of what went wrong" }
```

---

## Running locally

```bash
# Install dependencies
npm install

# Start in development mode (restarts on save)
npm run dev

# Run tests
npm test

# Build for production
npm run build
npm start
```

---

## Examples

### Create a draft

```bash
curl -X POST http://localhost:3000/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Why I switched from Java to TypeScript",
    "body": "Still figuring this out",
    "platform": "blog",
    "tags": ["typescript", "java"]
  }'
```

### Advance to DRAFT

```bash
curl -X PATCH http://localhost:3000/drafts/{id} \
  -H "Content-Type: application/json" \
  -d '{"status": "DRAFT"}'
```

### Attempt an invalid transition

```bash
curl -X PATCH http://localhost:3000/drafts/{id} \
  -H "Content-Type: application/json" \
  -d '{"status": "PUBLISHED"}'

# → 422: "Invalid transition: IDEA → PUBLISHED. Allowed: DRAFT, DROPPED"
```

### Filter by platform

```bash
curl http://localhost:3000/drafts?platform=newsletter
```

---

## Design decisions

**Union types over enums**
TypeScript enums compile to runtime JavaScript objects with known edge cases in strict mode. Union types have zero runtime overhead and serialize cleanly to JSON.

**Soft deletes via DROPPED status**
Deleting drafts permanently loses history. A `DROPPED` status preserves the record while excluding it from the default pipeline view — similar to how email clients handle trash.

**In-memory store**
No database dependency for now. The store is fully encapsulated behind a typed interface, so swapping it for PostgreSQL or SQLite later requires changes in one file only.

**Manual validation without libraries**
The validators are written by hand instead of using Zod or Joi. This was intentional for this first version — understanding the type system before delegating to abstractions.

**`ValidationResult` instead of exceptions**
Validators return `{ valid: boolean, error?: string }` rather than throwing. The HTTP layer decides what status code to use. Keeping those concerns separate makes both layers easier to test independently.

---

## Test coverage

```
src/data/store.test.ts                 19 tests
src/validators/draft.validator.test.ts 35 tests
src/handlers/draft.handlers.test.ts    22 tests

Total: 76 tests
```

---

## What's next

- [ ] Persist drafts to SQLite
- [ ] Add GraphQL API alongside REST
- [ ] Frontend — React + TypeScript
- [ ] Authentication
- [ ] Deploy to Railway (backend) + Vercel (frontend)
