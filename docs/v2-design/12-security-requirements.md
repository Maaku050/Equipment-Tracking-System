# 12. Security and authentication requirements

## Authentication discovery—no selection yet

| Strategy | Strengths | Risks/requirements |
|---|---|---|
| Institution SSO (Google Workspace, Microsoft Entra, SAML/OIDC) | Central lifecycle/MFA, fewer passwords | Confirm provider, protocols, claims, account coverage, outage/support process |
| Firebase Authentication | Migration familiarity, managed identity | Still needs backend token validation, institution linking, lifecycle and vendor decision |
| Application-managed auth | Full control, supports external users | Highest password/MFA/reset/security operations burden |
| Hybrid | SSO for institution, controlled invitation for external borrowers | Identity linking, duplicate handling, policy/support complexity |

Required discovery includes Workspace/Entra/LDAP/identity systems, student and employee identifiers, email domains, external borrowers, self-registration, provisioning/deprovisioning, MFA, account recovery, and authoritative affiliation source. See V2-DEC-004 and questionnaire.

## Security requirements

### Authentication and sessions

- Backend validates issuer, audience, signature, expiry, nonce/state where applicable, and maps an external subject to one internal user.
- Session/token storage uses secure, HTTP-only, SameSite cookies where chosen for web, or an equally reviewed pattern; refresh, logout, revocation and idle/absolute timeouts are specified.
- MFA and step-up authentication requirements for privileged/destructive actions are TBD.
- Passwords, if any, use a modern memory-hard hash, protected reset, breached-password controls, rate limits, and never application logs.
- Disabled/deprovisioned identities lose new access promptly; active-loan operational handling remains available to authorized staff.

### Authorization

- Backend is the trusted business-rule and authorization boundary.
- Deny by default with scoped RBAC/hybrid checks from [04-role-and-permission-model.md](04-role-and-permission-model.md).
- Queries, exports, file downloads, and object references enforce scope/ownership; no insecure direct object reference.
- Privileged role assignment, impersonation/support access, bulk/destructive operations, and policy changes require explicit capability and audit.

### API and application security

- Validate and normalize all input using explicit schemas; parameterized SQL/query builders prevent injection.
- Apply CSRF protection for cookie-authenticated state changes; exact-origin CORS allowlists; security headers; TLS only.
- Rate-limit authentication, discovery/search, exports, uploads, and expensive/privileged commands by appropriate dimensions.
- Return stable error codes without stack traces, SQL details, or resource-existence leakage across scopes.
- Dependencies/images are pinned, scanned, and patched under an agreed response policy.

### Files and PII

- Object storage is private by default; authorize time-limited upload/download, bind objects to owner/scope, and audit sensitive downloads.
- Enforce allowlisted media types, content sniffing, size/dimension limits, malware scanning where risk requires, safe filenames, quotas, and orphan cleanup.
- Encrypt in transit and at rest; minimize names, email, identifiers, phone/contact, financial and audit metadata.
- Define retention, export, correction, deletion/anonymization, breach response, and nonproduction-data masking.

### Platform operations

- Secrets reside in a secrets manager/environment injection, never source/images/logs; rotation and least-privilege service accounts required.
- PostgreSQL roles separate application, migration, read-only reporting, backup, and operations privileges.
- Backups are encrypted, access-controlled, monitored, and restore-tested.
- Structured security/audit logs are tamper-resistant with restricted access and retention.
- Environments and identity/provider credentials are isolated; production data is not copied casually to development.

## Urgent V1 emergency containment (separate from V2)

This is a defensive operational plan, not an implementation performed in this phase. The V1 audit found an unauthenticated Admin SDK user-management HTTP API ([V1 security assessment](../v1-audit/05-authentication-and-security.md)). Before any broader V1 adoption:

1. Inventory the deployed endpoints, traffic, logs, IAM, regions, and callers; preserve evidence.
2. Require a valid Firebase ID token or trusted service identity on every privileged route.
3. Authorize a narrowly defined privileged role/claim; prevent self-escalation and student/staff overreach.
4. Replace permissive CORS with the exact approved origins; note CORS alone is not authorization.
5. Disable or restrict unused read/update/delete/bulk endpoints and maintenance test/manual triggers.
6. Add structured audit for account creation, update, role/status change, and deletion, including actor and outcome.
7. Retrieve and review deployed Firestore and Storage rules; test ownership/role/field constraints before campus expansion.
8. Make profile objects private where feasible and verify upload/delete authorization.
9. Review Firebase Auth claims versus profile roles, active privileged accounts, public objects, and suspicious endpoint activity.
10. Rotate/restrict any actual secret credentials discovered operationally; restrict public client API keys by supported platform/API as appropriate, without treating client config as an authorization control.
11. Create a reversible deployment, test plan, monitoring, and rollback procedure for containment changes.

Emergency hardening should minimize V1 behavior change while closing exposure. It must not be deferred until V2, and it must not be confused with V2's Go/PostgreSQL security architecture.

