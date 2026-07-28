package com.smartparking.payment.dto;

import com.smartparking.common.PaymentMethod;
import com.smartparking.common.PaymentStatus;
import com.smartparking.common.RefundStatus;
import com.smartparking.common.PaymentTransactionStatus;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public final class PaymentDtos {
    private PaymentDtos() {
    }

    public record CreatePaymentRequest(@NotNull PaymentMethod paymentMethod) {
    }

    public record PaymentResponse(UUID id, UUID bookingId, PaymentMethod paymentMethod, PaymentStatus status,
                                  BigDecimal amount, String currency, String provider, String providerTransactionId,
                                  Long version, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    }

    public record WebhookRequest(@NotBlank String providerTransactionId, @NotNull PaymentTransactionStatus status,
                                 String paymentId, String rawPayload) {
    }

    public record RefundRequest(@NotNull @DecimalMin("0.01") BigDecimal amount, @NotBlank String reason) {
    }

    public record RefundResponse(UUID id, UUID paymentId, BigDecimal amount, String currency, RefundStatus status,
                                 String reason, Long version, OffsetDateTime createdAt) {
    }
}
