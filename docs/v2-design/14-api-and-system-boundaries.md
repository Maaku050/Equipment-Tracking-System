# 14. API and system boundaries

## Candidate backend bounded contexts

| Context | Responsibilities | Depends on / publishes |
|---|---|---|
| Identity & Access | Auth subject mapping, users, memberships, roles, policy decision | Reads Organization; emits account/access audit |
| Organization & Location | Hierarchy, locations, ownership scope, transfers | Used by all scoped contexts |
| Inventory | Types, pools, units, availability, movements, reconciliation | Uses Organization; serves Borrowing/Maintenance |
| Borrowing | Requests, decisions, reservations, checkout, extensions, loans | Identity eligibility + Inventory allocations |
| Returns | Return events, item disposition, closure | Updates Inventory; triggers Maintenance/Accountability |
| Maintenance | Holds, inspection/work, return to service, retirement | Updates Inventory states |
| Financial Accountability | Charge policy/assessment/adjustment/payment evidence | Consumes Borrowing/Return events |
| Notifications | Templates, preferences, outbox consumption, delivery attempts | Consumes domain events; never owns domain state |
| Reporting | Authorized read models/exports | Consumes/query projections, not command ownership |
| Audit | Append-only material action record and authorized search | Receives correlated events from every command |

These may begin as modules in one deployable Go service—a modular monolith—not independent microservices. Boundaries exist to preserve ownership and testability, not to force distributed systems.

## Dependency principles

- Organization IDs/scopes and internal user IDs are shared identities; contexts do not mutate another context's tables arbitrarily.
- Borrowing requests allocations through Inventory inside a coordinated database transaction where same-database atomicity is needed.
- Returns records factual disposition and coordinates inventory changes; Financial Accountability reacts without blocking physical return unless policy demands synchronous assessment.
- Notifications consume outbox events asynchronously.
- Audit generation is part of successful command transaction or an equivalently reliable mechanism.
- Reporting uses read-only queries/projections and cannot mutate authorities.

## API principles

1. The Go/Fiber backend owns validation, authorization, state transitions, inventory invariants, idempotency, and audit generation.
2. React never connects directly to PostgreSQL/object storage or changes business data outside the API.
3. Authenticate once at the boundary; authorize every operation and scope the database query.
4. Commands express intent (`approve`, `checkout`, `process-return`) rather than generic arbitrary updates.
5. Important commands accept idempotency keys and expected version/state.
6. Errors have stable machine codes, safe messages, correlation IDs, field errors, and appropriate HTTP semantics.
7. Collections support explicit filters, stable sort, cursor/page contract, maximum page size, and total-count behavior only where affordable.
8. File upload uses authorized, bounded flows with post-upload validation/attachment commit.
9. Bulk endpoints define limits, validation, atomic/partial semantics, and per-item results.
10. API/version compatibility and deprecation policy are defined before external integrations.

## Conceptual API families

No paths or payloads are finalized. Families likely include:

- session/me, identity links and memberships;
- organizations, locations, scoped role assignments;
- equipment types, inventory pools, asset units, movements/reconciliation;
- borrow requests and decisions;
- reservations, checkout/loans, extensions;
- returns and dispositions;
- maintenance records;
- charges/adjustments/payments if enabled;
- notifications/preferences;
- reports/exports and audit events;
- files/attachments and policy versions.

## Frontend product surfaces

### Proposed choice: one role-aware web application

One React/Vite application can share authentication, design system, navigation, accessibility, domain types and deployment while presenting distinct workspaces:

```text
eLabTrack V2
├── Borrower portal
│   ├── Discover equipment
│   ├── Requests and pickup
│   ├── Current loans and returns
│   ├── History / accountability / notices
│   └── Profile and affiliations
├── Laboratory workspace
│   ├── Approval queue
│   ├── Pickup / checkout
│   ├── Return processing
│   ├── Inventory / counts / maintenance
│   └── Local reports
└── Administrative workspace
    ├── Organizations / locations
    ├── Memberships / scoped roles
    ├── Policies / templates
    ├── Cross-scope reports / audit
    └── Operations / migration visibility
```

Routes and controls are convenience only; backend permissions determine data/action access.

### Separate-app alternative

Separate borrower and staff/admin apps reduce accidental surface exposure and independent release coupling, but duplicate infrastructure/design/auth integration and complicate users with multiple roles. Choose it only if teams, security zones, deployment cadence, or UX divergence justify the cost. A later split remains possible if module boundaries are preserved.

## External boundaries needing adapters

Identity provider, email/SMS/push provider, object storage, scheduler/worker, finance/student information system, and observability exporters are interfaces. Phase 2 should prevent provider-specific concepts from leaking into core borrowing/inventory models.

