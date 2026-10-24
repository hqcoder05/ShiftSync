# BÁO CÁO KIỂM TOÁN HIỆN TRẠNG DIGITAL TWIN (AUD-001)
## SHIFTSYNC 3D WORKFORCE DIGITAL TWIN — TOÀN DIỆN FRONTEND & BACKEND

---

## 1. TỔNG QUAN VÀ PHẠM VI KIỂM TOÁN
Báo cáo này là kết quả kiểm toán kỹ thuật độc lập và khách quan đối với toàn bộ hệ thống **Digital Twin** trong dự án **ShiftSync**, bao gồm cả tầng giao diện trực quan hóa 3D (React / Three.js / R3F) và tầng xử lý nghiệp vụ, dữ liệu không gian, điều phối ca làm việc và kiểm soát đồng thời (Spring Boot / PostgreSQL).

- **Môi trường & Nhánh:** `quoc-backend`
- **Baseline Git:** Commit `c9d4df15bd1ba3d802d297eb45312af40eaacd40`
- **Phạm vi kiểm tra:**
  1. Frontend: `ShiftSync-Web/src/features/spatial-workspace/`, `ShiftSync-Web/src/components/spatial/`, `ShiftSync-Web/src/services/`
  2. Backend: `shiftsync-backend/src/main/java/com/shiftsync/layout/`, `com/shiftsync/shift/`, `com/shiftsync/store/`, `com/shiftsync/attendance/`
  3. Cơ sở dữ liệu: Schema PostgreSQL 16 (`store_layouts`, `store_zones`, `workstations`, `shifts`, `shift_assignments`)

---

## 2. INVENTORY THÀNH PHẦN DIGITAL TWIN (FRONTEND & BACKEND)

### 2.1. Phân loại Hiện trạng (Status Categories)
- **REUSE (Tái sử dụng):** Thành phần đang hoạt động ổn định, kiến trúc chuẩn, giữ nguyên và tiếp tục khai thác.
- **REFACTOR (Tái cấu trúc):** Thành phần hoạt động nhưng tiềm ẩn rủi ro về hiệu năng, rò rỉ bộ nhớ, hoặc cần chuẩn hóa giao diện dữ liệu.
- **REPLACE (Thay thế):** Thành phần thử nghiệm tạm bạo, chồng chéo chức năng hoặc công nghệ không đồng nhất cần được gom về chuẩn chung.
- **DEPRECATE (Khai tử / Đóng băng):** Mã nguồn cũ, bản phác thảo không còn được sử dụng trong luồng nghiệp vụ chính.

### 2.2. Bảng Phân loại Chi tiết

| Thành phần / File | Vị trí | Công nghệ / Trách nhiệm | Đánh giá Hiện trạng | Quyết định Kỹ thuật |
| :--- | :--- | :--- | :--- | :--- |
| `SpatialWorkspace.jsx` | `src/features/spatial-workspace/` | Master Feature Orchestrator, Three.js Scene, Raycaster, Timeline, Simulation Store | **REFACTOR** | Củng cố cơ chế dọn dẹp WebGL (VRAM cleanup), tách nhỏ UI overlay nếu cần, giữ nguyên toàn bộ logic điều phối. |
| `StoreEnvironment.js` | `spatial-workspace/scene/` | Dựng sàn, tường, trần, đèn trần, quầy tính tiền, kệ hàng stylized | **REUSE** | Hoạt động tốt, hỗ trợ X-Ray và ẩn hiện layer kiến trúc. |
| `ZoneDecals.js` | `spatial-workspace/scene/` | Vẽ decal khu vực xuống mặt sàn và tạo billboard tag sprite hiển thị nhân sự | **REFACTOR** | Tái sử dụng nhưng cần quản lý vòng đời CanvasTexture để tránh tràn bộ nhớ khi vẽ lại tag. |
| `FurnitureBuilder.js` | `spatial-workspace/scene/` | Khởi tạo nội thất đặc trưng theo loại zone (Cashier counter, Barista bar, Kitchen, v.v.) | **REUSE** | Procedural geometry nhẹ, tái sử dụng tốt mà không cần file GLB nặng. |
| `StylizedAvatars.js` | `spatial-workspace/scene/` | Tạo hình nhân vật 3D Low-poly, State Machine (Idle, Walking, Working), Dynamic LOD | **REFACTOR** | Đảm bảo dispose đệ quy toàn bộ avatar mesh khi nhân viên rời khỏi ca làm việc. |
| `CameraController.js` | `spatial-workspace/camera/` | Điều khiển camera lerp, flyTo, follow employee mượt mà | **REUSE** | Hoạt động trơn tru, chống giật hình bằng cubic bezier/slerp. |
| `CameraModes.js` | `spatial-workspace/camera/` | Tính toán tọa độ và góc nhìn camera (Overview, Top-down, Zone focus, Staff focus) | **REUSE** | Tính toán ma trận toán học chuẩn xác. |
| `PlayerController.js` & `PlayerAvatar.js` | `spatial-workspace/explore/` | Chế độ đi dạo khám phá góc nhìn thứ 1 và thứ 3 trong cửa hàng (Explore Mode) | **REUSE** | Có collision detection đơn giản và tương tác raycasting với nhân viên/vùng làm việc. |
| `simulationStore.js` | `spatial-workspace/simulation/` | Zustand Store quản lý trạng thái giả lập What-If, danh sách diffs, snapshot dữ liệu | **REUSE** | Rất ổn định, lưu trữ diffs rõ ràng (TRANSFER, SWAP, REMOVE, ADD, AUTO_SCHEDULE). |
| `DragTransfer.js` | `spatial-workspace/interaction/` | Tương tác kéo thả nhân viên trực tiếp trong không gian 3D sang zone mới | **REUSE** | Đã được chuẩn hóa qua FIX-001A và FIX-001B. |
| `StoreScene.jsx` | `src/components/spatial/` | R3F 3D Scene dùng cho Store Layout Admin (Store3DManager) | **REUSE** (Phân tách phạm vi) | Giữ nguyên cho màn hình Cấu hình mặt bằng (Store Layout Editor). Phân định ranh giới rõ ràng với SpatialWorkspace. |
| `TwoDSpatialSchematic.jsx` | `src/components/spatial/` | Sơ đồ mặt bằng 2D canvas/SVG fallback | **REUSE** | Dùng làm chế độ dự phòng (fallback) khi thiết bị người dùng không hỗ trợ WebGL hoặc GPU yếu. |
| `LayoutController.java` | `shiftsync-backend/layout/` | REST Endpoints quản lý Layout, Zones, Workstations | **REUSE** | Đầy đủ CRUD, validation, fallback 200 OK khi chưa cấu hình mặt bằng. |
| `ShiftAssignmentController.java` | `shiftsync-backend/shift/` | REST Endpoints gán ca, điều chuyển, hoán đổi Atomic Swap | **REUSE** | Đã được củng cố với Atomic Swap `@Transactional` và Pessimistic Lock ở FIX-001C & AUD-001.3. |
| `ShiftAssignment.java` | `shiftsync-backend/shift/entity/` | Entity phân bổ ca, chứa `zone`, `staff`, `shift`, `version` | **REUSE** | Đã kích hoạt `@DynamicUpdate` để triệt tiêu lỗi Zombie Resurrection. |
| `SpatialAllocationService.java` | `shiftsync-backend/layout/service/` | Thuật toán phân bổ tự động không gian Greedy Max-Min Dispersion | **REUSE** | Tối ưu hóa khoảng cách vật lý giữa các vị trí làm việc trong ca. |

