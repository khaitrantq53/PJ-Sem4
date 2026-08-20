package com.smartparking.payment.dto;

import com.smartparking.common.CommissionStatus;
import com.smartparking.common.PaymentMethod;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public final class CommissionDtos {
    private CommissionDtos() {
    }

    public record CommissionResponse(UUID id, UUID staffId, String staffName, String staffEmail,
                                     UUID parkingLotId, String parkingLotName, UUID bookingId,
                                     String bookingCode, UUID paymentId, BigDecimal grossAmount,
                                     BigDecimal commissionRate, BigDecimal commissionAmount,
                                     BigDecimal staffNetAmount, String currency, CommissionStatus status,
                                     PaymentMethod paymentMethod, OffsetDateTime paidAt, Long version, OffsetDateTime createdAt) {
    }

    public record CommissionSummaryResponse(BigDecimal grossAmount, BigDecimal commissionAmount,
                                            BigDecimal staffNetAmount, Long bookingCommissionCount,
                                            BigDecimal payableAmount, BigDecimal paidAmount,
                                            BigDecimal todayCommission, String currency) {
    }
}
