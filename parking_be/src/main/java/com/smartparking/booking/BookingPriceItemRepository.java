package com.smartparking.booking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BookingPriceItemRepository extends JpaRepository<BookingPriceItem, UUID> {
}
