import type { CreateDraftInput, UpdateDraftInput, DraftFilters, DraftStatus, Platform } from "../types/draft";
import { VALID_TRANSITIONS } from "../types/draft";

// ============================================================
// Allowed values — single source of truth
// ============================================================

const VALID_STATUSES: DraftStatus[] = ["IDEA", "DRAFT", "REVIEW", "PUBLISHED", "DROPPED"];
const VALID_PLATFORMS: Platform[] = ["blog", "newsletter", "twitter", "linkedin"];

// ============================================================
// Primitive guards
// ============================================================

function isValidStatus(value: unknown): value is DraftStatus {
  return typeof value === "string" && (VALID_STATUSES as string[]).includes(value);
}

function isValidPlatform(value: unknown): value is Platform {
  return typeof value === "string" && (VALID_PLATFORMS as string[]).includes(value);
}

// ============================================================
// Validation result — never throw from validators
// ============================================================

interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================
// CreateDraftInput validator
// ============================================================

export function validateCreateInput(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const b = body as Record<string, unknown>;

  if (typeof b["title"] !== "string" || b["title"].trim() === "") {
    return { valid: false, error: "title is required and must be a non-empty string" };
  }

  if (typeof b["body"] !== "string" || b["body"].trim() === "") {
    return { valid: false, error: "body is required and must be a non-empty string" };
  }

  if (!isValidPlatform(b["platform"])) {
    return { valid: false, error: `platform must be one of: ${VALID_PLATFORMS.join(", ")}` };
  }

  if (b["tags"] !== undefined) {
    if (!Array.isArray(b["tags"]) || !b["tags"].every((t) => typeof t === "string")) {
      return { valid: false, error: "tags must be an array of strings" };
    }
  }

  if (b["estimatedPublishDate"] !== undefined) {
    if (typeof b["estimatedPublishDate"] !== "string" || isNaN(Date.parse(b["estimatedPublishDate"]))) {
      return { valid: false, error: "estimatedPublishDate must be a valid ISO 8601 date string" };
    }
  }

  return { valid: true };
}

// ============================================================
// UpdateDraftInput validator
// ============================================================

export function validateUpdateInput(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const b = body as Record<string, unknown>;

  if (Object.keys(b).length === 0) {
    return { valid: false, error: "Request body must contain at least one field to update" };
  }

  if (b["title"] !== undefined) {
    if (typeof b["title"] !== "string" || b["title"].trim() === "") {
      return { valid: false, error: "title must be a non-empty string" };
    }
  }

  if (b["body"] !== undefined) {
    if (typeof b["body"] !== "string" || b["body"].trim() === "") {
      return { valid: false, error: "body must be a non-empty string" };
    }
  }

  if (b["platform"] !== undefined && !isValidPlatform(b["platform"])) {
    return { valid: false, error: `platform must be one of: ${VALID_PLATFORMS.join(", ")}` };
  }

  if (b["status"] !== undefined && !isValidStatus(b["status"])) {
    return { valid: false, error: `status must be one of: ${VALID_STATUSES.join(", ")}` };
  }

  if (b["tags"] !== undefined) {
    if (!Array.isArray(b["tags"]) || !b["tags"].every((t) => typeof t === "string")) {
      return { valid: false, error: "tags must be an array of strings" };
    }
  }

  if (b["estimatedPublishDate"] !== undefined) {
    if (typeof b["estimatedPublishDate"] !== "string" || isNaN(Date.parse(b["estimatedPublishDate"]))) {
      return { valid: false, error: "estimatedPublishDate must be a valid ISO 8601 date string" };
    }
  }

  return { valid: true };
}

// ============================================================
// Status transition validator
// ============================================================

export function validateTransition(currentStatus: DraftStatus, nextStatus: DraftStatus): ValidationResult {
  const allowed = VALID_TRANSITIONS[currentStatus];

  if (!allowed.includes(nextStatus)) {
    return {
      valid: false,
      error: allowed.length === 0
        ? `Cannot transition from ${currentStatus} — this status is terminal`
        : `Invalid transition: ${currentStatus} → ${nextStatus}. Allowed: ${allowed.join(", ")}`
    };
  }

  return { valid: true };
}

// ============================================================
// Query params validator
// ============================================================

export function validateFilters(query: Record<string, unknown>): ValidationResult {
  if (query["status"] !== undefined && !isValidStatus(query["status"])) {
    return { valid: false, error: `status must be one of: ${VALID_STATUSES.join(", ")}` };
  }

  if (query["platform"] !== undefined && !isValidPlatform(query["platform"])) {
    return { valid: false, error: `platform must be one of: ${VALID_PLATFORMS.join(", ")}` };
  }

  return { valid: true };
}

// ============================================================
// Business rule validators
// ============================================================

export function validateBodyLengthForReview(body: string): ValidationResult {
  if (body.trim().length < 100) {
    return {
      valid: false,
      error: "body must be at least 100 characters to transition to REVIEW",
    };
  }
  return { valid: true };
}

export function validatePublishDateForPublished(estimatedPublishDate: string | undefined): ValidationResult {
  if (!estimatedPublishDate) {
    return {
      valid: false,
      error: "estimatedPublishDate is required to transition to PUBLISHED",
    };
  }
  return { valid: true };
}
