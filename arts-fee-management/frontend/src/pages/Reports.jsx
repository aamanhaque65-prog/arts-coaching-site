import { useEffect, useMemo, useRef, useState } from "react";
import { FiAlertCircle, FiDownload, FiFileText, FiSearch } from "react-icons/fi";
import { PageHeading } from "../components/Header.jsx";
import { api, getApiError } from "../services/api.js";

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localMonth(date = new Date()) {
  return localDate(date).slice(0, 7);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  const text = typeof value === "string" ? value.slice(0, 10) : localDate(new Date(value));
  const [year, month, day] = text.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, day)));
}

function MonthlyChart({ rows }) {
  const values = rows.map((row) => Number(row.total));
  const max = Math.max(1, ...values);
  return (
    <div className="report-chart-bars" role="img" aria-label="Monthly collection chart">
      {rows.map((row) => (
        <div className="report-chart-column" key={row.month} title={`${row.month}: ${formatCurrency(row.total)}`}>
          <span className="report-chart-value">{formatCurrency(row.total)}</span>
          <div className="report-chart-track"><span style={{ height: `${Math.max(3, (Number(row.total) / max) * 100)}%` }} /></div>
          <span className="report-chart-label">{row.month}</span>
        </div>
      ))}
      {!rows.length && <p className="report-empty">No monthly payments for this range.</p>}
    </div>
  );
}

function PaymentModeChart({ rows }) {
  const total = rows.reduce((sum, row) => sum + Number(row.total), 0);
  const colors = ["#002B6B", "#D4AF37", "#57A27C", "#8A72B6"];
  return (
    <div className="mode-chart" aria-label="Payment mode collection chart">
      <div className="mode-chart-total">{formatCurrency(total)}<span> collected</span></div>
      {rows.length ? rows.map((row, index) => (
        <div className="mode-chart-row" key={row.paymentMode}>
          <div className="mode-chart-label"><span style={{ backgroundColor: colors[index % colors.length] }} />{row.paymentMode}<strong>{formatCurrency(row.total)}</strong></div>
          <div className="mode-chart-track"><span style={{ width: `${total ? (Number(row.total) / total) * 100 : 0}%`, backgroundColor: colors[index % colors.length] }} /></div>
          <small>{row.paymentCount} {Number(row.paymentCount) === 1 ? "payment" : "payments"}</small>
        </div>
      )) : <p className="report-empty">No payments for this range.</p>}
    </div>
  );
}

