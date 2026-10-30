# FIX-041 — Làm rõ độ phủ định biên

Ngày 25/10/2026. Phạm vi: presentation trong ô định biên ngày/tuần, không đổi API hay phép tính.

## Thay đổi

- Tách câu tóm tắt thành bốn tín hiệu riêng: nguồn nhu cầu (`Nhu cầu đã lưu` / `Gợi ý chưa lưu`), nhu cầu, đã phân công, và thiếu/dư thực tế.
- Dùng màu nguồn xanh cho dữ liệu đã lưu, vàng cho gợi ý chưa lưu; thiếu là đỏ, đủ người là xanh. Nhãn phân công chưa rõ vị trí vẫn được giữ với giải thích.
- Không dùng số phân công để thay thế nhu cầu; các giá trị vẫn là DTO `quota` trả từ backend.

## Kiểm chứng

- `node --test src/components/demand-planning/demandStatus.test.js` 2/2 PASS và `npm run build` PASS ngày 25/10/2026.
- Chưa kiểm browser Edge hoặc API Docker thật cho lượt đổi presentation này.
