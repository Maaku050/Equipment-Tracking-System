# 11. Technical debt and maintainability

## Debt register

| ID | Severity | Description/evidence | Impact | Potential V2 consideration |
|---|---|---|---|---|
| TD-01 | Critical | Unauthenticated Admin SDK HTTP user lifecycle API | Account takeover/creation/deletion risk | Preserve required operations while defining trusted authorization/audit boundaries |
| TD-02 | Critical | No rules/indexes source in repository | Security and deploy behavior cannot be reviewed/reproduced | Treat deployed rules/indexes as migration-discovery inputs |
| TD-03 | Critical | Non-transactional stock arithmetic | Oversubscription/lost updates | Preserve quantity semantics and reconcile legacy counts/history |
| TD-04 | High | Direct Firebase writes distributed across UI | Inconsistent rules, difficult tests and policy changes | Inventory every write path before domain redesign |
| TD-05 | High | Unbounded global listeners | Cost/performance/PII exposure | Establish baseline volume and access scope before migration |
| TD-06 | High | Non-atomic completion/archive/fine/notification | Duplicates/orphans on partial failure | Identify and reconcile inconsistent legacy terminal transactions |
| TD-07 | High | No automated tests | Regression risk in core workflows | Capture current behavior as characterization cases |
| TD-08 | High | No organization/lab model | Campus expansion blocker | Requirements must establish ownership and scope semantics |
| TD-09 | High | `records` and `fines` payment state diverges | Incorrect balances/revenue/history | Determine authoritative legacy source during migration |
| TD-10 | Medium | Duplicated transaction creation in student, admin, helper | Drift in validation/due-date/notification behavior | Preserve path-specific differences until policy decides them |
| TD-11 | Medium | Duplicate and inconsistent TypeScript domain types | Status/field drift and unsafe casts | Build a verified legacy vocabulary map |
| TD-12 | Medium | Oversized screens/modals (many 400–1,700 lines) | Mixed UI/domain/data logic; hard review/test | Decompose only during later implementation phase |
| TD-13 | Medium | User/role inconsistencies | Single add excludes staff; statuses differ across interfaces; admin hidden from UsersContext | Clarify intended role lifecycle |
| TD-14 | Medium | Hardcoded project URLs, currency, timezone, fine, branding, fallback image | Environment/policy coupling | Inventory configuration versus policy data |
| TD-15 | Medium | Hard deletion without domain audit | Lost denial/cancellation/admin action history | Define migration retention and evidence needs |
| TD-16 | Medium | Notification schema has two shapes and no consumer in repo | Delivery/operations uncertainty | Discover deployed extension/service and queue contents |
| TD-17 | Medium | Multi-step Storage/Firestore/Auth operations | Orphaned records/files or missing images | Audit live orphan/partial states before migration |
| TD-18 | Medium | Maintenance function uses single batches and duplicated update call | Limits/redundancy | Measure active volume and scheduler logs |
| TD-19 | Low | Both npm and Yarn lockfiles | Non-reproducible dependency authority | Identify deployed build's package manager |
| TD-20 | Low | Placeholder cloud config exists but callers hardcode URLs | Configuration drift | Determine source of deployed endpoint configuration |
| TD-21 | Low | Legacy starter metadata (`starter-kit-expo`, scheme) | Operational naming ambiguity | Preserve package/bundle identifiers needed for upgrades |

## Code-quality assessment

### Organization and separation of concerns

Route grouping and domain contexts are understandable, and generated UI primitives are isolated. However, service abstraction is partial: screens own Firestore queries, validation, stock mutation, HTML report generation, and Storage lifecycle. `_helpers/firebaseHelpers.ts` is itself a 1,300-line mixed module containing types, business rules, persistence, and large email templates.

### TypeScript

Root strict mode is positive, but data boundaries cast Firestore values directly and frequently use `any`. There are at least three transaction-type definitions with different status vocabularies. Record writer fields and RecordContext fields differ (`finePaid`, `createdAt`). User status types differ between global context and details modal. Runtime schema validation is absent.

### Naming and domain vocabulary

`Ondue`/`Incomplete and Ondue` are nonstandard and inconsistently present. “Transaction” spans several domain phases; “Complete” is removed from active transactions and appears in records. “fine revenue” is computed from assessed record amounts, not verified payments. These names are important migration facts, not merely style issues.

### Testability

Pure calculations exist for statuses/fines and could be characterized, but they sit beside Firebase side effects. Screens directly import singleton Firebase services, and no emulator/test seams are present. Large HTML template strings and duplicated mutations increase fixture complexity.

### Error consistency

User-facing errors are mostly generic while console logs include details. Rollback is implemented only for part of account creation. No idempotency keys, retries, reconciliation jobs, or operation-status documents protect multi-resource operations. Some missing documents silently return; other paths throw.

## Known internal inconsistencies worth preserving as audit facts

- Server and client “partial return” status calculations differ.
- `returned` boolean and cumulative disposition quantities can disagree.
- Direct checkout and student request use different due-date validation.
- `UsersContext` filters admins but still calculates stats after filtering, so admin counts remain zero.
- Fine clearing zeroes `records.fineAmount`, not `finePaid`, and ignores `fines`.
- Equipment details’ borrower predicate can include requested or otherwise noncomplete entries based on `returned/status` logic.
- The generic helper functions for settings, notification creation, overdue updates, and some CRUD appear unused; they should not be assumed active features.

