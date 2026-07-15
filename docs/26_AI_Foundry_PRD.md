# Product Requirements Document (PRD)
# Evolving HireNest OS into the "HireNest AI Foundry"

**Document Version:** v1.0-RC1  
**Target Phase:** Phase 4 — Product Engineering & Business Outcomes  
**Status:** Approved for Architecture Design  
**Author:** Product Architect & Lead AI Engineer  

---

## 1. Executive Summary & Vision

### 1.1 Context
HireNest is transitioning into a split-architecture ecosystem:
*   **HireNest CRM** remains the **Revenue Engine**, focused on customer-facing business operations (Leads, Accounts, Invoices, Forecasting, Vendor Management).
*   **HireNest OS** becomes the **Delivery Engine** powered by the **HireNest AI Foundry** — a robust, enterprise-grade, standalone "operating system for AI" specialized in recruitment.

### 1.2 Vision
The **HireNest AI Foundry** is not just an API proxy; it is the central nervous system of HireNest. It builds, runs, orchestrates, validates, and monitors multi-agent autonomous workflows. CRM requests intelligence, and the Foundry delivers it through event-driven system logs, micro-agents, and deterministic APIs.

```
                         HireNest Platform

               ┌─────────────────────────────────┐
               │          HireNest CRM           │
               │   Revenue & Business Operations │
               └────────────────┬────────────────┘
                                │
                         Event Bus / APIs
                                │
               ┌────────────────▼────────────────┐
               │       HireNest AI Foundry       │
               │   Runtime • Agents • Prompting  │
               │   Workflows • Memory • Gateway  │
               └────────────────┬────────────────┘
                                │
                 Gemini • Claude • GPT • Ollama
                                │
               Firestore • Gmail • Browser • n8n
```

---

## 2. Core Modules of the AI Foundry

The AI Foundry consists of 12 distinct, fully-integrated modules that manage the lifecycle and execution of artificial intelligence.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HIRENEST AI FOUNDRY                             │
├───────────────────┬───────────────────┬────────────────────────────────┤
│  Agent Factory    │  Prompt Studio    │  Workflow Designer             │
├───────────────────┼───────────────────┼────────────────────────────────┤
│  Memory Center    │  Tool Registry    │  Knowledge Hub                 │
├───────────────────┼───────────────────┼────────────────────────────────┤
│  Model Gateway    │  Approval Center  │  Observability & Cost          │
├───────────────────┴───────────────────┴────────────────────────────────┤
│                             RUNTIME ENGINE                             │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 The AI Runtime Engine
The core processing loop that executes server-side agent commands. Every interaction routes through this engine.
*   **Pipeline Stages:**
    1.  **Intent Engine:** Evaluates user inputs or event-bus triggers to determine target goals.
    2.  **Context Engine:** Gathers relevant database context (Candidate, Job Description, Historical Submissions) based on tenant and workspace policies.
    3.  **Prompt Builder:** Combines system guidelines with dynamic contextual injections.
    4.  **Memory Retrieval:** Fetches historical conversational and organizational preferences.
    5.  **Model Gateway Routing:** dispatches the fully formatted payload to the optimal model.
    6.  **Tool Execution / Loop:** Parses model function-calls, executes tools (under approval rules), and returns results.
    7.  **Output Validation:** Enforces structural formats, security schemas, and PII filters.

### 2.2 Agent Factory & Marketplace
The directory and builder for AI Agents. Enables the creation, state management, and orchestration of multi-agent entities.
*   **Capabilities:**
    *   **Agent Metadata Cataloging:** Every agent is treated as a config-driven entity with isolated keys.
    *   **Agent Lifecycle States:** Support for Draft, Testing, Active, Paused, and Deprecated.
    *   **KPI Diagnostics:** Tracks an agent's individual contribution (e.g., successful matches, email replies, response latencies).

### 2.3 Prompt Studio & Optimizer
Allows prompt engineers and system administrators to compose, optimize, version-control, and test AI instructions.
*   **Capabilities:**
    *   **Variable Injection:** Double-curly bracket templating (`{{candidateName}}`, `{{jobTitle}}`).
    *   **Versioning Tree:** Git-style diff views of prompt changes.
    *   **A/B Evaluation Testing:** Runs parallel models with different prompt structures to compare performance (e.g., Match Accuracy).

### 2.4 Workflow Designer
A no-code, visual, node-based workflow builder (similar to Node-RED or n8n) engineered to create sequences of agent actions.
*   **Node Types:**
    *   *Triggers:* Event-driven (e.g., `REQUIREMENT_CREATED`), Webhooks, Chronological schedules.
    *   *Conditions:* Conditional branching (e.g., `MatchScore > 85`).
    *   *Actions:* Agent dispatch, Tool execution, Human Approval request.

