# ERROR, SECURITY AND TESTING

## 1. Error Codes

Authentication:

```text
AUTH_INVALID_CREDENTIALS
AUTH_ACCOUNT_LOCKED
AUTH_ACCOUNT_NOT_ACTIVE
AUTH_TOKEN_EXPIRED
AUTH_REFRESH_TOKEN_INVALID
OTP_INVALID
OTP_EXPIRED
```

Vehicle:

```text
VEHICLE_NOT_FOUND
VEHICLE_ACCESS_DENIED
VEHICLE_INACTIVE
VEHICLE_BOOKING_TIME_CONFLICT
```

Parking:

```text
PARKING_LOT_NOT_FOUND
PARKING_LOT_NOT_ACTIVE
PARKING_LOT_ACCESS_DENIED
PARKING_LOT_UNSUPPORTED_VEHICLE_TYPE
PARKING_CAPACITY_INVALID
```

Booking:

```text
BOOKING_NOT_FOUND
BOOKING_ACCESS_DENIED
BOOKING_INVALID_STATE
BOOKING_TIME_INVALID
BOOKING_CAPACITY_NOT_AVAILABLE
BOOKING_CANNOT_CANCEL
BOOKING_CANNOT_EXTEND
BOOKING_ALREADY_PROCESSED
```

Payment:

```text
PAYMENT_NOT_FOUND
PAYMENT_ALREADY_COMPLETED
PAYMENT_PROVIDER_ERROR
PAYMENT_SIGNATURE_INVALID
REFUND_AMOUNT_INVALID
```

Operation:

```text
QR_CODE_INVALID
QR_CODE_EXPIRED
CHECK_IN_NOT_ALLOWED
CHECK_OUT_NOT_ALLOWED
VEHICLE_CONDITION_REQUIRED
```

System:

```text
RESOURCE_VERSION_CONFLICT
IDEMPOTENCY_CONFLICT
ADMIN_REASON_REQUIRED
INTERNAL_SERVER_ERROR
```

## 2. JWT

Payload tối thiểu:

```json
{
  "sub": "USER_ID",
  "role": "CUSTOMER",
  "accountStatus": "ACTIVE",
  "iat": 0,
  "exp": 0
}
```

Không đưa dữ liệu nhạy cảm vào token.

## 3. Security Rule

- Validate role.
- Validate ownership.
- Validate account status.
- Validate resource state.
- Validate request version.
- Validate idempotency.
- Không tin ID do FE gửi nếu có thể lấy từ JWT.
- Không log password, OTP hoặc token.
- Webhook phải verify signature.
- Upload phải kiểm tra content type và size.

## 4. Unit Test

```text
BookingServiceTest
BookingStateMachineTest
CapacityValidatorTest
PricingServiceTest
PromotionValidatorTest
PaymentCallbackServiceTest
RefundServiceTest
CheckInServiceTest
CheckOutServiceTest
```

## 5. Repository Test

```text
BookingRepositoryTest
CapacityLockRepositoryTest
VehicleOverlapQueryTest
ParkingSearchRepositoryTest
PaymentTransactionRepositoryTest
```

## 6. Integration Test

Dùng Testcontainers:

- PostgreSQL.
- Redis nếu dùng.
- MinIO nếu cần.
- Payment simulator nếu được chốt.

## 7. Security Test

Test:

- Customer truy cập booking người khác.
- Staff truy cập parking khác.
- Staff gọi Admin API.
- Customer gọi Staff API.
- Account SUSPENDED gọi API.
- Token hết hạn.
- Refresh token revoked.

## 8. Concurrency Test

- Overbooking.
- Double payment callback.
- Double check-in.
- Double check-out.
- Optimistic locking conflict.
- Duplicate idempotency key.

## 9. Contract Test

- OpenAPI response đúng DTO.
- Enum không lệch.
- Error code đúng.
- Required field đúng.
- Date-time đúng format.
- Pagination thống nhất.
