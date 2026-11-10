package com.shiftsync.activity;

import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.shared.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.*;

@Service @RequiredArgsConstructor
public class ActivityService {
    private final ActivityRepository activities;
    private final EmploymentRepository employments;

    @Transactional(readOnly = true)
    public ActivityPage mine(UUID staffId, UUID storeId, Integer requestedLimit, String before) {
        int limit = requestedLimit == null ? 30 : requestedLimit;
        if (limit < 1 || limit > 100) throw new BusinessException("Số hoạt động mỗi trang cần từ 1 đến 100.", HttpStatus.BAD_REQUEST);
        List<UUID> stores = employments.findByUserIdAndStatus(staffId, EmploymentStatus.ACTIVE).stream()
                .map(e -> e.getStore().getId()).distinct().toList();
        if (storeId != null && !stores.contains(storeId))
            throw new BusinessException("Bạn không thuộc chi nhánh này.", HttpStatus.FORBIDDEN);
        if (storeId != null) stores = List.of(storeId);
        OffsetDateTime at = null; String id = null;
        if (before != null && !before.isBlank()) {
            try {
                if (before.length() > 1024) throw new IllegalArgumentException();
                String raw = new String(Base64.getUrlDecoder().decode(before), StandardCharsets.UTF_8);
                int separator = raw.indexOf('|');
                at = OffsetDateTime.parse(raw.substring(0, separator)); id = raw.substring(separator + 1);
                if (!id.matches("[a-z-]+:[0-9a-fA-F-]{36}")) throw new IllegalArgumentException();
            } catch (RuntimeException error) {
                throw new BusinessException("Mốc phân trang hoạt động không hợp lệ.", HttpStatus.BAD_REQUEST);
            }
        }
        if (stores.isEmpty()) return new ActivityPage(List.of(), null);
        List<ActivityItem> rows = activities.find(staffId, stores, at, id, limit + 1);
        List<ActivityItem> page = rows.size() > limit ? rows.subList(0, limit) : rows;
        String next = null;
        if (rows.size() > limit) {
            ActivityItem last = page.get(page.size() - 1);
            next = Base64.getUrlEncoder().withoutPadding().encodeToString((last.occurredAt()+"|"+last.id()).getBytes(StandardCharsets.UTF_8));
        }
        return new ActivityPage(List.copyOf(page), next);
    }
}
