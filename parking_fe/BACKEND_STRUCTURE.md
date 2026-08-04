# Smart Parking Backend Structure

Tài liệu này mô tả cấu trúc backend `parking_be` theo đúng source code hiện tại.
Nội dung đi theo vùng nghiệp vụ, không thêm phần suy đoán ngoài các package, class, config và migration đang có.

## 1. Tổng quan

- Root backend: `parking_be`
- Entrypoint: `src/main/java/com/smartparking/SmartParkingApplication.java`
- Framework: Spring Boot `3.3.5`
- Java target: `21`
- Build tool: Maven
- Database: PostgreSQL
- ORM: Spring Data JPA + Hibernate
- Migration: Flyway
- Security: Spring Security + JWT
- API docs: springdoc-openapi Swagger UI
- File storage: MinIO

## 2. Cấu trúc cấp cao

```text
parking_be/
├── pom.xml
├── docker-compose.yml
├── src/main/java/com/smartparking/
├── src/main/resources/
├── smart-parking-backend-spec/
├── target/
└── .tools/
```

- `pom.xml`: dependency, Java version, Spring Boot Maven plugin.
- `docker-compose.yml`: PostgreSQL, Redis, MinIO cho local.
- `src/main/java/com/smartparking`: source Java.
- `src/main/resources`: application config và Flyway migration.
- `smart-parking-backend-spec`: tài liệu đặc tả nghiệp vụ/API/database.
- `target`: output build Maven.
- `.tools`: Maven tool đi kèm trong repo.

## 3. Package gốc

```text
com.smartparking
├── account
├── administration
├── audit
├── auth
├── booking
├── capacity
├── common
├── controller
├── customer
├── device
├── feedback
├── notification
├── operation
├── parking
├── payment
├── pricing
├── promotion
├── staff
├── vehicle
└── vehiclecondition
```

- `controller`: HTTP API theo vai trò và nghiệp vụ.
- `common`: nền tảng dùng chung: enum, response, error, security, storage, config.
- Các package còn lại gom entity, repository, service, DTO, mapper theo nghiệp vụ.

## 4. Luồng phân lớp

- Controller nhận request, validate DTO, lấy `CurrentUser` nếu endpoint cần đăng nhập.
- Service interface định nghĩa hành vi nghiệp vụ.
- Service implementation xử lý rule, trạng thái, phân quyền theo dữ liệu, audit, idempotency.
- Repository truy cập database qua Spring Data JPA.
- Entity ánh xạ bảng PostgreSQL.
- Mapper chuyển entity sang DTO response.

## 5. Dependency chính

- `spring-boot-starter-web`: REST API.
- `spring-boot-starter-validation`: Bean Validation.
- `spring-boot-starter-security`: bảo vệ endpoint và role.
- `spring-boot-starter-data-jpa`: ORM và repository.
- `spring-boot-starter-mail`: mail/OTP.
- `flyway-core`, `flyway-database-postgresql`: migration database.
- `postgresql`: JDBC driver.
- `springdoc-openapi-starter-webmvc-ui`: Swagger/OpenAPI.
- `minio`: client lưu file.
- `jjwt-api`, `jjwt-impl`, `jjwt-jackson`: JWT.
- `lombok`: getter/setter tại compile time.

## 6. Runtime config

File: `src/main/resources/application.yml`

- Server port: `${SERVER_PORT:8080}`
- Datasource mặc định: `jdbc:postgresql://localhost:5432/dparking?currentSchema=smart_parking`
- DB env: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `DB_SCHEMA`
- JPA: `ddl-auto=validate`, default schema `smart_parking`
- Flyway: enabled, location `classpath:db/migration`, tự tạo schema.
- Swagger UI: `/swagger-ui.html`
- OpenAPI JSON: `/v3/api-docs`
- JWT: issuer, secret, access token TTL, refresh token TTL.
- Booking: hold timeout, approval timeout, active overlap statuses.
- Pricing: currency, platform fee, tax, default hourly rate.
- Payment: webhook secret.
- OTP: TTL và length.
- Operation: check-in early/late, checkout grace, device offline threshold.
- Jobs: cron expire payment, expire approval, no-show, overdue, offline device, expire promotion.
- MinIO: endpoint, access key, secret key, bucket.
- Upload: max avatar bytes, allowed avatar content types.

