# EXPLORER-019 — Phân cấp thông tin trong bảng 3D
Ngày22/10/2026. User chọn bảng thông tin nhân viên/trạm/khu vực.

## Vấn đề và thay đổi
Các dòng ngang cấp khiến trạng thái bị chìm, lịch phân công dễ nhầm là có mặt, sức chứa dễ nhầm chỉ tiêu. WorldInfoCard giờ theo thứ tự nhận diện → ngày/ca → trạng thái có giải thích → phân công/nhân sự/thiết bị. Nhân viên: trạng thái điểm danh trên đầu; phân công riêng; gender mở trong Thông tin cá nhân. Trạm: phân công và ghi nhận check-in riêng; sức chứa ghi rõ người cùng lúc, hoạt động trạm không đồng nghĩa nhân sự có mặt. Khu vực: cần/đã phân công/thiếu hoặc nhiều hơn nhu cầu được ghi thành câu, không có chỉ tiêu thì không kết luận đủ/thiếu.
Footer gợi ý bên trong Thao tác, phần thao tác có mô tả theo loại đối tượng. Quay về summary đưa scroll về đầu. Bảng vẫn neo world/billboard, giữ440px max và viewport clamp; role colors/font/theme không đổi.

## Tri thức và skill
EXPLORER015/016, occupancy/assignment identity và skills frontend-design+3d-web-experience. Hướng bảng vận hành phân cấp, DFII14/15. Không banner trang mới, không sửa StoreDesigner/backend/API/DB.

## Kiểm chứng
Build PASS, chunkwarning cũ. WorldInfoCard ESLint PASS. Node14 selection/info/occupancy PASS. Edge155 tại1920x1080,1366x768,390x844: hồi quy world45 PASS, clarity42 PASS; context/status/disclosure/count/scroll/inlineactions/Escape, card bounds và footer visible. Fixtures REST/session, sceneGLB/WebGL thật; no console/pageerror; không livebackend. Ảnh info-hierarchy-staff/workstation/zone trong.playwright-mcp. Test raycast hồi quy focusstaff/resetzonecamera để tránh mesh quá nhỏ ở góc overview; không thay selection runtime.

Stale khi đổi WorldInfoCard hierarchy, attendance/shift snapshot, occupancy contract hoặc sizing. Không commit/push.
