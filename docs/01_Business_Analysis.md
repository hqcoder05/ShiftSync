**PHÂN TÍCH NGHIỆP VỤ (BUSINESS ANALYSIS)**

*Đồ án: SynsShift – Hệ thống quản lý ca làm cho cửa hang F&B và bán lẻ*

Tài liệu W2.1 — Module: Business Analysis

# 1. Problem Statement

Trong mô hình bán lẻ/logistics có nhiều cửa hàng, việc xếp lịch làm việc cho nhân viên thường được thực hiện thủ công qua bảng tính hoặc trao đổi trực tiếp giữa Manager và nhân viên. Cách làm này gây ra một số vấn đề thực tế:

* Manager mất nhiều thời gian đối chiếu availability của từng nhân viên để tránh xếp trùng ca hoặc vượt giờ làm quy định.
* Khi nhân viên đột xuất không thể đi làm, việc tìm người thay thế (swap ca) diễn ra thủ công qua tin nhắn, dễ thất lạc thông tin và chậm trễ.
* Việc chấm công bằng giấy hoặc bảng chấm công thủ công dễ xảy ra gian lận (chấm công hộ) và khó tổng hợp chính xác để tính lương.
* Manager không có cái nhìn tổng quan (dashboard) về chi phí nhân sự, số giờ làm theo thời gian thực để ra quyết định vận hành.
* Khi một cửa hàng thiếu nhân sự đột xuất, không có cơ chế điều phối nhân viên hỗ trợ từ cửa hàng khác một cách có kiểm soát.

Đối tượng gặp phải vấn đề này chủ yếu là Quản lý cửa hàng (Manager) — người chịu trách nhiệm xếp lịch và giám sát nhân sự, và Nhân viên (Employee/Staff) — người cần khai báo khung giờ rảnh, biết lịch làm việc được xếp, và được tính lương chính xác. Ứng dụng Employee Scheduling App được xây dựng nhằm số hóa toàn bộ quy trình trên: từ khai báo lịch rảnh (Availability), xếp ca dựa trên lịch rảnh đó (thủ công bởi Manager và tự động bởi hệ thống), trao đổi ca, điều phối nhân sự liên cửa hàng, chấm công bằng QR + định vị, đến tính lương và thống kê — giúp giảm sai sót, tiết kiệm thời gian quản lý và tăng tính minh bạch cho cả hai phía.

**Lưu ý quan trọng về mô hình xếp ca:** Nhân viên **không tự chọn ca làm việc cụ thể**. Nhân viên chỉ đăng ký/khai báo khung giờ rảnh (Availability) trong tuần. Dựa trên Availability đã khai báo, Manager có thể xếp ca thủ công cho từng nhân viên, hoặc hệ thống có thể tự động xếp ca (Auto Scheduling). Việc "chọn ca" chỉ diễn ra gián tiếp thông qua Marketplace (nhận ca trống/đổi ca) sau khi lịch đã được xếp, không phải ở bước đăng ký ban đầu.

# 2. Scope (Phạm vi)

## 2.1. Trong phạm vi (In-scope)

* Quản lý nhân viên, cửa hàng (Employee, Store), với hệ thống phân quyền System Role (Admin/Manager/Staff). [Must]
* Employment Management: quản lý quan hệ làm việc Staff–Store (loại hình, ngày bắt đầu/kết thúc, mức lương, trạng thái). [Must]
* Skill Management: định nghĩa danh mục kỹ năng (Skill) riêng theo từng cửa hàng, gán Skill kèm cấp độ thành thạo và hạn sử dụng (Skill Expiration) cho từng nhân viên. [Must — phần Skill Expiration là Should]
* Khai báo lịch rảnh và Blackout Date (Availability) của nhân viên — nhân viên chỉ đăng ký khung giờ rảnh, không tự chọn ca làm việc cụ thể. [Must]
* Leave Management: xin nghỉ (nghỉ bệnh/nghỉ phép/nghỉ đột xuất), quy trình duyệt, tự động cập nhật Availability. [Should]
* Quản lý ca làm việc: tạo mẫu ca, yêu cầu nhân sự theo Skill, xếp ca (thủ công bởi Manager và/hoặc tự động bởi hệ thống dựa trên Availability), phát hiện xung đột, chốt lịch (Shift Management). [Must]
* Store Configuration: giờ mở/đóng cửa, giờ làm tối đa, thời gian nghỉ tối thiểu, bán kính Geofence, hạn khai báo Availability (Availability Deadline) — không hardcode. [Should]
* Tự động xếp lịch làm việc (Auto Scheduling) dựa trên availability, skill, giờ làm tối đa, khoảng nghỉ tối thiểu, với mô hình chấm điểm (scoring) có trọng số cấu hình được (Scheduler Configuration). [Must — phần Scheduler Configuration linh hoạt là Should]
* Marketplace trao đổi ca: đăng ca trống, đổi ca, phê duyệt. [Must]
* Inter-Store Workforce Sharing: điều phối nhân sự hỗ trợ giữa các cửa hàng khi thiếu người. [Should]
* Chấm công qua QR code kết hợp kiểm tra vị trí (Geofence), có quy trình Attendance Adjustment (yêu cầu điều chỉnh khi quên check-out) qua phê duyệt Manager. [Must]
* Tính lương tự động (bao gồm OT, Holiday Rate) theo Payroll Period (Draft → Confirmed → Paid) và xuất báo cáo lương (PDF/Excel). [Must — Holiday Rate cấu hình được là Should]
* Thông báo đẩy (push notification) qua Firebase, có Notification Preference (bật/tắt theo loại thông báo). [Must — Preference là Could]
* Audit Log cho các thao tác nghiệp vụ quan trọng. [Should]
* Dashboard thống kê KPI cho Manager/Admin (Late Rate, Absent Rate, Coverage, Labor Cost, Overtime, Staff Utilization, Open Shift Count, Swap Count...). [Should — có thể rút gọn còn 3-4 KPI cốt lõi nếu thiếu thời gian]

