package com.shiftsync.shift.service;

import com.shiftsync.shift.dto.*;
import com.shiftsync.shift.entity.*;
import com.shiftsync.shift.enums.*;
import com.shiftsync.shift.repository.*;
import com.shiftsync.shared.exception.BusinessException;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.*;
import java.time.*;
import java.util.*;

/** Server-owned, expiring proposals. Applying never invokes the solver again. */
@Service
@RequiredArgsConstructor
public class SchedulingPlanService {
    private final AutoScheduleService scheduler;
    private final SchedulingInputVersion versions;
    private final JdbcTemplate jdbc;
    private final tools.jackson.databind.ObjectMapper json;
    private final TransactionTemplate transactions;
    private final ShiftRepository shifts;
    private final ShiftAssignmentRepository assignments;
    private final EntityManager entities;
    private final com.shiftsync.shared.websocket.RealtimeEventPublisher events;

    public AutoScheduleResult preview(UUID storeId,AutoScheduleRequest request,UUID actorId) {
        if(actorId==null) throw new BusinessException("Authentication required",HttpStatus.UNAUTHORIZED);
        request.setDryRun(true);
        // The solver's transaction rolls back and completes before storing its detached proposal.
        AutoScheduleResult result=scheduler.autoSchedule(storeId,request);
        return transactions.execute(status->{
            if(result.getInputVersion()==null || !result.getInputVersion().equals(versions.capture(storeId))) throw stale();
            UUID id=UUID.randomUUID();OffsetDateTime expiry=OffsetDateTime.now(ZoneOffset.UTC).plusMinutes(15);
            result.setPlanId(id);result.setPlanExpiresAt(expiry);
            jdbc.update("delete from auto_schedule_plan where actor_id=? and expires_at < now()-interval '24 hours'",actorId);
            jdbc.update("insert into auto_schedule_plan(id,store_id,actor_id,input_version,payload,expires_at) values (?,?,?,?,?::jsonb,?)",
                    id,storeId,actorId,result.getInputVersion(),json.writeValueAsString(result),expiry);
            return result;
        });
    }

