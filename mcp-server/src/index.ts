#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerClientTools } from "./tools/clients.js";
import { registerInvoiceQueryTools } from "./tools/invoice-query.js";
import { registerInvoiceWizardTools } from "./tools/invoice-wizard.js";
import { registerWiseImportTools } from "./tools/wise-import.js";
import { registerReportingTools } from "./tools/reporting.js";
import { registerVaultResources } from "./resources/vault-files.js";

const server = new McpServer({
  name: "invoice",
  version: "1.0.0",
});

// Register all tools
registerClientTools(server);
registerInvoiceQueryTools(server);
registerInvoiceWizardTools(server);
registerWiseImportTools(server);
registerReportingTools(server);

// Register resources
registerVaultResources(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Invoice MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
