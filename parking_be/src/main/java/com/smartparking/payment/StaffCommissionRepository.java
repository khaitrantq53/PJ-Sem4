package com.smartparking.payment;

import com.smartparking.common.CommissionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

public interface StaffCommissionRepository extends JpaRepository<StaffCommission, UUID> {
    boolean existsByPaymentId(UUID paymentId);

    Optional<StaffCommission> findByPaymentId(UUID paymentId);

    Page<StaffCommission> findByStaffId(UUID staffId, Pageable pageable);

    Page<StaffCommission> findByStaffIdAndStatus(UUID staffId, CommissionStatus status, Pageable pageable);

    Page<StaffCommission> findByStatus(CommissionStatus status, Pageable pageable);

    @Query("""
            select c
            from StaffCommission c
            where (:staffId is null or c.staff.id = :staffId)
              and (:status is null or c.status = :status)
              and c.createdAt >= :startTime
              and c.createdAt < :endTime
            """)
    Page<StaffCommission> findFiltered(UUID staffId, CommissionStatus status,
                                       OffsetDateTime startTime, OffsetDateTime endTime,
                                       Pageable pageable);

    @Query("""
            select count(c)
            from StaffCommission c
            where (:staffId is null or c.staff.id = :staffId)
              and (:status is null or c.status = :status)
              and c.createdAt >= :startTime
              and c.createdAt < :endTime
            """)
    long countFiltered(UUID staffId, CommissionStatus status, OffsetDateTime startTime, OffsetDateTime endTime);

    @Query("""
            select coalesce(sum(c.commissionAmount), 0)
            from StaffCommission c
            where (:staffId is null or c.staff.id = :staffId)
              and (:status is null or c.status = :status)
            """)
    BigDecimal sumCommission(UUID staffId, CommissionStatus status);

    @Query("""
            select coalesce(sum(c.grossAmount), 0)
            from StaffCommission c
            where (:staffId is null or c.staff.id = :staffId)
              and (:status is null or c.status = :status)
            """)
    BigDecimal sumGross(UUID staffId, CommissionStatus status);

    @Query("""
            select coalesce(sum(c.staffNetAmount), 0)
            from StaffCommission c
            where (:staffId is null or c.staff.id = :staffId)
              and (:status is null or c.status = :status)
            """)
    BigDecimal sumStaffNet(UUID staffId, CommissionStatus status);

    @Query("""
            select coalesce(sum(c.grossAmount), 0)
            from StaffCommission c
            where (:staffId is null or c.staff.id = :staffId)
              and (:status is null or c.status = :status)
              and c.createdAt >= :startTime
              and c.createdAt < :endTime
            """)
    BigDecimal sumGrossFiltered(UUID staffId, CommissionStatus status, OffsetDateTime startTime, OffsetDateTime endTime);

    @Query("""
            select coalesce(sum(c.commissionAmount), 0)
            from StaffCommission c
            where (:staffId is null or c.staff.id = :staffId)
              and (:status is null or c.status = :status)
              and c.createdAt >= :startTime
              and c.createdAt < :endTime
            """)
    BigDecimal sumCommissionFiltered(UUID staffId, CommissionStatus status, OffsetDateTime startTime, OffsetDateTime endTime);

    @Query("""
            select coalesce(sum(c.staffNetAmount), 0)
            from StaffCommission c
            where (:staffId is null or c.staff.id = :staffId)
              and (:status is null or c.status = :status)
              and c.createdAt >= :startTime
              and c.createdAt < :endTime
            """)
    BigDecimal sumStaffNetFiltered(UUID staffId, CommissionStatus status, OffsetDateTime startTime, OffsetDateTime endTime);

    @Query("""
            select coalesce(sum(c.commissionAmount), 0)
            from StaffCommission c
            where (:staffId is null or c.staff.id = :staffId)
              and c.createdAt >= :startTime
              and c.createdAt < :endTime
            """)
    BigDecimal sumCommissionBetween(UUID staffId, OffsetDateTime startTime, OffsetDateTime endTime);
}
