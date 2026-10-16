
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const API = "http://localhost:8080/api";

function normalizeDay(day) {
  return String(day || "").trim().toUpperCase();
}

function getIndiaTimeParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = {};
  parts.forEach((part) => {
    values[part.type] = part.value;
  });

  return {
    day: normalizeDay(values.weekday),
    time: `${values.hour}:${values.minute}`,
  };
}

function formatTime(time) {
  if (!time) return "—";

  const [hourString, minuteString] = String(time).split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return "—";
  }

  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function getClinicStatus(clinic) {
  const shifts = Array.isArray(clinic?.shifts) ? clinic.shifts : [];

  if (shifts.length === 0) {
    return {
      status: "unknown",
      label: "Timings not set",
      todayShifts: [],
      allShifts: [],
    };
  }

  const { day, time } = getIndiaTimeParts();

  const todayShifts = shifts
    .filter((shift) => normalizeDay(shift.dayOfWeek) === day)
    .sort((a, b) =>
      String(a.openingTime || "").localeCompare(
        String(b.openingTime || "")
      )
    );

  if (todayShifts.length === 0) {
    return {
      status: "closed",
      label: "Closed today",
      todayShifts: [],
      allShifts: shifts,
    };
  }

  const isOpen = todayShifts.some((shift) => {
    const opening = String(shift.openingTime || "").slice(0, 5);
    const closing = String(shift.closingTime || "").slice(0, 5);

    return opening && closing && time >= opening && time < closing;
  });

  return {
    status: isOpen ? "open" : "closed",
    label: isOpen ? "Open now" : "Closed now",
    todayShifts,
    allShifts: shifts,
  };
}

function ClinicStatus({ clinic, compact = false }) {
  const info = getClinicStatus(clinic);

  const badgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    padding: "6px 11px",
    borderRadius: 30,
    fontSize: 12,
    fontWeight: 700,
    background:
      info.status === "open"
        ? "#dcfce7"
        : info.status === "closed"
          ? "#fee2e2"
          : "#f1f5f9",
    color:
      info.status === "open"
        ? "#15803d"
        : info.status === "closed"
          ? "#b91c1c"
          : "#64748b",
  };

  const dotStyle = {
    width: 7,
    height: 7,
    borderRadius: "50%",
    background:
      info.status === "open"
        ? "#16a34a"
        : info.status === "closed"
          ? "#dc2626"
          : "#94a3b8",
  };

  return (
    <div style={{ marginTop: compact ? 10 : 14 }}>
      <span style={badgeStyle}>
        <span style={dotStyle} />
        {info.label}
      </span>

      {info.status === "unknown" ? (
        <p
          style={{
            color: "#64748b",
            fontSize: 12,
            margin: "9px 0 0",
            lineHeight: 1.5,
          }}
        >
          Working hours have not been configured.
        </p>
      ) : info.todayShifts.length > 0 ? (
        <div
          style={{
            color: "#64748b",
            fontSize: 12,
            lineHeight: 1.7,
            marginTop: 8,
          }}
        >
          <strong style={{ color: "#475569" }}>Today's hours: </strong>
          {info.todayShifts
            .map(
              (shift) =>
                `${formatTime(shift.openingTime)} – ${formatTime(
                  shift.closingTime
                )}`
            )
            .join(" · ")}
        </div>
      ) : (
        <p
          style={{
            color: "#64748b",
            fontSize: 12,
            margin: "8px 0 0",
          }}
        >
          No working hours configured for today.
        </p>
      )}
    </div>
  );
}

