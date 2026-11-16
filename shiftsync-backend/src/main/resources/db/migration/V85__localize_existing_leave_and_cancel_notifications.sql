-- Keep historical notifications consistent with the localized messages sent by the application.
UPDATE notification
SET title = 'Yêu cầu nghỉ phép đã được duyệt',
    message = 'Yêu cầu nghỉ phép của bạn đã được quản lý phê duyệt.'
WHERE title = 'Leave Request Approved'
  AND message = 'Your leave request has been approved.';

UPDATE notification
SET title = 'Ca làm việc bị hủy',
    message = replace(replace(message, 'Ca lam viec cua ban vao ngay ', 'Ca làm việc của bạn vào ngày '), ' da bi quan ly huy.', ' đã bị quản lý hủy.')
WHERE title = 'Ca lam viec bi huy';
