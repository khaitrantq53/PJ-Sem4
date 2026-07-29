package com.smartparking.device;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface OccupancyDiscrepancyAlertRepository extends JpaRepository<OccupancyDiscrepancyAlert, UUID> {
}
