package com.smartparking.controller;

import com.smartparking.auth.AuthService;
import com.smartparking.auth.dto.AuthDtos;
import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.common.security.SecurityUtils;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/customers/register")
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<AuthDtos.AuthResponse> registerCustomer(@Valid @RequestBody AuthDtos.CustomerRegisterRequest request) {
        return ApiResponse.ok(authService.registerCustomer(request), RequestContext.requestId());
    }

    @PostMapping("/login")
    ApiResponse<AuthDtos.AuthResponse> login(@Valid @RequestBody AuthDtos.LoginRequest request) {
        return ApiResponse.ok(authService.login(request), RequestContext.requestId());
    }

    @PostMapping("/customers/confirm-registration")
    ApiResponse<AuthDtos.AuthResponse> confirmCustomerRegistration(@Valid @RequestBody AuthDtos.ConfirmRegistrationRequest request) {
        return ApiResponse.ok(authService.confirmCustomerRegistration(request), RequestContext.requestId());
    }

    @PostMapping("/refresh")
    ApiResponse<AuthDtos.AuthResponse> refresh(@Valid @RequestBody AuthDtos.RefreshRequest request) {
        return ApiResponse.ok(authService.refresh(request), RequestContext.requestId());
    }

    @PostMapping("/otp/send")
    ApiResponse<AuthDtos.OtpResponse> sendOtp(@Valid @RequestBody AuthDtos.OtpSendRequest request) {
        return ApiResponse.ok(authService.sendOtp(request), RequestContext.requestId());
    }

    @PostMapping("/otp/verify")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void verifyOtp(@Valid @RequestBody AuthDtos.OtpVerifyRequest request) {
        authService.verifyOtp(request);
    }

    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void forgotPassword(@Valid @RequestBody AuthDtos.ForgotPasswordRequest request) {
        authService.forgotPassword(request);
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void resetPassword(@Valid @RequestBody AuthDtos.ResetPasswordRequest request) {
        authService.resetPassword(request);
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(@Valid @RequestBody AuthDtos.RefreshRequest request) {
        authService.logout(request);
    }

    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void changePassword(@Valid @RequestBody AuthDtos.ChangePasswordRequest request) {
        authService.changePassword(SecurityUtils.currentUser(), request);
    }

    @GetMapping("/me")
    ApiResponse<AuthDtos.AccountSummary> me() {
        return ApiResponse.ok(authService.me(SecurityUtils.currentUser()), RequestContext.requestId());
    }
}
