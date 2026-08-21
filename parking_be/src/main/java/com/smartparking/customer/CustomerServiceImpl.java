package com.smartparking.customer;

import com.smartparking.account.Account;
import com.smartparking.account.AccountRepository;
import com.smartparking.account.CustomerProfile;
import com.smartparking.account.CustomerProfileRepository;
import com.smartparking.common.AccountStatus;
import com.smartparking.common.StoredFile;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.common.storage.FileStorageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CustomerServiceImpl implements CustomerService {
    private final AccountRepository accountRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final FileStorageService fileStorageService;

    public CustomerServiceImpl(AccountRepository accountRepository, CustomerProfileRepository customerProfileRepository, FileStorageService fileStorageService) {
        this.accountRepository = accountRepository;
        this.customerProfileRepository = customerProfileRepository;
        this.fileStorageService = fileStorageService;
    }

    @Override
    @Transactional
    public CustomerDtos.ProfileResponse me(CurrentUser currentUser) {
        return response(profile(currentUser));
    }

    @Override
    @Transactional
    public CustomerDtos.ProfileResponse update(CurrentUser currentUser, CustomerDtos.ProfileUpdateRequest request) {
        CustomerProfile profile = profile(currentUser);
        if (request.version() != null && !request.version().equals(profile.getVersion())) {
            throw new BusinessException(ErrorCode.RESOURCE_VERSION_CONFLICT, "Version không khớp");
        }
        profile.setFullName(request.fullName());
        updateAccountContact(profile.getAccount(), request);
        return response(profile);
    }

    @Override
    @Transactional
    public CustomerDtos.ProfileResponse uploadAvatar(CurrentUser currentUser, MultipartFile file) {
        CustomerProfile profile = profile(currentUser);
        StoredFile storedFile = fileStorageService.storeCustomerAvatar(currentUser.id(), file);
        profile.setAvatarFileId(storedFile.getId().toString());
        return response(profile);
    }

    private CustomerProfile profile(CurrentUser currentUser) {
        return customerProfileRepository.findByAccountId(currentUser.id())
                .orElseGet(() -> createMissingProfile(currentUser));
    }

    private CustomerProfile createMissingProfile(CurrentUser currentUser) {
        Account account = accountRepository.findById(currentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Customer account không tồn tại"));
        CustomerProfile profile = new CustomerProfile();
        profile.setAccount(account);
        profile.setFullName(defaultFullName(account));
        return customerProfileRepository.save(profile);
    }

    private String defaultFullName(Account account) {
        if (account.getEmail() != null && !account.getEmail().isBlank()) {
            String localPart = account.getEmail().split("@", 2)[0];
            String normalized = localPart.replaceAll("[._-]+", " ").trim();
            if (!normalized.isBlank()) {
                return normalized;
            }
        }

        if (account.getPhone() != null && !account.getPhone().isBlank()) {
            return account.getPhone();
        }

        return "Customer";
    }

    private void updateAccountContact(Account account, CustomerDtos.ProfileUpdateRequest request) {
        String email = blankToNull(request.email());
        String phone = blankToNull(request.phone());

        if (email == null && phone == null) {
            throw new BusinessException(ErrorCode.BUSINESS_DECISION_REQUIRED, "Email hoặc số điện thoại là bắt buộc");
        }

        if (email != null) {
            accountRepository.findByEmail(email)
                    .filter(existing -> !existing.getId().equals(account.getId()))
                    .ifPresent(existing -> {
                        throw new BusinessException(ErrorCode.BUSINESS_DECISION_REQUIRED, "Email đã được sử dụng");
                    });
        }

        if (phone != null) {
            accountRepository.findByPhone(phone)
                    .filter(existing -> !existing.getId().equals(account.getId()))
                    .ifPresent(existing -> {
                        throw new BusinessException(ErrorCode.BUSINESS_DECISION_REQUIRED, "Số điện thoại đã được sử dụng");
                    });
        }

        account.setEmail(email);
        account.setPhone(phone);
    }

    private String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }

    private CustomerDtos.ProfileResponse response(CustomerProfile profile) {
        Account account = profile.getAccount();
        String avatarFileId = profile.getAvatarFileId();
        boolean emailVerified = account.getEmail() != null && account.getStatus() == AccountStatus.ACTIVE;
        boolean phoneVerified = account.getPhone() != null && !account.getPhone().isBlank();
        return new CustomerDtos.ProfileResponse(
                account.getId(),
                account.getEmail(),
                account.getPhone(),
                profile.getFullName(),
                avatarFileId,
                avatarFileId == null || avatarFileId.isBlank() ? null : "/api/v1/public/files/customer-avatars/" + avatarFileId,
                account.getStatus(),
                emailVerified,
                phoneVerified,
                profile.getVersion(),
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }
}
