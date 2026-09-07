# 🚀 ShiftSync - Smart Workforce Scheduling Platform

> **Thực tập tốt nghiệp** | **Nền tảng quản lý ca làm việc thông minh cho chuỗi F&B & Bán lẻ**

[![Java](https://img.shields.io/badge/Java-21-orange)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.x-brightgreen)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-Expo%20SDK%2051-007ACC)](https://expo.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.4-336791)](https://www.postgresql.org/)

---

## 🎯 1. Tổng quan dự án (Problem Statement)
Các chuỗi cửa hàng F&B và bán lẻ thường quản lý lịch làm việc của nhân viên part-time/full-time theo cách thủ công. Điều này dẫn đến hàng loạt vấn đề:
* 🔀 **Double-booking:** Xếp trùng ca cho 1 nhân viên.
* 📉 **Understaffed:** Ca thiếu người, không có hệ thống cảnh báo.
* ❌ **Sai Role/Skill:** Gán nhân viên sai kỹ năng.
* 💸 **Tính lương sai:** Không theo dõi được giờ thực tế, OT.
* 🔄 **Đổi ca hỗn loạn:** Nhắn tin thủ công, quản lý không cập nhật kịp.

💡 **ShiftSync** ra đời để số hóa toàn bộ quy trình: Từ khai báo lịch rảnh, **tự động xếp lịch (Auto-Scheduling)**, phân bổ không gian (3D Layout), trao đổi ca (Marketplace), điểm danh bằng tọa độ GPS/Selfie, đến tính lương tự động.

---

## 🌟 2. Tính năng nổi bật (Key Features)

### 🤖 Auto-Scheduling & 3D Spatial Allocation
Hệ thống sở hữu thuật toán tối ưu xếp lịch và không gian phục vụ:
* **Constraint-Aware Greedy Max-Min Dispersion:** Thuật toán phân bổ nhân viên vào các khu vực 3D (Zone) của cửa hàng sao cho khoảng cách giữa các nhân viên là lớn nhất, tối ưu độ phủ không gian.
* **Auto-Scheduling:** Tự động xếp lịch dựa trên Hard Constraints (Availability, Skill, Working Hours) và Soft Scoring.

### 🔄 Shift Swap & Marketplace
* **State Machine:** Luồng đổi ca và nhượng ca (Give away) được kiểm soát chặt chẽ.
* **Race Condition Handling:** Sử dụng **Optimistic Locking (@Version)** để đảm bảo 2 nhân viên không thể nhận cùng 1 ca Open Shift trong Marketplace (First Valid First Served).

### 📍 Attendance (GPS & Selfie)
* Chấm công chặt chẽ kết hợp tọa độ **GPS (Haversine Formula)** và hình ảnh Selfie minh chứng.
* Hỗ trợ luồng Gửi Yêu Cầu Chỉnh Sửa Công (Attendance Adjustment) với sự phê duyệt của Quản lý.

### 💰 Payroll & Dashboard
* Tự động tính lương theo giờ check-in thực tế.
* Dashboard thống kê Real-time các chỉ số kinh doanh, hiệu suất và chấm công.

---

## 🏗️ 3. Kiến trúc & Công nghệ (Tech Stack)

Hệ thống được thiết kế theo kiến trúc **Full-stack Monorepo** (gồm Backend, Web Admin, Mobile App):

| Layer | Công nghệ | Ghi chú |
| :--- | :--- | :--- |
| **Backend** | Java 21, Spring Boot 3, Spring Security, JWT | Modular Monolith, Layered Architecture |
| **Database** | PostgreSQL 16.4 | Flyway Migration, Hibernate |
| **Web Frontend**| React 18 (Vite), TailwindCSS | Dashboard dùng cho Manager/Admin |
| **Mobile** | React Native (Expo) | Ứng dụng điện thoại cho Employee (GPS, Selfie) |

---

## 👥 4. Đối tượng sử dụng (Actors)

| Actor | Vai trò | Quyền hạn chính |
| :--- | :--- | :--- |
| **Manager** | Quản lý cửa hàng | Vẽ sơ đồ 3D cửa hàng, Xếp ca tự động, Duyệt yêu cầu đổi ca/sửa công, Xem Dashboard. |
| **Employee** | Nhân viên | Khai báo thời gian rảnh, Đăng ký ca, Chấm công GPS, Yêu cầu đổi ca. |

---

## 🚀 5. Hướng dẫn cài đặt & Khởi chạy (Local)

Vui lòng xem chi tiết hướng dẫn cài đặt toàn bộ hệ thống (Backend, Web, Mobile) tại:
👉 [Xem Hướng dẫn cài đặt (SETUP.md)](SETUP.md)

---
*Dự án Thực tập tốt nghiệp.*
