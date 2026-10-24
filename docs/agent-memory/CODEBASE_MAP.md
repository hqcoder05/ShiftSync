# ShiftSync — Codebase Architecture & Technical Map (CODEBASE MAP)
Mã tài liệu: `docs/agent-memory/CODEBASE_MAP.md`  
Cập nhật lần cuối: 24/10/2026 | Baseline: `c9d4df1`  
Quy ước nhãn trạng thái chứng cứ:
- `[VERIFIED]`: Đã được chứng minh trực tiếp qua mã nguồn, kiểm thử tự động, hoặc runtime thực tế trên commit `c9d4df1`.
- `[REPORTED]`: Được nêu trong báo cáo trước (`AUD-001.*`, `AUD-002`) nhưng chưa chạy lại kiểm thử độc lập trong đợt này.
- `[INFERRED]`: Giả thuyết suy luận logic từ cấu trúc code, cần kiểm chứng khi đụng tới.
- `[UNKNOWN]`: Chưa đủ bằng chứng để kết luận.

---

## 1. Bản đồ luồng dữ liệu End-to-End (Verified Full-Stack Mappings)

### UI-023 — Header gọn [VERIFIED]
- Attendance/Marketplace/EmployeeModuleLayout dùng tiêu đề gọn, không banner giới thiệu và eyebrow. Theo preference người dùng, tránh mặc định thêm banner tương tự vào trang nghiệp vụ.


### Chấm công & Phép ATT-022 [VERIFIED]
- Dialog chỉnh công/nghỉ phép/giải trình/tác động quản lý focus vòng lặp, Escape kích hoạt nút đóng chưa disabled, phục hồi focus/body overflow khi đóng; filter options dùng button native.

- `AttendancePageLive.jsx` phục vụ `/attendance`, `/attendance/explain`, `/attendance/leave`; query `tab` hợp lệ ưu tiên hơn pathname. Tab buttons điều hướng route tương ứng. CSS `pages/attendance-redesign.css` import cuối App, scope `.att-page`. Bảng chấm công và hai bảng yêu cầu cuộn ngang nội bộ; filter mobile toggle dưới 1000px. API/service phê duyệt và tạo đơn giữ nguyên.


### Giao diện HR-021 [VERIFIED]
- `EmployeeModuleLayout.jsx` dùng links danh sách/hợp đồng/payroll/vị trí/chi nhánh. `/employees/contracts` tái dùng Employees với tiêu đề và CTA hợp đồng dẫn `/employees/:id?tab=contract`. `EmployeeDetailPage.jsx` có panel hợp đồng từ assignedStores và panel chấm công từ attendance; lịch/payroll hiển thị đúng vùng theo `data-profile-tab`.
- CSS chung `components/employee-module-redesign.css` import cuối `App.jsx`; dữ liệu/service cũ giữ nguyên. Mobile bảng là vùng scroll ngang, document không tràn; dock profile static. Browser dùng fixture, chưa kiểm chứng backend write.


### Chợ ca mở — bổ sung MKT-020 [VERIFIED]
- Web dùng bố cục bảng điều phối; bộ lọc khung giờ là button với `aria-pressed`, tìm kiếm có nhãn truy cập và bộ lọc mobile có trạng thái mở/đóng. Các service/handler vẫn dùng luồng hiện có.

### Chợ ca mở — giao diện MKT-019 [VERIFIED]
- Route `/marketplace`: `ShiftSync-Web/src/pages/MarketplacePage.jsx`; CSS gốc `MarketplacePage.css` và lớp thiết kế `marketplace-redesign.css`. Giao diện quản lý có bộ lọc, tìm kiếm và bốn tab; bộ lọc thu gọn dưới 1000px; bảng nằm trong vùng cuộn ngang. Dữ liệu vẫn qua các service marketplace, shifts và requests hiện có.


### 1.1 Phân hệ Digital Twin & 3D Spatial Workspace
| Luồng nghiệp vụ | Frontend Component | Web Service / Store | REST API Endpoint | Backend Controller / Service | JPA Entity / DB Table | Trạng thái chứng cứ |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **Lấy mặt bằng cửa hàng** | `SpatialWorkspace.jsx` | `layoutService.getStoreLayout(storeId)` | `GET /api/stores/{storeId}/layouts/active` | `LayoutController` → `LayoutService.getActiveLayout` | `StoreLayout` → `store_layouts` | `[VERIFIED]` (c9d4df1) |
| **Lấy danh sách phân vùng** | `SpatialWorkspace.jsx`, `TwoDSpatialSchematic.jsx` | `layoutService.getStoreZones(storeId)` | `GET /api/stores/{storeId}/zones` | `LayoutController` → `LayoutService.getZones` | `StoreZone` → `store_zones` | `[VERIFIED]` (c9d4df1) |
| **Lấy trạm làm việc** | `SpatialWorkspace.jsx`, `FurnitureBuilder.js` | `layoutService.getStoreWorkstations(storeId)` | `GET /api/stores/{storeId}/workstations` | `LayoutController` → `LayoutService.getWorkstations` | `Workstation` → `workstations` | `[VERIFIED]` (c9d4df1, WEB-001) |
| **Cập nhật & Xoay vị trí trạm làm việc** | `SpatialWorkspace.jsx`, `WorkstationDragController.js`, `WorkstationEditorBanner.jsx`, `SpatialInspector.jsx` | `layoutService.updateStoreWorkstation(storeId, wsId, data)` | `PUT /api/stores/{storeId}/workstations/{workstationId}` | `LayoutController.updateWorkstation` → `LayoutService.updateWorkstation` | `Workstation` → `workstations` | `[VERIFIED]` (c9d4df1, PHASE-2A, WEB-004) |
| **Lấy ca làm việc & phân công** | `SpatialWorkspace.jsx`, `SpatialTimeline.jsx` | `shiftService.getShiftsByDate(storeId, date)` | `GET /api/stores/{storeId}/shifts?date={date}` | `ShiftController` → `ShiftService.getShiftsByDate` | `Shift`, `ShiftAssignment` → `shifts`, `shift_assignment` (Cột `workstation_id` đã mở khóa) | `[VERIFIED]` (c9d4df1, PHASE-2B) |
| **Lấy điểm danh thực tế** | `SpatialWorkspace.jsx`, `workstationOccupancy.js` | `attendanceService.getStoreAttendance(storeId, from, to)` | `GET /api/stores/{storeId}/attendance` | `AttendanceController` → `AttendanceService.getStoreAttendance` | `Attendance` → `attendance` (`workstation_id`, `check_in_time`, `check_out_time`) | `[VERIFIED]` (c9d4df1, PHASE-2B) |
| **Đổi chỗ 2 nhân sự (SWAP)** | `SpatialInspector.jsx`, `SpatialWorkspace.jsx` | `shiftService.swapStaffZones(storeId, shiftId, payload)` | `POST /api/stores/{storeId}/shifts/{shiftId}/assignments/swap` | `ShiftAssignmentController.swapStaffZones` → `ShiftAssignmentService.swapStaffZones` | `ShiftAssignment` (Locking: `PESSIMISTIC_WRITE`) | `[VERIFIED]` (c9d4df1, FIX-001C, 21/21 tests pass) |
| **Điều chuyển 1 nhân sự (TRANSFER)** | `DragTransfer.js`, `SpatialInspector.jsx` | `shiftService.assignStaffToShift` / `shiftService.updateAssignment` | `POST /api/stores/{storeId}/shifts/{shiftId}/assignments` | `ShiftAssignmentController` → `ShiftAssignmentService` | `ShiftAssignment` | `[VERIFIED]` (c9d4df1, FIX-001A) |
| **Thử nghiệm What-If** | `simulationStore.js`, `SimulationImpactCalculator.js` | Local Zustand store (Client-side simulation) | Không gọi API khi đang thử nghiệm; chỉ gọi batch apply khi người dùng nhấn "Lưu & Phát hành" | N/A | Local in-memory state | `[VERIFIED]` (c9d4df1) |
| **Góc nhìn Overview 3D & Heatmap** | `SpatialWorkspace.jsx`, `DigitalTwinCanvas.jsx`, `DigitalTwinMaterialEnhancer.js`, `WorkstationAssetModel.jsx`, `OverviewCameraController.jsx`, `ZoneStatus.js`, `ZoneDecals.js`, `SpatialToolbar.jsx`, `AttentionCenter.jsx` | `useSpatialViewStore` (View State) | Tích hợp dữ liệu từ `shifts` (`zoneReqMap`), `store_zones` và `workstations` unassigned | N/A (Frontend data-driven heatmap & attention queue) | N/A | `[VERIFIED]` (c9d4df1, WEB-002, WEB-004, R3F-001, ASSET-002, ASSET-003, ASSET-006, 104/104 tests pass) |
| **Khám phá First-Person 3D & Point Lock** | `DigitalTwinCanvas.jsx`, `FirstPersonController.jsx`, `PlayerController.js`, `ExploreHUD.jsx`, `SpatialWorkspace.jsx` | `useSpatialViewStore` (`isExploreMode`) | Tọa độ cửa hàng, cột kiến trúc và mesh thực thể 3D | N/A (Client-side WASD physics, target tracking & column obstacle collision) | N/A | `[VERIFIED]` (c9d4df1, WEB-002, WEB-004, R3F-001, 8/8 tests pass) |

### 1.2 Phân hệ Xếp ca Tự động & Quản lý Ca (AutoSchedule Engine)
| Luồng nghiệp vụ | Frontend Component | Web Service / Store | REST API Endpoint | Backend Controller / Service | JPA Entity / DB Table | Trạng thái chứng cứ |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **Xếp ca tự động (Auto-Schedule)** | `ScheduleCalendar.jsx` / `SpatialToolbar.jsx` | `shiftService.autoSchedule(storeId, payload)` | `POST /api/stores/{storeId}/shifts/auto-schedule` | `ShiftController.autoSchedule` → `AutoScheduleService.autoSchedule` | `Shift`, `ShiftAssignment`, `ShiftSkillRequirement` → `shifts`, `shift_assignment`, `shift_skill_requirements` | `[VERIFIED]` (PHASE-3, 99/99 tests pass) |
| **Lấy cấu hình thuật toán** | `SchedulerSettingsModal.jsx` | `storeService.getSchedulerConfig(storeId)` | `GET /api/stores/{storeId}/scheduler-config` | `SchedulerConfigurationController` → `SchedulerConfigurationRepository` | `SchedulerConfiguration` → `scheduler_configuration` | `[VERIFIED]` (c9d4df1) |
| **Cập nhật cấu hình thuật toán** | `SchedulerSettingsModal.jsx` | `storeService.updateSchedulerConfig(storeId, data)` | `PUT /api/stores/{storeId}/scheduler-config` | `SchedulerConfigurationController` → `SchedulerConfigurationRepository` | `SchedulerConfiguration` (Tổng trọng số = 1.000) | `[VERIFIED]` (c9d4df1) |
| **Gán thủ công nhân sự vào ca** | `ShiftModal.jsx`, `SpatialInspector.jsx` | `shiftService.assignStaffToShift(storeId, shiftId, staffId)` | `POST /api/stores/{storeId}/shifts/{shiftId}/assignments` | `ShiftAssignmentController` → `ShiftAssignmentService` | `ShiftAssignment` (`source: MANUAL`) | `[VERIFIED]` (c9d4df1) |
| **Phát hành ca làm việc** | `ScheduleCalendar.jsx` | `shiftService.publishShifts(storeId, payload)` | `POST /api/stores/{storeId}/shifts/publish` | `ShiftController.publishShifts` → `ShiftService.publishShifts` | `Shift` (`status: PUBLISHED`) | `[VERIFIED]` (c9d4df1) |

