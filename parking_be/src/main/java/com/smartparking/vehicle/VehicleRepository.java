package com.smartparking.vehicle;

import com.smartparking.common.VehicleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VehicleRepository extends JpaRepository<Vehicle, UUID> {
    List<Vehicle> findByCustomerIdAndStatus(UUID customerId, VehicleStatus status);

    Optional<Vehicle> findByIdAndCustomerId(UUID id, UUID customerId);

    @Modifying
    @Query("update Vehicle v set v.defaultVehicle = false where v.customer.id = :customerId and v.defaultVehicle = true")
    void clearDefaultVehicle(UUID customerId);
}
