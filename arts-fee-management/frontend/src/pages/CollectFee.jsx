import { useState } from "react";
import { FiAlertCircle, FiDollarSign } from "react-icons/fi";
import { PageHeading } from "../components/Header.jsx";
import StatsCard from "../components/StatsCard.jsx";
import FeeForm from "../components/FeeForm.jsx";
import FeeHistory from "../components/FeeHistory.jsx";

export default function CollectFee() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [notice, setNotice] = useState("");

  function handleCollected(payment) {
    setRefreshKey((current) => current + 1);
    setNotice(`Payment recorded successfully. Receipt number: ${payment.receiptNumber}.`);
  }

  return (
    <>
      <PageHeading
        eyebrow="ADMINISTRATION · FEES"
        title="Fee collection"
        description="Record student payments and review their receipt history."
      />
      {notice && <p className="alert alert-success" role="status"><FiAlertCircle size={17} />{notice}</p>}
      <section className="stats-grid fee-summary" aria-label="Fee collection">
        <StatsCard label="Payment modes" value="3" helper="Cash · UPI · Bank Transfer" icon="collected" tone="green" />
      </section>
      <FeeForm onCollected={handleCollected} />
      <FeeHistory refreshKey={refreshKey} />
      <div className="student-page-footer"><FiDollarSign size={15} aria-hidden="true" />Receipt numbers are generated uniquely for every saved payment.</div>
    </>
  );
}
