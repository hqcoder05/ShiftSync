# Developer Log - ShiftSync Project

## [2026-08-09] - Kiem thu API Authentication & Cau hinh Docker Postgres
* Nguoi thuc hien: Quoc (Systems) & Duyen (Testing)
* Muc tieu: Test day du cac test case API Auth bang Postman va xu ly cau hinh moi truong CSDL Docker.

### 1. Cong viec da thuc hien
* Test day du 9 test case API Auth (register, login, refresh token) bang Postman, ket qua 9/9 Pass, khong phat hien bug. Ghi vao Auth_Test_Report.md.
* Xu ly cau hinh JWT_SECRET trong .env va reset volume container Postgres.

----------------------------------------------------------------------------
## [2026-08-13] - Quan ly Nhan vien & Khai bao Lich Ranh (Tuần 4)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Xay dung giao dien Quan ly Nhan vien tren Web (EmployeeListPage.jsx) va Khai bao Lich ranh tren Mobile (AvailabilityScreen.js).

### 1. Cong viec da thuc hien
* Web: Xay dung EmployeeModal.jsx va EmployeeListPage.jsx tich hop API phan trang va tim kiem real-time.
* Mobile: Xay dung AvailabilityScreen.js cho phep nhan vien chon khung gio ranh theo tung ngay va luu vao backend.

----------------------------------------------------------------------------
## [2026-08-23] - Lich Lam Viec & Dong bo Ma mau Ca truc (Tuần 5)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Xay dung man hinh Lich lam viec tren Mobile (ScheduleScreen.js) dong bo ma mau ca truc Barista, Cashier, Kitchen, Service voi ban Web.

### 1. Cong viec da thuc hien
* Mobile: Xay dung ScheduleScreen.js voi thanh 7 ngay trong tuan, bo chuyen Tab My shifts / Schedule, the ca truc co mau sac tuong ung.

----------------------------------------------------------------------------
## [2026-08-24] - Quan ly Yeu cau & Duyet Cho ca (Tuần 6)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Phat trien tinh nang Duyet cho ca va gui yeu cau nhan su tren Web (RequestPage.jsx) va Mobile (RequestScreen.js).

### 1. Cong viec da thuc hien
* Web: Xay dung RequestPage.jsx voi thanh Capsule bo tron (.req-capsule-card), bo loc loai don/trang thai, Modal duyet ca va tao yeu cau lien chi nhanh.
* Mobile: Xay dung RequestScreen.js cho phep nhan vien gui don xin doi ca, xin nghi phep va theo doi trang thai duyet.
* Backend: Tao bang staff_requests, JPA Entity, Service va REST API Controller /api/requests.

----------------------------------------------------------------------------
## [2026-08-25] - Dong bo Cham cong Web & Thiet ke Ho so Mobile (Tuần 6)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Dong bo trang Cham cong Web (AttendancePageLive.jsx) theo giao dien Schedule va xay dung man hinh Ho so Mobile (ProfileScreenApi.js).

### 1. Cong viec da thuc hien
* Web: Sidebar Chi nhanh va Nguoi dung gon gang, thanh Capsule bo tron (.att-capsule-card) voi nut Tom tat bang luong (xanh ngoc) va nut Xuat (vang ho phach).
* Mobile: Xay dung man hinh Ho so the vang (#FFF8E1) va 2 khoi the trang Thong tin ca nhan, Thong tin dang nhap theo Ho so.docx.

----------------------------------------------------------------------------
## [2026-08-26] - Quan ly Bang luong Web & Modal Xuat Excel (Tuần 6)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Tai thiet ke toan dien trang Bang luong Web (PayrollPage.jsx) theo luongweb.docx va anh minh hoa luong.png.

### 1. Cong viec da thuc hien
* Web: Sidebar chon ky luong, o thiet lap luong/gio (baseHourlyRate), bo loc nhan vien avatar tron highlight xam (#CFCFCF), bang tinh luong realtime day du cac cot Gio lam/Tang ca/Thuong/Tro cap/Chi phi khac/Tong luong.
* Web: Modal Xuat bang luong chia 2 cot voi anh luong.png va nut Download Excel File ket noi API backend.

----------------------------------------------------------------------------
## [2026-08-27] - Phieu luong & Bao cao Thu nhap Mobile (Tuần 6)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Xay dung man hinh Phieu luong Mobile (PayrollScreen.js) theo luongmobile.docx gom 2 che do xem.

### 1. Cong viec da thuc hien
* Mobile: View 1 Danh sach phieu luong thang (Tong phieu luong 2026, nut lich, danh sach cac thang) va View 2 Bao cao thu nhap chi tiet the xanh (#EAF8E6), 3 the con trang (Tong tien, Phu phi, Tro phi), 3 khoi thong tin chi tiet.
* Mobile: Dong bo widget Bao cao thu nhap tai Trang chu (DashboardScreen.js).

----------------------------------------------------------------------------
## [2026-08-28] - Inline Editing Ho so & Ket noi CSDL Ca lam Thuc te (Tuần 6)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Chuyen doi Ho so Mobile sang Inline Editing truc tiep tren trang, ket noi CSDL ca lam that tu API backend, loai bo mock data.

### 1. Cong viec da thuc hien
* Mobile: ProfileScreenApi.js chuyen sang TextInput truc tiep tren trang, auto-save vao AsyncStorage, loai bo hoan toan Modal popup.
* Mobile: ScheduleScreen.js ket noi API /api/users/me/shifts va /api/stores/{storeId}/shifts lay ca lam thuc te.
* Kiem thu: npm run build Web thanh cong trong 663ms (0 loi); npx expo export Mobile thanh cong 100% tren Web, Android, iOS.