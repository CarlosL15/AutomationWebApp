import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function Login() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("Signing in...");

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data: any = await res.json();
      if (!res.ok) {
        setStatus(data?.detail ?? "Login failed");
        return;
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_name", data.user_name);
      setStatus("Logged in successfully!");
      
      setTimeout(() => navigate("/dashboard"), 500);
    } catch {
      setStatus("Network error.");
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    marginBottom: 16,
    borderRadius: 6,
    border: "1px solid #444",
    backgroundColor: "#2a2a2a",
    color: "#fff",
    fontSize: "14px",
  };

  const labelStyle = {
    display: "block",
    marginBottom: 6,
    fontWeight: 500,
    color: "#ccc",
  };

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Login</h1>
      <p style={{ color: "#888", marginBottom: 24 }}>
        Welcome back! Please sign in to continue.
      </p>

      <form onSubmit={onSubmit}>
        <label style={labelStyle}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          placeholder="your@email.com"
          style={inputStyle}
        />

        <label style={labelStyle}>Password</label>
        <div style={{ position: "relative" }}>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            required
            placeholder="Enter your password"
            style={{ ...inputStyle, paddingRight: 80 }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: 10,
              top: "50%",
              transform: "translateY(-70%)",
              background: "none",
              border: "none",
              color: "#646cff",
              cursor: "pointer",
              fontSize: "13px",
              padding: "4px 8px",
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "12px",
            backgroundColor: "#646cff",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: "16px",
            fontWeight: 500,
            cursor: "pointer",
            marginTop: 8,
          }}
        >
          Sign in
        </button>
      </form>

      {status && (
        <p
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 6,
            backgroundColor: status.includes("successfully") ? "#1a3a1a" : "#3a1a1a",
            color: status.includes("successfully") ? "#4ade80" : "#f87171",
          }}
        >
          {status}
        </p>
      )}
    </div>
  );
}