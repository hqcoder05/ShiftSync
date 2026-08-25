$controller = "src\main\java\com\shiftsync\shift\controller\ShiftSwapController.java"
$content = Get-Content $controller -Raw

$newEndpoint = @"
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
"@

$content = $content -replace "\}$", $newEndpoint
Set-Content $controller -Value $content

$service = "src\main\java\com\shiftsync\shift\service\ShiftSwapService.java"
$serviceContent = Get-Content $service -Raw

$rejectMethod = @"
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
        request.setApprovedBy(manager); // You can track who rejected it in the same field or log
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
"@

$serviceContent = $serviceContent -replace "\}$", $rejectMethod
Set-Content $service -Value $serviceContent
