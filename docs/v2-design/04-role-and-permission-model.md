# 4. Role, capability, and permission model

## Principle

V2 authorization is backend-enforced scoped RBAC: a role bundles capabilities; an assignment binds a role to an organization/resource scope. Identity attributes and resource facts may add narrow ABAC checks for eligibility, ownership, restricted equipment, and separation of duties. The frontend may hide unavailable actions but is never the authority.

`role = laboratory_administrator, scope = Laboratory A` is distinct from the same role at Laboratory B. No role string implicitly grants campus-wide access.

## Capability matrix

Legend: O = own records; S = assigned scope; C = child scopes if explicitly allowed; G = campus/global; — = not inherent.

| Capability | Borrower | Custodian | Lab admin | Org admin | System admin | Auditor |
|---|---:|---:|---:|---:|---:|---:|
| View eligible inventory | O/eligible | S | S | C | G support | S/G read |
| Create/cancel own request | O | O | O | O | — | — |
| Approve/reject request | — | S? | S | C? | — | Read |
| Release/check out | — | S | S | C? | — | Read |
| Process return/disposition | — | S | S | C? | — | Read |
| Manage inventory/assets | — | Limited S | S | C? | — | Read |
| Open/resolve maintenance | Report? | S | S | C | — | Read |
| Manage memberships/roles | — | — | Local? | C | Emergency/global | Read |
| Configure borrowing policy | — | — | S? | C | Global defaults | Read |
| View operational reports | O | S | S | C | G support | S/G read |
| Assess/adjust charges | — | Record facts | S? | C? | — | Read |
| View audit events | Own subset? | S subset | S | C | G | Assigned scope |
| Reconcile inventory | — | S | S | C | — | Observe |

Question marks are policy decisions, not granted permissions.

## Candidate roles

| Candidate role | Purpose | Default scope | Proposed MVP? |
|---|---|---|---|
| Borrower | Self-service borrowing and own history | Self plus eligible scopes | Yes |
| Laboratory custodian/operator | Checkout, return, count, condition operations | One or more labs | Yes |
| Laboratory administrator | Local assets, staff assignments/policies/reports | Lab | Yes if distinct from custodian is needed |
| Organization administrator | Delegated management/reporting across child scopes | Department/college subtree | Yes where governance requires |
| System administrator | Technical/global configuration and identity support | Institution | Yes, tightly limited |
| Auditor | Read-only scoped audit/report access | Assigned scope/time | Yes if compliance requires; otherwise post-MVP |
| Maintenance technician | Work assigned maintenance without borrowing admin rights | Assigned work/scopes | Future unless launch operation requires |
| Financial officer | Assess/settle approved charges without inventory authority | Assigned org | Conditional on fine policy |

“Student” and “faculty/staff” are proposed affiliations/borrower classes, not privileged roles.

## Scope semantics

A role assignment needs: subject, role, scope type/ID, whether child scopes are included, effective start/end, grantor, status, and reason/reference. Resource authorization evaluates assignment scope against owner/operating scope and action policy. Temporary coverage and multiple lab assignments must not require global roles.

## Authorization requirements

- Deny by default; validate authentication, account status, assignment validity, capability, scope, resource state, and policy on every command/query.
- Ownership and “own history” predicates must use authenticated subject mapping, never caller-provided user IDs alone.
- Campus-wide access must be explicit, rare, reviewable, and never implied by “admin.”
- Destructive actions require named capability, reason, confirmation, and audit; used records normally deactivate/archive instead of delete.
- Role assignment/grant must require authority over both the role and target scope; prevent self-escalation.
- Service identities receive minimum machine capabilities and cannot inherit human UI roles.
- Bulk actions are authorized and audited per requested scope and return partial-result semantics explicitly.
- Authorization decisions should be testable as a policy matrix and log denial reason codes without leaking protected data.

## RBAC versus hybrid checks

Pure RBAC handles stable capabilities and delegation. Limited attributes are justified for: active membership, borrower eligibility, restricted equipment certification, owning/operating organization, requester's relationship to the resource, and separation-of-duty rules. A general-purpose policy language is not justified for MVP unless discovery reveals materially more complex policy.

