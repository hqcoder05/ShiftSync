# Kịch bản E2E toàn dự án ShiftSync

## Mục tiêu và phạm vi

Tài liệu này là checklist chạy chấp nhận từ đầu đến cuối, không seed dữ liệu và
không gọi API để tạo dữ liệu. Mọi tài khoản, cửa hàng, nhân sự, lịch và giao dịch
đều được tạo bằng giao diện Web/Mobile. Backend là nguồn kiểm tra cuối cùng cho
mọi quyền và quy tắc nghiệp vụ.

Phạm vi: Web Admin/Manager, Mobile Staff, REST API được UI gọi, WebSocket/SSE,
FCM/browser notification và workspace 3D. Các ID `E2E-*` là mã để ghi nhận
PASS/FAIL trong báo cáo kiểm thử.

## Điều kiện trước khi chạy

1. Dùng PostgreSQL và Redis riêng cho môi trường QA; không trỏ test vào dữ liệu
   vận hành. Khởi động `docker compose up -d` và chờ Backend health là `UP`.
2. Khởi động Web tại `http://localhost:3000`, Mobile Expo tại `http://localhost:8081`.
3. Chỉ chuẩn bị một Admin bootstrap. Không tạo sẵn Manager/Staff trong DB.
4. Dùng hai trình duyệt/profile khác nhau: `WEB-A` cho Admin/Manager và `WEB-B`
   cho Staff; Mobile dùng ít nhất hai phiên hoặc hai thiết bị Staff khi test đổi ca.
5. Chuẩn bị dữ liệu địa điểm GPS hợp lệ cho cửa hàng và một vị trí nằm ngoài bán kính.
6. Bật quyền camera/location/notification khi case yêu cầu; ghi rõ `BLOCKED` nếu
   thiết bị hoặc browser không hỗ trợ thay vì đánh dấu PASS.

## Dữ liệu được tạo qua giao diện

| Mã | Dữ liệu | Người tạo | Mục đích |
|---|---|---|---|
| D1 | Cửa hàng A, giờ hoạt động, cấu hình chấm công | Admin | Luồng chính |
| D2 | Cửa hàng B | Admin | Điều phối liên chi nhánh và phân quyền scope |
| D3 | Manager A | Admin | Quản lý cửa hàng A |
| D4 | Staff A1, A2, A3 | Manager A | Đổi/nhường ca, cạnh tranh claim |
| D5 | Skill Barista, Cashier; hợp đồng; khung lương | Manager A | Điều kiện xếp ca và payroll |
| D6 | Mẫu ca sáng/chiều, quota định biên và zone/workstation | Manager A | Lập lịch và 3D |
| D7 | Kỳ lương của tháng test | Manager A | Chốt payslip |

Xóa/đóng dữ liệu QA bằng giao diện sau khi hoàn tất, hoặc giữ nguyên kèm nhãn
`E2E YYYY-MM-DD` để có thể truy vết.

## Luồng vàng bắt buộc

Thực hiện đúng thứ tự này trước các case riêng lẻ:

1. `E2E-01` Admin đăng nhập Web, tạo Cửa hàng A/B, cấu hình A và tạo Manager A.
2. `E2E-02` Manager A đăng nhập, tạo Staff A1/A2/A3, gán vào A; chỉ Admin mới
   được gán Manager A thêm quyền ở B.
3. `E2E-03` Manager tạo skill, hợp đồng, mẫu ca, quota từng vị trí và layout/zone.
4. `E2E-04` Staff đăng nhập Mobile, cập nhật hồ sơ, đăng ký availability và bật notification.
5. `E2E-05` Manager tạo ca với requirement; gán tay một ca, chạy preview AutoSchedule,
   áp dụng, kiểm tra thiếu người thực tế và animation theo assignment sequence.
6. `E2E-06` Staff check-in/out, Manager xử lý adjustment/leave; sau đó tạo payroll,
   xác nhận kỳ lương và Staff xem payslip.
7. `E2E-07` Staff A1 tạo đổi ca hai chiều với A2; A2 phản hồi và Manager duyệt.
   Lặp lại với nhường ca một chiều cho tối đa ba người và xác nhận chỉ một yêu cầu
   được duyệt, các yêu cầu còn lại tự hủy.
8. `E2E-08` Tạo open shift và workforce request tới B; xác nhận consent và lịch của
   người hỗ trợ, notification realtime và lịch sử audit.

## Kịch bản theo vai trò và module

