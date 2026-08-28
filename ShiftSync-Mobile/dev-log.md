# Developer Log - ShiftSync Mobile

## [2026-08-07] - Khoi tao Kien truc Mobile & He thong Dieu huong
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Tai cau truc ung dung React Native su dung Expo Framework, to chuc thu muc src chuan va cau hinh 5 Tab dieu huong chinh.

### 1. Cong viec da thuc hien
* Khoi tao du an React Native su dung Expo Framework.
* Thiet lap he thong dieu huong dang Tab (@react-navigation/bottom-tabs) dong bo chuc nang voi ban Web.
* To chuc cau truc thu muc ma nguon chuan Mobile: src/screens, src/navigation, src/components, src/services.
* Khoi tao 5 Man hinh (Screens) chinh dai dien cho cac phan he nghiep vu: Dashboard, Lich lam viec, Diem danh, Phieu luong, Yeu cau.
* Kiem thu ung dung truc tiep tren thiet bi that qua moi truong Expo Go.

### 2. Van de Ky thuat & Giai phap
* Van de: Khoi tao kho ma nguon doc lap dan den viec lech quy trinh quan ly code chung cua nhom tren GitHub Repository.
* Giai phap: Tien hanh dong bo va di chuyen ma nguon ve dung thu muc du an chuan (D:\Projects\ShiftSync\ShiftSync-Mobile), dong bo lai Git Remote va luong Push code len Repository nhom.

### 3. Ke hoach tiep theo
* Ket hop cung ban Web trien khai man hinh Dang nhap (Login) va xu ly xac thuc nguoi dung.

----------------------------------------------------------------------------------------------
## [2026-08-08] - Man hinh Dang nhap & Kiem soat Luong Dieu huong
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Xay dung giao dien Dang nhap theo Figma, tich hop validate form va Native Stack Navigator.

### 1. Cong viec da thuc hien
* Code hoan chinh man hinh Login Mobile theo thiet ke Figma (logo, validate email/mat khau, ket noi API auth, hieu ung nhan nut).
* Cau hinh createNativeStackNavigator bọc ngoai Tab.Navigator de app mo dung vao Login truoc khi vao 5-tab chinh.
* Luu tru va quan ly Token xac thuc bang AsyncStorage.

### 2. Van de Ky thuat & Giai phap
* Van de: App ban dau mo thang vao Dashboard 5-tab do AppNavigator.js chi co Tab.Navigator, chua co tang dieu huong Login dung truoc.
* Giai phap: Them createNativeStackNavigator bọc ngoai de kiem soat dung thu tu Login -> MainTabs.

### 3. Ke hoach tiep theo
* Kiem thu toan bo cac ca kiem thu API Auth bang Postman.

----------------------------------------------------------------------------------------------
## [2026-08-13] - Khai bao Lich Ranh Nhan vien (Availability Registration UI)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Dung man hinh khai bao khung gio ranh theo tuan cho nhan vien tren React Native (Expo), luu va hien thi qua API backend.

### 1. Cong viec da thuc hien
* Khoi tao API Service (services/availabilityService.js) tich hop 2 endpoint getWeeklyAvailability va saveWeeklyAvailability.
* Xay dung Man hinh Dang ky (screens/AvailabilityScreen.js): Tab Bar chon ngay trong tuan (Thu 2 den Chu Nhat), Slot Card chon khung gio (Sang, Chieu, Toi) dang toggle bat/tat.
* Dang ky AvailabilityScreen vao danh sach Stack Navigator.

### 2. Van de Ky thuat & Giai phap
* Van de: Du lieu khung gio ranh can duoc luu tru linh hoat theo tung ngay ma khong lam tang payload gui len server.
* Giai phap: Chuyen doi cau truc gio ranh thanh dang Map object nhe gom cac cap Day-TimeSlot de dong bo nhanh chong voi backend.

### 3. Ke hoach tiep theo
* Trien khai man hinh Lich lam viec (Schedule) hien thi ca truc ca nhan va ca truc toan cua hang.

----------------------------------------------------------------------------------------------
## [2026-08-23] - Man hinh Lich Lam Viec & Dong bo Ma mau Ca truc (Schedule UI)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Xay dung man hinh xem Lich ca nhan (My shifts) va Lich tong the quan (Schedule) tren React Native theo mockup Lich.docx, dong bo ma mau ca truc voi Web.

