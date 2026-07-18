# Code Ownership Matrix

This document defines the module boundaries and code ownership across different domains in HireNest OS.

## Recruitment Office
**Owner**: Core OS Team  
**Files**: `src/views/CandidatesTab.tsx`, `src/views/JobsTab.tsx`, `src/views/InterviewsTab.tsx`  
**Services**: `agentService.ts`, `ExperienceEngine.tsx`  
**Collections**: `candidates`, `requirements`, `users`  
**Events**: `CandidateSubmitted`, `InterviewScheduled`  
**AI Capabilities**: Resume Parsing, Interview Generation  

---

## Vendor Office
**Owner**: Network Team  
**Files**: `src/views/Vendor360Tab.tsx`, `src/views/VendorIntelligenceTab.tsx`, `src/views/ContractsTab.tsx`  
**Services**: `VendorIntelligenceService.ts`, `VendorWorkflow.ts`  
**Collections**: `vendors`, `contracts`  
**Events**: `VendorOnboarded`, `SLA_Breach`  
**AI Capabilities**: Vendor Trust Scoring, SLA Prediction  

---

## Matching Office
**Owner**: Intelligence Team  
**Files**: `src/components/AIMatching.tsx`, `src/views/MatchIntelligenceTab.tsx`, `src/views/MarketplaceTab.tsx`  
**Services**: `matchEngine.ts`, `semanticEngine.ts`  
**Collections**: `submissions`  
**Events**: `MatchFound`, `SubmissionRejected`  
**AI Capabilities**: Semantic Matching, Cross-Vendor Bench Matching  

---

## AI COO
**Owner**: Intelligence Team / Executive Team  
**Files**: `src/views/EnterpriseCommandCenterTab.tsx`, `src/views/FounderControlTower.tsx`  
**Services**: `reasoningService.ts`, `intelligenceService.ts`  
**Collections**: `audit_logs`, `revenue`  
**Events**: `DailyBriefingGenerated`, `RevenueForecastUpdated`  
**AI Capabilities**: Executive Briefings, Predictive Analytics  

---

## Operations Center
**Owner**: Platform / DevOps Team  
**Files**: `src/views/AIOpsCenterTab.tsx`, `src/views/AdminOpsDashboard.tsx`, `src/views/WorkflowOperationsTab.tsx`  
**Services**: `eventBus.ts`, `broadcastEngine.ts`  
**Collections**: `system_events`  
**Events**: `SystemError`, `RateLimitExceeded`  
**AI Capabilities**: Self-Healing, Anomaly Detection  
