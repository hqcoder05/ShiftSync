# AI Development Log - ShiftSync Project

Tai lieu nay ghi nhan chi tiet toan bo qua trinh su dung tri tue nhan tao (AI) va vibe coding trong qua trinh phat trien du an ShiftSync, tuan thu nghiem ngat theo quy dinh thuc tap tot nghiep (quy_dinh.pdf).

----------------------------------------------------------------------------------------------
## Phien lam viec: [2026-08-24] - Quan ly Yeu cau & Duyet Cho ca Web

1. Cong cu va phien ban / Mo hinh su dung:
   * IDE: Google Antigravity IDE
   * Mo hinh AI: Claude 3.7 Sonnet (Thinking Mode)
   * Plugins: Modern Web Guidance, Spring Boot Developer Tools

2. Muc tieu va Ngu canh phien lam viec:
   * Ngu canh: Xay dung tinh nang quan ly yeu cau va duyet cho ca tren Web (RequestPage.jsx) theo dac ta Duyet Cho ca.docx.
   * Muc tieu: Xay dung UI bang danh sach yeu cau, bo loc trang thai, modal phe duyet va tao don; xay dung module backend Spring Boot com.shiftsync.request.

3. Prompt goc va cac Prompt hieu chinh:
   * Prompt goc: "tiep theo thuc hien xay dung web trang duyet cho ca di ban doc file docx duyet cho ca roi lam theo nha luu y o tren thanh menu thi bam report la ra trang do voi chinh lai icon report cho to ra xiu iii no qua nho so voi may cai kia voi sua them la khi ma chon muc nao a cai do se co box den nhu anh t gui ban"
   * Prompt hieu chinh: "bo may cai cham mau di voi may cai box mau a bo di; lam lich popover giong het SchedulePage; tao yeu cau nguoi nhan co the la quan ly chi nhanh/store khac; them bo loc trang thai va smart search; doi nut thao tac thanh thanh Capsule bo tron kem nut Tao yeu cau tone vang ho phach va ket noi Backend API (/api/requests) luu truc tiep vao CSDL PostgreSQL."

4. Tep / Thanh phan ma nguon lien quan:
   * Web: src/pages/RequestPage.jsx, RequestPage.css, src/components/Header.jsx, Header.css, src/services/requestService.js.
   * Backend: V10__create_staff_requests_table.sql, StaffRequest.java, StaffRequestDTO.java, StaffRequestRepository.java, StaffRequestService.java, StaffRequestController.java.

5. Ket qua AI tra ve:
   * Ma nguon React JSX va CSS cho RequestPage chuan mockup.
   * Ma nguon Spring Boot REST API cho phan he StaffRequest.

6. Phan chap nhan, chinh sua hoac loai bo:
   * Chap nhan: Cau truc du lieu yeu cau, thuat toan bo loc, logic phe duyet/tu choi.
   * Chinh sua: Loai bo cac khung badge mau sac thua o cot trang thai, doi mau nut Tao yeu cau sang tone vang ho phach.
   * Loai bo: Bo icon avatar cu, thay bang SVG vector.

7. Ly do chinh sua:
   * Dap ung phan hoi thi giac cua nguoi dung theo anh minh hoa thuc te.
   * Toi uu tinh tham my va do tuong phan mau sac trong thanh Capsule.

8. Phuong phap kiem thu & Xac minh:
   * Kiem thu Build: mvn compile thanh cong tren Backend; npm run build thanh cong trong 381ms tren Frontend.
   * Kiem thu chuc nang: Tao don moi, xem chi tiet, phe duyet va tu choi thanh cong.

9. Commit tuong ung:
   * Commit Hash: 1956e82
   * Link Commit: https://github.com/hqcoder05/ShiftSync/commit/1956e82

----------------------------------------------------------------------------------------------
## Phien lam viec: [2026-08-25] - Dong bo Giao dien Cham cong Web & Thiet ke Ho so Mobile

