# Product Requirements Document (PRD) & Technical Blueprint
# HireNest Agent OS: The Enterprise Agent Operating System (v2.0)

**Document Version:** v2.0-RC1  
**Target Release:** Sprint 1–4 Execution Roadmap  
**Status:** Frozen for Architecture Implementation  
**Author:** Product Architect & Lead AI System Engineer  

---

## 1. Executive Vision & Philosophy

### 1.1 From AI-Enabled CRM to Agent Operating System
Standard SaaS recruitment apps embed basic "AI helpers" inside traditional data grids. **HireNest OS** reverses this paradigm: it establishes a high-performance **Agent Operating System (Agent OS)** as a foundational runtime layer, upon which business applications (like CRM) operate as clients. 

The relationship is governed by a strict event-driven contract:
1. **CRM** generates transactional business events (e.g., `REQUIREMENT_MATCH_REQUESTED`, `PLACEMENT_FINALIZED`).
2. **Event Bus** queues and routes the event.
3. **Agent OS** activates the corresponding autonomous workflow.
4. **Agents** evaluate context, plan actions, utilize tools, secure human consent, and write final telemetry back to CRM.

### 1.2 The Core Layer Abstraction (The Abstraction Ladder)
To eliminate hardcoded logic, the Agent OS models intelligence using a highly reusable, decoupled four-tier abstraction stack:

```
               ┌──────────────────────────────────────────────────┐
               │                    Workflows                     │
               │   Complex orchestration pathways & choreographies │
               └────────────────────────┬─────────────────────────┘
                                        │ (orchestrates)
               ┌────────────────────────▼─────────────────────────┐
               │                     Agents                       │
               │   Configurable personas with goals & lifecycles  │
               └────────────────────────┬─────────────────────────┘
                                        │ (assembles)
               ┌────────────────────────▼─────────────────────────┐
               │                     Skills                       │
               │  Reusable cognitive logic (e.g. Resume Parsing)  │
               └────────────────────────┬─────────────────────────┘
                                        │ (triggers)
               ┌────────────────────────▼─────────────────────────┐
               │                      Tools                       │
               │  System connectors & low-level APIs (e.g. Gmail) │
               └──────────────────────────────────────────────────┘
```

*   **Tools:** Standardized low-level connectors with rigid input/output JSON schemas and execution bounds (e.g., `Gmail_Send_Draft`, `Firestore_Query_Candidate`).
*   **Skills:** High-level cognitive competencies built by configuring prompt chains and tools (e.g., `Candidate_Ranking`, `Salary_Benchmarking`).
*   **Agents:** First-class organizational personas configured with custom memory limits, credentials, KPI quotas, and a dynamic list of allowed Skills.
*   **Workflows:** Sequence of agent choreographies triggered by time-schedules, manual recruiter requests, or event-bus messages.

---

## 2. Core Modules & Architectural Specifications

```
┌────────────────────────────────────────────────────────────────────────┐
│                        HIRENEST AGENT OS                               │
├───────────────────┬───────────────────┬────────────────────────────────┤
│  Command Center   │  Agent Registry   │  Skills Registry               │
├───────────────────┼───────────────────┼────────────────────────────────┤
│  Tool Engine      │  Planner Engine   │  Reflection Engine             │
├───────────────────┼───────────────────┼────────────────────────────────┤
│  Memory Hierarchy │  Policy Gatekeeper│  Cost & Telemetry Log          │
├───────────────────┴───────────────────┴────────────────────────────────┤
│                    AUTONOMOUS RUNTIME GATEWAY                          │
└────────────────────────────────────────────────────────────────────────┘
```

### 2.1 The Autonomous Agent Runtime Engine
The Runtime Engine processes agent requests through an advanced cognitive loop that prevents hallucinations and ensures predictable, auditable output.

```
Incoming Event / Task
  │
  ▼
[ 1. Planner ] ──(Generates execution plan DAG)
  │
  ▼
[ 2. Context Builder ] ──(Fetches scoped memory & RAG chunks)
  │
  ▼
[ 3. Model Router & Prompt Compiler ] ──(Optimizes token costs)
  │
  ▼
[ 4. Tool Execution Loop ] <──> [ 5. Human Policy Center ] (Intercepts high-risk calls)
  │
  ▼
[ 6. Reflection Engine ] ──(Self-evaluates criteria constraints)
  │
  ├─── (Fails Reflection: Re-loops back to Planner/Tool stage)
  │
  ▼ (Passes Reflection)
[ 7. Output Schema Validator ]
  │
  ▼
State Committed & Telemetry Sent to Cost Center
```

