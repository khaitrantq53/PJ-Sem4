package com.smartparking.account;

import com.smartparking.common.AccountStatus;
import com.smartparking.common.Role;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AccountRepository extends JpaRepository<Account, UUID> {
    Optional<Account> findByEmail(String email);

    Optional<Account> findByPhone(String phone);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    long countByRoleAndStatus(Role role, AccountStatus status);

    long countByStatus(AccountStatus status);
}
