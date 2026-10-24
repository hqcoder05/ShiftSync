# AUTO-025 — Trực quan hóa kết quả Auto-Scheduler

Ngày 20/10/2026. Frontend-only, tái sử dụng API AutoSchedule hiện có.

- “Xem trước vị trí” tải snapshot ca/phân công mà không POST. Chạy và lưu là thao tác xác nhận riêng.
- Thống kê, coverage, định biên và shortage lấy từ AutoScheduleResult; bảng so sánh snapshot trước với GET lịch sau khi backend chạy. So sánh placement không phụ thuộc assignment ID.
- Phát lại từng thay đổi, tua lại, lọc ca/khu vực, tô người mới và shortage bằng sọc chéo; tùy chọn Store3DCanvas thật. Dialog hỗ trợ Escape/focus, cuộn nội bộ và mobile.
- Build PASS (cảnh báo chunk >500KB đã có); 3 model tests PASS; Edge Edg/155 17/17 browser checkpoints PASS ở 1920×1080 và 390×844, WebGL thật/API fixture, một mock POST, không lỗi console/uncaught. Ảnh .playwright-mcp/autoscheduler-025-edge.png.
- Giới hạn API: /auto-schedule thực thi và lưu ngay, chưa có dry-run; vì vậy xác nhận “Xếp và lưu lịch” xảy ra trước playback, chưa xem được đề xuất chưa lưu. Assignment DTO không trả lý do chọn từng người hay log ràng buộc; UI nêu rõ, chỉ hiển thị source/kỹ năng nếu backend có.
- Test chỉ dùng API fixture; chưa xác minh JWT manager hoặc DB production. API server vẫn là nguồn quyết định cuối.
