package com.smartparking.controller;

import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.common.security.SecurityUtils;
import com.smartparking.payment.PaymentService;
import com.smartparking.payment.dto.PaymentDtos;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/payments")
public class AdminPaymentController {
    private final PaymentService paymentService;

    public AdminPaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/{paymentId}/refund")
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<PaymentDtos.RefundResponse> refund(@PathVariable UUID paymentId,
                                                   @Valid @RequestBody PaymentDtos.RefundRequest request,
                                                   @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        return ApiResponse.ok(paymentService.refund(SecurityUtils.currentUser(), paymentId, request, idempotencyKey), RequestContext.requestId());
    }
}
