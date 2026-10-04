# 15. V1-to-V2 migration strategy

## Principles

- Preserve V1 unchanged until authorized containment/cutover actions.
- Discover deployed reality read-only before final mapping.
- Retain raw source exports, source IDs, provenance, migration run, transform version, and reconciliation decisions.
- Never manufacture organizational ownership, payments, or status facts silently.
- Migration is repeatable, measurable, idempotent, and reversible until acceptance.

## Stage 1 — live V1 evidence discovery

Read-only checklist:

- Export deployed Firestore rules, Storage rules, indexes and TTL settings.
- Inventory active Functions, regions, generations/runtimes, IAM, scheduler jobs and logs.
- Inventory Firebase Extensions and identify the notification consumer/delivery-added fields.
- Count Auth users and inspect provider, disabled state, verified email and custom-claim variants safely.
- Count each collection and profile field/type/status variants with redacted samples.
- Detect duplicate `uid`, email, and display transaction IDs.
- Detect missing/orphan user/equipment/transaction/record/fine/notification references.
- Recalculate inventory equations and disposition totals; identify negative/over/under counts.
- Compare active transaction return/damage/loss quantities and status/date facts.
- Compare `records.fineAmount`, `finePaid/finePaidAt`, and `fines` status/amount.
- Inventory Storage paths, public ACLs, missing referenced files and orphan objects without downloading unnecessary PII.
- Determine actual owning lab/department for every legacy user, equipment, active transaction and historical record.
- Establish retention, legal hold, data-owner sign-off, export timestamp and V1 change rate.

## Stage 2 — mapping and normalization

| V1 source | V2 target/conversion | Required reconciliation |
|---|---|---|
| Auth UID + `users` | user, identity, membership, legacy mapping | duplicates, status, claims/role mismatch, affiliation/owner |
| `equipment` | equipment type + aggregate pool by default; unit only with real unit evidence | owner/location, counts, damaged/lost gap, images |
| `transactions` Request | borrow request/items + possible reservation | status/date validity, stock allocation, display ID |
| active non-Request | loan/items plus originating request placeholder if needed | custody, due date, return balances, owner/operating scope |
| `records` | closed loan/return/history representation | missing source ID, terminal status, timestamps, identity references |
| `fines` and record amounts | historical/unverified or reconciled charges | authority, payment/waiver facts, duplicates |
| `notifications` | usually archived raw history, not active delivery | schema variants and consumer-added state |
| image URL/path | private object + attachment/legacy mapping | existence, ACL, checksum, owner, orphan decision |
| terms boolean/time | legacy acceptance evidence | no version; cannot imply acceptance of V2 terms |

Normalize `Ondue`/`Incomplete and Ondue` into date facts and canonical lifecycle mapping while preserving original value. Preserve legacy display transaction IDs even when duplicated; assign new unique internal IDs/codes.

## Stage 3 — transformation and rehearsal

Build migration tooling only in a later authorized phase. It should run against immutable exports/staging, emit per-record outcomes and reason codes, quarantine ambiguity, and be safely rerunnable. Rehearse full volume; measure duration, failures, data loss, referential integrity, file transfer, search/report parity, and security exposure.

## Stage 4 — validation and acceptance

Required controls:

- source/target counts by entity and organization;
- referential-integrity and uniqueness reports;
- inventory totals by equipment and disposition;
- active borrower/loan/due-date sampling with data-owner sign-off;
- history and legacy-ID traceability;
- charge classification/balance sign-off by authorized owner;
- attachment existence/checksum/access tests;
- authorization tests proving migrated data scope;
- reconciliation exceptions explicitly accepted, corrected, or excluded.

## Cutover options

| Option | Benefit | Risk |
|---|---|---|
| Big-bang after freeze | Simple final authority | Highest operational/cutover risk |
| Pilot scopes while V1 serves others | Limits blast radius | Needs strict scope ownership and dual-system rules |
| Parallel read-only V2 validation | Safe comparison | Does not validate live command operations |
| Temporary dual write | Potential continuous cutover | High complexity/inconsistency; not recommended without necessity |

Proposed approach: pilot by clearly separable laboratory/department after rehearsed snapshot/delta migration, with one authoritative write system per scope. This remains stakeholder/deployment approval.

## Freeze, delta, rollback

- Define freeze window or reliable source change capture; no untracked concurrent edits.
- Take final versioned export and database/object backups.
- Apply verified delta, run acceptance checks, then switch routing/access for the selected scope.
- Retain V1 read-only under restricted access for the approved retention period.
- Rollback trigger, decision-maker, deadline and data handling are predeclared. If V2 accepted writes, rollback requires an approved reverse/re-entry plan; never discard them.
- Keep mapping and migration evidence after cutover.

## Migration risks

Missing ownership; inconsistent aggregate stock; active partial returns; orphan references/files; duplicate display IDs; status vocabulary drift; fine/payment contradictions; public/variant Storage URLs; Auth claim/profile mismatch; unknown deployed notification mutations; and inability to attribute legacy actions to actors.

