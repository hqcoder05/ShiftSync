package com.shiftsync.store.controller;

import com.shiftsync.shared.exception.BusinessException;
import jakarta.persistence.EntityManager;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/stores/{storeId}/support")
public class StoreSupportController {
    private final EntityManager db;
    public StoreSupportController(EntityManager db) { this.db = db; }
    public record Contact(@Pattern(regexp = "^\\+?\\d{3,15}$") String supportPhone,
                          @Size(max = 80) String supportLabel) {}

    @GetMapping
    @PreAuthorize("@storeAccessService.canAccessStore(authentication, #storeId)")
    @Transactional(readOnly = true)
    public Contact get(@PathVariable UUID storeId) {
        var rows = db.createNativeQuery("SELECT support_phone,support_label FROM store WHERE id=:id AND deleted=false")
                .setParameter("id", storeId).getResultList();
        if (rows.isEmpty()) throw new BusinessException("Không tìm thấy chi nhánh.", HttpStatus.NOT_FOUND);
        Object[] row = (Object[]) rows.getFirst();
        return new Contact((String) row[0], (String) row[1]);
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId)")
    @Transactional
    public Contact update(@PathVariable UUID storeId, @Valid @RequestBody Contact input) {
        int updated = db.createNativeQuery("UPDATE store SET support_phone=:phone,support_label=:label WHERE id=:id AND deleted=false")
                .setParameter("phone", input.supportPhone()).setParameter("label", input.supportLabel()).setParameter("id", storeId).executeUpdate();
        if (updated == 0) throw new BusinessException("Không tìm thấy chi nhánh.", HttpStatus.NOT_FOUND);
        return input;
    }
}
