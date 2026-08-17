update parking_vehicle_capacities motorbike
set total_capacity = motorbike.total_capacity + bicycle.total_capacity,
    updated_at = now()
from parking_vehicle_capacities bicycle
where motorbike.parking_lot_id = bicycle.parking_lot_id
  and motorbike.vehicle_type = 'MOTORBIKE'
  and bicycle.vehicle_type = 'BICYCLE';

delete from parking_vehicle_capacities bicycle
where bicycle.vehicle_type = 'BICYCLE'
  and exists (
    select 1
    from parking_vehicle_capacities motorbike
    where motorbike.parking_lot_id = bicycle.parking_lot_id
      and motorbike.vehicle_type = 'MOTORBIKE'
  );

update parking_vehicle_capacities
set vehicle_type = 'MOTORBIKE',
    updated_at = now()
where vehicle_type = 'BICYCLE';

delete from parking_pricing_rules bicycle
where bicycle.vehicle_type = 'BICYCLE'
  and bicycle.active = true
  and exists (
    select 1
    from parking_pricing_rules motorbike
    where motorbike.parking_lot_id = bicycle.parking_lot_id
      and motorbike.vehicle_type = 'MOTORBIKE'
      and motorbike.active = true
      and motorbike.start_time = bicycle.start_time
      and motorbike.end_time = bicycle.end_time
  );

update parking_pricing_rules
set vehicle_type = 'MOTORBIKE',
    updated_at = now()
where vehicle_type = 'BICYCLE';

update vehicles
set vehicle_type = 'MOTORBIKE',
    updated_at = now()
where vehicle_type = 'BICYCLE';

update bookings
set vehicle_type = 'MOTORBIKE',
    updated_at = now()
where vehicle_type = 'BICYCLE';

update booking_capacity_reservations
set vehicle_type = 'MOTORBIKE',
    updated_at = now()
where vehicle_type = 'BICYCLE';

update parking_capacity_blocks
set vehicle_type = 'MOTORBIKE',
    updated_at = now()
where vehicle_type = 'BICYCLE';

update device_occupancy_reports
set vehicle_type = 'MOTORBIKE',
    updated_at = now()
where vehicle_type = 'BICYCLE';

update occupancy_discrepancy_alerts
set vehicle_type = 'MOTORBIKE',
    updated_at = now()
where vehicle_type = 'BICYCLE';
