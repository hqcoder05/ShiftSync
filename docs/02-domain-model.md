# Domain Model

## Identity và tổ chức

`User` là identity đăng nhập; `Employment` liên kết user với `Store` và `ContractType`. `Skill` được gán cho staff qua `StaffSkill`, có level/expiration; ca có `ShiftSkillRequirement`.

## Scheduling

`Shift` chứa ngày/giờ, store, open/status/requirements; `ShiftAssignment` liên kết shift với staff và required skill/source; `ShiftTemplate` là mẫu tạo ca; `ShiftSwapRequest` là yêu cầu đổi ca.

## Cross-store

`WorkforceRequest` biểu diễn nhu cầu chia sẻ staff giữa store; `WorkforceProposal` là lời mời/đề xuất gửi staff. Controller riêng biệt cho request và proposal, vì vậy không được dùng proposal id làm marketplace shift id.

## Spatial

`StoreLayout` thuộc store, có `StoreZone` và `Workstation`. DTO spatial được phục vụ bởi `LayoutController`; allocation service trả kết quả allocation, không biến 3D renderer thành business source.

## Payroll/attendance

`Attendance` lưu check-in/out và location/selfie metadata; `PayrollPeriod` nhóm kỳ, `Payroll` lưu payslip/calculation. `LeaveBalance` và `LeaveRequest` là nguồn leave; holiday do `Holiday`/`HolidayService` quản lý.