---

## 2. Chuẩn hóa Định danh & Ranh giới Sở hữu Dữ liệu (Identity Mappings)

### 2.1 Staff ID vs Assignment ID `[VERIFIED]` (Ref: WEB-001, `staffIdentity.js`)
- **Staff ID (User UUID):** Đại diện cho người dùng/nhân viên (`User.id` trong bảng `staff`).
  - Trong đối tượng `ShiftAssignmentDTO`, trường này là `staffId`.
  - Trong đối tượng `StaffDTO`, trường này là `id`.
  - Trong Three.js Avatar Mesh, trường này nằm tại `mesh.userData.employee.staffId || mesh.userData.employee.id`.
- **Assignment ID (Shift Assignment UUID):** Đại diện cho lượt phân công ca làm việc cụ thể (`ShiftAssignment.id` trong bảng `shift_assignment`).
  - Trong đối tượng `ShiftAssignmentDTO`, trường này là `id` hoặc `assignmentId`.
- **Rủi ro hồi quy (Regression Risk):**
  - Tuyệt đối **KHÔNG** dùng cú pháp `s.id || s.staffId` vì sẽ gây nhầm lẫn giữa Assignment ID và Staff ID khi đối tượng là `ShiftAssignmentDTO`.
  - Luôn sử dụng bộ hàm chuẩn hóa từ [staffIdentity.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/utils/staffIdentity.js): `getStaffId(s)`, `getAssignmentId(s)`, `areSameStaff(a, b)`.

### 2.2 Workstation Occupancy & Actual Presence vs Scheduled `[VERIFIED]` (PHASE-2B)
- **3 Trạng thái cốt lõi của Trạm làm việc:**
  - `ASSIGNED`: Có nhân viên hợp lệ được gán vào trạm (qua direct `workstationId` hoặc zone-fallback).
  - `UNASSIGNED`: Đã tải ca làm việc và phân công thành công nhưng trạm không có nhân sự nào được gán.
  - `UNKNOWN`: Đang tải dữ liệu (`isLoading`), gặp lỗi API (`error`), hoặc chưa chọn ca làm việc (`!currentShift`). Tuyệt đối không bao giờ được coi lỗi API hay đang tải là trạm trống (`UNASSIGNED`).
- **Phân định Hiện diện thực tế (Actual Presence) vs Phân công theo lịch (Scheduled):**
  - Căn cứ vào bản ghi điểm danh `Attendance`: Nhân viên chỉ được xem là "ĐANG CÓ MẶT (Present)" khi `checkInTime != null && checkOutTime == null`.
  - Nếu có lịch ca nhưng chưa check-in: hiển thị trạng thái "THEO LỊCH CA (Scheduled)".
  - Mã màu trực quan 3D Tag Sprite:
    - Xanh ngọc (`#10B981`): Có mặt thực tế (Đang trực trạm).
    - Xanh dương (`#0284C7`): Phân công theo lịch (Chưa check-in).
    - Hổ phách (`#F59E0B`): Trống (Unassigned).
    - Xám slate (`#64748B`): Chưa rõ / Đang tải / Lỗi (Unknown).
- **Phân định Nhân sự đã Check-out:** Khi nhân viên đã check-out (`checkInTime != null && checkOutTime != null`), hệ thống không tiếp tục hiển thị là đang có mặt, mà hiển thị huy hiệu `✓ Đã về` (Hổ phách `#D97706`).

### 2.3 Cô lập Dữ liệu Chi nhánh & Bảo mật Đa tầng (Store Isolation & Defense-in-depth) `[VERIFIED]` (PHASE-2C)
- **Store Selection Isolation Guard:** Khi người dùng chuyển đổi chi nhánh (`activeStoreId`), toàn bộ selection, draft coordinates và collision state cũ được reset về `null`, controller hủy chọn `clearSelection()`. Ngăn chặn hoàn toàn việc mang dữ liệu trạm từ cửa hàng này sang lưu vào cửa hàng khác.
- **Bảo mật lưu trữ đa tầng (Defense-in-depth):**
  - Frontend: `canEditLayout` guard chặn trực tiếp tại `handleSaveWorkstationPosition`, không chỉ phụ thuộc vào việc ẩn nút trên UI.
  - Backend Controller: `@PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")`.
  - Store Boundary: Kiểm tra `!ws.getStore().getId().equals(storeId)` ném ngoại lệ 403 Forbidden nếu workstation không thuộc store đang request.

---

## 3. Dữ liệu thực tế từ API vs Dữ liệu sinh theo thuật toán / Mock

| Đối tượng dữ liệu | Nguồn dữ liệu thực tế | Quy tắc chuyển đổi hiển thị | Trạng thái chứng cứ |
| :--- | :--- | :--- | :---: |
| **Cửa hàng (Store)** | DB `stores` via API `/api/stores` | Trực tiếp từ CSDL PostgreSQL. | `[VERIFIED]` |
| **Phân vùng (Zones)** | DB `store_zones` via API `/api/stores/{storeId}/zones` | Tọa độ `x, y, z` và kích thước `widthDim, lengthDim` lấy trực tiếp từ CSDL. | `[VERIFIED]` |
| **Trạm làm việc (Workstations)** | DB `workstations` via API `/api/stores/{storeId}/workstations` | Nếu workstation có tọa độ `x, y, z`, render đúng tọa độ đó. Nếu thiếu, fallback về tâm Zone cha. | `[VERIFIED]` (WEB-001) |
| **Lịch ca & Phân công** | DB `shifts` & `shift_assignment` via API `/api/stores/{storeId}/shifts` | Trực tiếp từ CSDL. Được timeline scrubber phân tách theo thời gian thực trong ngày. | `[VERIFIED]` |
| **Khối sàn, tường, trần** | Sinh theo thủ tục (Procedural) | Dựa trên chiều dài (`layout.length`) và chiều rộng (`layout.width`) từ API `StoreLayout`. | `[VERIFIED]` |
| **Avatar nhân sự 3D** | Mô hình 3D glTF 2.0 Binary (`.glb`) & Stylized thủ tục | 4 mô hình GLB nhân vật F&B hoàn chỉnh (`ShiftSync_Barista.glb`, `ShiftSync_Manager.glb`, `ShiftSync_Cashier.glb`, `ShiftSync_Chef.glb`) tỉ lệ công thái học, nạp và quản lý tập trung qua `CharacterAssetLoader.js`, kết xuất trực tiếp vào `AvatarLayer.jsx`, `StylizedAvatars.js` và `PlayerAvatar.js`. Hỗ trợ Skeletal State Machine, nhãn tên 3D Billboard Sprite và raycast chọn nhân sự. | `[VERIFIED]` (ASSET-007, ASSET-008, ASSET-010, ASSET-012) |
| **Nội thất trang trí chung** | Sinh thủ tục (Procedural Furniture) | Chỉ hiển thị cho các Zone KHÔNG CÓ workstation riêng (`!zonesWithWorkstations.has(zone.id)`). | `[VERIFIED]` (WEB-001) |

---

## 4. Ràng buộc Kiến trúc & Rủi ro Hồi quy (Architectural Constraints & Risks)

### 4.1 Cơ chế khóa đồng thời Atomic SWAP `[VERIFIED]` (Baseline: c9d4df1, FIX-001C)
- **Vấn đề:** Khi 2 Quản lý chi nhánh cùng thực hiện đổi vị trí nhân sự (SWAP) cùng lúc, có thể xảy ra partial persistence hoặc deadlock.
- **Ràng buộc:** Backend sử dụng khóa `PESSIMISTIC_WRITE` trên 2 bản ghi `ShiftAssignment` theo thứ tự canonical UUID (`staffIds.sorted()`), đảm bảo không có luồng nào khóa chéo gây deadlock. Cả 2 assignment được update và commit trong cùng một `@Transactional` context.

### 4.2 Quản lý tài nguyên WebGL & Memory Leak `[VERIFIED]` (Baseline: c9d4df1, ARC-001-IMP)
- **Vấn đề:** Khi chuyển đổi liên tục giữa các chế độ xem hoặc chuyển đổi store, nếu gọi `.dispose()` lên các material dùng chung, các avatar và trạm làm việc sẽ bị đen hình (WebGL material missing). Nếu không dispose instance canvas texture, sẽ gây tràn bộ nhớ JS Heap.
- **Ràng buộc:**
  - Singleton materials và geometries bắt buộc phải được đăng ký vào `sharedResources = new WeakSet()`.
  - Toàn bộ cơ chế đăng ký và giải phóng tài nguyên được quản lý tập trung bởi [ResourceManager.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/scene/ResourceManager.js).
  - Hàm `disposeHierarchy(obj)` bắt buộc kiểm tra `ResourceManager.isSharedResource(res)` và bỏ qua không dispose các tài nguyên này.
  - Chỉ dispose instance canvas texture (gắn cờ dynamic sprite) và geometry riêng lẻ của instance đó.

### 4.3 Kiến trúc Phân lớp Visualization Layer `[VERIFIED]` (Baseline: c9d4df1, ADR-ARC-001, ARC-001-IMP)
- **Cấu trúc Subsystem chuẩn hóa (Standardized Subsystem Architecture):**
  - **Visualization View State:** [spatialViewStore.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/state/spatialViewStore.js) (Zustand) tách biệt hoàn toàn 9 view preferences (`cameraMode`, `layers`, `heatmapMode`, `isXRayMode`, `use2DFallback`, `activeSkillFilter`, `isExploreMode`, `playerViewMode`, `followingStaff`) khỏi React local state, ngăn ngừa re-render DOM ngoài ý muốn.
  - **Camera Subsystem Facade:** [CameraManager.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/camera/CameraManager.js) quản lý dual cameras (PerspectiveCamera và True OrthographicCamera), tự động ép góc nghiêng sàn Polar Angle `[0.1, 1.48] rad` cho 3D orbit và khóa `[0, 0] rad` cho 2D blueprint, tích hợp `CameraController` và xử lý `handleResize`.
  - **Scene Graph Subsystem:** [SceneGraphManager.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/scene/SceneGraphManager.js) đóng gói Scene root `#F1F5F9`, Lighting rig 3 nguồn sáng với shadow cascade, `envGroup` (StoreEnvironment), `dynamicGroup` (zones, workstations, avatars) và hệ thống hạt hơi nước `steamGroup`.
  - **Quy tắc Một chiều (Unidirectional Dependency Rule):** Các subsystem cấp dưới tuyệt đối không import ngược React components hoặc React hooks của component cha.

