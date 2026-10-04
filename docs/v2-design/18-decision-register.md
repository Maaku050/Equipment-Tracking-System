# 18. Decision register

No item is marked Accepted. Acceptance requires the named accountable stakeholder(s), recorded date, rationale, and superseded-decision handling.

| ID | Topic | Status | Context | Options and tradeoffs | Recommendation | Required decision-maker |
|---|---|---|---|---|---|---|
| V2-DEC-001 | Organizational hierarchy | Needs stakeholder input | V1 has no scope | Fixed hierarchy is simple but rigid; generic tree is flexible but governed | Constrained organization tree with approved types; locations separate | Campus governance + data owners |
| V2-DEC-002 | Organization versus location | Proposed | Owner may differ from storage/operation | Combined model is simpler but loses responsibility/movement facts | Model owner, operating scope and physical location separately | Asset governance + lab leaders |
| V2-DEC-003 | Inventory tracking model | Needs stakeholder input | Campus has unknown mix of assets | Aggregate, serialized, or hybrid | Hybrid with required tracking mode per type | Asset owners + finance/compliance |
| V2-DEC-004 | Authentication | Needs stakeholder input | Institutional identity capability unknown | SSO, Firebase Auth, app-managed, hybrid | Prefer institutional OIDC/SAML if coverage/lifecycle meet needs; decide after discovery | IT identity/security |
| V2-DEC-005 | Role model | Proposed | V1 staff/admin are overbroad | Global roles are easy but unsafe; scoped roles add governance | Scoped RBAC with limited eligibility/resource attributes | Governance + security |
| V2-DEC-006 | Cross-department borrowing | Needs stakeholder input | V1 has no cross-scope policy | Prohibit, owner opt-in, escalation, open catalog | Owner-policy opt-in with explicit eligibility/approval; validate operationally | Academic/asset governance |
| V2-DEC-007 | Approval and reservation timing | Needs stakeholder input | Approval may or may not guarantee stock | Reserve at submit, approval, or pickup | Reserve when approval promises availability; use expiries | Lab operations + policy owner |
| V2-DEC-008 | Borrowing lifecycle granularity | Proposed | V1 overloads transaction | Simplified request/loan versus explicit request/reservation/loan/return | Preserve distinct domain records; allow labs to skip UI steps by policy | Product owner + lab operations |
| V2-DEC-009 | Fine/accountability policy | Needs stakeholder input | V1 fine data is inconsistent | No money, assessments, settlement record, integrated payments | Do not include payments until finance authority/process confirmed | Finance + governance + legal/privacy |
| V2-DEC-010 | Notification channels | Needs stakeholder input | V1 delivery mechanism unknown | In-app, email, push, SMS | In-app plus one approved institutional channel for MVP | Communications + IT + product |
| V2-DEC-011 | Native mobile | Deferred | Core needs appear web-capable | Responsive web versus native/PWA | Responsive web MVP; revisit for scanning/push/offline evidence | Product sponsor + operations |
| V2-DEC-012 | V1 history migration depth | Needs stakeholder input | History quality and retention unknown | Full, retention-window, summary, archive-only | Preserve maximum lawful history with provenance; decide after profiling | Data owners + privacy/legal |
| V2-DEC-013 | Asset tag uniqueness | Needs stakeholder input | Existing tag practice unknown | Campus-wide versus owner-scoped | Campus-wide if feasible; otherwise composite uniqueness and search disambiguation | Asset governance |
| V2-DEC-014 | Policy configuration | Proposed | Campus units may vary | Hardcoded, scoped versioned settings, generic rules engine | Small versioned scoped policy model; no generic engine for MVP | Governance + product |
| V2-DEC-015 | Deployment/operations platform | Deferred | Preferred Docker/Linux but host/SLA unknown | On-prem, cloud, managed containers/DB | Evaluate after capacity, security, support and budget inputs | IT operations/security/procurement |
| V2-DEC-016 | Rollout/cutover model | Needs stakeholder input | V1 remains deployed | Big bang, pilot waves, parallel read-only, dual-write | Scoped pilot waves, one writer per scope, read-only comparison | Sponsor + operations + data owners |

## Decision discipline

- “Proposed” is an architectural recommendation awaiting authority, not consent.
- “Deferred” means later evidence is necessary and the MVP must avoid foreclosing options.
- Each accepted decision should link requirements, policy version, risks, and affected migration mapping.
- Material changes create a superseding decision rather than editing away historical rationale.

