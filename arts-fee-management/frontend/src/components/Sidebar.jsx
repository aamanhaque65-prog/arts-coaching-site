import { FaGraduationCap } from "react-icons/fa";
import { FiBarChart2, FiDollarSign, FiHome, FiLock, FiUsers } from "react-icons/fi";
import { Link, NavLink } from "react-router-dom";

const futureFeatures = ["Receipts", "Settings"];

export default function Sidebar({ open, onNavigate }) {
  return (
    <aside className={`sidebar${open ? " sidebar-open" : ""}`}>
      <Link className="brand" to="/" onClick={onNavigate}>
        <span className="brand-mark"><FaGraduationCap size={24} aria-hidden="true" /></span>
        <span><strong>ART&apos;S Coaching</strong><small>FEE MANAGEMENT</small></span>
      </Link>
      <nav className="side-nav" aria-label="Dashboard navigation">
        <p className="nav-caption">WORKSPACE</p>
        <NavLink className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`} end onClick={onNavigate} to="/">
          <FiHome size={18} aria-hidden="true" /><span>Dashboard</span>
        </NavLink>
        <NavLink className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`} onClick={onNavigate} to="/students">
          <FiUsers size={18} aria-hidden="true" /><span>Students</span>
        </NavLink>
        <NavLink className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`} onClick={onNavigate} to="/collect-fee">
          <FiDollarSign size={18} aria-hidden="true" /><span>Fee collection</span>
        </NavLink>
        <NavLink className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`} onClick={onNavigate} to="/reports">
          <FiBarChart2 size={18} aria-hidden="true" /><span>Reports</span>
        </NavLink>
        <p className="nav-caption nav-caption-coming">COMING IN PHASE 2</p>
        {futureFeatures.filter((label) => label !== "Students").map((label) => (
          <span className="nav-link nav-link-disabled" aria-disabled="true" key={label}>
            <FiLock size={15} aria-hidden="true" /><span>{label}</span>
          </span>
        ))}
      </nav>
      <div className="sidebar-note">
        <span className="secure-dot" aria-hidden="true" />
        <p><strong>Administrator access</strong><br />Private workspace</p>
      </div>
    </aside>
  );
}
