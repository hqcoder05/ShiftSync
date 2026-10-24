# BÁO CÁO KỸ THUẬT: PHASE 2A — WORKSTATION LAYOUT & SPATIAL EDITOR
**Dự án:** ShiftSync — High-Performance Workforce Digital Twin  
**Phiên bản kiểm toán & triển khai:** Phase 2A (Tiếp nối WEB-001 & AUD-002)  
**Tác giả:** Senior Full-Stack Engineer, Spatial Visualization Architect  
**Trạng thái:** ✅ HOÀN TẤT & ĐÃ XÁC MINH (VERIFIED)  
**Ngày thực hiện:** 14/10/2026  

---

## 1. TỔNG QUAN ĐIỀU HÀNH (EXECUTIVE SUMMARY)

Phase 2A được triển khai nhằm mục tiêu cung cấp cho người quản trị cửa hàng khả năng **tương tác không gian 3D trực quan** để chỉnh sửa bố cục các trạm làm việc (Workstation Layout Editor) trực tiếp trên nền tảng Digital Twin của ShiftSync.

### Thành tựu cốt lõi:
1. **Kiến trúc kéo thả không gian 3D mượt mà:** Triển khai `WorkstationDragController` với kỹ thuật Raycasting trên mặt bằng sàn (`y = 0`), khóa `OrbitControls` khi thao tác để loại bỏ hoàn toàn hiện tượng rung lắc/giật camera.
2. **Đối soát tọa độ hai chiều chính xác tuyệt đối:** Chuyển đổi qua lại giữa không gian Three.js (gốc tọa độ tại tâm cửa hàng) và không gian cơ sở dữ liệu Backend (gốc tọa độ tại góc sàn) với độ lệch tuyệt đối `0.0000m`.
3. **Cơ chế giới hạn biên và phòng ngừa va chạm thời gian thực:**
   - Biên sàn an toàn: Trạm làm việc luôn được giới hạn trong khoảng `[0.8m, Length - 0.8m]` và `[0.8m, Width - 0.8m]`.
   - Bán kính va chạm vật lý: Kiểm tra khoảng cách `WORKSTATION_COLLISION_RADIUS = 1.1m`. Vòng chỉ thị đổi màu trực quan: **Xanh lục (`#10B981`)** khi hợp lệ, **Đỏ (`#EF4444`)** khi va chạm.
4. **Bảo toàn dữ liệu & Revert tức thì:** Chế độ xem trước vị trí nháp (draft preview) hỗ trợ hoàn tác (`revertPosition()`) ngay lập tức khi người dùng bấm Hủy hoặc khi API lưu trữ gặp sự cố.
5. **Kiểm soát phân quyền chặt chẽ (RBAC):** Chỉ tài khoản có vai trò `ADMIN` hoặc `MANAGER` mới được phép kích hoạt chế độ Bố trí Trạm; vô hiệu hóa thao tác đối với nhân viên (`STAFF`).

---

## 2. TÁI SỬ DỤNG TRI THỨC CÓ SẴN (KNOWLEDGE REUSE & BASELINE VALIDATION)

