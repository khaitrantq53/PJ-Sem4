package com.smartparking.common.storage;

import com.smartparking.common.StoredFile;
import com.smartparking.common.StoredFileRepository;
import com.smartparking.common.config.SmartParkingProperties;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.Locale;
import java.util.UUID;

@Service
public class MinioFileStorageService implements FileStorageService {
    private final MinioClient minioClient;
    private final StoredFileRepository storedFileRepository;
    private final SmartParkingProperties properties;

    public MinioFileStorageService(MinioClient minioClient,
                                   StoredFileRepository storedFileRepository,
                                   SmartParkingProperties properties) {
        this.minioClient = minioClient;
        this.storedFileRepository = storedFileRepository;
        this.properties = properties;
    }

    @Override
    @Transactional
    public StoredFile storeCustomerAvatar(UUID customerId, MultipartFile file) {
        validateAvatar(file);
        String bucket = properties.minio().bucket();
        String objectKey = "customers/" + customerId + "/avatars/" + UUID.randomUUID() + extension(file.getOriginalFilename());
        try {
            ensureBucket(bucket);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            try (InputStream inputStream = new DigestInputStream(file.getInputStream(), digest)) {
                minioClient.putObject(PutObjectArgs.builder()
                        .bucket(bucket)
                        .object(objectKey)
                        .stream(inputStream, file.getSize(), -1L)
                        .contentType(file.getContentType())
                        .build());
            }
            StoredFile storedFile = new StoredFile();
            storedFile.setBucket(bucket);
            storedFile.setObjectKey(objectKey);
            storedFile.setContentType(file.getContentType());
            storedFile.setFileSize(file.getSize());
            storedFile.setChecksum(Base64.getEncoder().encodeToString(digest.digest()));
            return storedFileRepository.save(storedFile);
        } catch (BusinessException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new BusinessException(ErrorCode.STORAGE_UPLOAD_FAILED, "Không upload được file");
        }
    }

    private void validateAvatar(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.UNSUPPORTED_FILE_TYPE, "File avatar không hợp lệ");
        }
        if (file.getSize() > properties.upload().maxAvatarBytes()) {
            throw new BusinessException(ErrorCode.FILE_SIZE_EXCEEDED, "File avatar vượt quá dung lượng cho phép");
        }
        if (!properties.upload().allowedAvatarContentTypes().contains(file.getContentType())) {
            throw new BusinessException(ErrorCode.UNSUPPORTED_FILE_TYPE, "Định dạng avatar không được hỗ trợ");
        }
    }

    private void ensureBucket(String bucket) throws Exception {
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
        }
    }

    private String extension(String originalFilename) {
        if (originalFilename == null) {
            return "";
        }
        int index = originalFilename.lastIndexOf('.');
        if (index < 0 || index == originalFilename.length() - 1) {
            return "";
        }
        String extension = originalFilename.substring(index).toLowerCase(Locale.ROOT);
        return extension.length() <= 12 ? extension : "";
    }
}
