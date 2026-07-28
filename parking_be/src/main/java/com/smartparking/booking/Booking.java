package com.smartparking.booking;

import com.smartparking.account.Account;
import com.smartparking.common.BaseEntity;
import com.smartparking.common.BookingStatus;
import com.smartparking.common.DeliveryMethod;
import com.smartparking.common.PaymentMethod;
import com.smartparking.common.PaymentStatus;
import com.smartparking.common.VehicleType;
import com.smartparking.parking.ParkingLot;
import com.smartparking.vehicle.Vehicle;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "bookings")
public class Booking extends BaseEntity {
    @Column(nullable = false, unique = true)
    private String bookingCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private Account customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "parking_lot_id", nullable = false)
    private ParkingLot parkingLot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private VehicleType vehicleType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus paymentStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeliveryMethod deliveryMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod paymentMethod;

    @Column(nullable = false)
    private OffsetDateTime startTime;

    @Column(nullable = false)
    private OffsetDateTime endTime;

    private OffsetDateTime actualCheckInTime;

    private OffsetDateTime actualCheckOutTime;

    private OffsetDateTime holdExpiresAt;

    private OffsetDateTime approvalExpiresAt;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal parkingFee;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal serviceFee;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal pickupFee;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal discountAmount;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal platformFee;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal taxAmount;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal overtimeFee;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal totalAmount;

    @Column(nullable = false, length = 3)
    private String currency;

    private String idempotencyKey;
}
