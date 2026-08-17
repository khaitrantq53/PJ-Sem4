alter table vehicles
    drop constraint if exists ck_vehicles_type;

alter table vehicles
    add constraint ck_vehicles_type
        check (vehicle_type in ('MOTORBIKE','CAR','ELECTRIC_CAR','TRUCK'));

alter table bookings
    drop constraint if exists ck_bookings_vehicle_type;

alter table bookings
    add constraint ck_bookings_vehicle_type
        check (vehicle_type in ('MOTORBIKE','CAR','ELECTRIC_CAR','TRUCK'));

alter table device_occupancy_reports
    drop constraint if exists ck_device_occupancy_reports_vehicle_type;

alter table device_occupancy_reports
    add constraint ck_device_occupancy_reports_vehicle_type
        check (vehicle_type in ('MOTORBIKE','CAR','ELECTRIC_CAR','TRUCK'));

alter table occupancy_discrepancy_alerts
    drop constraint if exists ck_occupancy_discrepancy_alerts_vehicle_type;

alter table occupancy_discrepancy_alerts
    add constraint ck_occupancy_discrepancy_alerts_vehicle_type
        check (vehicle_type in ('MOTORBIKE','CAR','ELECTRIC_CAR','TRUCK'));
