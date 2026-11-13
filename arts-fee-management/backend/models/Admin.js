const pool = require("../config/db");

async function findByEmail(email) {
  const [rows] = await pool.execute(
    "SELECT id, email, password_hash AS passwordHash FROM admins WHERE email = ? AND active = 1 LIMIT 1",
    [email],
  );
  return rows[0] || null;
}

async function getDashboardSummary() {
  const [studentResult] = await pool.execute(
    "SELECT COUNT(*) AS total FROM students WHERE active = 1",
  );
  const [[payments]] = await pool.execute(
    `SELECT SUM(paymentCount) AS paymentCount,
            SUM(collected) AS collected,
            SUM(todayCollected) AS todayCollected
     FROM (
       SELECT COUNT(*) AS paymentCount,
              COALESCE(SUM(amount), 0) AS collected,
              COALESCE(SUM(CASE
                WHEN created_at >= CURRENT_DATE
                 AND created_at < DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)
                THEN amount ELSE 0
              END), 0) AS todayCollected
       FROM payments
       WHERE created_at >= STR_TO_DATE(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), '%Y-%m-%d')
         AND created_at < DATE_ADD(STR_TO_DATE(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), '%Y-%m-%d'), INTERVAL 1 MONTH)
       UNION ALL
       SELECT COUNT(*) AS paymentCount,
              COALESCE(SUM(amount), 0) AS collected,
              COALESCE(SUM(CASE
                WHEN collected_at >= CURRENT_DATE
                 AND collected_at < DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY)
                THEN amount ELSE 0
              END), 0) AS todayCollected
       FROM fee_payments
       WHERE collected_at >= STR_TO_DATE(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), '%Y-%m-%d')
         AND collected_at < DATE_ADD(STR_TO_DATE(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), '%Y-%m-%d'), INTERVAL 1 MONTH)
     ) AS monthly_totals`,
  );
  const [[outstanding]] = await pool.execute(
    `SELECT COALESCE(SUM(GREATEST(students.monthly_fee - COALESCE(monthly_payments.paid, 0), 0)), 0) AS total
     FROM students
     LEFT JOIN (
       SELECT student_id, SUM(amount) AS paid
       FROM (
         SELECT student_id, amount
         FROM payments
         WHERE fee_month = STR_TO_DATE(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), '%Y-%m-%d')
         UNION ALL
         SELECT student_id, amount
         FROM fee_payments
         WHERE collected_at >= STR_TO_DATE(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), '%Y-%m-%d')
           AND collected_at < DATE_ADD(STR_TO_DATE(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), '%Y-%m-%d'), INTERVAL 1 MONTH)
       ) AS payment_rows
       GROUP BY student_id
     ) AS monthly_payments ON monthly_payments.student_id = students.id
     WHERE students.active = 1`,
  );
  const [monthlyCollections] = await pool.execute(
    `SELECT month, SUM(total) AS total
     FROM (
       SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, SUM(amount) AS total
       FROM payments
       WHERE created_at >= DATE_SUB(STR_TO_DATE(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), '%Y-%m-%d'), INTERVAL 5 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       UNION ALL
       SELECT DATE_FORMAT(collected_at, '%Y-%m') AS month, SUM(amount) AS total
       FROM fee_payments
       WHERE collected_at >= DATE_SUB(STR_TO_DATE(DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), '%Y-%m-%d'), INTERVAL 5 MONTH)
       GROUP BY DATE_FORMAT(collected_at, '%Y-%m')
     ) AS monthly_collections
     GROUP BY month
     ORDER BY month`,
  );

  const now = new Date();
  const collections = new Map(monthlyCollections.map((row) => [row.month, Number(row.total)]));
  const collectionByMonth = Array.from({ length: 6 }, (_value, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return { month, total: collections.get(month) || 0 };
  });

  return {
    students: Number(studentResult[0].total),
    collectionThisMonth: Number(payments.collected),
    outstandingThisMonth: Number(outstanding.total),
    paymentsThisMonth: Number(payments.paymentCount || 0),
    totalStudents: Number(studentResult[0].total),
    todaysCollection: Number(payments.todayCollected),
    pendingFees: Number(outstanding.total),
    monthlyCollection: Number(payments.collected),
    collectionByMonth,
  };
}

module.exports = { findByEmail, getDashboardSummary };
