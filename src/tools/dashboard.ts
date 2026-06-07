import { type McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DataboxApiClient, DataboxMcpClient } from "../services/databox.js";
import { ExecutiveCurationEngine } from "../services/curation.js";
import {
  DiscoverDataSourcesSchema,
  BuildExecutiveDashboardSchema,
  GetMetricIntelSchema,
  ValidateConnectionSchema,
} from "../schemas/inputs.js";
import { ROLE_DISPLAY, PRIORITY_DISPLAY } from "../constants.js";
import type { DataboxMetric } from "../types.js";

const curationEngine = new ExecutiveCurationEngine();

// ─── Register All Tools ────────────────────────────────────────────────────────

export function registerTools(server: McpServer): void {
  registerValidateConnection(server);
  registerDiscoverDataSources(server);
  registerBuildExecutiveDashboard(server);
  registerGetMetricIntel(server);
}

// ─── Tool 1: Validate Connection ──────────────────────────────────────────────

function registerValidateConnection(server: McpServer): void {
  server.registerTool(
    "databox_validate_connection",
    {
      title: "Validate Databox API Key",
      description: `Validates a Databox API key and returns account information.

Use this as a setup health-check before running other tools.

Args:
  - databox_api_key (string): The API key from Databox Settings > API

Returns:
  - valid (boolean): Whether the key is valid
  - account_count (number): Number of accessible accounts
  - message (string): Human-readable result

Examples:
  - Use when: "Check if my Databox key works"
  - Use when: Setting up the integration for the first time`,
      inputSchema: ValidateConnectionSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ databox_api_key }) => {
      try {
        const client = new DataboxApiClient(databox_api_key);
        const isValid = await client.validateKey();

        if (!isValid) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  valid: false,
                  message:
                    "API key validation failed. Check the key in Databox under Settings > Integrations > API.",
                }),
              },
            ],
          };
        }

        const accounts = await client.listAccounts();
        const result = {
          valid: true,
          account_count: accounts.length,
          accounts: accounts.map((a) => ({ id: a.id, name: a.name })),
          message: `Connection successful. Found ${accounts.length} account(s). Use an account ID from this list in subsequent calls.`,
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error validating Databox connection: ${msg}`,
            },
          ],
        };
      }
    }
  );
}

// ─── Tool 2: Discover Data Sources ────────────────────────────────────────────

function registerDiscoverDataSources(server: McpServer): void {
  server.registerTool(
    "databox_discover_data_sources",
    {
      title: "Discover Connected Data Sources",
      description: `Discovers all data sources connected to a Databox account.

This is always the first step. It tells you what tools the client has connected
(HubSpot, QuickBooks, Google Ads, etc.) so you can curate the right metrics.

Args:
  - databox_api_key (string): Databox API key
  - account_id (number, optional): Account ID. Use from validate_connection result.

Returns:
  - data_sources: Array of connected data sources with id, name, type
  - source_count: Total number of data sources
  - recognized_sources: Sources that have known executive metrics in the intelligence map
  - recommendations: What dashboards can be built from available sources

Examples:
  - Use when: Starting a new client dashboard build
  - Use when: "What data sources does this client have in Databox?"`,
      inputSchema: DiscoverDataSourcesSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ databox_api_key, account_id }) => {
      try {
        const client = new DataboxApiClient(databox_api_key);

        let targetAccountId = account_id;
        if (!targetAccountId) {
          const accounts = await client.listAccounts();
          if (accounts.length === 0) {
            throw new Error(
              "No accounts found for this API key. Check your Databox account."
            );
          }
          targetAccountId = accounts[0].id;
        }

        const dataSources = await client.listDataSources(targetAccountId);

        // Tag which sources we have executive metric intelligence for
        const HIGH_VALUE_KEYWORDS = [
          "hubspot", "salesforce", "pipedrive", "quickbooks", "xero",
          "google ads", "facebook", "meta", "harvest", "toggl",
          "bamboohr", "gusto", "stripe", "chargebee",
        ];

        const recognized = dataSources.filter((ds) =>
          HIGH_VALUE_KEYWORDS.some((kw) =>
            ds.name.toLowerCase().includes(kw)
          )
        );

        const unrecognized = dataSources.filter(
          (ds) =>
            !HIGH_VALUE_KEYWORDS.some((kw) =>
              ds.name.toLowerCase().includes(kw)
            )
        );

        const hasRevenueTool = recognized.some((ds) =>
          ["hubspot", "salesforce", "pipedrive", "stripe"].some((kw) =>
            ds.name.toLowerCase().includes(kw)
          )
        );

        const hasFinancialTool = recognized.some((ds) =>
          ["quickbooks", "xero", "freshbooks"].some((kw) =>
            ds.name.toLowerCase().includes(kw)
          )
        );

        const recommendations: string[] = [];
        if (hasRevenueTool && hasFinancialTool) {
          recommendations.push(
            "Revenue + Financial tools connected -- can build a comprehensive CEO dashboard with pipeline, margin, and cash flow."
          );
        } else if (hasRevenueTool) {
          recommendations.push(
            "CRM connected -- can build a strong pipeline and revenue dashboard. Add QuickBooks or Xero to unlock margin and cash flow metrics."
          );
        } else if (hasFinancialTool) {
          recommendations.push(
            "Financial tool connected -- can build a CFO/financial dashboard. Add HubSpot or Salesforce to unlock pipeline metrics."
          );
        } else {
          recommendations.push(
            "Connect your CRM (HubSpot/Salesforce) and accounting tool (QuickBooks/Xero) to unlock the most valuable executive metrics."
          );
        }

        const result = {
          account_id: targetAccountId,
          source_count: dataSources.length,
          data_sources: dataSources.map((ds) => ({
            id: ds.id,
            name: ds.name,
            type: ds.type,
          })),
          recognized_sources: recognized.map((ds) => ds.name),
          unrecognized_sources: unrecognized.map((ds) => ds.name),
          recommendations,
          next_step:
            "Call databox_build_executive_dashboard with these data sources to generate an executive dashboard blueprint.",
        };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error discovering data sources: ${msg}`,
            },
          ],
        };
      }
    }
  );
}