## 2.2. Ngoài phạm vi (Out-of-scope)

* Tích hợp thanh toán lương thực tế qua ngân hàng/ví điện tử (chỉ dừng ở tính toán và xuất báo cáo).
* Quản lý thuế thu nhập cá nhân hoặc bảo hiểm xã hội chi tiết theo luật.
* Ứng dụng đa ngôn ngữ (chỉ hỗ trợ tiếng Việt trong phạm vi đồ án).
* Tích hợp với hệ thống ERP/kế toán của bên thứ ba.
* Xử lý các trường hợp pháp lý về hợp đồng lao động ngoài phạm vi chấm công – lương cơ bản.

# 3. Quyết định thiết kế: System Role vs Skill

Ban đầu, hệ thống dự kiến gán trực tiếp "Role" (Cashier, Barista, Cook...) cho nhân viên để vừa phân quyền vừa phân công ca. Qua rà soát, nhóm quyết định tách rõ 2 khái niệm này vì chúng phục vụ 2 mục đích khác nhau — đây là cách thiết kế phổ biến trong các hệ thống Workforce Management (WFM) chuyên nghiệp:

| **Khái niệm** | **Mục đích** | **Ví dụ** |
| --- | --- | --- |
| System Role | Phân quyền truy cập hệ thống (Authorization) — cố định, dùng với Spring Security | ROLE\_ADMIN, ROLE\_MANAGER, ROLE\_STAFF |
| Skill | Năng lực chuyên môn dùng để phân công ca (Competency) — linh hoạt, định nghĩa riêng theo từng Store | Cashier, Barista, Cook, Sales, Delivery... |

Lợi ích của cách tách này: một Staff có thể sở hữu nhiều Skill cùng lúc (VD: vừa biết Cashier vừa biết Barista) với các cấp độ thành thạo khác nhau (Skill Level: Beginner/Intermediate/Advanced/Expert), và thuật toán Auto Scheduling chỉ cần tìm người có Skill phù hợp với Skill Requirement của ca — thay vì bị giới hạn cứng bởi một Role duy nhất. Việc này ảnh hưởng trực tiếp đến thiết kế Database (thay bảng EmployeeRole bằng StaffSkill + StoreSkill) và sẽ được phản ánh trong ERD ở bước tiếp theo (W2.2).

# 4. Functional Requirements (Yêu cầu chức năng)

Tổng cộng 40 yêu cầu chức năng, chia theo module (đã cập nhật theo mô hình Skill và bổ sung module Inter-Store Workforce Sharing):

