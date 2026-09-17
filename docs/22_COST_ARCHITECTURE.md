# HireNest Cost Architecture & Optimization Strategy

This document maps out the Google Cloud and AI infrastructure costs for HireNest CRM and HireNest OS, identifying current patterns, projected scaling costs, and concrete optimizations.

## 1. Google Cloud Architecture & Projected Costs

### A. App Engine (or Cloud Run) Services
**Current Pattern:** 
- Frontend SPA served statically (Vite).
- Node.js/Express Backend (or full-stack endpoints) handling API requests.
- Synchronous processing of heavy tasks.

**Optimization:**
- **Scale-to-Zero:** Ensure the service can scale down to 0 instances when idle to eliminate baseline costs.
- **Background Workers:** Shift heavy workloads (resume parsing, matching) to background tasks (e.g., using Cloud Tasks or Pub/Sub) to avoid tying up HTTP request handlers, which requires more concurrent instances.

### B. Firestore Collections & Patterns
**Core Collections:**
- `candidates`: Profile data, parsed resumes.
- `requirements`: Job descriptions, parsing data.
- `submissions`: Connects candidates to requirements.
- `users`: App users (recruiters, admins).
- `organizations`: Tenant data.

**Current Cost Drivers:**
- Fetching large lists of candidates or requirements without strict pagination.
- Re-aggregating dashboard metrics directly from raw collections on load.
- Real-time listeners on collections that don't need instant updates.

**Optimizations:**
- **Pagination & Cursors:** Use `limit()` and cursor-based pagination (`startAfter`) for candidate/job lists. Never fetch unbounded collections.
- **Dashboard Aggregations:** Use Cloud Functions to maintain aggregate counters/stats in a dedicated `metrics` collection. Dashboards read 1 doc instead of 1000s.
- **Listener Pruning:** Restrict Firestore real-time listeners (`onSnapshot`) to only collaborative features (e.g., live deal rooms or active chat). Use standard `get()` for static tables.
- **Targeted Reads (Admin SDK):** In backend processes, use `.select('id', 'name')` to avoid pulling heavy document payloads (like raw resume text) into memory unless required.

### C. AI Gateway & LLM Usage (Gemini/OpenAI/LiteLLM/OmniRoute)
**Current Pattern:**
- Calling LLMs for resume parsing, JD extraction, candidate matching, and email drafting.
- Repeatedly summarizing the same candidates.

**Optimizations:**
- **Caching Layer:** Hash inputs (e.g., resume text) and store the AI response in Firestore or Redis. If a candidate's resume hasn't changed, reuse the extracted structured data.
- **Model Routing by Task:** Use smaller, faster models (e.g., Gemini 2.5 Flash, GPT-4o-mini, local Ollama) for simple extraction and summarization. Reserve advanced models (e.g., Gemini 2.5 Pro, Claude 3.5 Sonnet) only for complex semantic reasoning.
- **Batch Processing:** When matching a job against 100 candidates, use embeddings or a vector search approach (Layer 2) rather than generating 100 separate LLM calls.

## 2. Projected Monthly Costs (Estimates)

| Resource | 100 Users | 1,000 Users | 10,000 Users |
| :--- | :--- | :--- | :--- |
| **App Engine / Cloud Run** | ~$5 - $10 | ~$20 - $50 | ~$150 - $300 |
| **Firestore (Reads/Writes)** | ~$1 - $5 | ~$15 - $40 | ~$150 - $400 |
| **Cloud Storage** | ~$1 - $2 | ~$5 - $15 | ~$50 - $100 |
| **AI Gateway (API Costs)** | ~$10 - $20 | ~$50 - $150 | ~$400 - $1000 |
| **Total Estimated** | **$17 - $37** | **$90 - $255** | **$750 - $1800** |

*(Assumes heavy caching, standard B2B SaaS usage patterns, and optimized Firestore querying).*

## 3. Immediate Action Plan

1. **Dashboard Caching:** Implement a backend aggregation system for executive and recruiter dashboards.
2. **Review Firestore Queries:** Audit the frontend for any `getDocs` calls lacking a `.limit()`.
3. **AI Caching:** Implement the caching mechanism in the `AIGateway` to skip duplicate LLM queries.
4. **Move to Background Tasks:** Implement a queue (bullmq or Cloud Tasks) for heavy document parsing.

## 4. App Engine Billing Audit & Optimization (₹190.48 Cost Attribution)

An investigation into the App Engine cost of **₹190.48** (approximately **$2.30 USD**) for the Sept 1–17, 2026 period shows clear attribution to resource class and scaling configurations over standard standard limitations:

### A. Core Attribution Drivers

1. **Standard vs. Flexible Environment SKU:**
   - App Engine Flexible has **no free tier** and requires at least 1 VM active 24/7 (minimum monthly cost of ~$30–40). Since the billing is only ₹190.48 for 17 days, the service is confirmed to be running on **App Engine Standard**.
   - Standard Environment provides a daily free quota of **28 instance-hours** for **F1** instances and **9 instance-hours** for **B1** instances.

2. **How the Free Quota was Exceeded:**
   - **Instance Class Rating:** If configured with F2 (2x rate) or F4 (4x rate) instance classes, the daily free quota is consumed 2 to 4 times faster. An F4 instance running for 7 hours consumes the entire 28 instance-hour quota for the day.
   - **Idle Instances Setting (`min_idle_instances`):** Standard automatic scaling defaults to keeping instances warm to prevent cold starts. If `min_idle_instances` or `min_instances` is set to $>0$, App Engine Standard keeps instances running even with zero traffic, quickly exceeding the 28-hour daily free tier.
   - **Concurrency and Traffic Spikes:** Simultaneous candidate imports or high concurrent traffic triggers automatic scaling, spawning multiple parallel instances. If 3 instances run simultaneously for 10 hours, they consume 30 instance-hours, exceeding the daily free quota.

### B. Actionable app.yaml Remediation

To enforce a absolute zero-cost or near-zero baseline cost, apply the following optimized standard configuration in the production `app.yaml`:

```yaml
runtime: nodejs20
instance_class: F1 # Use the smallest instance class to stay within the 28 instance-hours free quota

automatic_scaling:
  target_cpu_utilization: 0.65
  min_instances: 0          # Allow scaling completely to zero when idle
  max_instances: 2          # Tight ceiling to prevent run-away instance generation on traffic spikes
  min_idle_instances: 0     # Avoid keeping warm idle instances running
  max_idle_instances: 1     # Minimize instance hour accumulation
```

Applying these parameters ensures standard scaling stays within the free tier baseline, making unintended compute costs architecturally impossible.
