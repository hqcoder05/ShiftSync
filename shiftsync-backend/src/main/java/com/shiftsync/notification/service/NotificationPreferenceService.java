package com.shiftsync.notification.service;

import com.shiftsync.auth.entity.User;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.notification.dto.NotificationPreferenceDTO;
import com.shiftsync.notification.dto.UpdatePreferenceRequest;
import com.shiftsync.notification.entity.NotificationPreference;
import com.shiftsync.notification.entity.NotificationType;
import com.shiftsync.notification.repository.NotificationPreferenceRepository;
import com.shiftsync.shared.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationPreferenceService {

    private final NotificationPreferenceRepository repository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<NotificationPreferenceDTO> getPreferences(UUID staffId) {
        List<NotificationPreference> existingPrefs = repository.findByStaffId(staffId);
        
        Map<NotificationType, Boolean> prefMap = existingPrefs.stream()
                .collect(Collectors.toMap(NotificationPreference::getNotificationType, NotificationPreference::isEnabled));
        
        return Arrays.stream(NotificationType.values())
                .map(type -> NotificationPreferenceDTO.builder()
                        .notificationType(type)
                        .enabled(prefMap.getOrDefault(type, true)) // default true
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public NotificationPreferenceDTO updatePreference(UUID staffId, UpdatePreferenceRequest request) {
        NotificationPreference pref = repository.findByStaffIdAndNotificationType(staffId, request.getNotificationType())
                .orElseGet(() -> {
                    User staff = userRepository.findById(staffId)
                            .orElseThrow(() -> new BusinessException("Staff not found", HttpStatus.NOT_FOUND));
                    return NotificationPreference.builder()
                            .staff(staff)
                            .notificationType(request.getNotificationType())
                            .build();
                });
        
        pref.setEnabled(request.getEnabled());
        pref = repository.save(pref);
        
        return NotificationPreferenceDTO.builder()
                .id(pref.getId())
                .notificationType(pref.getNotificationType())
                .enabled(pref.isEnabled())
                .build();
    }
}
