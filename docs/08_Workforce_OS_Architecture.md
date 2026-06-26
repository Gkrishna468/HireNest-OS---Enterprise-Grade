# 08 - Workforce OS Runtime Architecture

## Vision

HireNestOS is a **Multi-tenant AI Staffing Network**. You are not building one company's AI assistant. You are building a network where every organization (Client, Vendor, HQ) has its own AI workforce, and those workforces collaborate securely through HireNestOS.

```text
                    HireNestOS Enterprise Runtime
                              │
                Enterprise Business Graph
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
 Client Workspace       Vendor Workspace      HireNest HQ
(Client AI Workforce)   (Vendor AI Workforce) (Network AI)
```

Each workspace has its own Offices, Memory, Inbox, KPIs, Business Graph access, and AI Managers, collaborating through controlled events.

## Multi-Tenant AI Workforces

### 1. Client Workspace
Answers: *"How do I fill my open positions faster?"*
- **Offices**: Client Office, Hiring Manager Office, Recruitment Office, Interview Office, Finance Office.
- **Actions**: Automatically prioritizes hiring, finds bottlenecks, ranks vendors, schedules interviews, predicts hiring delays.

### 2. Vendor Workspace
Answers: *"How do I place more consultants?"*
- **Offices**: Vendor Office, Bench Office, Resume Improvement Office, Submission Office, Interview Office, Revenue Office.
- **Actions**: Improves resumes, detects missing skills, finds better requirement matches, coaches vendors, reminds consultants, predicts interview success.

### 3. HireNest HQ Workspace (Network AI)
Answers: *"How do we optimize the staffing ecosystem?"*
- **Offices**: Founder Office, Platform Office, Network Intelligence Office.
- **Actions**: Detects which client needs more vendors, which vendor performs best, redistributes candidates, identifies revenue risks network-wide.

## The Business Graph (Federated)

Every workspace contributes to one federated graph while preserving isolation. The graph shares only the information each party is authorized to access. Client-private notes, vendor-private coaching, and internal AI memories remain isolated.

## Continuous Matching & Improvement Loops

HireNestOS is a **living matching engine**, not an event-only engine.

### Continuous Matching Loop (Runs Every 15 Minutes)
Open Requirements -> Active Candidates -> New Candidates -> Existing Vendors -> Updated Resumes -> Interview Feedback -> Market Trends -> Recalculate Match Scores -> Generate Opportunities -> Notify Relevant Offices.

### Candidate Improvement Loop
Candidate Rejected -> Capture Feedback -> Update Candidate Memory -> Resume Improvement Agent -> Skill Gap Analysis -> Learning Recommendations -> Vendor Notification -> Re-match Against Open Requirements -> Queue Better Opportunities.

### Requirement Improvement Loop
Requirement -> Low Match Rate -> Analyze JD -> Suggest Better Skills / Budget / Experience -> Recommend Additional Vendors -> Broadcast Again.

### Growth Loops
- **Vendor Growth**: Bench Aging -> Improve Resume -> New Requirement -> Higher Match Score -> Submission -> Interview -> Placement -> Revenue.
- **Client Growth**: Requirements Open -> Hiring Delays -> Vendor Ranking -> Interview Bottlenecks -> Suggested Improvements -> Hiring Velocity Increased.

## Guiding Principle

> **Every Office must continuously improve its own workspace while also creating measurable value for the connected network.**

## Final Enterprise Runtime (Per Workspace)

```text
Founder/Executive Vision
        │
Business Goals
        │
Business Decision Engine
        │
Enterprise Scheduler
        │
AI COO
        │
──────────────────────────────
│
├── Workspace-specific Offices (Recruitment, Sales, etc.)
│
──────────────────────────────
        │
Shared Skills
        │
Business Graph (Isolated View)
        │
Enterprise Memory
        │
Telemetry
        │
Continuous Improvement Engine
```

## Final Target State (The Autonomous Business)

HireNestOS transitions from an application you operate to a digital executive team that operates the business.

From 9:00 AM to 6:00 PM, the system autonomously operates the staffing business. The Founder logs in to an **Executive Dashboard** showing yesterday's metrics, today's predictions, and a few high-level recommended decisions (e.g., Approve Vendor, Escalate Client). No manual orchestration required.

## 1. BusinessGraphService (Enterprise SSOT)
The only place that understands relationships. No Office manually joins collections. The graph is "alive" (e.g., Low probability match -> Budget issue -> Recommend budget increase -> Notify Client Office -> Requirement updated -> New matches generated).

## 2. OfficeRuntimeService
Every Office is a **goal-driven digital workforce runtime**.
- **Morning Briefing**: Wakes up with daily objectives (e.g., Recruitment Office goals: 12 submissions, 4 interviews, 1 offer, 95% SLA).
- **Inbox**: No longer a dashboard, but a real workload with priorities, deadlines, assigned AI, and owner.
- **State Machine**: Idle -> Receiving Work -> Prioritizing -> Executing -> Waiting -> Blocked -> Escalated -> Completed -> Learning.
- **AI Performance Score**: Continuously tracks Work Received -> Completed -> Average Time -> Success % -> Revenue Generated -> Cost -> Quality -> Learning.

## 3. EnterpriseScheduler
"What business outcome do I need to achieve today?"
Morning routine translates revenue goals into generated work for all Offices. Considers business hours, SLAs, revenue impact, priority, queue health, dependencies, and approvals.

## 4. AI COO
Never executes business work directly. Coordinates Offices, detects blocked workflows, balances workloads, escalates issues, reprioritizes queues.

## 5. Network Opportunity Engine (Marketplace Intelligence)
Proactively searches for revenue opportunities across the entire ecosystem every 15 minutes. It does not react to events.
Asks: "Which placements can be created right now?"
- Which open requirements are at risk?
- Which candidate can now qualify because of new skills?
- Which rejected candidate fits another open role?
- Which vendors are idle while clients have open roles?

## 6. Continuous Improvement Engine
Nightly learning layer. Analyzes which vendors improved, which candidates improved, which recruiters improved, which prompts performed better, which matching rules failed, which clients are slowing hiring, and which Office missed SLAs. Updates Office knowledge for the next day.

## Completion Scenarios (HN-011)
- **Scenario 1:** Requirement email -> MailOS classifies -> Requirement created -> Recruitment starts matching -> Vendor broadcasts -> Client updated.
- **Scenario 2:** Candidate rejected -> Feedback captured -> Resume improvement generated -> Vendor notified -> Candidate re-matched.
- **Scenario 3:** Interview scheduled -> Calendar updated -> Reminders sent -> Feedback collected -> Offer pipeline updated.
- **Scenario 4:** Placement confirmed -> Invoice generated -> Finance updated -> Customer Success begins consultant follow-up.
- **Scenario 5:** 6:00 PM -> Founder receives EOD report (Revenue, New reqs, SLA breaches, Recommendations for tomorrow).

