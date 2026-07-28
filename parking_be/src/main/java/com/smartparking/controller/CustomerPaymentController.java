package com.smartparking.controller;

import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.common.security.SecurityUtils;
import com.smartparking.payment.PaymentService;
import com.smartparking.payment.dto.PaymentDtos;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class CustomerPaymentController {
    private final PaymentService paymentService;

    public CustomerPaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/api/v1/customer/bookings/{bookingId}/payments")
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<PaymentDtos.PaymentResponse> create(@PathVariable UUID bookingId,
                                                    @Valid @RequestBody PaymentDtos.CreatePaymentRequest request,
                                                    @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        return ApiResponse.ok(paymentService.create(SecurityUtils.currentUser(), bookingId, request, idempotencyKey), RequestContext.requestId());
    }

    @GetMapping("/api/v1/customer/bookings/{bookingId}/payments")
    ApiResponse<List<PaymentDtos.PaymentResponse>> list(@PathVariable UUID bookingId) {
        return ApiResponse.ok(paymentService.customerBookingPayments(SecurityUtils.currentUser(), bookingId), RequestContext.requestId());
    }

    @GetMapping("/api/v1/customer/payments/{paymentId}")
    ApiResponse<PaymentDtos.PaymentResponse> detail(@PathVariable UUID paymentId) {
        return ApiResponse.ok(paymentService.customerPayment(SecurityUtils.currentUser(), paymentId), RequestContext.requestId());
    }
}
