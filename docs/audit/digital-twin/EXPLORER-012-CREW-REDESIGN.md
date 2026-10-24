# EXPLORER-012 — Thiết kế lại nhân vật Crew V2

Ngày: 19/10/2026. Branch: `quoc-backend`; baseline tham chiếu: `c9d4df1`.

## Phạm vi và tri thức tái sử dụng

Yêu cầu: thiết kế lại model nhân vật trong Interactive Store. Đọc PROJECT_CONTEXT, TASK_MEMORY, CODEBASE_MAP và AUDIT_INDEX; tái sử dụng loader/joint contract, resource ownership và bố trí quầy đã kiểm chứng ở EXPLORER-008/010/011. Giữ nguyên layout, phân công, API và dữ liệu backend; bảo lưu working tree, không commit/push.

## Thay đổi

- `CrewModel.js` là nguồn dựng chung cho bốn model: pha chế tạp dề xanh rêu và khăn, thu ngân tạp dề đất nung/tóc búi, quản lý polo xanh than/bảng tên/đồng hồ, đầu bếp áo kem/mũ/tạp dề olive. Thêm mặt, tóc, cổ áo, túi, giày; tỷ lệ người khoảng 1,7 m (mũ bếp cao hơn).
- `scripts/generate-crew-v2.mjs` xuất GLB mới tại `public/models/crew-v2/`. Không ghi đè bốn GLB gốc. Model có các group Hips/Spine/Head, vai/khuỷu/cổ tay, hông/gối/cổ chân; animation xoay các group cứng, **không** phải skinned mesh hoặc animation clip từ motion capture.
- `CharacterAssetLoader` tải/cache bốn URL mới. Nếu GLB chưa sẵn sàng hoặc tải lỗi, dựng cùng thiết kế Crew V2 từ cache. Mỗi instance clone hierarchy/khớp độc lập, dùng chung geometry/material và đánh dấu shared để cleanup một người không phá người còn lại.
- `StylizedAvatars` và `PlayerAvatar` dùng chung factory; bỏ model dự phòng cũ thiếu chi tiết và nhánh chuyển động không còn dùng. Giữ selection/name tag/employee/zone/movement contract. Thêm gập gối khi đi, gập khuỷu theo tư thế làm việc và trả chân về tư thế đứng.
- `/crew-preview.html` là trang xem trước cho Vite dev: bốn GLB thật, kéo xoay/cuộn gần, bật/tắt đi bộ. Đây là công cụ kiểm tra thiết kế; trang HTML này tham chiếu `/src/`, không khẳng định là entry được bundle để triển khai production. Model mới được dùng trong ứng dụng chính và được copy vào dist khi build.

## Ngân sách asset đã đo

| Vai trò | GLB bytes | Mesh | Tam giác / model |
| --- | ---: | ---: | ---: |
| Pha chế | 557580 | 31 | 19136 |
| Thu ngân | 547880 | 30 | 18836 |
| Quản lý | 496272 | 31 | 16932 |
| Đầu bếp | 575640 | 31 | 19840 |

Geometry được gộp theo khớp/material và weld thành indexed buffers. Không coi mesh count là tổng draw calls của scene; shadow passes và số nhân viên làm tăng chi phí. Chưa bổ sung LOD/instancing hoặc kiểm chứng tải lớn.

## Kiểm chứng

- `node --test` các test thuộc spatial-workspace và schedule-planner: **141/141 PASS**, 20 suites. Sáu test Crew mới đọc GLB thật, kiểm tra kích thước/sàn, 13 joint cần cho animation, budget, geometry hữu hạn, uniform, clone independence và shared-resource disposal. Cập nhật kỳ vọng URL tại CharacterGLBIntegration.
- `npm run build`: **PASS**, 924 ms; còn cảnh báo chunk lớn hơn 500 kB.
- Playwright trên **1920×1080**: Crew **7/7**, Store Explorer **33/33**, experience regressions **14/14**, Planner **20/20**. Model/WebGL thật; dữ liệu nghiệp vụ/session/API mock trong browser. Không có uncaught application errors. Crew cố tình trả 503 cho bốn GLB để xác minh model dự phòng đầy đủ, sau đó trả browser về tải model bình thường.
- Judge độc lập xem lineup, walking và cảnh nhân viên sau quầy: không thấy blocker/major hình thể; mặt/vai trò đọc được, không thấy chi rời hoặc xuyên sàn rõ. Minor: đầu gối/khuỷu còn phong cách đồ chơi, chưa có chuyển tiếp mềm như model skinned.
- Ảnh: `.playwright-mcp/crew-012-lineup.png`, `crew-012-walk.png`, `crew-012-in-store.png` (ảnh trong cửa hàng chụp trước chỉnh nhẹ độ cao dây tạp dề). Browser kết thúc tại trang preview, 1920×1080.

Không kiểm chứng DB/JWT/persistence thật trong task này; không nâng trạng thái toàn hệ thống lên fully implemented.

## Xác nhận áp dụng

Theo yêu cầu tiếp theo “áp dụng”, đối chiếu lại AvatarLayer → StylizedAvatars → CharacterAssetLoader và PlayerAvatar; bộ Crew V2 đã là mặc định của Store/Planner/tham quan, không cần sửa thêm nguồn. Chạy lại 33/33 Store Explorer checkpoints đạt ở 1920×1080; runtime nhân viên có isGlbModel=true, designVersion=2 và khớp gối. Mở route /schedule thay trang preview. Dữ liệu browser vẫn mock; không ghi nghiệp vụ vào DB thật.
