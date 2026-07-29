package com.smartparking.controller;

import com.smartparking.booking.BookingService;
import com.smartparking.booking.dto.BookingDtos;
import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.common.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/staff")
public class StaffBookingRequestController {
    private final BookingService bookingService;

    public StaffBookingRequestController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping("/booking-change-requests/{requestId}/approve")
    ApiResponse<BookingDtos.BookingRequestResponse> approveChange(@PathVariable UUID requestId) {
        return ApiResponse.ok(bookingService.approveChangeRequest(SecurityUtils.currentUser(), requestId), RequestContext.requestId());
    }

    @PostMapping("/booking-change-requests/{requestId}/reject")
    ApiResponse<BookingDtos.BookingRequestResponse> rejectChange(@PathVariable UUID requestId,
                                                                 @Valid @RequestBody BookingDtos.ReasonRequest request) {
        return ApiResponse.ok(bookingService.rejectChangeRequest(SecurityUtils.currentUser(), requestId, request.reason()), RequestContext.requestId());
    }

    @PostMapping("/booking-extension-requests/{requestId}/approve")
    ApiResponse<BookingDtos.BookingRequestResponse> approveExtension(@PathVariable UUID requestId) {
        return ApiResponse.ok(bookingService.approveExtensionRequest(SecurityUtils.currentUser(), requestId), RequestContext.requestId());
    }

    @PostMapping("/booking-extension-requests/{requestId}/reject")
    ApiResponse<BookingDtos.BookingRequestResponse> rejectExtension(@PathVariable UUID requestId,
                                                                    @Valid @RequestBody BookingDtos.ReasonRequest request) {
        return ApiResponse.ok(bookingService.rejectExtensionRequest(SecurityUtils.currentUser(), requestId, request.reason()), RequestContext.requestId());
    }
}