### 4.4 Rào chắn phân quyền Store Isolation `[VERIFIED]` (Backend Security)
- Mọi endpoint `/api/stores/{storeId}/**` đều chịu sự kiểm soát của `StoreAccessService`. Quản lý chỉ được quyền truy xuất và sửa đổi dữ liệu của chi nhánh mình phụ trách (`ROLE_MANAGER`), trừ khi là quản trị viên hệ thống (`ROLE_ADMIN`).

### 4.5 Ràng buộc Lập lịch AutoSchedule & Idempotency `[VERIFIED]` (Baseline: c9d4df1, PHASE-3)
- **Ràng buộc cứng (Hard Constraints HC1-HC5):**
  - HC1: Kỹ năng (`StaffSkill`) phải khớp và còn hạn sử dụng tại ngày ca làm việc.
  - HC2: Phải nằm trong khung `Availability`, không trùng `BlackoutDate`, không trùng `LeaveRequest` trạng thái `APPROVED`.
  - HC3: Không trùng ca / đè giờ (`LocalDateTime` chuẩn hóa, bao gồm ca đêm qua ngày `00:00`).
  - HC4: Tổng giờ làm trong tuần ISO không được vượt trần hợp đồng `maxWeeklyHours`.
  - HC5: Thời gian nghỉ giữa 2 ca liên tiếp phải `>= minRestHours` (với buffer 1 ngày trước/sau).
- **Tính Idempotent & Bảo tồn Phân công Thủ công:**
  - Trước khi chạy xếp lịch, hệ thống chỉ xóa các bản ghi `ShiftAssignment` có `source == AUTO` trên các ca `DRAFT`.
  - Tuyệt đối không xóa, không ghi đè bản ghi `MANUAL` hay `OPEN_SHIFT`.
- **Tính Trung thực & Chẩn đoán Thiếu hụt:**
  - Ca không tìm được nhân sự sau cả Dynamic MRV và Local Repair được báo cáo minh bạch qua `shortageSlots` và `ShortageDetailDTO`. Không tạo phân công rác hoặc ngụy tạo độ phủ 100%.

### 4.6 Tương tác 3D: Chế độ Điều hành (Overview) & Góc nhìn Thứ nhất (First-Person with Point Lock) `[VERIFIED]` (Baseline: c9d4df1, WEB-002)
- **Một Scene Duy Nhất (Single Shared Scene):** Cả hai chế độ đều dùng chung một WebGL Canvas, một Scene Graph và một tập dữ liệu mặt bằng/nhân sự (`SpatialWorkspace.jsx`).
- **Data-Driven Heatmap (Tuyệt đối không dùng màu ngẫu nhiên):**
  - Trạng thái nhiệt phản ánh trực tiếp tỷ lệ nhân sự gán (`assignedCount`) so với nhu cầu ca (`targetCount` trích xuất từ `shift_skill_requirements` của ca làm việc đang chọn) hoặc sức chứa thiết kế (`capacity` của `StoreZone`).
  - 5 trạng thái định biên: `OPTIMAL` (Emerald `#10B981`), `UNDERSTAFFED` (Amber `#F59E0B`), `OVERSTAFFED` (Purple `#8B5CF6`), `FULL` (Red `#EF4444`), `NO_DATA` / `EMPTY` (Slate `#64748B`).
  - Hàm `getZoneStatusExplanation` cung cấp giải thích vận hành chính xác đến từng nhân sự.
- **First-Person Physics & Collision Sliding:**
  - Chiều cao mắt cố định $1.6\text{m}$. Hệ thống AABB bounding box của tường chu vi sàn, quầy bar phân khu và trạm làm việc chuyên biệt (`rebuildObstacles`) ngăn người dùng đi xuyên tường hoặc đồ đạc.
- **Hệ thống Khóa Nhìn Mục Tiêu (Point Lock Subsystem):**
  - Khóa góc nhìn camera (yaw, pitch) hướng thẳng vào tâm thực thể (nhân viên, trạm làm việc, phân khu) trong khi người dùng tự do di chuyển WASD xung quanh.
  - Theo dõi mục tiêu chuyển động động (Dynamic Tracking): Gọi `targetMesh.getWorldPosition()` bám sát avatar nhân viên đang di chuyển trên sàn thời gian thực.
  - Phím tắt `Escape` phân tầng: Thoát Point Lock trước, sau đó mới thoát chế độ First-Person.
  - Vô hiệu hóa Layout Dragging: Không cho phép kéo thả trạm làm việc (`WorkstationDragController`) khi đang ở First-Person mode để tránh xung đột chuột.

### 4.7 Mô hình 3D Độc lập & Tích hợp Coffee Shop Digital Twin GLB `[VERIFIED]` (Baseline: c9d4df1, INT-001)
- **Tài nguyên 3D Chuẩn glTF 2.0 Binary:**
  - File tài nguyên: `ShiftSync-Web/public/models/ShiftSync_CoffeeShop_DigitalTwin.glb` (1,077.97 KB, 424 meshes, 18,520 vertices, 29 vật liệu PBR, sàn chuẩn Y = 0.0m, kích thước 22.2m x 14.2m x 4.0m).
- **Bộ nạp Chuyên trách (`DigitalTwinModelLoader.js`):**
  - Nạp bất đồng bộ mô hình và phân giải 6 tầng layer (`floor`, `walls`, `ceiling`, `furniture`, `workstations`, `zones`).
  - Hàm `mapWorkstationsToGlb` liên kết thông minh các trạm Backend API (`Workstation`) với 4 trạm vật lý trên mô hình: `Workstation_POS_01`, `Workstation_Barista_01`, `Workstation_Service_01`, `Workstation_Kitchen_01`.
  - Hàm `extractGlbObstacles` trích xuất hộp giới hạn AABB chống người chơi đi xuyên qua cột và quầy bar trong chế độ First-Person.
- **Thay thế Sạch sẽ Diorama (Zero Double Store Stacking):**
  - `SceneGraphManager.loadAndApplyStoreModel` thay thế hình học procedural cũ trong `envGroup`, đảm bảo không render 2 cửa hàng lồng nhau, bảo tồn 100% cơ chế toggling layer và X-Ray ghosting trên tường.
  - Hỗ trợ fallback mượt mà: nếu file GLB không tải được, môi trường procedural vẫn tiếp tục hoạt động 100% không crash.

### 4.8 Hệ Thống Thiết Kế Không Gian 3D Toàn Cầu (Global 3D Spatial Design System) `[VERIFIED]` (Baseline: c9d4df1, WEB-003)
- **Kiến trúc Không gian DOM-based (DOM-based Tactile 3D):**
  - Không render toàn bộ ứng dụng thành 1 Three.js canvas duy nhất nhằm bảo đảm khả năng truy cập (a11y), responsive và hiệu năng trình duyệt.
  - Sử dụng hệ thống token CSS không gian đa tầng trong `index.css`: độ sâu bề mặt (`--ss-surface-*`), bóng đổ vật lý đa bậc (`--ss-shadow-depth-*`), viền sáng rim lighting (`--ss-rim-light`, `--ss-rim-dark`), và vết dập nổi/lõm công nghiệp (`--ss-bevel-card`, `--ss-bevel-sunken`).
- **Nền Tảng Không Gian Toàn Cục (Global Ambient Backdrop):**
  - `MainLayout.jsx` bao bọc toàn bộ ứng dụng bằng `.ss-spatial-backdrop` (Gradient radial chiếu sáng không gian).
  - Khung ứng dụng: `Header.css` (Cầu điều khiển không gian với nền kính mờ `#1e293b` đến `#0f172a`, viền sáng rim lighting, chỉ báo tab ngọc bích phát sáng `0 -2px 10px rgba(81, 163, 61, 0.75)`), `Sidebar.css` (Phím lõm vật lý beveled sunken controls).
- **Phân Bổ Thống Nhất 13 Tuyến Đường Nghiệp Vụ:**
  - Cả 13 route (Dashboard, Scheduler, Attendance, Employees, Employee Detail, Marketplace, Requests, Stores, Skills, Demand Planning, Settings, Admin, Login) kế thừa bảng màu trong suốt và thẻ nổi 3D, loại bỏ hoàn toàn các màu nền phẳng cục bộ xung đột (`--db-bg`, `--sc-bg`, `--emp-bg`).
  - Nút bấm điều khiển nghiệp vụ kế thừa cơ chế dập nổi vật lý (Tactile keycap physics với viền gờ 3D và độ lún khi click).

### 4.9 Kiến trúc Khai báo React Three Fiber (R3F Declarative Digital Twin) `[VERIFIED]` (Baseline: c9d4df1, R3F-001)
- **Đơn ngữ cảnh WebGL Duy nhất (Single Canvas Root):**
  - `<DigitalTwinCanvas>` bọc toàn bộ không gian 3D, loại bỏ vòng lặp `requestAnimationFrame` và `WebGLRenderer` thủ công, đảm bảo không có ngữ cảnh WebGL cạnh tranh.
- **Phân rã Mô-đun Khai báo (`src/features/spatial-workspace/components/canvas/`):**
  - `DigitalTwinCanvas.jsx`: Master canvas điều phối renderer, camera, lights và các controller phụ trợ.
  - `DigitalTwinLighting.jsx`: Dàn ánh sáng PCF soft shadows, directional light, hemisphere light, ambient fill.
  - `SteamParticles.jsx`: Hơi nước bốc lên từ máy pha cà phê espresso chạy trong hook `useFrame()`.
  - `CoffeeShopModel.jsx`: Nạp mô hình GLB độc lập `ShiftSync_CoffeeShop_DigitalTwin.glb`, hỗ trợ toggling 4 tầng layer (`floor`, `walls`, `ceiling`, `furniture`), chế độ nhìn xuyên tường X-Ray không phá hủy vật liệu gốc và fallback procedural an toàn.
  - `WorkstationLayer.jsx`: Ánh xạ trạm làm việc Backend vào node GLB, sinh trạm procedural bổ sung cho trạm thặng dư và gắn 3D floating tag sprite theo trạng thái vận hành thời gian thực.
  - `ZoneVisualizationLayer.jsx`: Decal sàn phân khu, heatmap theo định biên ca (`zoneReqMap`), nhãn khu vực và vòng geofence 150m.
  - `AvatarLayer.jsx`: Quản lý avatar nhân viên cử động bước đi, nhịp thở tĩnh và LOD khoảng cách tự động trong `useFrame()`.
  - `OverviewCameraController.jsx`: Cầu nối khai báo điều phối `CameraManager.js` (Perspective 3D, Orthographic 2D Blueprint, Focus Zoom 3D).
  - `FirstPersonController.jsx`: Cầu nối điều khiển góc nhìn người thứ nhất (WASD, trượt va chạm vật cản AABB từ GLB, tầm mắt 1.6m, Point Lock khóa nhìn mục tiêu, Reticle targeting).
