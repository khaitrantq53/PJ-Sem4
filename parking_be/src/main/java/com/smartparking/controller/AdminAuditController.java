package com.smartparking.controller;

import com.smartparking.audit.AuditDtos;
import com.smartparking.audit.AuditService;
import com.smartparking.common.Role;
import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.dto.PageResponse;
import com.smartparking.common.security.RequestContext;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/audit-logs")
public class AdminAuditController {
    private final AuditService auditService;

    public AdminAuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    PageResponse<AuditDtos.AuditLogResponse> list(@RequestParam(required = false) UUID actorId,
                                                  @RequestParam(required = false) Role actorRole,
                                                  @RequestParam(required = false) String action,
                                                  @RequestParam(required = false) String entityType,
                                                  @RequestParam(required = false) String entityId,
                                                  @RequestParam(required = false)
                                                  @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
                                                  @RequestParam(required = false)
                                                  @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
                                                  @RequestParam(required = false) String requestId,
                                                  Pageable pageable) {
        return PageResponse.of(auditService.list(actorId, actorRole, action, entityType, entityId, from, to,
                requestId, pageable), RequestContext.requestId());
    }

    @GetMapping("/{auditId}")
    ApiResponse<AuditDtos.AuditLogResponse> detail(@PathVariable UUID auditId) {
        return ApiResponse.ok(auditService.detail(auditId), RequestContext.requestId());
    }
}
