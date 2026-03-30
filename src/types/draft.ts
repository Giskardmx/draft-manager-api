// ============================================================
// Status & Platform — union types, no enums
// ============================================================

export type DraftStatus = "IDEA" | "DRAFT" | "REVIEW" | "PUBLISHED" | "DROPPED";

export type Platform = "blog" | "newsletter" | "twitter" | "linkedin";

// ============================================================
// Core entity
// ============================================================

export interface Draft {
  id: string;
  title: string;
  body: string;
  status: DraftStatus;
  platform: Platform;
  tags: string[];
  estimatedPublishDate?: string; // ISO 8601 — requerido solo para PUBLISHED
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601
}

// ============================================================
// Request shapes — lo que llega en req.body
// ============================================================

export interface CreateDraftInput {
  title: string;
  body: string;
  platform: Platform;
  tags?: string[];
  estimatedPublishDate?: string;
}

export interface UpdateDraftInput {
  title?: string;
  body?: string;
  platform?: Platform;
  tags?: string[];
  status?: DraftStatus;
  estimatedPublishDate?: string;
}

// ============================================================
// Query params — lo que llega en req.query
// ============================================================

export interface DraftFilters {
  status?: DraftStatus;
  platform?: Platform;
}

// ============================================================
// Transition rules — el corazón de la lógica de negocio
// ============================================================

export const VALID_TRANSITIONS: Record<DraftStatus, DraftStatus[]> = {
  IDEA:      ["DRAFT", "DROPPED"],
  DRAFT:     ["REVIEW", "DROPPED"],
  REVIEW:    ["PUBLISHED", "DROPPED"],
  PUBLISHED: [],                      // terminal — un post publicado no se descarta
  DROPPED:   [],                      // terminal — mismo razonamiento que PUBLISHED
};

// ============================================================
// API response wrapper — consistencia en todos los endpoints
// ============================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
