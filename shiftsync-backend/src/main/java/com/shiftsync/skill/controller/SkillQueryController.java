package com.shiftsync.skill.controller;

import com.shiftsync.skill.dto.SkillDTO;
import com.shiftsync.skill.service.SkillService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/skills")
@RequiredArgsConstructor
@Tag(name = "Skill Global API", description = "Query skills across stores or system")
public class SkillQueryController {

    private final SkillService skillService;

    @Operation(summary = "Get all skills across stores or system")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @GetMapping
    public ResponseEntity<List<SkillDTO>> getAllSkills(
            @RequestParam(required = false) UUID storeId) {
        if (storeId != null) {
            return ResponseEntity.ok(skillService.getSkillsByStoreId(storeId));
        }
        return ResponseEntity.ok(skillService.getAllSkills());
    }
}
