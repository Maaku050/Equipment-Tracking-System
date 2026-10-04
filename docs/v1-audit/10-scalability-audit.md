# 10. Performance, scalability, and campus-expansion audit

Severity reflects actual V1 evidence and likely impact at campus scale; it is not a V2 design prescription.

## Findings

| Severity | Finding | Evidence | Campus-scale effect |
|---|---|---|---|
| Critical | No organizational boundary in data model or queries | All core collections global; no campus/college/department/lab fields | Cannot scope access, policy, administration, reports, or identifiers by organization |
| Critical | Stock updates are non-transactional read/modify/write | Three creation paths and returns use `getDoc` then absolute batch update | Lost updates, oversubscription, and negative/stale quantities under concurrency |
| Critical | Privileged user API is unauthenticated | HTTP Admin SDK endpoints have no token/role verification | Exposure grows with user population and delegated administration |
| High | Every layout subscribes to entire collections | Users, equipment, transactions, records contexts use unbounded `onSnapshot(orderBy)` | Read cost, memory, initial load, network traffic, and PII exposure grow linearly |
| High | Student clients receive global data before filtering | Student layout mounts all four contexts; UID filters occur in UI | Every student may download all transactions/records/users if rules allow |
| High | One Firestore batch for collection-wide maintenance | Scheduled functions accumulate all updates/notices without chunking | Batch limit failures and long runtimes as transaction volume grows |
| High | User fines cause N+1 queries | Admin users screen queries `records` once per loaded user | Reads grow as users × refresh cycles |
| High | Completion is not atomic end-to-end | record/notification/fine standalone writes before transaction/stock batch | Retry/partial failure can duplicate artifacts or retain active loan |
| High | UI-only query/authorization assumptions | No rules in repo, direct client writes | Campus delegation and adversarial clients cannot be safely governed from UI |
| Medium | Search/filter/reporting is client-side | Global arrays filtered/aggregated for inventory, transactions, users, records/charts | Slow UI and large downloads; no server pagination |
| Medium | Denormalized identity/equipment snapshots lack reconciliation rules | names/emails/item names/prices copied into transactions/records | Ambiguous current-vs-historical reporting and update semantics |
| Medium | No index source control | Complex due-date/inequality/status queries; no `firestore.indexes.json` | Deployments may fail queries or depend on undocumented console indexes |
| Medium | Queue has no repository-visible consumer/lifecycle | Notifications only written; no status/read/retry consumer | Delivery capacity, errors, and retention cannot be operated from this codebase |
| Medium | Global display transaction ID is weakly generated | Date plus last six timestamp digits | Collision risk across concurrent clients; no uniqueness check |
| Medium | Separate Node/runtime/dependency generations | Node 20 Functions v4/Admin v12 and Node 24 Functions v7/Admin v13 | Operational/deployment complexity and inconsistent behavior |
| Low | Duplicate providers per route group | Both drawers mount the same global listeners | Listener churn during group changes; smaller than unbounded-read issue |
| Low | Remote fallback image is third-party | Hardcoded Brave-proxied URL in screens/print | External availability/privacy dependency |

No evidence of document pagination, query cursors, server-side aggregation, sharding, cached aggregates, tenant-scoped indexes, or workload partitioning was found.

## V1 assumptions that may block campus-wide expansion

These are supported by code/data structure:

1. **One global organization and inventory.** No organization/department/lab key exists on users, equipment, transactions, records, fines, notifications, or settings.
2. **One laboratory office and policy vocabulary.** Terms/emails refer to “the laboratory office”; PHP 10/day and Philippine phone format are global constants.
3. **One undifferentiated staff/admin operational scope.** Both roles see and mutate all data; no delegated administrator scope.
4. **Global equipment names and aggregate pools.** There is no site/unit/serial/asset-tag hierarchy or inter-lab ownership.
5. **Global reporting.** Reports consume all records with no departmental boundary.
6. **Global borrower directory.** Staff/admin subscribe to all non-admin profiles, and student layouts also mount that provider.
7. **No cross-department borrowing concept.** There is neither a home department nor owning department to compare.
8. **One global terms acceptance.** Boolean acceptance has no policy version or organizational applicability.
9. **One Firebase project/environment in source.** Client and hardcoded function URLs point to a single named project; separation is not represented.
10. **Single currency/timezone/country conventions.** `₱`, `Asia/Manila`, and Philippine mobile validation are embedded.

Uncertain: the `FSMO` branding and image suggest a specific organization, but the repository does not define the acronym or formal departmental boundary. It is therefore evidence of localized branding, not proof of the exact owner hierarchy.

## Query pattern inventory

- Four unbounded ordered real-time collection reads.
- Transaction/equipment/user screens frequently filter those arrays locally.
- Request/direct checkout perform additional one-shot collection queries.
- Equipment deletion reads every active-status transaction then searches embedded arrays.
- Each borrower row triggers a separate records query for fines.
- User details repeats the same student-record query.
- Maintenance runs four queries/routines sequentially, with overlapping transaction population.
- No explicit `limit`, cursor, collection partition, aggregate query, or virtualized server paging is used in domain data access. UI pagination only slices already-downloaded arrays.

