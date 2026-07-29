package com.smartparking.booking;

import com.smartparking.booking.dto.BookingDtos;
import com.smartparking.common.BookingStatus;
import com.smartparking.common.VehicleType;
import com.smartparking.common.security.CurrentUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface BookingService {
    BookingDtos.BookingPreviewResponse preview(CurrentUser currentUser, BookingDtos.BookingRequest request);

    BookingDtos.BookingResponse create(CurrentUser currentUser, BookingDtos.BookingRequest request, String idempotencyKey);

    Page<BookingDtos.BookingResponse> customerBookings(CurrentUser currentUser, Pageable pageable);

    BookingDtos.BookingResponse customerDetail(CurrentUser currentUser, UUID bookingId);

    BookingDtos.CommandResponse cancel(CurrentUser currentUser, UUID bookingId, String reason);

    BookingDtos.BookingRequestResponse requestChange(CurrentUser currentUser, UUID bookingId, BookingDtos.ChangeRequest request);

    BookingDtos.BookingRequestResponse requestExtension(CurrentUser currentUser, UUID bookingId, BookingDtos.ExtensionRequest request);

    Page<BookingDtos.BookingResponse> staffBookings(CurrentUser currentUser, UUID parkingLotId, BookingStatus status,
                                                    OffsetDateTime startFrom, OffsetDateTime endTo,
                                                    VehicleType vehicleType, String bookingCode, String plateNumber,
                                                    Pageable pageable);

    BookingDtos.BookingResponse staffDetail(CurrentUser currentUser, UUID bookingId);

    BookingDtos.CommandResponse approve(CurrentUser currentUser, UUID bookingId);

    BookingDtos.CommandResponse decline(CurrentUser currentUser, UUID bookingId, String reason);

    BookingDtos.BookingRequestResponse approveChangeRequest(CurrentUser currentUser, UUID requestId);

    BookingDtos.BookingRequestResponse rejectChangeRequest(CurrentUser currentUser, UUID requestId, String reason);

    BookingDtos.BookingRequestResponse approveExtensionRequest(CurrentUser currentUser, UUID requestId);

    BookingDtos.BookingRequestResponse rejectExtensionRequest(CurrentUser currentUser, UUID requestId, String reason);

    BookingDtos.CommandResponse checkIn(CurrentUser currentUser, UUID bookingId, BookingDtos.CheckInRequest request, String idempotencyKey);

    BookingDtos.CommandResponse checkOut(CurrentUser currentUser, UUID bookingId, BookingDtos.CheckOutRequest request, String idempotencyKey);
}
