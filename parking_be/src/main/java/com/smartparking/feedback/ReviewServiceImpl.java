package com.smartparking.feedback;

import com.smartparking.account.CustomerProfileRepository;
import com.smartparking.booking.Booking;
import com.smartparking.booking.BookingRepository;
import com.smartparking.common.BookingStatus;
import com.smartparking.common.PaymentStatus;
import com.smartparking.common.exception.BusinessException;
import com.smartparking.common.exception.ErrorCode;
import com.smartparking.common.security.CurrentUser;
import com.smartparking.feedback.dto.ReviewDtos;
import com.smartparking.parking.ParkingLotStaffRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ReviewServiceImpl implements ReviewService {
    private final BookingRepository bookingRepository;
    private final CustomerProfileRepository customerProfileRepository;
    private final ParkingLotStaffRepository parkingLotStaffRepository;
    private final ReviewRepository reviewRepository;

    public ReviewServiceImpl(BookingRepository bookingRepository,
                             CustomerProfileRepository customerProfileRepository,
                             ParkingLotStaffRepository parkingLotStaffRepository,
                             ReviewRepository reviewRepository) {
        this.bookingRepository = bookingRepository;
        this.customerProfileRepository = customerProfileRepository;
        this.parkingLotStaffRepository = parkingLotStaffRepository;
        this.reviewRepository = reviewRepository;
    }

    @Override
    @Transactional
    public ReviewDtos.ReviewResponse create(CurrentUser currentUser, UUID bookingId, ReviewDtos.ReviewRequest request) {
        Booking booking = bookingRepository.findByIdAndCustomerId(bookingId, currentUser.id())
                .orElseThrow(() -> new BusinessException(ErrorCode.BOOKING_NOT_FOUND, "Booking không tồn tại"));

        if (booking.getStatus() != BookingStatus.CHECKED_OUT
                || booking.getPaymentStatus() != PaymentStatus.PAID
                || booking.getActualCheckOutTime() == null) {
            throw new BusinessException(ErrorCode.BOOKING_INVALID_STATE, "Chỉ có thể đánh giá booking đã hoàn tất thanh toán");
        }

        if (reviewRepository.existsByBooking_IdAndCustomer_Id(bookingId, currentUser.id())) {
            throw new BusinessException(ErrorCode.BOOKING_ALREADY_PROCESSED, "Booking này đã được đánh giá");
        }

        Review review = new Review();
        review.setBooking(booking);
        review.setCustomer(booking.getCustomer());
        review.setRating(request.rating());
        review.setContent(normalizeContent(request.content()));
        review.setCreatedBy(currentUser.id());
        review.setUpdatedBy(currentUser.id());
        return toResponse(reviewRepository.save(review));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewDtos.ReviewResponse> customerReviews(CurrentUser currentUser, Pageable pageable) {
        return reviewRepository.findByCustomer_IdOrderByCreatedAtDesc(currentUser.id(), pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewDtos.ReviewResponse> publicReviews(UUID parkingLotId, Pageable pageable) {
        return reviewRepository.findByParkingLotId(parkingLotId, pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ReviewDtos.ReviewResponse> staffReviews(CurrentUser currentUser, UUID parkingLotId, Pageable pageable) {
        if (parkingLotId != null && !parkingLotStaffRepository.existsByParkingLotIdAndStaffId(parkingLotId, currentUser.id())) {
            throw new BusinessException(ErrorCode.PARKING_LOT_ACCESS_DENIED, "Không có quyền xem đánh giá của bãi đỗ này");
        }

        return reviewRepository.findForStaff(currentUser.id(), parkingLotId, pageable)
                .map(this::toResponse);
    }

    private ReviewDtos.ReviewResponse toResponse(Review review) {
        Booking booking = review.getBooking();
        return new ReviewDtos.ReviewResponse(
                review.getId(),
                booking.getId(),
                booking.getBookingCode(),
                booking.getParkingLot().getId(),
                booking.getParkingLot().getName(),
                review.getCustomer().getId(),
                customerName(review),
                review.getRating(),
                review.getContent(),
                review.getVersion(),
                review.getCreatedAt(),
                review.getUpdatedAt()
        );
    }

    private String customerName(Review review) {
        return customerProfileRepository.findByAccountId(review.getCustomer().getId())
                .map(profile -> profile.getFullName())
                .orElse(review.getCustomer().getEmail());
    }

    private String normalizeContent(String content) {
        if (content == null || content.isBlank()) {
            return null;
        }

        return content.trim();
    }
}
