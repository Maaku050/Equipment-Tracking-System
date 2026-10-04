# 3. Navigation and user roles

## Navigation tree

```text
App Stack (app/_layout.tsx)
├── index                         Login / password reset
├── admin/                       Drawer; authenticated staff/admin UI
│   ├── index                    Dashboard / active transactions
│   ├── reports                  History and charts
│   ├── inventory                Equipment administration
│   ├── users                    Borrower/user administration
│   └── TestMaintenanceScreen    Hidden drawer item; route still exists
└── user/                        Drawer; intended student UI
    ├── index                    Dashboard / active transactions
    ├── records                  Borrowing history
    ├── inventory                Inventory discovery
    ├── termsAndCondition        Static terms
    ├── create-transaction       Hidden drawer item
    └── edit-profile             Hidden drawer item
```

Both Drawer layouts are responsive: permanent on large screens and slide-out on smaller screens. `create-transaction`, `edit-profile`, and the maintenance test route are hidden from drawer menus but addressable routes. Expo config declares the custom scheme `starterkitexpo`; no route-specific deep-link mapping or inbound-link handling was found.

## Role assignment and retrieval

- Roles are strings on `users/{uid}.role` and, when created by the HTTP function, also Firebase Auth custom claims.
- The single-user UI offers `student` or `admin`; bulk import and server types also accept `staff`.
- Login and `AuthContext` query `users` where the stored `uid` field equals the Firebase Auth UID.
- Navigation uses the Firestore role: `admin` and `staff` go to `/admin`, `student` to `/user`.
- No role-management UI was found after account creation; user detail editing does not update role or custom claims.

## Role-permission matrix (client-observed)

| Capability | Student | Staff | Admin | Enforcement evidence |
|---|---:|---:|---:|---|
| Login/reset/logout | Yes | Yes | Yes | Firebase Auth client |
| Student dashboard/inventory/history/profile | Intended | Not menu-linked | Not menu-linked | `/user` has no role guard |
| Submit request | Yes | Technically route-addressable | Technically route-addressable | User data/current Auth checks, no role check |
| View all users/equipment/transactions/records | No intended access | Yes | Yes | `AdminGuard` allows staff/admin |
| Approve/deny requests | No | Yes | Yes | Admin transaction UI only |
| Create direct ongoing transaction | No | Yes | Yes | Admin transaction UI |
| Process return/damage/loss | No | Yes | Yes | Admin transaction UI |
| Add/edit/delete equipment | No | Yes | Yes | Admin UI + direct client writes |
| Add/edit/delete users | No | Yes | Yes | Same AdminGuard; HTTP endpoint itself has no caller check |
| Create an admin | No | Yes | Yes | Single-add UI offers admin to both roles |
| Bulk-create staff/admin | No | Yes | Yes | Spreadsheet accepts all three roles |
| Clear recorded fines | No | Yes | Yes | User details modal |
| Reports and print | Own history | All history | All history | Client filtering/guard |
| Run manual maintenance | Any authenticated caller can invoke callable | Yes | Yes | Callable checks authentication only, not role |

## Authorization behavior

### Current behavior

`AdminGuard` redirects unauthenticated users and roles other than `admin`/`staff`. All displayed admin pages use it. Login rejects profiles whose status is not `active`. The user-management function writes custom claims.

### Security concern

- No Firestore or Storage rules are included, so secure data-plane enforcement cannot be verified.
- `AdminGuard` is client-side navigation control, not a security boundary.
- The HTTP `userManagement` API has no token verification or role check and enables privileged account operations directly.
- The user Drawer has no role/status guard. Any authenticated session reaching those routes relies on screen-level assumptions, not centralized authorization.
- `AuthContext` loads `status` but does not sign out or block a user when an existing session's profile becomes inactive/suspended.
- The maintenance callable accepts every authenticated user, so a student can initiate collection-wide maintenance.
- Firestore custom claims are not consumed by client authorization code. Whether rules use them is unknown because rules are absent.

## Role-related ambiguity

`staff` is modeled and routed identically to `admin`, but is absent from the single-user creation UI. The repository provides no policy explaining whether staff should manage admins, users, fines, or inventory. Therefore the broad equality is a code fact, while intended governance is unknown.

