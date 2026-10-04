# 8. Fines, payments, and accountability

## Starting point

V1 hardcodes a daily overdue amount and duplicates inconsistent fine state across transactions, records, and fines ([V1 data model](../v1-audit/04-data-model.md)). V2 must not migrate that inconsistency into multiple authorities. Whether monetary fines remain is unresolved.

## Decision branches

1. **No monetary fines:** track obligations, overdue events, damage/loss accountability, and borrowing restrictions only.
2. **Assessments only:** eLabTrack calculates/records charges but external finance records payment.
3. **Assessments and internal settlement record:** authorized staff record externally received/waived/adjusted settlements with references.
4. **Integrated payments:** future connection to cashier/student accounts/payment provider.

Option 2 or 3 is the maximum reasonable MVP unless an approved integration and finance controls exist.

## Authoritative conceptual model

- **Charge policy version:** effective rule and scope that explains a calculation.
- **Charge:** immutable-origin assessment against a borrower/loan/return disposition with amount, currency, reason, status, and policy version.
- **Charge adjustment:** append-only increase/decrease/waiver/reversal with actor, authority, reason, and reference; never erase original assessment.
- **Payment:** evidence of money received, only if eLabTrack is authorized to record it; may be external-reference-only.
- **Payment allocation:** amount applied to one or more charges.

The outstanding balance is derived from charges plus adjustments minus allocated/reversed payments. “Revenue” is used only for verified payments, never assessments.

## Requirements if charges are retained

- Define triggering events: overdue, lost, damaged, replacement, or other approved reasons.
- Store currency and decimal amounts safely; no floating-point money arithmetic.
- Version policy and retain the calculation inputs/effective dates.
- Make charge creation idempotent per source event.
- Restrict assess/adjust/waive/settle capabilities separately from return processing.
- Require reason and audit event for adjustment/waiver/reversal.
- Never hard-delete financial accountability records after issue.
- Define dispute, correction, and refund/reversal processes.
- Determine whether outstanding charges affect eligibility and how exceptions work.
- Protect financial/PII reports by scope and retention policy.

## Damage/loss relationship

A return disposition is the factual record. A charge is a subsequent policy outcome. Recording damage/loss must not require or imply a monetary fine. Unit value, depreciated/replacement cost, caps, shared responsibility, and waiver policy require finance/governance confirmation.

## Migration requirement

V1 `records.fineAmount`, `fines`, and payment-like zeroing cannot be assumed consistent. Migration must preserve raw source values and provenance, classify confidence, and require an authorized reconciliation decision before opening balances in V2. Unresolved legacy amounts may be imported as historical/unverified rather than collectible charges.

