package com.smartparking.booking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface BookingCommandIdempotencyRepository extends JpaRepository<BookingCommandIdempotency, UUID> {
    Optional<BookingCommandIdempotency> findByIdempotencyKey(String idempotencyKey);
}
