# Developer Log - ShiftSync Web

## [2026-08-13] - Quan ly Nhan vien & Phan trang API (Employee Management UI)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Xay dung giao dien Quan ly Nhan vien ket noi API backend that (phan trang, tim kiem, CRUD).

### 1. Cong viec da thuc hien
* Khoi tao API Service (src/services/employeeService.js) dinh nghia cac phuong thuc ket noi Backend: getEmployees, getEmployeeById, createEmployee, updateEmployee, deleteEmployee.
* Xay dung Component Modal Form (src/components/Employee/EmployeeModal.jsx) tai su dung cho ca 2 thao tac Them moi va Chinh sua.
* Dung Trang Danh sach (src/pages/EmployeeListPage.jsx) hien thi bang thong tin, tich hop tim kiem real-time va bo phan trang.

### 2. Van de Ky thuat & Giai phap
* Van de: So luong nhan vien lon lam giam hieu nang render bang du lieu.
* Giai phap: Ap dung phan trang phia server (server-side pagination) thong qua Spring Data Pageable giup tai du lieu theo tung trang 10-20 ban ghi.

### 3. Ke hoach tiep theo
* Xay dung giao dien Lich lam viec va dieu phoi ca truc tren Web.

----------------------------------------------------------------------------------------------
## [2026-08-24] - Quan ly Yeu cau & Duyet Cho ca (Staff Request Management)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Xay dung trang RequestPage.jsx va he thong API Backend com.shiftsync.request cho phep Quan ly phe duyet ca truc va dieu phoi lien chi nhanh.

### 1. Cong viec da thuc hien
* Thiet ke Thanh cong cu Capsule bo trong (.req-capsule-card) tich hop nut Lich tuan kem Mini-Calendar popover va nut Tao yeu cau tone vang ho phach.
* Xay dung Bang du lieu yeu cau gon gang, hien thi avatar nguoi gui, trang thai dang chu thuan (Da phe duyet, Da tu choi, Dang cho phe duyet).
* Xay dung bo loc thong minh (Checkbox loai don, Checkbox trang thai, Smart Search tim kiem theo tu khoa).
* Xay dung Modal xem chi tiet / phe duyet truc tiep va Modal Tao yeu cau gui den Quan ly chi nhanh khac.
* Tinh chinh Header.jsx: Dat box active mau den #1E1E1E va phong to icon Reports.
* Xay dung Backend: Flyway migration V10 tao bang staff_requests, Entity StaffRequest, Repository, Service va Controller REST API /api/requests.

### 2. Van de Ky thuat & Giai phap
* Van de: Dam bao he thong hoat dong lien tuc ngay ca khi Backend CSDL tam thoi gian doan.
* Giai phap: Ap dung mo hinh Dual Persistence Layer trong requestService.js, uu tien goi API that va fallback tu dong vao localStorage khi offline.

### 3. Ke hoach tiep theo
* Dong bo giao dien trang Quan ly Cham cong (AttendancePageLive.jsx) theo phong cach thanh lich cua trang Lich.

----------------------------------------------------------------------------------------------
## [2026-08-25] - Dong bo Giao dien Cham cong & Thanh Cong cu Capsule (Attendance Page Modernization)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Tinh chinh trang Quan ly Cham cong (AttendancePageLive.jsx) theo dung bo cuc trang Schedule, xoa bo cac icon thua va xay dung thanh Capsule hanh dong.

