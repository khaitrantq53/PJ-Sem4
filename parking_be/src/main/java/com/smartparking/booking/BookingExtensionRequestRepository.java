package com.smartparking.booking;

import com.smartparking.common.RequestStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BookingExtensionRequestRepository extends JpaRepository<BookingExtensionRequest, UUID> {
    boolean existsByBookingIdAndStatus(UUID bookingId, RequestStatus status);

    Optional<BookingExtensionRequest> findByIdAndStatus(UUID id, RequestStatus status);
}