- **Bộ Kiểm thử Tích hợp R3F (`DigitalTwinR3FIntegration.test.js`):**
  - 7 test cases độc lập xác nhận: tính toàn vẹn export, cấu trúc canvas đơn, toggling layer, X-Ray non-destructive, cầu nối CameraManager/PlayerController và an toàn thu hồi tài nguyên Three.js.

---

### 4.10 Interactive Store Explorer — trạng thái hiện tại `[PARTIAL]` (EXPLORER-001, 19/10/2026)
- `SpatialWorkspace` gọi `handleFocusZone` khi chọn Zone trên canvas; camera tọa độ API được đổi qua `toThreeCoords` trước khi focus.
- `DEFAULT_LAYERS.showAttendance` điều khiển trạng thái attendance trên workstation tags, riêng với Furniture và avatar Workforce. Selection đổi viền tag của workstation.
- `store.category` quyết định có nạp coffee shop GLB hay không; cửa hàng khác dùng procedural shell cùng zone/workstation của store.
- Workstation inspector có nhân sự, attendance, ca đang xem và Equipment API (EXPLORER-002). Equipment ownership qua workstation, GET/POST/PUT `/api/stores/{storeId}/workstations/{workstationId}/equipment`, V43. Source/unit/method-security và component browser tests đạt; V43 chưa triển khai vĩnh viễn, chưa kiểm chứng API runtime trên backend mới.
- Browser journey chưa được xác minh vì môi trường test không đăng nhập được; xem ma trận bằng chứng trong `INTERACTIVE-STORE-EXPLORER-AUDIT.md`. Không gắn nhãn VERIFIED cho hành vi chỉ mới có source/unit tests.

## 5. Tài liệu và Báo cáo kiểm chứng hỗ trợ

### SCROLL-018 — Cuộn workspace định biên [VERIFIED working tree, 20/10/2026]
- DemandPlanningModal render portal tại body, `dp-fullscreen-modal-overlay` là chủ cuộn dọc, workspace/content cao tự nhiên; body khóa khi mở và phục hồi khi unmount. Vùng bảng cuộn ngang riêng; close fixed theo viewport, do đó overlay không được có backdrop-filter/transform lâu dài. Browser mock xác nhận wheel đến cuối ngày/tuần và phục hồi cuộn trang. Stale khi thay portal, overflow, animation hoặc modal lifecycle. Report docs/audit/ui/SCROLL-018-DEMAND-WORKSPACE-SCROLL.md.

### SCHED-017 — Định biên ca [VERIFIED working tree, 20/10/2026]
- `/schedule` mở `DemandPlanningModal`; `/demand-planning` cũng dùng component này. Daily/weekly data từ `headcountQuotaService` (`/headcount-quotas` và `/weekly`); CSS nền `DemandPlanning.css`, visual layer `DemandPlanningRedesign.css`. Responsive cuộn bảng nội bộ; `dp-matrix-th-role` và `dp-matrix-role-meta` dùng table-cell để căn 7 ngày/14 ca.
- Empty state khi không có vị trí/slot; progress không dùng tỷ lệ mẫu. Auto-fill và apply vẫn là API riêng; copy/draft cũ đã gỡ vì thực chất gọi nhầm hành vi. Stale nếu thay DTO quota, CSS bảng, theme hoặc các handler. Report docs/audit/ui/SCHED-017-DEMAND-PLANNING-REDESIGN.md.

### SCHED-016 — Staff availability visual layer [VERIFIED working tree, 20/10/2026]
- `/schedule?tab=availability` → `StaffAvailabilityPage.jsx` + `StaffAvailabilityPage.css` nền tảng + `staff-availability-redesign.css` nạp sau. CSS mới dùng `@media screen`, theme token `--ss-*`, hai view Matrix/Timeslot và breakpoint 1100/700px; bản in trong CSS nền không bị đổi.
- Màu vị trí vẫn do `.avail-emp-pos-tag.role-*`/`.avail-ts-emp-pos.role-*` trong CSS nền quyết định. KPI trạng thái rỗng dựa `weeklyAnalytics.declaredHours === 0`; ma trận nằm trong vùng cuộn ngang có nhãn cho bàn phím. API availability/staff/shift không đổi. Stale khi sửa role-tag CSS, cấu trúc availability JSX, KPI analytics hoặc theme tokens. Report docs/audit/ui/SCHED-016-STAFF-AVAILABILITY-REDESIGN.md.

### SCHED-015 — Schedule visual layer [VERIFIED working tree, 20/10/2026]
- `/schedule` → `SchedulePage.jsx` dùng `SchedulePage.css` nền tảng và `schedule-redesign.css` nạp sau để tạo phân cấp mới, theme/mobile, trạng thái rỗng và bảng cuộn ngang. `getShiftPositionColor` + `PRESET_COLORS`/`ROLE_PASTEL_MAP` và inline `repeating-linear-gradient` sở hữu màu/sọc ô ca; lớp thiết kế mới không ghi đè background này.
- 3D/Planner dùng `.sch-page--explorer` và giữ viewport fit; tab `StaffAvailabilityPage` có visual layer riêng SCHED-016, header chính chỉ hiện khi tab board. Stale khi đổi selector CSS Schedule, màu vị trí, `SchedulePage` render hoặc breakpoints. Report docs/audit/ui/SCHED-015-SCHEDULE-REDESIGN.md.

### SCROLL-014 — Document scroll ownership [VERIFIED working tree, 20/10/2026]
- Navbar.jsx effect quản lý `document.body.style.overflow` cho menu/search; từ SCROLL-018 modal Định biên cũng khóa body khi mở và phục hồi khi đóng/unmount. Navbar key theo pathname+search ở MainLayout nên route remount cũng phục hồi body lock còn sót.
- MainLayout.jsx + MainLayout.css đặt footer 128px sau `<main>`; `<main>` cao tối thiểu `100dvh - --ss-navbar-height`, tạo khoảng cuộn để nội dung cuối không dính mép nhìn. CSS `:has(.sch-page--explorer)` ẩn footer khi lịch 3D/Planner toàn màn hình. Đã đối chứng desktop/mobile bằng Playwright mock; đổi class `sch-page--explorer` hoặc chiều cao Navbar cần kiểm tra lại.
- 9 browser scroll checks desktop/mobile/API mock + build/ESLint PASS; /schedule?view=3d còn viewport fit, body không khóa. Stale nếu sửa Navbar overlay lifecycle, MainLayout route key, hoặc thêm module khác quản lý body overflow. Report docs/audit/ui/SCROLL-014-GLOBAL-SCROLL-RECOVERY.md.

### DASH-012 — Dashboard vận hành [VERIFIED working tree, 20/10/2026]
- `/` và `/dashboard` → DashboardPage.jsx (service/API adapter) → Dashboard.jsx (bố cục) + dashboard.css theme/base + dashboard-redesign.css presentation; ShiftTimeline.jsx, charts.jsx, DashboardSpatialSummary.jsx được tái sử dụng.
- KPI “Lượt phân công” đếm timeline assignment rows; coverage từ kpis của DashboardPage, UI không hiển thị 100% khi không có ca. Dự toán = công thức có sẵn giờ xếp trong ngày × 30.000 đ; chưa phải payroll. Biểu đồ 7 ngày không vẽ đồ thị 0 khi không có dữ liệu.
- Bộ lọc ngày/nhân viên, CSV, optimistic request approval và /schedule?view=3d giữ hợp đồng trước đó. 24 browser checks với API/session mock, build, lint hai UI modules PASS; report docs/audit/ui/DASH-012-DASHBOARD-REDESIGN.md. Stale nếu sửa DashboardPage data transforms, Dashboard.jsx/CSS, Timeline/chart/SpatialSummary hoặc API contracts.

### NAV-011 — Navbar2hàng và navigation context [VERIFIED working tree,20/10/2026]
- MainLayout→Navbar.jsx +navbar-layout.css; navbar.css giữ theme tokens. Desktop112px (64+48), compact<=1020 drawer +store context. --ss-navbar-height dùng tại SchedulePage/explorer để fitcanvas.
- Navbar nhận stores/selectedStoreId/onSelectStore và user.systemRole. MainLayout validateID+localStorage+storeChanged, ngheeventđổi store từtrangcon. Key Navbar theo pathname+search reset dropdown/dialog; auth/backend vẫn là authority.
- Search localdestination theo nhómmenu/CtrlK/normalizeVi, chỉUI destinations theo role; không backendsearch. Settingslinks dùng?tab=appearance/schedule/permissions, SettingsPage deriveURLtab với localtab state. NotificationBell giữ callbackAPI, Escapefocus; khôngsample fallbacktạiNavbar.
- 29Navbar/33Store Playwright +144tests +build +lint2Navbar modules PASS; selective contrast>=4,7588:1 trên16theme combinations, không WCAGcertification. API/sessionfixturesonly. Report docs/audit/ui/NAV-011-NAVBAR-REDESIGN.md; known5lint errorsMainLayout/SettingsPage vàunsaveddraftguard không trongscope.

- Báo cáo đối chiếu API & Không gian: [AUD-002-API-SPATIAL-DATA-MODEL-RECONCILIATION.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/AUD-002-API-SPATIAL-DATA-MODEL-RECONCILIATION.md)
- Báo cáo hoàn thành tích hợp Workstation Layer: [WEB-001-DIGITAL-TWIN-WORKSTATION-INTEGRATION.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/WEB-001-DIGITAL-TWIN-WORKSTATION-INTEGRATION.md)
- Thiết kế Atomic SWAP: [FIX-001C_ATOMIC_SWAP_DESIGN.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/FIX-001C_ATOMIC_SWAP_DESIGN.md)
- Bản đồ kiểm toán Concurrency: [AUD-001.3_CONCURRENCY_AUDIT.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/digital-twin/AUD-001.3_CONCURRENCY_AUDIT.md)
- Báo cáo kiểm toán & tối ưu hóa xếp ca tự động: [PHASE-3-AUTOSCHEDULE-AUDIT.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/audit/autoschedule/PHASE-3-AUTOSCHEDULE-AUDIT.md)
- Thiết kế Kiến trúc Visualization Layer: [ADR-ARC-001-visualization-layer.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/architecture/ADR-ARC-001-visualization-layer.md)
- Báo cáo Kiểm chứng Độc lập & Nghiệm thu Kiến trúc: [ARC-001-VERIFICATION-REPORT.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/architecture/ARC-001-VERIFICATION-REPORT.md)


