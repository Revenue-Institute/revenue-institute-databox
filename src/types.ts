// ─── Databox API Types ────────────────────────────────────────────────────────

export interface DataboxAccount {
  id: number;
  name: string;
  timezone?: string;
}

export interface DataboxDataSource {
  id: number;
  name: string;
  type: string;
  key?: string;
  connected?: boolean;
}

export interface DataboxMetric {
  key: string;
  name: string;
  description?: string;
  unit?: string;
  dimensions?: string[];
  dataSourceId?: number;
  dataSourceName?: string;
}

export interface DataboxMetricData {
  metricKey: string;
  metricName: string;
  dataSourceName: string;
  value: number | string | null;
  unit?: string;
  dateRange?: string;
  trend?: string;
  change?: number;
}

// ─── Executive Profile Types ──────────────────────────────────────────────────

export type ExecutiveRole = "ceo" | "coo" | "cfo" | "sales_leader" | "general";

export type BusinessPriority =
  | "pipeline_growth"
  | "margin_and_profitability"
  | "operational_efficiency"
  | "client_retention"
  | "headcount_roi"
  | "cash_flow";

export type IndustryVertical =
  | "legal"
  | "accounting"
  | "consulting"
  | "staffing"
  | "general_professional_services";

export type VisualizationType =
  | "kpi_card"
  | "line_chart"
  | "bar_chart"
  | "funnel"
  | "gauge"
  | "table"
  | "comparison";

// ─── Dashboard Blueprint Types ────────────────────────────────────────────────

export interface DashboardWidget {
  id: string;
  position: number;
  metricKey: string;
  metricName: string;
  dataSourceId: number;
  dataSourceName: string;
  visualizationType: VisualizationType;
  title: string;
  why_it_matters: string;
  alert_threshold?: string;
  dateRange: string;
  size: "small" | "medium" | "large";
}

export interface DashboardBlueprint {
  name: string;
  description: string;
  executive_role: ExecutiveRole;
  primary_priority: BusinessPriority;
  industry: IndustryVertical;
  created_at: string;
  widgets: DashboardWidget[];
  excluded_metrics: string[];
  setup_instructions: string;
  databox_wizard_hint: string;
}

// ─── Intelligence Brief Types ─────────────────────────────────────────────────

export interface MetricInsight {
  metric_name: string;
  data_source: string;
  current_value: string;
  trend: string;
  executive_interpretation: string;
  urgency: "critical" | "watch" | "healthy";
}

export interface ExecutiveIntelligenceBrief {
  [key: string]: unknown;
  generated_at: string;
  company_snapshot: string;
  top_insights: MetricInsight[];
  cross_metric_patterns: string[];
  recommended_actions: string[];
  dashboard_blueprint: DashboardBlueprint;
}

// ─── Executive Metric Intelligence Maps ───────────────────────────────────────

export interface MetricPriority {
  dataSourceKeywords: string[];
  metricKeywords: string[];
  visualizationType: VisualizationType;
  size: "small" | "medium" | "large";
  dateRange: string;
  why_it_matters: string;
  roles: ExecutiveRole[];
  priorities: BusinessPriority[];
  industries: IndustryVertical[];
  alertThreshold?: string;
}
