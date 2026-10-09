# Commit & Release Report

## Branch
duyen-frontend

## Baseline
9f8e2e7 (Merge pull request #15 from hqcoder05/test-production)

## Tổng số file đã commit
219

## Tổng số commit tạo
219

## Commit manifest

| STT | File | Commit | Message |
|---|---|---|---|
| 1 | `.gitignore` | `bec7818` | Cập nhật cấu hình Git ignore cho thư mục gốc |
| 2 | `shiftsync-backend/.gitignore` | `a3f0b00` | Cập nhật cấu hình Git ignore cho backend |
| 3 | `shiftsync-backend/src/main/java/com/shiftsync/attendance/controller/AttendanceAdjustmentController.java` | `eb8a3a5` | Cập nhật bộ điều khiển điều chỉnh chấm công |
| 4 | `shiftsync-backend/src/main/java/com/shiftsync/attendance/controller/AttendanceController.java` | `29e5c30` | Cập nhật bộ điều khiển chấm công |
| 5 | `shiftsync-backend/src/main/java/com/shiftsync/attendance/dto/AdjustmentCreateRequest.java` | `5c559ab` | Bổ sung ràng buộc xác thực dữ liệu cho yêu cầu điều chỉnh chấm công |
| 6 | `shiftsync-backend/src/main/java/com/shiftsync/attendance/repository/AttendanceRepository.java` | `75d0dc4` | Bổ sung truy vấn dữ liệu chấm công theo ca làm |
| 7 | `shiftsync-backend/src/main/java/com/shiftsync/attendance/service/AttendanceService.java` | `b09294e` | Cập nhật nghiệp vụ chấm công xác thực vị trí và ca làm việc |
| 8 | `shiftsync-backend/src/main/java/com/shiftsync/audit/service/AuditLogService.java` | `449c01e` | Cập nhật dịch vụ ghi nhật ký kiểm toán hệ thống |
| 9 | `shiftsync-backend/src/main/java/com/shiftsync/auth/controller/UserController.java` | `4e86a7a` | Cập nhật bộ điều khiển người dùng kiểm tra quyền truy cập |
| 10 | `shiftsync-backend/src/main/java/com/shiftsync/auth/dto/UserCreateRequest.java` | `4fe8ee8` | Bổ sung ràng buộc xác thực cho DTO tạo người dùng |
| 11 | `shiftsync-backend/src/main/java/com/shiftsync/auth/repository/UserRepository.java` | `fd5b69f` | Cập nhật kho dữ liệu người dùng hỗ trợ phân lập chi nhánh |
| 12 | `shiftsync-backend/src/main/java/com/shiftsync/auth/service/AuthService.java` | `8bab172` | Cập nhật dịch vụ xác thực tài khoản và cấp phát token |
| 13 | `shiftsync-backend/src/main/java/com/shiftsync/auth/service/UserService.java` | `f76fd1b` | Cập nhật dịch vụ người dùng áp dụng kiểm soát quyền RBAC và IDOR |
| 14 | `shiftsync-backend/src/main/java/com/shiftsync/availability/controller/AvailabilityController.java` | `c343d07` | Cập nhật bộ điều khiển lịch khả dụng kiểm tra quyền sở hữu IDOR |
| 15 | `shiftsync-backend/src/main/java/com/shiftsync/config/AsyncConfig.java` | `b457f46` | Thêm cấu hình AsyncConfig quản lý thread pool thông báo và tác vụ ngầm |
| 16 | `shiftsync-backend/src/main/java/com/shiftsync/config/WebSocketConfig.java` | `803b2da` | Cập nhật cấu hình WebSocket bảo mật và định tuyến tin nhắn |
| 17 | `shiftsync-backend/src/main/java/com/shiftsync/employment/controller/ContractTypeController.java` | `506516b` | Cập nhật bộ điều khiển loại hợp đồng lao động |
| 18 | `shiftsync-backend/src/main/java/com/shiftsync/employment/controller/EmploymentController.java` | `60ab6fc` | Cập nhật bộ điều khiển hồ sơ việc làm của nhân viên |
| 19 | `shiftsync-backend/src/main/java/com/shiftsync/employment/repository/EmploymentRepository.java` | `40e0766` | Bổ sung phương thức kiểm tra quan hệ việc làm nhân viên theo chi nhánh |
| 20 | `shiftsync-backend/src/main/java/com/shiftsync/layout/controller/LayoutController.java` | `99bd2b9` | Cập nhật bộ điều khiển bố cục không gian cửa hàng 3D |
| 21 | `shiftsync-backend/src/main/java/com/shiftsync/layout/service/SpatialAllocationService.java` | `3b2a9a3` | Cập nhật thuật toán phân bổ không gian nhân sự 3D |
| 22 | `shiftsync-backend/src/main/java/com/shiftsync/leave/controller/LeaveRequestController.java` | `f731705` | Cập nhật bộ điều khiển đơn xin nghỉ phép |
| 23 | `shiftsync-backend/src/main/java/com/shiftsync/leave/service/LeaveRequestService.java` | `18460f3` | Cập nhật nghiệp vụ nghỉ phép chặn hủy đơn trong quá khứ |
| 24 | `shiftsync-backend/src/main/java/com/shiftsync/marketplace/controller/MarketplaceController.java` | `8f07377` | Cập nhật bộ điều khiển chợ ca làm việc |
| 25 | `shiftsync-backend/src/main/java/com/shiftsync/marketplace/service/MarketplaceService.java` | `e39c1f4` | Cập nhật nghiệp vụ nhận ca mở trên chợ ca có khóa phân tán |
| 26 | `shiftsync-backend/src/main/java/com/shiftsync/notification/service/NotificationService.java` | `aba8107` | Cập nhật dịch vụ gửi thông báo đẩy FCM và thông báo nội bộ |
| 27 | `shiftsync-backend/src/main/java/com/shiftsync/payroll/controller/HolidayController.java` | `b6bab11` | Cập nhật bộ điều khiển ngày lễ tính lương |
| 28 | `shiftsync-backend/src/main/java/com/shiftsync/payroll/controller/PayrollController.java` | `db2e8f1` | Cập nhật bộ điều khiển bảng lương và chốt kỳ lương |
| 29 | `shiftsync-backend/src/main/java/com/shiftsync/payroll/repository/PayrollPeriodRepository.java` | `aa25194` | Cập nhật truy vấn kiểm tra trùng lặp khoảng thời gian chu kỳ lương |
| 30 | `shiftsync-backend/src/main/java/com/shiftsync/payroll/service/PayrollCalculationService.java` | `3c58184` | Cập nhật nghiệp vụ tính lương hỗ trợ ngày nghỉ phép có lương |
| 31 | `shiftsync-backend/src/main/java/com/shiftsync/quota/controller/HeadcountQuotaController.java` | `b3fde6e` | Cập nhật bộ điều khiển định mức nhân sự |
| 32 | `shiftsync-backend/src/main/java/com/shiftsync/quota/dto/ApplySchedulerRequest.java` | `2102130` | Bổ sung ràng buộc dữ liệu cho yêu cầu áp dụng lịch tự động |
| 33 | `shiftsync-backend/src/main/java/com/shiftsync/quota/dto/AutoFillQuotaRequest.java` | `32f36b0` | Bổ sung ràng buộc dữ liệu cho yêu cầu tự động điền định mức |
| 34 | `shiftsync-backend/src/main/java/com/shiftsync/quota/dto/UpdateQuotaRequest.java` | `25e779b` | Bổ sung ràng buộc dữ liệu cho yêu cầu cập nhật định mức |
| 35 | `shiftsync-backend/src/main/java/com/shiftsync/quota/service/HeadcountQuotaService.java` | `e171d2e` | Cập nhật dịch vụ tính toán định mức nhân sự theo nhu cầu |
| 36 | `shiftsync-backend/src/main/java/com/shiftsync/shared/config/SecurityConfig.java` | `ad78e38` | Cập nhật cấu hình bảo mật Spring Security và bộ lọc ủy quyền |
| 37 | `shiftsync-backend/src/main/java/com/shiftsync/shared/exception/GlobalExceptionHandler.java` | `2508899` | Cập nhật bộ xử lý ngoại lệ toàn cục chuẩn hóa phản hồi lỗi |
| 38 | `shiftsync-backend/src/main/java/com/shiftsync/shared/security/StoreAccessService.java` | `d37f3f6` | Bổ sung phương thức xác thực phân lập truy cập theo cửa hàng |
| 39 | `shiftsync-backend/src/main/java/com/shiftsync/shift/controller/ShiftController.java` | `3431c07` | Cập nhật bộ điều khiển quản lý ca làm việc |
| 40 | `shiftsync-backend/src/main/java/com/shiftsync/shift/controller/ShiftSwapController.java` | `52135f5` | Cập nhật bộ điều khiển yêu cầu đổi ca làm việc |
| 41 | `shiftsync-backend/src/main/java/com/shiftsync/shift/dto/ShiftCreateRequest.java` | `a33e437` | Bổ sung ràng buộc kích thước trường dữ liệu cho yêu cầu tạo ca làm |
| 42 | `shiftsync-backend/src/main/java/com/shiftsync/shift/service/AutoScheduleService.java` | `4b5346e` | Cập nhật thuật toán xếp ca tự động tối ưu hóa công bằng |
| 43 | `shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftAssignmentService.java` | `01639ad` | Cập nhật dịch vụ phân công ca làm việc và xác thực ràng buộc |
| 44 | `shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftAssignmentValidator.java` | `6040faf` | Cập nhật bộ thẩm định tính hợp lệ khi gán nhân viên vào ca |
| 45 | `shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftService.java` | `829e4c4` | Cập nhật dịch vụ ca làm việc chặn xóa cứng ca đã có nhân viên |
| 46 | `shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftSwapService.java` | `d2e6f0e` | Cập nhật dịch vụ đổi ca kiểm tra ràng buộc thời gian ca trong tương lai |
| 47 | `shiftsync-backend/src/main/java/com/shiftsync/shift/service/ShiftTemplateService.java` | `5eec97b` | Cập nhật dịch vụ mẫu ca làm việc chuẩn |
| 48 | `shiftsync-backend/src/main/java/com/shiftsync/skill/dto/SkillRequest.java` | `ce3b472` | Bổ sung ràng buộc xác thực dữ liệu cho DTO kỹ năng |
| 49 | `shiftsync-backend/src/main/java/com/shiftsync/store/controller/SchedulerConfigurationController.java` | `52d9767` | Cập nhật bộ điều khiển cấu hình tham số thuật toán xếp ca |
| 50 | `shiftsync-backend/src/main/java/com/shiftsync/store/controller/StoreController.java` | `3b999fa` | Bổ sung endpoint tổng quan thông tin cửa hàng |
| 51 | `shiftsync-backend/src/main/java/com/shiftsync/store/controller/StoreTemplateController.java` | `547e831` | Cập nhật bộ điều khiển mẫu cấu hình cửa hàng |
| 52 | `shiftsync-backend/src/main/java/com/shiftsync/store/dto/ManagerSummaryDTO.java` | `27ff9e7` | Thêm DTO ManagerSummaryDTO tóm tắt quản lý cửa hàng |
| 53 | `shiftsync-backend/src/main/java/com/shiftsync/store/dto/StoreCreateRequest.java` | `cc40c04` | Bổ sung ràng buộc xác thực dữ liệu cho yêu cầu tạo cửa hàng |
| 54 | `shiftsync-backend/src/main/java/com/shiftsync/store/dto/StoreDTO.java` | `86d7871` | Bổ sung danh sách người quản lý vào DTO phản hồi cửa hàng |
| 55 | `shiftsync-backend/src/main/java/com/shiftsync/store/dto/StoreOverviewDTO.java` | `70d73bc` | Thêm DTO StoreOverviewDTO tổng quan vận hành cửa hàng |
| 56 | `shiftsync-backend/src/main/java/com/shiftsync/store/service/StoreService.java` | `40f7126` | Cập nhật dịch vụ cửa hàng hỗ trợ lấy thông tin tổng quan và phân lập dữ liệu |
| 57 | `shiftsync-backend/src/main/java/com/shiftsync/workforce/controller/WorkforceProposalController.java` | `58c3071` | Cập nhật bộ điều khiển đề xuất điều phối nhân lực |
| 58 | `shiftsync-backend/src/main/java/com/shiftsync/workforce/controller/WorkforceRequestController.java` | `5ed5305` | Cập nhật bộ điều khiển yêu cầu mượn nhân viên liên chi nhánh |
| 59 | `shiftsync-backend/src/main/java/com/shiftsync/workforce/dto/WorkforceRequestCreateDTO.java` | `c15ea96` | Bổ sung trường dữ liệu và ràng buộc cho DTO tạo yêu cầu nhân lực |
| 60 | `shiftsync-backend/src/main/java/com/shiftsync/workforce/dto/WorkforceRequestResponseDTO.java` | `ae3eecb` | Bổ sung trường dữ liệu chi tiết vào DTO phản hồi yêu cầu nhân lực |
| 61 | `shiftsync-backend/src/main/java/com/shiftsync/workforce/entity/WorkforceRequest.java` | `595d394` | Bổ sung trường thời gian và cấu hình liên kết thực thể yêu cầu nhân lực |
| 62 | `shiftsync-backend/src/main/java/com/shiftsync/workforce/repository/WorkforceProposalRepository.java` | `3f18fb6` | Cập nhật kho dữ liệu đề xuất điều phối nhân sự |
| 63 | `shiftsync-backend/src/main/java/com/shiftsync/workforce/repository/WorkforceRequestRepository.java` | `3932dc3` | Bổ sung truy vấn kiểm tra xung đột yêu cầu mượn nhân sự |
| 64 | `shiftsync-backend/src/main/java/com/shiftsync/workforce/service/WorkforceRequestService.java` | `ffb8a37` | Cập nhật dịch vụ yêu cầu mượn nhân sự liên chi nhánh |
| 65 | `shiftsync-backend/src/main/resources/db/migration/V41__fix_payroll_period_overlap.sql` | `1c74e7b` | Thêm migration V41 sửa lỗi trùng lặp chu kỳ lương |
| 66 | `shiftsync-backend/src/main/resources/db/migration/V42__restore_workforce_request_columns.sql` | `0161ef7` | Thêm migration V42 khôi phục các cột yêu cầu điều phối nhân sự |
| 67 | `shiftsync-backend/docker-compose.yml` | `02d37f0` | Cập nhật cấu hình dịch vụ trong docker-compose |
| 68 | `shiftsync-backend/pom.xml` | `7163ed7` | Cập nhật cấu hình phụ thuộc Maven cho backend |
| 69 | `shiftsync-backend/src/main/resources/application.properties` | `3ab3817` | Cập nhật cấu hình multipart và thuộc tính backend |
| 70 | `shiftsync-backend/src/test/java/com/shiftsync/AuditLogTransactionTest.java` | `f002e8a` | Cập nhật kiểm thử tự động AuditLogTransactionTest cho backend |
| 71 | `shiftsync-backend/src/test/java/com/shiftsync/ConcurrencyVerificationTest.java` | `0607b50` | Cập nhật kiểm thử tự động ConcurrencyVerificationTest cho backend |
| 72 | `shiftsync-backend/src/test/java/com/shiftsync/DataIntegrityVerificationTest.java` | `400e7f8` | Cập nhật kiểm thử tự động DataIntegrityVerificationTest cho backend |
| 73 | `shiftsync-backend/src/test/java/com/shiftsync/NextAuditVerificationTest.java` | `d38c72b` | Cập nhật kiểm thử tự động NextAuditVerificationTest cho backend |
| 74 | `shiftsync-backend/src/test/java/com/shiftsync/PostFixDI004VerificationTest.java` | `400828d` | Cập nhật kiểm thử tự động PostFixDI004VerificationTest cho backend |
| 75 | `shiftsync-backend/src/test/java/com/shiftsync/PostFixDataIntegrityVerificationTest.java` | `1465833` | Cập nhật kiểm thử tự động PostFixDataIntegrityVerificationTest cho backend |
| 76 | `shiftsync-backend/src/test/java/com/shiftsync/PostFixVerificationTest.java` | `3385448` | Cập nhật kiểm thử tự động PostFixVerificationTest cho backend |
| 77 | `shiftsync-backend/src/test/java/com/shiftsync/ValidationTest.java` | `96772fe` | Cập nhật kiểm thử tự động ValidationTest cho backend |
| 78 | `shiftsync-backend/src/test/java/com/shiftsync/attendance/controller/AttendanceAdjustmentControllerTest.java` | `09f365e` | Cập nhật kiểm thử tự động AttendanceAdjustmentControllerTest cho backend |
| 79 | `shiftsync-backend/src/test/java/com/shiftsync/attendance/controller/AttendanceControllerTest.java` | `d73d78d` | Cập nhật kiểm thử tự động AttendanceControllerTest cho backend |
| 80 | `shiftsync-backend/src/test/java/com/shiftsync/attendance/service/AttendanceRegressionPostFixRuntimeQaTest.java` | `de10dc9` | Cập nhật kiểm thử tự động AttendanceRegressionPostFixRuntimeQaTest cho backend |
| 81 | `shiftsync-backend/src/test/java/com/shiftsync/attendance/service/AttendanceServiceQaTest.java` | `5dc68bd` | Cập nhật kiểm thử tự động AttendanceServiceQaTest cho backend |
| 82 | `shiftsync-backend/src/test/java/com/shiftsync/audit/AttendancePhotoMemoryVerificationTest.java` | `fa2bb1e` | Cập nhật kiểm thử tự động AttendancePhotoMemoryVerificationTest cho backend |
| 83 | `shiftsync-backend/src/test/java/com/shiftsync/audit/FCMExecutorVerificationTest.java` | `9bc25c1` | Cập nhật kiểm thử tự động FCMExecutorVerificationTest cho backend |
| 84 | `shiftsync-backend/src/test/java/com/shiftsync/audit/ScheduledExecutorVerificationTest.java` | `f4abf86` | Cập nhật kiểm thử tự động ScheduledExecutorVerificationTest cho backend |
| 85 | `shiftsync-backend/src/test/java/com/shiftsync/audit/service/TX003AuditIntegrationTest.java` | `32835cb` | Cập nhật kiểm thử tự động TX003AuditIntegrationTest cho backend |
| 86 | `shiftsync-backend/src/test/java/com/shiftsync/auth/service/UserCreationRbacTest.java` | `0d6355d` | Cập nhật kiểm thử tự động UserCreationRbacTest cho backend |
| 87 | `shiftsync-backend/src/test/java/com/shiftsync/availability/controller/AvailabilityIdorSecurityTest.java` | `24cbd5c` | Cập nhật kiểm thử tự động AvailabilityIdorSecurityTest cho backend |
| 88 | `shiftsync-backend/src/test/java/com/shiftsync/leave/service/LeaveRequestServiceQaTest.java` | `a25c813` | Cập nhật kiểm thử tự động LeaveRequestServiceQaTest cho backend |
| 89 | `shiftsync-backend/src/test/java/com/shiftsync/leave/service/LeaveRequestServiceTest.java` | `591aef1` | Cập nhật kiểm thử tự động LeaveRequestServiceTest cho backend |
| 90 | `shiftsync-backend/src/test/java/com/shiftsync/marketplace/service/MarketplaceServiceTest.java` | `219a4ff` | Cập nhật kiểm thử tự động MarketplaceServiceTest cho backend |
| 91 | `shiftsync-backend/src/test/java/com/shiftsync/payroll/service/PayrollCalculationServicePaidLeaveTest.java` | `ebd0d2a` | Cập nhật kiểm thử tự động PayrollCalculationServicePaidLeaveTest cho backend |
| 92 | `shiftsync-backend/src/test/java/com/shiftsync/payroll/service/PayrollCalculationServiceQaTest.java` | `2b57955` | Cập nhật kiểm thử tự động PayrollCalculationServiceQaTest cho backend |
| 93 | `shiftsync-backend/src/test/java/com/shiftsync/payroll/service/PayrollCalculationServiceTest.java` | `dc88dbe` | Cập nhật kiểm thử tự động PayrollCalculationServiceTest cho backend |
| 94 | `shiftsync-backend/src/test/java/com/shiftsync/payroll/service/PerformancePayrollTest.java` | `02cc65d` | Cập nhật kiểm thử tự động PerformancePayrollTest cho backend |
| 95 | `shiftsync-backend/src/test/java/com/shiftsync/performance/PerformanceClosureGateTest.java` | `1f10a70` | Cập nhật kiểm thử tự động PerformanceClosureGateTest cho backend |
| 96 | `shiftsync-backend/src/test/java/com/shiftsync/quota/service/HeadcountQuotaDemandRemediationTest.java` | `1618944` | Cập nhật kiểm thử tự động HeadcountQuotaDemandRemediationTest cho backend |
| 97 | `shiftsync-backend/src/test/java/com/shiftsync/shared/exception/GlobalExceptionHandlerHttpQaTest.java` | `1f25ee4` | Cập nhật kiểm thử tự động GlobalExceptionHandlerHttpQaTest cho backend |
| 98 | `shiftsync-backend/src/test/java/com/shiftsync/shared/exception/GlobalExceptionHandlerTest.java` | `d812f30` | Cập nhật kiểm thử tự động GlobalExceptionHandlerTest cho backend |
| 99 | `shiftsync-backend/src/test/java/com/shiftsync/shift/dto/ShiftCreateRequestValidationTest.java` | `ce4e32f` | Cập nhật kiểm thử tự động ShiftCreateRequestValidationTest cho backend |
| 100 | `shiftsync-backend/src/test/java/com/shiftsync/shift/service/AutoScheduleServiceTest.java` | `ca78826` | Cập nhật kiểm thử tự động AutoScheduleServiceTest cho backend |
| 101 | `shiftsync-backend/src/test/java/com/shiftsync/shift/service/ShiftScheduleExceptionAuditTest.java` | `9464856` | Cập nhật kiểm thử tự động ShiftScheduleExceptionAuditTest cho backend |
| 102 | `shiftsync-backend/src/test/java/com/shiftsync/shift/service/ShiftServiceQaTest.java` | `fbc303e` | Cập nhật kiểm thử tự động ShiftServiceQaTest cho backend |
| 103 | `shiftsync-backend/src/test/java/com/shiftsync/shift/service/ShiftSwapServiceQaTest.java` | `6b52606` | Cập nhật kiểm thử tự động ShiftSwapServiceQaTest cho backend |
| 104 | `shiftsync-backend/src/test/java/com/shiftsync/store/service/TX001StoreCascadeIntegrationTest.java` | `c6b2349` | Cập nhật kiểm thử tự động TX001StoreCascadeIntegrationTest cho backend |
| 105 | `shiftsync-backend/src/test/java/com/shiftsync/workforce/service/WorkforceRequestServiceTest.java` | `e19bac2` | Cập nhật kiểm thử tự động WorkforceRequestServiceTest cho backend |
| 106 | `database/seed_two_stores_and_tests.sql` | `04edf8c` | Thêm kịch bản seed dữ liệu hai cửa hàng và tài khoản kiểm thử |
| 107 | `shiftsync-backend/scripts/seed/seed_for_user_testing.sql` | `48d4be5` | Thêm kịch bản seed dữ liệu phục vụ kiểm thử người dùng |
| 108 | `ShiftSync-Mobile/App.js` | `f26e572` | Cập nhật App.js tích hợp modal thông báo tùy biến và xử lý FCM |
| 109 | `ShiftSync-Mobile/GoogleService-Info.plist` | `a433160` | Thêm tệp cấu hình Firebase iOS cho Mobile |
| 110 | `ShiftSync-Mobile/app.json` | `86cf803` | Cập nhật app.json cấu hình Firebase và plugin thông báo Mobile |
| 111 | `ShiftSync-Mobile/components/BottomNavbar.js` | `5d028b3` | Cập nhật thanh điều hướng dưới đáy hiển thị thông báo |
| 112 | `ShiftSync-Mobile/components/CustomAlertModal.js` | `f09ca04` | Thêm component CustomAlertModal hiển thị thông báo tùy biến trên Mobile |
| 113 | `ShiftSync-Mobile/components/EmployeeCard3D.js` | `058c253` | Cập nhật component hiển thị thẻ nhân viên 3D trên Mobile |
| 114 | `ShiftSync-Mobile/components/ScrollTimePicker.js` | `63bf07c` | Cập nhật component cuộn chọn thời gian trên Mobile |
| 115 | `ShiftSync-Mobile/google-services.json` | `b4a02dd` | Thêm tệp cấu hình Firebase Android cho Mobile |
| 116 | `ShiftSync-Mobile/navigation/AppNavigator.js` | `b4e76c5` | Cập nhật điều hướng tích hợp màn hình thông báo và xử lý FCM |
| 117 | `ShiftSync-Mobile/package-lock.json` | `d4ac5a1` | Cập nhật package-lock.json khóa phiên bản thư viện Mobile |
| 118 | `ShiftSync-Mobile/package.json` | `ca4edb9` | Cập nhật package.json bổ sung thư viện hỗ trợ thông báo Mobile |
| 119 | `ShiftSync-Mobile/screens/AttendanceScreenLive.js` | `833056c` | Cập nhật màn hình chấm công trực tiếp sử dụng thông báo tùy biến |
| 120 | `ShiftSync-Mobile/screens/AvailabilityScreen.js` | `71fd110` | Cập nhật màn hình đăng ký lịch rảnh sử dụng thông báo tùy biến |
| 121 | `ShiftSync-Mobile/screens/DashboardScreen.js` | `b1f3b4a` | Cập nhật màn hình tổng quan Mobile hiển thị thông báo và ca làm |
| 122 | `ShiftSync-Mobile/screens/LoginScreen.js` | `d2ec7bf` | Cập nhật màn hình đăng nhập Mobile đăng ký token thông báo FCM |
| 123 | `ShiftSync-Mobile/screens/MarketplaceScreen.js` | `759b2b9` | Cập nhật màn hình chợ ca Mobile áp dụng thông báo tùy biến |
| 124 | `ShiftSync-Mobile/screens/NotificationScreen.js` | `9718f40` | Thêm màn hình trung tâm thông báo NotificationScreen trên Mobile |
| 125 | `ShiftSync-Mobile/screens/RequestScreen.js` | `7f30066` | Cập nhật màn hình yêu cầu nghỉ phép và mượn ca trên Mobile |
| 126 | `ShiftSync-Mobile/screens/ScheduleScreen.js` | `676bde2` | Cập nhật màn hình lịch làm việc cá nhân trên Mobile |
| 127 | `ShiftSync-Mobile/services/attendanceService.js` | `12bcc8b` | Cập nhật dịch vụ chấm công gửi tọa độ và ảnh selfie |
| 128 | `ShiftSync-Mobile/services/notificationService.js` | `d8bb5b5` | Cập nhật dịch vụ thông báo lấy danh sách và đánh dấu đã đọc |
| 129 | `ShiftSync-Mobile/services/pushNotificationHelper.js` | `fce3b66` | Thêm helper đăng ký và xử lý thông báo đẩy FCM trên Mobile |
| 130 | `ShiftSync-Mobile/services/requestService.js` | `32a6a2c` | Cập nhật dịch vụ gửi yêu cầu nghỉ phép và đổi ca từ Mobile |
| 131 | `ShiftSync-Mobile/utils/alert.js` | `87d10e0` | Thêm tiện ích điều phối thông báo alert trên Mobile |
| 132 | `ShiftSync-Web/package-lock.json` | `4fbe2b8` | Cập nhật package-lock.json khóa phiên bản thư viện Web |
| 133 | `ShiftSync-Web/package.json` | `219fbc7` | Cập nhật package.json bổ sung gói Firebase cho Web |
| 134 | `ShiftSync-Web/public/firebase-messaging-sw.js` | `ba18909` | Thêm Service Worker Firebase xử lý thông báo chạy ngầm trên Web |
| 135 | `ShiftSync-Web/src/components/AddUserModal.jsx` | `210905f` | Cập nhật modal thêm người dùng hỗ trợ phân quyền chi nhánh |
| 136 | `ShiftSync-Web/src/components/Header.jsx` | `af3e846` | Cập nhật header hiển thị thông tin cửa hàng và thông báo |
| 137 | `ShiftSync-Web/src/components/spatial/Store3DManager.jsx` | `6b22de3` | Cập nhật trình quản lý không gian cửa hàng 3D trên Web |
| 138 | `ShiftSync-Web/src/config/firebase.js` | `a6f131b` | Thêm cấu hình Firebase và hàm xin quyền nhận thông báo FCM Web |
| 139 | `ShiftSync-Web/src/features/spatial-workspace/SpatialWorkspace.jsx` | `1d8eb7f` | Cập nhật không gian làm việc 3D mô phỏng vị trí nhân sự |
| 140 | `ShiftSync-Web/src/features/spatial-workspace/components/SpatialInspector.jsx` | `25f70ba` | Cập nhật thanh thanh tra không gian 3D |
| 141 | `ShiftSync-Web/src/features/spatial-workspace/components/inspector/AttentionCenter.jsx` | `089b844` | Cập nhật trung tâm cảnh báo chú ý trong không gian 3D |
| 142 | `ShiftSync-Web/src/features/spatial-workspace/simulation/SimulationValidator.js` | `3cefa2f` | Cập nhật bộ thẩm định mô phỏng phân tán vị trí làm việc |
| 143 | `ShiftSync-Web/src/pages/AdminPage.css` | `eddb031` | Cập nhật kiểu dáng giao diện trang quản trị Admin |
| 144 | `ShiftSync-Web/src/pages/AdminPage.jsx` | `8101acc` | Cập nhật trang quản trị Admin quản lý chi nhánh và định mức |
| 145 | `ShiftSync-Web/src/pages/AttendancePageLive.jsx` | `237ec4c` | Cập nhật trang giám sát chấm công trực tiếp theo thời gian thực |
| 146 | `ShiftSync-Web/src/pages/DashboardPage.jsx` | `b2f15ed` | Cập nhật trang bảng điều khiển trung tâm quản lý chi nhánh |
| 147 | `ShiftSync-Web/src/pages/EmployeeDetailPage.jsx` | `b2a976c` | Cập nhật trang chi tiết thông tin và hợp đồng của nhân viên |
| 148 | `ShiftSync-Web/src/pages/EmployeesPage.jsx` | `307369a` | Cập nhật trang danh sách nhân viên áp dụng lọc theo chi nhánh |
| 149 | `ShiftSync-Web/src/pages/LoginPage.jsx` | `20f00c2` | Cập nhật trang đăng nhập tích hợp xin quyền và lấy FCM token |
| 150 | `ShiftSync-Web/src/pages/MarketplacePage.jsx` | `37d784d` | Cập nhật trang chợ ca làm việc cho phép duyệt và phân công ca |
| 151 | `ShiftSync-Web/src/pages/SchedulePage.jsx` | `73a2d70` | Cập nhật trang xếp lịch làm việc ma trận và kích hoạt thuật toán |
| 152 | `ShiftSync-Web/src/pages/StoresPage.jsx` | `f090c43` | Cập nhật trang danh sách cửa hàng hiển thị danh sách quản lý |
| 153 | `ShiftSync-Web/src/services/adminService.js` | `dbced9c` | Cập nhật dịch vụ gọi API quản trị hệ thống |
| 154 | `ShiftSync-Web/src/services/api.js` | `c34ad2c` | Cập nhật cấu hình axios đánh chặn token và xử lý lỗi kết nối |
| 155 | `ShiftSync-Web/src/services/employeeService.js` | `e22e7e9` | Cập nhật dịch vụ gọi API quản lý hồ sơ nhân viên |
| 156 | `ShiftSync-Web/src/services/layoutService.js` | `d43cc5a` | Cập nhật dịch vụ gọi API cấu hình không gian cửa hàng 3D |
| 157 | `ShiftSync-Web/src/services/notificationService.js` | `86ef463` | Cập nhật dịch vụ gọi API thông báo hệ thống |
| 158 | `ShiftSync-Web/src/services/storeService.js` | `a183903` | Cập nhật dịch vụ gọi API lấy thông tin và tổng quan cửa hàng |
| 159 | `ShiftSync-Web/vite.config.js` | `8b30d0d` | Cập nhật cấu hình Vite hỗ trợ Service Worker |
| 160 | `docs/audit/AUTH_FINAL_VERIFICATION_REPORT.md` | `bd110d3` | Thêm báo cáo kiểm toán AUTH_FINAL_VERIFICATION_REPORT vào tài liệu chính thức |
| 161 | `docs/audit/AUTH_USER_ROLE_AUDIT_REPORT.md` | `01fa5df` | Thêm báo cáo kiểm toán AUTH_USER_ROLE_AUDIT_REPORT vào tài liệu chính thức |
| 162 | `docs/audit/BUSINESS_LOGIC_FINAL_VERIFICATION_REPORT.md` | `0358d1c` | Thêm báo cáo kiểm toán BUSINESS_LOGIC_FINAL_VERIFICATION_REPORT vào tài liệu chính thức |
| 163 | `docs/audit/BUSINESS_LOGIC_FIX_REPORT.md` | `c83ceed` | Thêm báo cáo kiểm toán BUSINESS_LOGIC_FIX_REPORT vào tài liệu chính thức |
| 164 | `docs/audit/CONCURRENCY_AUDIT.md` | `60a0fb7` | Thêm báo cáo kiểm toán CONCURRENCY_AUDIT vào tài liệu chính thức |
| 165 | `docs/audit/FCM_AUDIT_REPORT.md` | `025d20c` | Thêm báo cáo kiểm toán FCM_AUDIT_REPORT vào tài liệu chính thức |
| 166 | `docs/audit/FCM_CALL_SITE_MATRIX.md` | `4df5cf7` | Thêm báo cáo kiểm toán FCM_CALL_SITE_MATRIX vào tài liệu chính thức |
| 167 | `docs/audit/STATE_TRANSITION_AUDIT.md` | `fc2bc38` | Thêm báo cáo kiểm toán STATE_TRANSITION_AUDIT vào tài liệu chính thức |
| 168 | `docs/defense/SYSTEM_MAP.md` | `e0ac268` | Thêm tài liệu sơ đồ kiến trúc bảo vệ đồ án SYSTEM MAP |
| 169 | `docs/diagrams/07_Attendance_Payroll.png` | `082a5f1` | Cập nhật sơ đồ kiến trúc đồ họa 07_Attendance_Payroll |
| 170 | `docs/diagrams/AD-07_Attendance_LiveSelfie.html` | `735b237` | Thêm trang trực quan hóa sơ đồ tương tác AD-07_Attendance_LiveSelfie |
| 171 | `docs/diagrams/AD-07_Attendance_LiveSelfie.png` | `8479ad5` | Cập nhật sơ đồ kiến trúc đồ họa AD-07_Attendance_LiveSelfie |
| 172 | `docs/diagrams/AD-07_Attendance_Payroll.puml` | `f1e7941` | Thêm sơ đồ PlantUML AD-07_Attendance_Payroll |
| 173 | `docs/diagrams/AD-07_Attendance_Payroll_Swimlanes.puml` | `f35493b` | Thêm sơ đồ PlantUML AD-07_Attendance_Payroll_Swimlanes |
| 174 | `docs/diagrams/Diagram.drawio` | `7ce7e3a` | Cập nhật sơ đồ kiến trúc đồ họa Diagram |
| 175 | `docs/diagrams/Hinh_1_1_Kien_Truc_Tong_The.png` | `12bde02` | Cập nhật sơ đồ kiến trúc đồ họa Hinh_1_1_Kien_Truc_Tong_The |
| 176 | `docs/diagrams/SD-06_Marketplace_Swap.puml` | `433d942` | Thêm sơ đồ PlantUML SD-06_Marketplace_Swap |
| 177 | `docs/diagrams/SD-07_Attendance_Payroll.puml` | `0fc6fc1` | Thêm sơ đồ PlantUML SD-07_Attendance_Payroll |
| 178 | `docs/diagrams/UC-00_System_Overview.puml` | `43a3e4a` | Thêm sơ đồ PlantUML UC-00_System_Overview |
| 179 | `docs/diagrams/UC-01_Authentication.puml` | `c5999ae` | Thêm sơ đồ PlantUML UC-01_Authentication |
| 180 | `docs/diagrams/UC-02_Employee_Workforce.puml` | `495135f` | Thêm sơ đồ PlantUML UC-02_Employee_Workforce |
| 181 | `docs/diagrams/UC-03_Scheduler_Shift.puml` | `9da871e` | Thêm sơ đồ PlantUML UC-03_Scheduler_Shift |
| 182 | `docs/diagrams/UC-04_Marketplace_Swap.puml` | `fa654c0` | Thêm sơ đồ PlantUML UC-04_Marketplace_Swap |
| 183 | `docs/diagrams/UC-05_Attendance_Leave.png` | `c0f1205` | Cập nhật sơ đồ kiến trúc đồ họa UC-05_Attendance_Leave |
| 184 | `docs/diagrams/UC-05_Attendance_Leave.puml` | `556fad7` | Thêm sơ đồ PlantUML UC-05_Attendance_Leave |
| 185 | `docs/diagrams/UC-06_Payroll.puml` | `4bd5854` | Thêm sơ đồ PlantUML UC-06_Payroll |
| 186 | `docs/diagrams/UC-07_Store_Spatial.puml` | `507d977` | Thêm sơ đồ PlantUML UC-07_Store_Spatial |
| 187 | `docs/diagrams/UC-08_Dashboard_Notification.puml` | `4a91a78` | Thêm sơ đồ PlantUML UC-08_Dashboard_Notification |
| 188 | `docs/diagrams/UI-01_Web_Dashboard.png` | `9fc24f5` | Cập nhật sơ đồ kiến trúc đồ họa UI-01_Web_Dashboard |
| 189 | `docs/diagrams/UI-02_Web_Schedule_Matrix.png` | `43f20a4` | Cập nhật sơ đồ kiến trúc đồ họa UI-02_Web_Schedule_Matrix |
| 190 | `docs/diagrams/UI-03_Web_3D_Spatial_Workspace.png` | `651a8b5` | Cập nhật sơ đồ kiến trúc đồ họa UI-03_Web_3D_Spatial_Workspace |
| 191 | `docs/diagrams/UI-04_Web_Demand_Planning.png` | `5e8ff72` | Cập nhật sơ đồ kiến trúc đồ họa UI-04_Web_Demand_Planning |
| 192 | `docs/diagrams/UI-05_Mobile_Home_Schedule.png` | `9eef0c3` | Cập nhật sơ đồ kiến trúc đồ họa UI-05_Mobile_Home_Schedule |
| 193 | `docs/diagrams/UI-06_Mobile_Payslip.png` | `7e78d49` | Cập nhật sơ đồ kiến trúc đồ họa UI-06_Mobile_Payslip |
| 194 | `docs/diagrams/UI-07_Mobile_Marketplace.png` | `990be5a` | Cập nhật sơ đồ kiến trúc đồ họa UI-07_Mobile_Marketplace |
| 195 | `docs/diagrams/hinh-1-1-kien-truc-tong-the.html` | `d328c25` | Thêm trang trực quan hóa sơ đồ tương tác hinh-1-1-kien-truc-tong-the |
| 196 | `docs/diagrams/shiftsync-erd-clean.png` | `1718e35` | Cập nhật sơ đồ kiến trúc đồ họa shiftsync-erd-clean |
| 197 | `docs/diagrams/shiftsync-erd-full.png` | `c7e0762` | Cập nhật sơ đồ kiến trúc đồ họa shiftsync-erd-full |
| 198 | `docs/diagrams/shiftsync-erd.html` | `36f338a` | Thêm trang trực quan hóa sơ đồ tương tác shiftsync-erd |
| 199 | `docs/diagrams/uc-05-attendance-leave.html` | `f2e6f75` | Thêm trang trực quan hóa sơ đồ tương tác uc-05-attendance-leave |
| 200 | `docs/exception-audit/schedule/EVIDENCE.md` | `f12411d` | Thêm tài liệu kiểm toán ngoại lệ EVIDENCE |
| 201 | `docs/exception-audit/schedule/EXCEPTION_INVENTORY.md` | `0e9367e` | Thêm tài liệu kiểm toán ngoại lệ EXCEPTION_INVENTORY |
| 202 | `docs/exception-audit/schedule/RESOLVED.md` | `4706eb2` | Thêm tài liệu kiểm toán ngoại lệ RESOLVED |
| 203 | `docs/exception-audit/schedule/SCHEDULE_FAILURE_MATRIX.md` | `52d463d` | Thêm tài liệu kiểm toán ngoại lệ SCHEDULE_FAILURE_MATRIX |
| 204 | `docs/exception-audit/schedule/UNHANDLED.md` | `c7aa381` | Thêm tài liệu kiểm toán ngoại lệ UNHANDLED |
| 205 | `docs/exception-audit/schedule/UNTESTED.md` | `a27abfe` | Thêm tài liệu kiểm toán ngoại lệ UNTESTED |
| 206 | `docs/exception-audit/websocket/WEBSOCKET_AUDIT_REPORT.md` | `fd802d7` | Thêm tài liệu kiểm toán ngoại lệ WEBSOCKET_AUDIT_REPORT |
| 207 | `Auth_Test_Report.md` | `76cfb58` | Xóa báo cáo kiểm thử xác thực cũ |
| 208 | `MANUAL_QA_DATA_MAP.md` | `1428b7a` | Xóa tài liệu ánh xạ dữ liệu QA thủ công cũ |
| 209 | `MANUAL_QA_SCENARIOS.md` | `d4671ec` | Xóa kịch bản kiểm thử QA thủ công cũ |
| 210 | `MANUAL_TEST_ACCOUNTS.md` | `3c713c5` | Xóa danh sách tài khoản kiểm thử thủ công cũ |
| 211 | `PROJECT_KNOWLEDGE.md` | `cc077f3` | Xóa tài liệu kiến thức dự án cũ |
| 212 | `SEED_COVERAGE_REPORT.md` | `1aba4c1` | Xóa báo cáo độ bao phủ dữ liệu seed cũ |
| 213 | `SEED_DATA_MANUAL_AUDIT.log` | `7611b95` | Xóa nhật ký kiểm toán dữ liệu seed cũ |
| 214 | `SEED_DATA_MANUAL_AUDIT_LOG.md` | `152620e` | Xóa báo cáo nhật ký kiểm toán dữ liệu seed cũ |
| 215 | `SHIFTSYNC_CURRENT_SYSTEM_STATUS.md` | `2a2da79` | Xóa tài liệu trạng thái hệ thống cũ |
| 216 | `ShiftSync-Mobile/.claude/settings.json` | `8cbd62a` | Xóa cấu hình Claude cũ trong thư mục Mobile |
| 217 | `dev-log.md` | `a992210` | Xóa nhật ký phát triển cũ |
| 218 | `REPOSITORY_CLEANUP_PLAN.md` | `f0c000f` | Thêm tài liệu kế hoạch dọn dẹp repository REPOSITORY_CLEANUP_PLAN |
| 219 | `REPOSITORY_CLEANUP_REPORT.md` | `3feeb90` | Thêm tài liệu báo cáo kết quả dọn dẹp REPOSITORY_CLEANUP_REPORT |

## Verification

### Backend
- Total tests: 467 tests run
- Failures: 0
- Errors: 0
- Skipped: 3
- Status: BUILD SUCCESS (56.8s)

### Web
- npm run build: PASS (2042 modules transformed, bundled cleanly)

### Mobile
- expo config: PASS (Firebase and push notification plugins valid)

### Secret scan
- Local tokens (.colleague_token, .manager_token, .pvd_token) and test script credentials purged: PASS
- Blocked in .gitignore: PASS

### One-file-one-commit
- 219/219 commits audited: PASS (Every single commit contains exactly 1 file)

### Push
- Remote origin: https://github.com/hqcoder05/ShiftSync.git
- Branch: duyen-frontend
- Command: git push origin duyen-frontend
- Status: PASS (9f8e2e7..3feeb90)

## Final Git Status
```
On branch duyen-frontend
Your branch is up to date with 'origin/duyen-frontend'.

nothing to commit, working tree clean
```

## Final Result
COMMITTED & PUSHED
