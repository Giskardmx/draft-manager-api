import { describe, it, expect, beforeEach } from "vitest";
import { createRequest, createResponse } from "node-mocks-http";
import {
  handleGetAllDrafts,
  handleGetDraftById,
  handleCreateDraft,
  handleUpdateDraft,
  handleDropDraft,
} from "./draft.handlers";
import { resetStore, createDraft } from "../data/store";
import type { Draft, ApiResponse } from "../types/draft";

// ============================================================
// Helpers
// ============================================================

function makeCreatedDraft(overrides = {}) {
  return createDraft({
    title: "Test draft",
    body: "Some body content",
    platform: "blog",
    ...overrides,
  });
}

function makeLongBody(length = 100): string {
  return "a".repeat(length);
}

beforeEach(() => {
  resetStore();
});

// ============================================================
// GET /drafts
// ============================================================

describe("handleGetAllDrafts", () => {
  it("returns empty array when no drafts exist", () => {
    const req = createRequest({ method: "GET", query: {} });
    const res = createResponse();

    handleGetAllDrafts(req, res);

    const body: ApiResponse<Draft[]> = res._getJSONData();
    expect(res.statusCode).toBe(200);
    expect(body.data).toEqual([]);
    expect(body.error).toBeNull();
  });

  it("returns all active drafts", () => {
    makeCreatedDraft({ title: "A" });
    makeCreatedDraft({ title: "B" });

    const req = createRequest({ method: "GET", query: {} });
    const res = createResponse();

    handleGetAllDrafts(req, res);

    const body: ApiResponse<Draft[]> = res._getJSONData();
    expect(body.data).toHaveLength(2);
  });

  it("excludes DROPPED drafts by default", () => {
    const draft = makeCreatedDraft();
    const reqDrop = createRequest({
      method: "PATCH",
      params: { id: draft.id },
      body: { status: "DROPPED" },
    });
    const resDrop = createResponse();
    handleUpdateDraft(reqDrop, resDrop);

    const req = createRequest({ method: "GET", query: {} });
    const res = createResponse();
    handleGetAllDrafts(req, res);

    const body: ApiResponse<Draft[]> = res._getJSONData();
    expect(body.data).toHaveLength(0);
  });

  it("filters by status", () => {
    makeCreatedDraft({ title: "A" });
    makeCreatedDraft({ title: "B" });

    const req = createRequest({ method: "GET", query: { status: "IDEA" } });
    const res = createResponse();

    handleGetAllDrafts(req, res);

    const body: ApiResponse<Draft[]> = res._getJSONData();
    expect(body.data).toHaveLength(2);
  });

  it("filters by platform", () => {
    makeCreatedDraft({ platform: "blog" });
    makeCreatedDraft({ platform: "newsletter" });

    const req = createRequest({ method: "GET", query: { platform: "blog" } });
    const res = createResponse();

    handleGetAllDrafts(req, res);

    const body: ApiResponse<Draft[]> = res._getJSONData();
    expect(body.data).toHaveLength(1);
  });

  it("returns 400 for invalid status filter", () => {
    const req = createRequest({ method: "GET", query: { status: "INVALID" } });
    const res = createResponse();

    handleGetAllDrafts(req, res);

    const body: ApiResponse<never> = res._getJSONData();
    expect(res.statusCode).toBe(400);
    expect(body.error).toMatch(/status/);
  });
});

// ============================================================
// GET /drafts/:id
// ============================================================

describe("handleGetDraftById", () => {
  it("returns the draft when found", () => {
    const draft = makeCreatedDraft();

    const req = createRequest({ method: "GET", params: { id: draft.id } });
    const res = createResponse();

    handleGetDraftById(req, res);

    const body: ApiResponse<Draft> = res._getJSONData();
    expect(res.statusCode).toBe(200);
    expect(body.data?.id).toBe(draft.id);
  });

  it("returns 404 when draft does not exist", () => {
    const req = createRequest({ method: "GET", params: { id: "ghost-id" } });
    const res = createResponse();

    handleGetDraftById(req, res);

    const body: ApiResponse<never> = res._getJSONData();
    expect(res.statusCode).toBe(404);
    expect(body.error).toMatch(/not found/i);
  });
});