### 2.5 Multi-Tier Memory Center
Maintains the context window without bloating token expenses by using hierarchical memory.
*   **Memory Hierarchy:**
    *   `Global Memory`: Platform-wide rules, compliance regulations, and industry standard definitions.
    *   `Company Memory`: Tenant-specific guidelines, corporate identity, and specific benefits programs.
    *   `Client/Vendor Memory`: Historical preferences (e.g., "Client Reliance prefers Java developers with strong Spring Boot backgrounds").
    *   `Candidate/Agent Memory`: Resume summary, background logs, and direct workspace chat histories.

### 2.6 Unified Tool Registry
Decouples tools from hardcoded script implementations. Tools represent system capabilities that can be called by agents.
*   **Registered Interfaces:**
    *   *Communication:* Gmail API, WhatsApp Twilio API, Slack Webhooks.
    *   *OS Actions:* Firestore Query, PDF resume-extractor, Calendar scheduler.
    *   *Automation:* Playwright browser connector, MCP (Model Context Protocol) servers.
*   **Tool Properties:** Schema inputs/outputs, risk profiles, pricing guidelines, execution timeouts.

### 2.7 Human-in-the-Loop Approval Center
Provides governance and risk mitigation by intercepting high-risk tool calls.
*   **Risk Classifications:**

| Action Type | Examples | Risk Level | Policy Rule |
| :--- | :--- | :--- | :--- |
| **Read Only** | Summarize resume, draft internal proposal | *None* | Auto-execute |
| **Client-Facing Drafts** | WhatsApp candidate, email coordinates | *Optional* | Recruiter can review before dispatching |
| **Action Commands** | Submit candidate to client board, delete record | *Required* | Block execution; request recruiter manual approval |
| **Financial / Admin** | Invoice customer, allocate budget | *Admin / Finance*| Trigger system notification to admin; block until signed |

### 2.8 Multi-Model Gateway
The secure proxy and load balancer for downstream AI providers.
*   **Core Logic:**
    *   Primary Route: **Google Gemini SDK** (`gemini-2.5-flash` or `gemini-1.5-pro` based on task scale).
    *   Secondary Route (Failover): **Ollama / Qwen / Local LLM** to prevent operational downtime.
    *   Features: Token counting, latency tracing, caching layer, rate-limiting, and cost metrics dashboard.

### 2.9 Knowledge Hub & Vector RAG
The central repository for unstructured recruitment documentation (Company policies, client SLAs, candidate questionnaires).
*   **Features:**
    *   Document uploading and PDF parsing.
    *   Chunking strategy configuration (recursive text splitting).
    *   Vectorization pipeline using Google Embeddings.
    *   Semantic retrieval for Contextual RAG in the Runtime.

---

## 3. System Architecture & Data Models

### 3.1 Firestore Collection Blueprints (v1-RC1)

To avoid orchestrator drift and schema fragmentation, all AI Foundry collections are scoped with the `foundry_` prefix.

#### 1. `foundry_agents`
Defines individual agent profiles and configurations.
```json
{
  "id": "agent-recruiter-01",
  "name": "Sourcing Specialist Agent",
  "purpose": "Identify, rank, and draft proposals for candidates matching active requirements",
  "status": "ACTIVE",
  "modelConfig": {
    "provider": "google",
    "model": "gemini-2.5-flash",
    "temperature": 0.2
  },
  "promptId": "prompt-sourcing-v2",
  "tools": ["firestore_candidate_search", "email_candidate_draft"],
  "approvalPolicy": "OPTIONAL",
  "metrics": {
    "totalRuns": 1420,
    "successRate": 0.98,
    "totalCostUsd": 1.45
  }
}
```

#### 2. `foundry_prompts`
Prompt template database with version control.
```json
{
  "id": "prompt-sourcing-v2",
  "title": "Sourcing Evaluation Prompt",
  "template": "You are evaluated as a top recruiter. Assess Candidate: {{candidateData}} for Job: {{jobData}}. Output a JSON score and explanation.",
  "version": "2.1.0",
  "variables": ["candidateData", "jobData"],
  "createdAt": "2026-07-14T21:00:00Z"
}
```

