package com.smartparking.controller;

import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
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
    private final MinioClient minioClient;

    public PublicFileController(VehicleImageRepository vehicleImageRepository, MinioClient minioClient) {
        this.vehicleImageRepository = vehicleImageRepository;
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
}
