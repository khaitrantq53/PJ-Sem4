# STATE MACHINE

## 1. Account Status

```text
PENDING_APPROVAL
ACTIVE
SUSPENDED
REJECTED
LOCKED
```

Transition:

```text
Customer register + OTP valid
→ ACTIVE

Staff created
→ PENDING_APPROVAL

Admin approve Staff
→ ACTIVE

Admin reject Staff
→ REJECTED

Admin suspend
→ SUSPENDED

Security lock
→ LOCKED
```

Không cho client cập nhật status trực tiếp.

## 2. Parking Lot Status

```text
DRAFT
PENDING_APPROVAL
ACTIVE
PAUSED
CLOSURE_REQUESTED
CLOSED
SUSPENDED
```

Transition:

```text
DRAFT
├── submit-approval → PENDING_APPROVAL
└── update          → DRAFT

PENDING_APPROVAL
├── approve → ACTIVE
└── reject  → DRAFT hoặc trạng thái đã chốt

ACTIVE
├── pause           → PAUSED
├── request-closure → CLOSURE_REQUESTED
└── suspend         → SUSPENDED

PAUSED
├── resume          → ACTIVE
├── request-closure → CLOSURE_REQUESTED
└── suspend         → SUSPENDED

CLOSURE_REQUESTED
├── approve-closure → CLOSED
└── reject-closure  → trạng thái trước

SUSPENDED
└── activate → ACTIVE hoặc PAUSED

CLOSED
└── trạng thái kết thúc
```

## 3. Booking Status

```text
PENDING_APPROVAL
PENDING_PAYMENT
CONFIRMED
CHECKED_IN
OVERDUE
CHECKED_OUT
CANCELLED
DECLINED
EXPIRED
NO_SHOW
```

Transition:

```text
PENDING_APPROVAL
├── approve + online → PENDING_PAYMENT
├── approve + cash   → CONFIRMED
├── decline          → DECLINED
├── customer cancel  → CANCELLED
└── timeout          → EXPIRED

PENDING_PAYMENT
├── payment success  → CONFIRMED
├── customer cancel  → CANCELLED
└── timeout          → EXPIRED

CONFIRMED
├── check-in         → CHECKED_IN
├── customer cancel  → CANCELLED
└── no-show timeout  → NO_SHOW

CHECKED_IN
├── overdue job      → OVERDUE
└── check-out        → CHECKED_OUT

OVERDUE
└── check-out        → CHECKED_OUT
```

Trạng thái kết thúc:

```text
CHECKED_OUT
CANCELLED
DECLINED
EXPIRED
NO_SHOW
```

## 4. Payment Status

```text
UNPAID
PENDING
PAID
PARTIALLY_PAID
REFUNDED
PARTIALLY_REFUNDED
FAILED
```

Quy tắc:

- `CONFIRMED + UNPAID` hợp lệ với Cash.
- Payment không được suy luận trực tiếp từ Booking.
- Callback phải idempotent.
- Refund phải tạo history.
- Không sửa payment history trực tiếp.

## 5. Command API rule

Không dùng:

```http
PATCH /bookings/{id}
{
  "status": "CHECKED_OUT"
}
```

Phải dùng:

```http
POST /bookings/{id}/approve
POST /bookings/{id}/decline
POST /bookings/{id}/cancel
POST /bookings/{id}/check-in
POST /bookings/{id}/check-out
```

Mỗi command phải khai báo:

- Current state.
- Actor.
- Preconditions.
- Next state.
- Side effects.
- Audit.
- Notification.
- Error code.
