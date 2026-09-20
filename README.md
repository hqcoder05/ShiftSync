# ShiftSync — Báo cáo tổng quan hệ thống

[![Java 21](https://img.shields.io/badge/Java-21-orange?logo=openjdk&logoColor=white)](https://www.oracle.com/java/)
[![Spring Boot 4.1.1](https://img.shields.io/badge/Spring%20Boot-4.1.1-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-Cache%20%2F%20Lock-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![React](https://img.shields.io/badge/React-19.2.8-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.2.0-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86.3-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2057-000020?logo=expo&logoColor=white)](https://expo.dev/)

Tài liệu liên quan: [Kiến trúc và cấu trúc hệ thống](Structure.md) · [Hướng dẫn cài đặt](SETUP.md)

Thiết kế giao diện: [Figma ShiftSync](https://www.figma.com/design/Qss4tUQPpPzz6w2hERSSrL/Untitled?node-id=1-104&t=d5LDFGef5zzDwpGX-1)

## 1. Giới thiệu

ShiftSync là nền tảng quản lý ca làm việc cho chuỗi F&B và bán lẻ. Hệ thống hỗ trợ quản lý nhân sự, khai báo thời gian rảnh, lập lịch thủ công và tự động, trao đổi ca, chấm công và tính lương.

## 2. Phạm vi chức năng

- Quản lý tài khoản, vai trò và phân quyền.
- Quản lý cửa hàng, nhân sự, hợp đồng và kỹ năng.
- Availability, blackout date và leave request.
- Shift, skill requirement và shift assignment.
- Demand planning và AutoSchedule.
- Layout, zone và spatial allocation.
- Marketplace và workforce sharing liên chi nhánh.
- Attendance GPS/selfie và attendance adjustment.
- Payroll period, payslip, báo cáo và notification.

## 3. Kiến trúc tổng thể

```text
ShiftSync/
├── shiftsync-backend/       Backend Spring Boot và REST API
├── ShiftSync-Web/           Web dashboard cho Manager/Admin
├── ShiftSync-Mobile/        Mobile app cho Staff
└── docs/                    Tài liệu nghiệp vụ và thiết kế
```

Backend là nguồn xử lý nghiệp vụ trung tâm. Web và Mobile giao tiếp với Backend qua REST API và dùng chung quy tắc phân quyền.

Chi tiết module, luồng xử lý và nguyên tắc kiến trúc được trình bày trong [Structure.md](Structure.md).

## 4. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Backend | Java 21, Spring Boot 4.1.1, Spring Security, Spring Data JPA, Validation, WebSocket, Actuator |
| Authentication | JWT 0.12.5, Spring Security, BCrypt |
| Database | PostgreSQL, Hibernate/JPA, Flyway |
| Cache và lock | Spring Data Redis, Redisson 3.44.0 |
| API documentation | Springdoc OpenAPI 2.8.0 |
| Backend libraries | Lombok, Firebase Admin 9.2.0, Apache POI 5.3.0, OpenPDF 1.3.39 |
| Backend build/test | Maven, JUnit và Spring Boot Test |
| Web | React 19.2.8, Vite 8.2.0, React Router 7.18.2, Axios |
| Web 3D | Three.js 0.185.1, React Three Fiber 9.7.0, Drei 10.7.8, Babylon.js 9.25.0 |
| Mobile | React Native 0.86.3, Expo SDK 57, React Navigation 7 |
| Mobile native | Expo Camera, Expo Location, AsyncStorage, DateTimePicker, React Native SVG, Expo GL |

## 5. Cài đặt và khởi chạy

Xem hướng dẫn cài đặt Backend, Web và Mobile tại [SETUP.md](SETUP.md).

Tài liệu API: [API_LIST.md](API_LIST.md) và [API_Draft.md](API_Draft.md).

Tài liệu nghiệp vụ và thiết kế: [docs/01_Business_Analysis.md](docs/01_Business_Analysis.md), [Structure.md](Structure.md) và [SHIFTSYNC_CURRENT_SYSTEM_STATUS.md](SHIFTSYNC_CURRENT_SYSTEM_STATUS.md).

## 6. Trạng thái hệ thống

Trạng thái hiện tại: `RELEASE READY — FREEZE APPROVED WITH DOCUMENTED VERIFICATION GAPS`.

- Backend: 384 test được thống kê, 381 test thực thi thành công, 0 failure, 0 error và 3 test hạ tầng bị skip.
- Scheduler: hard constraint, coverage accounting và deterministic ordering đã được kiểm tra theo phạm vi hiện tại.
- Migration V39 cần được review và đưa vào release artifact khi triển khai production.
- PostgreSQL/Redis integration và full authenticated Web/Mobile smoke cần được chạy riêng khi chốt môi trường phát hành.

Chi tiết xem [SHIFTSYNC_CURRENT_SYSTEM_STATUS.md](SHIFTSYNC_CURRENT_SYSTEM_STATUS.md).

## 7. Bối cảnh và vấn đề nghiệp vụ

Các chuỗi F&B và bán lẻ thường quản lý nhân sự part-time/full-time bằng bảng tính, tin nhắn hoặc quy trình thủ công. Cách làm này gây ra các vấn đề:

- Một nhân viên có thể bị xếp trùng nhiều ca.
- Ca làm có thể thiếu người nhưng không có cảnh báo coverage rõ ràng.
- Nhân viên không đủ skill vẫn có thể bị gán vào requirement sai.
- Availability, leave, blackout và minimum rest khó được kiểm soát đồng nhất.
- Đổi ca và nhượng ca qua nhiều bước dễ mất đồng bộ giữa nhân viên và quản lý.
- Giờ check-in thực tế có thể khác lịch dự kiến, dẫn đến sai payroll.

ShiftSync tập trung đưa các quy tắc này vào Backend và cung cấp một quy trình dữ liệu thống nhất từ demand planning đến payslip.

## 8. Đối tượng sử dụng và phân quyền

| Vai trò | Phạm vi chính |
|---|---|
| ADMIN | Quản lý hệ thống, store, manager, user và cấu hình toàn cục |
| MANAGER | Quản lý nhân sự trong store, demand, schedule, assignment, request, attendance và payroll |
| STAFF | Xem lịch cá nhân, khai báo availability, claim open shift, gửi request, chấm công và xem payslip |

Backend kiểm tra JWT, role, ownership và store scope cho từng endpoint. Client không được tự quyết định quyền hoặc tự tính business result thay Backend.

## 9. AutoSchedule và tối ưu lịch

AutoSchedule nhận demand/headcount requirement, shift và dữ liệu nhân sự để tạo assignment. Quy trình xử lý được tổ chức thành các bước:

1. Nạp các staff đang ACTIVE trong phạm vi store.
2. Nạp employment, contract, skill và StaffSkill.
3. Kiểm tra skill requirement và thời hạn skill.
4. Lọc availability theo ngày và khoảng thời gian của shift, bao gồm khoảng qua midnight.
5. Loại staff có approved leave hoặc blackout date.
6. Loại overlap với assignment hiện hữu.
7. Kiểm tra weekly hours, monthly hours và minimum rest.
8. Tạo candidate list cho từng requirement.
9. Áp dụng MRV để xử lý requirement khó trước.
10. Chấm điểm skill level, utilization, availability và fairness.
11. Áp dụng deterministic tie-break và canonical ordering.
12. Tạo assignment nguồn `AUTO` và ghi nhận shortage nếu không đủ candidate.
13. Khi rerun, chỉ xử lý assignment được phép tự động thay đổi và giữ assignment thủ công theo business rule.
14. Thực hiện local repair khi có thể cải thiện coverage mà không phá hard constraint.

Các hard constraint được ưu tiên hơn soft score. Availability, skill, leave, blackout, overlap, rest và giới hạn giờ không được biến thành một điểm số tùy chọn.

## 10. Spatial allocation

Module `layout` biểu diễn store layout, store zone và vị trí làm việc. Sau khi assignment hợp lệ, hệ thống có thể phân bổ nhân viên vào zone dựa trên các ràng buộc không gian và mục tiêu phủ đều. Spatial allocation không được ghi đè kết quả kiểm tra staffing hoặc thay đổi nguồn assignment.

## 11. Marketplace và workforce sharing

Marketplace hỗ trợ open shift và quy trình claim ca:

```text
Open shift → Staff claim → Backend kiểm tra eligibility
           → lock/concurrency check → assignment hoặc conflict response
```

Chỉ claim hợp lệ đầu tiên được chấp nhận khi có cạnh tranh đồng thời. Workforce sharing mở rộng quy trình sang các chi nhánh khác, có request, consent, trạng thái và kiểm tra store scope.

## 12. Attendance và payroll

Attendance gồm check-in, check-out, GPS/geofence, selfie và attendance adjustment. Khoảng cách GPS được kiểm tra ở Backend bằng dữ liệu store configuration và công thức khoảng cách phù hợp.

Payroll sử dụng payroll period, shift assignment và attendance thực tế. Trạng thái kỳ lương được quản lý theo chuỗi:

```text
Draft → Confirmed → Paid
```

Mobile/Web chỉ hiển thị payslip và các field Backend trả về. Không client nào được tự tạo estimated payroll khi Backend không có payslip.

## 13. Luồng dữ liệu chính

### Demand đến Schedule

```text
Headcount quota
  → Shift requirement
  → AutoScheduleService
  → candidate filtering/scoring
  → ShiftAssignment
  → Schedule API
```

### Attendance đến Payroll

```text
Check-in/out
  → Attendance record
  → Payroll calculation service
  → Payroll period
  → Payslip
  → Web/Mobile display
```

### Request và notification

```text
Staff request
  → validation và authorization
  → approval/rejection state
  → assignment/leave impact
  → notification và refreshed client state
```

## 14. API và tài liệu tích hợp

REST API được triển khai trong các Controller theo domain. Một số nhóm endpoint chính:

| Nhóm | Chức năng |
|---|---|
| `/api/auth` | Login, refresh token và authentication |
| `/api/users/me` | Profile, shifts, payslips và dữ liệu cá nhân |
| `/api/stores` | Store, configuration, staff và dashboard |
| `/api/availability` | Availability theo tuần và blackout |
| `/api/leave` | Tạo, duyệt và theo dõi leave request |
| `/api/shifts` | Shift, requirement, assignment và schedule |
| `/api/marketplace` | Open shift và claim |
| `/api/workforce` | Workforce sharing và proposal/request |
| `/api/attendance` | Check-in/out và adjustment |
| `/api/payroll` | Payroll period, payslip và export |

API contract gồm request DTO, response DTO, validation và error mapping. Swagger UI có tại `/swagger-ui/index.html` khi Backend đang chạy.

## 15. Cấu trúc kiểm thử và chất lượng

Backend tests được tổ chức theo service/domain và bao phủ authentication, RBAC, repository query, leave, shift assignment, AutoSchedule, fairness, marketplace, attendance, payroll và security hardening.

Các nhóm kiểm tra quan trọng:

- Unit test cho business service và validator.
- Controller/API test cho status code, payload và lỗi.
- Security test cho role, ownership và store isolation.
- Scheduler regression test cho hard constraint, candidate selection, scoring và deterministic ordering.
- Migration/schema test cho Flyway và unique constraint.
- Build/package test bằng Maven.
- Replay hoặc A/B test cho các thay đổi thuật toán khi có fixture phù hợp.

## 16. Khởi chạy nhanh

```bash
cd shiftsync-backend
./mvnw spring-boot:run

cd ../ShiftSync-Web
npm install
npm run dev

cd ../ShiftSync-Mobile
npm install
npx expo start
```

Database PostgreSQL và Redis phải sẵn sàng trước khi chạy các flow phụ thuộc persistence và distributed lock. Chi tiết biến môi trường và network Mobile xem [SETUP.md](SETUP.md).
