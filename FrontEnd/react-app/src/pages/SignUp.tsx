import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function SignUp() {
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("");
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("Creating account...");

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        }),
      });

      const data: any = await res.json();
      if (!res.ok) {
        setStatus(data?.detail ?? "Registration failed");
        return;
      }

      setStatus("Account created! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
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
      <h1 style={{ marginBottom: 8 }}>Create account</h1>
      <p style={{ color: "#888", marginBottom: 24 }}>
        Fill in your details to get started
      </p>

      <form onSubmit={onSubmit}>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>First Name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              type="text"
              required
              placeholder="John"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Last Name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              type="text"
              required
              placeholder="Doe"
              style={inputStyle}
            />
          </div>
        </div>

        <label style={labelStyle}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          placeholder="john.doe@example.com"
          style={inputStyle}
        />

        <label style={labelStyle}>Password</label>
        <div style={{ position: "relative" }}>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            placeholder="Minimum 8 characters"
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
          Create account
        </button>
      </form>

      {status && (
        <p
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 6,
            backgroundColor: status.includes("created") ? "#1a3a1a" : "#3a1a1a",
            color: status.includes("created") ? "#4ade80" : "#f87171",
          }}
        >
          {status}
        </p>
      )}
    </div>
  );
}