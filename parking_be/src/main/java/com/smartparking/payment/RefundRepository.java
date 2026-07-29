package com.smartparking.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface RefundRepository extends JpaRepository<Refund, UUID> {
    Optional<Refund> findByIdempotencyKey(String idempotencyKey);

    @Query("""
            select coalesce(sum(r.amount), 0)
            from Refund r
            where r.payment.id = :paymentId
              and r.status = com.smartparking.common.RefundStatus.SUCCEEDED
            """)
    BigDecimal sumSucceededAmountByPaymentId(UUID paymentId);

    @Query("""
            select coalesce(sum(r.amount), 0)
            from Refund r
            where r.status = com.smartparking.common.RefundStatus.SUCCEEDED
              and r.createdAt >= :startOfDay
              and r.createdAt < :nextDay
            """)
    BigDecimal refundTodayAll(OffsetDateTime startOfDay, OffsetDateTime nextDay);
}
