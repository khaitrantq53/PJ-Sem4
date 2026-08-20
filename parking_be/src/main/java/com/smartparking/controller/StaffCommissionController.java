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
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/staff/commissions")
public class StaffCommissionController {
    private final CommissionService commissionService;

    public StaffCommissionController(CommissionService commissionService) {
        this.commissionService = commissionService;
    }

    @GetMapping("/summary")
    ApiResponse<CommissionDtos.CommissionSummaryResponse> summary(@RequestParam(required = false) CommissionStatus status,
                                                                  @RequestParam(required = false) String period) {
        return ApiResponse.ok(commissionService.staffSummary(SecurityUtils.currentUser(), status, period), RequestContext.requestId());
    }

    @GetMapping
    PageResponse<CommissionDtos.CommissionResponse> list(@RequestParam(required = false) CommissionStatus status,
                                                         @RequestParam(required = false) String period,
                                                         Pageable pageable) {
        return PageResponse.of(commissionService.staffCommissions(SecurityUtils.currentUser(), status, period, pageable),
                RequestContext.requestId());
    }
}
