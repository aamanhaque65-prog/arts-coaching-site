const Reports = require("../models/Reports");
const { createExcelReport, createPdfReport } = require("../services/reportExportService");

function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function getFilters(query) {
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const from = query.from === undefined ? `${currentMonth}-01` : query.from;
  const to = query.to === undefined ? today : query.to;
  const month = query.month === undefined ? currentMonth : query.month;
  const studentId = query.studentId === undefined || query.studentId === "" ? null : Number(query.studentId);

  if (!isDate(from) || !isDate(to) || from > to) {
    return { error: "Choose a valid date range with the start on or before the end." };
  }
  if (new Date(`${to}T00:00:00.000Z`) - new Date(`${from}T00:00:00.000Z`) >= 366 * 86400000) {
    return { error: "Daily and student-ledger date ranges are limited to 366 days." };
  }
  if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return { error: "Choose a valid reporting month." };
  }
  if (studentId !== null && (!Number.isSafeInteger(studentId) || studentId < 1)) {
    return { error: "Choose a valid student." };
  }
  return { filters: { from, to, month, studentId } };
}

async function searchStudents(req, res, next) {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (search.length > 100) return res.status(400).json({ error: "Search must be 100 characters or fewer." });
  try {
    return res.json({ students: await Reports.findActiveStudents(search) });
  } catch (error) {
    return next(error);
  }
}

async function getReport(req, res, next) {
  const result = getFilters(req.query);
  if (result.error) return res.status(400).json({ error: result.error });
  try {
    const report = await Reports.getReportData(result.filters);
    if (result.filters.studentId && !report.ledger) {
      return res.status(404).json({ error: "Student not found." });
    }
    return res.json({ report });
  } catch (error) {
    return next(error);
  }
}

async function exportReport(req, res, next) {
  const result = getFilters(req.query);
  if (result.error) return res.status(400).json({ error: result.error });
  const format = req.query.format;
  if (!["pdf", "xlsx"].includes(format)) {
    return res.status(400).json({ error: "Choose PDF or Excel export format." });
  }
  try {
    const report = await Reports.getReportData(result.filters);
    if (result.filters.studentId && !report.ledger) {
      return res.status(404).json({ error: "Student not found." });
    }
    const fileDate = result.filters.from === result.filters.to
      ? result.filters.from
      : `${result.filters.from}-to-${result.filters.to}`;
    const filename = `arts-coaching-report-${fileDate}`;
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.${format}"`);
    if (format === "pdf") {
      res.setHeader("Content-Type", "application/pdf");
      const document = createPdfReport(report);
      document.once("error", (error) => {
        if (res.headersSent) res.destroy(error);
        else next(error);
      });
      return document.pipe(res);
    }
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const workbook = createExcelReport(report);
    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    if (res.headersSent) return res.destroy(error);
    return next(error);
  }
}

module.exports = { exportReport, getReport, searchStudents };
