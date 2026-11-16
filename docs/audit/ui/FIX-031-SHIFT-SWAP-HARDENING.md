# FIX-031: Shift Swap Hardening (Backend & Web)

## Summary
Hardened the Shift Swap flow across `shiftsync-backend` and `ShiftSync-Web` to fix multi-slot false conflicts, late constraint validation, read-path DB writes under `SERIALIZABLE` isolation, missing DTO `createdAt`, and Web staff response/modal gaps.

## Backend Changes (`shiftsync-backend`)
- **[`ShiftSwapRequestRepository.java`](../../shiftsync-backend/src/main/java/com/shiftsync/shift/repository/ShiftSwapRequestRepository.java)**:
  - Added `findByStatusAndShiftAndStaff(SwapStatus, UUID shiftId, UUID staffId)` to scope pending-swap conflict checks by `(shiftId, staffId)` across both `fromShift` and `toShift`.
  - Added `findByStatus(SwapStatus)` for scheduled stale-request expiration.
- **[`ShiftSwapService.java`](../../shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftSwapService.java)**:
  - Updated `createSwapRequest` to reject `WORKFORCE_SHARING` assignments early, check pending conflicts per `(shiftId, staffId)` across `fromShift`/`toShift` while expiring and ignoring stale requests, and run shared `validateSwapConstraints(...)` (availability/blackout, approved leave, overlap/rest/weekly hours, and swap skill) at creation time as well as approval time.
  - Changed `getMySwapRequests` and `getStoreSwapRequests` to `@Transactional(readOnly = true)` with no DB writes; `mapToDTO` projects `SwapStatus.EXPIRED` when a `PENDING` request has a started shift and populates `createdAt`.
  - Added `@Scheduled(fixedDelay = 300000)` `expireStalePendingSwaps()` to persist `EXPIRED` status asynchronously.
- **[`ShiftSwapRequestDTO.java`](../../shiftsync-backend/src/main/java/com/shiftsync/shift/dto/ShiftSwapRequestDTO.java)**:
  - Added `createdAt` (`OffsetDateTime`).

## Web Changes (`ShiftSync-Web`)
- **[`MarketplacePage.jsx`](../../ShiftSync-Web/src/pages/MarketplacePage.jsx)**:
  - Loaded `getMySwapRequests()` for non-manager staff and added `handleRespondSwap(req, accept)` using `respondToSwapRequest` so staff can accept/reject incoming swaps and cancel their own pending swaps on Web.
  - Filtered the Create Swap modal shift dropdowns to `PUBLISHED` future shifts only and fixed colleague `<option>` value to `e.staffId || e.id`.
  - Removed the erroneous `"Lỗi: "` prefix from the reject-swap success toast.

## Verification
- Backend: `cd shiftsync-backend && ./mvnw test "-Dtest=ShiftSwapServiceTest,ShiftSwapServiceQaTest"`
- Web: `cd ShiftSync-Web && npm run build`
