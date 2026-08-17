package com.smartparking.controller;

import com.smartparking.common.dto.ApiResponse;
import com.smartparking.common.dto.PageResponse;
import com.smartparking.common.security.RequestContext;
import com.smartparking.common.security.SecurityUtils;
import com.smartparking.feedback.ReviewService;
import com.smartparking.feedback.dto.ReviewDtos;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customer")
public class CustomerReviewController {
    private final ReviewService reviewService;

    public CustomerReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @GetMapping("/reviews")
    PageResponse<ReviewDtos.ReviewResponse> list(Pageable pageable) {
        return PageResponse.of(reviewService.customerReviews(SecurityUtils.currentUser(), pageable), RequestContext.requestId());
    }

    @PostMapping("/bookings/{bookingId}/review")
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<ReviewDtos.ReviewResponse> create(@PathVariable UUID bookingId,
                                                  @Valid @RequestBody ReviewDtos.ReviewRequest request) {
        return ApiResponse.ok(reviewService.create(SecurityUtils.currentUser(), bookingId, request), RequestContext.requestId());
    }
}
