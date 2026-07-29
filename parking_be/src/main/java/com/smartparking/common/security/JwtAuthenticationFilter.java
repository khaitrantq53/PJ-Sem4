package com.smartparking.common.security;

import com.smartparking.account.Account;
import com.smartparking.account.AccountRepository;
import com.smartparking.common.AccountStatus;
import com.smartparking.common.exception.ErrorCode;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final AccountRepository accountRepository;
    private final SecurityErrorResponseWriter errorResponseWriter;

    public JwtAuthenticationFilter(JwtService jwtService,
                                   AccountRepository accountRepository,
                                   SecurityErrorResponseWriter errorResponseWriter) {
        this.jwtService = jwtService;
        this.accountRepository = accountRepository;
        this.errorResponseWriter = errorResponseWriter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            CurrentUser user;
            try {
                user = jwtService.parse(header.substring(7));
            } catch (ExpiredJwtException exception) {
                errorResponseWriter.write(response, ErrorCode.AUTH_TOKEN_EXPIRED, "Token đã hết hạn");
                return;
            } catch (JwtException | IllegalArgumentException exception) {
                errorResponseWriter.write(response, ErrorCode.AUTH_INVALID_CREDENTIALS, "Token không hợp lệ");
                return;
            }
            Account account = accountRepository.findById(user.id()).orElse(null);
            if (account == null || account.getRole() != user.role()) {
                errorResponseWriter.write(response, ErrorCode.AUTH_INVALID_CREDENTIALS, "Token không hợp lệ");
                return;
            }
            if (account.getStatus() == AccountStatus.LOCKED) {
                errorResponseWriter.write(response, ErrorCode.AUTH_ACCOUNT_LOCKED, "Account đang bị khóa");
                return;
            }
            if (account.getStatus() != AccountStatus.ACTIVE) {
                errorResponseWriter.write(response, ErrorCode.AUTH_ACCOUNT_NOT_ACTIVE, "Account chưa ACTIVE");
                return;
            }
            SecurityPrincipal principal = SecurityPrincipal.of(new CurrentUser(account.getId(), account.getRole(), account.getStatus()));
            org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(principal, null, principal.authorities())
            );
        }
        filterChain.doFilter(request, response);
    }
}
