-- =========================================================
-- 1. DỮ LIỆU BÃI ĐỖ XE (smart_parking.parking_lots)
-- =========================================================
INSERT INTO smart_parking.parking_lots 
(id, name, address, district, city, latitude, longitude, status, created_at) 
VALUES
-- Quận Hoàn Kiếm
(101, N'Bãi đỗ xe Tràng Tiền Plaza', N'24 Tràng Tiền, Phường Tràng Tiền', N'Hoàn Kiếm', N'Hà Nội', 21.024285, 105.853032, 'ACTIVE', NOW()),
(102, N'Điểm đỗ xe Quảng trường Nhà hát Lớn', N'1 Tràng Tiền, Phường Phan Chu Trinh', N'Hoàn Kiếm', N'Hà Nội', 21.024381, 105.857642, 'ACTIVE', NOW()),
(103, N'Bãi đỗ xe hầm Chợ Đồng Xuân', N'Đường Đồng Xuân, Phường Đồng Xuân', N'Hoàn Kiếm', N'Hà Nội', 21.038122, 105.849641, 'ACTIVE', NOW()),
(104, N'Bãi đỗ xe Phùng Hưng', N'2B Phùng Hưng, Phường Hàng Mã', N'Hoàn Kiếm', N'Hà Nội', 21.034512, 105.844781, 'ACTIVE', NOW()),

-- Quận Ba Đình
(201, N'Bãi đỗ xe Lotte Center Hà Nội', N'54 Liễu Giai, Phường Cống Vị', N'Ba Đình', N'Hà Nội', 21.031835, 105.812997, 'ACTIVE', NOW()),
(202, N'Bãi đỗ xe Công viên Bách Thảo', N'3 Hoàng Hoa Thám, Phường Ngọc Hà', N'Ba Đình', N'Hà Nội', 21.040182, 105.827351, 'ACTIVE', NOW()),
(203, N'Bãi đỗ xe Quảng trường Ba Đình', N'Đường Độc Lập, Phường Điện Biên', N'Ba Đình', N'Hà Nội', 21.035480, 105.834630, 'ACTIVE', NOW()),

-- Quận Cầu Giấy
(301, N'Bãi đỗ xe Công viên Cầu Giấy', N'Đường Thành Thái, Phường Dịch Vọng', N'Cầu Giấy', N'Hà Nội', 21.028912, 105.792341, 'ACTIVE', NOW()),
(302, N'Bãi đỗ xe Vincom Center Trần Duy Hưng', N'119 Trần Duy Hưng, Phường Trung Hòa', N'Cầu Giấy', N'Hà Nội', 21.008450, 105.795810, 'ACTIVE', NOW()),
(303, N'Bãi đỗ xe Tòa nhà Keangnam Landmark 72', N'Đường Phạm Hùng, Phường Mễ Trì', N'Cầu Giấy', N'Hà Nội', 21.016801, 105.783852, 'ACTIVE', NOW()),
(304, N'Điểm đỗ xe Học viện Báo chí', N'361 Xuân Thủy, Phường Dịch Vọng Hậu', N'Cầu Giấy', N'Hà Nội', 21.036911, 105.781950, 'ACTIVE', NOW()),

-- Quận Đống Đa
(401, N'Bãi đỗ xe Vincom Center Phạm Ngọc Thạch', N'2 Phạm Ngọc Thạch, Phường Kim Liên', N'Đống Đa', N'Hà Nội', 21.006812, 105.832210, 'ACTIVE', NOW()),
(402, N'Bãi đỗ xe Văn Miếu - Quốc Tử Giám', N'58 Quốc Tử Giám, Phường Văn Miếu', N'Đống Đa', N me', N'Hà Nội', 21.028821, 105.835412, 'ACTIVE', NOW()),
(403, N'Bãi đỗ xe Hồ Hoàng Cầu', N'Đường Hoàng Cầu, Phường Ô Chợ Dừa', N'Đống Đa', N'Hà Nội', 21.018241, 105.820931, 'ACTIVE', NOW()),

-- Quận Hai Bà Trưng
(501, N'Bãi đỗ xe Vincom Center Bà Triệu', N'191 Bà Triệu, Phường Lê Đại Hành', N'Hai Bà Trưng', N'Hà Nội', 21.011501, 105.849921, 'ACTIVE', NOW()),
(502, N'Bãi đỗ xe Công viên Thống Nhất (Cổng Trần Nhân Tông)', N'354 Trần Nhân Tông, Phường Lê Đại Hành', N'Hai Bà Trưng', N'Hà Nội', 21.017582, 105.844351, 'ACTIVE', NOW()),
(503, N'Bãi đỗ xe Times City', N'458 Minh Khai, Phường Vĩnh Tuy', N'Hai Bà Trưng', N'Hà Nội', 21.000102, 105.867910, 'ACTIVE', NOW());


-- =========================================================
-- 2. DỮ LIỆU SỨC CHỨA BÃI ĐỖ XE (smart_parking.parking_vehicle_capacities)
-- (Giả định liên kết qua foreign key parking_lot_id)
-- =========================================================
INSERT INTO smart_parking.parking_vehicle_capacities 
(parking_lot_id, vehicle_type, total_capacity, available_capacity) 
VALUES
-- Tràng Tiền Plaza (Chủ yếu ô tô & xe máy)
(101, 'CAR', 150, 45),
(101, 'MOTORBIKE', 500, 120),

-- Bãi đỗ xe Phùng Hưng
(104, 'CAR', 80, 12),
(104, 'MOTORBIKE', 200, 50),

-- Lotte Center
(201, 'CAR', 300, 110),
(201, 'MOTORBIKE', 1000, 350),

-- Công viên Cầu Giấy
(301, 'CAR', 100, 25),
(301, 'MOTORBIKE', 400, 90),

-- Vincom Phạm Ngọc Thạch
(401, 'CAR', 200, 60),
(401, 'MOTORBIKE', 800, 200);


-- =========================================================
-- 3. DỮ LIỆU DỊCH VỤ ĐI KÈM (smart_parking.parking_services)
-- =========================================================
INSERT INTO smart_parking.parking_services 
(parking_lot_id, service_name, price, is_available) 
VALUES
(101, N'Rửa xe ô tô', 100000.00, true),
(101, N'Sạc xe điện EV', 150000.00, true),
(201, N'Sạc xe điện EV', 150000.00, true),
(302, N'Rửa xe máy', 30000.00, true),
(503, N'Sạc xe điện EV', 150000.00, true);