| **Mã** | **Module** | **Mô tả** |
| --- | --- | --- |
| FR-01 | Employee | Hệ thống cho phép Admin/Manager tạo, xem, sửa, xóa (CRUD) hồ sơ nhân viên. |
| FR-02 | Employee | Hệ thống cho phép nhân viên đăng nhập bằng email/mật khẩu và nhận JWT token. |
| FR-03 | Store | Hệ thống cho phép Admin quản lý nhiều cửa hàng (multi-store) và gán nhân viên vào một hoặc nhiều cửa hàng. |
| FR-04 | Skill Management | Hệ thống cho phép Admin/Manager định nghĩa danh mục Skill (VD: Cashier, Barista, Cook, Sales) riêng theo từng Store, và gán một hoặc nhiều Skill kèm cấp độ thành thạo (Skill Level: Beginner/Intermediate/Advanced/Expert) cho từng nhân viên (Staff). |
| FR-04b | System Role | Hệ thống áp dụng 3 System Role cố định (Admin, Manager, Staff) để phân quyền truy cập chức năng, tách biệt hoàn toàn với Skill (năng lực chuyên môn dùng để phân công ca). |
| FR-05 | Availability | Nhân viên có thể khai báo, chỉnh sửa khung giờ rảnh (availability) theo từng ngày trong tuần, bao gồm cả khai báo Blackout Date (ngày không thể làm việc). |
| FR-06 | Shift | Manager có thể tạo mẫu ca làm việc (shift template) gồm tên ca, giờ bắt đầu và kết thúc. |
| FR-07 | Shift | Manager có thể khai báo số lượng nhân sự cần thiết cho từng ca theo Skill (Shift Requirement theo Skill, không còn theo Role). |
| FR-08 | Shift | Nhân viên đăng ký khung giờ rảnh (Availability) trước Availability Deadline; nhân viên không tự chọn ca làm việc cụ thể — việc xếp ca do Manager thực hiện thủ công hoặc do hệ thống thực hiện tự động (Auto Scheduling) dựa trên Availability đã đăng ký. |
| FR-08b | Shift | Manager có thể xếp ca thủ công cho từng nhân viên vào Shift dựa trên Availability, Skill phù hợp và Requirement đang mở của ca đó. |
| FR-09 | Shift | Hệ thống tự động phát hiện và từ chối việc xếp ca (thủ công hoặc tự động) bị trùng giờ hoặc vượt quá số giờ làm tối đa cho phép. |
| FR-10 | Shift | Manager có thể chốt (publish) lịch làm việc của tuần, sau đó lịch chuyển sang trạng thái chính thức. |
| FR-11 | Auto Scheduling | Hệ thống có thể tự động sinh lịch làm việc dựa trên availability, skill phù hợp, giới hạn giờ làm và khoảng nghỉ tối thiểu (rest time), đảm bảo phân bổ công bằng giữa các nhân viên. |
| FR-12 | Marketplace | Nhân viên đã được Assigned có thể gửi yêu cầu đổi ca (swap) với đồng nghiệp đủ điều kiện, hoặc đăng ca lên marketplace nếu ca đó chưa đủ Requirement (open shift). |
| FR-13 | Marketplace | Nhân viên khác có thể nhận ca trống (open shift) theo nguyên tắc First Valid First Served, hoặc chấp nhận yêu cầu đổi ca (swap). |
| FR-14 | Marketplace | Manager phải duyệt (approve/reject) mọi yêu cầu đổi ca hoặc nhận ca trống trước khi có hiệu lực. |
| FR-15 | Attendance | Nhân viên chấm công vào/ra ca bằng cách quét mã QR được hệ thống sinh ra cho ca đó, chỉ trong khung thời gian cho phép quanh giờ bắt đầu ca. |
| FR-16 | Attendance | Hệ thống kiểm tra vị trí GPS của nhân viên khi chấm công, chỉ chấp nhận nếu nằm trong bán kính cho phép quanh cửa hàng (geofence). |
| FR-17 | Payroll | Hệ thống tự động tính lương theo giờ công thực tế đã xác nhận từ dữ liệu chấm công, bao gồm hệ số OT (overtime) theo quy định. |
| FR-18 | Payroll | Hệ thống cho phép xuất bảng lương ra định dạng PDF và Excel; Payroll sau khi xác nhận chỉ Admin mới được chỉnh sửa. |
| FR-19 | Notification | Hệ thống gửi thông báo đẩy (push notification) khi có sự kiện quan trọng: publish schedule, approve/reject swap, open shift mới, nhắc lịch trước ca, payroll hoàn thành. |
| FR-20 | Dashboard | Manager/Admin có thể xem thống kê tổng quan: số nhân sự, tổng giờ làm, chi phí lương theo cửa hàng và theo khoảng thời gian. |
| FR-21 | Inter-Store Workforce Sharing | Manager của Store đang thiếu nhân sự có thể tạo yêu cầu hỗ trợ nhân sự (Workforce Request) và gửi đến Manager của Store khác. |
| FR-22 | Inter-Store Workforce Sharing | Manager của Store nhận yêu cầu có thể chấp nhận, từ chối, hoặc đề xuất nhân viên phù hợp cho yêu cầu đó. |
| FR-23 | Inter-Store Workforce Sharing | Hệ thống chỉ đề xuất nhân viên thỏa Skill phù hợp, không trùng ca, không vượt giờ làm, có Availability và được phép làm việc tại cửa hàng khác. |
| FR-24 | Inter-Store Workforce Sharing | Nhân viên được đề xuất phải xác nhận (accept) trước khi hệ thống cập nhật Assignment sang Store yêu cầu hỗ trợ. |
| FR-25 | Inter-Store Workforce Sharing | Sau khi hoàn tất quy trình, hệ thống tự động cập nhật Shift Assignment, ghi nhận Store làm việc thực tế của ca, và gửi Notification cho các bên liên quan. |
| FR-26 | Inter-Store Workforce Sharing | Hệ thống lưu lại lịch sử điều phối nhân sự liên cửa hàng (Workforce Request History) phục vụ tra cứu và audit. |
| FR-27 | Audit | Hệ thống ghi Audit Log cho mọi thao tác nghiệp vụ quan trọng: Publish Schedule, Assign Shift, Shift Swap, Attendance Adjustment, Payroll Update. |
| FR-28 | Employment Management | Hệ thống lưu quan hệ làm việc (Employment) giữa Staff và Store, gồm employment\_type (Part-time/Full-time/Seasonal/Intern), hourly\_rate, joined\_date, left\_date và status (Active/Inactive/Suspended); một Staff có thể có nhiều bản ghi Employment ở nhiều Store/giai đoạn khác nhau. |
| FR-29 | Contract (mở rộng) | Hệ thống định nghĩa các loại hợp đồng (Contract Type: Part-time/Full-time/Seasonal/Intern), mỗi loại có cấu hình riêng về Max Hour, hệ số OT và mức lương cơ bản. |
| FR-30 | Leave Management | Staff có thể tạo yêu cầu nghỉ (Leave Request) với loại nghỉ: nghỉ bệnh, nghỉ phép, nghỉ đột xuất, kèm khoảng thời gian nghỉ. |
| FR-31 | Leave Management | Manager phê duyệt hoặc từ chối Leave Request; khi được duyệt, hệ thống tự động cập nhật Availability của Staff (đánh dấu không khả dụng) trong khoảng thời gian nghỉ. |
| FR-32 | Store Configuration | Admin/Manager cấu hình theo từng Store: giờ mở/đóng cửa, giờ làm tối đa/tuần, thời gian nghỉ tối thiểu giữa 2 ca, bán kính Geofence, và hạn khai báo Availability (Availability Deadline) — không hardcode trong code. |
| FR-33 | Scheduler Configuration | Admin/Manager cấu hình trọng số (weight) cho thuật toán Auto Scheduling: Fairness Weight, Skill Weight, Hour Weight, Priority Weight, dùng cho mô hình chấm điểm (scoring) khi xếp lịch. |
| FR-34 | Holiday | Admin định nghĩa danh sách ngày lễ (Holiday) và hệ số lương ngày lễ tương ứng (Holiday Rate, VD: 300%/200%) — không hardcode; Payroll tự động áp dụng khi tính lương rơi vào ngày lễ. |
| FR-35 | Skill Expiration | Hệ thống hỗ trợ gán hạn sử dụng (expiration date) cho một số Skill có tính chứng chỉ (VD: Food Safety); Skill hết hạn sẽ không được xét khi Auto Scheduling phân công ca. |
| FR-36 | Attendance Adjustment | Khi nhân viên quên Check-out hoặc chấm công sai, Staff có thể gửi yêu cầu điều chỉnh (Attendance Adjustment Request); dữ liệu Attendance gốc không bị sửa trực tiếp mà phải qua phê duyệt Manager. |
| FR-37 | Payroll Period | Hệ thống quản lý Payroll theo từng kỳ lương (Payroll Period, VD: 01/08–31/08) với trạng thái Draft → Confirmed → Paid; chỉ Payroll ở trạng thái Draft mới được tính lại. |
| FR-38 | Notification Preference | Nhân viên có thể bật/tắt riêng từng loại thông báo (VD: Reminder ON, Open Shift OFF) theo sở thích cá nhân. |
| FR-39 | Dashboard KPI | Dashboard hiển thị các KPI cụ thể: Late Rate, Absent Rate, Coverage, Labor Cost, Working Hour, Overtime, Staff Utilization, Open Shift Count, Swap Count — có thể lọc theo Store và khoảng thời gian. |

