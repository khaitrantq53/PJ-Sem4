# OPERATING RULES

## 1. Triết lý

- Phân tích trước khi code.
- Hiểu nghiệp vụ trước khi sửa.
- Hiểu luồng code trước khi thay đổi.
- Không code theo kiểu chạy là được.
- Mọi quyết định phải có lý do kỹ thuật.
- Ưu tiên chất lượng lâu dài.
- Tránh tạo Technical Debt.

## 2. Quy tắc bắt buộc

- Không tự suy diễn nghiệp vụ.
- Không tự bịa logic.
- Không tự thêm tính năng.
- Không sửa lan man.
- Không sửa module ngoài phạm vi.
- Không đổi kiến trúc khi chưa được chấp thuận.
- Không đổi API, DTO hoặc Field nếu không cần.
- Không mock hoặc fake khi chưa được yêu cầu.
- Không hard-code khi có thể cấu hình.
- Không thêm thư viện khi chưa có nhu cầu rõ.
- Không ảnh hưởng chức năng đang chạy.
- Không refactor rộng khi chỉ cần sửa hẹp.
- Không chữa cháy.
- Không làm đối phó.

## 3. Quy trình triển khai

Khi nhận task:

1. Phân tích yêu cầu.
2. Phân tích nghiệp vụ.
3. Đọc cấu trúc code.
4. Đọc luồng xử lý.
5. Đánh giá dependency.
6. Đánh giá ảnh hưởng.
7. Đề xuất giải pháp.
8. Chốt API Contract.
9. Chốt State Transition.
10. Sau đó mới code.

## 4. Backend rule

```text
Swagger/OpenAPI
→ Controller
→ Service
→ ServiceImpl
→ Repository
→ Entity
```

- Controller chỉ nhận request và trả response.
- Controller không điều khiển transaction.
- Controller không query Repository trực tiếp.
- Repository không chứa business decision.
- ServiceImpl chịu trách nhiệm business.
- Validator dùng cho rule có thể tái sử dụng.
- Policy dùng cho quyền hoặc điều kiện phức tạp.
- Mapper không chứa query hoặc business.

## 5. Transaction rule

Bắt buộc sử dụng transaction cho:

- Tạo booking và giữ capacity.
- Chuyển vehicle mặc định.
- Approve hoặc decline booking.
- Check-in.
- Check-out.
- Payment callback.
- Refund.
- Thay đổi capacity.
- Thay đổi trạng thái parking lot.
- Revoke refresh token hàng loạt.

## 6. Lịch sử và audit

Không xóa cứng:

- Booking.
- Payment.
- Refund.
- Vehicle condition.
- Booking status history.
- Audit log.
- Device report quan trọng.

Mọi hành động quan trọng phải lưu:

```text
actorId
actorRole
action
entityType
entityId
oldValue
newValue
reason
ipAddress
userAgent
requestId
createdAt
```

## 7. Definition of Done

Một module chỉ hoàn thành khi có:

- Business Rule.
- State Transition.
- Authorization.
- Entity.
- Migration.
- Repository.
- Service.
- ServiceImpl.
- DTO.
- Mapper.
- Validation.
- Controller.
- OpenAPI.
- Error code.
- Unit test.
- Integration test.
- Security test.
- Self review.
