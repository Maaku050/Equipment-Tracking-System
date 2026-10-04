# 9. Business rules

“Securely enforced” means enforcement is present in trusted repository-side code or visible security rules. No Firestore/Storage rules are present; Cloud Functions with Admin SDK are trusted but the HTTP user function lacks caller authorization.

| Rule | Source area | Enforcement | Secure? | Notes |
|---|---|---|---|---|
| Only profiles with status `active` may pass login | `app/index.tsx` | Client after Auth sign-in | No | Existing sessions are not centrally revoked |
| Role determines initial route | `app/index.tsx` | Client | No | Staff/admin share admin route |
| Admin pages permit `staff` or `admin` | `components/AdminGuard.tsx` | Client | No | No distinction between roles |
| Student must accept terms before first request | `app/user/create-transaction.tsx` | Client plus user flag write | No | Terms version/content hash not stored |
| Student due date must be today through seven days ahead | same | Client | No | Staff direct checkout does not show same maximum rule |
| Only equipment with status available and positive availability appears for request | request screens | Firestore query plus client filter | No | No atomic server recheck |
| Requested quantity cannot exceed locally observed availability | cart handlers | Client | No | Race-prone |
| Student-created transaction starts `Request`; staff-created starts `Ongoing` | two creation UIs | Client | No | Helper has boolean switch |
| Stock is reserved at request creation | creation paths | Client Firestore writes | No | Happens before approval |
| Approval changes Request to Ongoing | helper/admin UI | Client write | No | Resets borrowed date and notification flags |
| Denial restores stock and deletes request | helper/admin UI | Client batch | No | No denial record/reason |
| Partial return produces Incomplete variants | helper/maintenance | Client/server calculations | Partial | Status implementations differ |
| Good units return to availability; damaged/lost do not | completion helper | Client batch | No | Damaged/lost do not reduce total stock |
| Damage/loss notes required | TransactionAccordion | Client UI | No | Helper accepts arbitrary caller input |
| Processed return quantities must not exceed remaining | TransactionAccordion | Client UI | No | Exact equality controls final completion |
| Overdue charge is PHP 10 per calendar day | helper and maintenance function | Client and trusted function | Partial | Hardcoded; timezone handling differs |
| Damage/loss charge equals unit price × count | helper | Client | No | Uses price snapshot |
| Completed loan moves from transactions to records | helper | Mixed standalone writes + batch | No | Not atomic as a whole |
| Positive completed fine creates `fines` entry | helper | Client standalone write | No | Payment flow does not update it |
| Equipment total cannot be below borrowed count | edit equipment modal | Client | No | No rule/server invariant shown |
| Equipment with selected active transactions cannot be deleted | `equipmentActions.ts` | Client full query | No | Race and status-list gaps |
| Account password has minimum six characters | add/bulk UI and HTTP handler | Client + function input validation | Partial | Privileged endpoint caller is unauthenticated |
| Contact number uses Philippine mobile format | user UI/function | Client + function input validation | Partial | Department/country-specific |
| User role must be student/staff/admin | function/bulk validation | Function input validation | Partial | No authorized caller check |
| Scheduled reminders are once per transaction flag | overdue function | Trusted function batch | Yes for that function | Delivery itself unknown |

## Rules not found

No evidence was found for maximum concurrent loans, maximum item count, outstanding-fine borrowing block, course/year eligibility, cross-department approval, lab operating hours, holidays, renewal, waitlists, reservations for future checkout, minimum/maximum staff-created due date, fine cap, grace period, waiver authorization, or condition-based borrowability beyond equipment `status`.

## Terms-specific observations

Terms are static UI content in `app/user/termsAndCondition.tsx` and a separate acceptance modal. Acceptance stores only a boolean and timestamp, with no terms version. The text claims notifications and a fee schedule, while operational amounts remain hardcoded elsewhere. Repository code cannot establish whether this text is the governing policy.

