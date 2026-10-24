# WEB-001 — DIGITAL TWIN DATA INTEGRATION & WORKSTATION LAYER
## Báo cáo Triển khai Tích hợp Dữ liệu Không gian & Trạm làm việc (Workstation Layer)

**Mã tài liệu:** `WEB-001-DIGITAL-TWIN-WORKSTATION-INTEGRATION`  
**Ngày thực hiện:** 14/10/2026  
**Nhánh thực hiện:** `quoc-backend`  
**Baseline Git Commit:** `c9d4df15bd1ba3d802d297eb45312af40eaacd40`  
**Trạng thái:** **HOÀN THÀNH TOÀN DIỆN (100% VERIFIED & PRODUCTION READY)**  

---

## 1. Executive Summary

Nhiệm vụ `WEB-001` giải quyết dứt điểm 3 khoảng trống tích hợp dữ liệu không gian (`GAP-SP-001`, `GAP-SP-002`, `GAP-SP-003`) đã được ghi nhận trong báo cáo kiểm toán kiến trúc `AUD-002`:

1. **W-02 (GAP-SP-002 — Staff ID vs Assignment ID Normalization):**
   - Đã tạo module chuyên trách [staffIdentity.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/utils/staffIdentity.js) với các hàm chuẩn hóa: `isValidId`, `getStaffId`, `getAssignmentId`, `areSameStaff`, `areSameAssignment`.
   - Phân biệt triệt để giữa `staff.id` (User UUID) và `shift_assignment.id` (Assignment UUID), xử lý an toàn cả pure Staff DTO, `ShiftAssignmentDTO`, và Three.js Avatar Mesh `userData`.
   - Đã tái cấu trúc toàn bộ 7 file cốt lõi trong Spatial Workspace để loại bỏ hoàn toàn pattern lỗi `s.id || s.staffId`.

2. **W-01 (GAP-SP-001 — Workstations API Integration & Dynamic Rendering):**
   - Tích hợp endpoint `GET /api/stores/{storeId}/workstations` qua `getStoreWorkstations(storeId)` trong `layoutService.js`.
   - Bổ sung state quản lý `internalWorkstations`, `effectiveWorkstations`, loading, và cơ chế `isCurrent` guard để hủy bỏ response trễ khi người dùng chuyển đổi chi nhánh cửa hàng.
   - Xây dựng generator 3D [FurnitureBuilder.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/scene/FurnitureBuilder.js) với `buildWorkstationObject(workstation)` (hỗ trợ phân loại trực quan theo `workstationType`: `BARISTA_BAR`, `CASHIER_STATION`, `KITCHEN`, `STORAGE`, `DISPLAY`, `STYLING`, `SERVICE`) và `createWorkstationTagSprite(workstation)` (3D floating pill badge hiển thị tên, mã trạm và trạng thái `isActive`).

3. **W-03 (GAP-SP-003 — Workstation Layer Switcher & Collision Avoidance):**
   - Bổ sung toggle `showWorkstations` độc lập vào [SpatialToolbar.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/SpatialToolbar.jsx), tách biệt hoàn toàn khỏi `showFurniture` (nội thất trang trí chung).
   - Thiết lập cơ chế **Mesh Collision Avoidance**: xây dựng `zonesWithWorkstations` Set. Khi một phân vùng đã có trạm làm việc chuyên biệt từ CSDL, hệ thống sẽ tự động triệt tiêu các khối nội thất ước tính mặc định, ngăn chặn hoàn toàn việc vẽ đè 2 mesh lên cùng một tọa độ.
   - Đồng bộ hóa lớp trạm làm việc vào sơ đồ kiến trúc 2D [TwoDSpatialSchematic.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/components/spatial/TwoDSpatialSchematic.jsx).

---

## 2. Git & Working Tree Preservation