| ID | Vai trò / bề mặt | Thao tác | Kết quả mong đợi |
|---|---|---|---|
| E2E-A01 | Admin Web | Đăng nhập, reload, mở tab mới, logout | Phiên khôi phục qua cookie; logout vô hiệu refresh; không còn token trong localStorage. |
| E2E-A02 | Admin Web | Tạo/sửa/xóa cửa hàng | Validation tên/giờ hoạt động hoạt động; xóa bị chặn hoặc cảnh báo khi có dữ liệu phụ thuộc. |
| E2E-A03 | Admin Web | Tạo Manager và Staff | Email trùng trả lỗi rõ ràng; role đúng; tài khoản không tự xuất hiện nếu chưa được cấp. |
| E2E-A04 | Admin Web | Gán Manager A vào A/B và đổi scope | Manager chỉ thấy/ghi dữ liệu ở cửa hàng được cấp. |
| E2E-A05 | Admin Web | Cấu hình holiday, leave type, scheduler, notification | Lưu lại sau reload; effective date/lịch sử thay đổi hiển thị đúng nếu có. |
| E2E-A06 | Admin Web | Mở Admin page và audit/log | Staff/Manager bị chặn route/API; Admin xem được action vừa tạo. |
| E2E-M01 | Manager Web | Tạo/sửa Staff, skill, hợp đồng, employment | Ràng buộc ngày hiệu lực, role, chi nhánh và skill hết hạn được áp dụng. |
| E2E-M02 | Manager Web | Tạo mẫu ca một ngày và áp dụng theo ngày/tuần | Mẫu chỉ tạo đúng ca/khoảng thời gian đã chọn; không nhân bản ngoài phạm vi. |
| E2E-M03 | Manager Web | Tăng/giảm quota định biên | Bảng cập nhật không reload lỗi; thiếu theo lịch = số requirement chưa có assignment thực tế. |
| E2E-M04 | Manager Web | Tạo ca trong/ngoài giờ hoạt động, qua midnight | Ngoài giờ bị chặn; ca qua midnight tính đúng ngày kết thúc, overlap và nghỉ tối thiểu. |
| E2E-M05 | Manager Web | Gán người bằng ô lịch/zone | Chỉ nhân sự đủ skill, rảnh, không nghỉ/trùng ca và còn giới hạn giờ được chọn. |
| E2E-M06 | Manager Web | Thử gán vượt tuần 30 giờ | Thông báo nêu rõ giới hạn, người/ca gây xung đột; không ghi assignment. |
| E2E-M07 | Manager Web | AutoSchedule preview rồi apply | Preview không ghi DB; apply ghi đúng sequence/coverage; rerun không phá assignment thủ công. |
| E2E-M08 | Manager Web | Xem 3D, toàn màn hình, chọn zone/workstation | 3D tải được, route độc lập, thao tác không mất state; Staff không sửa layout. |
| E2E-M09 | Manager Web | Sửa layout/import/export thiết kế | JSON sai hoặc >500KB bị chặn; revision conflict giữ bản nháp; undo/redo đúng. |
| E2E-M10 | Manager Web | Duyệt/từ chối leave, swap, adjustment, workforce | Chỉ request thuộc store; trạng thái, schedule, notification và audit cùng cập nhật. |
| E2E-M11 | Manager Web | Chấm công live, xem ảnh, sửa attendance | Ảnh đúng owner; không xem ảnh người/store ngoài scope; sửa ảnh hưởng payroll theo rule. |
| E2E-M12 | Manager Web | Generate/confirm/paid payroll, export | State chỉ tiến Draft→Confirmed→Paid; số giờ/OT/leave đúng; PDF/Excel tải đúng quyền. |
| E2E-S01 | Staff Web/Mobile | Đăng nhập, profile, avatar | Chỉ xem/sửa hồ sơ mình; avatar chỉ nhận model nội bộ/RPM hợp lệ; URL/file sai bị từ chối. |
| E2E-S02 | Staff Mobile | Xem lịch ngày/tuần và lịch sử | Chỉ thấy ca của mình; skeleton khi tải; navigation đáy vẫn có ở màn hình chính. |
| E2E-S03 | Staff Mobile | Khai báo availability/blackout | Deadline sửa được áp dụng; duplicate/overlap bị chặn; Manager thấy thay đổi. |
| E2E-S04 | Staff Mobile | Tạo leave và hủy/sửa lý do | Balance/impact cập nhật; không hủy request đã xử lý khi policy không cho phép. |
| E2E-S05 | Staff Mobile | Check-in/out tại đúng và sai GPS, có/không selfie | Ngoài geofence bị chặn; double check-in/out và ca chưa đến giờ xử lý rõ ràng. |
| E2E-S06 | Staff Mobile | Claim open shift đồng thời từ A1/A2 | Chỉ một claim thành công; người còn lại thấy conflict và lịch không bị nhân đôi. |
| E2E-S07 | Staff Mobile | Đổi ca hai chiều | Chỉ hiện ca phù hợp; A2 accept/reject; Manager chỉ duyệt sau accept; role/giờ/chênh lệch lương hiển thị đúng. |
| E2E-S08 | Staff Mobile | Nhường ca một chiều | Chọn tối đa ba người; người có ca trùng không được chọn; người nhận có thể vượt weekly limit nhưng không được overlap/thiếu skill/nghỉ phép. |
| E2E-S09 | Staff Mobile | Xem payslip/PDF, thông báo, tin nhắn, incident | Chỉ dữ liệu của mình; trạng thái read/unread đồng bộ; gửi message/incident báo lỗi khi offline. |
| E2E-X01 | Web + Mobile | Cùng thay đổi ca/leave/attendance | WebSocket/SSE cập nhật UI không reload; mất kết nối hiển thị trạng thái và tự reconnect không tạo duplicate event. |
| E2E-X02 | Browser notification | Gửi notification thử khi tab mở/đóng | Tab mở có popup in-app; tab đóng nhận OS notification nếu quyền đã cấp; click focus/mở đúng app. |
| E2E-X03 | RBAC/IDOR | Thử URL trực tiếp bằng Staff/Manager khác store | Nhận 401/403 hoặc redirect; không lộ dữ liệu, file PDF/ảnh/shift/leave của người khác. |
| E2E-X04 | Resilience | Tắt mạng giữa create/approve/claim | UI báo trạng thái không chắc chắn, không hiển thị thành công giả; refresh phản ánh source of truth. |
| E2E-X05 | Concurrent | Hai tab cùng sửa quota/layout/assignment | Một thao tác thắng theo version/lock; thao tác còn lại có 409 rõ ràng và không mất bản nháp. |

