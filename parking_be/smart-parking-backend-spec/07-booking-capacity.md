# BOOKING AND CAPACITY

## 1. Booking là nghiệp vụ trung tâm

Booking liên kết:

- Customer.
- Vehicle.
- Parking lot.
- Vehicle type.
- Time range.
- Services.
- Promotion.
- Pricing snapshot.
- Payment.
- Capacity reservation.
- Check-in.
- Check-out.
- Vehicle condition.
- Status history.

## 2. Booking Preview Flow

```text
1. Validate Customer ACTIVE.
2. Validate vehicle ownership.
3. Validate vehicle ACTIVE.
4. Validate parking ACTIVE.
5. Validate supported vehicle type.
6. Validate startTime < endTime.
7. Validate operating hours.
8. Check vehicle booking overlap.
9. Check estimated availability.
10. Calculate price.
11. Validate promotion.
12. Return breakdown.
```

Preview không giữ chỗ.

## 3. Create Booking Flow

```text
1. Nhận request và Idempotency-Key.
2. Validate authentication.
3. Validate ownership.
4. Validate parking.
5. Validate vehicle type.
6. Validate time.
7. Validate operating hours.
8. Lock capacity.
9. Check overlap.
10. Check availability.
11. Recalculate price.
12. Determine approval mode.
13. Create booking.
14. Create reservation.
15. Save pricing snapshot.
16. Save selected services.
17. Save status history.
18. Commit transaction.
19. Create notification.
20. Return current status và nextAction.
```

## 4. Capacity Formula

```text
Available Capacity
= Total Capacity
- Checked-in Count
- Reserved Count
- Blocked Count
```

## 5. Concurrency

Không được làm:

```java
if (count < totalCapacity) {
    createBooking();
}
```

Phải khóa capacity record:

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
```

hoặc `SELECT ... FOR UPDATE`.

## 6. Vehicle Overlap

Một vehicle không được có booking chủ động trùng thời gian.

Active statuses dùng khi kiểm tra overlap cần được chốt, tối thiểu xem xét:

```text
PENDING_APPROVAL
PENDING_PAYMENT
CONFIRMED
CHECKED_IN
OVERDUE
```

Điều kiện overlap:

```text
existing.startTime < requested.endTime
AND existing.endTime > requested.startTime
```

## 7. Reservation Lifecycle

Reservation được tạo khi booking được tạo thành công.

Reservation được release khi:

- Booking declined.
- Booking cancelled.
- Booking expired.
- Booking no-show.
- Booking chuyển sang checked-in thì chuyển reserved sang occupied.
- Booking checked-out thì release occupied.

## 8. Pricing Snapshot

Booking phải lưu:

- Parking fee.
- Service fee.
- Pickup fee.
- Discount.
- Platform fee.
- Tax.
- Overtime fee.
- Total amount.
- Currency.
- Applied pricing rule.
- Applied promotion snapshot.

Thay đổi pricing sau này không ảnh hưởng booking cũ.

## 9. Available Actions

Response booking nên trả:

```json
{
  "availableActions": [
    "VIEW_QR",
    "CANCEL",
    "REQUEST_CHANGE",
    "REQUEST_EXTENSION"
  ]
}
```

FE chỉ dùng để hiển thị UI.

BE vẫn kiểm tra lại khi command chạy.

## 10. Concurrency Test

Test bắt buộc:

```text
Capacity = 1
10 requests chạy đồng thời
Kết quả:
- 1 booking thành công
- 9 request trả capacity unavailable
```
