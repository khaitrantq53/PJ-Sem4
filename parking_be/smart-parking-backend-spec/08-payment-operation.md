# PAYMENT AND OPERATION

## 1. Payment API

```http
POST /api/v1/customer/bookings/{bookingId}/payments
GET  /api/v1/customer/bookings/{bookingId}/payments
GET  /api/v1/customer/payments/{paymentId}
POST /api/v1/payment-webhooks/{provider}
POST /api/v1/admin/payments/{paymentId}/refund
```

## 2. Payment Flow Online

```text
1. Booking ở PENDING_PAYMENT.
2. Customer tạo payment.
3. Payment chuyển PENDING.
4. Provider xử lý.
5. Provider callback.
6. Verify signature.
7. Check idempotency.
8. Save provider transaction.
9. Nếu success:
   - Payment → PAID.
   - Booking → CONFIRMED.
10. Nếu failed:
   - Payment → FAILED.
11. Save history.
12. Notify Customer.
```

## 3. Cash Flow

```text
Booking = CONFIRMED
Payment = UNPAID
PaymentMethod = CASH
```

Thanh toán có thể được ghi nhận trong check-out hoặc theo rule được chốt.

## 4. Payment Idempotency

Unique constraint:

```text
providerTransactionId
idempotencyKey
```

Callback trùng không được:

- Cộng tiền lần hai.
- Chuyển status lần hai.
- Tạo transaction duplicate.

## 5. Check-in API

```http
POST /api/v1/staff/bookings/{bookingId}/verify-qr
POST /api/v1/staff/bookings/{bookingId}/check-in
```

Check-in flow:

```text
1. Validate Staff access.
2. Validate booking CONFIRMED.
3. Validate QR.
4. Validate time window.
5. Verify vehicle.
6. Record vehicle condition.
7. Save four-side images nếu bắt buộc.
8. Move reserved to occupied.
9. Booking → CHECKED_IN.
10. Save status history.
11. Audit.
12. Notify Customer.
```

## 6. Check-out API

```http
POST /api/v1/staff/bookings/{bookingId}/checkout-preview
POST /api/v1/staff/bookings/{bookingId}/check-out
```

Flow:

```text
1. Validate Staff access.
2. Validate CHECKED_IN hoặc OVERDUE.
3. Calculate actual duration.
4. Calculate overtime fee.
5. Record checkout condition.
6. Process additional payment nếu có.
7. Booking → CHECKED_OUT.
8. Release occupied capacity.
9. Save history.
10. Audit.
11. Notify Customer.
```

## 7. Vehicle Condition

Entity:

```text
id
bookingId
recordType
notes
recordedBy
recordedAt
```

Record type:

```text
CHECK_IN
CHECK_OUT
```

Image metadata:

```text
bucket
objectKey
contentType
fileSize
checksum
```

Không lưu binary trong PostgreSQL.

## 8. Scheduled Jobs

```text
ExpirePendingPaymentBookingJob
ExpirePendingApprovalBookingJob
MarkNoShowBookingJob
MarkOverdueBookingJob
MarkDeviceOfflineJob
ExpirePromotionJob
```

Mỗi job phải:

- Idempotent.
- Chạy theo batch.
- Có logging.
- Có transaction hợp lý.
- Không xử lý lại record đã hoàn tất.
