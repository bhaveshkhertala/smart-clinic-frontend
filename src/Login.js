import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginType, setLoginType] = useState("PATIENT");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loginTypes = [
    { value: "PATIENT", label: "Patient", icon: "🧑" },
    { value: "DOCTOR", label: "Doctor", icon: "👨‍⚕️" },
    { value: "CLINIC", label: "Clinic", icon: "🏥" },
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        "https://samrt-clinic-backend.onrender.com/api/users/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            role: loginType,
          }),
        }
      );

      const responseText = await response.text();
      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        setMessage("Invalid response received from SmartClinic server.");
        return;
      }

      if (!response.ok || !data.success) {
        setMessage(
          data.message ||
            "Login failed. Please check your email and password."
        );
        return;
      }

      const role = String(
        data.role || data.user?.role || ""
      )
        .trim()
        .toUpperCase();

      if (!role) {
        setMessage("Account role was not returned by the server.");
        return;
      }

      if (!loginTypes.some((type) => type.value === role)) {
        setMessage("This account role is not supported.");
        return;
      }

      if (role !== loginType) {
        setMessage(
          `This account is registered as ${role}. Please select the correct login type.`
        );
        return;
      }

      localStorage.setItem(
        "smartClinicUser",
        JSON.stringify(data)
      );

      switch (role) {
        case "PATIENT":
          navigate("/dashboard");
          break;

        case "DOCTOR":
          navigate("/doctor-dashboard");
          break;

        case "CLINIC":
          navigate("/clinic-dashboard");
          break;

        default:
          localStorage.removeItem("smartClinicUser");
          setMessage("This account role is not supported.");
      }
    } catch (error) {
      console.error("Login request error:", error);
      setMessage(
        "Unable to connect to SmartClinic server. Please check whether the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-info">
          <div className="brand login-brand">
            <div className="brand-icon">SC</div>
            <div>
              <h2>SmartClinic</h2>
              <span>Queue made simple</span>
            </div>
          </div>

          <div className="login-message">
            <span>SMARTER CLINIC VISITS</span>
            <h1>
              Your clinic visit,
              <br />
              <strong>without the wait.</strong>
            </h1>
            <p>
              Check your queue, track your token and stay informed
              about your consultation.
            </p>
          </div>

          <div className="login-feature">
            <div>✓</div>
            <p>
              <strong>Real-time queue tracking</strong>
              <br />
              Know your position before you arrive.
            </p>
          </div>

          <div className="login-feature">
            <div>✓</div>
            <p>
              <strong>Smart notifications</strong>
              <br />
              Get notified when your turn is close.
            </p>
          </div>
        </div>

        <div className="login-box">
          <div className="login-heading">
            <h2>Welcome back</h2>
            <p>Sign in to continue to your SmartClinic account.</p>
          </div>

          <div className="login-type-section">
            <label className="login-type-label">Login as</label>

            <div className="login-type-options">
              {loginTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`login-type-button ${
                    loginType === type.value ? "active" : ""
                  }`}
                  onClick={() => {
                    setLoginType(type.value);
                    setMessage("");
                  }}
                  aria-pressed={loginType === type.value}
                >
                  <span className="login-type-icon">{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="login-email">Email address</label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <div className="password-label">
                <label htmlFor="login-password">Password</label>
                <button
                  type="button"
                  className="forgot-password"
                  onClick={() =>
                    setMessage(
                      "Please contact SmartClinic support to reset your password."
                    )
                  }
                >
                  Forgot password?
                </button>
              </div>

              <input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {message && (
              <div className="login-error" role="alert">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading
                ? "Signing in..."
                : `Sign in as ${
                    loginTypes.find(
                      (type) => type.value === loginType
                    )?.label || "Patient"
                  }`}
              {!loading && <span>→</span>}
            </button>
          </form>

          <div className="register-link">
            <span>Don't have an account?</span>
            <button
              type="button"
              onClick={() => navigate("/register")}
            >
              Create account
            </button>
          </div>

          <div className="back-home">
            <button type="button" onClick={() => navigate("/")}>
              ← Back to home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
