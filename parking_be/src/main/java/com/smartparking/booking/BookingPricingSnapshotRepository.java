package com.smartparking.booking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BookingPricingSnapshotRepository extends JpaRepository<BookingPricingSnapshot, UUID> {
    Optional<BookingPricingSnapshot> findByBookingId(UUID bookingId);
}
