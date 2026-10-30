# AUTO-025 — Trực quan hóa kết quả Auto-Scheduler

Ngày 20/10/2026. Frontend-only, tái sử dụng API AutoSchedule hiện có.

- “Xem trước vị trí” tải snapshot ca/phân công mà không POST. Chạy và lưu là thao tác xác nhận riêng.
- Thống kê, coverage, định biên và shortage lấy từ AutoScheduleResult; bảng so sánh snapshot trước với GET lịch sau khi backend chạy. So sánh placement không phụ thuộc assignment ID.
- Phát lại từng thay đổi, tua lại, lọc ca/khu vực, tô người mới và shortage bằng sọc chéo; tùy chọn Store3DCanvas thật. Dialog hỗ trợ Escape/focus, cuộn nội bộ và mobile.
- Build PASS (cảnh báo chunk >500KB đã có); 3 model tests PASS; Edge Edg/155 17/17 browser checkpoints PASS ở 1920×1080 và 390×844, WebGL thật/API fixture, một mock POST, không lỗi console/uncaught. Ảnh .playwright-mcp/autoscheduler-025-edge.png.
- Giới hạn API: /auto-schedule thực thi và lưu ngay, chưa có dry-run; vì vậy xác nhận “Xếp và lưu lịch” xảy ra trước playback, chưa xem được đề xuất chưa lưu. Assignment DTO không trả lý do chọn từng người hay log ràng buộc; UI nêu rõ, chỉ hiển thị source/kỹ năng nếu backend có.
- Test chỉ dùng API fixture; chưa xác minh JWT manager hoặc DB production. API server vẫn là nguồn quyết định cuối.

## Chạy lại mô phỏng — 25/10/2026

- Vite local `127.0.0.1:3000`, viewport 1920×1080, Playwright managed browser với fixture API tách biệt: hai ca DRAFT → `POST /auto-schedule` fixture 200 → GET lịch trả hai phân công → kết quả 2/2, độ phủ 100%, phát lại đủ 2/2 thay đổi và canvas 3D render (1 canvas).
- Không có console error và document không tràn ngang (1920/1920). Ảnh: `.playwright-mcp/autoscheduler-026-fixture-1920.png`.
- Đây vẫn là test mô phỏng: không có Docker/PostgreSQL/JWT thật. Edge không khả dụng trong browser inventory của phiên này nên không gắn nhãn Edge cho lượt chạy này.

## AUTO-027 — Cân lại tỷ lệ trực quan (25/10/2026)

- Đánh giá ảnh AUTO-026 xác nhận dialog quá cao và có sáu dải điều khiển xếp lớp; canvas bị đẩy thấp còn cột chi tiết không có hierarchy rõ. Áp dụng hướng “bảng điều phối vận hành” (DFII 14/15): khung tối đa 1480×880, dải KPI bốn ô, controls một hàng, timeline xanh-ngọc mảnh và content 3D/chi tiết theo tỷ lệ 1fr/278px.
- Không đổi API, callback hoặc mô hình 3D. Ảnh sau: `.playwright-mcp/autoscheduler-027-balanced-1920.png`. Browser fixture xác nhận 1920×1080, 1366×768, 390×844 không tràn ngang; build và `visualizationModel` 3/3 PASS. Chưa nghiệm thu Edge/Docker backend thật.

## AUTO-031 — Rõ bước mở phân tích và loại số liệu giả (25/10/2026)

- Modal khởi động giờ là `Phân tích xếp ca tự động`: mô tả đúng rằng nó chỉ mở bảng so sánh, nơi quản lý mới chọn `Thử phương án` hoặc `Xếp & lưu`.
- Nút `Xem trước vị trí` đổi thành `Mở phân tích phương án`; không chạy thuật toán hoặc ghi dữ liệu ở bước này.
- Bỏ fallback `48` vị trí yêu cầu trong modal. Khi API/ca không khai báo requirement, giao diện hiện `0`, không bịa số liệu nhu cầu. Nhãn `Nhân viên khả dụng` cũng đổi thành `Nhân viên tại cửa hàng` vì dữ liệu tại bước này chưa lọc availability.
- Playwright fixture 390×844 mở được chuỗi modal → bảng phân tích; hai CTA riêng xuất hiện, document không tràn (`390/390`) và dialog nằm trong viewport. Production build + `visualizationModel` 3/3 PASS. Kết quả thuật toán/API thật tiếp tục được kiểm qua AUTO-029/AUTO-030.
