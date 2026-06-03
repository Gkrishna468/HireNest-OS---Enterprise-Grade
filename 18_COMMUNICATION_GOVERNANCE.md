# Communication & Token Governance

This document defines the architectural boundaries for external communications (Email, Calendar) and the security requirements for connecting third-party providers (Google Workspace / Outlook).

## The Principle of Scoped Communication

A common mistake in SaaS architectures is enforcing **Multi-Tenant Data** while relying on **Centralized Communication**. This leads to operational chaos, organizational confusion, and scalability bottlenecks.

In HireNestOS, the **Communication Layer must follow the same tenant boundaries as the Data Layer**.

### 1. Email Scope Rules

*   **Admin HQ (`support@` / `gopal@hirenestworkforce.com`)**
    *   System Alerts
    *   Password Resets & Welcome Emails
    *   Platform Notifications
    *   Ownership Disputes & Escalations
    *   Delete/Release Notifications
*   **Vendor (Vendor Universe)**
    *   Must use their **Own Connected Inbox** (via OAuth) to communicate submissions.
*   **Recruiter (Org Universe)**
    *   Must use their **Own Connected Inbox** (via OAuth) to communicate with clients and vendors.
*   **Client (Client Universe)**
    *   Must use their **Own Connected Inbox** (via OAuth) when communicating requirements and feedback.

### 2. Calendar Scope Rules

*   **Admin HQ**
    *   Operational Calendar (Platform health, strategy, support syncs).
*   **Recruiter**
    *   Interview Calendar (Schedules managed via connected Google Calendar / Outlook).
*   **Client**
    *   Hiring Calendar (Interview invites placed on their connected calendar).

---

## Production Security: Token Vault Architecture

The current implementation utilizes client-side `localStorage` for OAuth access tokens. **This is strictly a Beta-phase acceptable implementation.**

### Production Blocking Requirement 🚫

Before general availability (Production), the OAuth token persistence model **MUST** be refactored to a **Backend Token Vault Architecture**.

#### Why?
*   **XSS Risk:** Storing tokens in `localStorage` exposes them to Cross-Site Scripting.
*   **Scope Risk:** Gmail and Calendar scopes are highly sensitive.
*   **Persistence:** Access tokens expire. Without backend refresh token rotation, the user is forced to continually re-authenticate.

#### Target Architecture

1.  **User Initiates Handshake:** Clicks "Connect Google".
2.  **OAuth Consent:** User grants requested scopes.
3.  **Code Exchange (Backend):** The frontend passes the short-lived authorization code to the backend.
4.  **Token Vault:** The backend exchanges the code for an Access Token AND a Refresh Token.
5.  **Encrypted Storage:** Tokens are encrypted at rest mapped to the `user.uid` in Firestore/Secret Manager.
6.  **HTTP-Only Session:** The browser receives an encrypted, standard HTTP-only session cookie (no direct access to access tokens).
7.  **Proxy Requests:** The frontend proxies email/calendar requests through the backend `/api/gmail` or `/api/calendar`. The backend decrypts the token, injects the Bearer header, and executes the external call. If the token is expired, the backend silently rotates it using the refresh token.

### Next Major Milestone

Our immediate development objective is **HN-011: Interview Lifecycle**. By bridging Submissions, Work Email, and Calendars, this milestone will create the orchestration layer necessary to convert Candidates into Placements entirely within the governed ecosystem.
