# OPS-030 — Kiểm chứng transport STOMP thật

Ngày: 25/10/2026  
Môi trường: Docker backend/PostgreSQL/Redis local, `http://127.0.0.1:8080` health `UP`.

## Đã kiểm chứng

- Đăng nhập manager qua REST nhận JWT hợp lệ (token không được ghi vào báo cáo).
- Native WebSocket `ws://127.0.0.1:8080/ws/websocket` nhận STOMP `CONNECTED`
  khi CONNECT gửi `Authorization: Bearer <JWT>`.
- Subscribe `/topic/store/20000000-0000-0000-0000-000000000001/shifts` thành công.
- Đóng client có chủ ý, kết nối lại bằng JWT mới và đăng ký lại topic thành công.
- UI fixture 3D khi `isRealtimeConnected=false` hiện nhất quán `Mất kết nối` ở
  command header lẫn thanh vận hành.

## Bổ sung: mutation thật trên DB demo tách biệt

- `compose.stabilization.yml` nay có service `backend` profile `demo`, chỉ dùng
  PostgreSQL/Redis `shiftsync-stabilization`, cổng host `58080`; không dùng DB
  đang phục vụ web.
- `scripts/test-realtime-docker.ps1` đăng nhập manager demo, subscribe topic
  `shifts`, gán nhân viên cho ca demo và nhận `ASSIGNMENT_CREATED`.
- Script chủ ý đóng socket, CONNECT/SUBSCRIBE lại, bỏ phân công và nhận
  `ASSIGNMENT_REMOVED`; `finally` khôi phục phân công nên DB demo giữ nguyên
  trạng thái ban đầu.
- `SpatialWorkspace` nhận event phân công có `data.zoneId`, refetch dữ liệu vận
  hành và focus đúng zone, đồng thời hiện toast nêu hành động. Đây là callback
  camera thực, không phải nút focus thủ công.

## Còn mở

Attendance/check-in/out vẫn cần được phát trên DB demo để xác nhận payload
`attendance`, và UI Edge bị chính sách Work chặn điều khiển browser cục bộ trong
lượt này. Do đó phần render camera/alert sau event mới được build-verified;
chưa coi là nghiệm thu trình duyệt Edge hoàn chỉnh.
