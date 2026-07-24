-- ======================================================
-- DATABASE: LAGOM WMS - Phiên bản 2.0
-- Ngày: 2026-07-07
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
    roleId ENUM('admin', 'quan_ly', 'ke_toan', 'quan_ly_kho', 'nhan_vien', 'nhap_lieu') NOT NULL,
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
    -- Thông tin cơ bản
    tenThuongMai VARCHAR(200) NOT NULL,
    maHang VARCHAR(50) UNIQUE NOT NULL,
    dvt VARCHAR(20),
    hangSX VARCHAR(200),
    phanLoai VARCHAR(100),
    giaNhap DECIMAL(15,0) DEFAULT 0,
    giaXuat DECIMAL(15,0) DEFAULT 0,
    soHopDongNhap VARCHAR(50),
    soHoaDonNhap VARCHAR(50),
    soHoaDonXuat VARCHAR(50),
    ngayNhapHD DATE,
    ngayXuatHD DATE,
    ghiChu TEXT,
    -- Số lượng
    soLuongNhap INT DEFAULT 0,
    soLuongXuat INT DEFAULT 0,
    tonKho INT DEFAULT 0,
    -- Lô hàng
    soLot VARCHAR(50),
    ngayHetHan DATE,
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
-- 3. Bảng approval_requests (Yêu cầu thêm sản phẩm - ADMIN -> QUAN_LY)
-- ======================================================
DROP TABLE IF EXISTS approval_requests;
CREATE TABLE approval_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    requesterId INT NOT NULL,
    productData JSON NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approvedBy INT,
    approvedAt DATETIME,
    rejectedReason TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requesterId) REFERENCES users(id),
    FOREIGN KEY (approvedBy) REFERENCES users(id)
);

-- ======================================================
-- 4. Bảng receipt_requests (Đề nghị nhập hàng)
-- ======================================================
DROP TABLE IF EXISTS receipt_requests;
CREATE TABLE receipt_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    requestNo VARCHAR(50) UNIQUE NOT NULL,
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
    soLuongNhap INT DEFAULT 0,
    matchStatus ENUM('matched', 'unmatched') DEFAULT 'unmatched',
    status ENUM('pending', 'awaiting_confirmation', 'approved', 'rejected') DEFAULT 'pending',
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
-- 5. Bảng export_requests (Đề nghị xuất kho)
-- ======================================================
DROP TABLE IF EXISTS export_requests;
CREATE TABLE export_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    requestNo VARCHAR(50) UNIQUE NOT NULL,
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
    donGiaXuat DECIMAL(15,0) DEFAULT 0,
    soLuong INT DEFAULT 0,
    soLot VARCHAR(50),
    ngayHetHan DATE,
    soHopDongXuat VARCHAR(50),
    tonKho INT DEFAULT 0,
    matchStatus ENUM('matched', 'unmatched') DEFAULT 'unmatched',
    status ENUM('pending', 'awaiting_confirmation', 'approved', 'rejected') DEFAULT 'pending',
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
-- 6. Bảng receipts (Phiếu nhập hàng - thực tế)
-- ======================================================
DROP TABLE IF EXISTS receipts;
CREATE TABLE receipts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    receiptNo VARCHAR(50) UNIQUE NOT NULL,
    receiptDate DATE NOT NULL,
    supplierName VARCHAR(200),
    supplierAddress VARCHAR(500),
    supplierTax VARCHAR(50),
    customerName VARCHAR(200),
    customerAddress VARCHAR(500),
    customerTax VARCHAR(50),
    customerContract VARCHAR(100),
    total DECIMAL(15,0) DEFAULT 0,
    notes TEXT,
    status ENUM('pending', 'awaiting_confirmation', 'approved', 'rejected') DEFAULT 'pending',
    rejectedReason TEXT,
    createdBy INT NOT NULL,
    approvedBy INT,
    approvedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES users(id),
    FOREIGN KEY (approvedBy) REFERENCES users(id)
);

-- ======================================================
-- 7. Bảng receipt_items (Chi tiết phiếu nhập)
-- ======================================================
DROP TABLE IF EXISTS receipt_items;
CREATE TABLE receipt_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    receiptId INT NOT NULL,
    tenThuongMai VARCHAR(200) NOT NULL,
    maHang VARCHAR(50) NOT NULL,
    quyCach VARCHAR(100),
    hangSX VARCHAR(200),
    dvt VARCHAR(20),
    phanLoai VARCHAR(100),
    giaNhap DECIMAL(15,0) DEFAULT 0,
    soLuongNhap INT DEFAULT 0,
    thanhTien DECIMAL(15,0) DEFAULT 0,
    soLot VARCHAR(50),
    ngayHetHan DATE,
    soHopDongNhap VARCHAR(50),
    soHoaDonNhap VARCHAR(50),
    ngayNhapHD DATE,
    ghiChu TEXT,
    FOREIGN KEY (receiptId) REFERENCES receipts(id) ON DELETE CASCADE
);

-- ======================================================
-- 8. Bảng exports (Phiếu xuất kho - thực tế)
-- ======================================================
DROP TABLE IF EXISTS exports;
CREATE TABLE exports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exportNo VARCHAR(50) UNIQUE NOT NULL,
    exportDate DATE NOT NULL,
    receiverName VARCHAR(200),
    customerName VARCHAR(200),
    customerAddress VARCHAR(500),
    customerTax VARCHAR(50),
    customerContract VARCHAR(100),
    exportReason VARCHAR(200),
    total DECIMAL(15,0) DEFAULT 0,
    status ENUM('pending', 'awaiting_confirmation', 'approved', 'rejected') DEFAULT 'pending',
    rejectedReason TEXT,
    createdBy INT NOT NULL,
    approvedBy INT,
    approvedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES users(id),
    FOREIGN KEY (approvedBy) REFERENCES users(id)
);

