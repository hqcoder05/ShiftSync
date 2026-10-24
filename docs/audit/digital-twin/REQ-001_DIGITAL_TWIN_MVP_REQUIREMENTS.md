# TÀI LIỆU ĐẶC TẢ YÊU CẦU KỸ THUẬT DIGITAL TWIN MVP (REQ-001)
## SHIFTSYNC 3D WORKFORCE DIGITAL TWIN — PHẠM VI 4 TUẦN MVP

---

## 1. TỔNG QUAN VÀ MỤC ĐÍCH HỆ THỐNG
**ShiftSync Digital Twin** là hệ thống bản sao kỹ thuật số 3D của không gian cửa hàng bán lẻ/dịch vụ (F&B, Retail), cho phép người quản lý (Store Manager) và người điều hành (Operations Director):
1. Nhìn thấy trực quan bố cục không gian thực tế của chi nhánh (kích thước, vị trí các khu vực, nội thất đặc trưng).
2. Theo dõi phân bổ nhân sự theo thời gian thực dọc theo trục thời gian của từng ca làm việc (Temporal Timeline).
3. Thử nghiệm các phương án điều phối nhân sự trước khi áp dụng vào thực tế thông qua cơ chế Mô phỏng giả định (What-If Simulation Room).
4. Khám phá không gian thực tế từ góc nhìn của nhân viên và khách hàng (3D Exploration Mode).

---

## 2. BỐN MODULE NGHIỆP VỤ TRỌNG TÂM (CORE BUSINESS MODULES)

### 2.1. Module 1 (M1) — Spatial Layout Visualization (Trực quan hóa Không gian Mặt bằng)
- **REQ-M1.1 (Store Envelope):** Hệ thống phải hiển thị kích thước bao thực tế của cửa hàng (Dài x Rộng x Cao) dựa trên dữ liệu cấu hình từ backend (`store_layouts`).
- **REQ-M1.2 (Zone Decals & Tag Sprites):** Mỗi khu vực làm việc (Zone) phải được hiển thị bằng một decal phẳng trên sàn kèm theo billboard tag sprite lơ lửng hiển thị:
  - Tên khu vực (ví dụ: *Thu ngân, Pha chế, Bếp nóng, Kho, Phục vụ sảnh*).
  - Tỷ lệ lấp đầy nhân sự hiện tại / Sức chứa tối đa (ví dụ: `2/4`).
  - Màu sắc cảnh báo: Xanh lá (đủ nhân sự), Cam/Đỏ (thiếu nhân sự hoặc vượt tải).
- **REQ-M1.3 (Procedural Furniture):** Tự động sinh nội thất tượng trưng theo từng loại khu vực để tạo cảm giác nhận diện trực quan nhanh (quầy thu ngân kèm máy POS, quầy bar pha chế kèm máy pha cà phê, kệ kho hàng tầng, bàn ăn sảnh).
- **REQ-M1.4 (Architecture Layers & X-Ray):** Hỗ trợ bật/tắt hiển thị từng lớp kiến trúc: Sàn nhà, Tường bao, Trần nhà, Nội thất, Vùng zone, Nhân sự; và chế độ xuyên thấu X-Ray (tường bán trong suốt).
- **REQ-M1.5 (Geofence Boundary):** Tùy chọn hiển thị vòng tròn bán kính định vị Geofence (chấm công di động qua GPS/WiFi) bao quanh cửa hàng.

### 2.2. Module 2 (M2) — Temporal Shift Playback (Phát lại Ca làm việc theo Thời gian)
- **REQ-M2.1 (Shift Selector):** Tự động đồng bộ với ca làm việc đang được chọn trên trang `SchedulePage` (hoặc hiển thị toàn bộ ca trong ngày).
- **REQ-M2.2 (Timeline Scrubber):** Cung cấp thanh trượt thời gian chính xác theo từng phút (từ 06:00 sáng đến 23:00 đêm).
- **REQ-M2.3 (Dynamic Staff In/Out):** Nhân viên chỉ xuất hiện trong không gian 3D khi thời điểm con trỏ timeline nằm trong khoảng thời gian hiệu lực của ca làm việc của họ (`startTime <= time <= endTime`).
- **REQ-M2.4 (Auto-Playback):** Hỗ trợ nút Play/Pause với các tốc độ phát `1x`, `2x`, `5x` để xem nhanh toàn bộ diễn biến nhân sự trong ca.
- **REQ-M2.5 (Staffing Heatmap):** Hỗ trợ chuyển đổi chế độ bản đồ nhiệt:
  - Mật độ nhân sự (Staffing Density).
  - Mức độ thiếu hụt nhân sự so với định biên ca (Understaffed Heatmap).

