import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_FIREBASE_APP_ID",
};
const admins = [
  { role: "Owner", uid: "OWNER_ADMIN_UID_FROM_FIREBASE" },
  { role: "Father", uid: "FATHER_ADMIN_UID_FROM_FIREBASE" },
  { role: "Paternal uncle", uid: "UNCLE_ADMIN_UID_FROM_FIREBASE" },
];
const isConfigured = Object.values(firebaseConfig).every(
  (value) => value && !value.startsWith("YOUR_"),
) && admins.every((admin) => admin.uid && !admin.uid.endsWith("_FROM_FIREBASE"));

const signInPanel = document.getElementById("signInPanel");
const signInForm = document.getElementById("signInForm");
const dashboard = document.getElementById("dashboard");
const signOutButton = document.getElementById("signOutButton");
const configNotice = document.getElementById("configurationNotice");
const authStatusMessage = document.getElementById("authStatusMessage");
const statusMessage = document.getElementById("statusMessage");
const studentForm = document.getElementById("studentForm");
const paymentForm = document.getElementById("paymentForm");
const paymentStudent = document.getElementById("paymentStudent");
const feeStatusForm = document.getElementById("feeStatusForm");
const feeStatusStudent = document.getElementById("feeStatusStudent");
const feeStatusResult = document.getElementById("feeStatusResult");
const studentsTable = document.getElementById("studentsTable");
const paymentsTable = document.getElementById("paymentsTable");
const auditTable = document.getElementById("auditTable");

let auth;
let db;
let students = [];
let payments = [];
let monthlyFees = [];
let auditLogs = [];

function showStatus(message, kind = "info") {
  const target = dashboard.hidden ? authStatusMessage : statusMessage;
  target.textContent = message;
  target.dataset.kind = kind;
  target.hidden = false;
}

function setFormBusy(form, isBusy) {
  form.querySelector('button[type="submit"]').disabled = isBusy;
}

function makeCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  row.append(cell);
  return cell;
}

function showEmptyRow(tbody, message, columnCount) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.colSpan = columnCount;
  cell.className = "empty-row";
  cell.textContent = message;
  row.append(cell);
  tbody.replaceChildren(row);
}

