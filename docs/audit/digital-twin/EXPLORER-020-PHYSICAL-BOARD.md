# EXPLORER-020 — Bảng thông tin có hình khối 3D
22/10/2026. Yêu cầu người dùng: thử bảng3D thay thẻ2D.

## Thay đổi
WorldBoardMesh: vỏ RoundedBox, viền nổi/chất liệu/độ dày/độ nghiêng; mặt nội dung texture Canvas2D nằm trên plane3D (cách dựng typography trên bề mặt3D, không phải HTMLcard). Nút là mesh có click/hover raycast. Nội dung cập nhật từ selected snapshot, attendance và Equipment API hiện tại. Tabs Tổng quan/Nhân sự/Thiết bị và chuyển trang; tối đa4mục, viewport thấp1mục để chữ không bị thu nhỏ. Dữ liệu đầy đủ có trong accessibility section ẩn, keyboard focus mở fallback đọc.
WorldInfoCard giữ anchor/billboard/clamp và leader, đặt mesh display gần camera để tránh geometry quầy che, kích thước theo viewport. Leader kết thúc mép trái bảng. Native selection Bridge bỏ qua click trúng board để không clear/chọn xuyên nền.
Biểu mẫu Thao tác vẫn HTML transform trong cảnh, giữ các callbacks/API/RBAC. Summary là mesh; không tuyên bố forms nhập liệu đều mesh. Không backend/API/dependency/DB change.

## Tri thức/thiết kế
EXPLORER015/016/019; skills3d-web-experience/frontend-design đã áp dụng. Hướng bảng vận hành vật lý, DFII14/15, rolecolor/theme case xanh/viền kim loại ấm, tiếngViệt trênCanvasTexture để không tải font ngoài. Texture dispose theo lifecycle.

## Kiểm chứng
Build PASS (chunkwarning cũ), ESLint2module PASS, Node14 info/selection/occupancy PASS. Edge155 physical33PASS, Planner20PASS. FixturesREST/session, actualCanvas/GLB/WebGL; click mesh nút thật bằng projected worldposition,33checks gồm3entities/summary khôngHTMLcard, staff/thiếtbịtabs, pagination viewport nhỏ,close, action trongscene, E/Esc/pausedpointerlock. Kiểm bounds local panel corners projected ở1366/390, desktop1920. No console/pageerrors. Ảnh .playwright-mcp/physical-board-staff/workstation/zone.png.
Các suite Html-summary EXPLORER019 không còn phù hợp cho summary mới, đã được suitephysical thay thế; không tuyên bố các suite cũ vẫn pass.

## Giới hạn
Chữ là texture trên mặt, không extrude từng glyph. Form nhập liệu vẫn Html transform, accessibility fallback hiển thị khi keyboardfocus. Panel đối diện camera với góc nghiêng nhẹ, không có mô phỏng trọng lực hoặc VRheadset. Cần đánh giá thêm cảm nhận độđọc với người dùng; chưa benchmarkGPU khác.
Stale geometry,texture,raycast,anchor,input,selection. Không commit/push.

## Quyết định cuối của người dùng

EXPLORER-020 chốt giao diện22/10: user chọn lại HTML neo cảnh theo đề xuất. Runtime WorldInfoCard trở lại Htmltransform luôn trực diện camera, WorldInfoSummary tách component summary có status/ngàyca/nhânsự/thiếtbị/gender disclosure như019; actionsinline giữ nguyên. Không import/render WorldBoardMesh (file thử nghiệm giữ lại, không vào bundle), bỏ raycastguard riêng boardmesh. Kích thước theo DOM thật và clamp; bỏ lerp physical display. Build/lint2module PASS; Edgeclarity42 PASS ở1920/1366/390, noerrors, fixturesREST/WebGLthật. Physicalsuite020 nay chỉ là lịch sử thử nghiệm, không phải UI đang dùng. Khôngbackend/DBchanges/commit.
