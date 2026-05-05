# Draft Manager API

A REST and GraphQL API for managing content drafts across their full lifecycle — from raw idea to published post.

Built with Node.js, Express, TypeScript (strict mode), and Apollo Server.

---

## Motivation

Content creators often work with drafts scattered across Notion, Google Docs, and local files. There's rarely a single place to track the state of each piece — what's just an idea, what's being written, what's ready to publish.

Draft Manager solves that with a simple pipeline: `IDEA → DRAFT → REVIEW → PUBLISHED`. Each transition has explicit business rules enforced on the server, so the pipeline reflects reality rather than wishful thinking.

---

## Tech stack

- **Runtime:** Node.js 20+
- **Framework:** Express 5
- **Language:** TypeScript 5 (strict mode — `noImplicitAny`, `strictNullChecks`, `noUnusedLocals`)
- **GraphQL:** Apollo Server 5 + `@as-integrations/express5`
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
├── graphql/
│   ├── schema.graphql   # GraphQL schema — IDE syntax highlighting supported
│   ├── schema.ts        # Loads schema.graphql and builds the executable schema
│   ├── resolvers.ts     # Resolvers — call the same store functions as REST handlers
│   ├── resolvers.test.ts
│   └── server.ts        # Apollo Server setup and Express middleware
└── index.ts         # Entry point
```

Each layer has a single responsibility. Handlers don't touch the store directly. The store knows nothing about HTTP or GraphQL. Validators return results — they never throw.

---

## REST API

Base URL: `http://localhost:3000`

| Method   | Path           | Description                        |
|----------|----------------|------------------------------------|
| `GET`    | `/drafts`      | List drafts (filterable)           |
| `GET`    | `/drafts/:id`  | Get a single draft                 |
| `POST`   | `/drafts`      | Create a new draft                 |
| `PATCH`  | `/drafts/:id`  | Update fields or advance status    |
| `DELETE` | `/drafts/:id`  | Drop (soft-delete) a draft         |

### Query params — `GET /drafts`

| Param      | Type     | Description                                      |
|------------|----------|--------------------------------------------------|
| `status`   | `string` | Filter by status. Omit to exclude DROPPED drafts |
| `platform` | `string` | Filter by platform                               |

### Response shape

All endpoints return a consistent wrapper:

```json
{ "data": { ... }, "error": null }
{ "data": null, "error": "Description of what went wrong" }
```

---

## GraphQL API

Endpoint: `http://localhost:3000/graphql`

REST and GraphQL share the same in-memory store and the same validation logic. Adding a GraphQL layer required zero changes to the store or validators.

### Queries

```graphql
# List all drafts (DROPPED excluded by default)
query {
  drafts {
    id title status platform tags createdAt
  }
}

# Filter by status or platform
query {
  drafts(status: REVIEW, platform: blog) {
    id title
  }
}

# Get a single draft
query {
  draft(id: "uuid") {
    id title body status estimatedPublishDate
  }
}
```

### Mutations

```graphql
# Create a draft (starts at IDEA)
mutation {
  createDraft(input: {
    title: "Why I switched from Java to TypeScript"
    body: "Still figuring this out"
    platform: blog
    tags: ["typescript", "java"]
  }) {
    id status createdAt
  }
}

# Update fields or advance status
mutation {
  updateDraft(id: "uuid", input: { status: DRAFT }) {
    id status updatedAt
  }
}

# Soft-delete a draft (sets status to DROPPED)
mutation {
  deleteDraft(id: "uuid") {
    id status
  }
}
```

### Error handling

Business rule violations are returned in the GraphQL `errors` field:

```json
{
  "errors": [{
    "message": "Invalid transition: DRAFT → PUBLISHED. Allowed: REVIEW, DROPPED"
  }],
  "data": { "updateDraft": null }
}
```

---

## Draft object

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

Not all transitions are valid. The same rules are enforced on both REST and GraphQL:

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

REST available at `http://localhost:3000/drafts`  
GraphQL available at `http://localhost:3000/graphql`

---

## REST examples

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
TypeScript enums compile to runtime JavaScript objects with known edge cases in strict mode. Union types have zero runtime overhead and serialize cleanly to JSON — and map directly to GraphQL enum definitions without a translation layer.

**GraphQL and REST over the same store**
Both layers call the same store functions and the same validators. The GraphQL resolvers are a thin translation layer: they receive typed arguments, call the domain logic, and throw `Error` on validation failures (which Apollo catches and returns in the `errors` field). No duplication.

**`schema.graphql` as the source of truth**
The schema lives in a `.graphql` file rather than an inline template string. IDEs with the [GraphQL: Language Feature Support](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql) extension get full syntax highlighting, autocomplete, and validation. `schema.ts` loads and compiles it at startup with `buildSchema`.

**Soft deletes via DROPPED status**
Deleting drafts permanently loses history. A `DROPPED` status preserves the record while excluding it from the default pipeline view — similar to how email clients handle trash.

**In-memory store**
No database dependency for now. The store is fully encapsulated behind a typed interface, so swapping it for PostgreSQL or SQLite later requires changes in one file only.

**Manual validation without libraries**
The validators are written by hand instead of using Zod or Joi. This was intentional for this first version — understanding the type system before delegating to abstractions.

**`ValidationResult` instead of exceptions**
Validators return `{ valid: boolean, error?: string }` rather than throwing. The HTTP layer decides what status code to use; the GraphQL layer decides whether to throw. Keeping those concerns separate makes both layers easier to test independently.

---

## Test coverage

```
src/data/store.test.ts                 19 tests
src/validators/draft.validator.test.ts 35 tests
src/handlers/draft.handlers.test.ts    24 tests
src/graphql/resolvers.test.ts          24 tests

Total: 102 tests
```

---

## What's next

- [ ] Persist drafts to SQLite
- [ ] Frontend — React + TypeScript (consuming the GraphQL API)
- [ ] Authentication
- [ ] Deploy to Railway (backend) + Vercel (frontend)