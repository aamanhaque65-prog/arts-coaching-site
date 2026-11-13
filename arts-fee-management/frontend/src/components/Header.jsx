import { FiLogOut, FiMenu, FiX } from "react-icons/fi";
import { useLocation } from "react-router-dom";

export default function Header({ email, menuOpen, onMenuToggle, onSignOut }) {
  const { pathname } = useLocation();

  return (
    <header className="topbar">
      <button
        className="icon-button mobile-menu-button"
        type="button"
        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={menuOpen}
        onClick={onMenuToggle}
      >
        {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
      </button>
      <div className="breadcrumb"><span>Workspace</span><span aria-hidden="true">/</span><strong>{pathname === "/students" ? "Students" : pathname === "/collect-fee" ? "Fee collection" : pathname === "/reports" ? "Reports" : "Dashboard"}</strong></div>
      <div className="topbar-actions">
        <span className="user-email">{email}</span>
        <button className="sign-out" onClick={onSignOut} type="button">
          <FiLogOut size={16} aria-hidden="true" /><span>Sign out</span>
        </button>
      </div>
    </header>
  );
}

export function PageHeading({ eyebrow = "FEE MANAGEMENT", title, description }) {
  return (
    <div className="welcome-row">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="page-description">{description}</p></div>
    </div>
  );
}
