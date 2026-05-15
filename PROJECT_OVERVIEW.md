# HireNest OS Intelligence Layer - Project Overview

## 1. Project Vision
**HireNest OS** is a high-fidelity, production-grade Staffing and Recruitment Operating System designed for "Global HQ Authority." It moves beyond standard CRM tropes into a "Unified Intelligence Layer" where identity management, strategic matching, and financial governance converge.

## 2. Technical Stack
- **Frontend**: React 18 with Vite + Tailwind CSS.
- **Backend**: Node.js Express server acting as an "Intelligence Proxy."
- **Database/Auth**: Firebase Firestore + Firebase Authentication.
- **AI Engine**: Google Gemini (via `@google/genai` SDK) for deep analysis.
- **Security**: Hardened Firestore Rules with Relational Validation (RBAC).

## 3. Core Modules Developed

### 🎛️ Dashboard (The Command Center)
- **Real-time Metrics**: Visualizing Revenue, Placements, and Vendor Quality.
- **Strategic AI Analysis**: A "Chief Strategy Officer" sidebar that uses Gemini to analyze current market demand based on active jobs and candidate pool data.
- **Bento-Grid UI**: High-density layout for instant operational visibility.

### 📋 Requirements Management (Jobs)
- **Full Lifecycle**: DRAFT → PENDING_APPROVAL → PUBLISHED → CLOSED.
- **Financial Governance**: Built-in margin calculators (Fixed vs. Percentage) and profit tracking.
- **AI JD Parsing**: Upload a raw JD or paste text to have AI extract mandatory skills, experience levels, and responsibilities.

### 👥 Candidate Pool & Smart Matching
- **Global Matching Engine**: AI-powered matching that scores candidates against specific jobs with a detailed "Score Breakdown" (Skills, Experience, Location).
- **Bulk Parsing**: Support for PDF/DOCX resume extraction via a multi-engine pipeline (`pdf-parse`, `pdfjs`, `mammoth`).
- **Outreach Intelligence**: AI-generated starter templates for Founders, Recruiters, and Professional outreach.

### 🏛️ Identity Matrix (System Settings)
- **Node Inventory**: Global view of all "Nodes" (Users/Orgs) on the platform.
- **Identity Lifecycle**: The ability for Admin to Terminate nodes, Refresh credentials, and Configure compliance (MSA/NDA tracking).
- **Relational Integrity**: Users are strictly bound to Organizations (Client, Vendor, or Admin HQ).

### 🤝 Deal Rooms
- **Real-time Interaction**: Secure spaces for vendors and clients to discuss specific submissions.
- **Pipeline Evolution**: Tracking candidates from "New" to "Hired."

## 4. Visual Philosophy ("Vibe Check")
We have moved away from "Generic SaaS Blue" into a **Technical Brutalist** aesthetic:
- **Font**: Inter (UI) and JetBrains Mono (Technical Data).
- **Palette**: `slate-900` backgrounds, `indigo-500` accents, and "Glow States" for active nodes.
- **Experience**: Heavy use of subtle animations (`motion/react`) for staggered entrances and state transitions.

## 5. Security & Production Readiness
- **Admin Proxy Layer**: High-security operations (like terminating users) are handled via a server-side Admin SDK proxy to keep client credentials safe.
- **Error Transparency**: Implementation of `handleFirestoreError` with JSON payloads for instant debugging of permission issues.

---
*Status: V2.4.12-BETA - All Hubs Operational*
