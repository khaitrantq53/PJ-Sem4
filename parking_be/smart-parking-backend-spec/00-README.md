# SMART PARKING BACKEND SPECIFICATION

## 1. Mục tiêu

Bộ tài liệu này chuẩn hóa toàn bộ nghiệp vụ Backend cho nền tảng bãi đỗ xe thông minh.

Mục tiêu chính:

- Đảm bảo Backend đúng nghiệp vụ.
- Đảm bảo Frontend và Backend dùng chung một API Contract.
- Không để Frontend tự suy luận trạng thái hoặc quyền thao tác.
- Không thay đổi DTO, Enum và API tùy tiện trong quá trình phát triển.
- Hạn chế conflict khi tích hợp FE-BE.
- Đảm bảo hệ thống dễ kiểm thử, bảo trì và mở rộng.

## 2. Công nghệ

- Java 21
- Spring Boot 3
- Spring Security
- JWT Access Token và Refresh Token
- Spring Data JPA
- PostgreSQL
- Flyway
- Redis
- MinIO
- OpenAPI / Swagger
- Docker Compose
- JUnit 5
- Mockito
- Testcontainers

## 3. Kiến trúc

```text
OpenAPI / Swagger
        ↓
Controller
        ↓
Service
        ↓
ServiceImpl
        ↓
Repository
        ↓
Entity
        ↓
PostgreSQL
```

Quy định:

- Controller không chứa business logic.
- Service định nghĩa use case.
- ServiceImpl chứa nghiệp vụ và transaction.
- Repository chỉ query và persistence.
- Không trả Entity trực tiếp ra API.
- DTO Request và Response phải tách riêng.
- Mapper chịu trách nhiệm chuyển đổi Entity và DTO.
- Business validation nằm tại Service hoặc Validator/Policy.
- Không hard-code timeout, fee hoặc threshold.
- Không cascade delete nếu nghiệp vụ chưa quy định.

## 4. Cấu trúc module

```text
com.smartparking
├── common
├── auth
├── account
├── customer
├── staff
├── vehicle
├── parking
├── capacity
├── pricing
├── promotion
├── booking
├── payment
├── operation
├── vehiclecondition
├── notification
├── device
├── administration
└── audit
```

## 5. Thứ tự đọc tài liệu

1. `01-operating-rules.md`
2. `02-role-permission.md`
3. `03-state-machine.md`
4. `04-customer-business.md`
5. `05-staff-business.md`
6. `06-admin-business.md`
7. `07-booking-capacity.md`
8. `08-payment-operation.md`
9. `09-api-contract.md`
10. `10-database-design.md`
11. `11-error-security-testing.md`
12. `12-business-decisions-pending.md`

## 6. Nguyên tắc Single Source of Truth

OpenAPI là nguồn sự thật duy nhất cho:

- Endpoint.
- HTTP method.
- Request DTO.
- Response DTO.
- Enum.
- Validation.
- Error code.
- Security requirement.
- Pagination.
- Ví dụ request và response.

Frontend nên generate TypeScript type và API client từ OpenAPI.

## 7. Quy tắc không conflict FE-BE

- FE không tự định nghĩa enum khác Backend.
- FE không tự tính giá.
- FE không tự tính capacity.
- FE không tự quyết định state transition.
- FE không gửi `customerId` lấy từ giao diện.
- FE không gửi `bookingStatus` hoặc `paymentStatus`.
- FE không gửi tổng tiền do người dùng tự sửa.
- BE trả `availableActions` để FE quyết định hiển thị nút.
- BE vẫn validate lại toàn bộ command.
- Error phải xử lý theo `error.code`, không theo message.
- Date-time dùng ISO-8601 có timezone.
- Tiền dùng `BigDecimal` và currency.
- Command quan trọng phải hỗ trợ idempotency.
- Entity cập nhật đồng thời phải có optimistic locking.