## 7. Docker local

File: `docker-compose.yml`

- `postgres`: `postgres:16-alpine`, DB `smart_parking`, user `postgres`, password `postgres`, port `5432`.
- `redis`: `redis:7-alpine`, port `6379`.
- `minio`: `minio/minio:RELEASE.2024-10-13T13-34-11Z`, API `9000`, console `9001`.

## 8. Security

Package: `common/security`

- `SecurityConfig`: stateless security, disable CSRF, route theo role.
- Public: Swagger, OpenAPI, auth public endpoints, GET `/api/v1/public/**`, payment webhook.
- Customer role: `/api/v1/customer/**`, `/api/v1/customers/**`
- Staff role: `/api/v1/staff/**`
- Admin role: `/api/v1/admin/**`
- `JwtAuthenticationFilter`: đọc bearer token, xác thực account, chặn account locked/inactive.
- `JwtService`: tạo và đọc JWT.
- `SecurityPrincipal`: principal chứa id, role, account status.
- `CurrentUser`: record user hiện tại truyền vào controller/service.
- `RequestContext`, `RequestIdFilter`: request id.
- `SecurityErrorResponseWriter`: response lỗi security.

## 9. Common layer

Package: `common`

- `BaseEntity`: `id`, `version`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- `StoredFile`: metadata file upload.
- `StoredFileRepository`: repository cho `stored_files`.
- `common/dto`: `ApiResponse`, `ErrorResponse`, `ApiMeta`, `ErrorBody`, `FieldErrorBody`, `PageResponse`, `PaginationMeta`.
- `common/exception`: `BusinessException`, `ErrorCode`, `GlobalExceptionHandler`.
- `common/config`: `OpenApiConfig`, `SchedulingConfig`, `SmartParkingProperties`.
- `common/storage`: `FileStorageService`, `MinioFileStorageService`, `MinioStorageConfig`.

### Enum dùng chung

- `Role`: `CUSTOMER`, `STAFF`, `ADMIN`
- `AccountStatus`: `PENDING_APPROVAL`, `ACTIVE`, `SUSPENDED`, `REJECTED`, `LOCKED`
- `ParkingLotStatus`: `DRAFT`, `PENDING_APPROVAL`, `ACTIVE`, `PAUSED`, `CLOSURE_REQUESTED`, `CLOSED`, `SUSPENDED`
- `BookingStatus`: `PENDING_APPROVAL`, `PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`, `OVERDUE`, `CHECKED_OUT`, `CANCELLED`, `DECLINED`, `EXPIRED`, `NO_SHOW`
- `PaymentStatus`: `UNPAID`, `PENDING`, `PAID`, `PARTIALLY_PAID`, `REFUNDED`, `PARTIALLY_REFUNDED`
- `PaymentMethod`: `CASH`, `QR`, `CARD`
- `PaymentTransactionStatus`: `SUCCESS`, `FAILED`
- `RefundStatus`: `PENDING`, `SUCCEEDED`, `FAILED`
- `RequestStatus`: `PENDING`, `APPROVED`, `REJECTED`
- `VehicleType`: `MOTORBIKE`, `CAR`, `ELECTRIC_CAR`, `BICYCLE`
- `VehicleStatus`: `ACTIVE`, `INACTIVE`
- `DeliveryMethod`: `SELF_DROP_OFF`, `PICKUP`
- `RecordType`: `CHECK_IN`, `CHECK_OUT`
- `OtpPurpose`: `CUSTOMER_REGISTRATION`, `PASSWORD_RESET`
- `AvailableAction`: `VIEW_QR`, `CANCEL`, `REQUEST_CHANGE`, `REQUEST_EXTENSION`, `COMPLETE_PAYMENT`, `CHECK_IN`, `CHECK_OUT`

## 10. Auth và account

Package: `auth`, `account`

