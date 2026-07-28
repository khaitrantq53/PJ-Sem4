package com.smartparking.auth;

import com.smartparking.account.Account;
import com.smartparking.account.AccountCredential;
import com.smartparking.account.AccountCredentialRepository;
import com.smartparking.account.AccountRepository;
import com.smartparking.account.CustomerProfile;
import com.smartparking.account.CustomerProfileRepository;
import com.smartparking.auth.dto.AuthDtos;
import com.smartparking.common.AccountStatus;
import com.smartparking.common.Role;
import com.smartparking.common.config.SmartParkingProperties;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.common.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {
    private final AccountRepository accountRepository;
    private final AccountCredentialRepository credentialRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final SmartParkingProperties properties;

    public AuthServiceImpl(AccountRepository accountRepository,
                           AccountCredentialRepository credentialRepository,
                           CustomerProfileRepository customerProfileRepository,
                           RefreshTokenRepository refreshTokenRepository,
                           PasswordEncoder passwordEncoder,
                           JwtService jwtService,
                           SmartParkingProperties properties) {
        this.accountRepository = accountRepository;
        this.credentialRepository = credentialRepository;
        this.customerProfileRepository = customerProfileRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.properties = properties;
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
        account.setStatus(AccountStatus.ACTIVE);
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