1.  **Planner:** Parses the high-level intent and generates an Execution DAG (Directed Acyclic Graph) detailing the individual steps needed to reach the goal.
2.  **Context Builder:** Dynamically queries databases, pulls vector chunks from the Knowledge Hub, and assembles the exact state context without exceeding token quotas.
3.  **Model Router:** Evaluates prompt size, latency budgets, and cost policies to select the optimal model (e.g., failing over from `gemini-2.5-pro` to `gemini-2.5-flash`).
4.  **Tool Selector & Loop:** Sequentially executes authorized skills, capturing outputs as intermediate parameters.
5.  **Output Validator:** Confirms response fits standard schemas (e.g., strict JSON) and scrubs sensitive PII content before persisting records.
6.  **Reflection Engine:** Reviews completed results against initial goals. If parameters are deficient (e.g., "extracted resume lacks core email field"), it commands a targeted execution retry up to a hard ceiling of 3 attempts.

### 2.2 First-Class Agent Operating System (Lifecycle Management)
Agents are fully-defined organizational entities managed through a formalized state-machine:

```
[ Draft ] ──> [ Testing ] ──> [ Review ] ──> [ Approved ] ──> [ Production ] ──> [ Monitoring ] ──> [ Archived ]
```

*   **Draft:** Configuration and initial prompt engineering phase.
*   **Testing:** Evaluated in the Sandbox Environment against historical test suites (Evaluation Lab).
*   **Review:** Awaiting administrator manual sign-off on cost and permission footprints.
*   **Approved:** Cleared for execution; queued in system scheduler.
*   **Production:** Active in workspace, processing real-world transactional events.
*   **Monitoring:** Live health checks track failure rate and latency. Anomalous behaviors drop the agent back to Review.
*   **Archived:** Decommissioned. Retains historic run logs and telemetry for compliance audits.

### 2.3 Event-Driven Multi-Agent Collaboration
Agents coordinate through event choreography instead of tightly coupled, hardcoded module calls. This ensures system components can fail independently without collapsing the entire operational pipeline.

*   **Example Choreography Pattern:**
    1.  *CRM Event:* `NEW_REQUIREMENT_RECEIVED`
    2.  *Requirement Agent:* Parses requirement details and extracts core tech stack requirements → Publishes `REQUIREMENT_PROFILED`.
    3.  *Sourcing Agent:* Listens for `REQUIREMENT_PROFILED`, queries database vectors → Publishes `CANDIDATE_POOL_RANKED`.
    4.  *Compliance Agent:* Evaluates candidate records for visa status or location match → Publishes `CANDIDATES_CLEARED_FOR_CONTACT`.
    5.  *Outreach Agent:* Drafts personalized outreach messages → Publishes `OUTREACH_DRAFTS_READY`.
    6.  *Approval Center:* Flags outreach messages for recruiter approval → Publishes `NOTIFY_RECRUITER_ACTION`.

### 2.4 Agent Scheduler (Background Operations)
The Background Scheduler triggers actions on specified cron channels, ensuring the system remains proactive without requiring human interaction:
*   **Morning Briefing Channel (`0 7 * * *`):** Summarizes open opportunities, candidate interview loops, outstanding invoices, and risk forecasts.
*   **SLA Watchdog Channel (`*/15 * * * *`):** Scans the Submission Ledger for outstanding client responses, sending alerts to owner-recruiters.
*   **Lead Quality Scanner Channel (`0 */2 * * *`):** Scans vendor bench submissions, scoring candidate data feeds for profile completeness.

### 2.5 Multi-Tier Memory Center
To balance contextual relevance and token economy, memory is partitioned across a granular hierarchy:

| Memory Tier | Scope | Typical Context Injected |
| :--- | :--- | :--- |
| **Platform Memory** | Cross-tenant global rules | System-wide compliance, safety guardrails, core formats |
| **Company Memory** | Single tenant / workspace | Corporate brand guidelines, standard benefits, org structures |
| **Department Memory** | Functional business unit | Team-specific goals, sourcing guidelines, billing rates |
| **Agent Memory** | Individual Agent instance | Historic task parameters, prompt templates, success ratios |
| **Conversation Memory**| Single session / thread | Active chat history, current conversation parameters |

