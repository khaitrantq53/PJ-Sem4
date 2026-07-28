package com.smartparking.audit;

import com.smartparking.common.Role;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.security.RequestContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuditServiceImpl implements AuditService {
    private final AuditLogRepository auditLogRepository;
    private final AuditMapper auditMapper;

    public AuditServiceImpl(AuditLogRepository auditLogRepository, AuditMapper auditMapper) {
        this.auditLogRepository = auditLogRepository;
        this.auditMapper = auditMapper;
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(UUID actorId, Role actorRole, String action, String entityType, String entityId,
                       String oldValue, String newValue, String reason) {
        AuditLog auditLog = new AuditLog();
        auditLog.setActorId(actorId);
        auditLog.setActorRole(actorRole);
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setOldValue(oldValue);
        auditLog.setNewValue(newValue);
        auditLog.setReason(reason);
        auditLog.setIpAddress(RequestContext.ipAddress());
        auditLog.setUserAgent(RequestContext.userAgent());
        auditLog.setRequestId(RequestContext.requestId());
        auditLogRepository.save(auditLog);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditDtos.AuditLogResponse> list(Pageable pageable) {
        return auditLogRepository.findAll(pageable).map(auditMapper::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public AuditDtos.AuditLogResponse detail(UUID auditId) {
        return auditLogRepository.findById(auditId)
                .map(auditMapper::toResponse)
                .orElseThrow(() -> new BusinessException(ErrorCode.AUDIT_LOG_NOT_FOUND, "Audit log không tồn tại"));
    }
}
