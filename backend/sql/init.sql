-- ======================================================
-- DATABASE: LAGOM WMS - Phiên bản 3.1
-- Ngày: 2026
-- Mô tả: 
--   - Sửa invoice_requests: inventory-based (khớp model)
--   - Inventory giữ nguyên dòng khi xuất hết (tonKho = 0)
-- ======================================================

CREATE DATABASE IF NOT EXISTS defaultdb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE defaultdb;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS edit_history;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS deletion_requests;
DROP TABLE IF EXISTS edit_requests;
DROP TABLE IF EXISTS invoice_requests;
DROP TABLE IF EXISTS export_items;
DROP TABLE IF EXISTS exports;
DROP TABLE IF EXISTS receipt_items;
DROP TABLE IF EXISTS receipts;
DROP TABLE IF EXISTS export_requests;
DROP TABLE IF EXISTS receipt_requests;
DROP TABLE IF EXISTS approval_requests;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS user_permissions;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ======================================================
-- 1. Bảng users
-- ======================================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 2. Bảng user_permissions
-- ======================================================
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
    canDeleteProduct BOOLEAN DEFAULT FALSE,
    canEditProduct BOOLEAN DEFAULT FALSE,
    canAddProduct BOOLEAN DEFAULT FALSE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 3. Bảng inventory (Tồn kho)
-- Mỗi lần nhập = 1 dòng. Khi xuất hết, KHÔNG xóa dòng,
-- chỉ cập nhật tonKho = 0.
-- ======================================================
CREATE TABLE inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    stt INT,
    tenThuongMai VARCHAR(200) NOT NULL,
    maHang VARCHAR(50) NOT NULL,
    quyCach VARCHAR(100),
    quyCachDongGoi VARCHAR(200),
    hangSX VARCHAR(200),
    dvt VARCHAR(20),
    phanLoai VARCHAR(100),
    giaNhap DECIMAL(15,0) DEFAULT 0,
    giaXuat DECIMAL(15,0) DEFAULT 0,
    soHopDongNhap VARCHAR(50),
    soHoaDonNhap VARCHAR(50),
    soHoaDonXuat VARCHAR(50),
    ngayNhapHD DATE,
    ngayXuatHD DATE,
    ghiChu TEXT,
    soLuongNhap INT DEFAULT 0,
    soLuongXuat INT DEFAULT 0,
    tonKho INT DEFAULT 0,
    soLot VARCHAR(50),
    ngayHetHan DATE,
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
    INDEX idx_status (status),
    INDEX idx_lot (maHang, soLot, ngayXuatHD)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 4. Bảng approval_requests (Yêu cầu thêm SP mới)
-- ======================================================
CREATE TABLE approval_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    requesterId INT NOT NULL,
    productData JSON NOT NULL,
    soHoaDonNhap VARCHAR(50) DEFAULT '',
    ngayNhapHD DATE DEFAULT NULL,
    soHoaDonXuat VARCHAR(50) DEFAULT '',
    ngayXuatHD DATE DEFAULT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approvedBy INT,
    approvedAt DATETIME,
    rejectedReason TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requesterId) REFERENCES users(id),
    FOREIGN KEY (approvedBy) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 5. Bảng receipt_requests (Đề nghị nhập hàng)
-- ======================================================
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
    soLuongNhap INT DEFAULT 0,
    soLot VARCHAR(50),
    ngayHetHan DATE,
    quyCachDongGoi VARCHAR(200),
    soHoaDonNhap VARCHAR(50) DEFAULT NULL,
    soHoaDonXuat VARCHAR(50) DEFAULT NULL,
    ngayNhapHD DATE DEFAULT NULL,
    ngayXuatHD DATE DEFAULT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 6. Bảng export_requests (Đề nghị xuất kho)
