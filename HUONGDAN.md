# ShiftSync — Reconstructed AI Coding Log

> Đây là **RECONSTRUCTION / SIMULATION** dựa trên source code, migration, API,
> frontend, mobile, tests, git history và các audit hiện có. Các prompt dưới
> đây không phải transcript nguyên văn của người dùng. Ngày không có bằng chứng
> trực tiếp được đánh dấu `[RECONSTRUCTED DATE]`.

> **HISTORICAL CONTENT NOTICE — 2026-09-20:** Phần checklist/roadmap cũ bên
> dưới được giữ lại để bảo toàn audit trail. Không dùng các mục “CẦN LÀM” cũ
> làm trạng thái hiện tại. Prompt playbook và contract hiện tại bắt đầu ở
> phần `CURRENT GUIDE — 2026-09-20` bên dưới.

1. Những file cần đính kèm (Attach Files)
Bạn hãy đảm bảo 3 file này luôn được cập nhật mới nhất trong repository và đính kèm vào chat mới:
01_Business_Analysis.docx (File gốc cung cấp 40 FRs, 57 BRs, Scoring Model, Enum Catalog...).
README.md (Chốt phiên bản hiện tại: Spring Boot 4.1.1, Java 21, React 19.2.x, RN Expo 57, PostgreSQL 16.4, Redis 7.4...).
API_Draft.md (Cấu trúc Modular Architecture và danh sách 25+ REST API endpoints).
(Tùy chọn nếu đã code): Chụp ảnh hoặc copy nội dung file V1__init_schema.sql (Flyway) hoặc docker-compose.yml nếu đang hỏi về Database/Hạ tầng.
2. Đoạn Prompt Khởi Động (Copy và Paste vào Chat mới)
Hãy copy toàn bộ đoạn text trong khung dưới đây, điền thông tin nhiệm vụ hiện tại của bạn vào chỗ
Chào bạn, tôi đang làm đồ án tốt nghiệp "ShiftSync (SynsShift) - Hệ thống quản lý ca làm cho F&B và bán lẻ".

Dưới đây là bối cảnh dự án và các quyết định kỹ thuật đã chốt. Hãy đọc kỹ các file đính kèm (01_Business_Analysis.docx, README.md, API_Draft.md) và ghi nhớ các quy tắc bất di bất dịch sau trước khi trả lời bất kỳ câu hỏi nào của tôi:

=== 📌 QUY TẮC BẤT DI BẤT DỊCH (CONTEXT) ===
1. Tech Stack: Backend dùng Spring Boot 4.1.1 + Java 21. Frontend Web dùng React 19 + Vite + Three.js (R3F) cho Dashboard 3D. Mobile dùng React Native (Expo SDK 57). DB dùng PostgreSQL 16.4 + Redis 7.4 (cho Distributed Lock).
2. Kiến trúc: Backend theo Modular Monolith (com.shiftsync.{module}.{layer}). Đã setup xong Docker Compose và Actuator Health Check.
3. Nghiệp vụ đặc thù:
   - Đăng nhập bằng CCCD (12 số) thay vì Email.
   - Tách biệt System Role (Admin/Manager/Staff) và Skill (Barista/Cashier...).
   - Availability = Khung giờ rảnh (không khai = bận). Blackout Date = Bận cả ngày.
   - Open Shift dùng Redis Lock (SETNX) để chống race condition (First Valid First Served).
   - Auto Scheduling dùng Hard Filter (8 bước) + Soft Scoring (5 tiêu chí).

=== 🎯 NHIỆM VỤ HIỆN TẠI CỦA TÔI ===
Hiện tại tôi đang ở Tuần [Điền số tuần, VD: 3].
Tôi cần bạn hỗ trợ tôi làm nhiệm vụ: [Điền nhiệm vụ cụ thể, VD: Viết code JwtTokenProvider và SecurityConfig cho module Auth / Hoặc: Vẽ Sequence Diagram cho luồng Auto Scheduling / Hoặc: Viết code Entity và Flyway migration cho bảng User và Store].

=== ⚠️ YÊU CẦU ĐẦU RA ===
- Code phải tuân thủ đúng cấu trúc package đã chốt trong API_Draft.md.
- Giải thích ngắn gọn logic nghiệp vụ bám sát các mã BR (Business Rules) trong file Business Analysis.
- Nếu có code, hãy cung cấp đầy đủ đường dẫn file (VD: src/main/java/com/shiftsync/auth/service/AuthService.java).