function formatCurrency(paise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

function formatPdfCurrency(paise) {
  const amount = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
  return `INR ${amount}`;
}

function currentAdmin() {
  return admins.find((admin) => admin.uid === auth?.currentUser?.uid);
}

function appendAudit(batch, action, targetId, targetType, summary) {
  const admin = currentAdmin();
  if (!admin) throw new Error("The signed-in account is not an authorized administrator.");
  const auditRef = doc(collection(db, "auditLogs"));
  batch.set(auditRef, {
    actorUid: admin.uid,
    actorName: admin.role,
    action,
    targetId,
    targetType,
    summary: summary.slice(0, 300),
    createdAt: serverTimestamp(),
  });
}

function populateStudentSelect(select) {
  const previousValue = select.value;
  select.replaceChildren(new Option("Select a student", ""));
  for (const student of students) {
    select.add(new Option(`${student.name} (${student.studentClass})`, student.id));
  }
  if (students.some((student) => student.id === previousValue)) {
    select.value = previousValue;
  }
}

function renderStudents() {
  if (students.length === 0) {
    showEmptyRow(studentsTable, "No students have been added yet.", 5);
    return;
  }
  const rows = students.map((student) => {
    const row = document.createElement("tr");
    makeCell(row, student.name);
    makeCell(row, student.studentClass);
    makeCell(row, student.phone);
    makeCell(row, student.address);
    makeCell(row, formatCurrency(student.monthlyFee * 100));
    return row;
  });
  studentsTable.replaceChildren(...rows);
}

function makePdf(title, lines, filename) {
  const Pdf = window.jspdf?.jsPDF;
  if (!Pdf) {
    showStatus("The PDF tool could not load. Check your internet connection and try again.", "error");
    return;
  }
  const pdf = new Pdf();
  pdf.setFontSize(18);
  pdf.text("ART'S COACHING", 18, 22);
  pdf.setFontSize(14);
  pdf.text(title, 18, 34);
  pdf.setFontSize(11);
  let y = 48;
  for (const line of lines) {
    const wrapped = pdf.splitTextToSize(line, 174);
    if (y + wrapped.length * 7 > 280) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(wrapped, 18, y);
    y += wrapped.length * 7 + 3;
  }
  pdf.setFontSize(9);
  pdf.text("Generated by Art's Coaching fee management.", 18, 286);
  pdf.save(filename);
}

function downloadReceipt(payment) {
  if (payment.status !== "paid") return;
  makePdf("Payment receipt", [
    `Receipt number: ${payment.receiptNo}`,
    `Student: ${payment.studentName}`,
    `Class / level: ${payment.studentClass}`,
    `Fee month: ${payment.month}`,
    `Amount received: ${formatPdfCurrency(payment.amount)}`,
    `Payment method: ${payment.method}`,
    `Payment status: Paid`,
    `Date: ${payment.paidAt?.toDate?.().toLocaleDateString("en-IN") || new Date().toLocaleDateString("en-IN")}`,
  ], `Arts-Coaching-receipt-${payment.receiptNo}.pdf`);
}

function renderPayments() {
  const recent = [...payments].sort((a, b) =>
    (b.month || "").localeCompare(a.month || "") ||
    (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
  ).slice(0, 50);
  if (recent.length === 0) {
    showEmptyRow(paymentsTable, "No payments have been recorded yet.", 6);
    return;
  }
  const rows = recent.map((payment) => {
    const row = document.createElement("tr");
    makeCell(row, payment.receiptNo);
    makeCell(row, payment.studentName);
    makeCell(row, payment.month);
    makeCell(row, formatCurrency(payment.amount));
    makeCell(row, payment.method || "—");
    const receiptCell = makeCell(row, "");
    if (payment.status === "paid") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "text-button";
      button.textContent = "Download PDF";
      button.addEventListener("click", () => downloadReceipt(payment));
      receiptCell.append(button);
    } else {
      receiptCell.textContent = "Pending";
    }
    return row;
  });
  paymentsTable.replaceChildren(...rows);
}

function renderAuditLogs() {
  const recent = [...auditLogs]
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
    .slice(0, 50);
  if (recent.length === 0) {
    showEmptyRow(auditTable, "No audit entries have been recorded yet.", 4);
    return;
  }
  const rows = recent.map((entry) => {
    const row = document.createElement("tr");
    makeCell(row, entry.createdAt?.toDate?.().toLocaleString("en-IN") || "Just now");
    makeCell(row, entry.actorName);
    makeCell(row, entry.action.replaceAll("_", " "));
    makeCell(row, entry.summary);
    return row;
  });
  auditTable.replaceChildren(...rows);
}

async function loadRecords() {
  const [studentSnapshot, paymentSnapshot, feeSnapshot, auditSnapshot] = await Promise.all([
    getDocs(collection(db, "students")),
    getDocs(collection(db, "payments")),
    getDocs(collection(db, "monthlyFees")),
    getDocs(collection(db, "auditLogs")),
  ]);
  students = studentSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  students.sort((a, b) => a.name.localeCompare(b.name));
  payments = paymentSnapshot.docs.map((item) => {
    const data = item.data();
    const legacyPayment = !data.method && !data.status;
    return {
      id: item.id,
      ...data,
      amount: legacyPayment ? data.amount * 100 : data.amount,
      method: data.method || "Cash",
      status: data.status || "paid",
      receiptNo: data.receiptNo || item.id,
      paidAt: data.paidAt || data.createdAt,
    };
  });
  monthlyFees = feeSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  auditLogs = auditSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  renderStudents();
  renderPayments();
  renderAuditLogs();
  populateStudentSelect(paymentStudent);
  populateStudentSelect(feeStatusStudent);
}

function paidForMonth(studentId, month) {
  return payments
    .filter((payment) => payment.studentId === studentId && payment.month === month && payment.status === "paid")
    .reduce((total, payment) => total + payment.amount, 0);
}

if (!isConfigured) {
  configNotice.hidden = false;
  signInForm.querySelector('button[type="submit"]').disabled = true;
} else {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, async (user) => {
    const isAdmin = Boolean(user && admins.some((admin) => admin.uid === user.uid));
    signInPanel.hidden = isAdmin;
    dashboard.hidden = !isAdmin;
    signOutButton.hidden = !user;
    statusMessage.hidden = true;
    if (!isAdmin) {
      students = [];
      payments = [];
      monthlyFees = [];
      auditLogs = [];
      renderStudents();
      renderPayments();
      renderAuditLogs();
      populateStudentSelect(paymentStudent);
      populateStudentSelect(feeStatusStudent);
      authStatusMessage.textContent = user ? "This account is not authorized to access coaching records." : "";
      authStatusMessage.dataset.kind = "error";
      authStatusMessage.hidden = !user;
      return;
    }
    authStatusMessage.hidden = true;
    try {
      await loadRecords();
    } catch (error) {
      showStatus(`Could not load records: ${error.message}`, "error");
    }
  });
}

signInForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!auth) return;
  setFormBusy(signInForm, true);
  const data = new FormData(signInForm);
  try {
    await signInWithEmailAndPassword(auth, String(data.get("email")).trim(), String(data.get("password")));
    signInForm.reset();
  } catch (error) {
    showStatus(`Sign-in failed: ${error.message}`, "error");
  } finally {
    setFormBusy(signInForm, false);
  }
});

signOutButton.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    showStatus(`Could not sign out: ${error.message}`, "error");
  }
});

studentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormBusy(studentForm, true);
  const data = new FormData(studentForm);
  const monthlyFee = Number(data.get("monthlyFee"));
  try {
    const studentRef = doc(collection(db, "students"));
    const batch = writeBatch(db);
    batch.set(studentRef, {
      name: String(data.get("name")).trim(),
      studentClass: String(data.get("studentClass")).trim(),
      phone: String(data.get("phone")).trim(),
      address: String(data.get("address")).trim(),
      monthlyFee,
      createdAt: serverTimestamp(),
    });
    appendAudit(
      batch,
      "student_created",
      studentRef.id,
      "student",
      `Added ${String(data.get("name")).trim()} (${String(data.get("studentClass")).trim()}).`,
    );
    await batch.commit();
    studentForm.reset();
    await loadRecords();
    showStatus("Student saved.", "success");
  } catch (error) {
    showStatus(`Could not save student: ${error.message}`, "error");
  } finally {
    setFormBusy(studentForm, false);
  }
});

paymentForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFormBusy(paymentForm, true);
  const data = new FormData(paymentForm);
  try {
    const studentId = String(data.get("studentId"));
    const month = String(data.get("month"));
    const student = students.find((item) => item.id === studentId);
    const fee = monthlyFees.find((item) => item.studentId === studentId && item.month === month);
    const amountPaise = Math.round(Number(data.get("amount")) * 100);
    if (!student || !fee) {
      throw new Error("Create the monthly fee record before recording a cash payment.");
    }
    const due = fee.amountPaise - paidForMonth(studentId, month);
    if (!Number.isSafeInteger(amountPaise) || amountPaise < 1 || amountPaise > due) {
      throw new Error(`Enter an amount up to the remaining balance of ${formatCurrency(Math.max(0, due))}.`);
    }
    const paymentRef = doc(collection(db, "payments"));
    const batch = writeBatch(db);
    batch.set(paymentRef, {
      studentId,
      studentName: student.name,
      studentClass: student.studentClass,
      month,
      amount: amountPaise,
      method: "Cash",
      status: "paid",
      receiptNo: paymentRef.id,
      createdAt: serverTimestamp(),
      paidAt: serverTimestamp(),
    });
    appendAudit(
      batch,
      "cash_payment_recorded",
      paymentRef.id,
      "payment",
      `Recorded cash of ${formatPdfCurrency(amountPaise)} for ${student.name}, ${month}.`,
    );
    await batch.commit();
    paymentForm.reset();
    await loadRecords();
    const savedPayment = payments.find((payment) => payment.id === paymentRef.id);
    showStatus(`Cash entry saved. Receipt ${paymentRef.id} is ready.`, "success");
    if (savedPayment) downloadReceipt(savedPayment);
  } catch (error) {
    showStatus(`Could not record cash payment: ${error.message}`, "error");
  } finally {
    setFormBusy(paymentForm, false);
  }
});

feeStatusForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(feeStatusForm);
  const student = students.find((item) => item.id === data.get("studentId"));
  const month = String(data.get("month"));
  if (!student || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    showStatus("Select a student and valid fee month.", "error");
    return;
  }
  const feeId = `${student.id}_${month}`;
  let fee = monthlyFees.find((item) => item.id === feeId);
  if (!fee) {
    try {
      const feeRef = doc(db, "monthlyFees", feeId);
      const existingFee = await getDoc(feeRef);
      if (existingFee.exists()) {
        fee = { id: existingFee.id, ...existingFee.data() };
        monthlyFees.push(fee);
      } else {
        const batch = writeBatch(db);
        fee = {
          id: feeId,
          studentId: student.id,
          studentName: student.name,
          studentClass: student.studentClass,
          month,
          amountPaise: student.monthlyFee * 100,
        };
        batch.set(feeRef, {
          studentId: fee.studentId,
          studentName: fee.studentName,
          studentClass: fee.studentClass,
          month: fee.month,
          amountPaise: fee.amountPaise,
          createdAt: serverTimestamp(),
        });
        appendAudit(
          batch,
          "monthly_fee_created",
          feeId,
          "monthly_fee",
          `Created ${month} fee of ${formatPdfCurrency(fee.amountPaise)} for ${student.name}.`,
        );
        await batch.commit();
        await loadRecords();
        fee = monthlyFees.find((item) => item.id === feeId);
      }
    } catch (error) {
      showStatus(`Could not create monthly fee record: ${error.message}`, "error");
      return;
    }
  }
  const paid = paidForMonth(student.id, month);
  const charge = fee.amountPaise;
  const due = charge - paid;
  feeStatusResult.replaceChildren();
  const summary = document.createElement("p");
  summary.textContent = `${student.name} · ${month} · Fee ${formatCurrency(charge)} · Paid ${formatCurrency(paid)} · ${due > 0 ? `Due ${formatCurrency(due)}` : `Credit ${formatCurrency(Math.abs(due))}`}`;
  const download = document.createElement("button");
  download.type = "button";
  download.className = "primary-button";
  download.textContent = "Download monthly bill PDF";
  download.addEventListener("click", () => {
    makePdf("Monthly fee bill", [
      `Student: ${student.name}`,
      `Class / level: ${student.studentClass}`,
      `Phone: ${student.phone}`,
      `Fee month: ${month}`,
      `Monthly fee: ${formatPdfCurrency(charge)}`,
      `Paid to date: ${formatPdfCurrency(paid)}`,
      `${due > 0 ? "Balance due" : "Credit"}: ${formatPdfCurrency(Math.abs(due))}`,
      `Status: ${due > 0 ? (paid > 0 ? "Partially paid" : "Unpaid") : "Paid"}`,
    ], `Arts-Coaching-bill-${student.id}-${month}.pdf`);
  });
  feeStatusResult.append(summary, download);
  feeStatusResult.hidden = false;
});
