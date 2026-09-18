package com.shiftsync.skill.controller;

import com.shiftsync.skill.dto.SkillDTO;
import com.shiftsync.skill.service.SkillService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@Tag(name = "Skill Global API", description = "Query skills across stores or system")
public class SkillQueryController {

    private final SkillService skillService;

    @Operation(summary = "Get all skills across stores or system")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @GetMapping("/api/skills")
    public ResponseEntity<List<SkillDTO>> getAllSkills(
            @RequestParam(required = false) UUID storeId) {
        if (storeId != null) {
            return ResponseEntity.ok(skillService.getSkillsByStoreId(storeId));
        }
        return ResponseEntity.ok(skillService.getAllSkills());
    }

    @Operation(summary = "Get skill IDs assigned to a staff member")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @GetMapping("/api/users/{userId}/skills")
    public ResponseEntity<List<UUID>> getStaffSkills(@PathVariable UUID userId) {
        return ResponseEntity.ok(skillService.getSkillIdsByStaffId(userId));
    }

    @Operation(summary = "Replace all skills of a staff member (atomic)")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PutMapping("/api/users/{userId}/skills")
    public ResponseEntity<Void> updateStaffSkills(
            @PathVariable UUID userId,
            @RequestBody List<UUID> skillIds) {
        skillService.replaceStaffSkills(userId, skillIds);
        return ResponseEntity.noContent().build();
    }
}

