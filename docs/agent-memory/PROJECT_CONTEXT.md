# ShiftSync — Project Context & Agent Entry Point
Mã tài liệu: `docs/agent-memory/PROJECT_CONTEXT.md`  
Cập nhật lần cuối: 14/10/2026 | Phiên bản hệ thống: Monorepo `quoc-backend` (Baseline: `c9d4df1`)

---

## 1. Mục đích hệ thống & Kiến trúc tổng thể

**ShiftSync** là nền tảng quản trị và điều phối lực lượng lao động thông minh (Smart Workforce Management & 3D Spatial Digital Twin) dành cho các chuỗi bán lẻ, nhà hàng (F&B) và chuỗi dịch vụ đa chi nhánh.

### Mô hình kiến trúc Monorepo:
```text
Client Web (React 19 + Three.js) ──┐
                                   ├── REST API & STOMP WebSocket ── ShiftSync Backend (Spring Boot 4.1.1) ── PostgreSQL 16
Client Mobile (React Native Expo) ─┘                                     │
                                                                         ├── Redis 7 / Redisson (Distributed Lock)
                                                                         ├── Flyway (V1 - V40 DB Migrations)
                                                                         └── Firebase Admin SDK (FCM Cloud Messaging)
```

---

## 2. Technology Stack & Các Module chính

### 2.1 Backend (`shiftsync-backend`)
- **Ngôn ngữ & Runtime:** Java 21, Spring Boot 4.1.1, Spring Data JPA, Spring Security (Stateless JWT + RBAC).
- **Cơ sở dữ liệu:** PostgreSQL 16.4 Alpine, Flyway migration (`shiftsync-backend/src/main/resources/db/migration/`).
- **Phân tán & Cache:** Redis 7 (Token blacklist, sessions), Redisson 3.44.0 (Distributed locks cho Shift Marketplace claim).
- **Core Domains:**
  - `auth`: JWT Authentication, User, Role (`ROLE_ADMIN`, `ROLE_MANAGER`, `ROLE_STAFF`), Store Isolation (`StoreAccessService`).
  - `shift`: Shift, ShiftAssignment, AutoSchedule (Dynamic MRV + Local Repair heuristic), Atomic Swap (`swapStaffZones`).
  - `layout`: Store Layout, StoreZone, Workstation (`/api/stores/{storeId}/workstations`).
  - `attendance`: Haversine GPS geofencing, QR code chấm công, ảnh selfie.
  - `payroll`: Tính lương tự động, phân tách OT & ngày lễ, xuất phiếu lương.
  - `marketplace`: Sàn nhận ca mở có distributed lock chống race-condition.

