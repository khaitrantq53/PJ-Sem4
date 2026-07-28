package com.smartparking.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartparking.account.Account;
import com.smartparking.account.AccountRepository;
import com.smartparking.common.AccountStatus;
import com.smartparking.common.dto.ApiMeta;
import com.smartparking.common.dto.ErrorBody;
import com.smartparking.common.dto.ErrorResponse;
import com.smartparking.common.exception.ErrorCode;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final AccountRepository accountRepository;
    private final ObjectMapper objectMapper;

    public JwtAuthenticationFilter(JwtService jwtService, AccountRepository accountRepository, ObjectMapper objectMapper) {
        this.jwtService = jwtService;
        this.accountRepository = accountRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            CurrentUser user = jwtService.parse(header.substring(7));
            Account account = accountRepository.findById(user.id()).orElse(null);
            if (account == null || account.getRole() != user.role()) {
                unauthorized(response, ErrorCode.AUTH_INVALID_CREDENTIALS, "Token không hợp lệ");
                return;
            }
            if (account.getStatus() == AccountStatus.LOCKED) {
                unauthorized(response, ErrorCode.AUTH_ACCOUNT_LOCKED, "Account đang bị khóa");
                return;
            }
            if (account.getStatus() != AccountStatus.ACTIVE) {
                unauthorized(response, ErrorCode.AUTH_ACCOUNT_NOT_ACTIVE, "Account chưa ACTIVE");
                return;
            }
            SecurityPrincipal principal = SecurityPrincipal.of(new CurrentUser(account.getId(), account.getRole(), account.getStatus()));
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(principal, null, principal.authorities())
            );
        }
        filterChain.doFilter(request, response);
    }

    private void unauthorized(HttpServletResponse response, ErrorCode errorCode, String message) throws IOException {
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
