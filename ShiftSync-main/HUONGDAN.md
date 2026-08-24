1. Những file cần đính kèm (Attach Files)
Bạn hãy đảm bảo 3 file này luôn được cập nhật mới nhất trong repository và đính kèm vào chat mới:
01_Business_Analysis.docx (File gốc cung cấp 40 FRs, 57 BRs, Scoring Model, Enum Catalog...).
TechStack.md (Chốt phiên bản: Spring Boot 4.1.0, Java 21, React 19, RN Expo 53, PostgreSQL 16.4, Redis 7.4...).
API_Draft.md (Cấu trúc Modular Architecture và danh sách 25+ REST API endpoints).
(Tùy chọn nếu đã code): Chụp ảnh hoặc copy nội dung file V1__init_schema.sql (Flyway) hoặc docker-compose.yml nếu đang hỏi về Database/Hạ tầng.
2. Đoạn Prompt Khởi Động (Copy và Paste vào Chat mới)
Hãy copy toàn bộ đoạn text trong khung dưới đây, điền thông tin nhiệm vụ hiện tại của bạn vào chỗ
Chào bạn, tôi đang làm đồ án tốt nghiệp "ShiftSync (SynsShift) - Hệ thống quản lý ca làm cho F&B và bán lẻ". 

Dưới đây là bối cảnh dự án và các quyết định kỹ thuật đã chốt. Hãy đọc kỹ các file đính kèm (01_Business_Analysis.docx, TechStack.md, API_Draft.md) và ghi nhớ các quy tắc bất di bất dịch sau trước khi trả lời bất kỳ câu hỏi nào của tôi:

=== 📌 QUY TẮC BẤT DI BẤT DỊCH (CONTEXT) ===
1. Tech Stack: Backend dùng Spring Boot 4.1.0 + Java 21. Frontend Web dùng React 19 + Vite + Three.js (R3F) cho Dashboard 3D. Mobile dùng React Native (Expo SDK 53). DB dùng PostgreSQL 16.4 + Redis 7.4 (cho Distributed Lock).
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
Chốt Tech Stack (TechStack.md): Spring Boot 4.1.0, React 19, RN Expo 53...
Thiết kế Backend (API_Draft.md): Cấu trúc 13 modules và 25+ API endpoints.
Setup Hạ tầng (Tuần 3): Đã tạo project Spring Boot 4.1.0, viết docker-compose.yml, cấu hình application.yml, chạy thành công docker-compose up (Postgres + Redis + App Healthy).
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