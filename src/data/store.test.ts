import { describe, it, expect, beforeEach } from "vitest";
import {
  getAllDrafts,
  getDraftById,
  createDraft,
  updateDraft,
  dropDraft,
  resetStore
} from "./store";

// ============================================================
// Reset state between tests
// ============================================================

beforeEach(() => {
  // Vitest re-imports modules fresh per file but not per test.
  // We need a way to reset the store between tests.
  // We'll add a resetStore() export to store.ts for testing only.
  resetStore();
});

// ============================================================
// createDraft
// ============================================================

describe("createDraft", () => {
  it("creates a draft with status IDEA by default", () => {
    const draft = createDraft({
      title: "My first idea",
      body: "Some content",
      platform: "blog",
    });

    expect(draft.status).toBe("IDEA");
  });

  it("generates id, createdAt, updatedAt automatically", () => {
    const draft = createDraft({
      title: "Test",
      body: "Body",
      platform: "newsletter",
    });

    expect(draft.id).toBeDefined();
    expect(draft.createdAt).toBeDefined();
    expect(draft.updatedAt).toBeDefined();
  });

  it("defaults tags to empty array when not provided", () => {
    const draft = createDraft({
      title: "No tags",
      body: "Body",
      platform: "twitter",
    });

    expect(draft.tags).toEqual([]);
  });

  it("persists tags when provided", () => {
    const draft = createDraft({
      title: "With tags",
      body: "Body",
      platform: "blog",
      tags: ["typescript", "node"],
    });

    expect(draft.tags).toEqual(["typescript", "node"]);
  });
});

// ============================================================
// getAllDrafts
// ============================================================

describe("getAllDrafts", () => {
  it("returns empty array when no drafts exist", () => {
    expect(getAllDrafts()).toEqual([]);
  });

  it("returns all non-dropped drafts by default", () => {
    createDraft({ title: "A", body: "Body", platform: "blog" });
    createDraft({ title: "B", body: "Body", platform: "blog" });

    expect(getAllDrafts()).toHaveLength(2);
  });

  it("excludes DROPPED drafts by default", () => {
    const draft = createDraft({ title: "A", body: "Body", platform: "blog" });
    dropDraft(draft.id);

    expect(getAllDrafts()).toHaveLength(0);
  });

  it("returns DROPPED drafts when status filter is DROPPED", () => {
    const draft = createDraft({ title: "A", body: "Body", platform: "blog" });
    dropDraft(draft.id);

    expect(getAllDrafts({ status: "DROPPED" })).toHaveLength(1);
  });

  it("filters by platform", () => {
    createDraft({ title: "A", body: "Body", platform: "blog" });
    createDraft({ title: "B", body: "Body", platform: "newsletter" });

    expect(getAllDrafts({ platform: "blog" })).toHaveLength(1);
  });

  it("filters by status and platform combined", () => {
    createDraft({ title: "A", body: "Body", platform: "blog" });
    createDraft({ title: "B", body: "Body", platform: "newsletter" });

    const results = getAllDrafts({ status: "IDEA", platform: "blog" });
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("A");
  });
});

// ============================================================
// getDraftById
// ============================================================

describe("getDraftById", () => {
  it("returns the draft when it exists", () => {
    const created = createDraft({ title: "A", body: "Body", platform: "blog" });
    const found = getDraftById(created.id);

    expect(found).toBeDefined();
    expect(found?.id).toBe(created.id);
  });

  it("returns undefined when draft does not exist", () => {
    expect(getDraftById("non-existent-id")).toBeUndefined();
  });
});

// ============================================================
// updateDraft
// ============================================================

describe("updateDraft", () => {
  it("updates only the provided fields", () => {
    const draft = createDraft({
      title: "Original",
      body: "Original body",
      platform: "blog",
    });

    const updated = updateDraft(draft.id, { title: "Updated" });

    expect(updated?.title).toBe("Updated");
    expect(updated?.body).toBe("Original body"); // sin cambios
    expect(updated?.platform).toBe("blog");       // sin cambios
  });

  it("updates updatedAt on every update", async () => {
    const draft = createDraft({ title: "A", body: "Body", platform: "blog" });
    const originalUpdatedAt = draft.updatedAt;

    // Small delay to ensure timestamp differs
    await new Promise((resolve) => setTimeout(resolve, 10));

    const updated = updateDraft(draft.id, { title: "New title" });
    expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
  });

  it("does not modify id or createdAt", () => {
    const draft = createDraft({ title: "A", body: "Body", platform: "blog" });

    const updated = updateDraft(draft.id, { title: "New" });

    expect(updated?.id).toBe(draft.id);
    expect(updated?.createdAt).toBe(draft.createdAt);
  });

  it("returns undefined for non-existent id", () => {
    expect(updateDraft("ghost-id", { title: "X" })).toBeUndefined();
  });
});

// ============================================================
// dropDraft
// ============================================================

describe("dropDraft", () => {
  it("sets status to DROPPED", () => {
    const draft = createDraft({ title: "A", body: "Body", platform: "blog" });
    const dropped = dropDraft(draft.id);

    expect(dropped?.status).toBe("DROPPED");
  });

  it("dropped draft is excluded from default getAllDrafts", () => {
    const draft = createDraft({ title: "A", body: "Body", platform: "blog" });
    dropDraft(draft.id);

    expect(getAllDrafts()).toHaveLength(0);
  });

  it("returns undefined for non-existent id", () => {
    expect(dropDraft("ghost-id")).toBeUndefined();
  });
});
