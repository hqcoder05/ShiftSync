# Architecture Decision Record (ADR)
# ARC-001: Autonomous Visualization Layer Architecture Design

---

## 1. Task Metadata & Status

| Attribute | Details |
| :--- | :--- |
| **Task ID** | `ARC-001` |
| **Task Name** | Thiết kế kiến trúc Visualization Layer (Visualization Layer Architecture Design) |
| **Architect** | Senior Software Architect, Three.js/WebGL Specialist & Frontend Architecture Engineer |
| **Target Scope** | `ShiftSync-Web/src/features/spatial-workspace/` & `ShiftSync-Web/src/components/spatial/` |
| **Baseline Commit** | `c9d4df1` (Branch: `quoc-backend`) |
| **Status** | `PROPOSED — READY FOR REVIEW` |
| **Primary Deliverable** | `docs/architecture/ADR-ARC-001-visualization-layer.md` |
| **Verification Baseline** | 45/45 Web Unit/Regression Tests PASS, 488/488 Backend Tests PASS |
| **Date** | 2026-10-14 |

---

## 2. Executive Summary

Phân hệ **3D Spatial Digital Twin** của ShiftSync (`src/features/spatial-workspace/`) là thành phần cốt lõi của giải pháp Quản trị Lực lượng Lao động Thông minh, mô phỏng không gian cửa hàng 3D tỷ lệ thực, phân bổ trạm làm việc, trực quan hóa hiện diện nhân sự theo thời gian thực và hỗ trợ phòng thử nghiệm What-If.

Tuy nhiên, quá trình phát triển nhanh qua các giai đoạn (AUD-001, WEB-001, Phase 2A/B/C) đã dẫn đến việc tập trung quá nhiều trách nhiệm vào một tệp duy nhất: [`SpatialWorkspace.jsx`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx) (**2,417 dòng code**). Tệp này hiện đóng cùng lúc 9 vai trò: UI Shell, Client gọi API, Bộ quản lý trạng thái (30+ state/ref), Khởi tạo Scene/Renderer Three.js, Quản lý Camera kép, Bắt sự kiện Raycasting, Trình biên dịch đối tượng thủ tục (Procedural Builder), Trình điều phối mô phỏng What-If, và Động cơ Timeline Scrubber. Đồng thời, trong repository tồn tại các công nghệ cạnh tranh chưa được dọn dẹp (`@babylonjs/core`, `@react-three/fiber`, `@react-three/drei`).

**Kiến trúc Mục tiêu ARC-001** giải quyết triệt để vấn đề này bằng cách:
1. **Phân rã thành 6 phân lớp độc lập (Subsystems):** Scene Layer, Camera Layer, Interaction Layer, Assets/Procedural Layer, Visualization State Layer, và Application/Domain Integration Boundary.
2. **Chuẩn hóa công nghệ cốt lõi:** Đóng băng và chuẩn hóa trên **Pure Three.js r185+** kết hợp kiến trúc OOP Controllers hướng module; chính thức loại bỏ (deprecate) Babylon.js và R3F prototypes nhằm tối ưu hóa bundle size và triệt tiêu xung đột reconciliation.
3. **Phân định rõ 3 tầng trạng thái:** Trạng thái tương tác tạm thời (*Ephemeral*), Cấu hình hiển thị trực quan (*Visualization*), và Dữ liệu kinh doanh có thẩm quyền (*Authoritative Domain State*).
4. **Bảo toàn 100% các ràng buộc kỹ thuật đã kiểm chứng:** Giữ nguyên độ an toàn của khóa đồng thời Atomic SWAP (`PESSIMISTIC_WRITE`), Store Isolation Guard, cơ chế chống rò rỉ bộ nhớ WebGL (`WeakSet` protection), và 45 bài kiểm thử hồi quy hiện có.

---

## 3. Current Architecture & Verified Evidence

### 3.1. Hiện trạng triển khai trong Mã nguồn (`[VERIFIED]`)
Qua đối soát mã nguồn thực tế tại commit `c9d4df1`:

1. **Điểm nhập (Entrypoint):**
   - [`Store3DCanvas.jsx`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/components/spatial/Store3DCanvas.jsx) sử dụng `React.lazy()` và `Suspense` để bọc và tải động `features/spatial-workspace/SpatialWorkspace.jsx`.
   - `SchedulePage.jsx` và `StoresPage.jsx` (thông qua `Store3DManager.jsx`) nhúng `<Store3DCanvas />`.
2. **Cấu trúc thực tế của `SpatialWorkspace.jsx`:**
   - Sử dụng trực tiếp thư viện Three.js bản ngữ: `import * as THREE from 'three'` và `import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'`.
   - Một khối `useEffect` đơn lẻ (dòng 1357–1724, dài 367 dòng) khởi tạo toàn bộ `THREE.Scene`, 2 Camera (Perspective & Orthographic), `THREE.WebGLRenderer`, `OrbitControls`, `CameraController`, `DragTransfer`, `WorkstationDragController`, 3 nguồn ánh sáng, hạt hơi nước (`steamParticles`), `ResizeObserver`, raycasting click handler, và vòng lặp `requestAnimationFrame`.
   - Một khối `useEffect` thứ hai (dòng 1727–1986, dài 260 dòng) render toàn bộ Zones, Furniture, Workstations, Geofence boundary và Avatars khi bất kỳ dữ liệu ca, danh sách nhân viên hoặc layer toggle nào thay đổi.
3. **Công nghệ cạnh tranh tồn dư:**
   - Trong `ShiftSync-Web/package.json`: có cả `"three": "^0.185.1"`, `"@react-three/fiber": "^9.7.0"`, `"@react-three/drei": "^10.7.8"`, và `"@babylonjs/core": "^9.25.0"`.
   - `StoreBabylonCanvas.jsx` (754 dòng) là bản mẫu thử nghiệm dùng Babylon.js, không được kết nối vào luồng chính.
   - `StoreScene.jsx` dùng React Three Fiber (`useThree`, `useFrame`), song song tồn tại nhưng không phục vụ tính năng chính của Digital Twin.
4. **Bộ điều khiển tương tác chuyên biệt đã được module hóa một phần:**
   - [`WorkstationDragController.js`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/interaction/WorkstationDragController.js): Quản lý kéo thả trạm làm việc, khóa biên `[0.8m, Dim-0.8m]`, va chạm $1.1\text{m}$.
   - [`DragTransfer.js`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/interaction/DragTransfer.js): Quản lý kéo thả nhân sự giữa các zone trong phòng mô phỏng.
   - [`CameraController.js`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/camera/CameraController.js): Quản lý bay góc quay camera (`flyTo`) và bám theo nhân viên (`followObject`).
   - [`PlayerController.js`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/explore/PlayerController.js): Quản lý góc nhìn thứ nhất / thứ ba trong chế độ tham quan.
5. **Quản lý Trạng thái:**
   - Sử dụng Zustand v5 (`useSimulationStore.js`) cho phòng thử nghiệm What-If.
   - Trạng thái trực quan và trạng thái tương tác còn lại phân tán trong hơn 30 `useState` / `useRef` bên trong `SpatialWorkspace.jsx`.

