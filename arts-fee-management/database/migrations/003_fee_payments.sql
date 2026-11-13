USE arts_fee_management;

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
