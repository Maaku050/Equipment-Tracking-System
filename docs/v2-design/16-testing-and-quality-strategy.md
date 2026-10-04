# 16. Testing, quality, and observability strategy

## Test layers

| Layer | Purpose | High-value examples |
|---|---|---|
| Unit | Pure rules/calculations | policy resolution, dates, quantity disposition, charge calculation |
| Domain/state | Permitted commands/transitions/invariants | decision, allocation, checkout, partial return, closure, retirement |
| Repository/DB integration | Real PostgreSQL constraints/transactions | row locking, uniqueness, rollback, outbox/audit atomicity |
| API | Validation, errors, idempotency, pagination | duplicate commands, stale version, filter contracts |
| Authorization | Role × scope × ownership × state matrix | cross-lab denial, child-scope access, self-escalation prevention |
| Concurrency | Competing commands | last-item allocation, parallel returns, checkout/cancel race |
| Migration | Fixture and full rehearsal | legacy status/ID/fine/count variants, rerun safety, rollback |
| Frontend component | Accessible UI states | forms, queues, errors, permission-disabled controls |
| End-to-end | Critical user journeys | request→approval→checkout→partial/final return; suspension; transfer |
| Security regression | Known attack/control cases | IDOR, injection, CSRF/CORS, upload, rate limit, privilege escalation |
| Performance/recovery | Capacity and resilience | scoped query plans, export limits, backup restore, provider outage |

## Highest-risk workflows

1. Concurrent reservation/checkout of the last aggregate quantity or same serialized unit.
2. Idempotent return with mixed good/damaged/lost dispositions.
3. Scope authorization across owner, operating lab, borrower affiliation, and delegated administrator.
4. Role grant/revocation and disabled identity with active loans.
5. Charge assessment/adjustment/payment allocation if retained.
6. Migration of active loans and reconciliation of stock/fines.
7. Cutover/rollback without losing commands.
8. File authorization and orphan cleanup.

## Quality gates before pilot

- Approved requirements/decision traceability to acceptance tests.
- Automated lint, formatting, typecheck, unit/domain/integration/API/authorization suites.
- PostgreSQL migrations forward/backward/rehearsal tested against realistic data volume.
- No known critical/high security finding without explicit risk acceptance.
- Concurrency invariants pass deterministic stress tests.
- Accessibility review of critical workflows.
- Restore test meets approved RPO/RTO.
- Observability alerts and operator runbooks exercised.
- Migration reconciliation and product-owner acceptance completed for pilot scope.

## Test data and environments

Use synthetic/minimized fixtures covering multiple organizations and roles. Production PII must not enter developer/test environments without an approved masked process. Tests use disposable PostgreSQL/object storage and fake providers where possible; contract/sandbox tests cover real identity/notification integrations.

## Observability requirements

- JSON structured logs with timestamp, severity, service/module, environment, correlation/request ID, actor internal ID where allowed, scope, command/outcome/error code; never secrets.
- End-to-end request correlation through API, DB transaction, outbox, job and notification delivery.
- Metrics: request rate/latency/errors; DB pool/query latency/deadlocks; command conflicts/idempotency replays; allocations/overdues; queue depth/age/retry/failure; job duration; reconciliation exceptions; migration counts.
- Liveness and dependency-aware readiness endpoints; protected diagnostic detail.
- Error tracking with release/environment and scrubbed context.
- Scheduled-job status, last success, duration, affected count, failure/retry and alert.
- Notification failure dashboards and safe retry tools.
- Migration run dashboard with source/processed/succeeded/quarantined/failed counts and immutable reports.
- Audit events are not replaced by application logs; the two have different purpose/access/retention.

Paid vendors are not selected. OpenTelemetry-compatible instrumentation and deploy-target-native logging/metrics should be evaluated in Phase 2.

