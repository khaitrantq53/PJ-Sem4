package com.smartparking.vehicle;

import com.smartparking.account.Account;
import com.smartparking.account.AccountRepository;
import com.smartparking.common.Role;
import com.smartparking.common.VehicleStatus;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.common.storage.FileStorageService;
import com.smartparking.common.StoredFile;
import com.smartparking.vehicle.dto.VehicleDtos;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
public class VehicleServiceImpl implements VehicleService {
    private final VehicleRepository vehicleRepository;
    private final AccountRepository accountRepository;
    private final VehicleImageRepository vehicleImageRepository;
    private final FileStorageService fileStorageService;
    private final VehicleMapper vehicleMapper;

    public VehicleServiceImpl(VehicleRepository vehicleRepository,
                              AccountRepository accountRepository,
                              VehicleImageRepository vehicleImageRepository,
                              FileStorageService fileStorageService,
                              VehicleMapper vehicleMapper) {
        this.vehicleRepository = vehicleRepository;
        this.accountRepository = accountRepository;
        this.vehicleImageRepository = vehicleImageRepository;
        this.fileStorageService = fileStorageService;
        this.vehicleMapper = vehicleMapper;
    }

    @Override
    @Transactional
    public VehicleDtos.VehicleResponse create(CurrentUser currentUser, VehicleDtos.VehicleRequest request) {
        Account customer = accountRepository.findById(currentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Account không tồn tại"));
        boolean defaultVehicle = Boolean.TRUE.equals(request.defaultVehicle())
                || vehicleRepository.findByCustomerIdAndStatus(currentUser.id(), VehicleStatus.ACTIVE).isEmpty();
        if (defaultVehicle) {
            vehicleRepository.clearDefaultVehicle(currentUser.id());
        }
        Vehicle vehicle = new Vehicle();
        vehicle.setCustomer(customer);
        apply(vehicle, request);
        vehicle.setDefaultVehicle(defaultVehicle);
        vehicle.setStatus(VehicleStatus.ACTIVE);
        return vehicleMapper.toResponse(vehicleRepository.save(vehicle));
    }

    @Override
    @Transactional(readOnly = true)
    public List<VehicleDtos.VehicleResponse> list(CurrentUser currentUser) {
        return vehicleRepository.findByCustomerIdAndStatus(currentUser.id(), VehicleStatus.ACTIVE)
                .stream()
                .map(vehicleMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public VehicleDtos.VehicleResponse get(CurrentUser currentUser, UUID vehicleId) {
        return vehicleMapper.toResponse(getOwnedVehicle(currentUser, vehicleId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<VehicleDtos.VehicleResponse> listByCustomerForAdmin(UUID customerId) {
        Account customer = accountRepository.findById(customerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_CREDENTIALS, "Customer không tồn tại"));
        if (customer.getRole() != Role.CUSTOMER) {
            throw new BusinessException(ErrorCode.VEHICLE_ACCESS_DENIED, "Account không phải customer");
        }
        return vehicleRepository.findByCustomerIdAndStatus(customerId, VehicleStatus.ACTIVE)
                .stream()
                .map(vehicleMapper::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public VehicleDtos.VehicleResponse update(CurrentUser currentUser, UUID vehicleId, VehicleDtos.VehicleRequest request) {
        Vehicle vehicle = getOwnedVehicle(currentUser, vehicleId);
        apply(vehicle, request);
        if (Boolean.TRUE.equals(request.defaultVehicle())) {
            vehicleRepository.clearDefaultVehicle(currentUser.id());
            vehicle.setDefaultVehicle(true);
        }
        return vehicleMapper.toResponse(vehicle);
    }

    @Override
    @Transactional
    public VehicleDtos.VehicleResponse uploadImage(CurrentUser currentUser, UUID vehicleId, MultipartFile file) {
        Vehicle vehicle = getOwnedVehicle(currentUser, vehicleId);
        StoredFile storedFile = fileStorageService.storeVehicleImage(currentUser.id(), vehicle.getId(), file);

        VehicleImage image = new VehicleImage();
        image.setVehicle(vehicle);
        image.setBucket(storedFile.getBucket());
        image.setObjectKey(storedFile.getObjectKey());
        image.setContentType(storedFile.getContentType());
        image.setFileSize(storedFile.getFileSize());
        image.setChecksum(storedFile.getChecksum());
        vehicleImageRepository.save(image);

        return vehicleMapper.toResponse(vehicle);
    }

    @Override
    @Transactional
    public VehicleDtos.VehicleResponse makeDefault(CurrentUser currentUser, UUID vehicleId) {
        Vehicle vehicle = getOwnedVehicle(currentUser, vehicleId);
        if (vehicle.getStatus() != VehicleStatus.ACTIVE) {
            throw new BusinessException(ErrorCode.VEHICLE_INACTIVE, "Vehicle không ACTIVE");
        }
        vehicleRepository.clearDefaultVehicle(currentUser.id());
        vehicle.setDefaultVehicle(true);
        return vehicleMapper.toResponse(vehicle);
    }

    @Override
    @Transactional
    public VehicleDtos.VehicleResponse deactivate(CurrentUser currentUser, UUID vehicleId) {
        Vehicle vehicle = getOwnedVehicle(currentUser, vehicleId);
        vehicle.setStatus(VehicleStatus.INACTIVE);
        vehicle.setDefaultVehicle(false);
        return vehicleMapper.toResponse(vehicle);
    }

    private Vehicle getOwnedVehicle(CurrentUser currentUser, UUID vehicleId) {
        return vehicleRepository.findByIdAndCustomerId(vehicleId, currentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.VEHICLE_NOT_FOUND, "Vehicle không tồn tại"));
    }

    private void apply(Vehicle vehicle, VehicleDtos.VehicleRequest request) {
        vehicle.setPlateNumber(request.plateNumber());
        vehicle.setVehicleType(request.vehicleType());
        vehicle.setBrand(request.brand());
        vehicle.setColor(request.color());
    }
}