### 2.6 Human-in-the-Loop Policy Gatekeeper
Decoupled rules determine if an Agent execution sequence must halt for recruiter confirmation. Policies are compiled dynamically:

```json
{
  "ruleId": "pol_external_communications",
  "name": "Outbound Email Guardrail",
  "trigger": "tool_execute:send_email",
  "conditions": {
    "recipient": "external",
    "riskLevel": "REQUIRED"
  },
  "authority": "Recruiter"
}
```

*   **No Hardcoding:** The engine evaluates active policies on every tool call. If matched, it sets task status to `PENDING_APPROVAL` and dispatches a notification to the Approval Center dashboard.

---

## 3. Database Schema Blueprints (Firestore v1-RC1 Additions)

To maintain database alignment and prevent schema drift, all database structures follow the `foundry_` naming system.

### 3.1 Collection: `foundry_agents`
```json
{
  "id": "agent_sourcing_pro",
  "name": "Senior Sourcing Agent",
  "department": "Delivery",
  "ownerId": "usr_bruce_wayne",
  "version": "1.4.0",
  "status": "Production",
  "priority": "High",
  "goal": "Retrieve, rank, and profile top candidates for incoming technical mandates",
  "instructions": "Always prioritize candidates with clear GitHub links and recent project activity.",
  "skills": ["skill_candidate_vector_search", "skill_resume_scorer"],
  "memoryConfig": {
    "tier": "Agent",
    "maxTokens": 2048
  },
  "runtimeConfig": {
    "modelRouter": "gemini-2.5-pro",
    "temperature": 0.2,
    "maxTokens": 4096
  },
  "kpis": [
    { "name": "Accuracy", "target": "92%", "current": "94.8%" },
    { "name": "Weekly Matches", "target": "200", "current": "184" }
  ],
  "healthMetrics": {
    "latencyMs": 942,
    "failuresToday": 0,
    "retriesToday": 1,
    "uptime": 99.98
  }
}
```

### 3.2 Collection: `foundry_skills`
```json
{
  "id": "skill_resume_scorer",
  "name": "Resume Score Evaluator",
  "description": "Compares candidate resume text to requirement JDs, returning a structured alignment score",
  "tools": ["tool_firestore_read", "tool_vector_match"],
  "promptTemplate": "Compare the following criteria: {{resumeText}} with requirement details: {{requirementText}}.",
  "inputsSchema": {
    "type": "object",
    "properties": {
      "resumeText": { "type": "string" },
      "requirementText": { "type": "string" }
    },
    "required": ["resumeText", "requirementText"]
  },
  "outputsSchema": {
    "type": "object",
    "properties": {
      "alignmentScore": { "type": "number", "minimum": 0, "maximum": 100 },
      "gapAnalysis": { "type": "array", "items": { "type": "string" } }
    }
  }
}
```

### 3.3 Collection: `foundry_tools`
```json
{
  "id": "tool_gmail_draft",
  "name": "Gmail Draft Creator",
  "description": "Inserts email drafts into the authorized workspace mailbox for preview",
  "inputSchema": {
    "type": "object",
    "properties": {
      "to": { "type": "string", "format": "email" },
      "subject": { "type": "string" },
      "body": { "type": "string" }
    },
    "required": ["to", "subject", "body"]
  },
  "costPerCall": 0.0001,
  "timeoutMs": 5000,
  "retryCount": 2
}
```

### 3.4 Collection: `foundry_cost_logs`
```json
{
  "id": "log_tx_901842",
  "agentId": "agent_sourcing_pro",
  "model": "gemini-2.5-pro",
  "executionId": "exec_8402_abc",
  "inputTokens": 14028,
  "outputTokens": 842,
  "costUsd": 0.0108,
  "timestamp": "2026-07-14T22:00:00Z"
}
```

---

## 4. Key API Contracts

### 4.1 Execute Agent Task (`POST /api/foundry/runtime/execute`)
Requests the Runtime Engine to launch a structured cognitive execution plan.

