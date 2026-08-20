package com.smartparking.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    List<Payment> findByBookingId(UUID bookingId);

    Optional<Payment> findByIdAndBookingCustomerId(UUID paymentId, UUID customerId);

    boolean existsByBookingIdAndPaymentMethod(UUID bookingId, com.smartparking.common.PaymentMethod paymentMethod);

    Optional<Payment> findByBookingIdAndPaymentMethod(UUID bookingId, com.smartparking.common.PaymentMethod paymentMethod);

    Optional<Payment> findByIdempotencyKey(String idempotencyKey);

    Optional<Payment> findByProviderTransactionId(String providerTransactionId);

    @Query("""
            select coalesce(sum(p.amount), 0)
            from Payment p
            join ParkingLotStaff s on s.parkingLot.id = p.booking.parkingLot.id
            where s.staff.id = :staffId
              and (:parkingLotId is null or p.booking.parkingLot.id = :parkingLotId)
              and p.status = com.smartparking.common.PaymentStatus.PAID
              and p.createdAt >= :startOfDay
              and p.createdAt < :nextDay
            """)
    BigDecimal revenueTodayForStaff(UUID staffId, UUID parkingLotId, OffsetDateTime startOfDay, OffsetDateTime nextDay);

    @Query("""
            select coalesce(sum(p.amount), 0)
            from Payment p
            join ParkingLotStaff s on s.parkingLot.id = p.booking.parkingLot.id
            where s.staff.id = :staffId
              and (:parkingLotId is null or p.booking.parkingLot.id = :parkingLotId)
              and p.status = com.smartparking.common.PaymentStatus.PAID
              and p.createdAt >= :startTime
              and p.createdAt < :endTime
            """)
    BigDecimal revenueForStaffBetween(UUID staffId, UUID parkingLotId, OffsetDateTime startTime, OffsetDateTime endTime);

    @Query("""
            select coalesce(sum(p.amount), 0)
            from Payment p
            where p.status = com.smartparking.common.PaymentStatus.PAID
              and p.createdAt >= :startOfDay
              and p.createdAt < :nextDay
            """)
    BigDecimal revenueTodayAll(OffsetDateTime startOfDay, OffsetDateTime nextDay);

    @Query("""
            select coalesce(sum(p.amount), 0)
            from Payment p
            where p.status = com.smartparking.common.PaymentStatus.PAID
              and p.createdAt >= :startTime
              and p.createdAt < :endTime
            """)
    BigDecimal revenueAllBetween(OffsetDateTime startTime, OffsetDateTime endTime);
}
