# BẢN ĐỒ PHỤ THUỘC & LUỒNG THỰC THI DIGITAL TWIN (DEPENDENCY MAP)
## Phân hệ: 3D Store Digital Twin & Spatial Workforce Allocation

> **Tài liệu kiểm toán:** `AUD-001.1`  
> **Thời điểm xuất bản:** 2026-10-13  
> **Quy ước trạng thái trên sơ đồ:**  
> - `[VERIFIED]` (Nét liền / Xanh lá): Đã xác minh có liên kết thực tế qua code import/call.  
> - `[PARTIAL]` (Nét đứt / Vàng): Có khai báo/import nhưng chưa gọi hoặc gọi một phần.  
> - `[UNVERIFIED / ORPHANED]` (Nét chấm / Đỏ): Mã nguồn tồn tại nhưng không được mount vào bất kỳ luồng người dùng nào.

---

## 1. Sơ đồ luồng phụ thuộc kiến trúc (Mermaid Dependency Graph)

```mermaid
flowchart TD
    %% Styling Classes
    classDef verified fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#065f46;
    classDef partial fill:#fefce8,stroke:#f59e0b,stroke-width:2px,color:#92400e;
    classDef orphaned fill:#fef2f2,stroke:#ef4444,stroke-width:2px,stroke-dasharray: 5 5,color:#991b1b;
    classDef infra fill:#f8fafc,stroke:#64748b,stroke-width:2px,color:#1e293b;

    subgraph UI_Layer["1. Frontend Host Pages & Adapters"]
        P_Schedule["SchedulePage.jsx<br/><b>[VERIFIED]</b><br/>Tab: Spatial 3D"]:::verified
        P_Stores["StoresPage.jsx<br/><b>[VERIFIED]</b><br/>Tab: Quản lý không gian"]:::verified
        P_Dashboard["DashboardPage.jsx<br/><b>[PARTIAL]</b><br/>Unused Layout State"]:::partial

        C_Canvas["Store3DCanvas.jsx<br/><b>[VERIFIED]</b><br/>Adapter Component"]:::verified
        C_Manager["Store3DManager.jsx<br/><b>[VERIFIED]</b><br/>Dimensions & Zones Editor"]:::verified

        P_Schedule -->|mount| C_Canvas
        P_Stores -->|mount| C_Manager
        C_Manager -->|embed preview| C_Canvas
    end

    subgraph Feature_Layer["2. Active Digital Twin Orchestrator (Production Engine)"]
        F_Workspace["SpatialWorkspace.jsx<br/><b>[VERIFIED]</b><br/>Master 3D Orchestrator (1,688 lines)"]:::verified
        
        Cam_Ctrl["CameraController.js<br/><b>[VERIFIED]</b><br/>Easing FlyTo & Follow Staff"]:::verified
        Scene_Env["StoreEnvironment.js<br/><b>[VERIFIED]</b><br/>Floor, Walls, Ceiling, X-Ray"]:::verified
        Scene_Furn["FurnitureBuilder.js<br/><b>[VERIFIED]</b><br/>Procedural Espresso, POS, Bakery"]:::verified
        Scene_Avat["StylizedAvatars.js<br/><b>[VERIFIED]</b><br/>LOD 0-2, State Machine"]:::verified
        Sim_Store["simulationStore.js (Zustand)<br/><b>[VERIFIED]</b><br/>Isolated What-If Scenarios"]:::verified
        Sim_Drag["DragTransfer.js<br/><b>[VERIFIED]</b><br/>Raycast Floor Drag & Drop"]:::verified
        Explore_Ctrl["PlayerController.js<br/><b>[VERIFIED]</b><br/>WASD Explore Mode 2"]:::verified
        Schematic_2D["TwoDSpatialSchematic.jsx<br/><b>[VERIFIED]</b><br/>2D SVG Fallback"]:::verified

        C_Canvas -->|instantiate| F_Workspace
        F_Workspace --> Cam_Ctrl
        F_Workspace --> Scene_Env
        F_Workspace --> Scene_Furn
        F_Workspace --> Scene_Avat
        F_Workspace --> Sim_Store
        F_Workspace --> Sim_Drag
        F_Workspace --> Explore_Ctrl
        F_Workspace --> Schematic_2D
    end

    subgraph Orphaned_Layer["3. Legacy / Orphaned Prototypes (Không kết nối)"]
        O_R3F["StoreScene.jsx<br/><b>[ORPHANED R3F]</b><br/>React Three Fiber Prototype"]:::orphaned
        O_Babylon["StoreBabylonCanvas.jsx<br/><b>[ORPHANED]</b><br/>Babylon.js Prototype"]:::orphaned
        O_DashSum["DashboardSpatialSummary.jsx<br/><b>[ORPHANED]</b><br/>Imported but unrendered"]:::orphaned
        O_DashMini["DashboardSpatialMini.jsx<br/><b>[ORPHANED]</b><br/>No active consumer"]:::orphaned
        O_R3F_Sub["StoreFloor / StoreWalls / StoreZone<br/><b>[ORPHANED]</b>"]:::orphaned

        O_R3F -.->|unmounted| O_R3F_Sub
        P_Dashboard -.->|dead import| O_DashSum
    end

    subgraph Client_API_Layer["4. Frontend Client Services"]
        S_Layout["layoutService.js<br/><b>[VERIFIED]</b><br/>Axios REST Client"]:::verified
        S_Shift["shiftService.js<br/><b>[VERIFIED]</b><br/>Assign/Remove Mutations"]:::verified

        C_Manager --> S_Layout
        P_Schedule --> S_Layout
        F_Workspace --> S_Shift
    end

    subgraph Backend_Controller_Layer["5. Spring Boot REST Controllers (Port 8080)"]
        Ctrl_Layout["LayoutController.java<br/><b>[VERIFIED]</b><br/>/api/stores/{storeId}/layout<br/>/api/stores/{storeId}/zones<br/>/api/stores/{storeId}/workstations<br/>.../allocate-zones"]:::verified
        Ctrl_Template["StoreTemplateController.java<br/><b>[VERIFIED]</b><br/>/api/store-templates<br/>.../apply-template/{id}"]:::verified
        Ctrl_Shift["ShiftController.java<br/><b>[VERIFIED]</b><br/>/api/stores/{storeId}/auto-schedule"]:::verified

        S_Layout -->|HTTP REST| Ctrl_Layout
        S_Layout -->|HTTP REST| Ctrl_Template
        S_Shift -->|HTTP REST| Ctrl_Layout
    end

    subgraph Backend_Service_Layer["6. Domain Business Services"]
        Svc_Spatial["SpatialAllocationService.java<br/><b>[VERIFIED]</b><br/>Algorithm: Max-Min Dispersion"]:::verified
        Svc_Template["StoreTemplateService.java<br/><b>[VERIFIED]</b><br/>Template JSON Instantiation"]:::verified
        Svc_AutoSched["AutoScheduleService.java<br/><b>[VERIFIED]</b><br/>Dynamic MRV + Spatial Hook"]:::verified

        Ctrl_Layout --> Svc_Spatial
        Ctrl_Template --> Svc_Template
        Ctrl_Shift --> Svc_AutoSched
        Svc_AutoSched -->|Internal Call (Line 591)| Svc_Spatial
    end

    subgraph Persistence_Layer["7. Repositories & Relational Database (PostgreSQL 16)"]
        Repo_Layout["StoreLayoutRepository<br/><b>[VERIFIED]</b>"]:::infra
        Repo_Zone["StoreZoneRepository<br/><b>[VERIFIED]</b>"]:::infra
        Repo_Ws["WorkstationRepository<br/><b>[VERIFIED]</b>"]:::infra
        Repo_Assign["ShiftAssignmentRepository<br/><b>[VERIFIED]</b>"]:::infra

        DB_Layout[("store_layouts<br/>(V25, V31)")]:::infra
        DB_Zone[("store_zones<br/>(V25, V31, V32)")]:::infra
        DB_Ws[("workstations<br/>(V31)")]:::infra
        DB_Assign[("shift_assignment<br/>(zone_id, workstation_id)")]:::infra

        Svc_Spatial --> Repo_Zone
        Svc_Spatial --> Repo_Layout
        Svc_Spatial --> Repo_Ws
        Svc_Spatial --> Repo_Assign

        Svc_Template --> Repo_Layout
        Svc_Template --> Repo_Zone
        Svc_Template --> Repo_Ws

        Repo_Layout --> DB_Layout
        Repo_Zone --> DB_Zone
        Repo_Ws --> DB_Ws
        Repo_Assign --> DB_Assign
    end
```

