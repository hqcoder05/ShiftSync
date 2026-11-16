package com.shiftsync.store.service;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shift.entity.ShiftTemplate;
import com.shiftsync.shift.repository.ShiftTemplateRepository;
import com.shiftsync.shift.service.ShiftTemplateService;
import com.shiftsync.store.dto.StoreUpdateRequest;
import com.shiftsync.store.dto.StoreCreateRequest;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.repository.StoreRepository;
import jakarta.persistence.EntityManager;
import java.time.LocalTime;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Characterizes an existing partial-update validation defect. */
class StoreHoursMutationAuditTest {
    @Test void createAndUpdateRecordTheResponsibleActor() {
        var stores = mock(StoreRepository.class);
        var audit = mock(AuditLogService.class);
        var templates = mock(ShiftTemplateRepository.class);
        var service = new StoreService(stores, audit,
                new ShiftTemplateService(templates, stores), mock(EntityManager.class), mock(com.shiftsync.leave.service.LeaveRequestService.class));
        var actorId = UUID.randomUUID();
        var store = Store.builder().id(UUID.randomUUID()).name("Chi nhánh kiểm thử")
                .openTime(LocalTime.of(8, 0)).closeTime(LocalTime.of(22, 0)).build();
        when(stores.save(any(Store.class))).thenReturn(store);

        service.createStore(StoreCreateRequest.builder().name("Chi nhánh kiểm thử").address("Địa chỉ")
                .latitude(BigDecimal.TEN).longitude(BigDecimal.valueOf(106)).openTime(LocalTime.of(8, 0))
                .closeTime(LocalTime.of(22, 0)).build(), actorId);
        verify(audit).log(eq(actorId), eq("CREATE"), eq("Store"), eq(store.getId()), isNull(), any());

        when(stores.findById(store.getId())).thenReturn(Optional.of(store));
        service.updateStore(store.getId(), StoreUpdateRequest.builder().name("Tên mới").build(), actorId);
        verify(audit).log(eq(actorId), eq("UPDATE"), eq("Store"), eq(store.getId()), any(), any());
    }

    @Test void partialOpeningTimeUpdateRejectsInvalidMergedHours() {
        var stores = mock(StoreRepository.class);
        var templates = mock(ShiftTemplateRepository.class);
        var service = new StoreService(stores, mock(AuditLogService.class),
                new ShiftTemplateService(templates, stores), mock(EntityManager.class), mock(com.shiftsync.leave.service.LeaveRequestService.class));
        var store = Store.builder().id(UUID.randomUUID()).openTime(LocalTime.of(8, 0))
                .closeTime(LocalTime.of(22, 0)).build();
        when(stores.findById(store.getId())).thenReturn(Optional.of(store));

        var complete = StoreUpdateRequest.builder().openTime(LocalTime.of(22, 0))
                .closeTime(LocalTime.of(22, 0)).build();
        assertThrows(BusinessException.class, () -> service.updateStore(store.getId(), complete));
        verify(stores, never()).save(any());
        verifyNoInteractions(templates);

        assertThrows(BusinessException.class, () -> service.updateStore(store.getId(), StoreUpdateRequest.builder()
                .openTime(LocalTime.of(22, 0)).build()));
        assertEquals(LocalTime.of(8, 0),store.getOpenTime());
        verify(stores,never()).save(any());
        verifyNoInteractions(templates);
    }
}
