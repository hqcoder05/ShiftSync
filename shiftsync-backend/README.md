# ShiftSync - Auto Scheduling Module

## Báo Cáo Tính Nang (Scoring Model)
Thu?t toán Auto-Schedule ch?m di?m nhân viên d?a trên 5 tiêu chí: Skill, Hour, Fairness, Rest Time, và Availability.

**Luu ý quan tr?ng (Known Limitation):**
Availability Score hi?n là h?ng s? 1.0 (known limitation), 4/5 tiêu chí còn l?i dã scoring d?y d? theo tr?ng s? c?u hình du?c.

Các tiêu chí khác:
- **Skill**: Match tuy?t d?i level (Beginner 0.25 -> Expert 1.0).
- **Hour**: T? l? thu?n v?i s? gi? còn l?i so v?i gi?i h?n tu?n.
- **Fairness**: D?a trên t?ng s? ca trong THÁNG so v?i d?nh m?c h?p d?ng.
- **Rest Time**: N?i suy tuy?n tính d?a trên kho?ng cách ngh? v?i ca g?n nh?t.