- Entity `Account` -> `accounts`: email, phone, role, status.
- Entity `AccountCredential` -> `account_credentials`: account, password hash, password changed at.
- Entity `CustomerProfile` -> `customer_profiles`: account, full name, avatar file id.
- Entity `StaffProfile` -> `staff_profiles`: account, full name.
- Entity `RefreshToken` -> `refresh_tokens`: account, token hash, expiry, revoked time.
- Entity `OtpRequest` -> `otp_requests`: destination, purpose, code hash, expires at, verified at, account id.
- Repository: `AccountRepository`, `AccountCredentialRepository`, `CustomerProfileRepository`, `StaffProfileRepository`, `RefreshTokenRepository`, `OtpRequestRepository`.
- Service: `AuthService`, `AuthServiceImpl`.
- DTO: `AuthDtos.CustomerRegisterRequest`, `LoginRequest`, `RefreshRequest`, `ChangePasswordRequest`, `OtpSendRequest`, `OtpVerifyRequest`, `OtpResponse`, `ForgotPasswordRequest`, `ResetPasswordRequest`, `AuthResponse`, `AccountSummary`.
- Controller: `AuthController` base `/api/v1/auth`.
- Endpoints: `POST /customers/register`, `POST /login`, `POST /refresh`, `POST /otp/send`, `POST /otp/verify`, `POST /forgot-password`, `POST /reset-password`, `POST /logout`, `POST /change-password`, `GET /me`.

## 11. Customer profile

Package: `customer`

- Service: `CustomerService`, `CustomerServiceImpl`.
- Chức năng: xem profile, cập nhật full name/version, upload avatar.
- DTO: `CustomerDtos.ProfileUpdateRequest`, `CustomerDtos.ProfileResponse`.
- Controller: `CustomerController` base `/api/v1/customers/me`.
- Endpoints: `GET /`, `PATCH /`, `POST /avatar`.
- Entity dùng chính: `CustomerProfile`, `Account`, `StoredFile`.

## 12. Vehicle

Package: `vehicle`

- Entity `Vehicle` -> `vehicles`: customer, plate number, vehicle type, brand, model, default flag, status.
- Entity `VehicleImage` -> `vehicle_images`: vehicle, file id, url, content type, size.
- Repository: `VehicleRepository`, `VehicleImageRepository`.
- Mapper: `VehicleMapper`.
- Service: `VehicleService`, `VehicleServiceImpl`.
- Chức năng: create, list, get, update, make default, deactivate.
- DTO: `VehicleDtos.VehicleRequest`, `VehicleDtos.VehicleResponse`.
- Controller: `VehicleController` base `/api/v1/customer/vehicles`.
- Endpoints: `POST /`, `GET /`, `GET /{vehicleId}`, `PUT /{vehicleId}`, `PATCH /{vehicleId}/default`, `PATCH /{vehicleId}/deactivate`.

## 13. Parking lot

Package: `parking`

- Entity `ParkingLot` -> `parking_lots`: name, address, latitude, longitude, status, previous status, rejection reason.
- Entity `ParkingLotImage` -> `parking_lot_images`: ảnh bãi.
- Entity `ParkingLotStaff` -> `parking_lot_staff`: quan hệ bãi - staff.
- Entity `ParkingOperatingHour` -> `parking_operating_hours`: giờ hoạt động.
- Entity `ParkingServiceEntity` -> `parking_services`: dịch vụ bổ sung, giá, active.
- Entity `ParkingPolicy` -> `parking_policies`: policy key/value.
- Entity `ParkingStatusHistory` -> `parking_status_histories`: lịch sử trạng thái bãi.
- Repository: `ParkingLotRepository`, `ParkingLotImageRepository`, `ParkingLotStaffRepository`, `ParkingOperatingHourRepository`, `ParkingServiceRepository`, `ParkingPolicyRepository`, `ParkingStatusHistoryRepository`.
- Mapper: `ParkingLotMapper`.
- Service: `ParkingLotService`, `ParkingLotServiceImpl`.
- Chức năng staff: tạo bãi, list bãi của staff, xem/cập nhật bãi, submit approval, pause, resume, request closure.
- Chức năng public: list active, search nearby/filter, detail, availability.
- Chức năng cấu hình bãi: capacity, capacity block, pricing rule, service, promotion, policy.
- DTO: `ParkingDtos` gồm request/response cho parking lot, capacity, availability, pricing rule, service, promotion, policy.

