# ShiftSync - Backend API Draft & Security Design

Tài liệu này mô tả kiến trúc phân chia module

## 1. Package Structure (Modular Architecture)

Hệ thống áp dụng kiến trúc **Modular Monolith**.


```
com.shiftsync
├── shared/                          # 📦 SHARED MODULE - Dùng chung
│   ├── config/                      # SecurityConfig, RedisConfig, CorsConfig
│   ├── security/                    # JwtTokenProvider, JwtAuthFilter
│   ├── exception/                   # GlobalExceptionHandler, BusinessException
│   ├── dto/                         # ApiResponse, PageResponse, BaseRequest
│   ── utils/                       # DateUtils, GeoUtils (Haversine)
│
├── auth/                            # 🔐 MODULE: AUTHENTICATION
│   ├── controller/                  # AuthController
│   ├── service/                     # AuthService
│   ├── repository/                  # UserRepository
│   └── entity/                      # User
│
├── store/                           # 🏪 MODULE: STORE & CONFIG
│   ├── controller/                  # StoreController
│   ├── service/                     # StoreService, StoreConfigService
│   ├── repository/                  # StoreRepository, StoreConfigRepository
│   └── entity/                      # Store, StoreConfig
│
├── employee/                        # 👥 MODULE: EMPLOYEE & EMPLOYMENT
│   ├── controller/                  # EmployeeController
│   ├── service/                     # EmployeeService, EmploymentService
│   ├── repository/                  # EmployeeRepository, EmploymentRepository
│   └── entity/                      # Employee, Employment
│
├── skill/                           # 🎓 MODULE: SKILL MANAGEMENT
│   ├── controller/                  # SkillController
│   ├── service/                     # SkillService
│   ├── repository/                  # SkillRepository, EmployeeSkillRepository
│   └── entity/                      # Skill, EmployeeSkill
│
├── availability/                    # 📅 MODULE: AVAILABILITY & LEAVE
│   ├── controller/                  # AvailabilityController, LeaveController
│   ├── service/                     # AvailabilityService, LeaveService
│   ├── repository/                  # AvailabilityRepository, LeaveRequestRepository
│   └── entity/                      # Availability, LeaveRequest
│
├── shift/                           #  MODULE: SHIFT MANAGEMENT
│   ├── controller/                  # ShiftController
│   ├── service/                     # ShiftService, ShiftTemplateService
│   ├── repository/                  # ShiftRepository, ShiftRequirementRepository
│   └── entity/                      # Shift, ShiftTemplate, ShiftRequirement
│
├── scheduling/                      #  MODULE: AUTO SCHEDULING (CORE)
│   ├── controller/                  # SchedulingController
│   ├── service/                     # SchedulingService
│   ├── algorithm/                   # HardFilter, SoftScorer, SchedulingContext
│   ├── repository/                  # SchedulingRunRepository, ShiftAssignmentRepository
│   └── entity/                      # ShiftAssignment, SchedulingRun
│
├── marketplace/                     # 🛒 MODULE: MARKETPLACE & SWAP
│   ├── controller/                  # MarketplaceController, SwapController
│   ├── service/                     # MarketplaceService, SwapService
│   ├── repository/                  # OpenShiftRepository, SwapRequestRepository
│   └── entity/                      # SwapRequest
│
├── attendance/                      # 📍 MODULE: ATTENDANCE
│   ├── controller/                  # AttendanceController
│   ├── service/                     # AttendanceService, AdjustmentService
│   ├── repository/                  # AttendanceRepository, AdjustmentRepository
│   ── entity/                      # Attendance, AttendanceAdjustmentRequest
│
├── payroll/                         # 💰 MODULE: PAYROLL
│   ├── controller/                  # PayrollController
│   ├── service/                     # PayrollService, PayrollPeriodService
│   ├── repository/                  # PayrollRepository, PayrollPeriodRepository
│   └── entity/                      # Payroll, PayrollPeriod
│
├── notification/                    # 🔔 MODULE: NOTIFICATION
│   ├── service/                     # NotificationService, FcmService
│   ├── repository/                  # NotificationRepository
│   └── entity/                      # Notification
│
└── dashboard/                       #  MODULE: DASHBOARD
    ├── controller/                  # DashboardController
    └── service/                     # DashboardService