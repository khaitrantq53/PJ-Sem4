package com.smartparking.auth;

import com.smartparking.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "otp_requests")
public class OtpRequest extends BaseEntity {
    private UUID accountId;

    @Column(nullable = false)
    private String destination;

    @Column(nullable = false)
    private String purpose;

    @Column(nullable = false)
    private String otpHash;

    @Column(nullable = false)
    private OffsetDateTime expiresAt;

    private OffsetDateTime verifiedAt;
}
