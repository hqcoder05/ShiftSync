package com.shiftsync.shared.security;

import com.shiftsync.shared.exception.BusinessException;
import org.springframework.http.HttpStatus;

import java.net.URI;
import java.net.URISyntaxException;

/** Keeps user-controlled avatar locations within sources the browser is allowed to load. */
public final class AvatarUrlPolicy {
    private static final String READY_PLAYER_ME_ORIGIN = "https://models.readyplayer.me";
    private static final int MAX_LENGTH = 2048;

    private AvatarUrlPolicy() { }

    public static void validate(String avatarId) {
        if (avatarId == null || avatarId.isBlank()) return;
        if (avatarId.length() > MAX_LENGTH) reject();
        if (avatarId.matches("^/models/[A-Za-z0-9_-]+\\.glb$")) return;
        try {
            URI uri = new URI(avatarId);
            if ("https".equalsIgnoreCase(uri.getScheme())
                    && READY_PLAYER_ME_ORIGIN.equalsIgnoreCase(uri.getScheme() + "://" + uri.getHost())
                    && uri.getPath() != null
                    && uri.getPath().toLowerCase().endsWith(".glb")) return;
        } catch (URISyntaxException ignored) {
            // Throw the same user-safe error below.
        }
        reject();
    }

    private static void reject() {
        throw new BusinessException("Avatar chi duoc phep la mo hinh .glb noi bo hoac tu models.readyplayer.me", HttpStatus.BAD_REQUEST);
    }
}
