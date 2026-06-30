---
title: Event Catalog
version: 1.0.0
last_updated: 2026-06-29
status: active
---

# Event Catalog

This document defines the core business events flowing through the `EventBus` and orchestrating the AI Workforce.

## Requirements Domain
| Event Type | Publisher | Payload Shape | Subscribers (Offices) |
|------------|-----------|---------------|-----------------------|
| `REQUIREMENT_CREATED` | API / UI | `{ id, title, clientId, status, ... }` | Recruitment, Matching, Client, Vendor |
| `REQUIREMENT_UPDATED` | API / UI | `{ id, changes: {...} }` | Recruitment, Client, Matching |
| `REQUIREMENT_CLOSED` | API / UI | `{ id, reason }` | Recruitment, Client |

## Candidates Domain
| Event Type | Publisher | Payload Shape | Subscribers (Offices) |
|------------|-----------|---------------|-----------------------|
| `CANDIDATE_CREATED` | API / UI / Ext | `{ id, name, skills, ... }` | Matching |
| `CANDIDATE_UPDATED` | API / UI | `{ id, changes: {...} }` | Matching |
| `CANDIDATE_WITHDRAWN` | API / UI | `{ id, reason }` | Matching, Recruitment |

## Matching & Submissions Domain
| Event Type | Publisher | Payload Shape | Subscribers (Offices) |
|------------|-----------|---------------|-----------------------|
| `MATCH_CREATED` | MatchingOffice | `{ matchId, candidateId, requirementId, score }` | Recruitment, Vendor, Notification |
| `SUBMISSION_CREATED` | Recruiter / AI | `{ submissionId, candidateId, reqId }` | Recruitment, Vendor |
| `INTERVIEW_SCHEDULED`| API / UI | `{ submissionId, date, interviewers }` | Recruitment, Notification |
| `FEEDBACK_RECEIVED` | API / UI | `{ submissionId, outcome, notes }` | Recruitment, ExperienceEngine |
| `OFFER_RELEASED` | API / UI | `{ submissionId, terms }` | Recruitment, Client, Notification |
| `RECRUITER_RECOMMENDED`| RecruitmentOffice| `{ requirementId, recommendedRecruiterId }`| Notification, Recruitment |

## Financial & Vendor Domain
| Event Type | Publisher | Payload Shape | Subscribers (Offices) |
|------------|-----------|---------------|-----------------------|
| `PAYMENT_RECEIVED` | API / Ext | `{ invoiceId, amount, clientId }` | Vendor, Notification |
| `VENDOR_UPDATED` | API | `{ vendorId, changes }` | Marketplace |

## System & Sourcing
| Event Type | Publisher | Payload Shape | Subscribers (Offices) |
|------------|-----------|---------------|-----------------------|
| `SOURCING_SLA_BREACH` | SLA Engine | `{ requirementId, breachDetails }` | Recruitment |
| `PIPELINE_STALLED` | Analytics | `{ requirementId, stallReason }` | Recruitment |

*Note: The AI COO uses the `OfficeCapabilityRegistry` to dynamically resolve subscribers at runtime.*
