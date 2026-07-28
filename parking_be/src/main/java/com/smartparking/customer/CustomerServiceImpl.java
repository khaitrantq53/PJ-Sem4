package com.smartparking.customer;

import com.smartparking.account.CustomerProfile;
import com.smartparking.account.CustomerProfileRepository;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.security.CurrentUser;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CustomerServiceImpl implements CustomerService {
    private final CustomerProfileRepository customerProfileRepository;

    public CustomerServiceImpl(CustomerProfileRepository customerProfileRepository) {
        this.customerProfileRepository = customerProfileRepository;
    }

    @Override
    @Transactional(readOnly = true)
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
        return response(profile);
    }

    private CustomerProfile profile(CurrentUser currentUser) {
        return customerProfileRepository.findByAccountId(currentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Customer profile không tồn tại"));
    }

    private CustomerDtos.ProfileResponse response(CustomerProfile profile) {
        return new CustomerDtos.ProfileResponse(
                profile.getAccount().getId(),
                profile.getAccount().getEmail(),
                profile.getAccount().getPhone(),
                profile.getFullName(),
                profile.getAvatarFileId(),
                profile.getVersion(),
                profile.getCreatedAt(),
                profile.getUpdatedAt()
        );
    }
}