# 5. Non-functional Requirements (Yêu cầu phi chức năng)

Tổng cộng 7 yêu cầu phi chức năng, mỗi yêu cầu có tiêu chí đo lường cụ thể:

| **Mã** | **Loại** | **Mô tả & tiêu chí đo lường** |
| --- | --- | --- |
| NFR-01 | Hiệu năng | Các API CRUD cơ bản (Employee, Shift, Store...) phải phản hồi trong vòng dưới 500ms ở điều kiện tải bình thường (≤50 request đồng thời). |
| NFR-02 | Bảo mật | Toàn bộ API (trừ đăng nhập/đăng ký) phải được xác thực bằng JWT; phân quyền theo vai trò (RBAC) áp dụng ở tầng Controller. |
| NFR-03 | Toàn vẹn dữ liệu | Cơ chế khóa (Redis Lock) phải đảm bảo không có 2 nhân viên nhận cùng một ca trống (open shift) cùng lúc, kể cả khi request đồng thời. |
| NFR-04 | Khả năng mở rộng | Kiến trúc hệ thống hỗ trợ nhiều cửa hàng (multi-store, multi-tenant ở mức logic) mà không cần thay đổi schema khi thêm cửa hàng mới. |
| NFR-05 | Độ khả dụng | Hệ thống demo phải hoạt động ổn định (uptime hợp lý) trong suốt thời gian bảo vệ đồ án, có domain HTTPS truy cập được từ bên ngoài. |
| NFR-06 | Khả năng bảo trì | Backend tuân theo kiến trúc phân lớp rõ ràng (Controller–Service–Repository–DTO) để dễ đọc, dễ mở rộng, dễ kiểm thử. |
| NFR-07 | Tính khả dụng trên thiết bị | Ứng dụng di động phải chạy được trên cả Android và iOS thông qua React Native (Expo). |