Tuân thủ nghiêm ngặt nguyên tắc bảo toàn hệ thống:
- **Nhánh:** `quoc-backend` (HEAD: `c9d4df1`).
- **Bảo toàn thay đổi:** Không thực hiện bất kỳ lệnh `git commit`, `git push`, `git reset`, `git clean` hay `git stash` nào. Tất cả các sửa đổi FIX-001A, FIX-001B, FIX-001C trước đó đều được bảo lưu nguyên vẹn 100%.
- **Web-First:** Không thay đổi CSDL hoặc API Backend, do API contract hiện tại (`GET /api/stores/{storeId}/workstations`) đã đáp ứng đầy đủ yêu cầu.

---

## 3. W-02: Staff ID vs Assignment ID Remediation

### 3.1 Bản chất vấn đề trước đây
Trước FIX-001C và AUD-002, mã nguồn Web thường truy cập `s.id || s.staffId`. Điều này dẫn đến sự cố nghiêm trọng:
- Khi `s` là một đối tượng `ShiftAssignmentDTO`, trường `s.id` đại diện cho ID của phân công ca (`assignment.id`), trong khi `s.staffId` là ID của nhân viên (`user.id`).
- Các hàm so sánh như `s.id === emp.id` hay `s.staffId === emp.id` bị sai lệch tùy thuộc vào nguồn dữ liệu (`temporalStaff` vs `simulatedStaff`), dẫn đến avatar 3D bị duplicate, lệnh SWAP gửi nhầm assignment ID lên payload API backend, hoặc không tìm thấy ứng viên thay thế trong What-If simulation.

### 3.2 Giải pháp chuẩn hóa
Đã tạo module [staffIdentity.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/utils/staffIdentity.js):
```javascript
export function isValidId(val) {
  return val !== null && val !== undefined && val !== '';
}

export function isAssignmentObject(obj) {
  if (!obj || typeof obj !== 'object') return false;
  return isValidId(obj.shiftId) || isValidId(obj.staffId) || isValidId(obj.assignmentId);
}

export function getStaffId(item) {
  if (!item) return null;
  if (typeof item === 'string' || typeof item === 'number') return String(item);
  if (item.userData?.isPerson && item.userData?.employee) {
    return getStaffId(item.userData.employee);
  }
  if (isValidId(item.staffId)) return String(item.staffId);
  if (isAssignmentObject(item)) {
    if (isValidId(item.staff?.id)) return String(item.staff.id);
    return null;
  }
  if (isValidId(item.id)) return String(item.id);
  return null;
}

export function areSameStaff(a, b) {
  const idA = getStaffId(a);
  const idB = getStaffId(b);
  if (!idA || !idB) return false;
  return idA === idB;
}
```

### 3.3 Danh sách các module đã được cập nhật
- [simulationStore.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/simulation/simulationStore.js): Actions `transferStaff`, `swapStaff`, `simulateLeaveAbsence`, `removeSimulatedStaff`, `addSimulatedStaff`.
- [SpatialInspector.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/SpatialInspector.jsx): Xử lý modal chọn ứng viên thay thế, gửi payload SWAP atomic, so sánh nhân viên đang chọn.
- [DragTransfer.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/interaction/DragTransfer.js): Lọc và cập nhật vị trí avatar đang kéo thả `!areSameStaff(s, emp)`.
- [SimulationValidator.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/simulation/SimulationValidator.js): Lọc danh sách nhân viên khả dụng (`findReplacementCandidates`).
- [SimulationImpactCalculator.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/simulation/SimulationImpactCalculator.js): Tập hợp `affectedEmployees` không bị trùng lặp.
- [SimulationAutoScheduler.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/simulation/SimulationAutoScheduler.js): Gán `allocatedStaff` bằng `getStaffId(emp)`.
- [SpatialWorkspace.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx): Đối soát avatar mesh sống sót qua các render pass (`survivingAvatars`, `existingAvatar`), theo dõi nhân viên (`handleFollowEmployee`), và xử lý gán ứng viên.

---

