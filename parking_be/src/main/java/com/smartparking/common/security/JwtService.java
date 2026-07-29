package com.smartparking.common.security;

import com.smartparking.common.AccountStatus;
import com.smartparking.common.Role;
import com.smartparking.common.config.SmartParkingProperties;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {
    private final SmartParkingProperties properties;
    private final SecretKey signingKey;

    public JwtService(SmartParkingProperties properties) {
        this.properties = properties;
        if (properties.jwt().secret() == null || properties.jwt().secret().getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "JWT secret không đạt độ dài tối thiểu");
        }
        this.signingKey = Keys.hmacShaKeyFor(properties.jwt().secret().getBytes(StandardCharsets.UTF_8));
    }

    public String createAccessToken(UUID accountId, Role role, AccountStatus accountStatus) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(properties.jwt().accessTokenTtlMinutes() * 60);
        return Jwts.builder()
                .issuer(properties.jwt().issuer())
                .subject(accountId.toString())
                .claim("role", role.name())
                .claim("accountStatus", accountStatus.name())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiresAt))
                .signWith(signingKey)
                .compact();
    }

    public CurrentUser parse(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(properties.jwt().issuer())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return new CurrentUser(
                UUID.fromString(claims.getSubject()),
                Role.valueOf(claims.get("role", String.class)),
                AccountStatus.valueOf(claims.get("accountStatus", String.class))
        );
    }
}
