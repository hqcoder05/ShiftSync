# Auth API Test Report — ShiftSync
Người test: Duyên | Ngày: 09/08/2026 | Công cụ: Postman

| # | Test case | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|---|
| 1 | Register hợp lệ | email test01@shiftsync.com | 201 | 201 Created | Pass |
| 2 | Register email trùng | email test01@shiftsync.com (đã tồn tại) | 409 | 409 Conflict - "Email already exists" | Pass |
| 3 | Register email sai định dạng | email "abc.com" | 400 | 400 Bad Request - "Invalid email format" | Pass |
| 4 | Register thiếu password | không có field password | 400 | 400 Bad Request - "Password is required" | Pass |
| 5 | Login đúng | test01@shiftsync.com / password123 | 200 + token | 200 OK + accessToken, refreshToken | Pass |
| 6 | Login sai password | test01@shiftsync.com / sai123 | 401 | 401 Unauthorized - "Invalid email or password" | Pass |
| 7 | Login email không tồn tại | khongton@shiftsync.com | 401 | 401 Unauthorized - "Invalid email or password" | Pass |
| 8 | Refresh token hợp lệ | refreshToken thật từ case 5 | 200 + token mới | 200 OK + accessToken, refreshToken mới | Pass |
| 9 | Refresh token sai | chuỗi rác "abc-rac-123" | 401 | 401 Unauthorized - "Invalid or expired refresh token" | Pass |

**Kết quả: 9/9 test case Pass (100%). Không phát hiện bug.**