alter table otp_requests
    add constraint ck_otp_requests_purpose
        check (purpose in ('CUSTOMER_REGISTRATION','PASSWORD_RESET'));

alter table parking_operating_hours
    add constraint ux_parking_operating_hours_lot_day unique (parking_lot_id, day_of_week);

alter table parking_operating_hours
    add constraint ck_parking_operating_hours_time
        check (open_time < close_time);

alter table bookings
    add constraint ck_bookings_status
        check (status in ('PENDING_APPROVAL','PENDING_PAYMENT','CONFIRMED','CHECKED_IN','OVERDUE','CHECKED_OUT','CANCELLED','DECLINED','EXPIRED','NO_SHOW'));

alter table bookings
    add constraint ck_bookings_payment_status
        check (payment_status in ('UNPAID','PENDING','PAID','PARTIALLY_PAID','REFUNDED','PARTIALLY_REFUNDED','FAILED'));

alter table bookings
    add constraint ck_bookings_delivery_method
        check (delivery_method in ('SELF_DROP_OFF','PICKUP'));

alter table bookings
    add constraint ck_bookings_payment_method
        check (payment_method in ('CASH','QR','CARD','BANK_TRANSFER'));

alter table bookings
    add constraint ck_bookings_vehicle_type
        check (vehicle_type in ('MOTORBIKE','CAR','ELECTRIC_CAR','BICYCLE','TRUCK'));

alter table booking_services
    add constraint ck_booking_services_price
        check (price >= 0);

alter table booking_price_items
    add constraint ck_booking_price_items_amount
        check (amount >= 0);

alter table booking_status_histories
    add constraint ck_booking_status_histories_status
        check (
            (previous_status is null or previous_status in ('PENDING_APPROVAL','PENDING_PAYMENT','CONFIRMED','CHECKED_IN','OVERDUE','CHECKED_OUT','CANCELLED','DECLINED','EXPIRED','NO_SHOW'))
            and current_status in ('PENDING_APPROVAL','PENDING_PAYMENT','CONFIRMED','CHECKED_IN','OVERDUE','CHECKED_OUT','CANCELLED','DECLINED','EXPIRED','NO_SHOW')
        );

alter table booking_status_histories
    add constraint ck_booking_status_histories_actor_role
        check (actor_role is null or actor_role in ('CUSTOMER','STAFF','ADMIN'));

alter table booking_change_requests
    add constraint ck_booking_change_requests_status
        check (status in ('PENDING','APPROVED','REJECTED'));

alter table booking_extension_requests
    add constraint ck_booking_extension_requests_status
        check (status in ('PENDING','APPROVED','REJECTED'));

alter table payments
    add constraint ck_payments_method
        check (payment_method in ('CASH','QR','CARD','BANK_TRANSFER'));

alter table payments
    add constraint ck_payments_status
        check (status in ('UNPAID','PENDING','PAID','PARTIALLY_PAID','REFUNDED','PARTIALLY_REFUNDED','FAILED'));

alter table payment_transactions
    add constraint ck_payment_transactions_status
        check (status in ('SUCCESS','FAILED','PENDING'));

alter table refunds
    add constraint ck_refunds_status
        check (status in ('PENDING','SUCCEEDED','FAILED'));

alter table vehicle_condition_records
    add constraint ck_vehicle_condition_records_type
        check (record_type in ('CHECK_IN','CHECK_OUT'));

alter table promotion_usages
    add constraint ck_promotion_usages_discount
        check (discount_amount >= 0);

alter table devices
    add constraint ck_devices_status_not_blank
        check (length(trim(status)) > 0);

alter table device_occupancy_reports
    add constraint ck_device_occupancy_reports_vehicle_type
        check (vehicle_type in ('MOTORBIKE','CAR','ELECTRIC_CAR','BICYCLE','TRUCK'));

alter table device_occupancy_reports
    add constraint ck_device_occupancy_reports_occupied
        check (occupied_count >= 0);

alter table occupancy_discrepancy_alerts
    add constraint ck_occupancy_discrepancy_alerts_vehicle_type
        check (vehicle_type in ('MOTORBIKE','CAR','ELECTRIC_CAR','BICYCLE','TRUCK'));

alter table occupancy_discrepancy_alerts
    add constraint ck_occupancy_discrepancy_alerts_counts
        check (expected_count >= 0 and reported_count >= 0);

alter table stored_files
    add constraint ck_stored_files_file_size
        check (file_size >= 0);

alter table vehicle_images
    add constraint ck_vehicle_images_file_size
        check (file_size >= 0);

alter table parking_lot_images
    add constraint ck_parking_lot_images_file_size
        check (file_size >= 0);

alter table vehicle_condition_images
    add constraint ck_vehicle_condition_images_file_size
        check (file_size >= 0);

alter table booking_command_idempotencies
    add constraint ck_booking_command_idempotencies_status
        check (
            (previous_status is null or previous_status in ('PENDING_APPROVAL','PENDING_PAYMENT','CONFIRMED','CHECKED_IN','OVERDUE','CHECKED_OUT','CANCELLED','DECLINED','EXPIRED','NO_SHOW'))
            and current_status in ('PENDING_APPROVAL','PENDING_PAYMENT','CONFIRMED','CHECKED_IN','OVERDUE','CHECKED_OUT','CANCELLED','DECLINED','EXPIRED','NO_SHOW')
            and payment_status in ('UNPAID','PENDING','PAID','PARTIALLY_PAID','REFUNDED','PARTIALLY_REFUNDED','FAILED')
        );

create index idx_account_credentials_account on account_credentials(account_id);
create index idx_customer_profiles_account on customer_profiles(account_id);
create index idx_staff_profiles_account on staff_profiles(account_id);
create index idx_refresh_tokens_account on refresh_tokens(account_id);
create index idx_otp_requests_destination_purpose on otp_requests(destination, purpose, created_at);
create index idx_vehicle_images_vehicle on vehicle_images(vehicle_id);
create index idx_parking_lot_staff_staff on parking_lot_staff(staff_id);
create index idx_parking_lot_images_lot on parking_lot_images(parking_lot_id);
create index idx_parking_operating_hours_lot on parking_operating_hours(parking_lot_id);
create index idx_parking_vehicle_capacities_lot on parking_vehicle_capacities(parking_lot_id);
create index idx_booking_services_booking on booking_services(booking_id);
create index idx_booking_price_items_booking on booking_price_items(booking_id);
create index idx_booking_status_histories_booking_created_at on booking_status_histories(booking_id, created_at);
create index idx_booking_capacity_reservations_lot_type_time on booking_capacity_reservations(parking_lot_id, vehicle_type, start_time, end_time);
create index idx_payment_transactions_payment on payment_transactions(payment_id);
create index idx_refunds_payment on refunds(payment_id);
create index idx_vehicle_condition_records_booking_type on vehicle_condition_records(booking_id, record_type);
create index idx_vehicle_condition_images_record on vehicle_condition_images(record_id);
create index idx_devices_parking_lot on devices(parking_lot_id);
create index idx_device_occupancy_reports_device_reported_at on device_occupancy_reports(device_id, reported_at);
create index idx_occupancy_discrepancy_alerts_lot_status on occupancy_discrepancy_alerts(parking_lot_id, status);
create index idx_reviews_booking on reviews(booking_id);
create index idx_reviews_customer on reviews(customer_id);
create index idx_complaints_booking on complaints(booking_id);
create index idx_complaints_customer_status on complaints(customer_id, status);
create index idx_notifications_recipient_created_at on notifications(recipient_id, created_at);