#### 3. `foundry_workflows`
The state machines mapping complex sequences.
```json
{
  "id": "workflow-candidate-onboarding",
  "name": "Candidate Onboarding Flow",
  "trigger": {
    "type": "PLACEMENT_CLOSED",
    "source": "event_bridge"
  },
  "nodes": [
    {
      "step": 1,
      "type": "AGENT_CALL",
      "agentId": "agent-onboarding-doc-collector"
    },
    {
      "step": 2,
      "type": "APPROVAL_REQ",
      "approvalType": "JOINING_CONFIRMATION"
    }
  ],
  "status": "ACTIVE"
}
```

#### 4. `foundry_approvals`
Holds pending and historic actions requiring human confirmation.
```json
{
  "id": "appr-9842",
  "agentId": "agent-outreach-bot",
  "toolCalled": "send_whatsapp_message",
  "payload": {
    "to": "+919876543210",
    "body": "Hi Amit, your interview is confirmed for tomorrow 11 AM."
  },
  "status": "PENDING",
  "riskLevel": "REQUIRED",
  "requestedAt": "2026-07-14T21:05:00Z",
  "resolvedBy": null,
  "resolvedAt": null
}
```

---

## 4. API Contracts

### 4.1 Agent Execution Request (`POST /api/foundry/execute`)
Requests the Runtime Engine to run a specific agent task with local parameters.

**Request Payload:**
```json
{
  "agentId": "agent-recruiter-01",
  "context": {
    "requirementId": "req-902",
    "limitCandidates": 5
  },
  "bypassCache": false
}
```

**Response Payload:**
```json
{
  "success": true,
  "executionId": "exec-abc-123",
  "status": "COMPLETED",
  "output": {
    "rankings": [
      { "candidateId": "cand-91", "score": 95, "reason": "Sufficient skills in Spring Boot" }
    ]
  },
  "telemetry": {
    "latencyMs": 1420,
    "tokensUsed": 1840,
    "estimatedCostUsd": 0.002,
    "modelRouted": "gemini-2.5-flash"
  }
}
```

### 4.2 Approval Actions (`POST /api/foundry/approve`)
Resolves a pending workflow blocker.

**Request Payload:**
```json
{
  "approvalId": "appr-9842",
  "decision": "APPROVED",
  "recruiterId": "rec-user-05",
  "overridePayload": null
}
```

**Response Payload:**
```json
{
  "success": true,
  "status": "PROCEEDED",
  "dispatchedEvent": "OUTBOUND_WHATSAPP_DISPATCHED"
}
```

---

## 5. UI/UX Specifications (The AI Operations Center)

To visualize the AI Foundry, a centralized management console is implemented inside the HireNest OS interface.

```
┌────────────────────────────────────────────────────────────────────────┐
│  HIRENEST OS  •  AI FOUNDRY CENTER                                     │
├────────────────────────────────────────────────────────────────────────┤
│  [Agent Config]  [Prompt Studio]  [Memory Graph]  [Observability Log] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────┐  ┌────────────────────────────────┐  │
│  │ Active Agents Panel          │  │ Gateway Telemetry (Live)       │  │
│  │ ● Recruiter Specialist Agent │  │ Hits/Min: 142                  │  │
│  │ ● Verification Agent         │  │ Cache Rate: 42%                │  │
│  │ ○ Automated Outreach Agent   │  │ Model: gemini-2.5-flash        │  │
│  └──────────────────────────────┘  └────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Pending Approvals Queue (Interactive)                            │  │
│  │ 1. [Approve] [Reject] Outbound Pitch draft to Reliance Manager   │  │
│  │ 2. [Approve] [Reject] Submit Candidate Rajesh (94% Fit)          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Screens Outline
1.  **Dashboard Screen:** Live streaming graph showing prompt throughput, gateway fallback instances (Ollama activations), latency patterns, and estimated dollars saved.
2.  **Agent Builder:** Left-hand form specifying Name, instructions, chosen models, custom prompt template, and tool inclusions. Right-hand testing terminal playground.
3.  **Human Approval Ledger:** Displays active pending triggers. Simple card cards with green 'Approve/Execute' and red 'Decline/Edit' controls.
4.  **Trace View:** Detailed debug screen mapping individual execution threads showing context gathered, prompt constructed, raw API response, and tool validation.

---

## 6. Implementation Roadmap & Milestones

1.  **Phase 1 (Infrastructure Audit & Registry Setup):** Deploy the `foundry_*` Firestore structure and align the `firebase-admin` server interfaces.
2.  **Phase 2 (Gateway Optimization):** Implement the double fallback (Gemini ↔ Ollama) with localized pricing calculations.
3.  **Phase 3 (Agent & Prompt Designer):** Launch the React management panels and connect the live testing playground.
4.  **Phase 4 (Approval Loop deployment):** Bind execution triggers inside CRM workflow streams.

---
*End of PRD. Document approved for integration.*
