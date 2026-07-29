package com.smartparking.controller;

import com.smartparking.administration.AdminService;
import com.smartparking.administration.dto.AdminDtos;
import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.security.RequestContext;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/dashboard")
public class AdminDashboardController {
    private final AdminService adminService;

    public AdminDashboardController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/summary")
    ApiResponse<AdminDtos.SystemDashboardSummaryResponse> summary() {
        return ApiResponse.ok(adminService.dashboardSummary(), RequestContext.requestId());
    }
}
