# Authentication and Authorization

## Login lifecycle

1. Client sends credentials to `POST /api/auth/login`.
2. `AuthService` validates user/password and creates access/refresh JWT.
3. Client stores tokens (Web client storage implementation; Mobile AsyncStorage keys `accessToken`, `refreshToken`).
4. Axios sends bearer token; backend `JwtAuthFilter` builds `Authentication`.
5. Mobile startup attempts `/api/auth/refresh`; a 401 clears tokens.

## Authorization layers

* `SecurityConfig` defines public/authenticated request rules.
* `JwtAuthFilter` authenticates identity.
* Method/controller role rules protect admin/manager/staff operations.
* `StoreAccessService` prevents cross-store access.
* Domain services enforce ownership/state beyond URL-level role.

## Roles

ADMIN has global administration capabilities; MANAGER operates allowed store workflows; STAFF operates personal schedule/availability/leave/attendance/payroll and permitted marketplace/workforce actions. The exact allowed operation is the implementation in each controller/service, not merely the label.

## Security-sensitive endpoints

User profile `/me`, shifts `/me/shifts`, payslips `/me/payslips`, swaps and workforce proposals derive identity from principal. Test controllers under `shared/test` are diagnostic and should not be treated as production business APIs.
