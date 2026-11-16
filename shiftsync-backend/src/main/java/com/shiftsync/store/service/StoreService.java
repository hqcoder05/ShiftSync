package com.shiftsync.store.service;

import com.shiftsync.audit.service.AuditLogService;
import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.store.dto.StoreCreateRequest;
import com.shiftsync.store.dto.StoreDTO;
import com.shiftsync.store.dto.StoreUpdateRequest;
import com.shiftsync.store.entity.Store;
import com.shiftsync.store.mapper.StoreMapper;
import com.shiftsync.store.repository.StoreRepository;
import com.shiftsync.employment.repository.EmploymentRepository;
import com.shiftsync.employment.enums.EmploymentStatus;
import com.shiftsync.shared.security.SystemRole;
import com.shiftsync.auth.repository.UserRepository;
import com.shiftsync.store.dto.ManagerSummaryDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.shiftsync.shift.service.ShiftTemplateService;
import jakarta.persistence.EntityManager;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class StoreService {
    private final AuditLogService auditLogService;
    private final StoreRepository storeRepository;
    private final ShiftTemplateService shiftTemplateService;
    private final EntityManager entityManager;
    private final com.shiftsync.leave.service.LeaveRequestService leaveRequestService;
    private final EmploymentRepository employmentRepository;
    private final UserRepository userRepository;

    public StoreService(StoreRepository storeRepository, AuditLogService auditLogService, ShiftTemplateService shiftTemplateService, EntityManager entityManager,
            com.shiftsync.leave.service.LeaveRequestService leaveRequestService) {
        this(storeRepository, auditLogService, shiftTemplateService, entityManager, leaveRequestService, null, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public StoreService(StoreRepository storeRepository, AuditLogService auditLogService, ShiftTemplateService shiftTemplateService, EntityManager entityManager,
            com.shiftsync.leave.service.LeaveRequestService leaveRequestService, EmploymentRepository employmentRepository, UserRepository userRepository) {
        this.storeRepository = storeRepository;
        this.auditLogService = auditLogService;
        this.shiftTemplateService = shiftTemplateService;
        this.entityManager = entityManager;
        this.leaveRequestService = leaveRequestService;
        this.employmentRepository = employmentRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public StoreDTO createStore(StoreCreateRequest request) {
        return createStore(request, null);
    }

    @Transactional
    public StoreDTO createStore(StoreCreateRequest request, UUID actorId) {
        validateStoreBusinessRules(request);

        Store store = Store.builder()
                .name(request.getName())
                .category(request.getCategory() != null ? request.getCategory() : com.shiftsync.store.enums.StoreCategory.FOOD_BEVERAGE)
                .format(request.getFormat() != null ? request.getFormat() : "Standard")
                .address(request.getAddress())
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .openTime(request.getOpenTime())
                .closeTime(request.getCloseTime())
                .build();

        Store savedStore = storeRepository.save(store);
        auditLogService.log(actorId, "CREATE", "Store", savedStore.getId(), null,
                java.util.Map.of("name", savedStore.getName()));
        return toDetailedDTO(savedStore);
    }

    @Transactional(readOnly = true)
    public List<StoreDTO> getStoreDirectory() {
        return storeRepository.findAll().stream()
                .map(this::toDetailedDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<StoreDTO> getAllStores(Pageable pageable) {
        return storeRepository.findAll(pageable)
                .map(this::toDetailedDTO);
    }

    @Transactional(readOnly = true)
    public Page<StoreDTO> searchStores(String search, Pageable pageable) {
        if (search == null || search.trim().isEmpty()) {
            return getAllStores(pageable);
        }
        return storeRepository.searchStores(search, pageable).map(this::toDetailedDTO);
    }

    @Transactional(readOnly = true)
    public Page<StoreDTO> getMyStores(UUID staffId, String search, Pageable pageable) {
        if (search == null || search.trim().isEmpty()) {
            return storeRepository.findStoresByStaffId(staffId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE, pageable)
                    .map(this::toDetailedDTO);
        }
        return storeRepository.findStoresByStaffIdWithSearch(staffId, com.shiftsync.employment.enums.EmploymentStatus.ACTIVE, search.trim(), pageable)
                .map(this::toDetailedDTO);
    }

    @Transactional(readOnly = true)
    public com.shiftsync.store.dto.StoreOverviewDTO getStoreOverview() {
        if (employmentRepository == null || userRepository == null) {
            return com.shiftsync.store.dto.StoreOverviewDTO.builder()
                    .totalStores(storeRepository.count())
                    .build();
        }
        var managerEmployments = employmentRepository.findByStatusAndUserSystemRole(EmploymentStatus.ACTIVE, SystemRole.MANAGER);
        var assignedStoreIds = managerEmployments.stream().map(e -> e.getStore().getId()).collect(java.util.stream.Collectors.toSet());
        var assignedManagerIds = managerEmployments.stream().map(e -> e.getUser().getId()).collect(java.util.stream.Collectors.toSet());
        long totalStores = storeRepository.count();
        long totalManagers = userRepository.countBySystemRole(SystemRole.MANAGER);
        return com.shiftsync.store.dto.StoreOverviewDTO.builder()
                .totalStores(totalStores)
                .assignedStoresCount(assignedStoreIds.size())
                .unassignedStoresCount(Math.max(0, totalStores - assignedStoreIds.size()))
                .totalManagers(totalManagers)
                .assignedManagersCount(assignedManagerIds.size())
                .unassignedManagersCount(Math.max(0, totalManagers - assignedManagerIds.size()))
                .totalUsers(userRepository.count())
                .build();
    }

    @Transactional(readOnly = true)
    public StoreDTO getStoreById(UUID id) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Store not found with id: " + id, HttpStatus.NOT_FOUND));
        return toDetailedDTO(store);
    }

    @Transactional
    public StoreDTO updateStore(UUID id, StoreUpdateRequest request) {
        return updateStore(id, request, null);
    }

    @Transactional
    public StoreDTO updateStore(UUID id, StoreUpdateRequest request, UUID actorId) {
        Store store = storeRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Store not found with id: " + id, HttpStatus.NOT_FOUND));
        java.util.Map<String, Object> before = new java.util.HashMap<>();
        before.put("name", store.getName());
        before.put("openTime", String.valueOf(store.getOpenTime()));
        before.put("closeTime", String.valueOf(store.getCloseTime()));

        validateStoreBusinessRules(request);

        var effectiveOpen = request.getOpenTime() != null ? request.getOpenTime() : store.getOpenTime();
        var effectiveClose = request.getCloseTime() != null ? request.getCloseTime() : store.getCloseTime();
        validateTimeAndCoordinates(effectiveOpen, effectiveClose, null, null);
        if (request.getName() != null && request.getName().isBlank()) {
            throw new BusinessException("Tên cửa hàng không được để trống", HttpStatus.BAD_REQUEST);
        }

        if (request.getName() != null) store.setName(request.getName());
        if (request.getCategory() != null) store.setCategory(request.getCategory());
        if (request.getFormat() != null) store.setFormat(request.getFormat());
        if (request.getAddress() != null) store.setAddress(request.getAddress());
        if (request.getLatitude() != null) store.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) store.setLongitude(request.getLongitude());
        if (request.getOpenTime() != null) store.setOpenTime(request.getOpenTime());
        if (request.getCloseTime() != null) store.setCloseTime(request.getCloseTime());

        Store updatedStore = storeRepository.save(store);
        if (request.getOpenTime() != null || request.getCloseTime() != null) {
            shiftTemplateService.deactivateOutOfBoundsTemplates(updatedStore);
        }
        auditLogService.log(actorId, "UPDATE", "Store", updatedStore.getId(), before,
                java.util.Map.of("name", updatedStore.getName(),
                        "openTime", String.valueOf(updatedStore.getOpenTime()),
                        "closeTime", String.valueOf(updatedStore.getCloseTime())));
        return toDetailedDTO(updatedStore);
    }

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
    public void deleteStore(UUID id, UUID actorId) {
        Store store = storeRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new BusinessException("Store not found", HttpStatus.NOT_FOUND));

        if (storeRepository.hasActiveEmployees(id)) {
            throw new BusinessException("Cannot delete Store: Store has active employees.", HttpStatus.CONFLICT);
        }
        if (storeRepository.hasFuturePublishedShifts(id)) {
            throw new BusinessException("Cannot delete Store: Store has future published shifts.", HttpStatus.CONFLICT);
        }

        java.time.LocalDate closureDate = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        leaveRequestService.closeStoreLeaves(id, closureDate);

        entityManager.createNativeQuery("UPDATE employment SET status = 'INACTIVE', left_date = COALESCE(left_date, GREATEST(joined_date, :closureDate)) WHERE store_id = :storeId AND status <> 'INACTIVE'")
                .setParameter("storeId", id)
                .setParameter("closureDate", closureDate)
                .executeUpdate();

        entityManager.createNativeQuery("UPDATE shift SET status = 'CANCELLED', is_open = false WHERE store_id = :storeId AND status = 'DRAFT' AND shift_date >= :closureDate")
                .setParameter("storeId", id)
                .setParameter("closureDate", closureDate)
                .executeUpdate();

        entityManager.createNativeQuery("UPDATE workforce_request SET status = 'CANCELLED' WHERE (requesting_store_id = :storeId OR target_store_id = :storeId) AND status IN ('PENDING','PROPOSAL_SENT')")
                .setParameter("storeId", id)
                .executeUpdate();

        entityManager.createNativeQuery("UPDATE shift_swap_request SET status = 'CANCELLED' WHERE status = 'PENDING' AND from_shift_id IN (SELECT id FROM shift WHERE store_id = :storeId)")
                .setParameter("storeId", id)
                .executeUpdate();

        // Keep the referenced Store entity managed while flushing leave changes.
        // A repository delete marks it removed and Hibernate rejects the retained
        // leave history's foreign-key reference, even though deletion is logical.
        entityManager.flush();
        entityManager.createNativeQuery("UPDATE store SET deleted = true WHERE id = :storeId")
                .setParameter("storeId", id).executeUpdate();
        java.util.Map<String, Object> before = new java.util.HashMap<>();
        before.put("name", store.getName());
        before.put("address", store.getAddress());
        auditLogService.log(actorId, "SOFT_DELETE", "Store", id, 
                before,
                java.util.Map.of("deleted", true));
    }

    private void validateStoreBusinessRules(StoreCreateRequest request) {
        validateTimeAndCoordinates(request.getOpenTime(), request.getCloseTime(), request.getLatitude(), request.getLongitude());
    }

    /**
     * StoreMapper deliberately handles the immutable store fields. The admin
     * workspace additionally needs current employment data so manager cards,
     * counts and assignment status always reflect the database after a change.
     */
    private StoreDTO toDetailedDTO(Store store) {
        StoreDTO dto = StoreMapper.toDTO(store);
        if (employmentRepository == null) return dto;

        var managers = employmentRepository
                .findByStoreIdAndStatusAndUserSystemRole(store.getId(), EmploymentStatus.ACTIVE, SystemRole.MANAGER)
                .stream()
                .map(employment -> ManagerSummaryDTO.builder()
                        .id(employment.getUser().getId())
                        .fullName(employment.getUser().getFullName())
                        .email(employment.getUser().getEmail())
                        .phone(employment.getUser().getPhone())
                        .avatarId(employment.getUser().getAvatarId())
                        .build())
                .toList();
        dto.setManagers(managers);
        dto.setManagerCount(managers.size());
        dto.setStaffCount(Math.toIntExact(employmentRepository.countByStoreIdAndStatus(store.getId(), EmploymentStatus.ACTIVE)));
        return dto;
    }

    private void validateStoreBusinessRules(StoreUpdateRequest request) {
        validateTimeAndCoordinates(request.getOpenTime(), request.getCloseTime(), request.getLatitude(), request.getLongitude());
    }

    private void validateTimeAndCoordinates(java.time.LocalTime openTime, java.time.LocalTime closeTime,
                                            java.math.BigDecimal latitude, java.math.BigDecimal longitude) {
        if (openTime != null && openTime.equals(closeTime)) {
            throw new BusinessException("Giờ mở cửa và đóng cửa không được trùng nhau", HttpStatus.BAD_REQUEST);
        }
        if (latitude != null) {
            if (latitude.compareTo(java.math.BigDecimal.valueOf(-90)) < 0 || latitude.compareTo(java.math.BigDecimal.valueOf(90)) > 0) {
                throw new BusinessException("Latitude must be between -90 and 90", HttpStatus.BAD_REQUEST);
            }
        }
        if (longitude != null) {
            if (longitude.compareTo(java.math.BigDecimal.valueOf(-180)) < 0 || longitude.compareTo(java.math.BigDecimal.valueOf(180)) > 0) {
                throw new BusinessException("Longitude must be between -180 and 180", HttpStatus.BAD_REQUEST);
            }
        }
    }
}

