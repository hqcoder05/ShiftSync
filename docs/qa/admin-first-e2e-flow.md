# Kịch bản kiểm thử toàn hệ thống từ một tài khoản ADMIN

## Mục đích và nguyên tắc

Tài liệu này mô tả một lượt kiểm thử E2E có thể lặp lại mà **chỉ khởi đầu với một tài khoản ADMIN đã được cấp trước**. Mọi chi nhánh, MANAGER, STAFF, kỹ năng, ca làm và dữ liệu kiểm thử sau đó đều phải được tạo bằng giao diện Web hoặc Mobile; không seed dữ liệu, không gọi SQL, không gọi API thủ công.

ADMIN là tài khoản gốc được cấp bằng quy trình vận hành an toàn ngoài ứng dụng. Với database trống ở môi trường local, backend có thể khởi tạo **một** ADMIN khi khởi động nếu `INITIAL_ADMIN_EMAIL` và `INITIAL_ADMIN_PASSWORD` chỉ được truyền qua môi trường runtime. Nó không tạo nếu đã có ADMIN, cấu hình không hợp lệ hoặc email đã thuộc tài khoản khác. Chỉ khi vận hành chủ động đặt thêm `INITIAL_ADMIN_ALLOW_EXISTING=true` thì bootstrap mới được phép thêm một ADMIN mới mà không ghi đè tài khoản cũ; cờ này mặc định tắt và chỉ dùng cho yêu cầu cấp quyền được phê duyệt. Ứng dụng cố ý không cho ADMIN/MANAGER tạo thêm ADMIN. Không ghi mật khẩu thật vào tài liệu, `.env`, ảnh chụp hoặc Git; dùng một kênh bảo mật để truyền secret.

## Đánh giá mục tiêu theo SMART

| Tiêu chí | Điểm | Đánh giá |
| --- | ---: | --- |
| Cụ thể | 5/5 | Bắt đầu từ đúng một ADMIN và xác định rõ chuỗi tạo tài khoản. |
| Đo được | 5/5 | Mỗi bước có kết quả pass/fail, vai trò, màn hình và dữ liệu cần có. |
| Khả thi | 5/5 | Tất cả thao tác đều đã có UI và được ràng buộc bởi RBAC hiện hành. |
| Liên quan | 5/5 | Bao phủ quyền, điều hành cửa hàng và luồng STAFF Mobile. |
| Có thời hạn | 4/5 | Một lượt đầy đủ dự kiến 90–120 phút; có thể chia checkpoint. |

**Kết luận: A, 4.8/5.** Điều kiện bắt buộc duy nhất là có ADMIN ban đầu và các dịch vụ Web/Backend/Mobile đang chạy.

## Chuẩn bị

1. Khởi động stack và kiểm tra Web tại `http://localhost:3000`, Backend tại `http://localhost:8080`, Mobile Web tại `http://localhost:8081`.
2. Mở ba bối cảnh đăng nhập riêng: một cửa sổ Web cho ADMIN, một cửa sổ ẩn danh Web cho MANAGER, một cửa sổ ẩn danh/thiết bị riêng cho mỗi STAFF. Không dùng chung một profile vì token và `selectedStoreId` được lưu trong trình duyệt.
3. Tạo mã lượt kiểm thử: `QA-YYYYMMDD-HHMM`. Dùng mã này trong tên chi nhánh, email và ghi chú. Ví dụ `qa-20261115-1000`.
4. Dùng ngày ca tương lai `T+2` hoặc muộn hơn. Không cố định ngày lịch vì backend chặn tạo ca đã bắt đầu/quá khứ.

## Dữ liệu tối thiểu của một lượt test

| Loại | Số lượng | Quy ước |
| --- | ---: | --- |
| ADMIN | 1 | Tài khoản được cấp trước, không tạo trong UI. |
| Chi nhánh | 1 | `QA <mã lượt>`. |
| MANAGER | 1 | `manager.<mã>@qa.local`. |
| STAFF | 4 | `staff-a` đến `staff-d` cùng hậu tố mã lượt. |
| Kỹ năng | 2 | Barista và Cashier. STAFF A/B/D có Barista; STAFF C có Barista + Cashier. |
| Ca tương lai | ít nhất 2 | Một ca có STAFF A/B/C/D để kiểm thử lịch, 3D và đổi/nhường ca. |

