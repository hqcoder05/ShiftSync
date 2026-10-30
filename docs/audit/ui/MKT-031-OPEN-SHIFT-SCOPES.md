# MKT-031 — Phạm vi Ca đang mở và Sắp hết hạn

Ngày: 25/10/2026  
Phạm vi: Marketplace manager list, không thay đổi API hoặc hành động ghi.

## Thay đổi

- Đổi tab manager từ `Thiếu người & Đăng ca` thành `Ca đang mở`.
- Thêm lựa chọn trực tiếp `Tất cả ca đang mở` và `Sắp hết hạn`; lựa chọn thứ hai
  lọc đúng `isExpiringSoon` đã được suy ra từ deadline của Marketplace.
- Giữ `Lịch sử ca` riêng. Dòng giải thích nêu rõ ca đã bắt đầu/hết hạn chỉ đọc
  tại lịch sử; không thể nhận hay đăng lại từ danh sách đang mở.

## Kiểm chứng

- Playwright fixture 390px: hai scope xuất hiện; bấm `Sắp hết hạn` cập nhật
  `aria-pressed`; không tràn ngang (`scrollWidth=375`, viewport 390).
- Fixture không có ca còn hạn tuyển, do đó chưa chứng minh render thứ tự thẻ
  deadline với backend thật. Logic deadline/expiry hiện có được kiểm bởi
  `marketplaceTime` 6/6 trong FIX-030.
