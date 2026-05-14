# HireNestOS — Technical Architecture & Product Documentation

## 1. Executive Summary
HireNestOS is a centralized **Margin Governance Staffing Operating System** designed for IT Staffing, Contract, and Permanent Hiring. Its core differentiator is the separation of commercial intelligence (Client-side) from delivery execution (Vendor-side), governed by an AI-driven Admin HQ.

## 2. Platform Roles
- **Admin HQ (Global Governance)**: Full visibility into client budgets, platform margins, vendor payouts, and cross-tenant performance.
- **Client OS (Requirement Intake)**: Enterprise-grade job posting, JD extraction, and submission review.
- **Vendor Network (Delivery Layer)**: Restricted view focusing on approved payouts, SLA compliance, and candidate submissions.

## 3. Core Functionalities

### A. AI-Powered Requirement Intake (Jobs Center)
- **Direct JD Parsing**: Uses Gemini 2.0 Flash to extract titles, skills, and experience from raw text.
- **Local Heuristic Fallback**: Compromise-free parsing using NLP (Compromise.js) if AI thresholds are met.
- **Status Workflow**: Tracks jobs from `DRAFT` -> `PENDING_FINANCIAL_APPROVAL` -> `PUBLISHED`.

### B. Margin Governance Engine
- **Financial Sanitization**: A dedicated layer ensures vendors NEVER see client billing or platform profit.
- **Dynamic Logic**:
  - **Fixed Margin**: Flat fee per hour/placement.
  - **Percentage Margin**: Commission-based scaling.
  - **Tiered Logic**: Vendor-score based incentives (higher score = lower margin).
- **Audit Trails**: Every margin change is logged in a `requirements_private` collection for financial auditing.

### C. Recruiter Match OS V2 (AI Matching)
- **Hybrid Intelligence**: Combines keyword matching with semantic AI analysis.
- **Multi-Tone Outreach**: Automated generation of outreach drafts for Founder, Professional, Executive, and Warm tones.
- **Candidate Scorecards**: Detailed strengths vs. gaps decomposition for every submission.

### D. Platform Analytics
- **Commercial Health**: Real-time tracking of Total Billing, Avg Margin %, and Leakage Risk.
- **Marketplace Velocity**: Visualization of requirement flow across the vendor network.

## 4. System Architecture (Full-Stack)

### Frontend (User Interface)
- **Framework**: React 18+ with Vite.
- **Styling**: Utility-first Tailwind CSS.
- **State Management**: Real-time Firebase Firestore listeners (`onSnapshot`).
- **Icons**: Lucide-React.

### Backend (Governance Hub)
- **Server**: Node.js/Express.
- **Sanitization Layer**: Server-side middleware that strips sensitive billing data before sending requirements to vendors.
- **AI Integration**: `@google/genai` (Gemini API) for high-density intelligence tasks.

### Database & Security
- **Store**: Firebase Firestore (NoSQL).
- **Auth**: Firebase Authentication (Google OAuth).
- **Security Rules**: Attribute-Based Access Control (ABAC). Verified users only.

## 5. Built to Date (Timeline)
1. **Phase 1: Foundation**: Multi-tenant Auth and basic CRUD for jobs.
2. **Phase 2: AI Intelligence**: Integration of Gemini for JD parsing and Candidate matching.
3. **Phase 3: Financial Layer**: Implementation of the Margin Governance Console.
4. **Phase 4: Sanitization**: Deployment of the Vendor Sanitization Layer in `server.ts`.
5. **Phase 5: Performance**: Governance Dashboards for Admin HQ monitoring.

---
*Created by HireNest Chief Staffing Office (AI Agent Suite)*
