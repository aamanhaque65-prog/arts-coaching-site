import { useEffect, useState } from "react";
import { FiAlertCircle, FiDollarSign, FiUsers } from "react-icons/fi";
import { Link } from "react-router-dom";
import { PageHeading } from "../components/Header.jsx";
import StatsCard from "../components/StatsCard.jsx";
import { api, getApiError } from "../services/api.js";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function formatCurrency(value) {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) return "—";
  return currency.format(Number(value) || 0);
}

function CollectionChart({ data }) {
  const width = 720;
  const height = 220;
  const padding = { top: 16, right: 12, bottom: 30, left: 12 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maximum = Math.max(1, ...data.map((point) => point.total));
  const points = data.map((point, index) => ({
    ...point,
    x: padding.left + (data.length < 2 ? chartWidth / 2 : (index * chartWidth) / (data.length - 1)),
    y: padding.top + chartHeight - (point.total / maximum) * chartHeight,
  }));
  const line = points.map(({ x, y }, index) => `${index ? "L" : "M"} ${x} ${y}`).join(" ");
  const area = points.length
    ? `${line} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
    : "";
  const total = data.reduce((sum, point) => sum + point.total, 0);

  return (
    <div className="chart" role="img" aria-label="Monthly fee collection trend">
      <div className="chart-total">{formatCurrency(total)}<span> collected in the last six months</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => {
          const y = padding.top + (index * chartHeight) / 3;
          return <line key={index} x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="chart-gridline" />;
        })}
        {area && <path d={area} className="chart-area" />}
        {line && <path d={line} className="chart-line" />}
        {points.map((point) => <circle key={point.month} cx={point.x} cy={point.y} r="4" className="chart-point"><title>{`${point.label}: ${formatCurrency(point.total)}`}</title></circle>)}
        {points.map((point) => <text key={`label-${point.month}`} x={point.x} y={height - 5} textAnchor="middle" className="chart-label">{point.label}</text>)}
      </svg>
    </div>
  );
}

function latestSixMonths(collections = []) {
  const today = new Date();
  const totals = new Map(collections.map((point) => [point.month, Number(point.total)]));
  return Array.from({ length: 6 }, (_value, index) => {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - 5 + index, 1);
    const month = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;
    return {
      month,
      label: monthDate.toLocaleDateString("en-IN", { month: "short" }),
      total: totals.get(month) || 0,
    };
  });
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get("/dashboard/summary")
      .then(({ data }) => { if (active) setSummary(data.summary); })
      .catch((cause) => { if (active) setError(getApiError(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const monthlyData = latestSixMonths(summary?.collectionByMonth);
  return (
    <>
      <PageHeading
        eyebrow="ART'S COACHING · ADMINISTRATION"
        title="Dashboard"
        description="A clear overview of your coaching centre’s fee activity."
      />
      {error && <p className="alert alert-error" role="alert"><FiAlertCircle size={18} />{error}</p>}
      <section className="stats-grid" aria-label="Fee collection summary" aria-busy={loading}>
        <StatsCard label="Monthly collection" value={formatCurrency(summary?.monthlyCollection)} helper={`${summary?.paymentsThisMonth ?? 0} payments recorded`} icon="collected" tone="green" />
        <StatsCard label="Pending fees" value={formatCurrency(summary?.pendingFees)} helper="Estimated remaining against monthly fees" icon="outstanding" tone="amber" />
        <StatsCard label="Total students" value={summary ? String(summary.totalStudents) : loading ? "…" : "—"} helper="Enrolled student profiles" icon="students" tone="blue" />
        <StatsCard label="Today's collection" value={formatCurrency(summary?.todaysCollection)} helper="Payments recorded today" icon="collected" tone="violet" />
        <StatsCard label="Payments this month" value={summary ? String(summary.paymentsThisMonth) : loading ? "…" : "—"} helper="Recorded in the current month" icon="payments" tone="violet" />
      </section>
      <section className="content-grid lower-grid">
        <article className="panel collection-panel">
          <div className="panel-heading"><div><h2>Collection overview</h2><p>Recorded fee payments by month</p></div><span className="period-chip">Last 6 months</span></div>
          <CollectionChart data={monthlyData} />
        </article>
        <article className="panel phase-panel">
          <div className="panel-heading"><div><h2>Fee collection</h2><p>Record a student payment and issue its receipt.</p></div><span className="panel-icon"><FiDollarSign size={18} /></span></div>
          <div className="phase-summary">
            <p><FiDollarSign aria-hidden="true" /><span>Accept cash, UPI, or bank transfer</span></p>
            <Link className="dashboard-student-link" to="/collect-fee">Collect a fee <span aria-hidden="true">→</span></Link>
          </div>
        </article>
      </section>
      <section className="content-grid lower-grid">
        <article className="panel phase-panel">
          <div className="panel-heading"><div><h2>Student management</h2><p>Keep student, guardian, and course details together.</p></div><span className="panel-icon"><FiUsers size={18} /></span></div>
          <div className="phase-summary">
            <p><FiUsers aria-hidden="true" /><span>Search and manage active students</span></p>
            <Link className="dashboard-student-link" to="/students">Open student directory <span aria-hidden="true">→</span></Link>
          </div>
        </article>
      </section>
      <footer className="dashboard-footer"><span>ART&apos;S Coaching · Knowledge Builds Brighter Tomorrows</span><span>Private administrator workspace</span></footer>
    </>
  );
}
