import { describe, it, expect, beforeEach } from "vitest";
import { resetStore, createDraft } from "../data/store";
import { resolvers } from "./resolvers";

// ============================================================
// Helpers
// ============================================================

function makeLongBody(length = 100): string {
  return "a".repeat(length);
}

function seedDraft(overrides: Partial<Parameters<typeof createDraft>[0]> = {}) {
  return createDraft({
    title: "Test draft",
    body: "Some content",
    platform: "blog",
    ...overrides,
  });
}

beforeEach(() => {
  resetStore();
});

// ============================================================
// Query: drafts
// ============================================================

describe("drafts", () => {
  it("returns empty array when store is empty", () => {
    const result = resolvers.drafts({});

    expect(result).toEqual([]);
  });

  it("returns all non-dropped drafts by default", () => {
    seedDraft({ title: "First" });
    seedDraft({ title: "Second" });

    const result = resolvers.drafts({});

    expect(result).toHaveLength(2);
  });

  it("filters by status", () => {
    const draft = seedDraft();
    resolvers.updateDraft({ id: draft.id, input: { status: "DRAFT" } });
    seedDraft({ title: "Still IDEA" });

    const result = resolvers.drafts({ status: "DRAFT" });

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("DRAFT");
  });

  it("filters by platform", () => {
    seedDraft({ platform: "blog" });
    seedDraft({ platform: "newsletter" });

    const result = resolvers.drafts({ platform: "newsletter" });

    expect(result).toHaveLength(1);
    expect(result[0].platform).toBe("newsletter");
  });

  it("excludes DROPPED drafts when no filters are provided", () => {
    const draft = seedDraft();
    resolvers.deleteDraft({ id: draft.id });

    const result = resolvers.drafts({});

    expect(result).toHaveLength(0);
  });
});

// ============================================================
// Query: draft
// ============================================================

describe("draft", () => {
  it("returns the draft when it exists", () => {
    const created = seedDraft({ title: "Specific draft" });

    const result = resolvers.draft({ id: created.id });

    expect(result).not.toBeNull();
    expect(result?.id).toBe(created.id);
    expect(result?.title).toBe("Specific draft");
  });

  it("returns null when draft does not exist", () => {
    const result = resolvers.draft({ id: "non-existent-id" });

    expect(result).toBeNull();
  });
});

// ============================================================
// Mutation: createDraft
// ============================================================

describe("createDraft", () => {
  it("creates a draft with status IDEA", () => {
    const result = resolvers.createDraft({
      input: {
        title: "New draft",
        body: "Some content",
        platform: "blog",
      },
    });

    expect(result.status).toBe("IDEA");
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
  });

  it("creates a draft with optional fields", () => {
    const result = resolvers.createDraft({
      input: {
        title: "New draft",
        body: "Some content",
        platform: "newsletter",
        tags: ["typescript", "node"],
        estimatedPublishDate: "2026-06-01T00:00:00.000Z",
      },
    });

    expect(result.tags).toEqual(["typescript", "node"]);
    expect(result.estimatedPublishDate).toBe("2026-06-01T00:00:00.000Z");
  });

  it("throws when title is missing", () => {
    expect(() =>
      resolvers.createDraft({
        input: { title: "", body: "Content", platform: "blog" },
      })
    ).toThrow(/title/);
  });

  it("throws when body is empty", () => {
    expect(() =>
      resolvers.createDraft({
        input: { title: "Title", body: "  ", platform: "blog" },
      })
    ).toThrow(/body/);
  });

  it("throws when platform is invalid", () => {
    expect(() =>
      resolvers.createDraft({
        input: { title: "Title", body: "Content", platform: "tiktok" as never },
      })
    ).toThrow(/platform/);
  });
});

// ============================================================
// Mutation: updateDraft
// ============================================================

describe("updateDraft", () => {
  it("throws when draft does not exist", () => {
    expect(() =>
      resolvers.updateDraft({ id: "non-existent-id", input: { title: "New title" } })
    ).toThrow(/not found/);
  });

  it("updates a field without changing status", () => {
    const draft = seedDraft({ title: "Original" });

    const result = resolvers.updateDraft({
      id: draft.id,
      input: { title: "Updated" },
    });

    expect(result?.title).toBe("Updated");
    expect(result?.status).toBe("IDEA");
  });

  it("advances status on a valid transition", () => {
    const draft = seedDraft();

    const result = resolvers.updateDraft({
      id: draft.id,
      input: { status: "DRAFT" },
    });

    expect(result?.status).toBe("DRAFT");
  });

  it("throws on an invalid transition", () => {
    const draft = seedDraft();

    expect(() =>
      resolvers.updateDraft({ id: draft.id, input: { status: "PUBLISHED" } })
    ).toThrow(/Invalid transition/);
  });

  it("throws on a terminal status transition", () => {
    const draft = seedDraft();
    resolvers.deleteDraft({ id: draft.id });

    expect(() =>
      resolvers.updateDraft({ id: draft.id, input: { status: "IDEA" } })
    ).toThrow(/terminal/);
  });

  it("throws when advancing to REVIEW with a short body", () => {
    const draft = seedDraft({ body: "Too short" });
    resolvers.updateDraft({ id: draft.id, input: { status: "DRAFT" } });

    expect(() =>
      resolvers.updateDraft({ id: draft.id, input: { status: "REVIEW" } })
    ).toThrow(/100 characters/);
  });

  it("allows DRAFT → REVIEW when body is long enough", () => {
    const draft = seedDraft({ body: makeLongBody() });
    resolvers.updateDraft({ id: draft.id, input: { status: "DRAFT" } });

    const result = resolvers.updateDraft({ id: draft.id, input: { status: "REVIEW" } });

    expect(result?.status).toBe("REVIEW");
  });

  it("throws when advancing to PUBLISHED without estimatedPublishDate", () => {
    const draft = seedDraft({ body: makeLongBody() });
    resolvers.updateDraft({ id: draft.id, input: { status: "DRAFT" } });
    resolvers.updateDraft({ id: draft.id, input: { status: "REVIEW" } });

    expect(() =>
      resolvers.updateDraft({ id: draft.id, input: { status: "PUBLISHED" } })
    ).toThrow(/estimatedPublishDate/);
  });

  it("allows REVIEW → PUBLISHED when estimatedPublishDate is set", () => {
    const draft = seedDraft({
      body: makeLongBody(),
      estimatedPublishDate: "2026-06-01T00:00:00.000Z",
    });
    resolvers.updateDraft({ id: draft.id, input: { status: "DRAFT" } });
    resolvers.updateDraft({ id: draft.id, input: { status: "REVIEW" } });

    const result = resolvers.updateDraft({ id: draft.id, input: { status: "PUBLISHED" } });

    expect(result?.status).toBe("PUBLISHED");
  });

});

// ============================================================
// Mutation: deleteDraft
// ============================================================

describe("deleteDraft", () => {
  it("sets status to DROPPED", () => {
    const draft = seedDraft();

    const result = resolvers.deleteDraft({ id: draft.id });

    expect(result?.status).toBe("DROPPED");
  });

  it("throws when draft does not exist", () => {
    expect(() =>
      resolvers.deleteDraft({ id: "non-existent-id" })
    ).toThrow(/not found/);
  });

  it("excludes the dropped draft from the default drafts query", () => {
    const draft = seedDraft();
    resolvers.deleteDraft({ id: draft.id });

    const result = resolvers.drafts({});

    expect(result).toHaveLength(0);
  });
});