Bốn STAFF là mức tối thiểu để STAFF A có thể gửi **nhường ca một chiều cho tối đa ba người nhận** B/C/D. Không dùng cùng email hoặc số điện thoại giữa các lượt chạy.

## Sổ tài khoản cho một lượt chạy

Tạo các tài khoản theo bảng này từ UI; chỉ ADMIN ban đầu là có sẵn. Mật khẩu dưới đây là **nhãn để người chạy tự tạo mật khẩu QA riêng**, không phải mật khẩu mặc định hay mật khẩu được lưu trong mã nguồn.

| Bí danh phiên | Được tạo bởi | Role | Email mẫu | Dùng để test |
| --- | --- | --- | --- | --- |
| `ADMIN-01` | Cấp trước ngoài UI | ADMIN | tài khoản vận hành hiện có | Quản trị chuỗi, tạo và bổ nhiệm MANAGER, kiểm tra quyền âm tính. |
| `MGR-01` | ADMIN-01 | MANAGER | `manager.<mã>@qa.local` | Cấu hình chi nhánh, kỹ năng, STAFF, ca làm, duyệt yêu cầu. |
| `STAFF-A` | MGR-01 | STAFF | `staff-a.<mã>@qa.local` | Chủ ca: tạo nghỉ phép, đổi ca và nhường ca. |
| `STAFF-B` | MGR-01 | STAFF | `staff-b.<mã>@qa.local` | Người phản hồi đổi ca hai chiều. |
| `STAFF-C` | MGR-01 | STAFF | `staff-c.<mã>@qa.local` | Người nhận nhường ca, kiểm tra kỹ năng Cashier. |
| `STAFF-D` | MGR-01 | STAFF | `staff-d.<mã>@qa.local` | Người nhận thứ ba cho kiểm tra giới hạn 3 người. |

Ghi lại sau mỗi lần tạo: email, role, chi nhánh, thời điểm tạo và tên cửa sổ/profile trình duyệt đang dùng. Không gửi mật khẩu qua chat hoặc đưa vào Git.

## Sơ đồ phiên test bắt buộc

```text
ADMIN-01 (Web profile A)
  ├─ tạo Chi nhánh QA
  ├─ tạo MGR-01
  └─ bổ nhiệm MGR-01 vào Chi nhánh QA
       │
       ├─ MGR-01 (Web profile B) tạo kỹ năng + STAFF A/B/C/D
       │    ├─ lập lịch và phân công ca T+2
       │    └─ duyệt các yêu cầu do STAFF gửi
       │
       ├─ STAFF-A (Mobile/profile C): chủ ca, gửi yêu cầu
       ├─ STAFF-B (Mobile/profile D): phản hồi đổi ca
       ├─ STAFF-C (Mobile/profile E): nhận nhường ca
       └─ STAFF-D (Mobile/profile F): nhận nhường ca thứ ba
```

Không đăng nhập đè các tài khoản lên cùng một browser profile. Nếu chỉ có một máy, dùng các profile Edge/Chrome khác nhau hoặc một cửa sổ ẩn danh riêng cho từng vai trò. Mobile Web tại `http://localhost:8081` chỉ dành cho STAFF; ADMIN và MANAGER kiểm thử nghiệp vụ điều hành trên Web tại `http://localhost:3000`.

## Luồng truy cập và tạo dữ liệu

### Checkpoint A — ADMIN khởi tạo tổ chức

