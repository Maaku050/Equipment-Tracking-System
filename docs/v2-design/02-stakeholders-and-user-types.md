# 2. Stakeholders and user types

## Stakeholder map

These are candidate stakeholders for discovery, not assertions about the school's structure.

| Stakeholder | Primary interest | Decisions/evidence needed |
|---|---|---|
| Borrowers (students, faculty, staff, possibly external) | Find, request, collect, return, see obligations | Identity, eligibility, privacy, accessibility |
| Laboratory custodians/operators | Daily queue, release/return, stock accuracy | Workflow states, custody, exceptions |
| Laboratory managers | Assets, local policy, staff delegation, reports | Scope and authority boundaries |
| Department/college administrators | Cross-lab governance and reporting | Organizational hierarchy and cross-borrowing |
| Campus/system administrators | Identity integration, global configuration, support | SSO, provisioning, global permissions |
| Auditors/compliance/data-protection personnel | Traceability, retention, appropriate access | Audit/PII/retention policy |
| Finance/cashier office | Assessments/payments if applicable | Whether eLabTrack records money or only obligations |
| IT/security/operations | Hosting, security, recovery, observability | SLAs, deployment, secrets, incident response |
| Migration/data owners | Legacy mapping and acceptance | Ownership attribution and reconciliation authority |

## User-type requirements

User type must not itself grant authority. A person can be a student borrower in one context, staff borrower in another, and custodian for two laboratories. Identity, affiliation, eligibility, role, and scope are separate concepts.

Proposed person/access concepts:

- **User:** human identity and profile linked to an authentication subject.
- **Membership:** relationship between a user and an organization, with affiliation type and validity period.
- **Borrower profile:** borrowing identity/identifiers and current eligibility; may derive from one or more memberships.
- **Role assignment:** capability bundle assigned to a user for an explicit scope and validity period.
- **Service identity:** non-human caller for jobs/integrations, never represented as an ordinary user role.

Student/faculty/staff/external are candidate affiliation types, not global authorization roles.

## Capability inventory

| Capability group | Capabilities |
|---|---|
| Self service | View eligible inventory; request/cancel; see status, loans, history, notices, charges; maintain permitted profile fields |
| Borrowing operations | Review/approve/reject; reserve; release/checkout; extend; accept partial/final returns; record condition/disposition |
| Inventory operations | Create/edit assets; count/reconcile; transfer; mark maintenance/lost/retired; manage images/categories |
| Local administration | Manage lab policy, locations, custodians, eligible borrowers, scoped reports |
| Organization administration | Manage child-scope memberships/roles, cross-scope policy and reporting |
| Campus administration | Global configuration, integration, identity linking, support—not routine borrowing by default |
| Audit/accountability | Read audit events; reconcile inventory; assess/adjust/waive charges according to policy |
| Communications | Manage approved templates/channels within permitted scope; view delivery failures |

## User lifecycle requirements

- Authentication status, application status, organizational membership, borrower eligibility, and role assignment must be independently representable.
- Suspension must have a reason, actor, effective time, and defined effect on active loans.
- Role/membership changes must be audited and time-bounded where appropriate.
- Deactivating a user must not erase loan, charge, or audit history.
- Duplicate institutional identities must be detectable and merge/link actions restricted and audited.
- External borrowers, self-registration, and administrative provisioning remain unresolved.

## Accessibility and inclusion

All user types require keyboard-operable, responsive, understandable interfaces. Identity or contact assumptions must not exclude users without a specific mobile format. Names, identifiers, and preferred contact channels must be modeled without inheriting V1's Philippine phone-format requirement unless policy confirms it.

