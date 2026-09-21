# Business Rules

## User and store isolation

Authenticated identity comes from JWT, not a client-supplied user id. Store-scoped services use `StoreAccessService`/employment checks. Exact role annotations are in controllers/security config; do not infer permission from UI visibility alone.

## Assignment eligibility

`ShiftValidationService`, `ShiftAssignmentService` and `AutoScheduleService` validate active staff, store/workforce access, required skill and expiration, availability, blackout/leave overlap, existing shift overlap, rest and working-hour/contract constraints. A failed hard constraint prevents assignment; diagnostics/shortage DTOs explain unmet requirements.

## Marketplace and workforce

Marketplace publish makes an open shift claimable; claim is a distinct transition that creates/updates assignment and can return 400/403/409 when state or eligibility is invalid. Workforce request/proposal is cross-store coordination and has its own request/proposal ids and response states.

## Leave and attendance

Leave request lifecycle is submitted/approved/rejected/cancelled according to service checks and leave balances. Attendance supports QR, scan, selfie and adjustment approval; location/time constraints are enforced by backend services.

## Payroll

`PayrollCalculationService` is the only business calculator. Mobile/Web render backend `PayrollDTO`/payslip responses and must not estimate salary from shifts when payslips are empty.

## Status

Rules explicitly visible in service/controller code are `[IMPLEMENTED]`. Exact thresholds/weights not obvious from signatures are documented as `[INFERRED]` only after reading the method body; runtime database-dependent outcomes remain `[NOT VERIFIED]`.