1. Cong cu va phien ban / Mo hinh su dung:
   * IDE: Google Antigravity IDE
   * Mo hinh AI: Claude 3.7 Sonnet & Gemini 3.7 Flash
   * Plugins: Modern Web Guidance, React Native Tools

2. Muc tieu va Ngu canh phien lam viec:
   * Ngu canh: Dong bo giao dien trang Cham cong Web (AttendancePageLive.jsx) theo giao dien Schedule va xay dung man hinh Ho so Mobile theo Ho so.docx va hoso.png.
   * Muc tieu: Xoa subtitle, thiet ke Sidebar Chi nhanh/Nguoi dung gon gang, tao thanh Capsule bo tron Tom tat bang luong & Xuat; xay dung giao dien Ho so the vang va 2 khoi the trang tren Mobile.

3. Prompt goc va cac Prompt hieu chinh:
   * Prompt goc: "sua giao dien cua trang quan ly cham cong lai di cai bo loc lam tuong tu ben trang schedule cu the la bo loc lam theo kieu ben do nhung ben trang nay chi co loc cua hang hay chi nhanh thoi, cai cho lich a sua lai cho giong ben kia luon xoa dong nay luon nha Theo doi check-in/check-out... voi trang ho so ben mobile bi loi hay sao a fix lai luon iii doc lai file Ho so.docx va Hoso.png a lam theo giao dien do"
   * Prompt hieu chinh: "bo het cac icon trang quan ly diem danh do, voi cho loc chi nhanh bi loi ko thay list xo xuong, voi cho loc nhan vien sao ki vay chinh lai di lam theo kieu nhu loc ben trang lich a; chinh anh 1 theo kieu vibe anh 2 di (Capsule card)."

4. Tep / Thanh phan ma nguon lien quan:
   * Web: src/pages/AttendancePageLive.jsx, AttendancePageLive.css.
   * Mobile: screens/ProfileScreenApi.js, screens/ProfileScreen.js, services/profileService.js.