### 2.3. Module 3 (M3) — What-If Simulation & Conflict Detection (Mô phỏng Điều phối & Phát hiện Xung đột)
- **REQ-M3.1 (Simulation Isolation):** Khi vào chế độ mô phỏng (*Simulation Room*), toàn bộ thay đổi chỉ lưu trong State cục bộ (Zustand Store), không tác động lên cơ sở dữ liệu thật cho đến khi người dùng bấm "Áp dụng".
- **REQ-M3.2 (3D Drag & Drop Transfer):** Cho phép người quản lý bấm và kéo avatar của một nhân viên từ Zone này thả sang Zone khác trong không gian 3D.
- **REQ-M3.3 (Visual Feedback & Real-time Validation):** Trong lúc kéo thả:
  - Hiển thị vòng sáng dẫn hướng dưới chân nhân viên.
  - Highlight vùng Zone mục tiêu.
  - Kiểm tra và hiển thị cảnh báo vi phạm kỹ năng (Skill Mismatch) hoặc vượt quá sức chứa (Overcapacity).
- **REQ-M3.4 (Simulation Operations):** Hỗ trợ đầy đủ các thao tác:
  - `TRANSFER`: Chuyển 1 nhân viên sang Zone khác.
  - `SWAP`: Hoán đổi vị trí giữa 2 nhân viên.
  - `LEAVE_ABSENCE`: Mô phỏng nhân viên vắng mặt đột xuất.
  - `ADD`: Bổ sung thêm nhân viên dự bị vào ca.
- **REQ-M3.5 (Diff Viewer & Impact Analysis):** Bảng tổng hợp so sánh trực quan Trước (Before) và Sau (After) mô phỏng:
  - Tỷ lệ bao phủ ca (% Coverage).
  - Số lượng zone thiếu người.
  - Danh sách chi tiết các sai khác (Diff items).
- **REQ-M3.6 (Atomic Apply & Partial Recovery):**
  - Gửi request đồng bộ xuống backend: gọi endpoint Atomic Swap đối với các cặp swap, và update assignment cho các trường hợp transfer.
  - Nếu gặp lỗi mạng hoặc xung đột đồng thời, hiển thị thông báo chi tiết và bảo toàn trạng thái mô phỏng để người dùng không bị mất dữ liệu.
- **REQ-M3.7 (Exit Guard Modal):** Nếu người dùng cố gắng rời khỏi chế độ mô phỏng khi còn diffs chưa lưu, hiển thị hộp thoại cảnh báo xác nhận.

### 2.4. Module 4 (M4) — 3D Exploration & Inspection (Khám phá & Thanh tra Thực địa)
- **REQ-M4.1 (Low-poly Stylized Avatars):** Nhân viên được mô phỏng bằng nhân vật Low-poly thân thiện, có phân biệt đồng phục/màu sắc theo kỹ năng và trạng thái hoạt động.
- **REQ-M4.2 (Avatar Animation States):** Nhân vật có 3 trạng thái:
  - `IDLE`: Thở nhẹ, đứng tại vị trí.
  - `WALKING`: Di chuyển bước chân mượt mà khi được điều chuyển giữa các zone.
  - `WORKING`: Cử động thao tác chuyên môn (thao tác quầy, pha chế, sắp xếp kệ).
- **REQ-M4.3 (Interactive Raycasting Selection):** Bấm trực tiếp vào nhân viên hoặc zone trong 3D để mở thanh tra chi tiết (Spatial Inspector Drawer).
- **REQ-M4.4 (Explore Walking Mode):** Chế độ nhập vai đi dạo trong cửa hàng:
  - Điều khiển bằng phím WASD / Mũi tên và chuột.
  - Chuyển đổi giữa góc nhìn thứ nhất (First-person) và góc nhìn thứ ba (Third-person).
  - Hệ thống va chạm (Collision obstacles) với tường và quầy kệ lớn.
  - Tự động phát hiện và tương tác nhanh với nhân viên ở gần (*Press E to interact*).

