# FIX-030 — Loại ca quá hạn khỏi Chợ ca mở

Ngày22/10/2026. Tái sử dụng LIVE-024/FIX-029 và MarketplaceService hiện có.

## Nguyên nhân và thay đổi
Backend getOpenShifts đã lọc start/deadline theo Asia/Ho_Chi_Minh. Danh sách quản lý lại lấy toàn bộ storeShifts và chỉ lọc missingCount>0, nên ca tháng9 vẫn hiển thị kèm Xem ứng viên. Sửa danh sách thiếu người, bộ đếm, bộ lọc và danh sách nhận ca dùng cùng marketplaceTiming. Ca đã bắt đầu, hết hạn nhận, bị hủy hoặc thiếu thông tin thời gian không thuộc danh sách đang tuyển. Không thay đổi bản ghi hay xóa lịch cũ.

Helper utils/marketplaceTime.js dùng offset+07 khớp business zone backend. Phân biệt chưa bắt đầu, đang diễn ra, đã kết thúc, hết hạn nhận, đã hủy và dữ liệu thiếu. Ca qua đêm có end ở ngày kế tiếp. Kiểm tra now ngay tại nút nhận/đăng/phân công/yêu cầu chi viện; bộ chọn ca chi viện loại ca cũ. Modal ứng viên mở sẵn hiển thị hết hạn và khóa nút phân công khi đến hạn.

Đổi tab Đã phân công thành Lịch sử ca (giữ key FILLED và route cũ). Hiển thị cả ca đóng nhận/quá hạn/hủy lẫn ca đủ phân công, không trùng id. Thẻ lịch sử chỉ đọc, giữ số phân công thực tế, không gán nhãn100% cho ca còn thiếu. Nếu requiredStaff0 thì ghi chưa thiết lập chỉ tiêu thay3/0. Không thêm API/migration.

Clock cập nhật mỗi giây và khi focus/visibility thay đổi để ca tự rời danh sách khi chạm giờ bắt đầu/hạn nhận. Backend vẫn quyết định cuối cùng khi ghi.

## Kiểm chứng
- Node6/6 PASS: ca quá khứ, tương lai, đúng giờ bắt đầu/kết thúc, deadlineZ/offset/local, qua đêm, hủy, thiếu dữ liệu, UTC khác ngày Việt Nam. Lint helper/tests PASS; buildPASS(chunkwarning cũ).
- Edge1920 backendDocker thật: OPEN0cards, KPIthiếu0; Lịch sử20cards, không có Xem ứng viên/nhận/đăng ca trên thẻ lịch sử. Các ca tháng9 còn tra cứu được. Không DB mutation.
- Tab riêng clock22/10/2026 10:00, fixture1ca10:01 và1ca cũ: active1→0 sau fastForward61s, history2 và nhãn đang diễnra, writes0. Tab thử đã đóng, tab người dùng không interception/clockfake.
- Screenshot .playwright-mcp/marketplace-history-real.png. Không chạy claim/publish/assign thật, khôngbackend/deps/commit/push.
