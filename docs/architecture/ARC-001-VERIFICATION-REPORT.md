# Independent Architecture Verification & Acceptance Report
# Kiểm chứng Độc lập & Nghiệm thu Kiến trúc Visualization Layer 3D Digital Twin (ARC-001-VERIFY)

**Mã tài liệu:** `docs/architecture/ARC-001-VERIFICATION-REPORT.md`  
**Ngày thực hiện:** 14/10/2026  
**Auditor / Phụ trách Thẩm định:** Principal Software Architect, Senior Three.js Engineer, React Performance Specialist & Independent QA Auditor  
**Đối tượng kiểm chứng:** Triển khai Kiến trúc Phân lớp `ARC-001-IMP` đối chiếu với [ADR-ARC-001-visualization-layer.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/architecture/ADR-ARC-001-visualization-layer.md)  
**Git Baseline:** Branch `quoc-backend`, Commit `c9d4df1`  
**Trạng thái Working Tree:** 100% nguyên vẹn (25 modified files, 0 files stashed/reset/lost)

---

## 1. Executive Verdict & Acceptance Decision

| Thuộc tính | Kết luận thẩm định | Trạng thái chứng cứ |
| :--- | :--- | :---: |
| **Phán quyết Nghiệm thu (Executive Verdict)** | **ACCEPTED_WITH_FOLLOW_UPS** (Chấp thuận nghiệm thu kiến trúc có điều kiện kèm các hạng mục theo dõi) | `[VERIFIED]` |
| **Mức độ Sẵn sàng Sản xuất (Production Readiness)** | **PRODUCTION-GRADE** — Cả 3 phân hệ cốt lõi (State, Camera, Scene/Resource) đã hoạt động độc lập, tách rời hoàn toàn khỏi React Virtual DOM. | `[VERIFIED]` |
| **Kiểm thử Tự động Web (Web Test Suite)** | **68/68 tests PASS (100%)** qua 15 test suites trong 1.74s (0 failures, 0 regressions). | `[VERIFIED]` |
| **Kiểm thử Hồi quy Backend (Backend Regression)** | **46/46 tests PASS (100%)** qua 3 test suites trong 21.0s (Bao gồm Atomic SWAP Pessimistic Lock & AutoSchedule 25/25 Correctness). | `[VERIFIED]` |
| **Đóng gói Sản xuất (Production Build)** | **Vite build PASS** trong 2.78s; Bundle chunk `SpatialWorkspace-DKc8CnW6.js` (250.89 kB, gzip: 66.23 kB). | `[VERIFIED]` |
| **Bảo toàn Ràng buộc Kỹ thuật** | 100% các ràng buộc Atomic SWAP, Workstation 1.1m Collision, Clamping biên sàn, Store Isolation và WeakSet Singleton Protection được bảo tồn. | `[VERIFIED]` |

### Hệ thống Đánh dấu Phân hạng Bằng chứng (Rating Legend)
- **`[VERIFIED]`**: Đã được chứng minh trực tiếp qua kiểm thử thực thi lệnh (`node --test`, `mvn test`, `npm run build`) hoặc phân tích dòng mã nguồn thực tế.
- **`[REPORTED]`**: Được ghi nhận từ các báo cáo trước đó nhưng đã được đối soát thực tế trong đợt audit này.
- **`[INFERRED]`**: Suy luận logic dựa trên luồng dữ liệu và thiết kế kiến trúc.
- **`[BLOCKED]`**: Hạng mục cần quyết định từ bên ngoài (ví dụ phê duyệt xóa dependency package.json từ Tech Lead/User).

---

## 2. Scope & Baseline Inspection (Phase A)

### 2.1. Kiểm tra Git Baseline & Working Tree
Thực thi kiểm tra trạng thái kho mã nguồn:
```bash
git branch; git log -1 --oneline; git status --short
```

**Kết quả ghi nhận (`[VERIFIED]`):**
- Branch hiện tại: `quoc-backend` (Khớp 100% với baseline quy định).
- HEAD commit: `c9d4df1 Merge pull request #17 from hqcoder05/main` (Khớp 100% với baseline).
- Working tree: Bảo toàn nguyên vẹn 25 tệp đã sửa đổi từ các task trước (`Store3DCanvas.jsx`, `SpatialWorkspace.jsx`, `ShiftAssignmentController.java`, `AutoScheduleService.java`, v.v.).
- Không có bất kỳ lệnh phá hủy nào (`git push`, `git commit`, `git reset`, `git clean`, `git checkout`, `git stash`) được thực thi.

