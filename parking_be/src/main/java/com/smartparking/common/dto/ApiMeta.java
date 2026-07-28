package com.smartparking.common.dto;

import java.time.OffsetDateTime;

public record ApiMeta(OffsetDateTime timestamp, String requestId) {
}
