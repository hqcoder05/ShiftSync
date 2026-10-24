# EXPLORER-005 — Đánh giá và đề xuất UI (19/10/2026)

Phạm vi: review theo yêu cầu người dùng, không triển khai thêm tính năng. Tái sử dụng EXPLORER-004; xem trang thật qua Playwright 1920×1080, dùng API mock và GLB thật. Có đánh giá độc lập theo design-ux. Không dùng dữ liệu mock để kết luận backend runtime.

## Thứ tự ưu tiên
1. P1: gộp các tầng header đang lặp cửa hàng/ngày/ca, bỏ dải tiêu đề cửa hàng trong canvas; một thanh ngữ cảnh và KPI gọn.
2. P1: canvas dùng phần chiều cao còn lại của viewport; timeline/inspector trong workspace, tránh phần cuối vượt màn hình1080. Có nút toàn màn hình; fit camera theo phần canvas thực sau khi mở panel.
3. P1: tách Trực tiếp / Xem lại / Mô phỏng. Timeline theo khoảng ca và xử lý ca qua đêm. Bằng chứng fixture: đồng hồ00:00 nhưng input range min360 max1380, value360; nguồn SpatialTimeline cố định06:00–23:00. Thanh thiếu nhân sự phải có chú giải rõ và trạng thái lỗi/không có dữ liệu riêng.
4. P2: đồng bộ theme giữa trang trắng, header navy, toolbar nâu và inspector trắng; một hệ token trung tính, màu nhấn cho lựa chọn, màu ngữ nghĩa cho cảnh báo/attendance.
5. P2: nhãn zone/trạm ưu tiên tên, số người và trạng thái; kích thước theo màn hình, tránh chồng và che nhân viên. Hover preview, chọn làm nổi bật và mở chi tiết.
6. P2: phân biệt 'nhân sự được phân công' với 'đã có mặt'; hiển thị tuổi dữ liệu/kết nối trước khi ghi Trực tiếp. Cảnh báo chuyển thẳng tới đối tượng và hành động xử lý.

## Nâng cấp tiếp theo
- Danh sách tìm kiếm Zone/Workstation/Employee có thể thu gọn, click để chọn/focus; không buộc người dùng tìm vật thể nhỏ bằng chuột trên scene.
- Mode Vận hành / Bố trí / Tham quan; Bố trí có snap grid, Undo/Redo, bản nháp, Lưu/Hủy và trạng thái chưa lưu. Tách thao tác bố trí khỏi vận hành.
- Inspector resize được, breadcrumb Store→Zone→Workstation; chọn và so sánh được lịch phân công với attendance thực.
- Thiết bị có lọc trạng thái/tìm mã, cảnh báo bảo trì ngay trên trạm. Lịch sử bảo trì/thay thiết bị cần bổ sung backend, không coi là tính năng đã có.
- Performance: lazy-load Explorer/asset, giới hạn pixel ratio, giảm chất lượng bóng tùy thiết bị, nhãn theo độ gần và chọn lựa. Đo FPS/load time trước/sau thay đổi.

Đề xuất thực hiện trước: header + fit viewport + timeline/mode + theme, sau đó navigator và editor. Ảnh bằng chứng: .playwright-mcp/explorer-review-desktop.png và explorer-review-inspector.png. Review chỉ đọc; không cần chạy lại test/build vì không đổi mã ứng dụng. Kết quả110 tests/build/journey20 của EXPLORER-004 vẫn là bằng chứng trước review.