Bạn đã hiểu rõ bối cảnh chưa? Nếu hiểu rồi, hãy bắt đầu thực hiện nhiệm vụ hiện tại của tôi.
TỔNG HỢP TIẾN ĐỘ DỰ ÁN (Tính đến thời điểm hiện tại)
Để bạn dễ dàng theo dõi mình đang đứng ở đâu, đây là checklist những gì chúng ta ĐÃ LÀM XONG và những gì CẦN LÀM TIẾP:
✅ ĐÃ HOÀN THÀNH (Tuần 1 & Tuần 2)
Phân tích nghiệp vụ (W2.1): Đã có file 01_Business_Analysis.docx hoàn chỉnh (40 FRs, 57 BRs, Scoring model, Enums).
Use Case Diagram: Đã chốt 27-35 UCs, vẽ bằng PlantUML/Draw.io (Lưu ý: Login dùng CCCD, Admin tạo user bằng CCCD).
Activity & Sequence Diagrams: Đã có code PlantUML cho 3 luồng chính (Login CCCD, Shift Registration có Redis Lock, Auto Scheduling Async).
Class, Component, Deployment Diagrams: Đã có code PlantUML khớp với kiến trúc Modular và Docker.
Chốt Tech Stack (README.md): Spring Boot 4.1.1, React 19, RN Expo 57...
Thiết kế Backend (API_Draft.md): Cấu trúc 13 modules và 25+ API endpoints.
Setup Hạ tầng (Tuần 3): Đã tạo project Spring Boot 4.1.1 và cấu hình database/Redis. Các kết quả `docker-compose up` trong tài liệu này là historical; fresh PostgreSQL/Redis integration vẫn là verification gap trong release gate.
Cập nhật pom.xml: Đã sửa lỗi dependency test của Spring Initializr, thêm JJWT, Springdoc, Flyway, Validation.
🚧 CẦN LÀM TIẾP (Tuần 3 & Tuần 4 - Core Backend)
Shared Module: Viết GlobalExceptionHandler, ApiResponse wrapper chuẩn.
Security Config: Viết SecurityConfig.java (mở khóa /actuator/**, /api/v1/auth/**, cấu hình CORS).
Auth Module: Viết JwtTokenProvider, User Entity, AuthService (Login bằng CCCD), AuthController.
Database Migration: Viết các file Flyway tiếp theo (V2__create_stores.sql, V3__create_employees.sql...).
Store & Employee Modules: Code CRUD cơ bản.
📅 LỘ TRÌNH CÁC TUẦN SAU
Tuần 5: Auto Scheduling Algorithm (Hard Filter + Soft Scoring) + Shift Management.
Tuần 6: Marketplace (Redis Lock) + Attendance (QR + Geofence Haversine).
Tuần 7: Payroll Engine + Notification (FCM) + Frontend Web/Mobile tích hợp API.
Tuần 8: Dashboard 3D (Three.js) + Testing + Hoàn thiện báo cáo + Deploy.
💡 Mẹo nhỏ cho bạn:
Khi AI trả lời, nếu nó đưa ra code dùng email thay vì cccd, hoặc dùng Spring Boot 3.x, hoặc quên mất Redis Lock... bạn chỉ cần nhắc lại: "Nhớ lại rule số 3 và số 1 trong prompt khởi động đi!". AI sẽ tự động sửa lại ngay lập tức.
Chúc bạn có những phiên code thật năng suất! Bạn muốn bắt đầu nhiệm vụ tiếp theo (Viết Security Config & JWT) ngay bây giờ luôn không?
> # CURRENT GUIDE — 2026-09-20
>
> File này là prompt playbook để tái tạo ShiftSync theo trạng thái đã xác
> minh. Các checklist/roadmap bên dưới phần này là **HISTORICAL**; không dùng
> chúng để kết luận rằng các hạng mục cũ vẫn còn phải triển khai.
>
> Trạng thái hiện tại: **RELEASE READY — FREEZE APPROVED WITH DOCUMENTED
> VERIFICATION GAPS**. Xem `SHIFTSYNC_CURRENT_SYSTEM_STATUS.md` trước khi
> bắt đầu một task mới.

# Prompt Playbook tái tạo ShiftSync

## Cách sử dụng

Mỗi prompt dưới đây là một template độc lập. Khi chạy prompt, luôn đính kèm
`README.md`, `README.md`, `API_LIST.md`, `docs/01_Business_Analysis.md` và
`SHIFTSYNC_CURRENT_SYSTEM_STATUS.md`. Chỉ triển khai một prompt mỗi lần, đọc
diff trước khi chuyển sang prompt tiếp theo.

Quy tắc chung cho mọi prompt:

- Backend là source of truth cho business data và authorization.
- Không mock/fake dữ liệu runtime; không tạo API mới nếu endpoint đã tồn tại.
- Không sửa business rule chỉ để làm test xanh.
- Không sửa file ngoài scope; không `git reset`, `git clean` hoặc `git push`.
- Trước khi sửa: trace UI/API/service/DTO/entity/test và ghi root cause.
- Sau khi sửa: chạy test phù hợp, báo file thay đổi và verification gap.

## Prompt 0 — Khởi tạo repository

```text
Bạn là Senior Full-Stack Engineer xây dựng ShiftSync từ repository hiện tại.
Đọc README.md, README.md, API_LIST.md, docs/01_Business_Analysis.md và
SHIFTSYNC_CURRENT_SYSTEM_STATUS.md. Lập inventory backend, web, mobile,
Flyway migration và test trước khi viết code. Không tạo mock data, không đổi
API contract, không sửa database thật. Nếu một contract chưa được định nghĩa,
dừng ở báo cáo CONTRACT REQUIRED thay vì tự chọn policy.
```

## Prompt 1 — Backend nền tảng và Auth/RBAC

```text
Implement hoặc audit backend Spring Boot 4.1.1/Java 21 theo modular monolith
com.shiftsync.{module}.{layer}. Dùng PostgreSQL + Flyway + Redis theo config
hiện có. Trace User, Employment, Store, JWT, SecurityContext và RBAC.
Đăng nhập và identity phải theo API thực tế hiện tại; không đoán field.
Viết test cho authenticated, unauthenticated, wrong role, wrong store và
wrong staff identity. Không sửa API contract hoặc seed data. Chạy test class
liên quan rồi full Maven test.
```

## Prompt 2 — Domain CRUD và migration

```text
Trước tiên đọc entity, repository, service, controller, DTO và migration gần
nhất. Chỉ thêm CRUD/migration khi requirement và API contract đã có bằng chứng.
Kiểm tra foreign key, unique constraint, soft delete, ownership và validation.
Migration phải idempotent theo Flyway numbering, không chạy trên production
database trong task này. Thêm regression test cho constraint thực sự yêu cầu;
không tự tạo schema rule mới.
```

## Prompt 3 — Availability, Leave và hard constraints

```text
Trace Availability → Leave/Blackout → AutoSchedule. Availability là HARD
CONSTRAINT ONLY; candidate hợp lệ nhận availabilityScore = 1.0. Giữ hỗ trợ
overnight/date-aware interval đã được sửa. Kiểm tra skill expiry, approved
leave, blackout, overlap, minimum rest, weekly/contract limits. Nếu phát hiện
lỗi, tái hiện bằng test trước rồi sửa tối thiểu. Không biến availability thành
soft preference và không thiết kế công thức mới.
```

## Prompt 4 — AutoSchedule và coverage

```text
Audit real AutoScheduleService: candidate filtering, canonical ordering, MRV,
scoring, mutable state, Local Repair, persistence và result DTO. Contract là
hard constraints → coverage rescue → soft fairness/score. Requirement coverage
phải match đúng required skill, staff skill, zone và workstation; assignment
không được cover sai nhiều requirement. MANUAL và OPEN_SHIFT được bảo vệ;
chỉ AUTO được cleanup khi rerun. Không gọi scheduler là global optimizer.
```

## Prompt 5 — Fairness, workforce sharing và spatial

```text
Cross-store workforce sharing được phép khi workflow/authorization cho phép;
global employee workload đóng góp vào fairness. Không cấm staff chỉ vì có
employment ở store khác. Spatial allocation là dimension riêng với staffing
coverage; FULLY_COVERED + PARTIAL spatial là trạng thái hợp lệ. Không merge hai
status và không redesign fairness cap. Kiểm tra deterministic ordering bằng
seed/state giống nhau.
```

## Prompt 6 — Marketplace/Open Shift

```text
Trace Marketplace open shift → eligibility → claim → backend assignment →
/api/users/me/shifts. Dùng đúng shiftId/marketplaceShiftId, payload và
assignment source OPEN_SHIFT của API hiện có. Kiểm tra duplicate claim,
capacity, availability, skill, work-hour limit, store/workforce authorization
và refresh state. Không nhầm flow này với Workforce Proposal accept/reject.
Nếu lỗi, thêm log tạm để chứng minh handler/service/API/response rồi remove log.
```

## Prompt 7 — Attendance, Payroll và Profile

```text
Attendance và Payroll phải lấy dữ liệu backend thật. Payroll chỉ render
payslip từ /api/users/me/payslips; nếu payslips[] rỗng thì hiển thị empty state,
không tính estimated salary từ shifts. Profile lấy current authenticated user;
không hardcode tên/email/avatar/role/store. Kiểm tra loading, empty, error,
refresh và protected fields. Không sửa backend calculation hoặc DTO.
```

## Prompt 8 — Web integration

```text
Audit Web theo flow screen → service → endpoint → DTO → render. Đối chiếu
business behavior với backend và UI behavior với component hiện tại. Chỉ sửa
functional defect đã chứng minh; không redesign. Không gọi runtime PASS nếu
chưa có authenticated smoke evidence. Báo rõ PASS, FAIL hoặc VERIFICATION GAP.
```

## Prompt 9 — Mobile integration

```text
Audit Mobile Login, Profile, Dashboard, Schedule, Attendance, Marketplace,
Payroll, Availability và Leave. Không dùng mock/fallback business data. Trace
button → handler → service → endpoint → response → state refresh. Giữ layout
và navigation hiện tại. Chỉ sửa minimal root cause, xử lý 400/403/409/500 và
network error. Nếu không chạy được Expo/device thật, ghi VERIFICATION GAP.
```

## Prompt 10 — Test hardening

```text
Chạy trước mvn -q clean test và mvn -q -DskipTests package. Inventory mọi test,
failure, error và skip. Không disable/delete/lower assertion. Phân biệt production
bug, stale test, fixture, environment, isolation, race và time dependency.
Chỉ thêm integration/E2E khi infrastructure thật (PostgreSQL/Redis) sẵn sàng;
không gọi unit/mock test là real integration.
```

## Prompt 11 — Documentation synchronization

```text
Tìm toàn bộ *.md, phân loại current/historical/audit/spec/seed/workflow/draft.
Giữ nguyên audit trail. Cập nhật README và SHIFTSYNC_CURRENT_SYSTEM_STATUS.md
theo evidence hiện tại: 384 tests, 381 executed PASS, 0 fail, 0 error, 3
skipped; PostgreSQL/Redis fresh integration và final Web/Mobile smoke là GAP;
V39 là intended production migration cần review. Không sửa source/test/config.
```

## Prompt 12 — Final freeze gate

```text
Đọc current status và git diff. Chỉ tìm P0/P1 blocker thực sự. P2/P3 và
verification gap không tự động block freeze. Kiểm tra build, tests, migrations,
AUTO/MANUAL/OPEN_SHIFT preservation, hard constraints và deterministic result.
Không chạy scheduler mutation hoặc SQL destructive. Kết luận đúng một trong:
RELEASE BLOCKED — P0/P1 FOUND; RELEASE READY — FREEZE APPROVED; hoặc RELEASE
READY — FREEZE APPROVED WITH DOCUMENTED VERIFICATION GAPS.
```

## Trình tự tái tạo được khuyến nghị

1. Đọc và chốt business contract/documentation.
2. Khởi tạo backend, Flyway, PostgreSQL/Redis và security.
3. Implement domain/API theo migration và DTO đã xác định.
4. Implement Availability/Leave/Shift/Assignment.
5. Implement AutoSchedule, coverage, Local Repair và spatial.
6. Implement Marketplace, Attendance, Payroll và Profile.
7. Bind Web/Mobile vào API thật, không mock.
8. Chạy unit/controller tests, sau đó integration nếu infrastructure có thật.
9. Đồng bộ Markdown và chạy release freeze gate.

Các prompt trên mô tả quy trình tái tạo theo contract hiện tại; chúng không
thay thế source code, migration, seed hoặc bằng chứng runtime.

# Timeline prompt mô phỏng — 21/07/2026 → 20/09/2026

> Đây là chuỗi prompt mô phỏng được xây dựng từ source code, test và tài liệu
> hiện tại để tái hiện quá trình phát triển ShiftSync. Đây không phải bản chép
> lại các prompt lịch sử nguyên văn và không phải bằng chứng rằng mọi bước đã
> từng được thực hiện đúng vào ngày được ghi.

## GIAI ĐOẠN 01 — Discovery và Architecture

# PROMPT 01

## Ngày

21/07/2026

## Giai đoạn

Discovery, business analysis và architecture.

## Mục tiêu

Xác định actors, phạm vi MVP, module và source of truth.

## Bối cảnh

Project gần như bắt đầu từ đầu; chưa được viết frontend fake data.

## Prompt dành cho Coding Agent

```text
Phân tích bài toán ShiftSync cho chuỗi F&B/bán lẻ. Xác định ADMIN, MANAGER,
STAFF; Store, User, Employment, Contract, Skill, Availability, Leave, Shift,
Assignment, Attendance, Payroll và Notification. Đề xuất modular monolith
Spring Boot backend, PostgreSQL/Flyway, Redis cho concurrency, React Web và
React Native/Expo Mobile. Viết business rules, dependency map, API boundary và
MVP scope. Không viết code và không tạo dữ liệu giả.
```

# PROMPT 02

## Ngày

21/07/2026

## Giai đoạn

Architecture và API contract.

## Mục tiêu

Chốt package/layer, DTO và security boundary trước database.

## Bối cảnh

Business entities đã được xác định ở Prompt 01.

## Prompt dành cho Coding Agent

```text
Thiết kế modular monolith theo com.shiftsync.{module}.{layer}. Tách entity,
repository, service, controller, DTO và exception handling. Xác định API cho
auth, users, stores, employment, skills, availability, leave, shifts,
assignments, marketplace, workforce, attendance, payroll, scheduler và
spatial. JWT là nguồn identity; backend phải kiểm tra ownership/store scope.
Tạo API draft, không triển khai frontend và không hardcode business data.
```

## GIAI ĐOẠN 02 — Database và Backend Foundation

# PROMPT 03

## Ngày

22/07/2026

## Giai đoạn

Database model và Flyway.

## Mục tiêu

Xây schema theo dependency thay vì tạo bảng rời rạc.

## Bối cảnh

Architecture và API boundary đã có; chưa có migration production.

## Prompt dành cho Coding Agent

```text
Thiết kế initial schema cho staff/user identity, role, store, skill,
employment, contract, availability, leave, blackout, shift, skill requirement,
shift assignment, attendance, payroll/payslip, notifications, store layout,
store zones và workforce entities. Tách migration theo dependency và khóa
ngoại. Chỉ dùng tên/cột có trong business contract; nếu chưa xác minh version,
ghi [Mô phỏng] thay vì giả vờ biết migration lịch sử. Không chạy migration trên
database thật.
```

# PROMPT 04

## Ngày

22/07/2026

## Giai đoạn

Backend foundation.

## Mục tiêu

Khởi tạo Spring Boot, database config, Flyway, validation và error handling.

## Bối cảnh

Schema dependency đã được thiết kế.

## Prompt dành cho Coding Agent

```text
Khởi tạo backend Java 21/Spring Boot 4.1.1 với JPA, Flyway, PostgreSQL,
Redis, validation, actuator và OpenAPI theo pom hiện tại. Tạo cấu trúc module,
GlobalExceptionHandler, response/error contract và health checks. Không thêm
dependency tùy ý, không bật ddl-auto tạo schema, không seed dữ liệu runtime.
Viết smoke/unit tests cho foundation.
```

## GIAI ĐOẠN 03 — Authentication, RBAC và Staff

# PROMPT 05

## Ngày

23/07/2026

## Giai đoạn

Authentication và session.

## Mục tiêu

Xây login, JWT, refresh/session và current-user identity.

## Bối cảnh

Backend foundation đã chạy; User/Staff entity là source of truth.

## Prompt dành cho Coding Agent

```text
Implement authentication theo API contract hiện tại: password hashing, JWT,
refresh/session nếu endpoint tồn tại, logout/revocation và current user. Không
hardcode credential, không trust staffId từ client khi JWT đã có identity. Trả
400/401/409 đúng contract, thêm tests cho login hợp lệ/sai, token hết hạn,
refresh, logout và account isolation.
```

# PROMPT 06

## Ngày

24/07/2026

## Giai đoạn

RBAC, Store isolation và Staff profile.

## Mục tiêu

Ngăn truy cập sai role/store/staff.

## Bối cảnh

Authentication đã cung cấp SecurityContext.

## Prompt dành cho Coding Agent

```text
Implement ADMIN/MANAGER/STAFF authorization và store/staff isolation cho các
controller hiện có. ADMIN quản lý user/store; MANAGER quản lý phạm vi store;
STAFF chỉ xem/chỉnh sửa dữ liệu được phép của chính mình. Kiểm tra 401, 403,
404 và không leak protected data. Thêm controller/security tests; không bypass
security để tiện cho UI.
```

# PROMPT 07

## Ngày

25/07/2026

## Giai đoạn

Users, Employment, Contract và Skills.

## Mục tiêu

Hoàn thiện staff eligibility data.

## Bối cảnh

RBAC đã bảo vệ CRUD; scheduler chưa dùng các domain này.

## Prompt dành cho Coding Agent

```text
Implement User profile, Employment/store membership, Contract limits, Skill và
StaffSkill với level/expiration theo entity hiện có. Không tự tạo effectiveFrom
hoặc duplicate policy mới. Validation phải ngăn staff inactive hoặc skill hết
hạn được coi là eligible. Thêm tests ownership, expiry và protected fields.
```

## GIAI ĐOẠN 04 — Availability, Leave và Shift

# PROMPT 08

## Ngày

26/07/2026

## Giai đoạn

Availability, Leave và Blackout.

## Mục tiêu

Xây dữ liệu làm nền cho hard filtering.

## Bối cảnh

Staff, employment, contract và skills đã có.

## Prompt dành cho Coding Agent

```text
Implement Availability CRUD, Leave Request lifecycle và BlackoutDate theo API
hiện có. Availability không khai báo nghĩa là bận; validate dayOfWeek và thời
gian; leave được duyệt phải ảnh hưởng blackout/scheduler theo contract. Giữ
owner isolation, overlap/entitlement rules và test empty/error/approval. Không
để frontend tự làm source of truth.
```

# PROMPT 09

## Ngày

27/07/2026

## Giai đoạn

Store, Layout, Zone và Shift domain.

## Mục tiêu

Tạo shifts có requirement và không gian hợp lệ.

## Bối cảnh

Availability/leave đã có; chưa có lịch làm việc.

## Prompt dành cho Coding Agent

```text
Implement Store configuration, StoreLayout, StoreZone, Shift, Shift status,
ShiftSkillRequirement và ShiftAssignment. Preserve assignment source MANUAL,
AUTO và OPEN_SHIFT. Shift phải có store, date, start/end và required headcount;
requirement phải giữ skill/zone/workstation identity. Thêm tests overlap,
ownership và requirement matching.
```

# PROMPT 10

## Ngày

28/07/2026

## Giai đoạn

Demand Planning và coverage.

## Mục tiêu

Liên kết demand với canonical shift và scheduler requirement.

## Bối cảnh

Shift/requirements đã tồn tại; chưa có auto scheduling.

## Prompt dành cho Coding Agent

```text
Trace demand planning implementation hiện có. Nếu demand được lưu qua shift và
ShiftSkillRequirement thì dùng đúng mô hình đó; không bịa bảng HeadcountQuota.
Đảm bảo required count, requirement identity, zone/workstation và shortage/
coverage DTO nhất quán. Viết tests zero, partial và fully covered.
```

## GIAI ĐOẠN 05 — Scheduler và AutoSchedule

# PROMPT 11

## Ngày

29/07/2026

## Giai đoạn

Scheduler cơ bản và hard filtering.

## Mục tiêu

Tạo pipeline candidate → assignment tối thiểu.

## Bối cảnh

Real shifts, requirements, staff skills và availability đã có.

## Prompt dành cho Coding Agent

```text
Implement AutoScheduleService theo pipeline hard filter trước, scoring sau.
Candidate phải có skill phù hợp/còn hạn, availability, không leave/blackout,
không overlap, đủ rest, không vượt weekly/contract limits và được phép làm tại
store/workforce flow. Không gán candidate không hợp lệ chỉ để đạt coverage.
```

# PROMPT 12

## Ngày

30/07/2026

## Giai đoạn

Availability interval và overnight.

## Mục tiêu

Xử lý ngày/giờ qua midnight đúng theo LocalDateTime.

## Bối cảnh

Scheduler ban đầu đã có nhưng interval overnight chưa được audit đầy đủ.

## Prompt dành cho Coding Agent

```text
Viết regression tests cho Availability 20–23 vs Shift 22–06 (reject), 22–06
vs 22–06 (accept), 23–02 nằm trong 22–06 (accept) và các biên không giao nhau.
Audit date-aware LocalDateTime interval, sửa tối thiểu nếu test chứng minh lỗi.
Không biến availability thành soft score. Ghi đây là [Mô phỏng lịch sử phát
triển] P1-A và xác nhận regression.
```

# PROMPT 13

## Ngày

31/07/2026

## Giai đoạn

MRV, scoring và fairness.

## Mục tiêu

Xếp candidate hợp lệ theo objective mềm nhưng không phá hard constraints.

## Bối cảnh

Hard filtering đã ổn định.

## Prompt dành cho Coding Agent

```text
Thêm MRV (candidate count trước), skill/hour/rest/fairness scoring và soft
fairness cap. Fairness là selection concern, không phải global optimizer.
Availability sau khi eligible có score 1.0. Global employee workload bao gồm
qualifying cross-store workforce sharing. Không thay đổi hard constraints để
đạt điểm đẹp.
```

# PROMPT 14

## Ngày

01/08/2026

## Giai đoạn

Local Repair và assignment preservation.

## Mục tiêu

Rescue coverage bằng swap hợp lệ và bảo vệ assignment không-AUTO.

## Bối cảnh

Main MRV loop có thể để lại shortage.

## Prompt dành cho Coding Agent

```text
Implement Local Repair theo thứ tự hard constraints → coverage rescue → soft
fairness/score. Re-check skill, availability, leave, blackout, overlap, rest,
weekly/contract và requirement compatibility cho mọi swap. Rerun chỉ được
cleanup AUTO; MANUAL và OPEN_SHIFT phải giữ nguyên. Viết regression tests.
```

## GIAI ĐOẠN 06 — Spatial / 3D

# PROMPT 15

## Ngày

02/08/2026

## Giai đoạn

Spatial allocation backend.

## Mục tiêu

Phân bổ staff vào zone sau staffing assignment.

## Bối cảnh

Assignment đã có zone/workstation semantics.

## Prompt dành cho Coding Agent

```text
Implement StoreLayout → StoreZone → ShiftAssignment → SpatialAllocationService.
Dùng x/y/z và Euclidean distance khi contract yêu cầu; mô phỏng Greedy
Max-Min Dispersion. Spatial status (SUCCESS/PARTIAL/UNAVAILABLE) độc lập với
Schedule Coverage. Không cho spatial failure xóa staffing assignment.
```

## GIAI ĐOẠN 07 — Marketplace và Workforce Sharing

# PROMPT 16

## Ngày

03/08/2026

## Giai đoạn

Marketplace/Open Shift.

## Mục tiêu

Cho Staff discovery và claim ca mở bằng API thật.

## Bối cảnh

Shift, assignment, skills, availability và Redis/concurrency đã có.

## Prompt dành cho Coding Agent

```text
Implement Open Shift → Marketplace → discovery → claim → OPEN_SHIFT assignment
→ headcount update → auto-close. Kiểm tra skill, availability, hours, capacity,
duplicate claim và concurrency. Không dùng mock shifts; trả lỗi 400/403/409 rõ
ràng và refresh danh sách sau success.
```

# PROMPT 17

## Ngày

05/08/2026

## Giai đoạn

Workforce sharing.

## Mục tiêu

Cho Store A request staff Store B khi flow được phép.

## Bối cảnh

Marketplace đã có; Employment có thể gắn staff với nhiều store.

## Prompt dành cho Coding Agent

```text
Implement workforce request/proposal theo endpoint hiện có. Cho phép cross-store
work khi authorization/workflow hợp lệ; không cấm staff chỉ vì membership ở store
khác. Vẫn enforce skill, availability, leave, overlap, rest, weekly limits và
global employee workload. Không nhầm Workforce Proposal với Open Shift claim.
```

## GIAI ĐOẠN 08 — Attendance và Payroll

# PROMPT 18

## Ngày

06/08/2026

## Giai đoạn

Attendance.

## Mục tiêu

Check-in/out dựa trên shift eligibility, location/QR/selfie nếu contract yêu cầu.

## Bối cảnh

Assignment đã phát sinh từ manual/auto/marketplace.

## Prompt dành cho Coding Agent

```text
Implement Attendance API cho current authenticated staff/eligible shift,
check-in/check-out, duplicate attendance, timing, GPS/selfie validation nếu có.
Không nhận staffId tùy ý từ client khi có JWT identity. Lưu dữ liệu backend thật
và viết controller/service tests.
```

# PROMPT 19

## Ngày

08/08/2026

## Giai đoạn

Payroll.

## Mục tiêu

Tính và phát hành payslip ở backend.

## Bối cảnh

Attendance, shift và leave đã có.

## Prompt dành cho Coding Agent

```text
Implement payroll period/payslip theo backend contract: worked hours,
scheduled hours, approved paid/unpaid leave, status và export nếu có. Mobile/Web
chỉ hiển thị payslip backend. Không tạo estimated payroll từ shifts ở client và
không thay đổi DTO payroll để tiện UI.
```

## GIAI ĐOẠN 09 — Web và Mobile Integration

# PROMPT 20

## Ngày

11/08/2026

## Giai đoạn

Web dashboard.

## Mục tiêu

Bind Web vào API thật sau khi backend ổn định.

## Bối cảnh

Các domain backend và endpoint đã có tests.

## Prompt dành cho Coding Agent

```text
Implement Web Login, Dashboard, Employees, Employment, Skills, Availability,
Leave, Schedule, Demand Planning, Marketplace, Workforce, Payroll, Attendance
và Scheduler bằng API thật. Reuse existing visual patterns, không hardcode
business data, không fake success. Schedule spatial workspace chỉ dùng 3D khi
domain có layout/zone; giữ staffing coverage riêng spatial allocation.
```

# PROMPT 21

## Ngày

13/08/2026

## Giai đoạn

Mobile Staff app.

## Mục tiêu

Bind Mobile vào current-user API và giữ navigation/layout hiện có.

## Bối cảnh

Backend đã là source of truth; Web flow đã tham chiếu được.

## Prompt dành cho Coding Agent

```text
Implement Mobile Login/logout/session restore, Profile, Dashboard, Schedule,
Attendance, Availability, Leave, Marketplace và Payroll bằng API thật. Không
hardcode profile/schedule/payroll; payslips[] rỗng phải là empty state, không
estimated salary. Trace every button to handler/service/endpoint/refresh and
hiển thị 400/403/409/500/network errors.
```

## GIAI ĐOẠN 10 — Testing và Production Hardening

# PROMPT 22

## Ngày

15/08/2026

## Giai đoạn

Unit/controller/security/regression tests.

## Mục tiêu

Test theo invariant, không test hình thức.

## Bối cảnh

Backend/Web/Mobile đã tích hợp.

## Prompt dành cho Coding Agent

```text
Inventory toàn bộ test. Viết unit/service/controller tests cho auth/RBAC,
availability/leave, scheduler, spatial, marketplace/workforce, attendance và
payroll. Assert exact status/count/ownership/assignment source. Không disable,
delete hoặc hạ assertion. Nếu không có PostgreSQL/Redis thật, đánh dấu GAP,
không gọi mock là integration.
```

# PROMPT 23

## Ngày

17/08/2026

## Giai đoạn

Forensic production-hardening audit.

## Mục tiêu

Phân loại P0/P1/P2/P3 bằng evidence.

## Bối cảnh

Test suite đã có nhưng cần kiểm tra mutation path và isolation.

## Prompt dành cho Coding Agent

```text
Trace authentication, RBAC, store isolation, assignment cleanup, marketplace
concurrency, leave overlap, attendance ownership, payroll source of truth và
all scheduler mutations. Mỗi finding phải có reproduction/evidence. Chỉ P0/P1
được xem là release blocker; P2/P3/deferred không tự ý sửa trong freeze task.
```

## GIAI ĐOẠN 11 — P1 Remediation

# PROMPT 24

## Ngày

18/09/2026

## Giai đoạn

P1-A/P1-B remediation.

## Mục tiêu

Reproduce → regression test → minimal fix → verify.

## Bối cảnh

Audit đã chứng minh hai lỗi: overnight availability và requirement coverage.

## Prompt dành cho Coding Agent

```text
Reproduce P1-A bằng date-aware overnight LocalDateTime cases và P1-B bằng
wrong-skill/zone/workstation manual assignment. Viết regression test trước khi
sửa. Dùng common coverage matcher để kiểm tra requirement identity, staff skill,
zone/workstation và tránh double counting. Không đổi scheduler architecture.
Chạy P1 và scheduler regression sau fix. P1-C out-of-hours chỉ là NOT A DEFECT
nếu backend contract purge/reject đã chứng minh điều đó.
```

## GIAI ĐOẠN 12 — Determinism và Production-equivalent verification

# PROMPT 25

## Ngày

19/09/2026

## Giai đoạn

Canonical ordering, replay và fairness A/B.

## Mục tiêu

Loại bỏ phụ thuộc unordered traversal và kiểm tra rollback-safe.

## Bối cảnh

P1 đã pass; scheduler logic không được redesign.

## Prompt dành cho Coding Agent

```text
Canonical-order shifts, assignments, requirements, staff skills, availability,
blackouts, employment, leave và candidates bằng stable keys. Chạy controlled
production-equivalent replay với rollback, không mutate production. So sánh
fairness-cap enabled/disabled trên 81 required slots: cả hai phải coverage 100%,
shortage 0, hard violations 0, spatial SUCCESS và deterministic digest. Ghi
trade-off staff participation, không tuyên bố mode nào tối ưu toàn cục.
```

## GIAI ĐOẠN 13 — Final Gate và Documentation Freeze

# PROMPT 26

## Ngày

20/09/2026

## Giai đoạn

Release gate và documentation synchronization.

## Mục tiêu

Đóng băng hệ thống ổn định, ghi đúng verification gaps.

## Bối cảnh

P1 đã resolved; P2/P3 chỉ còn deferred design debt.

## Prompt dành cho Coding Agent

```text
Chạy mvn -q clean test và mvn -q -DskipTests package; inventory 384 tests,
381 executed PASS, 0 failure, 0 error, 3 skipped infrastructure tests. Audit
V39__persist_position_norm_overrides.sql, không chạy lại migration. Kiểm tra
git diff/read-only, không reset/delete/push. Cập nhật README.md, README.md,
backend README/CHANGELOG, historical notices và tạo hoặc cập nhật
SHIFTSYNC_CURRENT_SYSTEM_STATUS.md. Ghi PostgreSQL/Redis fresh integration,
full E2E và final Web/Mobile smoke là VERIFICATION GAP. Kết luận RELEASE READY
— FREEZE APPROVED WITH DOCUMENTED VERIFICATION GAPS nếu không có P0/P1.
```

## Kết quả mô phỏng cần đạt

Sau khi thực hiện tuần tự, agent phải có:

- kiến trúc Backend → API → Web/Mobile, không fake data;
- đầy đủ domain Auth, RBAC, Staff, Store, Shift, Scheduler, Spatial,
  Marketplace, Workforce, Attendance, Payroll và Dashboard;
- P1-A/P1-B được regression-test và đánh dấu `RESOLVED`;
- deterministic ordering và production-equivalent scheduler replay;
- test baseline 384 total / 381 executed PASS / 0 fail / 0 error / 3 skipped;
- V39 được nhận diện là intended migration cần release review;
- verification gaps được ghi rõ, không overclaim E2E hoặc infrastructure PASS;
- tài liệu lịch sử được bảo toàn và current status có một master document.

Đây là hướng dẫn tái dựng mô phỏng. Không dùng nó để khẳng định timeline hoặc
prompt lịch sử nguyên văn, và không thay thế source code, migration, seed data
hay runtime evidence.

# Reconstructed Coding Sessions

Các session sau mô phỏng cảm giác phát triển liên tục từ project rỗng đến
release freeze. Mỗi mục giữ đúng chuỗi `USER PROMPT → AI IMPLEMENT → USER
VERIFY → BUG/NEXT` và chỉ dùng feature đã được chứng minh trong repository.

## 2026-07-21 — PHASE 1 — Discovery `[RECONSTRUCTED DATE]`

### PROMPT 001 — Khởi tạo bài toán ShiftSync

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Hãy phân tích hệ thống quản lý ca cho chuỗi F&B: actors ADMIN, MANAGER, STAFF;
Store, User, Employment, Contract, Skill, Availability, Leave, Shift,
Attendance, Payroll và Notification. Xác định MVP, business rules, module
boundary và source of truth. Chưa viết frontend mock hoặc business logic giả.
```

#### AI IMPLEMENT

- Lập business analysis, actor/permission map và dependency graph.
- Chọn backend modular monolith, PostgreSQL/Flyway, Redis, Web React và Mobile Expo.
- Đặt backend/API làm source of truth.

#### USER VERIFY

- Các domain chính và role boundary được xác định.
- Không có mock data runtime được chấp nhận.

#### NEXT

→ Thiết kế API và architecture.

## 2026-07-21 — PHASE 1

### PROMPT 002 — Chốt architecture và API contract

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Thiết kế package com.shiftsync.{module}.{layer}, DTO/controller/service/repository
boundary và API cho auth, users, stores, employment, skills, availability,
leave, shifts, assignments, marketplace, workforce, attendance, payroll,
scheduler và spatial. Identity phải lấy từ JWT; mọi ownership/store scope phải
được backend kiểm tra.
```

#### AI IMPLEMENT

- Tạo API draft, module map, response/error convention và security boundaries.

#### USER VERIFY

- API dependency rõ ràng trước khi viết UI.
- Không dùng staffId từ client nếu có current-user identity.

#### NEXT

→ Thiết kế schema và Flyway.

## 2026-07-22 — PHASE 2 — Database `[RECONSTRUCTED DATE]`

### PROMPT 003 — Initial schema và migration chain

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Thiết kế schema có khóa ngoại theo dependency: staff, store, skill,
employment, contract, availability, leave/blackout, shift, requirements,
assignments, layout/zones, workforce, attendance và payroll. Dùng Flyway,
không bật ddl-auto tạo schema và không chạy migration trên database thật.
```

#### AI IMPLEMENT

- Tạo entity/migration nền tảng, FK, unique constraints và indexes cần thiết.
- Giữ PostgreSQL là dữ liệu nghiệp vụ thật.

#### USER VERIFY

- Schema có thể map với entity/repository.
- Migration có thứ tự dependency, không seed dữ liệu demo vào runtime.

#### NEXT

→ Khởi tạo Spring Boot foundation.

## 2026-07-22 — PHASE 2

### PROMPT 004 — Backend foundation

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Khởi tạo Java 21/Spring Boot 4.1.1 với JPA, Flyway, PostgreSQL, Redis,
validation, actuator và OpenAPI theo package đã chốt. Tạo exception handler,
health check và test foundation. Không thêm framework ngoài dependency đã xác minh.
```

#### AI IMPLEMENT

- Tạo modular monolith, config database/Redis/Flyway, validation và error mapping.

#### USER VERIFY

- Maven compile/package chạy được.
- Health endpoint và migration configuration tồn tại.

#### NEXT

→ Authentication và RBAC.

## 2026-07-23 → 2026-07-25 — PHASE 3 — Auth/RBAC/Staff `[RECONSTRUCTED DATE]`

### PROMPT 005 — Authentication và session

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Implement password hashing, JWT access token, refresh/session nếu API có,
logout/revocation và current-user endpoint. Không hardcode credential, không
bypass authentication và không tin staffId tùy ý từ client.
```

#### AI IMPLEMENT

- Tạo auth service/controller, JWT filter, refresh/session handling và tests.

#### USER VERIFY

- Login hợp lệ/sai, refresh, logout và token error trả status đúng.

#### BUG / NEXT

- Bổ sung RBAC và store isolation trước khi mở CRUD.

### PROMPT 006 — RBAC và isolation

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Bảo vệ ADMIN, MANAGER, STAFF theo role và store scope. Test authenticated,
unauthenticated, wrong role, wrong store và wrong staff identity; không leak
protected data trong response.
```

#### AI IMPLEMENT

- Bổ sung SecurityContext checks, ownership validation và controller tests.

#### USER VERIFY

- Staff không quản lý được employee/store của manager; manager không đọc store khác.

#### NEXT

→ User profile, Employment, Contract và Skill.

### PROMPT 007 — Staff domain

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Implement User profile, Employment/store membership, Contract limits, Skill và
StaffSkill level/expiration theo entity hiện có. Không tự tạo effective-date
model hoặc duplicate policy chưa có trong contract. Skill hết hạn không eligible.
```

#### AI IMPLEMENT

- Tạo CRUD/service validation và staff-skill expiry checks.

#### USER VERIFY

- Protected profile fields, inactive employment và expired skill được kiểm tra.

#### NEXT

→ Availability/Leave/Shift.

## 2026-07-26 → 2026-07-28 — PHASE 4 — Availability/Leave/Shift

### PROMPT 008 — Availability, Leave và Blackout

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Implement Availability CRUD, Leave Request lifecycle và BlackoutDate. Không
khai báo availability nghĩa là bận; giữ owner isolation, overlap/entitlement
validation và approved leave exclusion. Không để UI làm source of truth.
```

#### AI IMPLEMENT

- Tạo API/service/repository và leave→blackout behavior.

#### USER VERIFY

- CRUD, approval, overlap và ownership tests pass.

### PROMPT 009 — Shift, requirement và assignment

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Implement Store configuration, Layout/Zone, Shift, ShiftSkillRequirement và
ShiftAssignment. Preserve assignment source MANUAL, AUTO, OPEN_SHIFT; requirement
phải giữ skill/zone/workstation identity và required headcount.
```

#### AI IMPLEMENT

- Tạo shift lifecycle, requirement coverage DTO và assignment validation.

#### USER VERIFY

- Overlap, store ownership và requirement compatibility được test.

### PROMPT 010 — Demand planning và coverage

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Trace demand implementation hiện có. Nếu demand lưu qua Shift và
ShiftSkillRequirement thì dùng đúng mô hình đó, không bịa bảng HeadcountQuota.
Coverage phải phân biệt fully/partial/zero và không cho assignment sai skill
cover requirement.
```

#### BUG / NEXT

- Requirement accounting được đưa vào scheduler regression scope.

## 2026-07-29 → 2026-08-01 — PHASE 5 — Scheduler `[RECONSTRUCTED DATE]`

### PROMPT 011 — AutoSchedule hard filter

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Implement AutoScheduleService bằng hard filtering trước scoring: skill/expiry,
availability, leave, blackout, overlap, rest, weekly/contract hours và
store/workforce authorization. Candidate không hợp lệ không được gán chỉ để
đạt coverage.
```

#### AI IMPLEMENT

- Tạo candidate pipeline, assignment persistence, shortage và coverage result.

#### USER VERIFY

- Hard constraint tests pass; shortage phản ánh đúng demand.

### PROMPT 012 — MRV, scoring và fairness

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Thêm MRV, skill/hour/rest/fairness scoring và soft fairness cap. Fairness là
selection concern, không phải global optimizer. Availability sau eligibility có
score 1.0; global employee workload bao gồm qualifying cross-store work.
```

#### AI IMPLEMENT

- Candidate ranking, fairness snapshot và configurable weights.

#### USER VERIFY

- Coverage không giảm vì fairness; hard constraints vẫn tuyệt đối.

### PROMPT 013 — Local Repair

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Thêm Local Repair theo hard constraints → coverage rescue → soft fairness/score.
Mọi swap phải re-check requirement, skill, availability, leave, blackout,
overlap, rest và hours. Rerun chỉ cleanup AUTO; MANUAL/OPEN_SHIFT được bảo vệ.
```

#### USER VERIFY

- Swap rescue test pass và không mất assignment protected.

## 2026-07-31 — BUG DISCOVERED — P1-A `[RECONSTRUCTED DATE]`

### PROMPT 014 — Overnight availability remediation

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Reproduce availability 22:00–06:00 với các shift qua midnight bằng regression
test. Sửa bằng LocalDateTime interval/date-aware logic tối thiểu. Không đổi
availability thành soft preference.
```

#### AI IMPLEMENT

- Thêm interval evaluation hỗ trợ overnight.

#### USER VERIFY

- Cases accept/reject biên và normal availability pass.

#### STATUS

**P1-A — RESOLVED**, không phải trạng thái hiện tại chưa xử lý.

## 2026-08-01 — BUG DISCOVERED — P1-B `[RECONSTRUCTED DATE]`

### PROMPT 015 — Requirement coverage remediation

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Reproduce wrong-skill/manual assignment bị tính cover. Viết test trước, sau đó
đưa common matcher kiểm tra required skill, staff skill, zone, workstation,
assignment compatibility và duplicate requirement matching.
```

#### AI IMPLEMENT

- Hợp nhất coverage matcher và cập nhật requirement coverage result.

#### USER VERIFY

- Wrong skill cho kết quả zero coverage/shortage; match đúng vẫn được count.

#### STATUS

**P1-B — RESOLVED** và regression-tested.

## 2026-08-02 — PHASE 6 — Spatial/3D `[RECONSTRUCTED DATE]`

### PROMPT 016 — Spatial allocation

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Implement StoreLayout → StoreZone → ShiftAssignment → SpatialAllocationService.
Khi có x/y/z, dùng Euclidean distance/Greedy Max-Min Dispersion theo contract.
Spatial SUCCESS/PARTIAL/UNAVAILABLE là dimension riêng với staffing coverage;
spatial failure không xóa assignment.
```

#### USER VERIFY

- FULLY_COVERED + PARTIAL spatial là state hợp lệ.

## 2026-08-03 → 2026-08-05 — PHASE 7 — Marketplace/Workforce

### PROMPT 017 — Marketplace Open Shift

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Implement Open Shift → discovery → claim → OPEN_SHIFT assignment → headcount
update → auto-close. Kiểm tra skill, availability, capacity, duplicate claim,
concurrency và đúng shift ID. Không nhầm flow với Workforce Proposal.
```

#### USER VERIFY

- Claim success, duplicate rejection, capacity và `/users/me/shifts` refresh pass.

### PROMPT 018 — Workforce sharing

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Implement workforce request/proposal cho Store A mượn staff Store B khi workflow
cho phép. Cross-store assignment vẫn phải enforce authorization, skill,
availability, leave, overlap, rest, weekly hours và global employee workload.
```

#### USER VERIFY

- Store membership không cấm sharing hợp lệ.

## 2026-08-06 → 2026-08-08 — PHASE 8 — Attendance/Payroll

### PROMPT 019 — Attendance

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Implement current-shift check-in/out, timing, GPS/selfie/QR nếu contract có,
duplicate attendance và JWT staff ownership. Lưu backend thật; không fake
attendance và viết controller/service tests.
```

### PROMPT 020 — Payroll

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Implement payroll period/payslip từ attendance, shifts và approved paid/unpaid
leave. Mobile/Web chỉ render payslip backend; không tính estimated payroll từ
schedule khi `/users/me/payslips` rỗng.
```

#### USER VERIFY

- Payslip backend là source of truth; empty payslip hiển thị empty state.

## 2026-08-11 → 2026-08-13 — PHASE 9 — Web/Mobile Integration

### PROMPT 021 — Web dashboard và schedule

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Bind Web Login, Dashboard, Employees, Availability, Leave, Schedule, Demand,
Marketplace, Workforce, Payroll, Attendance và Scheduler vào API thật. Reuse
existing visual patterns; không hardcode business data. Spatial workspace chỉ
hiển thị layout/zone thật và giữ staffing coverage riêng.
```

### PROMPT 022 — Mobile Staff app

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Bind Mobile Login/logout/session, Profile, Dashboard, Schedule, Attendance,
Availability, Leave, Marketplace và Payroll vào current-user APIs. Trace button
to handler/service/response/refresh; không hardcode profile/schedule/payroll;
hiển thị 400/403/409/500/network errors.
```

#### USER VERIFY

- Static/API consistency được kiểm tra; full authenticated final smoke vẫn là
  `VERIFICATION GAP` nếu chưa chạy Expo/device thật.

## 2026-08-15 → 2026-09-17 — PHASE 10 — Audit và hardening `[RECONSTRUCTED DATE]`

### PROMPT 023 — Full test/security audit

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Inventory toàn bộ backend tests. Kiểm tra auth/RBAC, store isolation, API
validation, marketplace concurrency, leave, attendance, payroll, scheduler
mutation paths và test isolation. Không disable/delete/lower assertion; nếu
thiếu PostgreSQL/Redis thật phải ghi infrastructure gap.
```

#### AI IMPLEMENT

- Thêm regression tests theo invariant và phân loại P0/P1/P2/P3.

#### USER VERIFY

- Không có P0/P1 mới; P2/P3 không tự động block freeze.

## 2026-09-18 — PHASE 11 — P1 Remediation `[RECONSTRUCTED DATE]`

### PROMPT 024 — Regression-first P1 fixes

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Chạy lại P1-A/P1-B regressions trước/sau fix. Không redesign AutoSchedule.
Giữ P1-A overnight date-aware interval và P1-B requirement-aware coverage
matcher. Xác nhận P1-C out-of-hours là NOT A DEFECT theo backend contract.
```

#### USER VERIFY

- P1-A/P1-B pass; hard constraints và coverage không regress.

## 2026-09-19 — PHASE 12 — Determinism và A/B `[RECONSTRUCTED DATE]`

### PROMPT 025 — Canonical ordering và production-equivalent replay

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Canonical-order shifts, assignments, requirements, skills, availability,
blackouts, employment, leave và candidates. Chạy rollback-safe replay trên
controlled snapshot. So sánh fairness-cap enabled/disabled: required 81,
assigned 81, shortage 0, coverage 100%, hard violations 0, spatial SUCCESS.
Ghi staff participation khác nhau nhưng không gọi mode nào global-optimal.
```

#### USER VERIFY

- Repeated assignment-map digest giống nhau; rollback khôi phục baseline.

## 2026-09-20 — PHASE 13 — Final Release và Documentation

### PROMPT 026 — Final production gate

#### USER → AI

```text
[MÔ PHỎNG — RECONSTRUCTED AI PROMPT]
Chạy clean test/package, kiểm tra migration V39 và git diff read-only. Kết luận
chỉ theo evidence: 384 total, 381 executed PASS, 0 failure, 0 error, 3 skipped
PostgreSQL/Redis-dependent tests. Không claim fresh integration, full E2E hoặc
final Web/Mobile smoke nếu chưa chạy. Freeze Backend/Scheduler/API; Database
conditional V39; Web/Mobile với documented runtime gap.
```

#### AI IMPLEMENT

- Đồng bộ README, TechStack, backend README/CHANGELOG, historical notices và
  `SHIFTSYNC_CURRENT_SYSTEM_STATUS.md`.

#### USER VERIFY

- **RELEASE READY — FREEZE APPROVED WITH DOCUMENTED VERIFICATION GAPS**.

#### FINAL NOTE

Đây là reconstructed coding log có dependency và evidence mapping; không phải
claim về câu chữ prompt thật, người thực hiện thật hoặc thời điểm commit thật.

# BACKEND RECONSTRUCTED AI CODING LOG — 9 WEEKS / 216 PROMPTS

> **RECONSTRUCTION / SIMULATION:** Phần này chỉ tái dựng quá trình phát triển
> Backend dựa trên code, migrations, tests, API và audit hiện tại. Các prompt
> không phải transcript lịch sử nguyên bản. `VERIFIED` là trạng thái có bằng
> chứng hiện tại; `RECONSTRUCTED` là workflow mô phỏng; `UNKNOWN` là thiếu evidence.

Mỗi entry dùng format: `STATE BEFORE` → `USER → AI` → `AI CODE` →
`VERIFY / BUG / NEXT`. Tổng cộng 216 prompt kỹ thuật, chia 9 tuần.

## WEEK 01 — FOUNDATION / ARCHITECTURE / DATABASE (21/07 → 26/07)

### PROMPT 001 — Backend requirements
Date: 2026-07-21 `[RECONSTRUCTED DATE]` · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Project rỗng.
USER → AI: `Phân tích actors, backend modules và MVP của ShiftSync; chỉ ra source of truth.`
AI CODE: Business/domain map cho staff, store, shift, attendance, payroll.
VERIFY / NEXT: Xác nhận dependency; → Prompt 002.

### PROMPT 002 — Backend bounded modules
Date: 2026-07-21 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Domain map có nhưng chưa có package.
USER → AI: `Thiết kế modular monolith com.shiftsync.{module}.{layer}.`
AI CODE: Module boundaries và layer convention.
VERIFY / NEXT: Không trộn controller/service/repository; → Prompt 003.

### PROMPT 003 — API inventory
Date: 2026-07-21 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Chưa có endpoint contract.
USER → AI: `Liệt kê API auth, staff, store, shift, scheduler và payroll trước khi code.`
AI CODE: API draft, request/response ownership.
VERIFY / NEXT: API không nhận identity tùy ý; → Prompt 004.

### PROMPT 004 — Bootstrap Maven
Date: 2026-07-21 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Chưa có build.
USER → AI: `Khởi tạo Maven Spring Boot Java 21 với dependency tối thiểu.`
AI CODE: pom, application entrypoint, test runner.
VERIFY / NEXT: `mvn test` compile; → Prompt 005.

### PROMPT 005 — Package skeleton
Date: 2026-07-21 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Build trống.
USER → AI: `Tạo package auth/store/shift/shared theo layer convention.`
AI CODE: module folders, base DTO/exception packages.
VERIFY / NEXT: Compile không dependency cycle; → Prompt 006.

### PROMPT 006 — Environment configuration
Date: 2026-07-21 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Config hardcoded.
USER → AI: `Tách datasource, JWT và Redis bằng environment properties.`
AI CODE: application properties và safe local defaults.
VERIFY / NEXT: Không đưa secret thật vào repository; → Prompt 007.

### PROMPT 007 — PostgreSQL datasource
Date: 2026-07-21 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Chưa có persistence.
USER → AI: `Cấu hình PostgreSQL/JPA với ddl-auto none.`
AI CODE: datasource, dialect, transaction baseline.
VERIFY / NEXT: Không tự tạo schema; → Prompt 008.

### PROMPT 008 — Flyway baseline
Date: 2026-07-21 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Database version chưa quản lý.
USER → AI: `Bật Flyway và thiết kế initial migration theo dependency.`
AI CODE: migration location, baseline policy, naming convention.
VERIFY / NEXT: Migration không chạy lại ngoài ý muốn; → Prompt 009.

### PROMPT 009 — Initial staff table
Date: 2026-07-22 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Flyway baseline có.
USER → AI: `Tạo bảng staff/user với identity, password, status và timestamps.`
AI CODE: migration/entity mapping.
VERIFY / NEXT: Unique identity; → Prompt 010.

### PROMPT 010 — Store table
Date: 2026-07-22 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Staff table tồn tại.
USER → AI: `Thêm store và cấu hình vận hành tối thiểu.`
AI CODE: store migration/entity/repository.
VERIFY / NEXT: Store ownership rõ; → Prompt 011.

### PROMPT 011 — Employment relation
Date: 2026-07-22 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Staff và store độc lập.
USER → AI: `Liên kết staff-store bằng Employment có status và contract reference.`
AI CODE: FK, repository finder, service validation.
VERIFY / NEXT: Cho phép nhiều employment nếu domain cần; → Prompt 012.

### PROMPT 012 — Skill tables
Date: 2026-07-22 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Employment đã có.
USER → AI: `Tạo Skill và StaffSkill với level/expiration.`
AI CODE: entity, FK, repository.
VERIFY / NEXT: Chưa tự chọn duplicate policy; → Prompt 013.

### PROMPT 013 — Contract types
Date: 2026-07-23 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Staff chưa có giới hạn giờ.
USER → AI: `Tạo ContractType/Employment contract cho weekly limit và rest.`
AI CODE: fields, validation, lookup service.
VERIFY / NEXT: Giới hạn là hard constraint; → Prompt 014.

### PROMPT 014 — Shared exception handler
Date: 2026-07-23 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Exception trả stack trace.
USER → AI: `Tạo error DTO và GlobalExceptionHandler cho 400/401/403/404/409.`
AI CODE: stable error shape, validation messages.
VERIFY / NEXT: Controller test exact status; → Prompt 015.

### PROMPT 015 — Validation foundation
Date: 2026-07-23 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Request chưa validate.
USER → AI: `Thêm Jakarta validation cho DTO nhưng không thay business rule.`
AI CODE: annotations, service-level checks.
VERIFY / NEXT: Invalid input không thành 500; → Prompt 016.

### PROMPT 016 — Repository foundation
Date: 2026-07-24 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Entity chưa có query ownership.
USER → AI: `Tạo repository methods theo store/staff scope và date range.`
AI CODE: explicit finder methods, no broad leakage.
VERIFY / NEXT: Repository contract documented; → Prompt 017.

### PROMPT 017 — Service transaction rules
Date: 2026-07-24 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Service chưa có transaction boundary.
USER → AI: `Đặt transaction cho create/update/approval và tránh partial writes.`
AI CODE: transactional annotations và orchestration.
VERIFY / NEXT: Rollback test plan; → Prompt 018.

### PROMPT 018 — Controller baseline
Date: 2026-07-24 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Chưa expose API.
USER → AI: `Tạo controller mỏng, map DTO và delegate service.`
AI CODE: endpoint skeleton, status codes.
VERIFY / NEXT: Không đặt business rule trong controller; → Prompt 019.

### PROMPT 019 — Logging and audit hooks
Date: 2026-07-25 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Không trace được mutation.
USER → AI: `Thêm structured logging và AuditLog integration point nếu domain có.`
AI CODE: safe identifiers, no secrets.
VERIFY / NEXT: Audit integration dependency documented; → Prompt 020.

### PROMPT 020 — First unit tests
Date: 2026-07-25 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Foundation chưa có regression.
USER → AI: `Viết unit tests cho validation, repository scope và exception mapping.`
AI CODE: focused tests, exact assertions.
VERIFY / NEXT: Không mock toàn bộ service under test; → Prompt 021.

### PROMPT 021 — Build verification
Date: 2026-07-25 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Foundation tests có.
USER → AI: `Chạy clean compile/test và ghi mọi warning/error.`
AI CODE: test report, no speculative code change.
VERIFY / NEXT: Build xanh; → Prompt 022.

### PROMPT 022 — Seed policy review
Date: 2026-07-26 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Có nhu cầu demo data.
USER → AI: `Tách seed/manual QA khỏi runtime source of truth.`
AI CODE: seed documentation, no fake fallback.
VERIFY / NEXT: UI không đọc seed object; → Prompt 023.

### PROMPT 023 — Foundation security review
Date: 2026-07-26 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Security config chưa hoàn thiện.
USER → AI: `Review default security, actuator exposure và secret handling.`
AI CODE: safe baseline only.
VERIFY / NEXT: → Prompt 024.

### PROMPT 024 — WEEK 01 checkpoint
Date: 2026-07-26 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Foundation complete.
USER → AI: `Tổng hợp backend state, migrations, API, tests, risks và next dependencies.`
AI CODE: checkpoint report.
VERIFY / NEXT: WEEK 01 ready; → WEEK 02.

### WEEK 01 CHECKPOINT

Backend: Java/Spring foundation, JPA/Flyway/PostgreSQL config, shared validation,
exception and repository conventions. Tests: unit foundation green. Risk:
real PostgreSQL/Redis integration chưa chạy.

## WEEK 02 — AUTHENTICATION / RBAC / USER DOMAIN (27/07 → 02/08)

### PROMPT 025 — User repository
Date: 2026-07-27 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Staff entity có, chưa có query service.
USER → AI: `Implement UserRepository với identity/status/ownership finders.`
AI CODE: Repository methods, no unscoped sensitive query.
VERIFY / NEXT: Unit tests; → Prompt 026.

### PROMPT 026 — Password hashing
Date: 2026-07-27 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Password chưa có policy.
USER → AI: `Dùng password encoder hiện có, không lưu plaintext.`
AI CODE: encoder service và validation.
VERIFY / NEXT: Hash differs from plaintext; → Prompt 027.

### PROMPT 027 — Login request DTO
Date: 2026-07-27 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Auth endpoint chưa có request model.
USER → AI: `Tạo LoginRequest/response theo API contract hiện tại.`
AI CODE: DTO validation, token response.
VERIFY / NEXT: Invalid payload → 400; → Prompt 028.

### PROMPT 028 — JWT provider
Date: 2026-07-28 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Login DTO có.
USER → AI: `Implement JWT signing, expiry và claims identity/role.`
AI CODE: token provider, no hardcoded production secret.
VERIFY / NEXT: Expiry test; → Prompt 029.

### PROMPT 029 — JWT filter
Date: 2026-07-28 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Token tạo được, request chưa authenticate.
USER → AI: `Parse Bearer token và set SecurityContext an toàn.`
AI CODE: filter, malformed/expired handling.
VERIFY / NEXT: 401/anonymous test; → Prompt 030.

### PROMPT 030 — Auth service
Date: 2026-07-28 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Provider/filter có.
USER → AI: `Kết nối login với UserRepository và password encoder.`
AI CODE: service orchestration, generic invalid-credential error.
VERIFY / NEXT: Login success/failure; → Prompt 031.

### PROMPT 031 — Auth controller
Date: 2026-07-28 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Auth service pass unit.
USER → AI: `Expose login/refresh/logout endpoints theo contract.`
AI CODE: thin controller and status mapping.
VERIFY / NEXT: MockMvc tests; → Prompt 032.

### PROMPT 032 — Refresh session
Date: 2026-07-29 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Access token flow có.
USER → AI: `Audit refresh/session persistence nếu endpoint hiện có.`
AI CODE: expiry/revocation checks.
VERIFY / NEXT: Invalid refresh → 401; → Prompt 033.

### PROMPT 033 — Logout revocation
Date: 2026-07-29 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Logout chưa blacklist token.
USER → AI: `Kết nối logout với Redis blacklist khi codebase yêu cầu.`
AI CODE: TTL equals remaining token lifetime.
VERIFY / NEXT: No secret logged; → Prompt 034.

### PROMPT 034 — SecurityConfig
Date: 2026-07-29 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Filter có, route policy chưa.
USER → AI: `Configure stateless security, public auth/docs/health và protected APIs.`
AI CODE: SecurityFilterChain/CORS.
VERIFY / NEXT: Protected route denies anonymous; → Prompt 035.

### PROMPT 035 — ADMIN role
Date: 2026-07-30 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Authentication có.
USER → AI: `Protect user/store administration for ADMIN only.`
AI CODE: method/controller authorization.
VERIFY / NEXT: Staff receives 403; → Prompt 036.

### PROMPT 036 — MANAGER role
Date: 2026-07-30 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: ADMIN guard có.
USER → AI: `Allow MANAGER only within authorized stores.`
AI CODE: store scope resolver.
VERIFY / NEXT: Wrong-store denial; → Prompt 037.

### PROMPT 037 — STAFF self scope
Date: 2026-07-30 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Manager scope có.
USER → AI: `Derive staff identity from JWT for /users/me and personal data.`
AI CODE: current-user service.
VERIFY / NEXT: Client staffId cannot override; → Prompt 038.

### PROMPT 038 — Store isolation audit
Date: 2026-07-31 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Role checks có, query scope cần audit.
USER → AI: `Audit every store-scoped query for cross-store leakage.`
AI CODE: scoped repository/service checks.
VERIFY / NEXT: API response no foreign store; → Prompt 039.

### PROMPT 039 — Exception status matrix
Date: 2026-07-31 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Security paths return mixed errors.
USER → AI: `Map authentication/authorization/not-found/conflict errors consistently.`
AI CODE: handler adjustments only.
VERIFY / NEXT: Exact 401/403/404 tests; → Prompt 040.

### PROMPT 040 — User CRUD
Date: 2026-07-31 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Current-user API exists.
USER → AI: `Implement ADMIN user CRUD with protected fields.`
AI CODE: DTO/service/controller.
VERIFY / NEXT: Role/store/employment cannot be casually edited; → Prompt 041.

### PROMPT 041 — Employment service
Date: 2026-08-01 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Employment entity/repository có.
USER → AI: `Implement assign/unassign employment with authorization and status.`
AI CODE: service transactions.
VERIFY / NEXT: Store ownership tests; → Prompt 042.

### PROMPT 042 — Contract service
Date: 2026-08-01 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Contract fields có.
USER → AI: `Expose contract type and limits without bypassing manager scope.`
AI CODE: DTO/controller/service.
VERIFY / NEXT: Weekly/rest limits preserved; → Prompt 043.

### PROMPT 043 — User profile read
Date: 2026-08-01 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Profile data scattered.
USER → AI: `Implement current-user profile DTO with null-safe mapping.`
AI CODE: profile service, avatar fallback only presentation.
VERIFY / NEXT: No demo user; → Prompt 044.

### PROMPT 044 — User profile update
Date: 2026-08-01 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Profile read có.
USER → AI: `Allow only backend-permitted personal fields to update.`
AI CODE: update DTO excludes role/store/payroll/employment status.
VERIFY / NEXT: Reload reads backend; → Prompt 045.

### PROMPT 045 — Security tests
Date: 2026-08-02 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Auth/RBAC implementation complete.
USER → AI: `Write security matrix tests for ADMIN/MANAGER/STAFF and anonymous.`
AI CODE: JWT filter/controller tests.
VERIFY / NEXT: No protected-data leak; → Prompt 046.

### PROMPT 046 — Auth integration gap
Date: 2026-08-02 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Unit/controller tests pass.
USER → AI: `Determine whether real Postgres/Redis integration is runnable; do not fake it.`
AI CODE: classify infrastructure dependency.
VERIFY / NEXT: Mark GAP if unavailable; → Prompt 047.

### PROMPT 047 — Auth regression
Date: 2026-08-02 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Security matrix green.
USER → AI: `Run focused auth/RBAC regression and inspect errors.`
AI CODE: no production change without proven defect.
VERIFY / NEXT: Auth baseline; → Prompt 048.

### PROMPT 048 — WEEK 02 checkpoint
Date: 2026-08-02 · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Auth/RBAC/staff domain usable.
USER → AI: `Summarize identity, security, store isolation, tests and open gaps.`
AI CODE: checkpoint report.
VERIFY / NEXT: WEEK 02 ready; → WEEK 03.

### WEEK 02 CHECKPOINT

Backend: JWT/RBAC, current-user identity, user/employment/contract services and
store isolation. VERIFIED: unit/controller security behavior. GAP: real
PostgreSQL/Redis integration.

## WEEK 03 — STAFF DOMAIN / AVAILABILITY (03/08 → 09/08)

> Các prompt 049–072 dưới đây đều có `STATE BEFORE → USER → AI → VERIFY / NEXT`;
> ngày và câu chữ là reconstructed, không phải transcript.



### PROMPT 049 — Employment status
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Employment status theo contract hiện tại, không đổi business rule.`
AI CODE: audit ACTIVE/INACTIVE/SUSPENDED; implement status validation; verify inactive staff excluded.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 050 — Store employment finder
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Store employment finder theo contract hiện tại, không đổi business rule.`
AI CODE: add store-scoped finder; verify authorized cross-store sharing remains possible.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 051 — Contract type API
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Contract type API theo contract hiện tại, không đổi business rule.`
AI CODE: expose contract type/limits; verify manager scope.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 052 — Weekly hours
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Weekly hours theo contract hiện tại, không đổi business rule.`
AI CODE: connect weekly limit to scheduler data; verify boundary hours.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 053 — Rest contract
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Rest contract theo contract hiện tại, không đổi business rule.`
AI CODE: expose minimum-rest rule; verify service validation.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 054 — Skill catalog
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Skill catalog theo contract hiện tại, không đổi business rule.`
AI CODE: implement Skill CRUD; verify role/store ownership.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 055 — StaffSkill assignment
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng StaffSkill assignment theo contract hiện tại, không đổi business rule.`
AI CODE: assign level/expiration; verify expired record.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 056 — Skill level mapper
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Skill level mapper theo contract hiện tại, không đổi business rule.`
AI CODE: map existing enum to score; verify range.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 057 — Expiry date boundary
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Expiry date boundary theo contract hiện tại, không đổi business rule.`
AI CODE: test valid-on-date/invalid-after-date; verify scheduler predicate.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 058 — Duplicate StaffSkill forensic
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Duplicate StaffSkill forensic theo contract hiện tại, không đổi business rule.`
AI CODE: inspect schema/API/docs; verify policy is not defined.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 059 — Duplicate policy freeze
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Duplicate policy freeze theo contract hiện tại, không đổi business rule.`
AI CODE: preserve current anyMatch/findFirst behavior; record design risk.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 060 — Availability entity
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Availability entity theo contract hiện tại, không đổi business rule.`
AI CODE: implement day/start/end and owner relation; verify persistence mapping.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 061 — Availability create
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Availability create theo contract hiện tại, không đổi business rule.`
AI CODE: validate day and `end > start`; verify 400 response.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 062 — Availability read
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Availability read theo contract hiện tại, không đổi business rule.`
AI CODE: return owner-scoped rows; verify foreign owner denied.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 063 — Availability update
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Availability update theo contract hiện tại, không đổi business rule.`
AI CODE: update only permitted fields; verify identity is immutable.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 064 — Availability delete
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Availability delete theo contract hiện tại, không đổi business rule.`
AI CODE: delete owner row; verify store/staff isolation.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 065 — Availability overlap
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Availability overlap theo contract hiện tại, không đổi business rule.`
AI CODE: reject overlapping slots; verify repository query.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 066 — Day mapping
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Day mapping theo contract hiện tại, không đổi business rule.`
AI CODE: enforce 0 Sunday through 6 Saturday; verify all API boundaries.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 067 — Hard eligibility
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Hard eligibility theo contract hiện tại, không đổi business rule.`
AI CODE: integrate availability into candidate filter; verify no soft ranking.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 068 — Availability score
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Availability score theo contract hiện tại, không đổi business rule.`
AI CODE: keep eligible score 1.0; verify weight does not invent a formula.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 069 — Leave request
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Leave request theo contract hiện tại, không đổi business rule.`
AI CODE: create request/status/date validation; verify owner scope.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 070 — Leave approval
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Leave approval theo contract hiện tại, không đổi business rule.`
AI CODE: approve/reject with entitlement and overlap checks; verify 409.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 071 — Blackout integration
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Blackout integration theo contract hiện tại, không đổi business rule.`
AI CODE: approved leave creates/query blackout; verify scheduler exclusion.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 072 — WEEK 03 checkpoint
Date: 03/08 → 09/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng WEEK 03 checkpoint theo contract hiện tại, không đổi business rule.`
AI CODE: summarize staff-domain tests, duplicate-skill UNKNOWN and availability hard-only.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

## WEEK 04 — LEAVE / SHIFT / ASSIGNMENT (10/08 → 16/08)



### PROMPT 073 — Leave types
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Leave types theo contract hiện tại, không đổi business rule.`
AI CODE: align enum/DTO; verify payroll-compatible mapping.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 074 — Leave balance
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Leave balance theo contract hiện tại, không đổi business rule.`
AI CODE: implement deduction/reversal transaction; verify rollback.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 075 — Leave conflict
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Leave conflict theo contract hiện tại, không đổi business rule.`
AI CODE: return 409 for overlap; verify diagnostic body.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 076 — Blackout repository
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Blackout repository theo contract hiện tại, không đổi business rule.`
AI CODE: date-range/store queries; verify owner scope.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 077 — Shift entity
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Shift entity theo contract hiện tại, không đổi business rule.`
AI CODE: date/start/end/store/status; verify validation.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 078 — Operating hours
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Operating hours theo contract hiện tại, không đổi business rule.`
AI CODE: enforce draft/publish contract; classify P1-C correctly.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 079 — Shift status
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Shift status theo contract hiện tại, không đổi business rule.`
AI CODE: implement DRAFT/PUBLISHED/OPEN transitions; verify illegal jumps.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 080 — Requirement entity
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Requirement entity theo contract hiện tại, không đổi business rule.`
AI CODE: skill/count/zone/workstation; verify FK.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 081 — Requirement counts
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Requirement counts theo contract hiện tại, không đổi business rule.`
AI CODE: validate required/min/target/max according to existing DTO.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 082 — Manual assignment
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Manual assignment theo contract hiện tại, không đổi business rule.`
AI CODE: implement MANUAL path; verify skill/store/zone.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 083 — Assignment source
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Assignment source theo contract hiện tại, không đổi business rule.`
AI CODE: preserve MANUAL/AUTO/OPEN_SHIFT enum semantics.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 084 — Assignment uniqueness
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Assignment uniqueness theo contract hiện tại, không đổi business rule.`
AI CODE: enforce duplicate shift/staff conflict.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 085 — Overlap query
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Overlap query theo contract hiện tại, không đổi business rule.`
AI CODE: reject temporal overlap for same staff.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 086 — Assignment cancellation
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Assignment cancellation theo contract hiện tại, không đổi business rule.`
AI CODE: protect non-AUTO sources.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 087 — Coverage DTO
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Coverage DTO theo contract hiện tại, không đổi business rule.`
AI CODE: expose assigned/shortage/status/requirement coverage.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 088 — Wrong-skill regression
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Wrong-skill regression theo contract hiện tại, không đổi business rule.`
AI CODE: prove unrelated skill cannot cover requirement.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 089 — Zone matching
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Zone matching theo contract hiện tại, không đổi business rule.`
AI CODE: require zone compatibility when defined.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 090 — Workstation matching
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Workstation matching theo contract hiện tại, không đổi business rule.`
AI CODE: require workstation compatibility when defined.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 091 — Requirement deduplication
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Requirement deduplication theo contract hiện tại, không đổi business rule.`
AI CODE: one assignment cannot satisfy incompatible requirements.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 092 — Shift repository filters
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Shift repository filters theo contract hiện tại, không đổi business rule.`
AI CODE: date/store/status queries with stable ordering.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 093 — Draft scheduling query
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Draft scheduling query theo contract hiện tại, không đổi business rule.`
AI CODE: schedule only intended DRAFT shifts.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 094 — Shift controller tests
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Shift controller tests theo contract hiện tại, không đổi business rule.`
AI CODE: exact status/ownership assertions.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 095 — Assignment service tests
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Assignment service tests theo contract hiện tại, không đổi business rule.`
AI CODE: MANUAL protection, duplicate, overlap, skill and coverage.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 096 — WEEK 04 checkpoint
Date: 10/08 → 16/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng WEEK 04 checkpoint theo contract hiện tại, không đổi business rule.`
AI CODE: confirm Leave→Blackout and Shift→Requirement→Assignment chains.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

## WEEK 05 — DEMAND / AUTOSCHEDULE FOUNDATION (17/08 → 23/08)



### PROMPT 097 — Demand input
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Demand input theo contract hiện tại, không đổi business rule.`
AI CODE: trace actual demand storage; do not invent HeadcountQuota.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 098 — Canonical shift input
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Canonical shift input theo contract hiện tại, không đổi business rule.`
AI CODE: map shift requirements into scheduler slots.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 099 — Active staff load
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Active staff load theo contract hiện tại, không đổi business rule.`
AI CODE: bulk-load active employment candidates.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 100 — Skill filter
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Skill filter theo contract hiện tại, không đổi business rule.`
AI CODE: reject missing required skill.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 101 — Expiry filter
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Expiry filter theo contract hiện tại, không đổi business rule.`
AI CODE: reject expired skill on shift date.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 102 — Availability filter
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Availability filter theo contract hiện tại, không đổi business rule.`
AI CODE: reject unavailable candidate.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 103 — Overnight interval
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Overnight interval theo contract hiện tại, không đổi business rule.`
AI CODE: prepare date-aware interval helper.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 104 — Leave filter
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Leave filter theo contract hiện tại, không đổi business rule.`
AI CODE: reject approved leave.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 105 — Blackout filter
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Blackout filter theo contract hiện tại, không đổi business rule.`
AI CODE: reject blackout date.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 106 — Overlap filter
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Overlap filter theo contract hiện tại, không đổi business rule.`
AI CODE: reject conflicting assignments.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 107 — Weekly-hours filter
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Weekly-hours filter theo contract hiện tại, không đổi business rule.`
AI CODE: enforce contract weekly maximum.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 108 — Rest filter
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Rest filter theo contract hiện tại, không đổi business rule.`
AI CODE: enforce minimum rest between shifts.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 109 — Store authorization
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Store authorization theo contract hiện tại, không đổi business rule.`
AI CODE: include employment/workforce authorization.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 110 — Existing assignment snapshot
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Existing assignment snapshot theo contract hiện tại, không đổi business rule.`
AI CODE: load assignment history once.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 111 — Monthly workload
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Monthly workload theo contract hiện tại, không đổi business rule.`
AI CODE: calculate global employee workload.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 112 — Candidate object
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Candidate object theo contract hiện tại, không đổi business rule.`
AI CODE: define immutable StaffData snapshot.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 113 — Requirement slot
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Requirement slot theo contract hiện tại, không đổi business rule.`
AI CODE: preserve requirement/zone/workstation identity.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 114 — MRV count
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng MRV count theo contract hiện tại, không đổi business rule.`
AI CODE: compute candidate count per slot.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 115 — MRV date tie-break
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng MRV date tie-break theo contract hiện tại, không đổi business rule.`
AI CODE: add date/start/end tie-break.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 116 — MRV skill tie-break
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng MRV skill tie-break theo contract hiện tại, không đổi business rule.`
AI CODE: add skill and UUID tie-break.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 117 — Empty candidates
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Empty candidates theo contract hiện tại, không đổi business rule.`
AI CODE: produce shortage, never fake assignment.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 118 — Assignment persistence
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Assignment persistence theo contract hiện tại, không đổi business rule.`
AI CODE: save AUTO assignment transactionally.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 119 — Coverage result
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Coverage result theo contract hiện tại, không đổi business rule.`
AI CODE: compute exact coverage from compatible assignments.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 120 — WEEK 05 checkpoint
Date: 17/08 → 23/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng WEEK 05 checkpoint theo contract hiện tại, không đổi business rule.`
AI CODE: run basic AutoSchedule hard-filter scenarios.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

## WEEK 06 — SCORING / FAIRNESS / REPAIR (24/08 → 30/08)



### PROMPT 121 — Skill score
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Skill score theo contract hiện tại, không đổi business rule.`
AI CODE: map level score from existing domain.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 122 — Hour score
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Hour score theo contract hiện tại, không đổi business rule.`
AI CODE: prefer remaining weekly capacity.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 123 — Rest score
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Rest score theo contract hiện tại, không đổi business rule.`
AI CODE: prefer safer rest after hard filter.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 124 — Fairness score
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Fairness score theo contract hiện tại, không đổi business rule.`
AI CODE: use monthly employee workload.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 125 — Availability score
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Availability score theo contract hiện tại, không đổi business rule.`
AI CODE: keep 1.0 after eligibility.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 126 — Weight config
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Weight config theo contract hiện tại, không đổi business rule.`
AI CODE: load store scheduler weights.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 127 — Weight validation
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Weight validation theo contract hiện tại, không đổi business rule.`
AI CODE: require valid sum; verify controller.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 128 — Total score
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Total score theo contract hiện tại, không đổi business rule.`
AI CODE: bound result to [0,1].
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 129 — Deterministic tie
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Deterministic tie theo contract hiện tại, không đổi business rule.`
AI CODE: use canonical staff UUID.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 130 — Soft fairness cap
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Soft fairness cap theo contract hiện tại, không đổi business rule.`
AI CODE: filter over-cap candidates only when alternatives exist.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 131 — Coverage priority
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Coverage priority theo contract hiện tại, không đổi business rule.`
AI CODE: preserve slot coverage over soft score.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 132 — AUTO source
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng AUTO source theo contract hiện tại, không đổi business rule.`
AI CODE: label generated assignment AUTO.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 133 — Shortage semantics
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Shortage semantics theo contract hiện tại, không đổi business rule.`
AI CODE: distinguish partial/zero coverage.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 134 — Local Repair candidate
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Local Repair candidate theo contract hiện tại, không đổi business rule.`
AI CODE: identify unassigned slot.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 135 — Repair swap
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Repair swap theo contract hiện tại, không đổi business rule.`
AI CODE: test staff X/Y swap.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 136 — Repair hard checks
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Repair hard checks theo contract hiện tại, không đổi business rule.`
AI CODE: re-check skill/availability/leave/blackout.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 137 — Repair temporal checks
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Repair temporal checks theo contract hiện tại, không đổi business rule.`
AI CODE: re-check overlap/rest/hours.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 138 — Repair requirement checks
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Repair requirement checks theo contract hiện tại, không đổi business rule.`
AI CODE: preserve skill/zone/workstation identity.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 139 — Repair persistence
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Repair persistence theo contract hiện tại, không đổi business rule.`
AI CODE: mutate only in-memory state until valid.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 140 — Repair protected
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Repair protected theo contract hiện tại, không đổi business rule.`
AI CODE: never swap away invalidly from MANUAL/OPEN_SHIFT.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 141 — Rerun cleanup
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Rerun cleanup theo contract hiện tại, không đổi business rule.`
AI CODE: remove only AUTO assignments.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 142 — Rerun preservation
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Rerun preservation theo contract hiện tại, không đổi business rule.`
AI CODE: preserve MANUAL/OPEN_SHIFT assignments.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 143 — Fairness replay
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Fairness replay theo contract hiện tại, không đổi business rule.`
AI CODE: compare cap enabled/disabled without ranking winner.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 144 — WEEK 06 checkpoint
Date: 24/08 → 30/08 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng WEEK 06 checkpoint theo contract hiện tại, không đổi business rule.`
AI CODE: report score, repair, rerun and hard-constraint tests.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

## WEEK 07 — FORENSIC AUDIT / P1 / SPATIAL (31/08 → 06/09)



### PROMPT 145 — Scheduler audit
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Scheduler audit theo contract hiện tại, không đổi business rule.`
AI CODE: trace real mutation path end to end.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 146 — P1-A reproduce
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng P1-A reproduce theo contract hiện tại, không đổi business rule.`
AI CODE: overnight availability 20–23 vs 22–06.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 147 — P1-A test
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng P1-A test theo contract hiện tại, không đổi business rule.`
AI CODE: add accept/reject date-aware cases.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 148 — P1-A fix
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng P1-A fix theo contract hiện tại, không đổi business rule.`
AI CODE: implement LocalDateTime interval handling.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 149 — P1-A verify
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng P1-A verify theo contract hiện tại, không đổi business rule.`
AI CODE: run focused regression.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 150 — P1-B reproduce
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng P1-B reproduce theo contract hiện tại, không đổi business rule.`
AI CODE: wrong-skill manual assignment counted as coverage.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 151 — P1-B test
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng P1-B test theo contract hiện tại, không đổi business rule.`
AI CODE: assert zero coverage/shortage.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 152 — P1-B matcher
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng P1-B matcher theo contract hiện tại, không đổi business rule.`
AI CODE: common skill/zone/workstation matcher.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 153 — P1-B verify
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng P1-B verify theo contract hiện tại, không đổi business rule.`
AI CODE: correct assignment remains countable.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 154 — P1-C review
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng P1-C review theo contract hiện tại, không đổi business rule.`
AI CODE: operating-hours behavior is contract, not automatic bug.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 155 — Ordering audit
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Ordering audit theo contract hiện tại, không đổi business rule.`
AI CODE: find unordered repository traversals.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 156 — Shift ordering
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Shift ordering theo contract hiện tại, không đổi business rule.`
AI CODE: stable date/time/UUID order.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 157 — Requirement ordering
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Requirement ordering theo contract hiện tại, không đổi business rule.`
AI CODE: stable skill/zone/UUID order.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 158 — Assignment ordering
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Assignment ordering theo contract hiện tại, không đổi business rule.`
AI CODE: stable staff/source/UUID order.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 159 — Staff skill ordering
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Staff skill ordering theo contract hiện tại, không đổi business rule.`
AI CODE: stable skill/level/UUID order.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 160 — Availability ordering
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Availability ordering theo contract hiện tại, không đổi business rule.`
AI CODE: stable day/time/UUID order.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 161 — Leave ordering
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Leave ordering theo contract hiện tại, không đổi business rule.`
AI CODE: stable date/UUID order.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 162 — Candidate ordering
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Candidate ordering theo contract hiện tại, không đổi business rule.`
AI CODE: stable candidate key.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 163 — Replay test
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Replay test theo contract hiện tại, không đổi business rule.`
AI CODE: equal state produces equal assignment digest.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 164 — Spatial layout
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Spatial layout theo contract hiện tại, không đổi business rule.`
AI CODE: load StoreLayout/StoreZone.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 165 — Spatial coordinates
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Spatial coordinates theo contract hiện tại, không đổi business rule.`
AI CODE: validate x/y/z and zone ownership.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 166 — Spatial allocation
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Spatial allocation theo contract hiện tại, không đổi business rule.`
AI CODE: implement/verify Greedy Max-Min Dispersion.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 167 — Spatial status
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Spatial status theo contract hiện tại, không đổi business rule.`
AI CODE: keep spatial coverage separate from staffing coverage.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 168 — WEEK 07 checkpoint
Date: 31/08 → 06/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng WEEK 07 checkpoint theo contract hiện tại, không đổi business rule.`
AI CODE: P1-A/P1-B resolved; ordering deterministic; spatial tests pass.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

## WEEK 08 — MARKETPLACE / WORKFORCE / ATTENDANCE / PAYROLL (07/09 → 13/09)



### PROMPT 169 — Open shift discovery
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Open shift discovery theo contract hiện tại, không đổi business rule.`
AI CODE: query real open shifts.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 170 — Marketplace eligibility
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Marketplace eligibility theo contract hiện tại, không đổi business rule.`
AI CODE: skill and availability filter.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 171 — Marketplace claim
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Marketplace claim theo contract hiện tại, không đổi business rule.`
AI CODE: create OPEN_SHIFT assignment.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 172 — Duplicate claim
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Duplicate claim theo contract hiện tại, không đổi business rule.`
AI CODE: return conflict without duplicate assignment.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 173 — Capacity
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Capacity theo contract hiện tại, không đổi business rule.`
AI CODE: close open shift at required headcount.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 174 — Claim concurrency
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Claim concurrency theo contract hiện tại, không đổi business rule.`
AI CODE: protect first-valid-first-served path.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 175 — Claim visibility
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Claim visibility theo contract hiện tại, không đổi business rule.`
AI CODE: verify `/users/me/shifts`.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 176 — Workforce request
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Workforce request theo contract hiện tại, không đổi business rule.`
AI CODE: Store A requests Store B staff.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 177 — Workforce authorization
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Workforce authorization theo contract hiện tại, không đổi business rule.`
AI CODE: permit only explicit sharing workflow.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 178 — Workforce eligibility
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Workforce eligibility theo contract hiện tại, không đổi business rule.`
AI CODE: enforce skill/availability/hours.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 179 — Workforce proposal
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Workforce proposal theo contract hiện tại, không đổi business rule.`
AI CODE: map actual statuses/actions.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 180 — Workforce response
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Workforce response theo contract hiện tại, không đổi business rule.`
AI CODE: accept/reject exact API payload.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 181 — Workforce workload
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Workforce workload theo contract hiện tại, không đổi business rule.`
AI CODE: include cross-store qualifying work globally.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 182 — Attendance eligibility
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Attendance eligibility theo contract hiện tại, không đổi business rule.`
AI CODE: bind current staff to assigned shift.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 183 — Attendance time
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Attendance time theo contract hiện tại, không đổi business rule.`
AI CODE: enforce check-in/out window.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 184 — Attendance location
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Attendance location theo contract hiện tại, không đổi business rule.`
AI CODE: validate GPS/geofence when configured.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 185 — Attendance media
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Attendance media theo contract hiện tại, không đổi business rule.`
AI CODE: validate selfie/QR multipart when present.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 186 — Attendance duplicate
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Attendance duplicate theo contract hiện tại, không đổi business rule.`
AI CODE: reject duplicate check-in safely.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 187 — Payroll period
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Payroll period theo contract hiện tại, không đổi business rule.`
AI CODE: create/generate backend payroll period.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 188 — Payroll hours
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Payroll hours theo contract hiện tại, không đổi business rule.`
AI CODE: derive worked/scheduled hours from backend records.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 189 — Payroll leave
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Payroll leave theo contract hiện tại, không đổi business rule.`
AI CODE: include approved paid leave and exclude unpaid leave.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 190 — Payslip status
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Payslip status theo contract hiện tại, không đổi business rule.`
AI CODE: preserve Draft/Confirmed/Paid transitions.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 191 — Payroll isolation
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Payroll isolation theo contract hiện tại, không đổi business rule.`
AI CODE: store/staff authorization for payslip reads/exports.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 192 — WEEK 08 checkpoint
Date: 07/09 → 13/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng WEEK 08 checkpoint theo contract hiện tại, không đổi business rule.`
AI CODE: marketplace/workforce/attendance/payroll regression green.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

## WEEK 09 — FULL TEST / SECURITY / RELEASE (14/09 → 20/09)



### PROMPT 193 — Full test baseline
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Full test baseline theo contract hiện tại, không đổi business rule.`
AI CODE: run `mvn -q clean test`.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 194 — Failure classification
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Failure classification theo contract hiện tại, không đổi business rule.`
AI CODE: separate production/test/fixture/infrastructure causes.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 195 — Skipped audit
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Skipped audit theo contract hiện tại, không đổi business rule.`
AI CODE: inspect every disabled test and dependency.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 196 — Test isolation
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Test isolation theo contract hiện tại, không đổi business rule.`
AI CODE: run suspicious classes individually and repeatedly.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 197 — Security matrix
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Security matrix theo contract hiện tại, không đổi business rule.`
AI CODE: verify auth/RBAC/store/staff isolation.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 198 — API contract
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng API contract theo contract hiện tại, không đổi business rule.`
AI CODE: verify methods/status/body/error mappings.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 199 — Migration review
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Migration review theo contract hiện tại, không đổi business rule.`
AI CODE: inspect Flyway ordering V1→V39.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 200 — V39 mapping
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng V39 mapping theo contract hiện tại, không đổi business rule.`
AI CODE: compare SQL/entity/repository/service and unique constraint.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 201 — Fresh DB decision
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Fresh DB decision theo contract hiện tại, không đổi business rule.`
AI CODE: do not claim pass without real PostgreSQL.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 202 — Redis decision
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Redis decision theo contract hiện tại, không đổi business rule.`
AI CODE: do not claim pass without real Redis.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 203 — Scheduler replay
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Scheduler replay theo contract hiện tại, không đổi business rule.`
AI CODE: run rollback-safe production-equivalent snapshot.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 204 — Replay invariants
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Replay invariants theo contract hiện tại, không đổi business rule.`
AI CODE: check skill/expiry/availability/leave/blackout/overlap/rest/weekly.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 205 — Coverage invariants
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Coverage invariants theo contract hiện tại, không đổi business rule.`
AI CODE: check requirement identity, shortage and duplicate matching.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 206 — Assignment safety
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Assignment safety theo contract hiện tại, không đổi business rule.`
AI CODE: verify AUTO cleanup and MANUAL/OPEN_SHIFT preservation.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 207 — Spatial invariants
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Spatial invariants theo contract hiện tại, không đổi business rule.`
AI CODE: verify spatial status does not alter staffing coverage.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 208 — Fairness A/B
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Fairness A/B theo contract hiện tại, không đổi business rule.`
AI CODE: enabled/disabled both cover 81 slots with shortage 0.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 209 — Deterministic digest
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Deterministic digest theo contract hiện tại, không đổi business rule.`
AI CODE: repeat replay and compare assignment maps.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 210 — Rollback digest
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Rollback digest theo contract hiện tại, không đổi business rule.`
AI CODE: compare pre/post/rollback database digests.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 211 — Package build
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Package build theo contract hiện tại, không đổi business rule.`
AI CODE: run `mvn -q -DskipTests package`.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 212 — Full stability
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Full stability theo contract hiện tại, không đổi business rule.`
AI CODE: run three clean test suites and compare counts.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 213 — Documentation audit
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Documentation audit theo contract hiện tại, không đổi business rule.`
AI CODE: classify current/historical/draft/QA/workflow Markdown.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 214 — Current status
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Current status theo contract hiện tại, không đổi business rule.`
AI CODE: update master status without overclaiming E2E.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 215 — Freeze scope
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Freeze scope theo contract hiện tại, không đổi business rule.`
AI CODE: Backend/Scheduler/API YES; Database conditional V39; Web/Mobile runtime gaps.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### PROMPT 216 — Final release
Date: 14/09 → 20/09 [RECONSTRUCTED DATE] · Status: 🟡 RECONSTRUCTED
STATE BEFORE: Trạng thái backend được kế thừa từ prompt trước trong cùng phase.
USER → AI: `Thực hiện và kiểm chứng Final release theo contract hiện tại, không đổi business rule.`
AI CODE: conclude only if no P0/P1; preserve deferred P2/P3 and stop.
VERIFY / NEXT: Chạy kiểm tra phù hợp, ghi nhận evidence và chuyển prompt kế tiếp.

### WEEK 09 CHECKPOINT

Expected verified baseline: 384 tests, 381 executed successfully, 0 failures,
0 errors, 3 explicitly skipped PostgreSQL/Redis-dependent tests. Production
equivalent scheduler evidence is deterministic and hard-constraint clean.
V39 is intended production migration requiring release-artifact review.
PostgreSQL/Redis fresh integration, full real-infrastructure E2E and final
authenticated Web/Mobile smoke remain verification gaps. Final status:
**RELEASE READY — FREEZE APPROVED WITH DOCUMENTED VERIFICATION GAPS**.