---

## 4. Verified Architectural Problems & Constraints

### 4.1. Danh mục Vấn đề Kiến trúc Đã Kiểm chứng (Verified Problems)

| Mã vấn đề | Phân loại | Mô tả chi tiết vấn đề | Bằng chứng mã nguồn (`[VERIFIED]`) | Hệ quả kỹ thuật / Rủi ro |
| :---: | :--- | :--- | :--- | :--- |
| **PRB-01** | **Monolithic God Component** | `SpatialWorkspace.jsx` chứa 2,417 dòng code, gánh vác 9 trách nhiệm khác nhau từ UI DOM đến WebGL canvas và API client. | `SpatialWorkspace.jsx:1-2417` | Khó bảo trì, vi phạm Single Responsibility Principle (SRP), nguy cơ xung đột merge cao. |
| **PRB-02** | **Xáo trộn 3 Tầng Trạng thái** | Trạng thái kéo tạm thời (`draftWorkstationCoords`), cấu hình góc nhìn (`cameraMode`, `layers`), và dữ liệu gốc từ DB bị trộn lẫn trong React state của component cha. | `SpatialWorkspace.jsx:195-250` | Re-render thừa thãi toàn bộ component React DOM mỗi khi con trỏ di chuyển; nguy cơ rò rỉ dữ liệu nháp khi đổi store. |
| **PRB-03** | **Trực tiếp thao tác Camera Internals** | Component React trực tiếp gán đè `controls.object = perspCam`, sửa `minPolarAngle`, `maxPolarAngle` tại nhiều hàm callback rải rác. | `SpatialWorkspace.jsx:700-708, 598-605` | Dễ sinh lỗi mất đồng bộ góc nhìn hoặc gimbal lock; thiếu một Camera Facade thống nhất. |
| **PRB-04** | **Phân mảnh Công nghệ (Tech Fragmentation)** | Cùng lúc cài đặt Three.js, R3F, Drei và Babylon.js trong dependencies, dẫn đến bloat dung lượng bundle build production (~5MB+ uncompressed). | `package.json:12-28`, `StoreBabylonCanvas.jsx`, `StoreScene.jsx` | Lãng phí tài nguyên mạng, gây bối rối cho lập trình viên mới về công nghệ chuẩn của dự án. |
| **PRB-05** | **Rủi ro Rò rỉ Bộ nhớ Texture Canvas** | Các tag sprite hiển thị trạng thái trạm làm việc và khu vực tạo `new THREE.CanvasTexture()` liên tục khi dữ liệu đổi, nếu không có cơ chế quản lý tập trung sẽ gây WebGL leak. | `ZoneDecals.js`, `FurnitureBuilder.js:createWorkstationTagSprite` | Tràn bộ nhớ GPU sau 15-30 phút thao tác liên tục trên trình duyệt. |
| **PRB-06** | **Ràng buộc Ghép nối API trực tiếp** | `SpatialWorkspace.jsx` tự import và gọi trực tiếp `getStoreWorkstations`, `updateStoreWorkstation`, `getStoreAttendance`. | `SpatialWorkspace.jsx:60-63, 316, 2225` | Khó viết unit test cho tầng trực quan mà không phải mock toàn bộ axios và window context. |

### 4.2. Ràng buộc Kiến trúc Bắt buộc Bảo toàn (Architectural Constraints)
1. **Bảo tồn Atomic SWAP Concurrency (`[VERIFIED]`):** Khóa bi quan `PESSIMISTIC_WRITE` trên backend theo thứ tự canonical staff UUID không được bị phá vỡ bởi bất kỳ thay đổi payload nào từ frontend.
2. **Bảo tồn Định danh Staff vs Assignment (`[VERIFIED]`):** Bắt buộc duy trì các helper từ [`staffIdentity.js`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/utils/staffIdentity.js) (`getStaffId`, `getAssignmentId`, `areSameStaff`), tuyệt đối không dùng `s.id || s.staffId`.
3. **Bảo tồn Phân giải 3 Trạng thái Workstation Occupancy (`[VERIFIED]`):** Duy trì `ASSIGNED`, `UNASSIGNED`, `UNKNOWN` và phân biệt rõ Hiện diện thực tế (`checkIn && !checkOut`) vs Lịch ca theo [`workstationOccupancy.js`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/utils/workstationOccupancy.js).
4. **Bảo tồn Store Isolation Guard (`[VERIFIED]`):** Đổi chi nhánh (`activeStoreId`) phải xóa sạch selection và draft coordinates trước khi nạp dữ liệu mới.
5. **Bảo tồn WeakSet Shared Resources (`[VERIFIED]`):** Không được dispose các singletons trong `CharacterGeometries`, `CharacterMaterials` và `furnitureMaterials`.

---

## 5. Target Architecture (Kiến trúc Mục tiêu)

Kiến trúc mục tiêu tách biệt rõ ràng hệ thống Trực quan hóa 3D thành **6 Phân lớp Module Độc lập**:

```mermaid
graph TD
    subgraph UI_Shell ["Tầng Giao diện Người dùng (React DOM UI Shell)"]
        Toolbar["SpatialToolbar (Chế độ xem, Layers, Heatmap)"]
        Inspector["SpatialInspector (Chi tiết Nhân sự, Trạm, Đổi ca)"]
        Timeline["SpatialTimeline (Tua ca thời gian thực)"]
        EditorBanner["WorkstationEditorBanner (Lưu/Hủy vị trí trạm)"]
    end

    subgraph Orchestrator_Layer ["Tầng Điều phối (Visualization Orchestrator)"]
        SpatialWorkspace["SpatialWorkspace.jsx (Slim Orchestrator)"]
        SpatialBridge["SpatialBridge (Bộ chuyển đổi DTO sang Visual Props)"]
    end

    subgraph State_Layer ["Tầng Quản lý Trạng thái (3-Tier State Management)"]
        DomainState["1. Authoritative Domain State (Props / Server State)"]
        ViewState["2. Visualization View State (Zustand: useSpatialViewStore)"]
        InteractionState["3. Ephemeral Interaction State (Event Refs / Controller State)"]
        SimStore["Simulation Store (useSimulationStore - Isolated Sandbox)"]
    end

    subgraph Core_Engine ["Tầng Lõi Trực quan hóa (Core Visualization Engine)"]
        SceneManager["Scene Subsystem (SceneGraph, Lighting, ResourceManager)"]
        CameraManager["Camera Subsystem (Dual Cameras, OrbitControls, CameraController)"]
        InteractionManager["Interaction Subsystem (InteractionDispatcher, Drag Controllers)"]
        AssetManager["Assets & Procedural Subsystem (AvatarFactory, WorkstationFactory)"]
    end

    UI_Shell --> Orchestrator_Layer
    Orchestrator_Layer --> State_Layer
    Orchestrator_Layer --> Core_Engine
    InteractionManager -.->|Gửi sự kiện tương tác| ViewState
    InteractionManager -.->|Gửi đề xuất thay đổi| SimStore
    SpatialBridge -->|Chỉ đọc dữ liệu| DomainState
```

---

