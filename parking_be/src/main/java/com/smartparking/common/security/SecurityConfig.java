package com.smartparking.common.security;

import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.config.SmartParkingProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@EnableConfigurationProperties(SmartParkingProperties.class)
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http,
                                            JwtAuthenticationFilter jwtAuthenticationFilter,
                                            SecurityErrorResponseWriter errorResponseWriter) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exception -> exception
                        .authenticationEntryPoint((request, response, authException) ->
                                errorResponseWriter.write(response, ErrorCode.AUTH_INVALID_CREDENTIALS, "Chưa xác thực"))
                        .accessDeniedHandler((request, response, accessDeniedException) ->
                                errorResponseWriter.write(response, ErrorCode.ACCESS_DENIED, "Không có quyền thực hiện thao tác"))
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers(
                                "/api/v1/auth/customers/register",
                                "/api/v1/auth/customers/confirm-registration",
                                "/api/v1/auth/otp/send",
                                "/api/v1/auth/otp/verify",
                                "/api/v1/auth/login",
                                "/api/v1/auth/refresh",
                                "/api/v1/auth/forgot-password",
                                "/api/v1/auth/reset-password"
                        ).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/public/**").permitAll()
                        .requestMatchers("/api/v1/payment-webhooks/**").permitAll()
                        .requestMatchers("/api/v1/customer/**").hasRole("CUSTOMER")
                        .requestMatchers("/api/v1/customers/**").hasRole("CUSTOMER")
                        .requestMatchers("/api/v1/staff/**").hasRole("STAFF")
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
