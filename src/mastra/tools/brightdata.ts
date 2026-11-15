import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { searchWebContext } from "../../brightdata.ts";

export const brightDataSearchTool = createTool({
  id: "brightdata-serp-search",
  description:
    "Searches Google via Bright Data SERP API and returns organic search results (title, description, url).",
  inputSchema: z.object({
    query: z.string(),
    timeoutMs: z.number().optional(),
  }),
  outputSchema: z.object({
    sources: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        url: z.string(),
      })
    ),
  }),
  execute: async (inputData) => {
    const sources = await searchWebContext(
      inputData.query,
      inputData.timeoutMs ?? 8000
    );
    return { sources };
  },
});
