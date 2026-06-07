import axios, { type AxiosInstance, type AxiosError } from "axios";
import { DATABOX_API_BASE } from "../constants.js";
import type {
  DataboxAccount,
  DataboxDataSource,
  DataboxMetric,
  DataboxMetricData,
} from "../types.js";

// ─── Databox REST API Client ──────────────────────────────────────────────────

export class DataboxApiClient {
  private client: AxiosInstance;
  private mcpToken?: string;

  constructor(apiKey: string, mcpToken?: string) {
    this.mcpToken = mcpToken;
    this.client = axios.create({
      baseURL: DATABOX_API_BASE,
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 30000,
    });
  }

  // ── Accounts ──────────────────────────────────────────────────────────────

  async listAccounts(): Promise<DataboxAccount[]> {
    const response = await this.request<{ data: DataboxAccount[] }>(
      "GET",
      "/v1/accounts"
    );
    return response.data ?? [];
  }

  // ── Data Sources (native integrations: HubSpot, QuickBooks, etc.) ────────

  async listDataSources(accountId: number): Promise<DataboxDataSource[]> {
    const response = await this.request<{ data: DataboxDataSource[] }>(
      "GET",
      `/v1/accounts/${accountId}/data-sources`
    );
    return response.data ?? [];
  }

  // ── Metrics ────────────────────────────────────────────────────────────────
  // This calls through to their metrics endpoint which requires either
  // a native integration data source ID or uses the MCP-authenticated layer.

  async listMetricsForDataSource(
    dataSourceId: number,
    dataSourceName: string
  ): Promise<DataboxMetric[]> {
    try {
      // Databox exposes metrics through their integration metadata
      // The endpoint varies based on data source type.
      const response = await this.request<{ data: DataboxMetric[] }>(
        "GET",
        `/v1/data-sources/${dataSourceId}/metrics`
      );
      return (response.data ?? []).map((m) => ({
        ...m,
        dataSourceId,
        dataSourceName,
      }));
    } catch {
      // Some data sources don't expose metrics via REST API endpoint --
      // they're only accessible through the MCP layer.
      return [];
    }
  }

  // ── Metric Data (load actual values) ──────────────────────────────────────

  async loadMetricValue(
    dataSourceId: number,
    metricKey: string,
    metricName: string,
    dataSourceName: string,
    dateRange: string = "last_30_days"
  ): Promise<DataboxMetricData> {
    try {
      const response = await this.request<{
        value: number | string | null;
        trend?: string;
        change?: number;
        unit?: string;
      }>("GET", `/v1/data-sources/${dataSourceId}/metrics/${metricKey}`, {
        params: { date_range: dateRange },
      });

      return {
        metricKey,
        metricName,
        dataSourceName,
        value: response.value,
        unit: response.unit,
        dateRange,
        trend: response.trend,
        change: response.change,
      };
    } catch {
      return {
        metricKey,
        metricName,
        dataSourceName,
        value: null,
        dateRange,
      };
    }
  }

  // ── Validate API Key ───────────────────────────────────────────────────────

  async validateKey(): Promise<boolean> {
    try {
      await this.request("GET", "/v1/auth/validate-key");
      return true;
    } catch {
      return false;
    }
  }

  // ── Internal Request Handler ───────────────────────────────────────────────

  private async request<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    options?: { params?: Record<string, unknown>; data?: unknown }
  ): Promise<T> {
    try {
      const response = await this.client.request<T>({
        method,
        url: path,
        params: options?.params,
        data: options?.data,
      });
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string; error?: string }>;
      const status = axiosError.response?.status;
      const message =
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        axiosError.message;

      if (status === 401) {
        throw new Error(
          `Databox API authentication failed. Check your API key. Details: ${message}`
        );
      }
      if (status === 404) {
        throw new Error(
          `Resource not found at ${path}. The data source or metric may not exist: ${message}`
        );
      }
      if (status === 429) {
        throw new Error(
          `Databox API rate limit hit. Wait 60 seconds before retrying. Details: ${message}`
        );
      }
      throw new Error(`Databox API error (${status ?? "unknown"}): ${message}`);
    }
  }
}

// ─── Databox MCP Client (for AI-powered operations) ──────────────────────────
// Uses the MCP server at mcp.databox.com for natural language analysis
// and operations not exposed in the REST API.

export class DataboxMcpClient {
  private token: string;

  constructor(mcpToken: string) {
    this.token = mcpToken;
  }

  async callTool(
    toolName: string,
    parameters: Record<string, unknown>
  ): Promise<unknown> {
    const response = await axios.post(
      "https://mcp.databox.com/mcp",
      {
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name: toolName,
          arguments: parameters,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        timeout: 60000,
      }
    );

    const result = response.data?.result;
    if (!result) {
      throw new Error(`MCP tool '${toolName}' returned no result`);
    }
    return result;
  }

  async listDataSources(): Promise<DataboxDataSource[]> {
    const result = await this.callTool("list_data_sources", {});
    return (result as { sources?: DataboxDataSource[] }).sources ?? [];
  }

  async listMetrics(dataSourceId: string): Promise<DataboxMetric[]> {
    const result = await this.callTool("list_metrics", {
      data_source_id: dataSourceId,
    });
    return (result as { metrics?: DataboxMetric[] }).metrics ?? [];
  }

  async loadMetricData(
    metricKey: string,
    dataSourceId: string,
    dateRange: string
  ): Promise<DataboxMetricData | null> {
    const result = await this.callTool("load_metric_data", {
      metric_key: metricKey,
      data_source_id: dataSourceId,
      date_range: dateRange,
    });
    return result as DataboxMetricData | null;
  }

  async askGenie(
    question: string,
    datasetId?: string
  ): Promise<string> {
    const result = await this.callTool("ask_genie", {
      question,
      ...(datasetId ? { dataset_id: datasetId } : {}),
    });
    return (result as { answer?: string }).answer ?? String(result);
  }
}
