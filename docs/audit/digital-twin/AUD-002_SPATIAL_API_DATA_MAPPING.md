# BÁO CÁO ÁNH XẠ DỮ LIỆU VÀ GIAO TIẾP API SPATIAL (AUD-002)
## ĐỐI CHIẾU END-TO-END GIỮA FRONTEND CLIENT, REST CONTROLLER, DTO VÀ POSTGRESQL SCHEMA

---

## 1. MỤC TIÊU VÀ PHẠM VI
Báo cáo này đối chiếu chi tiết đường truyền dữ liệu không gian (Spatial Data Flow) từ tầng Frontend Web Client qua các REST API endpoints, DTO, Spring Boot Services, Spring Data Repositories, tới các bảng vật lý trong cơ sở dữ liệu PostgreSQL 16.4.

Mục tiêu chính:
1. Xác thực tính nhất quán giữa payload request/response của frontend và backend.
2. Kiểm tra ma trận phân quyền (RBAC Authorization Matrix).
3. Phát hiện các điểm sai lệch kiểu dữ liệu, các trường bị thiếu (mismatched/missing fields) hoặc rủi ro serialization.

---

## 2. MA TRẬN ÁNH XẠ API VÀ DỮ LIỆU (END-TO-END TRACEABILITY)

| STT | Luồng nghiệp vụ | Frontend Service Call | HTTP Endpoint Backend | Controller & Method | DTO Request / Response | Database Table & Columns |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Lấy kích thước mặt bằng 3D | `layoutService.getStoreLayout(storeId)` | `GET /api/stores/{storeId}/layout` | `LayoutController.getLayout()` | Request: None<br>Response: `StoreLayoutDto` | Bảng `store_layouts` (`length`, `width`, `height`, `version`, `is_active`) |
| **2** | Lưu kích thước mặt bằng 3D | `layoutService.saveStoreLayout(storeId, dimensions)` | `POST /api/stores/{storeId}/layout` | `LayoutController.createOrUpdateLayout()` | Request: `CreateLayoutRequest`<br>Response: `StoreLayoutDto` | Bảng `store_layouts` (`length`, `width`, `height`) |
| **3** | Lấy danh sách Zone 3D | `layoutService.getStoreZones(storeId)` | `GET /api/stores/{storeId}/zones` | `LayoutController.getZones()` | Request: None<br>Response: `List<StoreZoneDto>` | Bảng `store_zones` (`id`, `name`, `code`, `zone_type`, `x`, `y`, `z`, `capacity`, `color`, `width_dim`, `length_dim`, `height_dim`) |
| **4** | Thêm mới Zone 3D | `layoutService.addStoreZone(storeId, zoneData)` | `POST /api/stores/{storeId}/zones` | `LayoutController.addZone()` | Request: `CreateZoneRequest`<br>Response: `StoreZoneDto` | Bảng `store_zones` (`store_id`, `parent_zone_id`, `name`, `code`, v.v.) |
| **5** | Cập nhật Zone 3D | `layoutService.updateStoreZone(storeId, zoneId, data)` | `PUT /api/stores/{storeId}/zones/{zoneId}` | `LayoutController.updateZone()` | Request: `UpdateZoneRequest`<br>Response: `StoreZoneDto` | Bảng `store_zones` |
| **6** | Xóa Zone 3D | `layoutService.deleteStoreZone(storeId, zoneId)` | `DELETE /api/stores/{storeId}/zones/{zoneId}` | `LayoutController.deleteZone()` | Request: None<br>Response: `204 No Content` | Bảng `store_zones` |
| **7** | Lấy vị trí Workstation | `layoutService.getStoreWorkstations(storeId)` | `GET /api/stores/{storeId}/workstations` | `LayoutController.getWorkstations()` | Request: None<br>Response: `List<WorkstationDto>` | Bảng `workstations` (`id`, `zone_id`, `code`, `name`, `x`, `y`, `z`, `status`) |
| **8** | Tạo Workstation | `layoutService.addStoreWorkstation(storeId, wsData)` | `POST /api/stores/{storeId}/workstations` | `LayoutController.addWorkstation()` | Request: `CreateWorkstationRequest`<br>Response: `WorkstationDto` | Bảng `workstations` |
| **9** | Gán nhân viên vào ca & Zone (Hoặc TRANSFER) | `shiftService.assignStaffToShift(storeId, shiftId, data)` | `POST /api/stores/{storeId}/shifts/{shiftId}/assignments` | `ShiftAssignmentController.assignStaff()` | Request: `ShiftAssignmentRequest`<br>Response: `ShiftAssignmentResponseDTO` | Bảng `shift_assignments` (`shift_id`, `staff_id`, `zone_id`, `role`, `status`) |
| **10** | Hoán đổi Atomic Swap 2 nhân viên giữa 2 Zone | `shiftService.swapStaffZones(storeId, shiftId, staffA, staffB)` | `POST /api/stores/{storeId}/shifts/{shiftId}/assignments/swap` | `ShiftAssignmentController.swapZones()` | Request: `ShiftZoneSwapRequest`<br>Response: `ShiftZoneSwapResponseDTO` | Bảng `shift_assignments` (Cập nhật đồng thời 2 bản ghi trong 1 Transaction) |
| **11** | Hủy gán nhân viên khỏi ca | `shiftService.removeStaffFromShift(storeId, shiftId, staffId)` | `DELETE /api/stores/{storeId}/shifts/{shiftId}/assignments` | `ShiftAssignmentController.removeAssignment()` | Request: `staffId` Param<br>Response: `204 No Content` | Bảng `shift_assignments` |
| **12** | Phân bổ không gian tối ưu cho ca (Greedy Dispersion) | `layoutService.allocateZonesForShift(storeId, shiftId)` | `POST /api/stores/{storeId}/shifts/{shiftId}/allocate-zones` | `LayoutController.allocateZonesForShift()` | Request: None<br>Response: `List<ShiftAssignmentResponseDTO>` | Bảng `shift_assignments` & `workstations` |

