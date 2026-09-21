# ShiftSync — Project Overview

## Mục tiêu

ShiftSync quản lý nhân sự, cửa hàng, nhu cầu nhân lực và ca làm; tự động hỗ trợ phân ca nhưng vẫn cho phép quản lý tạo/gán thủ công. Staff sử dụng mobile để xem lịch, availability, nghỉ phép, marketplace, chấm công và payroll.

## Thành phần

| Thành phần | Entry point | Nguồn dữ liệu |
|---|---|---|
| Backend | `ShiftsyncBackendApplication` | PostgreSQL, Redis, Firebase |
| Web | `src/main.jsx`, `src/App.jsx` | REST/WebSocket/SSE |
| Mobile | `index.js`, `App.js` | REST, AsyncStorage token |

## Nguyên tắc nguồn dữ liệu

Backend services và database là source of truth. Frontend chỉ format/hiển thị response; các phép tính payroll và quyết định assignment không được tái tạo ở client.

## Trạng thái xác minh

Đường dẫn controller/service/entity/migration đã được xác minh tĩnh. Các kết quả phụ thuộc server đang chạy được đánh dấu `[NOT VERIFIED]`.
