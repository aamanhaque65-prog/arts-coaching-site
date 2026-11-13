import { useEffect, useRef, useState } from "react";
import { FiClock, FiDownload, FiPrinter, FiSearch } from "react-icons/fi";
import { api, getApiError } from "../services/api.js";

const EMPTY_PAGINATION = { page: 1, pageSize: 10, total: 0, totalPages: 0 };

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function FeeHistory({ refreshKey }) {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [receiptAction, setReceiptAction] = useState(null);
  const requestId = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const id = ++requestId.current;
    setBusy(true);
    setError("");
    api.get("/fees/history", { params: { page, search } })
      .then(({ data }) => {
        if (id === requestId.current) {
          setPayments(data.payments);
          setPagination(data.pagination);
        }
      })
      .catch((cause) => {
        if (id === requestId.current) setError(getApiError(cause));
      })
      .finally(() => {
        if (id === requestId.current) setBusy(false);
      });
    return () => { requestId.current += 1; };
  }, [page, search, refreshKey]);

  async function handleReceipt(payment, action) {
    let printWindow = null;
    if (action === "print") {
      printWindow = window.open("about:blank", "_blank");
      if (!printWindow) {
        setError("Allow pop-ups to print a receipt, or use Download PDF.");
        return;
      }
      printWindow.opener = null;
      printWindow.document.title = "Preparing receipt";
      printWindow.document.body.textContent = "Preparing receipt…";
    }

    setReceiptAction({ id: payment.id, action });
    setError("");
    try {
      const { data } = await api.get(`/fees/${payment.id}/receipt`, { responseType: "blob" });
      const receiptUrl = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
      if (action === "download") {
        const anchor = document.createElement("a");
        anchor.href = receiptUrl;
        anchor.download = `receipt-${payment.receiptNumber}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(receiptUrl), 60000);
      } else {
        const popup = printWindow;
        popup.onafterprint = () => {
          window.setTimeout(() => URL.revokeObjectURL(receiptUrl), 1000);
        };
        popup.onload = () => window.setTimeout(() => popup.print(), 500);
        popup.location.href = receiptUrl;
        window.setTimeout(() => URL.revokeObjectURL(receiptUrl), 60000);
      }
    } catch {
      if (printWindow && !printWindow.closed) printWindow.close();
      setError("The receipt could not be generated. Please try again.");
    } finally {
      setReceiptAction(null);
    }
  }

  return (
    <section className="panel fee-history-panel" aria-labelledby="fee-history-title">
      <div className="panel-heading fee-history-heading">
        <div><h2 id="fee-history-title">Payment history</h2><p>Recorded fee payments and receipt numbers.</p></div>
        <label className="search-field fee-history-search">
          <FiSearch size={16} aria-hidden="true" />
          <span className="sr-only">Search payment history</span>
          <input
            type="search"
            aria-label="Search payments by student or receipt number"
            placeholder="Search student or receipt"
            maxLength="100"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      <div className="table-scroll">
        <table className="data-table fee-history-table" aria-busy={busy}>
          <thead>
            <tr>
              <th scope="col">Receipt</th>
              <th scope="col">Student</th>
              <th scope="col">Date</th>
              <th scope="col">Mode</th>
              <th scope="col">Amount</th>
              <th scope="col"><span className="sr-only">Receipt actions</span></th>
            </tr>
          </thead>
          <tbody>
            {payments.length ? payments.map((payment) => (
              <tr key={payment.id}>
                <td><span className="receipt-number">{payment.receiptNumber}</span></td>
                <td><span className="student-name">{payment.studentName}</span><small className="fee-history-code">{payment.studentCode}</small></td>
                <td>{formatDate(payment.collectedAt)}</td>
                <td><span className="payment-mode-chip">{payment.paymentMode}</span></td>
                <td className="amount-cell">{formatCurrency(payment.amount)}</td>
                <td>
                  <div className="receipt-actions">
                    <button
                      className="icon-button row-action"
                      type="button"
                      aria-label={`Download receipt ${payment.receiptNumber} as PDF`}
                      title="Download PDF"
                      disabled={Boolean(receiptAction)}
                      onClick={() => handleReceipt(payment, "download")}
                    ><FiDownload size={14} aria-hidden="true" /><span>Download PDF</span></button>
                    <button
                      className="icon-button row-action"
                      type="button"
                      aria-label={`Print receipt ${payment.receiptNumber}`}
                      title="Print receipt"
                      disabled={Boolean(receiptAction)}
                      onClick={() => handleReceipt(payment, "print")}
                    ><FiPrinter size={14} aria-hidden="true" /><span>Print Receipt</span></button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr><td className="student-empty-cell" colSpan={6}>
                <FiClock size={23} aria-hidden="true" />
                <strong>{search ? "No matching payments" : "No payments recorded yet"}</strong>
                <span>{search ? "Try another student name or receipt number." : "Recorded payments will appear here."}</span>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="student-table-footer">
        <span>{pagination.total ? `Showing ${(page - 1) * pagination.pageSize + 1}–${Math.min(page * pagination.pageSize, pagination.total)} of ${pagination.total} payments` : "No payments to display"}</span>
        <nav className="pagination" aria-label="Payment history pages">
          <button className="page-button" type="button" onClick={() => setPage((current) => current - 1)} disabled={busy || page <= 1}>Previous</button>
          <span className="page-current">Page {pagination.totalPages ? page : 0} of {pagination.totalPages}</span>
          <button className="page-button" type="button" onClick={() => setPage((current) => current + 1)} disabled={busy || page >= pagination.totalPages}>Next</button>
        </nav>
      </div>
    </section>
  );
}
