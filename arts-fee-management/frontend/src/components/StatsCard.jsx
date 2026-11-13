import { FiAlertCircle, FiCreditCard, FiDollarSign, FiUsers } from "react-icons/fi";

const iconMap = {
  students: FiUsers,
  collected: FiDollarSign,
  outstanding: FiAlertCircle,
  payments: FiCreditCard,
};

export default function StatsCard({ label, value, helper, tone = "blue", icon = "students" }) {
  const Icon = iconMap[icon] || FiUsers;
  return (
    <article className="stat-card">
      <div className={`stat-icon stat-icon-${tone}`}><Icon size={19} aria-hidden="true" /></div>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-helper">{helper}</p>
    </article>
  );
}
