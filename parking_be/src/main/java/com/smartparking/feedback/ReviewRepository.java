package com.smartparking.feedback;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {
    interface RatingSummary {
        Double getAverageRating();

        long getReviewCount();
    }

    boolean existsByBooking_IdAndCustomer_Id(UUID bookingId, UUID customerId);

    Page<Review> findByCustomer_IdOrderByCreatedAtDesc(UUID customerId, Pageable pageable);

    @Query("""
            select r
            from Review r
            where r.booking.parkingLot.id = :parkingLotId
            order by r.createdAt desc
            """)
    Page<Review> findByParkingLotId(UUID parkingLotId, Pageable pageable);

    @Query("""
            select coalesce(avg(r.rating), 0) as averageRating,
                   count(r) as reviewCount
            from Review r
            where r.booking.parkingLot.id = :parkingLotId
            """)
    RatingSummary summarizeByParkingLotId(UUID parkingLotId);

    @Query("""
            select r
            from Review r
            join ParkingLotStaff s on s.parkingLot.id = r.booking.parkingLot.id
            where s.staff.id = :staffId
              and (:parkingLotId is null or r.booking.parkingLot.id = :parkingLotId)
            order by r.createdAt desc
            """)
    Page<Review> findForStaff(UUID staffId, UUID parkingLotId, Pageable pageable);
}