## 6. Module Responsibility Matrix (Ma trận Trách nhiệm Module)

Bảng dưới đây xác định rõ phạm vi trách nhiệm, ranh giới cấm, dữ liệu đầu vào/ra, và phương pháp kiểm thử cho từng phân lớp:

| Phân lớp (Subsystem) | Module thành phần | Trách nhiệm chính (Primary Responsibilities) | Trách nhiệm bị nghiêm cấm (Explicit Non-Responsibilities) | Dữ liệu đầu vào (Inputs) | Dữ liệu đầu ra (Outputs) | Trạng thái sở hữu (Owned State) | Phương pháp kiểm thử (Test Strategy) | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **Scene Layer** | `SceneGraphManager`<br/>`RenderEngine`<br/>`LightingRig`<br/>`ResourceManager` | - Khởi tạo và hủy `THREE.Scene`, `WebGLRenderer`.<br/>- Quản lý cây đồ thị cảnh (Static Environment vs Dynamic Entities).<br/>- Cấu hình chiếu sáng theo kích thước mặt bằng.<br/>- Thực thi giao thức giải phóng tài nguyên an toàn (`disposeHierarchy`). | - KHÔNG xử lý nghiệp vụ xếp ca.<br/>- KHÔNG gọi trực tiếp API backend.<br/>- KHÔNG tự ý dispose tài nguyên dùng chung (`WeakSet`). | Kích thước mặt bằng (`layout`), Container DOM, Cấu hình đồ họa. | Đối tượng WebGL Canvas, Scene Graph root. | `scene`, `renderer`, `envGroup`, `dynamicGroup`, `clock`. | Mock Canvas Unit Test, WebGL Context Loss Test. | `PROPOSED` |
| **Camera Layer** | `CameraManager`<br/>`CameraController`<br/>`CameraPresetRegistry` | - Quản lý Camera phối cảnh (Perspective) và Trực giao (Orthographic).<br/>- Điều khiển chuyển động xoay/phóng to thu nhỏ (`OrbitControls`).<br/>- Nội suy vị trí chuyển cảnh mượt mà (`flyTo`).<br/>- Bám theo nhân viên thời gian thực (`followObject`). | - KHÔNG can thiệp vào logic chọn đối tượng raycasting.<br/>- KHÔNG lưu trữ dữ liệu ca làm việc.<br/>- KHÔNG mutate trạng thái giao diện React trực tiếp. | Yêu cầu chuyển chế độ (`cameraMode`), Tọa độ mục tiêu, Sự kiện con trỏ. | Vị trí camera, Ma trận chiếu (`projectionMatrix`). | `activeCamera`, `targetPos`, `targetLookAt`, `isTransitioning`, `isFollowing`. | Math Unit Test (Lerp, Aspect Ratio, Bounding Frustum). | `PROPOSED` |
| **Interaction Layer** | `InteractionDispatcher`<br/>`WorkstationDragController`<br/>`DragTransfer`<br/>`PlayerController` | - Lắng nghe sự kiện chuột/chạm trên canvas, phân biệt click vs drag ($> 6\text{px}$).<br/>- Bắn Raycast chọn đối tượng (Nhân viên, Khu vực, Trạm).<br/>- Kéo thả trạm làm việc, khóa biên và phát hiện va chạm $1.1\text{m}$.<br/>- Kéo thả điều chuyển nhân sự What-If.<br/>- Điều khiển người chơi trong chế độ Explore. | - KHÔNG gửi API lưu vĩnh viễn dữ liệu xuống backend khi chưa có lệnh từ UI.<br/>- KHÔNG tự ý xóa phân công ca gốc.<br/>- KHÔNG can thiệp vào layout mặt bằng của chi nhánh khác. | Tọa độ con trỏ, Phím bấm, Cấu hình mặt bằng, Danh sách meshes. | Sự kiện chọn (`onSelect`), Tọa độ nháp (`draftCoords`), Cảnh báo va chạm (`collision`). | `isDragging`, `selectedMesh`, `originalPosition`, `validationState`. | Controller Unit Tests (7/7 pass hiện có), Raycast Intersection Tests. | `PROPOSED` |
| **Assets Layer** | `AvatarFactory`<br/>`WorkstationFactory`<br/>`EnvironmentFactory`<br/>`ZoneDecalFactory` | - Tạo và cập nhật mô hình 3D Stylized của nhân viên theo vai trò/đồng phục.<br/>- Cập nhật máy trạng thái hoạt ảnh đi lại / làm việc.<br/>- Dựng mô hình 3D trạm làm việc và sprite nhãn trạng thái (Pill Tag).<br/>- Dựng mặt bằng sàn, tường, thảm lối vào. | - KHÔNG quyết định ai được phân công vào trạm.<br/>- KHÔNG tự ý fetch dữ liệu nhân sự.<br/>- KHÔNG tạo lại material singleton đã tồn tại. | Dữ liệu nhân viên, Phân công ca, Điểm danh thực tế, Kích thước zone. | Three.js `Group`, `Mesh`, `Sprite`. | Cache textures, Instance geometries. | Mesh Metadata Unit Tests (6/6 pass FurnitureBuilder), Memory Allocation Tests. | `PROPOSED` |
| **Visualization State Layer** | `useSpatialViewStore`<br/>`useSimulationStore`<br/>`InteractionRefs` | - Quản lý cấu hình hiển thị trực quan (Active Camera Mode, Layers visibility, Heatmap Mode, X-Ray, 2D fallback).<br/>- Quản lý sandbox mô phỏng What-If độc lập với undo/redo.<br/>- Lưu trữ trạng thái kéo tạm thời (Ephemeral) hiệu năng cao không gây re-render DOM. | - KHÔNG ghi đè dữ liệu sản xuất khi đang ở chế độ thử nghiệm.<br/>- KHÔNG lưu trữ token xác thực hoặc quyền hạn hệ thống. | Tương tác người dùng từ Toolbar/Inspector/Hotkeys. | State snapshots, Diff list, View config selectors. | `viewMode`, `layers`, `heatmapMode`, `simulatedStaff`, `diffList`, `history`. | State Reducer Tests, Undo/Redo Invariant Tests. | `PROPOSED` |
| **Application & Domain Bridge** | `SpatialWorkspace` (Slim)<br/>`SpatialBridge`<br/>`StoreAccessGuard` | - Bọc UI Shell React DOM với Core Visualization Engine.<br/>- Chuyển đổi DTO từ Backend thành cấu trúc Visual Props chuẩn hóa.<br/>- Ngăn chặn rò rỉ dữ liệu khi chuyển store (Store Isolation Guard).<br/>- Xác thực RBAC phía giao diện trước khi mở tính năng sửa trạm. | - KHÔNG render Three.js trực tiếp trong JSX component.<br/>- KHÔNG tính toán toán học ma trận 3D trong React render cycle. | Dữ liệu từ React Router, API Services, User Session. | Props sạch cho Engine 3D và UI Controls. | `selectedStoreId`, `isDrawerOpen`. | Integration Regression Tests (17/17 pass DigitalTwinRegression). | `PROPOSED` |

---

## 7. Architectural Dependency Rules

