# FIX-038 — Cân bằng tỷ lệ Định biên
22/10/2026. User yêu cầu hài hòa, không quá nhỏ/to. Tái sử dụng FIX036 viewportgrid và FIX037; không API/DB/commit.

Thay phần Dense của Viewport.css bằng một thang kích thước chung cho ngày/tuần: heading23, body13, secondary12, count18, metric23, status11; stepper30×32 thay24×26; controls36–38; khoảng cách12–16. Metrics hàng60px, không dồn44px; bảng có padding8 và rolebutton32px. Panelwidth1420 capheight800; cố ý cho nội dung dài cuộn thay vì ép đủ bằng chữ/nút nhỏ. Budgetform ngangdesktop/dọcmobile. Giữ footerrow ngoài contentscroller. Không append thêm lớp dense overrides, đã thay thế block cũ.

BuildPASS(chunkwarningcũ). Edge liveDocker1620×948,1366×768,390×600: bounded/modal/footer, hittestSavebudget sau cuộn PASS, không overflow toànoverlay. 1620 bảng1357px không cần horizontal;1366 table1271/1340 vàmobile325/1340 cuộn ngang riêng. Đợi2animationframes sau viewportresize trước testscroll; test đầu resize tức thì false do layout chưa settle, xác minh lại PASS. Screenshot .playwright-mcp/demand-balanced-038.png. Kết thúcEdge1920, không dữ liệu mẫu/mutation.
