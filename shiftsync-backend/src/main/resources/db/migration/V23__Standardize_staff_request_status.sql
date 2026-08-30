UPDATE staff_requests SET status = 'PENDING' WHERE status = N'Đang chờ phê duyệt';
UPDATE staff_requests SET status = 'APPROVED' WHERE status = N'Đã phê duyệt';
UPDATE staff_requests SET status = 'REJECTED' WHERE status = N'Đã từ chối';
-- Any other status defaults to PENDING
UPDATE staff_requests SET status = 'PENDING' WHERE status NOT IN ('PENDING', 'APPROVED', 'REJECTED');
