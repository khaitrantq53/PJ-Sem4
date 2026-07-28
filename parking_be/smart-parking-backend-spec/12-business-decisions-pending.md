# BUSINESS DECISIONS PENDING

Các mục dưới đây chưa được tự suy diễn khi code.

## 1. Authentication

- Customer đăng ký bằng email, phone hay cả hai.
- OTP gửi qua kênh nào.
- OTP timeout.
- OTP retry limit.
- Access token timeout.
- Refresh token timeout.
- Login failure threshold.
- Unlock account flow.

## 2. Staff

- Staff có role con hay không.
- Role con gồm OWNER, MANAGER, OPERATOR hay mô hình khác.
- Mỗi role con được phép làm gì.
- Một Staff được quản lý nhiều parking lot hay không.
- Chủ bãi có được tạo Staff con hay chỉ Admin.

## 3. Parking Lot

- Admin reject parking lot về DRAFT hay trạng thái REJECTED.
- Khi reject closure quay về ACTIVE hay PAUSED.
- Parking SUSPENDED được activate về trạng thái nào.
- Operating hours có hỗ trợ qua ngày hay không.
- Holiday schedule xử lý thế nào.

## 4. Booking

- Hold timeout.
- Approval timeout.
- Auto approval condition.
- Manual approval condition.
- Cancellation window.
- Cancellation fee.
- No-show grace period.
- Early check-in window.
- Late check-in window.
- Booking modification condition.
- Extension condition.
- Active statuses dùng cho overlap.
- Preview token có sử dụng hay không.

## 5. Pricing

- Tính theo giờ, block giờ hay ngày.
- Quy tắc làm tròn.
- Overnight pricing.
- Platform fee.
- Tax.
- Pickup fee.
- Overtime fee.
- Minimum charge.
- Promotion stacking.

## 6. Payment

- Provider thanh toán.
- QR payment flow.
- Cash payment được ghi nhận lúc nào.
- Payment success sau booking expired xử lý thế nào.
- Refund policy.
- Partial refund condition.
- Dispute flow.

## 7. Check-in và Check-out

- Bắt buộc đủ bốn ảnh hay cho phép thiếu.
- Plate mismatch xử lý thế nào.
- Có cho manual check-in không QR hay không.
- Có yêu cầu Customer xác nhận tình trạng xe không.
- Có giữ xe khi chưa thanh toán overtime không.

## 8. Review và Complaint

- Booking phải CHECKED_OUT mới được review hay không.
- Một booking được review bao nhiêu lần.
- Review có sửa được không.
- Complaint mở trong bao lâu.
- Staff hay Admin xử lý complaint.
- SLA xử lý complaint.

## 9. Device

- Ngưỡng lệch occupancy.
- Heartbeat interval.
- Offline timeout.
- Device authentication.
- Device data retention.

## 10. Infrastructure

- Có dùng Redis ngay từ MVP không.
- Có dùng PostGIS không.
- MinIO public URL hay signed URL.
- Log retention.
- Audit retention.
- Backup policy.

Không triển khai logic cuối cùng cho các mục trên trước khi có quyết định nghiệp vụ.
