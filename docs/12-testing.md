# Testing

## Backend

Tests cover Spring context, auth/JWT, user RBAC, shift assignment/swap, auto-schedule feasibility/correctness/fairness, quota remediation, leave balance/request/controller, attendance/controller/adjustment, payroll calculation, marketplace, notification/SSE, spatial allocation, dashboard and exception handling.

Default command: `./mvnw test` (or `mvnw.cmd test`). `pom.xml` excludes CP-SAT/benchmark classes by default; use profile `-P cpsat-benchmark` when native OR-Tools dependencies are available.

## Web

`npm run lint` and `npm run build` are the declared verification commands. There is no repository-level end-to-end test script in `ShiftSync-Web/package.json`.

## Mobile

The package exposes Expo start commands but no Jest/Detox script. Runtime verification therefore requires an Expo session and backend account. API test hub exists as a diagnostic screen, not an automated test suite.

## Limits

Static tests do not prove external Redis/Firebase connectivity, production data, device camera/GPS permissions or browser/WebGL context loss. Those are `[NOT VERIFIED]` without the corresponding environment.
