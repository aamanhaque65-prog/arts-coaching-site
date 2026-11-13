const ExcelJS = require("exceljs");
const PDFDocument = require("pdfkit");

function createExcelReport(report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ART'S Coaching";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Summary");
  summary.addRows([
    ["ART'S Coaching Fee Reports"],
    ["Daily and ledger range", `${report.filters.from} to ${report.filters.to}`],
    ["Pending-fee month", report.filters.month],
    ["Daily payments total", report.dailyCollections.reduce((sum, row) => sum + Number(row.total), 0)],
    ["Pending fees total", report.pendingTotal],
  ]);
  summary.getRow(1).font = { bold: true, size: 15, color: { argb: "FF002B6B" } };
  summary.columns = [{ width: 30 }, { width: 34 }];

  const daily = workbook.addWorksheet("Daily Collection");
  daily.columns = [
    { header: "Date", key: "date", width: 16 },
    { header: "Payment count", key: "paymentCount", width: 18 },
    { header: "Collected (INR)", key: "total", width: 20 },
  ];
  daily.addRows(report.dailyCollections);

  const monthly = workbook.addWorksheet("Monthly Collection");
  monthly.columns = [
    { header: "Month", key: "month", width: 16 },
    { header: "Payment count", key: "paymentCount", width: 18 },
    { header: "Collected (INR)", key: "total", width: 20 },
  ];
  monthly.addRows(report.monthlyCollections);

  const modes = workbook.addWorksheet("Payment Modes");
  modes.columns = [
    { header: "Payment mode", key: "paymentMode", width: 22 },
    { header: "Payment count", key: "paymentCount", width: 18 },
    { header: "Collected (INR)", key: "total", width: 20 },
  ];
  modes.addRows(report.paymentModes);

  const pending = workbook.addWorksheet("Pending Fees");
  pending.columns = [
    { header: "Student code", key: "studentCode", width: 18 },
    { header: "Student", key: "studentName", width: 28 },
    { header: "Course", key: "course", width: 24 },
    { header: "Monthly fee (INR)", key: "monthlyFee", width: 20 },
    { header: "Paid this month (INR)", key: "paid", width: 24 },
    { header: "Pending (INR)", key: "pending", width: 18 },
  ];
  pending.addRows(report.pendingFees);

  if (report.ledger) {
    const ledger = workbook.addWorksheet("Student Ledger");
    ledger.addRows([
      ["Student", report.ledger.student.name],
      ["Student code", report.ledger.student.studentCode],
      ["Course", report.ledger.student.course],
      ["Date", "Receipt", "Mode", "Amount (INR)", "Note"],
    ]);
    ledger.getRow(4).font = { bold: true };
    ledger.addRows(report.ledger.payments.map((payment) => [
      payment.date, payment.receiptNumber || "Legacy payment", payment.paymentMode, Number(payment.amount), payment.note || "",
    ]));
    ledger.columns = [{ width: 24 }, { width: 30 }, { width: 20 }, { width: 20 }, { width: 36 }];
  }

  for (const sheet of workbook.worksheets) {
    if (["Daily Collection", "Monthly Collection", "Payment Modes", "Pending Fees"].includes(sheet.name)) {
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF002B6B" } };
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.autoFilter = { from: "A1", to: `${String.fromCharCode(64 + sheet.columnCount)}1` };
    }
  }
  return workbook;
}

