-- ======================================================
-- DATABASE: LAGOM WMS - Phiên bản 2.0
-- Ngày: 2026-07-06
-- Mô tả: 2 role (admin, quan_ly) với quy trình duyệt
-- ======================================================

USE defaultdb;

-- ======================================================
-- 1. Bảng users
-- ======================================================
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fullName VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    roleId ENUM('admin', 'quan_ly') NOT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastLoginAt DATETIME,
    INDEX idx_role (roleId)
);

-- ======================================================
-- 2. Bảng inventory (Tồn kho - có trạng thái duyệt)
-- ======================================================
DROP TABLE IF EXISTS inventory;
CREATE TABLE inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    stt INT,
    -- 12 trường thông tin cơ bản
    tenThuongMai VARCHAR(200) NOT NULL,
    maHang VARCHAR(50) UNIQUE NOT NULL,
    dvt VARCHAR(20),
    hangSX VARCHAR(200),
    phanLoai VARCHAR(100),
    giaNhap DECIMAL(15,0) DEFAULT 0,
    soHopDongNhap VARCHAR(50),
    soHoaDonNhap VARCHAR(50),
    soHoaDonXuat VARCHAR(50),
    ngayNhapHD DATE,
    ngayXuatHD DATE,
    ghiChu TEXT,
    -- Số lượng tồn
    tonKho INT DEFAULT 0,
    -- Trạng thái duyệt
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    createdBy INT,
    approvedBy INT,
    approvedAt DATETIME,
    rejectedReason TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES users(id),
    FOREIGN KEY (approvedBy) REFERENCES users(id),
    INDEX idx_maHang (maHang),
    INDEX idx_status (status)
);

-- ======================================================
-- 3. Bảng receipt_requests (Đề nghị nhập hàng)
-- ======================================================
DROP TABLE IF EXISTS receipt_requests;
CREATE TABLE receipt_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    requestNo VARCHAR(50) UNIQUE NOT NULL,
    -- 12 trường thông tin sản phẩm
    tenThuongMai VARCHAR(200) NOT NULL,
    maHang VARCHAR(50) NOT NULL,
    dvt VARCHAR(20),
    hangSX VARCHAR(200),
    phanLoai VARCHAR(100),
    giaNhap DECIMAL(15,0) DEFAULT 0,
    soHopDongNhap VARCHAR(50),
    soHoaDonNhap VARCHAR(50),
    soHoaDonXuat VARCHAR(50),
    ngayNhapHD DATE,
    ngayXuatHD DATE,
    ghiChu TEXT,
    -- Trường bổ sung khi khớp
    soLuongNhap INT DEFAULT 0,
    -- Trạng thái khớp
    matchStatus ENUM('matched', 'unmatched') DEFAULT 'unmatched',
    -- Trạng thái duyệt: pending = chờ duyệt/xác nhận
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    createdBy INT,
    approvedBy INT,
    approvedAt DATETIME,
    rejectedReason TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES users(id),
    FOREIGN KEY (approvedBy) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_matchStatus (matchStatus)
);

-- ======================================================
-- 4. Bảng export_requests (Đề nghị xuất kho)
-- ======================================================
DROP TABLE IF EXISTS export_requests;
CREATE TABLE export_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    requestNo VARCHAR(50) UNIQUE NOT NULL,
    -- 12 trường thông tin sản phẩm
    tenThuongMai VARCHAR(200) NOT NULL,
    maHang VARCHAR(50) NOT NULL,
    dvt VARCHAR(20),
    hangSX VARCHAR(200),
    phanLoai VARCHAR(100),
    giaNhap DECIMAL(15,0) DEFAULT 0,
    soHopDongNhap VARCHAR(50),
    soHoaDonNhap VARCHAR(50),
    soHoaDonXuat VARCHAR(50),
    ngayNhapHD DATE,
    ngayXuatHD DATE,
    ghiChu TEXT,
    -- 5 trường bổ sung khi khớp
    donGiaXuat DECIMAL(15,0) DEFAULT 0,
    soLuong INT DEFAULT 0,
    soLot VARCHAR(50),
    ngayHetHan DATE,
    soHopDongXuat VARCHAR(50),
    -- Trạng thái khớp
    matchStatus ENUM('matched', 'unmatched') DEFAULT 'unmatched',
    -- Trạng thái duyệt
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    createdBy INT,
    approvedBy INT,
    approvedAt DATETIME,
    rejectedReason TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES users(id),
    FOREIGN KEY (approvedBy) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_matchStatus (matchStatus)
);

