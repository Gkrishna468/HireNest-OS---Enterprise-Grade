# Repository Map (AI Memory)

## Current Services (`src/services`)
- AnalyticsService.ts
- EnterpriseViewModelService.ts
- VendorIntelligenceService.ts
- agentService.ts
- aiService.ts
- broadcastEngine.ts
- eventBus.ts
- intelligenceService.ts
- matchEngine.ts
- reasoningService.ts

## Current APIs (`src/api-lib` & `api`)
- agentArbitration.ts
- aiAgentRuntime.ts
- aiGovernance.ts
- consensus.ts
- distributedTracing.ts
- durableWorkflow.ts
- economicIsolation.ts
- federation.ts
- immuneSystem.ts
- infraSimulation.ts
- infrastructureSharding.ts
- memoryGraphs.ts
- policyGovernance.ts
- rateLimiter.ts
- recursivePlanning.ts
- repartitioning.ts
- selfHealing.ts
- semanticEngine.ts
- stateMachine.ts
- tenantBilling.ts
- tenantGovernance.ts
- index.ts (in `api`)

## Current Hooks
*(None found in standard `src/hooks` paths. Likely integrated within components or generic lib folders.)*

## Current Components (`src/components`)
- AIMatching.tsx
- ActivityFeed.tsx
- BulkUploadProcess.tsx
- CandidateSubmissionModal.tsx
- DealRoomCopilot.tsx
- EmptyState.tsx
- EnterpriseSearchModal.tsx
- EntityName.tsx
- ErrorBoundary.tsx
- ExecutionFeed.tsx
- ExperienceEngine.tsx
- ExplainableEvidenceCard.tsx
- GmailRecentMessages.tsx
- InterviewIntelligenceDashboard.tsx
- JDIntelligence.tsx
- LifecycleTimeline.tsx
- LiveToaster.tsx
- NotificationCenter.tsx
- OnboardingGuide.tsx
- ProgressTracker.tsx
- RequirementDiscussionThread.tsx
- StressTestRunner.tsx
- UniversalAIChatDrawer.tsx
- WelcomeDemo.tsx

## Current Firestore Collections
- candidates
- requirements
- submissions
- vendors
- clients
- users
- audit_logs
- system_events

## Current Event Bus (`src/events`)
- EventDispatcher.ts
- EventHandlerRegistry.ts
- IEventBus.ts
- LocalEventBus.ts
- index.ts

## Current AI Gateway (`src/ai`)
- aiService.ts (in `src/services`)
- aiAgentRuntime.ts (in `src/api-lib`)

## Current Workers (`src/workflows`)
- InterviewWorkflow.ts
- OfferWorkflow.ts
- SubmissionWorkflow.ts
- VendorWorkflow.ts
- WorkflowRegistry.ts
- index.ts

## Current Infrastructure
- firebase-blueprint.json
- firestore.rules
- storage.rules
- src/connectors
- src/integrations

## Current Repositories
*(Follows standard service-repository pattern. Embedded in `src/api-lib` handlers or `src/services` modules rather than an isolated directory.)*

## Current Pages (`src/views`)
- AIAgentsTab.tsx
- AICopilotTab.tsx
- AILearningLoopTab.tsx
- AIOpsCenterTab.tsx
- AdminGovernanceDashboard.tsx
- AdminOpsDashboard.tsx
- AdminOverview.tsx
- AdminSecurityDashboard.tsx
- AdminUsersManager.tsx
- AgentHQ.tsx
- AuthPage.tsx
- AutonomousOperationsTab.tsx
- BenchmarkDashboard.tsx
- CandidatesTab.tsx
- Client360Tab.tsx
- ContractsTab.tsx
- CustomerSuccessDashboard.tsx
- DashboardTab.tsx
- DealRoomsTab.tsx
- EnterpriseCommandCenterTab.tsx
- EvidenceDashboard.tsx
- ExecutionTracker.tsx
- FinanceOSTab.tsx
- FinancialsTab.tsx
- FounderControlTower.tsx
- HumanApprovalCenterTab.tsx
- InboxTab.tsx
- InterviewsTab.tsx
- InvoicesTab.tsx
- JobsTab.tsx
- KnowledgeIntelligenceTab.tsx
- LandingPage.tsx
- LegalPages.tsx
- MarketplaceTab.tsx
- MatchIntelligenceTab.tsx
- MemoryMapView.tsx
- NetworkDirectoryTab.tsx
- NetworkTab.tsx
- NotificationsTab.tsx
- Onboarding.tsx
- OperationalHealthTab.tsx
- OwnershipLedgerTab.tsx
- PlacementsTab.tsx
- PredictiveIntelligenceTab.tsx
- RagIntelligenceTab.tsx
- RecruiterPerformanceTab.tsx
- RevenueIntelligenceTab.tsx
- SLAIntelligenceTab.tsx
- SettingsTab.tsx
- SignalsTab.tsx
- SuccessIntelligenceTab.tsx
- TenantUsageDashboard.tsx
- TimesheetsTab.tsx
- TraceView.tsx
- TrustEngineTab.tsx
- ValidationCenterTab.tsx
- Vendor360Tab.tsx
- VendorIntelligenceTab.tsx
- WhatsAppHubTab.tsx
- WorkflowOperationsTab.tsx
- WorkflowStudioTab.tsx