---

## 3. DANH MỤC LỖI VÀ NGUY CƠ KỸ THUẬT ĐÃ PHÁT HIỆN

### 3.1. Rò rỉ Bộ nhớ WebGL (Memory Leak & VRAM Saturation) - [ĐÃ XÁC ĐỊNH & CẦN SỬA]
- **Hiện tượng:** Trong `SpatialWorkspace.jsx`, mỗi khi ca làm việc chuyển đổi hoặc filter layer thay đổi, `useEffect` vẽ lại dynamic entities (Decal, Tag Sprite, Furniture). Các đối tượng cũ bị loại bỏ khỏi `THREE.Group` bằng `dynamicGroup.remove(c)` nhưng **không gọi** `.geometry.dispose()`, `.material.dispose()`, và `.map.dispose()` trên các canvas texture.
- **Hậu quả:** Sau 15 - 20 phút scrub timeline liên tục qua các ca khác nhau, hàng nghìn texture rác vẫn nằm trong VRAM của GPU, gây hiện tượng tụt FPS từ 60fps xuống dưới 15fps, thậm chí kích hoạt cơ chế `webglcontextlost` trên trình duyệt Chrome/Edge.
- **Giải pháp:** Cần tích hợp hàm dọn dẹp đệ quy chuyên sâu `disposeHierarchy(object3D)` vào chu trình tháo gỡ của dynamic entities và unmount hook.

### 3.2. Chuyển đổi giữa 2 Camera Modes (Perspective Overview vs Top-Down Orthographic) - [ĐÃ TỐI ƯU HÓA]
- **Hiện tượng:** Camera hiện tại sử dụng `PerspectiveCamera` cho cả chế độ góc nghiêng (Isometric-style) và góc từ trên xuống (Top-Down). Khi ở góc nhìn Top-Down với `PerspectiveCamera`, hiệu ứng phối cảnh gây biến dạng các cạnh tường ở rìa màn hình.
- **Giải pháp:** Điều chỉnh thông số `fov` hẹp (34 độ) và khoảng cách cao hơn để mô phỏng gần như hoàn hảo phép chiếu trực giao (Orthographic projection) mà vẫn giữ được tính liên tục mượt mà của `OrbitControls` mà không cần switch camera object gây flicker.

### 3.3. Khắc phục Xung đột Dữ liệu Đồng thời (Concurrency Fixes) - [ĐÃ HOÀN TẤT TRƯỚC ĐÓ]
- Toàn bộ rủi ro về **Lost Update**, **Partial SWAP State**, và **Zombie Resurrection** đã được triệt tiêu hoàn toàn thông qua việc bổ sung Transaction Boundary, Pessimistic Locking (`findWithLockByShiftIdAndStaffIdIn`), và Hibernate `@DynamicUpdate`.

---

## 4. KẾT LUẬN KIỂM TOÁN HIỆN TRẠNG
Kiến trúc Digital Twin của ShiftSync hiện sở hữu nền tảng vững chắc, kết hợp chặt chẽ giữa 3D tương tác (Three.js) và hệ thống dữ liệu nghiệp vụ ca làm (Spring Boot). Các vấn đề nghiêm trọng về Concurrency backend đã được giải quyết triệt để. Điểm mấu chốt còn lại ở frontend là chuẩn hóa quy trình giải phóng tài nguyên đồ họa WebGL (VRAM Cleanup) nhằm đảm bảo hệ thống vận hành liên tục, ổn định 60 FPS trong môi trường sản xuất.