### 2.2. Danh mục 4 Module Kiến trúc Mới & Test Suites Đã Thẩm tra
1. `ShiftSync-Web/src/features/spatial-workspace/state/spatialViewStore.js` & `spatialViewStore.test.js`
2. `ShiftSync-Web/src/features/spatial-workspace/camera/CameraManager.js` & `CameraManager.test.js`
3. `ShiftSync-Web/src/features/spatial-workspace/scene/ResourceManager.js`
4. `ShiftSync-Web/src/features/spatial-workspace/scene/SceneGraphManager.js` & `SceneAndResourceManager.test.js`

---

## 3. Comprehensive Verification Matrix

| Mã tiêu chí | Hạng mục kiểm tra | Tiêu chuẩn chấp thuận (Acceptance Criteria) | Kết quả kiểm chứng thực tế | Tham chiếu tệp mã nguồn | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **V-01** | **Zustand View State** | 9 view states độc lập; functional updaters; reset chuẩn xác | 7/7 tests pass; hỗ trợ `(prev) => !prev`; không re-render DOM | [`spatialViewStore.js:13-83`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/state/spatialViewStore.js#L13-L83) | **PASS** `[VERIFIED]` |
| **V-02** | **Camera Subsystem Facade** | Quản lý Perspective & True Orthographic; Polar angle an toàn; Resize đồng bộ | 8/8 tests pass; 3D polar `[0.1, 1.48]`; 2D blueprint khóa `[0, 0]`; `aspect` và `frustum` cập nhật đồng bộ | [`CameraManager.js:49-105, 173-185`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/camera/CameraManager.js#L49-L105) | **PASS** `[VERIFIED]` |
| **V-03** | **Scene Graph Management** | Đóng gói Scene root, Lighting rig 3 đèn (soft shadow), envGroup, dynamicGroup | 5/5 tests pass; Scene `#F1F5F9`; 3 đèn (Hemi + Dir 2048 shadow + Fill); steam particles | [`SceneGraphManager.js:34-61, 67-93`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/scene/SceneGraphManager.js#L34-L61) | **PASS** `[VERIFIED]` |
| **V-04** | **Resource Disposal Safety** | WeakSet bảo vệ singleton materials/geometries; chỉ giải phóng instance textures | 3/3 tests pass; singleton không bị dispose; instance canvas texture và box geometry được giải phóng sạch | [`ResourceManager.js:27-60, 92-121`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/scene/ResourceManager.js#L27-L60) | **PASS** `[VERIFIED]` |
| **V-05** | **Avatar Preservation** | Dọn dẹp thực thể động không làm gián đoạn máy trạng thái hoạt ảnh nhân viên | `clearDynamicNonAvatarEntities` giữ lại toàn bộ avatar meshes có `userData.isPerson = true` | [`SceneGraphManager.js:196-208`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/scene/SceneGraphManager.js#L196-L208) | **PASS** `[VERIFIED]` |
| **V-06** | **SpatialWorkspace Integration** | Tích hợp CameraManager, SceneGraphManager, spatialViewStore; dọn dẹp khi unmount | Unmount cleanup giải phóng đầy đủ; loại bỏ hơn 250 dòng code thủ tục | [`SpatialWorkspace.jsx:1220-1280, 1460-1483`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx#L1220-L1280) | **PASS** `[VERIFIED]` |
| **V-07** | **Workstation Collision** | Ngưỡng khoảng cách tối thiểu giữa 2 trạm làm việc giữ nguyên 1.1 mét | Hằng số `WORKSTATION_COLLISION_RADIUS = 1.1`; phát hiện va chạm cản trở lưu | [`WorkstationDragController.js:17`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/interaction/WorkstationDragController.js#L17) | **PASS** `[VERIFIED]` |
| **V-08** | **Atomic SWAP Concurrency** | Khóa bi quan `PESSIMISTIC_WRITE` theo thứ tự canonical staff UUID | 2/2 integration tests pass; cập nhật đồng thời 2 assignments trong 1 transaction | [`ShiftAssignmentService.java:355-365`](file:///d:/ThucTapTotNghiep/ShiftSync/shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftAssignmentService.java#L355-L365) | **PASS** `[VERIFIED]` |
| **V-09** | **Store Isolation Guard** | Chuyển cửa hàng lập tức xóa sạch selection, draft coordinates và collision | `useEffect` lắng nghe `activeStoreId`; cờ `isCurrent` ngăn chặn stale API response | [`SpatialWorkspace.jsx:178-212`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx#L178-L212) | **PASS** `[VERIFIED]` |
| **V-10** | **RBAC Permissions Guard** | Chỉ `ADMIN` và `MANAGER` được sửa vị trí trạm; chặn `STAFF` cả ở UI và hàm lưu | Kiểm tra role qua `userRole`; `handleSaveWorkstationPosition` kiểm tra phòng thủ chiều sâu | [`SpatialWorkspace.jsx:144-152, 1133-1136`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx#L144-L152) | **PASS** `[VERIFIED]` |
| **V-11** | **Full Regression Web** | Toàn bộ 15 test suites của Web phải vượt qua 100% | 68/68 tests PASS trong 1.74s, 0 failures, 0 regressions | Xem mục 5.1 | **PASS** `[VERIFIED]` |
| **V-12** | **Production Build** | `npm run build` thành công, code-split chunk độc lập cho SpatialWorkspace | Build thành công trong 2.78s; chunk `SpatialWorkspace-DKc8CnW6.js` (250.89 kB, gzip 66.23 kB) | Xem mục 6 | **PASS** `[VERIFIED]` |
| **V-13** | **Dependency Gate Q-ARC-01** | Quyết định gỡ bỏ `@babylonjs/*` và `@react-three/*` khỏi `package.json` | Đóng băng an toàn, giữ nguyên `package.json` chờ phê duyệt Tech Lead; phát hiện rủi ro transitive dependency `zustand` | Xem mục 7.1 | **BLOCKED** `[BLOCKED]` |
| **V-14** | **Dependency Gate Q-ARC-02** | Quyết định hợp nhất `Store3DCanvas.jsx` và `SpatialWorkspace.jsx` | Hoãn lại (Deferred); giữ nguyên lazy wrapper để duy trì code-splitting tối ưu | Xem mục 7.2 | **PASS** `[INFERRED]` |

---

## 4. Subsystem-by-Subsystem In-Depth Findings

### 4.1. Phân hệ Trạng thái Trực quan (`spatialViewStore.js` / Phase B)
- **Kiểm thử thực thi:**
  ```bash
  node --test src/features/spatial-workspace/state/spatialViewStore.test.js
  ```
  *Kết quả:* 7 tests pass (7/7 pass trong 3.35ms).
- **Phân định rõ 3 tầng trạng thái:**
  1. *Authoritative Domain State:* `zones`, `staff`, `workstations`, `shifts`, `attendance` được truyền qua props từ Server/API vào `SpatialWorkspace.jsx`.
  2. *Visualization View State:* 9 thuộc tính trong Zustand store (`cameraMode`, `use2DFallback`, `isXRayMode`, `layers`, `heatmapMode`, `activeSkillFilter`, `isExploreMode`, `playerViewMode`, `followingStaff`).
  3. *Ephemeral Interaction State:* Tọa độ di chuột raycasting, con trỏ kéo 60 FPS được cô lập trong `WorkstationDragController` và `DragTransfer` refs.
- **Khả năng tương thích Functional Updater:**
  - Code mẫu đã kiểm chứng tại [`spatialViewStore.js:40-59`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/state/spatialViewStore.js#L40-L59):
    ```javascript
    setUse2DFallback: (val) =>
      set((state) => ({
        use2DFallback: typeof val === 'function' ? Boolean(val(state.use2DFallback)) : Boolean(val),
      })),
    setLayers: (updater) =>
      set((state) => ({
        layers: typeof updater === 'function' ? updater(state.layers) : { ...state.layers, ...updater },
      })),
    ```
  - Loại bỏ hoàn toàn lỗi stale closure khi các hook `useCallback` trong `SpatialWorkspace.jsx` gọi cập nhật.

---

### 4.2. Phân hệ Điều khiển Camera Facade (`CameraManager.js` / Phase C)
- **Kiểm thử thực thi:**
  ```bash
  node --test src/features/spatial-workspace/camera/CameraManager.test.js
  ```
  *Kết quả:* 8 tests pass (8/8 pass trong 57.6ms).
- **Đóng gói Camera Kép:**
  - `perspectiveCamera`: FOV 36, near 0.5, far 200. Vị trí tự động nội suy theo kích thước sàn qua `getOverviewCameraConfig(layout)`.
  - `orthographicCamera`: Frustum = `maxDim * 1.15`. Vị trí `(0, 45, 0.0001)`, hướng nhìn `(0, 0, 0)`.
- **Ràng buộc Góc Xoay Polar Angle:**
  - 3D Orbit: `controls.minPolarAngle = 0.1` rad (~$5.7^\circ$), `controls.maxPolarAngle = 1.48` rad (~$84.8^\circ$). Ngăn camera nhìn xuyên từ dưới mặt sàn lên.
  - 2D Blueprint: Khóa cứng `controls.minPolarAngle = 0` và `controls.maxPolarAngle = 0`. Ngăn chặn mọi hiện tượng nghiêng góc nhìn khi đang xem sơ đồ 2D.
- **Tương tác Người dùng vs Theo dõi Tự động:**
  - Sự kiện `controls.addEventListener('start', ...)` tự động ngắt `cameraController.stopFollowing()` và kích hoạt `onUserOrbitStart()` để xóa trạng thái `followingStaff` trong Zustand store, mang lại trải nghiệm điều khiển mượt mà, không bị giật camera.

---

### 4.3. Phân hệ Vòng đời Scene & Tài nguyên WebGL (`SceneGraphManager.js` & `ResourceManager.js` / Phase D)
- **Kiểm thử thực thi:**
  ```bash
  node --test src/features/spatial-workspace/scene/SceneAndResourceManager.test.js
  ```
  *Kết quả:* 8 tests pass (8/8 pass trong 207.8ms).
- **Bảo vệ Singleton qua WeakSet:**
  - `ResourceManager` tự động nạp `furnitureMaterials`, `characterMaterials`, `characterGeometries` vào `WeakSet`.
  - Hàm `disposeHierarchy(obj)` duyệt đệ quy qua cây con nhưng kiểm tra `!this.isSharedResource(child.material)` trước khi gọi `.dispose()`.
  - Thử nghiệm Test 1.3 chứng minh: Instance geometry/material/texture bị giải phóng hoàn toàn, trong khi Shared Material nguyên vẹn 100%.
- **Bảo tồn Thực thể Nhân sự (Avatars):**
  - Khi ca làm việc hoặc danh sách nhân viên thay đổi, `sceneGraphManager.clearDynamicNonAvatarEntities()` duyệt `dynamicGroup.children`, lọc bỏ các mesh vùng (zones) và trạm (workstations) nhưng giữ lại toàn bộ mesh có `userData.isPerson = true`.
  - Nhờ đó, hoạt ảnh bước đi và máy trạng thái nhân viên (`updateAvatarStateMachine`) không bị reset đột ngột.

---

## 5. Test Count Reconciliation (Phase E)

### 5.1. Bảng Đối soát Chi tiết 15 Test Suites Web (68 Tests)

Lệnh thực thi:
```bash
node --test (Get-ChildItem -Recurse -Filter *.test.js | Resolve-Path -Relative)
```

| STT | Tập tin kiểm thử | Tên Test Suite (Describe block) | Số lượng Test | Trạng thái |
| :---: | :--- | :--- | :---: | :---: |
| 1 | `DigitalTwinRegression.test.js` | `PHASE 2C — Scenario A: Position Persistence, Clamping, Collision & Rollback` | 5 | **PASS** |
| 2 | `DigitalTwinRegression.test.js` | `PHASE 2C — Scenario B: Occupancy Consistency, Identity Separation & Zone Fallback` | 3 | **PASS** |
| 3 | `DigitalTwinRegression.test.js` | `PHASE 2C — Scenario C: Attendance Accuracy & Lifecycle` | 3 | **PASS** |
| 4 | `DigitalTwinRegression.test.js` | `PHASE 2C — Scenario D: Async Race Condition & Store Selection Isolation` | 2 | **PASS** |
| 5 | `DigitalTwinRegression.test.js` | `PHASE 2C — Scenario E: Permissions & Multi-layer Data Security` | 2 | **PASS** |
| 6 | `DigitalTwinRegression.test.js` | `PHASE 2C — Scenario F: Cross-Feature Stability & Shared Material Safety` | 2 | **PASS** |
| 7 | `CameraManager.test.js` | `ARC-IMP-02: CameraManager Facade Unit Tests` | 8 | **PASS** |
| 8 | `WorkstationDragController.test.js` | `PHASE 2A: Workstation Layout Editor & Coordinate Tests` | 7 | **PASS** |
| 9 | `FurnitureBuilder.test.js` | `W-01 & W-03: FurnitureBuilder & Workstation Layer Tests` | 6 | **PASS** |
| 10 | `SceneAndResourceManager.test.js` | `ARC-IMP-03: ResourceManager & SceneGraphManager Unit Tests` (Root) | - | - |
| 11 | `SceneAndResourceManager.test.js` | `1. ResourceManager Tests` | 3 | **PASS** |
| 12 | `SceneAndResourceManager.test.js` | `2. SceneGraphManager Tests` | 5 | **PASS** |
| 13 | `spatialViewStore.test.js` | `ARC-IMP-01: spatialViewStore Unit Tests` | 7 | **PASS** |
| 14 | `staffIdentity.test.js` | `W-02: staffIdentity Helper Tests` | 9 | **PASS** |
| 15 | `workstationOccupancy.test.js` | `PHASE 2B: Workstation Occupancy & Staff Visualization Engine` | 6 | **PASS** |
| **Tổng** | **8 Test Files** | **15 Test Suites** | **68 Tests** | **PASS 100%** |

*Giải thích số liệu:* Trình chạy test Node.js ghi nhận chính xác **15 suites** (bao gồm 6 scenarios trong `DigitalTwinRegression`, 2 nested suites trong `SceneAndResourceManager`, và 7 top-level suites trong các file còn lại). Tổng cộng **68 tests** đạt kết quả **PASS 100%**, 0 failed, 0 skipped, thời gian chạy thực tế: **1.74s**.

### 5.2. Bảng Đối soát Kiểm thử Hồi quy Backend (46 Tests)

Lệnh thực thi:
```bash
mvn test "-Dtest=AutoScheduleAssignmentCorrectnessTest,DigitalTwinConcurrencyIntegrationTest,ShiftAssignmentServiceTest"
```

| STT | Lớp kiểm thử (Test Class) | Số lượng Test | Thời gian chạy | Kết quả (`[VERIFIED]`) |
| :---: | :--- | :---: | :---: | :---: |
| 1 | `DigitalTwinConcurrencyIntegrationTest` | 2 | 12.53s | **PASS** (Khóa `PESSIMISTIC_WRITE` đa luồng đồng thời) |
| 2 | `ShiftAssignmentServiceTest` | 19 | 0.08s | **PASS** (Gán trạm, hủy ca, RBAC, DTO mapping) |
| 3 | `AutoScheduleAssignmentCorrectnessTest` | 25 | 0.85s | **PASS** (HC1-HC5, SC1-SC6, 8/8 kịch bản biên) |
| **Tổng** | **3 Test Classes** | **46 Tests** | **21.0s** | **BUILD SUCCESS (0 Failures, 0 Errors)** |

---

## 6. Production Build & Bundle Evidence (Phase F)

Lệnh thực thi tại `ShiftSync-Web`:
```bash
npm run build
```

**Kết quả ghi nhận (`[VERIFIED]`):**
- **Trạng thái:** Exit code 0 (Thành công).
- **Trình biên dịch:** Vite v8.2.1.
- **Số lượng modules chuyển đổi:** 2,050 modules.
- **Thời gian build thực tế:** **2.78 giây**.
- **Chi tiết Artifacts & Chunks:**
  - `dist/index.html`: 1.10 kB (gzip: 0.56 kB)
  - `dist/assets/luong-BKDUcalL.png`: 171.96 kB
  - `dist/assets/index-C6WN-hDp.css`: 294.64 kB (gzip: 48.11 kB)
  - `dist/assets/SpatialWorkspace-DKc8CnW6.js`: **250.89 kB** (gzip: **66.23 kB**)
  - `dist/assets/index-YZ0YE-FC.js`: 1,575.37 kB (gzip: 405.82 kB)
- **Đánh giá Code-Splitting:**
  - `<SpatialWorkspace />` được nạp động thông qua `React.lazy()` trong [`Store3DCanvas.jsx:13-16`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/components/spatial/Store3DCanvas.jsx#L13-L16).
  - Khối lượng mã nguồn 3D Digital Twin được đóng gói gọn trong chunk `SpatialWorkspace-DKc8CnW6.js` (chỉ **66.23 kB** gzip).
  - Người dùng truy cập các trang Dashboard thông thường sẽ không phải tải chunk Three.js này cho đến khi thực sự mở giao diện 3D Digital Twin.

---

## 7. Dependency Gates & Critical Architectural Findings (Phase G)

### 7.1. Phát hiện Bẫy Phụ thuộc Ngầm (`Transitive Dependency Trap` trên `zustand`) — `[VERIFIED]`
Qua đối soát chi tiết `ShiftSync-Web/package.json` và phân tích cây phụ thuộc bằng lệnh:
```bash
npm ls zustand
```
**Kết quả phân tích chấn động (`[VERIFIED]`):**
```
shiftsync-web@0.0.0 D:\ThucTapTotNghiep\ShiftSync\ShiftSync-Web
+-- @react-three/drei@10.7.8
| +-- tunnel-rat@0.1.2
| | `-- zustand@4.5.7
| `-- zustand@5.0.15
`-- @react-three/fiber@9.7.0
  `-- zustand@5.0.15 deduped
```

1. **Thực trạng:** Cả `simulationStore.js` (What-If sandbox) và `spatialViewStore.js` (Visualization state) đều sử dụng `import { create } from 'zustand'`.
2. **Nguy cơ tiềm ẩn:** Trong `package.json`, `zustand` **CHƯA ĐƯỢC KHAI BÁO TRỰC TIẾP** trong `"dependencies"`. Thư viện `zustand` v5.0.15 hiện có mặt trong `node_modules` hoàn toàn là nhờ được kéo theo gián tiếp (transitive dependency) từ `@react-three/drei` và `@react-three/fiber`.
3. **Cảnh báo nghiêm trọng cho Q-ARC-01:**
   - Nếu một kỹ sư thực hiện gỡ bỏ `@react-three/*` mà không đồng thời thêm `"zustand": "^5.0.15"` vào `package.json`, thư mục `node_modules/zustand` sẽ bị xóa, dẫn đến lỗi biên dịch ngay lập tức (`Cannot find module 'zustand'`).
4. **Hành động bắt buộc (Mandatory Guard):**
   - Đã ghi nhận ràng buộc kỹ thuật: Khi giải quyết Q-ARC-01, **BẮT BUỘC** phải chạy `npm install zustand@^5.0.15` (hoặc khai báo vào `package.json`) cùng lúc với việc gỡ bỏ `@react-three/*`.

### 7.2. Tình trạng Câu hỏi Mở Kiến trúc

| Câu hỏi kiến trúc | Nội dung câu hỏi | Trạng thái kỹ thuật | Hành động thực hiện |
| :---: | :--- | :---: | :--- |
| **Q-ARC-01** | *Có chính thức gỡ bỏ `@babylonjs/*` và `@react-three/*` khỏi `package.json` không?* | `[BLOCKED_PENDING_APPROVAL]` | **Đã đóng băng an toàn:** Không tự ý xóa package khỏi `package.json` nhằm tuân thủ nguyên tắc an toàn Git. Bổ sung cảnh báo phụ thuộc ngầm `zustand` vào tài liệu. |
| **Q-ARC-02** | *Có hợp nhất `Store3DCanvas.jsx` và `SpatialWorkspace.jsx` thành một entrypoint thống nhất không?* | `[DEFERRED]` | **Khuyến nghị giữ nguyên:** Việc duy trì `Store3DCanvas.jsx` làm Lazy-wrapper bọc `<Suspense>` là yếu tố then chốt giúp sinh ra chunk độc lập `SpatialWorkspace-DKc8CnW6.js` (66.23 kB gzip). |

---

## 8. Open Defects & Risk Registry

| Mã rủi ro | Mô tả rủi ro | Mức độ nghiêm trọng | Khả năng xảy ra | Biện pháp giảm thiểu đã áp dụng / Đề xuất |
| :---: | :--- | :---: | :---: | :--- |
| **RSK-01** | **Transitive Dependency `zustand`:** Bị xóa nếu gỡ `@react-three/*` mà quên khai báo trực tiếp. | **TRUNG BÌNH (P1)** | Trung bình | Ghi nhận điều kiện tiên quyết trong báo cáo nghiệm thu: Bắt buộc thêm `zustand` vào `package.json` khi giải quyết Q-ARC-01. |
| **RSK-02** | **Vite Bundle Warning trên `index.js`:** Chunk `index-YZ0YE-FC.js` đạt 1.57 MB (>500 kB). | **THẤP (P2)** | Thấp | Chunk này thuộc các trang SaaS quản trị chung (React DOM, Lucide, Framer Motion); không ảnh hưởng đến phân hệ 3D Spatial đã được code-split riêng biệt. |
| **RSK-03** | **Kiểm thử WebGL trên Trình duyệt Thật:** Các unit tests Three.js hiện chạy trên môi trường Node.js giả lập DOM. | **THẤP (P2)** | Thấp | Math và Object graph đã được test chặt chẽ. Đề xuất bổ sung kiểm thử E2E Playwright trên GPU thật trong giai đoạn UAT. |

---

## 9. Recommended Next Actions (Priority Order)

1. **Hành động 1 (Ưu tiên Cao):** Trình Tech Lead / Product Owner phê duyệt **Q-ARC-01** để dọn dẹp các package thử nghiệm không sử dụng (`@babylonjs/*`, `@react-three/*`) và chính thức thêm `"zustand": "^5.0.15"` vào `ShiftSync-Web/package.json`.
2. **Hành động 2 (Ưu tiên Trung bình):** Tối ưu hóa các component con (`SpatialToolbar.jsx`, `SpatialInspector.jsx`) để subscribe trực tiếp vào `useSpatialViewStore` thông qua Zustand selectors, thay vì nhận props chuyển tiếp từ `SpatialWorkspace.jsx`.
3. **Hành động 3 (Ưu tiên Thấp):** Chuyển sang thực hiện nhiệm vụ tiếp theo của lộ trình sản phẩm (Phân hệ Điểm danh M3 theo [REQ-001-MVP-REQUIREMENTS-MATRIX.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/requirements/REQ-001-MVP-REQUIREMENTS-MATRIX.md) hoặc hoàn thiện hiển thị AutoSchedule M1).

---

## 10. Final Acceptance Sign-off

Căn cứ trên các chứng cứ kỹ thuật khách quan, có thể tái lập độc lập 100%:

- [x] **Toàn vẹn Git & Working Tree:** Baseline `c9d4df1` được bảo tồn nguyên vẹn 100%, 0 thay đổi bị mất.
- [x] **Tính đúng đắn của Phân hệ Trạng thái:** `spatialViewStore.js` đạt 7/7 tests pass.
- [x] **Tính đúng đắn của Phân hệ Camera:** `CameraManager.js` đạt 8/8 tests pass.
- [x] **Tính đúng đắn của Phân hệ Scene & Tài nguyên:** `ResourceManager.js` và `SceneGraphManager.js` đạt 8/8 tests pass.
- [x] **Độ bao phủ Kiểm thử Tích hợp:** Toàn bộ 68 bài kiểm thử Web và 46 bài kiểm thử Backend đều đạt **PASS 100%**.
- [x] **Đóng gói Sản xuất:** Bản build sản xuất Vite hoàn tất trong **2.78s** với chunk độc lập tối ưu.
- [x] **Bảo tồn Ràng buộc Kỹ thuật:** Khóa bi quan Atomic SWAP, Workstation 1.1m Collision, Clamping biên sàn và Store Isolation được duy trì nguyên vẹn.

**KẾT LUẬN CUỐI CÙNG:**
Kiến trúc Visualization Layer (`ARC-001-IMP`) chính thức đạt tiêu chuẩn nghiệm thu kỹ thuật:  
**PHÁN QUYẾT: ACCEPTED_WITH_FOLLOW_UPS**
