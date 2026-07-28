# CUSTOMER BUSINESS

## 1. Authentication

API:

```http
POST /api/v1/auth/customers/register
POST /api/v1/auth/otp/send
POST /api/v1/auth/otp/verify
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
POST /api/v1/auth/change-password
GET  /api/v1/auth/me
```

Quy tắc:

- Customer được đăng ký công khai.
- Staff và Admin không dùng API đăng ký Customer.
- Password không lưu plaintext.
- Account phải ACTIVE mới dùng chức năng nghiệp vụ.
- OTP có timeout.
- Refresh token có revoke.
- Token timeout phải cấu hình.

## 2. Profile

API:

```http
GET   /api/v1/customers/me
PATCH /api/v1/customers/me
POST  /api/v1/customers/me/avatar
```

Quy tắc:

- Chỉ xem và sửa profile của mình.
- Không sửa role.
- Không sửa account status.
- Avatar lưu trên MinIO.
- Database chỉ lưu metadata.

## 3. Vehicle

API:

```http
POST  /api/v1/customer/vehicles
GET   /api/v1/customer/vehicles
GET   /api/v1/customer/vehicles/{vehicleId}
PUT   /api/v1/customer/vehicles/{vehicleId}
PATCH /api/v1/customer/vehicles/{vehicleId}/default
PATCH /api/v1/customer/vehicles/{vehicleId}/deactivate
```

Field:

```text
id
customerId
plateNumber
vehicleType
brand
color
isDefault
status
version
createdAt
updatedAt
```

Quy tắc:

- Plate number bắt buộc.
- Vehicle type bắt buộc.
- Vehicle phải thuộc Customer hiện tại.
- Không xóa cứng vehicle đã có booking.
- Một Customer chỉ có một vehicle mặc định.
- Đổi default phải trong transaction.

## 4. Search

API:

```http
GET /api/v1/public/parking-lots
GET /api/v1/public/parking-lots/{parkingLotId}
GET /api/v1/public/parking-lots/nearby
GET /api/v1/public/parking-lots/{parkingLotId}/availability
```

Filter:

- GPS.
- Address.
- Vehicle type.
- Start time.
- End time.
- Price.
- Service.
- Rating.
- Distance.

## 5. Booking Preview

API:

```http
POST /api/v1/customer/bookings/preview
```

Request chỉ gồm dữ liệu lựa chọn:

```json
{
  "parkingLotId": "PL_001",
  "vehicleId": "VH_001",
  "startTime": "2026-08-01T08:00:00+07:00",
  "endTime": "2026-08-01T18:00:00+07:00",
  "deliveryMethod": "SELF_DROP_OFF",
  "serviceIds": [],
  "promotionCode": "WELCOME10",
  "paymentMethod": "QR"
}
```

Backend phải:

- Kiểm tra ownership của vehicle.
- Kiểm tra parking ACTIVE.
- Kiểm tra vehicle type.
- Kiểm tra operating hours.
- Kiểm tra availability.
- Tính giá.
- Trả price breakdown.
- Không giữ chỗ ở bước preview.

## 6. Create Booking

API:

```http
POST /api/v1/customer/bookings
```

Backend phải tính lại toàn bộ dữ liệu.

Không tin:

- Giá từ FE.
- Status từ FE.
- Customer ID từ FE.
- Discount từ FE.

## 7. Booking Query

```http
GET /api/v1/customer/bookings
GET /api/v1/customer/bookings/{bookingId}
GET /api/v1/customer/bookings/{bookingId}/qr-code
```

Customer chỉ xem booking của mình.

## 8. Booking Command

```http
POST /api/v1/customer/bookings/{bookingId}/cancel
POST /api/v1/customer/bookings/{bookingId}/change-requests
POST /api/v1/customer/bookings/{bookingId}/extension-requests
```

Mỗi action phải kiểm tra:

- Ownership.
- Current status.
- Time condition.
- Payment condition.
- Parking policy.
- Existing pending request.