---

## 2. Chi tiết các luồng thực thi then chốt (Key Execution Paths)

### Luồng 1: Xem mô hình không gian 3D & Dòng thời gian ca làm (Schedule Spatial View)
1. **User Action:** Manager đăng nhập Web, truy cập `/schedule`, chuyển sang tab xem không gian 3D.
2. **Mount:** `SchedulePage.jsx:2147` mount `<Store3DCanvas>`.
3. **Delegation:** `Store3DCanvas.jsx:10` chuyển quyền trực tiếp sang `<SpatialWorkspace>`.
4. **Data Fetching:** `SchedulePage` gọi song song:
   - `layoutService.getStoreLayout(storeId)` $\rightarrow$ `GET /api/stores/{storeId}/layout`.
   - `layoutService.getStoreZones(storeId)` $\rightarrow$ `GET /api/stores/{storeId}/zones`.
   - `shiftService.getShiftsForStore(...)` nạp các ca và phân công kèm `zoneId`.
5. **Render 3D:** Three.js khởi tạo trong `SpatialWorkspace.jsx:814`:
   - Dựng cấu trúc mặt sàn, tường bằng `StoreEnvironment.js`.
   - Dựng thiết bị, bàn quầy nội thất bằng `FurnitureBuilder.js`.
   - Dựng vị trí nhân viên thời gian thực bằng `StylizedAvatars.js`.
   - Cho phép tua dòng thời gian trong ngày bằng `SpatialTimeline.jsx` (tự động cập nhật nhân sự theo giờ ca).

