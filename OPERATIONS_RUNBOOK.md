---
title: Operations Runbook
version: 1.0.0
last_updated: 2026-06-29
status: active
---

# Operations Runbook

This runbook outlines operational procedures for managing the HireNestOS AI Workforce Runtime.

## 1. Bootstrapping
When spinning up a new environment or recovering from catastrophic failure:
1. Start the `BootstrapOrchestrator`.
2. Schedule jobs in order:
   - `Graph Repair`
   - `Requirement Reconciliation`
   - `Candidate Reconciliation`
   - `Event Replay`
3. Verify status in the System Context Dashboard.

## 2. Event Replay
Used to recover corrupted read models or re-evaluate past events under new business rules.
- **By Workflow**: `EventReplay.replayWorkflow(workflowId)`
- **By Tenant**: `EventReplay.replayTenant(tenantId, startTime, endTime)`
- **By Correlation ID**: `EventReplay.replayCorrelationId(correlationId)`

*Warning*: Ensure target systems (e.g., MailOS) are in idempotent modes during replay to avoid sending duplicate external emails.

## 3. Production Certification
Before promoting major runtime changes to production:
1. Run automated Event Tests.
2. Verify Queue Integrity (`dlq == 0`).
3. Run Budget Exhaustion test (simulate `$0` budget and verify deterministic fallback).
4. Simulate AI outage and verify `CapabilityBroker` falls back safely.
5. Check Graph Projection Lag is `0`.

## 4. Incident Response
**Symptom**: AI Offices are failing or producing poor decisions.
**Action**: 
1. Check `CapabilityBroker` metrics for confidence drops.
2. If Gemini is down, the Circuit Breaker will open automatically.
3. If bad decisions persist, engage `CircuitBreaker.open('DecisionEngine')` manually to route all operations to `MANUAL_TRIAGE`.
4. Inspect `decision_history` to identify the failing rules.

**Symptom**: Business Graph is out of sync.
**Action**: 
1. Check `graph_projection_queue` size.
2. If jammed, restart `GraphProjectionWorker`.
3. If data is corrupted, replay events using `EventReplay` for the affected Tenant.
