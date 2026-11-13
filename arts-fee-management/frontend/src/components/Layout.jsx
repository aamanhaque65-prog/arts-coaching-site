import { useState } from "react";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";

export default function Layout({ children, email, error, onSignOut }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      {menuOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <div className="main-column">
        <Header
          email={email}
          menuOpen={menuOpen}
          onMenuToggle={() => setMenuOpen((open) => !open)}
          onSignOut={onSignOut}
        />
        <main className="dashboard-content">
          {error && <p className="alert alert-error" role="alert">{error}</p>}
          {children}
        </main>
      </div>
    </div>
  );
}
