// src/graphql/resolvers.ts
import {
  getAllDrafts,
  getDraftById,
  createDraft,
  updateDraft,
  dropDraft,
} from "../data/store";
import {
  validateUpdateInput,
  validateCreateInput,
  validateTransition,
  validateBodyLengthForReview,
  validatePublishDateForPublished,
} from "../validators/draft.validator";
import type { DraftStatus, Platform } from "../types/draft";

// ============================================================
// Arg types — GraphQL layer (no req/res, pure domain)
// ============================================================

interface DraftsArgs {
  status?: DraftStatus;
  platform?: Platform;
}

interface DraftArgs {
  id: string;
}

interface CreateDraftArgs {
  input: {
    title: string;
    body: string;
    platform: Platform;
    tags?: string[];
    estimatedPublishDate?: string;
  };
}

interface UpdateDraftArgs {
  id: string;
  input: {
    title?: string;
    body?: string;
    platform?: Platform;
    tags?: string[];
    status?: DraftStatus;
    estimatedPublishDate?: string;
  };
}

// ============================================================
// Resolvers — llaman al store directamente, igual que los handlers
// La diferencia: en vez de res.status(422).json(...), lanzamos un Error
// GraphQL lo captura y lo devuelve en el campo `errors` de la respuesta
// ============================================================

export const resolvers = {
  // --- Queries ---
  drafts({ status, platform }: DraftsArgs) {
    return getAllDrafts({ status, platform });
  },

  draft({ id }: DraftArgs) {
    return getDraftById(id) ?? null;
  },

  // --- Mutations ---
  createDraft({ input }: CreateDraftArgs) {
    const validation = validateCreateInput(input);
    if (!validation.valid) {
      throw new Error(validation.error ?? "Invalid input");
    }
    return createDraft(input);
  },

  updateDraft({ id, input }: UpdateDraftArgs) {
    const existing = getDraftById(id);
    if (!existing) {
      throw new Error(`Draft not found: ${id}`);
    }

    // Validar formato del input
    const formatValidation = validateUpdateInput(input);
    if (!formatValidation.valid) {
      throw new Error(formatValidation.error ?? "Invalid input");
    }

    // Validar transición de status si viene en el input
    if (input.status !== undefined) {
      const transitionValidation = validateTransition(existing.status, input.status);
      if (!transitionValidation.valid) {
        throw new Error(transitionValidation.error);
      }

      // Regla de negocio: DRAFT → REVIEW requiere body de 100+ chars
      if (input.status === "REVIEW") {
        const bodyToCheck = input.body ?? existing.body;
        const bodyValidation = validateBodyLengthForReview(bodyToCheck);
        if (!bodyValidation.valid) {
          throw new Error(bodyValidation.error);
        }
      }

      // Regla de negocio: REVIEW → PUBLISHED requiere estimatedPublishDate
      if (input.status === "PUBLISHED") {
        const dateToCheck = input.estimatedPublishDate ?? existing.estimatedPublishDate;
        const dateValidation = validatePublishDateForPublished(dateToCheck);
        if (!dateValidation.valid) {
          throw new Error(dateValidation.error);
        }
      }
    }

    return updateDraft(id, input) ?? null;
  },

  deleteDraft({ id }: DraftArgs) {
    const existing = getDraftById(id);
    if (!existing) {
      throw new Error(`Draft not found: ${id}`);
    }
    return dropDraft(id) ?? null;
  },
};
