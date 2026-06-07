import { z } from "zod";

export const ExecutiveRoleSchema = z.enum([
  "ceo",
  "coo",
  "cfo",
  "sales_leader",
  "general",
]);

export const BusinessPrioritySchema = z.enum([
  "pipeline_growth",
  "margin_and_profitability",
  "operational_efficiency",
  "client_retention",
  "headcount_roi",
  "cash_flow",
]);

export const IndustryVerticalSchema = z.enum([
  "legal",
  "accounting",
  "consulting",
  "staffing",
  "general_professional_services",
]);

// ─── discover_data_sources input ─────────────────────────────────────────────

export const DiscoverDataSourcesSchema = z
  .object({
    databox_api_key: z
      .string()
      .min(10, "API key must be at least 10 characters")
      .describe("Databox API key (from Settings > API in Databox)"),
    account_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Databox account ID. If omitted, uses the default account for the API key."
      ),
  })
  .strict();

// ─── build_executive_dashboard input ─────────────────────────────────────────

export const BuildExecutiveDashboardSchema = z
  .object({
    databox_api_key: z
      .string()
      .min(10)
      .describe("Databox API key"),
    databox_mcp_token: z
      .string()
      .min(10)
      .optional()
      .describe(
        "Databox MCP OAuth token (from mcp.databox.com). Required for AI-powered insights via ask_genie."
      ),
    account_id: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Databox account ID. Defaults to primary account."),
    company_name: z
      .string()
      .min(1)
      .max(100)
      .describe("Client company name. Used in dashboard naming and brief."),
    executive_role: ExecutiveRoleSchema.describe(
      "Executive role this dashboard is for. Determines which metrics to surface."
    ),
    business_priority: BusinessPrioritySchema.describe(
      "The single most important 90-day business priority. Boosts score of directly relevant metrics."
    ),
    industry: IndustryVerticalSchema
      .default("general_professional_services")
      .describe("Industry vertical. Adjusts metric relevance scoring."),
    max_widgets: z
      .number()
      .int()
      .min(4)
      .max(16)
      .default(10)
      .describe("Maximum number of dashboard widgets (4-16). Default 10."),
  })
  .strict();

// ─── get_metric_intel input ───────────────────────────────────────────────────

export const GetMetricIntelSchema = z
  .object({
    databox_mcp_token: z
      .string()
      .min(10)
      .describe("Databox MCP OAuth token"),
    question: z
      .string()
      .min(10)
      .max(500)
      .describe(
        "Natural language question about your Databox data. Example: 'What is driving the pipeline decline this quarter?'"
      ),
    dataset_id: z
      .string()
      .optional()
      .describe("Optional: scope the analysis to a specific Databox dataset ID"),
  })
  .strict();

// ─── validate_connection input ────────────────────────────────────────────────

export const ValidateConnectionSchema = z
  .object({
    databox_api_key: z
      .string()
      .min(10)
      .describe("Databox API key to validate"),
  })
  .strict();

// ─── Inferred types ────────────────────────────────────────────────────────────

export type DiscoverDataSourcesInput = z.infer<typeof DiscoverDataSourcesSchema>;
export type BuildExecutiveDashboardInput = z.infer<typeof BuildExecutiveDashboardSchema>;
export type GetMetricIntelInput = z.infer<typeof GetMetricIntelSchema>;
export type ValidateConnectionInput = z.infer<typeof ValidateConnectionSchema>;
