package com.smartparking.vehiclecondition;

import com.smartparking.booking.Booking;
import com.smartparking.common.BaseEntity;
import com.smartparking.common.RecordType;
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

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "vehicle_condition_records")
public class VehicleConditionRecord extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecordType recordType;

    @Column(columnDefinition = "text")
    private String notes;

    @Column(nullable = false)
    private UUID recordedBy;

    @Column(nullable = false)
    private OffsetDateTime recordedAt;
}
