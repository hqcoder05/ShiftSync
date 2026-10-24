# EXPLORER-018 — Thiết kế cửa hàng theo nhóm đồ vật
Ngày 21/10/2026 · Branch quoc-backend · working tree, chưa commit/push.

## Phạm vi đã làm
- Entry: Cửa hàng 3D → Thiết kế cửa hàng (MANAGER/ADMIN), tách khỏi Planner/mô phỏng/tham quan. Chỉ một Canvas WebGL hoạt động khi mở xưởng.
- Thư viện15 mẫu: cụm pha chế/thu ngân/trả món/bếp, bộ bàn cà phê/ghế băng/bàn chung/sofa, bàn/ghế đơn, cây/kệ/đèn, tường và khung cửa. GLB store-v2 được tái sử dụng theo node semantic; món đơn/kiến trúc dùng geometry có sẵn hoặc sinh thủ tục.
- Thêm, chọn trong cảnh/danh sách, Shift chọn nhiều, kéo trục thật với snap0,25m; tọa độ XYZ, xoay, tỷ lệ; kích thước vách/cửa và mặt bằng. Gom/tách nhóm giữ world transform; nhân bản remap IDs và bỏ binding trạm để không tạo hai vị trí cho một trạm. Khóa nhóm bảo vệ con.
- Hoàn tác/làm lại60 bước, xóa subtree có xác nhận, bản nháp local theo user+store, cảnh báo rời khi chưa lưu, nhập/xuấtJSON có validation, tạo mặt bằng trống hoặc dùng lại mẫu quán.
- Lưu & áp dụng là thao tác rõ ràng, không autosave backend. Lịch sử20 phiên bản gần nhất; khôi phục thành bản nháp, lưu tạo phiên bản mới. 409 giữ nháp, không ghi đè phiên bản người khác.
- Gắn cụm trạm với workstation hiện có, không tạo assignment/API nhân sự. Saved design thay model minh họa trong explorer và Planner; floor/physicalFrame/avatar anchor/va chạm dùng cấu trúc đã lưu. Custom design bỏ auto-arrangement; trạm chưa gắn không tự sinh thêm quầy. Khung cửa chỉ hai jamb làm blocker, chừa lối đi. Cảnh báo trong editor khi còn trạm chưa gắn.

## Thiết kế và tri thức tái sử dụng
Skills đã đọc: 3d-web-experience + frontend-design (và các kỹ năng frontend đã được người dùng chỉ định ở các task trước). Hướng “xưởng bố trí vận hành”, DFII14/15 (impact4+fit5+feasibility5+performance4-risk4), theme/font hiện tại, panel công cụ gọn, viền chọn màu amber, cảnh là vùng chính. Không thêm banner giới thiệu.
Tái sử dụng PHASE2A/EXPLORER008/013/015/016/017: GLB semantic units, root selection, Workspace/RBAC, physicalFrame/Planner anchor, input và nhóm model. Dữ liệu thiết kế tách khỏi ca/phân công.

## Contract
GET/PUT /api/stores/{storeId}/design; GET /design/versions; GET /design/versions/{revision}.
PUT {baseRevision,document}. Response {revision,document,createdAt}.
Document schemaVersion1, floor{length,width,height}, items[{id,asset,name,parentId,position:[x,y,z],rotation:radians,scale:uniform,locked,dimensions?,workstationId?}]. Metres, Three coordinates (+Y up). Không nhận URL model bên ngoài.
MigrationV45 store_design_versions: UUID/storeFK/revision/documentTEXT/createdAt, UNIQUE(store_id,revision). Save khóa store row, so baseRevision rồi thêm immutable version. Giới hạn150đồ vật/500KB/8cấp, asset whitelist, tên/định danh/số hữu hạn, parent tồn tại/không vòng lặp; binding workstation unique và cùng store. Soft-deleted store không nhận save.
Read: ADMIN hoặc store access; write: ADMIN hoặc MANAGER+store access. Controller dùng Map document ở boundary HTTP để tương thích Jackson3 mặc định của SpringBoot4.1.1; service dùng Jackson2 ObjectMapper đã có. HTTP roundtrip regression đã bắt và sửa lỗi JsonNode2 không được Jackson3 deserialize.
Freshness: pom thực tế là SpringBoot4.1.1, Java21; PROJECT_CONTEXT đã chỉnh phiên bản cũ.