### 1. Cong viec da thuc hien
* Xay dung Header Thang kem nut chuyen tuan va bo chuyen Tab Switcher (My shifts / Schedule).
* Xay dung thanh 7 Ngay trong tuan ho tro co che toggle chon xem 1 ngay cu the hoac xem toan bo 7 ngay.
* Hien thi danh sach the ca truc voi mau sac dong bo: Barista (xanh ngoc #8DD9CC), Cashier (hong #D98DB3), Kitchen (cam #D98080), Service (vang #D9D98D).
* Khoi tao services/shiftService.js ket noi API backend.

### 2. Van de Ky thuat & Giai phap
* Van de: Can dap ung dong thoi 2 che do xem toan bo tuan va xem chi tiet 1 ngay tren cung mot man hinh.
* Giai phap: Su dung state selectedDayIndex toggle 2 chieu de chuyen doi muot ma giua che do tuan va ngay.

### 3. Ke hoach tiep theo
* Phat trien chuc nang gui yeu cau doi ca, xin nghi phep khi cham vao ca truc.

----------------------------------------------------------------------------------------------
## [2026-08-24] - Man hinh Gui Yeu cau Ca lam (Shift Request UI)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Xay dung man hinh Yeu cau (RequestScreen.js) va Popup gui don Doi ca / Xin nghi phep tren Mobile.

### 1. Cong viec da thuc hien
* Xay dung man hinh RequestScreen.js voi danh sach cac yeu cau da gui kem trang thai phe duyet (Cho duyet, Da duyet, Tu choi).
* Tich hop Modal gui don doi ca (chon ca muon doi, chon nhan vien muon doi cung) va modal xin nghi phep (chon khoang ngay, nhap ly do).
* Ket noi dich vu requestService.js gui payload len REST API backend /api/requests.

### 2. Van de Ky thuat & Giai phap
* Van de: Nhan vien can theo doi ngay lap tuc yeu cau vua tao tren mobile.
* Giai phap: Cap nhat state cuc bo ngay sau khi API tra ve 201 Created de danh sach yeu cau hien thi lap tuc ma khong can tai lai toan bo du lieu.

### 3. Ke hoach tiep theo
* Xay dung man hinh Ho so ca nhan nguoi dung theo tai lieu thiet ke Ho so.docx.

----------------------------------------------------------------------------------------------
## [2026-08-25] - Man hinh Ho so Nhan vien (Profile Screen Architecture)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Xay dung man hinh Ho so ca nhan (ProfileScreenApi.js) theo dung thiet ke Ho so.docx va hoso.png.

### 1. Cong viec da thuc hien
* Thiet ke The ho so vang (#FFF8E1) phia tren gom Avatar tron, Ho ten, Ten cua hang, Ma nhan vien, Vi tri lam viec, Dia chi lam viec.
* Thiet ke 2 khoi the trang: Thong tin ca nhan (Ngay sinh, Noi sinh, So dien thoai, Gioi tinh) va Thong tin dang nhap (Email, Mat khau).
* Thiet ke nut Dang xuat mau do gach chan o chan trang.
* Tich hop profileService.js lay thong tin user tu API /api/users/me va danh sach cua hang /api/users/{id}/stores.

### 2. Van de Ky thuat & Giai phap
* Van de: Cac truong thong tin mo rong nhu Noi sinh, Gioi tinh can luu tru doc lap theo tung tai khoan tren thiet bi.
* Giai phap: Ket hop lay thong tin co ban tu API va luu tru du lieu tuy chinh mo rong vao AsyncStorage (@user_profile_custom_data).

### 3. Ke hoach tiep theo
* Trien khai man hinh Phieu luong va Bao cao thu nhap chi tiet tren Mobile.

----------------------------------------------------------------------------------------------
## [2026-08-27] - Man hinh Phieu Luong & Bao cao Thu nhap Chi tiet (Mobile Payroll UI)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Tai thiet ke man hinh Phieu luong (PayrollScreen.js) chuan 100% tai lieu luongmobile.docx gom 2 che do hien thi.

### 1. Cong viec da thuc hien
* View 1 - Danh sach phieu luong thang: Header voi badge Tong phieu luong 2026, nut lich, danh sach cac thang kem cham tron vang, moc thoi gian va tag vi tri (Barista).
* View 2 - Bao cao thu nhap chi tiet: The xanh hero (#EAF8E6) hien thi Luong uoc tinh, don gia gio, Ca da lam viec (16 of 16), Gio da lam viec (132 of 132 gio), anh minh hoa; 3 the con trang (Tong tien, Phu phi, Tro phi); 3 khoi Thong tin muc luong, Tong thu nhap, Luong thuc nhan.
* Dong bo widget Bao cao thu nhap tai Trang chu (DashboardScreen.js).

### 2. Van de Ky thuat & Giai phap
* Van de: Chuyen doi giua man hinh danh sach phieu luong va man hinh chi tiet can dien ra lap tuc ma khong gay re-render ca Stack Navigation.
* Giai phap: Quan ly che do xem qua state selectedPayslip, giup chuyen doi man hinh ngay trong component voi do tre 0ms.

### 3. Ke hoach tiep theo
* Hoan thien co che Chinh sua truc tiep tren trang Ho so va ket noi toan bo du lieu ca lam thuc te tu backend CSDL.

----------------------------------------------------------------------------------------------
## [2026-08-28] - Chinh sua Truc tiep Ho so & Ket noi Du lieu Ca lam Thuc te (Live Database Integration)
* Nguoi thuc hien: Duyen (Frontend & UX/UI)
* Muc tieu: Chuyen doi man hinh Ho so sang Inline Editing truc tiep tren giao dien, ket noi toan bo ca lam that tu API backend, loai bo hoan toan mock data.

### 1. Cong viec da thuc hien
* Chuyen doi ProfileScreenApi.js: Loai bo hoan toan Modal popup; chuyen tat ca cac truong Ho ten, Cua hang, Ma NV, Vi tri, Dia chi, Ngay sinh, Noi sinh, SDT, Gioi tinh, Email thanh cac o TextInput truc tiep tren trang.
* Thiet lap co che tu dong luu tuc thi vao AsyncStorage kem thong bao trang thai "Da luu" thanh lich tren header.
* Cap nhat ScheduleScreen.js: Goi API /api/users/me/shifts lay ca lam thuc te cua nhan vien va /api/stores/{storeId}/shifts lay ca lam cua quan theo tuan, loai bo toan bo du lieu mau.
* Kiem thu thanh cong bundle Expo: npx expo export thanh cong 100% tren ca Web, Android va iOS voi 0 loi.

### 2. Van de Ky thuat & Giai phap
* Van de: Khi go chu truc tiep vao cac truong tren man hinh, viec cap nhat state lien tuc co the gay hien tuong mat focus hoac cham tren thiet bi yeu.
* Giai phap: Toi uu luong re-render bang cach chi cap nhat state cuc bo va ghi AsyncStorage bat dong bo, dam bao toc do go chu dat 60fps muot ma.

### 3. Ke hoach tiep theo
* Chuan bi moi truong demo va quay video huong dan su dung phan he Mobile.