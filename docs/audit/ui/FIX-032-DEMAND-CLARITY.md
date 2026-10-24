# FIX-032 — Làm rõ giao diện định biên theo ngày
22/10/2026, quoc-backend. Tái sử dụng PROJECT_CONTEXT/TASK_MEMORY/CODEBASE_MAP/AUDIT_INDEX, SCHED-017, SCROLL-018 và FIX-031. Giữ working tree, không commit.

- DemandDailyView viết lại bảng nhu cầu: số người cần khác nhân viên đã phân công; lượt bố trí khác số người duy nhất. Bỏ thước giờ trang trí, inline norm inputs nhỏ, banner SLA/100% gây nhầm và thông tin biometric sync không liên quan.
- demandStatus phân biệt count dưới min, bằng target, trong min-max nhưng lệch target, vượt max và thiếu dữ liệu. Tính tổng từ quotas thật, không mặc định count=2 khi thiếu. Backend hiện trả 11 lượt/93,5h, 5/6 ô bằng target, cashier sáng1/target2 trong giới hạn.
- Quy chuẩn sửa bằng dialog có kiểm tra nguyên không âm và min≤target≤max; lỗi lưu giữ dialog, keyboard trap/Escape/restore. Daily count chỉ cập nhật sau API thành công/reload, không báo thành công giả.
- Một CTA chung sticky cho ngày/tuần: Áp dụng nhu cầu vào lịch ca. Không gọi Lưu vì quy chuẩn/số lượng đã lưu qua API riêng. Footer rõ phạm vi/date và chưa phân công nhân viên. Bỏ hai CTA lặp tại header và weekly budget.
- Sửa payload auto-fill/apply tuần chỉ gửi weekStart, ngày chỉ gửi date. Backend applyToScheduler ưu tiên date khi có cả hai nên trước đây tuần có thể chỉ xử lý một ngày. Không thay backend/API contract.

Kiểm chứng:
- Build PASS (cảnh báo bundle cũ). Node demandStatus 2 tests PASS bao gồm min/target/max, missing, summary hours. ESLint DailyView/helper/tests/WeeklyView PASS. Full Modal lint còn rule set-state-in-effect và no-useless-assignment ở effect/weekly handler cũ cùng dependency warning; không tuyên bố toàn module lint sạch.
- Edge thật1920×1080,1366×768,390×844: footer luôn trong viewport; overlay không tràn ngang, mobile table341px/scroll780px, cuộn tới review. Kết thúc1920. Ảnh .playwright-mcp/demand-redesign-032.png.
- Edge dữ liệu Docker thật: cashier sáng1, mục tiêu2 hiển thị trong giới hạn/dưới mục tiêu1, KPI5/6, chỉ một CTA. Không ghi dữ liệu nghiệp vụ thật.
- Tab riêng intercept writes500: norm target99 bị chặn không request; norm hợp lệ lỗi giữ form; daily count lỗi không đổi số; apply WEEK payload chỉ weekStart, lỗi giữ workspace. Tab đóng.
- Tab riêng fixture GET/PUT success: tăng cashier1→2, KPI6/6, slots12/hours102 sau reload PASS. Không DB mutation.
- Dialog keyboard Shift+Tab trap, Escape và focus restore PASS trên Edge.

Giới hạn: chưa live mutation định biên/apply vì có thể thay lịch thật; weekly nội dung KPI/status legacy chưa redesign trong task này, chỉ dùng chung thanh apply và scope fix. Backend min-max compliance cũ giữ nguyên; UI ngày tính nhãn mục tiêu độc lập.
