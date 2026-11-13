const BRAND = {
  navy: "#002B6B",
  gold: "#D4AF37",
  muted: "#66758A",
  line: "#E3E9F0",
};

function drawReceipt(document, payment, qrCode) {
  const left = 54;
  const right = 558;
  const width = right - left;

  document.rect(0, 0, 612, 12).fill(BRAND.navy);
  document.roundedRect(left, 42, 48, 48, 10).fill("#EDF2F8");
  document.fillColor(BRAND.navy).font("Helvetica-Bold").fontSize(21)
    .text("A", left, 54, { width: 48, align: "center" });
  document.fillColor(BRAND.navy).font("Helvetica-Bold").fontSize(20)
    .text("ART'S Coaching", left + 62, 47);
  document.fillColor(BRAND.muted).font("Helvetica").fontSize(9)
    .text("Knowledge Builds Brighter Tomorrows", left + 63, 73);
  document.fillColor(BRAND.gold).font("Helvetica-Bold").fontSize(10)
    .text("FEE PAYMENT RECEIPT", left, 123, { characterSpacing: 1.4 });
  document.moveTo(left, 145).lineTo(right, 145).lineWidth(1).strokeColor(BRAND.line).stroke();

  document.fillColor(BRAND.muted).font("Helvetica").fontSize(9).text("RECEIPT NUMBER", left, 164);
  document.fillColor(BRAND.navy).font("Helvetica-Bold").fontSize(15).text(payment.receiptNumber, left, 180);
  document.fillColor(BRAND.muted).font("Helvetica").fontSize(9).text("DATE", 390, 164);
  document.fillColor("#263B55").font("Helvetica-Bold").fontSize(11)
    .text(new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(payment.collectedAt)), 390, 181, { width: 168 });

  document.moveTo(left, 217).lineTo(right, 217).lineWidth(1).strokeColor(BRAND.line).stroke();
  document.fillColor(BRAND.navy).font("Helvetica-Bold").fontSize(11).text("STUDENT DETAILS", left, 237);
  document.fillColor(BRAND.muted).font("Helvetica").fontSize(9).text("STUDENT NAME", left, 260);
  document.fillColor("#263B55").font("Helvetica-Bold").fontSize(12).text(payment.studentName, left, 276, { width: 290 });
  document.fillColor(BRAND.muted).font("Helvetica").fontSize(9).text("STUDENT CODE", left, 303);
  document.fillColor("#263B55").font("Helvetica").fontSize(11).text(payment.studentCode, left, 319);

  document.moveTo(left, 351).lineTo(right, 351).lineWidth(1).strokeColor(BRAND.line).stroke();
  document.fillColor(BRAND.navy).font("Helvetica-Bold").fontSize(11).text("FEE DETAILS", left, 372);
  document.fillColor(BRAND.muted).font("Helvetica").fontSize(9).text("AMOUNT RECEIVED", left, 397);
  document.fillColor(BRAND.navy).font("Helvetica-Bold").fontSize(23)
    .text(new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(payment.amount)), left, 416);
  document.fillColor(BRAND.muted).font("Helvetica").fontSize(9).text("PAYMENT MODE", 335, 397);
  document.fillColor("#263B55").font("Helvetica-Bold").fontSize(12).text(payment.paymentMode, 335, 416);
  if (payment.note) {
    document.fillColor(BRAND.muted).font("Helvetica").fontSize(9).text("NOTE", left, 462);
    document.fillColor("#263B55").font("Helvetica").fontSize(10).text(payment.note, left, 477, { width });
  }

  document.moveTo(left, 521).lineTo(right, 521).lineWidth(1).strokeColor(BRAND.line).stroke();
  document.fillColor(BRAND.muted).font("Helvetica").fontSize(9)
    .text("Thank you for your payment.", left, 541);
  document.image(qrCode, right - 76, 534, { fit: [68, 68] });
  document.fillColor(BRAND.muted).font("Helvetica").fontSize(7)
    .text("Scan for receipt number", right - 96, 607, { width: 108, align: "center" });
  document.fillColor(BRAND.navy).font("Helvetica-Bold").fontSize(8)
    .text("ART'S Coaching · Knowledge Builds Brighter Tomorrows", left, 635, { width, align: "center" });
}

module.exports = { drawReceipt };