# 6. Business Rules (Quy tắc nghiệp vụ)

Tổng cộng 57 quy tắc nghiệp vụ (BR-01 đến BR-57), chia theo 22 nhóm chức năng:

## 1. User & Organization

* BR-01: Người dùng phải thuộc một cửa hàng — Mỗi Employee và Manager phải được gán vào ít nhất một Store.
* BR-02: Admin không thuộc cửa hàng cụ thể — Admin có quyền quản lý toàn bộ hệ thống và tất cả Store.
* BR-03: Mỗi Store có ít nhất một Manager — Một Store phải có tối thiểu một Manager chịu trách nhiệm quản lý.
* BR-04: Một nhân viên có thể làm việc tại nhiều cửa hàng — Một Employee có thể được phân công làm việc ở nhiều Store nếu được cấp quyền.

## 2. Skill Management (thay cho Role Management)

* BR-05: Skill được định nghĩa riêng theo từng Store — Mỗi Store có thể tạo danh mục Skill riêng như Cashier, Barista, Cook, Sales.
* BR-06: Staff chỉ được phân công vào Shift nếu sở hữu Skill phù hợp — Staff chỉ được phân công (Assigned) vào Shift nếu sở hữu ít nhất một Skill khớp với Skill Requirement của Shift đó.

## 3. Availability

* BR-08: Employee phải khai báo Availability trước hạn — Employee chỉ được xếp vào Shift sau khi đã khai báo Availability trước Availability Deadline.
* BR-09: Không được xếp ca ngoài Availability — Employee không thể được Manager xếp thủ công hoặc được Auto Scheduling xếp vào Shift nằm ngoài khoảng thời gian Availability đã khai báo.
* BR-10: Blackout Date luôn được ưu tiên — Nếu Employee khai báo Blackout Date thì hệ thống không được phân công bất kỳ Shift nào trong ngày đó.

## 4. Shift Assignment (Xếp ca — do Manager hoặc hệ thống thực hiện)

* BR-11: Availability chỉ được khai báo trước hạn — Employee chỉ được khai báo/chỉnh sửa Availability trước Availability Deadline; nhân viên không tự đăng ký hay tự chọn Shift cụ thể.
* BR-12: Không được xếp trùng ca — Employee không được Manager hoặc Auto Scheduling xếp vào hai Shift có thời gian giao nhau.
* BR-13: Không được vượt giới hạn giờ làm — Tổng số giờ làm sau khi được xếp ca không được vượt giới hạn do Store quy định.
* BR-14: Shift phải còn chỗ — Employee chỉ được xếp vào Shift khi Shift còn Slot phù hợp với Skill của mình.

## 5. Shift Requirement

* BR-15: Mỗi Shift phải có Requirement — Mỗi Shift phải khai báo số lượng nhân viên cần theo từng Skill (VD: Morning Shift — Cashier: 2, Cook: 3, Barista: 1).

## 6. Auto Scheduling

* BR-16: Chỉ xét Employee hợp lệ — Thuật toán Auto Scheduling chỉ xét Employee thỏa mãn: Availability, Skill phù hợp, Working Hour Limit, Rest Time, không trùng ca.
* BR-17: Không phân công trùng ca — Một Employee không được Assigned vào hai Shift trùng thời gian.
* BR-18: Đảm bảo khoảng nghỉ tối thiểu — Khoảng nghỉ giữa hai Shift liên tiếp phải lớn hơn hoặc bằng giá trị cấu hình (ví dụ 8 giờ).
* BR-19: Không vượt giới hạn giờ làm — Sau khi Auto Scheduling hoàn thành, tổng giờ làm của Employee không được vượt giới hạn theo tuần.
* BR-20: Mỗi Shift phải đủ Requirement — Hệ thống ưu tiên phân công đủ số lượng nhân viên theo Skill Requirement trước khi Publish.