### Staff parking API

- Controller: `StaffParkingController` base `/api/v1/staff/parking-lots`.
- Endpoints parking: `POST /`, `GET /`, `GET /{parkingLotId}`, `PUT /{parkingLotId}`.
- Endpoints status: `POST /{parkingLotId}/submit-approval`, `/pause`, `/resume`, `/request-closure`.
- Endpoints capacity: `GET /{parkingLotId}/capacities`, `PUT /{parkingLotId}/capacities/{vehicleType}`.
- Endpoints block: `POST /{parkingLotId}/capacity-blocks`, `DELETE /{parkingLotId}/capacity-blocks/{blockId}`.
- Endpoints pricing: `GET /{parkingLotId}/pricing-rules`, `PUT /{parkingLotId}/pricing-rules`.
- Endpoints service: `GET /{parkingLotId}/services`, `POST /{parkingLotId}/services`, `PUT /{parkingLotId}/services/{serviceId}`.
- Endpoints promotion: `GET /{parkingLotId}/promotions`, `POST /{parkingLotId}/promotions`, `PUT /{parkingLotId}/promotions/{promotionId}`.
- Endpoints policy: `GET /{parkingLotId}/policies`, `PUT /{parkingLotId}/policies`.

### Public parking API

- Controller: `PublicParkingController` base `/api/v1/public/parking-lots`.
- Endpoints: `GET /`, `GET /nearby`, `GET /{parkingLotId}`, `GET /{parkingLotId}/availability`.

## 14. Capacity

Package: `capacity`

- Entity `ParkingVehicleCapacity` -> `parking_vehicle_capacities`: capacity theo bãi và loại xe.
- Entity `ParkingCapacityBlock` -> `parking_capacity_blocks`: chặn capacity theo khoảng thời gian, loại xe, số lượng, lý do.
- Repository `ParkingVehicleCapacityRepository`: tìm capacity theo bãi/type, lock row, list capacity của staff.
- Repository `ParkingCapacityBlockRepository`: list block theo bãi, đếm block overlap, exclude block khi cập nhật/xóa.
- Được dùng bởi `ParkingLotServiceImpl`, `BookingServiceImpl`, `StaffDashboardServiceImpl`.

## 15. Pricing và promotion

Package: `pricing`, `promotion`

- Entity `ParkingPricingRule` -> `parking_pricing_rules`: parking lot, vehicle type, hourly rate, active.
- Repository `ParkingPricingRuleRepository`: tìm rule active theo bãi/type, list rule theo bãi.
- Service `PricingService`: `calculate`, `calculateSnapshot`.
- Service `PricingServiceImpl`: tính base fee, service fee, promotion discount, platform fee, tax, total.
- Entity `Promotion` -> `promotions`: code, name, discount amount, active, starts at, ends at.
- Entity `PromotionParkingLot` -> `promotion_parking_lots`: gắn promotion với parking lot.
- Entity `PromotionUsage` -> `promotion_usages`: lưu promotion đã dùng theo booking/customer.
- Repository: `PromotionRepository`, `PromotionParkingLotRepository`, `PromotionUsageRepository`.
- Promotion được quản lý qua staff parking API và áp dụng trong pricing/booking.

## 16. Booking

Package: `booking`

- Entity `Booking` -> `bookings`: booking code, customer, vehicle, parking lot, status, payment status, vehicle type, delivery method, start/end time, expiry, check-in/out time, các khoản tiền, currency, idempotency key.
- Entity `BookingCapacityReservation` -> `booking_capacity_reservations`: giữ chỗ capacity, released flag.
- Entity `BookingChangeRequest` -> `booking_change_requests`: yêu cầu đổi thời gian, status.
- Entity `BookingExtensionRequest` -> `booking_extension_requests`: yêu cầu gia hạn, status.
- Entity `BookingPriceItem` -> `booking_price_items`: dòng tiền của booking.
- Entity `BookingPricingSnapshot` -> `booking_pricing_snapshots`: snapshot rule giá/promotion.
- Entity `BookingServiceItem` -> `booking_services`: dịch vụ chọn trong booking.
- Entity `BookingStatusHistory` -> `booking_status_histories`: lịch sử trạng thái booking.
- Entity `BookingCommandIdempotency` -> `booking_command_idempotencies`: idempotency cho command booking.
- Repository: `BookingRepository`, `BookingCapacityReservationRepository`, `BookingChangeRequestRepository`, `BookingExtensionRequestRepository`, `BookingCommandIdempotencyRepository`, `BookingPriceItemRepository`, `BookingPricingSnapshotRepository`, `BookingServiceItemRepository`, `BookingStatusHistoryRepository`.
- Mapper: `BookingMapper`.
- Service: `BookingService`, `BookingServiceImpl`.
- DTO: `BookingDtos` gồm booking request, preview, response, list response, command response, change/extension request, QR verify, check-in/check-out.

