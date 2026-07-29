package com.smartparking.booking;

import com.smartparking.common.BaseEntity;
import com.smartparking.common.BookingStatus;
import com.smartparking.common.PaymentStatus;
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

@Getter
@Setter
@Entity
@Table(name = "booking_command_idempotencies")
public class BookingCommandIdempotency extends BaseEntity {
    @Column(nullable = false, unique = true)
    private String idempotencyKey;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(nullable = false)
    private String command;

    @Enumerated(EnumType.STRING)
    private BookingStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus currentStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus paymentStatus;
}
