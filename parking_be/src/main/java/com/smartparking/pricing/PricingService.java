package com.smartparking.pricing;

import com.smartparking.booking.dto.BookingDtos;
import com.smartparking.common.DeliveryMethod;
import com.smartparking.common.VehicleType;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface PricingService {
    BookingDtos.PriceBreakdown calculate(UUID parkingLotId, VehicleType vehicleType, OffsetDateTime startTime,
                                         OffsetDateTime endTime, DeliveryMethod deliveryMethod,
                                         List<UUID> serviceIds, String promotionCode);
}
