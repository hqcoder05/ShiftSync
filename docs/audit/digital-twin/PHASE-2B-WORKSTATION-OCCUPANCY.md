# BÁO CÁO KỸ THUẬT: PHASE 2B — WORKSTATION OCCUPANCY & STAFF VISUALIZATION
**Dự án:** ShiftSync — High-Performance Workforce Digital Twin  
**Phiên bản kiểm toán & triển khai:** Phase 2B (Tiếp nối PHASE-2A, WEB-001 & AUD-002)  
**Tác giả:** Senior Full-Stack Engineer, Spatial Visualization Architect  
**Trạng thái:** ✅ HOÀN TẤT & ĐÃ XÁC MINH (VERIFIED)  
**Ngày thực hiện:** 14/10/2026  

---

## 1. TỔNG QUAN ĐIỀU HÀNH (EXECUTIVE SUMMARY)

Phase 2B được triển khai nhằm mục tiêu **trực quan hóa việc phân bổ nhân sự vào các trạm làm việc (Workstation Occupancy & Staff Presence)** trên nền tảng ShiftSync 3D Digital Twin, dựa trên dữ liệu vận hành thực tế đã có của hệ thống.

### Thành tựu cốt lõi:
1. **Mở khóa trường Workstation trên Backend DTO & Service Mapper:**
   - Qua rà soát schema cơ sở dữ liệu thực tế, bảng `shift_assignment` đã có sẵn cột `workstation_id` (Flyway migration `V31__link_workstation_to_zones_and_assignments.sql`).
   - Bổ sung an toàn 2 trường `workstationId` và `workstationName` vào `ShiftAssignmentResponseDTO.java`, cập nhật các mapper trong `ShiftAssignmentService.java` và `ShiftService.java`.
   - Hoàn toàn tương thích ngược, không sửa đổi cấu trúc CSDL PostgreSQL.
2. **Engine Phân giải Trạng thái Trạm làm việc (`workstationOccupancy.js`):**
   - Phân định rõ 3 trạng thái cốt lõi:
     - `ASSIGNED`: Có phân công nhân viên xác thực liên kết với trạm (qua direct `workstationId` hoặc fallback gom nhóm theo `zoneId`).
     - `UNASSIGNED`: Đã tải dữ liệu ca làm việc thành công nhưng trạm không có nhân sự nào được gán.
     - `UNKNOWN`: Đang tải dữ liệu (`isLoading`), gặp lỗi API (`error`), hoặc chưa chọn ca làm việc (`!currentShift`). Tuyệt đối không bao giờ nhầm lẫn lỗi API hay đang tải với trạng thái trạm trống.
3. **Phân biệt Hiện diện thực tế (Actual Presence) vs Phân công theo lịch (Scheduled):**
   - Kết nối trực tiếp với API điểm danh thực tế (`GET /api/stores/{storeId}/attendance`).
   - Nhân viên chỉ được ghi nhận "ĐANG CÓ MẶT" khi `checkInTime != null && checkOutTime == null`.
   - Nếu có lịch ca nhưng chưa check-in, trạm được định danh là "THEO LỊCH CA" (Scheduled Assignment).
4. **3D Floating Tag Sprite & Mã màu Trực quan:**
   - Cập nhật `createWorkstationTagSprite` trong `FurnitureBuilder.js`:
     - **Xanh ngọc (`#10B981`):** Đang có mặt thực tế (Checked-in).
     - **Xanh dương (`#0284C7`):** Phân công theo lịch ca (Chưa check-in).
     - **Hổ phách (`#F59E0B`):** Trống (Unassigned).
     - **Xám slate (`#64748B`):** Chưa rõ / Đang tải / Lỗi (Unknown).
   - Hiển thị tên nhân viên, trạng thái điểm danh, mã trạm và tỷ lệ lấp đầy sức chứa (`occupancyCount / capacity`).
5. **Cập nhật Thẻ thông tin Inspector (CASE 1.5):**
   - [SpatialInspector.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/SpatialInspector.jsx) bổ sung thẻ thông tin "Nhân sự trực trạm (Workstation Occupancy)" hiển thị đầy đủ danh sách nhân viên, huy hiệu trạng thái điểm danh, nguồn gán (Trực tiếp / Khu vực), và sức chứa.