## 4. W-01: Workstations API Integration & Model

### 4.1 Endpoint Contract
- **Endpoint:** `GET /api/stores/{storeId}/workstations`
- **DTO:** `WorkstationDto`:
  - `id`: UUID của trạm làm việc.
  - `storeId`: UUID của chi nhánh.
  - `zoneId`: UUID của phân vùng cha.
  - `zoneName`: Tên phân vùng cha.
  - `name`: Tên trạm (ví dụ: `May Pha Espresso PVD-01`, `May POS Thu Ngan PVD-01`).
  - `code`: Mã nghiệp vụ (ví dụ: `WS-PVD-ESP1`, `WS-PVD-POS1`).
  - `workstationType`: Loại hình trạm (`BARISTA_BAR`, `CASHIER_STATION`, `KITCHEN`, v.v.).
  - `x, y, z`: Tọa độ không gian (mét).
  - `capacity`: Sức chứa đồng thời.
  - `isActive`: Trạng thái hoạt động.

### 4.2 Tích hợp & Quản lý vòng đời dữ liệu
Trong [SpatialWorkspace.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx):
- Hỗ trợ prop `workstations` từ bên ngoài (khi component cha truyền vào), hoặc tự động fetch qua `getStoreWorkstations(activeStoreId)`.
- Có cờ `isCurrent` ngăn chặn race condition khi người dùng đổi store liên tục.
- `effectiveWorkstations = useMemo(() => Array.isArray(workstations) ? workstations : internalWorkstations, [workstations, internalWorkstations])`.

---

## 5. W-03: Workstation Layer Switcher & Rendering Controls

### 5.1 Cấu hình Layer trong Toolbar
Trong [SpatialToolbar.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/components/SpatialToolbar.jsx):
- Thêm `showWorkstations: true` (label: `🛠️ Trạm làm việc (Workstations)`).
- Tách biệt rõ ràng với `showFurniture` (label: `🪑 Nội thất trang trí`).
- Toggle được kích hoạt thông qua popover `Lớp (Layers)` với checkbox phản hồi thời gian thực.

### 5.2 Mô hình 3D đa dạng theo Workstation Type
Trong [FurnitureBuilder.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/scene/FurnitureBuilder.js):
- `BARISTA / BARISTA_BAR`: Quầy pha chế gỗ ấm, mặt đá cẩm thạch trắng, máy pha espresso đa cần với đồng hồ áp suất & khay sấy tách sứ, máy xay hạt cà phê phễu thủy tinh, và tủ kính bánh ngọt có bánh sừng bò/macaron.
- `POS / CASHIER_STATION`: Quầy thu ngân hiện đại, màn hình cảm ứng POS viền xanh neon, máy quét mã vạch và đầu đọc thẻ thanh toán POS.
- `KITCHEN`: Bếp đảo inox SUS304 công nghiệp, bếp nấu sáng đèn hồng ngoại cam, giá treo dụng cụ inox.
- `STORAGE`: Kệ kho hàng 3 tầng bằng khung thép sơn tĩnh điện xám.
- `DISPLAY / RETAIL`: Kệ trưng bày bán lẻ phong cách tối giản.
- `STYLING / SALON`: Bàn gương trang điểm / cắt tóc cao cấp.
- `SERVICE`: Quầy tiếp tân / dịch vụ khách hàng.
- `Generic`: Bàn làm việc chuẩn hóa cho các loại hình khác.

### 5.3 3D Floating Tag Sprite
Hàm `createWorkstationTagSprite(ws)` vẽ trực tiếp lên Canvas 2D:
- Nền viên thuốc (pill) mờ `rgba(15, 23, 42, 0.88)` với viền bo góc.
- Đèn LED trạng thái: xanh lá (`#10B981`) khi `isActive = true`, xám khi không hoạt động.
- Tên trạm rõ ràng, font hệ thống sắc nét.
- Mã trạm và phân loại (ví dụ: `WS-PVD-ESP1 • BARISTA_BAR`).
- Sử dụng `THREE.Sprite` với `depthWrite: false` đảm bảo không bị lỗi z-fighting với trần hoặc tường.

