package com.smartparking.booking;

import com.smartparking.booking.dto.BookingDtos;
import com.smartparking.common.AvailableAction;
import com.smartparking.common.BookingStatus;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class BookingMapper {
    public BookingDtos.BookingResponse toResponse(Booking booking) {
        return new BookingDtos.BookingResponse(
                booking.getId(),
                booking.getBookingCode(),
                booking.getParkingLot().getId(),
                booking.getVehicle().getId(),
                booking.getStatus(),
                booking.getPaymentStatus(),
                booking.getPaymentMethod(),
                booking.getStartTime(),
                booking.getEndTime(),
                priceBreakdown(booking),
                availableActions(booking),
                booking.getVersion(),
                booking.getCreatedAt(),
                booking.getUpdatedAt()
        );
    }

    public BookingDtos.CommandResponse command(Booking booking, BookingStatus previousStatus) {
        return new BookingDtos.CommandResponse(
                booking.getId(),
                previousStatus,
                booking.getStatus(),
                booking.getPaymentStatus(),
                nextAction(booking),
                availableActions(booking),
                booking.getVersion(),
                booking.getUpdatedAt()
        );
    }

    public BookingDtos.PriceBreakdown priceBreakdown(Booking booking) {
        String currency = booking.getCurrency();
        return new BookingDtos.PriceBreakdown(
                money(booking.getParkingFee(), currency),
                money(booking.getServiceFee(), currency),
                money(booking.getPickupFee(), currency),
                money(booking.getDiscountAmount(), currency),
                money(booking.getPlatformFee(), currency),
                money(booking.getTaxAmount(), currency),
                money(booking.getOvertimeFee(), currency),
                money(booking.getTotalAmount(), currency)
        );
    }

    public List<AvailableAction> availableActions(Booking booking) {
        return switch (booking.getStatus()) {
            case PENDING_PAYMENT -> List.of(AvailableAction.COMPLETE_PAYMENT, AvailableAction.CANCEL);
            case CONFIRMED -> List.of(AvailableAction.VIEW_QR, AvailableAction.CANCEL, AvailableAction.REQUEST_CHANGE, AvailableAction.REQUEST_EXTENSION);
            case CHECKED_IN, OVERDUE -> List.of(AvailableAction.REQUEST_EXTENSION);
            default -> List.of();
        };
    }

    private String nextAction(Booking booking) {
        return switch (booking.getStatus()) {
            case PENDING_APPROVAL -> "WAIT_STAFF_APPROVAL";
            case PENDING_PAYMENT -> "COMPLETE_PAYMENT";
            case CONFIRMED -> "VIEW_QR";
            case CHECKED_IN, OVERDUE -> "WAIT_CHECK_OUT";
            default -> null;
        };
    }

    private BookingDtos.Money money(java.math.BigDecimal amount, String currency) {
        return new BookingDtos.Money(amount, currency);
    }
}
