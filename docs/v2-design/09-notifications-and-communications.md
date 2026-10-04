# 9. Notifications and communications

## Goals

Notifications communicate domain events; they do not define or repair domain state. V2 must independently record request/loan/return facts before attempting delivery. V1 queue behavior is migration evidence, not the V2 contract ([V1 notification audit](../v1-audit/08-notifications-and-history.md)).

## Candidate channels

| Channel | MVP recommendation | Rationale/decision needed |
|---|---|---|
| In-app inbox | Yes | Provides authoritative user-visible status without external delivery dependency |
| Email | Conditional yes | Likely parity; confirm institutional mail and sender policy |
| Push | Future | Requires native/PWA token lifecycle and product need |
| SMS | Future/exception | Cost, consent, number quality, provider and privacy implications |

## Event catalog candidates

Request submitted, approved, partially approved, rejected, cancelled; reservation ready/expiring/expired; checkout receipt; due-soon; due-today; overdue escalation; extension decision; partial/final return receipt; damage/loss review; charge assessed/adjusted/settled; maintenance assignment/completion; account/role security changes. Stakeholders must approve recipients and timing.

## Delivery model requirements

- Domain transaction writes an outbox event atomically with the state change.
- A background worker creates channel deliveries with stable idempotency keys.
- Each delivery tracks `pending`, `processing`, `sent`, `delivered` where supported, `failed`, `suppressed`, or `cancelled`, attempt count, timestamps, and safe failure reason.
- Retry uses bounded exponential backoff; permanent failures are visible to authorized operators.
- Templates are versioned, channel-specific, escaped, previewable, localized only if required, and may be overridden by organization only under governance.
- Sensitive content is minimized; notifications link the authenticated user to details rather than exposing unnecessary PII.
- User preferences apply to optional messages, not mandatory operational/security notices; consent and unsubscribe rules must be established.
- Duplicate scheduled notices are prevented by event/delivery identity, not mutable booleans on loans.
- Notification retention is separate from audit retention.

## Organization-specific communication

Permitted variables may include operating lab name, return location, contact details, pickup hours, and approved policy wording. Organization customization must not change security, financial, or legal meaning without policy-version approval. Sender identity and reply handling are institutional decisions.

## Failure and operations

Dashboards must expose queue age, failure rate, retries exhausted, provider outages, and template errors without showing message bodies broadly. Support staff need safe resend/suppress operations with audit. Domain workflows continue if a noncritical delivery fails; critical notification failure escalation requirements are TBD.