## Kiểm chứng
- Node52/52 PASS: design model8 (đủ15assets từ GLB, group/worldtransform/lock/clone/validation/customdoor blockers), selection/info/occupancy/Planner/controller/loader44.
- Build production PASS; ESLint toàn bộ src/features/store-designer PASS, không tuyên bố lint toàn repo. Cảnh báo chunk>500KB cũ còn.
- Backend13 PASS: service7 +methodsecurity3 +HTTP1 +PostgreSQL2. DB test thật chạy Flyway tớiV45 trong database riêng, kiểm immutable history và hai writer đồng thời (1 thành công,1 conflict), dọn database sau test.
- Edge155 desktop1920x1080: scripts/test-store-designer.browser.cjs32 checkpoints PASS (gizmo drag thật, oneCanvas, groups/lock/undo/redo, save/history/409/draft/import/export, custom model+bound staff trong Planner, floor/template). 1366x768 và390x844 không tràn. Riêng STAFF không có nút thiết kế PASS. 409 console error là response cố ý của test conflict; uncaught errors0.
- Hồi quy Edge: world-info45 PASS, Planner20 PASS; các API/session browser là fixtures. Ảnh .playwright-mcp/store-designer-1920.png. Không gọi browser fixture writes vào DB thật.

## Áp dụng backend cục bộ
Đã sao lưu database trước khi cập nhật: C:/Users/Hoang Ng Viet Quoc/.codex/backups/shiftsync/20261021-105511/before-store-designer.dump (359325bytes, pg_restore -l xác minh archive).
Image cũ: shiftsync-backend-backend:before-designer-20261021-105511; rollback.json cùng thư mục backup.
Đã chạy docker compose -f shiftsync-backend/docker-compose.yml up -d --no-deps --build backend. Backend build/start PASS; healthHTTP200, Flyway áp dụng các migration còn chờ V43,V44,V45, schema chính45. Không dừng/xóa DB/Redis/volumes. COUNT store_design_versions thật0 sau test; không ghi bố trí mẫu vào store thật. Chưa làm browser→authenticated backend end-to-end với tài khoản thật; DB service/concurrency và MVC/security đã kiểm riêng.

## Cách dùng
Cửa hàng3D → Thiết kế cửa hàng. Thêm đồ bên trái; chọn trong cảnh/danh sách, kéo trục hoặc nhập số. Shift+click để chọn nhiều → Gom nhóm; khóa chống kéo nhầm. Với quầy vận hành, chọn Gắn trạm vận hành. Lưu & áp dụng để dùng bố trí cho explorer/Planner; menu Phiên bản đã lưu mở bản cũ thành nháp. Ctrl+S lưu; Ctrl+Z/Shift+Ctrl+Z hoàn tác/làm lại (trong input giữ undo nhập liệu tự nhiên).

## Giới hạn và điểm stale
Đây là editor thư viện15mẫu; chưa upload GLB tùy ý, vẽ tường polyline/cắt cửa tự động, topology/material editor hoặc chỉnh sàn đa giác. Khung cửa cần đặt vào khoảng trống giữa các vách; không tự đục lỗ tường. Phiên bản lưu floor/đồ vật/nhóm, không tạo trạm hoặc sửa lịch nhân sự. Không có realtime broadcast design; máy khác tải lại để lấy phiên bản mới, save stale bị409. Chưa benchmark FPS thiết bị khác; không tuyên bố không thể chồng lấn nội thất. Chưa tự ràng buộc world footprint với sàn cho mọi model.
Stale khi đổi schema/catalog/GLB names, group transforms, CoffeeShopModel/customWorkstationLayer, physicalFrame/Planner, API/Jackson/transaction/auth/migration.
