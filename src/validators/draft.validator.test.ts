import { describe, it, expect } from "vitest";
import {
  validateCreateInput,
  validateUpdateInput,
  validateTransition,
  validateFilters,
  validateBodyLengthForReview,
  validatePublishDateForPublished,
} from "./draft.validator";

// ============================================================
// validateCreateInput
// ============================================================

describe("validateCreateInput", () => {
  it("returns valid for a complete valid input", () => {
    const result = validateCreateInput({
      title: "My first post",
      body: "Some content here",
      platform: "blog",
      tags: ["typescript"],
      estimatedPublishDate: "2026-06-01T00:00:00.000Z",
    });

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns valid without optional fields", () => {
    const result = validateCreateInput({
      title: "My first post",
      body: "Some content here",
      platform: "blog",
    });

    expect(result.valid).toBe(true);
  });

  it("returns error when body is not an object", () => {
    expect(validateCreateInput(null).valid).toBe(false);
    expect(validateCreateInput("string").valid).toBe(false);
    expect(validateCreateInput(42).valid).toBe(false);
  });

  it("returns error when title is missing", () => {
    const result = validateCreateInput({ body: "Content", platform: "blog" });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/title/);
  });

  it("returns error when title is empty string", () => {
    const result = validateCreateInput({ title: "  ", body: "Content", platform: "blog" });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/title/);
  });

  it("returns error when body is missing", () => {
    const result = validateCreateInput({ title: "Title", platform: "blog" });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/body/);
  });

  it("returns error when platform is invalid", () => {
    const result = validateCreateInput({
      title: "Title",
      body: "Content",
      platform: "tiktok",
    });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/platform/);
  });

  it("returns error when tags is not an array of strings", () => {
    const result = validateCreateInput({
      title: "Title",
      body: "Content",
      platform: "blog",
      tags: [1, 2, 3],
    });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/tags/);
  });

  it("returns error when estimatedPublishDate is not a valid date", () => {
    const result = validateCreateInput({
      title: "Title",
      body: "Content",
      platform: "blog",
      estimatedPublishDate: "not-a-date",
    });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/estimatedPublishDate/);
  });
});

// ============================================================
// validateUpdateInput
// ============================================================

describe("validateUpdateInput", () => {
  it("returns valid for a partial update", () => {
    const result = validateUpdateInput({ title: "New title" });

    expect(result.valid).toBe(true);
  });

  it("returns error when body is empty object", () => {
    const result = validateUpdateInput({});

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/at least one field/);
  });

  it("returns error when title is empty string", () => {
    const result = validateUpdateInput({ title: "  " });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/title/);
  });

  it("returns error when platform is invalid", () => {
    const result = validateUpdateInput({ platform: "tiktok" });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/platform/);
  });

  it("returns error when status is invalid", () => {
    const result = validateUpdateInput({ status: "ARCHIVED" });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/status/);
  });

  it("returns error when tags contains non-strings", () => {
    const result = validateUpdateInput({ tags: ["valid", 42] });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/tags/);
  });

  it("returns error when estimatedPublishDate is invalid", () => {
    const result = validateUpdateInput({ estimatedPublishDate: "bad-date" });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/estimatedPublishDate/);
  });
});

// ============================================================
// validateTransition
// ============================================================

describe("validateTransition", () => {
  it("allows IDEA → DRAFT", () => {
    expect(validateTransition("IDEA", "DRAFT").valid).toBe(true);
  });

  it("allows IDEA → DROPPED", () => {
    expect(validateTransition("IDEA", "DROPPED").valid).toBe(true);
  });

  it("allows DRAFT → REVIEW", () => {
    expect(validateTransition("DRAFT", "REVIEW").valid).toBe(true);
  });

  it("allows DRAFT → DROPPED", () => {
    expect(validateTransition("DRAFT", "DROPPED").valid).toBe(true);
  });

  it("allows REVIEW → PUBLISHED", () => {
    expect(validateTransition("REVIEW", "PUBLISHED").valid).toBe(true);
  });

  it("allows REVIEW → DROPPED", () => {
    expect(validateTransition("REVIEW", "DROPPED").valid).toBe(true);
  });

  it("returns error for IDEA → PUBLISHED (skipping steps)", () => {
    const result = validateTransition("IDEA", "PUBLISHED");

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/DRAFT, DROPPED/);
  });

  it("returns terminal error for PUBLISHED → DROPPED", () => {
    const result = validateTransition("PUBLISHED", "DROPPED");

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/terminal/);
  });

  it("returns terminal error for DROPPED → IDEA", () => {
    const result = validateTransition("DROPPED", "IDEA");

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/terminal/);
  });
});

// ============================================================
// validateFilters
// ============================================================

describe("validateFilters", () => {
  it("returns valid for empty filters", () => {
    expect(validateFilters({}).valid).toBe(true);
  });

  it("returns valid for valid status filter", () => {
    expect(validateFilters({ status: "DRAFT" }).valid).toBe(true);
  });

  it("returns valid for valid platform filter", () => {
    expect(validateFilters({ platform: "newsletter" }).valid).toBe(true);
  });

  it("returns error for invalid status", () => {
    const result = validateFilters({ status: "ARCHIVED" });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/status/);
  });

  it("returns error for invalid platform", () => {
    const result = validateFilters({ platform: "tiktok" });

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/platform/);
  });
});

// ============================================================
// validateBodyLengthForReview
// ============================================================

describe("validateBodyLengthForReview", () => {
  it("returns valid when body has 100 or more characters", () => {
    const longBody = "a".repeat(100);

    expect(validateBodyLengthForReview(longBody).valid).toBe(true);
  });

  it("returns error when body has less than 100 characters", () => {
    const result = validateBodyLengthForReview("too short");

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/100 characters/);
  });

  it("returns error for empty body", () => {
    expect(validateBodyLengthForReview("").valid).toBe(false);
  });
});

// ============================================================
// validatePublishDateForPublished
// ============================================================

describe("validatePublishDateForPublished", () => {
  it("returns valid when estimatedPublishDate is provided", () => {
    expect(validatePublishDateForPublished("2026-06-01T00:00:00.000Z").valid).toBe(true);
  });

  it("returns error when estimatedPublishDate is undefined", () => {
    const result = validatePublishDateForPublished(undefined);

    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/estimatedPublishDate/);
  });
});
