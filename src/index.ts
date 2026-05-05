import express from "express";
import draftRouter from "./routes/draft.routes";
import { json } from "express";
import { createGraphQLMiddleware } from "./graphql/server";

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() })
});

app.use("/drafts", draftRouter)

async function main() {
  const graphqlMiddleware = await createGraphQLMiddleware();
  app.use("/graphql", json(), graphqlMiddleware);

  app.listen(PORT, () => {
    console.log(`REST:    http://localhost:${PORT}/drafts`);
    console.log(`GraphQL: http://localhost:${PORT}/graphql`);
  });
}

main();
