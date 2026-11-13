USE arts_fee_management;

ALTER TABLE students
  ADD COLUMN student_code VARCHAR(24) NULL AFTER id,
  ADD COLUMN course VARCHAR(100) NULL AFTER name,
  ADD COLUMN mobile_number VARCHAR(30) NULL AFTER monthly_fee,
  ADD COLUMN guardian_name VARCHAR(120) NULL AFTER mobile_number,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

UPDATE students
SET student_code = CONCAT(
      'AC-',
      CASE WHEN id < 1000000 THEN LPAD(id, 6, '0') ELSE CAST(id AS CHAR) END
    ),
    course = class_name,
    mobile_number = phone,
    guardian_name = 'Not provided';

ALTER TABLE students
  MODIFY student_code VARCHAR(24) NOT NULL,
  MODIFY course VARCHAR(100) NOT NULL,
  MODIFY mobile_number VARCHAR(30) NOT NULL,
  MODIFY guardian_name VARCHAR(120) NOT NULL,
  MODIFY class_name VARCHAR(80) NULL,
  MODIFY phone VARCHAR(30) NULL,
  ADD UNIQUE KEY uq_students_student_code (student_code),
  ADD KEY idx_students_mobile_number (mobile_number);

ALTER TABLE payments
  DROP FOREIGN KEY fk_payments_admin;

ALTER TABLE payments
  ADD CONSTRAINT fk_payments_admin FOREIGN KEY (created_by) REFERENCES admins (id);
