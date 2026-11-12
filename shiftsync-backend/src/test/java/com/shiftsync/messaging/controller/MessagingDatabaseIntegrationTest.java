package com.shiftsync.messaging.controller;

import com.shiftsync.auth.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

/** Opt-in: exercises the configured PostgreSQL database and rolls changes back. */
@SpringBootTest
@Transactional
@org.springframework.test.context.ActiveProfiles("test")
@org.junit.jupiter.api.condition.EnabledIfSystemProperty(named = "shiftsync.integration.database", matches = "true")
class MessagingDatabaseIntegrationTest {
    @Autowired MessagingController controller;
    @Autowired MessagingUnreadController unread;
    @Autowired UserRepository users;
    @Autowired jakarta.persistence.EntityManager db;
    @Autowired com.shiftsync.availability.controller.WeeklyAvailabilityController availability;
    @Autowired com.shiftsync.availability.repository.AvailabilityRepository availabilityRepository;
    @Autowired com.shiftsync.attendance.controller.StaffActivityController activity;
    @Autowired com.fasterxml.jackson.databind.ObjectMapper json;
    @Autowired com.shiftsync.incident.controller.IncidentController incidents;
    @Autowired com.shiftsync.shift.controller.ScheduleHistoryController scheduleHistory;

    @Test void sendRetryAndReadAcrossAccounts() {
        UUID store = UUID.randomUUID(), contract = UUID.randomUUID(), anhId = UUID.randomUUID(), baoId = UUID.randomUUID(), thirdId = UUID.randomUUID();
        String suffix = UUID.randomUUID().toString();
        String anhEmail = "anh-" + suffix + "@example.invalid", baoEmail = "bao-" + suffix + "@example.invalid", thirdEmail = "other-" + suffix + "@example.invalid";
        db.createNativeQuery("INSERT INTO store(id,name) VALUES (:id,'Cửa hàng kiểm thử')").setParameter("id", store).executeUpdate();
        db.createNativeQuery("INSERT INTO contract_type(id,store_id,name,max_weekly_hours,ot_multiplier,default_hourly_rate) VALUES (:id,:store,'Kiểm thử',40,1,1)").setParameter("id", contract).setParameter("store", store).executeUpdate();
        for (var entry : java.util.Map.of(anhId, anhEmail, baoId, baoEmail, thirdId, thirdEmail).entrySet()) {
            db.createNativeQuery("INSERT INTO staff(id,full_name,email,password_hash) VALUES (:id,'Kiểm thử',:email,'test')").setParameter("id", entry.getKey()).setParameter("email", entry.getValue()).executeUpdate();
            db.createNativeQuery("INSERT INTO employment(id,staff_id,store_id,contract_type_id,hourly_rate,joined_date) VALUES (:id,:staff,:store,:contract,1,CURRENT_DATE)")
                    .setParameter("id", UUID.randomUUID()).setParameter("staff", entry.getKey()).setParameter("store", store).setParameter("contract", contract).executeUpdate();
        }
        var anh = new UsernamePasswordAuthenticationToken(anhEmail, "unused");
        var bao = new UsernamePasswordAuthenticationToken(baoEmail, "unused");
        var principal = new com.shiftsync.shared.security.CustomUserDetails(users.findByEmail(anhEmail).orElseThrow());
        var other = new com.shiftsync.shared.security.CustomUserDetails(users.findByEmail(baoEmail).orElseThrow());
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));
        db.createNativeQuery("SELECT set_config('shiftsync.actor_id',:actor,true)").setParameter("actor",anhId.toString()).getSingleResult();
        UUID testShift = UUID.randomUUID();
        db.createNativeQuery("INSERT INTO shift(id,store_id,shift_date,start_time,end_time,availability_deadline) VALUES (:id,:store,CURRENT_DATE,'08:00','16:00',now())")
                .setParameter("id",testShift).setParameter("store",store).executeUpdate();
        var day = java.time.LocalDate.now(java.time.ZoneId.systemDefault());
        assertEquals(0, scheduleHistory.list(store,day,day,principal).size());
        db.createNativeQuery("UPDATE shift SET status='PUBLISHED' WHERE id=:id").setParameter("id",testShift).executeUpdate();
        var history = scheduleHistory.list(store,day,day,principal);
        assertEquals(1,history.size());
        assertNull(history.getFirst().before());
        assertTrue(history.getFirst().beforeHidden());
        assertEquals("PUBLISHED",history.getFirst().after().path("status").asText());
        assertEquals("Kiểm thử",history.getFirst().actorName());
        db.createNativeQuery("UPDATE shift SET status='DRAFT' WHERE id=:id").setParameter("id",testShift).executeUpdate();
        var hidden = scheduleHistory.list(store,day,day,principal).stream().filter(e -> e.afterHidden()).findFirst().orElseThrow();
        assertNull(hidden.after());
        assertEquals("PUBLISHED", hidden.before().path("status").asText());
        db.createNativeQuery("UPDATE shift SET status='PUBLISHED' WHERE id=:id").setParameter("id",testShift).executeUpdate();
        UUID zone = UUID.randomUUID(), skill = UUID.randomUUID(), requirement = UUID.randomUUID();
        db.createNativeQuery("INSERT INTO store_zones(id,store_id,name,x_coord,y_coord,z_coord,capacity) VALUES (:id,:store,'Quầy thử',0,0,0,1)").setParameter("id",zone).setParameter("store",store).executeUpdate();
        db.createNativeQuery("INSERT INTO skill(id,store_id,name) VALUES (:id,:store,'Vị trí thử')").setParameter("id",skill).setParameter("store",store).executeUpdate();
        db.createNativeQuery("INSERT INTO shift_skill_requirement(id,shift_id,skill_id,required_count,zone_id) VALUES (:id,:shift,:skill,1,:zone)")
                .setParameter("id",requirement).setParameter("shift",testShift).setParameter("skill",skill).setParameter("zone",zone).executeUpdate();
        var zoneChange = scheduleHistory.list(store,day,day,principal).stream().filter(e -> e.after()!=null && e.before()!=null && e.after().path("zones").size() == 1).findFirst().orElseThrow();
        assertEquals(0,zoneChange.before().path("zones").size());
        assertEquals("Quầy thử",zoneChange.after().path("zones").get(0).asText());
        db.createNativeQuery("UPDATE shift SET end_time='17:00' WHERE id=:id").setParameter("id",testShift).executeUpdate();
        var timeChange = scheduleHistory.list(store,day,day,principal).stream()
                .filter(e -> e.after()!=null && e.after().path("endTime").asText().startsWith("17:00")).findFirst().orElseThrow();
        assertEquals("Quầy thử",timeChange.before().path("zones").get(0).asText());
        assertEquals("Quầy thử",timeChange.after().path("zones").get(0).asText());
        db.createNativeQuery("DELETE FROM shift WHERE id=:id").setParameter("id",testShift).executeUpdate();
        var deleted = scheduleHistory.list(store,day,day,principal).stream()
                .filter(e -> e.after()==null && e.before()!=null && e.before().path("endTime").asText().startsWith("17:00"))
                .findFirst().orElseThrow();
        assertEquals("Quầy thử",deleted.before().path("zones").get(0).asText());
        UUID incidentKey = UUID.randomUUID();
        try {
            var unreadablePhoto = new org.springframework.mock.web.MockMultipartFile("photos", "photo.jpg", "image/jpeg", new byte[]{(byte)255,(byte)216,(byte)255,1}) {
                @Override public byte[] getBytes() throws java.io.IOException { throw new java.io.IOException("test read failure"); }
            };
            UUID failedKey = UUID.randomUUID();
            assertThrows(java.io.IOException.class, () -> incidents.create(store, principal, failedKey, "EQUIPMENT", "HIGH", "Máy pha cà phê bị hỏng", null, java.util.List.of(unreadablePhoto)));
            assertEquals(0L, ((Number) db.createNativeQuery("SELECT count(*) FROM incident_report WHERE client_request_id=:id").setParameter("id", failedKey).getSingleResult()).longValue());
            var incident = incidents.create(store, principal, incidentKey, "EQUIPMENT", "HIGH", "Máy pha cà phê bị hỏng", null,
                    java.util.List.of(new org.springframework.mock.web.MockMultipartFile("photos", "photo.jpg", "image/jpeg", new byte[]{(byte)255,(byte)216,(byte)255,1})));
            assertEquals(incident.id(), incidents.create(store, principal, incidentKey, "EQUIPMENT", "HIGH", "Máy pha cà phê bị hỏng", null,
                    java.util.List.of(new org.springframework.mock.web.MockMultipartFile("photos", "photo.jpg", "image/jpeg", new byte[]{(byte)255,(byte)216,(byte)255,1}))).id());
            assertThrows(com.shiftsync.shared.exception.BusinessException.class, () -> incidents.create(store, principal, incidentKey, "EQUIPMENT", "HIGH", "Máy pha cà phê bị hỏng", null, null));
            assertThrows(com.shiftsync.shared.exception.BusinessException.class, () -> incidents.create(store, principal, incidentKey, "EQUIPMENT", "HIGH", "Máy pha cà phê bị hỏng", null,
                    java.util.List.of(new org.springframework.mock.web.MockMultipartFile("photos", "photo.jpg", "image/jpeg", new byte[]{(byte)255,(byte)216,(byte)255,2}))));
            assertEquals(1, incidents.mine(store, principal).size());
            var incidentActivity = json.valueToTree(activity.list(store, 10, null, anh)).path("items");
            assertEquals("INCIDENT_CREATED", incidentActivity.get(0).path("type").asText());
            assertEquals("IncidentReport", incidentActivity.get(0).path("targetScreen").asText());
            assertEquals(incident.id().toString(), incidentActivity.get(0).path("entityId").asText());
            assertArrayEquals(new byte[]{(byte)255,(byte)216,(byte)255,1}, incidents.photo(store, incident.id(), incident.photos().getFirst().id(), principal).getBody());
            UUID incidentShift = UUID.randomUUID(), assignment = UUID.randomUUID(), retryKey = UUID.randomUUID();
            db.createNativeQuery("INSERT INTO shift(id,store_id,shift_date,start_time,end_time,status,availability_deadline) VALUES (:id,:store,CURRENT_DATE,'08:00','16:00','PUBLISHED',now())")
                    .setParameter("id",incidentShift).setParameter("store",store).executeUpdate();
            db.createNativeQuery("INSERT INTO shift_assignment(id,shift_id,staff_id) VALUES (:id,:shift,:staff)")
                    .setParameter("id",assignment).setParameter("shift",incidentShift).setParameter("staff",anhId).executeUpdate();
            var linked = incidents.create(store, principal, retryKey, "OTHER", "LOW", "Báo cáo ca làm kiểm thử", incidentShift, null);
            db.createNativeQuery("UPDATE shift_assignment SET deleted=true WHERE id=:id").setParameter("id",assignment).executeUpdate();
            assertEquals(linked.id(), incidents.create(store, principal, retryKey, "OTHER", "LOW", "Báo cáo ca làm kiểm thử", incidentShift, null).id());
            assertThrows(com.shiftsync.shared.exception.BusinessException.class, () -> incidents.create(store, principal, UUID.randomUUID(), "OTHER", "LOW", "Báo cáo ca làm kiểm thử", incidentShift, null));
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(other, null, other.getAuthorities()));
            assertThrows(com.shiftsync.shared.exception.BusinessException.class, () -> incidents.get(store, incident.id(), other));
            assertThrows(org.springframework.security.access.AccessDeniedException.class, () -> incidents.status(store, incident.id(), new com.shiftsync.incident.controller.IncidentController.StatusUpdate("RESOLVED", ""), other));
        } catch (java.io.IOException e) { fail(e); }
        finally { org.springframework.security.core.context.SecurityContextHolder.clearContext(); }
        for (int i = 0; i < 2; i++) db.createNativeQuery("INSERT INTO leave_request(id,staff_id,store_id,leave_type,start_date,end_date,created_at) VALUES (:id,:staff,:store,'SICK',CURRENT_DATE,CURRENT_DATE,now())")
                .setParameter("id", UUID.randomUUID()).setParameter("staff", anhId).setParameter("store", store).executeUpdate();
        var firstActivity = json.valueToTree(activity.list(store, 1, null, anh));
        assertEquals(1, firstActivity.path("items").size());
        assertEquals("LEAVE_CREATED", firstActivity.path("items").get(0).path("type").asText());
        String cursor = firstActivity.path("nextCursor").asText();
        var nextActivity = json.valueToTree(activity.list(store, 1, cursor, anh));
        assertEquals(1, nextActivity.path("items").size());
        assertNotEquals(firstActivity.path("items").get(0).path("id"), nextActivity.path("items").get(0).path("id"));
        assertEquals(0, json.valueToTree(activity.list(store, 10, null, bao)).path("items").size());
        var today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        var nextWeek = today.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY)).plusWeeks(1);
        if (today.getDayOfWeek().getValue() <= 5) {
            var slot = new com.shiftsync.availability.dto.AvailabilityRequest();
            slot.setDayOfWeek((short) 1); slot.setStartTime(java.time.LocalTime.of(8, 0)); slot.setEndTime(java.time.LocalTime.of(12, 0));
            var saved = availability.save(nextWeek, new com.shiftsync.availability.controller.WeeklyAvailabilityController.SaveRequest(0L, java.util.List.of(slot)), anh);
            assertEquals(1, saved.revision());
            assertEquals(java.time.LocalTime.of(8, 0), availability.get(nextWeek, anh).slots().getFirst().startTime());
            assertEquals(java.time.LocalTime.of(8, 0), availabilityRepository.findWeeklySlots(anhId, nextWeek).getFirst().getStartTime());
            assertThrows(com.shiftsync.shared.exception.BusinessException.class, () -> availability.save(nextWeek, new com.shiftsync.availability.controller.WeeklyAvailabilityController.SaveRequest(0L, java.util.List.of(slot)), anh));
            var empty = availability.save(nextWeek, new com.shiftsync.availability.controller.WeeklyAvailabilityController.SaveRequest(1L, java.util.List.of()), anh);
            assertEquals(2, empty.revision());
            assertEquals("REGISTERED", empty.source());
            assertTrue(empty.slots().isEmpty());
            var emptyProjection = availabilityRepository.findWeeklySlots(anhId, nextWeek);
            assertEquals(1, emptyProjection.size());
            assertEquals(2L, emptyProjection.getFirst().getRevision());
            assertNull(emptyProjection.getFirst().getDayOfWeek());
        }
        var thread = controller.createThread(store, new MessagingController.CreateThread(baoId), anh);
        var third = new UsernamePasswordAuthenticationToken(thirdEmail, "unused");
        assertThrows(com.shiftsync.shared.exception.BusinessException.class, () -> controller.messages(store, thread.id(), null, 50, third));
        UUID clientId = UUID.randomUUID();
        var input = new MessagingController.SendMessage(clientId, "Tin kiểm tra");
        var sent = controller.send(store, thread.id(), input, anh);
        assertEquals(sent.id(), controller.send(store, thread.id(), input, anh).id());
        assertEquals(1, controller.messages(store, thread.id(), null, 50, bao).messages().size());
        assertEquals(1L, unread.unread(bao).get("unreadCount"));
        assertEquals(0L, controller.read(store, thread.id(), new MessagingController.ReadRequest(sent.id()), bao).get("unreadCount"));
        assertEquals(0L, unread.unread(bao).get("unreadCount"));
        var second = controller.send(store, thread.id(), new MessagingController.SendMessage(UUID.randomUUID(), "Tin thứ hai"), anh);
        var latest = controller.messages(store, thread.id(), null, 1, bao);
        assertTrue(latest.hasMore());
        assertEquals(second.id(), latest.messages().getFirst().id());
        var older = controller.messages(store, thread.id(), Long.valueOf(latest.nextBefore()), 1, bao);
        assertEquals(sent.id(), older.messages().getFirst().id());
        assertFalse(older.hasMore());
        controller.read(store, thread.id(), new MessagingController.ReadRequest(second.id()), bao);
        controller.read(store, thread.id(), new MessagingController.ReadRequest(sent.id()), bao);
        assertEquals(0L, unread.unread(bao).get("unreadCount"), "An older read receipt must not move the cursor backwards");
    }
}