### 1. Cong viec da thuc hien
* Tai cau truc Sidebar Bo loc: Chi giu lai 2 khoi chuan la Chi nhanh (dropdown mo rong/thu gon muot ma) va Nguoi dung (danh sach cuon kem avatar va muc "Tat ca").
* Loai bo toan bo cac icon trang tri khong can thiet o tieu de va bo loc de tao giao dien tap trung vao du lieu.
* Xay dung Thanh Capsule bo tron (.att-capsule-card) o goc phai:
  * Nut trai: Tom tat bang luong (tone xanh ngoc #ccfbf1, chu #0f766e) dieu huong truc tiep den /payroll.
  * Vach chia doc thanh manh |.
  * Nut phai: Xuat (tone vang ho phach #FEF3C7, chu #92400E) xuat du lieu cham cong ra CSV.
* Tich hop Day/Week toggle pill va Date Navigator kem Calendar Popover chon ngay/tuan nhanh.

### 2. Van de Ky thuat & Giai phap
* Van de: Cung cap bo loc nguoi dung mượt mà tren bang cham cong lon ma khong gay re-fetch API lien tuc.
* Giai phap: Su dung React useMemo loc du lieu client-side tu state danh sach cham cong da tai, giup phan hoi thao tac loc trong duoi 2ms.

### 3. Ke hoach tiep theo
* Tai thiet ke toan dien trang Bang luong (PayrollPage.jsx) theo tai lieu luongweb.docx va anh minh hoa luong.png.

----------------------------------------------------------------------------------------------
## [2026-08-26] - Tai thiet ke Quan ly Bang luong & Modal Xuat Excel (Payroll Management System)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Xay dung trang PayrollPage.jsx va PayrollPage.css chuan 100% theo tai lieu luongweb.docx va mockup luong.png, ho tro tinh toan luong tu dong realtime.

### 1. Cong viec da thuc hien
* Sidebar trai:
  * Bo chon ky luong dropdown chuyen doi cac thang.
  * Nut thao tac CLOSE PERIOD / XUAT BANG LUONG.
  * Khung cau hinh muc luong/gio (baseHourlyRate) cho phep Quan ly dieu chinh don gia va tu dong tinh lai toan bo tien luong.
  * Bo loc nhan vien theo danh sach avatar tron kem chuc danh, highlight xam (#CFCFCF) khi chon 1 nhan vien cu the.
* Bang tinh luong phai:
  * Header xanh ngoc (#EAF8E6) gom: Nhan vien, Gio lam, Tang ca, Tong gio lam, Thuong, Tro cap, Chi phi khac (chu do #C60D1C), Tong luong.
  * Dong tong ket chan bang (#E8E8E8) tu dong cong don gio cong va chi phi luong.
* Modal Xuat bang luong:
  * Chia 2 cot chuan image4.png: Cot trai chua anh minh hoa luong.png, vach chia xanh la #51A33D.
  * Cot phai chua nut Download Excel File (ket noi API /api/stores/{storeId}/payroll/{periodId}/export/excel) va hop canh bao xac nhan chot luong vien vang.

### 2. Van de Ky thuat & Giai phap
* Van de: Xử lý xuất file Excel dạng nhị phân (.xlsx blob) an toàn qua HTTP request.
* Giai phap: Cấu hình Axios responseType: 'blob' và tạo URL tạm thời URL.createObjectURL để tải file trực tiếp xuống máy tính của Quản lý mà không bị lỗi mã hóa font tiếng Việt.

### 3. Ke hoach tiep theo
* Kiểm thử build toàn diện Frontend Web và xác minh tính tương thích trên các kích thước màn hình.

----------------------------------------------------------------------------------------------
## [2026-08-28] - Kiem thu Tich hop He thong & Dong bo Du lieu CSDL Real-time (System Verification)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Kiem thu toan bo cac phan he Web, kiem tra ket noi API CSDL that va toi uu hoa build production bundle.

### 1. Cong viec da thuc hien
* Kiem thu tinh toan luong tu dong giua gio check-in/out cham cong va bang luong.
* Xac minh luong xuat file bao cao Excel tu Backend Spring Boot.
* Chay lenh build production npm run build tren ShiftSync-Web: Thanh cong 100% trong 472ms voi 0 loi, tao bundle dist toi uu.

### 2. Van de Ky thuat & Giai phap
* Van de: Dam bao cac style CSS giua trang Schedule, Attendance, Request va Payroll dong nhat ve he thong mau sac va radius bo goc.
* Giai phap: Quy chuan hoa cac bien CSS (:root) gom --pay-primary, --att-primary, --req-primary giup giao dien dong bo chat che.

### 3. Ke hoach tiep theo
* Chuan bi tai lieu bao cao thuc tap va slide trinh bay tong ket du an.