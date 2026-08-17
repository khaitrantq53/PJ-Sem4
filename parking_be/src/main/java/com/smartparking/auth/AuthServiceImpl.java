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
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {
    private final AccountRepository accountRepository;
    private final AccountCredentialRepository credentialRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OtpRequestRepository otpRequestRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SmartParkingProperties properties;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthServiceImpl(AccountRepository accountRepository,
                           AccountCredentialRepository credentialRepository,
                           CustomerProfileRepository customerProfileRepository,
                           RefreshTokenRepository refreshTokenRepository,
                           OtpRequestRepository otpRequestRepository,
                           PasswordEncoder passwordEncoder,
                           JwtService jwtService,
                           SmartParkingProperties properties,
                           ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.accountRepository = accountRepository;
        this.credentialRepository = credentialRepository;
        this.customerProfileRepository = customerProfileRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.otpRequestRepository = otpRequestRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.properties = properties;
        this.mailSenderProvider = mailSenderProvider;
    }

    @Override
    @Transactional
    public AuthDtos.AuthResponse registerCustomer(AuthDtos.CustomerRegisterRequest request) {
        if ((request.email() == null || request.email().isBlank()) && (request.phone() == null || request.phone().isBlank())) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Email hoặc số điện thoại là bắt buộc");
        }
        if (request.email() != null && accountRepository.existsByEmail(request.email())) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Email đã được sử dụng");
        }
        if (request.phone() != null && accountRepository.existsByPhone(request.phone())) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Số điện thoại đã được sử dụng");
        }
        Account account = new Account();
        account.setEmail(blankToNull(request.email()));
        account.setPhone(blankToNull(request.phone()));
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

        return issueTokens(account);
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
        assertActive(account);
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
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            throw new BusinessException(ErrorCode.OTP_DELIVERY_UNAVAILABLE, "Chưa cấu hình SMTP để gửi OTP");
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(destination);
            message.setSubject(subject(purpose));
            message.setText("Mã OTP của bạn là " + otp + ". Mã hết hạn sau " + properties.otp().ttlMinutes() + " phút.");
            mailSender.send(message);
        } catch (MailException exception) {
            throw new BusinessException(ErrorCode.OTP_DELIVERY_UNAVAILABLE, "Không gửi được OTP");
        }
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

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
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