---

## 6. 3D Scene Composition & Mesh Collision Avoidance

### 6.1 Cơ chế chống va chạm (Collision Avoidance)
Trước đây, `SpatialWorkspace` luôn sinh ra một mô hình nội thất ước tính tại tâm mỗi Zone dựa trên tên Zone (`buildZoneFurniture(zone.name, zoneSizeX)`). Khi bổ sung thêm các trạm làm việc cụ thể từ API, hai nhóm mesh này sẽ nằm đè lên nhau gây hiện tượng z-fighting và hình ảnh lộn xộn.

**Thuật toán triệt tiêu va chạm đã áp dụng:**
```javascript
// Phát hiện các phân vùng đã có trạm làm việc được cấu hình rõ ràng từ API
const zonesWithWorkstations = new Set(
  (effectiveWorkstations || [])
    .map((w) => w.zoneId)
    .filter(Boolean)
);

// Chỉ render nội thất ước tính mặc định cho các zone KHÔNG CÓ workstation chuyên biệt
if (layers.showFurniture && !zonesWithWorkstations.has(zone.id)) {
  const furniture = buildZoneFurniture(zone.name, zoneSizeX);
  furniture.position.set(tx, ty, tz);
  dynamicGroup.add(furniture);
}
```

### 6.2 Bảo vệ tài nguyên WebGL (No Resource Leaks)
- Toàn bộ vật liệu chuẩn của trạm làm việc được tái sử dụng từ singleton `materials` trong `FurnitureBuilder.js`.
- `sharedResources.add(m)` bảo vệ toàn diện các vật liệu này.
- `disposeHierarchy` nhận diện và bảo vệ thông qua `isFurnitureSharedMaterial(mat)`, chỉ giải phóng các `CanvasTexture` được sinh ra riêng lẻ cho từng nhãn trạm khi zone/store bị tháo gỡ.

---

## 7. 2D Fallback View Synchronization

Trong [TwoDSpatialSchematic.jsx](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/components/spatial/TwoDSpatialSchematic.jsx):
- Nhận props `workstations={effectiveWorkstations}` và `showWorkstations={layers.showWorkstations}`.
- Chuyển đổi tọa độ trạm làm việc `(wx, wy)` sang tọa độ SVG thông qua `scaleX(wx)` và `scaleY(wy)`.
- Vẽ icon trạm làm việc dạng pin màu xanh hồ quang (`#0284C7`), kèm badge nhãn nổi mờ chứa tên trạm.
- Hoàn toàn đồng bộ với công tắc bật/tắt lớp hiển thị trong Spatial Toolbar.

---

## 8. Unit & Integration Test Results

### 8.1 Frontend Unit Tests (14/14 PASS)
Lệnh thực thi:
```bash
node --test src/features/spatial-workspace/utils/staffIdentity.test.js src/features/spatial-workspace/scene/FurnitureBuilder.test.js
```
Kết quả:
```text
▶ W-01 & W-03: FurnitureBuilder & Workstation Layer Tests
  ✔ isFurnitureSharedMaterial correctly identifies shared singleton materials (1.5ms)
  ✔ buildWorkstationObject builds Barista workstation group with proper metadata (22.7ms)
  ✔ buildWorkstationObject builds POS, Kitchen, and Retail workstations correctly (11.6ms)
  ✔ createWorkstationTagSprite creates sprite with workstation label metadata (0.9ms)
  ✔ Collision prevention logic (zonesWithWorkstations) works reliably (0.2ms)
✔ W-01 & W-03: FurnitureBuilder & Workstation Layer Tests (41.6ms)

▶ W-02: staffIdentity Helper Tests
  ✔ isValidId validates non-empty identifiers properly (4.0ms)
  ✔ identifies pure Staff/User object vs ShiftAssignmentDTO (1.8ms)
  ✔ getStaffId extracts correct staff UUID from pure Staff object (1.4ms)
  ✔ getStaffId extracts staffId from ShiftAssignmentDTO without using assignment id (0.7ms)
  ✔ getStaffId handles primitive ID strings directly (0.3ms)
  ✔ getStaffId traverses Three.js Avatar Mesh userData (0.4ms)
  ✔ getStaffId returns null when given invalid or empty objects (0.3ms)
  ✔ areSameStaff correctly matches pure Staff with Assignment object (0.5ms)
  ✔ areSameAssignment compares assignment IDs without confusing staff IDs (0.9ms)
✔ W-02: staffIdentity Helper Tests (15.3ms)

ℹ tests 14
ℹ suites 2
ℹ pass 14
ℹ fail 0
```

