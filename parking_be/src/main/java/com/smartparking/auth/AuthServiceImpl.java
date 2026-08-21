package com.smartparking.auth;

import com.smartparking.account.Account;
import com.smartparking.account.AccountCredential;
import com.smartparking.account.AccountCredentialRepository;
import com.smartparking.account.AccountRepository;
import com.smartparking.account.CustomerProfile;
import com.smartparking.account.CustomerProfileRepository;
import com.smartparking.auth.dto.AuthDtos;
import com.smartparking.common.AccountStatus;
import com.smartparking.common.OtpPurpose;
import com.smartparking.common.Role;
import com.smartparking.common.config.SmartParkingProperties;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.common.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {
    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);

    private final AccountRepository accountRepository;
    private final AccountCredentialRepository credentialRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OtpRequestRepository otpRequestRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SmartParkingProperties properties;
    private final RestClient emailClient;
    private final String brevoApiKey;
    private final String brevoFromEmail;
    private final String brevoFromName;
    private final String brevoApiUrl;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthServiceImpl(AccountRepository accountRepository,
                           AccountCredentialRepository credentialRepository,
                           CustomerProfileRepository customerProfileRepository,
                           RefreshTokenRepository refreshTokenRepository,
                           OtpRequestRepository otpRequestRepository,
                           PasswordEncoder passwordEncoder,
                           JwtService jwtService,
                           SmartParkingProperties properties,
                           RestClient.Builder restClientBuilder,
                           @Value("${smart-parking.email.brevo.api-key:}") String brevoApiKey,
                           @Value("${smart-parking.email.brevo.from-email:}") String brevoFromEmail,
                           @Value("${smart-parking.email.brevo.from-name:Smart Parking}") String brevoFromName,
                           @Value("${smart-parking.email.brevo.api-url:https://api.brevo.com/v3/smtp/email}") String brevoApiUrl) {
        this.accountRepository = accountRepository;
        this.credentialRepository = credentialRepository;
        this.customerProfileRepository = customerProfileRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.otpRequestRepository = otpRequestRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.properties = properties;
        this.emailClient = restClientBuilder.build();
        this.brevoApiKey = blankToEmpty(brevoApiKey);
        this.brevoFromEmail = blankToEmpty(brevoFromEmail);
        this.brevoFromName = blankToEmpty(brevoFromName);
        this.brevoApiUrl = blankToEmpty(brevoApiUrl);
    }

    @Override
    @Transactional
    public AuthDtos.AuthResponse registerCustomer(AuthDtos.CustomerRegisterRequest request) {
        String email = normalizeDestination(request.email());
        String phone = normalizeDestination(request.phone());
        if (email == null || email.isBlank()) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Email là bắt buộc để xác thực tài khoản");
        }
        var existingAccount = accountRepository.findByEmail(email);
        if (existingAccount.isPresent()) {
            Account account = existingAccount.get();
            if (account.getRole() == Role.CUSTOMER && account.getStatus() == AccountStatus.PENDING_APPROVAL) {
                updatePendingCustomerRegistration(account, request, phone);
                sendOtp(normalizeDestination(account.getEmail()), OtpPurpose.CUSTOMER_REGISTRATION, account.getId());
                return pendingResponse(account);
            }
            throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Email đã được sử dụng");
        }
        if (phone != null) {
            accountRepository.findByPhone(phone)
                    .ifPresent(account -> {
                        throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Số điện thoại đã được sử dụng");
                    });
        }
        Account account = new Account();
        account.setEmail(email);
        account.setPhone(phone);
        account.setRole(Role.CUSTOMER);
        account.setStatus(AccountStatus.PENDING_APPROVAL);
        account = accountRepository.save(account);

        AccountCredential credential = new AccountCredential();
        credential.setAccount(account);
        credential.setPasswordHash(passwordEncoder.encode(request.password()));
        credentialRepository.save(credential);

        CustomerProfile profile = new CustomerProfile();
        profile.setAccount(account);
        profile.setFullName(request.fullName());
        customerProfileRepository.save(profile);

        sendOtp(normalizeDestination(account.getEmail()), OtpPurpose.CUSTOMER_REGISTRATION, account.getId());
        return pendingResponse(account);
    }

    private void updatePendingCustomerRegistration(Account account, AuthDtos.CustomerRegisterRequest request, String phone) {
        if (phone != null) {
            accountRepository.findByPhone(phone)
                    .filter(other -> !other.getId().equals(account.getId()))
                    .ifPresent(other -> {
                        throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Số điện thoại đã được sử dụng");
                    });
            account.setPhone(phone);
        }

        AccountCredential credential = credentialRepository.findByAccountId(account.getId())
                .orElseGet(() -> {
                    AccountCredential newCredential = new AccountCredential();
                    newCredential.setAccount(account);
                    return newCredential;
                });
        credential.setPasswordHash(passwordEncoder.encode(request.password()));
        credentialRepository.save(credential);

        CustomerProfile profile = customerProfileRepository.findByAccountId(account.getId())
                .orElseGet(() -> {
                    CustomerProfile newProfile = new CustomerProfile();
                    newProfile.setAccount(account);
                    return newProfile;
                });
        profile.setFullName(request.fullName());
        customerProfileRepository.save(profile);
    }

    @Override
    @Transactional
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest request) {
        Account account = accountRepository.findByEmail(request.username())
                .or(() -> accountRepository.findByPhone(request.username()))
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Thông tin đăng nhập không hợp lệ"));
        AccountCredential credential = credentialRepository.findByAccountId(account.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Thông tin đăng nhập không hợp lệ"));
        if (!passwordEncoder.matches(request.password(), credential.getPasswordHash())) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Thông tin đăng nhập không hợp lệ");
        }
        if (account.getStatus() == AccountStatus.PENDING_APPROVAL && account.getRole() == Role.CUSTOMER) {
            sendOtp(normalizeDestination(account.getEmail()), OtpPurpose.CUSTOMER_REGISTRATION, account.getId());
            return pendingResponse(account);
        }
        assertActive(account);
        return issueTokens(account);
    }

    @Override
    @Transactional
    public AuthDtos.AuthResponse confirmCustomerRegistration(AuthDtos.ConfirmRegistrationRequest request) {
        String email = normalizeDestination(request.email());
        Account account = accountRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Account không tồn tại"));
        if (account.getRole() != Role.CUSTOMER) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Account không phải customer");
        }
        if (account.getStatus() == AccountStatus.LOCKED) {
            throw new BusinessException(ErrorCode.AUTH_ACCOUNT_LOCKED, "Account đang bị khóa");
        }
        if (account.getStatus() == AccountStatus.ACTIVE) {
            return issueTokens(account);
        }
        if (account.getStatus() != AccountStatus.PENDING_APPROVAL) {
            throw new BusinessException(ErrorCode.AUTH_ACCOUNT_NOT_ACTIVE, "Account chưa ACTIVE");
        }
        verifyOtp(email, OtpPurpose.CUSTOMER_REGISTRATION, request.otp());
        account.setStatus(AccountStatus.ACTIVE);
        accountRepository.save(account);
        return issueTokens(account);
    }

    @Override
    @Transactional
    public AuthDtos.AuthResponse refresh(AuthDtos.RefreshRequest request) {
        RefreshToken refreshToken = refreshTokenRepository.findByTokenHashAndRevokedAtIsNull(hash(request.refreshToken()))
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_REFRESH_TOKEN_INVALID, "Refresh token không hợp lệ"));
        if (refreshToken.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new BusinessException(ErrorCode.AUTH_REFRESH_TOKEN_INVALID, "Refresh token đã hết hạn");
        }
        assertActive(refreshToken.getAccount());
        refreshToken.setRevokedAt(OffsetDateTime.now());
        return issueTokens(refreshToken.getAccount());
    }

    @Override
    @Transactional
    public void logout(AuthDtos.RefreshRequest request) {
        refreshTokenRepository.findByTokenHashAndRevokedAtIsNull(hash(request.refreshToken()))
                .ifPresent(token -> token.setRevokedAt(OffsetDateTime.now()));
    }

    @Override
    @Transactional
    public AuthDtos.OtpResponse sendOtp(AuthDtos.OtpSendRequest request) {
        return sendOtp(normalizeDestination(request.destination()), request.purpose(), null);
    }

    @Override
    @Transactional
    public void verifyOtp(AuthDtos.OtpVerifyRequest request) {
        verifyOtp(normalizeDestination(request.destination()), request.purpose(), request.otp());
    }

    @Override
    @Transactional
    public void forgotPassword(AuthDtos.ForgotPasswordRequest request) {
        accountRepository.findByEmail(request.username())
                .or(() -> accountRepository.findByPhone(request.username()))
                .ifPresent(account -> sendOtp(passwordResetDestination(account), OtpPurpose.PASSWORD_RESET, account.getId()));
    }

    @Override
    @Transactional
    public void resetPassword(AuthDtos.ResetPasswordRequest request) {
        Account account = accountRepository.findByEmail(request.username())
                .or(() -> accountRepository.findByPhone(request.username()))
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Account không tồn tại"));
        assertActive(account);
        verifyOtp(passwordResetDestination(account), OtpPurpose.PASSWORD_RESET, request.otp());
        AccountCredential credential = credentialRepository.findByAccountId(account.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Account không tồn tại"));
        credential.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    }

    @Override
    @Transactional(readOnly = true)
    public AuthDtos.AccountSummary me(CurrentUser currentUser) {
        Account account = accountRepository.findById(currentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Account không tồn tại"));
        return summary(account);
    }

    @Override
    @Transactional
    public void changePassword(CurrentUser currentUser, AuthDtos.ChangePasswordRequest request) {
        AccountCredential credential = credentialRepository.findByAccountId(currentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Account không tồn tại"));
        if (!passwordEncoder.matches(request.currentPassword(), credential.getPasswordHash())) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Mật khẩu hiện tại không đúng");
        }
        credential.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    }

    private AuthDtos.AuthResponse issueTokens(Account account) {
        String accessToken = jwtService.createAccessToken(account.getId(), account.getRole(), account.getStatus());
        String refreshTokenValue = UUID.randomUUID() + "." + UUID.randomUUID();
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setAccount(account);
        refreshToken.setTokenHash(hash(refreshTokenValue));
        refreshToken.setExpiresAt(OffsetDateTime.now().plusDays(properties.jwt().refreshTokenTtlDays()));
        refreshTokenRepository.save(refreshToken);
        return new AuthDtos.AuthResponse(accessToken, refreshTokenValue, summary(account));
    }

    private AuthDtos.AuthResponse pendingResponse(Account account) {
        return new AuthDtos.AuthResponse(null, null, summary(account));
    }

    private AuthDtos.AccountSummary summary(Account account) {
        return new AuthDtos.AccountSummary(account.getId(), account.getEmail(), account.getPhone(), account.getRole(), account.getStatus());
    }

    private void assertRegistrationOtpVerified(AuthDtos.CustomerRegisterRequest request) {
        String destination = request.email() != null && !request.email().isBlank()
                ? normalizeDestination(request.email())
                : normalizeDestination(request.phone());
        OtpRequest otpRequest = otpRequestRepository
                .findTopByDestinationAndPurposeAndVerifiedAtIsNotNullOrderByVerifiedAtDesc(destination, OtpPurpose.CUSTOMER_REGISTRATION.name())
                .orElseThrow(() -> new BusinessException(ErrorCode.OTP_INVALID, "Customer registration OTP chưa được xác thực"));
        if (otpRequest.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new BusinessException(ErrorCode.OTP_EXPIRED, "Customer registration OTP đã hết hạn");
        }
    }

    private AuthDtos.OtpResponse sendOtp(String destination, OtpPurpose purpose, UUID accountId) {
        if (!isEmail(destination)) {
            throw new BusinessException(ErrorCode.OTP_DELIVERY_UNAVAILABLE, "Chưa cấu hình kênh gửi OTP cho số điện thoại");
        }
        String otp = generateOtp();
        OffsetDateTime expiresAt = OffsetDateTime.now().plusMinutes(properties.otp().ttlMinutes());
        OtpRequest otpRequest = new OtpRequest();
        otpRequest.setAccountId(accountId);
        otpRequest.setDestination(destination);
        otpRequest.setPurpose(purpose.name());
        otpRequest.setOtpHash(hashOtp(destination, purpose, otp));
        otpRequest.setExpiresAt(expiresAt);
        otpRequestRepository.save(otpRequest);
        sendOtpEmail(destination, purpose, otp);
        return new AuthDtos.OtpResponse(expiresAt);
    }

    private void verifyOtp(String destination, OtpPurpose purpose, String otp) {
        OtpRequest otpRequest = otpRequestRepository
                .findTopByDestinationAndPurposeAndVerifiedAtIsNullOrderByCreatedAtDesc(destination, purpose.name())
                .orElseThrow(() -> new BusinessException(ErrorCode.OTP_INVALID, "OTP không hợp lệ"));
        if (otpRequest.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new BusinessException(ErrorCode.OTP_EXPIRED, "OTP đã hết hạn");
        }
        if (!MessageDigest.isEqual(otpRequest.getOtpHash().getBytes(StandardCharsets.UTF_8),
                hashOtp(destination, purpose, otp).getBytes(StandardCharsets.UTF_8))) {
            throw new BusinessException(ErrorCode.OTP_INVALID, "OTP không hợp lệ");
        }
        otpRequest.setVerifiedAt(OffsetDateTime.now());
    }

    private String passwordResetDestination(Account account) {
        if (account.getEmail() != null && !account.getEmail().isBlank()) {
            return normalizeDestination(account.getEmail());
        }
        if (account.getPhone() != null && !account.getPhone().isBlank()) {
            return normalizeDestination(account.getPhone());
        }
        throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Account không có kênh nhận OTP");
    }

    private void sendOtpEmail(String destination, OtpPurpose purpose, String otp) {
        if (brevoApiKey.isBlank() || brevoFromEmail.isBlank() || brevoApiUrl.isBlank()) {
            throw new BusinessException(ErrorCode.OTP_DELIVERY_UNAVAILABLE, "Chưa cấu hình Brevo để gửi OTP");
        }

        String text = "Mã OTP của bạn là " + otp + ". Mã hết hạn sau " + properties.otp().ttlMinutes() + " phút.";
        Map<String, Object> payload = Map.of(
                "sender", Map.of(
                        "name", brevoFromName.isBlank() ? "Smart Parking" : brevoFromName,
                        "email", brevoFromEmail
                ),
                "to", List.of(Map.of("email", destination)),
                "subject", subject(purpose),
                "textContent", text,
                "htmlContent", otpEmailHtml(purpose, otp)
        );

        try {
            emailClient.post()
                    .uri(brevoApiUrl)
                    .header("api-key", brevoApiKey)
                    .header("User-Agent", "smart-parking-backend/1.0")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientResponseException exception) {
            log.warn("Cannot send OTP email to {} via Brevo: HTTP {} {}",
                    maskDestination(destination),
                    exception.getStatusCode().value(),
                    exception.getResponseBodyAsString());
            throw new BusinessException(ErrorCode.OTP_DELIVERY_UNAVAILABLE, "Không gửi được OTP");
        } catch (RuntimeException exception) {
            log.warn("Cannot send OTP email to {} via Brevo: {}", maskDestination(destination), exception.getMessage());
            throw new BusinessException(ErrorCode.OTP_DELIVERY_UNAVAILABLE, "Không gửi được OTP");
        }
    }

    private String otpEmailHtml(OtpPurpose purpose, String otp) {
        return """
                <div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827">
                  <h2 style="margin:0 0 12px">Smart Parking</h2>
                  <p style="margin:0 0 16px">%s</p>
                  <div style="display:inline-block;padding:14px 18px;border-radius:12px;background:#111827;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:6px">%s</div>
                  <p style="margin:16px 0 0;color:#6b7280">Mã hết hạn sau %d phút. Nếu bạn không yêu cầu mã này, hãy bỏ qua email.</p>
                </div>
                """.formatted(subject(purpose), otp, properties.otp().ttlMinutes());
    }

    private String maskDestination(String destination) {
        if (destination == null || destination.isBlank()) {
            return "-";
        }

        int atIndex = destination.indexOf('@');
        if (atIndex <= 1) {
            return "***";
        }

        return destination.charAt(0) + "***" + destination.substring(atIndex);
    }

    private String subject(OtpPurpose purpose) {
        return switch (purpose) {
            case CUSTOMER_REGISTRATION -> "Smart Parking customer verification";
            case PASSWORD_RESET -> "Smart Parking password reset";
        };
    }

    private String generateOtp() {
        int length = properties.otp().length();
        if (length < 4 || length > 12) {
            throw new IllegalStateException("OTP length must be between 4 and 12");
        }
        StringBuilder otp = new StringBuilder(length);
        for (int index = 0; index < length; index++) {
            otp.append(secureRandom.nextInt(10));
        }
        return otp.toString();
    }

    private String hashOtp(String destination, OtpPurpose purpose, String otp) {
        return hash(destination + ":" + purpose.name() + ":" + otp + ":" + properties.jwt().secret());
    }

    private String normalizeDestination(String destination) {
        return destination == null ? null : destination.trim().toLowerCase();
    }

    private String blankToEmpty(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isEmail(String destination) {
        return destination != null && destination.contains("@");
    }

    private void assertActive(Account account) {
        if (account.getStatus() == AccountStatus.LOCKED) {
            throw new BusinessException(ErrorCode.AUTH_ACCOUNT_LOCKED, "Account đang bị khóa");
        }
        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.AUTH_ACCOUNT_NOT_ACTIVE, "Account chưa ACTIVE");
        }
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return Base64.getEncoder().encodeToString(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
