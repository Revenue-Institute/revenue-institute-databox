import type { MetricPriority, ExecutiveRole, BusinessPriority } from "./types.js";

export const DATABOX_API_BASE = "https://api.databox.com";
export const DATABOX_MCP_BASE = "https://mcp.databox.com/mcp";
export const CHARACTER_LIMIT = 50000;

// ─── Executive Metric Intelligence Map ────────────────────────────────────────
// This is the core IP. Maps data source + metric patterns to executive relevance.
// CEO/COO at a 50-500 person professional services firm cares about OUTCOMES,
// not activity. Revenue, margin, capacity, pipeline -- not sessions, CTR, or
// bounce rate.

export const EXECUTIVE_METRIC_MAP: MetricPriority[] = [
  // ── REVENUE & PIPELINE ──────────────────────────────────────────────────────
  {
    dataSourceKeywords: ["hubspot", "salesforce", "pipedrive", "close"],
    metricKeywords: ["revenue", "mrr", "arr", "total_revenue", "closed_won"],
    visualizationType: "kpi_card",
    size: "large",
    dateRange: "this_month",
    why_it_matters: "Revenue is the oxygen. If this number isn't growing, nothing else matters.",
    roles: ["ceo", "coo", "sales_leader"],
    priorities: ["pipeline_growth", "margin_and_profitability"],
    industries: ["legal", "accounting", "consulting", "staffing", "general_professional_services"],
  },
  {
    dataSourceKeywords: ["hubspot", "salesforce", "pipedrive"],
    metricKeywords: ["pipeline_value", "open_deals_value", "pipeline", "deal_value"],
    visualizationType: "kpi_card",
    size: "large",
    dateRange: "this_quarter",
    why_it_matters: "Pipeline predicts future revenue. If pipeline is thin, you have 60-90 days before you feel it.",
    roles: ["ceo", "sales_leader"],
    priorities: ["pipeline_growth"],
    industries: ["legal", "accounting", "consulting", "staffing", "general_professional_services"],
    alertThreshold: "Pipeline should be 3x your monthly revenue target",
  },
  {
    dataSourceKeywords: ["hubspot", "salesforce", "pipedrive"],
    metricKeywords: ["close_rate", "win_rate", "deal_conversion", "conversion_rate"],
    visualizationType: "gauge",
    size: "medium",
    dateRange: "last_30_days",
    why_it_matters: "Close rate tells you if your sales process is working or leaking. A drop here before a pipeline drop means the problem is in execution, not leads.",
    roles: ["ceo", "sales_leader"],
    priorities: ["pipeline_growth"],
    industries: ["legal", "accounting", "consulting", "staffing", "general_professional_services"],
  },
  {
    dataSourceKeywords: ["hubspot", "salesforce", "pipedrive"],
    metricKeywords: ["sales_cycle", "average_deal_time", "time_to_close", "days_to_close"],
    visualizationType: "kpi_card",
    size: "small",
    dateRange: "last_90_days",
    why_it_matters: "Lengthening sales cycles compress cash flow and burn runway. Track the trend, not just the number.",
    roles: ["ceo", "coo", "sales_leader"],
    priorities: ["pipeline_growth", "cash_flow"],
    industries: ["legal", "accounting", "consulting", "staffing", "general_professional_services"],
  },

  // ── CLIENT RETENTION ────────────────────────────────────────────────────────
  {
    dataSourceKeywords: ["hubspot", "salesforce", "stripe", "chargebee", "recurly"],
    metricKeywords: ["churn_rate", "churn", "attrition", "cancellations"],
    visualizationType: "gauge",
    size: "medium",
    dateRange: "last_30_days",
    why_it_matters: "Churn is a silent killer. Every churned client means you're running to stand still. For professional services, losing one client can be 10-20% of revenue.",
    roles: ["ceo", "coo"],
    priorities: ["client_retention", "margin_and_profitability"],
    industries: ["legal", "accounting", "consulting", "staffing", "general_professional_services"],
    alertThreshold: "Any monthly churn above 2% requires immediate attention",
  },
  {
    dataSourceKeywords: ["hubspot", "salesforce", "stripe"],
    metricKeywords: ["ltv", "lifetime_value", "customer_lifetime_value", "clv"],
    visualizationType: "kpi_card",
    size: "medium",
    dateRange: "last_12_months",
    why_it_matters: "LTV tells you what a client is actually worth and shapes how much you should invest to acquire them.",
    roles: ["ceo", "cfo"],
    priorities: ["client_retention", "margin_and_profitability"],
    industries: ["legal", "accounting", "consulting", "staffing", "general_professional_services"],
  },
  {
    dataSourceKeywords: ["hubspot", "salesforce"],
    metricKeywords: ["nps", "csat", "satisfaction", "net_promoter"],
    visualizationType: "gauge",
    size: "medium",
    dateRange: "last_90_days",
    why_it_matters: "NPS leads churn by 2-3 months. A falling NPS today is a revenue problem in the next quarter.",
    roles: ["ceo", "coo"],
    priorities: ["client_retention"],
    industries: ["legal", "accounting", "consulting", "staffing", "general_professional_services"],
    alertThreshold: "Below 40 is a retention emergency",
  },

  // ── FINANCIAL HEALTH ────────────────────────────────────────────────────────
  {
    dataSourceKeywords: ["quickbooks", "xero", "freshbooks", "sage", "netsuite"],
    metricKeywords: ["gross_margin", "gross_profit", "margin", "profit_margin"],
    visualizationType: "gauge",
    size: "large",
    dateRange: "this_month",
    why_it_matters: "Gross margin is the real business health indicator. Revenue is vanity. Margin is sanity.",
    roles: ["ceo", "cfo", "coo"],
    priorities: ["margin_and_profitability"],
    industries: ["legal", "accounting", "consulting", "staffing", "general_professional_services"],
    alertThreshold: "Professional services margins below 40% signal pricing or delivery problems",
  },
  {
    dataSourceKeywords: ["quickbooks", "xero", "freshbooks", "stripe"],
    metricKeywords: ["outstanding_invoices", "accounts_receivable", "ar", "overdue", "collections"],
    visualizationType: "kpi_card",
    size: "medium",
    dateRange: "today",
    why_it_matters: "AR tells you how much money you've earned but haven't been paid. Every dollar here is a cash flow risk.",
    roles: ["ceo", "cfo", "coo"],
    priorities: ["cash_flow", "margin_and_profitability"],
    industries: ["legal", "accounting", "consulting", "staffing", "general_professional_services"],
    alertThreshold: "More than 30 days average collection is a problem",
  },
  {
    dataSourceKeywords: ["quickbooks", "xero", "freshbooks"],
    metricKeywords: ["cash_flow", "operating_cash", "net_cash", "runway", "bank_balance"],
    visualizationType: "line_chart",
    size: "large",
    dateRange: "last_90_days",
    why_it_matters: "Cash is the only metric that keeps the lights on. Know your runway. Update it weekly.",
    roles: ["ceo", "cfo"],
    priorities: ["cash_flow"],
    industries: ["legal", "accounting", "consulting", "staffing", "general_professional_services"],
  },
  {
    dataSourceKeywords: ["quickbooks", "xero"],
    metricKeywords: ["cac", "customer_acquisition_cost", "cost_per_acquisition", "cost_per_client"],
    visualizationType: "kpi_card",
    size: "small",
    dateRange: "last_90_days",
    why_it_matters: "CAC vs LTV is the unit economics of your business. If CAC exceeds LTV/3, you have a math problem.",
    roles: ["ceo", "cfo", "sales_leader"],
    priorities: ["margin_and_profitability", "pipeline_growth"],
    industries: ["legal", "accounting", "consulting", "staffing", "general_professional_services"],
  },

  // ── OPERATIONAL EFFICIENCY ───────────────────────────────────────────────────
  {
    dataSourceKeywords: ["harvest", "toggl", "clickup", "asana", "monday", "hubspot"],
    metricKeywords: ["utilization", "billable_hours", "billable_rate", "capacity"],
    visualizationType: "gauge",
    size: "large",
    dateRange: "this_month",
    why_it_matters: "Utilization is the leverage lever for professional services. Every unbillable hour is a direct margin hit.",
    roles: ["ceo", "coo"],
    priorities: ["operational_efficiency", "headcount_roi", "margin_and_profitability"],
    industries: ["legal", "accounting", "consulting", "staffing"],
    alertThreshold: "Below 70% utilization means you have excess capacity or a pricing problem",
  },
  {
    dataSourceKeywords: ["bamboohr", "gusto", "adp", "workday", "rippling"],
    metricKeywords: ["headcount", "employee_count", "staff_count", "team_size"],
    visualizationType: "kpi_card",
    size: "small",
    dateRange: "today",
    why_it_matters: "Headcount is your biggest cost. Tracking it against revenue per employee reveals operational leverage.",
    roles: ["ceo", "coo", "cfo"],
    priorities: ["headcount_roi", "operational_efficiency"],
    industries: ["legal", "accounting", "consulting", "staffing", "general_professional_services"],
  },
  {
    dataSourceKeywords: ["bamboohr", "gusto", "adp"],
    metricKeywords: ["turnover", "attrition_rate", "employee_turnover", "retention_rate"],
    visualizationType: "kpi_card",
    size: "medium",
    dateRange: "last_90_days",
    why_it_matters: "In professional services, people ARE the product. High turnover = client relationship risk + rehire cost (typically 50-200% of annual salary).",
    roles: ["ceo", "coo"],
    priorities: ["headcount_roi", "operational_efficiency"],
    industries: ["legal", "accounting", "consulting", "staffing", "general_professional_services"],
    alertThreshold: "Annualized turnover above 15% requires process investigation",
  },
  {
    dataSourceKeywords: ["harvest", "toggl", "quickbooks"],
    metricKeywords: ["revenue_per_employee", "revenue_per_headcount", "output_per_person"],
    visualizationType: "kpi_card",
    size: "medium",
    dateRange: "last_30_days",
    why_it_matters: "Revenue per employee is the single best indicator of operational leverage and AI impact over time.",
    roles: ["ceo", "coo"],
    priorities: ["headcount_roi", "operational_efficiency"],
    industries: ["legal", "accounting", "consulting", "staffing", "general_professional_services"],
  },

  // ── MARKETING & DEMAND GEN (executive-level only) ───────────────────────────
  {
    dataSourceKeywords: ["google_ads", "facebook_ads", "meta", "linkedin_ads"],
    metricKeywords: ["roas", "return_on_ad_spend", "ad_revenue", "cost_per_lead"],
    visualizationType: "kpi_card",
    size: "medium",
    dateRange: "last_30_days",
    why_it_matters: "ROAS and CPL are the only ad metrics an executive should look at. Everything else is noise.",
    roles: ["ceo", "sales_leader"],
    priorities: ["pipeline_growth", "margin_and_profitability"],
    industries: ["legal", "accounting", "consulting", "staffing", "general_professional_services"],
  },
  {
    dataSourceKeywords: ["hubspot", "marketo", "mailchimp"],
    metricKeywords: ["qualified_leads", "mqls", "leads", "new_leads", "inbound_leads"],
    visualizationType: "line_chart",
    size: "medium",
    dateRange: "last_30_days",
    why_it_matters: "Qualified lead volume is a 60-90 day leading indicator for revenue. Watch the trend.",
    roles: ["ceo", "sales_leader"],
    priorities: ["pipeline_growth"],
    industries: ["legal", "accounting", "consulting", "staffing", "general_professional_services"],
  },
];