    @Transactional(isolation=Isolation.SERIALIZABLE)
    public AutoScheduleResult apply(UUID storeId,UUID planId,UUID actorId) {
        var plans=jdbc.query("select input_version,payload::text,expires_at,applied_payload::text from auto_schedule_plan where id=? and store_id=? and actor_id=? for update",
                (row,index)->new Stored(row.getString(1),row.getString(2),row.getObject(3,OffsetDateTime.class),row.getString(4)),planId,storeId,actorId);
        if(plans.isEmpty()) throw new BusinessException("Không tìm thấy phương án của bạn tại cửa hàng này.",HttpStatus.NOT_FOUND);
        Stored stored=plans.getFirst();
        if(stored.appliedPayload()!=null) return json.readValue(stored.appliedPayload(),AutoScheduleResult.class);
        if(!stored.expiresAt().isAfter(OffsetDateTime.now(ZoneOffset.UTC))) throw new BusinessException("Phương án đã hết hạn. Hãy tạo bản xem trước mới.",HttpStatus.CONFLICT);
        if(!stored.version().equals(versions.capture(storeId))) throw stale();
        AutoScheduleResult result=json.readValue(stored.payload(),AutoScheduleResult.class);
        Map<UUID,UUID> shiftIds=new HashMap<>(),requirementIds=new HashMap<>();
        Map<UUID,Shift> appliedShifts=new LinkedHashMap<>();
        for(ShiftDTO planned:result.getPlannedShifts()) {
            UUID previewId=planned.getId();
            Shift shift=shifts.findByIdAndStoreId(previewId,storeId).orElse(null);
            if(shift==null) {
                shift=Shift.builder().store(entities.getReference(com.shiftsync.store.entity.Store.class,storeId))
                        .shiftDate(planned.getShiftDate()).startTime(planned.getStartTime()).endTime(planned.getEndTime())
                        .availabilityDeadline(planned.getAvailabilityDeadline()).status(ShiftStatus.DRAFT).note(planned.getNote()).color(planned.getColor()).build();
                for(RequirementCoverageDTO row:result.getRequirementCoverages()) {
                    if(!previewId.equals(row.getShiftId())||row.getSkillId()==null) continue;
                    var requirement=ShiftSkillRequirement.builder().shift(shift).skill(entities.getReference(com.shiftsync.skill.entity.Skill.class,row.getSkillId()))
                            .requiredCount(row.getRequiredCount())
                            .zone(row.getZoneId()==null?null:entities.getReference(com.shiftsync.layout.entity.StoreZone.class,row.getZoneId()))
                            .workstation(row.getWorkstationId()==null?null:entities.getReference(com.shiftsync.layout.entity.Workstation.class,row.getWorkstationId())).build();
                    shift.getRequirements().add(requirement);
                }
                shift=shifts.saveAndFlush(shift);
                var matchingRows=result.getRequirementCoverages().stream().filter(row->previewId.equals(row.getShiftId())&&row.getSkillId()!=null).toList();
                for(int index=0;index<matchingRows.size();index++) if(matchingRows.get(index).getRequirementId()!=null)
                    requirementIds.put(matchingRows.get(index).getRequirementId(),shift.getRequirements().get(index).getId());
            }
            if(shift.getStatus()!=ShiftStatus.DRAFT) throw stale();
            shiftIds.put(previewId,shift.getId());appliedShifts.put(shift.getId(),shift);
            assignments.deleteAll(assignments.findByShiftId(shift.getId()).stream().filter(a->a.getSource()==AssignmentSource.AUTO).toList());
            assignments.flush();
            for(ShiftAssignmentResponseDTO proposed:planned.getShiftAssignments()) {
                if(proposed.getSource()!=AssignmentSource.AUTO) continue;
                assignments.save(ShiftAssignment.builder().shift(shift)
                        .staff(entities.getReference(com.shiftsync.auth.entity.User.class,proposed.getStaffId()))
                        .requiredSkillId(proposed.getRequiredSkillId()).source(AssignmentSource.AUTO)
                        .zone(proposed.getZoneId()==null?null:entities.getReference(com.shiftsync.layout.entity.StoreZone.class,proposed.getZoneId()))
                        .workstation(proposed.getWorkstationId()==null?null:entities.getReference(com.shiftsync.layout.entity.Workstation.class,proposed.getWorkstationId())).build());
            }
        }
        assignments.flush();
        for(var row:result.getRequirementCoverages()) {
            row.setShiftId(shiftIds.getOrDefault(row.getShiftId(),row.getShiftId()));
            row.setRequirementId(requirementIds.getOrDefault(row.getRequirementId(),row.getRequirementId()));
        }
        for(var row:result.getShortages()) row.setShiftId(shiftIds.getOrDefault(row.getShiftId(),row.getShiftId()));
        result.setPlannedShifts(appliedShifts.values().stream().map(shift->AutoSchedulePlanMapper.snapshot(storeId,shift,assignments.findByShiftId(shift.getId()),
                result.getRequirementCoverages().stream().filter(row->shift.getId().equals(row.getShiftId())).toList())).toList());
        result.setDryRun(false);result.setPlanApplied(true);result.setSpatialAllocationStatus("NOT_RUN_APPLIED_PREVIEW");
        result.setMessage("Đã lưu đúng phương án đã xem. Phân công tay được giữ nguyên; chưa chạy phân bổ 3D bổ sung.");
        jdbc.update("update auto_schedule_plan set applied_at=now(),applied_payload=?::jsonb where id=?",json.writeValueAsString(result),planId);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){
            @Override public void afterCommit(){events.publishStoreEvent(storeId,"shifts","AUTO_SCHEDULE_PLAN_APPLIED",Map.of("planId",planId.toString()));}
        });
        return result;
    }
    private BusinessException stale(){return new BusinessException("Dữ liệu xếp ca đã thay đổi. Hãy tạo và kiểm tra bản xem trước mới trước khi áp dụng.",HttpStatus.CONFLICT);}
    private record Stored(String version,String payload,OffsetDateTime expiresAt,String appliedPayload) {}
}