// ============================================================
// POST /drafts
// ============================================================

describe("handleCreateDraft", () => {
  it("creates a draft and returns 201", () => {
    const req = createRequest({
      method: "POST",
      body: { title: "New post", body: "Content here", platform: "blog" },
    });
    const res = createResponse();

    handleCreateDraft(req, res);

    const body: ApiResponse<Draft> = res._getJSONData();
    expect(res.statusCode).toBe(201);
    expect(body.data?.title).toBe("New post");
    expect(body.data?.status).toBe("IDEA");
    expect(body.error).toBeNull();
  });

  it("returns 400 for missing title", () => {
    const req = createRequest({
      method: "POST",
      body: { body: "Content", platform: "blog" },
    });
    const res = createResponse();

    handleCreateDraft(req, res);

    expect(res.statusCode).toBe(400);
    expect(res._getJSONData().error).toMatch(/title/);
  });

  it("returns 400 for invalid platform", () => {
    const req = createRequest({
      method: "POST",
      body: { title: "Title", body: "Content", platform: "tiktok" },
    });
    const res = createResponse();

    handleCreateDraft(req, res);

    expect(res.statusCode).toBe(400);
    expect(res._getJSONData().error).toMatch(/platform/);
  });
});

// ============================================================
// PATCH /drafts/:id
// ============================================================

describe("handleUpdateDraft", () => {
  it("updates title successfully", () => {
    const draft = makeCreatedDraft();

    const req = createRequest({
      method: "PATCH",
      params: { id: draft.id },
      body: { title: "Updated title" },
    });
    const res = createResponse();

    handleUpdateDraft(req, res);

    const body: ApiResponse<Draft> = res._getJSONData();
    expect(res.statusCode).toBe(200);
    expect(body.data?.title).toBe("Updated title");
  });

  it("returns 404 for non-existent draft", () => {
    const req = createRequest({
      method: "PATCH",
      params: { id: "ghost-id" },
      body: { title: "X" },
    });
    const res = createResponse();

    handleUpdateDraft(req, res);

    expect(res.statusCode).toBe(404);
  });

  it("returns 400 for empty body", () => {
    const draft = makeCreatedDraft();

    const req = createRequest({
      method: "PATCH",
      params: { id: draft.id },
      body: {},
    });
    const res = createResponse();

    handleUpdateDraft(req, res);

    expect(res.statusCode).toBe(400);
  });

  it("allows valid transition IDEA → DRAFT", () => {
    const draft = makeCreatedDraft();

    const req = createRequest({
      method: "PATCH",
      params: { id: draft.id },
      body: { status: "DRAFT" },
    });
    const res = createResponse();

    handleUpdateDraft(req, res);

    const body: ApiResponse<Draft> = res._getJSONData();
    expect(res.statusCode).toBe(200);
    expect(body.data?.status).toBe("DRAFT");
  });

  it("returns 422 for invalid transition IDEA → PUBLISHED", () => {
    const draft = makeCreatedDraft();

    const req = createRequest({
      method: "PATCH",
      params: { id: draft.id },
      body: { status: "PUBLISHED" },
    });
    const res = createResponse();

    handleUpdateDraft(req, res);

    expect(res.statusCode).toBe(422);
    expect(res._getJSONData().error).toMatch(/transition/i);
  });

  it("returns 422 when transitioning to REVIEW with short body", () => {
    const draft = makeCreatedDraft({ body: "Too short" });

    // First advance to DRAFT
    handleUpdateDraft(
      createRequest({ method: "PATCH", params: { id: draft.id }, body: { status: "DRAFT" } }),
      createResponse()
    );

    const req = createRequest({
      method: "PATCH",
      params: { id: draft.id },
      body: { status: "REVIEW" },
    });
    const res = createResponse();

    handleUpdateDraft(req, res);

    expect(res.statusCode).toBe(422);
    expect(res._getJSONData().error).toMatch(/100 characters/);
  });

  it("allows transition to REVIEW with long enough body", () => {
    const draft = makeCreatedDraft({ body: makeLongBody() });

    handleUpdateDraft(
      createRequest({ method: "PATCH", params: { id: draft.id }, body: { status: "DRAFT" } }),
      createResponse()
    );

    const req = createRequest({
      method: "PATCH",
      params: { id: draft.id },
      body: { status: "REVIEW" },
    });
    const res = createResponse();

    handleUpdateDraft(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().data.status).toBe("REVIEW");
  });

  it("returns 422 when transitioning to PUBLISHED without estimatedPublishDate", () => {
    const draft = makeCreatedDraft({ body: makeLongBody() });

    // Advance to DRAFT → REVIEW
    handleUpdateDraft(
      createRequest({ method: "PATCH", params: { id: draft.id }, body: { status: "DRAFT" } }),
      createResponse()
    );
    handleUpdateDraft(
      createRequest({ method: "PATCH", params: { id: draft.id }, body: { status: "REVIEW" } }),
      createResponse()
    );

    const req = createRequest({
      method: "PATCH",
      params: { id: draft.id },
      body: { status: "PUBLISHED" },
    });
    const res = createResponse();

    handleUpdateDraft(req, res);

    expect(res.statusCode).toBe(422);
    expect(res._getJSONData().error).toMatch(/estimatedPublishDate/);
  });

  it("allows full transition to PUBLISHED with estimatedPublishDate", () => {
    const draft = makeCreatedDraft({ body: makeLongBody() });

    handleUpdateDraft(
      createRequest({ method: "PATCH", params: { id: draft.id }, body: { status: "DRAFT" } }),
      createResponse()
    );
    handleUpdateDraft(
      createRequest({ method: "PATCH", params: { id: draft.id }, body: { status: "REVIEW" } }),
      createResponse()
    );

    const req = createRequest({
      method: "PATCH",
      params: { id: draft.id },
      body: { status: "PUBLISHED", estimatedPublishDate: "2026-06-01T00:00:00.000Z" },
    });
    const res = createResponse();

    handleUpdateDraft(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._getJSONData().data.status).toBe("PUBLISHED");
  });
});

