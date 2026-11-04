package com.shiftsync.shift.service;

import com.shiftsync.leave.entity.LeaveRequest;
import com.shiftsync.leave.enums.LeaveStatus;
import com.shiftsync.leave.repository.LeaveRequestRepository;
import com.shiftsync.notification.service.NotificationService;
import com.shiftsync.shift.dto.AutoScheduleRequest;
import com.shiftsync.shift.entity.ShiftAssignment;
import com.shiftsync.shift.repository.ShiftAssignmentRepository;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.support.TransactionTemplate;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Explicit opt-in; fixtures require shiftsync_scheduler_test on a local test port. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:postgresql://127.0.0.1:${TEST_DB_PORT:55432}/shiftsync_scheduler_test",
        "spring.datasource.username=${TEST_DB_USER:postgres}",
        "spring.datasource.password=${TEST_DB_PASSWORD:stabilization-local-only}"
})
@ActiveProfiles("scheduler-postgres")
@EnabledIfSystemProperty(named = "shiftsync.scheduler.postgres-tests", matches = "true")
class SchedulingPostgresIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired jakarta.persistence.EntityManager entityManager;
    @Autowired AutoScheduleService scheduler;
    @Autowired SchedulingPlanService plans;
    @Autowired com.shiftsync.workforce.service.WorkforceRequestService workforce;
    @Autowired com.shiftsync.payroll.service.PayrollCalculationService payrollCalculator;
    @Autowired com.shiftsync.payroll.service.HolidayService holidayService;
    @Autowired com.shiftsync.store.service.StoreService storeService;
    @Autowired com.shiftsync.store.service.StoreConfigurationService storeConfigurationService;
    @Autowired com.shiftsync.layout.service.SpatialAllocationService spatialAllocator;
    @Autowired com.shiftsync.layout.controller.LayoutController layoutController;
    @Autowired com.shiftsync.leave.service.LeaveRequestService leaveService;
    @Autowired com.shiftsync.leave.service.LeaveBalanceService leaveBalanceService;
    @Autowired com.shiftsync.attendance.service.AttendanceService attendanceService;
    @Autowired com.shiftsync.attendance.repository.AttendanceRepository attendanceRows;
    @Autowired com.shiftsync.attendance.service.AttendanceAdjustmentService adjustmentService;
    @Autowired com.shiftsync.shared.security.JwtTokenProvider tokens;
    @Autowired com.shiftsync.employment.service.EmploymentService employmentService;
    @Autowired com.shiftsync.employment.controller.EmploymentController employmentController;
    @Autowired ShiftAssignmentService manual;
    @Autowired ShiftService shiftService;
    @Autowired com.shiftsync.skill.service.SkillService skillService;
    @Autowired com.shiftsync.quota.service.HeadcountQuotaService quotas;
    @Autowired com.shiftsync.notification.repository.UserDeviceTokenRepository deviceTokens;
    @Autowired com.shiftsync.store.service.DashboardService dashboard;
    @Autowired com.shiftsync.store.service.StoreTemplateService storeTemplates;
    @Autowired ShiftTemplateService shiftTemplates;
    @Autowired ShiftSwapService swaps;
    @Autowired ShiftValidationService timeValidator;
    @Autowired com.shiftsync.availability.service.AvailabilityService availabilityService;
    @Autowired com.shiftsync.marketplace.service.MarketplaceService marketplace;
    @Autowired LeaveRequestRepository leaves;
    @Autowired TransactionTemplate tx;
    @Autowired com.shiftsync.payroll.service.CompensationPeriodGuard compensationGuard;
    @Autowired com.shiftsync.payroll.service.CompensationRevisionWriter compensationWriter;
    @Autowired com.shiftsync.payroll.service.EmploymentCompensationScheduler employmentCompensation;
    @Autowired com.shiftsync.payroll.service.ContractCompensationScheduler contractCompensation;
    @Autowired com.shiftsync.payroll.service.SkillCompensationScheduler skillCompensation;
    @Autowired com.shiftsync.payroll.service.HistoricalCompensationService historicalCompensation;
    @Autowired com.shiftsync.payroll.controller.HistoricalCompensationController historicalController;
    @Autowired com.shiftsync.employment.service.ContractTypeService contractTypes;
    @Autowired SchedulingInputVersion inputVersions;
    @Autowired com.shiftsync.shared.transaction.SerializableRetry serializableRetry;
    @Autowired tools.jackson.databind.ObjectMapper json;
    @MockitoSpyBean ShiftAssignmentRepository assignments;
    @MockitoSpyBean com.shiftsync.employment.repository.EmploymentRepository employments;
    @MockitoSpyBean com.shiftsync.payroll.repository.PayrollRepository payrollRows;
    @MockitoSpyBean com.shiftsync.payroll.repository.PayrollPeriodRepository payrollPeriods;
    @MockitoSpyBean com.shiftsync.payroll.repository.HolidayRepository holidayRows;
    @MockitoSpyBean com.shiftsync.attendance.repository.AttendanceAdjustmentRequestRepository adjustmentRows;
    @MockitoSpyBean com.shiftsync.layout.repository.StoreZoneRepository zoneRows;
    @MockitoBean NotificationService notifications;
    // These scheduling tests do not verify asynchronous audit delivery; avoid fixture cleanup racing that worker.
    @MockitoBean com.shiftsync.audit.service.AuditLogService auditLog;
    // Redis is outside these database transaction tests; avoids starting Netty event loops.
    @MockitoBean org.redisson.api.RedissonClient redis;

    private final LocalDate date = LocalDate.of(2030, 11, 3); // Sunday, independent of today's clock
    private final List<UUID> storeIds = new ArrayList<>(), staffIds = new ArrayList<>();

    @BeforeEach void isolatedDatabaseOnly() {
        assertEquals("shiftsync_scheduler_test", jdbc.queryForObject("select current_database()", String.class));
        assertEquals("serializable", tx.execute(status -> jdbc.queryForObject("show transaction_isolation", String.class)));
    }
    @AfterEach void cleanOwnFixtures() {
        reset(assignments);
        reset(employments);
        reset(payrollRows);
        reset(payrollPeriods);
        reset(holidayRows);
        reset(adjustmentRows);
        reset(zoneRows);
        // Only random IDs created by this test; no truncation or deletion of other data.
        for (UUID id : storeIds) {
            jdbc.update("delete from payroll_untracked_reconciliation where revision_id in (select r.id from payroll_effective_revision r where (r.entity_type='employment' and r.entity_id in (select id from employment where store_id=?)) or (r.entity_type='contract_type' and r.entity_id in (select id from contract_type where store_id=?)) or (r.entity_type='skill' and r.entity_id in (select id from skill where store_id=?)))",id,id,id);
            jdbc.update("delete from payroll_reconciliation_evidence where revision_id in (select r.id from payroll_effective_revision r where (r.entity_type='employment' and r.entity_id in (select id from employment where store_id=?)) or (r.entity_type='contract_type' and r.entity_id in (select id from contract_type where store_id=?)) or (r.entity_type='skill' and r.entity_id in (select id from skill where store_id=?)))",id,id,id);
            jdbc.update("delete from blackout_date where leave_request_id in (select id from leave_request where store_id=?)",id);
            jdbc.update("delete from leave_balance where store_id=?",id);
            jdbc.update("delete from payroll where payroll_period_id in (select id from payroll_period where store_id=?)",id);
            jdbc.update("delete from payroll_period where store_id=?",id);
            jdbc.update("delete from workforce_proposal where workforce_request_id in (select id from workforce_request where requesting_store_id=? or target_store_id=?)",id,id);
            jdbc.update("delete from workforce_request where requesting_store_id=? or target_store_id=?",id,id);
            jdbc.update("delete from leave_request where store_id = ?", id);
            jdbc.update("delete from attendance_adjustment_request where shift_id in (select id from shift where store_id=?)",id);
            jdbc.update("delete from shift_swap_request where from_shift_id in (select id from shift where store_id = ?)", id);
            jdbc.update("delete from shift where store_id = ?", id);
            jdbc.update("delete from payroll_effective_revision where entity_type='employment' and entity_id in (select id from employment where store_id=?)",id);
            jdbc.update("delete from payroll_input_history where entity_type='employment' and entity_id in (select id from employment where store_id=?)",id);
            jdbc.update("delete from employment where store_id = ?", id);
            jdbc.update("delete from payroll_input_history where entity_type='employment' and (old_values->>'store_id'=? or new_values->>'store_id'=?)",id.toString(),id.toString());
            jdbc.update("delete from payroll_effective_revision where entity_type='contract_type' and entity_id in (select id from contract_type where store_id=?)",id);
            jdbc.update("delete from payroll_effective_revision where entity_type='skill' and entity_id in (select id from skill where store_id=?)",id);
            jdbc.update("delete from contract_type where store_id = ?", id);
            jdbc.update("delete from store where id = ?", id);
        }
        for (UUID id : staffIds) {
            jdbc.update("delete from user_device_tokens where user_id = ?", id);
            jdbc.update("delete from audit_log where actor_staff_id = ?", id);
            jdbc.update("delete from staff where id = ?", id);
        }
    }
    private UUID store() {
        UUID id = UUID.randomUUID(); storeIds.add(id);
        jdbc.update("insert into store(id,name,category,format,open_time,close_time) values (?,?,'FOOD_BEVERAGE','Test','06:00','23:00')", id, "Scheduler test " + id);
        return id;
    }
    private UUID person() {
        UUID id = UUID.randomUUID(); staffIds.add(id);
        jdbc.update("insert into staff(id,full_name,email,password_hash,system_role) values (?,?,?,'not-for-login','STAFF')", id, "Scheduler staff " + id, id + "@scheduler.invalid");
        jdbc.update("insert into availability(id,staff_id,day_of_week,start_time,end_time) values (?,?,0,'06:00','23:00')", UUID.randomUUID(), id);
        return id;
    }
    private UUID skill(UUID store) {
        UUID skill = UUID.randomUUID();
        jdbc.update("insert into skill(id,store_id,name,hourly_rate) values (?,?,?,30000)", skill, store, "Skill " + skill);
        return skill;
    }
    private void employ(UUID store, UUID staff, UUID skill, String level) {
        UUID contract = UUID.randomUUID();
        jdbc.update("insert into contract_type(id,store_id,name,max_weekly_hours,ot_multiplier,default_hourly_rate) values (?,?,?,48,1.5,30000)", contract, store, "Contract " + contract);
        jdbc.update("insert into employment(id,store_id,staff_id,contract_type_id,hourly_rate,status,joined_date) values (?,?,?,?,30000,'ACTIVE',?)", UUID.randomUUID(), store, staff, contract, date.minusMonths(3));
        jdbc.update("insert into staff_skill(id,staff_id,skill_id,level) values (?,?,?,?::skill_level_enum)", UUID.randomUUID(), staff, skill, level);
    }
    private void scheduleSkillRate(UUID store, UUID skill, int rate) {
        tx.executeWithoutResult(status -> skillCompensation.schedule(store, skill,
                java.math.BigDecimal.valueOf(rate), null, null));
    }
    private void scheduleWeeklyHours(UUID store, int hours) {
        UUID contract = jdbc.queryForObject("select id from contract_type where store_id=?", UUID.class, store);
        scheduleContractHours(store,contract,hours);
    }
    private void scheduleEmployeeWeeklyHours(UUID store, UUID staff, int hours) {
        UUID contract = jdbc.queryForObject("select contract_type_id from employment where store_id=? and staff_id=?", UUID.class, store, staff);
        scheduleContractHours(store,contract,hours);
    }
    private void scheduleContractHours(UUID store, UUID contract, int hours) {
        tx.executeWithoutResult(status -> contractCompensation.schedule(store, contract,
                java.math.BigDecimal.valueOf(30000), hours, new java.math.BigDecimal("1.5"), null, null));
    }
    private void seedKnownHistory(String type, UUID id, LocalDate effectiveDate) {
        // Fixture terms are known for this historical period; production history is never inferred this way.
        jdbc.update("insert into payroll_effective_revision(id,entity_type,entity_id,effective_date,values_json) "
                        + "select gen_random_uuid(),entity_type,entity_id,?,values_json from payroll_effective_revision "
                        + "where entity_type=? and entity_id=? order by effective_date limit 1",
                effectiveDate, type, id);
    }
    private UUID shift(UUID store, UUID skill) {
        UUID id = UUID.randomUUID();
        jdbc.update("insert into shift(id,store_id,shift_date,start_time,end_time,status,is_open,availability_deadline) values (?,?,?,'09:00','17:00','DRAFT',false,?)", id, store, date, date.minusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC));
        jdbc.update("insert into shift_skill_requirement(id,shift_id,skill_id,required_count) values (?,?,?,1)", UUID.randomUUID(), id, skill);
        return id;
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"employment", "contract_type", "skill"})
    void payrollInputHistoryPreservesChangesAndRollsBackWithTheirTransaction(String table) {
        UUID store=store(), staff=person(), role=skill(store);
        employ(store,staff,role,"EXPERT");
        UUID entityId = switch (table) {
            case "employment" -> jdbc.queryForObject("select id from employment where staff_id=? and store_id=?",UUID.class,staff,store);
            case "contract_type" -> jdbc.queryForObject("select contract_type_id from employment where staff_id=? and store_id=?",UUID.class,staff,store);
            case "skill" -> role;
            default -> throw new IllegalArgumentException(table);
        };
        String column = table.equals("contract_type") ? "default_hourly_rate" : "hourly_rate";
        String key = table.equals("contract_type") ? "defaultHourlyRate" : "hourlyRate";
        assertEquals(30000,jdbc.queryForObject(
                "select (values_json->>?)::numeric::integer from payroll_effective_revision where entity_type=? and entity_id=?",Integer.class,key,table,entityId));
        assertEquals(LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")),jdbc.queryForObject(
                "select effective_date from payroll_effective_revision where entity_type=? and entity_id=?",LocalDate.class,table,entityId));
        String update = "update " + table + " set " + column + "=? where id=?";
        jdbc.update(update,42000,entityId);
        assertEquals(30000,jdbc.queryForObject(
                "select (old_values->>?)::numeric::integer from payroll_input_history where entity_id=? and operation='UPDATE' order by id desc limit 1",Integer.class,column,entityId));
        assertEquals(42000,jdbc.queryForObject(
                "select (new_values->>?)::numeric::integer from payroll_input_history where entity_id=? and operation='UPDATE' order by id desc limit 1",Integer.class,column,entityId));
        long before=jdbc.queryForObject("select count(*) from payroll_input_history where entity_id=?",Long.class,entityId);
        tx.executeWithoutResult(status -> {
            jdbc.update(update,55000,entityId);
            status.setRollbackOnly();
        });
        assertEquals(before,jdbc.queryForObject("select count(*) from payroll_input_history where entity_id=?",Long.class,entityId));
        assertEquals(42000,jdbc.queryForObject("select " + column + "::integer from " + table + " where id=?",Integer.class,entityId));
        // Saving an unchanged row must not fabricate a new compensation revision.
        jdbc.update(update,42000,entityId);
        assertEquals(before,jdbc.queryForObject("select count(*) from payroll_input_history where entity_id=?",Long.class,entityId));
    }

    @Test void compensationRevisionsResolveByEffectiveDateAndRejectDuplicates() {
        var revisions = new com.shiftsync.payroll.repository.CompensationRevisionRepository(jdbc);
        UUID entity = UUID.randomUUID(), first=UUID.randomUUID(), second=UUID.randomUUID();
        LocalDate day = LocalDate.of(2030, 1, 10);
        try {
            revisions.insert(first,"skill",entity,day,"{\"hourlyRate\":30000}",null);
            revisions.insert(second,"skill",entity,day.plusDays(3),"{\"hourlyRate\":40000}",null);
            assertTrue(revisions.findEffectiveValues("skill",entity,day.minusDays(1)).isEmpty());
            assertTrue(revisions.findEffectiveValues("skill",entity,day.plusDays(2)).orElseThrow().contains("30000"));
            assertTrue(revisions.findEffectiveValues("skill",entity,day.plusDays(3)).orElseThrow().contains("40000"));
            assertTrue(revisions.findEffectiveValues("employment",entity,day.plusDays(3)).isEmpty());
            var conflict=assertThrows(com.shiftsync.shared.exception.BusinessException.class,
                    () -> revisions.insert(UUID.randomUUID(),"skill",entity,day,"{}",null));
            assertEquals(org.springframework.http.HttpStatus.CONFLICT,conflict.getStatus());
            assertTrue(revisions.findEffectiveValues("skill",entity,day).orElseThrow().contains("30000"));
        } finally {
            jdbc.update("delete from payroll_effective_revision where entity_id=?",entity);
        }
    }

    @Test void lockedPayrollOverlapUsesExclusiveEndOfCompensationRevision() {
        UUID store=store(), entity=UUID.randomUUID();
        var revisions=new com.shiftsync.payroll.repository.CompensationRevisionRepository(jdbc);
        var periods = org.springframework.test.util.ReflectionTestUtils.getField(payrollCalculator,"payrollPeriodRepository");
        var repository=(com.shiftsync.payroll.repository.PayrollPeriodRepository)periods;
        LocalDate start=LocalDate.of(2030,1,1), next=start.plusDays(10);
        try {
            revisions.insert(UUID.randomUUID(),"skill",entity,next,"{}",null);
            assertEquals(next,revisions.findNextEffectiveDate("skill",entity,start).orElseThrow());
            jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'PAID')",UUID.randomUUID(),store,next,next.plusDays(6));
            var locked=List.of(com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED);
            assertFalse(repository.existsLockedOverlappingRevision(store,start,next,locked));
            assertTrue(repository.existsLockedOverlappingRevision(store,start,next.plusDays(1),locked));
            assertTrue(repository.existsLockedOverlappingRevision(store,start,LocalDate.of(9999,12,31),locked));
            var guard=new com.shiftsync.payroll.service.CompensationPeriodGuard(repository,
                    (com.shiftsync.store.repository.StoreRepository)org.springframework.test.util.ReflectionTestUtils.getField(payrollCalculator,"storeRepository"));
            guard.check(List.of(store),start,next);
            assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->guard.check(List.of(store),start,null));
            assertThrows(IllegalArgumentException.class,()->guard.check(List.of(store),start,start));
        } finally {
            jdbc.update("delete from payroll_effective_revision where entity_id=?",entity);
        }
    }

    @Test void compensationRevisionInsertRollsBackWithItsBusinessTransaction() {
        var revisions = new com.shiftsync.payroll.repository.CompensationRevisionRepository(jdbc);
        UUID entity=UUID.randomUUID(); LocalDate day=LocalDate.of(2030,2,1);
        tx.executeWithoutResult(status -> {
            revisions.insert(UUID.randomUUID(),"employment",entity,day,"{\"hourlyRate\":40000}",null);
            assertTrue(revisions.findEffectiveValues("employment",entity,day).isPresent());
            status.setRollbackOnly();
        });
        assertTrue(revisions.findEffectiveValues("employment",entity,day).isEmpty());
    }

    @Test void initialCompensationRevisionRollsBackWithNewSkill() {
        UUID store=store(), role=UUID.randomUUID();
        tx.executeWithoutResult(status -> {
            jdbc.update("insert into skill(id,store_id,name,hourly_rate) values (?,?,?,?)",role,store,"Vai trò thử nghiệm",36000);
            assertEquals(1,jdbc.queryForObject("select count(*) from payroll_effective_revision where entity_type='skill' and entity_id=?",Integer.class,role));
            status.setRollbackOnly();
        });
        assertEquals(0,jdbc.queryForObject("select count(*) from skill where id=?",Integer.class,role));
        assertEquals(0,jdbc.queryForObject("select count(*) from payroll_effective_revision where entity_type='skill' and entity_id=?",Integer.class,role));
    }

    @Test void deletedAssignmentPreservesHistoricalSkillWhenSkillDeletionAttempted() {
        UUID store=store(), staff=person(), role=skill(store), shift=shift(store,role), assignment=UUID.randomUUID();
        jdbc.update("delete from shift_skill_requirement where shift_id=?",shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source,required_skill_id,deleted) values (?,?,?,'MANUAL',?,true)",assignment,shift,staff,role);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->skillService.deleteSkill(store,role));
        assertEquals(role,jdbc.queryForObject("select required_skill_id from shift_assignment where id=?",UUID.class,assignment));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,
                ()->jdbc.update("delete from skill where id=?",role));
        assertEquals(role,jdbc.queryForObject("select required_skill_id from shift_assignment where id=?",UUID.class,assignment));
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"skill", "employment", "contract_type"})
    void detectsLegacyCompensationChangesWithoutFlaggingUnrelatedEdits(String table) {
        UUID store=store(), staff=person(), role=skill(store);
        employ(store,staff,role,"EXPERT");
        UUID entity=switch(table) {
            case "skill" -> role;
            case "employment" -> jdbc.queryForObject("select id from employment where staff_id=? and store_id=?",UUID.class,staff,store);
            case "contract_type" -> jdbc.queryForObject("select contract_type_id from employment where staff_id=? and store_id=?",UUID.class,staff,store);
            default -> throw new IllegalArgumentException(table);
        };
        var revisions=new com.shiftsync.payroll.repository.CompensationRevisionRepository(jdbc);
        assertFalse(revisions.hasUntrackedCompensationChange(table,entity));
        if (table.equals("skill")) jdbc.update("update skill set description='màu mới' where id=?",entity);
        if (table.equals("employment")) jdbc.update("update employment set left_date='2031-01-01' where id=?",entity);
        if (table.equals("contract_type")) jdbc.update("update contract_type set name=? where id=?","Đổi tên "+entity,entity);
        assertFalse(revisions.hasUntrackedCompensationChange(table,entity));
        String change=switch(table) {
            case "skill", "employment" -> "hourly_rate=45000";
            case "contract_type" -> "ot_multiplier=2";
            default -> throw new IllegalArgumentException(table);
        };
        jdbc.update("update "+table+" set "+change+" where id=?",entity);
        assertTrue(revisions.hasUntrackedCompensationChange(table,entity));
        revisions.insert(UUID.randomUUID(),table,entity,LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1),"{}",null);
        assertTrue(revisions.hasUntrackedCompensationChange(table,entity),"A later unrelated revision must not hide the untracked change");
    }

    @Test void confirmingPayrollWaitsForCompensationStoreLock() throws Exception {
        UUID store=store(), period=UUID.randomUUID(), admin=person();
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(1));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        var locked=new CountDownLatch(1); var release=new CountDownLatch(1); var started=new CountDownLatch(1);
        var pool=Executors.newFixedThreadPool(2);
        try {
            var holder=pool.submit(()->tx.executeWithoutResult(status->{
                compensationGuard.lockAndCheck(List.of(store),date,null); locked.countDown();
                try { if (!release.await(10,TimeUnit.SECONDS)) throw new IllegalStateException("timeout"); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
            }));
            assertTrue(locked.await(10,TimeUnit.SECONDS));
            var confirmation=pool.submit(()->{
                var user=com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build();
                var principal=new com.shiftsync.shared.security.CustomUserDetails(user);
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try { started.countDown(); payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin); }
                finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
            });
            assertTrue(started.await(10,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->confirmation.get(300,TimeUnit.MILLISECONDS));
            release.countDown(); holder.get(10,TimeUnit.SECONDS); confirmation.get(10,TimeUnit.SECONDS);
            assertEquals("CONFIRMED",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
        } finally { release.countDown(); pool.shutdownNow(); }
    }

    @Test void skillAffectedPayrollStoresIncludeRemovedSupportAssignments() {
        UUID receiving=store(), home=store(), otherHome=store(), staff=person(), role=skill(receiving);
        employ(home,staff,role,"EXPERT"); employ(otherHome,staff,skill(otherHome),"EXPERT");
        UUID homeEmployment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,home,staff);
        UUID secondEmployment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,otherHome,staff);
        UUID first=shift(receiving,role);
        jdbc.update("update shift set shift_date=? where id=?",date.plusDays(1),first);
        UUID second=shift(receiving,role);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source,required_skill_id,support_employment_id,deleted) values (?,?,?,'WORKFORCE_SHARING',?,?,true)",UUID.randomUUID(),first,staff,role,homeEmployment);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source,required_skill_id,support_employment_id) values (?,?,?,'WORKFORCE_SHARING',?,?)",UUID.randomUUID(),second,staff,role,secondEmployment);
        assertEquals(Set.of(home,otherHome),new HashSet<>(assignments.findSupportPayrollStoresForSkill(role)));
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'PAID')",UUID.randomUUID(),home,date,date.plusDays(2));
        var affected = new ArrayList<>(assignments.findSupportPayrollStoresForSkill(role));
        affected.add(receiving);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->tx.executeWithoutResult(status ->
                compensationWriter.insert("skill",role,affected,date,"{\"hourlyRate\":45000}",null)));
        assertEquals(0,jdbc.queryForObject("select count(*) from payroll_effective_revision where entity_id=? and effective_date=?",Integer.class,role,date));
    }

    @Test void compensationWriterRejectsLockedPeriodsWithoutPersistingRevision() {
        UUID receiving=store(), home=store(), role=skill(receiving);
        UUID period=UUID.randomUUID();
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'PAID')",period,home,date,date.plusDays(3));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->tx.executeWithoutResult(status ->
                compensationWriter.insert("skill",role,List.of(receiving,home),date,"{\"hourlyRate\":45000}",null)));
        assertEquals(0,jdbc.queryForObject("select count(*) from payroll_effective_revision where entity_type='skill' and entity_id=? and effective_date=?",Integer.class,role,date));
        tx.executeWithoutResult(status -> compensationWriter.insert("skill",role,List.of(receiving,home),date.plusDays(4),"{\"hourlyRate\":45000}",null));
        assertEquals(1,jdbc.queryForObject("select count(*) from payroll_effective_revision where entity_type='skill' and entity_id=? and effective_date=?",Integer.class,role,date.plusDays(4)));
        jdbc.update("delete from payroll_effective_revision where entity_id=?",role);
    }

    @Test void compensationWriterRejectsIncompleteEmploymentRevisionWithoutWriting() {
        UUID store=store(),staff=person(),role=skill(store); employ(store,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,store,staff);
        var error=assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->tx.executeWithoutResult(status ->
                compensationWriter.insert("employment",employment,List.of(store),date,"{\"hourlyRate\":45000}",null)));
        assertEquals(org.springframework.http.HttpStatus.BAD_REQUEST,error.getStatus());
        assertEquals(0,jdbc.queryForObject("select count(*) from payroll_effective_revision where entity_id=? and effective_date=?",Integer.class,employment,date));
    }

    @Test void concurrentCompensationRevisionsForSameDayYieldOneConflict() throws Exception {
        UUID store=store(), role=skill(store); LocalDate effective=date;
        var ready=new CountDownLatch(2); var start=new CountDownLatch(1); var pool=Executors.newFixedThreadPool(2);
        try {
            java.util.concurrent.Callable<String> action=()->{
                ready.countDown(); if (!start.await(10,TimeUnit.SECONDS)) throw new IllegalStateException("timeout");
                try {
                    serializableRetry.execute(()->{ compensationWriter.insert("skill",role,List.of(store),effective,"{\"hourlyRate\":45000}",null); return null; });
                    return "ok";
                } catch (com.shiftsync.shared.exception.BusinessException conflict) {
                    assertEquals(org.springframework.http.HttpStatus.CONFLICT,conflict.getStatus()); return "conflict";
                }
            };
            var first=pool.submit(action); var second=pool.submit(action);
            assertTrue(ready.await(10,TimeUnit.SECONDS)); start.countDown();
            assertEquals(Set.of("ok","conflict"),Set.of(first.get(20,TimeUnit.SECONDS),second.get(20,TimeUnit.SECONDS)));
            assertEquals(1,jdbc.queryForObject("select count(*) from payroll_effective_revision where entity_type='skill' and entity_id=? and effective_date=?",Integer.class,role,effective));
        } finally { start.countDown(); pool.shutdownNow(); jdbc.update("delete from payroll_effective_revision where entity_id=?",role); }
    }

    @Test void untrackedLegacyChangePreventsNewCompensationSchedule() {
        UUID store=store(),role=skill(store);
        jdbc.update("update skill set hourly_rate=41000 where id=?",role);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->tx.executeWithoutResult(status ->
                compensationWriter.insert("skill",role,List.of(store),date,"{\"hourlyRate\":45000}",null)));
        assertEquals(0,jdbc.queryForObject("select count(*) from payroll_effective_revision where entity_id=? and effective_date=?",Integer.class,role,date));
    }

    @Test void contractUsedInHistoricalEmploymentCannotBeDeleted() {
        UUID store=store(),staff=person(),role=skill(store); employ(store,staff,role,"EXPERT");
        UUID original=jdbc.queryForObject("select contract_type_id from employment where store_id=? and staff_id=?",UUID.class,store,staff);
        UUID replacement=UUID.randomUUID();
        jdbc.update("insert into contract_type(id,store_id,name,max_weekly_hours,ot_multiplier,default_hourly_rate) values (?,?,?,40,1.5,30000)",replacement,store,"Hợp đồng mới");
        jdbc.update("update employment set contract_type_id=? where store_id=? and staff_id=?",replacement,store,staff);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->contractTypes.deleteContractType(store,original));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class,()->jdbc.update("delete from contract_type where id=?",original));
        assertEquals(1,jdbc.queryForObject("select count(*) from contract_type where id=?",Integer.class,original));
    }

    @Test void concurrentContractChangeAndDeletionPreservesHistoricalContract() throws Exception {
        UUID store=store(), staff=person(), role=skill(store); employ(store,staff,role,"EXPERT");
        UUID original=jdbc.queryForObject("select contract_type_id from employment where store_id=? and staff_id=?",UUID.class,store,staff), replacement=UUID.randomUUID();
        jdbc.update("insert into contract_type(id,store_id,name,max_weekly_hours,ot_multiplier,default_hourly_rate) values (?,?,?,40,1.5,30000)",replacement,store,"Đổi "+replacement);
        var changed=new CountDownLatch(1); var release=new CountDownLatch(1); var pool=Executors.newFixedThreadPool(2);
        try {
            var update=pool.submit(()->tx.executeWithoutResult(status->{
                jdbc.update("update employment set contract_type_id=? where store_id=? and staff_id=?",replacement,store,staff);
                changed.countDown(); try { if (!release.await(10,TimeUnit.SECONDS)) throw new IllegalStateException("timeout"); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
            }));
            assertTrue(changed.await(10,TimeUnit.SECONDS));
            var deletion=pool.submit(()->{ try { jdbc.update("delete from contract_type where id=?",original); return true; } catch (org.springframework.dao.DataIntegrityViolationException e) { return false; } });
            release.countDown(); update.get(10,TimeUnit.SECONDS);
            assertFalse(deletion.get(10,TimeUnit.SECONDS),"Hợp đồng cũ phải được giữ lại sau khi đổi hợp đồng");
            assertEquals(1,jdbc.queryForObject("select count(*) from contract_type where id=?",Integer.class,original));
        } finally { release.countDown(); pool.shutdownNow(); }
    }

    @Test void scheduledEmploymentCompensationPreservesCurrentValuesAndUsesRequestedDate() {
        UUID store=store(), staff=person(), role=skill(store), foreign=store(); employ(store,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,store,staff);
        UUID contract=jdbc.queryForObject("select contract_type_id from employment where id=?",UUID.class,employment);
        jdbc.update("update employment set joined_date=? where id=?",LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(30),employment);
        UUID foreignContract=UUID.randomUUID();
        jdbc.update("insert into contract_type(id,store_id,name,max_weekly_hours,ot_multiplier,default_hourly_rate) values (?,?,?,40,1.5,30000)",foreignContract,foreign,"Ngoài chi nhánh");
        var effective=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->tx.executeWithoutResult(status->
                employmentCompensation.schedule(store,staff,foreignContract,new java.math.BigDecimal("45000"),effective,null)));
        var request = new com.shiftsync.employment.dto.EmploymentUpdateRequest();
        request.setContractTypeId(contract);
        request.setHourlyRate(new java.math.BigDecimal("45000"));
        var result = employmentService.updateEmployment(store, staff, request);
        assertEquals(effective,result.getScheduledEffectiveDate());
        assertEquals(new java.math.BigDecimal("45000"),result.getScheduledHourlyRate());
        assertEquals(30000,jdbc.queryForObject("select hourly_rate::integer from employment where id=?",Integer.class,employment));
        assertEquals(45000,jdbc.queryForObject("select (values_json->>'hourlyRate')::numeric::integer from payroll_effective_revision where entity_type='employment' and entity_id=? and effective_date=?",Integer.class,employment,effective));
        var displayed=employmentService.getStaffByStore(store,org.springframework.data.domain.PageRequest.of(0,10)).getContent().get(0);
        assertEquals(0,new java.math.BigDecimal("30000").compareTo(displayed.getHourlyRate()));
        assertEquals(effective,displayed.getScheduledEffectiveDate());
        assertEquals(0,new java.math.BigDecimal("45000").compareTo(displayed.getScheduledHourlyRate()));
    }

    @Test void historicalCompensationRequiresAdministratorEvidenceAndHonoursPayrollLocks() {
        UUID store=store(),foreign=store(),staff=person(),admin=person(),role=skill(store);
        employ(store,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,store,staff);
        UUID contract=jdbc.queryForObject("select contract_type_id from employment where id=?",UUID.class,employment);
        LocalDate day=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(30);
        var input=new com.shiftsync.payroll.dto.HistoricalCompensationRequest();
        input.setEffectiveDate(day);input.setHourlyRate(new java.math.BigDecimal("27000"));
        input.setContractTypeId(contract);input.setEvidence("Hợp đồng ký ngày 01/01 và bảng lương gốc");
        var staffUser=com.shiftsync.auth.entity.User.builder().id(staff).systemRole(com.shiftsync.shared.security.SystemRole.STAFF).build();
        var principal=new com.shiftsync.shared.security.CustomUserDetails(staffUser);
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
        try {
            assertThrows(org.springframework.security.access.AccessDeniedException.class,()->historicalController.reconcile(store,"employment",employment,input,principal));
            assertThrows(org.springframework.security.access.AccessDeniedException.class,()->historicalController.history(store,"employment",employment));
        } finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->historicalCompensation.reconcile(foreign,"employment",employment,input,admin));
        UUID revision=historicalCompensation.reconcile(store,"employment",employment,input,admin);
        var history=historicalCompensation.history(store,"employment",employment);
        assertFalse(history.untrackedChanges());
        assertEquals(revision,history.revisions().get(0).revisionId());
        assertEquals(input.getEvidence(),history.revisions().get(0).evidence());
        assertEquals(27000,((Number)history.revisions().get(0).terms().get("hourlyRate")).intValue());
        assertEquals(27000,json.readTree(json.writeValueAsString(history)).get("revisions").get(0).get("terms").get("hourlyRate").asInt());
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->historicalCompensation.history(foreign,"employment",employment));
        assertEquals(1,jdbc.queryForObject("select count(*) from payroll_reconciliation_evidence where revision_id=? and actor_id=? and evidence=?",Integer.class,revision,admin,input.getEvidence()));
        assertEquals(27000,jdbc.queryForObject("select (values_json->>'hourlyRate')::numeric::integer from payroll_effective_revision where id=?",Integer.class,revision));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->historicalCompensation.reconcile(store,"employment",employment,input,admin));
        var locked=new com.shiftsync.payroll.dto.HistoricalCompensationRequest();
        locked.setEffectiveDate(day.minusDays(15));locked.setHourlyRate(new java.math.BigDecimal("26000"));
        locked.setEvidence("Bảng lương gốc được lưu trữ");locked.setContractTypeId(contract);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'PAID')",UUID.randomUUID(),store,day.minusDays(10),day.minusDays(5));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->historicalCompensation.reconcile(store,"employment",employment,locked,admin));
        assertEquals(0,jdbc.queryForObject("select count(*) from payroll_effective_revision where entity_id=? and effective_date=?",Integer.class,employment,locked.getEffectiveDate()));
    }

    @Test void staffRosterRemainsAvailableWhenCoworkerPayNeedsReconciliation() {
        UUID store=store(),actor=person(),coworker=person(),role=skill(store);
        employ(store,actor,role,"EXPERT");employ(store,coworker,role,"EXPERT");
        jdbc.update("update employment set hourly_rate=45000 where store_id=? and staff_id=?",store,coworker);
        var user=com.shiftsync.auth.entity.User.builder().id(actor).systemRole(com.shiftsync.shared.security.SystemRole.STAFF).build();
        var principal=new com.shiftsync.shared.security.CustomUserDetails(user);
        var authentication=new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities());
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(authentication);
        try {
            var rows=employmentController.getStaffByStore(store,org.springframework.data.domain.PageRequest.of(0,20),authentication).getBody();
            assertEquals(2,rows.getTotalElements());
            var colleague=rows.getContent().stream().filter(row->row.getStaffId().equals(coworker)).findFirst().orElseThrow();
            assertNull(colleague.getHourlyRate());assertNull(colleague.getContractType());assertNull(colleague.getScheduledHourlyRate());
            assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->employmentService.getStaffByStore(store,org.springframework.data.domain.PageRequest.of(0,20)));
        } finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
    }

    @Test void absenceRateOnlyUsesEndedPublishedOrCompletedAssignments() {
        UUID store=store(),staff=person(),role=skill(store);
        LocalDate past=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(2);
        UUID absent=shift(store,role);
        jdbc.update("update shift set shift_date=?,status='COMPLETED' where id=?",past,absent);
        UUID present=shift(store,role);
        jdbc.update("update shift set shift_date=?,start_time='08:00',end_time='16:00',status='PUBLISHED' where id=?",past,present);
        UUID cancelled=shift(store,role);
        jdbc.update("update shift set shift_date=?,start_time='07:00',end_time='15:00',status='CANCELLED' where id=?",past,cancelled);
        UUID draft=shift(store,role);
        jdbc.update("update shift set shift_date=?,start_time='10:00',end_time='18:00',status='DRAFT' where id=?",past,draft);
        UUID future=shift(store,role);
        jdbc.update("update shift set shift_date=?,status='PUBLISHED' where id=?",past.plusDays(3),future);
        UUID recordedAbsent=shift(store,role);
        jdbc.update("update shift set shift_date=?,start_time='11:00',end_time='19:00',status='COMPLETED' where id=?",past,recordedAbsent);
        UUID presentAssignment=UUID.randomUUID();
        for(UUID shift:List.of(absent,cancelled,draft,future))
            jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')",UUID.randomUUID(),shift,staff);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')",presentAssignment,present,staff);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",UUID.randomUUID(),presentAssignment,past.atTime(8,0).atOffset(ZoneOffset.ofHours(7)),past.atTime(16,0).atOffset(ZoneOffset.ofHours(7)));
        UUID absentAssignment=UUID.randomUUID();
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')",absentAssignment,recordedAbsent,staff);
        jdbc.update("insert into attendance(id,shift_assignment_id,status) values (?,?,'ABSENT')",UUID.randomUUID(),absentAssignment);
        assertEquals(3,assignments.countEndedAssignmentsByStoreAndDateRange(store,past,past.plusDays(3)));
        assertEquals(2,assignments.countAbsentAssignmentsByStoreAndDateRange(store,past,past.plusDays(3)));
        assertEquals(66.67,dashboard.getDashboardMetrics(store,past,past.plusDays(3)).getAttendance().getAbsentRate());
    }

    @Test void lateRateUsesOnlyStartedActiveAssignmentsAndTheirAttendance() {
        UUID store=store(),staff=person(),role=skill(store);
        LocalDate past=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(2);
        UUID late=shift(store,role);jdbc.update("update shift set shift_date=?,status='COMPLETED' where id=?",past,late);
        UUID present=shift(store,role);jdbc.update("update shift set shift_date=?,start_time='08:00',end_time='16:00',status='PUBLISHED' where id=?",past,present);
        UUID cancelled=shift(store,role);jdbc.update("update shift set shift_date=?,start_time='07:00',end_time='15:00',status='CANCELLED' where id=?",past,cancelled);
        UUID draft=shift(store,role);jdbc.update("update shift set shift_date=?,start_time='10:00',end_time='18:00',status='DRAFT' where id=?",past,draft);
        UUID future=shift(store,role);jdbc.update("update shift set shift_date=?,status='PUBLISHED' where id=?",past.plusDays(3),future);
        UUID removed=shift(store,role);jdbc.update("update shift set shift_date=?,start_time='11:00',end_time='19:00',status='COMPLETED' where id=?",past,removed);
        for(UUID shift:List.of(late,present,cancelled,draft,future,removed)) {
            UUID assignment=UUID.randomUUID();
            jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source,deleted) values (?,?,?,'MANUAL',?)",assignment,shift,staff,shift.equals(removed));
            jdbc.update("insert into attendance(id,shift_assignment_id,status) values (?,?,?::attendance_status_enum)",UUID.randomUUID(),assignment,shift.equals(present)?"PRESENT":"LATE");
        }
        assertEquals(2,assignments.countStartedAssignmentsByStoreAndDateRange(store,past,past.plusDays(3)));
        assertEquals(1,attendanceRows.countLateStartedAssignments(store,past,past.plusDays(3)));
        assertEquals(50.0,dashboard.getDashboardMetrics(store,past,past.plusDays(3)).getAttendance().getLateRate());
    }

    @Test void historicalPositionReconciliationHonoursHomeStorePaidPeriod() {
        UUID receiving=store(), home=store(), staff=person(), admin=person(), role=skill(receiving);
        employ(home,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,home,staff);
        LocalDate day=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(20);
        UUID shift=shift(receiving,role);
        jdbc.update("update shift set shift_date=? where id=?",day,shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source,support_employment_id) values (?,?,?,?,'WORKFORCE_SHARING',?)",UUID.randomUUID(),shift,staff,role,employment);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'PAID')",UUID.randomUUID(),home,day,day.plusDays(1));
        var input=new com.shiftsync.payroll.dto.HistoricalCompensationRequest();
        input.setEffectiveDate(day.minusDays(1));input.setHourlyRate(new java.math.BigDecimal("25000"));
        input.setEvidence("Bảng lương vị trí có xác nhận");
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->historicalCompensation.reconcile(receiving,"skill",role,input,admin));
        assertEquals(0,jdbc.queryForObject("select count(*) from payroll_effective_revision where entity_type='skill' and entity_id=? and effective_date=?",Integer.class,role,input.getEffectiveDate()));
    }

    @Test void historyShowsOnlyCompensationFieldsOfUntrackedChangesInOrder() {
        UUID store=store(),foreign=store(), role=skill(store);
        jdbc.update("update skill set name='Tên đã sửa' where id=?",role);
        jdbc.update("update skill set hourly_rate=35000,description='không phải dữ liệu lương' where id=?",role);
        jdbc.update("update skill set hourly_rate=40000 where id=?",role);
        var history=historicalCompensation.history(store,"skill",role);
        assertTrue(history.untrackedChanges());
        assertEquals(2,history.untrackedItems().size());
        var first=history.untrackedItems().get(0);var second=history.untrackedItems().get(1);
        assertEquals(Set.of("hourlyRate"),first.oldTerms().keySet());
        assertEquals(30000,((Number)first.oldTerms().get("hourlyRate")).intValue());
        assertEquals(35000,((Number)first.newTerms().get("hourlyRate")).intValue());
        assertEquals(35000,((Number)second.oldTerms().get("hourlyRate")).intValue());
        assertEquals(40000,((Number)second.newTerms().get("hourlyRate")).intValue());
        assertTrue(first.historyId()<second.historyId());assertNotNull(first.recordedAt());
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->historicalCompensation.history(foreign,"skill",role));
    }

    @Test void untrackedChangesRequireCompleteOrderedReviewAndUnlockDatedTerms() {
        UUID store=store(), admin=person(), role=skill(store);
        LocalDate today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        jdbc.update("update payroll_effective_revision set effective_date=? where entity_type='skill' and entity_id=?",today.minusDays(10),role);
        jdbc.update("update skill set hourly_rate=35000 where id=?",role);
        jdbc.update("update skill set hourly_rate=40000 where id=?",role);
        var history=historicalCompensation.history(store,"skill",role);
        var changes=history.untrackedItems();assertEquals(2,changes.size());
        var first=new com.shiftsync.payroll.dto.UntrackedCompensationReconciliationRequest.Change();
        first.setHistoryId(changes.get(0).historyId());first.setEffectiveDate(today.minusDays(8));first.setEvidence("Quyết định điều chỉnh lương lần một");
        var second=new com.shiftsync.payroll.dto.UntrackedCompensationReconciliationRequest.Change();
        second.setHistoryId(changes.get(1).historyId());second.setEffectiveDate(today.minusDays(3));second.setEvidence("Quyết định điều chỉnh lương lần hai");
        var input=new com.shiftsync.payroll.dto.UntrackedCompensationReconciliationRequest();input.setChanges(List.of(first));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->historicalCompensation.reconcileUntracked(store,"skill",role,input,admin));
        input.setChanges(List.of(first,second));
        var staffPrincipal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder()
                .id(admin).systemRole(com.shiftsync.shared.security.SystemRole.STAFF).build());
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(staffPrincipal,null,staffPrincipal.getAuthorities()));
        try {
            assertThrows(org.springframework.security.access.AccessDeniedException.class,()->historicalController.reconcileUntracked(store,"skill",role,input,staffPrincipal));
        } finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
        second.setEffectiveDate(today.minusDays(9));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->historicalCompensation.reconcileUntracked(store,"skill",role,input,admin));
        assertEquals(0,jdbc.queryForObject("select count(*) from payroll_untracked_reconciliation m join payroll_input_history h on h.id=m.history_id where h.entity_id=?",Integer.class,role));
        second.setEffectiveDate(today.minusDays(3));
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'PAID')",UUID.randomUUID(),store,today.minusDays(2),today.minusDays(1));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->historicalCompensation.reconcileUntracked(store,"skill",role,input,admin));
        assertEquals(0,jdbc.queryForObject("select count(*) from payroll_untracked_reconciliation m join payroll_input_history h on h.id=m.history_id where h.entity_id=?",Integer.class,role));
        jdbc.update("delete from payroll_period where store_id=?",store);
        assertEquals(2,historicalCompensation.reconcileUntracked(store,"skill",role,input,admin).size());
        var reviewed=historicalCompensation.history(store,"skill",role);
        assertFalse(reviewed.untrackedChanges());assertTrue(reviewed.untrackedItems().isEmpty());
        assertEquals(35000,new java.math.BigDecimal(revisionsAt("skill",role,today.minusDays(5)).get("hourlyRate").toString()).intValue());
        assertEquals(40000,new java.math.BigDecimal(revisionsAt("skill",role,today).get("hourlyRate").toString()).intValue());
    }

    private java.util.Map<String,Object> revisionsAt(String type, UUID id, LocalDate day) {
        return historicalCompensation.history(jdbc.queryForObject("select store_id from skill where id=?",UUID.class,id),type,id)
                .revisions().stream().filter(r->!r.effectiveDate().isAfter(day)).reduce((a,b)->b).orElseThrow().terms();
    }

    @Test void untrackedEmploymentAndContractTermsCanBeReviewedWithoutLosingFields() {
        UUID store=store(), staff=person(), admin=person(), role=skill(store);
        employ(store,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,store,staff);
        UUID contract=jdbc.queryForObject("select contract_type_id from employment where id=?",UUID.class,employment);
        LocalDate today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")), effective=today.minusDays(2);
        jdbc.update("update payroll_effective_revision set effective_date=? where entity_id in (?,?)",today.minusDays(10),employment,contract);
        jdbc.update("update employment set hourly_rate=34000 where id=?",employment);
        jdbc.update("update contract_type set max_weekly_hours=40,ot_multiplier=2,default_hourly_rate=32000 where id=?",contract);
        for (var entry:Map.of("employment",employment,"contract_type",contract).entrySet()) {
            var before=historicalCompensation.history(store,entry.getKey(),entry.getValue());
            assertEquals(1,before.untrackedItems().size());
            var change=new com.shiftsync.payroll.dto.UntrackedCompensationReconciliationRequest.Change();
            change.setHistoryId(before.untrackedItems().get(0).historyId());change.setEffectiveDate(effective);
            change.setEvidence("Chứng từ điều chỉnh hợp đồng gốc");
            var input=new com.shiftsync.payroll.dto.UntrackedCompensationReconciliationRequest();input.setChanges(List.of(change));
            historicalCompensation.reconcileUntracked(store,entry.getKey(),entry.getValue(),input,admin);
            var after=historicalCompensation.history(store,entry.getKey(),entry.getValue());
            assertFalse(after.untrackedChanges());
            assertEquals(effective,after.revisions().get(after.revisions().size()-1).effectiveDate());
        }
        var employmentTerms=historicalCompensation.history(store,"employment",employment).revisions().get(1).terms();
        assertEquals(34000,((Number)employmentTerms.get("hourlyRate")).intValue());
        assertEquals(contract.toString(),employmentTerms.get("contractTypeId"));
        var contractTerms=historicalCompensation.history(store,"contract_type",contract).revisions().get(1).terms();
        assertEquals(40,((Number)contractTerms.get("maxWeeklyHours")).intValue());
        assertEquals(32000,((Number)contractTerms.get("defaultHourlyRate")).intValue());
        assertEquals(2,((Number)contractTerms.get("otMultiplier")).intValue());
    }

    @Test void reconciledHistoricalTermsAllowPastPayrollWithoutChangingCurrentTerms() {
        UUID store=store(), staff=person(), admin=person(), role=skill(store);
        employ(store,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,store,staff);
        UUID contract=jdbc.queryForObject("select contract_type_id from employment where id=?",UUID.class,employment);
        LocalDate day=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(30);
        jdbc.update("update employment set joined_date=? where id=?",day.minusDays(30),employment);
        var contractInput=new com.shiftsync.payroll.dto.HistoricalCompensationRequest();
        contractInput.setEffectiveDate(day.minusDays(1));contractInput.setHourlyRate(new java.math.BigDecimal("25000"));
        contractInput.setMaxWeeklyHours(48);contractInput.setOtMultiplier(new java.math.BigDecimal("1.5"));
        contractInput.setEvidence("Hợp đồng mẫu còn lưu bản gốc");
        historicalCompensation.reconcile(store,"contract_type",contract,contractInput,admin);
        var employmentInput=new com.shiftsync.payroll.dto.HistoricalCompensationRequest();
        employmentInput.setEffectiveDate(day.minusDays(1));employmentInput.setHourlyRate(new java.math.BigDecimal("27000"));
        employmentInput.setContractTypeId(contract);employmentInput.setEvidence("Hợp đồng nhân viên còn bản gốc");
        historicalCompensation.reconcile(store,"employment",employment,employmentInput,admin);
        UUID shift=UUID.randomUUID(),assignment=UUID.randomUUID();
        jdbc.update("insert into shift(id,store_id,shift_date,start_time,end_time,status,is_open,availability_deadline) values (?,?,?,'09:00','17:00','COMPLETED',false,?)",shift,store,day,day.minusDays(1).atStartOfDay().atOffset(ZoneOffset.ofHours(7)));
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')",assignment,shift,staff);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",UUID.randomUUID(),assignment,day.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),day.atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        payrollCalculator.generatePayroll(store,day,day.plusDays(1));
        assertEquals(216000.0,jdbc.queryForObject("select p.total_amount from payroll p join payroll_period pp on pp.id=p.payroll_period_id where pp.store_id=? and p.staff_id=?",Double.class,store,staff));
        assertEquals(30000,jdbc.queryForObject("select hourly_rate::integer from employment where id=?",Integer.class,employment));
        assertEquals(2,jdbc.queryForObject("select count(*) from payroll_reconciliation_evidence where actor_id=?",Integer.class,admin));
    }

    @Test void scheduledEmploymentRejectsLockedPayrollAndDatesBeforeEmployment() {
        UUID store=store(),staff=person(),role=skill(store); employ(store,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,store,staff);
        UUID contract=jdbc.queryForObject("select contract_type_id from employment where id=?",UUID.class,employment);
        LocalDate joined=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(30), effective=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1);
        jdbc.update("update employment set joined_date=? where id=?",joined,employment);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'PAID')",UUID.randomUUID(),store,effective,effective.plusDays(1));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->tx.executeWithoutResult(status->
                employmentCompensation.schedule(store,staff,contract,new java.math.BigDecimal("45000"),joined.minusDays(1),null)));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->tx.executeWithoutResult(status->
                employmentCompensation.schedule(store,staff,contract,new java.math.BigDecimal("45000"),effective,null)));
        assertEquals(0,jdbc.queryForObject("select count(*) from payroll_effective_revision where entity_id=? and effective_date=?",Integer.class,employment,effective));
    }

    @Test void concurrentEmploymentChangeWaitsForCompensationSchedulingTransaction() throws Exception {
        UUID store=store(),staff=person(),role=skill(store); employ(store,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,store,staff);
        UUID contract=jdbc.queryForObject("select contract_type_id from employment where id=?",UUID.class,employment);
        jdbc.update("update employment set joined_date=? where id=?",LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(30),employment);
        var locked=new CountDownLatch(1); var release=new CountDownLatch(1); var started=new CountDownLatch(1); var pool=Executors.newFixedThreadPool(2);
        try {
            var schedule=pool.submit(()->tx.executeWithoutResult(status->{
                employmentCompensation.schedule(store,staff,contract,new java.math.BigDecimal("45000"),null,null);
                locked.countDown(); try { if (!release.await(10,TimeUnit.SECONDS)) throw new IllegalStateException("timeout"); }
                catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
            }));
            assertTrue(locked.await(10,TimeUnit.SECONDS));
            var edit=pool.submit(()->{ started.countDown(); return jdbc.update("update employment set status='INACTIVE' where id=?",employment); });
            assertTrue(started.await(10,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->edit.get(300,TimeUnit.MILLISECONDS));
            release.countDown(); schedule.get(10,TimeUnit.SECONDS); assertEquals(1,edit.get(10,TimeUnit.SECONDS));
        } finally { release.countDown(); pool.shutdownNow(); }
    }

    @Test void scheduledEmploymentRequiresTrustworthyBaselineForRequestedDate() {
        UUID store=store(),staff=person(),role=skill(store); employ(store,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,store,staff);
        UUID contract=jdbc.queryForObject("select contract_type_id from employment where id=?",UUID.class,employment);
        LocalDate past=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(1);
        jdbc.update("update employment set joined_date=? where id=?",past.minusDays(30),employment);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->tx.executeWithoutResult(status->
                employmentCompensation.schedule(store,staff,contract,new java.math.BigDecimal("45000"),past,null)));
        assertEquals(0,jdbc.queryForObject("select count(*) from payroll_effective_revision where entity_id=? and effective_date=?",Integer.class,employment,past));
    }

    @Test void scheduledContractTermsRespectStoreAndDoNotOverwriteCurrentTerms() {
        UUID store=store(), staff=person(), role=skill(store), foreign=store(); employ(store,staff,role,"EXPERT");
        UUID contract=jdbc.queryForObject("select contract_type_id from employment where store_id=? and staff_id=?",UUID.class,store,staff);
        var effective=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->tx.executeWithoutResult(status->
                contractCompensation.schedule(foreign,contract,new java.math.BigDecimal("42000"),40,new java.math.BigDecimal("2"),effective,null)));
        var input=new com.shiftsync.employment.dto.ContractTypeCreateRequest();
        input.setName(jdbc.queryForObject("select name from contract_type where id=?",String.class,contract));
        input.setDefaultHourlyRate(new java.math.BigDecimal("42000"));
        input.setMaxWeeklyHours(40);input.setOtMultiplier(new java.math.BigDecimal("2"));
        var actual=contractTypes.updateContractType(store,contract,input);
        assertEquals(effective,actual.getScheduledEffectiveDate());
        assertEquals(0,new java.math.BigDecimal("42000").compareTo(actual.getScheduledDefaultHourlyRate()));
        assertEquals(30000,jdbc.queryForObject("select default_hourly_rate::integer from contract_type where id=?",Integer.class,contract));
        assertEquals(42000,jdbc.queryForObject("select (values_json->>'defaultHourlyRate')::numeric::integer from payroll_effective_revision where entity_type='contract_type' and entity_id=? and effective_date=?",Integer.class,contract,effective));
        var displayed=contractTypes.getContractTypes(store).get(0);
        assertEquals(0,new java.math.BigDecimal("30000").compareTo(displayed.getDefaultHourlyRate()));
        assertEquals(effective,displayed.getScheduledEffectiveDate());
        assertEquals(0,new java.math.BigDecimal("42000").compareTo(displayed.getScheduledDefaultHourlyRate()));
    }

    @Test void scheduledContractChangeInvalidatesScheduleInputVersion() {
        UUID store=store(),staff=person(),role=skill(store);employ(store,staff,role,"EXPERT");
        String before=inputVersions.capture(store);
        scheduleWeeklyHours(store,40);
        assertNotEquals(before,inputVersions.capture(store));
    }

    @Test void automaticSchedulingUsesContractLimitOnEachShiftDate() {
        UUID store=store(), staff=person(), role=skill(store);
        employ(store,staff,role,"EXPERT");
        LocalDate monday=date.plusDays(1), tuesday=monday.plusDays(1), wednesday=tuesday.plusDays(1);
        UUID contract=jdbc.queryForObject("select contract_type_id from employment where store_id=? and staff_id=?",UUID.class,store,staff);
        tx.executeWithoutResult(status -> contractCompensation.schedule(store,contract,new java.math.BigDecimal("30000"),8,
                new java.math.BigDecimal("1.5"),wednesday,null));
        jdbc.update("insert into availability(id,staff_id,day_of_week,start_time,end_time) values (?,?,2,'06:00','23:00'),(?,?,3,'06:00','23:00')",
                UUID.randomUUID(),staff,UUID.randomUUID(),staff);
        UUID prior=shift(store,role);
        jdbc.update("update shift set shift_date=?,start_time='09:00',end_time='15:00',status='COMPLETED' where id=?",monday,prior);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')",UUID.randomUUID(),prior,staff);
        UUID before=shift(store,role);
        jdbc.update("update shift set shift_date=?,start_time='09:00',end_time='12:00' where id=?",tuesday,before);
        UUID after=shift(store,role);
        jdbc.update("update shift set shift_date=?,start_time='09:00',end_time='12:00' where id=?",wednesday,after);
        var input=request(false);input.setStartDate(tuesday);input.setEndDate(wednesday);
        scheduler.autoSchedule(store,input);
        assertEquals(1,count(before));
        assertEquals(0,count(after));
    }

    @Test void skillUpdateSchedulesSelectedRateWithoutChangingCurrentRate() {
        UUID store=store(), role=skill(store);
        var input=new com.shiftsync.skill.dto.SkillRequest();
        input.setName(jdbc.queryForObject("select name from skill where id=?",String.class,role));
        input.setHourlyRate(new java.math.BigDecimal("42000"));
        LocalDate selected=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(4);
        input.setEffectiveDate(selected);
        var result=skillService.updateSkill(store,role,input);
        assertEquals(selected,result.getScheduledEffectiveDate());
        assertEquals(0,new java.math.BigDecimal("42000").compareTo(result.getScheduledHourlyRate()));
        assertEquals(30000,jdbc.queryForObject("select hourly_rate::integer from skill where id=?",Integer.class,role));
        assertEquals(42000,jdbc.queryForObject("select (values_json->>'hourlyRate')::numeric::integer from payroll_effective_revision where entity_type='skill' and entity_id=? and effective_date=?",Integer.class,role,selected));
        var displayed=skillService.getSkillsByStoreId(store).get(0);
        assertEquals(0,new java.math.BigDecimal("30000").compareTo(displayed.getHourlyRate()));
        assertEquals(selected,displayed.getScheduledEffectiveDate());
        assertEquals(0,new java.math.BigDecimal("42000").compareTo(displayed.getScheduledHourlyRate()));
    }

    @Test void quotaEstimatesUsePositionRateOnEachDayAndAcrossMidnight() {
        UUID store=store(), role=skill(store);
        LocalDate monday=date.plusDays(1), change=monday.plusDays(2);
        tx.executeWithoutResult(status -> skillCompensation.schedule(store,role,new java.math.BigDecimal("40000"),change,null));
        var weekly=quotas.getWeeklyQuotas(store,monday);
        var row=weekly.getMatrixRows().get(0);
        long expected=row.getCells().stream().mapToLong(cell -> Math.round(cell.getCount()*8.5
                *(cell.getDate().isBefore(change)?30000:40000))).sum();
        assertEquals(expected,weekly.getBudget().getEstimatedCost());
        assertEquals(30000,quotas.getDailyQuotas(store,monday).getPositionKpis().get(0).getHourlyRate());
        assertEquals(40000,quotas.getDailyQuotas(store,change).getPositionKpis().get(0).getHourlyRate());
        jdbc.update("update store set open_time='22:00',close_time='06:00' where id=?",store);
        var overnight=quotas.getDailyQuotas(store,change.minusDays(1));
        long total=overnight.getShifts().stream().mapToLong(shift -> {
            int count=shift.getQuotas().get(0).getCount();
            return shift.getStartTime().equals("22:00") ? count*(2*30000L+2*40000L) : count*4*40000L;
        }).sum();
        assertEquals(total,overnight.getSummary().getEstimatedCost());
    }

    @Test void quotaEstimateSignalsWhenPositionUsesEmployeeSpecificRate() {
        UUID store=store(), role=skill(store);
        LocalDate day=date.plusDays(1);
        tx.executeWithoutResult(status -> skillCompensation.schedule(store,role,java.math.BigDecimal.ZERO,day,null));
        assertTrue(quotas.getDailyQuotas(store,day).getSummary().isCostIncomplete());
        assertTrue(quotas.getWeeklyQuotas(store,day).getBudget().isCostIncomplete());
    }

    @Test void scheduledContractRejectsLockedPeriodAndUntrackedLegacyChange() {
        UUID store=store(),staff=person(),role=skill(store); employ(store,staff,role,"EXPERT");
        UUID contract=jdbc.queryForObject("select contract_type_id from employment where store_id=? and staff_id=?",UUID.class,store,staff);
        LocalDate effective=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'PAID')",UUID.randomUUID(),store,effective,effective.plusDays(1));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->tx.executeWithoutResult(status->
                contractCompensation.schedule(store,contract,new java.math.BigDecimal("42000"),40,new java.math.BigDecimal("2"),effective,null)));
        assertEquals(0,jdbc.queryForObject("select count(*) from payroll_effective_revision where entity_id=? and effective_date=?",Integer.class,contract,effective));
        jdbc.update("update contract_type set ot_multiplier=1.75 where id=?",contract);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->tx.executeWithoutResult(status->
                contractCompensation.schedule(store,contract,new java.math.BigDecimal("42000"),40,new java.math.BigDecimal("2"),effective.plusDays(2),null)));
        assertEquals(0,jdbc.queryForObject("select count(*) from payroll_effective_revision where entity_id=? and effective_date=?",Integer.class,contract,effective.plusDays(2)));
    }

    @Test void scheduledSkillRespectsSupportHomePayrollLock() {
        UUID receiving=store(),home=store(),staff=person(),role=skill(receiving); employ(home,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,home,staff);
        UUID shift=shift(receiving,role);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source,required_skill_id,support_employment_id) values (?,?,?,'WORKFORCE_SHARING',?,?)",UUID.randomUUID(),shift,staff,role,employment);
        LocalDate effective=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'PAID')",UUID.randomUUID(),home,effective,effective.plusDays(1));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->tx.executeWithoutResult(status->
                skillCompensation.schedule(receiving,role,new java.math.BigDecimal("45000"),effective,null)));
        assertEquals(0,jdbc.queryForObject("select count(*) from payroll_effective_revision where entity_id=? and effective_date=?",Integer.class,role,effective));
        assertEquals(effective.plusDays(2),tx.execute(status->skillCompensation.schedule(receiving,role,new java.math.BigDecimal("45000"),effective.plusDays(2),null)));
    }

    @Test void scheduledSkillRejectsLowerIsolationWithoutWriting() {
        UUID store=store(),role=skill(store);
        var readCommitted=new org.springframework.transaction.support.TransactionTemplate(
                java.util.Objects.requireNonNull(tx.getTransactionManager()));
        readCommitted.setIsolationLevel(org.springframework.transaction.TransactionDefinition.ISOLATION_READ_COMMITTED);
        LocalDate effective=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(1);
        assertThrows(IllegalStateException.class,()->readCommitted.executeWithoutResult(status ->
                skillCompensation.schedule(store,role,new java.math.BigDecimal("45000"),effective,null)));
        assertEquals(0,jdbc.queryForObject("select count(*) from payroll_effective_revision where entity_id=? and effective_date=?",Integer.class,role,effective));
    }

    @Test void payrollUsesPositionRateEffectiveOnEachWorkDay() {
        UUID store=store(),staff=person(),role=skill(store); employ(store,staff,role,"EXPERT");
        UUID first=shift(store,role); jdbc.update("update shift set shift_date=?,status='COMPLETED' where id=?",date.plusDays(1),first);
        UUID second=shift(store,role); jdbc.update("update shift set status='COMPLETED' where id=?",second);
        UUID firstAssignment=UUID.randomUUID(),secondAssignment=UUID.randomUUID();
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",firstAssignment,first,staff,role);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",secondAssignment,second,staff,role);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",UUID.randomUUID(),firstAssignment,date.plusDays(1).atTime(9,0).atOffset(ZoneOffset.ofHours(7)),date.plusDays(1).atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",UUID.randomUUID(),secondAssignment,date.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),date.atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        tx.executeWithoutResult(status->skillCompensation.schedule(store,role,new java.math.BigDecimal("40000"),date.plusDays(1),null));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        assertEquals(560000.0,jdbc.queryForObject("select p.total_amount from payroll p join payroll_period pp on pp.id=p.payroll_period_id where pp.store_id=? and p.staff_id=?",Double.class,store,staff));
    }

    @Test void deviceTokenTransfersOwnerAndOldOwnerCannotUnregisterIt() {
        UUID first=person(),second=person(); String token="test-device-"+UUID.randomUUID();
        deviceTokens.registerOwner(UUID.randomUUID(),first,token,"WEB");
        deviceTokens.registerOwner(UUID.randomUUID(),second,token,"WEB");
        assertEquals(1,jdbc.queryForObject("select count(*) from user_device_tokens where fcm_token=?",Integer.class,token));
        assertEquals(second,jdbc.queryForObject("select user_id from user_device_tokens where fcm_token=?",UUID.class,token));
        deviceTokens.deleteByUserIdAndFcmToken(first,token);
        assertEquals(second,jdbc.queryForObject("select user_id from user_device_tokens where fcm_token=?",UUID.class,token));
        deviceTokens.deleteByUserIdAndFcmToken(second,token);
        assertEquals(0,jdbc.queryForObject("select count(*) from user_device_tokens where fcm_token=?",Integer.class,token));
    }

    @Test void dashboardCountsGenericDemandAndDoesNotMaskUnfilledRole() {
        UUID store=store(), staff=person(), role=skill(store), unfilled=shift(store,role), generic=UUID.randomUUID();
        jdbc.update("insert into shift(id,store_id,shift_date,start_time,end_time,status,is_open,availability_deadline) values (?,?,?,'06:00','08:00','DRAFT',false,?)",generic,store,date,date.minusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC));
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')",UUID.randomUUID(),generic,staff);
        assertEquals(50.0,dashboard.getDashboardMetrics(store,date,date).getScheduling().getCoverage());
        jdbc.update("update shift set status='CANCELLED' where id=?",unfilled);
        assertEquals(100.0,dashboard.getDashboardMetrics(store,date,date).getScheduling().getCoverage());
    }

    @Test void repeatedAndConcurrentStoreTemplatesPreserveExistingResources() throws Exception {
        UUID store=store(), template=UUID.fromString("b0000000-0000-0000-0000-000000000001");
        storeTemplates.applyTemplateToStore(store,template);
        UUID zone=jdbc.queryForObject("select id from store_zones where store_id=? and code='Z-BARISTA'",UUID.class,store);
        UUID station=jdbc.queryForObject("select id from workstations where store_id=? and code='WS-ESP-1'",UUID.class,store);
        jdbc.update("update workstations set capacity=7 where id=?",station);
        var executor=Executors.newFixedThreadPool(2);
        try {
            var first=executor.submit(()->storeTemplates.applyTemplateToStore(store,template));
            var second=executor.submit(()->storeTemplates.applyTemplateToStore(store,template));
            first.get(25,TimeUnit.SECONDS);second.get(25,TimeUnit.SECONDS);
        } finally { executor.shutdownNow(); assertTrue(executor.awaitTermination(10,TimeUnit.SECONDS)); }
        assertEquals(5,jdbc.queryForObject("select count(*) from store_zones where store_id=?",Integer.class,store));
        assertEquals(3,jdbc.queryForObject("select count(*) from workstations where store_id=?",Integer.class,store));
        assertEquals(zone,jdbc.queryForObject("select id from store_zones where store_id=? and code='Z-BARISTA'",UUID.class,store));
        assertEquals(station,jdbc.queryForObject("select id from workstations where store_id=? and code='WS-ESP-1'",UUID.class,store));
        assertEquals(7,jdbc.queryForObject("select capacity from workstations where id=?",Integer.class,station));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () -> jdbc.update(
                "insert into workstations(id,store_id,name,code) values (?,?,?,?)",UUID.randomUUID(),store,"Duplicate","  ws-esp-1  "));
    }

    @Test void editingAssignedShiftExcludesItselfButStillRejectsOtherConflicts() {
        UUID store=store(), staff=person(), role=skill(store);
        employ(store,staff,role,"EXPERT");
        UUID shift=shift(store,role);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",
                UUID.randomUUID(),shift,staff,role);
        var edit=new com.shiftsync.shift.dto.ShiftCreateRequest();
        edit.setShiftDate(date); edit.setStartTime(LocalTime.of(10,0)); edit.setEndTime(LocalTime.of(18,0));
        assertDoesNotThrow(() -> shiftService.updateShift(store,shift,edit));
        assertEquals(LocalTime.of(10,0),jdbc.queryForObject("select start_time from shift where id=?",LocalTime.class,shift));
        UUID conflict=UUID.randomUUID();
        jdbc.update("insert into shift(id,store_id,shift_date,start_time,end_time,status,is_open,availability_deadline) values (?,?,?,'18:00','20:00','PUBLISHED',false,?)",conflict,store,date,date.minusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC));
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",
                UUID.randomUUID(),conflict,staff,role);
        edit.setStartTime(LocalTime.of(11,0)); edit.setEndTime(LocalTime.of(19,0));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class, () -> shiftService.updateShift(store,shift,edit));
        assertEquals(LocalTime.of(10,0),jdbc.queryForObject("select start_time from shift where id=?",LocalTime.class,shift));
        assertEquals(LocalTime.of(18,0),jdbc.queryForObject("select end_time from shift where id=?",LocalTime.class,shift));
    }

    @Test void managerSkillEditPreservesForeignSkillsAndExistingMetadata() {
        UUID shared=store(), foreign=store(), staff=person(), manager=person();
        UUID localRole=skill(shared), foreignRole=skill(foreign);
        employ(shared,staff,localRole,"EXPERT");
        employ(foreign,staff,foreignRole,"EXPERT");
        employ(shared,manager,localRole,"EXPERT");
        jdbc.update("update staff_skill set expiration_date='2031-01-01' where staff_id=? and skill_id=?",staff,localRole);
        var actor=com.shiftsync.auth.entity.User.builder().id(manager)
                .systemRole(com.shiftsync.shared.security.SystemRole.MANAGER).build();
        assertEquals(List.of(localRole),skillService.getSkillIdsByStaffId(staff,actor));
        skillService.replaceStaffSkills(staff,List.of(localRole),actor);
        assertEquals("EXPERT",jdbc.queryForObject("select level::text from staff_skill where staff_id=? and skill_id=?",String.class,staff,localRole));
        assertEquals(LocalDate.of(2031,1,1),jdbc.queryForObject("select expiration_date from staff_skill where staff_id=? and skill_id=?",LocalDate.class,staff,localRole));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->skillService.replaceStaffSkills(staff,List.of(foreignRole),actor));
        skillService.replaceStaffSkills(staff,List.of(),actor);
        assertEquals(1,jdbc.queryForObject("select count(*) from staff_skill where staff_id=? and skill_id=?",Integer.class,staff,foreignRole));
        assertEquals(0,jdbc.queryForObject("select count(*) from staff_skill where staff_id=? and skill_id=?",Integer.class,staff,localRole));
    }

    @Test void quotaCannotModifyPublishedShiftOrLockedPayrollDate() {
        UUID store=store(), role=skill(store), shift=shift(store,role);
        jdbc.update("update shift set start_time='06:00',end_time='14:30',status='PUBLISHED' where id=?",shift);
        var request=com.shiftsync.quota.dto.UpdateQuotaRequest.builder().branchId(store).date(date)
                .shiftType("morning").positionId(role).count(4).build();
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->quotas.updateQuota("quota",request));
        assertEquals(1,jdbc.queryForObject("select required_count from shift_skill_requirement where shift_id=?",Integer.class,shift));
        jdbc.update("update shift set status='DRAFT' where id=?",shift);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'PAID')",UUID.randomUUID(),store,date,date.plusDays(1));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->quotas.updateQuota("quota",request));
        assertEquals(1,jdbc.queryForObject("select required_count from shift_skill_requirement where shift_id=?",Integer.class,shift));
    }

    @Test void payrollConfirmationCannotRacePastQuotaLockCheck() throws Exception {
        UUID store=store(),role=skill(store),shift=shift(store,role),admin=person(),period=UUID.randomUUID();
        jdbc.update("update shift set start_time='06:00',end_time='14:30' where id=?",shift);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(1));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        var request=com.shiftsync.quota.dto.UpdateQuotaRequest.builder().branchId(store).date(date)
                .shiftType("morning").positionId(role).count(4).build();
        var checked=new CountDownLatch(1);var release=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{
            Object result=delegate.answer(call);
            if(Thread.currentThread().getName().startsWith("quota-race-") && !Boolean.TRUE.equals(result)) {
                checked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));
            }
            return result;
        }).when(payrollPeriods).existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(eq(store),any(),any(),any());
        var pool=Executors.newFixedThreadPool(2,r->{var t=new Thread(r);t.setName("quota-race-"+t.threadId());return t;});
        try {
            var quota=pool.submit(()->quotas.updateQuota("quota",request));
            assertTrue(checked.await(15,TimeUnit.SECONDS));
            var confirmation=pool.submit(()->{
                var user=com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build();
                var principal=new com.shiftsync.shared.security.CustomUserDetails(user);
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                        new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try { payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin); }
                finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
            });
            assertThrows(TimeoutException.class,()->confirmation.get(300,TimeUnit.MILLISECONDS));
            release.countDown();
            quota.get(15,TimeUnit.SECONDS);
            confirmation.get(15,TimeUnit.SECONDS);
            assertEquals("CONFIRMED",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
            assertEquals(4,jdbc.queryForObject("select required_count from shift_skill_requirement where shift_id=?",Integer.class,shift));
        } finally { release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS)); }
    }

    @Test void payrollConfirmationCannotRacePastShiftUpdateLockCheck() throws Exception {
        UUID store=store(),role=skill(store),shift=shift(store,role),admin=person(),period=UUID.randomUUID();
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(1));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        var input=new com.shiftsync.shift.dto.ShiftCreateRequest();input.setNote("Ghi chú mới");
        var checked=new CountDownLatch(1);var release=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);if(Thread.currentThread().getName().equals("shift-race") && !Boolean.TRUE.equals(result)) {
            checked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));}return result;})
                .when(payrollPeriods).existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(eq(store),any(),any(),any());
        var pool=Executors.newFixedThreadPool(2);
        try {
            var edit=pool.submit(()->{Thread.currentThread().setName("shift-race");shiftService.updateShift(store,shift,input);});
            assertTrue(checked.await(15,TimeUnit.SECONDS));
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder()
                        .id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                        new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try { payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin); }
                finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
            });
            assertThrows(TimeoutException.class,()->confirmation.get(300,TimeUnit.MILLISECONDS));
            release.countDown();
            edit.get(15,TimeUnit.SECONDS);
            confirmation.get(15,TimeUnit.SECONDS);
            assertEquals("Ghi chú mới",jdbc.queryForObject("select note from shift where id=?",String.class,shift));
        } finally { release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS)); }
    }

    @Test void payrollConfirmationCannotRacePastManualAssignmentLockCheck() throws Exception {
        UUID store=store(),staff=person(),role=skill(store),shift=shift(store,role),admin=person(),period=UUID.randomUUID();
        employ(store,staff,role,"EXPERT");
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(1));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        var checked=new CountDownLatch(1);var release=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);if(Thread.currentThread().getName().equals("assignment-race") && !Boolean.TRUE.equals(result)) {
            checked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));}return result;})
                .when(payrollPeriods).existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(eq(store),any(),any(),any());
        var pool=Executors.newFixedThreadPool(2);
        try {
            var assignment=pool.submit(()->{Thread.currentThread().setName("assignment-race");manual.assignStaffToShift(store,shift,staff);});
            assertTrue(checked.await(15,TimeUnit.SECONDS));
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder()
                        .id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                        new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try { serializableRetry.execute(()->{payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);return null;}); }
                finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
            });
            assertThrows(TimeoutException.class,()->confirmation.get(300,TimeUnit.MILLISECONDS));
            release.countDown();
            assignment.get(15,TimeUnit.SECONDS);
            confirmation.get(15,TimeUnit.SECONDS);
            assertEquals(1,count(shift));
        } finally { release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS)); }
    }

    @Test void payrollConfirmationCannotRacePastAttendanceDeletionCheck() throws Exception {
        UUID store=store(),staff=person(),role=skill(store),shift=shift(store,role),admin=person(),period=UUID.randomUUID(),assignment=UUID.randomUUID(),attendance=UUID.randomUUID();
        employ(store,staff,role,"EXPERT");
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')",assignment,shift,staff);
        jdbc.update("insert into attendance(id,shift_assignment_id,status) values (?,?,'PRESENT')",attendance,assignment);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(1));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        var checked=new CountDownLatch(1);var release=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);if(Thread.currentThread().getName().equals("attendance-race") && !Boolean.TRUE.equals(result)) {
            checked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));}return result;})
                .when(payrollPeriods).existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(eq(store),any(),any(),any());
        var pool=Executors.newFixedThreadPool(2);
        try {
            var deletion=pool.submit(()->{Thread.currentThread().setName("attendance-race");attendanceService.deleteAttendance(store,attendance);});
            assertTrue(checked.await(15,TimeUnit.SECONDS));
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);}
                finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
            });
            assertThrows(TimeoutException.class,()->confirmation.get(300,TimeUnit.MILLISECONDS));release.countDown();
            deletion.get(15,TimeUnit.SECONDS);confirmation.get(15,TimeUnit.SECONDS);
            assertTrue(jdbc.queryForObject("select deleted from attendance where id=?",Boolean.class,attendance));
        } finally {release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }

    @Test void attendanceDeletionWaitsForConfirmationAndPreservesRecord() throws Exception {
        UUID store=store(),staff=person(),role=skill(store),shift=shift(store,role),admin=person(),period=UUID.randomUUID(),assignment=UUID.randomUUID(),attendance=UUID.randomUUID();
        employ(store,staff,role,"EXPERT");
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')",assignment,shift,staff);
        jdbc.update("insert into attendance(id,shift_assignment_id,status) values (?,?,'PRESENT')",attendance,assignment);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(1));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        var locked=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);locked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));return result;})
                .when(payrollPeriods).findByIdForUpdate(period);
        var pool=Executors.newFixedThreadPool(2);
        try {
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);}
                finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
            });
            assertTrue(locked.await(15,TimeUnit.SECONDS));
            var deletion=pool.submit(()->{started.countDown();attendanceService.deleteAttendance(store,attendance);});
            assertTrue(started.await(15,TimeUnit.SECONDS));assertThrows(TimeoutException.class,()->deletion.get(300,TimeUnit.MILLISECONDS));
            release.countDown();confirmation.get(15,TimeUnit.SECONDS);
            assertThrows(ExecutionException.class,()->deletion.get(15,TimeUnit.SECONDS));
            assertFalse(jdbc.queryForObject("select deleted from attendance where id=?",Boolean.class,attendance));
        } finally {release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }

    @Test void supportAttendanceDeletionWaitsForHomePayrollConfirmation() throws Exception {
        UUID receiving=store(),home=store(),staff=person(),admin=person(),role=skill(receiving);
        employ(home,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,home,staff);
        UUID shift=shift(receiving,role),period=UUID.randomUUID(),assignment=UUID.randomUUID(),attendance=UUID.randomUUID();
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source,support_employment_id) values (?,?,?,?,'WORKFORCE_SHARING',?)",assignment,shift,staff,role,employment);
        jdbc.update("insert into attendance(id,shift_assignment_id,status) values (?,?,'PRESENT')",attendance,assignment);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,home,date,date.plusDays(1));
        payrollCalculator.generatePayroll(home,date,date.plusDays(1));
        var locked=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);locked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));return result;})
                .when(payrollPeriods).findByIdForUpdate(period);
        var pool=Executors.newFixedThreadPool(2);
        try {
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {payrollCalculator.updatePayrollPeriodStatus(home,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);}
                finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
            });
            assertTrue(locked.await(15,TimeUnit.SECONDS));
            var deletion=pool.submit(()->{started.countDown();attendanceService.deleteAttendance(receiving,attendance);});
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->deletion.get(300,TimeUnit.MILLISECONDS));
            release.countDown();confirmation.get(15,TimeUnit.SECONDS);
            assertThrows(ExecutionException.class,()->deletion.get(15,TimeUnit.SECONDS));
            assertEquals("CONFIRMED",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
            assertFalse(jdbc.queryForObject("select deleted from attendance where id=?",Boolean.class,attendance));
        } finally {release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }

    @Test void manualAssignmentStartedDuringConfirmationCannotUseOldSnapshot() throws Exception {
        UUID store=store(),staff=person(),role=skill(store),shift=shift(store,role),admin=person(),period=UUID.randomUUID();
        employ(store,staff,role,"EXPERT");
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(1));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        var locked=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);locked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));return result;})
                .when(payrollPeriods).findByIdForUpdate(period);
        var pool=Executors.newFixedThreadPool(2);
        try {
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder()
                        .id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                        new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try { payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin); }
                finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
            });
            assertTrue(locked.await(15,TimeUnit.SECONDS));
            var assignment=pool.submit(()->{started.countDown();manual.assignStaffToShift(store,shift,staff);});
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->assignment.get(300,TimeUnit.MILLISECONDS));
            release.countDown();confirmation.get(15,TimeUnit.SECONDS);
            assertThrows(ExecutionException.class,()->assignment.get(15,TimeUnit.SECONDS));
            assertEquals(0,count(shift));
        } finally { release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS)); }
    }

    @Test void spatialAllocationHonorsSupportPayrollOnOvernightEndDate() {
        UUID receiving=store(),home=store(),staff=person(),role=skill(receiving);
        employ(home,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,home,staff);
        UUID shift=shift(receiving,role),assignment=UUID.randomUUID();
        jdbc.update("update shift set start_time='22:00',end_time='06:00' where id=?",shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source,support_employment_id) values (?,?,?,?,'WORKFORCE_SHARING',?)",assignment,shift,staff,role,employment);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'CONFIRMED')",UUID.randomUUID(),home,date.plusDays(1),date.plusDays(2));
        var error=assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->spatialAllocator.allocateZonesForShift(receiving,shift));
        assertTrue(error.getMessage().contains("khóa lương"));
        assertNull(jdbc.queryForObject("select zone_id from shift_assignment where id=?",UUID.class,assignment));
    }

    @Test void supportSpatialAllocationCannotRaceHomePayrollConfirmation() throws Exception {
        UUID receiving=store(),home=store(),staff=person(),admin=person(),role=skill(receiving);
        employ(home,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,home,staff);
        UUID shift=shift(receiving,role),period=UUID.randomUUID(),assignment=UUID.randomUUID(),zone=UUID.randomUUID();
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source,support_employment_id) values (?,?,?,?,'WORKFORCE_SHARING',?)",assignment,shift,staff,role,employment);
        jdbc.update("insert into store_zones(id,store_id,name,x_coord,y_coord,z_coord,capacity) values (?,?,'Khu làm việc',0,0,0,1)",zone,receiving);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,home,date,date.plusDays(1));
        payrollCalculator.generatePayroll(home,date,date.plusDays(1));
        var locked=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);locked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));return result;})
                .when(payrollPeriods).findByIdForUpdate(period);
        var pool=Executors.newFixedThreadPool(2);
        try {
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {payrollCalculator.updatePayrollPeriodStatus(home,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);}
                finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
            });
            assertTrue(locked.await(15,TimeUnit.SECONDS));
            var allocation=pool.submit(()->{started.countDown();return spatialAllocator.allocateZonesForShift(receiving,shift);});
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->allocation.get(300,TimeUnit.MILLISECONDS));
            release.countDown();confirmation.get(15,TimeUnit.SECONDS);
            var error=assertThrows(ExecutionException.class,()->allocation.get(15,TimeUnit.SECONDS));
            assertFalse(error.getCause().getMessage().contains("No 3D zones"));
            assertEquals("CONFIRMED",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
            assertNull(jdbc.queryForObject("select zone_id from shift_assignment where id=?",UUID.class,assignment));
        } finally {release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }

    @Test void concurrentZoneParentUpdatesCannotCreateCycle() throws Exception {
        UUID store=store(),admin=person(),first=UUID.randomUUID(),second=UUID.randomUUID();
        jdbc.update("insert into store_zones(id,store_id,name,x_coord,y_coord,z_coord,capacity) values (?,?,'Khu A',0,0,0,1),(?,?,'Khu B',0,0,0,1)",first,store,second,store);
        var read=new CountDownLatch(2);var release=new CountDownLatch(1);
        var delegate=mockingDetails(zoneRows).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);if(Thread.currentThread().getName().startsWith("zone-race-") && read.getCount()>0) {
            read.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));}return result;}).when(zoneRows).findById(any());
        var pool=Executors.newFixedThreadPool(2);
        try {
            java.util.function.BiFunction<UUID,UUID,Boolean> update=(child,parent)->{
                Thread.currentThread().setName("zone-race-"+child);
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {layoutController.updateZone(store,child,com.shiftsync.layout.dto.UpdateZoneRequest.builder().parentZoneId(parent).build());return true;}
                catch (RuntimeException conflict) {
                    boolean expected=false;
                    for (Throwable cause=conflict;cause!=null;cause=cause.getCause()) {
                        if ((cause instanceof java.sql.SQLException sql && "40001".equals(sql.getSQLState()))
                                || (cause instanceof com.shiftsync.shared.exception.BusinessException && cause.getMessage().contains("vòng lặp"))) expected=true;
                    }
                    assertTrue(expected,"Lỗi cập nhật khu vực không phải xung đột giao dịch hoặc vòng lặp: "+conflict);
                    return false;
                }
                finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
            };
            var one=pool.submit(()->update.apply(first,second));
            var two=pool.submit(()->update.apply(second,first));
            assertTrue(read.await(15,TimeUnit.SECONDS));release.countDown();
            assertNotEquals(one.get(15,TimeUnit.SECONDS),two.get(15,TimeUnit.SECONDS));
            assertEquals(1,jdbc.queryForObject("select count(*) from store_zones where id in (?,?) and parent_zone_id is not null",Integer.class,first,second));
        } finally {release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }

    @Test void marketplacePublicationCannotRacePayrollConfirmation() throws Exception {
        UUID store=store(),role=skill(store),shift=shift(store,role),admin=person(),period=UUID.randomUUID();
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(1));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        var checked=new CountDownLatch(1);var release=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);if(Thread.currentThread().getName().equals("market-race") && !Boolean.TRUE.equals(result)) {
            checked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));}return result;})
                .when(payrollPeriods).existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(eq(store),any(),any(),any());
        var pool=Executors.newFixedThreadPool(2);
        try {
            var publication=pool.submit(()->{Thread.currentThread().setName("market-race");marketplace.publishToMarketplace(store,shift);});
            assertTrue(checked.await(15,TimeUnit.SECONDS));
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);}
                finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
            });
            assertThrows(TimeoutException.class,()->confirmation.get(300,TimeUnit.MILLISECONDS));
            release.countDown();publication.get(15,TimeUnit.SECONDS);confirmation.get(15,TimeUnit.SECONDS);
            assertTrue(jdbc.queryForObject("select is_open from shift where id=?",Boolean.class,shift));
            assertEquals("CONFIRMED",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
        } finally {release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }

    @Test void reminderQueryIncludesBothDatesAndExcludesCancelledAndUpperBound() {
        UUID store=store(),foreign=store(),staff=person();
        UUID before=UUID.randomUUID(),after=UUID.randomUUID(),boundary=UUID.randomUUID(),cancelled=UUID.randomUUID(),otherStore=UUID.randomUUID();
        UUID a=UUID.randomUUID(),b=UUID.randomUUID();
        jdbc.update("insert into shift(id,store_id,shift_date,start_time,end_time,status,is_open,availability_deadline) values "
                + "(?,?,?,'23:59','01:00','PUBLISHED',false,now()),(?,?,?,'00:05','01:00','PUBLISHED',false,now()),"
                + "(?,?,?,'00:10','01:00','PUBLISHED',false,now()),(?,?,?,'00:06','01:00','CANCELLED',false,now()),"
                + "(?,?,?,'00:07','01:00','PUBLISHED',false,now())",
                before,store,date,after,store,date.plusDays(1),boundary,store,date.plusDays(1),
                cancelled,store,date.plusDays(1),otherStore,foreign,date.plusDays(1));
        for (var pair : List.of(new UUID[]{a,before},new UUID[]{b,after},new UUID[]{UUID.randomUUID(),boundary},
                new UUID[]{UUID.randomUUID(),cancelled},new UUID[]{UUID.randomUUID(),otherStore})) {
            jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')",pair[0],pair[1],staff);
        }
        var found=assignments.findPublishedReminders(store,date,LocalTime.of(23,55),date.plusDays(1),LocalTime.of(0,10));
        assertEquals(Set.of(a,b),found.stream().map(ShiftAssignment::getId).collect(java.util.stream.Collectors.toSet()));
    }

    @Test void leaveBalanceCannotBeCreatedAtUnrelatedStore() {
        UUID home=store(),foreign=store(),staff=person(),role=skill(home);
        employ(home,staff,role,"EXPERT");
        var error=assertThrows(com.shiftsync.shared.exception.BusinessException.class,
                ()->leaveBalanceService.getMyBalance(foreign,staff,2030));
        assertEquals(403,error.getStatus().value());
        assertEquals(0,jdbc.queryForObject("select count(*) from leave_balance where staff_id=? and store_id=?",Integer.class,staff,foreign));
        var balance=leaveBalanceService.getMyBalance(home,staff,2030);
        assertEquals(home,balance.getStoreId());
        assertEquals(1,jdbc.queryForObject("select count(*) from leave_balance where staff_id=? and store_id=? and year=2030",Integer.class,staff,home));
    }

    @Test void homePayrollConfirmationWaitsForSupportLeaveApproval() throws Exception {
        UUID receiving=store(),home=store(),staff=person(),role=skill(receiving),admin=person(),period=UUID.randomUUID(),leave=UUID.randomUUID(),assignment=UUID.randomUUID();
        employ(home,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,home,staff);
        UUID shift=shift(receiving,role);
        jdbc.update("update shift set status='PUBLISHED' where id=?",shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source,support_employment_id) values (?,?,?,?,'WORKFORCE_SHARING',?)",assignment,shift,staff,role,employment);
        jdbc.update("insert into leave_request(id,staff_id,store_id,leave_type,status,start_date,end_date) values (?,?,?,'SICK','PENDING',?,?)",leave,staff,receiving,date,date);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,home,date,date.plusDays(1));
        payrollCalculator.generatePayroll(home,date,date.plusDays(1));
        var checked=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);if(Thread.currentThread().getName().equals("support-leave-race") && !Boolean.TRUE.equals(result)) {
            checked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));}return result;})
                .when(payrollPeriods).existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(eq(home),any(),any(),any());
        var pool=Executors.newFixedThreadPool(2);
        try {
            var approval=pool.submit(()->{Thread.currentThread().setName("support-leave-race");leaveService.approveLeaveRequest(receiving,leave,admin);});
            assertTrue(checked.await(15,TimeUnit.SECONDS));
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {started.countDown();serializableRetry.execute(()->{payrollCalculator.updatePayrollPeriodStatus(home,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);return null;});}
                finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
            });
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->confirmation.get(300,TimeUnit.MILLISECONDS));
            release.countDown();approval.get(15,TimeUnit.SECONDS);
            var confirmationFailure=assertThrows(ExecutionException.class,()->confirmation.get(15,TimeUnit.SECONDS));
            assertInstanceOf(com.shiftsync.shared.exception.BusinessException.class,confirmationFailure.getCause());
            assertTrue(confirmationFailure.getCause().getMessage().contains("tính lại"));
            assertEquals("APPROVED",jdbc.queryForObject("select status::text from leave_request where id=?",String.class,leave));
            assertTrue(jdbc.queryForObject("select deleted from shift_assignment where id=?",Boolean.class,assignment));
            assertEquals("DRAFT",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
            assertEquals(1,jdbc.queryForObject("select count(*) from payroll where payroll_period_id=? and staff_id=?",Integer.class,period,staff));
        } finally {release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }

    @Test void supportLeaveApprovalWaitsForHomePayrollConfirmation() throws Exception {
        UUID receiving=store(),home=store(),staff=person(),role=skill(receiving),admin=person(),period=UUID.randomUUID(),leave=UUID.randomUUID(),assignment=UUID.randomUUID();
        employ(home,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,home,staff);
        UUID shift=shift(receiving,role);
        jdbc.update("update shift set status='PUBLISHED' where id=?",shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source,support_employment_id) values (?,?,?,?,'WORKFORCE_SHARING',?)",assignment,shift,staff,role,employment);
        jdbc.update("insert into leave_request(id,staff_id,store_id,leave_type,status,start_date,end_date) values (?,?,?,'SICK','PENDING',?,?)",leave,staff,receiving,date,date);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,home,date,date.plusDays(1));
        payrollCalculator.generatePayroll(home,date,date.plusDays(1));
        var locked=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);locked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));return result;})
                .when(payrollPeriods).findByIdForUpdate(period);
        var pool=Executors.newFixedThreadPool(2);
        try {
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {payrollCalculator.updatePayrollPeriodStatus(home,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);}
                finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
            });
            assertTrue(locked.await(15,TimeUnit.SECONDS));
            var approval=pool.submit(()->{started.countDown();leaveService.approveLeaveRequest(receiving,leave,admin);});
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->approval.get(300,TimeUnit.MILLISECONDS));
            release.countDown();confirmation.get(15,TimeUnit.SECONDS);
            var failure=assertThrows(ExecutionException.class,()->approval.get(15,TimeUnit.SECONDS));
            boolean expected=false;
            for (Throwable cause=failure;cause!=null;cause=cause.getCause()) {
                if ((cause instanceof java.sql.SQLException sql && "40001".equals(sql.getSQLState()))
                        || (cause instanceof com.shiftsync.shared.exception.BusinessException && cause.getMessage().contains("khóa lương"))) expected=true;
            }
            assertTrue(expected,"Duyệt nghỉ thất bại vì nguyên nhân không liên quan: "+failure.getCause());
            assertEquals("PENDING",jdbc.queryForObject("select status::text from leave_request where id=?",String.class,leave));
            assertFalse(jdbc.queryForObject("select deleted from shift_assignment where id=?",Boolean.class,assignment));
            assertFalse(jdbc.queryForObject("select is_open from shift where id=?",Boolean.class,shift));
        } finally {release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }

    @Test void payrollConfirmationWaitsForLeaveApprovalWithoutAssignments() throws Exception {
        UUID store=store(),staff=person(),role=skill(store),admin=person(),period=UUID.randomUUID(),leave=UUID.randomUUID();
        employ(store,staff,role,"EXPERT");
        jdbc.update("insert into leave_request(id,staff_id,store_id,leave_type,status,start_date,end_date) values (?,?,?,'SICK','PENDING',?,?)",leave,staff,store,date,date);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(1));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        var checked=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);if(Thread.currentThread().getName().equals("leave-race") && !Boolean.TRUE.equals(result)) {
            checked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));}return result;})
                .when(payrollPeriods).existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(eq(store),any(),any(),any());
        var pool=Executors.newFixedThreadPool(2);
        try {
            var approval=pool.submit(()->{Thread.currentThread().setName("leave-race");leaveService.approveLeaveRequest(store,leave,admin);});
            assertTrue(checked.await(15,TimeUnit.SECONDS));
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {started.countDown();serializableRetry.execute(()->{payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);return null;});}
                finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
            });
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->confirmation.get(300,TimeUnit.MILLISECONDS));
            release.countDown();approval.get(15,TimeUnit.SECONDS);confirmation.get(15,TimeUnit.SECONDS);
            assertEquals("APPROVED",jdbc.queryForObject("select status::text from leave_request where id=?",String.class,leave));
            assertEquals(1,jdbc.queryForObject("select count(*) from blackout_date where leave_request_id=?",Integer.class,leave));
            assertEquals("CONFIRMED",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
        } finally {release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }

    @Test void leaveWithoutAssignmentsWaitsForPayrollConfirmationAndStaysPending() throws Exception {
        UUID store=store(),staff=person(),role=skill(store),admin=person(),period=UUID.randomUUID(),leave=UUID.randomUUID();
        employ(store,staff,role,"EXPERT");
        jdbc.update("insert into leave_request(id,staff_id,store_id,leave_type,status,start_date,end_date) values (?,?,?,'ANNUAL','PENDING',?,?)",leave,staff,store,date,date);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(1));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        var locked=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);locked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));return result;})
                .when(payrollPeriods).findByIdForUpdate(period);
        var pool=Executors.newFixedThreadPool(2);
        try {
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);}
                finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
            });
            assertTrue(locked.await(15,TimeUnit.SECONDS));
            var approval=pool.submit(()->{started.countDown();leaveService.approveLeaveRequest(store,leave,admin);});
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->approval.get(300,TimeUnit.MILLISECONDS));
            release.countDown();confirmation.get(15,TimeUnit.SECONDS);
            assertThrows(ExecutionException.class,()->approval.get(15,TimeUnit.SECONDS));
            assertEquals("PENDING",jdbc.queryForObject("select status::text from leave_request where id=?",String.class,leave));
            assertEquals(0,jdbc.queryForObject("select count(*) from blackout_date where leave_request_id=?",Integer.class,leave));
            assertEquals("CONFIRMED",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
        } finally {release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }

    @Test void marketplaceClaimWaitsForPayrollConfirmationAndLeavesShiftUnchanged() throws Exception {
        UUID store=store(),staff=person(),role=skill(store),admin=person(),period=UUID.randomUUID();
        employ(store,staff,role,"EXPERT");
        UUID shift=shift(store,role);
        jdbc.update("update shift set status='PUBLISHED',is_open=true where id=?",shift);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(1));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        var redisLock=mock(org.redisson.api.RLock.class);
        when(redis.getLock(anyString())).thenReturn(redisLock);
        when(redisLock.tryLock(anyLong(),anyLong(),eq(TimeUnit.SECONDS))).thenReturn(true);
        var locked=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);locked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));return result;})
                .when(payrollPeriods).findByIdForUpdate(period);
        var pool=Executors.newFixedThreadPool(2);
        try {
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);}
                finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
            });
            assertTrue(locked.await(15,TimeUnit.SECONDS));
            var claim=pool.submit(()->{started.countDown();marketplace.claimOpenShift(store,shift,staff);});
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->claim.get(300,TimeUnit.MILLISECONDS));
            release.countDown();confirmation.get(15,TimeUnit.SECONDS);
            assertThrows(ExecutionException.class,()->claim.get(15,TimeUnit.SECONDS));
            assertEquals(0,count(shift));
            assertTrue(jdbc.queryForObject("select is_open from shift where id=?",Boolean.class,shift));
            assertEquals("CONFIRMED",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
        } finally {release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }

    @Test void marketplacePublicationHonorsSupportEmployeeHomePayroll() {
        UUID receiving=store(),home=store(),staff=person(),role=skill(receiving);
        employ(home,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,home,staff);
        UUID shift=shift(receiving,role);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source,support_employment_id) values (?,?,?,?,'WORKFORCE_SHARING',?)",UUID.randomUUID(),shift,staff,role,employment);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'CONFIRMED')",UUID.randomUUID(),home,date,date.plusDays(1));
        var error=assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->marketplace.publishToMarketplace(receiving,shift));
        assertTrue(error.getMessage().contains("kỳ lương đã khóa"));
        assertFalse(jdbc.queryForObject("select is_open from shift where id=?",Boolean.class,shift));
    }

    @Test void supportShiftEditCannotRaceHomePayrollConfirmation() throws Exception {
        UUID receiving=store(),home=store(),staff=person(),admin=person(),role=skill(receiving);
        employ(home,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,home,staff);
        UUID shift=shift(receiving,role),period=UUID.randomUUID();
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source,support_employment_id) values (?,?,?,?,'WORKFORCE_SHARING',?)",UUID.randomUUID(),shift,staff,role,employment);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,home,date,date.plusDays(1));
        payrollCalculator.generatePayroll(home,date,date.plusDays(1));
        var locked=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);locked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));return result;})
                .when(payrollPeriods).findByIdForUpdate(period);
        var pool=Executors.newFixedThreadPool(2);
        try {
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder()
                        .id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                        new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try { payrollCalculator.updatePayrollPeriodStatus(home,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin); }
                finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
            });
            assertTrue(locked.await(15,TimeUnit.SECONDS));
            var input=new com.shiftsync.shift.dto.ShiftCreateRequest();input.setNote("Không được lưu");
            var edit=pool.submit(()->{started.countDown();shiftService.updateShift(receiving,shift,input);});
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->edit.get(300,TimeUnit.MILLISECONDS));
            release.countDown();confirmation.get(15,TimeUnit.SECONDS);
            assertThrows(ExecutionException.class,()->edit.get(15,TimeUnit.SECONDS));
            assertNull(jdbc.queryForObject("select note from shift where id=?",String.class,shift));
        } finally { release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS)); }
    }

    @Test void supportAssignmentRemovalAndZoneSwapCannotRaceHomePayrollConfirmation() throws Exception {
        UUID receiving=store(),home=store(),staff=person(),other=person(),admin=person(),role=skill(receiving);
        employ(home,staff,role,"EXPERT");employ(receiving,other,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,home,staff);
        UUID shift=shift(receiving,role),period=UUID.randomUUID();
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source,support_employment_id) values (?,?,?,?,'WORKFORCE_SHARING',?)",UUID.randomUUID(),shift,staff,role,employment);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')",UUID.randomUUID(),shift,other);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,home,date,date.plusDays(1));
        payrollCalculator.generatePayroll(home,date,date.plusDays(1));
        var locked=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(2);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);locked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));return result;})
                .when(payrollPeriods).findByIdForUpdate(period);
        var pool=Executors.newFixedThreadPool(3);
        try {
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder()
                        .id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                        new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try { payrollCalculator.updatePayrollPeriodStatus(home,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin); }
                finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
            });
            assertTrue(locked.await(15,TimeUnit.SECONDS));
            var removal=pool.submit(()->{started.countDown();manual.unassignStaffFromShift(receiving,shift,staff);});
            var swap=pool.submit(()->{started.countDown();manual.swapStaffZones(receiving,shift,
                    com.shiftsync.shift.dto.ShiftZoneSwapRequest.builder().staffAId(staff).staffBId(other).build());});
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->removal.get(300,TimeUnit.MILLISECONDS));
            assertThrows(TimeoutException.class,()->swap.get(300,TimeUnit.MILLISECONDS));
            release.countDown();confirmation.get(15,TimeUnit.SECONDS);
            assertThrows(ExecutionException.class,()->removal.get(15,TimeUnit.SECONDS));
            assertThrows(ExecutionException.class,()->swap.get(15,TimeUnit.SECONDS));
            assertEquals(2,count(shift));
        } finally {release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }

    @Test void supportShiftPublicationCannotRaceHomePayrollConfirmation() throws Exception {
        UUID receiving=store(),home=store(),staff=person(),admin=person(),role=skill(receiving);
        employ(home,staff,role,"EXPERT");
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,home,staff);
        UUID shift=shift(receiving,role),period=UUID.randomUUID();
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source,support_employment_id) values (?,?,?,?,'WORKFORCE_SHARING',?)",UUID.randomUUID(),shift,staff,role,employment);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,home,date,date.plusDays(1));
        payrollCalculator.generatePayroll(home,date,date.plusDays(1));
        var locked=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);locked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));return result;})
                .when(payrollPeriods).findByIdForUpdate(period);
        var pool=Executors.newFixedThreadPool(2);
        try {
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder()
                        .id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                        new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try { payrollCalculator.updatePayrollPeriodStatus(home,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin); }
                finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
            });
            assertTrue(locked.await(15,TimeUnit.SECONDS));
            var publish=pool.submit(()->{started.countDown();shiftService.publishShifts(receiving,date,date,admin);});
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->publish.get(300,TimeUnit.MILLISECONDS));
            release.countDown();confirmation.get(15,TimeUnit.SECONDS);
            assertThrows(ExecutionException.class,()->publish.get(15,TimeUnit.SECONDS));
            assertEquals("DRAFT",jdbc.queryForObject("select status::text from shift where id=?",String.class,shift));
        } finally { release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS)); }
    }

    @Test void quotaStartedDuringConfirmationCannotUseOldPayrollSnapshot() throws Exception {
        UUID store=store(),role=skill(store),shift=shift(store,role),admin=person(),period=UUID.randomUUID();
        jdbc.update("update shift set start_time='06:00',end_time='14:30' where id=?",shift);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(1));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        var request=com.shiftsync.quota.dto.UpdateQuotaRequest.builder().branchId(store).date(date)
                .shiftType("morning").positionId(role).count(4).build();
        var locked=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{ Object result=delegate.answer(call);locked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));return result; })
                .when(payrollPeriods).findByIdForUpdate(period);
        var pool=Executors.newFixedThreadPool(2);
        try {
            var confirmation=pool.submit(()->{
                var user=com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build();
                var principal=new com.shiftsync.shared.security.CustomUserDetails(user);
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                        new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try { payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin); }
                finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
            });
            assertTrue(locked.await(15,TimeUnit.SECONDS));
            var quota=pool.submit(()->{started.countDown();quotas.updateQuota("quota",request);});
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->quota.get(300,TimeUnit.MILLISECONDS));
            release.countDown();confirmation.get(15,TimeUnit.SECONDS);
            assertThrows(ExecutionException.class,()->quota.get(15,TimeUnit.SECONDS));
            assertEquals("CONFIRMED",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
            assertEquals(1,jdbc.queryForObject("select required_count from shift_skill_requirement where shift_id=?",Integer.class,shift));
        } finally { release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS)); }
    }

    @Test void autofillAndApplyCannotWriteAfterConcurrentPayrollConfirmation() throws Exception {
        UUID store=store(),role=skill(store),shift=shift(store,role),admin=person(),period=UUID.randomUUID();
        jdbc.update("update shift set start_time='06:00',end_time='14:30' where id=?",shift);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(1));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        var locked=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(2);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{ Object result=delegate.answer(call);locked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));return result; })
                .when(payrollPeriods).findByIdForUpdate(period);
        var pool=Executors.newFixedThreadPool(3);
        try {
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder()
                        .id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                        new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try { payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin); }
                finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
            });
            assertTrue(locked.await(15,TimeUnit.SECONDS));
            var auto=pool.submit(()->{started.countDown();quotas.autoFillQuotas(com.shiftsync.quota.dto.AutoFillQuotaRequest.builder().branchId(store).scope("DAY").date(date).build());});
            var apply=pool.submit(()->{started.countDown();quotas.applyToScheduler(com.shiftsync.quota.dto.ApplySchedulerRequest.builder().branchId(store).scope("DAY").date(date).build());});
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->auto.get(300,TimeUnit.MILLISECONDS));
            assertThrows(TimeoutException.class,()->apply.get(300,TimeUnit.MILLISECONDS));
            release.countDown();confirmation.get(15,TimeUnit.SECONDS);
            assertThrows(ExecutionException.class,()->auto.get(15,TimeUnit.SECONDS));
            assertThrows(ExecutionException.class,()->apply.get(15,TimeUnit.SECONDS));
            assertEquals(1,jdbc.queryForObject("select count(*) from shift where store_id=?",Integer.class,store));
            assertEquals(1,jdbc.queryForObject("select required_count from shift_skill_requirement where shift_id=?",Integer.class,shift));
        } finally { release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS)); }
    }

    @Test void requirementAndBulkWritesCannotRacePayrollConfirmation() throws Exception {
        UUID store=store(),role=skill(store),shift=shift(store,role),admin=person(),period=UUID.randomUUID();
        jdbc.update("update shift set start_time='06:00',end_time='14:30' where id=?",shift);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(1));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        var requirement=new com.shiftsync.shift.dto.ShiftRequirementRequest();requirement.setSkillId(role);requirement.setRequiredCount(4);
        var config=new com.shiftsync.shift.dto.BulkDemandPlanningRequest.ShiftDemandConfig();
        config.setStartTime(LocalTime.of(6,0));config.setEndTime(LocalTime.of(14,30));config.setRequirements(List.of(requirement));
        var bulk=new com.shiftsync.shift.dto.BulkDemandPlanningRequest();bulk.setScope("DAY");bulk.setTargetDate(date);bulk.setShifts(List.of(config));
        var locked=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(2);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{ Object result=delegate.answer(call);locked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));return result; })
                .when(payrollPeriods).findByIdForUpdate(period);
        var pool=Executors.newFixedThreadPool(3);
        try {
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder()
                        .id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                        new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try { payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin); }
                finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
            });
            assertTrue(locked.await(15,TimeUnit.SECONDS));
            var direct=pool.submit(()->{started.countDown();shiftService.setShiftRequirements(store,shift,List.of(requirement));});
            var batch=pool.submit(()->{started.countDown();shiftService.saveBulkDemandPlanning(store,bulk);});
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->direct.get(300,TimeUnit.MILLISECONDS));
            assertThrows(TimeoutException.class,()->batch.get(300,TimeUnit.MILLISECONDS));
            release.countDown();confirmation.get(15,TimeUnit.SECONDS);
            assertThrows(ExecutionException.class,()->direct.get(15,TimeUnit.SECONDS));
            assertThrows(ExecutionException.class,()->batch.get(15,TimeUnit.SECONDS));
            assertEquals("CONFIRMED",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
            assertEquals(1,jdbc.queryForObject("select required_count from shift_skill_requirement where shift_id=?",Integer.class,shift));
        } finally { release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS)); }
    }

    @Test void allShiftCreationPathsUseConfiguredDeadlineInBusinessTimeZone() {
        UUID store=store(),role=skill(store);
        jdbc.update("insert into store_configuration(store_id,availability_deadline_hours) values (?,6)",store);
        var direct=new com.shiftsync.shift.dto.ShiftCreateRequest();
        direct.setShiftDate(date);direct.setStartTime(LocalTime.of(6,0));direct.setEndTime(LocalTime.of(14,30));
        shiftService.createShift(store,direct);
        var requirement=new com.shiftsync.shift.dto.ShiftRequirementRequest();requirement.setSkillId(role);requirement.setRequiredCount(1);
        var slot=new com.shiftsync.shift.dto.BulkDemandPlanningRequest.ShiftDemandConfig();
        slot.setStartTime(LocalTime.of(6,0));slot.setEndTime(LocalTime.of(14,30));slot.setRequirements(List.of(requirement));
        var bulk=new com.shiftsync.shift.dto.BulkDemandPlanningRequest();bulk.setScope("DAY");bulk.setTargetDate(date.plusDays(1));bulk.setShifts(List.of(slot));
        shiftService.saveBulkDemandPlanning(store,bulk);
        quotas.autoFillQuotas(com.shiftsync.quota.dto.AutoFillQuotaRequest.builder().branchId(store).scope("DAY").date(date.plusDays(2)).build());
        for (int offset=0;offset<3;offset++) {
            LocalDate shiftDate=date.plusDays(offset);
            double actual=jdbc.queryForObject("select extract(epoch from availability_deadline) from shift where store_id=? and shift_date=? and start_time='06:00'",Double.class,store,shiftDate);
            assertEquals((double)shiftDate.atTime(6,0).atZone(ZoneId.of("Asia/Ho_Chi_Minh")).minusHours(6).toEpochSecond(),actual);
        }
    }

    @Test void overnightStoreTemplatesQuotasAndPublicationUseRealCalendarDays() {
        UUID store=store(),role=skill(store);
        var update=com.shiftsync.store.dto.StoreUpdateRequest.builder()
                .openTime(LocalTime.of(22,0)).closeTime(LocalTime.of(6,0)).build();
        storeService.updateStore(store,update);
        var template=new com.shiftsync.shift.dto.ShiftTemplateCreateRequest();
        template.setName("Ca đêm");template.setStartTime(LocalTime.of(22,0));template.setEndTime(LocalTime.of(6,0));
        assertTrue(shiftTemplates.createTemplate(store,template).getIsWithinOperatingHours());
        quotas.autoFillQuotas(com.shiftsync.quota.dto.AutoFillQuotaRequest.builder().branchId(store).scope("DAY").date(date).build());
        assertEquals(1,jdbc.queryForObject("select count(*) from shift where store_id=? and shift_date=? and start_time='22:00' and end_time='02:00'",Integer.class,store,date));
        assertEquals(1,jdbc.queryForObject("select count(*) from shift where store_id=? and shift_date=? and start_time='02:00' and end_time='06:00'",Integer.class,store,date.plusDays(1)));
        var daily=quotas.getDailyQuotas(store,date);
        assertEquals(LocalTime.of(2,0),daily.getMidTime());
        assertEquals(4.0,daily.getShifts().get(0).getDurationHours());
        assertEquals(4.0,daily.getShifts().get(1).getDurationHours());
        assertEquals(jdbc.queryForObject("select id from shift where store_id=? and shift_date=? and start_time='22:00'",UUID.class,store,date),daily.getShifts().get(0).getId());
        assertEquals(jdbc.queryForObject("select id from shift where store_id=? and shift_date=? and start_time='02:00'",UUID.class,store,date.plusDays(1)),daily.getShifts().get(1).getId());
        assertTrue(daily.getShifts().stream().allMatch(s->s.getQuotas().stream().anyMatch(q->q.getPositionId().equals(role) && q.getCount()>0)));
        var weekly=quotas.getWeeklyQuotas(store,date);
        var row=weekly.getMatrixRows().stream().filter(r->r.getPositionId().equals(role)).findFirst().orElseThrow();
        assertEquals("SAVED",row.getCells().get(0).getSource());
        assertEquals("SAVED",row.getCells().get(1).getSource());
        shiftService.publishShifts(store,date,date.plusDays(1),UUID.randomUUID());
        assertEquals(2,jdbc.queryForObject("select count(*) from shift where store_id=? and status='PUBLISHED'",Integer.class,store));
    }

    @Test void overnightQuotaRejectsLockedFollowingCalendarDay() {
        UUID store=store(),role=skill(store);
        storeService.updateStore(store,com.shiftsync.store.dto.StoreUpdateRequest.builder()
                .openTime(LocalTime.of(22,0)).closeTime(LocalTime.of(6,0)).build());
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'PAID')",UUID.randomUUID(),store,date.plusDays(1),date.plusDays(2));
        var request=com.shiftsync.quota.dto.UpdateQuotaRequest.builder().branchId(store).date(date)
                .shiftType("morning").positionId(role).count(1).build();
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->quotas.updateQuota("night",request));
        assertEquals(0,jdbc.queryForObject("select count(*) from shift where store_id=?",Integer.class,store));
    }

    @Test void overnightAssignmentAndAttendanceRejectLockedFollowingDay() throws Exception {
        UUID store=store(),staff=person(),role=skill(store);
        employ(store,staff,role,"EXPERT");
        UUID shift=shift(store,role);
        jdbc.update("update shift set start_time='22:00',end_time='06:00',status='PUBLISHED' where id=?",shift);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'PAID')",UUID.randomUUID(),store,date.plusDays(1),date.plusDays(2));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->manual.assignStaffToShift(store,shift,staff));
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",UUID.randomUUID(),shift,staff,role);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->attendanceService.submitSelfie(staff,shift,0.0,0.0,new byte[]{1}));
        var adjustment=new com.shiftsync.attendance.dto.AdjustmentCreateRequest();adjustment.setShiftId(shift);adjustment.setReason("Điều chỉnh");
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->adjustmentService.createRequest(staff,adjustment));
        var lock=mock(org.redisson.api.RLock.class);when(redis.getLock(anyString())).thenReturn(lock);
        when(lock.tryLock(anyLong(),anyLong(),eq(TimeUnit.SECONDS))).thenReturn(true);
        var rejected=assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->marketplace.claimOpenShift(store,shift,staff));
        assertEquals(409,rejected.getStatus().value());
        assertEquals(0,jdbc.queryForObject("select count(*) from attendance where shift_assignment_id in (select id from shift_assignment where shift_id=?)",Integer.class,shift));
    }

    @Test void automaticScheduleCannotReplaceAttendanceOrWriteIntoLockedPeriod() {
        UUID store=store(),staff=person(),role=skill(store);employ(store,staff,role,"EXPERT");
        UUID shift=shift(store,role),assignment=UUID.randomUUID();
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'AUTO')",assignment,shift,staff,role);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,status) values (?,?,?,'PRESENT')",UUID.randomUUID(),assignment,date.atTime(9,0).atOffset(ZoneOffset.ofHours(7)));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->scheduler.autoSchedule(store,request(false)));
        assertEquals(1,count(shift));
        jdbc.update("delete from attendance where shift_assignment_id=?",assignment);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'PAID')",UUID.randomUUID(),store,date,date.plusDays(1));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->scheduler.autoSchedule(store,request(false)));
        assertEquals(1,count(shift));
    }

    @Test void storedScheduleCannotApplyAfterPayrollIsLocked() {
        UUID store=store(),staff=person(),role=skill(store);employ(store,staff,role,"EXPERT");UUID shift=shift(store,role);
        var preview=plans.preview(store,request(true),staff);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'PAID')",UUID.randomUUID(),store,date,date.plusDays(1));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->plans.apply(store,preview.getPlanId(),staff));
        assertEquals(0,count(shift));
    }
    /** Characterizes an existing defect: cancelled-but-open shifts remain claimable. */
    @Test void cancelledOpenShiftRejectsMarketplaceClaim() throws Exception {
        UUID store=store(),person=person(),skill=skill(store);
        employ(store,person,skill,"EXPERT");
        UUID shift=shift(store,skill);
        jdbc.update("update shift set status='CANCELLED',is_open=true,availability_deadline=? where id=?",
                date.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),shift);
        var lock=mock(org.redisson.api.RLock.class);
        when(redis.getLock(anyString())).thenReturn(lock);
        when(lock.tryLock(anyLong(),anyLong(),eq(TimeUnit.SECONDS))).thenReturn(true);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->marketplace.claimOpenShift(store,shift,person));
        assertEquals(0,count(shift));
        assertEquals("CANCELLED",jdbc.queryForObject("select status::text from shift where id=?",String.class,shift));
    }

    /** Characterizes swap approval bypassing the required skill of each destination assignment. */
    @Test void swapRejectsEmployeesWithoutDestinationSkills() {
        UUID store=store(),first=person(),second=person(),manager=person(),roleA=skill(store),roleB=skill(store);
        employ(store,first,roleA,"EXPERT");employ(store,second,roleB,"EXPERT");
        jdbc.update("update staff set system_role='ADMIN' where id=?",manager);
        UUID source=shift(store,roleA),target=UUID.randomUUID();
        jdbc.update("insert into shift(id,store_id,shift_date,start_time,end_time,status,is_open,availability_deadline) values (?,?,?,'09:00','17:00','PUBLISHED',false,?)",
                target,store,date.plusDays(1),date.atStartOfDay().atOffset(ZoneOffset.UTC));
        jdbc.update("insert into shift_skill_requirement(id,shift_id,skill_id,required_count) values (?,?,?,1)",UUID.randomUUID(),target,roleB);
        jdbc.update("update shift set status='PUBLISHED' where id in (?,?)",source,target);
        jdbc.update("update shift set shift_date=? where id=?",date.plusDays(1),target);
        jdbc.update("insert into availability(id,staff_id,day_of_week,start_time,end_time) values (?,?,1,'06:00','23:00')",UUID.randomUUID(),first);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL'),(?,?,?,?,'MANUAL')",
                UUID.randomUUID(),source,first,roleA,UUID.randomUUID(),target,second,roleB);
        var request=swaps.createSwapRequest(first,source,second,target);
        swaps.respondToSwapRequest(request.getId(),second,true);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->swaps.managerApproveSwapRequest(request.getId(),manager));
        assertEquals(0,jdbc.queryForObject("select count(*) from shift_assignment a where a.shift_id in (?,?) and a.deleted=false and not exists (select 1 from staff_skill sk where sk.staff_id=a.staff_id and sk.skill_id=a.required_skill_id)",Integer.class,source,target));
    }

    @Test void rejectedWorkforceRequestCannotAcceptProposal() {
        UUID requesting=store(),target=store(),staff=person(),manager=person(),skill=skill(requesting);
        employ(target,staff,skill,"EXPERT");
        jdbc.update("update staff set system_role='ADMIN' where id=?",manager);
        UUID shift=shift(requesting,skill);
        jdbc.update("update shift set status='PUBLISHED' where id=?",shift);
        var create=new com.shiftsync.workforce.dto.WorkforceRequestCreateDTO();
        create.setTargetStoreId(target);create.setShiftId(shift);create.setSkillId(skill);
        var request=workforce.createRequest(requesting,create,manager);
        var proposalInput=new com.shiftsync.workforce.dto.WorkforceProposalCreateDTO();proposalInput.setStaffId(staff);
        var proposal=workforce.proposeStaff(target,request.getId(),proposalInput,manager);
        workforce.rejectRequest(target,request.getId(),manager);
        assertEquals("MANAGER_REJECTED",jdbc.queryForObject("select status::text from workforce_request where id=?",String.class,request.getId()));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->workforce.respondToProposal(proposal.getId(),true,staff));
        assertEquals(0,count(shift));
        assertEquals("MANAGER_REJECTED",jdbc.queryForObject("select status::text from workforce_request where id=?",String.class,request.getId()));
    }

    @Test void supportAttendanceIsPaidOnceByEmployeesHomeStore() {
        UUID requesting=store(),target=store(),staff=person(),manager=person(),skill=skill(requesting);
        employ(target,staff,skill,"EXPERT");
        scheduleSkillRate(requesting,skill,40000);
        UUID otherContract=UUID.randomUUID();
        jdbc.update("insert into contract_type(id,store_id,name,max_weekly_hours,ot_multiplier,default_hourly_rate) values (?,?,?,48,1.5,30000)",otherContract,requesting,"Dual "+otherContract);
        jdbc.update("insert into employment(id,store_id,staff_id,contract_type_id,hourly_rate,status,joined_date) values (?,?,?,?,30000,'ACTIVE',?)",UUID.randomUUID(),requesting,staff,otherContract,date.minusMonths(3));
        jdbc.update("update staff set system_role='ADMIN' where id=?",manager);
        UUID shift=shift(requesting,skill);
        jdbc.update("update shift set status='PUBLISHED' where id=?",shift);
        var create=new com.shiftsync.workforce.dto.WorkforceRequestCreateDTO();
        create.setTargetStoreId(target);create.setShiftId(shift);create.setSkillId(skill);
        var request=workforce.createRequest(requesting,create,manager);
        var input=new com.shiftsync.workforce.dto.WorkforceProposalCreateDTO();input.setStaffId(staff);
        var proposal=workforce.proposeStaff(target,request.getId(),input,manager);
        workforce.respondToProposal(proposal.getId(),true,staff);
        UUID assignment=jdbc.queryForObject("select id from shift_assignment where shift_id=? and staff_id=? and deleted=false",UUID.class,shift,staff);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",
                UUID.randomUUID(),assignment,date.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),date.atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        payrollCalculator.generatePayroll(requesting,date,date.plusDays(1));
        payrollCalculator.generatePayroll(target,date,date.plusDays(1));
        assertEquals(0.0,jdbc.queryForObject("select coalesce(sum(p.total_hours),0) from payroll p join payroll_period pp on pp.id=p.payroll_period_id where p.staff_id=? and pp.store_id=? and p.deleted=false",Double.class,staff,requesting));
        assertEquals(8.0,jdbc.queryForObject("select coalesce(sum(p.total_hours),0) from payroll p join payroll_period pp on pp.id=p.payroll_period_id where p.staff_id=? and pp.store_id=? and p.deleted=false",Double.class,staff,target));
        assertEquals(320000.0,jdbc.queryForObject("select coalesce(sum(p.total_amount),0) from payroll p join payroll_period pp on pp.id=p.payroll_period_id where p.staff_id=? and pp.store_id=? and p.deleted=false",Double.class,staff,target));
        assertEquals("WORKFORCE_SHARING",jdbc.queryForObject("select source::text from shift_assignment where id=?",String.class,assignment));
        assertEquals(8.0,jdbc.queryForObject("select extract(epoch from(check_out_time-check_in_time))/3600 from attendance where shift_assignment_id=?",Double.class,assignment));
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(booleans = {false, true})
    void supportShiftRemovedByPaidLeaveIsPaidByHomeStore(boolean submittedAtReceivingStore) {
        UUID receiving=store(),home=store(),staff=person(),manager=person(),role=skill(receiving);
        employ(home,staff,role,"EXPERT");
        employ(receiving,staff,skill(home),"EXPERT");
        scheduleSkillRate(receiving,role,40000);
        jdbc.update("update staff set system_role='ADMIN' where id=?",manager);
        UUID shift=shift(receiving,role);jdbc.update("update shift set status='PUBLISHED' where id=?",shift);
        var create=new com.shiftsync.workforce.dto.WorkforceRequestCreateDTO();create.setTargetStoreId(home);create.setShiftId(shift);create.setSkillId(role);
        var request=workforce.createRequest(receiving,create,manager);
        var input=new com.shiftsync.workforce.dto.WorkforceProposalCreateDTO();input.setStaffId(staff);
        var proposal=workforce.proposeStaff(home,request.getId(),input,manager);
        workforce.respondToProposal(proposal.getId(),true,staff);
        var leaveInput=new com.shiftsync.leave.dto.LeaveCreateRequest();leaveInput.setStartDate(date);leaveInput.setEndDate(date);leaveInput.setLeaveType(com.shiftsync.leave.enums.LeaveType.ANNUAL);
        UUID leaveStore=submittedAtReceivingStore?receiving:home;
        var leave=leaveService.createLeaveRequest(leaveStore,staff,leaveInput);leaveService.approveLeaveRequest(leaveStore,leave.getId(),manager);
        payrollCalculator.generatePayroll(receiving,date,date.plusDays(1));
        assertEquals(0.0,jdbc.queryForObject("select coalesce(sum(p.total_amount),0) from payroll p join payroll_period pp on pp.id=p.payroll_period_id where pp.store_id=? and p.staff_id=?",Double.class,receiving,staff));
        payrollCalculator.generatePayroll(home,date,date.plusDays(1));
        assertEquals(8.0,jdbc.queryForObject("select p.total_hours from payroll p join payroll_period pp on pp.id=p.payroll_period_id where pp.store_id=? and p.staff_id=?",Double.class,home,staff));
        assertEquals(320000.0,jdbc.queryForObject("select p.total_amount from payroll p join payroll_period pp on pp.id=p.payroll_period_id where pp.store_id=? and p.staff_id=?",Double.class,home,staff));
    }

    @Test void fullSupportShiftPreservesBusinessErrorAndExpiredRequestStillCommits() {
        UUID receiving=store(),home=store(),candidate=person(),occupant=person(),manager=person(),role=skill(receiving);
        employ(home,candidate,role,"EXPERT"); employ(receiving,occupant,role,"EXPERT");
        UUID shift=shift(receiving,role); jdbc.update("update shift set status='PUBLISHED' where id=?",shift);
        var create=new com.shiftsync.workforce.dto.WorkforceRequestCreateDTO();
        create.setTargetStoreId(home);create.setShiftId(shift);create.setSkillId(role);
        var request=workforce.createRequest(receiving,create,manager);
        manual.assignStaffToShift(receiving,shift,occupant);
        var input=new com.shiftsync.workforce.dto.WorkforceProposalCreateDTO();input.setStaffId(candidate);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,
                ()->workforce.proposeStaff(home,request.getId(),input,manager));
        assertEquals(0,jdbc.queryForObject("select count(*) from workforce_proposal where workforce_request_id=?",Integer.class,request.getId()));
        assertEquals("PENDING",jdbc.queryForObject("select status::text from workforce_request where id=?",String.class,request.getId()));
        assertEquals(1,count(shift));
        jdbc.update("update shift set shift_date=? where id=?",LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(1),shift);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,
                ()->workforce.proposeStaff(home,request.getId(),input,manager));
        assertEquals("EXPIRED",jdbc.queryForObject("select status::text from workforce_request where id=?",String.class,request.getId()));
    }

    @Test void foreignStoreCannotExpireAnotherStoresWorkforceRequest() {
        UUID receiving=store(),home=store(),foreign=store(),staff=person(),manager=person(),role=skill(receiving);
        employ(home,staff,role,"EXPERT");
        UUID shift=shift(receiving,role); jdbc.update("update shift set status='PUBLISHED' where id=?",shift);
        var input=new com.shiftsync.workforce.dto.WorkforceRequestCreateDTO();
        input.setTargetStoreId(home);input.setShiftId(shift);input.setSkillId(role);
        var request=workforce.createRequest(receiving,input,manager);
        jdbc.update("update shift set shift_date=? where id=?",LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(1),shift);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->workforce.rejectRequest(foreign,request.getId(),manager));
        assertEquals("PENDING",jdbc.queryForObject("select status::text from workforce_request where id=?",String.class,request.getId()));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->workforce.rejectRequest(home,request.getId(),manager));
        assertEquals("EXPIRED",jdbc.queryForObject("select status::text from workforce_request where id=?",String.class,request.getId()));
    }

    @Test void homePayrollLockProtectsSupportAssignmentAndAttendance() {
        UUID receiving=store(),home=store(),staff=person(),manager=person(),role=skill(receiving);
        employ(home,staff,role,"EXPERT");jdbc.update("update staff set system_role='ADMIN' where id=?",manager);
        UUID shift=shift(receiving,role);jdbc.update("update shift set status='PUBLISHED' where id=?",shift);
        var create=new com.shiftsync.workforce.dto.WorkforceRequestCreateDTO();create.setTargetStoreId(home);create.setShiftId(shift);create.setSkillId(role);
        var request=workforce.createRequest(receiving,create,manager);
        var input=new com.shiftsync.workforce.dto.WorkforceProposalCreateDTO();input.setStaffId(staff);
        var proposal=workforce.proposeStaff(home,request.getId(),input,manager);workforce.respondToProposal(proposal.getId(),true,staff);
        var leaveInput=new com.shiftsync.leave.dto.LeaveCreateRequest();leaveInput.setStartDate(date);leaveInput.setEndDate(date);leaveInput.setLeaveType(com.shiftsync.leave.enums.LeaveType.ANNUAL);
        var leave=leaveService.createLeaveRequest(home,staff,leaveInput);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'PAID')",UUID.randomUUID(),home,date,date.plusDays(1));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->manual.unassignStaffFromShift(receiving,shift,staff));
        var edit=new com.shiftsync.shift.dto.ShiftCreateRequest();edit.setNote("Không được sửa");
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->shiftService.updateShift(receiving,shift,edit));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->shiftService.deleteShift(receiving,shift));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->attendanceService.submitSelfie(staff,shift,0.0,0.0,new byte[]{1}));
        var adjustment=new com.shiftsync.attendance.dto.AdjustmentCreateRequest();adjustment.setShiftId(shift);adjustment.setReason("Điều chỉnh");
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->adjustmentService.createRequest(staff,adjustment));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->leaveService.approveLeaveRequest(home,leave.getId(),manager));
        assertEquals(1,count(shift));
        assertEquals("PENDING",jdbc.queryForObject("select status::text from leave_request where id=?",String.class,leave.getId()));
    }

    @Test void supportWorkSharesHomeStoreWeeklyOvertimeThreshold() {
        UUID receiving=store(),home=store(),staff=person(),manager=person(),role=skill(receiving),homeRole=skill(home);
        employ(home,staff,role,"EXPERT");
        jdbc.update("update staff set system_role='ADMIN' where id=?",manager);
        UUID prior=shift(home,homeRole),priorAssignment=UUID.randomUUID();
        jdbc.update("update shift set shift_date=?,start_time='09:00',end_time='15:00',status='COMPLETED' where id=?",date.minusDays(1),prior);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')",priorAssignment,prior,staff);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",UUID.randomUUID(),priorAssignment,date.minusDays(1).atTime(9,0).atOffset(ZoneOffset.ofHours(7)),date.minusDays(1).atTime(15,0).atOffset(ZoneOffset.ofHours(7)));
        UUID support=shift(receiving,role);jdbc.update("update shift set status='PUBLISHED' where id=?",support);
        var create=new com.shiftsync.workforce.dto.WorkforceRequestCreateDTO();create.setTargetStoreId(home);create.setShiftId(support);create.setSkillId(role);
        var request=workforce.createRequest(receiving,create,manager);
        var input=new com.shiftsync.workforce.dto.WorkforceProposalCreateDTO();input.setStaffId(staff);
        var proposal=workforce.proposeStaff(home,request.getId(),input,manager);workforce.respondToProposal(proposal.getId(),true,staff);
        scheduleWeeklyHours(home,8);
        UUID assignment=jdbc.queryForObject("select id from shift_assignment where shift_id=? and staff_id=?",UUID.class,support,staff);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",UUID.randomUUID(),assignment,date.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),date.atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        payrollCalculator.generatePayroll(home,date,date.plusDays(1));
        assertEquals(8.0,jdbc.queryForObject("select p.total_hours from payroll p join payroll_period pp on pp.id=p.payroll_period_id where pp.store_id=? and p.staff_id=?",Double.class,home,staff));
        assertEquals(6.0,jdbc.queryForObject("select p.ot_hours from payroll p join payroll_period pp on pp.id=p.payroll_period_id where pp.store_id=? and p.staff_id=?",Double.class,home,staff));
        assertEquals(330000.0,jdbc.queryForObject("select p.total_amount from payroll p join payroll_period pp on pp.id=p.payroll_period_id where pp.store_id=? and p.staff_id=?",Double.class,home,staff));
    }

    @Test void closingStoreReversesFutureLeaveAndUnblocksOtherStore() {
        UUID closing=store(),active=store(),staff=person(),manager=person(),oldSkill=skill(closing),currentSkill=skill(active);
        employ(closing,staff,oldSkill,"EXPERT");employ(active,staff,currentSkill,"EXPERT");
        jdbc.update("update staff set system_role='ADMIN' where id=?",manager);
        jdbc.update("update store set address='Audit address' where id=?",closing);
        var input=new com.shiftsync.leave.dto.LeaveCreateRequest();
        input.setStartDate(date);input.setEndDate(date);input.setLeaveType(com.shiftsync.leave.enums.LeaveType.ANNUAL);
        var leave=leaveService.createLeaveRequest(closing,staff,input);
        leaveService.approveLeaveRequest(closing,leave.getId(),manager);
        jdbc.update("update employment set status='INACTIVE',left_date=? where store_id=?",date.minusDays(1),closing);
        storeService.deleteStore(closing,manager);
        assertEquals("REJECTED",jdbc.queryForObject("select status::text from leave_request where id=?",String.class,leave.getId()));
        assertEquals(0,jdbc.queryForObject("select count(*) from blackout_date where leave_request_id=?",Integer.class,leave.getId()));
        assertEquals(0,jdbc.queryForObject("select used_days from leave_balance where store_id=? and staff_id=? and year=?",Integer.class,closing,staff,date.getYear()));
        UUID next=shift(active,currentSkill);
        manual.assignStaffToShift(active,next,staff);
        assertEquals(1,count(next));
    }

    @Test void closingStorePreservesPastAttendanceAndPastPortionOfLeave() {
        UUID store=store(),staff=person(),role=skill(store),manager=person();
        LocalDate today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")), yesterday=today.minusDays(1), tomorrow=today.plusDays(1);
        employ(store,staff,role,"EXPERT");
        jdbc.update("update employment set status='INACTIVE',joined_date=?,left_date=? where store_id=?",yesterday.minusMonths(1),yesterday,store);
        UUID leave=UUID.randomUUID();
        jdbc.update("insert into leave_request(id,staff_id,store_id,leave_type,status,start_date,end_date) values (?,?,?,'ANNUAL','APPROVED',?,?)",leave,staff,store,yesterday,tomorrow);
        for (LocalDate day : List.of(yesterday,today,tomorrow)) {
            jdbc.update("insert into blackout_date(id,staff_id,date,leave_request_id) values (?,?,?,?)",UUID.randomUUID(),staff,day,leave);
        }
        for (int year : new java.util.HashSet<>(List.of(yesterday.getYear(),today.getYear(),tomorrow.getYear()))) {
            int count=(int)List.of(yesterday,today,tomorrow).stream().filter(d->d.getYear()==year).count();
            jdbc.update("insert into leave_balance(id,staff_id,store_id,year,used_days) values (?,?,?,?,?)",UUID.randomUUID(),staff,store,year,count);
        }
        UUID shift=shift(store,role), assignment=UUID.randomUUID(), attendance=UUID.randomUUID();
        jdbc.update("update shift set shift_date=?,status='COMPLETED' where id=?",yesterday.minusDays(1),shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignment,shift,staff,role);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",attendance,assignment,yesterday.minusDays(1).atTime(9,0).atOffset(ZoneOffset.ofHours(7)),yesterday.minusDays(1).atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        storeService.deleteStore(store,manager);
        assertEquals("APPROVED",jdbc.queryForObject("select status::text from leave_request where id=?",String.class,leave));
        assertEquals(yesterday,jdbc.queryForObject("select end_date from leave_request where id=?",LocalDate.class,leave));
        assertEquals(1,jdbc.queryForObject("select count(*) from blackout_date where leave_request_id=?",Integer.class,leave));
        assertEquals(1,jdbc.queryForObject("select sum(used_days) from leave_balance where store_id=? and staff_id=?",Integer.class,store,staff));
        assertEquals("COMPLETED",jdbc.queryForObject("select status::text from shift where id=?",String.class,shift));
        assertFalse(jdbc.queryForObject("select deleted from shift_assignment where id=?",Boolean.class,assignment));
        assertFalse(jdbc.queryForObject("select deleted from attendance where id=?",Boolean.class,attendance));
    }

    @Test void closingStoreRollsBackWhenFutureLeaveIsPayrollLocked() {
        UUID store=store(),staff=person(),role=skill(store),manager=person();
        employ(store,staff,role,"EXPERT");
        var input=new com.shiftsync.leave.dto.LeaveCreateRequest();
        input.setStartDate(date);input.setEndDate(date);input.setLeaveType(com.shiftsync.leave.enums.LeaveType.ANNUAL);
        var leave=leaveService.createLeaveRequest(store,staff,input);
        leaveService.approveLeaveRequest(store,leave.getId(),manager);
        jdbc.update("update employment set status='INACTIVE',left_date=? where store_id=?",date.minusDays(1),store);
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'PAID')",UUID.randomUUID(),store,date,date.plusDays(1));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->storeService.deleteStore(store,manager));
        assertFalse(jdbc.queryForObject("select deleted from store where id=?",Boolean.class,store));
        assertEquals("APPROVED",jdbc.queryForObject("select status::text from leave_request where id=?",String.class,leave.getId()));
        assertEquals(1,jdbc.queryForObject("select count(*) from blackout_date where leave_request_id=?",Integer.class,leave.getId()));
        assertEquals(1,jdbc.queryForObject("select used_days from leave_balance where store_id=? and staff_id=? and year=?",Integer.class,store,staff,date.getYear()));
    }

    @Test void cancelledShiftDoesNotBlockAssignmentAtAnotherStore() {
        UUID oldStore=store(),newStore=store(),staff=person(),oldRole=skill(oldStore),newRole=skill(newStore);
        employ(oldStore,staff,oldRole,"EXPERT");employ(newStore,staff,newRole,"EXPERT");
        UUID cancelled=shift(oldStore,oldRole),next=shift(newStore,newRole);
        jdbc.update("update shift set status='CANCELLED' where id=?",cancelled);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",
                UUID.randomUUID(),cancelled,staff,oldRole);
        manual.assignStaffToShift(newStore,next,staff);
        assertEquals(1,count(next));
    }

    @Test void reminderQueryCrossesMidnightAndExcludesUnpublishedShifts() {
        UUID store=store(),staff=person(),skill=skill(store);employ(store,staff,skill,"EXPERT");
        UUID first=shift(store,skill);
        jdbc.update("update shift set start_time='23:55',end_time='23:59',status='PUBLISHED' where id=?",first);
        UUID second=shift(store,skill);
        jdbc.update("update shift set shift_date=?,start_time='00:05',end_time='01:00',status='PUBLISHED' where id=?",date.plusDays(1),second);
        UUID hidden=shift(store,skill);
        jdbc.update("update shift set start_time='23:56',end_time='23:59',status='CANCELLED' where id=?",hidden);
        for (UUID id : List.of(first,second,hidden)) {
            jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",UUID.randomUUID(),id,staff,skill);
        }
        var found=assignments.findPublishedReminders(store,date,LocalTime.of(23,55),date.plusDays(1),LocalTime.of(0,10));
        assertEquals(Set.of(first,second),found.stream().map(a->a.getShift().getId()).collect(java.util.stream.Collectors.toSet()));
    }

    @Test void overnightAbsenceIsCountedOnlyAfterActualEnd() {
        UUID store=store(),staff=person(),skill=skill(store);employ(store,staff,skill,"EXPERT");
        UUID night=shift(store,skill);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",UUID.randomUUID(),night,staff,skill);
        LocalDate today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        jdbc.update("update shift set shift_date=?,start_time='22:00',end_time='06:00',status='PUBLISHED' where id=?",today,night);
        assertEquals(0,assignments.countAbsentAssignmentsByStoreAndDateRange(store,today,today));
        LocalDate past=today.minusDays(2);
        jdbc.update("update shift set shift_date=? where id=?",past,night);
        assertEquals(1,assignments.countAbsentAssignmentsByStoreAndDateRange(store,past,past));
        jdbc.update("update shift set status='CANCELLED' where id=?",night);
        assertEquals(0,assignments.countAbsentAssignmentsByStoreAndDateRange(store,past,past));
    }

    @Test void inactiveEmployeeWithAttendanceReceivesHistoricalPayslip() {
        UUID store=store(),staff=person(),skill=skill(store);employ(store,staff,skill,"EXPERT");
        UUID shift=shift(store,skill),assignment=UUID.randomUUID();
        jdbc.update("update shift set status='PUBLISHED' where id=?",shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignment,shift,staff,skill);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",
                UUID.randomUUID(),assignment,date.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),date.atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        jdbc.update("update employment set status='INACTIVE',left_date=? where staff_id=? and store_id=?",date.plusDays(1),staff,store);
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        assertEquals(1,jdbc.queryForObject("select count(*) from payroll p join payroll_period pp on pp.id=p.payroll_period_id where p.staff_id=? and pp.store_id=? and p.deleted=false",Integer.class,staff,store));
        assertEquals(8.0,jdbc.queryForObject("select extract(epoch from(check_out_time-check_in_time))/3600 from attendance where shift_assignment_id=?",Double.class,assignment));
    }

    @Test void employmentRejectsContractOwnedByAnotherStore() {
        UUID own=store(),foreign=store(),staff=person(),skill=skill(foreign);
        employ(foreign,staff,skill,"EXPERT");
        UUID contract=jdbc.queryForObject("select id from contract_type where store_id=?",UUID.class,foreign);
        var input=new com.shiftsync.employment.dto.EmploymentCreateRequest();
        input.setStaffId(staff);input.setContractTypeId(contract);input.setHourlyRate(java.math.BigDecimal.valueOf(30000));input.setJoinedDate(date.minusDays(1));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class, () -> employmentService.assignStaffToStore(own,input));
        assertEquals(0,jdbc.queryForObject("select count(*) from employment where store_id=? and staff_id=?",Integer.class,own,staff));
    }

    @Test void payrollCountsEarlierWeekHoursWithoutPayingThemTwice() {
        UUID store=store(),staff=person(),skill=skill(store);employ(store,staff,skill,"EXPERT");
        LocalDate monday=LocalDate.of(2030,10,28), wednesday=monday.plusDays(2);
        scheduleWeeklyHours(store,8);
        UUID first=shift(store,skill);
        jdbc.update("update shift set shift_date=?,start_time='09:00',end_time='15:00',status='COMPLETED' where id=?",monday,first);
        UUID second=shift(store,skill);
        jdbc.update("update shift set shift_date=?,start_time='09:00',end_time='13:00',status='COMPLETED' where id=?",wednesday,second);
        UUID firstAssignment=UUID.randomUUID(),secondAssignment=UUID.randomUUID();
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",firstAssignment,first,staff,skill);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",secondAssignment,second,staff,skill);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",UUID.randomUUID(),firstAssignment,monday.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),monday.atTime(15,0).atOffset(ZoneOffset.ofHours(7)));
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",UUID.randomUUID(),secondAssignment,wednesday.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),wednesday.atTime(13,0).atOffset(ZoneOffset.ofHours(7)));
        payrollCalculator.generatePayroll(store,monday,monday.plusDays(1));
        payrollCalculator.generatePayroll(store,wednesday,wednesday.plusDays(1));
        var row=jdbc.queryForMap("select p.total_hours,p.ot_hours from payroll p join payroll_period pp on pp.id=p.payroll_period_id where pp.store_id=? and pp.start_date=? and p.staff_id=?",store,wednesday,staff);
        assertEquals(0,new java.math.BigDecimal("4").compareTo((java.math.BigDecimal)row.get("total_hours")));
        assertEquals(0,new java.math.BigDecimal("2").compareTo((java.math.BigDecimal)row.get("ot_hours")));
    }

    @Test void approvingLeaveRemovesPreviousNightsAssignment() {
        UUID store=store(),staff=person(),manager=person(),skill=skill(store);employ(store,staff,skill,"EXPERT");
        jdbc.update("update staff set system_role='ADMIN' where id=?",manager);
        UUID night=shift(store,skill),assignment=UUID.randomUUID();
        jdbc.update("update shift set shift_date=?,start_time='22:00',end_time='06:00',status='PUBLISHED' where id=?",date.minusDays(1),night);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignment,night,staff,skill);
        var input=new com.shiftsync.leave.dto.LeaveCreateRequest();
        input.setStartDate(date);input.setEndDate(date);input.setLeaveType(com.shiftsync.leave.enums.LeaveType.ANNUAL);
        var leave=leaveService.createLeaveRequest(store,staff,input);
        leaveService.approveLeaveRequest(store,leave.getId(),manager);
        assertEquals("APPROVED",jdbc.queryForObject("select status::text from leave_request where id=?",String.class,leave.getId()));
        assertEquals(0,count(night));
        assertEquals(1,jdbc.queryForObject("select count(*) from blackout_date where leave_request_id=? and date=?",Integer.class,leave.getId(),date));
    }

    @Test void leaveApprovalPreservesCompletedAssignmentInsidePaidPeriod() {
        UUID store=store(),staff=person(),manager=person(),skill=skill(store);
        employ(store,staff,skill,"EXPERT");
        jdbc.update("update staff set system_role='ADMIN' where id=?",manager);
        LocalDate workedDay=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(3);
        jdbc.update("update employment set joined_date=? where store_id=? and staff_id=?",workedDay.minusMonths(3),store,staff);
        UUID shift=shift(store,skill),assignment=UUID.randomUUID(),attendance=UUID.randomUUID();
        jdbc.update("update shift set shift_date=?,status='COMPLETED' where id=?",workedDay,shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignment,shift,staff,skill);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",
                attendance,assignment,workedDay.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),workedDay.atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        UUID period=UUID.randomUUID();
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'PAID')",period,store,workedDay,workedDay.plusDays(1));
        var blocked=assertThrows(com.shiftsync.shared.exception.BusinessException.class,
                ()->manual.unassignStaffFromShift(store,shift,staff));
        assertTrue(blocked.getMessage().contains("LOCKED/PAID"));
        assertFalse(jdbc.queryForObject("select deleted from shift_assignment where id=?",Boolean.class,assignment));

        var input=new com.shiftsync.leave.dto.LeaveCreateRequest();
        input.setStartDate(workedDay);input.setEndDate(workedDay);input.setLeaveType(com.shiftsync.leave.enums.LeaveType.SICK);
        var leave=leaveService.createLeaveRequest(store,staff,input);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->leaveService.approveLeaveRequest(store,leave.getId(),manager));

        assertEquals("PENDING",jdbc.queryForObject("select status::text from leave_request where id=?",String.class,leave.getId()));
        assertFalse(jdbc.queryForObject("select deleted from shift_assignment where id=?",Boolean.class,assignment));
        assertTrue(assignments.findByShiftIdAndStaffId(shift,staff).isPresent());
        assertFalse(jdbc.queryForObject("select deleted from attendance where id=?",Boolean.class,attendance));
        assertEquals("COMPLETED",jdbc.queryForObject("select status::text from shift where id=?",String.class,shift));
        assertEquals("PAID",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
    }

    @Test void concurrentEmploymentCreationAllowsOnlyOneActiveMembership() throws Exception {
        UUID store=store(),staff=person(),contract=UUID.randomUUID();
        jdbc.update("insert into contract_type(id,store_id,name,max_weekly_hours,ot_multiplier,default_hourly_rate) values (?,?,?,48,1.5,30000)",contract,store,"Concurrent contract "+contract);
        var bothChecked=new CountDownLatch(2);
        var realEmployments=new org.springframework.data.jpa.repository.support.JpaRepositoryFactory(entityManager)
                .getRepository(com.shiftsync.employment.repository.EmploymentRepository.class);
        doAnswer(call -> {
            boolean exists=realEmployments.existsByUserIdAndStoreIdAndStatus(staff,store,com.shiftsync.employment.enums.EmploymentStatus.ACTIVE);
            bothChecked.countDown();
            assertTrue(bothChecked.await(15,TimeUnit.SECONDS),"Both real existence queries must finish before inserts");
            assertFalse(exists);
            return exists;
        }).when(employments).existsByUserIdAndStoreIdAndStatus(staff,store,com.shiftsync.employment.enums.EmploymentStatus.ACTIVE);
        var input=new com.shiftsync.employment.dto.EmploymentCreateRequest();
        input.setStaffId(staff);input.setContractTypeId(contract);input.setHourlyRate(java.math.BigDecimal.valueOf(30000));input.setJoinedDate(LocalDate.now().minusDays(1));
        var executor=Executors.newFixedThreadPool(2);
        try {
            var first=executor.submit(()->employmentService.assignStaffToStore(store,input));
            var second=executor.submit(()->employmentService.assignStaffToStore(store,input));
            int succeeded=0, conflicted=0;
            for (var future : List.of(first,second)) {
                try { future.get(25,TimeUnit.SECONDS); succeeded++; }
                catch (ExecutionException ex) {
                    assertInstanceOf(com.shiftsync.shared.exception.BusinessException.class,ex.getCause());
                    assertEquals(409,((com.shiftsync.shared.exception.BusinessException) ex.getCause()).getStatus().value());
                    conflicted++;
                }
            }
            assertEquals(1,succeeded); assertEquals(1,conflicted);
        } finally {
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(10,TimeUnit.SECONDS));
        }
        reset(employments);
        assertEquals(1,jdbc.queryForObject("select count(*) from employment where staff_id=? and store_id=? and status='ACTIVE'",Integer.class,staff,store));
        employmentService.removeStaffFromStore(store,staff);
        assertEquals(0,jdbc.queryForObject("select count(*) from employment where staff_id=? and store_id=? and status='ACTIVE'",Integer.class,staff,store));
        assertFalse(employments.isStaffInStore(staff,store,com.shiftsync.employment.enums.EmploymentStatus.ACTIVE));
    }

    @Test void legacyLeaveCanBeReconciledUsingVerifiedAssignmentIds() {
        UUID store=store(),staff=person(),manager=person(),role=skill(store);employ(store,staff,role,"EXPERT");
        jdbc.update("update staff set system_role='ADMIN' where id=?",manager);
        UUID shift=shift(store,role),assignment=UUID.randomUUID();
        jdbc.update("update shift set status='PUBLISHED' where id=?",shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignment,shift,staff,role);
        var input=new com.shiftsync.leave.dto.LeaveCreateRequest();input.setStartDate(date);input.setEndDate(date);input.setLeaveType(com.shiftsync.leave.enums.LeaveType.ANNUAL);
        var leave=leaveService.createLeaveRequest(store,staff,input);
        leaveService.approveLeaveRequest(store,leave.getId(),manager);
        jdbc.update("delete from leave_removed_assignment where leave_request_id=?",leave.getId());
        jdbc.update("update leave_request set assignment_provenance_complete=false where id=?",leave.getId());
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->payrollCalculator.generatePayroll(store,date,date.plusDays(1)));
        assertEquals(assignment,leaveService.getProvenanceCandidates(store,leave.getId()).get(0).getAssignmentId());
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->leaveService.reconcileProvenance(store,leave.getId(),List.of(UUID.randomUUID()),"Đối chiếu",manager));
        leaveService.reconcileProvenance(store,leave.getId(),List.of(assignment),"Đối chiếu lịch đã duyệt",manager);
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        assertEquals(8.0,jdbc.queryForObject("select p.total_hours from payroll p join payroll_period pp on pp.id=p.payroll_period_id where pp.store_id=? and p.staff_id=?",Double.class,store,staff));
    }

    @Test void paidLeaveRecoversBothAssignmentsRemovedByApproval() {
        UUID store=store(),staff=person(),manager=person(),role=skill(store);employ(store,staff,role,"EXPERT");
        jdbc.update("update staff set system_role='ADMIN' where id=?",manager);
        UUID first=shift(store,role);
        jdbc.update("update shift set start_time='08:00',end_time='12:00',status='PUBLISHED' where id=?",first);
        UUID second=shift(store,role);
        jdbc.update("update shift set start_time='15:00',end_time='19:00',status='PUBLISHED' where id=?",second);
        for (UUID id : List.of(first,second)) jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",UUID.randomUUID(),id,staff,role);
        var input=new com.shiftsync.leave.dto.LeaveCreateRequest();
        input.setStartDate(date);input.setEndDate(date);input.setLeaveType(com.shiftsync.leave.enums.LeaveType.ANNUAL);
        var leave=leaveService.createLeaveRequest(store,staff,input);
        leaveService.approveLeaveRequest(store,leave.getId(),manager);
        assertEquals(2,jdbc.queryForObject("select count(*) from leave_removed_assignment where leave_request_id=?",Integer.class,leave.getId()));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        assertEquals(8.0,jdbc.queryForObject("select p.total_hours from payroll p join payroll_period pp on pp.id=p.payroll_period_id where pp.store_id=? and p.staff_id=?",Double.class,store,staff));
    }

    @Test void paidLeaveDoesNotUseAnotherStoresShiftHours() {
        UUID own=store(),foreign=store(),staff=person(),manager=person();
        UUID ownSkill=skill(own),foreignSkill=skill(foreign);
        employ(own,staff,ownSkill,"EXPERT");employ(foreign,staff,foreignSkill,"EXPERT");
        jdbc.update("update staff set system_role='ADMIN' where id=?",manager);
        UUID foreignShift=shift(foreign,foreignSkill),assignment=UUID.randomUUID();
        jdbc.update("update shift set status='PUBLISHED' where id=?",foreignShift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignment,foreignShift,staff,foreignSkill);
        assertEquals(0,jdbc.queryForObject("select count(*) from shift where store_id=?",Integer.class,own));
        var input=new com.shiftsync.leave.dto.LeaveCreateRequest();
        input.setStartDate(date);input.setEndDate(date);input.setLeaveType(com.shiftsync.leave.enums.LeaveType.SICK);
        var leave=leaveService.createLeaveRequest(own,staff,input);
        leaveService.approveLeaveRequest(own,leave.getId(),manager);
        assertTrue(jdbc.queryForObject("select deleted from shift_assignment where id=?",Boolean.class,assignment));

        payrollCalculator.generatePayroll(own,date,date.plusDays(1));
        String payrollQuery="select p.%s from payroll p join payroll_period pp on pp.id=p.payroll_period_id where pp.store_id=? and p.staff_id=? and p.deleted=false";
        assertEquals(0.0,jdbc.queryForObject(payrollQuery.formatted("total_hours"),Double.class,own,staff));
        assertEquals(0.0,jdbc.queryForObject(payrollQuery.formatted("total_amount"),Double.class,own,staff));

        jdbc.update("update shift set end_time='13:00' where id=?",foreignShift);
        payrollCalculator.generatePayroll(own,date,date.plusDays(1));
        assertEquals(0.0,jdbc.queryForObject(payrollQuery.formatted("total_hours"),Double.class,own,staff));
        assertEquals(0.0,jdbc.queryForObject(payrollQuery.formatted("total_amount"),Double.class,own,staff));
        assertEquals(0,jdbc.queryForObject("select count(*) from shift where store_id=?",Integer.class,own));
    }

    @Test void confirmationRequiresGenerationButAllowsAnActuallyEmptyPayroll() {
        UUID store=store(),admin=person(),period=UUID.randomUUID();
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(1));
        var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
        try {
            var error=assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin));
            assertTrue(error.getMessage().contains("tính bảng lương"));
            payrollCalculator.generatePayroll(store,date,date.plusDays(1));
            assertEquals(0,jdbc.queryForObject("select count(*) from payroll where payroll_period_id=?",Integer.class,period));
            payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);
            assertEquals("CONFIRMED",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
        } finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
    }

    @Test void lockedPayrollPreventsHolidayUpdateMoveAndDeletion() {
        UUID store=store(),holiday=UUID.randomUUID(),otherHoliday=UUID.randomUUID();
        assertEquals(0,jdbc.queryForObject("select count(*) from holiday where holiday_date in (?,?)",Integer.class,date,date.plusDays(3)));
        jdbc.update("insert into holiday(id,holiday_date,name,rate_multiplier) values (?,?,'Ngày kiểm thử',2)",holiday,date);
        jdbc.update("insert into holiday(id,holiday_date,name,rate_multiplier) values (?,?,'Ngày khác',2)",otherHoliday,date.plusDays(3));
        try {
            jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'CONFIRMED')",UUID.randomUUID(),store,date,date.plusDays(1));
            var change=com.shiftsync.payroll.dto.HolidayDTO.builder().holidayDate(date).name("Đã sửa").rateMultiplier(new java.math.BigDecimal("3")).build();
            var move=com.shiftsync.payroll.dto.HolidayDTO.builder().holidayDate(date.plusDays(3)).name("Đã chuyển").rateMultiplier(new java.math.BigDecimal("3")).build();
            assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->holidayService.updateHoliday(holiday,change));
            assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->holidayService.updateHoliday(holiday,move));
            assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->holidayService.updateHoliday(otherHoliday,change));
            assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->holidayService.deleteHoliday(holiday));
            assertEquals(date,jdbc.queryForObject("select holiday_date from holiday where id=?",LocalDate.class,holiday));
            assertEquals(2.0,jdbc.queryForObject("select rate_multiplier from holiday where id=?",Double.class,holiday));
        } finally {jdbc.update("delete from holiday where id in (?,?)",holiday,otherHoliday);}
    }

    @Test void confirmationWaitsForHolidayCreationAndRejectsStalePayroll() throws Exception {
        UUID store=store(),staff=person(),admin=person(),role=skill(store),assignment=UUID.randomUUID();
        employ(store,staff,role,"EXPERT");
        assertEquals(0,jdbc.queryForObject("select count(*) from holiday where holiday_date=?",Integer.class,date));
        UUID shift=shift(store,role);
        jdbc.update("update shift set status='COMPLETED' where id=?",shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignment,shift,staff,role);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",
                UUID.randomUUID(),assignment,date.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),date.atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        UUID period=jdbc.queryForObject("select id from payroll_period where store_id=?",UUID.class,store);
        var saved=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(1);
        var delegate=mockingDetails(holidayRows).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);if(Thread.currentThread().getName().equals("holiday-create-race")) {
            saved.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));}return result;}).when(holidayRows).save(any());
        var pool=Executors.newFixedThreadPool(2);
        UUID holidayId=null;
        try {
            var holiday=pool.submit(()->{Thread.currentThread().setName("holiday-create-race");return holidayService.createHoliday(com.shiftsync.payroll.dto.HolidayDTO.builder().holidayDate(date).name("Ngày kiểm thử "+UUID.randomUUID()).rateMultiplier(new java.math.BigDecimal("3")).build());});
            assertTrue(saved.await(15,TimeUnit.SECONDS));
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {started.countDown();serializableRetry.execute(()->{payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);return null;});}
                finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
            });
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->confirmation.get(300,TimeUnit.MILLISECONDS));
            release.countDown();holidayId=holiday.get(15,TimeUnit.SECONDS).getId();
            var failure=assertThrows(ExecutionException.class,()->confirmation.get(15,TimeUnit.SECONDS));
            assertInstanceOf(com.shiftsync.shared.exception.BusinessException.class,failure.getCause());
            assertTrue(failure.getCause().getMessage().contains("tính lại"));
            assertEquals("DRAFT",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
            assertEquals(240000.0,jdbc.queryForObject("select total_amount from payroll where payroll_period_id=? and staff_id=?",Double.class,period,staff));
        } finally {
            release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));
            if(holidayId!=null) jdbc.update("delete from holiday where id=?",holidayId);
        }
    }

    @Test void holidayCreationWaitsForConfirmationAndRejectsLockedDate() throws Exception {
        UUID store=store(),staff=person(),admin=person(),role=skill(store),assignment=UUID.randomUUID();
        employ(store,staff,role,"EXPERT");
        assertEquals(0,jdbc.queryForObject("select count(*) from holiday where holiday_date=?",Integer.class,date));
        UUID shift=shift(store,role);
        jdbc.update("update shift set status='COMPLETED' where id=?",shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignment,shift,staff,role);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",
                UUID.randomUUID(),assignment,date.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),date.atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        UUID period=jdbc.queryForObject("select id from payroll_period where store_id=?",UUID.class,store);
        var read=new CountDownLatch(1);var release=new CountDownLatch(1);
        var delegate=mockingDetails(holidayRows).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);if(Thread.currentThread().getName().equals("holiday-race")) {
            read.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));}return result;})
                .when(holidayRows).findByHolidayDateBetween(date,date.plusDays(1));
        var pool=Executors.newFixedThreadPool(2);
        var started=new CountDownLatch(1);
        try {
            var confirmation=pool.submit(()->{
                Thread.currentThread().setName("holiday-race");
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);}
                finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
            });
            assertTrue(read.await(15,TimeUnit.SECONDS));
            var holiday=pool.submit(()->{started.countDown();return holidayService.createHoliday(com.shiftsync.payroll.dto.HolidayDTO.builder().holidayDate(date).name("Ngày kiểm thử "+UUID.randomUUID()).rateMultiplier(new java.math.BigDecimal("3")).build());});
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->holiday.get(300,TimeUnit.MILLISECONDS));
            release.countDown();confirmation.get(15,TimeUnit.SECONDS);
            var failure=assertThrows(ExecutionException.class,()->holiday.get(15,TimeUnit.SECONDS));
            assertInstanceOf(com.shiftsync.shared.exception.BusinessException.class,failure.getCause());
            assertEquals("CONFIRMED",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
            assertEquals(240000.0,jdbc.queryForObject("select total_amount from payroll where payroll_period_id=? and staff_id=?",Double.class,period,staff));
            assertEquals(0,jdbc.queryForObject("select count(*) from holiday where holiday_date=?",Integer.class,date));
        } finally {
            release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));
        }
    }

    @Test void confirmationRejectsPayrollMadeStaleByAttendanceEdit() {
        UUID store=store(),staff=person(),admin=person(),role=skill(store),assignment=UUID.randomUUID(),attendance=UUID.randomUUID();
        employ(store,staff,role,"EXPERT");
        UUID shift=shift(store,role);
        jdbc.update("update shift set status='COMPLETED' where id=?",shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignment,shift,staff,role);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",
                attendance,assignment,date.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),date.atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        UUID period=jdbc.queryForObject("select id from payroll_period where store_id=?",UUID.class,store);
        assertEquals(240000.0,jdbc.queryForObject("select total_amount from payroll where payroll_period_id=? and staff_id=?",Double.class,period,staff));
        var edit=new com.shiftsync.attendance.dto.AttendanceUpdateRequest();edit.setCheckOutTime(date.atTime(13,0).atOffset(ZoneOffset.ofHours(7)));
        attendanceService.updateAttendance(store,attendance,edit);
        var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
        try {
            var error=assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin));
            assertTrue(error.getMessage().contains("tính lại"));
            assertEquals("DRAFT",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
            payrollCalculator.generatePayroll(store,date,date.plusDays(1));
            payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);
        }
        finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
        assertEquals("CONFIRMED",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
        assertEquals(4.0,jdbc.queryForObject("select extract(epoch from(check_out_time-check_in_time))/3600 from attendance where id=?",Double.class,attendance));
        assertEquals(120000.0,jdbc.queryForObject("select total_amount from payroll where payroll_period_id=? and staff_id=?",Double.class,period,staff));
    }

    @Test void regenerationAndPaymentAreSerializedOnPeriod() throws Exception {
        UUID store=store(),staff=person(),admin=person(),skill=skill(store);
        employ(store,staff,skill,"EXPERT");
        jdbc.update("update staff set system_role='ADMIN' where id=?",admin);
        UUID shift=shift(store,skill),assignment=UUID.randomUUID();
        jdbc.update("update shift set status='COMPLETED' where id=?",shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignment,shift,staff,skill);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",
                UUID.randomUUID(),assignment,date.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),date.atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        UUID period=jdbc.queryForObject("select id from payroll_period where store_id=?",UUID.class,store);
        UUID original=jdbc.queryForObject("select id from payroll where payroll_period_id=?",UUID.class,period);
        assertEquals(240000.0,jdbc.queryForObject("select total_amount from payroll where id=?",Double.class,original));
        jdbc.update("update attendance set check_out_time=? where shift_assignment_id=?",date.atTime(13,0).atOffset(ZoneOffset.ofHours(7)),assignment);

        var readyToDelete=new CountDownLatch(1);var resume=new CountDownLatch(1);var paymentStarted=new CountDownLatch(1);
        var realPayrolls=new org.springframework.data.jpa.repository.support.JpaRepositoryFactory(entityManager)
                .getRepository(com.shiftsync.payroll.repository.PayrollRepository.class);
        doAnswer(call -> {
            readyToDelete.countDown();
            assertTrue(resume.await(20,TimeUnit.SECONDS));
            realPayrolls.hardDeleteByPayrollPeriodId(period);
            return null;
        }).when(payrollRows).hardDeleteByPayrollPeriodId(period);
        var executor=Executors.newFixedThreadPool(2);
        try {
            var regeneration=executor.submit(()->payrollCalculator.generatePayroll(store,date,date.plusDays(1)));
            assertTrue(readyToDelete.await(20,TimeUnit.SECONDS));
            var payment=executor.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder()
                        .id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                        new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {
                    paymentStarted.countDown();
                    serializableRetry.execute(()->{payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);return null;});
                    serializableRetry.execute(()->{payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID,admin);return null;});
                } finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
            });
            assertTrue(paymentStarted.await(10,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->payment.get(300,TimeUnit.MILLISECONDS));
            assertEquals(240000.0,jdbc.queryForObject("select total_amount from payroll where id=?",Double.class,original));
            resume.countDown();
            regeneration.get(25,TimeUnit.SECONDS);
            payment.get(25,TimeUnit.SECONDS);
        } finally {
            resume.countDown();executor.shutdownNow();
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
            assertTrue(executor.awaitTermination(10,TimeUnit.SECONDS));
        }
        assertEquals("PAID",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
        assertEquals(0,jdbc.queryForObject("select count(*) from payroll where id=?",Integer.class,original));
        assertEquals(120000.0,jdbc.queryForObject("select total_amount from payroll where payroll_period_id=?",Double.class,period));
    }

    @Test void swapApprovalRejectsEmployeeWhoLeftStore() {
        UUID store=store(),a=person(),b=person(),admin=person(),skill=skill(store);
        employ(store,a,skill,"EXPERT");employ(store,b,skill,"EXPERT");
        UUID otherStore=store(),otherSkill=skill(otherStore);
        employ(otherStore,b,otherSkill,"EXPERT");
        jdbc.update("update employment set joined_date=? where store_id=?",LocalDate.now().minusMonths(3),store);
        jdbc.update("update staff set system_role='ADMIN' where id=?",admin);
        UUID first=shift(store,skill);
        jdbc.update("update shift set status='PUBLISHED',shift_date=? where id=?",date.plusDays(7),first);
        UUID second=shift(store,skill);
        jdbc.update("update shift set status='PUBLISHED' where id=?",second);
        UUID assignmentA=UUID.randomUUID(),assignmentB=UUID.randomUUID();
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignmentA,first,a,skill);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignmentB,second,b,skill);
        UUID request=swaps.createSwapRequest(a,first,b,second).getId();
        swaps.respondToSwapRequest(request,b,true);
        employmentService.removeStaffFromStore(store,b);
        assertFalse(employments.isStaffInStore(b,store,com.shiftsync.employment.enums.EmploymentStatus.ACTIVE));
        var blocked=assertThrows(com.shiftsync.shared.exception.BusinessException.class,
                ()->manual.assignStaffToShift(store,first,b));
        assertTrue(blocked.getMessage().contains("Employment Inactive"));

        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->swaps.managerApproveSwapRequest(request,admin));

        assertEquals("PENDING",jdbc.queryForObject("select status::text from shift_swap_request where id=?",String.class,request));
        assertEquals(a,jdbc.queryForObject("select staff_id from shift_assignment where id=? and deleted=false",UUID.class,assignmentA));
        assertEquals(b,jdbc.queryForObject("select staff_id from shift_assignment where id=? and deleted=false",UUID.class,assignmentB));
        assertFalse(employments.isStaffInStore(b,store,com.shiftsync.employment.enums.EmploymentStatus.ACTIVE));
    }

    @Test void swapApprovalCannotRacePayrollConfirmation() throws Exception {
        UUID store=store(),a=person(),b=person(),admin=person(),skill=skill(store);
        employ(store,a,skill,"EXPERT");employ(store,b,skill,"EXPERT");
        jdbc.update("update staff set system_role='ADMIN' where id=?",admin);
        UUID first=shift(store,skill),assignmentA=UUID.randomUUID(),assignmentB=UUID.randomUUID();
        jdbc.update("update shift set status='PUBLISHED',shift_date=? where id=?",date.plusDays(7),first);
        UUID second=shift(store,skill);
        jdbc.update("update shift set status='PUBLISHED' where id=?",second);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignmentA,first,a,skill);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignmentB,second,b,skill);
        UUID swap=swaps.createSwapRequest(a,first,b,second).getId();swaps.respondToSwapRequest(swap,b,true);
        UUID period=UUID.randomUUID();
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(8));
        payrollCalculator.generatePayroll(store,date,date.plusDays(8));
        var checked=new CountDownLatch(1);var release=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);if(Thread.currentThread().getName().equals("swap-race") && !Boolean.TRUE.equals(result)) {
            checked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));}return result;})
                .when(payrollPeriods).existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(eq(store),any(),any(),any());
        var pool=Executors.newFixedThreadPool(2);
        try {
            var approval=pool.submit(()->{Thread.currentThread().setName("swap-race");swaps.managerApproveSwapRequest(swap,admin);});
            assertTrue(checked.await(15,TimeUnit.SECONDS));
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {serializableRetry.execute(()->{payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);return null;});}
                finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
            });
            assertThrows(TimeoutException.class,()->confirmation.get(300,TimeUnit.MILLISECONDS));
            release.countDown();approval.get(15,TimeUnit.SECONDS);confirmation.get(15,TimeUnit.SECONDS);
            assertEquals("APPROVED",jdbc.queryForObject("select status::text from shift_swap_request where id=?",String.class,swap));
            assertEquals(b,jdbc.queryForObject("select staff_id from shift_assignment where id=?",UUID.class,assignmentA));
            assertEquals(a,jdbc.queryForObject("select staff_id from shift_assignment where id=?",UUID.class,assignmentB));
            assertEquals("CONFIRMED",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
        } finally {release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }

    @Test void swapApprovalWaitsForPayrollConfirmationAndPreservesAssignments() throws Exception {
        UUID store=store(),a=person(),b=person(),admin=person(),skill=skill(store);
        employ(store,a,skill,"EXPERT");employ(store,b,skill,"EXPERT");
        jdbc.update("update staff set system_role='ADMIN' where id=?",admin);
        UUID first=shift(store,skill),assignmentA=UUID.randomUUID(),assignmentB=UUID.randomUUID();
        jdbc.update("update shift set status='PUBLISHED',shift_date=? where id=?",date.plusDays(7),first);
        UUID second=shift(store,skill);
        jdbc.update("update shift set status='PUBLISHED' where id=?",second);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignmentA,first,a,skill);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignmentB,second,b,skill);
        UUID swap=swaps.createSwapRequest(a,first,b,second).getId();swaps.respondToSwapRequest(swap,b,true);
        UUID period=UUID.randomUUID();
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(8));
        payrollCalculator.generatePayroll(store,date,date.plusDays(8));
        var locked=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);locked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));return result;})
                .when(payrollPeriods).findByIdForUpdate(period);
        var pool=Executors.newFixedThreadPool(2);
        try {
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);}
                finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
            });
            assertTrue(locked.await(15,TimeUnit.SECONDS));
            var approval=pool.submit(()->{started.countDown();swaps.managerApproveSwapRequest(swap,admin);});
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->approval.get(300,TimeUnit.MILLISECONDS));
            release.countDown();confirmation.get(15,TimeUnit.SECONDS);
            assertThrows(ExecutionException.class,()->approval.get(15,TimeUnit.SECONDS));
            assertEquals("PENDING",jdbc.queryForObject("select status::text from shift_swap_request where id=?",String.class,swap));
            assertEquals(a,jdbc.queryForObject("select staff_id from shift_assignment where id=?",UUID.class,assignmentA));
            assertEquals(b,jdbc.queryForObject("select staff_id from shift_assignment where id=?",UUID.class,assignmentB));
            assertEquals("CONFIRMED",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
        } finally {release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }

    @Test void swapApprovalRejectsConfirmedPayrollPeriod() {
        UUID store=store(),a=person(),b=person(),admin=person(),skill=skill(store);
        employ(store,a,skill,"EXPERT");employ(store,b,skill,"EXPERT");
        jdbc.update("update staff set system_role='ADMIN' where id=?",admin);
        UUID first=shift(store,skill);
        jdbc.update("update shift set status='PUBLISHED',shift_date=? where id=?",date.plusDays(7),first);
        UUID second=shift(store,skill);
        jdbc.update("update shift set status='PUBLISHED' where id=?",second);
        UUID assignmentA=UUID.randomUUID(),assignmentB=UUID.randomUUID();
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignmentA,first,a,skill);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignmentB,second,b,skill);
        UUID swap=swaps.createSwapRequest(a,first,b,second).getId();
        swaps.respondToSwapRequest(swap,b,true);
        payrollCalculator.generatePayroll(store,date,date.plusDays(8));
        UUID period=jdbc.queryForObject("select id from payroll_period where store_id=?",UUID.class,store);
        var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder()
                .id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
        try {
            payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
        var blocked=assertThrows(com.shiftsync.shared.exception.BusinessException.class,
                ()->manual.unassignStaffFromShift(store,first,a));
        assertTrue(blocked.getMessage().contains("LOCKED/PAID"));

        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->swaps.managerApproveSwapRequest(swap,admin));

        assertEquals("CONFIRMED",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
        assertEquals("PENDING",jdbc.queryForObject("select status::text from shift_swap_request where id=?",String.class,swap));
        assertEquals(a,jdbc.queryForObject("select staff_id from shift_assignment where id=? and deleted=false",UUID.class,assignmentA));
        assertEquals(b,jdbc.queryForObject("select staff_id from shift_assignment where id=? and deleted=false",UUID.class,assignmentB));
    }

    @Test void deletedAttendanceAllowsApprovalOfReplacementAdjustment() {
        UUID store=store(),staff=person(),admin=person(),skill=skill(store);
        employ(store,staff,skill,"EXPERT");
        LocalDate day=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(3);
        jdbc.update("update employment set joined_date=? where store_id=?",day.minusMonths(3),store);
        jdbc.update("update staff set system_role='ADMIN' where id=?",admin);
        UUID shift=shift(store,skill),assignment=UUID.randomUUID(),attendance=UUID.randomUUID();
        jdbc.update("update shift set status='COMPLETED',shift_date=? where id=?",day,shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignment,shift,staff,skill);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",
                attendance,assignment,day.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),day.atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        attendanceService.deleteAttendance(store,attendance);
        assertTrue(jdbc.queryForObject("select deleted from attendance where id=?",Boolean.class,attendance));
        var input=new com.shiftsync.attendance.dto.AdjustmentCreateRequest();
        input.setShiftId(shift);input.setReason("Restore corrected attendance after deletion");
        input.setRequestedCheckIn(day.atTime(9,0).atOffset(ZoneOffset.ofHours(7)));
        input.setRequestedCheckOut(day.atTime(16,0).atOffset(ZoneOffset.ofHours(7)));
        UUID request=adjustmentService.createRequest(staff,input).getId();

        adjustmentService.approveRequest(store,request,admin);
        assertEquals("APPROVED",jdbc.queryForObject("select status::text from attendance_adjustment_request where id=?",String.class,request));
        assertEquals(2,jdbc.queryForObject("select count(*) from attendance where shift_assignment_id=?",Integer.class,assignment));
        assertEquals(1,jdbc.queryForObject("select count(*) from attendance where shift_assignment_id=? and deleted=false",Integer.class,assignment));
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
                jdbc.update("insert into attendance(id,shift_assignment_id,status) values (?,?,'PRESENT')",UUID.randomUUID(),assignment));
    }

    @Test void adjustmentApprovalCannotRacePayrollConfirmation() throws Exception {
        UUID store=store(),staff=person(),admin=person(),role=skill(store),shift=shift(store,role),assignment=UUID.randomUUID(),period=UUID.randomUUID();
        employ(store,staff,role,"EXPERT");jdbc.update("update staff set system_role='ADMIN' where id=?",admin);
        jdbc.update("update shift set status='PUBLISHED' where id=?",shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')",assignment,shift,staff);
        var input=new com.shiftsync.attendance.dto.AdjustmentCreateRequest();input.setShiftId(shift);input.setReason("Bổ sung giờ chấm công");
        input.setRequestedCheckIn(date.atTime(9,0).atOffset(ZoneOffset.ofHours(7)));
        UUID request=adjustmentService.createRequest(staff,input).getId();
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,store,date,date.plusDays(1));
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        var checked=new CountDownLatch(1);var release=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);if(Thread.currentThread().getName().equals("adjustment-race") && !Boolean.TRUE.equals(result)) {
            checked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));}return result;})
                .when(payrollPeriods).existsByStoreIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndStatusIn(eq(store),any(),any(),any());
        var pool=Executors.newFixedThreadPool(2);
        try {
            var approval=pool.submit(()->{Thread.currentThread().setName("adjustment-race");adjustmentService.approveRequest(store,request,admin);});
            assertTrue(checked.await(15,TimeUnit.SECONDS));
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);}
                finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
            });
            assertThrows(TimeoutException.class,()->confirmation.get(300,TimeUnit.MILLISECONDS));release.countDown();
            approval.get(15,TimeUnit.SECONDS);confirmation.get(15,TimeUnit.SECONDS);
            assertEquals("APPROVED",jdbc.queryForObject("select status::text from attendance_adjustment_request where id=?",String.class,request));
        } finally {release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }

    @Test void adjustmentApprovalWaitsForHomeStorePayrollConfirmation() throws Exception {
        UUID receiving=store(),home=store(),staff=person(),admin=person(),role=skill(receiving),shift=shift(receiving,role),assignment=UUID.randomUUID(),period=UUID.randomUUID();
        employ(home,staff,role,"EXPERT");jdbc.update("update staff set system_role='ADMIN' where id=?",admin);
        UUID employment=jdbc.queryForObject("select id from employment where store_id=? and staff_id=?",UUID.class,home,staff);
        jdbc.update("update shift set status='PUBLISHED' where id=?",shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source,support_employment_id) values (?,?,?,?,'WORKFORCE_SHARING',?)",assignment,shift,staff,role,employment);
        var input=new com.shiftsync.attendance.dto.AdjustmentCreateRequest();input.setShiftId(shift);input.setReason("Bổ sung giờ chấm công");
        input.setRequestedCheckIn(date.atTime(9,0).atOffset(ZoneOffset.ofHours(7)));
        UUID request=adjustmentService.createRequest(staff,input).getId();
        jdbc.update("insert into payroll_period(id,store_id,start_date,end_date,status) values (?,?,?,?,'DRAFT')",period,home,date,date.plusDays(1));
        payrollCalculator.generatePayroll(home,date,date.plusDays(1));
        var locked=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(1);
        var delegate=mockingDetails(payrollPeriods).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{Object result=delegate.answer(call);locked.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));return result;})
                .when(payrollPeriods).findByIdForUpdate(period);
        var pool=Executors.newFixedThreadPool(2);
        try {
            var confirmation=pool.submit(()->{
                var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder().id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
                org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
                try {payrollCalculator.updatePayrollPeriodStatus(home,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);}
                finally {org.springframework.security.core.context.SecurityContextHolder.clearContext();}
            });
            assertTrue(locked.await(15,TimeUnit.SECONDS));
            var approval=pool.submit(()->{started.countDown();adjustmentService.approveRequest(receiving,request,admin);});
            assertTrue(started.await(15,TimeUnit.SECONDS));assertThrows(TimeoutException.class,()->approval.get(300,TimeUnit.MILLISECONDS));
            release.countDown();confirmation.get(15,TimeUnit.SECONDS);assertThrows(ExecutionException.class,()->approval.get(15,TimeUnit.SECONDS));
            assertEquals("PENDING",jdbc.queryForObject("select status::text from attendance_adjustment_request where id=?",String.class,request));
            assertEquals(0,jdbc.queryForObject("select count(*) from attendance where shift_assignment_id=? and deleted=false",Integer.class,assignment));
        } finally {release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }

    @Test void concurrentRejectAndApproveCannotOverwriteEachOther() throws Exception {
        UUID store=store(),staff=person(),admin=person(),skill=skill(store);
        employ(store,staff,skill,"EXPERT");
        LocalDate day=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(3);
        jdbc.update("update employment set joined_date=? where store_id=?",day.minusMonths(3),store);
        jdbc.update("update staff set system_role='ADMIN' where id=?",admin);
        UUID shift=shift(store,skill),assignment=UUID.randomUUID(),attendance=UUID.randomUUID();
        jdbc.update("update shift set status='COMPLETED',shift_date=? where id=?",day,shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignment,shift,staff,skill);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",
                attendance,assignment,day.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),day.atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        var input=new com.shiftsync.attendance.dto.AdjustmentCreateRequest();
        input.setShiftId(shift);input.setAttendanceId(attendance);input.setReason("Correct checkout");
        input.setRequestedCheckOut(day.atTime(16,0).atOffset(ZoneOffset.ofHours(7)));
        UUID request=adjustmentService.createRequest(staff,input).getId();
        var rejectionRead=new CountDownLatch(1);var releaseRejection=new CountDownLatch(1);
        var firstRead=new java.util.concurrent.atomic.AtomicBoolean(true);
        var realRequests=new org.springframework.data.jpa.repository.support.JpaRepositoryFactory(entityManager)
                .getRepository(com.shiftsync.attendance.repository.AttendanceAdjustmentRequestRepository.class);
        doAnswer(call -> {
            var row=realRequests.findByIdForUpdate(request);
            if(firstRead.getAndSet(false)) {
                assertEquals(com.shiftsync.attendance.enums.AdjustmentStatus.PENDING,row.orElseThrow().getStatus());
                rejectionRead.countDown();
                assertTrue(releaseRejection.await(20,TimeUnit.SECONDS));
            }
            return row;
        }).when(adjustmentRows).findByIdForUpdate(request);
        var executor=Executors.newFixedThreadPool(2);
        try {
            var rejection=executor.submit(()->adjustmentService.rejectRequest(store,request,admin,"Not accepted"));
            assertTrue(rejectionRead.await(20,TimeUnit.SECONDS));
            var approval=executor.submit(()->adjustmentService.approveRequest(store,request,admin));
            assertThrows(TimeoutException.class,()->approval.get(300,TimeUnit.MILLISECONDS));
            releaseRejection.countDown();
            assertEquals(com.shiftsync.attendance.enums.AdjustmentStatus.REJECTED,rejection.get(25,TimeUnit.SECONDS).getStatus());
            var error=assertThrows(ExecutionException.class,()->approval.get(25,TimeUnit.SECONDS));
            assertInstanceOf(com.shiftsync.shared.exception.BusinessException.class,error.getCause());
        } finally {
            releaseRejection.countDown();executor.shutdownNow();
            assertTrue(executor.awaitTermination(10,TimeUnit.SECONDS));
        }
        assertEquals("REJECTED",jdbc.queryForObject("select status::text from attendance_adjustment_request where id=?",String.class,request));
        assertEquals(17,jdbc.queryForObject("select extract(hour from check_out_time at time zone 'Asia/Ho_Chi_Minh') from attendance where id=?",Integer.class,attendance));
    }

    @Test void rehireKeepsOriginalEmploymentRateForHistoricalWork() {
        UUID store=store(),staff=person(),contract=UUID.randomUUID();
        LocalDate today=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")),workedDay=today.minusDays(30);
        jdbc.update("insert into contract_type(id,store_id,name,max_weekly_hours,ot_multiplier,default_hourly_rate) values (?,?,?,48,1.5,30000)",contract,store,"Rehire contract "+contract);
        var input=new com.shiftsync.employment.dto.EmploymentCreateRequest();
        input.setStaffId(staff);input.setContractTypeId(contract);input.setHourlyRate(java.math.BigDecimal.valueOf(30000));input.setJoinedDate(today.minusDays(60));
        UUID originalEmployment=employmentService.assignStaffToStore(store,input).getId();
        seedKnownHistory("contract_type",contract,workedDay.minusDays(1));
        seedKnownHistory("employment",originalEmployment,workedDay.minusDays(1));
        UUID shift=UUID.randomUUID(),assignment=UUID.randomUUID(),attendance=UUID.randomUUID();
        // A generic shift has no required skill rate, so payroll uses the employment rate.
        jdbc.update("insert into shift(id,store_id,shift_date,start_time,end_time,status,is_open,availability_deadline) values (?,?,?,'09:00','17:00','COMPLETED',false,?)",
                shift,store,workedDay,workedDay.minusDays(1).atStartOfDay().atOffset(ZoneOffset.ofHours(7)));
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')",assignment,shift,staff);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",
                attendance,assignment,workedDay.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),workedDay.atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        payrollCalculator.generatePayroll(store,workedDay,workedDay.plusDays(1));
        String amountQuery="select p.total_amount from payroll p join payroll_period pp on pp.id=p.payroll_period_id where pp.store_id=? and p.staff_id=?";
        assertEquals(240000.0,jdbc.queryForObject(amountQuery,Double.class,store,staff));

        employmentService.removeStaffFromStore(store,staff);
        input.setJoinedDate(today);input.setHourlyRate(java.math.BigDecimal.valueOf(60000));
        UUID newEmployment=employmentService.assignStaffToStore(store,input).getId();
        assertNotEquals(originalEmployment,newEmployment);
        assertTrue(jdbc.queryForObject("select joined_date > ? from employment where id=?",Boolean.class,workedDay.plusDays(1),newEmployment));
        assertEquals(30000.0,jdbc.queryForObject("select hourly_rate from employment where id=?",Double.class,originalEmployment));
        payrollCalculator.generatePayroll(store,workedDay,workedDay.plusDays(1));

        assertEquals(240000.0,jdbc.queryForObject(amountQuery,Double.class,store,staff));
        assertEquals(8.0,jdbc.queryForObject("select extract(epoch from (check_out_time-check_in_time))/3600 from attendance where id=?",Double.class,attendance));
    }

    @Test void payrollCombinesRehireEpisodesWithoutDuplicatingPayslips() {
        UUID store=store(),staff=person(),contract=UUID.randomUUID();
        jdbc.update("insert into contract_type(id,store_id,name,max_weekly_hours,ot_multiplier,default_hourly_rate) values (?,?,?,48,1.5,30000)",contract,store,"Rehire "+contract);
        jdbc.update("insert into employment(id,store_id,staff_id,contract_type_id,hourly_rate,status,joined_date,left_date) values (?,?,?,?,30000,'INACTIVE',?,?)",UUID.randomUUID(),store,staff,contract,date.minusDays(30),date.plusDays(1));
        jdbc.update("insert into employment(id,store_id,staff_id,contract_type_id,hourly_rate,status,joined_date) values (?,?,?,?,60000,'ACTIVE',?)",UUID.randomUUID(),store,staff,contract,date.plusDays(3));
        for (LocalDate workDate : List.of(date,date.plusDays(7))) {
            UUID shift=UUID.randomUUID(),assignment=UUID.randomUUID();
            jdbc.update("insert into shift(id,store_id,shift_date,start_time,end_time,status,is_open,availability_deadline) values (?,?,?,'09:00','17:00','COMPLETED',false,?)",shift,store,workDate,workDate.minusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC));
            jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')",assignment,shift,staff);
            jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",UUID.randomUUID(),assignment,workDate.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),workDate.atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        }
        payrollCalculator.generatePayroll(store,date,date.plusDays(7));
        assertEquals(1,jdbc.queryForObject("select count(*) from payroll p join payroll_period pp on pp.id=p.payroll_period_id where pp.store_id=? and p.staff_id=?",Integer.class,store,staff));
        assertEquals(720000.0,jdbc.queryForObject("select p.total_amount from payroll p join payroll_period pp on pp.id=p.payroll_period_id where pp.store_id=? and p.staff_id=?",Double.class,store,staff));
    }

    @Test void configuredWeeklyHourCapLimitsManualAssignments() {
        UUID store=store(),staff=person(),admin=person(),skill=skill(store);
        employ(store,staff,skill,"EXPERT");
        jdbc.update("update staff set system_role='ADMIN' where id=?",admin);
        for(int day=1;day<=3;day++) jdbc.update("insert into availability(id,staff_id,day_of_week,start_time,end_time) values (?,?,?,'06:00','23:00')",UUID.randomUUID(),staff,day);
        var config=new com.shiftsync.store.dto.StoreConfigurationUpdateRequest();
        config.setOpenTime(LocalTime.of(6,0));config.setCloseTime(LocalTime.of(23,0));
        config.setMaxHourPerWeek(20);config.setMinRestHours(8);config.setGeofenceRadiusM(100);
        config.setAvailabilityDeadlineHours(24);config.setAllowedCheckInMinutes(30);config.setAllowedCheckOutMinutes(60);
        config.setLateGraceMinutes(5);config.setEarlyLeaveGraceMinutes(5);
        try(var factory=jakarta.validation.Validation.buildDefaultValidatorFactory()) {
            assertTrue(factory.getValidator().validate(config).isEmpty());
        }
        assertEquals(20,storeConfigurationService.updateStoreConfiguration(store,config,admin).getMaxHourPerWeek());
        assertEquals(20,jdbc.queryForObject("select max_hour_per_week from store_configuration where store_id=?",Integer.class,store));
        for(int day=1;day<=3;day++) {
            UUID shift=shift(store,skill);
            jdbc.update("update shift set shift_date=? where id=?",date.plusDays(day),shift);
            if (day < 3) manual.assignStaffToShift(store,shift,staff);
            else assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->manual.assignStaffToShift(store,shift,staff));
        }
        assertEquals(2,jdbc.queryForObject("select count(*) from shift_assignment sa join shift s on s.id=sa.shift_id where s.store_id=? and sa.staff_id=? and sa.deleted=false",Integer.class,store,staff));
        assertEquals(16.0,jdbc.queryForObject("select sum(extract(epoch from(s.end_time-s.start_time))/3600) from shift_assignment sa join shift s on s.id=sa.shift_id where s.store_id=? and sa.staff_id=? and sa.deleted=false",Double.class,store,staff));
        assertEquals(20,storeConfigurationService.getStoreConfiguration(store).getMaxHourPerWeek());
    }

    @Test void spatialAllocationCannotRetagCompletedAssignmentInsidePaidPeriod() {
        UUID store=store(),staff=person(),admin=person(),skill=skill(store);
        employ(store,staff,skill,"EXPERT");
        LocalDate day=LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusDays(3);
        UUID employment=jdbc.queryForObject("select id from employment where store_id=?",UUID.class,store);
        UUID contract=jdbc.queryForObject("select contract_type_id from employment where id=?",UUID.class,employment);
        seedKnownHistory("employment",employment,day.minusDays(1));
        seedKnownHistory("contract_type",contract,day.minusDays(1));
        jdbc.update("update employment set joined_date=? where store_id=?",day.minusMonths(3),store);
        jdbc.update("update staff set system_role='ADMIN' where id=?",admin);
        jdbc.update("update skill set name='Barista' where id=?",skill);
        UUID shift=shift(store,skill),assignment=UUID.randomUUID();
        jdbc.update("delete from shift_skill_requirement where shift_id=?",shift);
        jdbc.update("update shift set status='COMPLETED',shift_date=? where id=?",day,shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')",assignment,shift,staff);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",
                UUID.randomUUID(),assignment,day.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),day.atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        payrollCalculator.generatePayroll(store,day,day.plusDays(1));
        UUID period=jdbc.queryForObject("select id from payroll_period where store_id=?",UUID.class,store);
        var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder()
                .id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
        try {
            payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);
            payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID,admin);
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
        UUID zone=UUID.randomUUID();
        jdbc.update("insert into store_zones(id,store_id,name,x_coord,y_coord,z_coord,capacity) values (?,?,'Barista Counter',0,0,0,1)",zone,store);
        assertNull(jdbc.queryForObject("select required_skill_id from shift_assignment where id=?",UUID.class,assignment));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->manual.unassignStaffFromShift(store,shift,staff));

        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->spatialAllocator.allocateZonesForShift(store,shift));
        assertNull(jdbc.queryForObject("select zone_id from shift_assignment where id=?",UUID.class,assignment));
        assertNull(jdbc.queryForObject("select required_skill_id from shift_assignment where id=?",UUID.class,assignment));
        assertEquals("COMPLETED",jdbc.queryForObject("select status::text from shift where id=?",String.class,shift));
        assertEquals("PAID",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
    }

    @Test void auditSignedQrWritesCheckoutAfterPayrollPaidWhileSelfieIsBlocked() {
        UUID store=store(),staff=person(),admin=person(),skill=skill(store);
        employ(store,staff,skill,"EXPERT");
        ZoneId zone=ZoneId.of("Asia/Ho_Chi_Minh");
        LocalDateTime end=LocalDateTime.now(zone),begin=end.minusHours(2);
        jdbc.update("update employment set joined_date=? where store_id=?",begin.toLocalDate().minusMonths(3),store);
        jdbc.update("update staff set system_role='ADMIN' where id=?",admin);
        jdbc.update("update store set latitude=10,longitude=106 where id=?",store);
        UUID shift=shift(store,skill),assignment=UUID.randomUUID(),attendance=UUID.randomUUID();
        jdbc.update("update shift set shift_date=?,start_time=?,end_time=?,status='PUBLISHED' where id=?",begin.toLocalDate(),begin.toLocalTime(),end.toLocalTime(),shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignment,shift,staff,skill);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,status) values (?,?,?,'PRESENT')",attendance,assignment,begin.atZone(zone).toOffsetDateTime());
        payrollCalculator.generatePayroll(store,begin.toLocalDate(),begin.toLocalDate().plusDays(1));
        UUID period=jdbc.queryForObject("select id from payroll_period where store_id=?",UUID.class,store);
        var principal=new com.shiftsync.shared.security.CustomUserDetails(com.shiftsync.auth.entity.User.builder()
                .id(admin).systemRole(com.shiftsync.shared.security.SystemRole.ADMIN).build());
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal,null,principal.getAuthorities()));
        try {
            payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.CONFIRMED,admin);
            payrollCalculator.updatePayrollPeriodStatus(store,period,com.shiftsync.payroll.enums.PayrollPeriodStatus.PAID,admin);
        } finally {
            org.springframework.security.core.context.SecurityContextHolder.clearContext();
        }
        var blocked=assertThrows(com.shiftsync.shared.exception.BusinessException.class,
                ()->attendanceService.submitSelfie(staff,shift,10,106,new byte[]{1}));
        assertEquals(org.springframework.http.HttpStatus.FORBIDDEN,blocked.getStatus());
        assertTrue(jdbc.queryForObject("select check_out_time is null from attendance where id=?",Boolean.class,attendance));
        var input=new com.shiftsync.attendance.dto.QrScanRequestDTO();
        input.setQrToken(tokens.generateQrToken(shift.toString(),300000));input.setLatitude(10.0);input.setLongitude(106.0);

        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->attendanceService.scanQr(staff,input));

        assertTrue(jdbc.queryForObject("select check_out_time is null from attendance where id=?",Boolean.class,attendance));
        assertEquals("PAID",jdbc.queryForObject("select status::text from payroll_period where id=?",String.class,period));
        assertEquals(0.0,jdbc.queryForObject("select total_amount from payroll where payroll_period_id=? and staff_id=?",Double.class,period,staff));
    }

    private AutoScheduleRequest request(boolean dryRun) {
        AutoScheduleRequest request = new AutoScheduleRequest(); request.setStartDate(date); request.setEndDate(date); request.setDryRun(dryRun); return request;
    }
    private int count(UUID shift) {
        return jdbc.queryForObject("select count(*) from shift_assignment where shift_id = ? and deleted=false", Integer.class, shift);
    }
    private List<String> placements(com.shiftsync.shift.dto.AutoScheduleResult result) {
        List<String> rows=new ArrayList<>();
        for(var shift:result.getPlannedShifts()) for(var assignment:shift.getShiftAssignments()) rows.add(
                shift.getShiftDate()+"/"+shift.getStartTime()+"/"+shift.getEndTime()+"/"+assignment.getStaffId()+"/"+
                        assignment.getRequiredSkillId()+"/"+assignment.getZoneId()+"/"+assignment.getWorkstationId()+"/"+assignment.getSource());
        return rows.stream().sorted().toList();
    }
    @Test void storedPreviewAppliesExactlyOnceWithoutRerunningTheSolver() {
        UUID store=store(),person=person(),second=person(),skill=skill(store);employ(store,person,skill,"EXPERT");employ(store,second,skill,"EXPERT");UUID shift=shift(store,skill),manualId=UUID.randomUUID();
        jdbc.update("update shift_skill_requirement set required_count=2 where shift_id=?",shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",manualId,shift,person,skill);
        var preview=plans.preview(store,request(true),person);assertNotNull(preview.getPlanId());assertEquals(1,count(shift));
        var applied=plans.apply(store,preview.getPlanId(),person);
        assertTrue(applied.isPlanApplied());assertFalse(applied.isDryRun());assertEquals(placements(preview),placements(applied));assertEquals(2,count(shift));
        assertNotNull(preview.getQuality());assertEquals(preview.getQuality(),applied.getQuality());
        assertEquals(16,applied.getQuality().getCoveredHours());assertEquals(0,applied.getQuality().getUnfilledHours());
        assertEquals(1,applied.getQuality().getAutoAssignmentsAdded());assertEquals(2,applied.getQuality().getMonthlyLoads().getFirst().getStaffCount());
        assertTrue(applied.getPlannedShifts().getFirst().getShiftAssignments().stream().anyMatch(assignment->manualId.equals(assignment.getId())));
        UUID saved=applied.getPlannedShifts().getFirst().getShiftAssignments().stream().filter(assignment->assignment.getSource()==com.shiftsync.shift.enums.AssignmentSource.AUTO).findFirst().orElseThrow().getId();
        var retry=plans.apply(store,preview.getPlanId(),person);
        assertEquals(saved,retry.getPlannedShifts().getFirst().getShiftAssignments().stream().filter(assignment->assignment.getSource()==com.shiftsync.shift.enums.AssignmentSource.AUTO).findFirst().orElseThrow().getId());assertEquals(2,count(shift));
        assertDoesNotThrow(()->java.nio.file.Files.writeString(java.nio.file.Path.of("target/stored-preview-response.json"),json.writeValueAsString(preview)));
        assertDoesNotThrow(()->java.nio.file.Files.writeString(java.nio.file.Path.of("target/applied-preview-response.json"),json.writeValueAsString(applied)));
    }
    @Test void finalQualityExcludesReplacedAutoHoursAndKeepsBusinessPlacementAcrossNewIds() {
        UUID store=store(),person=person(),skill=skill(store);employ(store,person,skill,"EXPERT");UUID shift=shift(store,skill),old=UUID.randomUUID();
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'AUTO')",old,shift,person,skill);
        var result=scheduler.autoSchedule(store,request(false));var quality=result.getQuality();
        assertEquals(8,quality.getCoveredHours());assertEquals(8,quality.getMonthlyLoads().getFirst().getScheduledHours());
        assertEquals(1,quality.getAutoAssignmentsKept());assertEquals(0,quality.getAutoAssignmentsAdded());assertEquals(0,quality.getAutoAssignmentsRemoved());
        assertNotEquals(old,jdbc.queryForObject("select id from shift_assignment where shift_id=? and deleted=false",UUID.class,shift));
    }
    @Test void finalQualityIncludesZeroHourStaffAndMeasuresUnfilledHours() {
        UUID store=store(),person=person(),unavailable=person(),skill=skill(store);employ(store,person,skill,"EXPERT");employ(store,unavailable,skill,"EXPERT");UUID shift=shift(store,skill);
        jdbc.update("update shift_skill_requirement set required_count=2 where shift_id=?",shift);
        jdbc.update("insert into blackout_date(id,staff_id,date,reason) values (?,?,?,'quality test')",UUID.randomUUID(),unavailable,date);
        var result=scheduler.autoSchedule(store,request(false));var quality=result.getQuality();
        assertEquals(1,quality.getUnfilledSlots());assertEquals(8,quality.getUnfilledHours());
        assertEquals(2,quality.getMonthlyLoads().getFirst().getStaffCount());
        assertEquals(0,quality.getMonthlyLoads().getFirst().getStaffLoads().stream().filter(load->unavailable.equals(load.getStaffId())).findFirst().orElseThrow().getScheduledHours());
    }
    @Test void storedPreviewRecreatesOnlyTheGeneratedShiftsThatWereActuallyShown() {
        UUID store=store(),person=person(),skill=skill(store);employ(store,person,skill,"EXPERT");
        var preview=plans.preview(store,request(true),person);assertFalse(preview.getPlannedShifts().isEmpty());
        assertEquals(0,jdbc.queryForObject("select count(*) from shift where store_id=?",Integer.class,store));
        var applied=plans.apply(store,preview.getPlanId(),person);
        assertEquals(placements(preview),placements(applied));
        assertEquals(preview.getPlannedShifts().size(),jdbc.queryForObject("select count(*) from shift where store_id=?",Integer.class,store));
        assertTrue(applied.getPlannedShifts().stream().allMatch(shift->date.equals(shift.getShiftDate())));
        for(var shift:preview.getPlannedShifts()) assertEquals(0,jdbc.queryForObject("select count(*) from shift where id=?",Integer.class,shift.getId()));
    }
    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings={"availability","skill","contract","leave","blackout","config","quota","employment","shift","other-store-assignment"})
    void changedSchedulingInputsRejectTheStoredPreview(String change) {
        UUID store=store(),other=store(),person=person(),skill=skill(store),otherSkill=skill(other);
        employ(store,person,skill,"EXPERT");employ(other,person,otherSkill,"EXPERT");UUID shift=shift(store,skill),external=shift(other,otherSkill);
        var preview=plans.preview(store,request(true),person);
        switch(change) {
            case "availability"->jdbc.update("update availability set start_time='10:00' where staff_id=?",person);
            case "skill"->jdbc.update("delete from staff_skill where staff_id=?",person);
            case "contract"->jdbc.update("update contract_type set max_weekly_hours=4 where store_id=?",store);
            case "leave"->jdbc.update("insert into leave_request(id,store_id,staff_id,leave_type,status,start_date,end_date,reason) values (?,?,?,'ANNUAL','APPROVED',?,?,'plan test')",UUID.randomUUID(),store,person,date,date);
            case "blackout"->jdbc.update("insert into blackout_date(id,staff_id,date,reason) values (?,?,?,'plan test')",UUID.randomUUID(),person,date);
            case "config"->jdbc.update("insert into store_configuration(store_id,min_rest_hours) values (?,12)",store);
            case "quota"->jdbc.update("update store set monthly_quota_budget=5000000 where id=?",store);
            case "employment"->employ(store,person(),skill,"EXPERT");
            case "shift"->jdbc.update("update shift set end_time='18:00' where id=?",shift);
            case "other-store-assignment"->jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",UUID.randomUUID(),external,person,otherSkill);
        }
        var error=assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->plans.apply(store,preview.getPlanId(),person));
        assertEquals(org.springframework.http.HttpStatus.CONFLICT,error.getStatus());assertEquals(0,count(shift));
    }
    @Test void expiredForeignAndWrongStorePlansCannotBeApplied() {
        UUID store=store(),other=store(),person=person(),stranger=person(),skill=skill(store);employ(store,person,skill,"EXPERT");UUID shift=shift(store,skill);
        var preview=plans.preview(store,request(true),person);
        assertEquals(org.springframework.http.HttpStatus.NOT_FOUND,assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->plans.apply(store,preview.getPlanId(),stranger)).getStatus());
        assertEquals(org.springframework.http.HttpStatus.NOT_FOUND,assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->plans.apply(other,preview.getPlanId(),person)).getStatus());
        jdbc.update("update auto_schedule_plan set expires_at=now()-interval '1 second' where id=?",preview.getPlanId());
        assertEquals(org.springframework.http.HttpStatus.CONFLICT,assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->plans.apply(store,preview.getPlanId(),person)).getStatus());assertEquals(0,count(shift));
    }
    @Test void unrelatedStoreChangesDoNotInvalidateTheStoredPlan() {
        UUID store=store(),person=person(),skill=skill(store);employ(store,person,skill,"EXPERT");UUID shift=shift(store,skill);
        var preview=plans.preview(store,request(true),person);
        UUID unrelated=store(),another=person(),anotherSkill=skill(unrelated);employ(unrelated,another,anotherSkill,"EXPERT");shift(unrelated,anotherSkill);
        assertDoesNotThrow(()->plans.apply(store,preview.getPlanId(),person));assertEquals(1,count(shift));
    }
    @Test void twoDifferentPlansCannotCommitTheSameDemandTwice() throws Exception {
        UUID store=store(),person=person(),skill=skill(store);employ(store,person,skill,"EXPERT");UUID shift=shift(store,skill);
        var first=plans.preview(store,request(true),person);var second=plans.preview(store,request(true),person);
        saveBarrier(new CyclicBarrier(2));
        race(()->plans.apply(store,first.getPlanId(),person),()->plans.apply(store,second.getPlanId(),person));
        assertEquals(1,count(shift));
    }
    @Test void storedPlanFailureRestoresOldAutoRowsAndLeavesThePlanRetryable() {
        UUID store=store(),person=person(),skill=skill(store);employ(store,person,skill,"EXPERT");UUID shift=shift(store,skill),old=UUID.randomUUID();
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'AUTO')",old,shift,person,skill);
        var preview=plans.preview(store,request(true),person);
        doThrow(new IllegalStateException("injected plan write failure")).when(assignments).save(any(ShiftAssignment.class));
        assertThrows(IllegalStateException.class,()->plans.apply(store,preview.getPlanId(),person));
        assertFalse(jdbc.queryForObject("select deleted from shift_assignment where id=?",Boolean.class,old));assertEquals(1,count(shift));
        assertNull(jdbc.queryForObject("select applied_payload::text from auto_schedule_plan where id=?",String.class,preview.getPlanId()));
        reset(assignments);assertDoesNotThrow(()->plans.apply(store,preview.getPlanId(),person));assertEquals(1,count(shift));
    }
    private com.shiftsync.availability.dto.AvailabilityRequest available(int dow,String start,String end) {
        var request=new com.shiftsync.availability.dto.AvailabilityRequest();
        request.setDayOfWeek((short)dow);request.setStartTime(LocalTime.parse(start));request.setEndTime(LocalTime.parse(end));return request;
    }
    @Test void availabilityCrudPersistsNightAndChecksWeeklyCarryover() {
        UUID person=person(); String email=person+"@scheduler.invalid";
        jdbc.update("delete from availability where staff_id=?",person);
        var saturday=availabilityService.createAvailability(email,available(6,"22:00","06:00"));
        assertEquals(LocalTime.of(6,0),saturday.getEndTime());
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,
                ()->availabilityService.createAvailability(email,available(0,"05:00","09:00")));
        availabilityService.createAvailability(email,available(0,"06:00","09:00"));
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,
                ()->availabilityService.updateAvailability(saturday.getId(),email,available(6,"22:00","07:00")));
        var edited=availabilityService.updateAvailability(saturday.getId(),email,available(6,"23:00","05:00"));
        assertEquals(LocalTime.of(23,0),edited.getStartTime());
        assertEquals(LocalTime.of(5,0),edited.getEndTime());
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,
                ()->availabilityService.createAvailability(email,available(1,"09:00","09:00")));
        assertEquals(2,availabilityService.getMyAvailability(email).size());
    }
    @Test void fullNightAvailabilityWorksInAutomaticAndManualAssignment() {
        UUID store=store(),person=person(),skill=skill(store);employ(store,person,skill,"EXPERT");UUID night=shift(store,skill);
        jdbc.update("update store set open_time='22:00',close_time='06:00' where id=?",store);
        jdbc.update("delete from availability where staff_id=?",person);
        availabilityService.createAvailability(person+"@scheduler.invalid",available(0,"22:00","06:00"));
        jdbc.update("update shift set start_time='22:00',end_time='06:00' where id=?",night);
        var result=scheduler.autoSchedule(store,request(false));
        assertEquals(1,result.getNewAssignmentsCreated());assertEquals(0,result.getAvailabilityToleranceMinutes());
        jdbc.update("delete from shift_assignment where shift_id=?",night);
        assertDoesNotThrow(()->manual.assignStaffToShift(store,night,person));assertEquals(1,count(night));
    }
    @Test void persistedToleranceChangesBothAutomaticAndManualEligibility() {
        UUID store=store(),person=person(),skill=skill(store);employ(store,person,skill,"EXPERT");UUID shift=shift(store,skill);
        jdbc.update("update availability set start_time='09:30',end_time='16:30' where staff_id=?",person);
        assertEquals(0,scheduler.autoSchedule(store,request(false)).getNewAssignmentsCreated());
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->manual.assignStaffToShift(store,shift,person));
        jdbc.update("insert into store_configuration(store_id,availability_tolerance_minutes) values (?,30)",store);
        var result=scheduler.autoSchedule(store,request(false));
        assertEquals(30,result.getAvailabilityToleranceMinutes());assertEquals(1,result.getNewAssignmentsCreated());
        jdbc.update("delete from shift_assignment where shift_id=?",shift);
        assertDoesNotThrow(()->manual.assignStaffToShift(store,shift,person));assertEquals(1,count(shift));
    }
    @Test void manualValidationFindsPreviousSundayNightAcrossStores() {
        UUID first = store(), second = store(), person = person(), skill = skill(first);
        employ(first, person, skill, "EXPERT"); UUID existing = shift(first, skill);
        jdbc.update("update shift set start_time='22:00',end_time='06:00' where id=?", existing);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')", UUID.randomUUID(), existing, person);
        var addition = com.shiftsync.shift.entity.Shift.builder().store(com.shiftsync.store.entity.Store.builder().id(second).build())
                .shiftDate(date.plusDays(1)).startTime(LocalTime.of(5,0)).endTime(LocalTime.of(9,0)).build();
        assertThrows(com.shiftsync.shared.exception.BusinessException.class, () -> tx.execute(status -> {
            timeValidator.validateNoOverlapAndWeeklyHours(addition, person, null); return null;
        }));
        // A soft-deleted assignment must no longer block the staff member.
        jdbc.update("update shift_assignment set deleted=true where shift_id=?", existing);
        assertDoesNotThrow(() -> tx.execute(status -> {
            timeValidator.validateNoOverlapAndWeeklyHours(addition, person, null); return null;
        }));
    }
    @Test void sundayNightChecksExistingHoursInFollowingWeekOnDatabase() {
        UUID store = store(), person = person(), skill = skill(store);
        employ(store, person, skill, "EXPERT"); UUID existing = shift(store, skill);
        scheduleWeeklyHours(store,8);
        jdbc.update("update shift set shift_date=?,start_time='09:00',end_time='12:00' where id=?",date.plusDays(2),existing);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')",UUID.randomUUID(),existing,person);
        var addition = com.shiftsync.shift.entity.Shift.builder().shiftDate(date).startTime(LocalTime.of(22,0)).endTime(LocalTime.of(6,0)).build();
        assertThrows(com.shiftsync.shared.exception.BusinessException.class, () -> tx.execute(status -> {
            timeValidator.validateNoOverlapAndWeeklyHours(addition, person, null); return null;
        }));
        jdbc.update("update shift set end_time='11:00' where id=?",existing);
        assertDoesNotThrow(() -> tx.execute(status -> {
            timeValidator.validateNoOverlapAndWeeklyHours(addition, person, null); return null;
        }));
    }
    private void saveBarrier(CyclicBarrier barrier) {
        // Spring Data's spy delegates to a JDK proxy, not a concrete method body.
        // Preserve that real database delegate while synchronizing the writes.
        var delegate = mockingDetails(assignments).getMockCreationSettings().getDefaultAnswer();
        ThreadLocal<Boolean> waited = ThreadLocal.withInitial(() -> false);
        org.mockito.stubbing.Answer<Object> synchronizedWrite = call -> {
            assertEquals("serializable", jdbc.queryForObject("show transaction_isolation", String.class));
            if (!waited.get()) {waited.set(true); barrier.await(15, TimeUnit.SECONDS);}
            return delegate.answer(call);
        };
        doAnswer(synchronizedWrite).when(assignments).saveAll(any());
        doAnswer(synchronizedWrite).when(assignments).save(any(ShiftAssignment.class));
    }
    @Test void automaticSundayNightLoadsTheWholeFollowingWeek() {
        UUID store = store(), person = person(), skill = skill(store);
        employ(store, person, skill, "EXPERT");
        jdbc.update("update store set open_time='22:00',close_time='06:00' where id=?",store);
        scheduleWeeklyHours(store,2);
        jdbc.update("update availability set start_time='22:00',end_time='06:00' where staff_id=?",person);
        UUID night = shift(store,skill);
        jdbc.update("update shift set start_time='23:45',end_time='00:15' where id=?",night);
        UUID following = shift(store,skill);
        jdbc.update("update shift set shift_date=?,start_time='09:00',end_time='11:00',status='PUBLISHED' where id=?",date.plusDays(2),following);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,source) values (?,?,?,'MANUAL')",UUID.randomUUID(),following,person);
        var result = scheduler.autoSchedule(store,request(false));
        assertEquals(0,result.getNewAssignmentsCreated());
        assertEquals(0,count(night)); assertEquals(1,count(following));
        // Reducing Tuesday leaves exactly two hours in Monday's week.
        jdbc.update("update shift set end_time='10:45' where id=?",following);
        result = scheduler.autoSchedule(store,request(false));
        assertEquals(1,result.getNewAssignmentsCreated()); assertEquals(1,count(night));
    }
    private void race(Runnable first, Runnable second) throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            var results = List.of(executor.submit(() -> outcome(first)), executor.submit(() -> outcome(second)));
            List<Throwable> errors = new ArrayList<>(); int successes = 0;
            for (var future : results) {Throwable error = future.get(30, TimeUnit.SECONDS); if(error == null) successes++; else errors.add(error);}
            assertEquals(1, successes, "Exactly one conflicting transaction must commit: " + errors);
            for (Throwable error : errors) assertTrue(isDatabaseConflict(error), () -> "Unexpected failure: " + error);
        } finally {executor.shutdownNow(); assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS));}
    }
    private Throwable outcome(Runnable action) {try {action.run(); return null;} catch (Throwable error) {return error;}}
    private boolean isDatabaseConflict(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof java.sql.SQLException sql && Set.of("40001", "40P01", "23505").contains(sql.getSQLState())) return true;
        }
        return false;
    }
    @Test void simultaneousAutoSchedulesCannotCommitDuplicateDemand() throws Exception {
        UUID store = store(), person = person(), skill = skill(store); employ(store, person, skill, "EXPERT"); UUID shift = shift(store, skill);
        saveBarrier(new CyclicBarrier(2));
        race(() -> scheduler.autoSchedule(store, request(false)), () -> scheduler.autoSchedule(store, request(false)));
        assertEquals(1, count(shift));
    }
    @Test void autoAndManualForDifferentStaffCannotBothFillOneSlot() throws Exception {
        UUID store = store(), expert = person(), beginner = person(), skill = skill(store);
        employ(store, expert, skill, "EXPERT"); employ(store, beginner, skill, "BEGINNER"); UUID shift = shift(store, skill);
        saveBarrier(new CyclicBarrier(2));
        race(() -> scheduler.autoSchedule(store, request(false)), () -> manual.assignStaffToShift(store, shift, beginner));
        assertEquals(1, count(shift));
    }
    @Test void sameStaffInTwoStoresCannotCommitOverlappingShifts() throws Exception {
        UUID a = store(), b = store(), person = person(), sa = skill(a), sb = skill(b);
        employ(a, person, sa, "EXPERT"); employ(b, person, sb, "EXPERT"); UUID first = shift(a, sa), second = shift(b, sb);
        saveBarrier(new CyclicBarrier(2));
        race(() -> scheduler.autoSchedule(a, request(false)), () -> scheduler.autoSchedule(b, request(false)));
        assertEquals(1, count(first) + count(second));
    }
    @Test void errorAfterRemovingPreviousAutoAssignmentsRollsBackDeletion() {
        UUID store = store(), person = person(), skill = skill(store); employ(store, person, skill, "EXPERT"); UUID shift = shift(store, skill), old = UUID.randomUUID();
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'AUTO')", old, shift, person, skill);
        doThrow(new IllegalStateException("injected after AUTO cleanup")).when(assignments).saveAll(any());
        assertThrows(IllegalStateException.class, () -> scheduler.autoSchedule(store, request(false)));
        assertEquals(1, count(shift));
        assertFalse(jdbc.queryForObject("select deleted from shift_assignment where id = ?", Boolean.class, old));
    }
    @Test void dryRunReturnsPlanButLeavesAssignmentsUnchanged() {
        UUID store = store(), person = person(), skill = skill(store); employ(store, person, skill, "EXPERT"); UUID shift = shift(store, skill);
        var result = scheduler.autoSchedule(store, request(true));
        assertTrue(result.isDryRun()); assertEquals(1, result.getNewAssignmentsCreated()); assertEquals(0, count(shift));
        assertEquals(1,result.getPlannedShifts().size());
        assertEquals(person,result.getPlannedShifts().getFirst().getShiftAssignments().getFirst().getStaffId());
        assertEquals(shift,result.getPlannedShifts().getFirst().getId());
        String serialized=assertDoesNotThrow(()->json.writeValueAsString(result));
        assertDoesNotThrow(()->java.nio.file.Files.writeString(java.nio.file.Path.of("target/concrete-preview-response.json"),serialized));
        assertEquals(person.toString(),json.readTree(serialized).get("plannedShifts").get(0).get("shiftAssignments").get(0).get("staffId").asText());
    }
    @Test void dryRunShowsReplacementAutoAssignmentsWhileRestoringTheOriginalRows() {
        UUID store=store(),a=person(),b=person(),skill=skill(store);employ(store,a,skill,"EXPERT");employ(store,b,skill,"EXPERT");
        UUID shift=shift(store,skill),manualId=UUID.randomUUID(),oldAutoId=UUID.randomUUID();
        jdbc.update("update shift_skill_requirement set required_count=2 where shift_id=?",shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL'),(?,?,?,?,'AUTO')",manualId,shift,a,skill,oldAutoId,shift,b,skill);
        var result=scheduler.autoSchedule(store,request(true));
        var plan=result.getPlannedShifts().getFirst();assertEquals(2,plan.getShiftAssignments().size());
        assertTrue(plan.getShiftAssignments().stream().anyMatch(assignment->manualId.equals(assignment.getId())&&a.equals(assignment.getStaffId())));
        var proposed=plan.getShiftAssignments().stream().filter(assignment->assignment.getSource()==com.shiftsync.shift.enums.AssignmentSource.AUTO).findFirst().orElseThrow();
        assertEquals(b,proposed.getStaffId());assertNotEquals(oldAutoId,proposed.getId());
        assertEquals(2,count(shift));assertFalse(jdbc.queryForObject("select deleted from shift_assignment where id=?",Boolean.class,oldAutoId));
        assertEquals(0,jdbc.queryForObject("select count(*) from shift_assignment where id=?",Integer.class,proposed.getId()));
    }
    @Test void dryRunAlsoRollsBackGeneratedQuotaShiftsOutsideTheRequestedDay() {
        UUID store = store(), person = person(), skill = skill(store); employ(store, person, skill, "EXPERT");
        var result = scheduler.autoSchedule(store, request(true));
        assertTrue(result.isDryRun()); assertTrue(result.getTotalDemandSlots() > 0);
        assertFalse(result.getPlannedShifts().isEmpty());
        assertTrue(result.getPlannedShifts().stream().allMatch(shift->date.equals(shift.getShiftDate())&&shift.getId()!=null));
        assertEquals(0, jdbc.queryForObject("select count(*) from shift where store_id = ?", Integer.class, store));
        assertEquals(0, jdbc.queryForObject("select count(*) from shift_assignment a join shift s on s.id=a.shift_id where s.store_id = ?", Integer.class, store));
    }
    @Test void automaticGenerationDoesNotCreateDaysOutsideRequestedRange() {
        UUID store=store(),staff=person(),role=skill(store);employ(store,staff,role,"EXPERT");
        scheduler.autoSchedule(store,request(false));
        assertEquals(2,jdbc.queryForObject("select count(*) from shift where store_id=? and shift_date=?",Integer.class,store,date));
        assertEquals(0,jdbc.queryForObject("select count(*) from shift where store_id=? and shift_date<>?",Integer.class,store,date));
    }
    @Test void missingSpatialConfigurationDoesNotRollBackValidSchedule() {
        UUID store = store(), person = person(), skill = skill(store); employ(store, person, skill, "EXPERT"); UUID shift = shift(store, skill);
        var result = scheduler.autoSchedule(store, request(false));
        assertEquals(1, result.getNewAssignmentsCreated()); assertEquals(1, count(shift));
        assertEquals("PARTIAL", result.getSpatialAllocationStatus());
        assertEquals(List.of(shift), result.getSpatialAllocationFailedShiftIds());
    }
    @Test void weakerOuterTransactionCannotSilentlyDowngradeSchedulingIsolation() {
        UUID store = store(), person = person(), skill = skill(store); employ(store, person, skill, "EXPERT"); UUID shift = shift(store, skill);
        TransactionTemplate weaker = new TransactionTemplate(tx.getTransactionManager());
        weaker.setIsolationLevel(org.springframework.transaction.TransactionDefinition.ISOLATION_READ_COMMITTED);
        assertThrows(org.springframework.transaction.IllegalTransactionStateException.class,
                () -> weaker.execute(status -> scheduler.autoSchedule(store, request(false))));
        assertEquals(0, count(shift));
    }
    @Test void twoManualAssignmentsForDifferentStaffCannotOverfillOneSlot() throws Exception {
        UUID store = store(), a = person(), b = person(), skill = skill(store);
        employ(store, a, skill, "EXPERT"); employ(store, b, skill, "EXPERT"); UUID shift = shift(store, skill);
        var entered=new CountDownLatch(1);var release=new CountDownLatch(1);var started=new CountDownLatch(1);
        var delegate=mockingDetails(assignments).getMockCreationSettings().getDefaultAnswer();
        doAnswer(call->{if(Thread.currentThread().getName().equals("first-assignment")) {
            entered.countDown();assertTrue(release.await(15,TimeUnit.SECONDS));}return delegate.answer(call);})
                .when(assignments).save(any(ShiftAssignment.class));
        var pool=Executors.newFixedThreadPool(2);
        try {
            var first=pool.submit(()->{Thread.currentThread().setName("first-assignment");manual.assignStaffToShift(store,shift,a);});
            assertTrue(entered.await(15,TimeUnit.SECONDS));
            var second=pool.submit(()->{started.countDown();manual.assignStaffToShift(store,shift,b);});
            assertTrue(started.await(15,TimeUnit.SECONDS));
            assertThrows(TimeoutException.class,()->second.get(300,TimeUnit.MILLISECONDS));
            release.countDown();first.get(15,TimeUnit.SECONDS);
            assertThrows(ExecutionException.class,()->second.get(15,TimeUnit.SECONDS));
            assertEquals(1,count(shift));
        } finally {release.countDown();pool.shutdownNow();assertTrue(pool.awaitTermination(15,TimeUnit.SECONDS));}
    }
    @Test void marketplaceClaimAndAutoScheduleCannotOverlapOneStaffAcrossStores() throws Exception {
        UUID a = store(), b = store(), person = person(), sa = skill(a), sb = skill(b);
        employ(a, person, sa, "EXPERT"); employ(b, person, sb, "EXPERT"); UUID first = shift(a, sa), second = shift(b, sb);
        jdbc.update("update shift set status='PUBLISHED', is_open=true where id = ?", second);
        var lock = mock(org.redisson.api.RLock.class);
        when(redis.getLock(anyString())).thenReturn(lock);
        when(lock.tryLock(anyLong(), anyLong(), eq(TimeUnit.SECONDS))).thenReturn(true);
        saveBarrier(new CyclicBarrier(2));
        race(() -> scheduler.autoSchedule(a, request(false)), () -> marketplace.claimOpenShift(b, second, person));
        assertEquals(1, count(first) + count(second));
    }
    @Test void approvedSwapAndAutoScheduleCannotCreateAnOverlappingAssignment() throws Exception {
        UUID a = store(), b = store(), firstStaff = person(), secondStaff = person(), manager = person(), sa = skill(a), sb = skill(b);
        employ(a, firstStaff, sa, "EXPERT"); employ(a, secondStaff, sa, "EXPERT"); employ(b, firstStaff, sb, "EXPERT");
        jdbc.update("update staff set system_role='ADMIN' where id = ?", manager);
        UUID source = shift(a, sa), target = UUID.randomUUID(), automatic = shift(b, sb), swap = UUID.randomUUID();
        jdbc.update("update shift set status='PUBLISHED' where id = ?", source);
        jdbc.update("insert into shift(id,store_id,shift_date,start_time,end_time,status,is_open,availability_deadline) values (?,?,?,'09:00','17:00','PUBLISHED',false,?)", target, a, date.plusDays(1), date.atStartOfDay().atOffset(ZoneOffset.UTC));
        jdbc.update("update shift set shift_date = ? where id = ?", date.plusDays(1), automatic);
        jdbc.update("insert into availability(id,staff_id,day_of_week,start_time,end_time) values (?,?,1,'06:00','23:00')", UUID.randomUUID(), firstStaff);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')", UUID.randomUUID(), source, firstStaff, sa);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')", UUID.randomUUID(), target, secondStaff, sa);
        jdbc.update("insert into shift_swap_request(id,from_shift_id,to_shift_id,from_staff_id,to_staff_id,status,employee_accepted) values (?,?,?,?,?,'PENDING',true)", swap, source, target, firstStaff, secondStaff);
        AutoScheduleRequest monday = request(false); monday.setStartDate(date.plusDays(1)); monday.setEndDate(date.plusDays(1));
        saveBarrier(new CyclicBarrier(2));
        race(() -> scheduler.autoSchedule(b, monday), () -> swaps.managerApproveSwapRequest(swap, manager));
        assertEquals(1, jdbc.queryForObject("select count(*) from shift_assignment where staff_id=? and shift_id in (?,?) and deleted=false", Integer.class, firstStaff, target, automatic));
    }
    @Test void swapApprovalUsesPersistedAvailabilityPolicyBeforeChangingAssignments() {
        UUID store=store(),first=person(),second=person(),manager=person(),skill=skill(store);
        employ(store,first,skill,"EXPERT");employ(store,second,skill,"EXPERT");
        jdbc.update("update staff set system_role='ADMIN' where id=?",manager);
        UUID source=shift(store,skill),target=UUID.randomUUID(),swap=UUID.randomUUID();
        jdbc.update("update shift set status='PUBLISHED' where id=?",source);
        jdbc.update("insert into shift(id,store_id,shift_date,start_time,end_time,status,is_open,availability_deadline) values (?,?,?,'09:00','17:00','PUBLISHED',false,?)",target,store,date.plusDays(1),date.atStartOfDay().atOffset(ZoneOffset.UTC));
        jdbc.update("insert into availability(id,staff_id,day_of_week,start_time,end_time) values (?,?,1,'09:30','16:30')",UUID.randomUUID(),first);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",UUID.randomUUID(),source,first,skill);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",UUID.randomUUID(),target,second,skill);
        jdbc.update("insert into shift_swap_request(id,from_shift_id,to_shift_id,from_staff_id,to_staff_id,status,employee_accepted) values (?,?,?,?,?,'PENDING',true)",swap,source,target,first,second);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->swaps.managerApproveSwapRequest(swap,manager));
        assertEquals("PENDING",jdbc.queryForObject("select status::text from shift_swap_request where id=?",String.class,swap));
        assertEquals(first,jdbc.queryForObject("select staff_id from shift_assignment where shift_id=? and deleted=false",UUID.class,source));
        jdbc.update("insert into store_configuration(store_id,availability_tolerance_minutes) values (?,30)",store);
        UUID later=UUID.randomUUID();
        jdbc.update("insert into shift(id,store_id,shift_date,start_time,end_time,status,is_open,availability_deadline) values (?,?,?,'00:00','04:00','PUBLISHED',false,?)",later,store,date.plusDays(2),date.atStartOfDay().atOffset(ZoneOffset.UTC));
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",UUID.randomUUID(),later,first,skill);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->swaps.managerApproveSwapRequest(swap,manager));
        assertEquals("PENDING",jdbc.queryForObject("select status::text from shift_swap_request where id=?",String.class,swap));
        jdbc.update("update shift set start_time='01:00',end_time='05:00' where id=?",later);
        assertDoesNotThrow(()->swaps.managerApproveSwapRequest(swap,manager));
        assertEquals("APPROVED",jdbc.queryForObject("select status::text from shift_swap_request where id=?",String.class,swap));
        assertEquals(first,jdbc.queryForObject("select staff_id from shift_assignment where shift_id=? and deleted=false",UUID.class,target));
        assertEquals(second,jdbc.queryForObject("select staff_id from shift_assignment where shift_id=? and deleted=false",UUID.class,source));
    }
    @Test void leaveBulkQueryIncludesOtherStoreAndOvernightEndDate() {
        UUID a = store(), b = store(), person = person(), skill = skill(a); employ(a, person, skill, "EXPERT");
        UUID leave = UUID.randomUUID();
        jdbc.update("insert into leave_request(id,store_id,staff_id,leave_type,status,start_date,end_date,reason) values (?,?,?,'ANNUAL','APPROVED',?,?,'test')", leave, b, person, date.plusDays(1), date.plusDays(1));
        List<LeaveRequest> matches = leaves.findByStaffIdsAndStatusInPeriod(List.of(person), LeaveStatus.APPROVED, date, date.plusDays(1));
        assertEquals(List.of(leave), matches.stream().map(LeaveRequest::getId).toList());
        assertTrue(leaves.findByStaffIdsAndStatusInPeriod(List.of(person), LeaveStatus.APPROVED, date, date).isEmpty());
    }
    @Test void marketplaceClaimRequiresSkillsAndOccupiesTheMatchingRoleOnly() throws Exception {
        UUID store=store(),cashier=person(),unskilled=person(),baristaSkill=skill(store),cashierSkill=skill(store);
        employ(store,cashier,cashierSkill,"EXPERT");
        employ(store,unskilled,baristaSkill,"EXPERT");
        jdbc.update("delete from staff_skill where staff_id=?",unskilled);
        UUID shift=shift(store,baristaSkill);
        jdbc.update("insert into shift_skill_requirement(id,shift_id,skill_id,required_count) values (?,?,?,1)",UUID.randomUUID(),shift,cashierSkill);
        jdbc.update("update shift set status='PUBLISHED',is_open=true where id=?",shift);
        jdbc.update("delete from availability where staff_id in (?,?)",cashier,unskilled);
        var lock=mock(org.redisson.api.RLock.class);when(redis.getLock(anyString())).thenReturn(lock);
        when(lock.tryLock(anyLong(),anyLong(),eq(TimeUnit.SECONDS))).thenReturn(true);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->marketplace.claimOpenShift(store,shift,unskilled));
        assertEquals(0,count(shift));
        assertDoesNotThrow(()->marketplace.claimOpenShift(store,shift,cashier));
        assertEquals(cashierSkill,jdbc.queryForObject("select required_skill_id from shift_assignment where shift_id=? and deleted=false",UUID.class,shift));
        assertTrue(jdbc.queryForObject("select is_open from shift where id=?",Boolean.class,shift));
        UUID otherCashier=person();employ(store,otherCashier,cashierSkill,"EXPERT");
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->marketplace.claimOpenShift(store,shift,otherCashier));
        assertEquals(1,count(shift));
    }
    @Test void bothSchedulingPathsApplyCombinedContractLimitAcrossStores() {
        UUID a=store(),b=store(),person=person(),sa=skill(a),sb=skill(b);
        employ(a,person,sa,"EXPERT");employ(b,person,sb,"EXPERT");
        scheduleWeeklyHours(b,8);
        UUID target=shift(a,sa),existing=shift(b,sb);
        jdbc.update("update shift set shift_date=?,end_time='15:00',status='PUBLISHED' where id=?",date.minusDays(2),existing);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",UUID.randomUUID(),existing,person,sb);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->manual.assignStaffToShift(a,target,person));
        assertEquals(0,scheduler.autoSchedule(a,request(false)).getNewAssignmentsCreated());
        assertEquals(0,count(target));assertEquals(1,count(existing));
        jdbc.update("delete from shift_assignment where shift_id=?",existing);
        assertEquals(1,scheduler.autoSchedule(a,request(false)).getNewAssignmentsCreated());
        assertEquals(1,count(target));
    }
    @Test void autoManualAndOpenClaimAllRespectRestAcrossStores() throws Exception {
        UUID a=store(),b=store(),person=person(),sa=skill(a),sb=skill(b);
        employ(a,person,sa,"EXPERT");employ(b,person,sb,"EXPERT");
        jdbc.update("insert into store_configuration(store_id,min_rest_hours) values (?,0),(?,24)",a,b);
        UUID target=shift(a,sa),existing=shift(b,sb);
        jdbc.update("update shift set shift_date=?,status='PUBLISHED' where id=?",date.minusDays(1),existing);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",UUID.randomUUID(),existing,person,sb);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->manual.assignStaffToShift(a,target,person));
        assertEquals(0,scheduler.autoSchedule(a,request(false)).getNewAssignmentsCreated());
        jdbc.update("update shift set status='PUBLISHED',is_open=true where id=?",target);
        var lock=mock(org.redisson.api.RLock.class);when(redis.getLock(anyString())).thenReturn(lock);
        when(lock.tryLock(anyLong(),anyLong(),eq(TimeUnit.SECONDS))).thenReturn(true);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->marketplace.claimOpenShift(a,target,person));
        assertEquals(0,count(target));
        // Exactly 24 hours from Saturday 09:00 to Sunday 09:00 must be accepted.
        jdbc.update("update shift set start_time='08:00',end_time='09:00' where id=?",existing);
        assertDoesNotThrow(()->marketplace.claimOpenShift(a,target,person));assertEquals(1,count(target));
    }
    @Test void extendedRestLoadsShiftsBeyondNextMonday() {
        UUID a=store(),b=store(),person=person(),sa=skill(a),sb=skill(b);
        employ(a,person,sa,"EXPERT");employ(b,person,sb,"EXPERT");
        jdbc.update("insert into store_configuration(store_id,min_rest_hours) values (?,36),(?,0)",a,b);
        UUID target=shift(a,sa),future=shift(b,sb);
        jdbc.update("update shift set shift_date=?,start_time='04:00',end_time='10:00',status='PUBLISHED' where id=?",date.plusDays(2),future);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",UUID.randomUUID(),future,person,sb);
        assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->manual.assignStaffToShift(a,target,person));
        assertEquals(0,scheduler.autoSchedule(a,request(false)).getNewAssignmentsCreated());
        jdbc.update("update shift set start_time='05:00' where id=?",future);
        assertEquals(1,scheduler.autoSchedule(a,request(false)).getNewAssignmentsCreated());assertEquals(1,count(target));
    }
    @Test void monthlyFairnessIncludesWorkCarriedFromPreviousMonth() {
        UUID store=store(),a=person(),b=person(),skill=skill(store);employ(store,a,skill,"EXPERT");employ(store,b,skill,"EXPERT");
        jdbc.update("insert into scheduler_configuration(store_id,fairness_weight,skill_weight,hour_weight,rest_time_weight,availability_weight) values (?,1,0,0,0,0)",store);
        UUID target=shift(store,skill),carry=UUID.randomUUID(),other=UUID.randomUUID();
        jdbc.update("insert into shift(id,store_id,shift_date,start_time,end_time,status,is_open,availability_deadline) values (?,?,?,'22:00','06:00','PUBLISHED',false,?)",carry,store,LocalDate.of(2030,10,31),date.atStartOfDay().atOffset(ZoneOffset.UTC));
        jdbc.update("insert into shift(id,store_id,shift_date,start_time,end_time,status,is_open,availability_deadline) values (?,?,?,'09:00','13:00','PUBLISHED',false,?)",other,store,LocalDate.of(2030,11,1),date.atStartOfDay().atOffset(ZoneOffset.UTC));
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL'),(?,?,?,?,'MANUAL')",UUID.randomUUID(),carry,a,skill,UUID.randomUUID(),other,b,skill);
        var result=scheduler.autoSchedule(store,request(false));assertEquals(1,result.getNewAssignmentsCreated());
        var quality=result.getQuality().getMonthlyLoads().getFirst();
        assertEquals(18,quality.getScheduledHours());
        assertEquals(6,quality.getStaffLoads().stream().filter(load->a.equals(load.getStaffId())).findFirst().orElseThrow().getScheduledHours());
        assertEquals(12,quality.getStaffLoads().stream().filter(load->b.equals(load.getStaffId())).findFirst().orElseThrow().getScheduledHours());
        assertEquals(b,jdbc.queryForObject("select staff_id from shift_assignment where shift_id=? and deleted=false",UUID.class,target));
    }
    @Test void schedulingWindowAcrossTwoMonthsKeepsEachMonthIndependent() {
        UUID store=store(),a=person(),b=person(),skill=skill(store);employ(store,a,skill,"EXPERT");employ(store,b,skill,"EXPERT");
        jdbc.update("insert into scheduler_configuration(store_id,fairness_weight,skill_weight,hour_weight,rest_time_weight,availability_weight) values (?,1,0,0,0,0)",store);
        UUID november=shift(store,skill),october=UUID.randomUUID();LocalDate octoberDay=LocalDate.of(2030,10,30);
        jdbc.update("insert into shift(id,store_id,shift_date,start_time,end_time,status,is_open,availability_deadline) values (?,?,?,'09:00','17:00','DRAFT',false,?)",october,store,octoberDay,octoberDay.minusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC));
        jdbc.update("insert into shift_skill_requirement(id,shift_id,skill_id,required_count) values (?,?,?,1)",UUID.randomUUID(),october,skill);
        for(UUID person:List.of(a,b)) jdbc.update("insert into availability(id,staff_id,day_of_week,start_time,end_time) values (?,?,3,'06:00','23:00')",UUID.randomUUID(),person);
        for(int day=0;day<5;day++) {
            for(int personIndex=0;personIndex<2;personIndex++) {
                UUID history=UUID.randomUUID(),person=personIndex==0?a:b;
                LocalDate historyDay=personIndex==0?LocalDate.of(2030,10,7).plusDays(day):LocalDate.of(2030,11,11).plusDays(day);
                jdbc.update("insert into shift(id,store_id,shift_date,start_time,end_time,status,is_open,availability_deadline) values (?,?,?,'09:00','17:00','PUBLISHED',false,?)",history,store,historyDay,historyDay.minusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC));
                jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",UUID.randomUUID(),history,person,skill);
            }
        }
        var request=request(false);request.setStartDate(octoberDay);
        assertEquals(2,scheduler.autoSchedule(store,request).getNewAssignmentsCreated());
        assertEquals(b,jdbc.queryForObject("select staff_id from shift_assignment where shift_id=? and deleted=false",UUID.class,october));
        assertEquals(a,jdbc.queryForObject("select staff_id from shift_assignment where shift_id=? and deleted=false",UUID.class,november));
    }
    @Test void scarceSkillCoverageDoesNotDependOnTheTwentyAttemptRepairBudget() {
        UUID store=store(),firstSkill=skill(store),secondSkill=skill(store);
        UUID generic=firstSkill.compareTo(secondSkill)<0?firstSkill:secondSkill;
        UUID rare=generic.equals(firstSkill)?secondSkill:firstSkill;
        UUID fullTime=person(),multi=person();employ(store,fullTime,generic,"EXPERT");employ(store,multi,generic,"EXPERT");
        scheduleEmployeeWeeklyHours(store,multi,24);
        jdbc.update("insert into staff_skill(id,staff_id,skill_id,level) values (?,?,?,'EXPERT')",UUID.randomUUID(),multi,rare);
        LocalDate monday=LocalDate.of(2030,10,28),wednesday=monday.plusDays(2);
        UUID early=shift(store,generic);jdbc.update("update shift set shift_date=? where id=?",monday,early);
        jdbc.update("delete from shift_skill_requirement where shift_id=?",early);
        UUID target=shift(store,generic);jdbc.update("update shift set shift_date=? where id=?",wednesday,target);
        jdbc.update("insert into shift_skill_requirement(id,shift_id,skill_id,required_count) values (?,?,?,1)",UUID.randomUUID(),target,rare);
        List<UUID> people=new ArrayList<>(List.of(fullTime,multi));
        Map<UUID,UUID> employeeSkills=new HashMap<>();employeeSkills.put(fullTime,generic);employeeSkills.put(multi,generic);
        for(int index=0;index<20;index++) {
            UUID person=person(),skill=skill(store);people.add(person);employeeSkills.put(person,skill);employ(store,person,skill,"EXPERT");
            scheduleEmployeeWeeklyHours(store,person,8);
            jdbc.update("insert into shift_skill_requirement(id,shift_id,skill_id,required_count) values (?,?,?,1)",UUID.randomUUID(),early,skill);
        }
        Map<String,UUID> sharedHistory=new HashMap<>();
        for(UUID person:people) {
            jdbc.update("insert into availability(id,staff_id,day_of_week,start_time,end_time) values (?,?,1,'06:00','23:00'),(?,?,3,'06:00','23:00')",UUID.randomUUID(),person,UUID.randomUUID(),person);
            for(int week=0;week<4;week++) {
                LocalDate historyDay=LocalDate.of(2030,10,1).plusWeeks(week);
                LocalTime end=person.equals(fullTime)?LocalTime.of(21,0):LocalTime.of(13,30);
                String key=historyDay+"/"+end;
                UUID previous=sharedHistory.get(key);
                if(previous==null) {
                    previous=UUID.randomUUID();sharedHistory.put(key,previous);
                    jdbc.update("insert into shift(id,store_id,shift_date,start_time,end_time,status,is_open,availability_deadline) values (?,?,?,'06:00',?,'PUBLISHED',false,?)",previous,store,historyDay,end,historyDay.minusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC));
                }
                // Shared shift identities are unique per store, so keep history rows
                // in one shift per date/time and attach all applicable employees.
                jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",UUID.randomUUID(),previous,person,employeeSkills.get(person));
                jdbc.update("insert into shift_skill_requirement(id,shift_id,skill_id,required_count) values (?,?,?,1)",UUID.randomUUID(),previous,employeeSkills.get(person));
            }
        }
        var request=request(false);request.setStartDate(monday);request.setEndDate(wednesday);
        var result=scheduler.autoSchedule(store,request);
        assertEquals(22,result.getNewAssignmentsCreated());assertEquals(0,result.getShortageSlots());assertEquals(0,result.getFeasibility().getLocalRepairRescuedCount());
        assertEquals(fullTime,jdbc.queryForObject("select staff_id from shift_assignment where shift_id=? and required_skill_id=? and deleted=false",UUID.class,target,generic));
        assertEquals(multi,jdbc.queryForObject("select staff_id from shift_assignment where shift_id=? and required_skill_id=? and deleted=false",UUID.class,target,rare));
    }
}
