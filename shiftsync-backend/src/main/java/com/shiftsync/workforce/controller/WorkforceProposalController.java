package com.shiftsync.workforce.controller;

import com.shiftsync.shared.security.CustomUserDetails;
import com.shiftsync.workforce.dto.WorkforceProposalResponseDTO;
import com.shiftsync.workforce.service.WorkforceRequestService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users/me/workforce-proposals")
@RequiredArgsConstructor
public class WorkforceProposalController {

    private final WorkforceRequestService workforceRequestService;

    @GetMapping
    public ResponseEntity<List<WorkforceProposalResponseDTO>> getMyProposals(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(workforceRequestService.getMyProposals(userDetails.getId()));
    }

    @PutMapping("/{id}/respond")
    public ResponseEntity<Void> respondToProposal(
            @PathVariable UUID id,
            @RequestBody RespondRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        workforceRequestService.respondToProposal(id, request.isAccepted(), userDetails.getId());
        return ResponseEntity.ok().build();
    }

    @Data
    public static class RespondRequest {
        private boolean accepted;
    }
}



