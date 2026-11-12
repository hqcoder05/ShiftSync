package com.shiftsync.incident.controller;

import com.shiftsync.shared.exception.BusinessException;
import com.shiftsync.shared.security.CustomUserDetails;
import jakarta.persistence.EntityManager;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.*;

@RestController
@RequestMapping("/api/stores/{storeId}/incidents")
@PreAuthorize("@storeAccessService.canAccessStore(authentication, #storeId)")
public class IncidentController {
    private final EntityManager db;
    public IncidentController(EntityManager db) { this.db = db; }
    public record Photo(UUID id) {}
    public record Report(UUID id, UUID storeId, UUID reporterId, String reporterName, UUID shiftId, String category, String severity, String description, String status, String reviewNote, Object createdAt, Object updatedAt, List<Photo> photos) {}
    public record StatusUpdate(@jakarta.validation.constraints.NotNull String status, @jakarta.validation.constraints.Size(max=1000) String reviewNote) {}
    private boolean manager(com.shiftsync.shared.security.CustomUserDetails user) { return user.getUser().getSystemRole() != com.shiftsync.shared.security.SystemRole.STAFF; }
    private Report report(UUID storeId, UUID id, CustomUserDetails user) {
        var rows = db.createNativeQuery("SELECT i.id,i.store_id,i.reporter_id,s.full_name,i.shift_id,i.category,i.severity,i.description,i.status,i.review_note,i.created_at,i.updated_at FROM incident_report i JOIN staff s ON s.id=i.reporter_id WHERE i.id=:id AND i.store_id=:store")
                .setParameter("id", id).setParameter("store", storeId).getResultList();
        if (rows.isEmpty()) throw new BusinessException("Không tìm thấy báo cáo.", HttpStatus.NOT_FOUND);
        Object[] r = (Object[]) rows.getFirst();
        if (!manager(user) && !user.getId().equals(r[2])) throw new BusinessException("Không có quyền xem báo cáo.", HttpStatus.FORBIDDEN);
        @SuppressWarnings("unchecked") List<UUID> ids = db.createNativeQuery("SELECT id FROM incident_photo WHERE incident_id=:id ORDER BY id").setParameter("id", id).getResultList();
        return new Report((UUID)r[0],(UUID)r[1],(UUID)r[2],(String)r[3],(UUID)r[4],(String)r[5],(String)r[6],(String)r[7],(String)r[8],(String)r[9],r[10],r[11],ids.stream().map(Photo::new).toList());
    }

    @GetMapping("/my") @Transactional(readOnly=true)
    public List<Report> mine(@PathVariable UUID storeId, @AuthenticationPrincipal CustomUserDetails user) { return list(storeId,user,false); }
    @GetMapping @PreAuthorize("hasAnyRole('ADMIN','MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId)") @Transactional(readOnly=true)
    public List<Report> all(@PathVariable UUID storeId, @AuthenticationPrincipal CustomUserDetails user) { return list(storeId,user,true); }
    private List<Report> list(UUID store, CustomUserDetails user, boolean all) {
        var query = db.createNativeQuery("SELECT id FROM incident_report WHERE store_id=:store" + (all ? "" : " AND reporter_id=:user") + " ORDER BY created_at DESC,id DESC").setParameter("store",store).setMaxResults(100);
        if (!all) query.setParameter("user",user.getId());
        @SuppressWarnings("unchecked") List<UUID> ids=query.getResultList();
        return ids.stream().map(id->report(store,id,user)).toList();
    }
    @GetMapping("/{id}") @Transactional(readOnly=true)
    public Report get(@PathVariable UUID storeId, @PathVariable UUID id, @AuthenticationPrincipal CustomUserDetails user) { return report(storeId,id,user); }