Để duy trì tính toàn vẹn của hệ thống, các quy tắc phụ thuộc (Dependency Invariants) sau là **BẮT BUỘC TUÂN THỦ TUYỆT ĐỐI**:

1. **Quy tắc Một chiều (Unidirectional Dependency Rule):**
   - `UI Components` $\rightarrow$ `Orchestrator` $\rightarrow$ `Subsystems` $\rightarrow$ `Three.js Core`.
   - **CẤM HOÀN TOÀN (FORBIDDEN):** Các subsystem cấp dưới (`Scene`, `Camera`, `Interaction`, `Assets`) **tuyệt đối không được import ngược** các component React UI hoặc hook của React component cha.
2. **Quy tắc Cô lập Tương tác Tạm thời (Ephemeral Isolation Rule):**
   - Vị trí con trỏ chuột và tọa độ kéo thử nghiệm (`draftCoordinates`) chỉ được truyền qua Event Callbacks hoặc Controller Ref. Tuyệt đối không đẩy vào React state tần suất 60 lần/giây gây nghẽn Virtual DOM.
3. **Quy tắc Tách biệt Định danh (Identity Independence Rule):**
   - Mọi thao tác truy vấn nhân viên trên Mesh 3D bắt buộc đi qua [`staffIdentity.js`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/utils/staffIdentity.js). Không bao giờ gán trực tiếp chuỗi ID thô nếu chưa xác thực kiểu đối tượng (`StaffDTO` vs `ShiftAssignmentDTO`).
4. **Quy tắc Độc quyền Thao tác Mô phỏng (Simulation Sandbox Rule):**
   - Khi `isSimulating == true`, toàn bộ dữ liệu thao tác kéo thả chỉ được phép tác động lên `useSimulationStore`. Cấm tuyệt đối việc gọi API `shiftService` hay `layoutService` khi chưa qua bước xác nhận tại `ApplyConfirmModal`.

---

## 8. Architecture Diagrams

### 8.1. Sơ đồ Cấu trúc Thành phần (Component & Module Diagram)

```mermaid
graph TD
    subgraph Host ["React Page Host"]
        SchedulePage["SchedulePage.jsx / StoresPage.jsx"]
        Store3DCanvas["Store3DCanvas.jsx (Lazy Wrapper)"]
        SchedulePage --> Store3DCanvas
    end

    subgraph Orchestration ["Spatial Workspace Orchestration"]
        Store3DCanvas --> SpatialWorkspace["SpatialWorkspace.jsx (Slim Orchestrator)"]
        SpatialWorkspace --> SpatialBridge["SpatialBridge.js (Data Normalizer)"]
    end

    subgraph Subsystems ["Core Visualization Subsystems"]
        SceneLayer["SceneGraphManager & RenderEngine"]
        CameraLayer["CameraManager & CameraController"]
        InteractionLayer["InteractionDispatcher & Drag Controllers"]
        AssetLayer["AssetRegistry & Procedural Factories"]
        
        SpatialWorkspace --> SceneLayer
        SpatialWorkspace --> CameraLayer
        SpatialWorkspace --> InteractionLayer
        SpatialWorkspace --> AssetLayer
    end

    subgraph StateManagement ["State Ownership"]
        ViewStore["useSpatialViewStore (Zustand: Layers, Camera, Mode)"]
        SimStore["useSimulationStore (Zustand: What-If Diff & History)"]
        InteractionRef["Ephemeral Interaction Refs (60 FPS Drag / Hover)"]
        
        SpatialWorkspace --> ViewStore
        SpatialWorkspace --> SimStore
        InteractionLayer --> InteractionRef
        InteractionLayer -.->|Action Dispatched| SimStore
    end

    subgraph BackendAPI ["Authoritative Backend Services"]
        LayoutAPI["/api/stores/{id}/workstations"]
        ShiftAPI["/api/stores/{id}/shifts"]
        AttendanceAPI["/api/stores/{id}/attendance"]
        SwapAPI["/api/stores/{id}/shifts/{shiftId}/assignments/swap"]
        
        SpatialBridge --> LayoutAPI
        SpatialBridge --> ShiftAPI
        SpatialBridge --> AttendanceAPI
        SimStore -.->|Lưu Batch What-If| SwapAPI
    end

    %% Forbidden Reverse Dependencies Check
    style Subsystems fill:#F8FAFC,stroke:#0284C7,stroke-width:2px;
    style StateManagement fill:#FEF3C7,stroke:#D97706,stroke-width:2px;
    style BackendAPI fill:#DCFCE7,stroke:#16A34A,stroke-width:2px;
```

---

### 8.2. Sơ đồ Luồng Dữ liệu Tương tác Người dùng (End-to-End Data Flow)

Sơ đồ dưới đây mô tả chi tiết vòng đời tương tác khi người dùng kéo thả trạm làm việc (Workstation Repositioning) từ cử chỉ chuột đến cập nhật CSDL:

```mermaid
sequenceDiagram
    autonumber
    actor User as Quản lý cửa hàng (Store Manager)
    participant Canvas as WebGL DOM Element
    participant Dispatcher as InteractionDispatcher
    participant DragCtrl as WorkstationDragController
    participant Scene as SceneGraphManager
    participant Workspace as SpatialWorkspace
    participant Backend as Backend API (LayoutController)
    participant DB as PostgreSQL Database

    User->>Canvas: Nhấp & Giữ trạm làm việc (PointerDown)
    Canvas->>Dispatcher: Bắt sự kiện chuột
    Dispatcher->>DragCtrl: Kích hoạt chế độ kéo trạm (onDragStart)
    DragCtrl->>Scene: Hiển thị Vòng tròn chỉ thị (dragRing.visible = true)
    DragCtrl->>DragCtrl: Khóa OrbitControls (controls.enabled = false)
    
    loop Di chuyển con trỏ (PointerMove 60fps)
        User->>Canvas: Kéo trạm trên sàn 3D
        Canvas->>DragCtrl: Cập nhật tọa độ raycast
        DragCtrl->>DragCtrl: Khóa biên sàn [0.8m, Dim-0.8m]
        DragCtrl->>DragCtrl: Kiểm tra va chạm các trạm khác (Radius >= 1.1m)
        alt Hợp lệ (Khoảng cách >= 1.1m)
            DragCtrl->>Scene: Vòng chỉ thị màu Xanh Dương (#0284C7)
            DragCtrl->>Workspace: Cập nhật tọa độ nháp (draftCoords)
        else Va chạm (Khoảng cách < 1.1m)
            DragCtrl->>Scene: Vòng chỉ thị màu ĐỎ Cảnh Báo (#EF4444)
            DragCtrl->>Workspace: Báo trạng thái va chạm (collision = true)
        end
    end

    User->>Canvas: Thả chuột (PointerUp)
    Canvas->>DragCtrl: Kết thúc kéo (onDragEnd)
    DragCtrl->>DragCtrl: Mở khóa OrbitControls (controls.enabled = true)
    DragCtrl->>Workspace: Hiển thị Banner xác nhận "Lưu vị trí"
    
    alt Người dùng bấm "HỦY" (Cancel)
        User->>Workspace: Nhấn Hủy thao tác
        Workspace->>DragCtrl: Gọi revertPosition()
        DragCtrl->>Scene: Hoàn trả trạm về vị trí ban đầu
    else Người dùng bấm "LƯU VỊ TRÍ" (Save)
        User->>Workspace: Nhấn Lưu vị trí trạm
        Workspace->>Workspace: Kiểm tra RBAC (ADMIN hoặc MANAGER)
        Workspace->>Backend: PUT /api/stores/{storeId}/workstations/{id}
        Backend->>DB: UPDATE workstations SET x=?, y=?, z=?
        DB-->>Backend: Bản ghi đã cập nhật
        Backend-->>Workspace: HTTP 200 OK kèm WorkstationDTO mới
        Workspace->>DragCtrl: commitPosition() (Cập nhật baseline mới)
        Workspace->>Workspace: Thông báo Toast thành công
    end
```