### EXPLORER-002 — dữ liệu workstation (19/10/2026)
- Thay thế quy tắc zone-fallback cũ tại mục occupancy: chỉ workstationId cụ thể mới chứng minh phân công trạm. Zone-only staff ở cấp zone. Attendance không ghép theo trạm bất kỳ; ghép assignment hoặc staff + shift khi thiếu assignment ID.
- Equipment: `EquipmentController → EquipmentService → EquipmentRepository → workstation_equipment → workstations → store`. Mã duy nhất trong trạm, trạng thái OPERATIONAL/MAINTENANCE/OUT_OF_SERVICE/RETIRED. FK cascade theo vòng đời workstation; không seed/migrate dữ liệu cũ.
- `WorkstationEquipment.jsx` tải theo store/trạm, abort request cũ, retry; `SpatialWorkspace` truyền activeStoreId vào inspector. Procedural WorkstationLayer nhận showAttendance/isSelected như GLB.
- Bằng chứng: 105 spatial tests, 28 backend tests, 7 browser component scenarios, build đạt. PostgreSQL DDL đã rollback; API/Flyway/JPA và canvas end-to-end chưa được xác minh. Xem audit mới.


### EXPLORER-003 — UI quản lý thiết bị và điều khiển không gian (19/10/2026)
- SpatialToolbar + store-explorer.css: 3 lớp chính trực tiếp, camera presets, advanced options; responsive + token theme. Skill select dùng skill.name vì ZoneVisualizationLayer matcher dùng tên.
- SpatialInspector chuyển nhóm Thông tin/Nhân sự/Thiết bị; WorkstationEquipment theo key store/trạm, có create/update bằng layoutService → EquipmentController. Quyền sửa từ canEditLayout (ADMIN/MANAGER), chặn UI khi mô phỏng; default false.
- Selection zone xóa lựa chọn workstation/staff cũ; workstation xóa staff cũ. Xem trạm dùng dữ liệu thật, không còn station fixture WS_PREMIUM_01.
- Bằng chứng: 105 tests + build đạt, 7 browser equipment + 10 browser UI scenarios đạt bằng fixture; ảnh wide/narrow/light/dark được judge độc lập kiểm tra. Chưa xác minh authenticated full page/canvas/API mới. Xem EXPLORER-003 trong audit.


### EXPLORER-004 — Runtime thực với API mock (19/10/2026)
- `classifyModelHierarchy` phải trả `layers` để `CoffeeShopModel` bật/tắt GLB; metadata layer trên node riêng lẻ chưa đủ. Đã thêm index và regression asset test.
- `pickSceneEntity` lọc ancestor ẩn và semantic node không có entity; CanvasInteractionBridge chọn zone cha với `{focus:false}` trước khi chọn staff/workstation. Callback chọn workstation từ canvas không gọi ngược controller (tránh recursion).
- CameraManager khi sang orthographic hủy fly-to cũ và reset pose/zoom. SchedulePage có handler đổi store/reset dữ liệu/UI và dispatch storeChanged.
- Đã kiểm chứng route /schedule + canvas/GLB thật qua 20 checkpoints ở 1920×1080, dùng API/session mock trong Playwright. 110 spatial tests + build PASS. Docker read-only xác nhận V42; Equipment API/JWT/persistence trên backend mới chưa xác minh. Không dùng bằng chứng mock để xác nhận backend thật.


### EXPLORER-005 — UI review
- SpatialTimeline cố định min360/max1380 (06:00–23:00), trong khi currentTimeMinutes có thể lấy00:00 từ ca được chọn; fixture chứng minh nhãn và thumb không cùng thời điểm. Cần phạm vi theo ca và xử lý qua đêm ở task triển khai sau; chưa sửa trong review. Xem docs/audit/digital-twin/EXPLORER-005-UI-REVIEW.md.

### EXPLORER-006 — Giao diện và bố trí (19/10/2026)
- StoreArrangement.js bố trí furniture GLB, giữ nguyên workstation API; staff anchor nằm ngoài quầy. DigitalTwinModelLoader ẩn template không gắn dữ liệu; SceneLabels xử lý kích thước/overlap.
- CommandHeader + SchedulePage thống nhất context/date ISO; shiftTimeRange.js + SpatialTimeline hỗ trợ ca qua đêm. CameraManager tránh cột/tường, CameraController blend theo delta; editor snap0,25m.
- Đã kiểm chứng117 spatial tests + build +26 full-page mock checkpoints ở1920×1080. Giới hạn backend và persistence: xem EXPLORER-006-LAYOUT-IMPLEMENTATION.md.


### EXPLORER-007 — Quầy vật lý khác với binding nghiệp vụ
- StoreArrangement.arrangeCoffeeCounters khôi phục POS và Barista GLB, đặt bàn chưa bind cạnh bàn còn lại (khe0,08m) và giữ tọa độ API nếu cả hai đã bind. WorkstationLayer truyền showWorkstations; bàn chưa bind không vào currentMeshes, không tag/assignment/equipment giả. Thay thế quy tắc EXPLORER-006 ẩn mọi template chưa bind.
-119 spatial tests + build +26 full-page mock checkpoints pass,1920×1080; xác nhận POS hiện cạnh Barista bằng bounds thực GLB.


### EXPLORER-008 — Café circulation / furniture / labels
- getCoffeeFloorLayout giới hạn sàn theo GLB Main_Floor_Plinth. arrangeStoreInterior xếp từng Booth_Section/Bistro_Table_Group, bàn chung dọc,9 bộ giữ đủ; khoảng cách mô hình0,8m, hành lang giữa2,2m và landing/queue blockers.
- arrangeCoffeeCounters thêm Service pickup; getCoffeeZoneFrame căn decal3D theo quầy. ZoneVisualizationLayer nhận modelRoot/workstationMeshes; CameraManager FOCUS_ZONE ưu tiên physicalZoneFrame trong scene. API zone và2D không bị ghi đè.
- CafeFlowLayer vẽ chỉ dẫn vật lý độc lập nghiệp vụ. SceneLabels dời nhãn zone có leaderline khi collision; cleanup resources khi đổi store.122 tests + build +33 full-page mock checkpoints pass; audit EXPLORER-008-CAFE-LAYOUT.md.


### EXPLORER-009 — Khoảng trống đồng bộ vị trí và tham quan (audit)
- SpatialWorkspace handleTeleportToZone vẫn dùng API zone, trong khi ZoneVisualizationLayer dùng physical frame GLB. TwoDSpatialSchematic/minimap đọc API vị trí cũ; cần thống nhất nguồn hiển thị.
- extractGlbObstacles bỏ qua customer furniture và visibility, dùng bounds quầy cố định; PlayerController thêm cả procedural columns/zone boxes cũ gây collision ma. Đã đi xuyên booth và teleport vào điểm kẹt bằng UI.
- FirstPersonController khởi tạo callback onToggleView với effect chỉ theo layout dimensions: V đổi controller nhưng state/UI/FOV giữ closure cũ. CoffeeShopModel có procedural fallback nhưng thiếu loading/error/retry UI.
-33 regression checks pass không bao phủ các lỗi này; xem EXPLORER-009-3D-EXPERIENCE-AUDIT.md. Chưa sửa app trong audit.


### EXPLORER-010 — Contracts sửa trải nghiệm
- WorkstationLayer useLayoutEffect mapping/arrangement trước passive zone effects; onPhysicalLayoutReady(viewZones) trả snapshot client với physicalFrame và tọa độ đổi về hệstore. SpatialWorkspace giữ theo storeId cho2D/HUD/teleport; không mutationAPI. CameraManager FOCUS_ZONE chỉ chọn frame group.
- extractGlbObstacles(modelRoot,layout,additionalWorkstationMeshes) dùng geometryFootprint world/visibility, bộ bàn ghế nguyên bộ và surplus trạm, dedupIDs. PlayerController.rebuildObstacles có physicalLayout để bounds theoGLB; nếu custom geometry thì bỏ vùng/cột procedural ma. teleportTo trảboolean, tìm landing trống hoặc giữ vị trí.
- spatialViewStore.setPlayerViewMode nhận value/function; FirstPersonController dùng latestref cho callbackmode. CoffeeShopModel onLoadStateChange + retryKey → Canvas aria-busy/status/alert/retry.
-128 tests +33 main/14 focused browser checks pass. Chi tiết EXPLORER-010-EXPERIENCE-FIXES.md.


### AUTO-025 — Auto-Scheduler Visualization [VERIFIED working tree]
- SchedulePage preloads /shifts range; visualization offers explicit /auto-schedule save, then reloads /shifts for baseline/result; metrics/shortages use AutoScheduleResult. Playback compares staff/zone/workstation/skill placement independent of generated assignment IDs; 3D via Store3DCanvas. Existing POST persists immediately; API has no dry-run or assignment rationale. See docs/audit/autoschedule/AUTO-025-VISUALIZATION.md.
### PLANNER-024 — Regression hiện tại [VERIFIED]
- 20/10/2026: plannerModel 6/6 + WebGL browser 20/20 + build PASS. Chạy lại 20/20 trong Microsoft Edge (`Edg/155`) tại 1920×1080; canvas hiện và document không tràn. Suite `scripts/test-schedule-planner.browser.cjs` dùng ngày local hiện tại và empty day +2 để không stale theo ngày. API/session mock, chưa backend thật.

### EXPLORER-011 — Schedule Planner prototype
- SchedulePage viewMode Planner→features/schedule-planner/SchedulePlanner. plannerModel.js: assignments normalization, absolute-date intervals/overnight overlap, draft merge without mutation, warnings and eligibility gates. Matrix/Timeline/Spatial use one state; field key storeId scopes component.
- GETeligible-staff→EmploymentDTO.staffId; Apply revalidates then assignStaffToShift(force=false), preserves failed drafts and refreshes. No backend changes. Permission UI MANAGER/ADMIN; API remains authority.
- SpatialWorkspace planningMode hides duplicate chrome, accepts planningTimeMinutes/onPlanningZoneSelect. AvatarLayer uses physicalFrame for zone-only staff, delays untilGLBready; SceneLabels view-depth sizing and camera priority-2 updates stop huge focus labels.
-135 tests +build +20Planner/33main/14experience Playwright pass. Demo/API mocks only; prototype limits in EXPLORER-011-SCHEDULE-PLANNER-PROTOTYPE.md.

### EXPLORER-012 — Crew V2 character contract [VERIFIED working tree, 19/10/2026]
- Xác nhận lại theo yêu cầu “áp dụng”: AvatarLayer và PlayerAvatar trỏ factory Crew V2 mặc định, Schedule Planner dùng cùng SpatialWorkspace. Runtime /schedule staff đã load GLB designVersion=2; Store33/33 kiểm tra lại đạt. Không thêm thay đổi ứng dụng khi contract đã đáp ứng.
- CrewModel.js → scripts/generate-crew-v2.mjs → public/models/crew-v2/{barista,cashier,manager,chef}.glb. +Z forward, units metres, Hips rest y=0.76 / Spine local y=0.08; complete named joint hierarchy. Animation uses rigid groups, not skinning.
- CharacterAssetLoader instantiates GLB if cached, otherwise identical procedural model from per-role fallback cache; always returns modelRoot/joints/isGlb. Hierarchy cloned, geometry/material shared + userData.isShared; cleanup respects ResourceManager ownership. CHARACTER_MODEL_URLS now versioned; original GLBs retained.
- StylizedAvatars and PlayerAvatar use this factory, knees/elbows animate without changing selection/movement contracts. /crew-preview.html is dev-only review with OrbitControls and walk toggle; not a production-bundled entry.
- 141 tests + build and Crew7/Store33/experience14/Planner20 Playwright checks pass at1920×1080. Bounds/asset budget/sharing tested; no population-scale performance or backend verification. See EXPLORER-012-CREW-REDESIGN.md.

