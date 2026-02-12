import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db, schema } from "../db/client.js";
import { eq, and, gte, lte, sql, type SQL } from "drizzle-orm";

const USER_ID = "user-1";

export function registerInvoiceQueryTools(server: McpServer) {
  server.registerTool(
    "list_invoices",
    {
      title: "List Invoices",
      description:
        "Query invoices with flexible filters. Returns summary list with totals.",
      inputSchema: {
        clientId: z.string().optional().describe("Filter by client ID"),
        status: z
          .enum(["draft", "issued", "paid", "overdue", "cancelled"])
          .optional()
          .describe("Filter by invoice status"),
        dateFrom: z.string().optional().describe("Filter invoices from this date (YYYY-MM-DD)"),
        dateTo: z.string().optional().describe("Filter invoices up to this date (YYYY-MM-DD)"),
        minAmount: z.number().optional().describe("Minimum total amount"),
        maxAmount: z.number().optional().describe("Maximum total amount"),
        currency: z.string().optional().describe("Filter by currency code"),
        limit: z.number().optional().default(20).describe("Max results (default 20)"),
        offset: z.number().optional().default(0).describe("Offset for pagination"),
      },
    },
    async (params) => {
      const conditions: SQL[] = [eq(schema.invoices.userId, USER_ID)];

      if (params.clientId) conditions.push(eq(schema.invoices.clientId, params.clientId));
      if (params.status) conditions.push(eq(schema.invoices.status, params.status));
      if (params.dateFrom) conditions.push(gte(schema.invoices.issueDate, params.dateFrom));
      if (params.dateTo) conditions.push(lte(schema.invoices.issueDate, params.dateTo));
      if (params.minAmount !== undefined) conditions.push(gte(schema.invoices.total, params.minAmount));
      if (params.maxAmount !== undefined) conditions.push(lte(schema.invoices.total, params.maxAmount));
      if (params.currency) conditions.push(eq(schema.invoices.currency, params.currency));

      const where = and(...conditions);

      const invoices = await db
        .select({
          id: schema.invoices.id,
          invoiceNumber: schema.invoices.invoiceNumber,
          clientName: schema.clients.name,
          total: schema.invoices.total,
          currency: schema.invoices.currency,
          status: schema.invoices.status,
          issueDate: schema.invoices.issueDate,
        })
        .from(schema.invoices)
        .leftJoin(schema.clients, eq(schema.invoices.clientId, schema.clients.id))
        .where(where)
        .limit(params.limit)
        .offset(params.offset)
        .orderBy(schema.invoices.issueDate);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.invoices)
        .where(where);

      return {
        content: [{
          type: "text" as const,
          text: JSON.stringify({
            invoices,
            totalCount: Number(countResult[0]?.count ?? 0),
          }, null, 2),
        }],
      };
    }
  );

  server.registerTool(
    "get_invoice",
    {
      title: "Get Invoice",
      description:
        "Get full invoice details by ID or invoice number. Includes items, business profile, and client.",
      inputSchema: {
        id: z.string().optional().describe("Invoice ID"),
        invoiceNumber: z.string().optional().describe("Invoice number (e.g. INV-0001)"),
      },
    },
    async (params) => {
      if (!params.id && !params.invoiceNumber) {
        return {
          content: [{ type: "text" as const, text: "Error: Provide either id or invoiceNumber" }],
          isError: true,
        };
      }

      const condition = params.id
        ? and(eq(schema.invoices.id, params.id), eq(schema.invoices.userId, USER_ID))
        : and(eq(schema.invoices.invoiceNumber, params.invoiceNumber!), eq(schema.invoices.userId, USER_ID));

      const invoice = await db.query.invoices.findFirst({
        where: condition,
        with: {
          items: true,
          businessProfile: true,
          client: true,
        },
      });

      if (!invoice) {
        return {
          content: [{ type: "text" as const, text: "Invoice not found" }],
          isError: true,
        };
      }

      return {
        content: [{ type: "text" as const, text: JSON.stringify(invoice, null, 2) }],
      };
    }
  );
}
