# DATABASE DESIGN

## 1. Account Tables

```text
accounts
account_credentials
customer_profiles
staff_profiles
refresh_tokens
otp_requests
```

## 2. Vehicle Tables

```text
vehicles
vehicle_images
```

## 3. Parking Tables

```text
parking_lots
parking_lot_staff
parking_lot_images
parking_operating_hours
parking_vehicle_capacities
parking_capacity_blocks
parking_services
parking_policies
parking_pricing_rules
```

## 4. Booking Tables

```text
bookings
booking_services
booking_price_items
booking_status_histories
booking_change_requests
booking_extension_requests
booking_capacity_reservations
```

## 5. Payment Tables

```text
payments
payment_transactions
refunds
```

## 6. Operation Tables

```text
vehicle_condition_records
vehicle_condition_images
```

## 7. Promotion Tables

```text
promotions
promotion_parking_lots
promotion_usages
```

## 8. Other Tables

```text
notifications
devices
device_occupancy_reports
occupancy_discrepancy_alerts
reviews
complaints
stored_files
audit_logs
```

## 9. Booking Core Fields

```text
id UUID PK
bookingCode VARCHAR UNIQUE
customerId UUID FK
vehicleId UUID FK
parkingLotId UUID FK
vehicleType VARCHAR
status VARCHAR
paymentStatus VARCHAR
deliveryMethod VARCHAR
startTime TIMESTAMPTZ
endTime TIMESTAMPTZ
actualCheckInTime TIMESTAMPTZ
actualCheckOutTime TIMESTAMPTZ
holdExpiresAt TIMESTAMPTZ
approvalExpiresAt TIMESTAMPTZ
parkingFee NUMERIC(19,2)
serviceFee NUMERIC(19,2)
pickupFee NUMERIC(19,2)
discountAmount NUMERIC(19,2)
platformFee NUMERIC(19,2)
taxAmount NUMERIC(19,2)
overtimeFee NUMERIC(19,2)
totalAmount NUMERIC(19,2)
currency VARCHAR(3)
version BIGINT
createdAt TIMESTAMPTZ
updatedAt TIMESTAMPTZ
createdBy UUID
updatedBy UUID
```

## 10. Index cần thiết

```text
accounts(email)
accounts(phone)
vehicles(customer_id, status)
vehicles(plate_number)
parking_lots(status)
parking_lots(latitude, longitude)
bookings(customer_id, created_at)
bookings(parking_lot_id, status, start_time)
bookings(vehicle_id, start_time, end_time)
payments(booking_id)
payments(provider_transaction_id)
audit_logs(entity_type, entity_id)
audit_logs(actor_id, created_at)
```

## 11. Constraint

- Booking code unique.
- Provider transaction ID unique.
- Idempotency key unique theo operation.
- Total capacity không âm.
- Monetary values không âm nếu nghiệp vụ không cho phép.
- Start time nhỏ hơn end time.
- Version không null.
- Không cascade delete lịch sử.

## 12. Soft Delete

Có thể dùng soft delete cho:

- Vehicle.
- Service.
- Promotion.
- Parking configuration không còn dùng.

Không soft delete thay cho state machine ở:

- Booking.
- Payment.
- Refund.
- Audit.
