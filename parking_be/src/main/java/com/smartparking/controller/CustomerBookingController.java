package com.smartparking.controller;

import com.smartparking.booking.BookingService;
import com.smartparking.booking.dto.BookingDtos;
import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.dto.PageResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.common.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customer/bookings")
public class CustomerBookingController {
    private final BookingService bookingService;

    public CustomerBookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping("/preview")
    ApiResponse<BookingDtos.BookingPreviewResponse> preview(@Valid @RequestBody BookingDtos.BookingRequest request) {
        return ApiResponse.ok(bookingService.preview(SecurityUtils.currentUser(), request), RequestContext.requestId());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<BookingDtos.BookingResponse> create(@Valid @RequestBody BookingDtos.BookingRequest request,
                                                    @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        return ApiResponse.ok(bookingService.create(SecurityUtils.currentUser(), request, idempotencyKey), RequestContext.requestId());
    }

    @GetMapping
    PageResponse<BookingDtos.BookingResponse> list(Pageable pageable) {
        return PageResponse.of(bookingService.customerBookings(SecurityUtils.currentUser(), pageable), RequestContext.requestId());
    }

    @GetMapping("/{bookingId}")
    ApiResponse<BookingDtos.BookingResponse> detail(@PathVariable UUID bookingId) {
        return ApiResponse.ok(bookingService.customerDetail(SecurityUtils.currentUser(), bookingId), RequestContext.requestId());
    }

    @GetMapping("/{bookingId}/qr-code")
    ApiResponse<Map<String, String>> qr(@PathVariable UUID bookingId) {
        BookingDtos.BookingResponse booking = bookingService.customerDetail(SecurityUtils.currentUser(), bookingId);
        return ApiResponse.ok(Map.of("bookingCode", booking.bookingCode()), RequestContext.requestId());
    }

    @PostMapping("/{bookingId}/cancel")
    ApiResponse<BookingDtos.CommandResponse> cancel(@PathVariable UUID bookingId,
                                                    @RequestBody(required = false) BookingDtos.ReasonRequest request) {
        String reason = request == null ? null : request.reason();
        return ApiResponse.ok(bookingService.cancel(SecurityUtils.currentUser(), bookingId, reason), RequestContext.requestId());
    }

    @PostMapping("/{bookingId}/change-requests")
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<BookingDtos.BookingRequestResponse> requestChange(@PathVariable UUID bookingId,
                                                                  @Valid @RequestBody BookingDtos.ChangeRequest request) {
        return ApiResponse.ok(bookingService.requestChange(SecurityUtils.currentUser(), bookingId, request), RequestContext.requestId());
    }

    @PostMapping("/{bookingId}/extension-requests")
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<BookingDtos.BookingRequestResponse> requestExtension(@PathVariable UUID bookingId,
                                                                     @Valid @RequestBody BookingDtos.ExtensionRequest request) {
        return ApiResponse.ok(bookingService.requestExtension(SecurityUtils.currentUser(), bookingId, request), RequestContext.requestId());
    }
}
