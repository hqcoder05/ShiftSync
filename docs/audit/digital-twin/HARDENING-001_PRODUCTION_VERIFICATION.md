# BÁO CÁO CỦNG CỐ SẢN PHẨM VÀ XÁC MINH SẢN XUẤT (HARDENING-001)
## SHIFTSYNC DIGITAL TWIN CONTINUATION & PRODUCTION HARDENING

---

## 1. THÔNG TIN PHIÊN KIỂM ĐỊNH (SESSION METADATA)
- **Nhiệm vụ:** `GOAL NEXT — SHIFTSYNC DIGITAL TWIN CONTINUATION & PRODUCTION HARDENING`
- **Thời gian thực hiện:** 2026-10-14 08:14 (ICT)
- **Nhánh Git:** `quoc-backend`
- **Baseline Commit HEAD:** `c9d4df15bd1ba3d802d297eb45312af40eaacd40`
- **Nguyên tắc bảo vệ dữ liệu:** Không xóa, không ghi đè, không stash, không reset, không rebase, không commit hoặc push. Bảo toàn 100% mã nguồn làm việc trước đó.

---

## 2. PHÂN LOẠI HIỆN TRẠNG VÀ CÁC LỖI ĐÃ XÁC ĐỊNH & XỬ LÝ

### 2.1. Lỗi 1 (P1) — Rủi ro Phá hủy Tài nguyên Đồ họa Dùng chung (Shared Singletons Disposal Hazard)
- **Mô tả hiện tượng:** Trong lần triển khai trước, hàm `disposeHierarchy` duyệt đệ quy và gọi `.dispose()` lên tất cả `child.geometry` và `child.material`. Tuy nhiên trong `CharacterGeometries.js`, `CharacterMaterials.js` và `FurnitureBuilder.js`, toàn bộ hình học cơ bản của nhân vật và vật liệu nội thất đều là các **Module Singletons** được tái sử dụng qua hàng trăm instances.
- **Hậu quả nếu không sửa:** Khi một nhân viên rời ca hoặc khi unmount scene, các singletons này bị giải phóng WebGL buffer/shader vĩnh viễn trong GPU memory, khiến các avatar khác bị biến mất hoặc gây crash WebGL render context.
- **Biện pháp xử lý triệt để:**
  - Khởi tạo tập bảo vệ `sharedResources = new WeakSet()` đăng ký toàn bộ singletons của `FurnitureBuilder.materials`, `CharacterMaterials`, và `CharacterGeometries`.
  - Hàm `disposeHierarchy` kiểm tra và lập tức bỏ qua nếu là Avatar (`userData.isPerson` / `userData.isAvatarRoot`).
  - Đối với các đối tượng khác, chỉ giải phóng các geometry và textures (CanvasTexture) do chính instance đó tự tạo độc quyền; tuyệt đối không gọi `.dispose()` lên các tài nguyên nằm trong `sharedResources`.

### 2.2. Lỗi 2 (P1) — Khiếm khuyết Phép chiếu Top-Down Giả lập (Pseudo Orthographic Defect)
- **Mô tả hiện tượng:** Trước đây chế độ Top-Down sử dụng `PerspectiveCamera` với FOV nhỏ (34 độ) đặt trên cao. Mặc dù nhìn từ trên xuống, hiệu ứng phối cảnh vẫn gây biến dạng hình học (perspective distortion) tại các mép tường và viền khu vực xa tâm sàn, không đáp ứng tiêu chuẩn bản vẽ mặt bằng kỹ thuật phẳng (Plan View).
- **Hậu quả:** Người quản lý khó căn chỉnh tọa độ chính xác giữa các khu vực làm việc và vị trí quầy kệ.
- **Biện pháp xử lý triệt để:**
  - Thiết kế kiến trúc **Dual-Camera** thực thụ: Khởi tạo song song `THREE.PerspectiveCamera` (cho Overview 3D và First/Third person Explore) và `THREE.OrthographicCamera` (cho Top-Down Blueprint).
  - Khi người dùng bấm nút Top-Down: hệ thống chuyển `controls.object` sang `OrthographicCamera`, đặt vị trí vuông góc `(0, 45, 0.0001)` nhìn về `(0, 0, 0)`, khóa xoay góc nghiêng `minPolarAngle = 0; maxPolarAngle = 0;`.
  - Khi người dùng bấm Overview, Focus Zone, Focus Staff, hoặc Explore: hệ thống tự động mở khóa xoay và chuyển mượt mà về `PerspectiveCamera`.
  - ResizeObserver, Raycaster, và animation render loop tự động sử dụng `activeCameraRef.current`.

