package com.smartparking.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartparking.common.dto.ApiMeta;
import com.smartparking.common.dto.ErrorBody;
import com.smartparking.common.dto.ErrorResponse;
import com.smartparking.common.exception.ErrorCode;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Component
public class SecurityErrorResponseWriter {
    private final ObjectMapper objectMapper;

    public SecurityErrorResponseWriter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void write(HttpServletResponse response, ErrorCode errorCode, String message) throws IOException {
        SecurityContextHolder.clearContext();
        response.setStatus(errorCode.status().value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ErrorResponse errorResponse = new ErrorResponse(
                false,
                new ErrorBody(errorCode.name(), message, List.of(), Map.of()),
                new ApiMeta(OffsetDateTime.now(), RequestContext.requestId())
        );
        objectMapper.writeValue(response.getWriter(), errorResponse);
    }
}