### Customer booking API

- Controller: `CustomerBookingController` base `/api/v1/customer/bookings`.
- Endpoints: `POST /preview`, `POST /`, `GET /`, `GET /{bookingId}`, `GET /{bookingId}/qr-code`, `POST /{bookingId}/cancel`, `POST /{bookingId}/change-requests`, `POST /{bookingId}/extension-requests`.

### Staff booking API

- Controller: `StaffBookingController` base `/api/v1/staff/bookings`.
- Endpoints: `GET /`, `GET /{bookingId}`, `POST /{bookingId}/approve`, `POST /{bookingId}/decline`, `POST /{bookingId}/verify-qr`, `POST /{bookingId}/check-in`, `POST /{bookingId}/checkout-preview`, `POST /{bookingId}/check-out`.
- Controller: `StaffBookingRequestController` base `/api/v1/staff`.
- Endpoints: `POST /booking-change-requests/{requestId}/approve`, `POST /booking-change-requests/{requestId}/reject`, `POST /booking-extension-requests/{requestId}/approve`, `POST /booking-extension-requests/{requestId}/reject`.

### Booking service surface

- Customer: preview, create, list, detail, cancel, request change, request extension.
- Staff: list/filter, detail, approve, decline, verify QR, check-in, checkout preview, check-out.
- Request handling: approve/reject change request, approve/reject extension request.
- Idempotency: create booking, check-in, check-out.
- Capacity: kiểm tra overlap vehicle, reservation, blocked capacity, checked-in capacity.

## 17. Payment và refund

Package: `payment`

- Entity `Payment` -> `payments`: booking, method, status, amount, currency, provider payment id, idempotency key.
- Entity `PaymentTransaction` -> `payment_transactions`: payment, provider transaction id, amount, status, raw payload.
- Entity `Refund` -> `refunds`: payment, amount, status, reason.
- Repository: `PaymentRepository`, `PaymentTransactionRepository`, `RefundRepository`.
- Mapper: `PaymentMapper`.
- Service: `PaymentService`, `PaymentServiceImpl`.
- DTO: `PaymentDtos.CreatePaymentRequest`, `PaymentResponse`, `WebhookRequest`, `RefundRequest`, `RefundResponse`.
- Customer API: `POST /api/v1/customer/bookings/{bookingId}/payments`, `GET /api/v1/customer/bookings/{bookingId}/payments`, `GET /api/v1/customer/payments/{paymentId}`.
- Webhook API: `POST /api/v1/payment-webhooks/{provider}`.
- Admin payment API: `POST /api/v1/admin/payments/{paymentId}/refund`.
- Admin refund API: `GET /api/v1/admin/refunds`, `GET /api/v1/admin/refunds/{refundId}`.

## 18. Administration

Package: `administration`