## 7. Publish Schedule

* BR-21: Chỉ Manager mới được Publish — Chỉ Manager của Store mới có quyền Publish Schedule.
* BR-22: Sau khi Publish, Employee chỉ được thay đổi thông qua Workflow — Employee không được tự ý sửa Assignment sau khi lịch đã Publish.

## 8. Shift Swap

* BR-23: Chỉ Assigned Employee mới được đổi ca — Chỉ Employee đã được Assigned mới có quyền gửi yêu cầu đổi ca.
* BR-24: Người nhận phải đủ điều kiện — Employee nhận ca phải thỏa mãn: có Skill phù hợp, không trùng ca, không vượt giờ làm, đang Available.
* BR-25: Đổi ca phải được Manager phê duyệt — Yêu cầu Swap chỉ có hiệu lực sau khi Manager Approve.

## 9. Open Shift

* BR-26: Chỉ Shift còn thiếu nhân sự mới trở thành Open Shift — Shift chỉ xuất hiện trong Marketplace nếu chưa đủ Requirement.
* BR-27: Claim Shift theo nguyên tắc First Valid First Served — Employee hợp lệ đầu tiên được Approve sẽ nhận Shift.

## 10. Attendance

* BR-28: Chỉ Check-in trong thời gian cho phép — Employee chỉ được Check-in trong khoảng thời gian cấu hình trước hoặc sau giờ bắt đầu ca.
* BR-29: Chỉ Check-in tại đúng Store — QR Code chỉ hợp lệ khi Employee đang ở trong vùng Geofence của Store.
* BR-30: Mỗi Shift chỉ được Check-in một lần — Employee không được Check-in nhiều lần cho cùng một Shift.
* BR-31: Check-out sau Check-in — Employee chỉ được Check-out khi đã Check-in thành công.

## 11. Payroll

* BR-32: Payroll chỉ tính từ Attendance — Tất cả dữ liệu tính lương phải dựa trên dữ liệu Attendance đã được xác nhận.
* BR-33: OT được tính theo quy định — Giờ làm vượt chuẩn sẽ được tính theo hệ số OT.
* BR-34: Payroll được khóa sau khi xác nhận — Sau khi Payroll được xác nhận, chỉ Admin mới được phép chỉnh sửa.

## 12. Notification

* BR-35: Thông báo được gửi sau các sự kiện quan trọng — Publish Schedule, Approve/Reject Shift Swap, Open Shift, Reminder trước ca, Payroll hoàn thành.

## 13. Audit

* BR-36: Ghi nhận lịch sử thay đổi — Mọi thao tác quan trọng phải được lưu Audit Log (Publish Schedule, Assign Shift, Shift Swap, Attendance Adjustment, Payroll Update).

## 14. Security

* BR-37: Người dùng chỉ được truy cập dữ liệu được phân quyền — Employee chỉ xem dữ liệu của chính mình; Manager chỉ quản lý dữ liệu thuộc Store mình phụ trách; Admin có toàn quyền.

## 15. Data Integrity

* BR-38: Không xóa dữ liệu nghiệp vụ quan trọng — Attendance, Payroll, Shift Assignment và Audit Log không được xóa vật lý (hard delete); hệ thống dùng soft delete để đảm bảo khả năng truy vết.

## 16. Inter-Store Workforce Sharing (module mới)

* BR-39: Manager có thể yêu cầu hỗ trợ nhân sự từ cửa hàng khác — Manager của một Store có thể gửi yêu cầu hỗ trợ nhân sự đến Manager của Store khác khi thiếu nhân sự cho một hoặc nhiều ca làm.
* BR-40: Chỉ Manager cửa hàng nhận mới có quyền phê duyệt — Manager của Store được yêu cầu có quyền: chấp nhận, từ chối, hoặc đề xuất nhân viên phù hợp.
* BR-41: Chỉ nhân viên đủ điều kiện mới được điều phối — Có Skill phù hợp, không trùng ca, không vượt giờ làm, có Availability trong khoảng thời gian yêu cầu, được phép làm việc tại cửa hàng khác (nếu có chính sách).
* BR-42: Nhân viên phải xác nhận trước khi được điều phối — Sau khi hai Manager thống nhất, nhân viên nhận thông báo và phải xác nhận trước khi Assignment được cập nhật.
* BR-43: Lịch làm được cập nhật sau khi hoàn tất quy trình — Shift Assignment được tạo/cập nhật, Store làm việc của ca được ghi nhận, Notification được gửi đến các bên liên quan.

