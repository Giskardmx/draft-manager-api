import { randomUUID } from "crypto";
import type { Draft, CreateDraftInput, UpdateDraftInput, DraftFilters } from "../types/draft";

// ============================================================
// Internal state — solo accesible dentro de este módulo
// ============================================================

let drafts: Draft[] = [];

// ============================================================
// Read operations
// ============================================================

export function getAllDrafts(filters: DraftFilters = {}): Draft[] {
  const isEmptyFilter = !filters.status && !filters.platform;
  if(isEmptyFilter){
    return drafts.filter((draft) => draft.status !== "DROPPED");
  }
  return drafts.filter((draft) => {
    if (filters.status && draft.status !== filters.status) {
      return false;
    }
    if (filters.platform && draft.platform !== filters.platform) {
      return false;
    }
    return true;
  });
}

export function getDraftById(id: string): Draft | undefined {
  return drafts.find((draft) => draft.id === id);
}

// ============================================================
// Write operations
// ============================================================

export function createDraft(input: CreateDraftInput): Draft {
  const now = new Date().toISOString();

  const newDraft: Draft = {
    id: randomUUID(),
    title: input.title,
    body: input.body,
    status: "IDEA",
    platform: input.platform,
    tags: input.tags ?? [],
    estimatedPublishDate: input.estimatedPublishDate,
    createdAt: now,
    updatedAt: now,
  };

  drafts.push(newDraft);
  return newDraft;
}

export function updateDraft(id: string, input: UpdateDraftInput): Draft | undefined {
  const index = drafts.findIndex((draft) => draft.id === id);

  if (index === -1) {
    return undefined;
  }

  const existing = drafts[index];

  const updated: Draft = {
    ...existing,
    ...filterUndefined(input),
    id: existing.id,           // inmutable — el cliente no puede cambiarlo
    createdAt: existing.createdAt, // inmutable
    updatedAt: new Date().toISOString(),
  };

  drafts[index] = updated;
  return updated;
}

export function dropDraft(id: string): Draft | undefined {
  return updateDraft(id, { status: "DROPPED" });
}

// ============================================================
// Helper — evita sobreescribir campos con undefined
// ============================================================

function filterUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

// Testing only — no llamar en producción
export function resetStore(): void {
  drafts = [];
}
