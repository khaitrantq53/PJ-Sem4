package com.smartparking.parking;

import com.smartparking.common.ParkingLotStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.UUID;

public interface ParkingLotRepository extends JpaRepository<ParkingLot, UUID> {
    Page<ParkingLot> findByStatus(ParkingLotStatus status, Pageable pageable);

    long countByStatus(ParkingLotStatus status);

    @Query("""
            select p
            from ParkingLot p
            join ParkingLotStaff s on s.parkingLot.id = p.id
            where s.staff.id = :staffId
            """)
    Page<ParkingLot> findManagedByStaff(UUID staffId, Pageable pageable);

    @Query(value = """
            select distinct p.*
            from parking_lots p
            where p.status = 'ACTIVE'
              and (:address is null
                   or lower(p.address) like concat('%', lower(cast(:address as text)), '%')
                   or lower(p.name) like concat('%', lower(cast(:address as text)), '%'))
              and (:vehicleType is null or exists (
                    select 1
                    from parking_vehicle_capacities c
                    where c.parking_lot_id = p.id
                      and c.vehicle_type = cast(:vehicleType as varchar)
                      and c.total_capacity > 0
              ))
              and (:serviceId is null or exists (
                    select 1
                    from parking_services s
                    where s.parking_lot_id = p.id
                      and s.id = :serviceId
                      and s.active = true
              ))
              and (:minPrice is null or exists (
                    select 1
                    from parking_pricing_rules pr
                    where pr.parking_lot_id = p.id
                      and pr.active = true
                      and pr.hourly_rate >= :minPrice
              ))
              and (:maxPrice is null or exists (
                    select 1
                    from parking_pricing_rules pr
                    where pr.parking_lot_id = p.id
                      and pr.active = true
                      and pr.hourly_rate <= :maxPrice
              ))
              and (:minRating is null or coalesce((
                    select avg(r.rating)
                    from reviews r
                    join bookings b on b.id = r.booking_id
                    where b.parking_lot_id = p.id
              ), 0) >= :minRating)
              and (:latitude is null or :longitude is null or :maxDistanceKm is null
                   or (
                        p.latitude is not null
                        and p.longitude is not null
                        and 6371.0 * acos(least(1.0, greatest(-1.0,
                            cos(radians(cast(:latitude as double precision)))
                            * cos(radians(p.latitude::double precision))
                            * cos(radians(p.longitude::double precision) - radians(cast(:longitude as double precision)))
                            + sin(radians(cast(:latitude as double precision)))
                            * sin(radians(p.latitude::double precision))
                        ))) <= cast(:maxDistanceKm as double precision)
                   ))
              and (:startTime is null or :endTime is null or :vehicleType is null or exists (
                    select 1
                    from parking_vehicle_capacities c
                    where c.parking_lot_id = p.id
                      and c.vehicle_type = cast(:vehicleType as varchar)
                      and c.total_capacity > (
                          (select count(*)
                           from bookings b
                           where b.parking_lot_id = p.id
                             and b.vehicle_type = cast(:vehicleType as varchar)
                             and b.status in (:activeStatuses)
                             and b.start_time < :endTime
                             and b.end_time > :startTime)
                          + coalesce((
                              select sum(cb.quantity)
                              from parking_capacity_blocks cb
                              where cb.parking_lot_id = p.id
                                and cb.vehicle_type = cast(:vehicleType as varchar)
                                and cb.start_time < :endTime
                                and cb.end_time > :startTime
                          ), 0)
                      )
              ))
            """,
            countQuery = """
            select count(distinct p.id)
            from parking_lots p
            where p.status = 'ACTIVE'
              and (:address is null
                   or lower(p.address) like concat('%', lower(cast(:address as text)), '%')
                   or lower(p.name) like concat('%', lower(cast(:address as text)), '%'))
              and (:vehicleType is null or exists (
                    select 1
                    from parking_vehicle_capacities c
                    where c.parking_lot_id = p.id
                      and c.vehicle_type = cast(:vehicleType as varchar)
                      and c.total_capacity > 0
              ))
              and (:serviceId is null or exists (
                    select 1
                    from parking_services s
                    where s.parking_lot_id = p.id
                      and s.id = :serviceId
                      and s.active = true
              ))
              and (:minPrice is null or exists (
                    select 1
                    from parking_pricing_rules pr
                    where pr.parking_lot_id = p.id
                      and pr.active = true
                      and pr.hourly_rate >= :minPrice
              ))
              and (:maxPrice is null or exists (
                    select 1
                    from parking_pricing_rules pr
                    where pr.parking_lot_id = p.id
                      and pr.active = true
                      and pr.hourly_rate <= :maxPrice
              ))
              and (:minRating is null or coalesce((
                    select avg(r.rating)
                    from reviews r
                    join bookings b on b.id = r.booking_id
                    where b.parking_lot_id = p.id
              ), 0) >= :minRating)
              and (:latitude is null or :longitude is null or :maxDistanceKm is null
                   or (
                        p.latitude is not null
                        and p.longitude is not null
                        and 6371.0 * acos(least(1.0, greatest(-1.0,
                            cos(radians(cast(:latitude as double precision)))
                            * cos(radians(p.latitude::double precision))
                            * cos(radians(p.longitude::double precision) - radians(cast(:longitude as double precision)))
                            + sin(radians(cast(:latitude as double precision)))
                            * sin(radians(p.latitude::double precision))
                        ))) <= cast(:maxDistanceKm as double precision)
                   ))
              and (:startTime is null or :endTime is null or :vehicleType is null or exists (
                    select 1
                    from parking_vehicle_capacities c
                    where c.parking_lot_id = p.id
                      and c.vehicle_type = cast(:vehicleType as varchar)
                      and c.total_capacity > (
                          (select count(*)
                           from bookings b
                           where b.parking_lot_id = p.id
                             and b.vehicle_type = cast(:vehicleType as varchar)
                             and b.status in (:activeStatuses)
                             and b.start_time < :endTime
                             and b.end_time > :startTime)
                          + coalesce((
                              select sum(cb.quantity)
                              from parking_capacity_blocks cb
                              where cb.parking_lot_id = p.id
                                and cb.vehicle_type = cast(:vehicleType as varchar)
                                and cb.start_time < :endTime
                                and cb.end_time > :startTime
                          ), 0)
                      )
              ))
            """,
            nativeQuery = true)
    Page<ParkingLot> searchPublic(@Param("latitude") BigDecimal latitude,
                                  @Param("longitude") BigDecimal longitude,
                                  @Param("maxDistanceKm") BigDecimal maxDistanceKm,
                                  @Param("address") String address,
                                  @Param("vehicleType") String vehicleType,
                                  @Param("startTime") OffsetDateTime startTime,
                                  @Param("endTime") OffsetDateTime endTime,
                                  @Param("minPrice") BigDecimal minPrice,
                                  @Param("maxPrice") BigDecimal maxPrice,
                                  @Param("serviceId") UUID serviceId,
                                  @Param("minRating") BigDecimal minRating,
                                  @Param("activeStatuses") Collection<String> activeStatuses,
                                  Pageable pageable);
}
