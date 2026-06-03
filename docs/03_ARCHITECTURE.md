# Technical Architecture Document

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React
- **Backend/Database**: Firebase (Firestore, Firebase Auth)
- **Cloud Functions / API**: Node.js backend logic for parsing and events (or equivalent client-side with secure rules).
- **AI/LLM**: Gemini API for document parsing and intelligent matching.

## Database Schema (Firestore)
- **`candidatePool`**: Global registry of candidates. Only stores absolute candidate metadata (Name, Contact, Resume, Global ID).
- **`submissions`**: Linkage between candidate, vendor, and requirement. Stores Pipeline Stage (`status`). This is the SOURCE OF TRUTH for a candidate's pipeline position.
- **`ownershipVault`**: Records of which vendor owns which candidate and expiration timestamps.
- **`eventLedger`**: Immutable append-only log.
- **`vendors` / `clients` / `users`**: Tenant and configuration information.
- **`jobs`**: The requirements/requisitions.

## Environment & Config
- Requires Firebase project configuration (`firebase-applet-config.json` / `.env`).
