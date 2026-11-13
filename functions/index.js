const crypto = require("node:crypto");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { defineSecret, defineString } = require("firebase-functions/params");
const { setGlobalOptions } = require("firebase-functions/v2");
const { HttpsError, onCall, onRequest } = require("firebase-functions/v2/https");

setGlobalOptions({ region: "asia-south1" });
initializeApp();
const db = getFirestore();
const adminUid = defineString("ADMIN_UID");
const razorpayEnabled = defineString("RAZORPAY_ENABLED", { default: "false" });
const razorpayPublicKey = defineString("RAZORPAY_KEY_ID", { default: "" });
const razorpayKeySecret = defineSecret("RAZORPAY_KEY_SECRET");
const razorpayWebhookSecret = defineSecret("RAZORPAY_WEBHOOK_SECRET");

function requireAdmin(request) {
  if (!request.auth || !adminUid.value() || request.auth.uid !== adminUid.value()) {
    throw new HttpsError("permission-denied", "Administrator access is required.");
  }
}

function validateMonth(month) {
  if (typeof month !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new HttpsError("invalid-argument", "Choose a valid fee month.");
  }
}

function validateAmount(amount) {
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000000) {
    throw new HttpsError("invalid-argument", "Payment amount is invalid.");
  }
}

function paymentSecretsConfigured() {
  return razorpayEnabled.value() === "true" && Boolean(razorpayPublicKey.value());
}

async function razorpayRequest(path, options = {}) {
  const credentials = Buffer.from(
    `${razorpayPublicKey.value()}:${razorpayKeySecret.value()}`,
  ).toString("base64");
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const result = await response.json();
  if (!response.ok) {
    throw new HttpsError("unavailable", "Razorpay could not process the payment request.");
  }
  return result;
}

async function getStudent(studentId) {
  if (typeof studentId !== "string" || !studentId) {
    throw new HttpsError("invalid-argument", "Select a valid student.");
  }
  const studentSnapshot = await db.collection("students").doc(studentId).get();
  if (!studentSnapshot.exists) {
    throw new HttpsError("not-found", "Student record was not found.");
  }
  return { id: studentSnapshot.id, ...studentSnapshot.data() };
}

async function recordVerifiedPayment(paymentRef, details) {
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(paymentRef);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Pending payment record was not found.");
    }
    if (snapshot.data().status === "paid") return;
    transaction.update(paymentRef, {
      status: "paid",
      paymentId: details.paymentId,
      method: "Razorpay",
      paidAt: FieldValue.serverTimestamp(),
    });
  });
}

exports.getPaymentAvailability = onCall((request) => {
  requireAdmin(request);
  return { enabled: paymentSecretsConfigured(), keyId: razorpayPublicKey.value() };
});

exports.recordCashPayment = onCall(async (request) => {
  requireAdmin(request);
  const { studentId, month, amount } = request.data || {};
  validateMonth(month);
  validateAmount(amount);
  const student = await getStudent(studentId);
  const paymentRef = db.collection("payments").doc();
  await paymentRef.create({
    studentId: student.id,
    studentName: student.name,
    studentClass: student.studentClass,
    month,
    amount,
    method: "Cash",
    status: "paid",
    receiptNo: paymentRef.id,
    createdAt: FieldValue.serverTimestamp(),
    paidAt: FieldValue.serverTimestamp(),
  });
  return { receiptNo: paymentRef.id };
});

exports.createRazorpayOrder = onCall({
  secrets: [razorpayKeySecret],
}, async (request) => {
  requireAdmin(request);
  if (!paymentSecretsConfigured()) {
    throw new HttpsError("failed-precondition", "Online payments are not configured.");
  }
  const { studentId, month, amount } = request.data || {};
  validateMonth(month);
  validateAmount(amount);
  const student = await getStudent(studentId);
  const order = await razorpayRequest("/orders", {
    method: "POST",
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: `ac_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`,
      notes: { studentId: student.id, month },
    }),
  });
  const paymentRef = db.collection("payments").doc();
  await paymentRef.create({
    studentId: student.id,
    studentName: student.name,
    studentClass: student.studentClass,
    month,
    amount,
    method: "Razorpay",
    status: "pending",
    orderId: order.id,
    receiptNo: paymentRef.id,
    createdAt: FieldValue.serverTimestamp(),
  });
  return { orderId: order.id, keyId: razorpayPublicKey.value(), paymentRecordId: paymentRef.id };
});

exports.verifyRazorpayPayment = onCall({
  secrets: [razorpayKeySecret],
}, async (request) => {
  requireAdmin(request);
  const { orderId, paymentId, signature, paymentRecordId } = request.data || {};
  if (![orderId, paymentId, signature, paymentRecordId].every((value) => typeof value === "string" && value)) {
    throw new HttpsError("invalid-argument", "Payment verification details are incomplete.");
  }
  const expected = crypto
    .createHmac("sha256", razorpayKeySecret.value())
    .update(`${orderId}|${paymentId}`)
    .digest();
  let received;
  try {
    received = Buffer.from(signature, "hex");
  } catch {
    throw new HttpsError("invalid-argument", "Payment signature is invalid.");
  }
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    throw new HttpsError("permission-denied", "Payment signature verification failed.");
  }

  const paymentRecord = db.collection("payments").doc(paymentRecordId);
  const pending = await paymentRecord.get();
  if (!pending.exists || pending.data().orderId !== orderId) {
    throw new HttpsError("not-found", "Matching payment order was not found.");
  }
  const payment = await razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
  if (
    payment.order_id !== orderId ||
    payment.status !== "captured" ||
    payment.amount !== pending.data().amount
  ) {
    throw new HttpsError("failed-precondition", "Razorpay has not confirmed this payment as captured.");
  }
  await recordVerifiedPayment(paymentRecord, { paymentId });
  return { receiptNo: paymentRecord.id };
});

exports.razorpayWebhook = onRequest({
  secrets: [razorpayKeySecret, razorpayWebhookSecret],
}, async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).send("Method not allowed");
    return;
  }
  const signature = request.get("x-razorpay-signature") || "";
  const expected = crypto
    .createHmac("sha256", razorpayWebhookSecret.value())
    .update(request.rawBody)
    .digest();
  let received;
  try {
    received = Buffer.from(signature, "hex");
  } catch {
    received = Buffer.alloc(0);
  }
  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    response.status(400).send("Invalid webhook signature");
    return;
  }

  try {
    const event = request.body;
    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (payment?.order_id && payment.id && Number.isSafeInteger(payment.amount)) {
        const matching = await db.collection("payments")
          .where("orderId", "==", payment.order_id)
          .limit(1)
          .get();
        if (!matching.empty && matching.docs[0].data().amount === payment.amount) {
          await recordVerifiedPayment(matching.docs[0].ref, { paymentId: payment.id });
        }
      }
    }
    response.status(200).send("Webhook received");
  } catch (error) {
    console.error("Razorpay webhook processing failed", error);
    response.status(500).send("Webhook processing failed");
  }
});
