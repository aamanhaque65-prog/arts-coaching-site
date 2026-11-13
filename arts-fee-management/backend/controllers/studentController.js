const Student = require("../models/Student");

const PAGE_SIZE = 10;

function isValidId(value) {
  return /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0;
}

function validateStudent(body = {}) {
  const input = body && typeof body === "object" && !Array.isArray(body) ? body : {};
  const student = {
    name: typeof input.name === "string" ? input.name.trim() : "",
    course: typeof input.course === "string" ? input.course.trim() : "",
    mobileNumber: typeof input.mobileNumber === "string" ? input.mobileNumber.trim() : "",
    guardianName: typeof input.guardianName === "string" ? input.guardianName.trim() : "",
    monthlyFee: input.monthlyFee,
  };
  const errors = {};

  if (!student.name || student.name.length > 120) {
    errors.name = "Enter a student name using no more than 120 characters.";
  }
  if (!student.course || student.course.length > 100) {
    errors.course = "Enter a course using no more than 100 characters.";
  }
  if (
    typeof student.monthlyFee !== "number" ||
    !Number.isFinite(student.monthlyFee) ||
    student.monthlyFee < 0 ||
    student.monthlyFee > 1000000 ||
    Number(student.monthlyFee.toFixed(2)) !== student.monthlyFee
  ) {
    errors.monthlyFee = "Enter a monthly fee from INR 0 to INR 1,000,000 with up to 2 decimal places.";
  }
  if (
    !student.mobileNumber ||
    student.mobileNumber.length > 30 ||
    !/^[+()\d\s.-]{7,30}$/.test(student.mobileNumber) ||
    student.mobileNumber.replace(/\D/g, "").length < 7
  ) {
    errors.mobileNumber = "Enter a valid mobile number with at least 7 digits and no more than 30 characters.";
  }
  if (!student.guardianName || student.guardianName.length > 120) {
    errors.guardianName = "Enter a guardian name using no more than 120 characters.";
  }

  return { student, errors };
}

async function listStudents(req, res, next) {
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (!Number.isSafeInteger(page) || page < 1 || page > Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE) || search.length > 100) {
    return res.status(400).json({ error: "Enter a valid page number and a search of at most 100 characters." });
  }

  try {
    const result = await Student.findAll({
      search,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    });
    const pages = Math.ceil(result.total / PAGE_SIZE);
    if (pages > 0 && page > pages) {
      return res.status(400).json({ error: "That page is no longer available. Refresh the student list." });
    }
    return res.json({
      students: result.students,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total: result.total,
        totalPages: pages,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getStudent(req, res, next) {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid student ID." });
  try {
    const student = await Student.findById(Number(req.params.id));
    if (!student) return res.status(404).json({ error: "Student not found." });
    return res.json({ student });
  } catch (error) {
    return next(error);
  }
}

async function createStudent(req, res, next) {
  const { student, errors } = validateStudent(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ error: "Check the student details and try again.", fields: errors });
  }
  try {
    return res.status(201).json({ student: await Student.create(student) });
  } catch (error) {
    return next(error);
  }
}

async function updateStudent(req, res, next) {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid student ID." });
  const { student, errors } = validateStudent(req.body);
  if (Object.keys(errors).length) {
    return res.status(400).json({ error: "Check the student details and try again.", fields: errors });
  }
  try {
    const updated = await Student.update(Number(req.params.id), student);
    if (!updated) return res.status(404).json({ error: "Student not found." });
    return res.json({ student: { id: Number(req.params.id), ...student, active: 1 } });
  } catch (error) {
    return next(error);
  }
}

async function deleteStudent(req, res, next) {
  if (!isValidId(req.params.id)) return res.status(400).json({ error: "Invalid student ID." });
  try {
    const deleted = await Student.deactivate(Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: "Student not found." });
    return res.status(204).end();
  } catch (error) {
    return next(error);
  }
}

module.exports = { createStudent, deleteStudent, getStudent, listStudents, updateStudent };
