import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { parseWiseText } from "../lib/wise-parser.js";

export function registerWiseImportTools(server: McpServer) {
  server.registerTool(
    "parse_wise_pdf",
    {
      title: "Parse Wise PDF",
      description:
        "Parse a Wise balance statement PDF file and extract transactions. Provide the absolute file path to the PDF. Returns structured transaction data with dates, descriptions, amounts, currency, and references.",
      inputSchema: {
        filePath: z
          .string()
          .describe("Absolute path to the Wise PDF statement file"),
      },
    },
    async ({ filePath }) => {
      try {
        const buffer = await readFile(filePath);
        const pdfParse = (await import("pdf-parse")).default;
        const pdfData = await pdfParse(buffer);
        const result = parseWiseText(pdfData.text);

        const output = {
          fileName: basename(filePath),
          currency: result.currency,
          dateRange: result.dateRange,
          transactionCount: result.transactions.length,
          transactions: result.transactions.map((tx) => ({
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            currency: tx.currency,
            reference: tx.reference,
            type: tx.incoming ? "incoming" : "outgoing",
          })),
        };

        return {
          content: [{ type: "text" as const, text: JSON.stringify(output, null, 2) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text" as const, text: `Error parsing PDF: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
