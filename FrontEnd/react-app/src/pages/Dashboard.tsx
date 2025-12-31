import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [userName, setUserName] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const storedName = localStorage.getItem("user_name");

    if (!token) {
      navigate("/login");
      return;
    }

    if (storedName) {
      setUserName(storedName);
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_name");
    navigate("/login");
  };

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "60px auto",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "#1a1a2e",
          borderRadius: 12,
          padding: 40,
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
        }}
      >
        <h1
          style={{
            fontSize: "2.5rem",
            marginBottom: 16,
            background: "linear-gradient(90deg, #646cff, #a855f7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Welcome, {userName || "User"}!
        </h1>
        <p style={{ color: "#888", fontSize: "1.1rem", marginBottom: 32 }}>
          You're now logged in to your social media automation dashboard.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 20,
            marginTop: 32,
          }}
        >
          <div
            style={{
              backgroundColor: "#2a2a3e",
              padding: 24,
              borderRadius: 8,
              border: "1px solid #3a3a4e",
            }}
          >
            <h3 style={{ color: "#646cff", marginBottom: 8 }}>📱 Accounts</h3>
            <p style={{ color: "#888", fontSize: "0.9rem" }}>
              Connect your social media accounts
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#2a2a3e",
              padding: 24,
              borderRadius: 8,
              border: "1px solid #3a3a4e",
            }}
          >
            <h3 style={{ color: "#646cff", marginBottom: 8 }}>📝 Posts</h3>
            <p style={{ color: "#888", fontSize: "0.9rem" }}>
              Create and manage your posts
            </p>
          </div>

          <div
            style={{
              backgroundColor: "#2a2a3e",
              padding: 24,
              borderRadius: 8,
              border: "1px solid #3a3a4e",
            }}
          >
            <h3 style={{ color: "#646cff", marginBottom: 8 }}>📊 Analytics</h3>
            <p style={{ color: "#888", fontSize: "0.9rem" }}>
              View your engagement metrics
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            marginTop: 40,
            padding: "12px 32px",
            backgroundColor: "transparent",
            color: "#f87171",
            border: "1px solid #f87171",
            borderRadius: 6,
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}