# EXPLORER-010 — Sửa lỗi trải nghiệm Interactive Store

Ngày19/10/2026; branch quoc-backend, baseline c9d4df1. Người dùng yêu cầu sửa sau audit EXPLORER-009. Đã tái sử dụng PROJECT_CONTEXT/TASK_MEMORY/CODEBASE_MAP và báo cáo009. Bảo toàn working tree, không commit/push hoặc ghi DB/backend.

## Sửa năm nhóm lỗi
1. **Vị trí dùng chung:** WorkstationLayer công bố snapshot zone hiển thị sau khi bố trí quầy; SpatialWorkspace giữ snapshot theo storeId cho2D/minimap/teleport/target tham quan. Snapshot chỉ ở client, không thay tọa độ nghiệp vụ API. Áp dụng geometry trong useLayoutEffect trước khi dựng zone decals để tránh một frame/vòng effect dùng vị trí GLB ban đầu. CameraManager chỉ lấy frame group, không vô tình lấy tọa độ local của beacon con dùng chung userData.
2. **Collision và teleport:** extractGlbObstacles lấy bounds world-space của cột, quầy, vách và từng bộ bàn/ghế thực sự visible; gồm cả trạm procedural dư, deduplicate theo workstation ID. Không dùng zone box/cột procedural trùng khi có hình học GLB, không giữ Kitchen đang ẩn. Giới hạn đi bộ theo sàn GLB thật. Teleport tìm điểm đứng không giao vật cản trong bán kính4m, giữ vị trí cũ và báo lỗi nếu không có; landing ưu tiên phía trước đúng quầy.
3. **2D:** zone/card theo snapshot3D, width theo bề rộng quầy, nhãn workstation nằm ngoài card có đường chỉ. Không còn chồng hai thẻ Barista–Thu ngân hoặc đè dòng nhân sự. Dot nhân viên được hạ thêm4px sau review ảnh.
4. **PhímV:** callback controller đọc ref mới nhất, truyền mode tường minh về parent; HUD toggle dùng functional update. spatialViewStore.setPlayerViewMode hỗ trợ cả value/function, giữ controller–state–label–FOV đồng bộ khi nhấn nhiều lần.
5. **Loading/error/retry:** CoffeeShopModel báo idle/loading/ready/error tới canvas DOM; aria-busy và role=status khi tải; role=alert giải thích đang dùng mô hình đơn giản khi lỗi, nút Thử tải lại mô hình thực hiện request mới và phục hồi GLB. Callback từ request đã hủy/bị thay thế không ghi trạng thái mới.

Sửa thêm guard chọn lại chính store hiện tại để không xóa dữ liệu rồi bỏ lỡ refetch vì storeId không đổi.

## Đối chứng
- **128/128 spatial tests pass**,20 suites. Thêm regression về functional view toggle, collision vật lý thay vùng ma, floor bounds thật, dừng trước booth, safe teleport/no landing và extraction visible world geometry/surplus trạm.
- **npm run build pass** sau thay đổi cuối. Cảnh báo chunk>500kB còn tồn tại.
- **33/33** scripts/explorer-full-mock.browser.cjs pass ở1920×1080, không console/uncaught errors trong journey chính.
- **14/14** scripts/explorer-experience-fixes.browser.cjs pass ở1920×1080. Script này chạy sau full mock để dùng cùng API fixtures, xác minh2D/3D positions, không chồng card/label, bốn lầnV, đi bộ gặp bàn, không phantom/trùng colliders,9 bộ bàn ghế có collision, teleport và đi ra, Escape, delayed503/status/error/retry tới GLB thật, không uncaught application errors.
- Đối chứng teleport Thu ngân: trước(5,0,3.4) kẹt; sau(-1.84,0,-0.46), đứng trước POS(-1.84,0,-2) và đi ra được. Đi bộ ngang từ spawn dừng x≈1.95 trước bộ bàn có minX≈2.336 với player radius0.38. Test unit riêng chứng minh dừng trước booth ởx8.7.
- V luân phiên first_person/FOV75 và third_person/FOV68, label cùng mode.2D frame Thu ngân x≈-1.84,z=-2.45 khớp group3D.
- Delayed request2,5s rồi503 là lỗi kiểm thử cố ý; có thể có console/network error tương ứng503. Không coi lỗi chủ động này là uncaught application failure. Retry button đã tải GLB và xóa trạng thái lỗi/busy.
- Judge độc lập theo design-ux: loading/error/retry đọc rõ, không che toolbar/sidebar/timeline; sau sửa2D không còn blocker/major trong ảnh. Ảnh: .playwright-mcp/explorer-010-2d.png, explorer-010-explore.png, explorer-010-loading.png, explorer-010-model-error.png, explorer-010-desktop.png.
- git diff --check các file trong phạm vi không có lỗi mới; vẫn có whitespace có sẵn tại PlayerController.js:197 đã ghi nhận từ EXPLORER-006, không tự sửa phần ngoài thay đổi.

## Giới hạn còn lại
Năm nhóm lỗi009 đã có kiểm tra đối chứng. Mô hình/scene/camera thật nhưng API/session mock, chưa xác nhận backend Equipment/JWT/persistence. Không thay đổi số đo/phân vùng đã lưu hoặc áp dụng migration. Chưa tối ưu asset6,32MiB và batching930drawcalls đã đo ở009; WebGL không hỗ trợ/context loss và điện thoại thật còn chưa xác minh. Không coi128tests+47browser checkpoints là chứng nhận mọi thiết bị hoặc chi nhánh thực tế.
