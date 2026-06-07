#!/usr/bin/env node
/**
 * Databox Executive Dashboard Architect — Claude Skill
 * Revenue Institute | revenueinstitute.com
 *
 * INSTALL:
 *   npm install @modelcontextprotocol/sdk axios
 *   node skill.js   (stdio transport — for Claude Desktop)
 *   TRANSPORT=http PORT=3000 node skill.js   (HTTP — for remote/n8n)
 *
 * REGISTER IN CLAUDE DESKTOP:
 *   Add to ~/Library/Application Support/Claude/claude_desktop_config.json:
 *   {
 *     "mcpServers": {
 *       "databox-executive-dashboard": {
 *         "command": "node",
 *         "args": ["/absolute/path/to/skill.js"]
 *       }
 *     }
 *   }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import axios from "axios";
import { z } from "zod";
import express from "express";

// ─── Executive Metric Intelligence Map ───────────────────────────────────────
// Revenue Institute IP: maps data source + metric patterns to executive relevance.
// CEO/COO at a 50-500 person professional services firm cares about OUTCOMES.

const EXEC_MAP = [
  { srcKw:["hubspot","salesforce","pipedrive"], mKw:["revenue","mrr","arr","closed_won","total_revenue"], viz:"kpi_card", size:"large", dr:"this_month", why:"Revenue is the oxygen. If this number is not growing, nothing else matters.", roles:["ceo","coo","sales_leader"], priorities:["pipeline_growth","margin_and_profitability"] },
  { srcKw:["hubspot","salesforce","pipedrive"], mKw:["pipeline_value","open_deals_value","pipeline","deal_value"], viz:"kpi_card", size:"large", dr:"this_quarter", why:"Pipeline predicts future revenue. Thin pipeline today means a revenue problem in 60-90 days.", roles:["ceo","sales_leader"], priorities:["pipeline_growth"], alert:"Pipeline should be 3x monthly revenue target" },
  { srcKw:["hubspot","salesforce","pipedrive"], mKw:["close_rate","win_rate","deal_conversion","conversion_rate"], viz:"gauge", size:"medium", dr:"last_30_days", why:"Close rate reveals whether the sales process is working or leaking.", roles:["ceo","sales_leader"], priorities:["pipeline_growth"] },
  { srcKw:["hubspot","salesforce","pipedrive"], mKw:["sales_cycle","average_deal_time","time_to_close","days_to_close"], viz:"kpi_card", size:"small", dr:"last_90_days", why:"Lengthening sales cycles compress cash flow. Track the trend, not just the number.", roles:["ceo","coo","sales_leader"], priorities:["pipeline_growth","cash_flow"] },
  { srcKw:["hubspot","salesforce","stripe","chargebee","recurly"], mKw:["churn_rate","churn","attrition","cancellations"], viz:"gauge", size:"medium", dr:"last_30_days", why:"Churn is a silent killer. Losing one client in professional services can be 10-20% of revenue.", roles:["ceo","coo"], priorities:["client_retention","margin_and_profitability"], alert:"Any monthly churn above 2% requires immediate attention" },
  { srcKw:["hubspot","salesforce","stripe"], mKw:["ltv","lifetime_value","customer_lifetime_value","clv"], viz:"kpi_card", size:"medium", dr:"last_12_months", why:"LTV tells you what a client is actually worth and shapes how much you should invest to acquire them.", roles:["ceo","cfo"], priorities:["client_retention","margin_and_profitability"] },
  { srcKw:["hubspot","salesforce"], mKw:["nps","csat","satisfaction","net_promoter"], viz:"gauge", size:"medium", dr:"last_90_days", why:"NPS leads churn by 2-3 months. A falling score today is a revenue problem next quarter.", roles:["ceo","coo"], priorities:["client_retention"], alert:"Below 40 is a retention emergency" },
  { srcKw:["quickbooks","xero","freshbooks","sage","netsuite"], mKw:["gross_margin","gross_profit","margin","profit_margin"], viz:"gauge", size:"large", dr:"this_month", why:"Gross margin is the real health indicator. Revenue is vanity. Margin is sanity.", roles:["ceo","cfo","coo"], priorities:["margin_and_profitability"], alert:"Below 40% in professional services signals pricing or delivery problems" },
  { srcKw:["quickbooks","xero","freshbooks","stripe"], mKw:["outstanding_invoices","accounts_receivable","ar","overdue","collections"], viz:"kpi_card", size:"medium", dr:"today", why:"AR is how much you have earned but not been paid. Every dollar here is a cash flow risk.", roles:["ceo","cfo","coo"], priorities:["cash_flow","margin_and_profitability"], alert:"Average collection above 30 days is a problem" },
  { srcKw:["quickbooks","xero","freshbooks"], mKw:["cash_flow","operating_cash","net_cash","runway","bank_balance"], viz:"line_chart", size:"large", dr:"last_90_days", why:"Cash is the only metric that keeps the lights on. Know your runway. Update it weekly.", roles:["ceo","cfo"], priorities:["cash_flow"] },
  { srcKw:["quickbooks","xero"], mKw:["cac","customer_acquisition_cost","cost_per_acquisition","cost_per_client"], viz:"kpi_card", size:"small", dr:"last_90_days", why:"If CAC exceeds LTV divided by 3, you have a math problem.", roles:["ceo","cfo","sales_leader"], priorities:["margin_and_profitability","pipeline_growth"] },
  { srcKw:["harvest","toggl","clickup","asana","monday","hubspot"], mKw:["utilization","billable_hours","billable_rate","capacity"], viz:"gauge", size:"large", dr:"this_month", why:"Utilization is the leverage lever for professional services. Every unbillable hour is a direct margin hit.", roles:["ceo","coo"], priorities:["operational_efficiency","headcount_roi","margin_and_profitability"], alert:"Below 70% means excess capacity or a pricing problem" },
  { srcKw:["bamboohr","gusto","adp","workday","rippling"], mKw:["headcount","employee_count","staff_count","team_size"], viz:"kpi_card", size:"small", dr:"today", why:"Headcount is your biggest cost. Track it against revenue per employee to see operational leverage.", roles:["ceo","coo","cfo"], priorities:["headcount_roi","operational_efficiency"] },
  { srcKw:["bamboohr","gusto","adp"], mKw:["turnover","attrition_rate","employee_turnover","retention_rate"], viz:"kpi_card", size:"medium", dr:"last_90_days", why:"In professional services, people are the product. High turnover = client risk + rehire cost of 50-200% of salary.", roles:["ceo","coo"], priorities:["headcount_roi","operational_efficiency"], alert:"Annualized turnover above 15% requires investigation" },
  { srcKw:["google_ads","google ads","facebook","meta","linkedin"], mKw:["roas","return_on_ad_spend","cost_per_lead","cpl"], viz:"kpi_card", size:"medium", dr:"last_30_days", why:"ROAS and CPL are the only ad metrics an executive should look at. Everything else is noise.", roles:["ceo","sales_leader"], priorities:["pipeline_growth","margin_and_profitability"] },
  { srcKw:["hubspot","marketo","mailchimp"], mKw:["qualified_leads","mqls","inbound_leads","new_leads"], viz:"line_chart", size:"medium", dr:"last_30_days", why:"Qualified leads are a 60-90 day leading indicator for revenue. Watch the trend.", roles:["ceo","sales_leader"], priorities:["pipeline_growth"] },
];

const NOISE_KW = ["bounce_rate","session_duration","page_views","impressions","ctr","click_through_rate","organic_traffic","keyword_ranking","domain_authority","social_followers","likes","shares","open_rate","unsubscribe_rate","spam_rate","avg_position","crawl_errors"];

const ROLE_DISPLAY = { ceo:"CEO", coo:"COO", cfo:"CFO", sales_leader:"Sales Leader", general:"Executive" };
const PRIORITY_DISPLAY = { pipeline_growth:"Pipeline & Revenue Growth", margin_and_profitability:"Margin & Profitability", operational_efficiency:"Operational Efficiency", client_retention:"Client Retention", headcount_roi:"Headcount ROI", cash_flow:"Cash Flow & Financial Health" };
const DATABOX_API = "https://api.databox.com";

// ─── API Client ───────────────────────────────────────────────────────────────

function makeClient(apiKey) {
  return axios.create({
    baseURL: DATABOX_API,
    headers: { "x-api-key": apiKey, "Content-Type": "application/json", "Accept": "application/json" },
    timeout: 30000,
  });
}

async function apiCall(client, method, path, params = {}, data = null) {
  try {
    const res = await client.request({ method, url: path, params, data });
    return res.data;
  } catch (err) {
    const status = err?.response?.status;
    const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
    if (status === 401) throw new Error(`Databox auth failed. Check API key. Details: ${msg}`);
    if (status === 404) throw new Error(`Not found: ${path}. Details: ${msg}`);
    if (status === 429) throw new Error(`Rate limit hit. Wait 60s. Details: ${msg}`);
    throw new Error(`Databox API error (${status ?? "unknown"}): ${msg}`);
  }
}

// ─── Curation Engine ──────────────────────────────────────────────────────────

function scoreMetric(metric, sourceName, role, priority) {
  const mLower = ((metric.key ?? "") + " " + (metric.name ?? "")).toLowerCase();
  const sLower = (sourceName ?? "").toLowerCase();
  if (NOISE_KW.some(k => mLower.includes(k))) return -1;
  let score = 0;
  for (const rule of EXEC_MAP) {
    if (!rule.srcKw.some(k => sLower.includes(k))) continue;
    if (!rule.mKw.some(k => mLower.includes(k))) continue;
    score += 10;
    if (rule.roles.includes(role)) score += 15;
    if (rule.priorities.includes(priority)) score += 20;
  }
  return score;
}

function findRule(sourceName, metricStr) {
  const sl = (sourceName ?? "").toLowerCase();
  const ml = (metricStr ?? "").toLowerCase();
  return EXEC_MAP.find(r => r.srcKw.some(k => sl.includes(k)) && r.mKw.some(k => ml.includes(k))) ?? null;
}

function formatTitle(s) {
  return (s ?? "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function buildWidgets(selected, dataSources) {
  return selected
    .map((m, i) => {
      const source = dataSources.find(ds => ds.id === m.dataSourceId);
      const rule = findRule(source?.name ?? "", (m.key ?? "") + " " + (m.name ?? ""));
      return {
        id: `widget_${i + 1}`,
        position: i + 1,
        metricKey: m.key,
        metricName: m.name ?? m.key,
        dataSourceId: m.dataSourceId,
        dataSourceName: source?.name ?? "Unknown",
        visualizationType: rule?.viz ?? "kpi_card",
        title: formatTitle(m.name ?? m.key),
        why_it_matters: rule?.why ?? "Key executive performance indicator.",
        alert_threshold: rule?.alert ?? null,
        dateRange: rule?.dr ?? "last_30_days",
        size: rule?.size ?? "medium",
      };
    })
    .sort((a, b) => ({ large: 0, medium: 1, small: 2 })[a.size] - ({ large: 0, medium: 1, small: 2 })[b.size])
    .map((w, i) => ({ ...w, position: i + 1 }));
}

function buildInsights(metricData) {
  return metricData.map(d => {
    const ml = (d.metricName ?? "").toLowerCase();
    const val = parseFloat(d.value);
    let urgency = "healthy";
    if (ml.includes("churn") && !isNaN(val)) { if (val > 5) urgency = "critical"; else if (val > 2) urgency = "watch"; }
    if (ml.includes("utilization") && !isNaN(val)) { if (val < 60) urgency = "critical"; else if (val < 70) urgency = "watch"; }
    if (d.trend === "down" || d.trend === "declining") urgency = "watch";
    return {
      metric_name: d.metricName,
      data_source: d.dataSourceName,
      current_value: d.value !== null && d.value !== undefined ? String(d.value) : "no data available",
      trend: d.trend ?? "unavailable",
      urgency,
    };
  });
}

function buildPatterns(widgets) {
  const names = widgets.map(w => (w.metricName ?? "").toLowerCase());
  const patterns = [];
  if (names.some(n => n.includes("pipeline")) && names.some(n => n.includes("close"))) patterns.push("Pipeline and close rate are both tracked -- compare their trends to identify whether growth requires more leads or better conversion.");
  if (names.some(n => n.includes("churn")) && names.some(n => n.includes("revenue"))) patterns.push("Cross-reference churn against revenue growth. Growing revenue alongside rising churn means acquisition is masking a retention problem.");
  if (names.some(n => n.includes("utilization")) && names.some(n => n.includes("margin"))) patterns.push("Utilization and gross margin should move together in professional services. If utilization rises but margin is flat, investigate pricing and scope management.");
  if (names.some(n => n.includes("nps")) && names.some(n => n.includes("churn"))) patterns.push("NPS leads churn by 2-3 months. If NPS is declining, prepare retention interventions before the churn number confirms it.");
  return patterns;
}

function buildSetupInstructions(widgets, dataSources) {
  const sources = [...new Set(widgets.map(w => w.dataSourceName))];
  return [
    "1. In Databox, go to Databoards > + New Databoard > Use Wizard",
    `2. Select ${sources[0] ?? "your primary data source"} as the first data source`,
    ...widgets.map((w, i) => `${i + 3}. Add ${w.metricName} -- ${w.visualizationType.replace(/_/g, " ")}, ${w.size} size, date range: ${w.dateRange.replace(/_/g, " ")}`),
    `${widgets.length + 3}. Set Databox alerts on all metrics with defined thresholds`,
    `${widgets.length + 4}. Share the dashboard with your leadership team via Databox sharing link`,
  ];
}

// ─── MCP Server ───────────────────────────────────────────────────────────────

const server = new McpServer({ name: "databox-executive-mcp", version: "1.0.0" });

// ── Tool 1: Validate Connection ───────────────────────────────────────────────
server.registerTool(
  "databox_validate_connection",
  {
    title: "Validate Databox API Key",
    description: `Validates a Databox API key and returns account information. Always run this first before other tools.

Args:
  - databox_api_key: API key from Databox Settings > Integrations > API

Returns:
  - valid (boolean), account_count, accounts list with IDs
  - Use the account ID in subsequent tool calls`,
    inputSchema: z.object({
      databox_api_key: z.string().min(10).describe("Databox API key"),
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ databox_api_key }) => {
    try {
      const client = makeClient(databox_api_key);
      const res = await apiCall(client, "GET", "/v1/accounts");
      const accounts = res.data ?? res ?? [];
      const result = {
        valid: true,
        account_count: accounts.length,
        accounts: accounts.map(a => ({ id: a.id, name: a.name, timezone: a.timezone })),
        next_step: "Call databox_discover_data_sources with one of the account IDs above.",
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }] };
    }
  }
);

// ── Tool 2: Discover Data Sources ─────────────────────────────────────────────
server.registerTool(
  "databox_discover_data_sources",
  {
    title: "Discover Connected Data Sources",
    description: `Discovers all data sources connected to a Databox account. Run before building a dashboard.

Args:
  - databox_api_key: Databox API key
  - account_id (optional): From validate_connection. Defaults to primary account.

Returns:
  - data_sources: All connected sources with id, name, type
  - recognized_sources: Sources matched in the executive metric intelligence map
  - recommendations: What executive dashboards can be built from available sources`,
    inputSchema: z.object({
      databox_api_key: z.string().min(10).describe("Databox API key"),
      account_id: z.number().int().positive().optional().describe("Account ID from validate_connection"),
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  async ({ databox_api_key, account_id }) => {
    try {
      const client = makeClient(databox_api_key);
      let accountId = account_id;
      if (!accountId) {
        const res = await apiCall(client, "GET", "/v1/accounts");
        const accounts = res.data ?? res ?? [];
        if (!accounts.length) throw new Error("No accounts found for this API key.");
        accountId = accounts[0].id;
      }
      const dsRes = await apiCall(client, "GET", `/v1/accounts/${accountId}/data-sources`);
      const dataSources = dsRes.data ?? dsRes ?? [];
      if (!dataSources.length) throw new Error("No data sources found. Connect integrations in Databox first.");

      const HIGH_VALUE = ["hubspot","salesforce","pipedrive","quickbooks","xero","freshbooks","google ads","facebook","meta","linkedin","harvest","toggl","bamboohr","gusto","stripe","chargebee","adp","workday"];
      const recognized = dataSources.filter(ds => HIGH_VALUE.some(k => ds.name.toLowerCase().includes(k)));

      const hasRevenue = dataSources.some(ds => ["hubspot","salesforce","pipedrive","stripe"].some(k => ds.name.toLowerCase().includes(k)));
      const hasFinancial = dataSources.some(ds => ["quickbooks","xero","freshbooks"].some(k => ds.name.toLowerCase().includes(k)));

      let recommendation = "";
      if (hasRevenue && hasFinancial) recommendation = "Revenue + Financial tools connected -- can build a comprehensive CEO/COO/CFO dashboard with pipeline, margin, and cash flow.";
      else if (hasRevenue) recommendation = "CRM connected -- strong pipeline and revenue dashboard available. Add QuickBooks or Xero to unlock margin and cash flow.";
      else if (hasFinancial) recommendation = "Financial tool connected -- CFO dashboard available. Add HubSpot or Salesforce to unlock pipeline metrics.";
      else recommendation = "Connect your CRM (HubSpot/Salesforce) and accounting tool (QuickBooks/Xero) to unlock the highest-value executive metrics.";

      const result = {
        account_id: accountId,
        source_count: dataSources.length,
        data_sources: dataSources.map(ds => ({ id: ds.id, name: ds.name, type: ds.type })),
        recognized_sources: recognized.map(ds => ds.name),
        recommendation,
        next_step: "Call databox_build_executive_dashboard with your account_id, role, priority, and industry.",
      };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }] };
    }
  }
);

// ── Tool 3: Build Executive Dashboard ─────────────────────────────────────────
server.registerTool(
  "databox_build_executive_dashboard",
  {
    title: "Build Executive Dashboard Blueprint",
    description: `Core Revenue Institute tool. Auto-discovers metrics across all connected Databox data sources,
applies executive-level curation (filters analyst noise, scores by role/priority/industry),
loads current metric values, detects cross-metric patterns, and returns a complete
Executive Intelligence Brief + dashboard blueprint with widget-by-widget setup instructions.

This is NOT a template. It reads actual connected sources and produces a blueprint specific
to this client's data.

Args:
  - databox_api_key: Databox API key
  - databox_mcp_token (optional): MCP OAuth token from mcp.databox.com for Genie AI analysis
  - account_id (optional): Databox account ID. Defaults to primary account.
  - company_name: Client company name
  - executive_role: "ceo" | "coo" | "cfo" | "sales_leader" | "general"
  - business_priority: "pipeline_growth" | "margin_and_profitability" | "operational_efficiency" | "client_retention" | "headcount_roi" | "cash_flow"
  - industry: "legal" | "accounting" | "consulting" | "staffing" | "general_professional_services"
  - max_widgets: 4-16, default 10

Returns:
  - company_snapshot: One-line health assessment with urgency
  - top_insights: Per-metric analysis with urgency flags (critical / watch / healthy)
  - cross_metric_patterns: AI-detected relationships between metrics
  - recommended_actions: Numbered action list ordered by urgency
  - dashboard_blueprint: Widget-by-widget spec (metric key, viz type, size, date range, alert thresholds)
  - setup_instructions: Step-by-step Databox Wizard guide
  - excluded_metrics: Analyst-noise metrics that were filtered out`,
    inputSchema: z.object({
      databox_api_key: z.string().min(10).describe("Databox API key"),
      databox_mcp_token: z.string().min(10).optional().describe("MCP OAuth token for Genie AI (optional)"),
      account_id: z.number().int().positive().optional().describe("Databox account ID"),
      company_name: z.string().min(1).max(100).describe("Client company name"),
      executive_role: z.enum(["ceo","coo","cfo","sales_leader","general"]).describe("Executive role"),
      business_priority: z.enum(["pipeline_growth","margin_and_profitability","operational_efficiency","client_retention","headcount_roi","cash_flow"]).describe("Primary 90-day priority"),
      industry: z.enum(["legal","accounting","consulting","staffing","general_professional_services"]).default("general_professional_services").describe("Industry vertical"),
      max_widgets: z.number().int().min(4).max(16).default(10).describe("Max dashboard widgets"),
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ databox_api_key, databox_mcp_token, account_id, company_name, executive_role, business_priority, industry, max_widgets }) => {
    try {
      const client = makeClient(databox_api_key);

      // Get account
      let accountId = account_id;
      if (!accountId) {
        const res = await apiCall(client, "GET", "/v1/accounts");
        const accounts = res.data ?? res ?? [];
        if (!accounts.length) throw new Error("No accounts found for this API key.");
        accountId = accounts[0].id;
      }

      // Get data sources
      const dsRes = await apiCall(client, "GET", `/v1/accounts/${accountId}/data-sources`);
      const dataSources = dsRes.data ?? dsRes ?? [];
      if (!dataSources.length) throw new Error("No data sources in Databox. Connect integrations first.");

      // Collect metrics across all sources
      const allMetrics = [];
      for (const source of dataSources) {
        try {
          const mRes = await apiCall(client, "GET", `/v1/data-sources/${source.id}/metrics`);
          const metrics = mRes.data ?? mRes ?? [];
          metrics.forEach(m => { m.dataSourceId = source.id; m.dataSourceName = source.name; });
          allMetrics.push(...metrics);
        } catch (_) { /* endpoint may 404 on some plan tiers -- handled below */ }
      }

      // Score and select metrics
      const scored = [];
      const excluded = [];
      for (const m of allMetrics) {
        const score = scoreMetric(m, m.dataSourceName, executive_role, business_priority);
        if (score === -1) { excluded.push(m.name ?? m.key); }
        else if (score > 0) { scored.push({ m, score }); }
        else { excluded.push(m.name ?? m.key); }
      }
      scored.sort((a, b) => b.score - a.score);
      const selected = scored.slice(0, max_widgets).map(s => s.m);

      // Build widgets (with fallback if metrics endpoint unavailable)
      const widgets = buildWidgets(selected.length > 0 ? selected : buildFallbackMetrics(dataSources, executive_role), dataSources);

      // Load current metric values
      const metricData = [];
      for (const m of selected) {
        try {
          const vRes = await apiCall(client, "GET", `/v1/data-sources/${m.dataSourceId}/metrics/${m.key}`, { date_range: "last_30_days" });
          metricData.push({ ...m, value: vRes.value ?? vRes.current ?? null, trend: vRes.trend, change: vRes.change, unit: vRes.unit });
        } catch (_) { metricData.push({ ...m, value: null }); }
      }

      // Ask Genie if MCP token provided
      let genieInsight = "";
      if (databox_mcp_token && widgets.length > 0) {
        try {
          const mcpRes = await axios.post("https://mcp.databox.com/mcp", {
            jsonrpc: "2.0", id: Date.now(), method: "tools/call",
            params: { name: "ask_genie", arguments: { question: `For ${company_name}, what is the single most important pattern a ${ROLE_DISPLAY[executive_role]} should act on right now across these metrics: ${widgets.map(w => w.metricName).join(", ")}? Focus on ${PRIORITY_DISPLAY[business_priority]}.` } }
          }, { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${databox_mcp_token}` }, timeout: 60000 });
          genieInsight = mcpRes.data?.result?.answer ?? "";
        } catch (_) { genieInsight = ""; }
      }

      // Build intelligence brief
      const insights = buildInsights(metricData.length > 0 ? metricData : widgets.map(w => ({ ...w, value: null })));
      const patterns = buildPatterns(widgets);
      if (genieInsight) patterns.push(genieInsight);

      const critCount = insights.filter(i => i.urgency === "critical").length;
      const watchCount = insights.filter(i => i.urgency === "watch").length;
      const snapshot = critCount > 0
        ? `${company_name} has ${critCount} metric${critCount > 1 ? "s" : ""} requiring immediate attention${watchCount > 0 ? ` and ${watchCount} to monitor closely` : ""}.`
        : watchCount > 0
          ? `${company_name} is performing adequately with ${watchCount} metric${watchCount > 1 ? "s" : ""} worth monitoring.`
          : `${company_name} metrics appear healthy across tracked KPIs.`;

      const actions = [];
      if (critCount > 0) actions.push(`URGENT: Address ${insights.filter(i => i.urgency === "critical").map(i => i.metric_name).join(", ")} immediately.`);
      if (watchCount > 0) actions.push(`MONITOR: Schedule weekly 15-min review of ${insights.filter(i => i.urgency === "watch").map(i => i.metric_name).join(", ")}.`);
      actions.push("Build this dashboard in Databox using the setup instructions below -- under 30 minutes with the Wizard.");
      actions.push("Set Databox alerts on all metrics with defined alert_threshold values.");
      const withAlerts = widgets.filter(w => w.alert_threshold);
      if (withAlerts.length > 0) actions.push(`Benchmarks to configure: ${withAlerts.map(w => `${w.metricName}: ${w.alert_threshold}`).join("; ")}.`);

      const brief = {
        generated_at: new Date().toISOString(),
        company: company_name,
        executive_role,
        business_priority,
        industry,
        company_snapshot: snapshot,
        top_insights: insights,
        cross_metric_patterns: patterns,
        recommended_actions: actions,
        excluded_metrics: excluded.slice(0, 20),
        dashboard_blueprint: {
          name: `${company_name} -- ${ROLE_DISPLAY[executive_role]} Executive Dashboard`,
          description: `AI-curated executive dashboard focused on ${PRIORITY_DISPLAY[business_priority]}. Generated by Revenue Institute Executive Dashboard Architect.`,
          widget_count: widgets.length,
          widgets,
          setup_instructions: buildSetupInstructions(widgets, dataSources),
        },
      };

      return { content: [{ type: "text", text: JSON.stringify(brief, null, 2) }], structuredContent: brief };
    } catch (err) {
      return { content: [{ type: "text", text: `Error building executive dashboard: ${err.message}` }] };
    }
  }
);

// ── Tool 4: Get Metric Intel (Ask Genie) ──────────────────────────────────────
server.registerTool(
  "databox_get_metric_intel",
  {
    title: "Get AI-Powered Metric Intelligence",
    description: `Ask a natural language question about Databox data using Genie (Databox's AI engine).
Use for deep-dive analysis after the dashboard is built.

Args:
  - databox_mcp_token: MCP OAuth token from mcp.databox.com
  - question: Natural language question (10-500 chars)
    Examples: "What's driving the pipeline decline?" / "Which rep has the best close rate?"
  - dataset_id (optional): Scope analysis to a specific dataset

Returns:
  - answer: AI-generated analysis
  - question: The question that was asked`,
    inputSchema: z.object({
      databox_mcp_token: z.string().min(10).describe("Databox MCP OAuth token"),
      question: z.string().min(10).max(500).describe("Natural language question about your Databox data"),
      dataset_id: z.string().optional().describe("Optional: scope to a specific Databox dataset ID"),
    }).strict(),
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async ({ databox_mcp_token, question, dataset_id }) => {
    try {
      const res = await axios.post("https://mcp.databox.com/mcp", {
        jsonrpc: "2.0", id: Date.now(), method: "tools/call",
        params: { name: "ask_genie", arguments: { question, ...(dataset_id ? { dataset_id } : {}) } }
      }, { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${databox_mcp_token}` }, timeout: 60000 });
      const answer = res.data?.result?.answer ?? JSON.stringify(res.data?.result ?? "No response from Genie");
      const result = { question, answer, analyzed_at: new Date().toISOString() };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result };
    } catch (err) {
      return { content: [{ type: "text", text: `Error querying Databox Genie: ${err.message}. Verify your MCP token is valid and not expired.` }] };
    }
  }
);

