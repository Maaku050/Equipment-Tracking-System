# 13. V1 feature matrix

| Feature | User role | Status | Primary screen/module | Primary data source | Major dependencies | Notes |
|---|---|---|---|---|---|---|
| Email/password login | All | Implemented | `app/index.tsx` | Firebase Auth + `users` | Firebase Auth/Firestore | Requires active profile |
| Password reset | All | Implemented | `app/index.tsx` | Firebase Auth | Firebase Auth | No custom confirmation route |
| Public sign-up | Public | Not found | — | — | — | Admin provisioning only |
| Email verification | All | Not found | — | Firebase Auth | — | Function creates unverified accounts |
| Role-based landing | All | Implemented | `app/index.tsx` | `users.role` | Expo Router | Staff/admin share destination |
| Secure backend role authorization | All | Present but unclear | Rules not present | Unknown deployed rules | Firebase | HTTP user API demonstrably lacks it |
| Student dashboard | Student | Implemented | `app/user/index.tsx` | transactions/records/users | Contexts | Client-filters global data |
| Browse inventory | Student | Implemented | `app/user/inventory.tsx` | equipment | Firestore | Search/status/condition/availability |
| Category/lab filters | Student | Not found | — | — | — | No fields or UI |
| Submit borrow request | Student | Implemented | `app/user/create-transaction.tsx` | users/equipment/transactions | Firestore/Functions | Reserves stock immediately |
| Accept borrowing terms | Student | Implemented | Terms modal/request | users | Firestore | No terms version |
| Cancel own request | Student | Not found | — | — | — | Denial is staff action |
| View active loans | Student | Implemented | dashboard | transactions | Firestore | Multiple status filters |
| View history/fines | Student | Implemented | `app/user/records.tsx` | records | Firestore | Global collection downloaded first |
| Edit own profile/image | Student | Implemented | `app/user/edit-profile.tsx` | users/Storage | Firestore/Storage/Image Picker | Direct client writes |
| Approve/deny requests | Staff/Admin | Implemented | admin dashboard | transactions/equipment/notifications | Firestore | Denial deletes request |
| Create direct checkout | Staff/Admin | Implemented | add transaction modal | users/equipment/transactions | Firestore | Starts Ongoing |
| Partial return | Staff/Admin | Implemented | TransactionAccordion | transactions/equipment | Firestore | Cumulative quantities |
| Damage/loss capture | Staff/Admin | Implemented | TransactionAccordion | transactions/records/fines | Firestore | Notes and unit-price fines |
| Transaction hard delete | Staff/Admin | Implemented | admin dashboard | transactions/equipment | Firestore | No history; restoration edge case |
| Add/edit/delete equipment | Staff/Admin | Implemented | inventory/modals | equipment/Storage | Firestore/Storage | Aggregate stock only |
| Equipment archive | Staff/Admin | Not found | — | — | — | Hard delete only |
| Individual asset units/QR | All | Not found | — | — | — | No serial/QR library or schema |
| Maintenance work orders | Staff/Admin | Not found | — | equipment status only | — | “maintenance” is a status only |
| Single account creation | Staff/Admin | Implemented | AddUserModal | Auth/users/Storage | HTTP function | UI offers student/admin |
| Bulk account import | Staff/Admin | Implemented | BulkImportUsersModal | Excel → HTTP function | Document Picker/XLSX | Plaintext initial passwords |
| Bulk account deletion | Staff/Admin | Implemented | BulkDeleteUsersModal | Excel → HTTP function | Document Picker/XLSX | Email list |
| Suspend/inactivate profile | Staff/Admin | Partially implemented | user details | users | Firestore | UI type omits suspended; sessions not revoked |
| Fine clearing | Staff/Admin | Partially implemented | user details | records | Firestore | Does not update `fines` or `finePaid` |
| Scheduled due maintenance | System | Implemented | overdue function | transactions | Cloud Scheduler/Functions | One global batch per stage |
| Approval/denial email queue | System | Implemented | helper | notifications | Firestore | Delivery consumer not found |
| Due/reminder/overdue queue | System | Implemented | overdue function | transactions/notifications | Scheduler/Firestore | Delivery consumer not found |
| Push/local notifications | Student | Not found | — | — | — | No SDK/tokens |
| Admin archived-record report | Staff/Admin | Implemented | `app/admin/reports.tsx` | records | Chart Kit | Client aggregation |
| Inventory/borrower print | Staff/Admin | Implemented (web) | admin inventory/users | contexts | browser print | Not native export |
| Transaction CSV/XLSX export | Staff/Admin | Not found | — | — | — | XLSX only for user admin |
| Immutable audit log | All | Not found | — | — | — | Snapshots/overwrites/deletes |
| Multi-department tenancy | All | Not found | — | — | — | No scope fields |
| Offline workflow/retry | All | Present but unclear | Firebase defaults | Firebase | — | No explicit implementation |

