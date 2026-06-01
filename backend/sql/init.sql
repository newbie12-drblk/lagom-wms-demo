USE defaultdb;

-- 1. Bảng users
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    fullName VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    roleId ENUM('admin', 'ke_toan', 'quan_ly_kho', 'quan_ly', 'nhan_vien', 'nhap_lieu') NOT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    customPermissions JSON,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    lastLoginAt DATETIME,
    INDEX idx_role (roleId),
    INDEX idx_active (isActive)
);

-- 2. Bảng inventory
CREATE TABLE IF NOT EXISTS inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    stt INT,
    tenThuongMai VARCHAR(200) NOT NULL,
    maHang VARCHAR(50) UNIQUE NOT NULL,
    quyCach VARCHAR(100),
    hangSX VARCHAR(200),
    dvt VARCHAR(20),
    phanLoai VARCHAR(100),
    giaNhap DECIMAL(15,0) DEFAULT 0,
    giaXuat DECIMAL(15,0) DEFAULT 0,
    tonKho INT DEFAULT 0,
    soLuongNhap INT DEFAULT 0,
    soLuongXuat INT DEFAULT 0,
    soLot VARCHAR(50),
    ngayHetHan DATE,
    soHopDongNhap VARCHAR(50),
    soHoaDonNhap VARCHAR(50),
    soHopDongXuat VARCHAR(50),
    soHoaDonXuat VARCHAR(50),
    ngayNhapHD DATE,
    ngayXuatHD DATE,
    ghiChu TEXT,
    createdBy INT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES users(id),
    INDEX idx_maHang (maHang),
    INDEX idx_phanLoai (phanLoai),
    INDEX idx_ngayHetHan (ngayHetHan)
);

-- 3. Bảng receipts
CREATE TABLE IF NOT EXISTS receipts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    receiptNo VARCHAR(50) UNIQUE NOT NULL,
    receiptDate DATE,
    supplierName VARCHAR(200),
    supplierAddress VARCHAR(300),
    supplierTax VARCHAR(50),
    customerTax VARCHAR(50),
    total DECIMAL(15,0) DEFAULT 0,
    notes TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    createdBy INT,
    approvedBy INT,
    approvedAt DATETIME,
    rejectedReason TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES users(id),
    FOREIGN KEY (approvedBy) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_receiptNo (receiptNo)
);

-- 4. Bảng receipt_items
CREATE TABLE IF NOT EXISTS receipt_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    receiptId INT NOT NULL,
    tenThuongMai VARCHAR(200),
    maHang VARCHAR(50),
    quyCach VARCHAR(100),
    hangSX VARCHAR(200),
    dvt VARCHAR(20),
    phanLoai VARCHAR(100),
    giaNhap DECIMAL(15,0),
    soLuongNhap INT,
    thanhTien DECIMAL(15,0),
    FOREIGN KEY (receiptId) REFERENCES receipts(id) ON DELETE CASCADE,
    INDEX idx_receiptId (receiptId)
);

-- 5. Bảng exports
CREATE TABLE IF NOT EXISTS exports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exportNo VARCHAR(50) UNIQUE NOT NULL,
    exportDate DATE,
    receiverName VARCHAR(200),
    customerTax VARCHAR(50),
    exportReason VARCHAR(100),
    total DECIMAL(15,0) DEFAULT 0,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    createdBy INT,
    approvedBy INT,
    approvedAt DATETIME,
    rejectedReason TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdBy) REFERENCES users(id),
    FOREIGN KEY (approvedBy) REFERENCES users(id),
    INDEX idx_status (status),
    INDEX idx_exportNo (exportNo)
);

-- 6. Bảng export_items
CREATE TABLE IF NOT EXISTS export_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    exportId INT NOT NULL,
    tenThuongMai VARCHAR(200),
    maHang VARCHAR(50),
    quyCach VARCHAR(100),
    hangSX VARCHAR(200),
    dvt VARCHAR(20),
    phanLoai VARCHAR(100),
    donGia DECIMAL(15,0),
    soLuong INT,
    thanhTien DECIMAL(15,0),
    soLot VARCHAR(50),
    ngayHetHan DATE,
    ghiChu TEXT,
    FOREIGN KEY (exportId) REFERENCES exports(id) ON DELETE CASCADE,
    INDEX idx_exportId (exportId)
);

