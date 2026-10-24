# FIX-031 — Form tạo và sửa lịch làm việc

Ngày: 22/10/2026. Branch quoc-backend, baseline c9d4df1; giữ working tree, không commit.

## Tri thức tái sử dụng
PROJECT_CONTEXT, TASK_MEMORY, CODEBASE_MAP và AUDIT_INDEX; LIVE-024 (Docker/API thật), FIX-029 (Mẫu ca qua API), FIX-030 (thời gian Việt Nam), workflow frontend-design đã đọc trong hội thoại.

## Vấn đề và thay đổi
- Form cũ dài, footer ngoài màn hình, màu không hiển thị; chọn tuần cũ tạo ngày quá khứ và giờ mặc định bằng cả ngày mở cửa.
- Tách ShiftRegistrationForm và shift-form.css: header/footer cố định, thân cuộn, hai cột desktop/một cột mobile; màu hiển thị đúng, thông tin và lỗi rõ, trap/restore focus và Escape, busy guard.
- newShiftDefaults chọn mốc 15 phút tiếp theo trong giờ mở cửa, tối đa 8 giờ, hết giờ chuyển ngày kế tiếp. Validate tạo ca tương lai; sửa ca lịch sử vẫn qua payroll/assignment guards của backend. Deadline theo +07:00, không tự tạo hạn đã hết.
- Mẫu ca lấy GET /stores/{id}/shift-templates, tự điền giờ và gửi templateId; thiếu/lỗi mẫu vẫn nhập thủ công. Chấm công hiển thị cấu hình thật của chi nhánh, thiếu trường GPS ghi Chưa có thông tin. Bỏ checkbox clockIn/clockOut/radius giả và luồng tạo local cross-store request khỏi form này; điều phối dùng Chợ ca mở.
- Backend create trước đây bỏ qua note/color/skillId: nay lưu note, color, yêu cầu vị trí vào DB và trả DTO; update hỗ trợ color/template/role. Migration V46 thêm shift.color VARCHAR(32), validate hex6.
- Sửa bảo toàn ca nhiều nhân viên: chọn nhân viên thứ hai đang có không xóa các phân công còn lại; thay bằng người mới trong ca nhiều nhân viên bị chặn. Form khóa đổi nhân viên cho ca nhiều người và đổi vị trí khi đã phân công/xuất bản hoặc đa vị trí. Cache cũ chỉ fallback, dữ liệu backend được ưu tiên; form không ghi metadata mới vào localStorage.

## Kiểm chứng
- npm run build PASS; cảnh báo bundle >500kB đã có. ESLint component/helper/test PASS.
- node --test src/utils/shiftForm.test.js: 4/4 PASS.
- Maven ShiftServiceAssignmentDelegationTest (3), ShiftServiceQaTest (1), ShiftScheduleExceptionAuditTest (19): tổng 23/23 PASS. Bao gồm persist note/color/role và bảo toàn đa phân công.
- Docker backend rebuild/recreate thành công, Flyway V46 success. Đã backup DB tại C:/Users/Hoang Ng Viet Quoc/.codex/backups/shiftsync/20261022-shift-form/before-v46.dump; image trước sửa tagged before-shift-form-v46.
- Edge155 thật 1920x1080,1366x768,390x844: dialog nằm trong viewport, nút Lưu thấy được, document không tràn ngang. Trả lại Edge1920; ảnh .playwright-mcp/shift-form-1920.png.
- Live UI tạo ca nháp CHƯA phân công ngày03/11,09:15–10:15: POST201, GET xác nhận note/color/skill. PUT200 đổi note/color, GET xác nhận. ID590dbd0f-eab5-48bb-aa76-45bc3bdff33c đã DELETE204; SQL count test còn lại=0. Không phân công/thông báo nhân viên hay xuất bản ca thật.
- Tab riêng, chỉ POST được intercept500: giữ note/lỗi/retry, focus trap, Escape và restore focus PASS; tab đã đóng. Đây là fixture lỗi, không phải lỗi backend thật.
- Phát hiện clock giả cũ còn trong tab kiểm thử: đã khôi phục system time theo đồng hồ máy và resume, xác nhận browser/node khớp3ms; mặc định giờ mới12:30 vào lúc12:17.

## Giới hạn
Chưa E2E ghi ca được gán cho nhân viên thật, chưa chạy toàn bộ Maven suite. Cửa hàng đang không có mẫu ca nên chưa browser test tự điền mẫu có dữ liệu thật. Chặn ca quá khứ nằm trong form tạo; API lịch sử khác không bị thay quy tắc. Không tuyên bố audit toàn bộ Settings/cross-store legacy; code cũ ngoài form còn localStorage. GPS thiếu trong DTO hiện tại được hiển thị thiếu, không giả là bắt buộc.

## FIX-031A — Thu gọn sau phản hồi
Khung680px, controls38px, giảm khoảng cách, attendance details mặc định đóng. Focus trap thêm summary. Edge1920×1080 và1366×768: modal680×726, không cần cuộn thân khi mới mở;390×844: khung370×824, cuộn thân/footer luôn hiện; mở details và cuộn tới cấu hình PASS. Ảnh .playwright-mcp/shift-form-compact.png. Build/lint PASS, không mutation/API/backend.
