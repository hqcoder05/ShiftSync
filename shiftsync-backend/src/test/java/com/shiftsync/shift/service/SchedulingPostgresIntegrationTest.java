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

/** Explicit opt-in; all fixtures live in shiftsync_scheduler_test on port 55432. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:postgresql://127.0.0.1:55432/shiftsync_scheduler_test",
        "spring.datasource.username=postgres", "spring.datasource.password=stabilization-local-only"
})
@ActiveProfiles("scheduler-postgres")
@EnabledIfSystemProperty(named = "shiftsync.scheduler.postgres-tests", matches = "true")
class SchedulingPostgresIntegrationTest {
    @Autowired JdbcTemplate jdbc;
    @Autowired AutoScheduleService scheduler;
    @Autowired SchedulingPlanService plans;
    @Autowired com.shiftsync.workforce.service.WorkforceRequestService workforce;
    @Autowired com.shiftsync.payroll.service.PayrollCalculationService payrollCalculator;
    @Autowired com.shiftsync.store.service.StoreService storeService;
    @Autowired com.shiftsync.leave.service.LeaveRequestService leaveService;
    @Autowired com.shiftsync.employment.service.EmploymentService employmentService;
    @Autowired ShiftAssignmentService manual;
    @Autowired ShiftSwapService swaps;
    @Autowired ShiftValidationService timeValidator;
    @Autowired com.shiftsync.availability.service.AvailabilityService availabilityService;
    @Autowired com.shiftsync.marketplace.service.MarketplaceService marketplace;
    @Autowired LeaveRequestRepository leaves;
    @Autowired TransactionTemplate tx;
    @Autowired tools.jackson.databind.ObjectMapper json;
    @MockitoSpyBean ShiftAssignmentRepository assignments;
    @MockitoBean NotificationService notifications;
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
        // Only random IDs created by this test; no truncation or deletion of other data.
        for (UUID id : storeIds) {
            jdbc.update("delete from blackout_date where leave_request_id in (select id from leave_request where store_id=?)",id);
            jdbc.update("delete from leave_balance where store_id=?",id);
            jdbc.update("delete from payroll where payroll_period_id in (select id from payroll_period where store_id=?)",id);
            jdbc.update("delete from payroll_period where store_id=?",id);
            jdbc.update("delete from workforce_proposal where workforce_request_id in (select id from workforce_request where requesting_store_id=? or target_store_id=?)",id,id);
            jdbc.update("delete from workforce_request where requesting_store_id=? or target_store_id=?",id,id);
            jdbc.update("delete from leave_request where store_id = ?", id);
            jdbc.update("delete from shift_swap_request where from_shift_id in (select id from shift where store_id = ?)", id);
            jdbc.update("delete from shift where store_id = ?", id);
            jdbc.update("delete from employment where store_id = ?", id);
            jdbc.update("delete from contract_type where store_id = ?", id);
            jdbc.update("delete from store where id = ?", id);
        }
        for (UUID id : staffIds) {
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
    private UUID shift(UUID store, UUID skill) {
        UUID id = UUID.randomUUID();
        jdbc.update("insert into shift(id,store_id,shift_date,start_time,end_time,status,is_open,availability_deadline) values (?,?,?,'09:00','17:00','DRAFT',false,?)", id, store, date, date.minusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC));
        jdbc.update("insert into shift_skill_requirement(id,shift_id,skill_id,required_count) values (?,?,?,1)", UUID.randomUUID(), id, skill);
        return id;
    }
    /** Characterizes an existing defect: cancelled-but-open shifts remain claimable. */
    @Test void auditCancelledOpenShiftStillAcceptsMarketplaceClaim() throws Exception {
        UUID store=store(),person=person(),skill=skill(store);
        employ(store,person,skill,"EXPERT");
        UUID shift=shift(store,skill);
        jdbc.update("update shift set status='CANCELLED',is_open=true,availability_deadline=? where id=?",
                date.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),shift);
        var lock=mock(org.redisson.api.RLock.class);
        when(redis.getLock(anyString())).thenReturn(lock);
        when(lock.tryLock(anyLong(),anyLong(),eq(TimeUnit.SECONDS))).thenReturn(true);
        marketplace.claimOpenShift(store,shift,person);
        assertEquals(1,count(shift));
        assertEquals("CANCELLED",jdbc.queryForObject("select status::text from shift where id=?",String.class,shift));
    }

    /** Characterizes swap approval bypassing the required skill of each destination assignment. */
    @Test void auditSwapCommitsEmployeesWithoutDestinationSkills() {
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
        swaps.managerApproveSwapRequest(request.getId(),manager);
        assertEquals(2,jdbc.queryForObject("select count(*) from shift_assignment a where a.shift_id in (?,?) and a.deleted=false and not exists (select 1 from staff_skill sk where sk.staff_id=a.staff_id and sk.skill_id=a.required_skill_id)",Integer.class,source,target));
    }

    @Test void auditRejectedWorkforceRequestStillCommitsAcceptedProposal() {
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
        workforce.respondToProposal(proposal.getId(),true,staff);
        assertEquals(1,count(shift));
        assertEquals("COMPLETED",jdbc.queryForObject("select status::text from workforce_request where id=?",String.class,request.getId()));
    }

    @Test void auditSupportAttendanceIsUnpaidInBothStorePayrolls() {
        UUID requesting=store(),target=store(),staff=person(),manager=person(),skill=skill(requesting);
        employ(target,staff,skill,"EXPERT");
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
        assertEquals(0.0,jdbc.queryForObject("select coalesce(sum(p.total_hours),0) from payroll p join payroll_period pp on pp.id=p.payroll_period_id where p.staff_id=? and pp.store_id in (?,?) and p.deleted=false",Double.class,staff,requesting,target));
        assertEquals(8.0,jdbc.queryForObject("select extract(epoch from(check_out_time-check_in_time))/3600 from attendance where shift_assignment_id=?",Double.class,assignment));
    }

    @Test void auditDeletedStoreLeavesRejectedLeaveBlackoutBlockingOtherStore() {
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
        assertEquals(1,jdbc.queryForObject("select count(*) from blackout_date where leave_request_id=?",Integer.class,leave.getId()));
        UUID next=shift(active,currentSkill);
        var error=assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->manual.assignStaffToShift(active,next,staff));
        assertTrue(error.getMessage().toLowerCase().contains("blackout"),error.getMessage());
    }

    @Test void auditCancelledShiftStillBlocksAssignmentAtAnotherStore() {
        UUID oldStore=store(),newStore=store(),staff=person(),oldRole=skill(oldStore),newRole=skill(newStore);
        employ(oldStore,staff,oldRole,"EXPERT");employ(newStore,staff,newRole,"EXPERT");
        UUID cancelled=shift(oldStore,oldRole),next=shift(newStore,newRole);
        jdbc.update("update shift set status='CANCELLED' where id=?",cancelled);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",
                UUID.randomUUID(),cancelled,staff,oldRole);
        var error=assertThrows(com.shiftsync.shared.exception.BusinessException.class,()->manual.assignStaffToShift(newStore,next,staff));
        assertTrue(error.getMessage().contains("trùng giờ"),error.getMessage());
        assertEquals(0,count(next));
    }

    @Test void auditFutureOvernightShiftCountsAbsentBeforeItStarts() {
        UUID store=store(),staff=person(),skill=skill(store);employ(store,staff,skill,"EXPERT");
        UUID night=shift(store,skill);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",UUID.randomUUID(),night,staff,skill);
        tx.executeWithoutResult(status->{
            int utcHour=jdbc.queryForObject("select extract(hour from current_timestamp at time zone 'UTC')::int",Integer.class);
            int offset=12-utcHour;
            String zone="Etc/GMT"+(offset>=0?"-":"+")+Math.abs(offset);
            jdbc.queryForObject("select set_config('TimeZone',?,true)",String.class,zone);
            LocalDate today=jdbc.queryForObject("select current_date",LocalDate.class);
            jdbc.update("update shift set shift_date=?,start_time='22:00',end_time='06:00',status='PUBLISHED' where id=?",today,night);
            assertTrue(jdbc.queryForObject("select shift_date+start_time > localtimestamp from shift where id=?",Boolean.class,night));
            assertEquals(1,assignments.countAbsentAssignmentsByStoreAndDateRange(store,today,today));
        });
    }

    @Test void auditInactiveEmployeeWithAttendanceReceivesNoPayslip() {
        UUID store=store(),staff=person(),skill=skill(store);employ(store,staff,skill,"EXPERT");
        UUID shift=shift(store,skill),assignment=UUID.randomUUID();
        jdbc.update("update shift set status='PUBLISHED' where id=?",shift);
        jdbc.update("insert into shift_assignment(id,shift_id,staff_id,required_skill_id,source) values (?,?,?,?,'MANUAL')",assignment,shift,staff,skill);
        jdbc.update("insert into attendance(id,shift_assignment_id,check_in_time,check_out_time,status) values (?,?,?,?,'PRESENT')",
                UUID.randomUUID(),assignment,date.atTime(9,0).atOffset(ZoneOffset.ofHours(7)),date.atTime(17,0).atOffset(ZoneOffset.ofHours(7)));
        jdbc.update("update employment set status='INACTIVE',left_date=? where staff_id=? and store_id=?",date.plusDays(1),staff,store);
        payrollCalculator.generatePayroll(store,date,date.plusDays(1));
        assertEquals(0,jdbc.queryForObject("select count(*) from payroll p join payroll_period pp on pp.id=p.payroll_period_id where p.staff_id=? and pp.store_id=? and p.deleted=false",Integer.class,staff,store));
        assertEquals(8.0,jdbc.queryForObject("select extract(epoch from(check_out_time-check_in_time))/3600 from attendance where shift_assignment_id=?",Double.class,assignment));
    }

    @Test void auditEmploymentAcceptsContractOwnedByAnotherStore() {
        UUID own=store(),foreign=store(),staff=person(),skill=skill(foreign);
        employ(foreign,staff,skill,"EXPERT");
        UUID contract=jdbc.queryForObject("select id from contract_type where store_id=?",UUID.class,foreign);
        var input=new com.shiftsync.employment.dto.EmploymentCreateRequest();
        input.setStaffId(staff);input.setContractTypeId(contract);input.setHourlyRate(java.math.BigDecimal.valueOf(30000));input.setJoinedDate(date.minusDays(1));
        employmentService.assignStaffToStore(own,input);
        assertEquals(foreign,jdbc.queryForObject("select c.store_id from employment e join contract_type c on c.id=e.contract_type_id where e.store_id=? and e.staff_id=?",UUID.class,own,staff));
    }

    @Test void auditApprovingLeaveRetainsPreviousNightsAssignment() {
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
        assertEquals(1,count(night));
        assertEquals(1,jdbc.queryForObject("select count(*) from blackout_date where leave_request_id=? and date=?",Integer.class,leave.getId(),date));
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
        jdbc.update("update contract_type set max_weekly_hours=8 where store_id=?",store);
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
        jdbc.update("update contract_type set max_weekly_hours=2 where store_id=?",store);
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
        saveBarrier(new CyclicBarrier(2));
        race(() -> manual.assignStaffToShift(store, shift, a), () -> manual.assignStaffToShift(store, shift, b));
        assertEquals(1, count(shift));
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
        jdbc.update("update contract_type set max_weekly_hours=8 where store_id=?",b);
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
        jdbc.update("update contract_type set max_weekly_hours=24 where id in (select contract_type_id from employment where staff_id=?)",multi);
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
            jdbc.update("update contract_type set max_weekly_hours=8 where id in (select contract_type_id from employment where staff_id=?)",person);
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