### 8.2 Frontend Production Build (PASS)
Lệnh thực thi:
```bash
npm run build
```
Kết quả:
```text
vite v8.2.1 building client environment for production...
✓ 2043 modules transformed.
rendering chunks...
dist/index.html                               1.10 kB │ gzip:   0.56 kB
dist/assets/SpatialWorkspace-BbejKtTk.js    215.50 kB │ gzip:  57.98 kB
dist/assets/index-f1fzRtAb.js             1,575.11 kB │ gzip: 405.76 kB
✓ built in 1.99s
```

### 8.3 Backend Concurrency & Service Tests (21/21 PASS)
Lệnh thực thi:
```bash
mvn test "-Dtest=ShiftAssignmentServiceTest,DigitalTwinConcurrencyIntegrationTest"
```
Kết quả:
```text
[INFO] Tests run: 2, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 50.72 s -- in com.shiftsync.shift.service.DigitalTwinConcurrencyIntegrationTest
[INFO] Tests run: 19, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 6.36 s -- in com.shiftsync.shift.service.ShiftAssignmentServiceTest
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] Total time: 01:12 min
[INFO] ------------------------------------------------------------------------
```

---

## 9. Runtime Verification via Chrome DevTools

Đã tiến hành xác minh trực tiếp trên phiên bản trình duyệt đang chạy tại `http://localhost:3000/schedule`:

1. **Kiểm tra dynamicGroup trong Three.js Scene:**
   - Cửa hàng `Pham Van Dong Store` trả về 2 trạm làm việc thực tế từ CSDL PostgreSQL:
     - `WS-PVD-ESP1`: `May Pha Espresso PVD-01` (`BARISTA_BAR`), tọa độ `(4, 2.5, 0.9)`, thuộc Zone `Khu Pha Che Barista`.
     - `WS-PVD-POS1`: `May POS Thu Ngan PVD-01` (`CASHIER_STATION`), tọa độ `(8, 2.5, 0.9)`, thuộc Zone `Quay Thu Ngan POS`.
   - Kết quả chụp cấu trúc scene:
     - `workstation-20000000-0000-0000-0000-000000000041` (Mesh + Tag Sprite) được khởi tạo chính xác.
     - `workstation-20000000-0000-0000-0000-000000000042` (Mesh + Tag Sprite) được khởi tạo chính xác.
     - Tại `Khu Ban Khach` (không có workstation trong API), nội thất bàn ghế mặc định được render đầy đủ.
     - Tổng số thực thể trong dynamicGroup: **11 đối tượng**.

2. **Kiểm tra tương tác bật/tắt Layer Switcher:**
   - Mở popover `Lớp (Layers)`: Toggle `🛠️ Trạm làm việc (Workstations)` hiển thị trạng thái checked mặc định.
   - Click tắt `showWorkstations`:
     - Số lượng workstation trong scene lập tức giảm từ **2 về 0**.
     - Tổng số đối tượng dynamicGroup giảm từ **11 xuống 7**.
   - Click bật lại `showWorkstations`:
     - Khôi phục đầy đủ 2 trạm làm việc và 2 nhãn 3D trong scene ngay lập tức mà không cần tải lại trang.