-- 7. Bảng files (lưu scan)
CREATE TABLE IF NOT EXISTS files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    relatedType ENUM('receipt', 'export', 'contract', 'request') NOT NULL,
    relatedId INT NOT NULL,
    fileName VARCHAR(255) NOT NULL,
    filePath VARCHAR(500) NOT NULL,
    fileSize INT,
    mimeType VARCHAR(100),
    uploadedBy INT,
    uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploadedBy) REFERENCES users(id),
    INDEX idx_related (relatedType, relatedId)
);

-- 8. Bảng approval_requests (yêu cầu thêm sản phẩm từ Nhập liệu)
CREATE TABLE IF NOT EXISTS approval_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    requesterId INT NOT NULL,
    productData JSON NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approvedBy INT,
    approvedAt DATETIME,
    rejectedReason TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requesterId) REFERENCES users(id),
    FOREIGN KEY (approvedBy) REFERENCES users(id),
    INDEX idx_status (status)
);

-- 9. Bảng edit_history (lịch sử chỉnh sửa)
CREATE TABLE IF NOT EXISTS edit_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    tableName VARCHAR(50) NOT NULL,
    recordId INT NOT NULL,
    action VARCHAR(50) NOT NULL DEFAULT 'UPDATE',
    fieldName VARCHAR(100),
    oldValue TEXT,
    newValue TEXT,
    editedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    INDEX idx_record (tableName, recordId),
    INDEX idx_user (userId),
    INDEX idx_editedAt (editedAt)
);

-- 10. Bảng notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT,
    type ENUM('approval', 'info', 'warning', 'success') DEFAULT 'info',
    isRead BOOLEAN DEFAULT FALSE,
    relatedId INT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id),
    INDEX idx_user_read (userId, isRead),
    INDEX idx_createdAt (createdAt)
);

-- 11. Bảng deletion_requests (yêu cầu xóa sản phẩm từ Nhập liệu)
CREATE TABLE IF NOT EXISTS deletion_requests (
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
    FOREIGN KEY (approvedBy) REFERENCES users(id),
    FOREIGN KEY (productId) REFERENCES inventory(id),
    INDEX idx_status (status),
    INDEX idx_productId (productId)
);

-- 12. Bảng edit_requests (yêu cầu chỉnh sửa sản phẩm từ Nhập liệu)
CREATE TABLE IF NOT EXISTS edit_requests (
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
    FOREIGN KEY (approvedBy) REFERENCES users(id),
    FOREIGN KEY (productId) REFERENCES inventory(id),
    INDEX idx_status (status),
    INDEX idx_productId (productId)
);

-- Chèn dữ liệu mẫu (users) - chỉ chèn nếu chưa có
INSERT IGNORE INTO users (username, password, fullName, email, roleId, isActive) VALUES
('admin', 'admin123_hash', 'Administrator', 'admin@lagom.com', 'admin', TRUE),
('ketoan', 'ketoan123_hash', 'Nguyễn Thị Kế Toán', 'ketoan@lagom.com', 'ke_toan', TRUE),
('quanlykho', 'kho123_hash', 'Trần Văn Quản Lý Kho', 'quanlykho@lagom.com', 'quan_ly_kho', TRUE),
('quanly', 'quanly123_hash', 'Lê Thị Quản Lý', 'quanly@lagom.com', 'quan_ly', TRUE),
('nhanvien', 'nv123_hash', 'Phạm Văn Nhân Viên', 'nhanvien@lagom.com', 'nhan_vien', TRUE),
('nhaplieu', 'nl123_hash', 'Nguyễn Văn Nhập Liệu', 'nhaplieu@lagom.com', 'nhap_lieu', TRUE);

-- Chèn 1 sản phẩm mẫu vào inventory
INSERT IGNORE INTO inventory (stt, tenThuongMai, maHang, quyCach, hangSX, dvt, phanLoai, giaNhap, giaXuat, tonKho, soLuongNhap, soLuongXuat, soLot, ngayHetHan) VALUES
(1, 'Atelica IM TSH3-Ultra II (TSH3ULII)', '11208706', '130 Tests', 'Siemens Healthcare Diagnostics Inc. - Tarrytown USA/Hoa Kỳ', 'Hộp/Test', 'Máy sinh hóa miễn dịch Atellica- hãng Siemens', 2915000, 0, 0, 0, 0, 'LOT001', '2026-12-31');