### Luồng 2: Phân bổ không gian tự động (3D Spatial Allocation Pipeline)
1. **Trigger A (Thủ công):** Manager bấm nút "Chạy phân bổ không gian" trên thanh công cụ `SpatialWorkspace` $\rightarrow$ gọi `layoutService.allocateZonesForShift(storeId, shiftId)` $\rightarrow$ `POST /api/stores/{storeId}/shifts/{shiftId}/allocate-zones`.
2. **Trigger B (Tự động từ AutoSchedule):** Manager bấm "Xếp ca tự động" $\rightarrow$ `AutoScheduleService.autoSchedule()` chạy xong $\rightarrow$ tại dòng 591 tự động gọi:
   `spatialAllocationService.allocateZonesForShift(storeId, sid)`.
3. **Thuật toán tại Backend:** `SpatialAllocationService.java:50`:
   - Bước 1: Quét `ShiftSkillRequirement` để ưu tiên gán vị trí chỉ định.
   - Bước 2: Quét kỹ năng nhân viên đối chiếu tên Zone tương thích ngữ nghĩa (Barista $\rightarrow$ Quầy Pha chế, Cashier $\rightarrow$ Quầy Thu ngân).
   - Bước 3: Phân tán hình học cực đại khoảng cách nhỏ nhất (Max-Min Dispersion Heuristic) trên tọa độ $(x, y, z)$ đối với các nhân viên còn lại.
   - Bước 4: Lưu `zone_id` và `workstation_id` vào bảng `shift_assignment`.

### Luồng 3: Phòng thử nghiệm What-If Simulation (Isolated Workforce Room)
1. **Bật chế độ thử nghiệm:** Manager bấm "Thử nghiệm" trên Header $\rightarrow$ `useSimulationStore.enterSimulation()` chụp ảnh snapshot dữ liệu hiện tại.
2. **Tương tác 3D:**
   - Kéo thả nhân sự giữa các Zone bằng chuột qua `DragTransfer.js` (Raycasting Floor Plane).
   - `SimulationValidator.js` kiểm tra điều kiện tức thời trên client (kỹ năng, sức chứa Zone).
   - Tự động lưu lịch sử Undo/Redo (30 bước).
   - Bảng `SimulationImpactPanel.jsx` tính toán độ biến thiên chi phí và độ phủ.
3. **Áp dụng (Commit):**
   - Khi Manager bấm "Áp dụng vào lịch chính thức" $\rightarrow$ `SpatialWorkspace.jsx:776` duyệt qua `simulatedDiff` và gọi `assignStaffToShift` / `removeStaffFromShift` đẩy thay đổi lên database.

---

## 3. Các khoảng trống và rủi ro kiến trúc (Identified Architectural Gaps)

1. **Sự tồn tại song song của 2 thư viện 3D đối nghịch (Dual 3D Engines in package.json):**
   - `package.json` chứa cả `@babylonjs/core` (9.25.0) và `three` (0.185.1) + `@react-three/fiber` (9.7.0).
   - Trong code thực tế: Toàn bộ tính năng hoạt động đều chạy trên **Three.js thuần** (`features/spatial-workspace/`). Các component `StoreBabylonCanvas.jsx` và `StoreScene.jsx` là code mồ côi (dead code) gây phình to bundle size nếu không được loại bỏ qua tree-shaking.
2. **State mồ côi tại `DashboardPage.jsx`:**
   - `DashboardPage.jsx` dòng 9-10 import `layoutService` và `DashboardSpatialSummary`, dòng 70-71 khai báo `const [storeLayout, setStoreLayout] = useState(null)`, nhưng hoàn toàn không gọi API nạp dữ liệu và không render widget 3D ra màn hình.
3. **Phân hệ Mobile không có Digital Twin:**
   - `ShiftSync-Mobile` chỉ sở hữu các widget trang trí avatar nhân viên độc lập (`Avatar3D.js`), hoàn toàn không có tính năng bản đồ không gian 3D chi nhánh hay phân bổ khu vực.