function createPdfReport(report) {
  const document = new PDFDocument({ size: "A4", margin: 42, bufferPages: true, info: { Title: "ART'S Coaching Fee Reports", Author: "ART'S Coaching" } });
  const navy = "#002B6B";
  const gold = "#D4AF37";
  const formatMoney = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value) || 0);

  function heading(title, subtitle) {
    document.fillColor(navy).font("Helvetica-Bold").fontSize(18).text("ART'S Coaching");
    document.fillColor(gold).font("Helvetica-Bold").fontSize(12).text(title, { continued: false });
    document.fillColor("#66758A").font("Helvetica").fontSize(9).text(subtitle);
    document.moveDown(0.7);
  }
  function section(title) {
    if (document.y > 700) document.addPage();
    document.moveDown(0.6).fillColor(navy).font("Helvetica-Bold").fontSize(11).text(title);
    document.moveDown(0.3);
  }
  function table(headers, rows, widths) {
    const x = document.page.margins.left;
    const rowHeight = 20;
    function ensureRoom() {
      if (document.y + rowHeight > 750) {
        document.addPage();
        document.fillColor(navy).font("Helvetica-Bold").fontSize(10).text(headers.join("   ·   "));
        document.moveDown(0.5);
      }
    }
    document.fillColor(navy).font("Helvetica-Bold").fontSize(8);
    let offset = 0;
    headers.forEach((header, i) => {
      document.text(header, x + offset, document.y, { width: widths[i], lineBreak: false });
      offset += widths[i];
    });
    document.moveDown(0.5);
    document.moveTo(x, document.y).lineTo(553, document.y).strokeColor("#DCE4ED").stroke();
    for (const row of rows) {
      ensureRoom();
      const y = document.y + 5;
      offset = 0;
      document.fillColor("#35465B").font("Helvetica").fontSize(8);
      row.forEach((value, i) => {
        document.text(String(value ?? "").slice(0, 70), x + offset, y, { width: widths[i], lineBreak: false, ellipsis: true });
        offset += widths[i];
      });
      document.y = y + rowHeight;
    }
  }

  heading("Fee Reports", `${report.filters.from} to ${report.filters.to} · Pending fees for ${report.filters.month}`);
  section("Daily Collection");
  table(["Date", "Payments", "Collected"], report.dailyCollections.map((row) => [row.date, row.paymentCount, formatMoney(row.total)]), [150, 100, 230]);
  section("Monthly Collection");
  table(["Month", "Payments", "Collected"], report.monthlyCollections.map((row) => [row.month, row.paymentCount, formatMoney(row.total)]), [150, 100, 230]);
  section("Payment Modes");
  table(["Mode", "Payments", "Collected"], report.paymentModes.map((row) => [row.paymentMode, row.paymentCount, formatMoney(row.total)]), [150, 100, 230]);
  section(`Pending Fees · ${report.filters.month}`);
  document.fillColor("#66758A").font("Helvetica").fontSize(8).text("Pending = monthly fee minus recorded payments for the selected calendar month, floored at zero.");
  document.moveDown(0.4);
  table(["Student", "Monthly Fee", "Paid", "Pending"], report.pendingFees.map((row) => [
    `${row.studentName} (${row.studentCode})`, formatMoney(row.monthlyFee), formatMoney(row.paid), formatMoney(row.pending),
  ]), [190, 100, 90, 100]);
  document.moveDown(0.3).fillColor(navy).font("Helvetica-Bold").fontSize(9).text(`Total pending: ${formatMoney(report.pendingTotal)}`);
  if (report.ledger) {
    document.addPage();
    heading("Student Ledger", `${report.ledger.student.name} · ${report.ledger.student.studentCode} · ${report.filters.from} to ${report.filters.to}`);
    table(["Date", "Receipt", "Mode", "Amount"], report.ledger.payments.map((row) => [
      row.date, row.receiptNumber || "Legacy", row.paymentMode, formatMoney(row.amount),
    ]), [115, 180, 90, 95]);
  }
  const range = document.bufferedPageRange();
  for (let index = range.start; index < range.start + range.count; index += 1) {
    document.switchToPage(index);
    document.fillColor("#7A8797").font("Helvetica").fontSize(8)
      .text("ART'S Coaching · Knowledge Builds Brighter Tomorrows", 42, 790, { width: 510, align: "center" });
  }
  document.end();
  return document;
}

module.exports = { createExcelReport, createPdfReport };
