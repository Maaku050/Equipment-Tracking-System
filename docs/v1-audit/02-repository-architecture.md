# 2. Repository architecture

## Meaningful repository map

```text
app/                         Expo Router routes
  _layout.tsx                Root Stack: login, admin, user
  index.tsx                  Login/password reset
  admin/                     Staff/admin Drawer application
  user/                      Student Drawer application and hidden detail routes
_modals/                     Large workflow modals for users, equipment, transactions, terms
_helpers/
  firebaseHelpers.ts         Transaction/status/fine/notification data logic
  equipmentActions.ts        Guarded equipment deletion
_types/                      Legacy/duplicate transaction types
context/                     Auth plus collection-wide real-time state providers
components/                  Guards, transaction UI, pagination, date picker, theme utilities
components/ui/               Generated/local Gluestack primitives
firebase/firebaseConfig.js   Firebase client initialization (committed values omitted here)
config/cloudFunctions.ts     Placeholder endpoint configuration; not used by main callers
assets/                      Logos, app icons, splash, font, custom icon components
createUser/                  Firebase Functions project for HTTP user lifecycle
overdueChecker/              Firebase Functions project for scheduler/callable maintenance
dist/                        Generated web export (ignored build output)
firebase.json                Firebase Hosting only
app.json                     Expo app configuration
package.json                 Root application manifest/scripts
tsconfig.json                Strict Expo TypeScript configuration and @ alias
babel.config.js              Expo, NativeWind, module resolver, worklets
metro.config.js              NativeWind-enabled Metro configuration
tailwind.config.js/global.css Styling configuration
package-lock.json/yarn.lock  Two root lockfiles (ambiguous package-manager authority)
```

## Entry points and navigation composition

- `package.json#main` is `expo-router/entry`.
- `app/_layout.tsx` is the root Stack.
- `app/index.tsx` is the unauthenticated landing/login route.
- `app/admin/_layout.tsx` and `app/user/_layout.tsx` mount Drawer navigators and context providers.
- Each Drawer layout independently mounts `AuthProvider`, `TransactionProvider`, `EquipmentProvider`, `RecordsProvider`, and `UsersProvider`; moving between route groups can reconstruct all listeners.
- `createUser/functions/src/index.ts` exports `userManagement`.
- `overdueChecker/functions/src/index.ts` exports `dailyTransactionMaintenance`, `manualTransactionMaintenance`, and `testFunction`.

## Screen/module inventory

| Route/module | Responsibility |
|---|---|
| `app/admin/index.tsx` | Active transactions, status/search filtering, pagination, add/approve/deny/delete/return |
| `app/admin/inventory.tsx` | Inventory search, detail/edit/delete, add, web print |
| `app/admin/users.tsx` | Borrower search/filter, fines N+1 lookup, single/bulk user administration, web print |
| `app/admin/reports.tsx` | Archived records, filters, charts, web print |
| `app/admin/TestMaintenanceScreen.tsx` | Hidden diagnostic calls to maintenance/test callables |
| `app/user/index.tsx` | Student profile summary and active transaction dashboard |
| `app/user/create-transaction.tsx` | Request creation and terms acceptance |
| `app/user/inventory.tsx` | Read-only equipment discovery and filters |
| `app/user/records.tsx` | Own archived history and fines |
| `app/user/edit-profile.tsx` | Own profile and profile image updates |
| `app/user/termsAndCondition.tsx` | Static terms display |

The `_modals` directory contains workflow components rather than routes: add/edit/details equipment, add/details users, bulk spreadsheet import/delete, staff-created transaction, and terms acceptance.

## State management

| State kind | Implementation | Persistence/scope |
|---|---|---|
| Authentication | Firebase Auth plus `AuthContext` | Firebase SDK default persistence; no explicit persistence adapter |
| Global domain lists | Four React contexts with `onSnapshot` | In memory; full collection real-time listeners |
| Derived statistics | Recomputed in each context | In memory |
| Filters/forms/modals | Component `useState`, `useMemo`, URL search params | Route/component lifetime |
| User terms flag | Firestore `users` document | Persistent |
| AsyncStorage | Dependency present but no application import found | Not used |

There is no query cache, normalized client store, offline queue implementation, or explicit Firestore offline configuration. Firebase SDK platform defaults may apply, but the repository does not establish offline behavior.

## UI/data coupling

Direct Firestore and Storage calls occur in screens and modals, including transaction creation, equipment/user edits, fine clearing, and image deletion. `_helpers/firebaseHelpers.ts` provides some reusable operations but is not the exclusive data layer. The same transaction constructor and stock mutation pattern appears in three locations. This makes authorization, validation, transactionality, and error semantics dependent on each UI path.

## Error/loading behavior

- Contexts expose `loading` and a generic error string; screens render spinners, empty states, or alerts.
- Most write flows use `try/catch` and a generic user alert while logging the original error.
- There is no centralized error boundary, retry/backoff policy, structured telemetry, or offline-specific message.
- “Refresh” controls often wait one second while snapshot listeners already own the data; they do not force a server refresh.
- Several multi-step operations can partially succeed: transaction document before stock batch, equipment document before image, old image deletion before replacement, receipt/record/fine writes outside the stock batch, and Auth/Storage/Firestore user deletion in sequence.
- Transaction creation deliberately treats maintenance-call failure as noncritical.

## Testing infrastructure and status

The root config declares Jest with `jest-expo`, and the maintenance project depends on `firebase-functions-test`. No unit, integration, UI, end-to-end, or emulator test files/configuration were found. The root `test` script runs watch mode rather than a CI-friendly one-shot. No Firebase emulator configuration is present at the root; the maintenance project has a Functions-only serve script.

Critical untested workflows include authorization, account lifecycle, concurrent stock reservation, approval/denial, partial/final returns, fine calculation/payment, history archival, notification idempotency, and Storage cleanup.

## Generated and potentially stale artifacts

Both functions projects contain compiled `lib/` output and installed `node_modules/` locally. Root `dist/` and Expo/Firebase caches also exist. Source of truth for audit conclusions is TypeScript under `src/`, not generated JavaScript. The repository has only 172 tracked files; the large working directory is mostly dependency/build material.

