package com.smartparking.controller;

import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.payment.PaymentService;
import com.smartparking.payment.dto.PaymentDtos;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/payment-webhooks")
public class PaymentWebhookController {
    private final PaymentService paymentService;

    public PaymentWebhookController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/{provider}")
    ApiResponse<PaymentDtos.PaymentResponse> webhook(@PathVariable String provider,
                                                     @Valid @RequestBody PaymentDtos.WebhookRequest request,
                                                     @RequestHeader("X-Signature") String signature,
                                                     @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
        return ApiResponse.ok(paymentService.webhook(provider, request, signature, idempotencyKey), RequestContext.requestId());
    }
}
