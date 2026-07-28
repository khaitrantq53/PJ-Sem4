# ROLE AND PERMISSION

## 1. Guest

Guest là người chưa đăng nhập.

Được phép:

- Xem danh sách bãi xe công khai.
- Tìm kiếm bãi xe.
- Xem bản đồ.
- Xem chi tiết bãi xe.
- Xem giá công khai.
- Xem dịch vụ và chính sách.
- Xem promotion công khai.
- Xem rating.
- Xem availability nếu hệ thống cho phép.

Không được phép:

- Tạo booking.
- Quản lý vehicle.
- Thanh toán.
- Xem booking riêng tư.
- Gửi review.
- Gửi complaint liên quan booking.

## 2. Customer

Được phép:

- Đăng ký.
- Đăng nhập.
- Quản lý profile.
- Quản lý vehicle.
- Tìm kiếm parking lot.
- Preview booking.
- Tạo booking.
- Hủy booking nếu đủ điều kiện.
- Gửi yêu cầu thay đổi.
- Gửi yêu cầu gia hạn.
- Thanh toán.
- Xem QR.
- Xem lịch sử booking.
- Xem payment.
- Xem notification.
- Xem vehicle condition của booking mình.

Không được phép:

- Xem Customer khác.
- Xem booking không thuộc mình.
- Quản lý parking lot.
- Approve booking.
- Check-in hoặc check-out.
- Sửa trực tiếp status.

## 3. Staff

Được phép:

- Quản lý parking lot được giao.
- Cấu hình thông tin bãi xe.
- Cấu hình capacity.
- Cấu hình pricing.
- Cấu hình service.
- Cấu hình promotion.
- Cấu hình policy.
- Submit approval.
- Pause và resume.
- Request closure.
- Xem booking tại bãi được giao.
- Approve hoặc decline booking.
- Check-in.
- Check-out.
- Ghi vehicle condition.
- Duyệt yêu cầu thay đổi.
- Duyệt yêu cầu gia hạn.
- Xem dashboard vận hành.
- Xem dữ liệu tài chính của bãi được giao.

Không được phép:

- Truy cập bãi xe khác.
- Quản lý Customer tùy ý.
- Thay đổi platform fee.
- Thay đổi tax.
- Sửa payment history.
- Xóa cứng dữ liệu lịch sử.

## 4. Admin

Được phép:

- Quản lý account.
- Approve Staff.
- Reject Staff.
- Suspend account.
- Approve parking lot.
- Reject parking lot.
- Suspend parking lot.
- Approve closure.
- Xem booking toàn hệ thống.
- Xử lý booking ngoại lệ.
- Xử lý refund.
- Xem audit log.
- Xem dashboard toàn hệ thống.

Không được phép:

- Chữa trạng thái bằng sửa database.
- Xóa cứng lịch sử.
- Can thiệp không có reason.
- Thực hiện vận hành hằng ngày thay Staff nếu không phải exception flow.

## 5. Authorization Matrix

| Action | Guest | Customer | Staff | Admin |
|---|---:|---:|---:|---:|
| Xem parking ACTIVE | Có | Có | Có | Có |
| Tạo booking | Không | Có | Không | Không |
| Xem booking | Không | Chính mình | Bãi được giao | Toàn hệ thống |
| Hủy booking | Không | Chính mình | Không | Ngoại lệ |
| Approve booking | Không | Không | Bãi được giao | Ngoại lệ |
| Check-in/out | Không | Không | Bãi được giao | Ngoại lệ |
| Tạo parking lot | Không | Không | Có | Không |
| Approve parking lot | Không | Không | Không | Có |
| Refund | Không | Không | Không | Có |
| Xem audit | Không | Không | Không | Có |

## 6. Ownership check

Customer API:

```text
ROLE_CUSTOMER
+
resource.customerId == currentUserId
```

Staff API:

```text
ROLE_STAFF
+
staff được phân công vào parkingLotId
```

Admin API:

```text
ROLE_ADMIN
+
action cần reason nếu là hành động nhạy cảm
```
