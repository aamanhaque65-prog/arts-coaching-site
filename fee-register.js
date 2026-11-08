const storageKey = "arts-coaching-fee-register-v1";
const feeForm = document.getElementById("feeForm");
const feeRecords = document.getElementById("feeRecords");
const feeStatusMessage = document.getElementById("feeStatusMessage");
const cancelFeeEdit = document.getElementById("cancelFeeEdit");
const feeFormSubmit = feeForm.querySelector('button[type="submit"]');
let records = [];
let editingSerial = null;
let storageAvailable = true;

function showFeeStatus(message, kind = "") {
  feeStatusMessage.textContent = message;
  feeStatusMessage.dataset.kind = kind;
}

function showEmptyRecords(message) {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  cell.className = "fee-empty";
  cell.colSpan = 7;
  cell.textContent = message;
  row.append(cell);
  feeRecords.replaceChildren(row);
}

function formatFees(fees) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(fees);
}

function addCell(row, value) {
  const cell = document.createElement("td");
  cell.textContent = value;
  row.append(cell);
}

function renderRecords() {
  if (records.length === 0) {
    showEmptyRecords("No fee records added yet.");
    return;
  }

  const rows = [...records]
    .sort((a, b) => a.serialNumber - b.serialNumber)
    .map((record) => {
      const row = document.createElement("tr");
      addCell(row, String(record.serialNumber));
      addCell(row, record.studentName);
      addCell(row, record.studentClass);
      addCell(row, record.month);
      addCell(row, formatFees(record.fees));
      addCell(row, record.paymentStatus);

      const actionCell = document.createElement("td");
      actionCell.className = "fee-action-cell";
      const editButton = document.createElement("button");
      editButton.className = "fee-edit-button";
      editButton.type = "button";
      editButton.textContent = "Edit";
      editButton.setAttribute("aria-label", `Edit fee record ${record.serialNumber}`);
      editButton.addEventListener("click", () => startEditing(record));
      actionCell.append(editButton);
      row.append(actionCell);
      return row;
    });

  feeRecords.replaceChildren(...rows);
}

function readRecords() {
  const savedRecords = localStorage.getItem(storageKey);
  if (!savedRecords) return [];

  const parsedRecords = JSON.parse(savedRecords);
  if (
    !Array.isArray(parsedRecords) ||
    parsedRecords.some((record) =>
      !record ||
      !Number.isInteger(record.serialNumber) ||
      typeof record.studentName !== "string" ||
      typeof record.studentClass !== "string" ||
      typeof record.month !== "string" ||
      !Number.isFinite(record.fees) ||
      !["Paid", "Unpaid", "Partial"].includes(record.paymentStatus)
    )
  ) {
    throw new Error("Saved fee records are invalid. Please check this browser's saved data.");
  }
  return parsedRecords;
}

function saveRecords() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(records));
    storageAvailable = true;
    return true;
  } catch (error) {
    storageAvailable = false;
    showFeeStatus(`Could not save fee records in this browser: ${error.message}`, "error");
    feeFormSubmit.disabled = true;
    return false;
  }
}

function resetFeeForm() {
  feeForm.reset();
  editingSerial = null;
  feeFormSubmit.textContent = "Add fee record";
  cancelFeeEdit.hidden = true;
}

function startEditing(record) {
  editingSerial = record.serialNumber;
  feeForm.elements.studentName.value = record.studentName;
  feeForm.elements.studentClass.value = record.studentClass;
  feeForm.elements.month.value = record.month;
  feeForm.elements.fees.value = String(record.fees);
  feeForm.elements.paymentStatus.value = record.paymentStatus;
  feeFormSubmit.textContent = `Save serial ${record.serialNumber}`;
  cancelFeeEdit.hidden = false;
  feeForm.elements.studentName.focus();
}

try {
  records = readRecords();
  renderRecords();
} catch (error) {
  storageAvailable = false;
  feeFormSubmit.disabled = true;
  showEmptyRecords("Could not load saved fee records.");
  showFeeStatus(error.message, "error");
}

feeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!storageAvailable) return;

  const formData = new FormData(feeForm);
  const record = {
    studentName: String(formData.get("studentName")).trim(),
    studentClass: String(formData.get("studentClass")).trim(),
    month: String(formData.get("month")),
    fees: Number(formData.get("fees")),
    paymentStatus: String(formData.get("paymentStatus")),
  };

  if (!record.studentName || !record.studentClass || !/^\d{4}-\d{2}$/.test(record.month)) {
    showFeeStatus("Enter a student name, class, and valid month.", "error");
    return;
  }
  if (!Number.isFinite(record.fees) || record.fees < 0 || record.fees > 1000000) {
    showFeeStatus("Fees must be between 0 and 1,000,000 INR.", "error");
    return;
  }

  const previousRecords = records;
  if (editingSerial !== null) {
    records = records.map((savedRecord) =>
      savedRecord.serialNumber === editingSerial
        ? { ...savedRecord, ...record }
        : savedRecord
    );
    if (!records.some((savedRecord) => savedRecord.serialNumber === editingSerial)) {
      showFeeStatus("That record is no longer available. Reload the page and try again.", "error");
      return;
    }
  } else {
    const nextSerial = records.reduce(
      (highest, savedRecord) => Math.max(highest, savedRecord.serialNumber),
      0,
    ) + 1;
    records.push({ serialNumber: nextSerial, ...record });
  }

  if (!saveRecords()) {
    records = previousRecords;
    return;
  }
  renderRecords();
  showFeeStatus(
    editingSerial === null ? "Fee record added." : `Serial ${editingSerial} updated.`,
    "success",
  );
  resetFeeForm();
});

cancelFeeEdit.addEventListener("click", () => {
  resetFeeForm();
  showFeeStatus("Edit cancelled.");
});

window.addEventListener("storage", (event) => {
  if (event.key !== storageKey) return;
  try {
    records = readRecords();
    renderRecords();
    showFeeStatus("Fee records refreshed from another tab.");
  } catch (error) {
    showFeeStatus(error.message, "error");
  }
});
