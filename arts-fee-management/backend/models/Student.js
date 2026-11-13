const { randomBytes } = require("node:crypto");
const pool = require("../config/db");

const studentFields = `
  id,
  student_code AS studentCode,
  name,
  course,
  monthly_fee AS monthlyFee,
  mobile_number AS mobileNumber,
  guardian_name AS guardianName,
  active,
  created_at AS createdAt,
  updated_at AS updatedAt
`;

async function findAll({ search, limit, offset }) {
  const searchTerm = `%${search}%`;
  const [rows] = await pool.execute(
    `SELECT ${studentFields}
     FROM students
     WHERE active = 1
       AND (? = '' OR name LIKE ? OR student_code LIKE ? OR course LIKE ? OR mobile_number LIKE ? OR guardian_name LIKE ?)
     ORDER BY name ASC, id ASC
     LIMIT ? OFFSET ?`,
    [search, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limit, offset],
  );
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) AS total
     FROM students
     WHERE active = 1
       AND (? = '' OR name LIKE ? OR student_code LIKE ? OR course LIKE ? OR mobile_number LIKE ? OR guardian_name LIKE ?)`,
    [search, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm],
  );

  return { students: rows, total: Number(total) };
}

async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT ${studentFields}
     FROM students
     WHERE id = ? AND active = 1
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

async function create(student) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const temporaryCode = `AC-TMP-${randomBytes(8).toString("hex").toUpperCase()}`;
    const [result] = await connection.execute(
      `INSERT INTO students (student_code, name, course, monthly_fee, mobile_number, guardian_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [temporaryCode, student.name, student.course, student.monthlyFee, student.mobileNumber, student.guardianName],
    );
    const studentCode = `AC-${String(result.insertId).padStart(6, "0")}`;
    await connection.execute(
      "UPDATE students SET student_code = ? WHERE id = ?",
      [studentCode, result.insertId],
    );
    await connection.commit();
    return {
      id: result.insertId,
      studentCode,
      ...student,
      active: 1,
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

async function update(id, student) {
  const [result] = await pool.execute(
    `UPDATE students
     SET name = ?, course = ?, monthly_fee = ?, mobile_number = ?, guardian_name = ?
     WHERE id = ? AND active = 1`,
    [student.name, student.course, student.monthlyFee, student.mobileNumber, student.guardianName, id],
  );
  return result.affectedRows > 0 || Boolean(await findById(id));
}

async function deactivate(id) {
  const [result] = await pool.execute(
    "UPDATE students SET active = 0 WHERE id = ? AND active = 1",
    [id],
  );
  return result.affectedRows > 0;
}

module.exports = { create, deactivate, findAll, findById, update };
