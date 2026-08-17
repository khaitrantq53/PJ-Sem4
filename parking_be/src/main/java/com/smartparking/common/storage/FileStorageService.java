package com.smartparking.common.storage;

import com.smartparking.common.StoredFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface FileStorageService {
    StoredFile storeCustomerAvatar(UUID customerId, MultipartFile file);

    StoredFile storeVehicleImage(UUID customerId, UUID vehicleId, MultipartFile file);
}
