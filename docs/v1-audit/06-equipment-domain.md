# 6. Equipment and inventory domain

## Representation

Each `equipment` document represents an aggregate type/stock pool. `totalQuantity`, `availableQuantity`, and `borrowedQuantity` are counts. Transactions embed quantity line items pointing to the equipment ID. There is no representation of individual physical units; therefore serial numbers, per-unit condition, custody history, calibration, and maintenance events cannot be tracked.

`condition` is a single aggregate label (`good`, `fair`, `needs repair`) even when multiple units exist. `status` is separately set to `available`, `unavailable`, or `maintenance`; code does not automatically derive status from quantity or condition.

## Administrative behavior

- Add validates name/description, total quantity > 0, and price ≥ 0; initial available equals total and borrowed equals zero.
- Edit permits name/description, total, price, condition, status, and image changes. Total may not be set below current `borrowedQuantity`; available is adjusted by the total delta.
- Delete scans active transactions with selected statuses, searches embedded items client-side, best-effort deletes the image, then hard-deletes the document.
- Inventory can be searched client-side by name, description, status, or condition and printed on web.
- Details derive current borrowers from the globally loaded transactions.

No archive/soft-delete path exists. No audit record is written for equipment edits or deletion.

## Borrower visibility and discovery

The student inventory receives the entire equipment collection from `EquipmentContext`, then filters locally by text, status, condition, and “available only.” It displays price, quantities, condition, status, description, and image. The request screen separately queries only documents where `status == available`, then removes zero-available entries client-side. There are no categories, pagination, lab/department filters, or server-side full-text search.

## Quantity mutation table

| Event | Available | Borrowed | Notes |
|---|---:|---:|---|
| Add equipment | `= total` | `= 0` | Initial state |
| Student request | `- requested` | `+ requested` | Reservation occurs before approval |
| Staff direct checkout | `- requested` | `+ requested` | Starts `Ongoing` |
| Approve request | no change | no change | Stock already reserved |
| Deny request | `+ requested` | `- requested` | Request deleted |
| Good return | `+ newly returned` | `- processed` | Good units re-enter availability |
| Damaged/lost return | no increase | `- processed` | Total quantity is not reduced |
| Delete active transaction | `+ unreturned` | `- unreturned` | May treat damaged/lost accounting incorrectly depending state |
| Edit total | `+ total delta` | no change | Prevents total below borrowed in UI |

## Inventory consistency audit

The creation paths read each equipment document, compute absolute new counts, then issue a batch update. The transaction document is added before the stock batch. Firestore `runTransaction` or atomic `increment` is not used.

Consequences supported by code:

- Two simultaneous requests can both read the same available count and write conflicting absolute results (lost update/oversubscription).
- Cart validation uses a stale query snapshot and is client-only.
- Failure after transaction creation but before the stock batch leaves a transaction without its reservation; the reverse partial state can occur in other multi-step flows.
- Return processing reads equipment before a later batch commit, so concurrent returns/requests can overwrite counts.
- Multiple updates to the same equipment in one batch can be based on the same original quantity if duplicate line items ever occur.
- Damage/loss reduces borrowed but not `totalQuantity`, so `available + borrowed` can remain below total without an explicit retired/damaged stock bucket.
- No backend invariant enforces non-negative counts or `available + borrowed <= total`.

## Equipment-specific assumptions

- One global inventory namespace; no organization, campus, department, lab, room, or owner fields.
- Globally shared status and condition vocabularies.
- Philippine peso values are displayed with `₱`.
- “laboratory office” is the return/escalation location in messages and terms.
- Equipment can be valued/rented by a single `pricePerUnit`, but the semantics of `totalPrice` (fee versus asset value) are not documented.
- No cross-lab transfer, departmental eligibility, or borrowing policy model exists.

