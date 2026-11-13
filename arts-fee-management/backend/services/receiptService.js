const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const { drawReceipt } = require("../templates/receiptTemplate");

async function createReceiptDocument(payment) {
  const qrCode = await QRCode.toBuffer(
    `ART'S Coaching receipt ${payment.receiptNumber}`,
    { type: "png", errorCorrectionLevel: "M", margin: 1, width: 240 },
  );
  const document = new PDFDocument({
    size: "A4",
    margins: { top: 0, right: 0, bottom: 0, left: 0 },
    autoFirstPage: false,
    info: {
      Title: `Fee receipt ${payment.receiptNumber}`,
      Author: "ART'S Coaching",
      Subject: "Student fee payment receipt",
    },
  });
  document.addPage();
  drawReceipt(document, payment, qrCode);
  document.end();
  return document;
}

module.exports = { createReceiptDocument };
