// src/graphql/server.ts
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import { schema } from "./schema";
import { resolvers } from "./resolvers";

export async function createGraphQLMiddleware() {
  const server = new ApolloServer({
    schema,
    rootValue: resolvers,
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== "production",
  });

  await server.start();
  return expressMiddleware(server);
}
