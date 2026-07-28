package com.smartparking.common.security;

import com.smartparking.common.AccountStatus;
import com.smartparking.common.Role;

import java.util.UUID;

public record CurrentUser(UUID id, Role role, AccountStatus accountStatus) {
}
