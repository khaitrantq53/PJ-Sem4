package com.smartparking.account;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AccountCredentialRepository extends JpaRepository<AccountCredential, UUID> {
    Optional<AccountCredential> findByAccountId(UUID accountId);
}
