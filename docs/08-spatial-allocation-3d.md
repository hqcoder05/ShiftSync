# Spatial / 3D Allocation

## Backend spatial subsystem

`LayoutController` supports layout, zones and workstations under both `/api/stores/{storeId}` and `/api/locations/{storeId}` aliases. `SpatialAllocationService` exposes allocation for a shift via `/shifts/{shiftId}/allocate-zones`. DTOs are `StoreLayoutDto`, `StoreZoneDto`, `WorkstationDto`, `SpatialAllocationResultDto`.

## Data flow

```text
layout/zones/workstations CRUD
 -> persisted spatial model
 -> shift requirements/zone links
 -> SpatialAllocationService
 -> allocation result DTO
 -> Web spatial workspace / schedule UI
```

## Web visualization

`src/features/spatial-workspace` and `src/components/spatial` render 2D/3D scenes, camera, avatars, zones, timeline and simulation. These are presentation/interaction layers. The backend allocation call chain is the only evidence for persisted spatial assignment; a Three.js/Babylon component alone is not a scheduling rule.

## Verification boundary

Whether every auto-scheduled shift invokes spatial allocation depends on the call chain in `AutoScheduleService`; if no direct call exists, spatial allocation is a separate subsystem. Runtime rendering/context-loss behavior is `[NOT VERIFIED]` without a live browser session.
