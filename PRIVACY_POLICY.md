# HireNestOS Enterprise Privacy Policy & Statutory Data Protection Notice

**Effective Date:** September 2026  
**Applicable Legal Frameworks:** Digital Personal Data Protection (DPDP) Act 2023, DPDP Rules 2025, Information Technology Act 2000, CERT-In Cyber Security Directions 2022, GDPR (EU 2016/679), and California Consumer Privacy Act (CCPA/CPRA).

---

## 1. Scope & Fiduciary Identity
**HireNestOS** ("we", "our", or "the Platform") operates as a Data Fiduciary and Data Processor providing an AI-native workforce and staffing operating system. This document sets forth our practices regarding the processing, security, retention, and transfer of digital personal data.

- **Entity:** HireNestOS Workforce Technologies Private Limited
- **Designated Grievance / Data Protection Officer:** Chief Privacy Officer
- **Grievance Email:** `privacy@hirenestworkforce.com` (or `dpo@hirenestos.com`)

---

## 2. Categories of Personal Data Processed
| Data Category | Specific Elements | Lawful Basis | Processing Purpose |
|---|---|---|---|
| **Identity & Account Credentials** | Full Name, Corporate Email, Mobile Number, Organization Identifier, Role. | Contract Execution / Consent (DPDP Sec. 4 & 6) | User authentication, RBAC authorization, and workspace provisioning. |
| **Candidate Resumes & Career Data** | CV/Resume text (PDF/DOCX), employment history, education, skills, compensation expectations. | Legitimate Uses (DPDP Sec. 7) / Candidate Consent | Skill extraction, semantic talent indexing, candidate-to-requirement matching. |
| **Enterprise Job Requirements** | Job descriptions, hiring manager notes, role compensation bands, target submission deadlines. | Contract Execution | Routing to accredited staffing vendors and candidate pool matching. |
| **System Telemetry & Audit Logs** | Masked IP addresses, request correlation IDs, user agent strings, authentication timestamps. | Legal Obligation (CERT-In Rules) & Legitimate Security Use | Preventing unauthorized access, DDoS mitigation, statutory incident auditing. |

---

## 3. Sub-Processors & Infrastructure Architecture
All customer and candidate data is processed within enterprise-grade infrastructure subject to strict Data Processing Agreements (DPAs):
1. **Google Cloud Platform (GCP - Cloud Run, Secret Manager):** Compute hosting, secrets isolation, and encrypted container execution.
2. **Google Firebase (Firestore, Firebase Auth, Cloud Storage):** Encrypted multi-tenant NoSQL database storage (AES-256), cryptographic JWT session management, and encrypted resume file vaults.
3. **Google GenAI / Gemini 2.5 (`@google/genai`):** Stateless server-side semantic inference for resume parsing and talent scoring. *Customer data is processed ephemerally in RAM and is NOT stored by the model provider or used to train public foundation models.*
4. **Sentry / Error Telemetry:** Application exception tracking with automatic redaction of credentials, authorization headers, and PII.

---

## 4. Statutory Data Retention & CERT-In Mandatory Directions
- **Candidate & Job Data:** Maintained for the duration of the recruitment lifecycle or until an authorized erasure request is received.
- **Account Profiles:** Retained for the active duration of the customer organization agreement.
- **Security Incident & Access Logs (180-Day Rule):** In strict accordance with **Rule 11 of the CERT-In Cyber Security Directions 2022**, all system logs, connection metadata, and masked access audit events are retained in an immutable rolling audit log for **180 consecutive days** before automated purging.

---

## 5. Data Principal Rights & Mechanisms
Pursuant to Sections 11, 12, and 13 of the DPDP Act 2023 and Articles 15–22 of the GDPR, Data Principals possess the following actionable rights:
- **Right to Access & Portability:** You may download a machine-readable JSON archive of your personal profile and linked metadata at `/data-request` or by contacting `privacy@hirenestworkforce.com`.
- **Right to Correction & Updating:** Accessible through account settings or via formal grievance submission.
- **Right to Erasure:** You may permanently erase your profile and credentials via `/delete-account` (subject to CERT-In statutory 180-day non-PII audit log retention).
- **Right of Grievance Redressal:** Any data protection grievance submitted to our Grievance Officer will be acknowledged within 24 hours and resolved within 7 business days. If unsatisfied, Data Principals have the right to escalate complaints to the **Data Protection Board of India**.

---

## 6. Cookies & Tracking
The Platform adheres to a **Zero Third-Party Advertising Trackers** standard:
- No advertising or behavioral retargeting cookies are deployed.
- Storage is restricted to essential session tokens (`firebase:authUser:*`) and functional UI preferences (`hirenest_theme`). Full details are available at `/cookies`.

---

## 7. Contact Information
**Grievance Officer:** Legal & Privacy Directorate  
**Email:** `privacy@hirenestworkforce.com`  
**Address:** HireNestOS Workforce Technologies, Cyber Gateway Tech Park, Sector 48, Gurugram, HR 122001, India.
