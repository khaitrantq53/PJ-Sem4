# STAFF BUSINESS

## 1. Parking Lot Management

API:

```http
POST /api/v1/staff/parking-lots
GET  /api/v1/staff/parking-lots
GET  /api/v1/staff/parking-lots/{parkingLotId}
PUT  /api/v1/staff/parking-lots/{parkingLotId}
```

Quy tắc:

- Staff chỉ quản lý parking lot được giao.
- Parking lot mới là `DRAFT`.
- Không cho gửi status trong update DTO.
- Thay đổi cấu hình phải dùng optimistic locking.
- Các thay đổi quan trọng phải audit.

## 2. Parking Command

```http
POST /api/v1/staff/parking-lots/{parkingLotId}/submit-approval
POST /api/v1/staff/parking-lots/{parkingLotId}/pause
POST /api/v1/staff/parking-lots/{parkingLotId}/resume
POST /api/v1/staff/parking-lots/{parkingLotId}/request-closure
```

Điều kiện:

- Submit approval chỉ từ DRAFT.
- Pause chỉ từ ACTIVE.
- Resume chỉ từ PAUSED.
- Request closure chỉ từ ACTIVE hoặc PAUSED.
- Parking CLOSED không nhận update nghiệp vụ thông thường.

## 3. Capacity Management

```http
GET  /api/v1/staff/parking-lots/{parkingLotId}/capacities
PUT  /api/v1/staff/parking-lots/{parkingLotId}/capacities/{vehicleType}
POST /api/v1/staff/parking-lots/{parkingLotId}/capacity-blocks
DELETE /api/v1/staff/parking-lots/{parkingLotId}/capacity-blocks/{blockId}
```

Quy tắc:

```text
Available
= Total
- Checked-in
- Reserved
- Blocked
```

- Không cho available âm.
- Không giảm total dưới occupied + reserved + blocked.
- Capacity phân theo vehicle type.
- Thay đổi capacity phải transaction và audit.

## 4. Pricing, Service, Promotion

API nhóm:

```http
/api/v1/staff/parking-lots/{parkingLotId}/pricing-rules
/api/v1/staff/parking-lots/{parkingLotId}/services
/api/v1/staff/parking-lots/{parkingLotId}/promotions
/api/v1/staff/parking-lots/{parkingLotId}/policies
```

Quy tắc:

- Staff không đổi platform fee.
- Staff không đổi tax.
- Booking cũ giữ pricing snapshot.
- Promotion cũ không làm thay đổi booking đã tạo.
- Không cộng dồn promotion nếu chưa có rule.

## 5. Booking Query

```http
GET /api/v1/staff/bookings
GET /api/v1/staff/bookings/{bookingId}
```

Filter:

- Parking lot.
- Status.
- Date range.
- Vehicle type.
- Booking code.
- Plate number.

Staff chỉ xem booking thuộc parking lot được giao.

## 6. Booking Approval

```http
POST /api/v1/staff/bookings/{bookingId}/approve
POST /api/v1/staff/bookings/{bookingId}/decline
```

Approve:

- Booking phải `PENDING_APPROVAL`.
- Staff có quyền trên parking.
- Capacity reservation còn hợp lệ.
- Nếu online payment → `PENDING_PAYMENT`.
- Nếu cash → `CONFIRMED`.
- Tạo status history.
- Tạo notification.

Decline:

- Booking phải `PENDING_APPROVAL`.
- Reason bắt buộc.
- Release reservation.
- Chuyển `DECLINED`.
- Audit và notification.

## 7. Change và Extension Request

```http
POST /api/v1/staff/booking-change-requests/{requestId}/approve
POST /api/v1/staff/booking-change-requests/{requestId}/reject
POST /api/v1/staff/booking-extension-requests/{requestId}/approve
POST /api/v1/staff/booking-extension-requests/{requestId}/reject
```

Phải kiểm tra:

- Request đang pending.
- Staff có quyền.
- Không conflict thời gian.
- Capacity còn đủ.
- Giá chênh lệch được tính lại.
- Reject phải có reason.

## 8. Dashboard

```http
GET /api/v1/staff/dashboard/summary
```

Dữ liệu:

- Occupied.
- Reserved.
- Available.
- Pending approvals.
- Overdue.
- Today bookings.
- Revenue.
- Offline devices.
