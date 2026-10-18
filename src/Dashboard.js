
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const API_BASE_URL = "https://samrt-clinic-backend.onrender.com/api";
const REFRESH_INTERVAL = 15000;

function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [queues, setQueues] = useState([]);
  const [myQueues, setMyQueues] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [clinicShifts, setClinicShifts] = useState({});
  const [queueInfo, setQueueInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [joiningQueue, setJoiningQueue] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationBusyId, setNotificationBusyId] = useState(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [searchText, setSearchText] = useState("");
  const [illnessDescription, setIllnessDescription] = useState("");
  const [activeTokenAttempt, setActiveTokenAttempt] = useState(false);

  const activeQueue = myQueues.find((q) =>
    ["WAITING", "IN_PROGRESS"].includes(
      String(q?.status || "").toUpperCase()
    )
  );

  const getClinicId = (doctor) =>
    doctor?.clinic?.id ??
    doctor?.clinicId ??
    doctor?.clinicID ??
    null;

  const getClinicName = (doctor) =>
    doctor?.clinic?.name ||
    doctor?.clinicName ||
    "Clinic not available";

  const getSpecialization = (doctor) =>
    doctor?.specialization ||
    doctor?.speciality ||
    doctor?.specialty ||
    doctor?.department ||
    doctor?.expertise ||
    "General Physician";

  const getAddress = (clinic) =>
    [clinic?.address, clinic?.city].filter(Boolean).join(", ") ||
    "Location not available";

  const clinicDoctors = (clinicId) =>
    doctors.filter(
      (doctor) => Number(getClinicId(doctor)) === Number(clinicId)
    );

  const doctorQueues = (doctorId) =>
    queues.filter(
      (queue) => Number(queue?.doctor?.id) === Number(doctorId)
    );

  const doctorWaiting = (doctorId) =>
    doctorQueues(doctorId).filter(
      (queue) => String(queue.status).toUpperCase() === "WAITING"
    );

  const clinicWaiting = (clinicId) => {
    const doctorIds = clinicDoctors(clinicId).map((doctor) =>
      Number(doctor.id)
    );

    return queues.filter(
      (queue) =>
        String(queue.status).toUpperCase() === "WAITING" &&
        doctorIds.includes(Number(queue?.doctor?.id))
    ).length;
  };

  const doctorWait = (doctor) => {
    const waiting = doctorWaiting(doctor.id);

    const waits = waiting
      .map((queue) => Number(queue.estimatedWaitTime))
      .filter((value) => Number.isFinite(value) && value >= 0);

    return waits.length
      ? Math.max(...waits)
      : waiting.length * (Number(doctor.consultationTime) || 15);
  };

  const unreadCount = notifications.filter(
    (notification) => notification.status === "UNREAD"
  ).length;

  // All clinic time calculations use India Standard Time.
  const getTodayInIndia = () =>
    new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "Asia/Kolkata",
    })
      .format(new Date())
      .toUpperCase();

  const getIndiaMinutes = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Asia/Kolkata",
    }).formatToParts(new Date());

    const hour = Number(
      parts.find((part) => part.type === "hour")?.value
    );

    const minute = Number(
      parts.find((part) => part.type === "minute")?.value
    );

    return hour * 60 + minute;
  };

  const timeToMinutes = (time) => {
    if (!time) return null;

    const parts = String(time).split(":");
    if (parts.length < 2) return null;

    const hour = Number(parts[0]);
    const minute = Number(parts[1]);

    if (
      !Number.isInteger(hour) ||
      !Number.isInteger(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return null;
    }

    return hour * 60 + minute;
  };

  const formatClinicTime = (time) => {
    const minutes = timeToMinutes(time);

    if (minutes === null) return "Not configured";

    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;

    return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
  };

  const getClinicHours = (clinicId) => {
    const entry = clinicShifts[String(clinicId)];

    if (!entry || entry.loading || entry.error) {
      return {
        status: "UNKNOWN",
        label: entry?.error
          ? "Unable to load working hours"
          : "Loading working hours...",
        shifts: [],
      };
    }

    const shifts = Array.isArray(entry.shifts) ? entry.shifts : [];

    if (shifts.length === 0) {
      return {
        status: "CLOSED",
        label: "No working hours configured for today",
        shifts: [],
      };
    }

    const now = getIndiaMinutes();

    const validShifts = shifts.filter((shift) => {
      const opening = timeToMinutes(shift.openingTime);
      const closing = timeToMinutes(shift.closingTime);

      return (
        opening !== null &&
        closing !== null &&
        opening < closing
      );
    });

    const isOpen = validShifts.some((shift) => {
      const opening = timeToMinutes(shift.openingTime);
      const closing = timeToMinutes(shift.closingTime);

      return now >= opening && now < closing;
    });

    return {
      status: isOpen ? "OPEN" : "CLOSED",
      label: isOpen
        ? "Clinic is currently open"
        : "Clinic is currently closed",
      shifts: validShifts,
    };
  };

  const loadDashboardData = useCallback(
    async (loggedInUser, showLoader = false) => {
      try {
        if (showLoader) setLoading(true);

        const responses = await Promise.all([
          fetch(`${API_BASE_URL}/clinics`),
          fetch(`${API_BASE_URL}/doctors`),
          fetch(`${API_BASE_URL}/queues`),
          fetch(
            `${API_BASE_URL}/notifications/patient/${loggedInUser.id}`
          ),
        ]);

        const failed = responses.find((response) => !response.ok);

        if (failed) {
          throw new Error(`Request failed: ${failed.status}`);
        }

        const [clinicData, doctorData, queueData, notificationData] =
          await Promise.all(responses.map((response) => response.json()));

        const safeClinics = Array.isArray(clinicData) ? clinicData : [];
        const safeDoctors = Array.isArray(doctorData) ? doctorData : [];
        const safeQueues = Array.isArray(queueData) ? queueData : [];

        setClinics(safeClinics);
        setDoctors(safeDoctors);
        setQueues(safeQueues);

        setNotifications(
          Array.isArray(notificationData) ? notificationData : []
        );

        setMyQueues(
          safeQueues.filter(
            (item) =>
              Number(item?.patient?.id) === Number(loggedInUser.id) &&
              !["COMPLETED", "CANCELLED"].includes(
                String(item?.status || "").toUpperCase()
              )
          )
        );

        // Fetch each clinic's shifts for today's weekday.
        const today = getTodayInIndia();

        setClinicShifts((previous) => {
          const next = { ...previous };

          safeClinics.forEach((clinic) => {
            const key = String(clinic.id);

            next[key] = {
              shifts: previous[key]?.shifts || [],
              loading: true,
              error: false,
            };
          });

          return next;
        });

        await Promise.all(
          safeClinics.map(async (clinic) => {
            try {
              const response = await fetch(
                `${API_BASE_URL}/clinics/${clinic.id}/shifts/day/${today}`
              );

              if (!response.ok) {
                throw new Error(`Request failed: ${response.status}`);
              }

              const data = await response.json();

              setClinicShifts((previous) => ({
                ...previous,
                [String(clinic.id)]: {
                  shifts: Array.isArray(data) ? data : [],
                  loading: false,
                  error: false,
                },
              }));
            } catch (error) {
              console.error(
                `Working hours error for clinic ${clinic.id}:`,
                error
              );

              setClinicShifts((previous) => ({
                ...previous,
                [String(clinic.id)]: {
                  shifts: [],
                  loading: false,
                  error: true,
                },
              }));
            }
          })
        );

        setMessage("");
      } catch (error) {
        console.error("Dashboard loading error:", error);
        setMessage(
          "Unable to load dashboard data. Please check that the backend is running."
        );
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const saved = localStorage.getItem("smartClinicUser");

    if (!saved) {
      navigate("/login");
      return undefined;
    }

    let loggedInUser;

    try {
      loggedInUser = JSON.parse(saved);

      if (!loggedInUser?.id) {
        throw new Error("User ID missing");
      }

      setUser(loggedInUser);
    } catch (error) {
      console.error("Saved user data is invalid:", error);
      localStorage.removeItem("smartClinicUser");
      navigate("/login");
      return undefined;
    }

    loadDashboardData(loggedInUser, true);

    const timer = setInterval(
      () => loadDashboardData(loggedInUser, false),
      REFRESH_INTERVAL
    );

    return () => clearInterval(timer);
  }, [navigate, loadDashboardData]);

  const scrollTo = (id) =>
    window.setTimeout(() => {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);

  const handleClinicChange = (event) => {
    const id = event.target.value;

    setSelectedClinic(id);
    setSelectedDoctor("");
    setMessage("");

    if (id) {
      const list = clinicDoctors(id);

      if (list.length === 1) {
        setSelectedDoctor(String(list[0].id));
      }
    }
  };

  const searchResults = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) return [];

    return clinics.reduce((results, clinic) => {
      const allDoctors = doctors.filter(
        (doctor) =>
          Number(getClinicId(doctor)) === Number(clinic.id)
      );

      const clinicMatches =
        `${clinic.name || ""} ${clinic.address || ""} ${clinic.city || ""}`
          .toLowerCase()
          .includes(query);

      const matchedDoctors = allDoctors.filter((doctor) =>
        [
          doctor.name,
          doctor.specialization,
          doctor.speciality,
          doctor.specialty,
          doctor.department,
          doctor.expertise,
        ].some((value) =>
          String(value || "").toLowerCase().includes(query)
        )
      );

      if (clinicMatches || matchedDoctors.length) {
        results.push({
          clinic,
          doctors: clinicMatches ? allDoctors : matchedDoctors,
        });
      }

      return results;
    }, []);
  }, [searchText, clinics, doctors]);

  const handleJoinQueue = async (event) => {
    event.preventDefault();

    setMessage("");
    setMessageType("error");

    if (!selectedClinic || !selectedDoctor) {
      setMessage("Please select a clinic and doctor.");
      return;
    }

    if (!user?.id) {
      setMessage("User information missing. Please login again.");
      return;
    }

    const hours = getClinicHours(selectedClinic);

    if (hours.status !== "OPEN") {
      setMessage(
        hours.status === "CLOSED"
          ? "This clinic is currently closed or has no working hours configured for today."
          : "Clinic working hours are not available yet. Please try again shortly."
      );
      return;
    }

    if (activeQueue) {
      setActiveTokenAttempt(true);
      setMessage("");
      scrollTo("join-queue-section");
      return;
    }

    setActiveTokenAttempt(false);

    const selectedClinicDetails = clinics.find(
      (clinic) => Number(clinic.id) === Number(selectedClinic)
    );

    const selectedDoctorDetails = doctors.find(
      (doctor) => Number(doctor.id) === Number(selectedDoctor)
    );

    setJoiningQueue(true);

    try {
      const requestBody = {
        patient: { id: user.id },
        doctor: { id: Number(selectedDoctor) },
        priority,
      };

      if (illnessDescription.trim()) {
        requestBody.description = illnessDescription.trim();
      }

      const response = await fetch(`${API_BASE_URL}/queues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const text = await response.text();

      if (!response.ok) {
        throw new Error(text || `Backend error ${response.status}`);
      }

      let tokenMessage = "Your token has been generated.";

      try {
        const result = JSON.parse(text);

        if (result?.tokenNumber != null) {
          tokenMessage = `Your token is #${result.tokenNumber}.`;
        }
      } catch {
        // The endpoint may return plain text or an empty response.
      }

      setMessageType("success");
      setMessage(
        `Successfully booked token at ${
          selectedClinicDetails?.name || "the selected clinic"
        } with Dr. ${
          selectedDoctorDetails?.name || "the selected doctor"
        }. ${tokenMessage}`
      );

      setSelectedClinic("");
      setSelectedDoctor("");
      setPriority("NORMAL");
      setIllnessDescription("");

      await loadDashboardData(user, false);
      scrollTo("queue-information-section");
    } catch (error) {
      console.error("Join queue error:", error);
      setMessageType("error");

      let errorText = error.message || "Please try again.";

      try {
        const parsed = JSON.parse(errorText);
        errorText =
          parsed.message ||
          parsed.detail ||
          parsed.error ||
          errorText;
      } catch {
        // Keep the original response text.
      }

      setMessage(`Unable to join queue: ${errorText}`);
    } finally {
      setJoiningQueue(false);
    }
  };

  const loadQueueInfo = useCallback(async (queueId) => {
    try {
      const [aheadResponse, waitResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/queues/${queueId}/patients-ahead`),
        fetch(`${API_BASE_URL}/queues/${queueId}/wait-time`),
      ]);

      const info = {};

      if (aheadResponse.ok) {
        const data = await aheadResponse.json();

        info.patientsAhead =
          typeof data === "number"
            ? data
            : data?.patientsAhead ?? data?.count ?? data?.value ?? null;
      }

      if (waitResponse.ok) {
        const data = await waitResponse.json();

        info.waitTime =
          typeof data === "number"
            ? data
            : data?.waitTime ??
              data?.estimatedWaitTime ??
              data?.minutes ??
              data?.value ??
              null;
      }

      if (Object.keys(info).length) {
        setQueueInfo((old) => ({
          ...old,
          [queueId]: { ...old[queueId], ...info },
        }));
      }
    } catch (error) {
      console.error("Queue information error:", error);
    }
  }, []);

  useEffect(() => {
    myQueues
      .filter(
        (queue) =>
          queue?.id != null &&
          String(queue.status).toUpperCase() === "WAITING"
      )
      .forEach((queue) => loadQueueInfo(queue.id));
  }, [myQueues, loadQueueInfo]);

  const updateNotification = async (id, action) => {
    setNotificationMessage("");
    setNotificationBusyId(id);

    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/${id}/${action}`,
        { method: "PUT" }
      );

      const text = await response.text();

      if (!response.ok) {
        throw new Error(text || `Request failed: ${response.status}`);
      }

      let updated = {};

      try {
        updated = text.trim() ? JSON.parse(text) : {};
      } catch {
        updated = {};
      }

      const status = action === "read" ? "READ" : "UNREAD";

      setNotifications((old) =>
        old.map((notification) =>
          Number(notification.id) === Number(id)
            ? {
                ...notification,
                ...updated,
                status: updated.status || status,
              }
            : notification
        )
      );

      setNotificationMessage(
        action === "read"
          ? "Notification marked as read."
          : "Notification marked as unread."
      );
    } catch (error) {
      console.error("Notification update error:", error);
      setNotificationMessage(
        `Unable to update notification: ${error.message}`
      );
    } finally {
      setNotificationBusyId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id || unreadCount === 0) return;

    setNotificationMessage("");
    setMarkingAllRead(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/notifications/patient/${user.id}/read-all`,
        { method: "PUT" }
      );

      const text = await response.text();

      if (!response.ok) {
        throw new Error(text || `Request failed: ${response.status}`);
      }

      let result = null;

      try {
        result = text.trim() ? JSON.parse(text) : null;
      } catch {
        result = null;
      }

      setNotifications(
        Array.isArray(result)
          ? result
          : (old) => old.map((notification) => ({
              ...notification,
              status: "READ",
            }))
      );

      setNotificationMessage("All notifications marked as read.");
    } catch (error) {
      setNotificationMessage(
        `Unable to mark all as read: ${error.message}`
      );
    } finally {
      setMarkingAllRead(false);
    }
  };

  const formatWait = (value) => {
    if (value === null || value === undefined || value === "") {
      return "Calculating...";
    }

    const number = Number(value);

    return Number.isFinite(number)
      ? `${number} minutes`
      : String(value);
  };

  const waitingPatients = queues.filter(
    (queue) => queue.status === "WAITING"
  ).length;

  const inProgressPatients = queues.filter(
    (queue) => queue.status === "IN_PROGRESS"
  ).length;

  const logout = () => {
    localStorage.removeItem("smartClinicUser");
    navigate("/login");
  };

  const renderClinicHours = (clinicId) => {
    const hours = getClinicHours(clinicId);

    const color =
      hours.status === "OPEN"
        ? "#166534"
        : hours.status === "CLOSED"
          ? "#b91c1c"
          : "#475569";

    const background =
      hours.status === "OPEN"
        ? "#f0fdf4"
        : hours.status === "CLOSED"
          ? "#fef2f2"
          : "#f8fafc";

    const border =
      hours.status === "OPEN"
        ? "#86efac"
        : hours.status === "CLOSED"
          ? "#fca5a5"
          : "#cbd5e1";

    return (
      <div
        style={{
          margin: "12px 0",
          padding: 14,
          borderRadius: 10,
          border: `1px solid ${border}`,
          background,
        }}
      >
        <strong style={{ color }}>
          {hours.status === "OPEN"
            ? "● OPEN"
            : hours.status === "CLOSED"
              ? "● CLOSED"
              : "● HOURS UNKNOWN"}
        </strong>

        <p style={{ margin: "6px 0", fontSize: 14 }}>
          {hours.label}
        </p>

        {hours.shifts.map((shift) => (
          <div
            key={
              shift.id ??
              `${shift.openingTime}-${shift.closingTime}`
            }
            style={{ fontSize: 13, marginTop: 4 }}
          >
            {formatClinicTime(shift.openingTime)} –{" "}
            {formatClinicTime(shift.closingTime)}
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <h2>Loading SmartClinic dashboard...</h2>
          <p>
            Please wait while we load clinics, doctors and queue information.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>SmartClinic Dashboard</h1>
          <p>
            Find registered clinics, check live queues and manage your clinic
            visits.
          </p>
        </div>

        <button className="dashboard-logout" onClick={logout}>
          Logout
        </button>
      </header>

      <section className="welcome-card">
        <div>
          <span>WELCOME BACK</span>
          <h2>Hello, {user?.name || user?.fullName || "Patient"} 👋</h2>
          <p>
            Search for a registered clinic or doctor and check the current
            queue before visiting.
          </p>
        </div>

        <div className="dashboard-role">{user?.role || "PATIENT"}</div>
      </section>

      {message && (
        <div
          className="queue-message"
          role={messageType === "error" ? "alert" : "status"}
          style={{
            overflowWrap: "anywhere",
            margin: "12px 0",
            padding: "14px 16px",
            borderRadius: 10,
            border:
              messageType === "success"
                ? "1px solid #86efac"
                : "1px solid #fca5a5",
            background:
              messageType === "success" ? "#f0fdf4" : "#fef2f2",
            color: messageType === "success" ? "#166534" : "#b91c1c",
            fontWeight: 600,
            lineHeight: 1.5,
          }}
        >
          {message}
        </div>
      )}

      <section className="dashboard-stats">
        <div className="dashboard-stat-card">
          <span>Registered Clinics</span>
          <strong>{clinics.length}</strong>
        </div>
        <div className="dashboard-stat-card">
          <span>Registered Doctors</span>
          <strong>{doctors.length}</strong>
        </div>
        <div className="dashboard-stat-card">
          <span>Waiting Patients</span>
          <strong>{waitingPatients}</strong>
        </div>
        <div className="dashboard-stat-card">
          <span>In Progress</span>
          <strong>{inProgressPatients}</strong>
        </div>
      </section>

      <section className="clinic-search-panel">
        <div className="search-heading">
          <div>
            <span className="search-eyebrow">SMARTCLINIC SEARCH</span>
            <h2>Find a Clinic or Doctor</h2>
            <p>
              Search only among clinics and doctors registered with SmartClinic.
            </p>
          </div>
        </div>

        <div className="clinic-search-box">
          <span className="search-icon">🔍</span>
          <input
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Search clinic, doctor or specialization..."
            aria-label="Search clinic or doctor"
          />
          {searchText && (
            <button
              type="button"
              className="search-clear-button"
              onClick={() => setSearchText("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {searchText.trim() && (
          <div className="search-results">
            <div className="search-result-title">
              <strong>Search Results</strong>
              <span>
                {searchResults.length} clinic
                {searchResults.length !== 1 ? "s" : ""} found
              </span>
            </div>

            {searchResults.length === 0 ? (
              <div className="no-search-results">
                <div className="no-result-icon">🔎</div>
                <h3>No registered clinic found</h3>
                <p>
                  Try another clinic name, doctor name or specialization.
                </p>
              </div>
            ) : (
              <div className="search-result-list">
                {searchResults.map(({ clinic, doctors: foundDoctors }) => {
                  const waiting = clinicWaiting(clinic.id);
                  const hours = getClinicHours(clinic.id);

                  return (
                    <div className="clinic-search-result" key={clinic.id}>
                      <div className="clinic-result-header">
                        <div className="clinic-result-icon">🏥</div>

                        <div className="clinic-result-main">
                          <h3>{clinic.name || "Unnamed Clinic"}</h3>
                          <p>📍 {getAddress(clinic)}</p>
                        </div>

                        <span className="registered-badge">
                          ✓ Registered
                        </span>
                      </div>

                      <div className="clinic-live-summary">
                        <div>
                          <span>Patients Waiting</span>
                          <strong>{waiting}</strong>
                        </div>
                        <div>
                          <span>Doctors</span>
                          <strong>{clinicDoctors(clinic.id).length}</strong>
                        </div>
                        <div>
                          <span>Queue Status</span>
                          <strong
                            className={
                              waiting ? "queue-live" : "queue-available"
                            }
                          >
                            {waiting ? "LIVE" : "AVAILABLE"}
                          </strong>
                        </div>
                      </div>

                      {renderClinicHours(clinic.id)}

                      <div className="clinic-doctors-list">
                        <div className="doctor-list-heading">Doctors</div>

                        {foundDoctors.length === 0 ? (
                          <p className="empty-doctor-text">
                            No doctors registered for this clinic.
                          </p>
                        ) : (
                          foundDoctors.map((doctor) => (
                            <div
                              className="search-doctor-card"
                              key={doctor.id}
                            >
                              <div className="search-doctor-avatar">
                                {String(doctor.name || "D")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div className="search-doctor-info">
                                <strong>{doctor.name || "Doctor"}</strong>
                                <span>{getSpecialization(doctor)}</span>
                              </div>

                              <div className="doctor-live-info">
                                <div>
                                  <strong>
                                    {doctorWaiting(doctor.id).length}
                                  </strong>
                                  <span>waiting</span>
                                </div>
                                <div>
                                  <strong>{doctorWait(doctor)}</strong>
                                  <span>min approx.</span>
                                </div>
                              </div>

                              <div className="doctor-result-actions">
                                <button
                                  type="button"
                                  className="view-queue-button"
                                  onClick={() => {
                                    setSelectedClinic(String(clinic.id));
                                    setSelectedDoctor(String(doctor.id));
                                    scrollTo("queue-information-section");
                                  }}
                                >
                                  View Queue
                                </button>

                                <button
                                  type="button"
                                  className="search-join-button"
                                  disabled={hours.status !== "OPEN"}
                                  title={
                                    hours.status === "OPEN"
                                      ? "Join this clinic queue"
                                      : hours.label
                                  }
                                  onClick={() => {
                                    setSelectedClinic(String(clinic.id));
                                    setSelectedDoctor(String(doctor.id));
                                    setMessage("");
                                    scrollTo("join-queue-section");
                                  }}
                                  style={{
                                    opacity:
                                      hours.status === "OPEN" ? 1 : 0.55,
                                    cursor:
                                      hours.status === "OPEN"
                                        ? "pointer"
                                        : "not-allowed",
                                  }}
                                >
                                  Join Queue
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      <section id="join-queue-section" className="join-queue-panel">
        <div className="panel-heading">
          <div>
            <span className="section-mini-label">QUEUE ACCESS</span>
            <h2>Join Clinic Queue</h2>
          </div>
        </div>

        {activeQueue && activeTokenAttempt && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              margin: "12px 0 18px",
              padding: "14px 16px",
              borderRadius: 10,
              border: "1px solid #fca5a5",
              background: "#fef2f2",
              color: "#b91c1c",
              fontWeight: 600,
              lineHeight: 1.5,
            }}
          >
            You already have an active token (#
            {activeQueue.tokenNumber ?? activeQueue.id}, status:{" "}
            {activeQueue.status}). You can book another token only after this
            consultation is marked COMPLETED by the doctor.
          </div>
        )}

        <div
          className="join-queue-layout"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.25fr) minmax(280px, 0.9fr)",
            gap: 20,
            alignItems: "start",
          }}
        >
          <form
            onSubmit={handleJoinQueue}
            className="join-queue-form"
            style={{ minWidth: 0 }}
          >
            <div className="form-field">
              <label htmlFor="clinic">Select Clinic</label>
              <select
                id="clinic"
                value={selectedClinic}
                onChange={handleClinicChange}
                required
              >
                <option value="">Choose clinic</option>
                {clinics.map((clinic) => (
                  <option key={clinic.id} value={clinic.id}>
                    {clinic.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedClinic && renderClinicHours(selectedClinic)}

            <div className="form-field">
              <label htmlFor="doctor">Select Doctor</label>
              <select
                id="doctor"
                value={selectedDoctor}
                onChange={(event) => setSelectedDoctor(event.target.value)}
                disabled={!selectedClinic}
                required
              >
                <option value="">
                  {selectedClinic ? "Choose doctor" : "Select clinic first"}
                </option>
                {selectedClinic &&
                  clinicDoctors(selectedClinic).map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>
                      {doctor.name} — {getSpecialization(doctor)}
                    </option>
                  ))}
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="priority">Queue Priority</label>
              <select
                id="priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              >
                <option value="NORMAL">Normal</option>
                <option value="PRIORITY">Priority</option>
              </select>
            </div>

            <button
              type="submit"
              className="join-queue-button"
              disabled={
                joiningQueue ||
                !selectedClinic ||
                !selectedDoctor ||
                getClinicHours(selectedClinic).status !== "OPEN"
              }
            >
              {joiningQueue
                ? "Joining..."
                : !selectedClinic
                  ? "Select Clinic"
                  : getClinicHours(selectedClinic).status === "UNKNOWN"
                    ? "Checking Clinic Hours..."
                    : getClinicHours(selectedClinic).status === "CLOSED"
                      ? "Clinic Closed"
                      : "Join Queue"}
            </button>
          </form>

          <aside
            className="illness-description-panel"
            style={{
              minWidth: 0,
              padding: 18,
              border: "1px solid #dbe3ee",
              borderRadius: 12,
              background: "#f8fafc",
              boxSizing: "border-box",
            }}
          >
            <h3 style={{ margin: "0 0 8px" }}>Describe Your Illness</h3>
            <p
              style={{
                margin: "0 0 12px",
                color: "#64748b",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              Tell the doctor about your symptoms, when they started, and any
              important details.
            </p>

            <label
              htmlFor="illnessDescription"
              style={{
                display: "block",
                fontWeight: 600,
                marginBottom: 7,
              }}
            >
              Illness / symptoms
            </label>

            <textarea
              id="illnessDescription"
              value={illnessDescription}
              onChange={(event) => setIllnessDescription(event.target.value)}
              placeholder="Optional: describe your symptoms (you can leave this blank)."
              rows={8}
              maxLength={2000}
              style={{
                display: "block",
                width: "100%",
                minHeight: 180,
                boxSizing: "border-box",
                padding: 12,
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#0f172a",
                font: "inherit",
                resize: "vertical",
                outlineOffset: 2,
              }}
            />

            <small
              style={{ display: "block", marginTop: 8, color: "#64748b" }}
            >
              {illnessDescription.length}/2000 characters. Optional — you can
              book a token without entering a description.
            </small>
          </aside>
        </div>

        <style>{`
          @media (max-width: 760px) {
            .join-queue-layout {
              grid-template-columns: minmax(0, 1fr) !important;
            }
          }
        `}</style>
      </section>

      <section id="queue-information-section" className="dashboard-content">
        <div className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <span className="section-mini-label">LIVE STATUS</span>
              <h2>My Queue Details</h2>
            </div>
          </div>

          {myQueues.length === 0 ? (
            <p className="empty-text">
              You have not joined any queue yet.
            </p>
          ) : (
            <div className="my-queue-list">
              {myQueues.map((queue) => {
                const info = queueInfo[queue.id] || {};
                const status = String(queue.status || "UNKNOWN");
                const wait = info.waitTime ?? queue.estimatedWaitTime;

                return (
                  <div
                    className="queue-row"
                    key={queue.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      padding: "14px 0",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <div
                      className="queue-main-info"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 8,
                        flex: "1 1 520px",
                        minWidth: 0,
                      }}
                    >
                      <strong style={{ whiteSpace: "nowrap" }}>
                        Token #{queue.tokenNumber ?? "—"}
                      </strong>

                      <span
                        className="queue-status"
                        style={{
                          padding: "4px 8px",
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 600,
                          background:
                            status === "COMPLETED"
                              ? "#dcfce7"
                              : status === "IN_PROGRESS"
                                ? "#dbeafe"
                                : "#fef3c7",
                          color:
                            status === "COMPLETED"
                              ? "#166534"
                              : status === "IN_PROGRESS"
                                ? "#1d4ed8"
                                : "#92400e",
                        }}
                      >
                        {status.replaceAll("_", " ")}
                      </span>

                      <small style={{ color: "#666" }}>
                        Clinic:{" "}
                        {queue?.doctor?.clinic?.name ||
                          getClinicName(queue?.doctor)}
                      </small>

                      <small style={{ color: "#666" }}>
                        Doctor: {queue?.doctor?.name || "Not available"}
                      </small>

                      <small style={{ color: "#666" }}>
                        Specialization: {getSpecialization(queue?.doctor)}
                      </small>
                    </div>

                    <div
                      className="queue-meta"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 10,
                        fontSize: 12,
                      }}
                    >
                      <span
                        style={{
                          color: "#b91c1c",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        Priority: {queue.priority || "NORMAL"}
                      </span>

                      {status === "WAITING" ? (
                        <>
                          <small style={{ whiteSpace: "nowrap" }}>
                            Patients Ahead:{" "}
                            {info.patientsAhead ?? "Calculating..."}
                          </small>
                          <small style={{ whiteSpace: "nowrap" }}>
                            Estimated Wait: {formatWait(wait)}
                          </small>
                        </>
                      ) : status === "IN_PROGRESS" ? (
                        <small style={{ color: "#1d4ed8" }}>
                          Consultation in progress
                        </small>
                      ) : status === "COMPLETED" ? (
                        <small
                          style={{ color: "#166534", fontWeight: 600 }}
                        >
                          Consultation completed
                        </small>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="dashboard-panel">
          <div
            className="panel-heading"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <span className="section-mini-label">UPDATES</span>
              <h2>
                Notifications
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 25,
                    height: 25,
                    padding: "0 7px",
                    marginLeft: 5,
                    borderRadius: 999,
                    background: unreadCount ? "#fee2e2" : "#e5e7eb",
                    color: unreadCount ? "#b91c1c" : "#374151",
                    fontSize: 13,
                  }}
                >
                  {unreadCount}
                </span>
              </h2>

              <p style={{ margin: "5px 0 0", color: "#666" }}>
                {unreadCount
                  ? `You have ${unreadCount} unread notification${
                      unreadCount === 1 ? "" : "s"
                    }.`
                  : "You are all caught up."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleMarkAllAsRead}
              disabled={markingAllRead || !unreadCount}
              style={{
                padding: "9px 13px",
                border: 0,
                borderRadius: 8,
                background:
                  markingAllRead || !unreadCount ? "#e5e7eb" : "#2563eb",
                color:
                  markingAllRead || !unreadCount ? "#6b7280" : "#fff",
                cursor:
                  markingAllRead || !unreadCount
                    ? "not-allowed"
                    : "pointer",
                fontWeight: 600,
              }}
            >
              {markingAllRead ? "Updating..." : "Mark All as Read"}
            </button>
          </div>

          {notificationMessage && (
            <p
              role="status"
              style={{
                padding: 10,
                margin: "12px 0",
                borderRadius: 8,
                background: notificationMessage.startsWith("Unable")
                  ? "#fee2e2"
                  : "#dcfce7",
                color: notificationMessage.startsWith("Unable")
                  ? "#991b1b"
                  : "#166534",
                overflowWrap: "anywhere",
              }}
            >
              {notificationMessage}
            </p>
          )}

          {notifications.length === 0 ? (
            <p className="empty-text">No notifications available.</p>
          ) : (
            <div className="notifications-list">
              {notifications.map((notification) => {
                const unread = notification.status === "UNREAD";
                const busy =
                  Number(notificationBusyId) === Number(notification.id);

                return (
                  <div
                    className="notification-row"
                    key={notification.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                      padding: "14px 0",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        flex: "0 0 9px",
                        borderRadius: "50%",
                        background: unread ? "#f59e0b" : "#9ca3af",
                      }}
                    />

                    <strong style={{ whiteSpace: "nowrap", fontSize: 13 }}>
                      {notification.type || "UPDATE"}
                    </strong>

                    <p
                      style={{
                        margin: 0,
                        flex: "1 1 240px",
                        minWidth: 0,
                        overflowWrap: "anywhere",
                        fontWeight: unread ? 600 : 400,
                      }}
                    >
                      {notification.message || "Notification update"}
                    </p>

                    <span
                      style={{
                        whiteSpace: "nowrap",
                        padding: "4px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        background: unread ? "#fef3c7" : "#f3f4f6",
                        color: unread ? "#92400e" : "#6b7280",
                      }}
                    >
                      {notification.status || "UNKNOWN"}
                    </span>

                    <button
                      type="button"
                      disabled={busy || markingAllRead}
                      onClick={() =>
                        updateNotification(
                          notification.id,
                          unread ? "read" : "unread"
                        )
                      }
                      style={{
                        padding: "7px 10px",
                        border: `1px solid ${
                          unread ? "#16a34a" : "#2563eb"
                        }`,
                        borderRadius: 7,
                        background:
                          busy || markingAllRead ? "#f3f4f6" : "#fff",
                        color:
                          busy || markingAllRead
                            ? "#9ca3af"
                            : unread
                              ? "#15803d"
                              : "#1d4ed8",
                        cursor:
                          busy || markingAllRead
                            ? "not-allowed"
                            : "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {busy
                        ? "Updating..."
                        : unread
                          ? "Mark as Read"
                          : "Mark as Unread"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
