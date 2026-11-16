# Kế hoạch tách Không gian 3D thành trang riêng

## Mục tiêu

Đưa Digital Twin 3D thành route vận hành độc lập `/store-3d`, thay cho điểm vào `/schedule?view=3d`, đồng thời giữ khả năng xem/chỉnh phân công, chọn cửa hàng/ngày/ca và toàn màn hình thật của trình duyệt.

## Hiện trạng đã kiểm chứng

- `SpatialWorkspace` đã là feature độc lập, lazy-load qua `Store3DCanvas`, có `requestFullscreen()`, `fullscreenchange` và nút bật/tắt ở `CommandHeader`.
- 3D hiện được render nội tuyến trong `SchedulePage` khi query `view=3d`; điều này làm URL, giao diện lịch và không gian vận hành bị trộn lẫn.
- `SchedulePage` hiện sở hữu dữ liệu cần cho 3D: cửa hàng, nhân sự, kỹ năng, layout, khu vực, ca theo ngày và callback cập nhật lịch.
- `Navbar` đang dẫn tới `/schedule?view=3d` ở cả menu và nút “Cửa hàng 3D”.

## Thiết kế được chọn

1. Tạo `Store3DPage` mỏng để thể hiện route nghiệp vụ riêng.
2. Tái sử dụng dữ liệu và callback đã được kiểm chứng của `SchedulePage` qua chế độ `spatialOnly`, không nhân đôi API/fetching/logic phân ca.
3. Trong `spatialOnly`, chỉ render stage 3D toàn trang nội dung; các toolbar, bảng tuần, modal tạo ca và chế độ lịch thường không xuất hiện.
4. `SpatialWorkspace` tiếp tục sở hữu fullscreen browser-native, bao phủ canvas và các điều khiển 3D nhưng không đổi API backend hay quyền thao tác.
5. Chuyển mọi điểm vào 3D sang `/store-3d`; URL cũ `/schedule?view=3d` vẫn được điều hướng sang route mới để không vỡ bookmark cũ.

## Tiêu chí nghiệm thu

- Người dùng đã đăng nhập Manager/Admin mở `/store-3d` và thấy chỉ không gian 3D, không phải bảng lịch tuần.
- Chọn cửa hàng, ngày hoặc ca tiếp tục tải đúng dữ liệu 3D như trước.
- Nút toàn màn hình đổi nhãn/icon theo `fullscreenchange`, có xử lý trình duyệt từ chối.
- Nút quay lại trong 3D dẫn về `/schedule`.
- Link navbar và link cũ đều dẫn tới `/store-3d`.
- `npm run lint`, `npm test`, `npm run build` của `ShiftSync-Web` đều đạt.

## Rủi ro và giới hạn

- Route chia sẻ state/loading hiện có với `SchedulePage`; đây là bước tách giao diện và URL an toàn, chưa phải refactor data layer toàn phần.
- Fullscreen cần cử chỉ người dùng và có thể bị browser/chính sách thiết bị từ chối; phải giữ fallback không fullscreen.
- Không thay đổi API, schema, nghiệp vụ xếp ca hoặc quyền backend trong đợt này.

## Kết quả thực thi

- Đã thêm route lazy `/store-3d` qua `Store3DPage`, trong `MainLayout` và cùng lớp xác thực với lịch ca.
- `SchedulePage` có chế độ `spatialOnly`: tái sử dụng state/API/callback phân ca đang có nhưng chỉ render vùng Digital Twin; route riêng không mang theo bảng lịch, bộ lọc lịch hay modal lịch thông thường.
- Mọi điểm vào chính (navbar, dashboard và SchedulePage) nay dẫn tới `/store-3d`; bookmark legacy `/schedule?view=3d` được redirect an toàn.
- Fullscreen không được tự cài lại: tiếp tục dùng Fullscreen API có sẵn của `SpatialWorkspace`, gồm lắng nghe `fullscreenchange`, trạng thái nút và fallback khi browser từ chối.

### Bằng chứng xác thực

- `cd ShiftSync-Web && npm run lint` — pass.
- `cd ShiftSync-Web && npm test` — 197/197 pass, gồm test mới cho route và legacy query.
- `cd ShiftSync-Web && npm run build` — pass.
- Playwright fixture browser: `/store-3d` hiển thị `#spatial-workspace-container` mà không có heading lịch; nút Fullscreen vào/thoát được; `/schedule?view=3d` chuyển sang `/store-3d`.
