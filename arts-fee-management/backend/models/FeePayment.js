const { randomBytes } = require("node:crypto");
const pool = require("../config/db");

const historyPageSize = 10;

function createReceiptNumber() {
  const date = new Date();
  const datePart = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");
  return `ACF-${datePart}-${randomBytes(8).toString("hex").toUpperCase()}`;
}

async function findStudents(search) {
  const term = `%${search}%`;
  const [rows] = await pool.execute(
    `SELECT id, student_code AS studentCode, name, course, monthly_fee AS monthlyFee
     FROM students
     WHERE active = 1
       AND (? = '' OR name LIKE ? OR student_code LIKE ? OR course LIKE ? OR mobile_number LIKE ?)
     ORDER BY name ASC, id ASC
     LIMIT 20`,
    [search, term, term, term, term],
  );
  return rows;
}

async function collect({ studentId, amount, paymentMode, note, adminId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [students] = await connection.execute(
      `SELECT id, student_code AS studentCode, name
       FROM students
       WHERE id = ? AND active = 1
       FOR UPDATE`,
      [studentId],
    );
    if (!students.length) {
      const error = new Error("Student not found or no longer active.");
      error.code = "STUDENT_NOT_FOUND";
      throw error;
    }

    let result;
    let receiptNumber;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      receiptNumber = createReceiptNumber();
      try {
        [result] = await connection.execute(
          `INSERT INTO fee_payments
            (student_id, student_code, student_name, amount, payment_mode, receipt_number, note, received_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            students[0].id,
            students[0].studentCode,
            students[0].name,
            amount,
            paymentMode,
            receiptNumber,
            note || null,
            adminId,
          ],
        );
        break;
      } catch (error) {
        if (error.code !== "ER_DUP_ENTRY" || attempt === 4) throw error;
      }
    }

    const [[savedPayment]] = await connection.execute(
      "SELECT collected_at AS collectedAt FROM fee_payments WHERE id = ?",
      [result.insertId],
    );
    await connection.commit();
    return {
      id: result.insertId,
      studentId: students[0].id,
      studentCode: students[0].studentCode,
      studentName: students[0].name,
      amount,
      paymentMode,
      receiptNumber,
      note: note || null,
      collectedAt: savedPayment.collectedAt,
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      error.rollbackError = rollbackError;
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function findHistory({ search, page }) {
  const term = `%${search}%`;
  const offset = (page - 1) * historyPageSize;
  const [rows] = await pool.execute(
    `SELECT fp.id, fp.student_id AS studentId, fp.student_code AS studentCode,
            fp.student_name AS studentName, fp.amount,
            fp.payment_mode AS paymentMode, fp.receipt_number AS receiptNumber,
            fp.note, fp.collected_at AS collectedAt, a.email AS receivedBy
     FROM fee_payments fp
     JOIN admins a ON a.id = fp.received_by
     WHERE (? = '' OR fp.student_name LIKE ? OR fp.student_code LIKE ? OR fp.receipt_number LIKE ?)
     ORDER BY fp.collected_at DESC, fp.id DESC
     LIMIT ? OFFSET ?`,
    [search, term, term, term, historyPageSize, offset],
  );
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM fee_payments
     WHERE (? = '' OR student_name LIKE ? OR student_code LIKE ? OR receipt_number LIKE ?)`,
    [search, term, term, term],
  );
  return { payments: rows, total: Number(total), pageSize: historyPageSize };
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT id, student_id AS studentId, student_code AS studentCode,
            student_name AS studentName, amount,
            payment_mode AS paymentMode, receipt_number AS receiptNumber,
            note, collected_at AS collectedAt
     FROM fee_payments
     WHERE id = ?
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

module.exports = { collect, findById, findHistory, findStudents };
