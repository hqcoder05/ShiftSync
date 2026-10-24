# FIX-037 — Giảm mật độ chiều cao Định biên
22/10/2026. Tái sử dụng FIX036 viewportgrid và FIX034 weeklyview; không API/backend/DBwrite/commit.

Sau phản hồi vẫn quá to, giảm chính nội dung thay vì chỉ đổi vùng cuộn: header bỏ mô tả lặp, metrics thành hàng44px, hint11px, review bỏ thống kê lặp (đã có metrics/table). Cell tuần [-][count][+] cùng hàng, status hàng dưới, roleeditbutton gọn; button24×26desktop/24×30mobile. Giữ đầy đủ số người và trạng thái; labelngắn có title giải thích đầy đủ min/target/max. Helper metrics vẫn accessible, lượt có tooltip mộtngườihai ca. Budgetedit form ngangdesktop, dọcmobile. Cap panel860→790, gridbody tiếp tục giữ overflow bounded.

Kiểm chứng Edge155 Docker live1920/1620/1366/390: tại1620×948 body633/scroll633 và1366×768 body579/scroll579, thấy trọn nội dung tuần3vịtrí kể cả ngân sách mở+edit, không cần cuộn dọc. Bảng từ khoảng392px ởFIX034 xuống240px. Mobile390×600 body291/scroll838, cuộn tới budgetSave hittestPASS; footer luôn thấy. Không hứa mọi dữ liệu dài đều vừa mà vẫn giữ scroller. Ảnh .playwright-mcp/demand-dense-037.png. Build/newDailyWeeklylintPASS, chunkwarningcũ. Không mutation data hoặc fixture trong tab chính.
