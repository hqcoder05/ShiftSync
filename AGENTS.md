# ShiftSync — Coding Agent Operating Instructions

> **QUAN TRỌNG:** Tập tin này chứa quy tắc vận hành bắt buộc dành cho mọi AI Coding Agent (Antigravity, Claude Code, GitHub Copilot, Codex) khi làm việc trên repository ShiftSync.

---

## 1. Cơ chế Lưu vết Tri thức (Codebase Knowledge System)

Để tối ưu hóa hiệu năng, giảm thiểu chi phí context window và ngăn ngừa việc quét lại mã nguồn toàn bộ repository một cách lãng phí, hệ thống tri thức đã được thiết lập tại:

📂 **[`docs/agent-memory/`](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/)**
- 📄 [PROJECT_CONTEXT.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/PROJECT_CONTEXT.md): Điểm nạp ngữ cảnh khởi đầu bắt buộc. Đọc tệp này đầu tiên trước mọi thao tác.
- 📄 [TASK_MEMORY.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/TASK_MEMORY.md): Bàn giao trạng thái hiện tại, công việc vừa hoàn tất và việc tiếp theo.
- 📄 [CODEBASE_MAP.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/CODEBASE_MAP.md): Bản đồ phân hệ, API contracts, DTO, entity, và các ràng buộc kiến trúc đã được kiểm chứng (`[VERIFIED]`).
- 📄 [AUDIT_INDEX.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/AUDIT_INDEX.md): Danh mục tra cứu toàn bộ báo cáo audit kỹ thuật trước đây (AUD-001, FIX-001, AUD-002, WEB-001).
- 📄 [CHANGELOG.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/CHANGELOG.md): Nhật ký các thay đổi và kết quả kiểm thử.

---

## 2. Quy trình Bắt buộc cho mọi Nhiệm vụ (Mandatory Workflow)

Mỗi khi nhận nhiệm vụ mới, Agent **BẮT BUỘC** thực hiện theo 6 bước:

1. **Bước 1 — Đọc Entry Point:** Đọc [PROJECT_CONTEXT.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/PROJECT_CONTEXT.md) và [TASK_MEMORY.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/TASK_MEMORY.md). **KHÔNG ĐƯỢC** bắt đầu bằng lệnh quét toàn bộ codebase.
2. **Bước 2 — Tra cứu Tri thức có sẵn:** Dùng [AUDIT_INDEX.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/AUDIT_INDEX.md) và [CODEBASE_MAP.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/CODEBASE_MAP.md) để tìm các module, API, ràng buộc liên quan. Chỉ đọc phần báo cáo cần thiết.
3. **Bước 3 — Kiểm tra Độ tươi có chọn lọc:** Chạy `git status --short` đối chiếu với Baseline (`c9d4df1`). Chỉ đọc lại các file nguồn khi phát hiện file đó đã bị thay đổi hoặc liên quan trực tiếp đến logic cần sửa.
4. **Bước 4 — Triển khai & Kiểm thử:** Thực hiện thay đổi trong phạm vi tối thiểu. Chạy kiểm thử tương ứng (`node --test`, `npm run build`, hoặc `mvn test`).
5. **Bước 5 — Cập nhật Tri thức:** Bổ sung task vào [CHANGELOG.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/CHANGELOG.md), cập nhật [CODEBASE_MAP.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/CODEBASE_MAP.md) và [TASK_MEMORY.md](file:///d:/ThucTapTotNghiep/ShiftSync/docs/agent-memory/TASK_MEMORY.md).
6. **Bước 6 — Báo cáo:** Trình bày kết quả bằng tiếng Việt, dẫn chiếu rõ ràng tri thức đã tái sử dụng và kết quả test đối chứng.

---

## 3. Quy tắc An toàn Git Tuyệt đối

- **Branch làm việc:** `quoc-backend` (Baseline: `c9d4df1`).
- **KHÔNG ĐƯỢC:** Chạy `git reset`, `git clean`, `git checkout`, `git stash`, `git commit` hoặc `git push` mà không có chỉ thị rõ ràng từ người dùng.
- **BẢO TỒN NGUYÊN VẸN:** Mọi file đang sửa đổi dở dang trong working tree.

---

## 4. Giới hạn Tải Tự động (Automatic Loading Notice)

- Tùy thuộc vào cấu hình client hoặc IDE của Agent (ví dụ: Antigravity/Cursor/Claude Code), tệp `AGENTS.md` này có thể được nạp tự động hoặc cần được nhắc đến trong prompt ban đầu.
- Nếu môi trường không tự động đưa `AGENTS.md` vào prompt context, Agent phải luôn chủ động kiểm tra thư mục `docs/agent-memory/` khi phát hiện đang làm việc trong dự án ShiftSync.
