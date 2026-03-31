import { Router } from "express";
import {
  handleGetAllDrafts,
  handleGetDraftById,
  handleCreateDraft,
  handleUpdateDraft,
  handleDropDraft,
} from "../handlers/draft.handlers";

const router = Router();

router.get("/", handleGetAllDrafts);
router.get("/:id", handleGetDraftById);
router.post("/", handleCreateDraft);
router.patch("/:id", handleUpdateDraft);
router.delete("/:id", handleDropDraft);

export default router;
