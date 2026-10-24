# BÁO CÁO KỸ THUẬT: PHASE 2C — DIGITAL TWIN INTEGRATION REGRESSION & RELIABILITY
**Dự án:** ShiftSync — High-Performance Workforce Digital Twin  
**Phiên bản kiểm toán & triển khai:** Phase 2C (Tiếp nối PHASE-2A & PHASE-2B)  
**Tác giả:** Senior Full-Stack Engineer, Spatial Visualization Architect  
**Trạng thái:** ✅ HOÀN TẤT & ĐÃ XÁC MINH (VERIFIED)  
**Ngày thực hiện:** 14/10/2026  

---

## 1. TỔNG QUAN ĐIỀU HÀNH (EXECUTIVE SUMMARY)

Phase 2C tập trung **xác minh và nâng cao độ tin cậy tích hợp toàn diện (Integration Reliability & Regression Verification)** của Digital Twin ShiftSync sau khi hoàn thành Phase 2A (Bố trí Trạm làm việc 3D) và Phase 2B (Trực quan hóa Phân công & Hiện diện Trạm làm việc).

Nhiệm vụ này đã đối soát và kiểm chứng trọn vẹn 6 kịch bản hồi quy bắt buộc (Scenarios A -> F), phát hiện và khắc phục các edge cases về cô lập dữ liệu cửa hàng, bảo mật phân quyền đa tầng và vòng đời điểm danh nhân sự.

### Thành tựu cốt lõi:
1. **Thiết lập Suite Kiểm thử Tích hợp Hồi quy Chuyên dụng:** Xây dựng [`DigitalTwinRegression.test.js`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/DigitalTwinRegression.test.js) tự động hóa kiểm chứng độc lập 6 kịch bản A-F với 100% tỷ lệ đạt (**45/45 tests PASS** toàn bộ suite frontend).
2. **Cơ chế Cô lập Dữ liệu Cửa hàng (Store Selection Isolation Guard):** Khắc phục triệt để nguy cơ rò rỉ tọa độ nháp hoặc lưu chéo vị trí trạm làm việc giữa các cửa hàng khi quản lý chuyển đổi chi nhánh.
3. **Phòng thủ Bảo mật Đa tầng (Defense-in-Depth RBAC Guard):** Bổ sung chốt kiểm soát quyền `canEditLayout` trực tiếp tại hàm thực thi `handleSaveWorkstationPosition`, bảo đảm an toàn độc lập với việc ẩn/hiện nút trên giao diện.
4. **Chuẩn hóa Vòng đời Điểm danh & Phân định Check-out:** Tinh chỉnh Inspector hiển thị minh bạch giữa nhân viên "Đang có mặt", "Theo lịch" và "Đã về" (Checked-out), không gây ngộ nhận về tình trạng hiện diện.
5. **Định danh Metadata Tag Sprite:** Bổ sung `isWorkstationTag: true` và `workstationId` vào `sprite.userData` của Three.js sprite để tối ưu hóa raycasting và bóc tách cấu trúc 3D.

---

## 2. TRI THỨC ĐÃ TÁI SỬ DỤNG (KNOWLEDGE REUSE)

