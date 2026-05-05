// src/graphql/schema.ts
import { buildSchema } from "graphql";
import { readFileSync } from "fs";
import { join } from "path";

const typeDefs = readFileSync(join(__dirname, "schema.graphql"), "utf-8");

export const schema = buildSchema(typeDefs);