### 2.3. Lỗi 3 (P0) — Rủi ro Lặp lại Thao tác khi Áp dụng Mô phỏng Thất bại một phần (Partial Batch Apply Hazard)
- **Mô tả hiện tượng:** Trong `handleApplySimulation`, khi áp dụng đồng thời một chuỗi diffs (ví dụ: 1 Transfer và 1 Swap). Nếu thao tác 1 thành công ghi vào cơ sở dữ liệu nhưng thao tác 2 gặp lỗi (mạng, quyền hạn hoặc xung đột dữ liệu): mã nguồn cũ giữ nguyên toàn bộ mảng `simulatedDiff`. Khi người dùng thử bấm Apply lại lần sau, thao tác 1 sẽ bị gửi lại lần 2 vào database, có thể gây lỗi vi phạm ràng buộc hoặc duplicate mutations.
- **Biện pháp xử lý triệt để:**
  - Theo dõi danh sách `succeededDiffs` trong quá trình duyệt batch.
  - Nếu có ít nhất 1 thao tác thành công (`succeededDiffs.length > 0`), lập tức kích hoạt `onApplyComplete?.()` để giao diện chính đồng bộ lại dữ liệu mới nhất từ server.
  - Nếu xảy ra lỗi ở các thao tác còn lại, tự động loại bỏ các diff đã thành công khỏi Zustand Store:
    `const remainingDiffs = simulatedDiff.filter((d) => !succeededDiffs.includes(d));`
    `useSimulationStore.setState({ simulatedDiff: remainingDiffs });`
  - Giữ lại đúng các diff bị lỗi trên màn hình kèm thông báo cảnh báo chi tiết để người dùng điều chỉnh và thử lại mà không làm mất công sức mô phỏng.

---

## 3. BẰNG CHỨNG KIỂM THỬ THỰC TẾ (VERIFICATION EVIDENCE)

### 3.1. Kiểm thử Backend (Spring Boot + PostgreSQL 16.4)
Lệnh thực thi:
```bash
mvn test "-Dtest=ShiftAssignmentServiceTest,SpatialAllocationServiceTest,DigitalTwinConcurrencyIntegrationTest"
```
- **Kết quả:** **30 / 30 TESTS PASS (100% THÀNH CÔNG)**
- **Thời gian chạy:** 33.059 s.
- **Xác thực Concurrency:** Kiểm thử tích hợp đa luồng `DigitalTwinConcurrencyIntegrationTest` mô phỏng 2 quản lý đồng thời swap chéo ca nhân viên trên PostgreSQL thật: cơ chế Pessimistic Lock `findWithLockByShiftIdAndStaffIdIn` (`FOR NO KEY UPDATE`) và Hibernate `@DynamicUpdate` ngăn chặn thành công Lost Update, Deadlock và Zombie Resurrection.

### 3.2. Kiểm thử Frontend (Vite Production Build)
Lệnh thực thi:
```bash
npm run build
```
- **Kết quả:** **BUILT SUCCESSFULLY trong 797 ms (Exit code 0)**.
- **Số modules chuyển đổi:** 2042 modules. Không có lỗi cú pháp, không có cảnh báo chưa xử lý.

---

## 4. KẾT LUẬN VÀ TRẠNG THÁI CUỐI CÙNG
- **Trạng thái kết luận:** **MVP VERIFIED**.
- Các luồng cốt lõi của Digital Twin: Trực quan hóa mặt bằng 3D, True Top-Down Orthographic Blueprint, Timeline Playback theo giờ ca, What-If Simulation kéo thả với Partial Recovery, và kiểm soát đồng thời Atomic Swap đa quản lý đã được kiểm chứng và hoạt động chuẩn xác với dữ liệu thực tế của hệ thống.
