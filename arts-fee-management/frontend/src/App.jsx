import { useState } from "react";
import { Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import CollectFee from "./pages/CollectFee.jsx";
import Login from "./pages/Login.jsx";
import Reports from "./pages/Reports.jsx";
import Students from "./pages/Students.jsx";
import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";

function ProtectedWorkspace() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  async function handleSignOut() {
    try {
      await signOut();
      navigate("/login", { replace: true });
    } catch (cause) {
      setError(cause.message || "Could not sign out.");
    }
  }

  return (
    <Layout
      email={user.email}
      error={error}
      onSignOut={handleSignOut}
    ><Outlet /></Layout>
  );
}

function ApplicationRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><ProtectedWorkspace /></ProtectedRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/collect-fee" element={<CollectFee />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return <AuthProvider><ApplicationRoutes /></AuthProvider>;
}
