# Revenue Institute — Databox Executive Dashboard Architect

## Slash Command: /revenue-db

When the user runs `/revenue-db`, execute the following:

### Step 1: Gather context silently

Before asking anything, check what you already know from this session and memory:
- **Company name**: Do you know who the user works for or which client they're asking about?
- **Executive role**: Do you know their role (CEO, COO, CFO, sales leader)?
- **Business priority**: Do you know their current focus (pipeline growth, margin, retention, efficiency, cash flow, headcount)?
- **Industry**: Do you know their industry (legal, accounting, consulting, staffing)?

### Step 2: Only ask what you don't know

If you already know all four — proceed immediately, no questions.

If you're missing one or two — ask in a single message, combining everything missing into one short prompt. Example:
> "Got it — what's the company name and your 90-day priority?"

If you're missing everything — ask in one message:
> "Quick setup: company name, your role (CEO/COO/CFO/sales leader), and your 90-day priority?"

Never ask more than one question at a time. Never ask for information you already have.

### Step 3: Call build_executive_dashboard

Once you have all four inputs, call the `build_executive_dashboard` tool from the `revenue-institute-databox` MCP server with:
- company_name
- executive_role
- business_priority  
- industry (default to general_professional_services if unknown)

### Step 4: Execute the returned prompt

The tool returns a structured execution plan. Run it immediately against the connected Databox MCP tools:
- `list_accounts`
- `list_data_sources`
- `list_metrics`
- `load_metric_data`
- `ask_genie`

### Step 5: Deliver the Executive Intelligence Brief

Output the full brief as returned by the execution plan. No truncation. No summarizing. The full brief.

---

## Important

- Never fabricate metric values. If Databox MCP is not connected, say so clearly and tell the user to run `claude mcp add databox --url https://mcp.databox.com/mcp`
- Never ask for an API key. Auth comes from the connected Databox MCP.
- The slash command should feel instant — context inference first, questions only as a last resort.
