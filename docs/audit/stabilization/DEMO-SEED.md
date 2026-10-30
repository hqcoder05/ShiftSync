# Demo data for full-web walkthrough

The seed is opt-in and only runs when Spring profile `demo` is active. It uses fixed IDs and `ON CONFLICT DO NOTHING`; it adds records but never deletes, resets, or overwrites existing ones.

## Start with Docker

1. Copy `shiftsync-backend/.env.example` to `shiftsync-backend/.env` and provide real local secrets.
2. In PowerShell, use a disposable database/volume and set:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'prod,demo'
docker compose up --build
```

3. Open the web client and sign in with one of the demo users below. All demo accounts use password `password123` and are intended only for an isolated local database.

| Account | Role | What to inspect |
|---|---|---|
| `manager.demo@shiftsync.local` | Manager | Dashboard, Schedule, Publish, Demand, Marketplace, 3D store, approvals |
| `anh.demo@shiftsync.local` | Staff / Barista | Today’s published shift, active attendance and 3D avatar |
| `ha.demo@shiftsync.local` | Staff / Cashier | Published shift, attendance adjustment notification |
| `lan.demo@shiftsync.local` | Staff / Waiter | Pending leave request |

## Data coverage

- One coffee store, four role skills, seven employments and mixed gender/avatar data.
- Four zones and three workstations for the Interactive Store Explorer.
- Completed, active, published, draft and open-understaffed shifts.
- Shift requirements, assignments, attendance, pending attendance adjustment, leave, availability, payroll, staffing norms and notifications.

## Reset

Use a fresh disposable PostgreSQL volume/database. The startup seed deliberately does not reset data so that changes made during a walkthrough remain visible after restart.
