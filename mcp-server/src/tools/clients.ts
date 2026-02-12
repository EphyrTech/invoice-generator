import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db, schema } from "../db/client.js";
import { eq } from "drizzle-orm";

const USER_ID = "user-1";

export function registerClientTools(server: McpServer) {
  server.registerTool(
    "list_clients",
    {
      title: "List Clients",
      description:
        "List available clients and business profiles for invoice creation. Returns names, emails, and IDs.",
      inputSchema: {
        includeBusinessProfiles: z
          .boolean()
          .optional()
          .default(true)
          .describe("Include business profiles in response (default: true)"),
      },
    },
    async ({ includeBusinessProfiles }) => {
      const clients = await db
        .select({
          id: schema.clients.id,
          name: schema.clients.name,
          email: schema.clients.email,
          country: schema.clients.country,
        })
        .from(schema.clients)
        .where(eq(schema.clients.userId, USER_ID));

      const result: Record<string, unknown> = { clients };

      if (includeBusinessProfiles) {
        const profiles = await db
          .select({
            id: schema.businessProfiles.id,
            name: schema.businessProfiles.name,
            email: schema.businessProfiles.email,
            country: schema.businessProfiles.country,
          })
          .from(schema.businessProfiles)
          .where(eq(schema.businessProfiles.userId, USER_ID));

        result.businessProfiles = profiles;
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
