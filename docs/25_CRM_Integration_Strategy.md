# CRM to HireNestOS Integration Playbook

This document outlines the step-by-step procedure to link your Sales/CRM module with the HireNestOS Execution Engine while strictly adhering to the Bounded Context architecture.

## Phase 1: Establish Boundaries
Your CRM owns the top-of-funnel revenue process, and HireNestOS owns the delivery process.
*   **CRM Entities**: Accounts, Contacts, Leads, Opportunities.
*   **OS Entities**: Clients, Requirements, Vendor Networks, Submissions, Placements.
*   **Database Rule**: They reside in the same Firestore database but in isolated collections (`crm_accounts` vs. `clients`).

## Phase 2: Create the Cross-Domain Mapping Layer
You must never hardcode `crmOpportunityId` directly into your OS records.
1.  Use the `IntegrationMappingService` which acts as a translation table.
2.  All sync services must query this mapping table (e.g. `mapping_ACCOUNT_123_to_CLIENT`).
3.  This insulates your OS if you ever migrate from an internal CRM to Salesforce/HubSpot.

## Phase 3: Setup the Event Bridge
Do not allow CRM to directly create SQL/Firestore documents in the OS schema. Use `CRMEventBridge`.
1.  **Define triggers in your CRM:** When an Opportunity is marked "Closed Won", emit `OPPORTUNITY_WON` to the shared Event Bus.
2.  **Define handlers in the Integration Layer:** The bridge listens for this event and routes it to `ClientSyncService` and `LeadConversionService`.
3.  **Reverse flow:** Define triggers in the OS. When an Applicant is placed, emit `PLACEMENT_CLOSED`. The bridge routes this back to `PlacementSyncService` to update the CRM Opp to Fulfilled.

## Phase 4: Enforce Safe AI Guidelines
1.  **AI Sales Agents** must only operate within the `crm_` collections.
2.  **AI Recruiting Agents** must only operate within the Core OS collections.
3.  Cross-functional operations requested by users or agents MUST invoke corresponding Event Bus workflows, never cross-mutating data.

## Phase 5: Finance & Quote-to-Cash
Completing this bridge allows you to initiate the next phase (Finance OS):
`Lead (CRM) -> Opp (CRM) -> Client (OS) -> Requirement  (OS) -> Placement (OS) -> Invoice (Finance) -> Payout (Finance)`
