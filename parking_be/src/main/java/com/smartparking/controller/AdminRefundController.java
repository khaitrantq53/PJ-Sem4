package com.smartparking.controller;

import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.dto.PageResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.payment.PaymentService;
import com.smartparking.payment.dto.PaymentDtos;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/refunds")
public class AdminRefundController {
    private final PaymentService paymentService;

    public AdminRefundController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping
    PageResponse<PaymentDtos.RefundResponse> list(Pageable pageable) {
        return PageResponse.of(paymentService.refunds(pageable), RequestContext.requestId());
    }

    @GetMapping("/{refundId}")
    ApiResponse<PaymentDtos.RefundResponse> detail(@PathVariable UUID refundId) {
        return ApiResponse.ok(paymentService.refundDetail(refundId), RequestContext.requestId());
    }
}
