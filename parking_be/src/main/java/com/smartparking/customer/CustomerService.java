package com.smartparking.customer;

import com.smartparking.common.security.CurrentUser;
import org.springframework.web.multipart.MultipartFile;

public interface CustomerService {
    CustomerDtos.ProfileResponse me(CurrentUser currentUser);

    CustomerDtos.ProfileResponse update(CurrentUser currentUser, CustomerDtos.ProfileUpdateRequest request);

    CustomerDtos.ProfileResponse uploadAvatar(CurrentUser currentUser, MultipartFile file);
}