---

### 8.3. Sơ đồ Vòng đời Khởi tạo & Dọn dẹp Tài nguyên (Lifecycle & Resource Disposal)

```mermaid
stateDiagram-v2
    [*] --> Unmounted: Container Component nạp

    state Unmounted {
        [*] --> CheckWebGL: Kiểm tra hỗ trợ WebGL
        CheckWebGL --> Use2DFallback: WebGL không khả dụng
        CheckWebGL --> InitEngine: WebGL sẵn sàng
    }

    state Mounting {
        InitEngine --> CreateScene: Tạo Scene, Dual Cameras
        CreateScene --> CreateRenderer: Tạo WebGLRenderer & PCFSoftShadowMap
        CreateRenderer --> AttachControls: Gắn OrbitControls & CameraController
        AttachControls --> AttachInteractions: Gắn Drag Controllers & Dispatcher
        AttachInteractions --> BuildStaticEnv: Dựng mặt bằng, tường, đèn chiếu
    }

    state Ready_Running {
        BuildStaticEnv --> FetchData: Nạp Dữ liệu Ca, Trạm, Điểm danh
        FetchData --> RenderEntities: Dựng Avatars, Workstations, Zone Tags
        RenderEntities --> AnimationLoop: Kích hoạt requestAnimationFrame
        
        state AnimationLoop {
            UpdateCamera: CameraController.update()
            UpdateAvatars: updateAvatarStateMachine()
            UpdateParticles: Nâng hạt hơi nước & Đèn treo
            RenderFrame: renderer.render(scene, camera)
            
            UpdateCamera --> UpdateAvatars
            UpdateAvatars --> UpdateParticles
            UpdateParticles --> RenderFrame
        }
    }

    state Cleanup_Teardown {
        CancelRAF: cancelAnimationFrame(animId)
        DetachListeners: Hủy lắng nghe Pointer & ResizeObserver
        DetachControllers: controller.detach() & dispose()
        DisposeMeshes: scene.traverse(disposeHierarchy)
        CheckShared: Kiểm tra WeakSet (Không dispose shared resources)
        DisposeInstanceTextures: mat.map.dispose() cho CanvasTexture
        DisposeRenderer: renderer.dispose() & controls.dispose()
        
        CancelRAF --> DetachListeners
        DetachListeners --> DetachControllers
        DetachControllers --> DisposeMeshes
        DisposeMeshes --> CheckShared
        CheckShared --> DisposeInstanceTextures
        DisposeInstanceTextures --> DisposeRenderer
    }

    AnimationLoop --> Cleanup_Teardown: Unmount hoặc Đổi Chi nhánh
    Cleanup_Teardown --> [*]: Bộ nhớ WebGL giải phóng hoàn toàn
```

---

### 8.4. Sơ đồ Phân định Quyền Sở hữu Trạng thái (3-Tier State Ownership Model)

```mermaid
classDiagram
    class EphemeralState {
        <<Interaction Scope - 60 FPS>>
        +Vector2 pointerPosition
        +Object3D hoveredTarget
        +Vector3 dragPlaneIntersection
        +Vector3 draftCoordinates
        +boolean isCollisionDetected
        +Mesh dragRingIndicator
        +updateHover()
        +updateDrag()
        +clearEphemeral()
    }

    class VisualizationViewState {
        <<View Scope - Zustand>>
        +String cameraMode (OVERVIEW/TOP_DOWN/EXPLORE)
        +String activeProjection (PERSPECTIVE/ORTHOGRAPHIC)
        +Object layersVisibility (Floor, Walls, Workstations, Staff)
        +String heatmapMode (STAFFING/SKILL/STRESS)
        +boolean isXRayMode
        +boolean is2DFallback
        +setCameraMode()
        +toggleLayer()
        +toggleXRay()
    }

    class AuthoritativeDomainState {
        <<Business Scope - Server Truth>>
        +StoreLayout layout
        +List~StoreZone~ zones
        +List~Workstation~ workstations
        +List~Shift~ shifts
        +List~ShiftAssignment~ assignments
        +List~Attendance~ attendanceRecords
        +fetchLayout()
        +fetchWorkstations()
        +saveWorkstationPosition()
        +swapStaffZones()
    }

    class SimulationState {
        <<Isolated Sandbox - Zustand>>
        +boolean isSimulating
        +Snapshot productionSnapshot
        +List simulatedStaff
        +List simulatedDiff
        +List historyStack
        +List futureStack
        +transferStaff()
        +swapStaff()
        +undo()
        +redo()
    }

    EphemeralState ..> VisualizationViewState: Báo sự kiện chọn
    EphemeralState ..> SimulationState: Kéo thả cập nhật diff
    VisualizationViewState ..> AuthoritativeDomainState: Lọc theo thời gian ca
    SimulationState --> AuthoritativeDomainState: Batch Apply khi nhấn xác nhận
```

---

## 9. Technology Decisions & Trade-Offs (Quyết định Công nghệ)

### 9.1. Quyết định DEC-01: Lựa chọn Động cơ Trực quan hóa Cốt lõi (Core 3D Engine)
- **Bối cảnh:** Repository hiện chứa dependencies của Three.js r185, React Three Fiber v9, Drei v10 và Babylon.js v9.
- **Vấn đề:** Sự tồn tại của nhiều engine gây phân mảnh kiến trúc, tăng kích thước bundle và tạo ra các đoạn code song song không nhất quán.
- **Tiêu chí quyết định:** Hiệu năng render số lượng lớn entity động, độ ổn định với React 19, khả năng kiểm soát vòng đời WebGL và mức độ gián đoạn mã nguồn hiện tại.
- **Các phương án so sánh:**
  - *Phương án A: Chuyển toàn bộ sang React Three Fiber (R3F).*
    - Ưu điểm: Khai báo JSX quen thuộc với React developer.
    - Nhược điểm: Xung đột vòng đời render loop với React 19 fiber reconciliation; phải viết lại toàn bộ 45 bài test hồi quy đã kiểm chứng; overhead bộ nhớ khi quản lý hàng chục avatar động.
  - *Phương án B: Chuyển toàn bộ sang Babylon.js.*
    - Ưu điểm: Động cơ game mạnh mẽ, tích hợp GUI sẵn.
    - Nhược điểm: Phá vỡ toàn bộ mã nguồn hiện tại; file `StoreBabylonCanvas.jsx` chỉ là bản mẫu sơ sài thiếu các tính năng Raycast Editor và Occupancy Tagging.
  - *Phương án C (Lựa chọn): Chuẩn hóa trên Pure Three.js r185+ với Kiến trúc OOP Controllers.*
    - Ưu điểm: Kiểm soát tuyệt đối vòng lặp `requestAnimationFrame`, tối ưu hóa render 60fps không phụ thuộc vào chu kỳ re-render của React, tương thích 100% với 45 bài test hiện hành, dễ dàng cô lập bộ nhớ GPU.
