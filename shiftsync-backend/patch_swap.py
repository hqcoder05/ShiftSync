import os

controller_path = "src/main/java/com/shiftsync/shift/controller/ShiftSwapController.java"
service_path = "src/main/java/com/shiftsync/shift/service/ShiftSwapService.java"

with open(controller_path, "r", encoding="utf-8") as f:
    c_content = f.read()
    
c_content = c_content.rstrip()
if c_content.endswith("}"):
    c_content = c_content[:-1] + """
    @Operation(summary = "Manager rejects swap request")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @PostMapping("/swaps/{requestId}/reject")
    public ResponseEntity<Void> rejectSwap(
            @PathVariable UUID requestId,
            @AuthenticationPrincipal CustomUserDetails manager) {
        
        shiftSwapService.managerRejectSwapRequest(requestId, manager.getId());
        return ResponseEntity.ok().build();
    }
}
"""

with open(controller_path, "w", encoding="utf-8") as f:
    f.write(c_content)

with open(service_path, "r", encoding="utf-8") as f:
    s_content = f.read()

s_content = s_content.rstrip()
if s_content.endswith("}"):
    s_content = s_content[:-1] + """
    @Transactional(rollbackFor = Exception.class)
    public void managerRejectSwapRequest(UUID requestId, UUID managerId) {
        ShiftSwapRequest request = shiftSwapRequestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException("Swap request not found", HttpStatus.NOT_FOUND));

        if (!request.isEmployeeAccepted()) {
            throw new BusinessException("Employee has not accepted this swap yet", HttpStatus.BAD_REQUEST);
        }

        if (request.getStatus() != SwapStatus.PENDING) {
            throw new BusinessException("This request has already been processed", HttpStatus.BAD_REQUEST);
        }

        User manager = userRepository.findById(managerId).orElseThrow();

        request.setStatus(SwapStatus.REJECTED);
        request.setApprovedBy(manager); // Track who rejected it
        shiftSwapRequestRepository.save(request);

        auditLogService.log(managerId, "REJECT_SWAP", "ShiftSwapRequest", requestId, 
                java.util.Map.of("status", "PENDING"), 
                java.util.Map.of("status", "REJECTED"));

        notificationService.sendNotification(
            request.getFromStaff().getId(),
            com.shiftsync.notification.entity.NotificationType.SHIFT_SWAP_UPDATED,
            "Shift Swap Rejected",
            "Your shift swap request has been rejected by the manager.",
            null
        );
        
        notificationService.sendNotification(
            request.getToStaff().getId(),
            com.shiftsync.notification.entity.NotificationType.SHIFT_SWAP_UPDATED,
            "Shift Swap Rejected",
            "The shift swap request you accepted has been rejected by the manager.",
            null
        );
    }
}
"""

with open(service_path, "w", encoding="utf-8") as f:
    f.write(s_content)
