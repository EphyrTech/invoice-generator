import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db, schema } from "../db/client.js";
import { eq, and, gte, sql, ne } from "drizzle-orm";

const USER_ID = "user-1";

function getPeriodStart(period: string): string {
  const now = new Date();
  switch (period) {
    case "quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      return new Date(now.getFullYear(), quarter * 3, 1).toISOString().split("T")[0];
    }
    case "year":
      return `${now.getFullYear()}-01-01`;
    case "month":
    default:
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  }
}

export function registerReportingTools(server: McpServer) {
  server.registerTool(
    "get_dashboard_stats",
    {
      title: "Dashboard Stats",
      description:
        "Get revenue summaries and invoice statistics for a given period. Shows total revenue, invoice count, unpaid totals, and top clients.",
      inputSchema: {
        period: z
          .enum(["month", "quarter", "year"])
          .optional()
          .default("month")
          .describe("Time period for stats (default: month)"),
      },
    },
    async ({ period }) => {
      const periodStart = getPeriodStart(period);
      const userCondition = eq(schema.invoices.userId, USER_ID);

      const revenueResult = await db
        .select({ total: sql<number>`coalesce(sum(${schema.invoices.total}), 0)` })
        .from(schema.invoices)
        .where(and(userCondition, eq(schema.invoices.status, "paid"), gte(schema.invoices.issueDate, periodStart)));

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.invoices)
        .where(and(userCondition, gte(schema.invoices.issueDate, periodStart)));

      const unpaidResult = await db
        .select({
          count: sql<number>`count(*)`,
          total: sql<number>`coalesce(sum(${schema.invoices.total}), 0)`,
        })
        .from(schema.invoices)
        .where(and(userCondition, ne(schema.invoices.status, "paid"), ne(schema.invoices.status, "cancelled")));

      const topClients = await db
        .select({
          name: schema.clients.name,
          total: sql<number>`coalesce(sum(${schema.invoices.total}), 0)`,
        })
        .from(schema.invoices)
        .leftJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
        .where(and(userCondition, gte(schema.invoices.issueDate, periodStart)))
        .groupBy(schema.clients.name)
        .orderBy(sql`sum(${schema.invoices.total}) desc`)
        .limit(5);

      const result = {
        period,
        periodStart,
        totalRevenue: Number(revenueResult[0]?.total ?? 0),
        invoiceCount: Number(countResult[0]?.count ?? 0),
        unpaidCount: Number(unpaidResult[0]?.count ?? 0),
        unpaidTotal: Number(unpaidResult[0]?.total ?? 0),
        topClients: topClients.map((c) => ({ name: c.name, total: Number(c.total) })),
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
