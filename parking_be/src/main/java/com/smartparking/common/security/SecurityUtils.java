package com.smartparking.common.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {
    private SecurityUtils() {
    }

    public static CurrentUser currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof SecurityPrincipal principal)) {
            throw new org.springframework.security.access.AccessDeniedException("Unauthenticated");
        }
        return new CurrentUser(principal.id(), principal.role(), principal.accountStatus());
    }
}
