package com.smartparking.controller;

import com.smartparking.common.CommissionStatus;
import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.dto.PageResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.common.security.SecurityUtils;
import com.smartparking.payment.CommissionService;
import com.smartparking.payment.dto.CommissionDtos;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/finance")
public class AdminFinanceController {
    private final CommissionService commissionService;

    public AdminFinanceController(CommissionService commissionService) {
        this.commissionService = commissionService;
    }

    @GetMapping("/commissions/summary")
    ApiResponse<CommissionDtos.CommissionSummaryResponse> commissionSummary() {
        return ApiResponse.ok(commissionService.adminSummary(), RequestContext.requestId());
    }

    @GetMapping("/commissions")
    PageResponse<CommissionDtos.CommissionResponse> commissions(@RequestParam(required = false) CommissionStatus status,
                                                                Pageable pageable) {
        return PageResponse.of(commissionService.adminCommissions(status, pageable), RequestContext.requestId());
    }

    @PostMapping("/commissions/{commissionId}/mark-collected")
    ApiResponse<CommissionDtos.CommissionResponse> markCollected(@PathVariable UUID commissionId) {
        return ApiResponse.ok(commissionService.markCollected(SecurityUtils.currentUser(), commissionId), RequestContext.requestId());
    }
}