## 17. Employment Management (module mới)

* BR-44: Một Staff có thể có nhiều Employment — Một Staff có thể có nhiều bản ghi Employment ở các Store và giai đoạn (joined\_date/left\_date) khác nhau, nhưng không được có 2 Employment cùng Store trùng khoảng thời gian hiệu lực.
* BR-45: Chỉ Employment ở trạng thái Active mới được xếp lịch — Auto Scheduling và Manager xếp ca thủ công chỉ xét Staff có Employment Active tại Store tương ứng.
* BR-46: Employment Suspended/Inactive không được khai báo Availability hoặc xếp ca mới — Staff có Employment ở trạng thái Suspended hoặc Inactive không được khai báo Availability mới và không được phân công Shift mới, nhưng lịch sử Shift cũ vẫn được giữ nguyên.

## 18. Leave Management (module mới)

* BR-47: Leave Request phải được Manager phê duyệt — Yêu cầu nghỉ chỉ có hiệu lực (cập nhật Availability) sau khi Manager Approve; trạng thái ban đầu là Pending.
* BR-48: Leave đã duyệt tự động chặn Auto Scheduling — Trong khoảng thời gian Leave đã Approved, Auto Scheduling và Manager xếp ca thủ công phải loại Staff đó ra khỏi danh sách hợp lệ, tương tự Blackout Date (BR-10).
* BR-49: Không được xin nghỉ chồng lên ca đã Publish mà không qua Swap — Nếu Staff đã được Assigned vào Shift đã Publish trong khoảng thời gian xin nghỉ, hệ thống phải cảnh báo Manager để xử lý song song với luồng Shift Swap/Open Shift.

## 19. Store Configuration & Scheduler Configuration (module mới)

* BR-50: Mọi tham số vận hành phải cấu hình được theo từng Store — Giờ mở/đóng cửa, Max Hour, Rest Time tối thiểu, bán kính Geofence, Availability Deadline không được hardcode; thay đổi cấu hình chỉ áp dụng cho lịch chưa Publish.
* BR-51: Trọng số Scheduler Configuration phải có tổng hợp lệ — Fairness Weight, Skill Weight, Hour Weight, Priority Weight dùng trong mô hình chấm điểm Auto Scheduling phải được validate (VD: tổng = 100%) trước khi lưu.

## 20. Holiday & Skill Expiration (module mới)

* BR-52: Ngày lễ áp dụng Holiday Rate tự động — Nếu một Shift rơi vào ngày trong danh sách Holiday, Payroll phải áp dụng Holiday Rate cấu hình sẵn (VD: 300%/200%) thay cho mức lương giờ thông thường.
* BR-53: Skill hết hạn không được xét khi phân công — Nếu Skill của Staff có Expiration Date và đã qua hạn, Auto Scheduling và Manager xếp ca thủ công không được xét Skill đó khi kiểm tra điều kiện phù hợp.

## 21. Attendance Adjustment (module mới)

* BR-54: Không sửa Attendance trực tiếp — Mọi thay đổi trên dữ liệu Attendance (VD: quên Check-out) phải đi qua Attendance Adjustment Request, không được UPDATE trực tiếp bản ghi Attendance gốc.
* BR-55: Attendance Adjustment phải được Manager phê duyệt — Yêu cầu điều chỉnh chỉ có hiệu lực sau khi Manager Approve, và phải được ghi vào Audit Log (liên kết BR-36).

## 22. Payroll Period (module mới)

* BR-56: Payroll phải gắn với một Payroll Period — Mỗi bản ghi Payroll phải thuộc về đúng 1 kỳ lương (VD: 01/08–31/08), không được tính lương ngoài kỳ đã định nghĩa.
* BR-57: Payroll chỉ được tính lại khi ở trạng thái Draft — Payroll Period đi qua 3 trạng thái Draft → Confirmed → Paid theo đúng thứ tự; chỉ Draft mới cho phép tính lại tự động, Confirmed/Paid tuân theo BR-34 (chỉ Admin được sửa).

# 7. Trạng thái hệ thống (Status / Enum Catalog)

Danh mục các state machine chính trong hệ thống — dùng làm cơ sở thiết kế Enum trong Database và State Diagram (UML) ở bước tiếp theo:

| **Entity** | **Các trạng thái (theo thứ tự vòng đời)** |
| --- | --- |
| Shift | Draft → Published → Completed / Cancelled |
| Shift Swap Request | Pending → Approved / Rejected → Cancelled (nếu hủy trước khi duyệt) |
| Open Shift Claim | Pending → Approved / Rejected |
| Leave Request | Pending → Approved / Rejected |
| Attendance | Present / Late / Absent / EarlyLeave |
| Attendance Adjustment Request | Pending → Approved / Rejected |
| Employment | Active / Inactive / Suspended |
| Workforce Request | Pending → Accepted / Rejected → Confirmed (sau khi Staff xác nhận) |
| Payroll Period | Draft → Confirmed → Paid |

