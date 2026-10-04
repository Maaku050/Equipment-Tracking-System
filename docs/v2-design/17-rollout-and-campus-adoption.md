# 17. Rollout and campus adoption

## Rollout options

| Option | Advantages | Risks/conditions |
|---|---|---|
| One pilot laboratory | Small blast radius and direct feedback | May not test delegation/cross-scope behavior |
| One department with multiple labs | Tests hierarchy, shared borrowers and reporting | More migration/training coordination |
| Multiple representative departments | Tests policy variation and scale earlier | Larger support burden and harder rollback |
| Campus-wide launch | Fast standardization | Unacceptable without evidence, rehearsal and support maturity |

Proposed progression: one operationally self-contained pilot, then one multi-lab department, then representative departments, then campus rollout. The school has not approved this model.

## Pilot selection criteria

- Clear data owner and organization/location mapping.
- Representative aggregate and serialized inventory.
- Manageable active-loan volume and reconciliation exceptions.
- Engaged custodian/admin/borrower cohort and training availability.
- Ability to isolate write authority from V1.
- Willingness to measure workflow, accessibility, support and data-quality outcomes.
- Avoid selecting only an unusually simple lab if campus generalization is the goal.

## V1/V2 coexistence

For each scope, one system must be authoritative for new requests, inventory changes, returns, charges and roles. Parallel read-only comparison is allowed; uncontrolled dual writes are not. Shared users may access both systems while different scopes migrate, but the UI must clearly identify system/scope and avoid duplicate requests.

## Readiness gates

1. V1 emergency containment completed or formally risk-accepted by accountable security authority.
2. Blocker decisions and policy versions approved.
3. Pilot data reconciled and signed off by owner.
4. Authentication, authorization and scope tests passed.
5. Backup/restore, cutover and rollback rehearsed.
6. Support ownership, escalation, incident and notification procedures ready.
7. Training materials, accessibility checks and privacy communications complete.
8. Success metrics and stop/rollback thresholds agreed.

## Adoption activities

- Role-specific training for borrowers, custodians, lab admins, organization admins, auditors and support.
- Quick-reference checkout/return/exception guides at operating locations.
- Sandbox or guided rehearsal using synthetic data.
- Designated local champions and support channel.
- Feedback collection separated into defects, training gaps, policy questions and feature requests.
- Scheduled review of authorization assignments, data quality and workflow timing after launch.

## Candidate success measures

Targets are TBD: request decision time; pickup/checkout processing time; return completion time; inventory reconciliation discrepancy rate; overdue rate; duplicate/negative allocation incidents (target zero); notification failure rate; support tickets; task success/accessibility feedback; system availability; and migration exception rate.

## Cutover and rollback

Cutover requires a recorded scope, freeze/delta time, migration run, acceptance report, V1 access mode, routing change, responsible approvers and communication. Rollback criteria may include integrity failure, authorization exposure, unrecoverable workflow blockage or missed RPO/RTO. Rollback must preserve/reconcile every V2 write made after cutover.

## Campus expansion review

Each wave requires a go/no-go review covering incidents, performance, capacity, security, support, data quality, policy variance and open decisions. Expansion is not automatic merely because the previous wave launched.

