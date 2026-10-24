# PLANNER-024 — Kiểm thử lại 3D Schedule Planner

Ngày 20/10/2026. Tái sử dụng PROJECT_CONTEXT/TASK_MEMORY/CODEBASE_MAP và suite EXPLORER-011.

- `node --test src/features/schedule-planner/plannerModel.test.js`: 6/6 PASS. Overlap qua đêm, ca liền kề, draft không mutation, duplicate, eligibility/skill/capacity, cancelled và identity thiếu.
- `scripts/test-schedule-planner.browser.cjs`: 20/20 PASS tại 1920×1080, WebGL/GLB thật, session/API fixture. Raycast cashier mở ứng viên, nhãn không phóng quá lớn, draft/avatar qua ba views, undo/protected exit, duplicate block, eligibility thay đổi chặn POST, apply một POST mock không force, overlap warning có giờ/điều hướng, empty date khóa Apply. Không uncaught/console error trong lượt thành công.
- Lượt đầu thất bại do fixture hardcode 19/10 trong khi Planner chọn ngày hiện tại. Đã sửa ngày fixture và ngày rỗng theo ngày chạy; gỡ API route cũ trước test và tháo event listeners khi hoàn tất. Không sửa mã ứng dụng.
- `npm run build`: PASS, còn cảnh báo chunk >500 kB đã có.
- Browser kết thúc Spatial có canvas, document đúng 1920×1080 không overflow. Ảnh `.playwright-mcp/planner-024-final.png`; các ảnh Spatial/Matrix/Timeline/conflict trong suite được cập nhật.
- Chạy lại theo yêu cầu mở Edge: Playwright UA xác nhận Microsoft Edge `Edg/155`; suite 20/20 PASS. Khôi phục ngày hiện tại và Spatial, xác nhận 1 canvas, viewport/document 1920×1080, ảnh `.playwright-mcp/planner-024-edge-final.png`.
- Giới hạn: chưa xác minh JWT/API thật, tải đông người, cảm ứng/mobile; POST chỉ vào fixture, không ghi DB thật.