6. **Bảo vệ Vòng đời Bất đồng bộ & Race Conditions:**
   - Tích hợp cờ hủy bỏ (`isCurrent`) trong `SpatialWorkspace.jsx` khi tải dữ liệu trạm làm việc và điểm danh, loại bỏ hoàn toàn hiện tượng stale asynchronous response khi chuyển đổi chi nhánh hoặc ca làm việc.

---

## 2. TÁI SỬ DỤNG TRI THỨC CÓ SẴN (KNOWLEDGE REUSE & BASELINE VALIDATION)

Tuân thủ nghiêm ngặt quy trình 6 bước tại [`AGENTS.md`](file:///d:/ThucTapTotNghiep/ShiftSync/AGENTS.md) và hệ thống [`docs/agent-memory/`](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/):

| Tri thức tái sử dụng | Nguồn gốc | Ứng dụng thực tế trong Phase 2B |
| :--- | :--- | :--- |
| **Bảng `shift_assignment` & `workstations`** | Flyway Migration `V31` & CSDL PostgreSQL | CSDL đã có sẵn cột `workstation_id` và 6 bản ghi thực tế đã liên kết trạm. Tái sử dụng schema có sẵn mà không sửa đổi DB. |
| **API Điểm danh** | `AttendanceController.java` & `attendanceService.js` | Tái sử dụng endpoint `GET /api/stores/{storeId}/attendance?from={date}&to={date}` để trích xuất dữ liệu check-in/check-out. |
| **Định danh Nhân sự Chuẩn hóa** | `WEB-001` (`staffIdentity.js`) | Sử dụng `getStaffId`, `getAssignmentId`, `areSameStaff` để đối chiếu nhân sự giữa ShiftAssignment và Attendance mà không nhầm lẫn UUID. |
| **Trình dựng Mesh 3D Trạm** | `WEB-001` & `PHASE-2A` (`FurnitureBuilder.js`) | Nâng cấp hàm `createWorkstationTagSprite` nhận `occupancyInfo` để hiển thị đèn LED và nhãn thông minh. |
| **Workstation Drag Controller** | `PHASE-2A` (`WorkstationDragController.js`) | Bảo toàn 100% khả năng kéo thả, giới hạn biên và phát hiện va chạm vật lý đã kiểm chứng. |

---

## 3. THIẾT KẾ KIẾN TRÚC & TRIỂN KHAI KỸ THUẬT

### 3.1. Phân giải Trạng thái Trạm làm việc (State Resolution Engine)

```
                       ┌──────────────────────────────┐
                       │ Dữ liệu đầu vào:             │
                       │ - Workstations               │
                       │ - Shift Assignments          │
                       │ - Attendance Records         │
                       │ - Status Flags               │
                       └──────────────┬───────────────┘
                                      │
                   Is Loading / Error / No Shift Selected?
                                ├─── CÓ ───► [ Trạng thái: UNKNOWN ]
                                │            - Đèn xám slate (#64748B)
                                │            - Lý do: Đang tải / Lỗi / Chưa chọn ca
                                │
                                └─── KHÔNG
                                      │
                         Có phân công nhân sự tại trạm?
                         (Direct wsId OR Zone fallback)
                                ├─── KHÔNG ─► [ Trạng thái: UNASSIGNED ]
                                │             - Đèn hổ phách (#F59E0B)
                                │             - Nhãn: Trống (0/Capacity)
                                │
                                └─── CÓ ────► [ Trạng thái: ASSIGNED ]
                                              │
                                  Có bản ghi Attendance Check-In?
                                  (checkInTime != null && checkOutTime == null)
                                        ├─── CÓ ───► [ ĐANG CÓ MẶT (Present) ]
                                        │            - Đèn xanh ngọc (#10B981)
                                        │
                                        └─── KHÔNG ─► [ THEO LỊCH CA (Scheduled) ]
                                                     - Đèn xanh dương (#0284C7)
```

### 3.2. Mapping DTO Backend & Dữ liệu Thực tế

- **Backend DTO:**
  ```java
  public class ShiftAssignmentResponseDTO {
      // ... existing fields ...
      private UUID workstationId;
      private String workstationName;
  }
  ```
- **Backend Service Mapping:**
  ```java
  dto.setWorkstationId(assignment.getWorkstation() != null ? assignment.getWorkstation().getId() : null);
  dto.setWorkstationName(assignment.getWorkstation() != null ? assignment.getWorkstation().getName() : null);
  ```

### 3.3. Xử lý Vòng đời Bất đồng bộ trong `SpatialWorkspace.jsx`

```javascript
useEffect(() => {
  if (!activeStoreId) {
    setAttendanceRecords([]);
    return;
  }

  const queryDate = activeDate || currentShift?.date || new Date().toISOString().split('T')[0];
  let isCurrent = true;
  setIsAttendanceLoading(true);
  setAttendanceError(null);

  getStoreAttendance(activeStoreId, queryDate, queryDate)
    .then((res) => {
      if (!isCurrent) return;
      setAttendanceRecords(Array.isArray(res?.data) ? res.data : []);
    })
    .catch((err) => {
      if (!isCurrent) return;
      setAttendanceError(err?.message || 'Lỗi tải dữ liệu điểm danh');
      setAttendanceRecords([]);
    })
    .finally(() => {
      if (isCurrent) setIsAttendanceLoading(false);
    });

  return () => {
    isCurrent = false; // Ngăn chặn stale response khi đổi store / date
  };
}, [activeStoreId, activeDate, currentShift?.date]);
```

---

## 4. BẰNG CHỨNG KIỂM THỬ ĐỐI CHỨNG (VERIFICATION EVIDENCE)

### 4.1. Frontend Unit Tests (Node.js Test Runner)
Lệnh thực thi:
```bash
node --test src/features/spatial-workspace/utils/workstationOccupancy.test.js \
            src/features/spatial-workspace/scene/FurnitureBuilder.test.js \
            src/features/spatial-workspace/interaction/WorkstationDragController.test.js \
            src/features/spatial-workspace/utils/staffIdentity.test.js
```
Kết quả:
```text
▶ PHASE 2A: Workstation Layout Editor & Coordinate Tests
  ✔ toThreeCoords and toBackendCoords roundtrip is accurate (0.6361ms)
  ✔ clampCoordinates keeps positions strictly inside store floor boundaries (2.0758ms)
  ✔ checkCollision detects overlapping or too-close workstations (0.5922ms)
  ✔ selectWorkstation and clearSelection manage state accurately (1.2493ms)
  ✔ revertPosition restores original mesh coordinates on cancel or error (1.7924ms)
  ✔ handles null or missing coordinates safely by defaulting to floor level (0.1226ms)
  ✔ RBAC role check permits ADMIN and MANAGER, rejects STAFF (0.1279ms)
✔ PHASE 2A: Workstation Layout Editor & Coordinate Tests (7.6292ms)

▶ W-01 & W-03: FurnitureBuilder & Workstation Layer Tests
  ✔ isFurnitureSharedMaterial correctly identifies shared singleton materials (0.6187ms)
  ✔ buildWorkstationObject builds Barista workstation group with proper metadata (11.3925ms)
  ✔ buildWorkstationObject builds POS, Kitchen, and Retail workstations correctly (3.5361ms)
  ✔ createWorkstationTagSprite creates sprite with workstation label metadata (0.8585ms)
  ✔ Collision prevention logic (zonesWithWorkstations) works reliably (0.4261ms)
  ✔ createWorkstationTagSprite creates sprite with occupancy and staff presence (0.5361ms)
✔ W-01 & W-03: FurnitureBuilder & Workstation Layer Tests (18.5998ms)

▶ W-02: staffIdentity Helper Tests
  ✔ isValidId validates non-empty identifiers properly (3.4309ms)
  ✔ identifies pure Staff/User object vs ShiftAssignmentDTO (0.4301ms)
  ✔ getStaffId extracts correct staff UUID from pure Staff object (0.3047ms)
  ✔ getStaffId extracts staffId from ShiftAssignmentDTO without using assignment id (0.2352ms)
  ✔ getStaffId handles primitive ID strings directly (0.1944ms)
  ✔ getStaffId traverses Three.js Avatar Mesh userData (0.2114ms)
  ✔ getStaffId returns null when given invalid or empty objects (0.2212ms)
  ✔ areSameStaff correctly matches pure Staff with Assignment object (0.3146ms)
  ✔ areSameAssignment compares assignment IDs without confusing staff IDs (0.3346ms)
✔ W-02: staffIdentity Helper Tests (8.0402ms)

▶ PHASE 2B: Workstation Occupancy & Staff Visualization Engine
  ✔ 1. Workstation with direct valid staff assignment resolves to ASSIGNED (4.6582ms)
  ✔ 2. Workstation with no staff assignment resolves to UNASSIGNED when data loaded successfully (0.3569ms)
  ✔ 3. Distinguishes Scheduled Assignment from Actual Presence (Attendance check-in) (0.4949ms)
  ✔ 4. Fallback: Zone-based matching when workstationId is not explicitly tagged on assignment (0.3176ms)
  ✔ 5. Crucial rule: Never treats API error or loading as UNASSIGNED — must be UNKNOWN (0.5419ms)
  ✔ 6. Handles corrupted or empty staff objects safely without throw (0.6396ms)
✔ PHASE 2B: Workstation Occupancy & Staff Visualization Engine (9.5131ms)

ℹ tests 28
ℹ suites 4
ℹ pass 28
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 199.7235
```

### 4.2. Frontend Production Build (Vite)
Lệnh thực thi:
```bash
npm run build
```
Kết quả:
```text
vite v8.2.1 building client environment for production...
transforming...✓ 2046 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                               1.10 kB │ gzip:   0.56 kB
dist/assets/luong-BKDUcalL.png              171.96 kB
dist/assets/index-C6WN-hDp.css              294.64 kB │ gzip:  48.11 kB
dist/assets/SpatialWorkspace-Ckj_rwtG.js    243.31 kB │ gzip:  64.63 kB
dist/assets/index-CnKJFbea.js             1,575.37 kB │ gzip: 405.82 kB
✓ built in 2.74s
```

### 4.3. Backend Unit Tests (Maven)
Lệnh thực thi:
```bash
mvn test -Dtest=ShiftAssignmentServiceTest
```
Kết quả:
```text
[INFO] Running com.shiftsync.shift.service.ShiftAssignmentServiceTest
[INFO] Tests run: 19, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.701 s -- in com.shiftsync.shift.service.ShiftAssignmentServiceTest
[INFO] Results:
[INFO] Tests run: 19, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

Lệnh đối chứng bổ sung:
```bash
mvn test -Dtest=AutoScheduleAssignmentCorrectnessTest
```
Kết quả:
```text
[INFO] Tests run: 18, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

---

## 5. TỔNG KẾT & KẾ HOẠCH BÀN GIAO (CONCLUSION & NEXT ACTIONS)

1. **Kết luận kỹ thuật:**
   - Hoàn thành trọn vẹn mục tiêu **PHASE 2B: Workstation Occupancy & Staff Visualization**.
   - Trực quan hóa chính xác nhân sự tại trạm làm việc trên 3D Canvas và Inspector Drawer.
   - Phân biệt minh bạch giữa Phân công theo kế hoạch (Scheduled) và Hiện diện thực tế (Actual Checked-in).
   - Bảo toàn nguyên vẹn 100% tính năng kéo thả biên soạn mặt bằng của Phase 2A và các bản vá trước đó.
2. **Quy tắc An toàn Git:**
   - Giữ nguyên branch `quoc-backend`, baseline `c9d4df1`. Không có commit, không push, không thay đổi cấu trúc repo.
3. **Đề xuất bước tiếp theo:**
   - Hệ thống Digital Twin hiện đã hoàn thiện cả 3 tầng cốt lõi: Mặt bằng không gian (Zone/Layout), Trạm làm việc (Workstation Editor - Phase 2A) và Phân bổ hiện diện nhân sự (Occupancy Visualization - Phase 2B).
   - Sẵn sàng bàn giao cho người dùng kiểm thử trực tiếp hoặc chuyển tiếp sang các phân hệ nghiệp vụ khác (AutoSchedule, Payroll, Mobile App).
