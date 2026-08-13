package com.shiftsync.skill.controller;

import com.shiftsync.skill.dto.SkillDTO;
import com.shiftsync.skill.dto.SkillRequest;
import com.shiftsync.skill.service.SkillService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/stores/{storeId}/skills")
@RequiredArgsConstructor
@Tag(name = "Skill API", description = "CRUD operations for skills (roles) per store")
public class SkillController {

    private final SkillService skillService;

    @Operation(summary = "Get all skills for a store")
    @PreAuthorize("@storeAccessService.canAccessStore(authentication, #storeId)")
    @GetMapping
    public ResponseEntity<List<SkillDTO>> getSkillsByStoreId(@PathVariable UUID storeId) {
        return ResponseEntity.ok(skillService.getSkillsByStoreId(storeId));
    }

    @Operation(summary = "Create a new skill")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PostMapping
    public ResponseEntity<SkillDTO> createSkill(
            @PathVariable UUID storeId,
            @Valid @RequestBody SkillRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(skillService.createSkill(storeId, request));
    }

    @Operation(summary = "Update an existing skill")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @PutMapping("/{skillId}")
    public ResponseEntity<SkillDTO> updateSkill(
            @PathVariable UUID storeId,
            @PathVariable UUID skillId,
            @Valid @RequestBody SkillRequest request) {
        return ResponseEntity.ok(skillService.updateSkill(storeId, skillId, request));
    }

    @Operation(summary = "Delete a skill")
    @PreAuthorize("hasRole('ADMIN') or (hasRole('MANAGER') and @storeAccessService.canAccessStore(authentication, #storeId))")
    @DeleteMapping("/{skillId}")
    public ResponseEntity<Void> deleteSkill(
            @PathVariable UUID storeId,
            @PathVariable UUID skillId) {
        skillService.deleteSkill(storeId, skillId);
        return ResponseEntity.noContent().build();
    }
}
