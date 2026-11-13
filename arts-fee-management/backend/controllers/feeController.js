const FeePayment = require("../models/FeePayment");
const { createReceiptDocument } = require("../services/receiptService");

const PAYMENT_MODES = new Set(["Cash", "UPI", "Bank Transfer"]);
const HISTORY_PAGE_SIZE = 10;

function validId(value) {
  return (
    (typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value))) &&
    Number.isSafeInteger(Number(value)) &&
    Number(value) > 0
  );
}

async function searchStudents(req, res, next) {
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (search.length > 100) {
    return res.status(400).json({ error: "Search must be 100 characters or fewer." });
  }
  try {
    return res.json({ students: await FeePayment.findStudents(search) });
  } catch (error) {
    return next(error);
  }
}

async function collectFee(req, res, next) {
  const body = req.body || {};
  const errors = {};
  if (!validId(body.studentId)) errors.studentId = "Select an active student.";
  if (
    typeof body.amount !== "number" ||
    !Number.isFinite(body.amount) ||
    body.amount <= 0 ||
    body.amount > 1000000 ||
    Math.round(body.amount * 100) / 100 !== body.amount
  ) {
    errors.amount = "Enter an amount greater than INR 0 and no more than INR 1,000,000, with up to 2 decimal places.";
  }
  if (!PAYMENT_MODES.has(body.paymentMode)) {
    errors.paymentMode = "Choose Cash, UPI, or Bank Transfer.";
  }
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (body.note !== undefined && body.note !== null && typeof body.note !== "string") {
    errors.note = "Enter a text note or leave it empty.";
  } else if (note.length > 200) {
    errors.note = "The note must be 200 characters or fewer.";
  }
  if (Object.keys(errors).length) {
    return res.status(400).json({ error: "Check the payment details and try again.", fields: errors });
  }

  try {
    const payment = await FeePayment.collect({
      studentId: body.studentId,
      amount: body.amount,
      paymentMode: body.paymentMode,
      note,
      adminId: req.user.sub,
    });
    return res.status(201).json({ payment });
  } catch (error) {
    if (error.code === "STUDENT_NOT_FOUND") {
      return res.status(404).json({ error: error.message, fields: { studentId: error.message } });
    }
    return next(error);
  }
}

async function paymentHistory(req, res, next) {
  const page = req.query.page === undefined ? 1 : Number(req.query.page);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > Math.floor(Number.MAX_SAFE_INTEGER / HISTORY_PAGE_SIZE) ||
    search.length > 100
  ) {
    return res.status(400).json({ error: "Enter a valid page number and a search of at most 100 characters." });
  }
  try {
    const result = await FeePayment.findHistory({ search, page });
    const totalPages = Math.ceil(result.total / HISTORY_PAGE_SIZE);
    if (totalPages > 0 && page > totalPages) {
      return res.status(400).json({ error: "That page is no longer available. Refresh payment history." });
    }
    return res.json({
      payments: result.payments,
      pagination: { page, pageSize: result.pageSize, total: result.total, totalPages },
    });
  } catch (error) {
    return next(error);
  }
}

async function downloadReceipt(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid payment ID." });
  }
  try {
    const payment = await FeePayment.findById(id);
    if (!payment) return res.status(404).json({ error: "Payment receipt not found." });
    const document = await createReceiptDocument(payment);
    document.once("error", (error) => {
      if (res.headersSent) res.destroy(error);
      else next(error);
    });
    const safeReceiptNumber = payment.receiptNumber.replace(/[^A-Z0-9-]/gi, "");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="receipt-${safeReceiptNumber}.pdf"`);
    res.setHeader("Cache-Control", "private, no-store");
    return document.pipe(res);
  } catch (error) {
    return next(error);
  }
}

module.exports = { collectFee, downloadReceipt, paymentHistory, searchStudents };