// ============================================================
// DELETE /drafts/:id
// ============================================================

describe("handleDropDraft", () => {
  it("drops an active draft successfully", () => {
    const draft = makeCreatedDraft();

    const req = createRequest({ method: "DELETE", params: { id: draft.id } });
    const res = createResponse();

    handleDropDraft(req, res);

    const body: ApiResponse<Draft> = res._getJSONData();
    expect(res.statusCode).toBe(200);
    expect(body.data?.status).toBe("DROPPED");
  });

  it("returns 404 for non-existent draft", () => {
    const req = createRequest({ method: "DELETE", params: { id: "ghost-id" } });
    const res = createResponse();

    handleDropDraft(req, res);

    expect(res.statusCode).toBe(404);
  });

  it("returns 422 when draft is already dropped", () => {
    const draft = makeCreatedDraft();
    handleDropDraft(
      createRequest({ method: "DELETE", params: { id: draft.id } }),
      createResponse()
    );

    const req = createRequest({ method: "DELETE", params: { id: draft.id } });
    const res = createResponse();

    handleDropDraft(req, res);

    expect(res.statusCode).toBe(422);
    expect(res._getJSONData().error).toMatch(/already dropped/);
  });

  it("returns 422 when draft is published", () => {
    const draft = makeCreatedDraft({ body: makeLongBody() });

    handleUpdateDraft(
      createRequest({ method: "PATCH", params: { id: draft.id }, body: { status: "DRAFT" } }),
      createResponse()
    );
    handleUpdateDraft(
      createRequest({ method: "PATCH", params: { id: draft.id }, body: { status: "REVIEW" } }),
      createResponse()
    );
    handleUpdateDraft(
      createRequest({
        method: "PATCH",
        params: { id: draft.id },
        body: { status: "PUBLISHED", estimatedPublishDate: "2026-06-01T00:00:00.000Z" },
      }),
      createResponse()
    );

    const req = createRequest({ method: "DELETE", params: { id: draft.id } });
    const res = createResponse();

    handleDropDraft(req, res);

    expect(res.statusCode).toBe(422);
    expect(res._getJSONData().error).toMatch(/published/i);
  });
});