-- ======================================================
-- 5. Bảng notifications (Thông báo)
-- ======================================================
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type ENUM('approval', 'info', 'warning', 'success') DEFAULT 'info',
    isRead BOOLEAN DEFAULT FALSE,
    relatedId INT,
    relatedType VARCHAR(50),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    INDEX idx_user_read (userId, isRead)
);

-- ======================================================
-- 6. Bảng edit_history (Lịch sử chỉnh sửa)
-- ======================================================
DROP TABLE IF EXISTS edit_history;
CREATE TABLE edit_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    tableName VARCHAR(50) NOT NULL,
    recordId INT NOT NULL,
    action VARCHAR(50) NOT NULL,
    fieldName VARCHAR(100),
    oldValue TEXT,
    newValue TEXT,
    editedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    INDEX idx_record (tableName, recordId)
);

-- ======================================================
-- 7. Bảng user_permissions (Quản lý phân quyền)
-- ======================================================
DROP TABLE IF EXISTS user_permissions;
CREATE TABLE user_permissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    canEditTenThuongMai BOOLEAN DEFAULT FALSE,
    canEditMaHang BOOLEAN DEFAULT FALSE,
    canEditDVT BOOLEAN DEFAULT FALSE,
    canEditHangSX BOOLEAN DEFAULT FALSE,
    canEditPhanLoai BOOLEAN DEFAULT FALSE,
    canEditGiaNhap BOOLEAN DEFAULT FALSE,
    canEditSoHopDongNhap BOOLEAN DEFAULT FALSE,
    canEditSoHoaDonNhap BOOLEAN DEFAULT FALSE,
    canEditSoHoaDonXuat BOOLEAN DEFAULT FALSE,
    canEditNgayNhapHD BOOLEAN DEFAULT FALSE,
    canEditNgayXuatHD BOOLEAN DEFAULT FALSE,
    canEditGhiChu BOOLEAN DEFAULT FALSE,
    canCreateReceipt BOOLEAN DEFAULT FALSE,
    canCreateExport BOOLEAN DEFAULT FALSE,
    canViewAll BOOLEAN DEFAULT FALSE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user (userId)
);

-- ======================================================
-- 8. Chèn dữ liệu mẫu
-- ======================================================

-- User mẫu: admin và quan_ly (password: admin123, manager123)
INSERT IGNORE INTO users (username, password, fullName, email, roleId, isActive) VALUES
('admin', 'admin123', 'Admin - Nhập liệu', 'admin@lagom.com', 'admin', TRUE),
('quanly', 'manager123', 'Quản Lý', 'quanly@lagom.com', 'quan_ly', TRUE);

-- Sản phẩm mẫu (đã được duyệt)
INSERT IGNORE INTO inventory (stt, tenThuongMai, maHang, dvt, hangSX, phanLoai, giaNhap, tonKho, status, createdBy, approvedBy, approvedAt) VALUES
(1, 'Atelica IM TSH3-Ultra II', '11208706', 'Hộp', 'Siemens Healthcare', 'Máy sinh hóa miễn dịch', 2915000, 0, 'approved', 1, 2, NOW()),
(2, 'Cobas e601 TSH', 'TSH601', 'Hộp', 'Roche Diagnostics', 'Máy miễn dịch', 3500000, 0, 'approved', 1, 2, NOW());

-- Quyền mẫu cho Admin (user id = 1)
INSERT IGNORE INTO user_permissions (userId, canEditTenThuongMai, canEditMaHang, canEditDVT, canEditHangSX, canEditPhanLoai, canEditGiaNhap, canEditSoHopDongNhap, canEditSoHoaDonNhap, canEditSoHoaDonXuat, canEditNgayNhapHD, canEditNgayXuatHD, canEditGhiChu, canCreateReceipt, canCreateExport, canViewAll) VALUES
(1, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);

-- Thông báo mẫu cho Quản lý
INSERT IGNORE INTO notifications (userId, title, message, type, isRead) VALUES
(2, 'Chào mừng', 'Bạn đã đăng nhập với vai trò Quản lý. Vui lòng kiểm tra các yêu cầu chờ duyệt.', 'info', FALSE);

SELECT '✅ Database initialized successfully!' AS message;