- Service: `AdminService`, `AdminServiceImpl`.
- DTO: `AdminDtos.CreateStaffRequest`, `StatusRequest`, `ReasonRequest`, `UserResponse`, `ParkingCommandResponse`, `ResolveBookingExceptionRequest`, `BookingExceptionCommandResponse`, `SystemDashboardSummaryResponse`, `AdminBookingFilter`.
- Chức năng user: list users, user detail, create staff, approve/reject staff, update user status.
- Chức năng parking: pending list, detail, approve, reject, suspend, activate, approve closure, reject closure.
- Chức năng booking: admin list/detail booking, resolve booking exception.
- Chức năng dashboard: system summary.
- Controller `AdminController` base `/api/v1/admin`.
- Admin user endpoints: `GET /users`, `GET /users/{userId}`, `PATCH /users/{userId}/status`, `POST /staff`, `POST /staff/{staffId}/approve`, `POST /staff/{staffId}/reject`.
- Admin parking endpoints: `GET /parking-lots/pending`, `GET /parking-lots/{parkingLotId}`, `POST /parking-lots/{parkingLotId}/approve`, `/reject`, `/suspend`, `/activate`, `/approve-closure`, `/reject-closure`.
- Controller `AdminBookingController` base `/api/v1/admin/bookings`: `GET /`, `GET /{bookingId}`, `POST /{bookingId}/resolve-exception`.
- Controller `AdminDashboardController` base `/api/v1/admin/dashboard`: `GET /summary`.

## 19. Staff dashboard

Package: `staff`

- Service: `StaffDashboardService`, `StaffDashboardServiceImpl`.
- DTO: `StaffDtos.DashboardSummaryResponse`.
- Controller: `StaffDashboardController` base `/api/v1/staff/dashboard`.
- Endpoint: `GET /summary`.
- Dữ liệu tổng hợp: capacity occupied/reserved/blocked, pending approval, overdue, today bookings, offline devices.

## 20. Audit

Package: `audit`

- Entity `AuditLog` -> `audit_logs`: actor id, actor role, action, entity type/id, old value, new value, reason, request id, ip address, user agent.
- Repository: `AuditLogRepository`.
- Mapper: `AuditMapper`.
- Service: `AuditService`, `AuditServiceImpl`.
- DTO: `AuditDtos.AuditLogResponse`.
- Controller: `AdminAuditController` base `/api/v1/admin/audit-logs`.
- Endpoints: `GET /`, `GET /{auditId}`.

## 21. Device và occupancy

Package: `device`

- Entity `Device` -> `devices`: parking lot, device code, status, last heartbeat.
- Entity `DeviceOccupancyReport` -> `device_occupancy_reports`: device, vehicle type, occupied count, reported at.
- Entity `OccupancyDiscrepancyAlert` -> `occupancy_discrepancy_alerts`: parking lot, vehicle type, reported count, system count, active flag.
- Repository: `DeviceRepository`, `DeviceOccupancyReportRepository`, `OccupancyDiscrepancyAlertRepository`.
- Dùng trong staff dashboard và job đánh dấu thiết bị offline.

## 22. Vehicle condition

Package: `vehiclecondition`

- Entity `VehicleConditionRecord` -> `vehicle_condition_records`: booking, record type, notes, recorded by, recorded at.
- Entity `VehicleConditionImage` -> `vehicle_condition_images`: record, file id, url, content type, size.
- Repository: `VehicleConditionRecordRepository`, `VehicleConditionImageRepository`.
- Được dùng trong `BookingServiceImpl` khi check-in/check-out.

## 23. Feedback

Package: `feedback`

- Entity `Review` -> `reviews`: booking, customer, rating, comment.
- Entity `Complaint` -> `complaints`: booking optional, customer, subject, content, resolution.
- Repository: `ReviewRepository`, `ComplaintRepository`.
- Hiện có entity/repository, chưa có controller riêng trong source hiện tại.

## 24. Notification

Package: `notification`

- Entity `Notification` -> `notifications`: recipient account, type, title, content, read flag.
- Repository: `NotificationRepository`.
- Được dùng trong `BookingOperationJobs` để thông báo customer khi booking đổi trạng thái tự động.

## 25. Operation jobs

Package: `operation`

- Component: `BookingOperationJobs`.
- `expirePendingPaymentBookings`: `PENDING_PAYMENT` hết hold timeout -> `EXPIRED`.
- `expirePendingApprovalBookings`: `PENDING_APPROVAL` hết approval timeout -> `EXPIRED`.
- `markNoShowBookings`: `CONFIRMED` quá giờ check-in late -> `NO_SHOW`.
- `markOverdueBookings`: `CHECKED_IN` quá checkout grace -> `OVERDUE`.
- `markDeviceOffline`: device quá ngưỡng heartbeat -> status string `OFFLINE`.
- `expirePromotions`: promotion active quá `endsAt` -> inactive.
- Khi booking sang `EXPIRED` hoặc `NO_SHOW`, reservation được release.
- Job ghi `BookingStatusHistory`, `AuditLog`, và `Notification`.

