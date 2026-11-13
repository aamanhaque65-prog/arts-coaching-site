const pool = require("../config/db");

const paymentRows = `(
  SELECT p.student_id AS studentId, p.student_code AS studentCode,
         p.student_name AS studentName, p.amount,
         CASE
           WHEN p.payment_method = 'Bank transfer' THEN 'Bank Transfer'
           WHEN p.payment_method IN ('Cash', 'UPI') THEN p.payment_method
           ELSE 'Other'
         END AS paymentMode,
         p.receipt_no AS receiptNumber, DATE(p.created_at) AS paymentDate,
         p.fee_month AS paymentPeriod,
         p.created_at AS collectedAt, p.note
  FROM payments p
  UNION ALL
  SELECT fp.student_id AS studentId, fp.student_code AS studentCode,
         fp.student_name AS studentName, fp.amount,
         fp.payment_mode AS paymentMode,
         fp.receipt_number AS receiptNumber, DATE(fp.collected_at) AS paymentDate,
         DATE(fp.collected_at) AS paymentPeriod,
         fp.collected_at AS collectedAt, fp.note
  FROM fee_payments fp
)`;

async function getReportData({ from, to, month, studentId }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [dailyCollections] = await connection.execute(
      `SELECT paymentDate AS date, SUM(amount) AS total, COUNT(*) AS paymentCount
       FROM ${paymentRows} AS report_payments
       WHERE paymentDate >= ? AND paymentDate < DATE_ADD(?, INTERVAL 1 DAY)
       GROUP BY paymentDate
       ORDER BY paymentDate`,
      [from, to],
    );
    const [monthlyRows] = await connection.execute(
      `SELECT DATE_FORMAT(paymentDate, '%Y-%m') AS month, SUM(amount) AS total, COUNT(*) AS paymentCount
       FROM ${paymentRows} AS report_payments
       WHERE paymentDate >= DATE_SUB(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'), INTERVAL 11 MONTH)
         AND paymentDate < DATE_ADD(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'), INTERVAL 1 MONTH)
       GROUP BY DATE_FORMAT(paymentDate, '%Y-%m')
       ORDER BY month`,
      [month, month],
    );
    const monthlyTotals = new Map(monthlyRows.map((row) => [row.month, row]));
    const [year, selectedMonth] = month.split("-").map(Number);
    const monthlyCollections = Array.from({ length: 12 }, (_value, index) => {
      const date = new Date(Date.UTC(year, selectedMonth - 12 + index, 1));
      const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      const row = monthlyTotals.get(monthKey);
      return {
        month: monthKey,
        total: row ? Number(row.total) : 0,
        paymentCount: row ? Number(row.paymentCount) : 0,
      };
    });
    const [paymentModes] = await connection.execute(
      `SELECT paymentMode, SUM(amount) AS total, COUNT(*) AS paymentCount
       FROM ${paymentRows} AS report_payments
       WHERE paymentDate >= ? AND paymentDate < DATE_ADD(?, INTERVAL 1 DAY)
       GROUP BY paymentMode
       ORDER BY total DESC, paymentMode`,
      [from, to],
    );

    let ledger = null;
    if (studentId) {
      const [studentRows] = await connection.execute(
        `SELECT id, student_code AS studentCode, name, course, monthly_fee AS monthlyFee
         FROM students
         WHERE id = ?
         LIMIT 1`,
        [studentId],
      );
      if (studentRows.length) {
        const [payments] = await connection.execute(
          `SELECT studentId, studentCode, studentName, amount, paymentMode,
                  receiptNumber, paymentDate AS date, collectedAt, note
           FROM ${paymentRows} AS report_payments
           WHERE studentId = ? AND paymentDate >= ? AND paymentDate < DATE_ADD(?, INTERVAL 1 DAY)
           ORDER BY paymentDate DESC, collectedAt DESC`,
          [studentId, from, to],
        );
        ledger = { student: studentRows[0], payments };
      }
    }

    const [pendingFees] = await connection.execute(
      `SELECT s.id AS studentId, s.student_code AS studentCode, s.name AS studentName,
              s.course, s.monthly_fee AS monthlyFee,
              COALESCE(SUM(report_payments.amount), 0) AS paid,
              GREATEST(s.monthly_fee - COALESCE(SUM(report_payments.amount), 0), 0) AS pending
       FROM students s
       LEFT JOIN ${paymentRows} AS report_payments
         ON report_payments.studentId = s.id
        AND report_payments.paymentPeriod >= STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d')
        AND report_payments.paymentPeriod < DATE_ADD(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'), INTERVAL 1 MONTH)
       WHERE s.active = 1
       GROUP BY s.id, s.student_code, s.name, s.course, s.monthly_fee
       HAVING pending > 0
       ORDER BY pending DESC, s.name ASC`,
      [month, month],
    );

    const report = {
      filters: { from, to, month, studentId },
      dailyCollections,
      monthlyCollections,
      paymentModes,
      ledger,
      pendingFees,
      pendingTotal: pendingFees.reduce(
        (sum, student) => sum + Math.round(Number(student.pending) * 100),
        0,
      ) / 100,
    };
    await connection.commit();
    return report;
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

async function findActiveStudents(search) {
  const term = `%${search}%`;
  const [students] = await pool.execute(
    `SELECT id, student_code AS studentCode, name, course
     FROM students
     WHERE active = 1 AND (? = '' OR name LIKE ? OR student_code LIKE ? OR course LIKE ?)
     ORDER BY name ASC, id ASC
     LIMIT 50`,
    [search, term, term, term],
  );
  return students;
}

module.exports = { findActiveStudents, getReportData };
