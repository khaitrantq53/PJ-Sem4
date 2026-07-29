package com.smartparking.common.config;

import com.smartparking.common.BookingStatus;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.math.BigDecimal;
import java.util.List;

@ConfigurationProperties(prefix = "smart-parking")
public record SmartParkingProperties(
        Jwt jwt,
        Booking booking,
        Pricing pricing,
        Payment payment,
        Otp otp,
        Minio minio,
        Upload upload
) {
    public record Jwt(String issuer, String secret, long accessTokenTtlMinutes, long refreshTokenTtlDays) {
    }

    public record Booking(long holdTimeoutMinutes, long approvalTimeoutMinutes, List<BookingStatus> activeOverlapStatuses) {
    }

    public record Pricing(String currency, BigDecimal platformFeeRate, BigDecimal taxRate, BigDecimal defaultHourlyRate) {
    }

    public record Payment(String webhookSecret) {
    }

    public record Otp(long ttlMinutes, int length) {
    }

    public record Minio(String endpoint, String accessKey, String secretKey, String bucket) {
    }

    public record Upload(long maxAvatarBytes, List<String> allowedAvatarContentTypes) {
    }
}
