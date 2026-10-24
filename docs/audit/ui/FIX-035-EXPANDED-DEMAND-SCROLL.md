# FIX-035 — Cuộn khi mở hết nội dung Định biên
22/10/2026; tái sử dụng SCROLL018/FIX032–034 và CSS workspace. Giữ working tree, không commit/backend/data writes.

Báo cáo người dùng: khi xổ hết các phần, không xem đủ nội dung. Trước sửa local live với riêng budget expanded vẫn cuộn tới cuối được; không tuyên bố tái hiện chính xác mọi môi trường. Thiết kế cũ dùng overlay cuộn dọc, footer sticky và workspace chiều cao tự nhiên. Đã thay bằng dialog giới hạn theo viewport, một content scroller rõ ràng, header/controls/footer không co và nằm ngoài scroller. Không dựa vào footer dài hoặc scale chữ.

CSS DemandPlanningRedesign: overlay flex/overflowhidden/animationnone; workspace max-height100dvh−32 (mobile−16), flexcolumn/minheight0; content flex1/minheight0/overflow-yauto/scroll-padding vàpaddingbottom; footer static flex0 ngoài body. Close nằm trong header luôn hiển thị. Normdialog có backdrop padding và card own maxheight/overflow để nút dưới có thể tiếp cận. Bảng tiếp tục cuộn ngang riêng. Thay workflow cuộn SCROLL018 có chủ đích; khi sửa tiếp cần test content scroller mới.

Kiểm chứng:
- Build PASS, cảnh báo chunk cũ. CSS-only, không thay API.
- Edge tab riêng GETfixture tuần42cells count0 để có42warnings; tất cả details mở, budgetedit mở. NonGET bị chặn. 1920×1080 body845/scroll2581;1366×768 body533/scroll2581;390×600 body244/scroll3728. Cuộn tới cuối, hittest nút Lưu ngân sách PASS và toàn bộ nút nằm trên footer, footer thấy được, không overflow ngang. Normdialog Save hittest PASS cả3sizes. Tab đóng, không DB writes.
- Live Docker ngày1366/390: lastreview nằm trên footer sau cuộn, normSave trong viewport. Không mutation. Live tuần1920 mởbudgetedit và cuộn đáy, screenshot .playwright-mcp/demand-expanded-scroll-035.png. Trả Edge1920.
- Giới hạn:42warnings là fixture, không phải backend có42lỗi; chưa ghi ngân sách/quy chuẩn thật. Các modal/trang khác ngoài định biên không được tuyên bố đã audit.