3. **Kiểm tra chuyển đổi chế độ 2D / 3D:**
   - Nhấp `Sơ đồ 2D`: Chuyển sang bản vẽ kỹ thuật SVG, hiển thị 2 pin định vị trạm (`May Pha Esp`, `May POS Thu`) đúng vị trí không gian.
   - Nhấp `Trở lại Không gian 3D`: Phục hồi camera góc nhìn phối cảnh 3D mượt mà.

---

## 10. Residual Risks & Next Steps

### Rủi ro còn lại (Residual Risks)
- **Tọa độ trạm làm việc chưa có trên một số cửa hàng cũ:** Một số chi nhánh mới tạo có thể chưa thiết lập tọa độ `x`, `y`, `z` cho Workstation trong DB. Hệ thống hiện đã có fallback về tọa độ tâm của phân vùng cha (`parentZone.x`, `parentZone.y`), đảm bảo trạm vẫn xuất hiện trong phân vùng tương ứng mà không bị văng ra ngoài không gian.
- **Tùy chỉnh góc xoay Workstation:** Hiện tại trạm làm việc được hướng theo trục mặc định. Trong tương lai có thể bổ sung trường `rotationY` vào bảng `workstations` để hỗ trợ xoay góc tự do 360 độ theo mặt bằng thực tế.

### Đề xuất bước tiếp theo (Next Steps)
- Cho phép người dùng chỉnh sửa vị trí trạm làm việc trực tiếp bằng công cụ kéo thả trong chế độ chỉnh sửa mặt bằng (Spatial Layout Editor).
- Gắn thẻ nhân viên đang phụ trách trực tiếp vào đỉnh trạm làm việc (Workstation Occupancy Indicator).

---

## 11. Sign-off Checklist

- [x] **W-02:** Chuẩn hóa toàn bộ mapping `staffId` vs `assignmentId` bằng [staffIdentity.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/utils/staffIdentity.js).
- [x] **W-02:** Đã cập nhật 7/7 module liên quan (Store, Inspector, DragTransfer, Validator, Impact, Scheduler, Workspace).
- [x] **W-02:** 9/9 unit tests cho `staffIdentity` đạt kết quả PASS.
- [x] **W-01:** Tích hợp `getStoreWorkstations` API vào Digital Twin kèm cờ `isCurrent` chống race condition.
- [x] **W-01:** Xây dựng mô hình 3D chuyên biệt cho các nhóm trạm: Barista, POS, Bếp, Kho, Bày hàng, Dịch vụ.
- [x] **W-01:** Tạo 3D floating tag sprite có đèn LED trạng thái hoạt động cho từng trạm.
- [x] **W-03:** Bổ sung toggle `showWorkstations` độc lập vào Spatial Toolbar.
- [x] **W-03:** Triển khai cơ chế triệt tiêu va chạm nội thất (Collision Avoidance) qua `zonesWithWorkstations`.
- [x] **W-03:** Đồng bộ hóa hiển thị trạm làm việc trên sơ đồ 2D SVG (`TwoDSpatialSchematic`).
- [x] **W-03:** Bảo vệ vật liệu Three.js singleton khỏi rò rỉ bộ nhớ WebGL (`sharedResources`).
- [x] **Kiểm thử hồi quy:** Frontend `npm run build` thành công trong 1.99s.
- [x] **Kiểm thử hồi quy:** Backend 21/21 tests PASS (`ShiftAssignmentServiceTest` & `DigitalTwinConcurrencyIntegrationTest`).
- [x] **Runtime:** Đã xác minh thực tế qua Chrome DevTools (WebGL scene inspection, toggle test, 2D/3D switch).
- [x] **Git:** Giữ nguyên 100% nhánh `quoc-backend`, không commit, không stash, không reset.
