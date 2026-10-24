# FIX-033 — Đối chiếu API và thu gọn Định biên
22/10/2026; tái sử dụng FIX032 và HeadcountQuotaService/Controller contracts. Không backend/DB mutation/commit.

API mapping đã đọc và đối chiếu:
- Chi nhánh: GET /api/branches.
- Ngày: GET /api/headcount-quotas?branchId&date. Response chứa positionKpis, shifts/quotas, định mức min/target/max, durationHours. Giao diện ngày tính lượt/giờ/target từ chính response này; không cần gọi summary/positions riêng.
- Tuần: GET /api/headcount-quotas/weekly?branchId&weekStart.
- +/-: PUT /api/headcount-quotas/{quotaId}, body branchId/date/shiftType/positionId/count; backend dùng body để cập nhật requirement (quotaId có thể temp_skillId).
- Quy chuẩn: PUT /api/headcount-quotas/norm_{positionId}, body branchId/positionId/min/target/max → PositionNormOverride. Quy chuẩn chung toàn chi nhánh/vị trí, không riêng ngày.
- Điền: POST /api/headcount-quotas/auto-fill; Áp dụng: POST /api/headcount-quotas/apply-to-scheduler. DAY chỉ date, WEEK chỉ weekStart, cùng branchId/scope.
- Ngân sách tuần: PUT /api/headcount-quotas/budget, branchId/monthlyBudget.

Giới hạn dữ liệu quan trọng: buildDailyShiftQuota backend có fallback theo quy tắc khi thiếu requirement. Cashier sáng mặc định1, chiều2; auto-fill dùng quy tắc riêng theo vai trò và cuối tuần, không luôn bằng target. Đổi nút Điền theo mục tiêu thành Điền theo quy tắc; temp_* ghi người cần · gợi ý. Không khẳng định mọi con số đã lưu DB hoặc là nhân viên thực tế. Existing shift thiếu requirement không phân biệt được fallback qua DTO hiện có.

Thu gọn: width1560→1280 cho ngày; ẩn breadcrumb lặp, compact title/filters/KPI/table, bỏ hàng rolecards riêng và gom Sửa quy chuẩn vào dòng vị trí. Không scale toàn UI hoặc bỏ khả năng cuộn.

Kiểm chứng: Edge155 live Docker GET branches/day/week200, đúng branch/date/weekStart. 1920/1366/390 không tràn overlay, footer trong viewport, mobile giữ cuộn bảng và cuộn tới cuối; trả lại1920. Chiều cao desktop khoảng760 thay1009 trước FIX033. Ảnh .playwright-mcp/demand-compact-033.png. Build/lint DailyView PASS, cảnh báo chunk cũ. Writes chỉ source/payload/error fixture đã kiểm tra FIX032, chưa end-to-end mutation trên DB thật; không tuyên bố toàn bộ API nghiệp vụ đã kiểm thử ghi.