1. Đăng nhập ADMIN tại Web, mở `Quản trị hệ thống` (`/admin`). **Pass:** thấy trang quản trị; STAFF không thể truy cập route này.
2. Tạo chi nhánh `QA <mã lượt>` với giờ mở/đóng hợp lệ. **Pass:** chi nhánh xuất hiện trong danh sách. Khi tạo thành công, hệ thống cũng khởi tạo loại hợp đồng Full-time và Part-time mặc định.
3. Tại khối Quản lý, chọn `Tạo tài khoản Quản lý mới`; tạo MANAGER. **Pass:** MANAGER xuất hiện trong danh sách tài khoản, chưa phụ trách chi nhánh.
4. Chọn chi nhánh vừa tạo, `Bổ nhiệm Quản lý`, chọn MANAGER vừa tạo và lưu. **Pass:** thẻ chi nhánh hiển thị MANAGER; MANAGER có phân công đang hiệu lực.
5. Đăng xuất ADMIN. Không tạo ADMIN thứ hai: đây là kiểm tra quyền âm tính; UI/API phải từ chối.

### Checkpoint B — MANAGER cấu hình và tạo đội ngũ

1. Đăng nhập MANAGER trong profile Web riêng. Chọn chi nhánh QA ở bộ chọn cửa hàng. **Pass:** chỉ thấy dữ liệu chi nhánh được bổ nhiệm, không thấy khu vực quản trị hệ thống.
2. Vào `Hồ sơ nhân sự` → `Kỹ năng`, tạo Barista và Cashier. **Pass:** kỹ năng xuất hiện để chọn khi thêm nhân sự.
3. Vào `Hồ sơ nhân sự` → `Danh sách nhân viên`, bấm `Thêm nhân sự`; tạo STAFF A, B, C, D. Gán kỹ năng theo bảng trên và đúng chi nhánh QA. **Pass:** mỗi người có tài khoản đăng nhập lẫn employment đang hiệu lực tại chi nhánh.
4. Tạo ít nhất một mẫu ca Sáng và hai khu vực/trạm phục vụ 3D nếu chi nhánh chưa có. **Pass:** mẫu ca/khu vực hiển thị sau khi tải lại trang.
5. Vào `Lập lịch ca`; tạo ít nhất hai ca vào `T+2`, gán A/B/C/D. Đặt tổng giờ mỗi người không vượt giới hạn hợp đồng. **Pass:** lịch được lưu/phát hành, không có xung đột thời gian.
6. Mở `Cửa hàng 3D` (`/store-3d`), chọn ca vừa tạo. **Pass:** thấy canvas, khu vực, nhân sự đã gán, timeline và chuyển được Sơ đồ 2D ↔ Không gian 3D.

### Checkpoint C — STAFF Mobile tự phục vụ

1. Trên Mobile Web/điện thoại, đăng nhập STAFF A. **Pass:** chỉ vào giao diện STAFF; không có menu quản trị, nhân sự hay tạo tài khoản.
2. Kiểm tra Lịch làm, hồ sơ, trạng thái khả dụng và thông báo. Cập nhật một khoảng rảnh ở STAFF A. **Pass:** thay đổi còn tồn tại sau tải lại.
3. STAFF A tạo yêu cầu nghỉ/điều chỉnh chấm công phù hợp với ca `T+2`. **Pass:** yêu cầu xuất hiện trạng thái chờ duyệt.
4. STAFF A tạo đổi ca hai chiều với STAFF B, sau đó STAFF B phản hồi. **Pass:** trạng thái yêu cầu thay đổi và không cho phép chọn ca trùng giờ.
5. STAFF A tạo nhường ca một chiều, chọn STAFF B/C/D. **Pass:** chọn được tối đa ba người; người thứ tư (nếu có) bị chặn. Khi một yêu cầu được duyệt, các yêu cầu chờ khác của cùng ca bị hủy.
6. Thử check-in/check-out ở thời điểm và vị trí được phép. **Pass:** Mobile hiển thị trạng thái mới; Web Manager nhìn thấy bản ghi chấm công. Nếu môi trường không có GPS/camera, đánh dấu ca này là **blocked bởi capability thiết bị**, không đổi dữ liệu bằng API.
7. Gửi một tin nhắn/thông báo thử đến STAFF B. **Pass:** nhận được in-app toast; quyền Window Notification chỉ kiểm tra trên trình duyệt/thiết bị đã cấp quyền.

