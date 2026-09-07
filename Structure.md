# ShiftSync - Project Structure & Architecture

Hệ thống được chia thành 3 phần chính: **Backend (Spring Boot)**, **Web Frontend (React)**, và **Mobile App (React Native)**.

## 1. Tựu chung (Root Directory)
```text
ShiftSync/
├── shiftsync-backend/       # Mã nguồn Backend (Java 21, Spring Boot 3)
├── ShiftSync-Web/           # Mã nguồn Web Admin (React, Vite, TailwindCSS)
├── ShiftSync-Mobile/        # Mã nguồn Mobile App cho nhân viên (React Native, Expo)
└── docs/                    # Các tài liệu phân tích nghiệp vụ, ERD, v.v.
```

## 2. Cấu trúc Backend (`shiftsync-backend`)

Backend áp dụng kiến trúc **Modular Monolith**, chia tách rõ ràng theo hướng Domain-Driven Design (DDD) để dễ dàng bảo trì và scale:

```text
com.shiftsync
├── shared/                          # 📦 MODULE CHUNG: Cấu hình, Security, Exception, Base DTO
├── config/                          # ⚙️ Cấu hình hệ thống (Scheduler Config, v.v.)
├── auth/                            # 🔐 MODULE AUTH: Đăng nhập, JWT, Quản lý tài khoản (User)
├── store/                           # 🏪 MODULE STORE: Cửa hàng, Cấu hình cửa hàng, Dashboard
├── employment/                      # 👥 MODULE EMPLOYMENT: Loại hợp đồng, Quản lý nhân sự
├── skill/                           # 🎓 MODULE SKILL: Kỹ năng & Yêu cầu kỹ năng
├── availability/                    # 📅 MODULE AVAILABILITY: Thời gian rảnh của nhân viên
├── leave/                           # 🏖️ MODULE LEAVE: Quản lý đơn nghỉ phép
├── shift/                           # 🕒 MODULE SHIFT: Ca làm, Đổi ca, Xếp ca tự động (Auto-Schedule)
├── layout/                          # 🧊 MODULE LAYOUT (3D): Sơ đồ không gian, Phân bổ nhân sự 3D
├── marketplace/                     # 🛒 MODULE MARKETPLACE: Chợ ca làm việc
├── attendance/                      # 📍 MODULE ATTENDANCE: Điểm danh (GPS/Selfie), Xin sửa công
├── payroll/                         # 💰 MODULE PAYROLL: Bảng lương, Tính toán thu nhập
├── notification/                    # 🔔 MODULE NOTIFICATION: Thông báo hệ thống & tùy chỉnh
├── workforce/                       # 🤝 MODULE WORKFORCE: Chia sẻ nhân lực liên chi nhánh
├── request/                         # 📩 MODULE REQUEST: Quản lý các loại yêu cầu của nhân viên
├── audit/                           # 📝 MODULE AUDIT: Ghi log, truy vết hành động
└── job/                             # ⏳ MODULE JOB: Các tiến trình chạy ngầm (Cron Jobs)
```

## 3. Cấu trúc Frontend Web (`ShiftSync-Web/src`)

```text
src/
├── assets/                          # Hình ảnh, Fonts, Icon
├── components/                      # Các UI Component tái sử dụng (Header, Sidebar, Modal...)
├── layouts/                         # Bố cục trang (Ví dụ: MainLayout có sidebar)
├── pages/                           # Các màn hình chính (Dashboard, Schedule, Payroll, Stores...)
├── services/                        # Call API Backend (api.js, authService, requestService...)
└── utils/                           # Các hàm tiện ích (Format ngày giờ, tiền tệ...)
```

## 4. Cấu trúc Mobile App (`ShiftSync-Mobile`)

```text
ShiftSync-Mobile/
├── assets/                          # Hình ảnh, Icon ứng dụng, Splash screen
├── components/                      # UI Component dùng chung (BottomNavbar...)
├── navigation/                      # Cấu hình chuyển trang (AppNavigator - Stack/Tab)
├── screens/                         # Các màn hình App (Login, Schedule, Attendance, Profile...)
└── services/                        # Tương tác API với Backend
```