import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

function Register() {
  const navigate = useNavigate();

  const [registerType, setRegisterType] = useState("PATIENT");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    specialization: "",
    consultationTime: "",
    clinicId: "",
    clinicName: "",
    address: "",
    city: "",
    clinicPhone: "",
  });

  const [clinics, setClinics] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);
  const [clinicLoading, setClinicLoading] = useState(false);

  useEffect(() => {
    if (registerType !== "DOCTOR") return;

    const loadClinics = async () => {
      setClinicLoading(true);
      setMessage("");

      try {
        const response = await fetch(
          "https://samrt-clinic-backend.onrender.com/api/clinics"
        );

        if (!response.ok) {
          throw new Error("Failed to load clinics.");
        }

        const data = await response.json();
        setClinics(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Clinic loading error:", error);
        setClinics([]);
        setMessage(
          "Unable to load clinics. Please make sure the server is running."
        );
        setMessageType("error");
      } finally {
        setClinicLoading(false);
      }
    };

    loadClinics();
  }, [registerType]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
    setMessageType("");
  };

  const handleRegisterTypeChange = (type) => {
    setRegisterType(type);

    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      specialization: "",
      consultationTime: "",
      clinicId: "",
      clinicName: "",
      address: "",
      city: "",
      clinicPhone: "",
    });

    setMessage("");
    setMessageType("");
  };

  const readResponse = async (response) => {
    const text = await response.text();

    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { message: text };
    }
  };

  const registerUser = async (role) => {
    const userData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      password: formData.password,
      role,
    };

    const response = await fetch(
      "https://samrt-clinic-backend.onrender.com/api/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      }
    );

    const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Unable to register ${role.toLowerCase()}.`
      );
    }

    return data;
  };

  const registerDoctor = async () => {
    if (!formData.specialization.trim()) {
      throw new Error("Please enter your specialization.");
    }

    if (
      !formData.consultationTime ||
      Number(formData.consultationTime) <= 0
    ) {
      throw new Error("Please enter a valid consultation time.");
    }

    if (!formData.clinicId) {
      throw new Error("Please select a clinic.");
    }

    const user = await registerUser("DOCTOR");

    if (!user?.id) {
      throw new Error(
        "Doctor login account was created, but its user ID was not returned by the server."
      );
    }

    const doctorData = {
      name: formData.name.trim(),
      specialization: formData.specialization.trim(),
      phone: formData.phone.trim(),
      consultationTime: Number(formData.consultationTime),
      user: { id: user.id },
      clinic: { id: Number(formData.clinicId) },
    };

    const response = await fetch(
     "https://samrt-clinic-backend.onrender.com/api/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(doctorData),
      }
    );

    const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Doctor account exists, but doctor profile creation failed. Check the backend error before registering again."
      );
    }

    return data;
  };

  const registerClinic = async () => {
    if (!formData.clinicName.trim()) {
      throw new Error("Please enter the clinic name.");
    }

    if (!formData.address.trim()) {
      throw new Error("Please enter the clinic address.");
    }

    if (!formData.city.trim()) {
      throw new Error("Please enter the clinic city.");
    }

    if (!formData.clinicPhone.trim()) {
      throw new Error("Please enter the clinic phone number.");
    }

    const clinicOwnerData = {
      ownerName: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      password: formData.password,
      clinicName: formData.clinicName.trim(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      clinicPhone: formData.clinicPhone.trim(),
    };

    const response = await fetch(
      "https://samrt-clinic-backend.onrender.com/api/clinics/register-owner",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clinicOwnerData),
      }
    );

    const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(data.message || "Clinic registration failed.");
    }

    return data;
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    setMessage("");
    setMessageType("");
    setLoading(true);

    try {
      if (!formData.name.trim()) {
        throw new Error("Please enter your full name.");
      }

      if (!formData.email.trim()) {
        throw new Error("Please enter your email address.");
      }

      if (!formData.phone.trim()) {
        throw new Error("Please enter your phone number.");
      }

      if (!formData.password.trim()) {
        throw new Error("Please enter a password.");
      }

      if (registerType === "PATIENT") {
        await registerUser("PATIENT");
      } else if (registerType === "DOCTOR") {
        await registerDoctor();
      } else if (registerType === "CLINIC") {
        await registerClinic();
      }

      const successMessages = {
        PATIENT: "Patient account created successfully. Please login.",
        DOCTOR: "Doctor account created successfully. Please login.",
        CLINIC: "Clinic registered successfully. Please login.",
      };

      setMessage(successMessages[registerType]);
      setMessageType("success");

      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      console.error("Registration error:", error);

      setMessage(
        error.message || "Unable to connect to SmartClinic server."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const registrationTypes = [
    { value: "PATIENT", label: "Patient", icon: "🧑" },
    { value: "DOCTOR", label: "Doctor", icon: "👨‍⚕️" },
    { value: "CLINIC", label: "Clinic", icon: "🏥" },
  ];

  const submitLabel = {
    PATIENT: "Create Patient Account",
    DOCTOR: "Create Doctor Account",
    CLINIC: "Register Clinic",
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
            <span>JOIN SMARTCLINIC</span>
            <h1>
              Better visits,
              <br />
              <strong>less waiting.</strong>
            </h1>
            <p>
              Create your SmartClinic account and manage clinic
              visits with digital queue tracking.
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
              Stay informed about your consultation.
            </p>
          </div>
        </div>

        <div className="login-box">
          <div className="login-heading">
            <h2>Create account</h2>
            <p>Choose your account type to get started.</p>
          </div>

          <div className="login-type-section">
            <label className="login-type-label">Register as</label>

            <div className="login-type-options">
              {registrationTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  className={`login-type-button ${
                    registerType === type.value ? "active" : ""
                  }`}
                  onClick={() =>
                    handleRegisterTypeChange(type.value)
                  }
                  aria-pressed={registerType === type.value}
                >
                  <span className="login-type-icon">{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label>
                {registerType === "CLINIC"
                  ? "Owner full name"
                  : registerType === "DOCTOR"
                  ? "Doctor full name"
                  : "Patient full name"}
              </label>
              <input
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Email address</label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Phone number</label>
              <input
                type="tel"
                name="phone"
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="Create password"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            {registerType === "DOCTOR" && (
              <>
                <div className="form-group">
                  <label>Specialization</label>
                  <input
                    type="text"
                    name="specialization"
                    placeholder="e.g. Cardiologist"
                    value={formData.specialization}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Consultation time (minutes)</label>
                  <input
                    type="number"
                    name="consultationTime"
                    placeholder="e.g. 15"
                    min="1"
                    value={formData.consultationTime}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Select clinic</label>
                  <select
                    name="clinicId"
                    value={formData.clinicId}
                    onChange={handleChange}
                    required
                    disabled={clinicLoading}
                  >
                    <option value="">
                      {clinicLoading
                        ? "Loading clinics..."
                        : "Select a clinic"}
                    </option>

                    {clinics.map((clinic) => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name}
                        {clinic.city ? ` - ${clinic.city}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {registerType === "CLINIC" && (
              <>
                <div className="form-group">
                  <label>Clinic name</label>
                  <input
                    type="text"
                    name="clinicName"
                    placeholder="e.g. City Care Clinic"
                    value={formData.clinicName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Clinic address</label>
                  <input
                    type="text"
                    name="address"
                    placeholder="Enter clinic address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    name="city"
                    placeholder="Enter city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Clinic phone number</label>
                  <input
                    type="tel"
                    name="clinicPhone"
                    placeholder="Enter clinic phone number"
                    value={formData.clinicPhone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </>
            )}

            {message && (
              <div
                className={
                  messageType === "success"
                    ? "login-success"
                    : "login-error"
                }
                role="status"
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading
                ? "Creating account..."
                : submitLabel[registerType]}
              {!loading && <span>→</span>}
            </button>
          </form>

          <div className="register-link">
            Already have an account?
            <button
              type="button"
              onClick={() => navigate("/login")}
            >
              Sign in
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

export default Register;