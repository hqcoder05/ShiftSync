# 📅 ShiftSync - Smart Workforce Scheduling Platform

> **Thực tập tốt nghiệp** | **Nền tảng quản lý ca làm việc thông minh cho chuỗi F&B & Bán lẻ**

[![Java](https://img.shields.io/badge/Java-21-orange)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.1.0-brightgreen)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-Expo%20SDK%2051-007ACC)](https://expo.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.4-336791)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)](https://www.docker.com/)

---

## 📖 1. Tổng quan dự án (Problem Statement)
Các chuỗi cửa hàng F&B và bán lẻ (Popeyes, The Coffee House, GS25...) thường quản lý lịch làm việc của nhân viên part-time/full-time theo cách thủ công (Excel, Zalo, giấy tờ). Điều này dẫn đến hàng loạt vấn đề nghiêm trọng:
* 🚨 **Double-booking:** Xếp trùng ca cho 1 nhân viên.
* 📉 **Understaffed:** Ca thiếu người, không có hệ thống cảnh báo sớm.
* ❌ **Sai Role/Skill:** Assign nhân viên Kho vào ca cần Barista.
* 💸 **Tính lương sai:** Không track được giờ thực tế, OT, ca lễ.
* 🌪️ **Đổi ca hỗn loạn:** Nhắn tin Zalo thủ công, quản lý không cập nhật kịp.

💡 **ShiftSync** ra đời để số hóa toàn bộ quy trình: Từ khai báo lịch rảnh, **tự động xếp lịch (Auto-Scheduling)**, trao đổi ca (Marketplace), chấm công bằng QR + GPS, đến tính lương tự động.

---

## ✨ 2. Tính năng nổi bật (Key Features)

### 🧠 Auto-Scheduling Algorithm (Điểm nhấn kỹ thuật)
Không phải CRUD thuần túy, hệ thống sở hữu thuật toán tự xếp lịch tối ưu:
* **Hard Constraints (8 bước lọc):** Priority → Availability → Required Skill → Skill Level → Working Hours → Fair Distribution → Rest Time → Conflict.
* **Soft Scoring Model:** Chấm điểm ứng viên dựa trên 5 tiêu chí có trọng số cấu hình được (Availability 30%, Skill 30%, Hour 20%, Rest 10%, Fair 10%).
* **Hiệu năng:** Sinh lịch hợp lệ cho 20+ nhân viên trong < 5 giây.

### 🔄 Shift Swap & Open Shift Marketplace
* **State Machine:** Luồng đổi ca (Swap) và nhường ca (Give Away) có kiểm soát với 3 bước: Employee Request → Peer Accept → Manager Approve.
* **Race Condition Handling:** Sử dụng **Redis Distributed Lock** đảm bảo 2 nhân viên không thể claim cùng 1 Open Shift (First Valid First Served).

### 📍 QR Attendance & Geofence
* Chấm công bằng **QR Code động** (JWT signed, expiry 15 phút).
* **Geofence Validation:** Thuật toán **Haversine** tính khoảng cách thực tế trên mặt cầu, bắt buộc nhân viên phải nằm trong bán kính cấu hình của Store mới được check-in (không phụ thuộc Google Maps API).

### 💰 Payroll Engine & Export
* Tự động tính lương theo giờ thực tế (Attendance), hỗ trợ hệ số OT, Holiday Rate (cấu hình theo Store).
* Trạng thái Payroll Period: `Draft → Confirmed → Paid` (Finite State Machine).
* Export PDF (OpenPDF) và Excel (Apache POI).

### 🤖 AI & Advanced Features
* **Anomaly Detection:** Cảnh báo hành vi bất thường (Z-score > 2.5) dựa trên late_rate, absent_rate.
* **Vietnamese Chatbot:** Phân loại intent (GET_SCHEDULE, GET_SALARY...) bằng **TF-IDF + Cosine Similarity** (Java thuần, không gọi API ngoài).

---

## 🏗️ 3. Kiến trúc & Công nghệ (Tech Stack)

| Layer | Công nghệ | Ghi chú |
| :--- | :--- | :--- |
| **Backend** | Java 21, Spring Boot 4.1.0, Spring Security, JWT | Monolith, Layered Architecture (Controller-Service-Repo-DTO) |
| **Database** | PostgreSQL 16.4 | Flyway Migration, Soft Delete (Audit trail) |
| **Cache/Lock** | Redis 7 | Distributed Lock (Marketplace), Session |
| **Web Frontend**| React 18 (Vite), TailwindCSS | Dashboard cho Manager/Admin |
| **Mobile** | **React Native (Expo SDK 51)** | App cho Employee (QR, GPS, Swap) |
| **DevOps** | Docker, Docker Compose, Nginx, GitHub Actions | CI/CD, HTTPS (Let's Encrypt) |

---

## 👥 4. Đối tượng sử dụng (Actors)

| Actor | Vai trò | Quyền hạn chính |
| :--- | :--- | :--- |
| **Admin** | Chủ hệ thống / IT | Tạo Store, tạo Manager, xem báo cáo toàn hệ thống, cấu hình Holiday. |
| **Manager** | Quản lý cửa hàng | Tạo Skill/Template, Auto-Schedule, Approve Swap/Leave, Duyệt Payroll. |
| **Employee** | Nhân viên | Khai Availability, Đăng ký ca, Request Swap, Check-in QR, Xem Payslip. |

---

## 🚀 5. Hướng dẫn cài đặt & Chạy dự án (Local)

### Yêu cầu hệ thống
* Docker & Docker Compose
* Node.js 18+ & Expo CLI (cho Mobile)

### 1. Clone dự án
```bash
git clone https://github.com/hqcoder05/shiftsync.git
cd shiftsync
```

### 2. Khởi chạy Backend
Tài liệu hướng dẫn chi tiết về cách thiết lập môi trường (Bao gồm Docker, `.env` file, cài đặt PostgreSQL/Redis và chạy Spring Boot):
👉 [Xem Hướng dẫn cài đặt Backend (SETUP_BACKEND.md)](SETUP_BACKEND.md)

### 3. API Documentation
Tài liệu liệt kê danh sách các Endpoints và thông số Request/Response để Frontend gọi API:
👉 [Xem Danh sách API (API_LIST.md)](API_LIST.md)

---
*Dự án đang trong quá trình phát triển (WIP).*