### Checkpoint D — MANAGER duyệt và đối soát

1. Đăng nhập lại MANAGER Web. Duyệt/từ chối luân phiên một yêu cầu nghỉ, một điều chỉnh chấm công và một đổi/nhường ca. **Pass:** thông báo và trạng thái Mobile đồng bộ; lịch/3D phản ánh phân công sau duyệt.
2. Kiểm tra Bảng chấm công, bảng lương dự kiến và cảnh báo định biên. **Pass:** giờ ca, trạng thái điểm danh và nhân sự chưa đủ/đủ khớp với dữ liệu vừa tạo.
3. Chạy xếp ca tự động trên một ngày thử. **Pass:** preview phân biệt rõ với lịch đã lưu; chỉ áp dụng khi MANAGER xác nhận. Kiểm tra animation hiển thị theo thứ tự quyết định của thuật toán.
4. Quay lại Không gian 3D: đổi giữa toàn cảnh, mặt bằng 3D, sơ đồ 2D, bật/tắt Nội thất/Nhân sự/Điểm danh và timeline. **Pass:** trạng thái điều khiển thay đổi rõ, canvas không lỗi console.

### Checkpoint E — ADMIN kiểm tra quản trị và kết thúc lượt

1. ADMIN xác minh chi nhánh có đúng MANAGER và tài khoản mới có đúng role. **Pass:** ADMIN thấy đầy đủ; MANAGER chỉ thấy dữ liệu chi nhánh được cấp.
2. Kiểm tra quyền âm tính: STAFF không tạo tài khoản; MANAGER không tạo MANAGER/ADMIN; ADMIN không tạo ADMIN. **Pass:** trả `403`/thông báo quyền rõ ràng, không phát sinh tài khoản.
3. Giữ dữ liệu với mã lượt để truy vết hoặc xóa **qua giao diện** theo thứ tự phụ thuộc sau khi chụp bằng chứng. Không dùng SQL/seed để dọn dẹp.

## Kịch bản chi tiết theo tài khoản mới tạo

Các bước sau là phần bắt buộc để xác nhận rằng tài khoản được **tạo xong có thể đăng nhập và dùng đúng quyền**, không chỉ tồn tại trong danh sách ADMIN.

### TC-01 — MGR-01 đăng nhập lần đầu và kiểm tra phạm vi

1. Đăng xuất ADMIN-01, mở Web profile B, đăng nhập bằng `MGR-01`.
2. Kiểm tra bộ chọn cửa hàng: chọn đúng chi nhánh QA mà ADMIN-01 vừa bổ nhiệm.
3. Mở `Hồ sơ nhân sự`, `Lập lịch ca`, `Chấm công & Phép`, `Chợ ca mở` và `Cửa hàng 3D`.
4. Thử mở trực tiếp `/admin`.

**Pass:** MGR-01 dùng được các màn hình điều hành của chi nhánh QA, nhưng `/admin` bị chuyển hướng/chặn. Không nhìn thấy dữ liệu chi nhánh không được giao.

### TC-02 — MGR-01 tạo và xác thực STAFF-A/B/C/D

1. Trong profile B, MGR-01 vào `Hồ sơ nhân sự` → `Danh sách nhân viên` → `Thêm nhân sự`.
2. Tạo lần lượt A, B, C, D theo sổ tài khoản; gán chi nhánh QA và kỹ năng. STAFF C cần cả Barista lẫn Cashier.
3. Mở từng hồ sơ vừa tạo để xác nhận chi nhánh, kỹ năng, hợp đồng và trạng thái Active.
4. MGR-01 thử chọn role MANAGER/ADMIN trong màn hình tạo tài khoản (nếu UI không cho chọn, đó là pass); nếu dùng request bị chặn, phải nhận lỗi quyền.

**Pass:** cả bốn STAFF đăng nhập được, được gắn chi nhánh/hợp đồng; MGR-01 không thể nâng quyền hay tạo MANAGER/ADMIN.

