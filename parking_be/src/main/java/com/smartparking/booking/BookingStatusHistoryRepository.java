package com.smartparking.booking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BookingStatusHistoryRepository extends JpaRepository<BookingStatusHistory, UUID> {
}