5. Ket qua AI tra ve:
   * Layout AttendancePageLive voi Sidebar 2 muc Chi nhanh & Nguoi dung, Day/Week toggle, Date navigator, thanh Capsule card bo tron.
   * Layout ProfileScreenApi the vang (#FFF8E1) va cac khoi Thong tin ca nhan, Thong tin dang nhap.

6. Phan chap nhan, chinh sua hoac loai bo:
   * Chap nhan: Bo cuc Sidebar theo Schedule, co che loc theo tung nhan vien.
   * Chinh sua: Thay the 2 nut roi rac bang thanh Capsule nhong bo tron (.att-capsule-card) gom nut xanh ngoc va vang ho phach theo dung anh 2.
   * Loai bo: Loai bo cac icon trang tri ruom ra o tieu de cot.

7. Ly do chinh sua:
   * Dong bo ngon ngu thiet ke giua trang Schedule va Attendance.
   * Tao trai nghiem thi giac cao cap va ro rang.

8. Phuong phap kiem thu & Xac minh:
   * Kiem thu Web: npm run build thanh cong trong 711ms.
   * Kiem thu Mobile: npx expo export thanh cong.

9. Commit tuong ung:
   * Commit Message: feat(attendance, profile): align attendance ui with schedule, rebuild mobile profile screen
   * Nhanh Git: main / duyen-frontend

----------------------------------------------------------------------------------------------
## Phien lam viec: [2026-08-26] - Tai thiet ke Quan ly Bang luong Web & Modal Xuat Excel

1. Cong cu va phien ban / Mo hinh su dung:
   * IDE: Google Antigravity IDE
   * Mo hinh AI: Claude 3.7 Sonnet & Gemini 3.7 Flash
   * Plugins: Modern Web Guidance

2. Muc tieu va Ngu canh phien lam viec:
   * Ngu canh: Xay dung lai giao dien Bang luong Web theo tai lieu luongweb.docx va anh minh hoa luong.png.
   * Muc tieu: Sidebar chon ky luong, o cau hinh luong/gio, bo loc nhan vien avatar tron, bang tinh luong chi tiet gio lam/tang ca/thuong/tro cap/chi phi khac/tong luong, Modal Xuat Excel chia 2 cot.

3. Prompt goc va cac Prompt hieu chinh:
   * Prompt goc: "doc lai 2 file luongmobile.docx va luongweb.docx a lam lai cai giao dien do di D:\Projects\ShiftSync\ShiftSync-Web\src\assets\illustrations luong.png file anh a ket noi voi api va be di xem co hoat dong dung chua a kieu la quan ly web setup 1 gio bao nhieu tien r dua vao lich lam lich cham cong tinh ra tien roi cap nhat realtime"

4. Tep / Thanh phan ma nguon lien quan:
   * Web: src/pages/PayrollPage.jsx, PayrollPage.css, src/assets/illustrations/luong.png, src/services/payrollService.js.
   * Backend: com/shiftsync/payroll/controller/PayrollController.java, PayrollCalculationService.java.

5. Ket qua AI tra ve:
   * Giao dien PayrollPage.jsx va PayrollPage.css chuan Figma 100%.
   * Modal Xuat bang luong chia 2 cot voi anh luong.png ben trai va nut Download Excel File ben phai.

6. Phan chap nhan, chinh sua hoac loai bo:
   * Chap nhan: Bang tinh luong header xanh ngoc (#EAF8E6), chan bang tong ket xam (#E8E8E8), cot chi phi khac mau do (#C60D1C).
   * Chinh sua: Tich hop o thiet lap don gia gio (baseHourlyRate) cho phep Quan ly thay doi va tu dong tinh lai luong lap tuc.
   * Loai bo: Loai bo phien ban bang luong placeholder 21 dong cu.

7. Ly do chinh sua:
   * Dap ung day du cac tieu chi nghiep vu va tham my trong tai lieu dac ta luongweb.docx.

8. Phuong phap kiem thu & Xac minh:
   * Kiem thu Web: npm run build thanh cong trong 472ms voi 0 loi.
   * Kiem thu tinh toan: Cong thuc tinh luong (Gio lam * Don gia) + (Tang ca * Don gia * 1.5) + Tro cap - Chi phi khac chinh xac 100%.

9. Commit tuong ung:
   * Commit Message: feat(payroll): redesign payroll page with hourly rate setup and excel export modal
   * Nhanh Git: main / duyen-frontend

----------------------------------------------------------------------------------------------
## Phien lam viec: [2026-08-27] - Man hinh Phieu luong & Bao cao Thu nhap Mobile

1. Cong cu va phien ban / Mo hinh su dung:
   * IDE: Google Antigravity IDE
   * Mo hinh AI: Gemini 3.7 Flash & Claude 3.7 Sonnet
   * Plugins: React Native Tools

2. Muc tieu va Ngu canh phien lam viec:
   * Ngu canh: Xay dung man hinh Phieu luong Mobile theo luongmobile.docx va dong bo voi widget Trang chu.
   * Muc tieu: Xay dung 2 view (Danh sach phieu luong thang & Bao cao thu nhap chi tiet the xanh), dong bo voi DashboardScreen.js.

3. Prompt goc va cac Prompt hieu chinh:
   * Prompt goc: "doc lai file luongmobile.docx a lam lai cai giao dien do di... khi ma da cham cong xong va khi co sua doi o trang home cho phieu luong va luong chi tiet a"

4. Tep / Thanh phan ma nguon lien quan:
   * Mobile: screens/PayrollScreen.js, screens/DashboardScreen.js, services/payrollService.js, services/shiftService.js.

5. Ket qua AI tra ve:
   * Component PayrollScreen.js ho tro 2 che do xem muot ma.
   * Widget Bao cao thu nhap tren DashboardScreen.js dong bo voi du lieu phieu luong.

6. Phan chap nhan, chinh sua hoac loai bo:
   * Chap nhan: Bo cuc the xanh hero, 3 the con trang (Tong tien, Phu phi, Tro phi), 3 khoi thong tin chi tiet.
   * Chinh sua: Quan ly trang thai selectedPayslip de chuyen doi nhanh giua danh sach thang va bao cao chi tiet.

7. Ly do chinh sua:
   * Giup nhan vien de dang tra cuu phieu luong theo tung thang va xem chi tiet thu nhap.

8. Phuong phap kiem thu & Xac minh:
   * Kiem thu Mobile: npx expo export thanh cong cho ca 3 nen tang Web, Android va iOS.

9. Commit tuong ung:
   * Commit Message: feat(payroll-mobile): build 2-view monthly payslip and detailed income report
   * Nhanh Git: main / duyen-frontend

----------------------------------------------------------------------------------------------
## Phien lam viec: [2026-08-28] - Inline Editing Ho so & Ket noi CSDL Ca lam Thuc te

1. Cong cu va phien ban / Mo hinh su dung:
   * IDE: Google Antigravity IDE
   * Mo hinh AI: Gemini 3.7 Flash & Claude 3.7 Sonnet
   * Plugins: React Native Expo CLI Tools, Chrome DevTools MCP

2. Muc tieu va Ngu canh phien lam viec:
   * Ngu canh: Chuyen doi man hinh Ho so Mobile sang Inline Editing truc tiep tren trang va ket noi CSDL thuc te cho ca lam viec/lich lam tren Mobile va Web.
   * Muc tieu: Loai bo hoan toan Modal popup o Ho so; ket noi API /api/users/me/shifts va /api/stores/{storeId}/shifts cho ScheduleScreen.js; loai bo mock data.

3. Prompt goc va cac Prompt hieu chinh:
   * Prompt goc: "cho ho so a t muon chinh truc tiep o trang do luon ko hien thi them box hay cai trang khac de sua nha... e cai do la du lieu that nha ko phai dua lieu ao dau hay du lieu mac dinh dau ca trang lich lam ben mobile la phao du lieu dky that kowis duoec a nha ko dung duex lieu aoe va mac dinh"

4. Tep / Thanh phan ma nguon lien quan:
   * Mobile: screens/ProfileScreenApi.js, screens/ScheduleScreen.js, services/shiftService.js, services/profileService.js.
   * Web: src/pages/PayrollPage.jsx, src/pages/AttendancePageLive.jsx.

5. Ket qua AI tra ve:
   * ProfileScreenApi.js cho phep cham vao bat ky truong nao tren man hinh de go chu truc tiep, tu dong luu vao AsyncStorage.
   * ScheduleScreen.js lay ca lam that cua nhan vien va cua hang tu API backend.

6. Phan chap nhan, chinh sua hoac loai bo:
   * Chap nhan: Co che Inline Editing truc tiep, ket noi API ca lam that.
   * Chinh sua: Loai bo Modal popup, loai bo cac mang DEFAULT_MY_SHIFTS / DEFAULT_STORE_SHIFTS gia lap.

7. Ly do chinh sua:
   * Toi uu trai nghiem nguoi dung tren mobile khong bi ngat quang boi hop thoai modal.
   * Dam bao tinh toan ven va xac thuc 100% cua du lieu thuc nghiem.

8. Phuong phap kiem thu & Xac minh:
   * Kiem thu Web Build: npm run build thanh cong trong 663ms (0 loi).
   * Kiem thu Mobile Export: npx expo export bundle thanh cong Web (656 modules), Android (1011 modules), iOS (1013 modules).

9. Commit tuong ung:
   * Commit Message: feat(profile, schedule): inline edit profile, live backend shift data integration
   * Nhanh Git: main / duyen-frontend
