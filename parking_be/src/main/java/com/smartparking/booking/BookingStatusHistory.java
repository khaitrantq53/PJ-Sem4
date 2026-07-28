package com.smartparking.booking;

import com.smartparking.common.BaseEntity;
import com.smartparking.common.BookingStatus;
import com.smartparking.common.Role;
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

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "booking_status_histories")
public class BookingStatusHistory extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    private BookingStatus previousStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus currentStatus;

    private UUID actorId;

    @Enumerated(EnumType.STRING)
    private Role actorRole;

    @Column(columnDefinition = "text")
    private String reason;
}