-- ======================================================
-- 9. Bảng export_items (Chi tiết phiếu xuất)
-- ======================================================
DROP TABLE IF EXISTS export_items;
CREATE TABLE export_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exportId INT NOT NULL,
    tenThuongMai VARCHAR(200) NOT NULL,
    maHang VARCHAR(50) NOT NULL,
    quyCach VARCHAR(100),
    hangSX VARCHAR(200),
    dvt VARCHAR(20),
    phanLoai VARCHAR(100),
    donGia DECIMAL(15,0) DEFAULT 0,
    soLuong INT DEFAULT 0,
    thanhTien DECIMAL(15,0) DEFAULT 0,
    soLot VARCHAR(50),
    ngayHetHan DATE,
    soHopDongXuat VARCHAR(50),
    soHoaDonXuat VARCHAR(50),
    ngayXuatHD DATE,
    ghiChu TEXT,
    FOREIGN KEY (exportId) REFERENCES exports(id) ON DELETE CASCADE
);

-- ======================================================
-- 10. Bảng edit_requests (Yêu cầu chỉnh sửa)
-- ======================================================
DROP TABLE IF EXISTS edit_requests;
CREATE TABLE edit_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    requesterId INT NOT NULL,
    productId INT NOT NULL,
    oldData JSON NOT NULL,
    newData JSON NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approvedBy INT,
    approvedAt DATETIME,
    rejectedReason TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requesterId) REFERENCES users(id),
    FOREIGN KEY (approvedBy) REFERENCES users(id)
);

-- ======================================================
-- 11. Bảng deletion_requests (Yêu cầu xóa)
-- ======================================================
DROP TABLE IF EXISTS deletion_requests;
CREATE TABLE deletion_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    requesterId INT NOT NULL,
    productId INT NOT NULL,
    productData JSON NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approvedBy INT,
    approvedAt DATETIME,
    rejectedReason TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requesterId) REFERENCES users(id),
    FOREIGN KEY (approvedBy) REFERENCES users(id)
);

-- ======================================================
-- 12. Bảng notifications (Thông báo)
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
-- 13. Bảng edit_history (Lịch sử chỉnh sửa)
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
-- 14. Bảng files (File đính kèm)
-- ======================================================
DROP TABLE IF EXISTS files;
CREATE TABLE files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    relatedType VARCHAR(50) NOT NULL,
    relatedId INT NOT NULL,
    fileName VARCHAR(255) NOT NULL,
    filePath VARCHAR(500) NOT NULL,
    fileSize INT NOT NULL,
    mimeType VARCHAR(100),
    uploadedBy INT NOT NULL,
    uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploadedBy) REFERENCES users(id)
);

-- ======================================================
-- 15. Bảng user_permissions (Quản lý phân quyền)
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
-- 16. CHÈN DỮ LIỆU MẪU
-- ======================================================

-- User mẫu (password plain text)
INSERT IGNORE INTO users (username, password, fullName, email, roleId, isActive) VALUES
('admin', '$2b$10$2g4cl763dUCrtM/buaa6s.VWp.k.K9EpV5EJp5DN1vhUwN0XcMXiu', 'Administrator', 'admin@lagom.com', 'admin', TRUE),
('quanly', '$2b$10$TwJSxMoVGJUd/JVs33XYYOXFkWKoG4/KGNDXKguplrU9El5i5ttve', 'Quản Lý', 'quanly@lagom.com', 'quan_ly', TRUE);

-- Sản phẩm mẫu (đã được duyệt)
INSERT IGNORE INTO inventory (stt, tenThuongMai, maHang, dvt, hangSX, phanLoai, giaNhap, giaXuat, tonKho, status, createdBy, approvedBy, approvedAt) VALUES
(1, 'Atelica IM TSH3-Ultra II', '11208706', 'Hộp', 'Siemens Healthcare', 'Máy sinh hóa miễn dịch', 2915000, 3500000, 10, 'approved', 1, 2, NOW()),
(2, 'Cobas e601 TSH', 'TSH601', 'Hộp', 'Roche Diagnostics', 'Máy miễn dịch', 3500000, 4200000, 5, 'approved', 1, 2, NOW());

-- Quyền mẫu cho Admin (user id = 1)
INSERT IGNORE INTO user_permissions (userId, canEditTenThuongMai, canEditMaHang, canEditDVT, canEditHangSX, canEditPhanLoai, canEditGiaNhap, canEditSoHopDongNhap, canEditSoHoaDonNhap, canEditSoHoaDonXuat, canEditNgayNhapHD, canEditNgayXuatHD, canEditGhiChu, canCreateReceipt, canCreateExport, canViewAll) VALUES
(1, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);

-- Thông báo mẫu cho Quản lý
INSERT IGNORE INTO notifications (userId, title, message, type, isRead) VALUES
(2, 'Chào mừng', 'Bạn đã đăng nhập với vai trò Quản lý. Vui lòng kiểm tra các yêu cầu chờ duyệt.', 'info', FALSE);

SELECT '✅ Database initialized successfully!' AS message;