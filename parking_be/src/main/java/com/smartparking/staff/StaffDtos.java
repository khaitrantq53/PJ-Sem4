package com.smartparking.staff;

import java.math.BigDecimal;
import java.util.UUID;

public final class StaffDtos {
    private StaffDtos() {
    }

    public record DashboardSummaryResponse(
            UUID parkingLotId,
            long occupied,
            long reserved,
            long blocked,
            long available,
            long pendingApprovals,
            long todayBookings,
            BigDecimal revenue,
            String currency,
            long offlineDevices
    ) {
    }
}
