# 1. Product vision and scope

## Vision

eLabTrack V2 will be a campus-capable equipment stewardship and borrowing system that lets authorized people discover and borrow equipment while preserving organizational ownership, inventory integrity, accountability, and a traceable history of every material action.

Success means a laboratory can operate independently within campus governance, delegated staff see only their authorized scope, borrowers have predictable workflows, and campus leadership can obtain trustworthy cross-scope information without exposing or downloading unrelated records.

## Outcomes

1. Prevent double allocation and unexplained stock changes under concurrent use.
2. Represent who owns, stores, administers, and currently holds equipment.
3. Separate requests, reservations, loans, returns, maintenance, charges, and audit events.
4. Enforce authorization in the backend for every operation.
5. Preserve useful V1 history and identifiers with explicit reconciliation.
6. Support growth through scoped queries, pagination, operational observability, and delegated administration.

## Proposed MVP

### Must have

- Identity integration selected through institutional discovery; no anonymous data access.
- Users, memberships, scoped role assignments, account status, and least privilege.
- Configurable organization hierarchy and separate physical locations.
- Aggregate inventory pools and serialized asset units in one hybrid model.
- Asset type/category, ownership, current location, custodian, condition, operational state, image, and legacy identifiers where applicable.
- Borrow request, item-level decision, reservation, checkout, partial return, overdue classification, final return, closure, rejection, and cancellation.
- Transactional availability and unit-state changes with idempotency and audit events.
- Damage/loss dispositions; maintenance hold and basic work record.
- Borrower self-service history and scoped staff work queues.
- In-app notifications and one approved external channel, with delivery status.
- Server-side scoped inventory/loan/overdue/history reports and export controls.
- Read-only V1 discovery, tested migration tooling later, cutover validation, rollback plan.
- Security, backup, observability, accessibility, and privacy controls defined in this package.

### Should have, subject to policy

- Extension/renewal requests.
- Ready-for-pickup expiry and reservation release.
- Configurable borrowing policies by organization/equipment class.
- Restricted-equipment eligibility and additional approval steps.
- Basic equipment transfer between owner/location scopes.
- Charge assessments and adjustments if the school retains fines.

### Future capability

- Native mobile apps, push notifications, offline operations.
- QR/barcode scanning beyond responsive web camera support.
- Preventive-maintenance scheduling, calibration programs, vendor/cost management.
- Payment gateway or student-account integration.
- Inter-campus logistics, procurement, depreciation, and disposal approvals.
- Forecasting and advanced utilization analytics.

## Explicit non-goals for Phase 1

No V2 source tree, UI, Go package, Fiber route, PostgreSQL migration, Docker service, deployment configuration, OpenAPI specification, authentication selection, or production change is authorized. Phase 1 also does not invent school policy.

## Legacy parity and intentional differences

V1 capabilities considered for parity are login/reset, inventory discovery, requests, direct staff checkout, approvals, partial returns, damage/loss, overdue tracking, history, profile administration, reminders, and reports ([V1 feature matrix](../v1-audit/13-feature-matrix.md)).

Intentional V2 requirements differ from V1 by placing rules behind an API, adding organizational scope and immutable audit, using transactional inventory, keeping rejection/cancellation history, and avoiding global client collection reads. Exact fine, terms, and due-date policies are not inherited automatically.

## Portfolio positioning

- **eLabTrack V1:** commissioned/deployed academic equipment system and original implementation, preserved as the legacy and portfolio artifact.
- **eLabTrack V2:** proposed campus-scale redesign/rebuild using a new architecture centered on organizational scoping, backend security, concurrency safety, auditability, migration discipline, and maintainability.

V2 must not be described as implemented, deployed, institutionally approved, or production-tested until those events occur.