### EXPLORER-013 — Oak & Moss store model [VERIFIED working tree, 19/10/2026]
- Follow-up: SchedulePage đọc query view=3d khi mount và khi location.search đổi; /schedule?view=3d mở đúng workspace, reload vẫn3D, nút Về lịch ca thoát được. /schedule thường vẫnTuần và auth/category guard giữ nguyên.4 runtime checks +33Store/144tests/build đạt; scene chính xác nhận modelversion2.
- CafeStoreModel.js → generate-store-v2.mjs → public/models/store-v2/shiftsync-cafe.glb (default DigitalTwinModelLoader). 1.649.892bytes,169 meshes/39.858tris; originalGLB preserved. Font geometry license bundled. Layout22,2×14,22m,9 complete seating groups and existing 4workstation/6zone/root/floor semantic names. Columns x±9,6/z−6,5.
- Material enhancer returns unchanged for storeDesignVersion≥2. Merged mesh prefix Baked_ avoids semantic aliasing; child wall meshes inherit parent isWall for X-Ray. extractGlbObstacles ignores nested wall aliases to avoid duplicate blockers. Saved API positions retain authority; StoreArrangement physical/zone/collision contract reused.
- Three existing GLB integration suites now read versioned default asset. CafeStoreModel.test adds budget/ownership of palette,9sets/aisle/clearance/repeatability/counter/column and wall+entrance checks. 144tests+build and Store33/experience14/Planner20/preview11 browser checks PASS.
- /store-preview.html + storePreview.js are Vite dev-only visual review, no API/session; OrbitControls, poses, walls/ceiling toggles, responsive fit. Main production build includes GLB; preview not a bundled production entry. Audit EXPLORER-013-STORE-MODEL-REDESIGN.md records limits.


## OPS-026 — Vận hành realtime (21/10/2026)
Tái sử dụng PHASE-2B/PHASE-2C/EXPLORER-013. Header 3D có connection và thời điểm nhận event; attendance/shift/marketplace refresh theo store, reconnect resync, loại ca CANCELLED. Backend thêm event assignment create/move/remove/zone-swap, marketplace publish/unpublish/claim và cancel/delete. Publisher chỉ phát store event sau commit; rollback không phát.
Kiểm chứng: web build PASS (cảnh báo chunk), Node3/3, Maven25/25; Edge155 1920×1080 xác nhận event khác store bị bỏ qua, attendance/marketplace/reconnect REST refresh, không tràn ngang; Planner regression20 PASS. Browser dùng REST fixtures/DOM event injection; backend8080 offline, chưa STOMP end-to-end giữa thiết bị. Chưa bổ sung event cho swap-request service ngoài swapStaffZones. Git diff check có whitespace cũ ngoài scope. Chưa deploy backend.
Contract: /ws/websocket; /topic/store/{storeId}/{shifts|attendance|marketplace|requests}; envelope storeId/domain/action/data/timestamp. Attendance legacy dùng data.action. Stale khi thay publisher, topics, shift/attendance DTO hoặc workspace data flow.

## CREW-027 — Model theo giới tính (21/10/2026)
Tái sử dụng Crew V2/EXPLORER-012 và skill 3d-web-experience. Bổ sung 4 GLB nữ cho barista/cashier/manager/chef, cùng joint hierarchy, 513–620KB/model; cache/fallback theo role+gender. Model nam mặc định; không suy đoán tên/vai trò. AvatarLayer thay model khi gender đổi. Schedule, SpatialWorkspace và Planner draft giữ gender.
User entity/DTO/create/update + EmploymentDTO + ShiftAssignmentResponseDTO mang gender; V44 thêm staff.gender default MALE và CHECK MALE/FEMALE/OTHER. Form AddUserModal/EmployeeDetail gửi gender lên backend; hồ sơ hiển thị Nam/Nữ/Khác. OTHER dùng model nam hiện tại. Migration chưa chạy trên DB; dữ liệu giới tính localStorage cũ không được tự suy đoán/migrate.
Kiểm chứng: 15 character tests PASS, build PASS (chunk warning), backend compile + UserCreationRbacTest/ShiftAssignmentServiceTest + UserGenderTest PASS. Edge1920: 4 female GLB load, đi bộ; fixture assignment FEMALE tạo avatar nữ trong scene thực. Chưa kiểm chứng lưu hồ sơ trên backend thật vì backend chưa khởi chạy. Preview /crew-preview.html?gender=FEMALE, ảnh .playwright-mcp/crew-female.png. Stale khi sửa DTO/mapping/generator/gender normalization/avatar reconciliation.

### CREW-028 — Nữ tóc dài (21/10/2026)
Theo yêu cầu người dùng, thay tóc búi bằng tóc đen dài qua vai, rẽ ngôi và hai lọn trước mặt cho cả 4 vai trò nữ. Tái sử dụng pipeline Crew027/skill 3d-web-experience; GLB và fallback dùng cùng geometry, LongHair gắn Head. Xuất lại 8 assets, nữ515–622KB. Node gender5/5 PASS; Edge1920 xác nhận4GLB có LongHair, đi bộ và ảnh .playwright-mcp/crew-female-long-hair.png; build PASS với chunk warning cũ. Model FEMALE hiện dùng asset này tự động; migrationV44 vẫn chưa chạy DB thật.

### CREW-029 — Đổi kiểu tóc nữ
Theo phản hồi người dùng: tóc đuôi ngựa thấp thuôn ngọn, mái lệch bám trán, bỏ mái đôi phồng và tóc hai bên. Áp dụng cả4role nữ trong GLB/fallback cùng pipeline CREW027. Asset500–607KB; gender5/5 + build PASS, Edge1920 xác nhận4GLB low-ponytail và ảnh .playwright-mcp/crew-ponytail.png. Chunk warning cũ còn. Không thay gender/API.
CREW-029 follow-up áp dụng: female asset URLs thêm v=ponytail-1 tránh cache model cũ. Edge /schedule?view=3d fixture xác nhận LongHair low-ponytail trong scene cửa hàng; gender5/5 + build PASS. Dùng loader chung cho workspace/Planner/AutoScheduler. Backend migration V44 vẫn chưa chạy.


### EXPLORER-014 — WebXR VR [working tree, 21/10/2026]
**Lịch sử; EXPLORER-015 đã gỡ WebXR và thay bằng tham quan desktop.**
- `DigitalTwinCanvas.jsx` giữ scene hiện tại; máy không có headset bấm **Mô phỏng VR** để vào first-person Explore ngay trên desktop (WASD/chuột/E/F/V/Esc), gọi `onEnterDesktopVr` và ẩn launcher trùng với Explore HUD. Thiết bị WebXR thật vẫn tải `DigitalTwinXR.jsx` theo yêu cầu; `XRSceneShell` chọn semantic entity và teleport trên sàn.
- XR emulator tắt để tránh phủ viewport desktop; desktop simulation dùng `FirstPersonController` và cùng scene/GLB. Build PASS; Edge155 1920×1080 fixture xác nhận vào first-person, WASD đổi tọa độ, một canvas, page errors 0. Chưa có headset để kiểm tra phiên immersive thật. Xem `docs/audit/digital-twin/EXPLORER-014-WEBXR-VR.md`. Stale khi đổi Canvas wrapping, explore controller, selection hoặc XR runtime.

### EXPLORER-015 — World info cards [VERIFIED working tree, 21/10/2026]
- `spatialInfoModel` resolve `{type,id}` theo snapshot hiện hành, staff ưu tiên assignmentId; `WorldInfoCard` theo mesh hiện tại hoặc viewZone.physicalFrame. Html transform billboard giữ kích thước theo projection, clamp vùng nhìn tránh toolbar, cache local anchor tránh rung idle. Nhãn sprite ẩn khi mở bảng, Avatar tick -1 trước SceneLabels 0.
- `SpatialWorkspace` không dùng bố cục panel phải. Inspector hiện hữu nằm trong `SpatialActionDialog` giữa viewport để giữ API/actions/RBAC; header mở overview/cảnh báo. Selection xóa khi đổi store/date/shift/missing entity; Planner không mở world card nhưng giữ callback zone; editing không mở card.
- WebXR file/package/UI đã gỡ. Tham quan 3D first-person mọi build; click/E mở bảng, PlayerController.setPaused nhả chuột/xóa phím, Esc capture đóng card trước. Pointer-lock request có catch khi canvas không còn hợp lệ.
- Build/Node20/Edge38+11/Planner20 PASS; fixture-only REST/session/realtime event injection, chưa backend STOMP thật. Report EXPLORER-015-WORLD-INFO-CARDS.md. Stale khi đổi identity, mesh, animation order hoặc input.

### EXPLORER-016 — Thao tác trong bảng 3D (21/10/2026)
Theo yêu cầu mới, thay centered entity dialog bằng SpatialInspector content ngay trong WorldInfoCard/Html transform. Giữ anchor/billboard/viewport clamp, callbacks/API/RBAC; footer quay lại, Escape về thông tin trước đóng, đổi selection reset actions. Tổng quan store vẫn dialog. Tái sử dụng EXPLORER015/3d-web-experience/frontend-design. Build + Node20 PASS; Edge world45 +updates11 +Planner20 PASS, kiểm tra thiết bị thêm/lưu/cuộn1366/390. REST writes và realtime vẫn fixture, chưa backend/STOMP thật. Xem docs/audit/digital-twin/EXPLORER-016-WORLD-ACTIONS.md. Không backend/deps/git commit. Stale khi đổi action slot/Inspector/input/selection.

### EXPLORER-017 — Kéo nguyên cụm và hoàn tác bố trí (21/10/2026)
Tái sử dụng PHASE2A/GLB store-v2/EXPLORER008/016/skill3d-web-experience. Lỗi: loader đánh dấu mọi child isWorkstation khiến drag nhận mesh con. Sửa root-only binding + ancestor thuộc registered workstationMeshes. Threshold6px, grab offset, preview qua remap, baseline giữ tới commit; đổi selection/clear/thoát hủy vị trí và rotation nháp, reset draft UI. Không xuất GLB mới vì asset đã nhóm đúng. Node27, build, Edge world45+group6+Planner20 PASS (REST fixtures, WebGL thật); chưa layout save backend thật. RAM child transforms cũ khôi phục bằng reload; tọa độ đã lưu DB không tự rollback. API không có rotation persistence, không mở rộng backend. Xem docs/audit/digital-twin/EXPLORER-017-GROUP-DRAG.md. Không commit/push; stale root/drag/remap/selection lifecycle.