# 8. Mô hình chấm điểm Auto Scheduling (Scoring Model)

Thay vì chỉ lọc theo điều kiện cứng (hard constraint), thuật toán Auto Scheduling áp dụng thêm mô hình chấm điểm (soft scoring) để chọn ứng viên tốt nhất khi có nhiều Staff cùng thỏa điều kiện — giúp thuật toán có chiều sâu hơn khi trình bày trong báo cáo/bảo vệ:

## 8.1. Thứ tự ràng buộc cứng (Hard Constraints — lọc trước)

Priority → Availability → Required Skill → Skill Level → Working Hours → Fair Distribution → Rest Time → Conflict

## 8.2. Trọng số chấm điểm (Soft Scoring — dùng để xếp hạng ứng viên đã qua lọc)

| **Tiêu chí** | **Trọng số đề xuất** | **Ý nghĩa** |
| --- | --- | --- |
| Availability | 30% | Ưu tiên Staff có khung giờ rảnh khớp sát với ca, không chỉ "khả dụng" mà còn "phù hợp nhất" |
| Skill | 30% | Ưu tiên Staff có Skill Level cao hơn cho ca yêu cầu chuyên môn |
| Working Hour | 20% | Ưu tiên Staff chưa đạt giờ làm tối đa trong tuần, tránh dồn giờ vào 1 người |
| Rest Time | 10% | Ưu tiên Staff có khoảng nghỉ an toàn hơn mức tối thiểu bắt buộc |
| Fairness | 10% | Ưu tiên Staff có tổng số ca được phân công trong tháng thấp hơn, đảm bảo công bằng |

Trọng số này nên được lưu trong Scheduler Configuration (FR-33) để Admin/Manager điều chỉnh theo thực tế vận hành, thay vì hardcode trong thuật toán.

# 9. Dashboard KPI

Các chỉ số cụ thể Dashboard phải hiển thị (chi tiết hóa từ FR-39):

| **KPI** | **Ý nghĩa** |
| --- | --- |
| Late Rate | Tỷ lệ % lượt check-in trễ trên tổng số ca |
| Absent Rate | Tỷ lệ % ca không có mặt trên tổng số ca được phân công |
| Coverage | Tỷ lệ % Shift Requirement được đáp ứng đủ nhân sự |
| Labor Cost | Tổng chi phí nhân sự theo Store/khoảng thời gian |
| Working Hour | Tổng giờ công thực tế theo Store/nhân viên |
| Overtime | Tổng giờ OT phát sinh |
| Staff Utilization | Tỷ lệ % giờ làm thực tế trên giờ làm tối đa được phép |
| Open Shift Count | Số lượng ca trống đang mở trên Marketplace |
| Swap Count | Số lượng yêu cầu đổi ca trong kỳ |

# 10. Phân loại ưu tiên triển khai (Must / Should / Could)

Vì timeline thực tế của đồ án không còn tuần đệm (deadline bảo vệ 21/09), các module được phân loại theo mức độ ưu tiên để dễ quyết định cắt giảm nếu tiến độ trễ (tham chiếu Kế hoạch cắt giảm phạm vi trong Phan\_Tich\_Rui\_Ro\_Tien\_Do.md):

| **Mức độ** | **Module / Tính năng** | **Ghi chú** |
| --- | --- | --- |
| Must | Employee, Store, Skill cơ bản, Availability, Shift Management, Auto Scheduling (hard constraint), Marketplace, Attendance (QR), Payroll cơ bản | Xương sống chứng minh đề tài — không được cắt |
| Should | Employment Management, Leave Management, Store Configuration, Inter-Store Workforce Sharing, Audit Log, Attendance Adjustment, Payroll Period, Dashboard KPI đầy đủ | Làm hệ thống giống WFM thực thụ — nên làm nếu còn thời gian, có thể rút gọn nếu trễ |
| Could | Scoring Model đầy đủ (5 tiêu chí trọng số), Skill Expiration, Holiday Rate cấu hình động, Notification Preference, Scheduler Configuration linh hoạt | Điểm cộng cho chiều sâu kỹ thuật khi bảo vệ — cắt đầu tiên nếu thiếu thời gian, có thể thay bằng giá trị mặc định cố định |

*— Hết tài liệu W2.1 (v3 — bổ sung Employment, Leave, Store/Scheduler Config, Attendance Adjustment, Payroll Period, Enum Catalog, Scoring Model, Dashboard KPI, Phân loại ưu tiên) —*