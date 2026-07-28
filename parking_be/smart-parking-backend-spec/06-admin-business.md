# ADMIN BUSINESS

## 1. Account Management

API:

```http
GET  /api/v1/admin/users
GET  /api/v1/admin/users/{userId}
PATCH /api/v1/admin/users/{userId}/status
POST /api/v1/admin/staff
POST /api/v1/admin/staff/{staffId}/approve
POST /api/v1/admin/staff/{staffId}/reject
```

Quy tắc:

- Staff không đăng ký công khai.
- Approve Staff chỉ từ `PENDING_APPROVAL`.
- Reject phải có reason.
- Suspend phải có reason.
- Không sửa role bằng API update profile.
- Mọi action phải audit.

## 2. Parking Approval

```http
GET  /api/v1/admin/parking-lots/pending
GET  /api/v1/admin/parking-lots/{parkingLotId}
POST /api/v1/admin/parking-lots/{parkingLotId}/approve
POST /api/v1/admin/parking-lots/{parkingLotId}/reject
POST /api/v1/admin/parking-lots/{parkingLotId}/suspend
POST /api/v1/admin/parking-lots/{parkingLotId}/activate
POST /api/v1/admin/parking-lots/{parkingLotId}/approve-closure
POST /api/v1/admin/parking-lots/{parkingLotId}/reject-closure
```

Quy tắc:

- Approve chỉ từ `PENDING_APPROVAL`.
- Reject phải có reason.
- Suspend phải có reason.
- Closure chỉ xử lý từ `CLOSURE_REQUESTED`.
- Không sửa trạng thái trực tiếp.
- Mỗi action tạo status history và audit.

## 3. Booking Oversight

```http
GET  /api/v1/admin/bookings
GET  /api/v1/admin/bookings/{bookingId}
POST /api/v1/admin/bookings/{bookingId}/resolve-exception
```

Admin chỉ can thiệp khi:

- Booking kẹt trạng thái.
- Payment callback bất thường.
- Capacity mismatch nghiêm trọng.
- Hệ thống lỗi.
- Dispute cần xử lý.

Command exception phải có:

```json
{
  "action": "APPROVED_ACTION",
  "reason": "Lý do cụ thể",
  "expectedVersion": 4
}
```

Không cho Admin gửi state tùy ý.

## 4. Refund

```http
POST /api/v1/admin/payments/{paymentId}/refund
GET  /api/v1/admin/refunds
GET  /api/v1/admin/refunds/{refundId}
```

Quy tắc:

- Payment phải tồn tại.
- Payment phải đủ điều kiện refund.
- Amount không vượt refundable amount.
- Partial refund phải cập nhật đúng status.
- Provider callback phải idempotent.
- Refund phải audit.
- Không sửa payment history.

## 5. Audit Log

```http
GET /api/v1/admin/audit-logs
GET /api/v1/admin/audit-logs/{auditId}
```

Filter:

- Actor.
- Role.
- Action.
- Entity type.
- Entity ID.
- Date range.
- Request ID.

## 6. System Dashboard

```http
GET /api/v1/admin/dashboard/summary
```

Dữ liệu:

- Total users.
- Active Customers.
- Active Staff.
- Active parking lots.
- Pending approvals.
- Today bookings.
- Revenue.
- Refund.
- Suspended accounts.
- Suspended parking lots.
- Device alerts.

## 7. Admin Security

- Hành động nhạy cảm yêu cầu reason.
- Không cho xóa audit log.
- Không cho thao tác trực tiếp database.
- Mọi action phải gắn request ID.
- Nên yêu cầu re-authentication cho action cực kỳ nhạy cảm nếu được chốt.