### EXPLORER-018 — Thiết kế cửa hàng (21/10/2026)
Tái sử dụng PHASE2A/EXPLORER008/013/015–017 +skills3d-web-experience/frontend-design. StoreDesigner thư viện15mẫu, kéo trục thật/XYZ/xoay/tỷ lệ, floor/vách/cửa, nhóm/khóa/clone/delete, undo60, localdraft user+store, JSONimport/export, template/blank/history. Saved design dùng chung explorer/Planner; binding workstation hiện có +physicalFrame/avatar, custom layout không autoarrange. GET/PUT /stores/{id}/design +versions, baseRevision+store-row lock+immutable history, RBAC, V45store_design_versions. HTTP Map boundary tương thích Jackson3/Boot4.1.1, service Jackson2.
Node52/build/newfeaturelint PASS; Java13 (7service+3auth+1HTTP+2Postgresreal) PASS; Edge32designer+STAFFguard +45worldinfo+20Planner PASS, 1920/1366/390. Browser REST/session fixtures, DB isolated tests thật tớiV45 và concurrency; chưa authenticated browser→live backend write. Dockerlocal đã rebuild/start health200, main schema45 (V43/V44 pending cũng áp dụng), main design table0rows. Backup ~/.codex/backups/shiftsync/20261021-105511 +oldimage before-designer-20261021-105511. Không đổi bố trí thật/commit/push. Xem docs/audit/digital-twin/EXPLORER-018-STORE-DESIGNER.md. Giới hạn15mẫu/150items/8cấp, JSONimport (chưaGLBupload), không tự khoét cửa/tường hoặc broadcast realtime design. Stale schema/catalog/modelgroups/API/Jackson/custom layers/Planner/auth.

### EXPLORER-019 — Làm rõ bảng thông tin 3D (22/10/2026)
User xác nhận phạm vi là bảng staff/workstation/zone, không phải StoreDesigner. Tái sử dụng EXPLORER015/016 +frontend-design/3d-web-experience; hướng bảng vận hành phân cấp, DFII14/15, giữ theme/font/role colors. WorldInfoCard có ngữ cảnh ngày/ca, trạng thái chính và giải thích trước chi tiết; phân biệt lịch phân công với bản ghi check-in, chỉ tiêu ca với sức chứa tối đa; gender trong disclosure Thông tin cá nhân; danh sách nhân sự có attendance từng người. Footer giải thích nhóm thao tác, action view có ngữ cảnh và Escape trở về đầu summary. Vẫn Html transform neo model, không sidebar/dialog mới; không backend/API/DB changes.
Build PASS (chunkwarning cũ), lintWorldInfoCard PASS, Node14 PASS. Edge155 world-info45 hồi quy +clarity42 PASS (fixturesREST, canvas/model thật),1920/1366/390; không page/consoleerror. Test raycast cũ cần focusstaff/resetoverviewzone trước click để đảm bảo entity visible. Ảnh .playwright-mcp/info-hierarchy-{staff,workstation,zone}.png. Báo cáo docs/audit/digital-twin/EXPLORER-019-INFO-CLARITY.md. Chưa kiểm dữ liệu livebackend; không commit/push.

### EXPLORER-020 — Bảng thông tin có hình khối 3D (22/10/2026)
Theo yêu cầu thử bảng3D thật: WorldBoardMesh dựng RoundedBox có chiều dày/viền/độ nghiêng, mặt chữ CanvasTexture tiếngViệt và các nút mesh raycast. Summary không còn Htmlcard nhìn thấy; tabs Tổng quan/Nhân sự/Thiết bị, pagination4mục desktop/1mục viewport thấp, status+ngàyca; giữ rolecolor. Board vị trí camera-relative theo anchor và kéo về trước geometry để không bị quầy che, leader kết thúc tại mép. Bridge nhận board hit và không clear selection phía sau. Keyboard/screenreader có bản đọc ẩn qua Html; khi Tabfocus thì hiện fallback truy cập. Biểu mẫu Thao tác vẫn Html transform neo cảnh để nhập liệu, không phải mesh; không tuyên bố toàn bộ forms đã chuyển3D.
Tái sử dụng EXPLORER015/016/019, frontend-design/3d-web-experience, hướng bảng vận hành vật lý, DFII14/15. Build/lint2module/Node14 PASS. Edge155 physicalsuite33 PASS:3entity mesh/tabs/pagination/close/action/E/Esc/pointerpause,1920/1366/390; Planner20 PASS. FixturesREST/session, WebGL/model thật, noerrors. Suite Html world-info/clarity019 đã bị supersede cho summary (không chạy lại và không tuyên bố pass ở mode mới). Test mới scripts/test-world-physical-board.browser.cjs; ảnh physical-board-{staff,workstation,zone}.png. Khôngbackend/deps/DBchanges/commit/push. Stale board geometry/raycast/CanvasTexture/layout/selection/input.

EXPLORER-020 follow-up22/10: user không thích bảng nghiêng. Bỏ local tilt của WorldBoardMesh, luôn thẳng theo quaternion camera; case mỏng0,22 thay0,32, viền xanh dịu metalness0,1. Build PASS; Edge xác nhận localrotation0/cameraalignment0. Không đổi dữ liệu/biểu mẫu.

EXPLORER-020 chốt giao diện22/10: user chọn lại HTML neo cảnh theo đề xuất. Runtime WorldInfoCard trở lại Htmltransform luôn trực diện camera, WorldInfoSummary tách component summary có status/ngàyca/nhânsự/thiếtbị/gender disclosure như019; actionsinline giữ nguyên. Không import/render WorldBoardMesh (file thử nghiệm giữ lại, không vào bundle), bỏ raycastguard riêng boardmesh. Kích thước theo DOM thật và clamp; bỏ lerp physical display. Build/lint2module PASS; Edgeclarity42 PASS ở1920/1366/390, noerrors, fixturesREST/WebGLthật. Physicalsuite020 nay chỉ là lịch sử thử nghiệm, không phải UI đang dùng. Khôngbackend/DBchanges/commit.

### EXPLORER-021 — Thẻ vận hành trong cảnh [VERIFIED 22/10/2026]
WorldInfoCard dùng header rail màu và CalendarDays/Clock3 cho ngữ cảnh; WorldInfoSummary dùng se-world-metrics cho zone (nhu cầu/phân công và sức chứa), se-world-person initials và attendance text/icon; EquipmentSummary giữ fetch/abort/error. world-info-card.css bổ sung presentation scoped theo theme variables, không đổi anchoring/input/Inspector contract. Tái sử dụng EXPLORER015/016/019/020. Build/lint PASS; Edge155 fixture clarity42/42 PASS1920/1366/390, model thật. Chưa live backend verification. Stale khi đổi theme/cardDOM/mapping/attendance contract.

### EXPLORER-022 — Nhãn nổi [VERIFIED22/10]
ZoneDecals.createZoneTagSprite và FurnitureBuilder.createWorkstationTagSprite dùng FloatingTagCanvas face720×192: nền sáng opaque, rail rolecolor, trạng thái text+dot, metriccaption. SceneLabels dùng240/260px và aspect720/192 cho zone/trạm, staff145/175 giữ nguyên; collision offsets theoheight. Tagsẩn khi mở WorldInfoCard như cũ. Không dùng API mới; occupancyunknown hiển thị gạch, zone thiếu target không kết luận đủ. Build/Node13/Edgeclarity42 PASS fixture, responsive labels1920/1366/390 checked. Stale tagDOM/canvas/theme/occupancy/selection.

### EXPLORER-023 — Fixture design save [VERIFIED22/10]
Clarity browser harness từng trả200[] cho design nên nhấn Save trong tab để lại luôn malformed response. Nay routes GET/PUT/versions có CAS409 và persistence localStorage shiftsync:fixture-design:{store}, giữ draft qua rerun (không clear storage). DesignerSession.save nullguard + lỗi không xác nhận, giữ dirty/draft. Backend contract không đổi. Verified userdraft18items →mockversion1 →close/reopen/reload18items, no dirty warning. Build/lint PASS; fullclarity rerun chưaPASS(gender visibility), không dùng làm chứng save. Browserfixture khác backend thật.

### LIVE-024 — Docker integration [VERIFIED22/10]
Default api.js API_BASE_URL='/api'; Vite devproxies /api,/ws→127.0.0.1:8080/changeOrigin/headersOriginlocalhost3000, WS enabled. WebSocketContext resolves relativeAPI againstwindow.origin; VITE_API_URLoverride giữ. Auth/REST vẫn SpringJWT/RBAC, WSSTOMPthật. Browserfreshpage loại cảHTTP/WSfixture; fakekeys đãremove, không chạy fixture suite trên tabngườidùng. Postgresstore_design_versions PVDrevision1document18itemsđãsaveUIthật,barista/cashierbindWS041/042. Existing data3zones/2ws/20shifts/1attendance. Build/lintconfigapi/live4pages+save+reload PASS. ReportLIVE024. Staleproxy/CORS/deployment/Auth/STOMP/StoreDesign.

### EXPLORER-025 — Alert modal [VERIFIED22/10]
AttentionCenter.css+JSX replaced inlineUI với ac-layout queue/summary, filterstate, prioritysort, currentShiftcontext, no-shift empty state. stationunassigned chỉkhiocc.state/statusUNASSIGNED,unknownkhôngkếtluậnthiếu. SpatialActionDialog nhận optionalclassName, SpatialWorkspaceoverview dùngse-alert-dialog/titleCảnhbáovậnhành; dialog980px+inspectorheight scopedCSS. Giữ callbacks/API, no newbackend. RealEdgeDocker1920/1366/390+filter+station/zoneactions+EscapePASS; build/lintPASS. NoDBmutations. Stale requirements/state/selection/styles.

### UI-026 — Text-only decorative labels [VERIFIED22/10]
SpatialInspectorroleiconspanremoved, ROLE_PALETTE.icon/STORE_CATEGORIES.icon/SPATIAL_TYPES.icon/demandplanning/avatarconfigicons empty; getZoneIcon legacy returns empty. CharacterAssetLoader labels plain text. AvatarCollection fallback label (không blankthumbnail). Các emoji trangtrí JSX/canvas strings removed, emptyspans cleaned; LucideSVG/check/close controls giữ. BuildPASS, runtimesrcscan0emoji(excludeslogs/comments/tests); Edge3D/3pageslive smokePASS. Không đổi API/data/rolecolor. Stale futureemoji/iconrenderers.

### NAV-027 — Direct notification navigation [VERIFIED22/10]
utils/notificationNavigation.js sourceType-aware notificationRoute +legacyRequestRoute; components/LegacyRequestRedirect route /request,/requests,/notifications nohub. AppkhôngimportRequestPage. NotificationBelldefault[] bỏmockfallback;footerclose,alltabđủlist. Navbar giữsourceType đểroute chuẩn leave/attendance/swap/workforce/schedule/marketplace; Headerlegacygỡhubentry. Node12+Edge6redirect/bellLIVEPASS,build/lintPASS. StaleNotificationtype/Tabrouting.