### 2.2 Web Frontend (`ShiftSync-Web`)
- **Runtime & Bundler:** React 19, Vite 8 (Vite-Rolldown builder), Tailwind CSS, Lucide React icons.
- **3D Spatial Digital Twin (`src/features/spatial-workspace/`):**
  - Mô phỏng không gian cửa hàng 3D dựa trên Three.js (r180+).
  - Tích hợp 4 chế độ: Toàn cảnh (Overview), Mặt bằng 3D kỹ thuật (Orthographic Top-Down), Sơ đồ 2D (SVG Schematic), Tham quan 3D (Explore Mode).
  - Phân hệ Thử nghiệm nhân sự (What-If Simulation Room) với cơ chế so sánh tác động thời gian thực (`simulationStore.js`, `SimulationImpactCalculator.js`).
  - Quản lý định danh nhân sự chuẩn hóa qua module chuyên trách [staffIdentity.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/utils/staffIdentity.js).
  - Lớp trạm làm việc chuyên biệt [FurnitureBuilder.js](file:///d:/ThucTapTotNghiep/ShiftSync/ShiftSync-Web/src/features/spatial-workspace/scene/FurnitureBuilder.js) tích hợp API CSDL.

### 2.3 Mobile App (`ShiftSync-Mobile`)
- **Runtime:** React Native 0.86, Expo SDK 54.0.0. Dành cho nhân sự hiện trường (STAFF) chấm công, đăng ký ca rảnh, xem phiếu lương và đổi ca.

---

## 3. Cấu trúc thư mục trọng yếu

```text
D:\ThucTapTotNghiep\ShiftSync\
├── AGENTS.md                                        # Hướng dẫn bắt buộc dành cho AI coding agents
├── docs/
│   ├── agent-memory/                                # Hệ tri thức dự án lưu vết liên tục (Knowledge Base)
│   │   ├── PROJECT_CONTEXT.md                       # Điểm khởi đầu (Entry Point) đọc đầu tiên
│   │   ├── CODEBASE_MAP.md                          # Bản đồ quan hệ kiến trúc & dữ liệu đã xác minh
│   │   ├── AUDIT_INDEX.md                           # Danh mục tra cứu toàn bộ các đợt Audit & Fix
│   │   ├── CHANGELOG.md                             # Lịch sử thay đổi theo từng task
│   │   └── TASK_MEMORY.md                           # Bàn giao trạng thái hiện tại cho task kế tiếp
│   └── audit/digital-twin/                          # Báo cáo kỹ thuật chi tiết của phân hệ Digital Twin
├── shiftsync-backend/                               # Nguồn mã nguồn Java Spring Boot
└── ShiftSync-Web/                                   # Nguồn mã nguồn Web React 19
```

---

## 4. Quy tắc an toàn Git & Phát triển phần mềm

> [!CAUTION]
> **TUÂN THỦ BẮT BUỘC CHO MỌI AI AGENT TRONG REPOSITORY NÀY:**
> 1. **KHÔNG** chạy `git reset`, `git checkout`, `git clean`, `git stash`, `git commit` hoặc `git push` trừ khi người dùng yêu cầu rõ ràng bằng văn bản.
> 2. **BẢO TỒN NGUYÊN VẸN** mọi file đang sửa đổi dở dang trong working tree (`git status --short`).
> 3. **WEB-FIRST/BACKEND-FIRST THEO SCOPE:** Không tự ý sửa code Backend trong một task Web nếu Backend API contract đã đáp ứng và không có bug chứng minh bằng test.
> 4. **XÁC MINH TRƯỚC KHI KẾT LUẬN:** Không bao giờ giả định một báo cáo cũ là đúng nếu chưa kiểm tra mã nguồn hoặc chạy test đối chứng.

---

## 5. Quy trình 6 bước bắt buộc cho mọi nhiệm vụ tương lai

Mọi agent khi bắt đầu một task mới phải tuân thủ nghiêm ngặt quy trình sau để **tránh đọc quét lại toàn bộ repository lãng phí token**:

1. **Bước 1 — Nạp ngữ cảnh (Load Context):** Đọc [PROJECT_CONTEXT.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/PROJECT_CONTEXT.md) và [TASK_MEMORY.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/TASK_MEMORY.md).
2. **Bước 2 — Tra cứu tri thức đã có (Locate Prior Knowledge):** Tra cứu [AUDIT_INDEX.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/AUDIT_INDEX.md) và [CODEBASE_MAP.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/CODEBASE_MAP.md) cho các module, API, hoặc rủi ro liên quan.
3. **Bước 3 — Kiểm tra độ tươi chọn lọc (Selective Freshness Check):** Dùng `git status` và commit SHA đối chiếu. Chỉ đọc/kiểm tra lại các file thực sự bị thay đổi hoặc liên quan trực tiếp đến task.
4. **Bước 4 — Triển khai & Kiểm thử (Implement & Test):** Giữ phạm vi tối thiểu, chạy test liên quan (`npm run build`, `node --test`, hoặc `mvn test`).
5. **Bước 5 — Cập nhật hệ tri thức (Update Knowledge):** Ghi nhận vào [CHANGELOG.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/CHANGELOG.md), cập nhật trạng thái trong [CODEBASE_MAP.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/CODEBASE_MAP.md), và cập nhật bàn giao trong [TASK_MEMORY.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/TASK_MEMORY.md).
6. **Bước 6 — Báo cáo (Report):** Báo cáo bằng tiếng Việt, nêu rõ tri thức đã tái sử dụng, các file đã sửa, kết quả test và bàn giao cho task kế tiếp.