---

## 3. HAI CHẾ ĐỘ CAMERA TIÊU CHUẨN (DUAL CAMERA MODES)

| Chế độ Camera | Đặc điểm kỹ thuật | Mục đích sử dụng | Hành vi điều khiển |
| :--- | :--- | :--- | :--- |
| **Mode 1: Overview Perspective (Isometric Angle)** | Góc phối cảnh 3D nghiêng 45 độ, FOV 36 độ, vị trí `(0.9L, 1.05Max, 1.15W)` nhìn về tâm `(0, 0.5, 0)`. | Quan sát tổng thể toàn bộ không gian cửa hàng, theo dõi bố cục chiều sâu, nội thất và sự tương tác giữa các khu vực. | Hỗ trợ OrbitControls đầy đủ: xoay quanh tâm, zoom cận cảnh (không giới hạn minDistance), kéo pan mặt phẳng. |
| **Mode 2: Top-Down Orthographic/Plan View** | Góc nhìn trực diện vuông góc từ trên đỉnh trần nhìn xuống sàn, FOV hẹp 34 độ, vị trí `(0, 1.5Max, 0.001)` nhìn về `(0, 0, 0)`. | Đóng vai trò như một bản vẽ mặt bằng kỹ thuật (Floor Architectural Plan), dễ dàng định vị vị trí và khoảng cách không bị hiệu ứng phối cảnh làm méo cạnh. | Khóa góc nghiêng polarAngle để giữ góc nhìn phẳng, cho phép zoom và pan tự do trên mặt phẳng 2D. |

---

## 4. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS)

- **NFR-1 (Hiệu năng khung hình):** Tốc độ khung hình mục tiêu tối thiểu đạt **30 FPS** trên GPU tích hợp (Intel Iris / AMD Radeon Graphics) và đạt **60 FPS** trên GPU rời.
- **NFR-2 (Quản lý Bộ nhớ WebGL):** Khi chuyển đổi qua lại giữa các ca làm việc hoặc rời khỏi màn hình Digital Twin, toàn bộ Geometries, Materials, Textures phải được giải phóng hoàn toàn khỏi VRAM qua lệnh `.dispose()`.
- **NFR-3 (Bảo toàn Dữ liệu Mô phỏng):** Không bao giờ làm mất dữ liệu người dùng vừa chỉnh sửa nếu xảy ra lỗi mạng trong quá trình gọi API áp dụng mô phỏng.
- **NFR-4 (Tương thích Trình duyệt):** Hoạt động mượt mà trên Chrome, Edge, Safari, Firefox phiên bản hiện đại hỗ trợ WebGL 2.0.

---

## 5. MA TRẬN TRUY XUẤT NGUỒN GỐC (REQUIREMENTS TRACEABILITY MATRIX)

| Mã yêu cầu | Mô tả tóm tắt | File thực thi chính | Trạng thái xác minh |
| :--- | :--- | :--- | :--- |
| **REQ-M1.1 -> M1.5** | Mặt bằng 3D, Zone Decals, Nội thất, X-Ray, Geofence | `StoreEnvironment.js`, `ZoneDecals.js`, `FurnitureBuilder.js` | **ĐÃ HOÀN THÀNH** |
| **REQ-M2.1 -> M2.5** | Timeline Scrubber, Playback, Dynamic Temporal Staff | `SpatialWorkspace.jsx`, `SpatialTimeline.jsx` | **ĐÃ HOÀN THÀNH** |
| **REQ-M3.1 -> M3.7** | What-If Simulation, Drag-Drop, Diff Modal, Atomic Swap | `simulationStore.js`, `DragTransfer.js`, `ShiftAssignmentController.java` | **ĐÃ HOÀN THÀNH & FIX CONCURRENCY** |
| **REQ-M4.1 -> M4.4** | Stylized Avatars, Raycasting Inspector, Explore Walk | `StylizedAvatars.js`, `PlayerController.js`, `SpatialInspector.jsx` | **ĐÃ HOÀN THÀNH** |
| **CAM-1, CAM-2** | 2 Chế độ Camera: Overview Isometric & Top-Down Plan | `CameraModes.js`, `CameraController.js`, `SpatialToolbar.jsx` | **ĐÃ HOÀN THÀNH** |
