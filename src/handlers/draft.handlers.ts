import type { Request, Response } from "express";
import type { DraftFilters, ApiResponse, Draft } from "../types/draft";
import {
  getAllDrafts,
  getDraftById,
  createDraft,
  updateDraft,
  dropDraft,
} from "../data/store";
import {
  validateCreateInput,
  validateUpdateInput,
  validateTransition,
  validateFilters,
  validateBodyLengthForReview,
  validatePublishDateForPublished,
} from "../validators/draft.validator";

// ============================================================
// GET /drafts
// ============================================================

export function handleGetAllDrafts(req: Request, res: Response): void {
  const filtersValidation = validateFilters(req.query as Record<string, unknown>);

  if (!filtersValidation.valid) {
    const response: ApiResponse<never> = { data: null, error: filtersValidation.error ?? "Invalid filters" };
    res.status(400).json(response);
    return;
  }

  const filters: DraftFilters = {
    status: req.query["status"] as DraftFilters["status"],
    platform: req.query["platform"] as DraftFilters["platform"],
  };

  const drafts = getAllDrafts(filters);
  const response: ApiResponse<Draft[]> = { data: drafts, error: null };
  res.status(200).json(response);
}

// ============================================================
// GET /drafts/:id
// ============================================================

export function handleGetDraftById(req: Request, res: Response): void {
  const id = extractId(req);
  if (!id) {
    const response: ApiResponse<never> = { data: null, error: "Invalid id" };
    res.status(400).json(response);
    return;
  }
  const draft = getDraftById(id);

  if (!draft) {
    const response: ApiResponse<never> = { data: null, error: "Draft not found" };
    res.status(404).json(response);
    return;
  }

  const response: ApiResponse<Draft> = { data: draft, error: null };
  res.status(200).json(response);
}

// ============================================================
// POST /drafts
// ============================================================

export function handleCreateDraft(req: Request, res: Response): void {
  const validation = validateCreateInput(req.body);

  if (!validation.valid) {
    const response: ApiResponse<never> = { data: null, error: validation.error ?? "Invalid input" };
    res.status(400).json(response);
    return;
  }

  const draft = createDraft(req.body);
  const response: ApiResponse<Draft> = { data: draft, error: null };
  res.status(201).json(response);
}

// ============================================================
// PATCH /drafts/:id
// ============================================================

export function handleUpdateDraft(req: Request, res: Response): void {
  const id = extractId(req);
  if (!id) {
    const response: ApiResponse<never> = { data: null, error: "Invalid id" };
    res.status(400).json(response);
    return;
  }
  const existing = getDraftById(id);

  if (!existing) {
    const response: ApiResponse<never> = { data: null, error: "Draft not found" };
    res.status(404).json(response);
    return;
  }

  const validation = validateUpdateInput(req.body);

  if (!validation.valid) {
    const response: ApiResponse<never> = { data: null, error: validation.error ?? "Invalid input" };
    res.status(400).json(response);
    return;
  }

  // Status transition validation
  if (req.body.status !== undefined && req.body.status !== existing.status) {
    const transitionValidation = validateTransition(existing.status, req.body.status);

    if (!transitionValidation.valid) {
      const response: ApiResponse<never> = { data: null, error: transitionValidation.error ?? "Invalid transition" };
      res.status(422).json(response);
      return;
    }

    // Business rules for specific transitions
    if (req.body.status === "REVIEW") {
      const bodyValidation = validateBodyLengthForReview(req.body.body ?? existing.body);

      if (!bodyValidation.valid) {
        const response: ApiResponse<never> = { data: null, error: bodyValidation.error ?? "Body too short" };
        res.status(422).json(response);
        return;
      }
    }

    if (req.body.status === "PUBLISHED") {
      const dateValidation = validatePublishDateForPublished(
        req.body.estimatedPublishDate ?? existing.estimatedPublishDate
      );

      if (!dateValidation.valid) {
        const response: ApiResponse<never> = { data: null, error: dateValidation.error ?? "Missing publish date" };
        res.status(422).json(response);
        return;
      }
    }
  }

  const updated = updateDraft(existing.id, req.body);
  const response: ApiResponse<Draft> = { data: updated ?? null, error: null };
  res.status(200).json(response);
}

// ============================================================
// DELETE /drafts/:id
// ============================================================

export function handleDropDraft(req: Request, res: Response): void {
  const id = extractId(req);
  if (!id) {
    const response: ApiResponse<never> = { data: null, error: "Invalid id" };
    res.status(400).json(response);
    return;
  }
  const existing = getDraftById(id);

  if (!existing) {
    const response: ApiResponse<never> = { data: null, error: "Draft not found" };
    res.status(404).json(response);
    return;
  }

  if (existing.status === "DROPPED") {
    const response: ApiResponse<never> = { data: null, error: "Draft is already dropped" };
    res.status(422).json(response);
    return;
  }

  if (existing.status === "PUBLISHED") {
    const response: ApiResponse<never> = { data: null, error: "Cannot drop a published draft" };
    res.status(422).json(response);
    return;
  }

  const dropped = dropDraft(existing.id);
  const response: ApiResponse<Draft> = { data: dropped ?? null, error: null };
  res.status(200).json(response);
}

// ============================================================
// Helpers
// ============================================================

function extractId(req: Request): string | null {
  const id = req.params["id"];
  return typeof id === "string" ? id : null;
}
