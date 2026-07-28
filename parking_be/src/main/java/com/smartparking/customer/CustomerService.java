package com.smartparking.customer;

import com.smartparking.common.security.CurrentUser;

public interface CustomerService {
    CustomerDtos.ProfileResponse me(CurrentUser currentUser);

    CustomerDtos.ProfileResponse update(CurrentUser currentUser, CustomerDtos.ProfileUpdateRequest request);
}
