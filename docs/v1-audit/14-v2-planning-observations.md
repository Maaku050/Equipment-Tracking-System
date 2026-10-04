# 14. Facts V2 planning must consider

This section records migration and requirements inputs. It intentionally does not prescribe V2 architecture.

## Data and identifiers to preserve or reconcile

- Firebase Auth UID is the user document ID, stored again as `users.uid`, and referenced by `studentId`/`userId`.
- Firestore auto IDs identify equipment, active transactions, records, fines, and notifications.
- A second display transaction ID (`TXN-YYYYMMDD-######`) is shown to users and copied into records/fines. Its uniqueness is not enforced.
- Active transactions contain cumulative return/damaged/lost quantities and three notification flags.
- Completed history is a copied `records` snapshot; original active document IDs are not explicitly stored when display ID is available.
- User and equipment names/emails/prices are denormalized historical snapshots and can differ from current source documents.
- Storage paths and URLs are persisted. Profile images have two naming/publication patterns; equipment images have nested random names.
- Legacy status spelling, particularly `Ondue` and `Incomplete and Ondue`, may exist in persisted data.
- Fine state can exist in `transactions.fineAmount`, mutable `records.fineAmount`, and independent `fines` documents. These are not synchronized.
- Notification queue documents have at least two possible shapes.
- Terms acceptance has a timestamp/boolean but no version identifier.

## Migration-quality questions requiring live evidence

The repository cannot answer:

1. Which Firestore/Storage rules and indexes are deployed?
2. What actual documents/field variants, invalid counts, orphan references, or duplicate display IDs exist?
3. Which notification extension/service consumes the queue, and what delivery/status fields does it add?
4. Are both Functions projects deployed, in which regions/runtimes, and with what scheduler history?
5. Which package manager/build process produced the deployed app?
6. Are Firebase Auth custom claims synchronized with Firestore roles for all accounts?
7. Are public Storage objects or orphaned images present?
8. Which records/fines represent paid, waived, or outstanding balances?
9. What volume, retention, and departmental ownership apply to users, equipment, and history?
10. Is web the only deployed target, or are Android/iOS binaries in use despite missing bundle IDs/EAS config?

## Compatibility risks

- Changing UID/document IDs can break every student ownership reference.
- Normalizing active/history entities must retain legacy terminal snapshots and distinguish deletion/denial gaps.
- Recalculating fines from legacy records may differ due to mutable zeroed amounts, timezone/date normalization, and missing payment facts.
- Recalculating stock from transactions may not reconcile with stored counts because damaged/lost quantities are not represented in total stock and writes are race-prone.
- Migrating files must account for public Admin SDK URLs, Firebase token URLs, absent paths on legacy documents, and deletion orphans.
- Treating `staff` as less privileged than `admin` would intentionally change V1 behavior and needs requirements approval.
- Introducing organizational scope requires a business decision for every existing global record; the repository has no reliable department/lab attribution.

## Final audit summary

### A. V1 architecture summary

Expo/React Native/TypeScript client with Expo Router, responsive Drawers, React Context collection snapshots, and direct Firebase Auth/Firestore/Storage access. Two independent Firebase Functions projects implement privileged user HTTP endpoints and scheduled/callable transaction maintenance. Static web output is hosted by Firebase Hosting.

### B. Main user roles

`student`, `staff`, and `admin`. Students have borrowing/history/profile UI. Staff and admins are operationally equivalent in the client and can manage users, inventory, transactions, returns, fines, and reports.

### C. Main workflows

Administrative account provisioning; login/reset/logout; equipment CRUD/discovery; student request and terms acceptance; staff direct checkout; approval/denial; partial/final good/damaged/lost return; scheduled due/overdue updates and email queueing; archived history/fines; web print and client-side charts.

### D. Firestore collections discovered

`users`, `equipment`, `transactions`, `records`, `fines`, `notifications`, and fixed document `settings/general`. No subcollections were found.

### E. Most important business rules

Active profiles only at login; student due dates up to seven days; request-time stock reservation; staff approval; PHP 10/day overdue charge; unit-price damage/loss charge; cumulative partial returns; only good units return to availability; terminal transactions are copied to history and deleted; terms acceptance required for student request.

### F. Top scalability constraints for campus expansion

No organizational/lab scope, unbounded collection listeners, student-side global reads, client-side filtering/reporting, N+1 fine queries, non-transactional stock mutations, collection-wide single batches, and no server pagination/index source.

### G. Top security concerns

Unauthenticated privileged HTTP user endpoints; no repository-visible Firestore/Storage rules; direct client trust for stock/status/PII/destructive writes; staff/admin overbreadth; public profile images; missing centralized user-route/status guard.

### H. Top technical-debt items

Distributed Firebase logic, non-atomic multi-resource workflows, duplicated constructors/types, oversized UI modules, inconsistent fine/payment models, hardcoded project/policy/localization values, hard-delete history gaps, notification schema/consumer uncertainty, and absent automated tests.

### I. Areas of uncertainty

Deployed rules/indexes/extensions, notification delivery, live schema variants/data quality, actual platform releases, production environment separation, intended staff authority, settings schema, and operational retention policies.

### J. Files created

`docs/v1-audit/README.md` and numbered documents `01-system-overview.md` through `14-v2-planning-observations.md`.

### K. Secret exposure discovered

**Yes.**

### L. Recommended next step

**Begin V2 requirements and domain-design phase.** Do not begin implementation until the live-evidence questions above are resolved and V1 data is profiled read-only.
