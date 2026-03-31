import express from "express";
import draftRouter from "./routes/draft.routes";

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
});

app.use("/drafts", draftRouter)

app.listen(PORT, () => {
  console.log(`Draft Manager API running on http://localhost:${PORT}`);
});
