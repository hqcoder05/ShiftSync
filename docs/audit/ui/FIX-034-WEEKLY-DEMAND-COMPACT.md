# FIX-034 — Thu gọn và làm rõ Định biên tuần
22/10/2026, branch quoc-backend. Tái sử dụng FIX032/FIX033, SCROLL018, Quota APIs và demandStatus.js. Bảo toàn working tree, không commit/backend migration/DB writes.

Thay đổi:
- WeeklyMatrixView mới theo bố cục ngày: ba metrics lượt bố trí/giờ công/ô bằng mục tiêu, bảng7ngày, tổng lượt/ngày. Bỏ các card quy chuẩn lớn và thanh SLA dễ nhầm, nhãn dự báo doanh thu/biometric và lời hứa +50% doanh thu không chứng minh được.
- Khung1280, header gọn, bảng cố định cột vị trí; desktop đủ14ca, mobile cuộn ngang riêng. Giữ footer áp dụng chung. Chi phí/ngân sách và danh sách cần kiểm tra mở bằng details để giảm chiều cao mặc định.
- DemandNormDialog riêng cho tuần, kiểm tra nguyên không âm/min≤target≤max, focus trap/Escape/restore, lưu lỗi giữ dialog. Sửa ngay từ cột vị trí. Ngân sách dùng form có lưu/hủy/validation và giữ dữ liệu khi API lỗi.
- Nhãn count là nhu cầu, không nói đã gán nhân sự. Status dùng cùng helper ngày: exacttarget/within/under/over/unknown; vượt max ưu tiên hơn peak. Không coi cuối tuần tự động hợp lệ.
- Weekly +/- và budget chuyển server-first: API success mới reload authoritative data; lỗi không lạc quan đổi số. Bỏ đoạn optimistic dài có hardcoded fallback/stale KPI. Không đổi endpoint/payload business.

Kiểm chứng:
- Build PASS, ESLint WeeklyMatrixView/NormDialog PASS; Node demandStatus2/2 PASS. Cảnh báo chunk cũ còn. Full Modal vẫn có legacy effect lint/dependency warning ngoài sửa này.
- Edge155 GET thật Docker:79 lượt,671,5h,33/42target,9within,0review. Không mutation DB thật.
- Edge1920×1080,1366×768: bảng1232px đủ cột;390×844: bảng341px/scroll1180px. Overlay không tràn ngang; stickyrole và Chủ nhật thấy khi cuộn tối đa; footer trong viewport. Kết thúc1920, ảnh .playwright-mcp/demand-week-034.png.
- Server Vite trả CSS cũ trong quá trình test; đã restart đúng process Vite workspace, không động Docker/data; kiểm lại computed overflow auto/styles mới rồi mới xác nhận responsive. Dev server vẫn3000.
- Tab riêng intercept write500: count giữ nguyên, norm target99 không gửi request, Shift+Tab/Escape PASS; budget lỗi giữ90000000 để thử lại. PUT count đủ branchId/date/shiftType/positionId/count; budget đủbranchId/monthlyBudget. Tabs đã đóng.
- Tab riêng fixture GET/PUTsuccess: sửa cashier1→2 đọc lại đúng, ôbarista10 dù peaktrue vẫn Vượt tối đa và review1. Không DB writes.

Giới hạn: chưa live ghi định biên/ngân sách hoặc áp dụng vào lịch thật. Backend có default/quy tắc khi thiếu requirement như FIX033; giao diện mô tả là gợi ý, không phải nhân sự đã phân công. Budget totalHours/estimatedCost theo API, chưa kiểm toán thuật toán dự toán backend.
