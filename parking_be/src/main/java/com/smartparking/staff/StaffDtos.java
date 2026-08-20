package com.smartparking.staff;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
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

    public record PerformanceBucketResponse(
            String label,
            OffsetDateTime startTime,
            OffsetDateTime endTime,
            BigDecimal value
    ) {
    }

    public record PerformanceResponse(
            String metric,
            String range,
            String currency,
            List<PerformanceBucketResponse> buckets
    ) {
    }
}
