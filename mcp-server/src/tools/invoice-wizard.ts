import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { db, schema } from "../db/client.js";
import { v4 as uuidv4 } from "uuid";

const USER_ID = "user-1";

export function registerInvoiceWizardTools(server: McpServer) {
  server.registerTool(
    "create_invoice",
    {
      title: "Create Invoice",
      description:
        "Create a new invoice with line items. Calculates subtotal, tax, discount, and total automatically. Returns the created invoice summary.",
      inputSchema: {
        businessProfileId: z.string().describe("Business profile ID (sender)"),
        clientId: z.string().describe("Client ID (recipient)"),
        invoiceNumber: z.string().describe("Invoice number (e.g. INV-2026-001)"),
        issueDate: z.string().describe("Issue date in YYYY-MM-DD format"),
        dueDate: z.string().describe("Due date in YYYY-MM-DD format"),
        items: z
          .array(
            z.object({
              description: z.string().describe("Line item description"),
              quantity: z.number().positive().describe("Quantity"),
              unitPrice: z.number().min(0).describe("Unit price"),
            })
          )
          .min(1)
          .describe("Invoice line items (at least one)"),
        taxRate: z.number().min(0).max(100).optional().default(0).describe("Tax rate percentage"),
        discountRate: z.number().min(0).max(100).optional().default(0).describe("Discount rate percentage"),
        notes: z.string().optional().describe("Invoice notes"),
        terms: z.string().optional().describe("Payment terms"),
        currency: z.string().optional().default("USD").describe("Currency code (default: USD)"),
        status: z
          .enum(["draft", "issued"])
          .optional()
          .default("draft")
          .describe("Invoice status (default: draft)"),
      },
    },
    async (params) => {
      const invoiceId = uuidv4();

      // Calculate totals
      const subtotal = params.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const discountAmount = subtotal * (params.discountRate / 100);
      const taxableAmount = subtotal - discountAmount;
      const taxAmount = taxableAmount * (params.taxRate / 100);
      const total = taxableAmount + taxAmount;

      // Insert invoice
      await db.insert(schema.invoices).values({
        id: invoiceId,
        userId: USER_ID,
        businessProfileId: params.businessProfileId,
        clientId: params.clientId,
        invoiceNumber: params.invoiceNumber,
        issueDate: params.issueDate,
        dueDate: params.dueDate,
        status: params.status,
        subtotal,
        taxRate: params.taxRate,
        taxAmount,
        discountRate: params.discountRate,
        discountAmount,
        total,
        notes: params.notes ?? null,
        terms: params.terms ?? null,
        currency: params.currency,
      });

      // Insert items
      const itemValues = params.items.map((item) => {
        const amount = item.quantity * item.unitPrice;
        const itemTaxAmount = amount * (params.taxRate / 100);
        return {
          id: uuidv4(),
          invoiceId,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount,
          taxRate: params.taxRate,
          taxAmount: itemTaxAmount,
        };
      });

      await db.insert(schema.invoiceItems).values(itemValues);

      const result = {
        id: invoiceId,
        invoiceNumber: params.invoiceNumber,
        total: Math.round(total * 100) / 100,
        currency: params.currency,
        status: params.status,
        itemCount: params.items.length,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