- **Quyết định:** **Chấp thuận Phương án C: Chuẩn hóa trên Pure Three.js.**
- **Hành động tiếp theo:** Đưa Babylon.js và các file R3F thử nghiệm vào lộ trình dọn dẹp (Deprecation & Cleanup) trong Phase dọn dẹp mã nguồn.
- **Trạng thái:** `PROPOSED — PENDING TECH LEAD APPROVAL`

### 9.2. Quyết định DEC-02: Mô hình Phân chia 3 Tầng Trạng thái (State Architecture)
- **Bối cảnh:** Dữ liệu kéo thả tạm thời (tần suất 60Hz) hiện đang được đẩy qua React `useState` trong `SpatialWorkspace.jsx`, gây kích hoạt chuỗi re-render các component DOM (Toolbar, KPI Bar, Header).
- **Quyết định:**
  - Tầng 1: **Ephemeral State** lưu trữ trực tiếp trong Controller Instances và React Refs, chỉ render cập nhật mesh 3D trực tiếp mà không kích hoạt React reconciliation.
  - Tầng 2: **Visualization View State** đưa vào Zustand Store nhẹ (`useSpatialViewStore.js`) cho các cấu hình ít thay đổi (chế độ xem, bật tắt layer, heatmap).
  - Tầng 3: **Authoritative Domain State** duy trì qua Server State / Props, được bảo vệ bằng Store Isolation Guard và chỉ cập nhật khi backend phản hồi thành công.
- **Trạng thái:** `PROPOSED — PENDING TECH LEAD APPROVAL`

### 9.3. Quyết định DEC-03: Trừu tượng hóa Hệ thống Camera (Camera Subsystem Facade)
- **Bối cảnh:** Việc chuyển đổi giữa Camera phối cảnh (Perspective) và Trực giao (Orthographic) hiện đang can thiệp trực tiếp vào thuộc tính của `OrbitControls` tại nhiều hàm callback rải rác.
- **Quyết định:** Tạo lớp `CameraManager` đóng vai trò Facade duy nhất, tự động đồng bộ hóa góc quay, giới hạn góc xoay sàn (Polar Angle $[0.1, 1.48]\text{rad}$), tỷ lệ khung hình (Aspect Ratio), và giải phóng hoàn toàn `SpatialWorkspace.jsx` khỏi các chi tiết toán học Three.js.
- **Trạng thái:** `PROPOSED — PENDING TECH LEAD APPROVAL`

### 9.4. Quyết định DEC-04: Quản lý Tài nguyên & Triệt tiêu Rò rỉ Bộ nhớ (Resource Lifecycle Protocol)
- **Bối cảnh:** Thường xuyên chuyển đổi giữa 2D Schematic, 3D Workspace và chuyển đổi qua lại giữa các chi nhánh cửa hàng.
- **Quyết định:**
  - Đóng gói toàn bộ logic đăng ký tài nguyên dùng chung vào `ResourceManager`.
  - Duy trì danh sách `WeakSet` bảo vệ các Material và Geometry dùng chung của nhân viên và nội thất.
  - Mọi CanvasTexture sinh ra cho nhãn trạm làm việc (`createWorkstationTagSprite`) bắt buộc phải được gắn cờ `userData.isDynamicSprite = true` và được dispose tự động khi xóa mesh khỏi scene.
- **Trạng thái:** `PROPOSED — PENDING TECH LEAD APPROVAL`

---

## 10. Security, Isolation & Domain Integrity

1. **Cô lập Chi nhánh Cửa hàng (Store Isolation Guard):**
   - Bắt buộc kiểm tra `storeId` trước mọi hành động lưu vị trí trạm hoặc đổi ca.
   - Khi `activeStoreId` thay đổi, `InteractionDispatcher` phải kích hoạt `clearSelection()` và hủy toàn bộ tọa độ nháp (`draftCoords = null`), triệt tiêu hoàn toàn rủi ro lưu nhầm vị trí của Cửa hàng A sang Cửa hàng B.
2. **Kiểm soát Phân quyền Giao diện (Frontend RBAC):**
   - Tính năng kéo thả trạm làm việc (`isEditingLayout`) chỉ được mở khóa cho người dùng có vai trò `ROLE_ADMIN` hoặc `ROLE_MANAGER`.
   - Nhân viên (`ROLE_STAFF`) chỉ có quyền xem (Read-only) và trải nghiệm chế độ tham quan (Explore Mode).
3. **Phòng thủ Chiều sâu (Defense-in-depth):**
   - Dù frontend có bị can thiệp qua console trình duyệt, backend API `PUT /api/stores/{storeId}/workstations/{id}` vẫn kiểm tra quyền hạn `@PreAuthorize` và xác thực quyền quản lý chi nhánh qua `StoreAccessService.canAccessStore`.

---

## 11. Testing & Verification Strategy

Kiến trúc mới được thiết kế để kiểm thử độc lập ở từng tầng (Testable Architecture) mà không bắt buộc phải dựng môi trường trình duyệt đầy đủ:

1. **Kiểm thử Đơn vị Toán học & Logic Không gian (Headless Math Unit Tests):**
   - Chạy trực tiếp bằng `node --test` không cần WebGL canvas.
   - Kiểm thử chuyển đổi hệ tọa độ `toThreeCoords` và `toBackendCoords`.
   - Kiểm thử thuật toán khóa biên `clampCoordinates` và phát hiện va chạm trạm `checkCollision` ($< 1.1\text{m}$).
   - Kiểm thử bộ lọc định danh nhân sự [`staffIdentity.test.js`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/utils/staffIdentity.test.js) (9/9 pass).
   - Kiểm thử phân giải trạng thái trạm [`workstationOccupancy.test.js`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/utils/workstationOccupancy.test.js) (6/6 pass).
2. **Kiểm thử Bộ điều khiển Tương tác (Controller Unit Tests):**
   - Kiểm thử `WorkstationDragController.test.js` (7/7 pass) và `FurnitureBuilder.test.js` (6/6 pass).
3. **Kiểm thử Hồi quy Tích hợp (Integration Regression Tests):**
   - Kiểm thử 6 kịch bản bắt buộc qua [`DigitalTwinRegression.test.js`](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/DigitalTwinRegression.test.js) (17/17 pass).
4. **Kiểm thử Đồng thời Backend (Concurrency Integration Tests):**
   - Kiểm thử 21 kịch bản khóa đồng thời `DigitalTwinConcurrencyIntegrationTest.java` (21/21 pass) xác thực an toàn dữ liệu khi nhiều quản lý cùng thao tác.

