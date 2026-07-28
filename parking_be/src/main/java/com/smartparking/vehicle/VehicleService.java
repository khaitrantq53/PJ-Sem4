package com.smartparking.vehicle;

import com.smartparking.common.security.CurrentUser;
import com.smartparking.vehicle.dto.VehicleDtos;

import java.util.List;
import java.util.UUID;

public interface VehicleService {
    VehicleDtos.VehicleResponse create(CurrentUser currentUser, VehicleDtos.VehicleRequest request);

    List<VehicleDtos.VehicleResponse> list(CurrentUser currentUser);

    VehicleDtos.VehicleResponse get(CurrentUser currentUser, UUID vehicleId);

    VehicleDtos.VehicleResponse update(CurrentUser currentUser, UUID vehicleId, VehicleDtos.VehicleRequest request);

    VehicleDtos.VehicleResponse makeDefault(CurrentUser currentUser, UUID vehicleId);

    VehicleDtos.VehicleResponse deactivate(CurrentUser currentUser, UUID vehicleId);
}
