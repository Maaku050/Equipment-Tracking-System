# 20. V2 roadmap

This roadmap begins only with authorized work and uses decision/quality gates. Dates and staffing are not estimated because capacity and institutional deadlines are unknown.

| Phase | Purpose | Primary outputs | Exit gate |
|---|---|---|---|
| 0 — Legacy evidence and containment | Reduce urgent V1 risk; establish deployed facts | Secured user API, reviewed rules, live-data profile, ownership and incident evidence | Security owner accepts containment; read-only discovery complete |
| 1 — Requirements and domain decisions | Validate this package with stakeholders | Approved scope, glossary, policies, decision register, MVP and NFR targets | Blocker questions/decisions resolved and signed off |
| 2 — Architecture and database design | Turn approved domain into technical design | Architecture, threat model, physical PostgreSQL model, migration conventions, API contract plan, ADRs | Architecture/security/data review |
| 3 — Backend foundation | Establish trusted platform boundary | Go/Fiber skeleton, auth integration, scoped authorization, PostgreSQL migrations, audit/outbox, CI/observability | Foundation quality/security gates |
| 4 — Frontend foundation | Establish accessible role-aware web shell | React/Vite app, auth/session, design system, navigation, API/error/query patterns | Accessibility/auth/API integration tests |
| 5 — Core organization and inventory | Deliver scoped catalog and stewardship | Organizations/locations, roles, hybrid assets, files, search/pagination, reconciliation | Inventory invariants and scope tests |
| 6 — Borrowing workflow | Deliver requests through checkout | Policy evaluation, decisions, reservations, checkout, borrower/staff workspaces | Concurrency/idempotency/E2E gates |
| 7 — Returns, maintenance and accountability | Close physical lifecycle | Partial/final returns, dispositions, minimal maintenance, approved charge model | Mixed-disposition and accounting tests |
| 8 — Reporting, notifications and audit | Operate and evidence the system | Inbox/external delivery, scoped reports/exports, audit search, runbooks | Delivery/report/privacy/operations gates |
| 9 — Migration tooling and rehearsal | Prepare trustworthy V1 transition | Extract/transform/load tools, quarantine, reconciliation reports, full rehearsal/rollback | Data-owner and security acceptance |
| 10 — Pilot deployment | Validate in real operations | Training, scoped cutover, monitored pilot, feedback and go/no-go report | Pilot criteria met before next wave |

## Dependencies and sequencing

- Phase 0 V1 containment is urgent and proceeds independently; it does not wait for V2 code.
- Authentication, hierarchy, role/scope, tracking mode, cross-borrowing, fine policy and migration ownership decisions gate Phase 2.
- Backend authorization/inventory transaction foundations precede workflow UI—not the reverse.
- Migration tooling follows stable target schema/API but live V1 profiling begins immediately.
- Native mobile, advanced maintenance, payment integration and advanced analytics remain future roadmap branches after measured need.

## MVP release composition

The first production candidate includes Phases 3–8 only for the approved MVP features, plus successful Phase 9 migration and Phase 10 pilot. Completing code is not equivalent to release readiness; security, reconciliation, training, restore, observability and rollback gates are mandatory.

## Post-pilot decision

The sponsor and accountable operations/data/security owners choose: expand, hold and remediate, narrow scope, or roll back. Campus-wide deployment is a later rollout decision, not an automatic roadmap milestone.