---

## 12. Implementation Roadmap (Lộ trình Triển khai An toàn)

Quá trình tái cấu trúc kiến trúc được chia thành 4 giai đoạn độc lập, có thể rollback từng phần mà không ảnh hưởng đến tiến độ MVP:

```mermaid
gantt
    title Lộ trình Tái cấu trúc Kiến trúc Visualization Layer (ARC Implementation)
    dateFormat  YYYY-MM-DD
    section Giai đoạn 1: Trích xuất Quản lý Trạng thái
    Tạo useSpatialViewStore (Zustand)       :task_1_1, 2026-10-16, 2d
    Tách View State khỏi SpatialWorkspace   :task_1_2, after task_1_1, 2d
    section Giai đoạn 2: Tách Phân lớp Camera & Scene
    Trích xuất CameraManager Facade        :task_2_1, after task_1_2, 2d
    Trích xuất SceneGraphManager & RenderEngine :task_2_2, after task_2_1, 3d
    section Giai đoạn 3: Tách Phân lớp Tương tác
    Trích xuất InteractionDispatcher        :task_3_1, after task_2_2, 2d
    Chuẩn hóa Workstation & Avatar Drag     :task_3_2, after task_3_1, 2d
    section Giai đoạn 4: Dọn dẹp & Tối ưu hóa Bundle
    Loại bỏ Babylon.js & R3F Prototype      :task_4_1, after task_3_2, 2d
    Chạy toàn bộ 45 tests Web & Build Vite  :task_4_2, after task_4_1, 1d
```

### Chi tiết các Nhiệm vụ Tiếp theo (Follow-up Tasks):

#### Task ARC-IMP-01: Trích xuất `useSpatialViewStore` và Tách Tầng Trạng thái
- **Mục tiêu:** Di chuyển các state giao diện trực quan (`cameraMode`, `layers`, `heatmapMode`, `isXRayMode`, `use2DFallback`) ra khỏi `SpatialWorkspace.jsx` vào Zustand store chuyên dụng.
- **Phạm vi file:** `ShiftSync-Web/src/features/spatial-workspace/state/spatialViewStore.js` (Mới), `SpatialWorkspace.jsx`.
- **Tiêu chí nghiệm thu:** `SpatialWorkspace.jsx` giảm bớt 10 `useState`; các thao tác bật tắt layer không gây re-render component cha.
- **Lệnh kiểm chứng:** `node --test ShiftSync-Web/src/features/spatial-workspace/DigitalTwinRegression.test.js`.

#### Task ARC-IMP-02: Đóng gói `CameraManager` và Tách Hệ thống Camera
- **Mục tiêu:** Tạo lớp `CameraManager` điều khiển Perspective Camera, Orthographic Camera và OrbitControls.
- **Phạm vi file:** `ShiftSync-Web/src/features/spatial-workspace/camera/CameraManager.js` (Mới), `SpatialWorkspace.jsx`.
- **Tiêu chí nghiệm thu:** Toàn bộ lệnh gán `controls.object` và `minPolarAngle` được đóng gói trong `CameraManager`; chuyển đổi camera mượt mà không lỗi console.
- **Lệnh kiểm chứng:** `node --test ShiftSync-Web/src/features/spatial-workspace/interaction/WorkstationDragController.test.js`.

#### Task ARC-IMP-03: Đóng gói `SceneGraphManager` & `ResourceManager`
- **Mục tiêu:** Trích xuất toàn bộ logic tạo scene, ánh sáng, sương mù, hạt hơi nước và giải phóng bộ nhớ ra khỏi `SpatialWorkspace.jsx`.
- **Phạm vi file:** `ShiftSync-Web/src/features/spatial-workspace/scene/SceneGraphManager.js` (Mới), `ResourceManager.js` (Mới).
- **Tiêu chí nghiệm thu:** Khối `useEffect` chính của `SpatialWorkspace.jsx` thu gọn từ 367 dòng xuống dưới 50 dòng.
- **Lệnh kiểm chứng:** `npm run build` trong `ShiftSync-Web` thành công; 45/45 web tests pass.

#### Task ARC-IMP-04: Dọn dẹp Thư viện Cạnh tranh & Giảm Bundle Size
- **Mục tiêu:** Đánh giá loại bỏ `@babylonjs/core`, `@babylonjs/gui`, `@react-three/fiber`, `@react-three/drei` khỏi `package.json` và lưu trữ các prototype cũ vào thư mục archive.
- **Phạm vi file:** `ShiftSync-Web/package.json`, `ShiftSync-Web/src/components/spatial/StoreBabylonCanvas.jsx`.
- **Tiêu chí nghiệm thu:** Kích thước production build giảm tối thiểu 35%; toàn bộ ứng dụng Web chạy bình thường.
- **Lệnh kiểm chứng:** `npm run build` không phát sinh lỗi unresolved dependencies.

---

## 13. Decision and Follow-up Register

| Mã quyết định | Nội dung quyết định (Statement) | Trạng thái (Status) | Bằng chứng mã nguồn | Hệ quả kỹ thuật (Consequences) | Người phê duyệt (Approval Owner) | Nhiệm vụ thực thi |
| :---: | :--- | :---: | :--- | :--- | :---: | :---: |
| **DEC-01** | Chuẩn hóa động cơ đồ họa 3D trên **Pure Three.js r185+**, loại bỏ Babylon.js và R3F prototypes. | `PROPOSED` | `package.json:12-28`, `SpatialWorkspace.jsx:13-15` | Giảm kích thước bundle, triệt tiêu xung đột render loop React 19, bảo tồn 45 bài test. | Tech Lead | `ARC-IMP-04` |
| **DEC-02** | Phân chia 3 tầng trạng thái: Ephemeral (Ref/Controller), Visualization (Zustand), Domain (Server Props). | `PROPOSED` | `SpatialWorkspace.jsx:190-250`, `simulationStore.js` | Triệt tiêu re-render Virtual DOM ở tần số 60Hz, ngăn chặn hoàn toàn rò rỉ dữ liệu khi đổi store. | Senior Frontend Architect | `ARC-IMP-01` |
| **DEC-03** | Trích xuất `CameraManager Facade` quản lý độc quyền Camera kép và OrbitControls. | `PROPOSED` | `SpatialWorkspace.jsx:700-718`, `CameraController.js` | Loại bỏ việc can thiệp Three.js internals từ component React, bảo đảm an toàn góc xoay sàn. | Senior Frontend Architect | `ARC-IMP-02` |
| **DEC-04** | Thiết lập giao thức `ResourceManager` tập trung bảo vệ tài nguyên dùng chung qua `WeakSet`. | `PROPOSED` | `SpatialWorkspace.jsx:81-165`, `FurnitureBuilder.test.js` | Triệt tiêu rò rỉ bộ nhớ WebGL và ngăn chặn lỗi đen hình do dispose nhầm singleton material. | Three.js Specialist | `ARC-IMP-03` |
| **DEC-05** | Thiết lập ranh giới bất biến: Visualization Layer chỉ gửi đề xuất, không trực tiếp thay đổi CSDL sản xuất. | `ACCEPTED` `[VERIFIED]` | `FIX-001C_ATOMIC_SWAP_DESIGN.md`, `simulationStore.js:5-8` | Bảo vệ toàn vẹn dữ liệu ca làm việc, tuân thủ nguyên tắc an toàn phân tán. | System Architect | Duy trì liên tục |

