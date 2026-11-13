import { useState } from "react";
import { FaGraduationCap } from "react-icons/fa";
import { FiAlertCircle } from "react-icons/fi";
import { Navigate, useLocation } from "react-router-dom";
import { getApiError } from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { user, loading, signIn } = useAuth();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading) return <main className="loading-screen" aria-live="polite"><span className="spinner" />Checking your administrator session…</main>;
  if (user) return <Navigate to={location.state?.from || "/"} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await signIn(String(formData.get("email")).trim(), String(formData.get("password")));
    } catch (cause) {
      setError(getApiError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-card">
        <div className="login-brand-mark"><FaGraduationCap size={26} aria-hidden="true" /></div>
        <p className="login-brand-name">ART&apos;S Coaching</p>
        <p className="login-tagline">Knowledge Builds Brighter Tomorrows</p>
        <p className="eyebrow">ADMINISTRATOR PORTAL</p>
        <h1>Welcome back</h1>
        <p className="login-copy">Sign in to your secure fee management dashboard.</p>
        {error && <p className="alert alert-error" role="alert"><FiAlertCircle size={18} />{error}</p>}
        <form className="form-stack" onSubmit={handleSubmit}>
          <label>Email address<input name="email" type="email" autoComplete="username" maxLength="254" required /></label>
          <label>Password<input name="password" type="password" autoComplete="current-password" maxLength="200" required /></label>
          <button className="primary-button full-button" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in securely"}</button>
        </form>
        <p className="login-footnote">Authorized administrators only. Contact your system administrator for access.</p>
      </section>
    </main>
  );
}
