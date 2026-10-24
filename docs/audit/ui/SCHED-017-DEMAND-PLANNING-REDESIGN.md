# SCHED-017 — Thiết kế lại Định biên ca

Ngày 20/10/2026. Tái dùng hệ theme và bố cục Schedule SCHED-015/016 cho `DemandPlanningModal`, `DemandDailyView`, `DemandWeeklyMatrixView`; modal còn được dùng tại `/demand-planning`.

- Sắp xếp lại header, thao tác áp dụng, cửa hàng, ngày/tuần, KPI và bảng. Responsive, có cuộn ngang riêng cho bảng và nhãn vùng bảng; giữ màu trạng thái chỉ tiêu và không sửa màu/sọc ca Schedule.
- Không hiển thị SLA mặc định 96.8/97.8 hoặc 100% khi chưa có chỉ tiêu; bổ sung trạng thái chưa có dữ liệu. Thanh tiến độ tuần dùng 0 khi tỷ lệ vắng mặt thay vì số mẫu 97/3. Sửa căn cột bảng tuần bằng `display: table-cell` cho ô vị trí.
- Gỡ hai nút có nhãn không tương ứng hành vi: “Sao chép tuần sau” gọi auto-fill, “Lưu nháp” gọi apply. Chức năng auto-fill vẫn có ở khu vực cảnh báo khi dữ liệu phù hợp; nút áp dụng vẫn gọi API như trước.
- Build PASS. Playwright với API/session mock: desktop 1920×1080 và mobile 390×844, dữ liệu rỗng/có 3 vị trí, 7 ngày, 14 ô ca cho mỗi vị trí; chuyển ngày/tuần, điều hướng tuần, tăng 2→3 (PUT mock), mở dialog sửa, bảng cuộn ngang và cuộn tới cuối trong mobile; kiểm tra sáng/tối và cột ngày khớp cột ca. Không ghi backend thật.
- ESLint ba component: 9 lỗi và 2 cảnh báo hook có sẵn trong code cũ. Build còn cảnh báo chunk lớn. Chưa kiểm chứng backend thật hoặc thực hiện apply thật.
