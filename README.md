# Databox Executive Dashboard Architect
### by Revenue Institute

> **"40 to 168 hours of output -- starting with the dashboard executives actually need."**

An MCP server that auto-discovers your client's connected Databox data sources, curates the right executive-level KPIs (not analyst noise), and generates a complete dashboard blueprint + Executive Intelligence Brief.

---

## What It Does

1. **Discovers** every data source connected to Databox (HubSpot, QuickBooks, Google Ads, etc.)
2. **Scores** all available metrics using the Revenue Institute Executive Intelligence Map -- filtering out bounce rates, impressions, and every other metric analysts love but CEOs don't need
3. **Loads** current values for selected metrics
4. **Analyzes** cross-metric patterns (is pipeline up but close rate down? Is churn rising while revenue grows?)
5. **Outputs** a ready-to-build Databoard blueprint + urgency-flagged intelligence brief

---

## Tools

| Tool | Description |
|------|-------------|
| `databox_validate_connection` | Validate API key and list accounts |
| `databox_discover_data_sources` | Inventory all connected tools in Databox |
| `databox_build_executive_dashboard` | **Main tool** -- full discovery, curation, and blueprint generation |
| `databox_get_metric_intel` | Ask natural language questions via Databox Genie AI |

---

## Setup

### Prerequisites

- Node.js 18+
- Databox account (Professional plan or above for API access)
- Databox API key: **Settings > Integrations > API**
- (Optional) Databox MCP token: `mcp.databox.com` for AI-powered analysis

### Install & Build

```bash
npm install
npm run build
```

### Run (stdio -- for Claude Desktop)

```bash
npm start
```

### Run (HTTP -- for remote Claude.ai MCP integration)

```bash
TRANSPORT=http PORT=3000 npm start
```

### Claude Desktop Config

```json
{
  "mcpServers": {
    "databox-executive": {
      "command": "node",
      "args": ["/path/to/databox-executive-mcp/dist/index.js"]
    }
  }
}
```

---

## Usage Examples

### Validate connection
```
databox_validate_connection({
  databox_api_key: "your_key_here"
})
```

### Discover what's connected
```
databox_discover_data_sources({
  databox_api_key: "your_key_here"
})
```

### Build a CEO dashboard for a law firm
```
databox_build_executive_dashboard({
  databox_api_key: "your_key_here",
  databox_mcp_token: "your_mcp_token",  // optional but recommended
  company_name: "Acme Law Group",
  executive_role: "ceo",
  business_priority: "pipeline_growth",
  industry: "legal",
  max_widgets: 10
})
```

### Ask Genie a business question
```
databox_get_metric_intel({
  databox_mcp_token: "your_mcp_token",
  question: "What's driving the pipeline decline this quarter and which rep is performing best?"
})
```

---

## Executive Roles Supported

| Role | Key Metrics Surfaced |
|------|---------------------|
| `ceo` | Revenue, pipeline, margin, churn, cash flow |
| `coo` | Utilization, capacity, headcount ROI, delivery margin |
| `cfo` | Gross margin, AR, cash flow, CAC vs LTV |
| `sales_leader` | Pipeline value, close rate, sales cycle, ROAS, CPL |
| `general` | Balanced across all executive metrics |

## Business Priorities

| Priority | What Gets Boosted |
|----------|------------------|
| `pipeline_growth` | CRM, pipeline, leads, close rate, ROAS |
| `margin_and_profitability` | Gross margin, CAC, LTV, billing efficiency |
| `operational_efficiency` | Utilization, throughput, cycle time |
| `client_retention` | Churn, NPS, renewal rates |
| `headcount_roi` | Revenue per employee, utilization, turnover |
| `cash_flow` | AR, collections, cash position, runway |

---

## Industries Supported

- `legal` -- Law firms
- `accounting` -- CPA/accounting firms
- `consulting` -- Management and strategy consulting
- `staffing` -- Staffing and recruiting agencies
- `general_professional_services` -- Default

---

## The Revenue Institute Executive Intelligence Map

The core IP. A curated set of rules that maps:
- **Data source** (HubSpot, QuickBooks, etc.) + **Metric** (close_rate, gross_margin, etc.)
- To: visualization type, size, date range, and executive interpretation

**What gets filtered OUT:**
- Bounce rate, session duration, page views (web analytics noise)
- Impressions, CTR, organic traffic (channel-level ad metrics)
- Social followers, likes, shares (vanity metrics)

---

## Architecture

```
Claude / MCP Client
       |
databox-executive-mcp (this server)
       |
  ┌────┴────┐
  │         │
Databox   Databox
REST API   MCP API
(data      (Genie AI
sources,   analysis)
metrics)
```

---

## Deploying to n8n (Revenue Institute Standard)

This server can be called from n8n to automate monthly executive report generation:

1. Deploy with `TRANSPORT=http`
2. In n8n, use HTTP Request node pointing to `/mcp`
3. Pass the MCP JSON-RPC payload for `databox_build_executive_dashboard`
4. Route the brief to Slack, email, or HubSpot CRM

---

*Built by Revenue Institute -- Operators, Not Theorists.*  
*Stephen Lowisz | revenueinstitute.com*