    @PostMapping(consumes=MediaType.MULTIPART_FORM_DATA_VALUE) @Transactional
    public Report create(@PathVariable UUID storeId, @AuthenticationPrincipal CustomUserDetails user, @RequestParam UUID clientRequestId,
                         @RequestParam String category, @RequestParam String severity, @RequestParam String description,
                         @RequestParam(required=false) UUID shiftId, @RequestPart(required=false) List<MultipartFile> photos) throws IOException {
        if (!Set.of("EQUIPMENT","SAFETY","CUSTOMER","OTHER").contains(category) || !Set.of("LOW","MEDIUM","HIGH").contains(severity) || description.trim().length()<10 || description.trim().length()>2000)
            throw new BusinessException("Thông tin sự cố không hợp lệ.");
        if (photos != null && photos.size()>3) throw new BusinessException("Tối đa 3 ảnh.");
        // Read and validate every file before inserting anything, including on retries.
        List<byte[]> photoData = new ArrayList<>();
        if (photos != null) for (MultipartFile photo : photos) {
            if (photo.isEmpty() || photo.getSize()>2097152) throw new BusinessException("Ảnh phải nhỏ hơn 2 MB.");
            byte[] bytes = photo.getBytes();
            if (bytes.length<3 || (bytes[0]&255)!=255 || (bytes[1]&255)!=216 || (bytes[2]&255)!=255) throw new BusinessException("Chỉ chấp nhận ảnh JPEG hợp lệ.");
            photoData.add(bytes);
        }
        Report previous = findMatchingReport(storeId, user, clientRequestId, category, severity, description, shiftId, photoData);
        if (previous != null) return previous;
        if (shiftId != null) {
            Number found=(Number)db.createNativeQuery("SELECT count(*) FROM shift_assignment a JOIN shift s ON s.id=a.shift_id WHERE a.staff_id=:user AND a.shift_id=:shift AND s.store_id=:store AND NOT a.deleted AND s.status IN ('PUBLISHED','COMPLETED')").setParameter("user",user.getId()).setParameter("shift",shiftId).setParameter("store",storeId).getSingleResult();
            if(found.longValue()==0) throw new BusinessException("Ca làm không hợp lệ.",HttpStatus.FORBIDDEN);
        }
        UUID id=UUID.randomUUID();
        int inserted=db.createNativeQuery("INSERT INTO incident_report(id,store_id,reporter_id,client_request_id,shift_id,category,severity,description) VALUES (:id,:store,:user,:request,:shift,:category,:severity,:description) ON CONFLICT (reporter_id,client_request_id) DO NOTHING")
                .setParameter("id",id).setParameter("store",storeId).setParameter("user",user.getId()).setParameter("request",clientRequestId).setParameter("shift",shiftId).setParameter("category",category).setParameter("severity",severity).setParameter("description",description.trim()).executeUpdate();
        if(inserted==0) {
            Report concurrent = findMatchingReport(storeId, user, clientRequestId, category, severity, description, shiftId, photoData);
            if (concurrent == null) throw new BusinessException("Không thể xác nhận báo cáo, vui lòng thử lại.", HttpStatus.CONFLICT);
            return concurrent;
        }
        for(byte[] bytes:photoData) {
            db.createNativeQuery("INSERT INTO incident_photo(id,incident_id,content_type,data) VALUES (:id,:incident,'image/jpeg',:data)").setParameter("id",UUID.randomUUID()).setParameter("incident",id).setParameter("data",bytes).executeUpdate();
        }
        return report(storeId,id,user);
    }

    private Report findMatchingReport(UUID storeId, CustomUserDetails user, UUID requestId, String category,
                                      String severity, String description, UUID shiftId, List<byte[]> photos) {
        var rows = db.createNativeQuery("SELECT id,store_id,category,severity,description,shift_id FROM incident_report WHERE reporter_id=:user AND client_request_id=:request")
                .setParameter("user",user.getId()).setParameter("request",requestId).getResultList();
        if (rows.isEmpty()) return null;
        Object[] existing = (Object[]) rows.getFirst();
        if (!storeId.equals(existing[1]) || !category.equals(existing[2]) || !severity.equals(existing[3]) || !description.trim().equals(existing[4]) || !Objects.equals(shiftId,existing[5]))
            throw new BusinessException("Mã báo cáo đã được dùng cho nội dung khác.",HttpStatus.CONFLICT);
        @SuppressWarnings("unchecked") List<byte[]> saved = db.createNativeQuery("SELECT data FROM incident_photo WHERE incident_id=:id").setParameter("id", existing[0]).getResultList();
        if (!photoFingerprints(photos).equals(photoFingerprints(saved)))
            throw new BusinessException("Mã báo cáo đã được dùng với ảnh khác.", HttpStatus.CONFLICT);
        return report(storeId,(UUID)existing[0],user);
    }

    private List<String> photoFingerprints(List<byte[]> photos) {
        try {
            var digest = java.security.MessageDigest.getInstance("SHA-256");
            return photos.stream().map(bytes -> Base64.getEncoder().encodeToString(digest.digest(bytes))).sorted().toList();
        } catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }

    @GetMapping("/{id}/photos/{photoId}") @Transactional(readOnly=true)
    public ResponseEntity<byte[]> photo(@PathVariable UUID storeId,@PathVariable UUID id,@PathVariable UUID photoId,@AuthenticationPrincipal CustomUserDetails user) {
        report(storeId,id,user);
        var rows=db.createNativeQuery("SELECT data FROM incident_photo WHERE id=:photo AND incident_id=:incident").setParameter("photo",photoId).setParameter("incident",id).getResultList();
        if(rows.isEmpty()) throw new BusinessException("Không tìm thấy ảnh.",HttpStatus.NOT_FOUND);
        return ResponseEntity.ok().contentType(MediaType.IMAGE_JPEG).body((byte[])rows.getFirst());
    }
    @PatchMapping("/{id}/status") @PreAuthorize("hasAnyRole('ADMIN','MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId)") @Transactional
    public Report status(@PathVariable UUID storeId,@PathVariable UUID id,@jakarta.validation.Valid @RequestBody StatusUpdate input,@AuthenticationPrincipal CustomUserDetails user) {
        if(!Set.of("OPEN","IN_REVIEW","RESOLVED").contains(input.status())) throw new BusinessException("Trạng thái không hợp lệ.");
        int count=db.createNativeQuery("UPDATE incident_report SET status=:status,review_note=:note,updated_at=now() WHERE id=:id AND store_id=:store").setParameter("status",input.status()).setParameter("note",input.reviewNote()).setParameter("id",id).setParameter("store",storeId).executeUpdate();
        if(count==0) throw new BusinessException("Không tìm thấy báo cáo.",HttpStatus.NOT_FOUND);
        return report(storeId,id,user);
    }
}
