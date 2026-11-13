CREATE DATABASE IF NOT EXISTS arts_fee_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE arts_fee_management;

CREATE TABLE IF NOT EXISTS admins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(60) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_email (email)
);

CREATE TABLE IF NOT EXISTS students (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_code VARCHAR(24) NOT NULL,
  name VARCHAR(120) NOT NULL,
  course VARCHAR(100) NOT NULL,
  monthly_fee DECIMAL(10, 2) NOT NULL,
  mobile_number VARCHAR(30) NOT NULL,
  guardian_name VARCHAR(120) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_students_student_code (student_code),
  KEY idx_students_active_name (active, name),
  KEY idx_students_mobile_number (mobile_number),
  CONSTRAINT chk_students_monthly_fee CHECK (monthly_fee >= 0 AND monthly_fee <= 1000000)
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  student_name VARCHAR(120) NOT NULL,
  fee_month DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method ENUM('Cash', 'Bank transfer', 'UPI', 'Card', 'Other') NOT NULL,
  note VARCHAR(200) NULL,
  receipt_no VARCHAR(24) NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payments_receipt_no (receipt_no),
  KEY idx_payments_fee_month (fee_month),
  KEY idx_payments_student_month (student_id, fee_month),
  KEY idx_payments_created_at (created_at),
  CONSTRAINT fk_payments_student FOREIGN KEY (student_id) REFERENCES students (id),
  CONSTRAINT fk_payments_admin FOREIGN KEY (created_by) REFERENCES admins (id),
  CONSTRAINT chk_payments_amount CHECK (amount >= 0 AND amount <= 1000000)
);

CREATE TABLE IF NOT EXISTS fee_payments (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id BIGINT UNSIGNED NOT NULL,
  student_code VARCHAR(24) NOT NULL,
  student_name VARCHAR(120) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_mode ENUM('Cash', 'UPI', 'Bank Transfer') NOT NULL,
  receipt_number VARCHAR(32) NOT NULL,
  note VARCHAR(200) NULL,
  received_by BIGINT UNSIGNED NOT NULL,
  collected_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_fee_payments_receipt_number (receipt_number),
  KEY idx_fee_payments_collected_at (collected_at),
  KEY idx_fee_payments_student_collected (student_id, collected_at),
  CONSTRAINT fk_fee_payments_student FOREIGN KEY (student_id) REFERENCES students (id),
  CONSTRAINT fk_fee_payments_admin FOREIGN KEY (received_by) REFERENCES admins (id),
  CONSTRAINT chk_fee_payments_amount CHECK (amount > 0 AND amount <= 1000000)
);