## 26. Controller tổng hợp

```text
controller/
├── AdminAuditController.java
├── AdminBookingController.java
├── AdminController.java
├── AdminDashboardController.java
├── AdminPaymentController.java
├── AdminRefundController.java
├── AuthController.java
├── CustomerBookingController.java
├── CustomerController.java
├── CustomerPaymentController.java
├── PaymentWebhookController.java
├── PublicParkingController.java
├── StaffBookingController.java
├── StaffBookingRequestController.java
├── StaffDashboardController.java
├── StaffParkingController.java
└── VehicleController.java
```

- Auth: đăng ký, đăng nhập, OTP, token, mật khẩu, account summary.
- Customer: profile, avatar, vehicle, booking, payment cá nhân.
- Public: tra cứu bãi xe và availability.
- Staff: quản lý bãi, capacity, pricing, service, promotion, policy, booking vận hành.
- Admin: user, staff approval, parking approval, booking exception, refund, dashboard, audit.
- Webhook: nhận cập nhật payment từ provider.

## 27. Database migration

```text
src/main/resources/db/migration/
├── V1__init_smart_parking.sql
├── V2__parking_lot_previous_status.sql
├── V3__customer_booking_request_indexes.sql
├── V4__staff_business_indexes.sql
├── V5__admin_business_support.sql
├── V6__booking_pricing_snapshot.sql
├── V7__payment_operation_support.sql
├── V8__api_contract_idempotency.sql
└── V9__database_design_constraints_indexes.sql
```

- `V1`: tạo cấu trúc bảng ban đầu.
- `V2`: thêm previous status cho parking lot.
- `V3`: thêm index cho booking change/extension request.
- `V4`: thêm index phục vụ staff business.
- `V5`: thêm hỗ trợ admin business.
- `V6`: thêm booking pricing snapshot.
- `V7`: thêm hỗ trợ payment operation.
- `V8`: thêm idempotency theo API contract.
- `V9`: thêm constraint và index, gồm constraint booking status có `NO_SHOW`.

## 28. Tài liệu đặc tả

- Files: `00-README`, `01-operating-rules`, `02-role-permission`, `03-state-machine`, `04-customer-business`, `05-staff-business`, `06-admin-business`, `07-booking-capacity`, `08-payment-operation`, `09-api-contract`, `10-database-design`, `11-error-security-testing`, `12-business-decisions-pending`.
- Operating/state-machine: quy tắc vận hành và trạng thái.
- Role/customer/staff/admin: phân quyền và nghiệp vụ theo vai trò.
- Booking-capacity/payment: đặt chỗ, sức chứa, thanh toán.
- API/database/error/security/testing: contract API, database, lỗi, bảo mật, kiểm thử.
- Business decisions pending: quyết định nghiệp vụ còn chờ.

## 29. Ranh giới nghiệp vụ

- `auth` + `account`: danh tính, token, OTP, trạng thái tài khoản, profile.
- `customer`: thông tin khách hàng hiện tại.
- `vehicle`: phương tiện của khách hàng.
- `parking` + `capacity`: bãi xe, staff quản lý bãi, sức chứa, block capacity, dịch vụ, policy.
- `pricing` + `promotion`: tính giá, rule giá, mã giảm giá, quan hệ promotion-bãi.
- `booking`: vòng đời đặt chỗ, giữ chỗ capacity, yêu cầu đổi/gia hạn, check-in/check-out.
- `payment`: payment, transaction, webhook, refund.
- `administration`: quản trị user, staff, bãi xe, booking exception.
- `staff`: dashboard vận hành cho staff.
- `audit`: lịch sử thao tác và truy vết.
- `device`: thiết bị và báo cáo occupancy.
- `vehiclecondition`: ghi nhận tình trạng xe khi vận hành booking.
- `feedback`: review và complaint.
- `notification`: thông báo nội bộ.
- `operation`: job tự động chuyển trạng thái.
- `common`: nền tảng dùng chung.