### TC-03 — STAFF-A kiểm thử luồng cá nhân

1. Mở Mobile/profile C, đăng nhập STAFF-A.
2. Xác nhận tên, chi nhánh QA, lịch `T+2` và ca được gán. Chụp bằng chứng.
3. Cập nhật khả dụng cho một ngày chưa có ca; tải lại màn hình để kiểm tra lưu dữ liệu.
4. Tạo một yêu cầu nghỉ ở ca `T+2` hoặc yêu cầu điều chỉnh chấm công. Giữ trạng thái chờ duyệt.
5. Từ Chợ ca mở, tạo **đổi ca hai chiều** với ca hợp lệ của STAFF-B.
6. Tạo thêm **nhường ca một chiều** khác, chọn B/C/D là ba người nhận. Không gửi yêu cầu cho chính A hoặc người trùng ca.
7. Kiểm tra Notification/Messaging và Profile; thử truy cập URL Web quản trị nếu Mobile Web cho nhập URL.

**Pass:** A chỉ thấy dữ liệu cá nhân/ca có liên quan; yêu cầu được tạo với trạng thái chờ; không có điểm vào tạo tài khoản, quản trị hay bảng lương người khác.

### TC-04 — STAFF-B phản hồi đổi ca

1. Mở Mobile/profile D, đăng nhập STAFF-B.
2. Mở yêu cầu từ STAFF-A, xem rõ ca nguồn/ca đích, giờ, vị trí và chênh lệch dự kiến.
3. Chấp nhận yêu cầu đổi ca hai chiều.
4. Tải lại Notification và Chợ ca mở; kiểm tra trạng thái đã đổi từ `PENDING` sang trạng thái phản hồi phù hợp.
5. Thử tạo một yêu cầu ca trùng giờ để bảo đảm hệ thống từ chối hoặc không liệt kê ca không hợp lệ.

**Pass:** phản hồi của B được lưu, A và MGR-01 thấy cùng trạng thái; không thể tạo đổi ca gây trùng lịch.

### TC-05 — STAFF-C/D phản hồi nhường ca

1. Mở Mobile/profile E bằng STAFF-C và profile F bằng STAFF-D.
2. Mỗi người xác nhận có nhìn thấy đề nghị nhường ca từ A, nhưng không nhìn thấy thông tin riêng tư ngoài phạm vi cần thiết.
3. STAFF-C chấp nhận. STAFF-D để nguyên trạng thái chờ để kiểm tra hành vi hủy tự động sau duyệt.
4. Nếu cần kiểm tra từ chối, dùng một yêu cầu nhường ca khác và để STAFF-D từ chối.

**Pass:** C/D nhận đúng yêu cầu; không có nhân sự thứ tư được chọn khi yêu cầu đã đủ ba người nhận.

### TC-06 — MGR-01 duyệt và kiểm tra đồng bộ đa tài khoản

1. Quay lại Web profile B. Duyệt yêu cầu nghỉ/điều chỉnh của A, yêu cầu đổi ca A↔B và yêu cầu nhường ca cho C theo thứ tự phù hợp.
2. Sau khi duyệt nhường ca cho C, kiểm tra yêu cầu chờ cùng ca gửi cho B/D chuyển `CANCELLED`.
3. Tải lại lịch của A/B/C/D trên từng Mobile profile và lịch Web/3D của MGR-01.
4. Kiểm tra bảng chấm công, định biên và chi phí/lương dự kiến không còn đếm A ở ca đã nhường.
5. Gửi thông báo thử từ cấu hình thông báo hoặc thao tác quản lý; xác nhận toast trong Web/Mobile và Window Notification nếu trình duyệt đã cấp quyền.

**Pass:** cùng một trạng thái cuối xuất hiện ở tất cả phiên; chỉ một người nhận ca nhường; lịch, 3D và bảng tổng hợp nhất quán.

### TC-07 — ADMIN-01 kiểm tra hậu kiểm và quyền âm tính

