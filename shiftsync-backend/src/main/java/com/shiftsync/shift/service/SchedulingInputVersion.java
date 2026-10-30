package com.shiftsync.shift.service;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;

/** Conservative scoped fingerprint. Reads remain in the SERIALIZABLE snapshot used to apply a plan. */
@Component
@RequiredArgsConstructor
public class SchedulingInputVersion {
    private final JdbcTemplate jdbc;

    @Transactional(readOnly=true,isolation=Isolation.SERIALIZABLE)
    public String capture(UUID storeId) {
        try {
            MessageDigest hash=MessageDigest.getInstance("SHA-256");
            for(Class<?> type:List.of(AutoScheduleService.class,ShiftTimeRange.class,StaffContractLimit.class,StaffRestPolicy.class,
                    AutoSchedulePlanMapper.class,SchedulingPlanService.class,ScheduleQualityEvaluator.class,
                    com.shiftsync.store.entity.StoreConfiguration.class,com.shiftsync.store.entity.SchedulerConfiguration.class,
                    com.shiftsync.availability.service.AvailabilityCoverage.class,com.shiftsync.quota.service.HeadcountQuotaService.class)) {
                try(var input=type.getResourceAsStream("/"+type.getName().replace('.','/')+".class")) {
                    if(input==null) throw new IllegalStateException("Missing scheduler implementation version");
                    hash.update(input.readAllBytes());
                }
            }
            String people=array(jdbc.queryForList("select distinct staff_id from employment where store_id=? union select a.staff_id from shift_assignment a join shift s on s.id=a.shift_id where s.store_id=?",UUID.class,storeId,storeId));
            String stores=array(jdbc.queryForList("select distinct store_id from employment where staff_id=any(?::uuid[]) union select ?::uuid",UUID.class,people,storeId));
            String shifts="select s.id from shift s where s.store_id=? or s.id in (select a.shift_id from shift_assignment a where a.staff_id=any(?::uuid[]))";
            rows(hash,"store","t.id=any(?::uuid[])",stores);
            rows(hash,"staff","t.id=any(?::uuid[])",people);
            rows(hash,"employment","t.store_id=? or t.staff_id=any(?::uuid[])",storeId,people);
            rows(hash,"contract_type","t.store_id=any(?::uuid[])",stores);
            rows(hash,"store_configuration","t.store_id=any(?::uuid[])",stores);
            rows(hash,"scheduler_configuration","t.store_id=?",storeId);
            rows(hash,"skill","t.store_id=? or t.id in (select skill_id from staff_skill where staff_id=any(?::uuid[]))",storeId,people);
            for(String table:List.of("staff_skill","availability","blackout_date","leave_request")) rows(hash,table,"t.staff_id=any(?::uuid[])",people);
            rows(hash,"shift","t.id in ("+shifts+")",storeId,people);
            for(String table:List.of("shift_assignment","shift_skill_requirement")) rows(hash,table,"t.shift_id in ("+shifts+")",storeId,people);
            for(String table:List.of("store_zones","workstations","position_norm_override","shift_template")) rows(hash,table,"t.store_id=?",storeId);
            return HexFormat.of().formatHex(hash.digest());
        } catch(java.io.IOException|NoSuchAlgorithmException exception) {throw new IllegalStateException("Cannot version scheduler input",exception);}
    }
    private String array(List<UUID> ids){return "{"+ids.stream().sorted().map(UUID::toString).collect(java.util.stream.Collectors.joining(","))+"}";}
    private void rows(MessageDigest hash,String table,String condition,Object... arguments) {
        // Table names and conditions are internal constants; all values are bound parameters.
        String data=jdbc.queryForObject("select coalesce(jsonb_agg(to_jsonb(t) order by t.id),'[]'::jsonb)::text from "+table+" t where "+condition,String.class,arguments);
        hash.update((table+":"+data+"\n").getBytes(StandardCharsets.UTF_8));
    }
}
