# 12. Dependencies, build, and deployment

## Application dependencies

Versions below are declared in root `package.json`.

| Group | Packages | V1 usage |
|---|---|---|
| Runtime | Expo `^54.0.7`, React `19.1.0`, React Native `0.81.5`, RN Web `^0.21.0` | Android/iOS/web runtime |
| Navigation | Expo Router `~6.0.4`, React Navigation Native/Drawer v7, screens, safe-area | File routes and responsive drawers |
| Firebase | Firebase JS `^12.8.0` | Auth, Firestore, Storage, Functions |
| UI/style | Gluestack core/utils, NativeWind 4, Tailwind 3, Lucide, Expo vector icons, Legend Motion | Local UI component implementation and icons |
| Native interactions | datetime picker, image picker, document picker, reanimated, worklets, bottom sheet | Dates, photos, spreadsheets, animation/sheets |
| Reports | chart kit `^6.12.0`, SVG `^15.12.1`, `xlsx ^0.18.5` | Charts, print data preparation, Excel user workflows |
| Development | TypeScript `~5.9.2`, Jest 29, jest-expo 54, Babel | Typecheck/test/transpile tooling |

No QR/barcode package, notification SDK, validation framework, date/time library, backend API client framework, or state-management package beyond React is declared.

## Functions dependencies

`createUser/functions` targets Node 20 with Firebase Functions v4/Admin v12, Express 4, and CORS. `overdueChecker/functions` targets Node 24 with Firebase Functions v7/Admin v13 and also declares `graphql`, for which no source import was found. The maintenance project has older ESLint 8 tooling while the user project has ESLint 9 tooling.

This version/runtime split is factual deployment complexity. Compatibility with currently deployed Firebase runtimes cannot be established without the Firebase project state.

## Reasonably verifiable dependency concerns

- Both `package-lock.json` and `yarn.lock` are tracked at root; repository instructions do not select one. Installed `node_modules/.package-lock.json` suggests npm was used locally, not necessarily in deployment.
- `@react-native-async-storage/async-storage`, `@react-aria/utils`, `react-aria`, `react-stately`, `dom-helpers`, `expo-linking`, `expo-splash-screen`, and `expo-system-ui` have no direct first-party source import in the inspected repository. Some may be transitive/peer requirements or used by Expo/config; they are “potentially unused,” not proven removable.
- `ProgressChart` is imported by `reports.tsx` but no JSX use was found.
- `graphql` in the maintenance function manifest has no source import.
- `react-test-renderer` is declared `19.0.0` while React is `19.1.0`, a test-tool version mismatch.
- `@gorhom/bottom-sheet` is an alpha declaration (`^5.0.0-alpha.11`) but is used by a local UI primitive. No conclusion about runtime stability is made.
- Firebase is tightly coupled throughout UI modules; it is not isolated behind a repository/service layer.

No dependency was upgraded or removed. A network-based vulnerability/deprecation audit is outside this static repository baseline and was not needed to establish current architecture.

## Root build and run commands

| Script | Behavior |
|---|---|
| `npm start` | Expo development server |
| `npm run android` / `ios` / `web` | Expo platform development target |
| `npm run build` / `build:preview` | Static web export to `dist` |
| `npm test` | Jest watch-all |
| `npm run deploy:web` | Expo web export, then Firebase deploy |

There is no root `lint` or `typecheck` script, though `npx tsc --noEmit` is applicable. No EAS build configuration, native credentials, app store bundle identifiers, or release channels are present.

## Expo configuration

`app.json` uses generic `starter-kit-expo` name/slug/scheme and version `1.0.0`, portrait orientation, new architecture, icons/splash, iPad support, Android edge-to-edge, and Metro static web output. Plugins: Expo Router, Web Browser, and Font. Typed routes are experimental-enabled.

The configured app name differs from the UI product name eLabTrack. Android package/application ID and iOS bundle identifier are not specified in the repository.

## Firebase deployment topology

```text
Root Firebase project alias -> one named Firebase project
├── root firebase.json           Hosting: dist, SPA rewrite to index.html
├── createUser/firebase.json     Functions codebase "default", Node 20 manifest
└── overdueChecker/firebase.json Functions codebase "default", Node 24 manifest
```

Both nested projects use the same Firebase project alias and the same codebase name `default`. They are deployed from separate directories. Whether one deployment can delete/replace functions managed by the other requires deployment history/configuration not in the repository and should be verified operationally.

The application initializes callable functions in `asia-southeast1`, while user-management URLs are hardcoded to `us-central1`. Hosting deploys static web only. No CI/CD, Docker, release automation, or infrastructure-as-code beyond Firebase configs was found.

## Environment and secrets handling

- No `.env` files, environment variable reads, or dev/stage/prod config split were found.
- Client Firebase identifiers and project-specific function URLs are committed in source.
- `config/cloudFunctions.ts` contains placeholders for production/local endpoints, but the UI callers do not use it.
- No service-account file/private key was found in tracked first-party files.
- Firebase rules and indexes are not source-controlled.

The actual deployed extensions, SMTP/email provider, billing plan, secrets, function environment variables, and release promotion process are unknown.

