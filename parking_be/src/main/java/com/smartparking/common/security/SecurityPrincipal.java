package com.smartparking.common.security;

import com.smartparking.common.AccountStatus;
import com.smartparking.common.Role;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public record SecurityPrincipal(
        UUID id,
        Role role,
        AccountStatus accountStatus,
        Collection<? extends GrantedAuthority> authorities
) implements UserDetails {
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return "";
    }

    @Override
    public String getUsername() {
        return id.toString();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return accountStatus != AccountStatus.LOCKED;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return accountStatus == AccountStatus.ACTIVE;
    }

    public static SecurityPrincipal of(CurrentUser currentUser) {
        return new SecurityPrincipal(
                currentUser.id(),
                currentUser.role(),
                currentUser.accountStatus(),
                List.of((GrantedAuthority) () -> "ROLE_" + currentUser.role().name())
        );
    }
}
