package com.smartparking.device;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DeviceOccupancyReportRepository extends JpaRepository<DeviceOccupancyReport, UUID> {
}
