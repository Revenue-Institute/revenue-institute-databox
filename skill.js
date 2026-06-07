#!/usr/bin/env node
/**
 * Revenue Institute — Databox Executive Dashboard Architect
 * 
 * A single-tool MCP server that injects Revenue Institute's executive
 * metric curation logic as a prompt, then hands off to Databox's native
 * MCP tools (list_metrics, load_metric_data, ask_genie) which must be
 * connected separately.
 *
 * Install: npx revenue-institute-databox
 * Requires: Databox MCP connected in Claude Desktop / Claude Code
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import express from "express";

const server = new McpServer({
  name: "Revenue Institute — Executive Dashboard Architect",
  version: "1.0.0",
});

server.registerTool(
  "build_executive_dashboard",
  {
    title: "Revenue Institute — Build Executive Dashboard",
    description: `Builds an executive-grade Databox dashboard brief for a given company.
    
Uses Databox's native MCP tools (list_accounts, list_data_sources, list_metrics,
load_metric_data, ask_genie) to discover what data is available, then applies
Revenue Institute's executive curation logic to surface the right KPIs.

Args:
  - company_name: Company name
  - executive_role: "ceo" | "coo" | "cfo" | "sales_leader"
  - business_priority: "pipeline_growth" | "margin_and_profitability" | "operational_efficiency" | "client_retention" | "headcount_roi" | "cash_flow"
  - industry: "legal" | "accounting" | "consulting" | "staffing" | "general_professional_services"

Returns a prompt that Claude executes against the connected Databox MCP tools.`,
    inputSchema: z.object({
      company_name: z.string().min(1).describe("Company name"),
      executive_role: z.enum(["ceo", "coo", "cfo", "sales_leader"]).describe("Executive role"),
      business_priority: z.enum(["pipeline_growth", "margin_and_profitability", "operational_efficiency", "client_retention", "headcount_roi", "cash_flow"]).describe("Primary 90-day priority"),
      industry: z.enum(["legal", "accounting", "consulting", "staffing", "general_professional_services"]).default("general_professional_services").describe("Industry vertical"),
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ company_name, executive_role, business_priority, industry }) => {
    const prompt = buildPrompt(company_name, executive_role, business_priority, industry);
    return {
      content: [{ type: "text", text: prompt }],
    };
  }
);

function buildPrompt(company, role, priority, industry) {
  return `# Revenue Institute — Executive Dashboard Architect
## Building dashboard for: ${company} | Role: ${role.toUpperCase()} | Priority: ${priority.replace(/_/g, " ")} | Industry: ${industry.replace(/_/g, " ")}

You are now executing the Revenue Institute Executive Dashboard Architect. Follow these steps precisely using the connected Databox MCP tools.

---

## STEP 1: Discover accounts and data sources

Call \`list_accounts\` to get the account ID.
Call \`list_data_sources\` with that account ID.
List every connected source. Do not skip any.

---

## STEP 2: List metrics for each source

For each data source returned, call \`list_metrics\`.
Collect ALL available metrics across ALL sources into one list.

---

## STEP 3: Apply executive curation — KEEP these metrics

Score each metric. Select the top 10 that match this table:

| Source keywords | Metric keywords | Roles | Priorities |
|---|---|---|---|
| hubspot, salesforce, pipedrive | revenue, mrr, arr, closed_won | ceo, sales_leader | pipeline_growth |
| hubspot, salesforce, pipedrive | pipeline_value, open_deals | ceo, sales_leader | pipeline_growth |
| hubspot, salesforce, pipedrive | close_rate, win_rate | ceo, sales_leader | pipeline_growth |
| hubspot, salesforce, pipedrive | churn, attrition | ceo, coo | client_retention |
| hubspot, salesforce | nps, csat, net_promoter | ceo, coo | client_retention |
| hubspot, salesforce, stripe | ltv, lifetime_value | ceo, cfo | client_retention |
| quickbooks, xero, freshbooks | gross_margin, profit_margin | ceo, cfo, coo | margin_and_profitability |
| quickbooks, xero, freshbooks | accounts_receivable, ar, overdue | ceo, cfo | cash_flow |
| quickbooks, xero | cash_flow, runway | ceo, cfo | cash_flow |
| quickbooks, xero | cac, customer_acquisition_cost | ceo, cfo | margin_and_profitability |
| harvest, toggl | utilization, billable_hours | ceo, coo | operational_efficiency |
| bamboohr, gusto, adp | headcount, turnover | ceo, coo | headcount_roi |
| google ads, facebook, meta | roas, cost_per_lead, cpl | ceo, sales_leader | pipeline_growth |
| hubspot, marketo, mailchimp | qualified_leads, mqls | ceo, sales_leader | pipeline_growth |

Boost score for metrics matching role: ${role} and priority: ${priority}.

## STEP 3b: ALWAYS EXCLUDE these — never show to an executive

bounce_rate, session_duration, page_views, impressions, ctr, click_through_rate,
organic_traffic, keyword_ranking, domain_authority, social_followers, likes,
shares, open_rate, unsubscribe_rate, spam_rate, avg_position, crawl_errors

---

## STEP 4: Load current metric values

For each selected metric, call \`load_metric_data\` with:
- date_range: "MonthToDate" for revenue/pipeline metrics
- date_range: "Last30Days" for rates and efficiency metrics  
- include vs-previous-period comparison where available

---

## STEP 5: Ask Genie for cross-metric patterns

Call \`ask_genie\` with this question:
"For ${company}, what is the single most important pattern a ${role.toUpperCase()} should act on right now? Focus on ${priority.replace(/_/g, " ")}. Analyze the relationships between the top metrics we've identified."

---

## STEP 6: Output the Executive Intelligence Brief

Format your output exactly as follows:

---

# ${company} — ${role.toUpperCase()} Executive Intelligence Brief
*${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} | Priority: ${priority.replace(/_/g, " ")} | Industry: ${industry.replace(/_/g, " ")}*

## Snapshot
[One sentence. Flag urgency if critical metrics exist. Example: "${company} has strong pipeline but declining close rate — conversion is the immediate lever."]

## Top Metrics

[For each of the 10 selected metrics:]
### [Metric Name] — [Data Source]
- **Current value:** [value with unit]
- **vs. prior period:** [+/-X%]
- **Urgency:** 🔴 Critical / 🟡 Watch / 🟢 Healthy
- **Why it matters:** [1 sentence executive interpretation — no jargon]
- **Dashboard:** [kpi_card / gauge / line_chart] | [large / medium / small] | [date range]
${role === "ceo" || role === "cfo" ? "- **Alert threshold:** [if applicable from intelligence map]" : ""}

## Cross-Metric Patterns
[Genie output + any of these if applicable:]
- If pipeline up + close rate down: "Pipeline is full but conversion is leaking — the problem is in the sales process, not lead volume."
- If churn up + revenue up: "Acquisition is masking a retention problem. You are running to stand still."  
- If utilization up + margin flat: "Capacity is maxed but margin is not following — investigate pricing and scope creep."
- If NPS falling + churn stable: "Client satisfaction is eroding 2-3 months ahead of churn. Act now."

## Recommended Actions
[Ordered by urgency — Critical first, then Watch, then Healthy]
1. [Action]
2. [Action]
3. Build this dashboard in Databox using the blueprint below (under 30 minutes with the Wizard)
4. Set Databox alerts on all metrics with defined thresholds

## Databoard Blueprint

| # | Metric | Source | Visualization | Size | Date Range | Alert Threshold |
|---|---|---|---|---|---|---|
| 1 | [large metrics first] | | | large | | |
| 2 | | | | | | |
...

## Setup Instructions
1. Databox → Databoards → + New Databoard → Use Wizard
2. Select [primary source] as first data source
3. Add each metric from the blueprint above in order
4. Set alert thresholds on flagged metrics
5. Share dashboard link with ${company} leadership team

---
*Built by Revenue Institute — Operators, Not Theorists | revenueinstitute.com*
`;
  }

// ─── Transport ────────────────────────────────────────────────────────────────

async function runHTTP() {
  const app = express();
  app.use(express.json());
  app.get("/health", (_, res) => res.json({ status: "ok", server: "Revenue Institute Executive Dashboard Architect", version: "1.0.0" }));
  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
  const port = parseInt(process.env.PORT ?? "3000");
  app.listen(port, () => console.error(`[revenue-institute-databox] HTTP on port ${port}`));
}

async function runStdio() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[revenue-institute-databox] Ready");
}

const transport = process.env.TRANSPORT ?? "stdio";
if (transport === "http") {
  runHTTP().catch(err => { console.error("Fatal:", err); process.exit(1); });
} else {
  runStdio().catch(err => { console.error("Fatal:", err); process.exit(1); });
}
