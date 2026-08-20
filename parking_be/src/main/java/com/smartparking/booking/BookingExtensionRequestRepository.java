package com.smartparking.booking;

import com.smartparking.common.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface BookingExtensionRequestRepository extends JpaRepository<BookingExtensionRequest, UUID> {
    boolean existsByBookingIdAndStatus(UUID bookingId, RequestStatus status);

    Optional<BookingExtensionRequest> findByIdAndStatus(UUID id, RequestStatus status);

    @Query("""
            select request
            from BookingExtensionRequest request
            join request.booking booking
            join ParkingLotStaff staff on staff.parkingLot.id = booking.parkingLot.id
            where staff.staff.id = :staffId
              and (:status is null or request.status = :status)
            """)
    Page<BookingExtensionRequest> findForStaff(UUID staffId, RequestStatus status, Pageable pageable);
}