## Case biên bắt buộc cho scheduler

Chạy với dữ liệu D1–D6 và ghi kết quả coverage/shortage:

- Không có nhân viên; thiếu skill; skill hết hạn; nhân viên inactive.
- Leave đã duyệt, blackout, availability không phủ ca, overlap, minimum rest, giới hạn tuần/tháng.
- Ca sát giờ bắt đầu, ca qua midnight, ngày lễ, ca bị hủy.
- Requirement min/max, quota tăng/giảm sau khi đã gán người.
- Rerun AutoSchedule khi có manual assignment, open shift, swap pending và concurrent apply.
- Cùng điểm score: kết quả deterministic; thứ tự animation theo `assignmentSequence` từ server.

## Ma trận phủ bề mặt

| Nhóm | Web Admin | Web Manager | Web Staff | Mobile Staff | API/RBAC | Realtime |
|---|---:|---:|---:|---:|---:|---:|
| Auth/profile/role | ✓ | ✓ | ✓ | ✓ | ✓ | |
| Store/employment/skill/config | ✓ | ✓ | | | ✓ | |
| Demand/schedule/assignment/3D | ✓ | ✓ | xem | xem | ✓ | ✓ |
| Availability/leave/attendance | giám sát | duyệt | tạo/xem | tạo/xem | ✓ | ✓ |
| Marketplace/swap/workforce | giám sát | duyệt | tham gia | tham gia | ✓ | ✓ |
| Payroll/export | ✓ | ✓ | xem | xem | ✓ | |
| Notification/message/incident | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

## Tiêu chí PASS, bằng chứng và lệnh kiểm tra

Một case PASS khi UI, API response, dữ liệu sau reload và event realtime đều khớp kỳ vọng.
Đính kèm screenshot/video, thời điểm, account role, store, request/assignment ID và log console
không chứa error chưa giải thích. Không dùng tài khoản/password thật trong bằng chứng.

Sau mỗi checkpoint chạy:

```powershell
cd ShiftSync-Web; npm run lint; npm test; npm run build
cd ..\shiftsync-backend; .\mvnw test
docker compose ps
```

Để kiểm tra smoke bảo mật session sau khi release: đăng nhập Web, xác nhận không có
`accessToken`, `refreshToken`, `userRole` trong Local Storage; reload vẫn có phiên;
logout rồi refresh phải về Login. Ở HTTPS, xác nhận cookie `shiftsync_refresh` là
`HttpOnly`, `Secure`, `SameSite=Lax`.

## Điểm cần quyết định trước UAT

1. Rule chính thức khi nhân viên hỗ trợ chi nhánh khác: payroll đã chọn ghi nhận ở
   chi nhánh quản lý nhân viên; xác nhận báo cáo chi phí cần thể hiện thế nào.
2. Cách xử lý quá giới hạn giờ ở nhường ca một chiều: hiện policy cho phép vượt weekly
   limit nhưng vẫn chặn overlap, skill, leave và payroll lock.
3. Môi trường production cần domain HTTPS để bật `AUTH_REFRESH_COOKIE_SECURE=true`,
   Firebase API key restriction và kiểm thử OS notification thật.