// ─── Tool 3: Build Executive Dashboard ────────────────────────────────────────
// The main event.

function registerBuildExecutiveDashboard(server: McpServer): void {
  server.registerTool(
    "databox_build_executive_dashboard",
    {
      title: "Build Executive Dashboard Blueprint",
      description: `The core Revenue Institute tool. Auto-discovers available metrics across all connected
data sources, applies executive-level curation logic, and returns a complete dashboard
blueprint with setup instructions and an Executive Intelligence Brief.

This is NOT a template. It reads the actual connected data sources, scores every
available metric for executive relevance based on role/priority/industry, selects
the best 8-12 metrics, loads their current values, and generates cross-metric insights.

Args:
  - databox_api_key (string): Databox API key
  - databox_mcp_token (string, optional): MCP OAuth token for AI-powered cross-metric analysis
  - account_id (number, optional): Databox account ID
  - company_name (string): Client company name
  - executive_role: "ceo" | "coo" | "cfo" | "sales_leader" | "general"
  - business_priority: "pipeline_growth" | "margin_and_profitability" | "operational_efficiency" | "client_retention" | "headcount_roi" | "cash_flow"
  - industry: "legal" | "accounting" | "consulting" | "staffing" | "general_professional_services"
  - max_widgets (number, optional): 4-16 widgets. Default 10.

Returns:
  - executive_intelligence_brief: Current state analysis with urgency levels
  - dashboard_blueprint: Complete widget spec with metric keys, viz types, sizes, date ranges
  - setup_instructions: Step-by-step Databox setup guide
  - excluded_metrics: Analyst-level metrics that were filtered out

Examples:
  - "Build a CEO dashboard for Acme Law, focused on pipeline growth"
  - "What should a COO at a consulting firm track in Databox?"`,
      inputSchema: BuildExecutiveDashboardSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({
      databox_api_key,
      databox_mcp_token,
      account_id,
      company_name,
      executive_role,
      business_priority,
      industry,
      max_widgets,
    }) => {
      try {
        const apiClient = new DataboxApiClient(databox_api_key);
        const mcpClient = databox_mcp_token
          ? new DataboxMcpClient(databox_mcp_token)
          : null;

        // ── Step 1: Get account ─────────────────────────────────────────────
        let targetAccountId = account_id;
        if (!targetAccountId) {
          const accounts = await apiClient.listAccounts();
          if (accounts.length === 0) {
            throw new Error("No Databox accounts found for this API key.");
          }
          targetAccountId = accounts[0].id;
        }

        // ── Step 2: Discover data sources ──────────────────────────────────
        const dataSources = await apiClient.listDataSources(targetAccountId);
        if (dataSources.length === 0) {
          throw new Error(
            `No data sources found in Databox account ${targetAccountId}. Connect at least one integration (HubSpot, QuickBooks, etc.) first.`
          );
        }

        // ── Step 3: Collect all available metrics ──────────────────────────
        // Try REST API first, then fall back to MCP if token provided
        const allMetrics: DataboxMetric[] = [];

        for (const source of dataSources) {
          const metrics = await apiClient.listMetricsForDataSource(
            source.id,
            source.name
          );
          allMetrics.push(...metrics);
        }

        // If MCP token provided and REST returned few/no metrics, use MCP
        if (allMetrics.length < 5 && mcpClient) {
          const mcpSources = await mcpClient.listDataSources();
          for (const source of mcpSources) {
            const metrics = await mcpClient.listMetrics(String(source.id));
            allMetrics.push(...metrics);
          }
        }

        // ── Step 4: Curate executive metrics ───────────────────────────────
        const { selected, excluded } = curationEngine.selectExecutiveMetrics(
          dataSources,
          allMetrics,
          executive_role,
          business_priority,
          industry,
          max_widgets ?? 10
        );

        if (selected.length === 0) {
          // Graceful fallback: build blueprint from known patterns even without
          // live metric enumeration (some Databox plans limit REST metric listing)
          return {
            content: [
              {
                type: "text",
                text: buildFallbackResponse(
                  company_name,
                  executive_role,
                  business_priority,
                  industry,
                  dataSources.map((ds) => ds.name)
                ),
              },
            ],
          };
        }

        // ── Step 5: Load current metric values ─────────────────────────────
        const metricDataPromises = selected.map((metric) =>
          apiClient.loadMetricValue(
            metric.dataSourceId ?? 0,
            metric.key,
            metric.name ?? metric.key,
            metric.dataSourceName ?? "Unknown",
            "last_30_days"
          )
        );
        const metricData = await Promise.all(metricDataPromises);

        // ── Step 6: Get AI-powered cross-metric insights (if MCP available) ─
        let genieInsights = "";
        if (mcpClient && selected.length > 0) {
          try {
            genieInsights = await mcpClient.askGenie(
              `For ${company_name}, analyze these metrics and identify the single most important pattern a ${ROLE_DISPLAY[executive_role]} should act on right now: ${selected.map((m) => m.name).join(", ")}. Focus on ${PRIORITY_DISPLAY[business_priority]}.`
            );
          } catch {
            // Genie is enhancement, not blocker
            genieInsights = "";
          }
        }

        // ── Step 7: Build dashboard blueprint ─────────────────────────────
        const blueprint = curationEngine.buildDashboardBlueprint(
          selected,
          dataSources,
          excluded,
          executive_role,
          business_priority,
          industry,
          company_name
        );

        // ── Step 8: Build intelligence brief ──────────────────────────────
        const brief = curationEngine.buildIntelligenceBrief(
          metricData,
          blueprint,
          genieInsights,
          company_name
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(brief, null, 2),
            },
          ],
          structuredContent: brief,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error building executive dashboard: ${msg}`,
            },
          ],
        };
      }
    }
  );
}

// ─── Tool 4: Get Metric Intel (Ask Genie) ─────────────────────────────────────

function registerGetMetricIntel(server: McpServer): void {
  server.registerTool(
    "databox_get_metric_intel",
    {
      title: "Get AI-Powered Metric Intelligence",
      description: `Ask a natural language question about Databox data using Genie (Databox's AI analysis engine).

Use for deep-dive questions after the dashboard is built. Examples:
  - "What's driving the pipeline decline this quarter?"
  - "Which team member has the highest close rate?"
  - "Is our gross margin trending up or down over the last 6 months?"

Args:
  - databox_mcp_token (string): Databox MCP OAuth token
  - question (string): Natural language question (10-500 chars)
  - dataset_id (string, optional): Scope to a specific dataset

Returns:
  - answer (string): AI-generated analysis and insight
  - raw_result: Full MCP response

Error handling:
  - Returns descriptive error if MCP token is invalid or expired
  - Returns "No MCP token provided" if token is missing`,
      inputSchema: GetMetricIntelSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ databox_mcp_token, question, dataset_id }) => {
      try {
        const mcpClient = new DataboxMcpClient(databox_mcp_token);
        const answer = await mcpClient.askGenie(question, dataset_id);

        const result = { question, answer, analyzed_at: new Date().toISOString() };

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: `Error querying Databox Genie: ${msg}. Check your MCP token is valid and not expired.`,
            },
          ],
        };
      }
    }
  );
}

// ─── Fallback Response (when live metric enumeration isn't available) ─────────
// Some Databox plans don't expose metric lists via REST. In that case, we still
// generate a high-value blueprint based on our intelligence map + detected sources.

function buildFallbackResponse(
  companyName: string,
  role: string,
  priority: string,
  industry: string,
  connectedSources: string[]
): string {
  return JSON.stringify(
    {
      mode: "blueprint_only",
      note: "Live metric data not available via REST API for this account tier. Blueprint generated from connected data sources using Revenue Institute intelligence map.",
      company: companyName,
      connected_sources: connectedSources,
      role,
      priority,
      industry,
      recommended_metrics: [
        {
          source: connectedSources[0] ?? "Your CRM",
          metrics: [
            "Revenue / Closed Won",
            "Pipeline Value",
            "Close Rate",
            "New Leads / MQLs",
          ],
          why: "Revenue and pipeline are the CEO's primary leading indicators",
        },
        {
          source: connectedSources[1] ?? "Your Financial Tool",
          metrics: ["Gross Margin %", "Outstanding Invoices", "Cash Flow"],
          why: "Financial health can't be inferred from CRM data alone",
        },
      ],
      setup_instructions: [
        "1. In Databox, go to Databoards > + New Databoard > Use Wizard",
        `2. Select ${connectedSources[0] ?? "your CRM"} as the first data source`,
        "3. Add Revenue/Closed Won as a large KPI card",
        "4. Add Pipeline Value as a large KPI card",
        "5. Add Close Rate as a gauge",
        "6. Add Gross Margin % as a gauge",
        "7. Add Outstanding Invoices as a KPI card",
        "8. Share with leadership team",
      ],
      upgrade_note:
        "Connect a Databox MCP token (mcp.databox.com) to enable live metric detection, current values, and AI-powered cross-metric analysis.",
    },
    null,
    2
  );
}
