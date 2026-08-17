package com.smartparking.feedback;

import com.smartparking.common.security.CurrentUser;
import com.smartparking.feedback.dto.ReviewDtos;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ReviewService {
    ReviewDtos.ReviewResponse create(CurrentUser currentUser, UUID bookingId, ReviewDtos.ReviewRequest request);

    Page<ReviewDtos.ReviewResponse> customerReviews(CurrentUser currentUser, Pageable pageable);

    Page<ReviewDtos.ReviewResponse> publicReviews(UUID parkingLotId, Pageable pageable);

    Page<ReviewDtos.ReviewResponse> staffReviews(CurrentUser currentUser, UUID parkingLotId, Pageable pageable);
}
