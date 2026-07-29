package com.smartparking.common.storage;

import com.smartparking.common.config.SmartParkingProperties;
import io.minio.MinioClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MinioStorageConfig {
    @Bean
    MinioClient minioClient(SmartParkingProperties properties) {
        return MinioClient.builder()
                .endpoint(properties.minio().endpoint())
                .credentials(properties.minio().accessKey(), properties.minio().secretKey())
                .build();
    }
}
