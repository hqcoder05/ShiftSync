package com.shiftsync.shared.security;

import com.shiftsync.shared.exception.BusinessException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;

class AvatarUrlPolicyTest {
    @Test void acceptsBundledAndApprovedReadyPlayerMeModels() {
        AvatarUrlPolicy.validate("/models/ShiftSync_Barista.glb");
        AvatarUrlPolicy.validate("https://models.readyplayer.me/avatar.glb");
    }

    @Test void rejectsUntrustedOrNonGlbLocations() {
        assertThrows(BusinessException.class, () -> AvatarUrlPolicy.validate("https://attacker.invalid/avatar.glb"));
        assertThrows(BusinessException.class, () -> AvatarUrlPolicy.validate("blob:https://app.invalid/id"));
        assertThrows(BusinessException.class, () -> AvatarUrlPolicy.validate("https://models.readyplayer.me/avatar.png"));
    }
}
