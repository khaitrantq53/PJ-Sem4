package com.smartparking.staff;

import com.smartparking.common.security.CurrentUser;

import java.util.UUID;

public interface StaffDashboardService {
    StaffDtos.DashboardSummaryResponse summary(CurrentUser currentUser, UUID parkingLotId);
}
