package com.smartparking.common.config;

import com.smartparking.common.BookingStatus;
import com.smartparking.common.ParkingLotStatus;
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
        Operation operation,
        Jobs jobs,
        BusinessDecisions businessDecisions,
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

    public record Operation(long checkInEarlyMinutes, long checkInLateMinutes, long checkoutGraceMinutes,
                            long deviceOfflineThresholdMinutes, boolean requireVehicleConditionNotes) {
    }

    public record Jobs(int batchSize, String expirePendingPaymentCron, String expirePendingApprovalCron,
                       String markNoShowCron, String markOverdueCron, String markDeviceOfflineCron,
                       String expirePromotionCron) {
    }

    public record BusinessDecisions(ParkingLotStatus adminRejectParkingTargetStatus) {
    }

    public record Minio(String endpoint, String accessKey, String secretKey, String bucket) {
    }

    public record Upload(long maxAvatarBytes, List<String> allowedAvatarContentTypes) {
    }
}
