package com.smartparking.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHashAndRevokedAtIsNull(String tokenHash);

    @Modifying
    @Query("""
            update RefreshToken token
               set token.revokedAt = :revokedAt
             where token.account.id = :accountId
               and token.revokedAt is null
            """)
    int revokeActiveTokensByAccountId(@Param("accountId") UUID accountId, @Param("revokedAt") OffsetDateTime revokedAt);
}