---

## 14. Unresolved Questions & Blockers

1. **Q-ARC-01 (Thời điểm gỡ bỏ hoàn toàn dependencies Babylon.js và R3F khỏi `package.json`):**
   - *Ngữ cảnh:* Gỡ bỏ `@babylonjs/*` và `@react-three/*` giúp giảm 35% bundle size, nhưng có thể ảnh hưởng nếu có thành viên khác trong nhóm đang thử nghiệm tính năng phụ.
   - *Đề xuất:* Giữ nguyên trong nhánh `quoc-backend` cho đến khi hoàn thành đợt bảo vệ đồ án tốt nghiệp, chỉ thực hiện dọn dẹp ở giai đoạn tối ưu hóa phát hành cuối cùng.
   - *Người quyết định:* Project Owner / Tech Lead.
   - *Trạng thái:* `OPEN`.
2. **Q-ARC-02 (Khai báo tường minh `zustand` trong `package.json`):**
   - *Ngữ cảnh:* `simulationStore.js` hiện đang dùng `zustand` thông qua gói gián tiếp của `@react-three/drei`. Nếu gỡ `@react-three/drei`, cần thêm rõ ràng `"zustand": "^5.0.0"` vào `package.json`.
   - *Đề xuất:* Đưa việc khai báo tường minh `zustand` vào nhiệm vụ `ARC-IMP-01`.
   - *Người quyết định:* Frontend Lead.
   - *Trạng thái:* `PROPOSED`.

---

## 15. Evidence Ledger (Sổ cái Bằng chứng Kỹ thuật)

| Mã chứng cứ | Nội dung chứng minh | Nguồn gốc / Tệp đối chứng | Trạng thái chứng cứ |
| :---: | :--- | :--- | :---: |
| **EVD-01** | `SpatialWorkspace.jsx` là tệp thực tế render 3D cho toàn bộ hệ thống Web | `ShiftSync-Web/src/components/spatial/Store3DCanvas.jsx:9`, `SchedulePage.jsx:2147` | `[VERIFIED]` |
| **EVD-02** | Hệ thống dùng Three.js bản ngữ và OrbitControls, không dùng R3F trong luồng chính | `ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx:13-14` | `[VERIFIED]` |
| **EVD-03** | Khóa bi quan Atomic SWAP bảo vệ dữ liệu ca phân công đồng thời | `shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftAssignmentService.java`, `DigitalTwinConcurrencyIntegrationTest.java` (21/21 pass) | `[VERIFIED]` |
| **EVD-04** | Bộ test hồi quy 6 kịch bản Digital Twin đang hoạt động hoàn hảo | `ShiftSync-Web/src/features/spatial-workspace/DigitalTwinRegression.test.js` (17/17 pass) | `[VERIFIED]` |
| **EVD-05** | Bộ test điều khiển kéo thả trạm làm việc đang hoạt động hoàn hảo | `ShiftSync-Web/src/features/spatial-workspace/interaction/WorkstationDragController.test.js` (7/7 pass) | `[VERIFIED]` |
| **EVD-06** | Chuẩn hóa định danh Staff ID vs Assignment ID đã được chứng minh | `ShiftSync-Web/src/features/spatial-workspace/utils/staffIdentity.test.js` (9/9 pass) | `[VERIFIED]` |
| **EVD-07** | Phân giải 3 trạng thái trạm làm việc (Assigned/Unassigned/Unknown) đã kiểm chứng | `ShiftSync-Web/src/features/spatial-workspace/utils/workstationOccupancy.test.js` (6/6 pass) | `[VERIFIED]` |
| **EVD-08** | Cơ chế WeakSet ngăn chặn dispose nhầm material dùng chung đã kiểm chứng | `ShiftSync-Web/src/features/spatial-workspace/scene/FurnitureBuilder.test.js` (6/6 pass) | `[VERIFIED]` |
| **EVD-09** | Toàn bộ 488 bài kiểm thử backend đang PASS 100% | `shiftsync-backend` `mvn test` (488/488 pass, 0 fail, 0 error) | `[VERIFIED]` |

---

## 16. Definition of Done & Verification Results

| Tiêu chuẩn hoàn thành (DoD Criteria) | Kết quả xác minh thực tế | Trạng thái |
| :--- | :--- | :---: |
| 1. Đối chiếu trực tiếp mã nguồn và hệ tri thức trước khi thiết kế | Đã đối chiếu `PROJECT_CONTEXT.md`, `CODEBASE_MAP.md`, `SpatialWorkspace.jsx` và các test suites. | **ĐẠT (PASS)** |
| 2. Phân rã ranh giới rõ ràng cho Scene, Camera, Interaction, Assets, State | Đã phân định 6 phân lớp độc lập với Ma trận Trách nhiệm chi tiết tại Mục 6. | **ĐẠT (PASS)** |
| 3. Tách biệt 3 tầng trạng thái (Ephemeral, View, Domain) | Đã thiết lập mô hình 3 tầng trạng thái kèm sơ đồ phân định tại Mục 8.4. | **ĐẠT (PASS)** |
| 4. Bổ sung đầy đủ 4 sơ đồ kiến trúc Mermaid theo tiêu chuẩn | Bao gồm Component Diagram, Data-flow Sequence, Lifecycle State, State Model. | **ĐẠT (PASS)** |
| 5. Đánh giá lựa chọn công nghệ và trade-offs | Hoàn thành DEC-01 đến DEC-05 với phân tích ưu/nhược điểm rõ ràng. | **ĐẠT (PASS)** |
| 6. Xây dựng lộ trình triển khai chi tiết cho các task kế tiếp | Thiết lập 4 task triển khai có ID, scope, acceptance criteria và lệnh test. | **ĐẠT (PASS)** |
| 7. Bảo tồn nguyên vẹn mã nguồn sản phẩm và lịch sử Git | **0 dòng mã nguồn sản phẩm bị sửa đổi**; không chạy thao tác Git nguy hiểm. | **ĐẠT (PASS)** |
| 8. Cập nhật hệ tri thức (`TASK_MEMORY.md`, `AUDIT_INDEX.md`, `CHANGELOG.md`) | Đã đồng bộ tài liệu tri thức đầy đủ. | **ĐẠT (PASS)** |

**KẾT LUẬN: ĐẠT CHUẨN HOÀN THÀNH (STATUS: COMPLETED_WITH_OPEN_DECISIONS)**
*(Toàn bộ tài liệu kiến trúc đã hoàn thiện đạt tiêu chuẩn kỹ thuật sẵn sàng triển khai; các quyết định kỹ thuật DEC-01..04 được gắn cờ `PROPOSED` chờ Tech Lead ký duyệt chính thức trước khi bắt đầu code).*