function Home() {
  const navigate = useNavigate();

  const [clinics, setClinics] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [selectedClinic, setSelectedClinic] = useState(null);
  const [queueData, setQueueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [queueLoading, setQueueLoading] = useState(false);
  const [error, setError] = useState("");
  const [queueError, setQueueError] = useState("");
  const [message, setMessage] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [, setClockTick] = useState(0);

  // Refresh clinic opening status every 30 seconds.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTick((value) => value + 1);
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  // Load registered clinics.
  useEffect(() => {
    const controller = new AbortController();

    async function loadClinics() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API}/clinics`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Could not load clinics");
        }

        const data = await response.json();
        setClinics(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(
            "Clinics could not be loaded. Please check your backend."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadClinics();

    return () => controller.abort();
  }, []);

  const filteredClinics = clinics.filter((clinic) => {
    const query = searchText.trim().toLowerCase();

    if (!query) return true;

    return `${clinic.name || ""} ${clinic.city || ""} ${
      clinic.address || ""
    }`
      .toLowerCase()
      .includes(query);
  });

  // Load queue information whenever the selected clinic changes.
  useEffect(() => {
    if (!selectedClinic) {
      setQueueData([]);
      setQueueError("");
      setQueueLoading(false);
      return undefined;
    }

    const controller = new AbortController();

    async function loadQueue() {
      try {
        setQueueLoading(true);
        setQueueError("");

        const response = await fetch(
          `${API}/queues/clinic/${selectedClinic.id}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Could not load queue");
        }

        const data = await response.json();
        setQueueData(Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setQueueError(
            "Queue information could not be loaded. Please check the queue API."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setQueueLoading(false);
        }
      }
    }

    loadQueue();

    return () => controller.abort();
  }, [selectedClinic]);

  const waitingQueue = queueData
    .filter((item) => item.status === "WAITING")
    .sort((a, b) => {
      const waitA = a.estimatedWaitTime ?? Infinity;
      const waitB = b.estimatedWaitTime ?? Infinity;

      return waitA - waitB || a.tokenNumber - b.tokenNumber;
    });

  const nextToken = waitingQueue[0] || null;

  function scrollTo(elementId, block = "start") {
    document.getElementById(elementId)?.scrollIntoView({
      behavior: "smooth",
      block,
    });
  }

  function scrollToQueue() {
    scrollTo("join-queue-box", "center");
  }

  function selectClinic(clinic) {
    setSelectedClinic(clinic);
    setSearchText(clinic.name || "");
    setMessage("");
    setShowSuggestions(false);

    window.setTimeout(() => scrollTo("join-queue-box", "center"), 150);
  }

  function handleSearch(event) {
    event.preventDefault();
    setMessage("");

    const query = searchText.trim();

    if (!query) {
      setMessage("Enter a clinic name, city or address.");
      setShowSuggestions(true);
      return;
    }

    if (filteredClinics.length === 0) {
      setSelectedClinic(null);
      setMessage("No registered clinic found for this search.");
      setShowSuggestions(true);
      return;
    }

    if (filteredClinics.length === 1) {
      selectClinic(filteredClinics[0]);
      return;
    }

    setShowSuggestions(true);
    setMessage("Select your clinic from the suggestions below.");
    scrollTo("clinic-search-area", "center");
  }

  function clearClinic() {
    setSelectedClinic(null);
    setQueueData([]);
    setQueueError("");
    setMessage("");
    setSearchText("");
    setShowSuggestions(false);
  }

  return (
    <div className="app">
      <header className="navbar">
        <div className="brand">
          <div className="brand-icon">SC</div>
          <div>
            <h2>SmartClinic</h2>
            <span>Queue made simple</span>
          </div>
        </div>

        <nav>
          <a href="#clinics">Find a Clinic</a>
          <a href="#how-it-works">How it works</a>
          <a href="#about">About</a>
          <button
            className="nav-login"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-left">
            <div className="location-label">
              <span className="pulse" />
              Find a registered clinic
            </div>

            <h1>
              Don't wait at the clinic.
              <br />
              <span>Know when to go.</span>
            </h1>

            <p className="hero-description">
              Check the estimated queue and plan when to leave
              for your clinic visit.
            </p>

            <div className="search-area" id="clinic-search-area">
              <form className="search-box" onSubmit={handleSearch}>
                <div className="search-icon">⌕</div>

                <div className="search-content">
                  <input
                    type="search"
                    placeholder="Search clinic name or location..."
                    value={searchText}
                    autoComplete="off"
                    aria-label="Search registered clinics"
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(event) => {
                      setSearchText(event.target.value);
                      setMessage("");
                      setShowSuggestions(true);
                    }}
                  />
                  <small>Search by clinic name, city or address</small>
                </div>

                <button className="search-submit" type="submit">
                  Search <span>→</span>
                </button>
              </form>

              {showSuggestions && searchText.trim() && (
                <div className="clinic-suggestions">
                  {loading ? (
                    <p>Loading registered clinics...</p>
                  ) : filteredClinics.length > 0 ? (
                    filteredClinics.slice(0, 6).map((clinic) => (
                      <button
                        type="button"
                        key={clinic.id}
                        onClick={() => selectClinic(clinic)}
                      >
                        <span className="suggestion-icon">+</span>
                        <span className="suggestion-text">
                          <strong>{clinic.name}</strong>
                          <small>
                            {clinic.address || "Address unavailable"}
                            {clinic.city ? `, ${clinic.city}` : ""}
                          </small>
                          <ClinicStatus clinic={clinic} compact />
                        </span>
                        <span className="suggestion-arrow">→</span>
                      </button>
                    ))
                  ) : (
                    <p>No registered clinic found.</p>
                  )}
                </div>
              )}
            </div>

            {message && (
              <p className="home-message" role="status">
                {message}
              </p>
            )}

            {error && (
              <p className="home-error" role="alert">
                {error}
              </p>
            )}

            <div className="quick-info">
              <div>
                <strong>Registered clinics</strong>
                <span>Search and select</span>
              </div>
              <div>
                <strong>Queue estimates</strong>
                <span>Plan your visit</span>
              </div>
              <div>
                <strong>Digital tokens</strong>
                <span>Queue information</span>
              </div>
            </div>
          </div>

          <div className="hero-right">
            <div className="queue-card" id="join-queue-box">
              {!selectedClinic ? (
                <>
                  <div className="card-top">
                    <div>
                      <span className="live-badge">
                        <i /> CLINIC QUEUE
                      </span>
                      <h3>Find your clinic</h3>
                      <p>
                        Select a registered clinic to see queue information.
                      </p>
                    </div>
                  </div>

                  <div className="crowd-section">
                    <div className="crowd-number">
                      <strong>—</strong>
                      <span>patients waiting</span>
                    </div>
                    <div className="wait-time">
                      <span>Estimated wait</span>
                      <strong>—</strong>
                    </div>
                  </div>

                  <div className="queue-line">
                    <div className="queue-label">
                      <span>Current queue</span>
                      <strong>Token #—</strong>
                    </div>
                    <div className="queue-progress">
                      <span style={{ width: "0%" }} />
                    </div>
                    <div className="queue-bottom">
                      <span>Select a clinic</span>
                      <span>Queue estimate</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="join-button"
                    onClick={() => navigate("/login")}
                  >
                    Find a clinic <span>→</span>
                  </button>

                  <div className="doctor-info">
                    <div className="doctor-avatar">SC</div>
                    <div>
                      <strong>SmartClinic</strong>
                      <span>Select a registered clinic</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="card-top">
                    <div>
                      <span className="live-badge">
                        <i /> LIVE QUEUE
                      </span>
                      <h3>{selectedClinic.name}</h3>
                      <p>
                        {selectedClinic.address || "Address unavailable"}
                        {selectedClinic.city
                          ? ` · ${selectedClinic.city}`
                          : ""}
                      </p>
                      <ClinicStatus clinic={selectedClinic} />
                    </div>

                    <button
                      className="more-btn"
                      type="button"
                      aria-label="Clear selected clinic"
                      onClick={clearClinic}
                    >
                      ×
                    </button>
                  </div>

                  <div className="crowd-section">
                    <div className="crowd-number">
                      <strong>
                        {queueLoading
                          ? "…"
                          : queueError
                            ? "—"
                            : waitingQueue.length}
                      </strong>
                      <span>patients waiting</span>
                    </div>

                    <div className="wait-time">
                      <span>Estimated wait</span>
                      <strong>
                        {queueLoading
                          ? "Loading..."
                          : queueError
                            ? "Unavailable"
                            : nextToken?.estimatedWaitTime != null
                              ? `~${nextToken.estimatedWaitTime} min`
                              : "Not available"}
                      </strong>
                    </div>
                  </div>

                  <div className="queue-line">
                    <div className="queue-label">
                      <span>Current queue</span>
                      <strong>
                        {queueLoading
                          ? "Loading..."
                          : queueError
                            ? "Unavailable"
                            : nextToken
                              ? `Token #${nextToken.tokenNumber}`
                              : "No waiting token"}
                      </strong>
                    </div>

                    <div className="queue-progress">
                      <span
                        style={{ width: nextToken ? "45%" : "0%" }}
                      />
                    </div>

                    <div className="queue-bottom">
                      <span>
                        {queueLoading
                          ? "Loading..."
                          : `${waitingQueue.length} waiting`}
                      </span>
                      <span>
                        {nextToken
                          ? "Awaiting consultation"
                          : "Queue status"}
                      </span>
                    </div>

                    {queueError && (
                      <p className="queue-notice" role="alert">
                        {queueError}
                      </p>
                    )}

                    {!queueLoading && !queueError && nextToken && (
                      <p className="visit-planning-note">
                        Your estimated turn is in about{" "}
                        {nextToken.estimatedWaitTime != null
                          ? `${nextToken.estimatedWaitTime} minutes`
                          : "an unknown amount of time"}
                        . This is an estimate to help you plan when to leave.
                        You can still visit the clinic whenever you need to.
                      </p>
                    )}

                    {!queueLoading && !queueError && !nextToken && (
                      <p className="queue-notice">
                        No patients are currently marked as waiting.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    className="join-button"
                    onClick={() => navigate("/login")}
                  >
                    Join this queue <span>→</span>
                  </button>

                  <div className="doctor-info">
                    <div className="doctor-avatar">
                      {nextToken?.doctor?.name
                        ? nextToken.doctor.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()
                        : "DR"}
                    </div>

                    <div>
                      <strong>
                        {nextToken?.doctor?.name || "Clinic doctor"}
                      </strong>
                      <span>
                        {nextToken?.doctor?.specialization ||
                          "Registered doctor"}
                        {nextToken?.doctor?.consultationTime != null
                          ? ` · ${nextToken.doctor.consultationTime} min/patient`
                          : ""}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="trust-strip">
          <div>
            <strong>Registered clinics</strong>
            <span>From the backend</span>
          </div>
          <div>
            <strong>Queue estimates</strong>
            <span>Plan before leaving</span>
          </div>
          <div>
            <strong>Digital tokens</strong>
            <span>Queue information</span>
          </div>
          <div>
            <strong>Flexible visits</strong>
            <span>Your decision</span>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-heading">
            <span>HOW IT WORKS</span>
            <h2>Three steps. Less waiting.</h2>
            <p>
              Check the queue estimate and plan your journey
              without being told to avoid the clinic.
            </p>
          </div>

          <div className="steps">
            <div className="step">
              <div className="step-number">01</div>
              <div>
                <h3>Find your clinic</h3>
                <p>Search registered clinics by name, city or address.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">02</div>
              <div>
                <h3>Check the queue</h3>
                <p>
                  See the waiting count, token and estimated time when available.
                </p>
              </div>
            </div>
            <div className="step">
              <div className="step-number">03</div>
              <div>
                <h3>Plan when to leave</h3>
                <p>
                  Use the estimated time to plan your trip. The choice is yours.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="clinic-section" id="clinics">
          <div className="clinic-heading">
            <div>
              <span>REGISTERED CLINICS</span>
              <h2>Clinics you can check</h2>
            </div>

            <button
              type="button"
              className="view-all"
              onClick={() => {
                setSearchText("");
                setMessage("");
                setShowSuggestions(false);
              }}
            >
              View all →
            </button>
          </div>

          <div className="clinic-grid">
            {loading ? (
              <p>Loading registered clinics...</p>
            ) : error ? (
              <p>{error}</p>
            ) : filteredClinics.length === 0 ? (
              <p>No registered clinics match your search.</p>
            ) : (
              filteredClinics.map((clinic) => (
                <div className="clinic-small-card" key={clinic.id}>
                  <div className="clinic-card-top">
                    <span className="status-dot" />
                    <span>
                      {clinic.currentPatients ?? "—"} current patients
                    </span>
                  </div>

                  <h3>{clinic.name}</h3>

                  <p>
                    {clinic.address || "Address unavailable"}
                    {clinic.city ? `, ${clinic.city}` : ""}
                  </p>

                  <ClinicStatus clinic={clinic} compact />

                  <div className="clinic-card-bottom">
                    <span>{clinic.totalDoctors ?? "—"} doctors</span>
                    <button
                      type="button"
                      onClick={() => selectClinic(clinic)}
                    >
                      View
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="cta" id="about">
          <div>
            <span>SMARTER CLINIC VISITS</span>
            <h2>
              Your time matters.
              <br />
              Don't spend it waiting.
            </h2>
          </div>

          <button type="button" onClick={scrollToQueue}>
            Find a clinic →
          </button>
        </section>
      </main>

      <footer>
        <div className="footer-brand">
          <div className="brand-icon">SC</div>
          <div>
            <h3>SmartClinic</h3>
            <span>Queue made simple</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
