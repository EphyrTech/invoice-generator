import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";

const VAULT_PATH = process.env.VAULT_PATH || "";

export function registerVaultResources(server: McpServer) {
  if (!VAULT_PATH) {
    console.error("VAULT_PATH not set — vault resources disabled");
    return;
  }

  server.registerResource(
    "vault-pdf-list",
    "vault://invoices",
    {
      title: "Invoice PDFs in Vault",
      description: "Lists all PDF files in the configured Obsidian vault invoices folder",
      mimeType: "application/json",
    },
    async () => {
      try {
        const expandedPath = VAULT_PATH.replace(/^~/, process.env.HOME || "");
        const entries = await readdir(expandedPath);
        const pdfs = [];

        for (const entry of entries) {
          if (extname(entry).toLowerCase() === ".pdf") {
            const fullPath = join(expandedPath, entry);
            const stats = await stat(fullPath);
            pdfs.push({
              name: entry,
              path: fullPath,
              size: stats.size,
              modified: stats.mtime.toISOString(),
            });
          }
        }

        return {
          contents: [{
            uri: "vault://invoices",
            text: JSON.stringify(pdfs, null, 2),
            mimeType: "application/json",
          }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          contents: [{
            uri: "vault://invoices",
            text: JSON.stringify({ error: message }),
            mimeType: "application/json",
          }],
        };
      }
    }
  );
}
