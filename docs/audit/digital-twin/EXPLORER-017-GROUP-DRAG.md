# EXPLORER-017 — Kéo nguyên cụm trạm, bảo vệ bố trí
Ngày:21/10/2026. Yêu cầu: đồ bị di chuyển rời rạc, cần lưu/di chuyển đúng nhóm model.

## Nguyên nhân và sửa chữa
Tái sử dụng GLB store-v2, PHASE-2A, EXPLORER-008/015/016 và skill3d-web-experience. Asset đã có Workstation_POS_01, Workstation_Barista_01… với máy/quầy/phụ kiện là con. mapWorkstationsToGlb từng gắn isWorkstation cho mọi con; onPointerDown dừng ở mesh con gần nhất nên tách riêng món khỏi nhóm.
- getWorkstationDragRoot chỉ chấp nhận ancestor thuộc workstationMeshes đăng ký. Loader chỉ đánh dấu isWorkstation ở root, giữ metadata con cho tra cứu.
- Di chuyển root assembly giữ mọi local transform con; không gộp cả cửa hàng thành khối, không xuất lại GLB vì cấu trúc nhóm đã đúng.
- Threshold6px ngăn click/jitter tạo drag. Offset điểm bấm giữ nhóm không nhảy vào tâm chuột; chuyển world position về local parent.
- Baseline được giữ tới khi commit rõ ràng. Chọn lại/kéo tiếp cùng trạm không ghi đè baseline. Đổi trạm, clear, thoát editor, dispose hoàn tác preview vị trí/xoay chưa lưu. Preview tồn tại qua cập nhật context/remapping. Đổi selection reset tọa độ draft UI.
- Xoay preview không mutation workstation DTO. API hiện không có rotation field; chưa bổ sung lưu góc xoay backend. Task này không tuyên bố rotation persistence.
- Banner giải thích kéo cả cụm và quy tắc hủy nháp.

## Khôi phục
Hủy/thoát trả về baseline phiên đang sửa. Các child bị kéo rời trước bản vá chỉ là transform trong RAM: tải lại trang nạp model gốc. Không tự ghi đè tọa độ trạm đã lưu backend; chưa có lịch sử snapshot backend để phục hồi vị trí cũ đã lưu. Không sửa backend/DB/dependency/GLB.

## Kiểm chứng
- Node27/27 PASS: controller13 (gồm5 regression mới), loader11, selection3; assertion loader kiểm tra root-only tagging.
- Build production PASS, cảnh báo chunk>500KB cũ.
- Edge1920x1080: world-info45 PASS; group drag6 PASS bằng raycast/click/drag chuột thật lên geometry con: root di chuyển, local transforms con không đổi, Hủy và thoát phục hồi baseline. Planner20 PASS. Fixtures REST/session, canvas/GLB/WebGL thật; không kiểm chứng lưu layout backend thật.
- scripts/test-workstation-groups.browser.cjs chạy sau test-world-info.browser.cjs (dùng cùng fixture đang gắn). Ảnh .playwright-mcp/workstation-group-safe-1920.png.
- Bảo tồn dirty worktree, không commit/push/reset.

Stale khi thay root binding, pointer lifecycle, context remapping, selection/commit/rollback hoặc backend rotation contract.