### FUNC-028 — Functional audit references [VERIFIEDsource22/10]
MainLayout.handleAction catch & handleMarkAllRead conflatesread/actionstate;fetchCounts normalizesawayoriginaltype beforeNavbar. Camera follow handler employee vs OverviewController.avatar mismatch. Applegacyredirects lose tabs and scheduleauto/templates opensonlyschedule. No fixes in audit; transferPOSTbackend supports existingzone move, notbug. See docs/audit/ui/FUNC-028-FUNCTIONAL-BUTTON-AUDIT.md; runtime mutation not tested.

### FIX-029 — Functional action contracts [VERIFIED22/10]
MainLayout chỉ ack hành động sau API success; error giữ pending, markRead không clear needsAction; readRequestIds giữ trạng thái đọc qua polling trong phiên. Original notification.sourceType giữ qua normalization/Navbar. App /time-workforce dùng LegacyRequestRedirect; /marketplace/history→FILLED; /schedule/auto→schedule?action=auto, SchedulePage consume mở modal+week dates. /schedule/templates→ManagerRoute ShiftTemplatesPage, CRUD /stores/{id}/shift-templates hiện có, storechange abort/remount. OverviewCameraController resolve employee qua cameraTargets.findStaffAvatar, kiểm belongsToScene và rebind; manual orbit suppress; CameraController.getWorldPosition; Inspector nút toggle theo dõi đúng ID. Node16/build/newmodulelint PASS, Edge live redirects/GET/follow +isolated mutation intercept PASS. Report FIX029. Chưa browser templateCRUD ghi DB thật. Stale DTO/template APIs/notification source/scene roots/camera lifecycle.

### FIX-030 — Marketplace expiry [VERIFIED22/10]
MarketplacePage rawOpenShifts→openShifts derivedby utils/marketplaceTime.js; managerunderstaffed onlyrecruitmentOpen; clock1s vàfocus/visibility, freshguards handlers. /FILLED semantics nayLịch sử ca gồmclosed/cancelled/ended/full, không chỉfull. Giữ oldrecordsreadonly. Time+07 khớpMarketplaceService, overnightendnextday, deadline<=nowclosed. RealEdge0active/20history; Node6+build/lint PASS; isolatedclock61s confirmsautoexpire, noDBwrites. Stale timezones/DTO/status/shiftdata/historyrouting.

### FIX-031 — Shift form persistence [VERIFIED22/10]
SchedulePage dùng components/ShiftRegistrationForm + pages/shift-form.css + utils/shiftForm.js; create defaults future quarter-hour≤8h in storehours, date validation +07/deadline, busy/focus guards; templates GET/store-config thật. Note/color/role từ backend ưu tiên cachelegacy, không tạo local metadata mới. ShiftCreateRequest color hex6; Shift entity color/V46; ShiftService create persist note/color +configureRequestedRole; update color/template/role và bảo toàn existing multi-assignments. Role đổi chỉ draft/unassigned/single requirement; form tương ứng khóa UI. Live POST201/PUT200/readback và DELETE204 cleanup, V46 success, Maven23/Node4/build/lint/Edge3sizes PASS. Report FIX031; stale DTO/config/template/assignment contracts.

### FIX-031A — Compact shift dialog [VERIFIED22/10]
shift-form.css width680/compact spacing và38px fields; ShiftRegistrationForm attendance native details closed mặc định. SchedulePage focus-trap selector thêm summary; closed details children bỏ qua qua getClientRects. Edge1920/1366 không body-scroll lúc mở; mobile390 cuộn thân/footer visible. Build/lint PASS, không API change.

### FIX-032 — Demand daily semantics [VERIFIED22/10]
DemandDailyView + demandStatus.js render count as demand not assigned, target===count separate from min≤count≤max; summary derive quotas, missing unknown; nofakecountfallback. Norm dialog validates min≤target≤max and keeps failed writes; daily handler server-first. Common dp-demand-savebar sticky in Modal, replaces all view applybuttons; DAY payload date only/WEEK weekStart only (backend precedence date). Node2/build/Edge3sizes/liveGET/isolatedwrites PASS. Weekly oldstats remain; reportFIX032.

### FIX-033 — Quota data provenance [VERIFIED22/10]
Daily GET bundles roles/quotas/duration; UI totals derived. buildDailyShiftQuota falls back to role rules when no requirement; quotaId temp_* signals absent shift only, not all absent requirements. Norm PUT persists store-wide PositionNormOverride. AutoFill role/weekend rules ≠ exact target, UI now Điền theo quy tắc. Daily width1280, norm buttons inline rolecolumn; no API changes. GETlive3routes200, build/lint/Edge3sizesPASS. Mapping/limits reportFIX033.

### FIX-034 — Weekly demand UI [VERIFIED22/10]
DemandWeeklyMatrixView renders days×morning/afternoon lookup and matrixRows; totals/status derive APIcells+demandStatus, hours/cost frombudgetAPI. New DemandNormDialog validates and retains failures; budget detailsform. Weekly handlers count/budget now server-first/refetch and return false onerrors, nooptimisticfakeKPI. dp-week-scroll auto +stickyrole, width1280, minmatrix1180. Edge3sizes/GETlive/isolatedwrites/keyboard/build/lint2/Node2PASS. NoDBmutations. ReportFIX034.

### FIX-035 — Expanded demand scroll [VERIFIED22/10]
SCROLL018 overlay-scroll design superseded: dp-fullscreen-modal-overlay flex/overflowhidden; workspace boundedmaxheight flexcolumn; dp-modal-content-area single verticalscroller flex1/minheight0, header/controls/footer flex0/static. Tables ownhorizontal scroll; close anchoredheader; nestednormcard maxheight/overflow. Fixture42warnings allopen+budgetedit reachesSave via hittest3sizesPASS, live day regressionPASS/buildPASS. Stale if overflow/flex/maxheight changed. ReportFIX035.

### FIX-036 — Definite viewport grid [VERIFIED22/10]
DemandPlanningViewport.css importafterRedesign owns overlay/grid bound. Workspace4rows auto auto minmax(0,1fr) auto; definiteheightmin860,varviewport−32/mobile−16. Modal overlayRef effect sets --dp-viewport-height via visualViewport.height/window.innerHeight, cleansresize listeners. Footerrowoutsidecontent. Livebudgetedit3sizes and42warningsfixture2sizes savehit/boundedPASS/buildPASS. ReportFIX036; stale on rowstructure/importorder/viewportlifecycle.

### FIX-037 — Dense demand controls [VERIFIED22/10]
Viewport.css owns dense header/metrics/cell grid: count central and stepperbuttons displaycontents at24pxwidth; statuses secondrow and fullnormtitle. Weekly/Daily remove repeatedreviewp; metrics small remainsaccessibilityonly. Budgetform horizontaldesktop; cap790. Live3rowweek expandedbudget fits1366×768 withoutverticalscroll; mobile keeps scroller/footer. Build/lintPASS, reportFIX037.

### FIX-038 — Balanced demand scale [VERIFIED22/10]
Viewport.css denseblock replaced with shared scale: body13/secondary12/count18/status11, stepper30×32, metrics60px, gaps12–16, width1420 cap800. Desktop1620 fullweek fitswidth, smaller uses ownhorizontal scroll; vertical remainsboundedgrid. Edge3sizes Savehit/footerPASS/buildPASS, noAPIchange. ReportFIX038 supersedes densityFIX037.

### STAB-001 — Ổn định hệ thống đang triển khai (23/10/2026)
Danh mục tĩnh 35 routes/27 services/32 controllers: docs/audit/stabilization/source-inventory.json; ma trận và gate mở tại STAB-001.md. Web Node189/189/build PASS; baseline lint341errors/39warnings còn mở. Sửa quota apply không xóa ca/phân công, cảnh báo review giữ modal; skill lookup scoped store; source SAVED/SUGGESTED +assigned/shortage/excess/unclassified; thống nhất gợi ý ngày/tuần với rule apply, bỏ tự nâng max cuối tuần. Budget chuyển Store.monthlyQuotaBudget/V47 (chỉ migration DB test, chưa deploy operational). API client bỏ Authorization cache và giới hạn retry queued refresh; Edge fixture concurrency1refresh/2requests và noauth sauclear PASS. Demand request sequence chống response cũ. Docker test riêng ports55432/56379, runner Linux scripts/test-stabilization-backend.ps1. Linux suite đầu520/0fail/1error/5skip; lỗi payroll fixture không có contract, đã sửa tự tạo cùngstore+transaction rollback, chạy lại log backend-stabilization-linux-after.log. Edge155 live đọc6pages×3sizes no horizontaloverflow/no JSerror; chưa full journeys/125%/production. Không tuyên bố toàn hệ thống đạt; không operational DBwrite/commit/push. Tiếp tục đọc log final, kiểm DB persistence và các gate matrix còn mở.

SOURCE-RUN 23/10: User prefers backend from source/VS Code. Added .vscode/tasks.json. Backup ~/.codex/backups/shiftsync/before-source-v47.dump (367547 bytes). Source startup failed: DevTools classloader first, disabled restart then Java/Netty Windows loopback Invalid argument: connect. Restored existing Docker backend to avoid web outage; source switch NOT complete. See backend-source.log. Need resolve host Java selector issue before switching.

STAB-001 deploy 23/10: rebuilt backend Docker from current source, recreated only backend; running image matches latest sha256:31ef093bb47cfe08d32081cd4c9a93712666c76289f8b704a5a5d67ab5dd2668. V47 applied during preceding source startup (corrects prior not-deployed notes); database backed up before migration. Live day/week API verification after restart recorded in chat.

### STAB-002 — Kiểm chứng persistence/quyền và UI live (23/10/2026)
Thêm QuotaBudgetPersistenceTest: flush+clear rồi đọc lại DB và response tuần đúng92000000, store khác không ảnh hưởng, giá trị âm không ghi đè. Linux isolated test cùng AvailabilityIdorSecurityTest:3/3 PASS. Đây là persistence-context reload, chưa phải restart JVM. Test availability được bổ sung @Transactional/AfterEach clearSecurityContext để không rò auth/dữ liệu sang test khác (cleanup edit sau lượt chạy, cần suite kế tiếp xác nhận). Edge155 live backend rebuilt: weekly42coverage cells, footer visible vàno horizontal overflow1920/1366/390 PASS, không DBwrite. Không production source change lần này; Docker không cần rebuild chỉ vì test/docs. Còn fulljourneys/realtime/3D/lint/125%.
### STAB-003 — Time and attendance contracts [VERIFIED source+targeted test 24/10]

- Shift create/update/bulk and templates require `endTime > startTime`; overnight shifts are not a supported product flow.
- Attendance list DTOs contain `hasCheckInPhoto`/`hasCheckOutPhoto`, never Base64. Photo bytes are scoped to `/api/stores/{storeId}/attendance/{attendanceId}/photos/{kind}` or `/api/attendance/me/{attendanceId}/photos/{kind}`.
- `WebSocketConfig` accepts only `app.websocket.allowed-origins`, requires valid STOMP CONNECT auth, and rejects unauthenticated subscriptions.