Tuân thủ nghiêm ngặt quy trình 6 bước tại [`AGENTS.md`](file:///d:/ThucTapTotNghiep/ShiftSync/AGENTS.md) và hệ thống [`docs/agent-memory/`](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/):

| Tri thức tái sử dụng | Nguồn gốc | Ứng dụng thực tế trong Phase 2A |
| :--- | :--- | :--- |
| **API Contract Workstations** | `AUD-002` (GAP-SP-001) & `CODEBASE_MAP.md` | Tái sử dụng endpoint `PUT /api/stores/{storeId}/workstations/{workstationId}` và service `updateStoreWorkstation`. Không thay đổi backend API. |
| **Chuyển đổi Tọa độ** | `spatial.constants.js` | Tái sử dụng hàm toán học `toThreeCoords` và `toBackendCoords`. |
| **Workstation 3D Mesh & Tag** | `WEB-001` (`FurnitureBuilder.js`) | Tái sử dụng `buildWorkstationObject` và `createWorkstationTagSprite`. Cải tiến gắn tag làm con của mesh để tự động đồng bộ vị trí khi kéo. |
| **Phân quyền người dùng** | `CODEBASE_MAP.md` (RBAC matrix) | Kiểm tra `localStorage.getItem('userRole')` chuẩn hóa loại bỏ tiền tố `ROLE_`. |
| **Ràng buộc Schema DB** | `AUD-002` (Mục 3.3) | CSDL và Entity `Workstation` **hoàn toàn không có cột `rotation`**. Phase 2A giữ nguyên schema, không tự ý thêm trường quay. |

---

## 3. THIẾT KẾ KIẾN TRÚC & ĐỐI SOÁT TỌA ĐỘ (COORDINATE SYSTEM)

### 3.1. Đối chiếu không gian tọa độ

```
              Backend / DB Coordinates (Top-Down Blueprint)
              (0, Width) ------------------------ (Length, Width)
                  |                                      |
                  |             Cửa hàng                 |
                  |                                      |
                (0, 0) --------------------------- (Length, 0)

                                      ▲
                         toThreeCoords │ toBackendCoords
                                      ▼

                    Three.js World Coordinates (WebGL Canvas)
             (-Len/2, -Wid/2) ------------------- (Len/2, -Wid/2)
                    |                                      |
                    |                 (0,0,0)              |
                    |                                      |
             (-Len/2,  Wid/2) ------------------- (Len/2,  Wid/2)
```

- **Quy tắc chuyển đổi:**
  $$\text{Three.X} = \text{Backend.X} - \frac{\text{Length}}{2}$$
  $$\text{Three.Y} = \text{Backend.Z (Cao độ)}$$
  $$\text{Three.Z} = \text{Backend.Y} - \frac{\text{Width}}{2}$$
- **Quy tắc nghịch đảo:**
  $$\text{Backend.X} = \text{Three.X} + \frac{\text{Length}}{2}$$
  $$\text{Backend.Y} = \text{Three.Z} + \frac{\text{Width}}{2}$$
  $$\text{Backend.Z} = \text{Three.Y}$$

### 3.2. Cấu trúc thành phần (Component Hierarchy)

```
SpatialWorkspace
 ├── CommandHeader (KPIs, Chọn Chi nhánh)
 ├── SpatialToolbar
 │    └── Button "Bố trí Trạm" (Icon Wrench, RBAC Guard, Indicator Badge)
 ├── WorkstationEditorBanner (Banner nổi thông báo tọa độ nháp, cảnh báo va chạm, nút Lưu / Hủy)
 ├── 3D Canvas (Store3D Viewport)
 │    ├── WorkstationDragController (Raycaster, Floor Plane, Ring Indicator)
 │    └── DynamicGroup
 │         └── wsMesh (Workstation 3D Object)
 │              └── wsTag (Workstation Floating Sprite Tag - Anchored child)
 ├── SpatialInspector (Drawer chi tiết bên phải)
 │    └── CASE 1.5: Thẻ Workstation Inspector, Tọa độ X/Y/Z, Nút Focus, Nút Kích hoạt Di chuyển
 └── SpatialTimeline (Bộ điều khiển dòng thời gian ca làm việc)
```

---

## 4. CHI TIẾT TRIỂN KHAI KÉO THẢ & TRẠNG THÁI (IMPLEMENTATION DETAILS)

### 4.1. WorkstationDragController (`WorkstationDragController.js`)
- **Raycasting:** Bắt chính xác mesh trạm làm việc thông qua `userData.isWorkstation`.
- **Mặt phẳng kéo (Drag Plane):** `THREE.Plane(new THREE.Vector3(0, 1, 0), 0)` đại diện cho mặt sàn cửa hàng.
- **Vòng chỉ thị tương tác (Drag Ring):** Mesh hình khuyên nằm sát sàn (`y = 0.05`), tự động cập nhật vị trí theo tâm của trạm được chọn hoặc đang kéo.
- **Trạng thái màu vòng chỉ thị:**
  - `0x0284C7` (Xanh Cyan): Trạm đang được chọn (Selection active).
  - `0x10B981` (Xanh ngọc): Đang kéo và vị trí hợp lệ (Valid drag preview).
  - `0EF4444` (Đỏ cảnh báo): Đang kéo nhưng va chạm với trạm khác hoặc sát tường (Collision detected).

### 4.2. WorkstationEditorBanner (`WorkstationEditorBanner.jsx`)
- Banner nổi ở góc trên màn hình 3D, hiển thị rõ ràng:
  - Tên trạm và mã trạm đang được điều chỉnh.
  - Tọa độ nháp thời gian thực: `X: ...m`, `Y: ...m`.
  - Cảnh báo trực quan nếu vi phạm khoảng cách an toàn.
  - Nút **Lưu vị trí**: Gọi API `PUT /api/stores/{storeId}/workstations/{workstationId}` (bị disable khi đang va chạm hoặc đang gửi request).
  - Nút **Hủy**: Revert vị trí mesh về ban đầu ngay tức khắc.

### 4.3. Cải tiến neo nhãn Tag (`FurnitureBuilder.js`)
Trong các phiên bản trước, floating sprite tag được thêm trực tiếp vào `dynamicGroup` ở cấp độ thế giới, khiến tag không di chuyển theo mesh khi kéo xem trước. Trong Phase 2A, tag được `add` trực tiếp làm con của `wsMesh` với tọa độ local `(0, 1.6, 0)`. Nhờ đó, Three.js tự động đồng bộ vị trí của nhãn theo trạm 100% mà không tốn chi phí tính toán lại ma trận.

---

## 5. BẰNG CHỨNG KIỂM THỬ (TESTING EVIDENCE)

### 5.1. Unit Test Suite: `WorkstationDragController.test.js`
Chạy bằng `node --test`:
```
▶ PHASE 2A: Workstation Layout Editor & Coordinate Tests
  ✔ toThreeCoords and toBackendCoords roundtrip is accurate (1.6111ms)
  ✔ clampCoordinates keeps positions strictly inside store floor boundaries (3.2166ms)
  ✔ checkCollision detects overlapping or too-close workstations (0.8673ms)
  ✔ selectWorkstation and clearSelection manage state accurately (2.4631ms)
  ✔ revertPosition restores original mesh coordinates on cancel or error (2.2345ms)
  ✔ handles null or missing coordinates safely by defaulting to floor level (0.2436ms)
  ✔ RBAC role check permits ADMIN and MANAGER, rejects STAFF (0.2187ms)
✔ PHASE 2A: Workstation Layout Editor & Coordinate Tests (13.2554ms)
```

### 5.2. Tổng hợp Kiểm thử Toàn diện Frontend Spatial
Chạy đồng thời cả 3 test suites liên quan (`WorkstationDragController`, `FurnitureBuilder`, `staffIdentity`):
```
ℹ tests 21
ℹ suites 3
ℹ pass 21
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 235.7252
```

### 5.3. Production Build Verification (`npm run build`)
```
vite v8.2.1 building client environment for production...
transforming...✓ 2045 modules transformed.
rendering chunks...
dist/assets/SpatialWorkspace-JI2K6CJy.js    235.90 kB │ gzip:  62.41 kB
dist/assets/index-DTRdn-pZ.js             1,575.36 kB │ gzip: 405.82 kB
✓ built in 2.50s
```

### 5.4. Backend Verification (`mvn testCompile` & `mvn test`)
- `mvn testCompile`: **BUILD SUCCESS** trong 6.665s.
- `ShiftAssignmentServiceTest`: **BUILD SUCCESS**, bảo toàn toàn bộ nghiệp vụ ca làm việc và phân vùng.

---

## 6. KHẢ NĂNG TƯƠNG THÍCH NGƯỢC & AN TOÀN (REGRESSION & COMPATIBILITY)

1. **Không sửa đổi DB Schema:** Không thêm trường `rotation` hay bất kỳ cột mới nào vào bảng `workstations`.
2. **Không làm hỏng luồng Mode D (Phòng thử nghiệm):** `WorkstationDragController` và `DragTransfer` hoàn toàn độc lập. Khi một bên hoạt động, bên kia tự động bị vô hiệu hóa để tránh xung đột pointer event.
3. **Không xung đột với OrbitControls:** Khi người dùng bắt đầu kéo trạm, `controls.enabled` được gán `false`, giải phóng hoàn toàn camera để người dùng tập trung điều chỉnh vị trí. Khi nhả chuột, `controls.enabled` được phục hồi về `true`.
4. **Bảo tồn Working Tree:** Tuân thủ tuyệt đối quy tắc Git an toàn: không commit, không push, không reset, không clean working tree.

---

## 7. KẾT LUẬN & ĐỀ XUẤT TIẾP THEO (NEXT STEPS)

Phase 2A đã hoàn thành xuất sắc toàn bộ mục tiêu đề ra:
- [x] Tạo `WorkstationDragController` hỗ trợ raycasting và kéo thả trạm làm việc 3D.
- [x] Tạo `WorkstationEditorBanner` với trạng thái tọa độ và nút Lưu/Hủy.
- [x] Tích hợp CASE 1.5 trong `SpatialInspector` cho trạm làm việc.
- [x] Thêm nút Bố trí Trạm vào `SpatialToolbar` với RBAC guard.
- [x] Tích hợp API `PUT /api/stores/{storeId}/workstations/{workstationId}` với cơ chế rollback vị trí an toàn.
- [x] Đạt 21/21 Unit Tests Passed & Production Build Thành công.

### Hướng phát triển tiếp theo (Phase 2B):
- **Phase 2B — Thêm mới & Xóa Trạm làm việc (Workstation Lifecycle CRUD):**
  - Cho phép quản lý kéo một trạm mới từ thanh công cụ vào mặt bằng 3D (`POST /api/stores/{storeId}/workstations`).
  - Hỗ trợ đổi trạng thái hoạt động (`isActive = false`) hoặc xóa trạm làm việc khi không còn nhu cầu sử dụng.
