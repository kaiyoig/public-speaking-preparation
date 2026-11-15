import { Mastra } from "@mastra/core";
import { PostgresStore } from "@mastra/pg";
import { improvWorkflow } from "./workflows/improvWorkflow.ts";
import { qaWorkflow } from "./workflows/qaWorkflow.ts";
import { reflectionWorkflow } from "./workflows/reflectionWorkflow.ts";

const connectionString = process.env.DATABASE_URL;

export const mastra = new Mastra({
  workflows: {
    improvWorkflow,
    qaWorkflow,
    reflectionWorkflow,
  },
  ...(connectionString
    ? {
        storage: new PostgresStore({
          id: "speaking-coach-neon-store",
          connectionString,
        }),
      }
    : {}),
});
