package com.smartparking.booking;

import com.smartparking.common.BookingStatus;
import com.smartparking.common.VehicleType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

public interface BookingRepository extends JpaRepository<Booking, UUID> {
    Optional<Booking> findByIdAndCustomerId(UUID bookingId, UUID customerId);

    Optional<Booking> findByIdempotencyKey(String idempotencyKey);

    Page<Booking> findByCustomerId(UUID customerId, Pageable pageable);

    Page<Booking> findByParkingLotId(UUID parkingLotId, Pageable pageable);

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
}
