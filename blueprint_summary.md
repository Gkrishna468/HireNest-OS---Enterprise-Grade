# HireNest OS: Trust & Identity Governance Layer

## Vision
HireNest OS is a "Zero-Trust Staffing Identity Layer" designed to solve the biggest problem in staffing: **Trust**. It transforms from a generic AI recruitment platform into a **Verified Staffing Infrastructure**.

## 1. Multi-Tenant Architecture
- **Global HQ (Admin Node)**: Central governance authority. Manages organization approvals, trust score calibration, and identity audits.
- **Client Nodes**: Hiring organizations. Verified through corporate domains and business registration.
- **Vendor Nodes**: Staffing agencies. Verified via GST/Company docs and official domains.
- **Independent Recruiter Nodes**: headhunters verified via LinkedIn and work history.
- **Freelancer Nodes**: Individual contractors verified via Aadhaar (encrypted/masked) and mobile OTP.

## 2. Trust Engine (Production-Grade Verification)
| User Type | Verification Method | Trust Level |
| :--- | :--- | :--- |
| **Freelancer** | Aadhaar (Last 4 digits visible) + Selfie + Mobile OTP | Medium-High |
| **Recruiter** | Official Company Email + LinkedIn Profile Validation | High |
| **Vendor** | Domain Verification + GST/PAN Docs (Tier 2/3) | Highest |
| **Client** | Corporate Domain + Hiring Authority Validation | Highest |

## 3. Core Features
- **Identity Matrix (Admin)**: Full lifecycle management of network participants with trust scoring.
- **Requirement Marketplace**: Privacy-first job posting. Public requirements are "Vendor Safe" (no client ID leakage).
- **Match Distillery**: AI-native candidate scoring and de-duplication.
- **Deal Rooms**: Secure, permissioned collaboration spaces for hiring.

## 4. Production Readiness & Security
- **Data Isolation (PII)**: Sensitive data like Aadhaar numbers are never stored in raw text. Only masked references (XXXXXXXX1234) are used in UI/logs.
- **Relational Integrity**: Firestore Rules enforce that sub-resources (tasks, candidates) are only accessible if the user is a verified member of the parent organization.
- **Corporate Email Enforcement**: Onboarding restricts "Public Providers" (Gmail/Yahoo) for business nodes to prevent shadow identities.
- **Attribute-Based Access Control (ABAC)**: Permissions are derived from dynamic roles (Hiring Manager, Finance, Recruiter) rather than static lists.

## 5. Technology Stack
- **Frontend**: React (Vite) + Tailwind CSS + Framer Motion.
- **Backend**: Express (Vite Middleware) with Admin Node Proxying.
- **Infrastructure**: Firebase (Auth, Firestore, Cloud Run).
- **Trust Layer**: Integrated identity verification protocols.
