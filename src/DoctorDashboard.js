import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const API = "http://localhost:8080/api";

function DoctorDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [doctor, setDoctor] = useState(null);
  const [queues, setQueues] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // LOAD DOCTOR PROFILE
  const loadDoctor = useCallback(async (userId) => {
    try {
      const response = await fetch(
        `${API}/doctors/user/${userId}`
      );

      if (!response.ok) {
        throw new Error("Doctor profile not found");
      }

      const data = await response.json();
      setDoctor(data);

      return data;
    } catch (error) {
      console.error("Doctor profile loading error:", error);

      setMessage(
        "Doctor profile could not be found. Please contact SmartClinic administrator."
      );
      setMessageType("error");

      return null;
    }
  }, []);

  // LOAD QUEUE FOR THE LOGGED-IN DOCTOR
  const loadDoctorQueue = useCallback(async (doctorId) => {
    if (!doctorId) {
      setQueues([]);
      return;
    }

    try {
      const response = await fetch(`${API}/queues`);

      if (!response.ok) {
        throw new Error("Failed to load queue");
      }

      const data = await response.json();

      const doctorQueues = (
        Array.isArray(data) ? data : []
      ).filter(
        (queue) =>
          queue?.doctor?.id &&
          Number(queue.doctor.id) === Number(doctorId)
      );

      setQueues(doctorQueues);
    } catch (error) {
      console.error("Queue loading error:", error);

      setMessage("Unable to load your queue.");
      setMessageType("error");
    }
  }, []);

  // LOGIN CHECK AND INITIAL LOAD
  useEffect(() => {
    const savedUser = localStorage.getItem("smartClinicUser");

    if (!savedUser) {
      navigate("/login");
      return;
    }

    try {
      const loggedUser = JSON.parse(savedUser);

      if (
        String(loggedUser.role || "").toUpperCase() !== "DOCTOR"
      ) {
        navigate("/dashboard");
        return;
      }

      setUser(loggedUser);

      const initialize = async () => {
        setLoading(true);

        const doctorData = await loadDoctor(loggedUser.id);

        if (doctorData) {
          await loadDoctorQueue(doctorData.id);
        }

        setLoading(false);
      };

      initialize();
    } catch (error) {
      console.error("Invalid login data:", error);

      localStorage.removeItem("smartClinicUser");
      navigate("/login");
    }
  }, [navigate, loadDoctor, loadDoctorQueue]);

  // AUTO REFRESH EVERY 10 SECONDS
  useEffect(() => {
    if (!doctor?.id) {
      return;
    }

    const interval = setInterval(() => {
      loadDoctorQueue(doctor.id);
    }, 10000);

    return () => clearInterval(interval);
  }, [doctor?.id, loadDoctorQueue]);

  // ILLNESS DESCRIPTION HELPER
  const getDescription = (queue) => {
    const description = queue?.description;

    return typeof description === "string" &&
      description.trim()
      ? description.trim()
      : "Description not provided";
  };

  // PATIENT MOBILE NUMBER HELPER
  const getPatientPhone = (queue) => {
    const phone = queue?.patient?.phone;
    return phone && String(phone).trim()
      ? phone
      : "No mobile number";
  };

  // WAITING PATIENTS: PRIORITY FIRST
  const waitingPatients = useMemo(() => {
    return [...queues]
      .filter(
        (queue) =>
          String(queue.status || "").toUpperCase() === "WAITING"
      )
      .sort((a, b) => {
        const priorityA =
          String(a.priority || "").toUpperCase() === "PRIORITY"
            ? 0
            : 1;

        const priorityB =
          String(b.priority || "").toUpperCase() === "PRIORITY"
            ? 0
            : 1;

        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        return (
          Number(a.tokenNumber || 0) -
          Number(b.tokenNumber || 0)
        );
      });
  }, [queues]);

  // CURRENT PATIENT
  const currentPatient = useMemo(() => {
    return queues.find(
      (queue) =>
        String(queue.status || "").toUpperCase() === "IN_PROGRESS"
    );
  }, [queues]);

  // COMPLETED PATIENTS
  const completedPatients = useMemo(() => {
    return queues.filter(
      (queue) =>
        String(queue.status || "").toUpperCase() === "COMPLETED"
    );
  }, [queues]);

  // CALL NEXT PATIENT
  const callNextPatient = async () => {
    if (!doctor?.id) {
      setMessage("Doctor information is not available.");
      setMessageType("error");
      return;
    }

    if (currentPatient) {
      setMessage(
        `Token ${currentPatient.tokenNumber} is already in progress. Complete this patient first.`
      );
      setMessageType("warning");
      return;
    }

    if (waitingPatients.length === 0) {
      setMessage("No waiting patients for your queue.");
      setMessageType("warning");
      return;
    }

    const nextPatient = waitingPatients[0];

    try {
      setActionLoading(true);
      setMessage("");

      const response = await fetch(
        `${API}/queues/${nextPatient.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            ...nextPatient,
            status: "IN_PROGRESS"
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Unable to call next patient");
      }

      setMessage(
        `Token ${nextPatient.tokenNumber} is now called.`
      );
      setMessageType("success");

      await loadDoctorQueue(doctor.id);
    } catch (error) {
      console.error("Call next error:", error);

      setMessage(
        error.message || "Unable to call next patient."
      );
      setMessageType("error");
    } finally {
      setActionLoading(false);
    }
  };

  // COMPLETE PATIENT
  const completePatient = async (queueId) => {
    try {
      setActionLoading(true);
      setMessage("");

      const response = await fetch(
        `${API}/queues/complete/${queueId}`,
        {
          method: "PUT"
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Unable to complete patient");
      }

      setMessage(
        "Patient consultation completed successfully."
      );
      setMessageType("success");

      await loadDoctorQueue(doctor.id);
    } catch (error) {
      console.error("Complete patient error:", error);

      setMessage(
        error.message || "Unable to complete patient."
      );
      setMessageType("error");
    } finally {
      setActionLoading(false);
    }
  };

  // LOGOUT
  const handleLogout = () => {
    localStorage.removeItem("smartClinicUser");
    navigate("/login");
  };

  // LOADING SCREEN
  if (loading) {
    return (
      <div className="doctor-loading">
        <div className="doctor-loading-card">
          <div className="doctor-spinner"></div>
          <h2>Loading Doctor Dashboard...</h2>
          <p>
            Please wait while we prepare your clinic queue.
          </p>
        </div>
      </div>
    );
  }

  // NO DOCTOR PROFILE
  if (!doctor) {
    return (
      <div className="doctor-loading">
        <div className="doctor-loading-card">
          <h2>Doctor profile not found</h2>
          <p>
            This login account is not linked with a
            SmartClinic doctor profile.
          </p>
          <button
            className="doctor-logout-button"
            onClick={handleLogout}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // MAIN DASHBOARD
  return (
    <div className="doctor-dashboard-page">
      <div className="doctor-bg-orb doctor-bg-orb-one"></div>
      <div className="doctor-bg-orb doctor-bg-orb-two"></div>

      {/* HEADER */}
      <header className="doctor-dashboard-header">
        <div className="doctor-header-left">
          <div className="doctor-logo-icon">🩺</div>

          <div>
            <h1>Smart Clinic</h1>
            <p>Doctor Dashboard</p>
          </div>
        </div>

        <div className="doctor-header-right">
          <div className="doctor-online-status">
            <span></span>
            Live
          </div>

          <button
            className="doctor-logout-button"
            onClick={handleLogout}
          >
            <span>↪</span>
            Logout
          </button>
        </div>
      </header>

      <main className="doctor-dashboard-container">
        {/* WELCOME */}
        <section className="doctor-welcome-section">
          <div>
            <p className="doctor-small-label">WELCOME BACK</p>

            <h2>
              Hello, Dr.{" "}
              {doctor.name || user?.name || "Doctor"} 👋
            </h2>

            <p>
              Manage your patients and monitor your live queue
              from one place.
            </p>
          </div>

          <div className="doctor-live-indicator">
            <span className="doctor-live-dot"></span>
            Queue updating automatically
          </div>
        </section>

        {/* MESSAGE */}
        {message && (
          <div
            className={`doctor-message doctor-message-${messageType}`}
          >
            <span>
              {messageType === "success"
                ? "✓"
                : messageType === "warning"
                ? "⚠"
                : "!"}
            </span>
            {message}
          </div>
        )}

        {/* DOCTOR PROFILE */}
        <section className="doctor-profile-card">
          <div className="doctor-profile-avatar">👨‍⚕️</div>

          <div className="doctor-profile-info">
            <p className="doctor-profile-label">CURRENT DOCTOR</p>

            <h2>{doctor.name}</h2>

            <p className="doctor-specialization">
              {doctor.specialization || "Medical Specialist"}
            </p>

            <div className="doctor-profile-details">
              <span>
                🏥 {doctor.clinic?.name || "Smart Clinic"}
              </span>

              <span>
                ⏱️ {doctor.consultationTime || 15} min consultation
              </span>
            </div>
          </div>
        </section>

        {/* STATISTICS */}
        <section className="doctor-stat-grid">
          <div className="doctor-stat-card">
            <div className="doctor-stat-icon blue">👥</div>
            <div>
              <span>Total Patients</span>
              <strong>{queues.length}</strong>
            </div>
          </div>

          <div className="doctor-stat-card">
            <div className="doctor-stat-icon orange">⏳</div>
            <div>
              <span>Waiting</span>
              <strong>{waitingPatients.length}</strong>
            </div>
          </div>

          <div className="doctor-stat-card">
            <div className="doctor-stat-icon green">✓</div>
            <div>
              <span>Completed</span>
              <strong>{completedPatients.length}</strong>
            </div>
          </div>

          <div className="doctor-stat-card">
            <div className="doctor-stat-icon purple">🎫</div>
            <div>
              <span>Current Token</span>
              <strong>
                {currentPatient
                  ? `#${currentPatient.tokenNumber}`
                  : "--"}
              </strong>
            </div>
          </div>
        </section>

        {/* CURRENT PATIENT */}
        <section className="doctor-current-card">
          <div className="doctor-card-heading">
            <div>
              <p className="doctor-section-label">
                CURRENT CONSULTATION
              </p>
              <h2>Patient being served</h2>
            </div>

            {currentPatient && (
              <span className="doctor-live-badge">
                ● IN PROGRESS
              </span>
            )}
          </div>

          {currentPatient ? (
            <div className="current-patient-content">
              <div className="current-token">
                <span>TOKEN</span>
                <strong>#{currentPatient.tokenNumber}</strong>
              </div>

              <div className="current-patient-info">
                <h3>
                  {currentPatient.patient?.name || "Patient"}
                </h3>

                <p>
                  📧 {currentPatient.patient?.email ||
                    "Email not available"}
                </p>

                <p>
                  📱 {getPatientPhone(currentPatient)}
                </p>

                <p className="patient-illness-description">
                  🩺 <strong>Illness / Problem:</strong>{" "}
                  {getDescription(currentPatient)}
                </p>
              </div>

              <button
                className="complete-patient-button"
                onClick={() =>
                  completePatient(currentPatient.id)
                }
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Processing..."
                  : "✓ Complete Patient"}
              </button>
            </div>
          ) : (
            <div className="no-current-patient">
              <div className="empty-patient-icon">🪑</div>

              <div>
                <h3>
                  No patient currently in consultation
                </h3>
                <p>
                  Call the next patient from the waiting queue.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* NEXT PATIENT */}
        <section className="doctor-call-next-section">
          <div>
            <p className="doctor-section-label">NEXT IN QUEUE</p>

            {waitingPatients.length > 0 ? (
              <h2>
                Token #{waitingPatients[0].tokenNumber}{" "}
                <span>
                  {waitingPatients[0].patient?.name || "Patient"}
                </span>
              </h2>
            ) : (
              <h2>No waiting patients</h2>
            )}
          </div>

          <button
            className="call-next-button"
            onClick={callNextPatient}
            disabled={
              actionLoading ||
              waitingPatients.length === 0 ||
              !!currentPatient
            }
          >
            <span className="call-next-icon">📢</span>
            {actionLoading
              ? "Processing..."
              : "Call Next Patient"}
          </button>
        </section>

        {/* WAITING QUEUE */}
        <section className="doctor-queue-card">
          <div className="doctor-card-heading">
            <div>
              <p className="doctor-section-label">LIVE QUEUE</p>
              <h2>Waiting Patients</h2>
            </div>

            <div className="queue-count">
              {waitingPatients.length} waiting
            </div>
          </div>

          {waitingPatients.length === 0 ? (
            <div className="empty-queue">
              <div className="empty-queue-icon">🎉</div>
              <h3>No patients waiting</h3>
              <p>The waiting queue is currently empty.</p>
            </div>
          ) : (
            <div className="doctor-table-wrapper">
              <table className="doctor-queue-table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Patient</th>
                    <th>Illness / Problem</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Wait Time</th>
                  </tr>
                </thead>

                <tbody>
                  {waitingPatients.map((queue) => (
                    <tr key={queue.id}>
                      <td>
                        <span className="queue-token">
                          #{queue.tokenNumber}
                        </span>
                      </td>

                      <td>
                        <div className="queue-patient">
                          <div className="queue-patient-avatar">
                            {(queue.patient?.name || "P")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {queue.patient?.name || "Patient"}
                            </strong>
                            <small>
                              {getPatientPhone(queue)}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="patient-illness-description">
                          {getDescription(queue)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            String(queue.priority || "").toUpperCase() ===
                            "PRIORITY"
                              ? "priority-high"
                              : "priority-normal"
                          }
                        >
                          {queue.priority || "NORMAL"}
                        </span>
                      </td>

                      <td>
                        <span className="waiting-status">
                          <span></span>
                          WAITING
                        </span>
                      </td>

                      <td>
                        <span>
                          {queue.estimatedWaitTime || 0} min
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* COMPLETED PATIENTS */}
        {completedPatients.length > 0 && (
          <section className="doctor-queue-card">
            <div className="doctor-card-heading">
              <div>
                <p className="doctor-section-label">TODAY</p>
                <h2>Completed Consultations</h2>
              </div>

              <div className="queue-count completed-count">
                {completedPatients.length} completed
              </div>
            </div>

            <div className="doctor-table-wrapper">
              <table className="doctor-queue-table">
                <thead>
                  <tr>
                    <th>Token</th>
                    <th>Patient</th>
                    <th>Illness / Problem</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {completedPatients.map((queue) => (
                    <tr key={queue.id}>
                      <td>
                        <span className="queue-token">
                          #{queue.tokenNumber}
                        </span>
                      </td>

                      <td>
                        <div className="queue-patient">
                          <div className="queue-patient-avatar">
                            {(queue.patient?.name || "P")
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {queue.patient?.name || "Patient"}
                            </strong>
                            <small>
                              {getPatientPhone(queue)}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="patient-illness-description">
                          {getDescription(queue)}
                        </span>
                      </td>

                      <td>
                        <span className="completed-status">
                          ✓ COMPLETED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default DoctorDashboard;
