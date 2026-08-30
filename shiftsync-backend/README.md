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

### Ghi ch quan tr?ng v? Lu?ng nghi?p v? (FR-12, FR-13, FR-14)
- **FR-13 (Nh?n ca tr?ng - Open Shift Claim):** p d?ng co ch? t? d?ng First Valid First Served. Khi Staff claim m?t Open Shift trn Marketplace, h? th?ng s? T? Ð?NG t?o ShiftAssignment ngay l?p t?c m khng c?n Manager duy?t.
- **FR-12 & FR-14 (D?i ca - Shift Swap):** Khi nhn vin t?o yu c?u d?i ca v?i nhau, s? c?n hai bu?c xc nh?n: (1) Nhn vin cn l?i ph?i accept (employeeAccepted = true), v (2) Manager ph?i vo duy?t (Approve ho?c Reject). Lu?ng d?i ca ch? th?c s? c hi?u l?c sau khi Manager Approve. M?i hành vi Reject (t? Staff B ho?c Manager) s? gi? nguyn tr?ng thi assignment ban d?u.
