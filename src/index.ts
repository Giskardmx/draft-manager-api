import express from "express";
import {createDraft, getAllDrafts} from "./data/store";

const draft = createDraft({
  title: "My first post",
  body: "Still figuring this out",
  platform: "blog",
  tags: ["typescript", "beginners"],
});

console.log(draft);
console.log(getAllDrafts());

const app = express();
const PORT = 3000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
});

app.listen(PORT, () => {
  console.log(`Draft Manager API running on http://localhost:${PORT}`);
});
