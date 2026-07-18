# ADR-003: AI Gateway

- **Date**: 2026-07-18
- **Status**: Accepted
- **Context**: HireNest OS relies heavily on multiple LLMs (Gemini, OpenAI, Ollama) for parsing, matching, and reasoning. Calling these APIs directly from various parts of the codebase leads to duplicated logic, uncontrolled costs, and lack of observability.
- **Decision**: Centralize all AI interactions through a unified AI Gateway service. No direct LLM SDK calls are permitted outside this Gateway.
- **Alternatives considered**:
  - Direct integration in feature handlers (Rejected: Security risk, no central rate limiting, no unified caching).
  - Using a third-party AI Gateway SaaS (Rejected: Data privacy concerns with PII).
- **Consequences**:
  - Enforces a unified interface for PII redaction and toxicity guardrails.
  - Allows dynamic, strategy-based routing (Cost vs. Quality vs. Speed).
  - Enables centralized caching to drastically reduce AI costs.
