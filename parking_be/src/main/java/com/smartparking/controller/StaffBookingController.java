package com.smartparking.controller;

import com.smartparking.booking.BookingService;
import com.smartparking.booking.dto.BookingDtos;
import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.dto.PageResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.common.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/staff/bookings")
public class StaffBookingController {
    private final BookingService bookingService;

    public StaffBookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @GetMapping
    PageResponse<BookingDtos.BookingResponse> list(@RequestParam UUID parkingLotId, Pageable pageable) {
        return PageResponse.of(bookingService.staffBookings(SecurityUtils.currentUser(), parkingLotId, pageable), RequestContext.requestId());
    }

    @GetMapping("/{bookingId}")
    ApiResponse<BookingDtos.BookingResponse> detail(@PathVariable UUID bookingId) {
        return ApiResponse.ok(bookingService.staffDetail(SecurityUtils.currentUser(), bookingId), RequestContext.requestId());
    }

    @PostMapping("/{bookingId}/approve")
    ApiResponse<BookingDtos.CommandResponse> approve(@PathVariable UUID bookingId) {
        return ApiResponse.ok(bookingService.approve(SecurityUtils.currentUser(), bookingId), RequestContext.requestId());
    }

    @PostMapping("/{bookingId}/decline")
    ApiResponse<BookingDtos.CommandResponse> decline(@PathVariable UUID bookingId,
                                                     @Valid @RequestBody BookingDtos.ReasonRequest request) {
        return ApiResponse.ok(bookingService.decline(SecurityUtils.currentUser(), bookingId, request.reason()), RequestContext.requestId());
    }

    @PostMapping("/{bookingId}/check-in")
    ApiResponse<BookingDtos.CommandResponse> checkIn(@PathVariable UUID bookingId,
                                                     @Valid @RequestBody BookingDtos.CheckInRequest request,
                                                     @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        return ApiResponse.ok(bookingService.checkIn(SecurityUtils.currentUser(), bookingId, request, idempotencyKey), RequestContext.requestId());
    }

    @PostMapping("/{bookingId}/check-out")
    ApiResponse<BookingDtos.CommandResponse> checkOut(@PathVariable UUID bookingId,
                                                      @Valid @RequestBody BookingDtos.CheckOutRequest request,
                                                      @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        return ApiResponse.ok(bookingService.checkOut(SecurityUtils.currentUser(), bookingId, request, idempotencyKey), RequestContext.requestId());
    }
}
