import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";

export default function App() {
  return (
    <BrowserRouter>
      <nav
        style={{
          display: "flex",
          gap: 16,
          padding: "16px 24px",
          backgroundColor: "#1a1a2e",
          borderBottom: "1px solid #2a2a3e",
        }}
      >
        <Link
          to="/login"
          style={{
            color: "#646cff",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Login
        </Link>
        <Link
          to="/signup"
          style={{
            color: "#646cff",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Create Account
        </Link>
        <Link
          to="/dashboard"
          style={{
            color: "#646cff",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Dashboard
        </Link>
      </nav>

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}