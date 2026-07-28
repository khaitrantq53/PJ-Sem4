package com.smartparking.booking;

import com.smartparking.booking.dto.BookingDtos;
import com.smartparking.common.security.CurrentUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface BookingService {
    BookingDtos.BookingPreviewResponse preview(CurrentUser currentUser, BookingDtos.BookingRequest request);

    BookingDtos.BookingResponse create(CurrentUser currentUser, BookingDtos.BookingRequest request, String idempotencyKey);

    Page<BookingDtos.BookingResponse> customerBookings(CurrentUser currentUser, Pageable pageable);

    BookingDtos.BookingResponse customerDetail(CurrentUser currentUser, UUID bookingId);

    BookingDtos.CommandResponse cancel(CurrentUser currentUser, UUID bookingId, String reason);

    Page<BookingDtos.BookingResponse> staffBookings(CurrentUser currentUser, UUID parkingLotId, Pageable pageable);

    BookingDtos.BookingResponse staffDetail(CurrentUser currentUser, UUID bookingId);

    BookingDtos.CommandResponse approve(CurrentUser currentUser, UUID bookingId);

    BookingDtos.CommandResponse decline(CurrentUser currentUser, UUID bookingId, String reason);

    BookingDtos.CommandResponse checkIn(CurrentUser currentUser, UUID bookingId, BookingDtos.CheckInRequest request, String idempotencyKey);

    BookingDtos.CommandResponse checkOut(CurrentUser currentUser, UUID bookingId, BookingDtos.CheckOutRequest request, String idempotencyKey);
}
