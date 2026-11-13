import { useEffect, useRef, useState } from "react";
import { FiCheckCircle, FiSearch } from "react-icons/fi";
import { api, getApiError } from "../services/api.js";

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer"];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

export default function FeeForm({ onCollected }) {
  const [query, setQuery] = useState("");
  const [students, setStudents] = useState([]);
  const [student, setStudent] = useState(null);
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchId = useRef(0);

  useEffect(() => {
    const id = ++searchId.current;
    if (!query.trim() || student) {
      setStudents([]);
      setSearching(false);
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get("/fees/students", { params: { search: query.trim() } });
        if (id === searchId.current) setStudents(data.students);
      } catch (cause) {
        if (id === searchId.current) setError(getApiError(cause));
      } finally {
        if (id === searchId.current) setSearching(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      if (searchId.current === id) searchId.current += 1;
    };
  }, [query, student]);

  function chooseStudent(nextStudent) {
    setStudent(nextStudent);
    setQuery(`${nextStudent.studentCode} · ${nextStudent.name}`);
    setAmount(String(nextStudent.monthlyFee));
    setShowResults(false);
    setErrors((current) => ({ ...current, studentId: undefined }));
    setReceipt(null);
  }

  function clearStudent() {
    setStudent(null);
    setQuery("");
    setAmount("");
    setStudents([]);
    setShowResults(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setErrors({});
    setReceipt(null);
    try {
      const { data } = await api.post("/fees", {
        studentId: student?.id,
        amount: Number(amount),
        paymentMode,
        note,
      });
      setReceipt(data.payment);
      setAmount("");
      setNote("");
      onCollected(data.payment);
    } catch (cause) {
      if (cause?.response?.data?.fields) setErrors(cause.response.data.fields);
      else setError(getApiError(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel fee-form-panel" aria-labelledby="collect-fee-title">
      <div className="panel-heading">
        <div><h2 id="collect-fee-title">Collect a fee</h2><p>Record a payment received from a student.</p></div>
      </div>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {receipt && (
        <div className="receipt-success" role="status">
          <FiCheckCircle size={19} aria-hidden="true" />
          <div><strong>Payment recorded</strong><span>Receipt {receipt.receiptNumber} · {formatCurrency(receipt.amount)}</span></div>
        </div>
      )}
      <form className="form-stack fee-form" onSubmit={handleSubmit}>
        <div className="fee-search-wrap">
          <label htmlFor="fee-student-search">Student</label>
          <div className="search-field fee-student-search">
            <FiSearch size={16} aria-hidden="true" />
            <input
              id="fee-student-search"
              type="search"
              value={query}
              onChange={(event) => {
                if (student) setStudent(null);
                setQuery(event.target.value);
                setShowResults(true);
                setReceipt(null);
                setError("");
              }}
              onFocus={() => setShowResults(true)}
              placeholder="Search by name, code, course, or mobile"
              autoComplete="off"
              aria-expanded={showResults && !student}
              aria-controls="fee-student-results"
              aria-invalid={Boolean(errors.studentId)}
              aria-describedby={errors.studentId ? "fee-student-error" : undefined}
            />
            {student && <button className="text-button" type="button" onClick={clearStudent}>Change</button>}
          </div>
          {errors.studentId && <span className="field-error" id="fee-student-error">{errors.studentId}</span>}
          {showResults && !student && query.trim() && (
            <div className="student-search-results" id="fee-student-results" role="listbox" aria-label="Matching students">
              {searching ? <p className="search-result-message">Searching students…</p> : students.length ? students.map((match) => (
                <button
                  className="student-search-result"
                  key={match.id}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onClick={() => chooseStudent(match)}
                >
                  <span><strong>{match.name}</strong><small>{match.studentCode} · {match.course}</small></span>
                  <span>{formatCurrency(match.monthlyFee)} / mo</span>
                </button>
              )) : <p className="search-result-message">No active students found.</p>}
            </div>
          )}
        </div>

        {student && <p className="selected-student-hint">Monthly fee: {formatCurrency(student.monthlyFee)} · {student.course}</p>}
        <div className="fee-form-row">
          <div className="student-field">
            <label htmlFor="fee-amount">Amount received (INR)</label>
            <input
              id="fee-amount"
              type="number"
              min="0.01"
              max="1000000"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={Boolean(errors.amount)}
              aria-describedby={errors.amount ? "fee-amount-error" : undefined}
              required
            />
            {errors.amount && <span className="field-error" id="fee-amount-error">{errors.amount}</span>}
          </div>
          <div className="student-field">
            <label htmlFor="fee-payment-mode">Payment mode</label>
            <select
              id="fee-payment-mode"
              value={paymentMode}
              onChange={(event) => setPaymentMode(event.target.value)}
              aria-invalid={Boolean(errors.paymentMode)}
              aria-describedby={errors.paymentMode ? "fee-mode-error" : undefined}
              required
            >
              {PAYMENT_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
            </select>
            {errors.paymentMode && <span className="field-error" id="fee-mode-error">{errors.paymentMode}</span>}
          </div>
        </div>
        <div className="student-field">
          <label htmlFor="fee-note">Note <span className="optional-label">Optional</span></label>
          <textarea
            id="fee-note"
            rows="2"
            maxLength="200"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            aria-invalid={Boolean(errors.note)}
            aria-describedby={errors.note ? "fee-note-error" : undefined}
          />
          {errors.note && <span className="field-error" id="fee-note-error">{errors.note}</span>}
        </div>
        <button className="primary-button fee-submit-button" type="submit" disabled={saving}>
          {saving ? "Recording payment…" : "Record payment"}
        </button>
      </form>
    </section>
  );
}
