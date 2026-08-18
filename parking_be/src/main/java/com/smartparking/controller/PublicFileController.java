package com.smartparking.controller;

import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.parking.ParkingLotImage;
import com.smartparking.parking.ParkingLotImageRepository;
import com.smartparking.parking.ParkingLotUpdateImage;
import com.smartparking.parking.ParkingLotUpdateImageRepository;
import com.smartparking.vehicle.VehicleImage;
import com.smartparking.vehicle.VehicleImageRepository;
import io.minio.GetObjectArgs;
import io.minio.MinioClient;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/public/files")
public class PublicFileController {
    private final VehicleImageRepository vehicleImageRepository;
    private final ParkingLotImageRepository parkingLotImageRepository;
    private final ParkingLotUpdateImageRepository parkingLotUpdateImageRepository;
    private final MinioClient minioClient;

    public PublicFileController(VehicleImageRepository vehicleImageRepository,
                                ParkingLotImageRepository parkingLotImageRepository,
                                ParkingLotUpdateImageRepository parkingLotUpdateImageRepository,
                                MinioClient minioClient) {
        this.vehicleImageRepository = vehicleImageRepository;
        this.parkingLotImageRepository = parkingLotImageRepository;
        this.parkingLotUpdateImageRepository = parkingLotUpdateImageRepository;
        this.minioClient = minioClient;
    }

    @GetMapping("/vehicle-images/{imageId}")
    ResponseEntity<InputStreamResource> vehicleImage(@PathVariable UUID imageId) {
        VehicleImage image = vehicleImageRepository.findById(imageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.VEHICLE_NOT_FOUND, "Vehicle image không tồn tại"));
        try {
            InputStreamResource resource = new InputStreamResource(minioClient.getObject(GetObjectArgs.builder()
                    .bucket(image.getBucket())
                    .object(image.getObjectKey())
                    .build()));
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                    .contentType(MediaType.parseMediaType(image.getContentType()))
                    .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(image.getFileSize()))
                    .body(resource);
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException(ErrorCode.STORAGE_UPLOAD_FAILED, "Không đọc được ảnh xe");
        }
    }

    @GetMapping("/parking-lot-images/{imageId}")
    ResponseEntity<InputStreamResource> parkingLotImage(@PathVariable UUID imageId) {
        ParkingLotImage image = parkingLotImageRepository.findById(imageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_LOT_NOT_FOUND, "Parking lot image không tồn tại"));
        return fileResponse(image.getBucket(), image.getObjectKey(), image.getContentType(), image.getFileSize(), "Không đọc được ảnh bãi đỗ");
    }

    @GetMapping("/parking-lot-update-images/{imageId}")
    ResponseEntity<InputStreamResource> parkingLotUpdateImage(@PathVariable UUID imageId) {
        ParkingLotUpdateImage image = parkingLotUpdateImageRepository.findById(imageId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PARKING_LOT_NOT_FOUND, "Parking lot update image không tồn tại"));
        return fileResponse(image.getBucket(), image.getObjectKey(), image.getContentType(), image.getFileSize(), "Không đọc được ảnh request bãi đỗ");
    }

    private ResponseEntity<InputStreamResource> fileResponse(String bucket, String objectKey, String contentType,
                                                             long fileSize, String errorMessage) {
        try {
            InputStreamResource resource = new InputStreamResource(minioClient.getObject(GetObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectKey)
                    .build()));
            return ResponseEntity.ok()
                    .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePublic())
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_LENGTH, String.valueOf(fileSize))
                    .body(resource);
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException(ErrorCode.STORAGE_UPLOAD_FAILED, errorMessage);
        }
    }
}