// ─── Metrics explicitly excluded for executives ───────────────────────────────
// These are valid analytics metrics that analysts love but executives don't need.
export const ANALYST_NOISE_KEYWORDS = [
  "bounce_rate",
  "session_duration",
  "page_views",
  "impressions",
  "ctr",
  "click_through_rate",
  "organic_traffic",
  "keyword_ranking",
  "domain_authority",
  "social_followers",
  "likes",
  "shares",
  "open_rate",
  "unsubscribe_rate",
  "spam_rate",
  "avg_position",
  "crawl_errors",
];

// ─── Role display names ────────────────────────────────────────────────────────
export const ROLE_DISPLAY: Record<string, string> = {
  ceo: "CEO",
  coo: "COO",
  cfo: "CFO",
  sales_leader: "Sales Leader (VP/Director)",
  general: "Executive (General)",
};

// ─── Priority display names ────────────────────────────────────────────────────
export const PRIORITY_DISPLAY: Record<string, string> = {
  pipeline_growth: "Pipeline & Revenue Growth",
  margin_and_profitability: "Margin & Profitability",
  operational_efficiency: "Operational Efficiency",
  client_retention: "Client Retention",
  headcount_roi: "Headcount ROI",
  cash_flow: "Cash Flow & Financial Health",
};
