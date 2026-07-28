# API CONTRACT

## 1. Success Response

```json
{
  "success": true,
  "data": {},
  "meta": {
    "timestamp": "2026-07-28T22:00:00+07:00",
    "requestId": "REQ-001"
  }
}
```

## 2. Pagination Response

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 0,
    "size": 20,
    "totalElements": 100,
    "totalPages": 5,
    "first": true,
    "last": false
  },
  "meta": {
    "requestId": "REQ-001"
  }
}
```

## 3. Error Response

```json
{
  "success": false,
  "error": {
    "code": "BOOKING_CAPACITY_NOT_AVAILABLE",
    "message": "Không còn chỗ trong khoảng thời gian đã chọn",
    "fieldErrors": [],
    "context": {}
  },
  "meta": {
    "timestamp": "2026-07-28T22:00:00+07:00",
    "requestId": "REQ-001"
  }
}
```

## 4. HTTP Status

| Status | Ý nghĩa |
|---:|---|
| 200 | Query hoặc command thành công |
| 201 | Tạo resource thành công |
| 204 | Command thành công không có body |
| 400 | Request không hợp lệ |
| 401 | Chưa xác thực |
| 403 | Không có quyền |
| 404 | Không tìm thấy resource |
| 409 | State hoặc concurrency conflict |
| 422 | Business validation nếu thống nhất |
| 429 | Rate limit |
| 500 | Lỗi hệ thống |

## 5. Command Response

```json
{
  "id": "BK_001",
  "previousStatus": "PENDING_APPROVAL",
  "currentStatus": "PENDING_PAYMENT",
  "paymentStatus": "UNPAID",
  "nextAction": "COMPLETE_PAYMENT",
  "availableActions": [],
  "version": 4,
  "updatedAt": "2026-07-28T22:00:00+07:00"
}
```

## 6. List và Detail DTO

List DTO chỉ chứa dữ liệu cần cho danh sách.

Detail DTO chứa:

- Related summary.
- State.
- Payment state.
- Pricing.
- Schedule.
- Available actions.
- Version.
- Audit-friendly timestamps.

Không dùng một DTO cho tất cả màn hình.

## 7. Query Naming

```text
GET    /resources
GET    /resources/{id}
POST   /resources
PUT    /resources/{id}
PATCH  /resources/{id}
POST   /resources/{id}/{command}
```

Dùng command endpoint cho state transition.

## 8. Idempotency Header

```http
Idempotency-Key: UUID
```

Áp dụng:

- Create booking.
- Create payment.
- Refund.
- Check-in.
- Check-out.
- Webhook.

## 9. Optimistic Lock

Update request chứa:

```json
{
  "version": 5
}
```

Conflict trả:

```text
RESOURCE_VERSION_CONFLICT
```

## 10. Date-time và Money

Date-time:

```text
ISO-8601 có timezone
```

Money:

```json
{
  "amount": 198000,
  "currency": "VND"
}
```

## 11. Frontend Rule

- FE xử lý error theo code.
- FE không parse message để quyết định logic.
- FE không tự đổi status.
- FE không tự tính total.
- FE không tự suy luận ownership.
- FE dùng availableActions để hiển thị command.