export default function Reports() {
  const today = localDate();
  const [from, setFrom] = useState(`${localMonth()}-01`);
  const [to, setTo] = useState(today);
  const [month, setMonth] = useState(localMonth());
  const [studentSearch, setStudentSearch] = useState("");
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState("");
  const [error, setError] = useState("");
  const requestId = useRef(0);
  const studentSearchId = useRef(0);

  const params = useMemo(() => ({
    from,
    to,
    month,
    ...(studentId ? { studentId } : {}),
  }), [from, to, month, studentId]);

  useEffect(() => {
    const id = ++studentSearchId.current;
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await api.get("/reports/students", { params: { search: studentSearch.trim() } });
        if (id === studentSearchId.current) setStudents(data.students);
      } catch (cause) {
        if (id === studentSearchId.current) {
          setStudents([]);
          setError(getApiError(cause));
        }
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      if (id === studentSearchId.current) studentSearchId.current += 1;
    };
  }, [studentSearch]);

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    api.get("/reports", { params })
      .then(({ data }) => { if (id === requestId.current) setReport(data.report); })
      .catch((cause) => { if (id === requestId.current) setError(getApiError(cause)); })
      .finally(() => { if (id === requestId.current) setLoading(false); });
    return () => { requestId.current += 1; };
  }, [params]);

  async function exportReport(format) {
    setExporting(format);
    setError("");
    try {
      const { data } = await api.get("/reports/export", {
        params: { ...params, format },
        responseType: "blob",
      });
      const extension = format === "xlsx" ? "xlsx" : "pdf";
      const url = URL.createObjectURL(new Blob([data]));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `arts-coaching-report-${from}-to-${to}.${extension}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setError("The report could not be exported. Please try again.");
    } finally {
      setExporting("");
    }
  }

  const ledger = report?.ledger;
  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION · REPORTS"
        title="Reports"
        description="Review fee collections, student balances, and payment modes."
      />
      {error && <p className="alert alert-error" role="alert"><FiAlertCircle size={18} />{error}</p>}

      <section className="panel report-filter-panel" aria-label="Report filters">
        <div className="panel-heading"><div><h2>Report filters</h2><p>Choose collection dates and a month for pending fees.</p></div></div>
        <div className="report-filters">
          <label>From date<input type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} /></label>
          <label>To date<input type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} /></label>
          <label>Pending-fee month<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label>
          <div className="report-student-select">
            <label htmlFor="report-student-search">Student ledger</label>
            <div className="search-field"><FiSearch size={15} aria-hidden="true" /><input id="report-student-search" value={studentSearch} onChange={(event) => { setStudentId(""); setStudentSearch(event.target.value); }} placeholder="Search students…" maxLength="100" /><button className="text-button" type="button" onClick={() => { setStudentId(""); setStudentSearch(""); }}>Clear</button></div>
            {studentSearch && !studentId && (
              <div className="report-student-options">
                {students.length ? students.map((student) => (
                  <button type="button" key={student.id} onClick={() => { setStudentId(String(student.id)); setStudentSearch(`${student.studentCode} · ${student.name}`); }}>{student.studentCode} · {student.name}</button>
                )) : <span>No active students found.</span>}
              </div>
            )}
            {studentId && <small className="report-selected-student">Ledger selected. Clear to remove.</small>}
          </div>
        </div>
        <div className="report-export-actions">
          <span>Daily and ledger range: up to 366 days.</span>
          <div>
            <button className="secondary-button" type="button" onClick={() => exportReport("pdf")} disabled={loading || Boolean(exporting)}><FiFileText size={14} />{exporting === "pdf" ? "Preparing PDF…" : "Export PDF"}</button>
            <button className="secondary-button" type="button" onClick={() => exportReport("xlsx")} disabled={loading || Boolean(exporting)}><FiDownload size={14} />{exporting === "xlsx" ? "Preparing Excel…" : "Export Excel"}</button>
          </div>
        </div>
      </section>

      {report && (
        <>
          <section className="report-charts" aria-busy={loading}>
            <article className="panel report-chart-panel">
              <div className="panel-heading"><div><h2>Monthly collection</h2><p>Collection date · 12 months through {month}</p></div></div>
              <MonthlyChart rows={report.monthlyCollections} />
            </article>
            <article className="panel report-chart-panel">
              <div className="panel-heading"><div><h2>Payment modes</h2><p>Distribution for the selected date range</p></div></div>
              <PaymentModeChart rows={report.paymentModes} />
            </article>
          </section>

          <section className="panel report-panel">
            <div className="panel-heading"><div><h2>Daily collection</h2><p>{from} through {to}</p></div></div>
            <div className="table-scroll"><table className="data-table"><thead><tr><th>Date</th><th>Payments</th><th>Collection</th></tr></thead><tbody>
              {report.dailyCollections.length ? report.dailyCollections.map((row) => <tr key={String(row.date)}><td>{formatDate(row.date)}</td><td>{row.paymentCount}</td><td className="amount-cell">{formatCurrency(row.total)}</td></tr>) : <tr><td className="student-empty-cell" colSpan={3}>No collection in this date range.</td></tr>}
            </tbody></table></div>
          </section>

          <section className="panel report-panel">
            <div className="panel-heading"><div><h2>Pending fees</h2><p>Active students for {month}; pending equals monthly fee less recorded payments, floored at zero.</p></div><strong className="report-pending-total">{formatCurrency(report.pendingTotal)}</strong></div>
            <div className="table-scroll"><table className="data-table"><thead><tr><th>Student</th><th>Course</th><th>Monthly fee</th><th>Paid</th><th>Pending</th></tr></thead><tbody>
              {report.pendingFees.length ? report.pendingFees.map((row) => <tr key={row.studentId}><td><span className="student-name">{row.studentName}</span><small className="fee-history-code">{row.studentCode}</small></td><td>{row.course}</td><td>{formatCurrency(row.monthlyFee)}</td><td>{formatCurrency(row.paid)}</td><td className="amount-cell">{formatCurrency(row.pending)}</td></tr>) : <tr><td className="student-empty-cell" colSpan={5}>No pending fees for this month.</td></tr>}
            </tbody></table></div>
          </section>

          {ledger && (
            <section className="panel report-panel">
              <div className="panel-heading"><div><h2>Student ledger</h2><p>{ledger.student.name} · {ledger.student.studentCode} · {from} through {to}</p></div></div>
              <div className="table-scroll"><table className="data-table"><thead><tr><th>Date</th><th>Receipt</th><th>Mode</th><th>Amount</th><th>Note</th></tr></thead><tbody>
                {ledger.payments.length ? ledger.payments.map((row, index) => <tr key={`${row.receiptNumber || "legacy"}-${index}`}><td>{formatDate(row.date)}</td><td>{row.receiptNumber || "Legacy payment"}</td><td>{row.paymentMode}</td><td className="amount-cell">{formatCurrency(row.amount)}</td><td>{row.note || "—"}</td></tr>) : <tr><td className="student-empty-cell" colSpan={5}>No payments for this student in the selected range.</td></tr>}
              </tbody></table></div>
            </section>
          )}
        </>
      )}
      {!report && loading && <div className="loading-screen report-loading" role="status"><span className="spinner" />Loading reports…</div>}
      <div className="student-page-footer"><FiAlertCircle size={15} aria-hidden="true" />Pending fees are an estimate based on each active student’s monthly fee and recorded payments for the selected calendar month.</div>
    </>
  );
}
