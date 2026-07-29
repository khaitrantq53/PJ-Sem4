package com.smartparking.controller;

import com.smartparking.customer.CustomerDtos;
import com.smartparking.customer.CustomerService;
import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.common.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;

@RestController
@RequestMapping("/api/v1/customers/me")
public class CustomerController {
    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    ApiResponse<CustomerDtos.ProfileResponse> me() {
        return ApiResponse.ok(customerService.me(SecurityUtils.currentUser()), RequestContext.requestId());
    }

    @PatchMapping
    ApiResponse<CustomerDtos.ProfileResponse> update(@Valid @RequestBody CustomerDtos.ProfileUpdateRequest request) {
        return ApiResponse.ok(customerService.update(SecurityUtils.currentUser(), request), RequestContext.requestId());
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ApiResponse<CustomerDtos.ProfileResponse> uploadAvatar(@RequestPart("file") MultipartFile file) {
        return ApiResponse.ok(customerService.uploadAvatar(SecurityUtils.currentUser(), file), RequestContext.requestId());
    }
}
