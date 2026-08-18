package com.smartparking.auth;

import com.smartparking.auth.dto.AuthDtos;
import com.smartparking.common.security.CurrentUser;

public interface AuthService {
    AuthDtos.AuthResponse registerCustomer(AuthDtos.CustomerRegisterRequest request);

    AuthDtos.AuthResponse login(AuthDtos.LoginRequest request);

    AuthDtos.AuthResponse confirmCustomerRegistration(AuthDtos.ConfirmRegistrationRequest request);

    AuthDtos.AuthResponse refresh(AuthDtos.RefreshRequest request);

    void logout(AuthDtos.RefreshRequest request);

    AuthDtos.OtpResponse sendOtp(AuthDtos.OtpSendRequest request);

    void verifyOtp(AuthDtos.OtpVerifyRequest request);

    void forgotPassword(AuthDtos.ForgotPasswordRequest request);

    void resetPassword(AuthDtos.ResetPasswordRequest request);

    AuthDtos.AccountSummary me(CurrentUser currentUser);

    void changePassword(CurrentUser currentUser, AuthDtos.ChangePasswordRequest request);
}
