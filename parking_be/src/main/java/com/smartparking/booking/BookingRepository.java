package com.smartparking.booking;

import com.smartparking.common.BookingStatus;
import com.smartparking.common.VehicleType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID>, JpaSpecificationExecutor<Booking> {
    Optional<Booking> findByIdAndCustomerId(UUID bookingId, UUID customerId);

    Optional<Booking> findByIdempotencyKey(String idempotencyKey);

    Page<Booking> findByCustomerId(UUID customerId, Pageable pageable);

    Page<Booking> findByParkingLotId(UUID parkingLotId, Pageable pageable);

    Page<Booking> findByStatusAndApprovalExpiresAtBefore(BookingStatus status, OffsetDateTime now, Pageable pageable);

    Page<Booking> findByStatusAndHoldExpiresAtBefore(BookingStatus status, OffsetDateTime now, Pageable pageable);

    Page<Booking> findByStatusAndStartTimeBefore(BookingStatus status, OffsetDateTime now, Pageable pageable);

    Page<Booking> findByStatusAndEndTimeBefore(BookingStatus status, OffsetDateTime now, Pageable pageable);

    @Query("""
            select b
            from Booking b
            where (:parkingLotId is null or b.parkingLot.id = :parkingLotId)
              and (:status is null or b.status = :status)
              and (:startFrom is null or b.startTime >= :startFrom)
              and (:endTo is null or b.endTime <= :endTo)
              and (:vehicleType is null or b.vehicleType = :vehicleType)
              and (:bookingCode is null or lower(b.bookingCode) like concat('%', lower(cast(:bookingCode as string)), '%'))
              and (:plateNumber is null or lower(b.vehicle.plateNumber) like concat('%', lower(cast(:plateNumber as string)), '%'))
            """)
    Page<Booking> searchForAdmin(UUID parkingLotId, BookingStatus status, OffsetDateTime startFrom,
                                 OffsetDateTime endTo, VehicleType vehicleType, String bookingCode,
                                 String plateNumber, Pageable pageable);

    @Query("""
            select b
            from Booking b
            join ParkingLotStaff s on s.parkingLot.id = b.parkingLot.id
            where s.staff.id = :staffId
              and (:parkingLotId is null or b.parkingLot.id = :parkingLotId)
              and (:status is null or b.status = :status)
              and (:startFrom is null or b.startTime >= :startFrom)
              and (:endTo is null or b.endTime <= :endTo)
              and (:vehicleType is null or b.vehicleType = :vehicleType)
              and (:bookingCode is null or lower(b.bookingCode) like concat('%', lower(cast(:bookingCode as string)), '%'))
              and (:plateNumber is null or lower(b.vehicle.plateNumber) like concat('%', lower(cast(:plateNumber as string)), '%'))
            """)
    Page<Booking> searchForStaff(UUID staffId, UUID parkingLotId, BookingStatus status, OffsetDateTime startFrom,
                                 OffsetDateTime endTo, VehicleType vehicleType, String bookingCode, String plateNumber,
                                 Pageable pageable);

    @Query("""
            select count(b)
            from Booking b
            join ParkingLotStaff s on s.parkingLot.id = b.parkingLot.id
            where s.staff.id = :staffId
              and (:parkingLotId is null or b.parkingLot.id = :parkingLotId)
              and b.status = :status
            """)
    long countForStaffByStatus(UUID staffId, UUID parkingLotId, BookingStatus status);

    @Query("""
            select count(b)
            from Booking b
            join ParkingLotStaff s on s.parkingLot.id = b.parkingLot.id
            where s.staff.id = :staffId
              and (:parkingLotId is null or b.parkingLot.id = :parkingLotId)
              and b.startTime >= :startOfDay
              and b.startTime < :nextDay
            """)
    long countTodayForStaff(UUID staffId, UUID parkingLotId, OffsetDateTime startOfDay, OffsetDateTime nextDay);

    @Query("""
            select count(b)
            from Booking b
            join ParkingLotStaff s on s.parkingLot.id = b.parkingLot.id
            where s.staff.id = :staffId
              and (:parkingLotId is null or b.parkingLot.id = :parkingLotId)
              and b.startTime >= :startTime
              and b.startTime < :endTime
            """)
    long countForStaffBetween(UUID staffId, UUID parkingLotId, OffsetDateTime startTime, OffsetDateTime endTime);

    @Query("""
            select count(b)
            from Booking b
            where b.startTime >= :startOfDay
              and b.startTime < :nextDay
            """)
    long countTodayAll(OffsetDateTime startOfDay, OffsetDateTime nextDay);

    @Query("""
            select count(b)
            from Booking b
            where b.startTime >= :startTime
              and b.startTime < :endTime
            """)
    long countAllBetween(OffsetDateTime startTime, OffsetDateTime endTime);

    long countByStatus(BookingStatus status);

    @Query("""
            select count(b) > 0
            from Booking b
            where b.vehicle.id = :vehicleId
              and b.status in :statuses
              and b.startTime < :endTime
              and b.endTime > :startTime
            """)
    boolean existsVehicleOverlap(UUID vehicleId, Collection<BookingStatus> statuses, OffsetDateTime startTime, OffsetDateTime endTime);

    @Query("""
            select count(b) > 0
            from Booking b
            where b.vehicle.id = :vehicleId
              and b.id <> :excludedBookingId
              and b.status in :statuses
              and b.startTime < :endTime
              and b.endTime > :startTime
            """)
    boolean existsVehicleOverlapExcluding(UUID vehicleId, UUID excludedBookingId, Collection<BookingStatus> statuses,
                                          OffsetDateTime startTime, OffsetDateTime endTime);

    @Query("""
            select count(b)
            from Booking b
            where b.parkingLot.id = :parkingLotId
              and b.vehicleType = :vehicleType
              and b.status in :statuses
              and b.startTime < :endTime
              and b.endTime > :startTime
            """)
    long countActiveReservations(UUID parkingLotId, VehicleType vehicleType, Collection<BookingStatus> statuses,
                                 OffsetDateTime startTime, OffsetDateTime endTime);

    @Query("""
            select count(b)
            from Booking b
            where b.parkingLot.id = :parkingLotId
              and b.vehicleType = :vehicleType
              and b.status in :statuses
              and b.startTime < :endTime
              and b.endTime > :startTime
              and exists (
                  select 1
                  from BookingCapacityReservation r
                  where r.booking.id = b.id
                    and r.released = false
              )
            """)
    long countReservedCapacity(UUID parkingLotId, VehicleType vehicleType, Collection<BookingStatus> statuses,
                               OffsetDateTime startTime, OffsetDateTime endTime);

    @Query("""
            select count(b)
            from Booking b
            where b.parkingLot.id = :parkingLotId
              and b.vehicleType = :vehicleType
              and b.status in :statuses
              and b.startTime < :endTime
              and b.endTime > :startTime
            """)
    long countCheckedInCapacity(UUID parkingLotId, VehicleType vehicleType, Collection<BookingStatus> statuses,
                                OffsetDateTime startTime, OffsetDateTime endTime);

    @Query("""
            select count(b)
            from Booking b
            where b.parkingLot.id = :parkingLotId
              and b.vehicleType = :vehicleType
              and b.status in :statuses
              and b.actualCheckInTime is not null
              and b.actualCheckOutTime is null
            """)
    long countCurrentCheckedInCapacity(UUID parkingLotId, VehicleType vehicleType, Collection<BookingStatus> statuses);

    @Query("""
            select count(b)
            from Booking b
            where b.parkingLot.id = :parkingLotId
              and b.vehicleType = :vehicleType
              and b.id <> :excludedBookingId
              and b.status in :statuses
              and b.actualCheckInTime is not null
              and b.actualCheckOutTime is null
            """)
    long countCurrentCheckedInCapacityExcluding(UUID parkingLotId, VehicleType vehicleType, UUID excludedBookingId,
                                               Collection<BookingStatus> statuses);

    @Query("""
            select count(b)
            from Booking b
            where b.parkingLot.id = :parkingLotId
              and b.vehicleType = :vehicleType
              and b.id <> :excludedBookingId
              and b.status in :statuses
              and b.startTime < :endTime
              and b.endTime > :startTime
            """)
    long countActiveReservationsExcluding(UUID parkingLotId, VehicleType vehicleType, UUID excludedBookingId,
                                          Collection<BookingStatus> statuses, OffsetDateTime startTime, OffsetDateTime endTime);

    @Query("""
            select count(b)
            from Booking b
            where b.parkingLot.id = :parkingLotId
              and b.vehicleType = :vehicleType
              and b.id <> :excludedBookingId
              and b.status in :statuses
              and b.startTime < :endTime
              and b.endTime > :startTime
              and exists (
                  select 1
                  from BookingCapacityReservation r
                  where r.booking.id = b.id
                    and r.released = false
              )
            """)
    long countReservedCapacityExcluding(UUID parkingLotId, VehicleType vehicleType, UUID excludedBookingId,
                                        Collection<BookingStatus> statuses, OffsetDateTime startTime, OffsetDateTime endTime);

    @Query("""
            select count(b)
            from Booking b
            where b.parkingLot.id = :parkingLotId
              and b.vehicleType = :vehicleType
              and b.id <> :excludedBookingId
              and b.status in :statuses
              and b.startTime < :endTime
              and b.endTime > :startTime
            """)
    long countCheckedInCapacityExcluding(UUID parkingLotId, VehicleType vehicleType, UUID excludedBookingId,
                                         Collection<BookingStatus> statuses, OffsetDateTime startTime, OffsetDateTime endTime);
}
