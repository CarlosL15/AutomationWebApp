import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function SignUp() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("Creating account...");

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data: any = await res.json();
      if (!res.ok) {
        setStatus(data?.detail ?? "Registration failed");
        return;
      }

      setStatus("Account created. You can now log in.");
    } catch {
      setStatus("Network error.");
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: 16 }}>
      <h1>Create account</h1>

      <form onSubmit={onSubmit}>
        <label>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          required
          style={{ width: "100%", marginBottom: 12 }}
        />

        <label>Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          required
          minLength={8}
          style={{ width: "100%", marginBottom: 12 }}
        />

        <button type="submit" style={{ width: "100%" }}>
          Create account
        </button>
      </form>

      <p style={{ marginTop: 12 }}>{status}</p>
    </div>
  );
}
