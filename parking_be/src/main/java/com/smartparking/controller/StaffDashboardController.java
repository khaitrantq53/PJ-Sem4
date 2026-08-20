package com.smartparking.controller;

import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.common.security.SecurityUtils;
import com.smartparking.staff.StaffDashboardService;
import com.smartparking.staff.StaffDtos;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/staff/dashboard")
public class StaffDashboardController {
    private final StaffDashboardService dashboardService;

    public StaffDashboardController(StaffDashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/summary")
    ApiResponse<StaffDtos.DashboardSummaryResponse> summary(@RequestParam(required = false) UUID parkingLotId) {
        return ApiResponse.ok(dashboardService.summary(SecurityUtils.currentUser(), parkingLotId), RequestContext.requestId());
    }

    @GetMapping("/performance")
    ApiResponse<StaffDtos.PerformanceResponse> performance(@RequestParam(required = false) UUID parkingLotId,
                                                           @RequestParam(defaultValue = "bookings") String metric,
                                                           @RequestParam(defaultValue = "today") String range) {
        return ApiResponse.ok(dashboardService.performance(SecurityUtils.currentUser(), parkingLotId, metric, range),
                RequestContext.requestId());
    }
}