1. Quay lại Web profile A. Kiểm tra chi nhánh QA, MGR-01 và bốn STAFF trong danh sách tài khoản/phân công.
2. Kiểm tra MGR-01 vẫn gắn chi nhánh QA; không thay role người dùng từ màn hình sửa hồ sơ.
3. Với STAFF-A, thử mở `/admin`, `/employees`, `/stores` bằng URL trực tiếp. Với MGR-01, thử `/admin` và tạo MANAGER. Với ADMIN-01, thử tạo ADMIN mới.
4. Ghi trạng thái HTTP/UI của mỗi ca âm tính.

**Pass:** tất cả thao tác trái quyền bị chặn phía server; không chỉ ẩn nút ở frontend.

## Bảng theo dõi thực thi một lượt

| ID | Tài khoản thực hiện | Thao tác | Bằng chứng cần lưu | Pass/Fail/Blocked |
| --- | --- | --- | --- | --- |
| TC-01 | MGR-01 | Đăng nhập và bị chặn `/admin` | ảnh route + role | |
| TC-02 | MGR-01 | Tạo A/B/C/D | ảnh danh sách + từng hồ sơ | |
| TC-03 | STAFF-A | Lịch, khả dụng, nghỉ, đổi/nhường ca | ảnh Mobile + mã yêu cầu | |
| TC-04 | STAFF-B | Phản hồi đổi ca | ảnh trạng thái trước/sau | |
| TC-05 | STAFF-C/D | Nhận/từ chối nhường ca | ảnh từng profile | |
| TC-06 | MGR-01 | Duyệt và kiểm tra đồng bộ | ảnh lịch/3D/bảng chấm công | |
| TC-07 | ADMIN-01 | Hậu kiểm và quyền âm tính | ảnh lỗi 403/chuyển hướng | |

Một bước chỉ được đánh dấu **Pass** khi tài khoản vừa tạo đã thực hiện thành công thao tác của mình và tài khoản liên quan nhìn thấy hệ quả. Đánh dấu **Blocked** chỉ cho hạn chế môi trường có thể xác minh, ví dụ GPS/camera/Window Notification chưa được cấp quyền; không thay bằng seed hoặc API thủ công.

## Ma trận kiểm thử nhanh

| Nhóm | ADMIN Web | MANAGER Web | STAFF Mobile |
| --- | --- | --- | --- |
| Đăng nhập, phiên, đăng xuất | Bắt buộc | Bắt buộc | Bắt buộc |
| Chi nhánh, bổ nhiệm MANAGER | Bắt buộc | Không được phép | Không có |
| Tạo STAFF/kỹ năng/hợp đồng | Có thể kiểm tra | Bắt buộc | Không có |
| Lập lịch, định biên, xuất bản | Quan sát | Bắt buộc | Xem lịch cá nhân |
| Không gian 3D | Quan sát | Bắt buộc | Không là phạm vi chính |
| Chấm công, nghỉ, đổi/nhường ca | Theo dõi | Duyệt/đối soát | Bắt buộc tạo/phản hồi |
| Payroll/báo cáo | Kiểm tra quyền | Bắt buộc | Chỉ thu nhập cá nhân nếu được cấp |
| Thông báo, tin nhắn | Bắt buộc | Bắt buộc | Bắt buộc |

## Tiêu chí hoàn tất và bằng chứng

Một lượt đạt khi tất cả checkpoint A–E hoàn thành hoặc được đánh dấu **blocked** kèm nguyên nhân môi trường (GPS, camera, quyền Window Notification), ảnh chụp màn hình, tài khoản liên quan và timestamp. Mỗi lỗi cần ghi: bước tái hiện, vai trò, URL/màn hình, kết quả thực tế, kết quả mong đợi và log console/network đã che thông tin nhạy cảm.

Không coi việc chỉ truy cập được màn hình là pass; mỗi thao tác phải có thay đổi dữ liệu hoặc trạng thái nhìn thấy được. Không dùng tài khoản demo, seed, SQL hoặc chỉnh Local Storage để thay thế luồng tạo tài khoản qua UI.