-- ======================================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 7. Bảng receipts (Phiếu nhập hàng)
-- ======================================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 8. Bảng receipt_items (Chi tiết phiếu nhập)
-- ======================================================
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
    FOREIGN KEY (receiptId) REFERENCES receipts(id) ON DELETE CASCADE,
    INDEX idx_receipt (receiptId),
    INDEX idx_maHang (maHang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 9. Bảng exports (Phiếu xuất kho)
-- ======================================================
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
    hasInvoice BOOLEAN DEFAULT FALSE,
    rejectedReason TEXT,
    createdBy INT NOT NULL,
    approvedBy INT,
    approvedAt DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES users(id),
    FOREIGN KEY (approvedBy) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 10. Bảng export_items (Chi tiết phiếu xuất)
-- ======================================================
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
    ngayXuatHD DATE,
    ghiChu TEXT,
    FOREIGN KEY (exportId) REFERENCES exports(id) ON DELETE CASCADE,
    INDEX idx_export (exportId),
    INDEX idx_maHang (maHang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 11. Bảng invoice_requests (INVENTORY-BASED)
-- Mỗi yêu cầu HĐ gắn với 1 dòng inventory
-- ======================================================
CREATE TABLE invoice_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    soHoaDonCode VARCHAR(50) UNIQUE NOT NULL,
    inventoryId INT NOT NULL,
    maHang VARCHAR(50) NOT NULL,
    soHopDongNhap VARCHAR(50) DEFAULT '',
    soLot VARCHAR(50) DEFAULT '',
    tenThuongMai VARCHAR(200) DEFAULT '',
    soHoaDonNhap VARCHAR(50) DEFAULT '',
    ngayNhapHD DATE DEFAULT NULL,
    soHoaDonXuat VARCHAR(50) DEFAULT '',
    ngayXuatHD DATE DEFAULT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    createdBy INT,
    approvedBy INT,
    approvedAt DATETIME,
    rejectedReason TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inventoryId) REFERENCES inventory(id) ON DELETE CASCADE,
    FOREIGN KEY (createdBy) REFERENCES users(id),
    FOREIGN KEY (approvedBy) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_inventory (inventoryId),
    INDEX idx_maHang (maHang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 12. Bảng edit_requests (Yêu cầu chỉnh sửa)
-- ======================================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 13. Bảng deletion_requests (Yêu cầu xóa)
-- ======================================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 14. Bảng notifications (Thông báo)
-- ======================================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 15. Bảng edit_history (Lịch sử chỉnh sửa)
-- ======================================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 16. Bảng files (File đính kèm)
-- ======================================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ======================================================
-- 17. DỮ LIỆU MẪU
-- ======================================================

-- User mẫu
-- password admin: admin123
-- password quanly: quanly123
INSERT INTO users (username, password, fullName, email, roleId, isActive) VALUES
('admin', '$2b$10$2g4cl763dUCrtM/buaa6s.VWp.k.K9EpV5EJp5DN1vhUwN0XcMXiu', 'Administrator', 'admin@lagom.com', 'admin', TRUE),
('quanly', '$2b$10$TwJSxMoVGJUd/JVs33XYYOXFkWKoG4/KGNDXKguplrU9El5i5ttve', 'Quản Lý', 'quanly@lagom.com', 'quan_ly', TRUE);

-- Sản phẩm mẫu
INSERT INTO inventory (stt, tenThuongMai, maHang, quyCach, quyCachDongGoi, dvt, hangSX, phanLoai, giaNhap, giaXuat, soLuongNhap, tonKho, soLot, ngayHetHan, soHoaDonNhap, ngayNhapHD, status, createdBy, approvedBy, approvedAt) VALUES
(1, 'Atelica IM TSH3-Ultra II', '11208706', 'Hộp 100 test', 'Hộp 2x50 test', 'Hộp', 'Siemens Healthcare', 'Máy sinh hóa miễn dịch', 2915000, 3500000, 10, 10, 'LOT001', '2027-12-31', 'HD001/2026', '2026-01-15', 'approved', 1, 2, NOW()),
(2, 'Cobas e601 TSH', 'TSH601', 'Hộp 100 test', 'Hộp 4x25 test', 'Hộp', 'Roche Diagnostics', 'Máy miễn dịch', 3500000, 4200000, 5, 5, 'LOT002', '2027-06-30', 'HD002/2026', '2026-01-20', 'approved', 1, 2, NOW());

-- Quyền cho Admin
INSERT INTO user_permissions (userId, canEditTenThuongMai, canEditMaHang, canEditDVT, canEditHangSX, canEditPhanLoai, canEditGiaNhap, canEditSoHopDongNhap, canEditSoHoaDonNhap, canEditSoHoaDonXuat, canEditNgayNhapHD, canEditNgayXuatHD, canEditGhiChu, canCreateReceipt, canCreateExport, canViewAll, canDeleteProduct, canEditProduct, canAddProduct) VALUES
(1, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
(2, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);

-- Thông báo mẫu
INSERT INTO notifications (userId, title, message, type, isRead) VALUES
(2, 'Chào mừng', 'Bạn đã đăng nhập với vai trò Quản lý. Vui lòng kiểm tra các yêu cầu chờ duyệt.', 'info', FALSE);

SELECT '✅ Database LAGOM WMS v3.1 initialized successfully!' AS message;