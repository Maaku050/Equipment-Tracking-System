# 11. Non-functional requirements

Numerical targets not provided by the school remain `TBD — stakeholder decision`; Phase 2 must convert them into acceptance criteria.

| Area | Requirement / target |
|---|---|
| Performance | Common scoped list/detail reads meet p95 latency **TBD** under agreed concurrent load; commands expose bounded timeout and progress semantics |
| Scalability | Support expected users, organizations, assets, concurrent checkouts, and history volume **TBD** without full-dataset client reads |
| Concurrency | Zero accepted double allocation/negative inventory in tested contention scenarios; idempotent retries produce one domain effect |
| Availability | Service availability and maintenance window **TBD**; notification provider outage must not corrupt domain state |
| Recovery | RPO and RTO **TBD**; automated encrypted backups and regularly tested restore procedure required |
| Security | Backend authorization on every operation; dependency/secret scanning; patch and incident-response objectives **TBD** |
| Auditability | All listed material commands generate immutable, correlated audit events; audit retention **TBD** |
| Accessibility | Target WCAG 2.2 AA for supported web surfaces, subject to institutional standard confirmation |
| Responsiveness | Borrower and operational workflows support current desktop/tablet/mobile browser matrix **TBD** |
| Maintainability | Clear bounded modules, automated tests, migration/version discipline, documented APIs/decisions; no direct frontend database access |
| Privacy | Data minimization, scoped access, export controls, retention/deletion schedule and data-subject processes aligned with applicable policy/law |
| Observability | Structured logs, metrics, traces/correlation, health/readiness, job/notification/migration dashboards and actionable alerts |
| Portability | Dockerized local/dev/test workflow on Linux; environment-specific configuration outside source; deployment platform remains a decision |
| Data integrity | Database constraints, transactional commands, reconciliation reports, and no silent destructive repair |

## Capacity inputs required

Number of campuses/organizations/labs; users and concurrent users; equipment types/units/pools; daily requests/checkouts/returns; retained audit events; images/documents; peak registration/semester load; report/export size; and integration traffic are unknown.

## Browser and device strategy

A responsive React/Vite web application is the proposed MVP default because V1's core workflows—forms, queues, reports, profile/inventory images—do not inherently require native apps. Installable PWA behavior and camera-based web scanning can be evaluated later.

A native app is justified only by confirmed requirements such as reliable push, intensive QR/barcode scanning, offline field operation, background tasks, or device integrations that responsive web cannot meet acceptably. V1's Expo history alone is not a requirement.

## Availability and degradation

- Read-only browsing may degrade separately from commands, but stale availability must be labeled and never accepted as allocation authority.
- Scheduled-job and notification failures are observable and retryable.
- Database unavailability fails commands safely without partial domain effects.
- External identity/provider outages need documented login/session behavior.
- Maintenance mode and operational communication procedures require ownership.

## Retention and deletion

Retention periods for identity links, loan history, audit, charges/payments, messages, uploads, logs, and backups are all TBD. Deletion/anonymization must preserve legally/operationally required evidence and referential integrity. Soft deletion is not a universal substitute for a retention policy.