**Request Payload:**
```json
{
  "agentId": "agent_sourcing_pro",
  "inputParameters": {
    "requirementId": "req_java_developer_90"
  },
  "executionMode": "REALTIME"
}
```

**Response Payload:**
```json
{
  "success": true,
  "executionId": "exec_8402_abc",
  "status": "COMPLETED",
  "stepsCompleted": [
    { "step": 1, "action": "PLAN_GENERATION", "durationMs": 102 },
    { "step": 2, "action": "CONTEXT_FETCH", "durationMs": 420 },
    { "step": 3, "action": "SKILL_EXECUTION:skill_resume_scorer", "durationMs": 1205 }
  ],
  "output": {
    "matchesFound": 12,
    "topCandidateId": "cand_amit_sharma_99",
    "score": 98.4
  },
  "telemetry": {
    "totalDurationMs": 1727,
    "gatewayModel": "gemini-2.5-pro",
    "totalCostUsd": 0.0108
  }
}
```

---

## 5. UI/UX Specifications: AI Command Center

The AI Command Center serves as the "mission control" landing page of HireNest OS. It provides absolute visibility into the entire AI estate, satisfying enterprise auditing requirements.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  HIRENEST OS  •  AI COMMAND CENTER                                     [2026-07-14]    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐        │
│  │ Active Agents   │ │ System Latency  │ │ Pending Approve │ │ AI Cost (Today) │        │
│  │   47 Running    │ │     842 ms      │ │   12 Triggers   │ │     $23.81      │        │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  ┌──────────────────────────────────────────────┐ ┌──────────────────────────────────┐  │
│  │ Active Agent Employees Registry             │ │ Real-time Gateway Routing (Live) │  │
│  │ [Delivery] ● Sourcing Specialist   - High    │ │ [Gemini 2.5 Pro]  ■■■■■■■■■ 72%  │  │
│  │ [Delivery] ● Compliance Validator  - High    │ │ [Gemini 2.5 Flash] ■■■■■ 21%      │  │
│  │ [Sales]    ○ Lead Qualifier Agent  - Medium  │ │ [Ollama Failover]  ■ 7%          │  │
│  └──────────────────────────────────────────────┘ └──────────────────────────────────┘  │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Integrated Policy Approval Dashboard                                             │  │
│  │ [!] Email Outreach to Candidate Amit Sharma (Sourcing Agent)       [Approve] [Edit]│  │
│  │ [!] Invoice Dispatch to Reliance Finance Client (Billing Agent)     [Approve] [Lock]│  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 Command Center Management View Options
*   **Estate Telemetry Row:** High-contrast counters presenting active agent instances, historical success ratios, average execution latency, open approval triggers, and real-time aggregate cost.
*   **The Abstraction Graph UI:** Node mapping view rendering the connections between Agents, configured Skills, and underlying low-level Tools.
*   **Interactive Simulation playground:** Admin console to preview agent logic against a batch of 50 test parameters (The Evaluation Lab) to confirm prompt stability before committing to Production status.

---

## 6. Sprints Execution & Deployment Milestones

To maintain stable development, implementation is segmented into progressive milestones:

### 6.1 Sprint 1: Foundation (Weeks 1–2)
*   **Goal:** Establish Tool & Skills Registries, configure the foundational Firestore structures.
*   **Deliverables:** Launch the basic runtime API endpoints (`POST /api/foundry/runtime/execute`), build the core Model Router proxy, and integrate the system linter.

### 6.2 Sprint 2: Lifecycle & Brain (Weeks 3–4)
*   **Goal:** Deploy the full Agent Operating System lifecycle pipeline, design the custom Planner and Reflection engines.
*   **Deliverables:** Enable transitions through status states (Draft ↔ Testing ↔ Review ↔ Approved ↔ Production), map out memory configurations.

### 6.3 Sprint 3: Governance & Security (Weeks 5–6)
*   **Goal:** Build the Policy Gatekeeper and human-approval intervention framework.
*   **Deliverables:** Integrate authorization controls on external tool requests, deploy the interactive Approvals Ledger interface.

### 6.4 Sprint 4: Command Center & Optimization (Weeks 7–8)
*   **Goal:** Launch the central visual management dashboard.
*   **Deliverables:** Render real-time telemetry gauges, compile vector indices, run final build verification audits.

---
*End of Technical PRD. File initialized for next phase implementation.*
