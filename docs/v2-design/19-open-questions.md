# 19. Prioritized stakeholder questionnaire

This 52-question questionnaire is designed for a requirements workshop. `BLOCKER` prevents safe domain/architecture decisions; `IMPORTANT` should be resolved before MVP acceptance; `OPTIONAL` informs later capability.

## Governance

| ID | Priority | Question |
|---|---|---|
| Q-001 | BLOCKER | Who is the accountable product owner and who may approve campus-wide policy and scope decisions? |
| Q-002 | BLOCKER | Which office owns asset data, borrowing records, audit records, and migration acceptance? |
| Q-003 | IMPORTANT | Which policies may laboratories customize, and which must be institution-wide? |
| Q-004 | IMPORTANT | What change-control and dispute/escalation process applies to policy, access, and data corrections? |

## Organization

| ID | Priority | Question |
|---|---|---|
| Q-005 | BLOCKER | Is there one campus, and must the initial model support additional campuses? |
| Q-006 | BLOCKER | What actual units can own equipment: institution, college, department, laboratory, center, or others? |
| Q-007 | IMPORTANT | Can labs skip hierarchy levels or belong to shared/central units, and can users belong to multiple units? |
| Q-008 | IMPORTANT | Can ownership, operating laboratory, physical location and custodian differ, and how are transfers approved? |

## Borrowing

| ID | Priority | Question |
|---|---|---|
| Q-009 | BLOCKER | Who is eligible to borrow, including students, faculty/staff and external borrowers? |
| Q-010 | BLOCKER | Are same-lab, same-department, cross-department and cross-college loans allowed under what conditions? |
| Q-011 | IMPORTANT | What duration, concurrent-loan, item-quantity, pickup-expiry and renewal rules apply and at what scope? |
| Q-012 | IMPORTANT | How should no-shows, substitutions, extensions, cancellations, disputed returns and borrower suspension with open loans work? |

## Inventory

| ID | Priority | Question |
|---|---|---|
| Q-013 | BLOCKER | Which equipment must be individually serialized and which may remain aggregate quantity? |
| Q-014 | BLOCKER | Are asset tags campus-wide unique, owner-scoped, or absent today, and who issues them? |
| Q-015 | IMPORTANT | Which catalog/acquisition fields are mandatory for compliance, finance, insurance or reporting? |
| Q-016 | IMPORTANT | How are stock counts, kits/components, consumables, transfers, retirement and disposal currently handled? |

## Users

| ID | Priority | Question |
|---|---|---|
| Q-017 | BLOCKER | What is the authoritative source for student/employee identity, affiliation, active status and identifiers? |
| Q-018 | BLOCKER | Are external borrowers allowed, and are self-registration or invitation/provisioning required? |
| Q-019 | IMPORTANT | Can a person hold multiple memberships and operational roles across unrelated laboratories? |
| Q-020 | IMPORTANT | What happens to access and open obligations when a person graduates, leaves, transfers or is suspended? |

## Approvals

| ID | Priority | Question |
|---|---|---|
| Q-021 | BLOCKER | Which requests require approval, who may approve them, and is item-level partial approval allowed? |
| Q-022 | BLOCKER | At what event is inventory guaranteed/reserved: submission, approval, ready-for-pickup or checkout? |
| Q-023 | IMPORTANT | Do restricted assets require training, sponsor, purpose, multiple approvals or separation of duties? |
| Q-024 | IMPORTANT | What reasons/notes must be recorded for approval, rejection, cancellation and overrides? |

## Maintenance

| ID | Priority | Question |
|---|---|---|
| Q-025 | IMPORTANT | Is maintenance/calibration required for MVP, and which asset classes have mandatory schedules/certificates? |
| Q-026 | IMPORTANT | Who may place/remove holds, approve return to service, declare lost, or retire an asset? |
| Q-027 | IMPORTANT | Must V2 track providers, work performed, parts, cost, downtime, warranty or attachments? |
| Q-028 | OPTIONAL | Do technicians or external providers require their own restricted workspace/access? |

## Fines

| ID | Priority | Question |
|---|---|---|
| Q-029 | BLOCKER | Will V2 impose monetary charges, nonmonetary accountability, or neither? |
| Q-030 | BLOCKER | If money is involved, is eLabTrack authorized to assess, record payment, waive, refund, or only send facts to finance? |
| Q-031 | IMPORTANT | What events/rates/caps/currency/policy scopes apply, and do outstanding amounts block borrowing? |
| Q-032 | IMPORTANT | Who resolves disputes and may adjust/waive charges, and what evidence/approval is required? |

## Notifications

| ID | Priority | Question |
|---|---|---|
| Q-033 | IMPORTANT | Which events are mandatory notifications and who receives/escalates them? |
| Q-034 | IMPORTANT | Which channels are institutionally available and approved: in-app, email, push or SMS? |
| Q-035 | IMPORTANT | May users opt out or choose timing for nonmandatory messages, and what consent rules apply? |
| Q-036 | OPTIONAL | May organizations customize sender, contact, language and templates, and who approves wording? |

## Reporting

| ID | Priority | Question |
|---|---|---|
| Q-037 | IMPORTANT | Which operational dashboards and reports are required at borrower, lab, department, college and campus scope? |
| Q-038 | IMPORTANT | Which metrics have formal definitions, especially utilization, overdue, damage/loss and financial measures? |
| Q-039 | IMPORTANT | Who may export record-level PII, in which formats, with what limits/retention/audit? |
| Q-040 | OPTIONAL | Are scheduled reports, BI integration, public aggregates or accreditation reports needed later? |

## Security

| ID | Priority | Question |
|---|---|---|
| Q-041 | BLOCKER | Does the institution use Google Workspace, Microsoft Entra/Office 365, LDAP, SAML/OIDC or another identity system? |
| Q-042 | BLOCKER | What MFA, session, password/recovery, deprovisioning and privileged-access policies apply? |
| Q-043 | IMPORTANT | Which privacy law/policy, data classification, retention, breach and data-subject requirements apply? |
| Q-044 | IMPORTANT | Which staff may access cross-scope PII/audit data, and are periodic access reviews or separation of duties required? |

## Migration

| ID | Priority | Question |
|---|---|---|
| Q-045 | BLOCKER | Who can provide read-only deployed V1 rules, indexes, functions/extensions, Auth, Firestore and Storage evidence? |
| Q-046 | BLOCKER | Who can assign authoritative organization/location ownership to every V1 user, asset and active/history record? |
| Q-047 | IMPORTANT | What V1 history must migrate versus remain in a restricted archive, and what retention/legal holds apply? |
| Q-048 | IMPORTANT | Who may approve reconciled stock, duplicate IDs, orphan records/files and disputed fine/payment mappings? |

## Deployment

| ID | Priority | Question |
|---|---|---|
| Q-049 | BLOCKER | What hosting constraints, data residency, network access, procurement and operations ownership apply? |
| Q-050 | IMPORTANT | What user/load/data-volume forecasts, availability, RPO/RTO and support hours must V2 meet? |
| Q-051 | IMPORTANT | Which dev/test/staging/production environments and CI/CD/security review processes are required? |
| Q-052 | OPTIONAL | What rollout calendar, blackout periods, pilot candidates, training channels and long-term support model are preferred? |

## Workshop use

Record respondent/authority, evidence, decision date, exceptions and follow-up owner for every answer. An answer from one lab must not be generalized to campus policy without the accountable decision-maker.

