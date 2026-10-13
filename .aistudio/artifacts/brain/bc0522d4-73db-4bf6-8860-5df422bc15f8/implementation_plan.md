# Implementation Plan: Match Intelligence — Ollama Integration

## 1. Objective
Enable Ollama-powered semantic reranking within the HireNestOS matching engine, improving fitment reasoning while maintaining deterministic hard gates, ABAC-compliant data isolation, and single-source-of-truth (SSOT) data integrity for candidates and requirements.

## 2. Architecture & Data Flow
- **Orchestration:** `MatchingOffice` (SSOT: `candidate_matches`)
- **Scoring Engine:** `ProprietaryMatchingEngine` (Deterministic + Semantic)
- **AI Gateway:** `AIGateway` (Ollama Provider, Circuit Breaker, Telemetry)

Data integrity for candidate/requirement names is the mandatory prerequisite (Phase 1).

## 3. Implementation Phases

### Phase 1: Data Integrity Verification (Pre-requisite)
- Audit name resolution in `MatchingOffice` and UI layers.
- Eliminate synthetic fallback strings ("Unknown Candidate").
- Verify vendor/tenant attribution logic to ensure ABAC compliance for Vendor/Client roles.

### Phase 2: AIGateway Activation
- Reconcile routing in `src/api-lib/services/AIGateway.ts` to allow `OllamaProvider` usage.
- Implement health checks and proper model routing (Qwen/BGE).
- Ensure the `callOllama()` method is safely re-enabled with strict security/cost controls.

### Phase 3: Semantic Engine Integration
- Refactor `ProprietaryMatchingEngine.calculateSemanticScore` to invoke `AIGateway` for structured semantic reasoning.
- Implement output validation (JSON schema enforcement) for model responses.
- Preserve deterministic hard gates: `ProprietaryMatchingEngine` *must* cap composite scores if mandatory skills are missing, regardless of AI output.

### Phase 4: Role-Based Matching (ABAC)
- Update matching service contracts to pass `orgId` / `tenantId` consistently.
- Ensure all matching operations route through `MatchingOffice` using role-scoped queries.

### Phase 5: Verification & Pilot
- Validate match totals and consistency in Admin desk.
- Conduct A/B performance comparison (Current vs. Ollama-assisted rankings).
- Security audit of role-based data isolation.

## 4. Rollback Strategy
- Disabling the Ollama provider in `AIGateway.ts` reverts to the current deterministic-only engine behavior.
- Data integrity fixes (name resolution) are maintained independently to prevent UI regression.
