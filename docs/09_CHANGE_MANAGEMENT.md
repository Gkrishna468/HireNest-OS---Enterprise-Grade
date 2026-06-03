# Change Management Document

## Purpose
Every schema change, data migration, and global state modification must be documented here. This ensures that as the platform scales to handle thousands of candidates, multiple vendors, and clients, schema evolutions are tracked, auditable, and their impact is fully understood.

## Format
Each entry must include:
- **Version / Date**
- **Added / Removed / Modified**
- **Reason**
- **Impact** (Required migrations, UI changes)
- **Affected Collections**

---

### Example Entry
**Version 1.4**
- **Added**: `candidateOwnershipId`
- **Reason**: Prevent duplicate ownership assignment and vendor collisions.
- **Impact**: Requires migration script to backfill existing candidates. UI must block submissions if ownership ID doesn't match the active vendor.
- **Collections**: `candidatePool`, `submissions`, `ownershipVault`
