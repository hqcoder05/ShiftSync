# Không gian quyền ShiftSync

## Vai trò và trang mặc định

| Vai trò | Trang mặc định | Phạm vi |
| --- | --- | --- |
| `ADMIN` | `/admin` | Quản trị hệ thống; có thể chủ động chuyển sang vận hành một chi nhánh. |
| `MANAGER` | `/dashboard` | Vận hành các chi nhánh được phân công. |
| `STAFF` | `/schedule` | Lịch, chấm công và yêu cầu cá nhân. |

## Quyền quan trọng

- Chỉ `ADMIN` tạo hoặc xóa chi nhánh và mở `/settings/system`.
- `ADMIN` và `MANAGER` được vận hành chi nhánh qua các route vận hành; backend luôn kiểm tra quyền với `storeId`.
- Mọi role dùng `/settings/personal`. Chỉ `ADMIN`/`MANAGER` dùng `/settings/store`.
- Không tạo `ADMIN` từ UI hay API nghiệp vụ. Tài khoản này chỉ đến từ bootstrap/DB có kiểm soát.

## Kiểm thử tối thiểu

- Xác minh landing page theo từng role và redirect deep-link trái quyền.
- Xác minh `POST /api/stores` của Manager trả `403` và ADMIN thành công.
- Xác minh ADMIN ở `/admin` không nhận hàng đợi duyệt của một chi nhánh cho tới khi vào `/dashboard`.