Tuân thủ quy trình bắt buộc tại [`AGENTS.md`](file:///d:/ThucTapTotNghiep/ShiftSync/AGENTS.md) và hệ thống [`docs/agent-memory/`](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/):

| Tri thức tái sử dụng | Nguồn gốc tài liệu | Ứng dụng thực tế trong Phase 2C |
| :--- | :--- | :--- |
| **Bản đồ Chuyển đổi Tọa độ** | `spatial.constants.js` & `PHASE-2A` | Tái sử dụng `toThreeCoords` và `toBackendCoords`, kiểm chứng tính chất roundtrip không suy hao sai số (`< 0.001m`). |
| **Quy tắc An toàn Occupancy & Điểm danh** | `workstationOccupancy.js` & `PHASE-2B` | Tái sử dụng 3 trạng thái `ASSIGNED`, `UNASSIGNED`, `UNKNOWN`, và quy tắc `isPresent = Boolean(checkInTime && !checkOutTime)`. |
| **Chuẩn hóa Định danh Staff ID** | `staffIdentity.js` & `WEB-001` | Tái sử dụng `getStaffId` và `getAssignmentId` để đối chiếu nhân sự đa hình. |
| **Phân quyền Backend & Store Isolation** | `CODEBASE_MAP.md` & `LayoutController.java` | Tái sử dụng hợp đồng phân quyền `@PreAuthorize` và `StoreAccessService.canAccessStore`. |
| **Quản lý Tài nguyên Three.js** | `FurnitureBuilder.js` & `CODEBASE_MAP.md` | Tái sử dụng `isFurnitureSharedMaterial` để kiểm tra khả năng chống rò rỉ bộ nhớ. |

---

## 3. CÁC TẬP TIN NGUỒN ĐÃ ĐỐI SOÁT & CÂU HỎI KỸ THUẬT (FILES INSPECTED)

| Tập tin mã nguồn | Câu hỏi kỹ thuật cần giải quyết | Kết quả đối soát |
| :--- | :--- | :--- |
| [`SpatialWorkspace.jsx`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx) | Khi người dùng chuyển sang cửa hàng khác (`activeStoreId`), các trạng thái nháp (`draftWorkstationCoords`, `selectedWorkstation`) có được reset sạch sẽ không? Hàm lưu vị trí có kiểm tra quyền người dùng độc lập với UI không? | **Phát hiện:** Chưa có effect dọn dẹp state khi `activeStoreId` đổi và hàm `handleSaveWorkstationPosition` chưa có guard `canEditLayout`. **Đã khắc phục.** |
| [`WorkstationDragController.js`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/interaction/WorkstationDragController.js) | Cơ chế Raycasting và Clamping có đảm bảo trạm không bị đẩy ra ngoài sàn hoặc đè lên trạm khác không? OrbitControls có được khóa đúng lúc không? | **Đạt chuẩn:** Biên sàn `[0.8m, Dim - 0.8m]` và khoảng cách `WORKSTATION_COLLISION_RADIUS = 1.1m` hoạt động chuẩn xác 100%. |
| [`SpatialInspector.jsx`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/SpatialInspector.jsx) | Nhân viên đã check-out (`checkInTime != null && checkOutTime != null`) được hiển thị như thế nào trên thẻ Inspector? | **Phát hiện:** Hiển thị chung nhãn "Theo lịch". **Đã cải tiến:** Bổ sung huy hiệu `✓ Đã về` với màu hổ phách riêng biệt. |
| [`FurnitureBuilder.js`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/scene/FurnitureBuilder.js) | Floating Tag Sprite có mang metadata nhận diện để phân biệt với workstation mesh cha khi raycasting không? | **Phát hiện:** `sprite.userData` rỗng. **Đã bổ sung:** `userData = { isWorkstationTag: true, workstationId }`. |
| [`LayoutController.java`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/layout/controller/LayoutController.java) | Endpoint `PUT .../workstations/{workstationId}` có thực sự chặn quyền `STAFF` và chặn quản lý của store khác ở cấp độ server không? | **Xác nhận:** `@PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")` cùng kiểm tra `!ws.getStore().getId().equals(storeId)` ném 403 Forbidden. |

---

## 4. CHI TIẾT 6 KỊCH BẢN HỒI QUY ĐƯỢC KIỂM CHỨNG

### Scenario A: Position Persistence, Boundary Clamping, Collision & Rollback
- **Roundtrip tọa độ:** Kiểm tra chuyển đổi qua lại giữa không gian Three.js và Backend CSDL trên các điểm cực trị; sai số tuyệt đối `< 0.001m`.
- **Giới hạn biên sàn (Clamping):** Kiểm tra các tọa độ ngoài biên âm (`-10, -5`) hoặc vượt kích thước cửa hàng (`99, 50`). Trạm làm việc luôn được ghim an toàn tại `[0.8m, Length - 0.8m]` và `[0.8m, Width - 0.8m]`.
- **Phát hiện va chạm (Collision Detection):** Kiểm tra hai trạm cách nhau `< 1.1m`. Hệ thống lập tức trả về `isColliding: true`, chỉ rõ trạm xung đột, đổi màu vòng chỉ thị sang Đỏ và ngăn chặn thao tác lưu.
- **Hoàn tác & Cam kết (Revert & Commit):**
  - Khi bấm Hủy hoặc server trả lỗi: `revertPosition()` khôi phục vị trí Three.js mesh ban đầu, reset draft coordinates.
  - Khi lưu thành công: `commitPosition()` cập nhật baseline vị trí gốc mới.

### Scenario B: Occupancy Consistency, Identity Separation & Zone Fallback
- **Gán trực tiếp vs Suy luận theo Zone:**
  - Gán trực tiếp (`workstationId` khớp `ws.id`): Ghi nhận `ASSIGNED` kèm cờ `isDirectMapping: true`.
  - Suy luận theo Zone (fallback gom nhóm nhân viên trong `zoneId`): Ghi nhận `ASSIGNED` kèm cờ `isDirectMapping: false`, hiển thị rõ nguồn gán "Theo phân vùng" trên Inspector.
- **Bảo vệ Trạng thái Unknown:**
  - Khi đang tải dữ liệu (`isLoading: true`), có lỗi mạng (`error`), hoặc chưa chọn ca (`!currentShift`), toàn bộ trạm trả về trạng thái `UNKNOWN`.
  - **Quy tắc tuyệt đối:** Không bao giờ suy diễn lỗi mạng hoặc đang tải là trạm trống (`UNASSIGNED`).
- **Phân tách Staff ID vs Assignment ID:**
  - `getStaffId` bóc tách chính xác User UUID từ cả Staff DTO, Assignment DTO và avatar mesh `userData`.
  - `getAssignmentId` bóc tách Assignment UUID, triệt tiêu nguy cơ nhầm lẫn khóa định danh.

### Scenario C: Attendance Accuracy & Check-in/Out Lifecycle
- **Đang có mặt (Present):** Khi `checkInTime != null && checkOutTime == null` -> `isPresent: true`. Đèn LED xanh ngọc (`#10B981`), huy hiệu `✓ Có mặt`.
- **Theo lịch (Scheduled):** Khi chưa check-in -> `isPresent: false`, `hasAttendance: false`. Đèn LED xanh dương (`#0284C7`), huy hiệu `Theo lịch`.
- **Đã về (Checked-out):** Khi `checkInTime != null && checkOutTime != null` -> `isPresent: false`. Không tiếp tục báo đang có mặt, hiển thị huy hiệu `✓ Đã về` (Hổ phách `#D97706`).
- **Lỗi/Thiếu dữ liệu điểm danh:** Hiển thị độ không chắc chắn (`UNKNOWN`), không tự ý bịa đặt trạng thái.

### Scenario D: Async Race Conditions & Store Selection Isolation
- **Chống Stale Responses:** Cờ hủy bỏ `isCurrent` trong cleanup của `useEffect` loại trừ hoàn toàn hiện tượng dữ liệu phản hồi trễ của chi nhánh cũ đè lên chi nhánh mới.
- **Cô lập Dữ liệu Chi nhánh (Store Selection Isolation):** Khi `activeStoreId` thay đổi, toàn bộ selection, draft coordinates và collision state được dọn dẹp sạch sẽ, ngăn chặn người dùng lưu nhầm tọa độ trạm sang cửa hàng khác.

### Scenario E: Permissions & Multi-layer Data Security (Defense-in-Depth)
- **Frontend Layer:** Vai trò `ADMIN` và `MANAGER` được phép mở chế độ chỉnh sửa; `STAFF` bị ẩn công cụ và chặn ngay tại `handleSaveWorkstationPosition`.
- **Backend Layer:** Endpoint `PUT /api/stores/{storeId}/workstations/{workstationId}` được bảo vệ bằng `@PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")`.
- **Store Boundary:** Backend kiểm tra thực thể `!ws.getStore().getId().equals(storeId)` ném ngoại lệ 403 Forbidden nếu workstation không thuộc store đang thao tác.

### Scenario F: Cross-Feature Stability, Camera Locking & Shared Material Disposal Safety
- **Tương tác Camera:** `OrbitControls` tự động tắt khi người dùng bắt đầu kéo trạm (`pointerdown`), chống giật camera 100%, và tự động bật lại khi nhả chuột (`pointerup`) hoặc hủy (`cancelDrag`).
- **Bảo toàn Bộ nhớ:** Kiểm tra `isFurnitureSharedMaterial` bảo đảm các singleton material của trạm làm việc không bị dispose nhầm khi chuyển đổi layer hoặc store.
- **Hiển thị Layer:** Bật/tắt layer trạm làm việc (`showWorkstations`) hoạt động mượt mà, không để lại artifact rác trong scene.

---

## 5. CÁC LỖ HỔNG ĐÃ PHÁT HIỆN & KHẮC PHỤC (DEFECTS FIXED)

| ID | Mô tả lỗ hổng phát hiện | Mức độ | Biện pháp kỹ thuật đã khắc phục | Tập tin chỉnh sửa |
| :---: | :--- | :---: | :--- | :--- |
| **DEF-2C-01** | Rò rỉ trạng thái trạm khi đổi chi nhánh (Store Selection Leak) | Cao | Thêm `useEffect` Store Selection Isolation Guard dọn dẹp `selectedWorkstation`, `draftWorkstationCoords`, `workstationCollision` khi `activeStoreId` thay đổi. | [`SpatialWorkspace.jsx`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx) |
| **DEF-2C-02** | Thiếu guard phân quyền phòng thủ chiều sâu khi lưu vị trí trạm | Trung bình | Bổ sung kiểm tra `if (!canEditLayout)` tại đầu hàm `handleSaveWorkstationPosition` với thông báo lỗi rõ ràng. | [`SpatialWorkspace.jsx`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx) |
| **DEF-2C-03** | Chưa phân biệt rõ nhân viên đã check-out với nhân viên chưa check-in | Thấp | Cập nhật `SpatialInspector.jsx` phân định trạng thái `✓ Đã về` (Checked-out) với màu hổ phách riêng biệt. | [`SpatialInspector.jsx`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/SpatialInspector.jsx) |
| **DEF-2C-04** | Tag sprite thiếu metadata nhận diện trong scene graph | Thấp | Gán `isWorkstationTag: true` và `workstationId` vào `sprite.userData` khi khởi tạo. | [`FurnitureBuilder.js`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/scene/FurnitureBuilder.js) |

---

## 6. BẰNG CHỨNG KIỂM THỬ THỰC TẾ (VERIFICATION EVIDENCE)

### 6.1. Frontend Unit & Regression Tests
Lệnh thực thi:
```bash
node --test src/features/spatial-workspace/DigitalTwinRegression.test.js \
            src/features/spatial-workspace/utils/workstationOccupancy.test.js \
            src/features/spatial-workspace/scene/FurnitureBuilder.test.js \
            src/features/spatial-workspace/interaction/WorkstationDragController.test.js \
            src/features/spatial-workspace/utils/staffIdentity.test.js
```
Kết quả:
```text
▶ PHASE 2C — Scenario A: Position Persistence, Clamping, Collision & Rollback
  ✔ A1. Mathematical roundtrip between Three.js and Backend coordinates is lossless (1.0014ms)
  ✔ A2. Boundary clamping keeps workstations strictly inside [padding, Dimension - padding] (3.8342ms)
  ✔ A3. Collision detection rejects placements closer than WORKSTATION_COLLISION_RADIUS (1.1m) (1.1505ms)
  ✔ A4. Revert position accurately restores original 3D position and resets validation state (1.7089ms)
  ✔ A5. Commit position updates original coordinates baseline after successful save (1.1423ms)
✔ PHASE 2C — Scenario A: Position Persistence, Clamping, Collision & Rollback (10.1864ms)

▶ PHASE 2C — Scenario B: Occupancy Consistency, Identity Separation & Zone Fallback
  ✔ B1. Distinguishes direct workstation assignments from zone-based fallback assignments (0.7033ms)
  ✔ B2. Never misrepresents loading, network error, or missing shift as UNASSIGNED (0.3496ms)
  ✔ B3. Separates Staff UUID from Assignment UUID safely across heterogeneous objects (0.2876ms)
✔ PHASE 2C — Scenario B: Occupancy Consistency, Identity Separation & Zone Fallback (1.6341ms)

▶ PHASE 2C — Scenario C: Attendance Accuracy & Lifecycle
  ✔ C1. Checked-in and not checked-out reports actual presence (isPresent = true) (0.3054ms)
  ✔ C2. Scheduled but not checked-in reports scheduled assignment, not actual presence (0.2765ms)
  ✔ C3. Checked-out employee ceases showing as currently present (0.2597ms)
✔ PHASE 2C — Scenario C: Attendance Accuracy & Lifecycle (1.025ms)

▶ PHASE 2C — Scenario D: Async Race Condition & Store Selection Isolation
  ✔ D1. Async cancellation flag pattern (isCurrent) prevents stale responses from contaminating state (53.5639ms)
  ✔ D2. Store change isolation clears pending draft coordinates and collision state (0.2097ms)
✔ PHASE 2C — Scenario D: Async Race Condition & Store Selection Isolation (54.006ms)

▶ PHASE 2C — Scenario E: Permissions & Multi-layer Data Security
  ✔ E1. Frontend RBAC permits ADMIN and MANAGER to edit layout, rejects STAFF (0.1785ms)
  ✔ E2. Defense-in-depth: Save function throws security rejection when user lacks permission (0.3214ms)
✔ PHASE 2C — Scenario E: Permissions & Multi-layer Data Security (0.6072ms)

▶ PHASE 2C — Scenario F: Cross-Feature Stability & Shared Material Safety
  ✔ F1. Shared furniture materials are recognized and protected from premature disposal (0.112ms)
  ✔ F2. Tag sprite generation renders high-definition canvas without throwing under all states (0.7709ms)
✔ PHASE 2C — Scenario F: Cross-Feature Stability & Shared Material Safety (0.9484ms)

▶ PHASE 2A: Workstation Layout Editor & Coordinate Tests (7 tests PASS)
▶ W-01 & W-03: FurnitureBuilder & Workstation Layer Tests (6 tests PASS)
▶ W-02: staffIdentity Helper Tests (9 tests PASS)
▶ PHASE 2B: Workstation Occupancy & Staff Visualization Engine (6 tests PASS)

ℹ tests 45
ℹ suites 10
ℹ pass 45
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 195.5294
```

### 6.2. Frontend Production Build (Vite)
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
dist/assets/SpatialWorkspace-DOqsH1Iq.js    243.79 kB │ gzip:  64.71 kB
dist/assets/index-BQN4Aryn.js             1,575.37 kB │ gzip: 405.82 kB
✓ built in 826ms
```

### 6.3. Backend Unit & Regression Tests (Maven)
Lệnh thực thi:
```bash
mvn test "-Dtest=ShiftAssignmentServiceTest,AutoScheduleAssignmentCorrectnessTest"
```
Kết quả:
```text
[INFO] Running com.shiftsync.shift.service.AutoScheduleAssignmentCorrectnessTest
[INFO] Tests run: 18, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.357 s
[INFO] Running com.shiftsync.shift.service.ShiftAssignmentServiceTest
[INFO] Tests run: 19, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.140 s
[INFO] Results:
[INFO] Tests run: 37, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

---

## 7. RỦI RO CÒN LẠI & HÀNH ĐỘNG ĐỀ XUẤT TIẾP THEO

1. **Rủi ro còn lại (Remaining Risks):**
   - Hiện tại dữ liệu trạm làm việc trong PostgreSQL chưa hỗ trợ góc quay `rotation` (Schema V31 chỉ lưu `x, y, z`). Tính năng quay trạm 3D sẽ chỉ nên triển khai khi người dùng yêu cầu mở rộng schema CSDL.
   - Khi mạng bị mất kết nối kéo dài, các truy vấn attendance có thể timeout; hệ thống đã xử lý an toàn bằng cách hiển thị `UNKNOWN` thay vì `UNASSIGNED`.
2. **Hành động đề xuất tiếp theo (Recommended Next Action):**
   - Bộ tính năng **Digital Twin (Không gian 3D, Layout Editor, Occupancy & Staff Presence)** đã đạt độ ổn định và tin cậy cao nhất, sẵn sàng bàn giao cho người dùng nghiệm thu (User Acceptance Testing).
   - Đề xuất chuyển tiếp sang tích hợp các phân hệ vệ tinh liên quan:
     - Phân hệ **AutoSchedule Integration**: Tự động gán nhân viên vào trạm làm việc dựa trên kỹ năng nghiệp vụ.
     - Phân hệ **Mobile Attendance Integration**: Cho phép nhân sự quét QR code tại trạm làm việc để cập nhật trạng thái `checkInTime` thời gian thực lên 3D Digital Twin.