// ─── Fallback metric list when REST metric endpoint unavailable ───────────────
function buildFallbackMetrics(dataSources, role) {
  const metrics = [];
  const ds = dataSources;
  const crm = ds.find(s => ["hubspot","salesforce","pipedrive"].some(k => s.name.toLowerCase().includes(k)));
  const fin = ds.find(s => ["quickbooks","xero","freshbooks"].some(k => s.name.toLowerCase().includes(k)));
  const time = ds.find(s => ["harvest","toggl"].some(k => s.name.toLowerCase().includes(k)));
  if (crm) {
    metrics.push({ key:"revenue", name:"Revenue", dataSourceId:crm.id, dataSourceName:crm.name });
    metrics.push({ key:"pipeline_value", name:"Pipeline value", dataSourceId:crm.id, dataSourceName:crm.name });
    metrics.push({ key:"close_rate", name:"Close rate", dataSourceId:crm.id, dataSourceName:crm.name });
    metrics.push({ key:"churn_rate", name:"Churn rate", dataSourceId:crm.id, dataSourceName:crm.name });
  }
  if (fin) {
    metrics.push({ key:"gross_margin", name:"Gross margin", dataSourceId:fin.id, dataSourceName:fin.name });
    metrics.push({ key:"accounts_receivable", name:"Outstanding invoices", dataSourceId:fin.id, dataSourceName:fin.name });
    metrics.push({ key:"cash_flow", name:"Cash flow", dataSourceId:fin.id, dataSourceName:fin.name });
  }
  if (time) {
    metrics.push({ key:"utilization", name:"Billable utilization", dataSourceId:time.id, dataSourceName:time.name });
  }
  return metrics;
}

// ─── Transport ────────────────────────────────────────────────────────────────

async function runHTTP() {
  const app = express();
  app.use(express.json());
  app.get("/health", (_, res) => res.json({ status: "ok", server: "databox-executive-mcp", version: "1.0.0" }));
  app.post("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
  const port = parseInt(process.env.PORT ?? "3000");
  app.listen(port, () => console.error(`[databox-executive-mcp] HTTP server running on port ${port}`));
}

async function runStdio() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[databox-executive-mcp] stdio transport ready");
}

const transport = process.env.TRANSPORT ?? "stdio";
if (transport === "http") {
  runHTTP().catch(err => { console.error("Fatal:", err); process.exit(1); });
} else {
  runStdio().catch(err => { console.error("Fatal:", err); process.exit(1); });
}