---

## 3. MA TRẬN PHÂN QUYỀN (SECURITY & RBAC MATRIX)

Các endpoint trên được bảo vệ bởi Spring Security với các biểu thức `@PreAuthorize`:

| Nhóm Endpoint | Endpoint Pattern | ADMIN | STORE MANAGER | EMPLOYEE | Ghi chú kiểm tra quyền |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Layout Xem** | `GET /api/stores/{storeId}/layout` | Có | Có | Có* | Quyền truy cập store qua `@storeAccessService.canAccessStore` |
| **Layout Sửa** | `POST /api/stores/{storeId}/layout` | Có | Có (Cửa hàng của mình) | Không | Yêu cầu `hasRole('ADMIN')` hoặc `hasRole('MANAGER')` |
| **Zone Xem** | `GET /api/stores/{storeId}/zones` | Có | Có | Có* | Mọi nhân sự thuộc chi nhánh đều được xem bản đồ không gian |
| **Zone Sửa/Xóa** | `POST/PUT/DELETE /api/stores/{storeId}/zones/**` | Có | Có (Cửa hàng của mình) | Không | Quyền quản lý layout |
| **Workstation Sửa** | `POST /api/stores/{storeId}/workstations` | Có | Có (Cửa hàng của mình) | Không | Quản lý vị trí làm việc |
| **Shift Assignment** | `POST/DELETE /api/stores/{storeId}/shifts/{shiftId}/assignments/**` | Có | Có (Cửa hàng của mình) | Không | Quản lý điều phối nhân sự ca |
| **Atomic SWAP** | `POST /api/stores/{storeId}/shifts/{shiftId}/assignments/swap` | Có | Có (Cửa hàng của mình) | Không | Yêu cầu Manager hoặc Admin |

---

## 4. ĐỐI CHIẾU CHI TIẾT STRUCTURAL TYPES & DTO ALIGNMENT

### 4.1. Cấu trúc Zone 3D (`StoreZone` vs `StoreZoneDto`)
- **Backend Model (`StoreZone`):**
  - `x`, `y`, `z`: Tọa độ tâm khu vực (Double, mét).
  - `widthDim`, `lengthDim`, `heightDim`: Kích thước không gian 3 chiều của zone (Double, mặc định 3m x 4m x 2.8m).
  - `capacity`: Sức chứa nhân sự tối đa trong khu vực (Integer).
  - `color`: Mã màu hex đại diện (ví dụ `#3B82F6` cho Thu Ngân, `#10B981` cho Pha Chế).
- **Frontend Three.js Adapter (`toThreeCoords`):**
  - Hệ tọa độ Three.js: Trung tâm cửa hàng nằm tại `(0, 0, 0)`, trục Y hướng lên trên (độ cao), mặt phẳng sàn là X-Z.
  - Công thức chuyển đổi:
    - `Three_X = Zone_X - Store_Length / 2`
    - `Three_Y = Zone_Z` (hoặc cao độ sàn)
    - `Three_Z = Zone_Y - Store_Width / 2`
  - Đánh giá: Chuyển đổi chính xác 1:1, không bị méo lệch góc hoặc lật ngược trục.

### 4.2. Cấu trúc Shift Assignment & Atomic Swap
- **`ShiftZoneSwapRequest`:**
  - `staffAId` (UUID, NotNull)
  - `staffBId` (UUID, NotNull)
- **`ShiftZoneSwapResponseDTO`:**
  - `staffAId`, `staffAName`, `staffANewZoneId`, `staffANewZoneName`
  - `staffBId`, `staffBName`, `staffBNewZoneId`, `staffBNewZoneName`
  - `message`, `timestamp`
- **Frontend Client (`swapStaffZones`):**
  - Truyền JSON body: `{ staffAId: "...", staffBId: "..." }`.
  - Phù hợp hoàn hảo 100% với DTO của Backend, nhận phản hồi đầy đủ thông tin để cập nhật tức thời State của React và Three.js Avatars.

---

## 5. KẾT LUẬN VÀ KIẾN NGHỊ
Đường truyền dữ liệu Spatial API giữa Frontend và Backend hoàn toàn thông suốt, kiểu dữ liệu tương thích, bảo mật phân quyền RBAC chặt chẽ và không có khoảng trống dữ liệu (data gap) nào gây cản trở cho việc vận hành MVP.
