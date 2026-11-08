import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

// Replace these values with the Firebase web app configuration from Firebase Console.
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_FIREBASE_APP_ID",
};

const isConfigured = Object.values(firebaseConfig).every(
  (value) => value && !value.startsWith("YOUR_"),
);

const signInPanel = document.getElementById("signInPanel");
const signInForm = document.getElementById("signInForm");
const dashboard = document.getElementById("dashboard");
const signOutButton = document.getElementById("signOutButton");
const configNotice = document.getElementById("configurationNotice");
const statusMessage = document.getElementById("statusMessage");
const studentForm = document.getElementById("studentForm");
const paymentForm = document.getElementById("paymentForm");
const paymentStudent = document.getElementById("paymentStudent");
const studentsTable = document.getElementById("studentsTable");
const paymentsTable = document.getElementById("paymentsTable");

let auth;
let db;
let students = [];

function showStatus(message, kind = "info") {
  statusMessage.textContent = message;
  statusMessage.dataset.kind = kind;
  statusMessage.hidden = false;
}

function setFormBusy(form, isBusy) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = isBusy;
}

function makeCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  row.append(cell);
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

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function populateStudentSelect() {
  paymentStudent.replaceChildren(new Option("Select a student", ""));
  for (const student of students) {
    paymentStudent.add(new Option(
      `${student.name} (${student.studentClass})`,
      student.id,
    ));
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
    makeCell(row, formatCurrency(student.monthlyFee));
    return row;
  });
  studentsTable.replaceChildren(...rows);
}

async function loadRecords() {
  const [studentSnapshot, paymentSnapshot] = await Promise.all([
    getDocs(collection(db, "students")),
    getDocs(collection(db, "payments")),
  ]);

  students = studentSnapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
  students.sort((a, b) => a.name.localeCompare(b.name));
  renderStudents();
  populateStudentSelect();

  const payments = paymentSnapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 50);

  if (payments.length === 0) {
    showEmptyRow(paymentsTable, "No payments have been recorded yet.", 4);
    return;
  }

  const rows = payments.map((payment) => {
    const row = document.createElement("tr");
    makeCell(row, payment.receiptNo);
    makeCell(row, payment.studentName);
    makeCell(row, payment.month);
    makeCell(row, formatCurrency(payment.amount));
    return row;
  });
  paymentsTable.replaceChildren(...rows);
}

if (!isConfigured) {
  configNotice.hidden = false;
  signInForm.querySelector('button[type="submit"]').disabled = true;
} else {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);

  onAuthStateChanged(auth, async (user) => {
    signInPanel.hidden = Boolean(user);
    dashboard.hidden = !user;
    signOutButton.hidden = !user;
    statusMessage.hidden = true;

    if (!user) {
      students = [];
      renderStudents();
      populateStudentSelect();
      showEmptyRow(paymentsTable, "Sign in to load payment records.", 4);
      return;
    }

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
  const formData = new FormData(signInForm);
  try {
    await signInWithEmailAndPassword(
      auth,
      String(formData.get("email")).trim(),
      String(formData.get("password")),
    );
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
  const formData = new FormData(studentForm);
  const monthlyFee = Number(formData.get("monthlyFee"));

  try {
    await addDoc(collection(db, "students"), {
      name: String(formData.get("name")).trim(),
      studentClass: String(formData.get("studentClass")).trim(),
      phone: String(formData.get("phone")).trim(),
      address: String(formData.get("address")).trim(),
      monthlyFee,
      createdAt: serverTimestamp(),
    });
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
  const formData = new FormData(paymentForm);
  const student = students.find((item) => item.id === formData.get("studentId"));
  const amount = Number(formData.get("amount"));

  if (!student) {
    showStatus("Select a valid student before recording a payment.", "error");
    setFormBusy(paymentForm, false);
    return;
  }

  try {
    const paymentRef = doc(collection(db, "payments"));
    await setDoc(paymentRef, {
      studentId: student.id,
      studentName: student.name,
      month: String(formData.get("month")),
      amount,
      receiptNo: paymentRef.id,
      createdAt: serverTimestamp(),
    });
    paymentForm.reset();
    await loadRecords();
    showStatus(`Payment saved. Receipt number: ${paymentRef.id}`, "success");
  } catch (error) {
    showStatus(`Could not save payment: ${error.message}`, "error");
  } finally {
    setFormBusy(paymentForm, false);
  }
});
