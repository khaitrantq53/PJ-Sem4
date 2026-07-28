package com.smartparking.booking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BookingCapacityReservationRepository extends JpaRepository<BookingCapacityReservation, UUID> {
    Optional<BookingCapacityReservation> findByBookingIdAndReleasedFalse(UUID bookingId);
}
