
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "https://samrt-clinic-backend.onrender.com/api";

const DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const styles = {
  page: {
    width: "100%",
    maxWidth: "none",
    minHeight: "100vh",
    margin: 0,
    background: "#f5f7fb",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },
  header: {
    background: "#fff",
    padding: "18px 5%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    flexWrap: "wrap",
    boxShadow: "0 2px 12px #00000008",
  },
  brand: { color: "#087f8c", fontSize: 25, fontWeight: 800 },
  button: {
    background: "#087f8c",
    color: "#fff",
    border: "none",
    padding: "11px 17px",
    borderRadius: 9,
    fontWeight: 700,
    cursor: "pointer",
  },
  content: {
    width: "100%",
    maxWidth: "none",
    boxSizing: "border-box",
    margin: 0,
    padding: "28px 5.45% 45px",
  },
  hero: {
    background: "linear-gradient(120deg, #173b52, #087f8c)",
    color: "#fff",
    padding: 30,
    borderRadius: 18,
    marginBottom: 24,
  },
  section: {
    background: "#fff",
    padding: 24,
    borderRadius: 16,
    marginBottom: 22,
    boxShadow: "0 4px 18px #17203308",
    border: "1px solid #edf0f5",
    boxSizing: "border-box",
    width: "100%",
  },
  title: { margin: "0 0 6px", fontSize: 21 },
  muted: { color: "#64748b", fontSize: 14, lineHeight: 1.7 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
  },
  card: {
    padding: 18,
    background: "#f8fafc",
    border: "1px solid #e8edf4",
    borderRadius: 12,
    minWidth: 0,
    overflowWrap: "anywhere",
    boxSizing: "border-box",
  },
  label: {
    display: "block",
    fontSize: 12,
    color: "#64748b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    color: "#172033",
    fontWeight: 700,
    margin: 0,
    overflowWrap: "anywhere",
  },
  badge: {
    display: "inline-block",
    padding: "5px 10px",
    background: "#ccfbf1",
    color: "#0f766e",
    borderRadius: 20,
    fontWeight: 700,
    fontSize: 12,
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 16,
    margin: "20px 0",
  },
  statCard: {
    background: "#fff",
    borderRadius: 15,
    padding: 23,
    border: "1px solid #edf0f5",
    minWidth: 0,
    boxSizing: "border-box",
  },
  statNumber: {
    fontSize: 34,
    fontWeight: 800,
    color: "#087f8c",
    margin: "10px 0 5px",
  },
  filter: {
    padding: "10px 13px",
    border: "1px solid #dbe4ef",
    borderRadius: 9,
    background: "#fff",
    fontSize: 14,
    minWidth: 0,
  },
  tableWrap: { width: "100%", overflowX: "auto", marginTop: 18 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 420 },
  th: {
    padding: 14,
    background: "#f8fafc",
    color: "#64748b",
    fontSize: 12,
    textAlign: "left",
    borderBottom: "1px solid #e5eaf1",
  },
  td: {
    padding: 15,
    borderBottom: "1px solid #edf0f5",
    fontSize: 14,
  },
  empty: {
    textAlign: "center",
    padding: 30,
    color: "#64748b",
    background: "#f8fafc",
    borderRadius: 12,
    marginTop: 16,
  },
  error: {
    background: "#fef2f2",
    color: "#b91c1c",
    padding: 13,
    borderRadius: 9,
    marginBottom: 20,
    overflowWrap: "anywhere",
  },
  success: {
    background: "#ecfdf5",
    color: "#047857",
    padding: 13,
    borderRadius: 9,
    marginBottom: 20,
    overflowWrap: "anywhere",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 13px",
    border: "1px solid #dbe4ef",
    borderRadius: 9,
    background: "#fff",
    fontSize: 14,
  },
  deleteButton: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    padding: "9px 12px",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
  },
};

const first = (...values) =>
  values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
  );

const toArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.clinics)) return data.clinics;
  if (Array.isArray(data?.doctors)) return data.doctors;
  if (Array.isArray(data?.queues)) return data.queues;
  if (Array.isArray(data?.tokens)) return data.tokens;
  return [];
};

const getId = (item) => first(item?.id, item?.clinicId);

const getDoctorClinicId = (doctor) =>
  first(
    doctor?.clinic?.id,
    doctor?.clinic?.clinicId,
    doctor?.clinicId,
    doctor?.clinic_id,
    doctor?.clinic?.clinic_id
  );

const getQueueClinicId = (queue) =>
  first(
    queue?.clinic?.id,
    queue?.clinic?.clinicId,
    queue?.clinicId,
    queue?.clinic_id,
    queue?.doctor?.clinic?.id,
    queue?.doctor?.clinic?.clinicId,
    queue?.doctor?.clinicId,
    queue?.doctor?.clinic_id,
    queue?.doctor?.user?.clinic?.id
  );

const getOwnerId = (clinic) =>
  first(
    clinic?.ownerUserId,
    clinic?.owner_user_id,
    clinic?.owner?.id,
    clinic?.owner?.userId,
    clinic?.user?.id,
    clinic?.userId
  );

const normalizeDay = (day) => {
  const value = String(day || "").trim().toUpperCase();
  return DAYS.find(
    (item) => item === value || item.startsWith(value)
  ) || "";
};

const getBookingDate = (token) => {
  const raw = first(
    token?.bookingDateTime,
    token?.bookingDatetime,
    token?.booking_date_time,
    token?.booking_datetime,
    token?.bookingDate,
    token?.booking_date,
    token?.appointmentDate,
    token?.appointment_date,
    token?.bookedAt,
    token?.booked_at,
    token?.tokenDate,
    token?.token_date,
    token?.createdAt,
    token?.created_at,
    token?.date,
    token?.timestamp
  );

  if (raw === undefined || raw === null || raw === "") return null;

  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }

  if (typeof raw === "string") {
    const value = raw.trim();

    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (dateOnly) {
      const [, y, m, d] = dateOnly;
      const date = new Date(Number(y), Number(m) - 1, Number(d));

      if (
        date.getFullYear() !== Number(y) ||
        date.getMonth() !== Number(m) - 1 ||
        date.getDate() !== Number(d)
      ) {
        return null;
      }

      return date;
    }

    const sqlDateTime = value.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/
    );

    if (sqlDateTime) {
      const [, y, mo, d, h, mi, s = "0", fraction = "0"] = sqlDateTime;

      const date = new Date(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(h),
        Number(mi),
        Number(s),
        Number(`0.${fraction}`) * 1000
      );

      if (Number.isNaN(date.getTime())) return null;

      if (
        date.getFullYear() !== Number(y) ||
        date.getMonth() !== Number(mo) - 1 ||
        date.getDate() !== Number(d)
      ) {
        return null;
      }

      return date;
    }
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const dateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatDate = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTime = (time) => {
  if (!time) return "—";

  const parts = String(time).split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1] || "00");

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
};

function getPeriodStart(period) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  if (period === "week") {
    const day = start.getDay();
    start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day));
  } else {
    start.setDate(1);
  }

  return start;
}

async function readResponse(response) {
  const text = await response.text();

  if (!response.ok) {
    let detail = text;

    try {
      const parsed = JSON.parse(text);
      detail = parsed.message || parsed.detail || parsed.error || text;
    } catch {
      // Keep the original response text.
    }

    throw new Error(
      detail || `Request failed with status ${response.status}`
    );
  }

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function ClinicDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState({});
  const [clinics, setClinics] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [queues, setQueues] = useState([]);

  const [period, setPeriod] = useState("month");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [shifts, setShifts] = useState([]);
  const [shiftsLoaded, setShiftsLoaded] = useState(false);
  const [shiftDay, setShiftDay] = useState("MONDAY");
  const [shiftOpening, setShiftOpening] = useState("11:00");
  const [shiftClosing, setShiftClosing] = useState("15:00");
  const [shiftLoading, setShiftLoading] = useState(false);
  const [shiftMessage, setShiftMessage] = useState("");
  const [shiftMessageType, setShiftMessageType] = useState("");

  const logout = () => {
    localStorage.removeItem("smartClinicUser");
    navigate("/login");
  };

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const endpoints = ["/clinics", "/doctors", "/queues"];

    const results = await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        return readResponse(response);
      })
    );

    const nextClinics =
      results[0].status === "fulfilled" ? toArray(results[0].value) : [];

    const nextDoctors =
      results[1].status === "fulfilled" ? toArray(results[1].value) : [];

    const nextQueues =
      results[2].status === "fulfilled" ? toArray(results[2].value) : [];

    setClinics(nextClinics);
    setDoctors(nextDoctors);
    setQueues(nextQueues);

    const failed = results
      .map((result, index) =>
        result.status === "rejected" ? endpoints[index] : null
      )
      .filter(Boolean);

    if (failed.length) {
      setMessage(
        `API request failed: ${failed.join(", ")}. Please check the backend and API routes.`
      );
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("smartClinicUser");

    if (!saved) {
      navigate("/login");
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      const account = parsed?.user || parsed;
      setUser(account || {});
      loadDashboard();
    } catch {
      localStorage.removeItem("smartClinicUser");
      navigate("/login");
    }
  }, [navigate, loadDashboard]);

  const selectedClinic = useMemo(() => {
    const accountClinicId = first(
      user?.clinicId,
      user?.clinic_id,
      user?.clinic?.id,
      user?.clinic?.clinicId
    );

    if (accountClinicId != null) {
      return (
        clinics.find(
          (clinic) => String(getId(clinic)) === String(accountClinicId)
        ) || null
      );
    }

    const userId = first(
      user?.id,
      user?.userId,
      user?.user_id,
      user?.user?.id,
      user?.user?.userId
    );

    if (userId != null) {
      return (
        clinics.find(
          (clinic) =>
            getOwnerId(clinic) != null &&
            String(getOwnerId(clinic)) === String(userId)
        ) || null
      );
    }

    return null;
  }, [clinics, user]);

  const clinicId = getId(selectedClinic);

  const clinicDoctors = useMemo(() => {
    if (clinicId == null) return [];

    return doctors.filter((doctor) => {
      const doctorClinicId = getDoctorClinicId(doctor);

      return (
        doctorClinicId != null &&
        String(doctorClinicId) === String(clinicId)
      );
    });
  }, [doctors, clinicId]);

  const clinicTokens = useMemo(() => {
    if (clinicId == null) return [];

    return queues.filter((token) => {
      const tokenClinicId = getQueueClinicId(token);

      return (
        tokenClinicId != null &&
        String(tokenClinicId) === String(clinicId)
      );
    });
  }, [queues, clinicId]);

  const tokenSummary = useMemo(() => {
    const start = getPeriodStart(period);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const datedTokens = clinicTokens
      .map((token) => ({
        token,
        date: getBookingDate(token),
      }))
      .filter(({ date }) => date && date >= start && date <= end);

    const counts = {};

    datedTokens.forEach(({ date }) => {
      const key = dateKey(date);
      counts[key] = (counts[key] || 0) + 1;
    });

    return {
      total: datedTokens.length,
      dailyRecords: Object.entries(counts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => b.date.localeCompare(a.date)),
      missingDateCount: clinicTokens.filter(
        (token) => !getBookingDate(token)
      ).length,
      outsidePeriodCount: clinicTokens.filter((token) => {
        const date = getBookingDate(token);
        return date && (date < start || date > end);
      }).length,
    };
  }, [clinicTokens, period]);

  const loadShifts = useCallback(async () => {
    setShiftsLoaded(false);
    setShifts([]);
    setShiftMessage("");
    setShiftMessageType("");

    if (clinicId == null) {
      setShiftsLoaded(true);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/clinics/${clinicId}/shifts`
      );

      const data = await readResponse(response);

      const nextShifts = toArray(data).sort((a, b) => {
        const difference =
          DAYS.indexOf(normalizeDay(a.dayOfWeek)) -
          DAYS.indexOf(normalizeDay(b.dayOfWeek));

        if (difference !== 0) return difference;

        return String(a.openingTime || "").localeCompare(
          String(b.openingTime || "")
        );
      });

      setShifts(nextShifts);
    } catch (error) {
      setShiftMessage(
        error.message || "Unable to load clinic working hours."
      );
      setShiftMessageType("error");
    } finally {
      setShiftsLoaded(true);
    }
  }, [clinicId]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const addShift = async (event) => {
    event.preventDefault();
    setShiftMessage("");
    setShiftMessageType("");

    if (clinicId == null) {
      setShiftMessage("Unable to identify the clinic.");
      setShiftMessageType("error");
      return;
    }

    if (!shiftOpening || !shiftClosing || shiftOpening >= shiftClosing) {
      setShiftMessage("Closing time must be later than opening time.");
      setShiftMessageType("error");
      return;
    }

    const duplicate = shifts.some(
      (shift) =>
        normalizeDay(shift.dayOfWeek) === shiftDay &&
        String(shift.openingTime || "").slice(0, 5) === shiftOpening &&
        String(shift.closingTime || "").slice(0, 5) === shiftClosing
    );

    if (duplicate) {
      setShiftMessage("This shift has already been saved.");
      setShiftMessageType("error");
      return;
    }

    setShiftLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/clinics/${clinicId}/shifts`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayOfWeek: shiftDay,
            openingTime: `${shiftOpening}:00`,
            closingTime: `${shiftClosing}:00`,
          }),
        }
      );

      await readResponse(response);

      setShiftMessage("Clinic working hours saved successfully.");
      setShiftMessageType("success");
      await loadShifts();
    } catch (error) {
      setShiftMessage(
        error.message || "Unable to save working hours."
      );
      setShiftMessageType("error");
    } finally {
      setShiftLoading(false);
    }
  };

  const deleteShift = async (shiftId) => {
    if (clinicId == null || shiftId == null) return;
    if (!window.confirm("Delete this working-hours shift?")) return;

    setShiftLoading(true);
    setShiftMessage("");
    setShiftMessageType("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/clinics/${clinicId}/shifts/${shiftId}`,
        { method: "DELETE" }
      );

      await readResponse(response);

      setShiftMessage("Clinic shift deleted successfully.");
      setShiftMessageType("success");
      await loadShifts();
    } catch (error) {
      setShiftMessage(
        error.message || "Unable to delete the clinic shift."
      );
      setShiftMessageType("error");
    } finally {
      setShiftLoading(false);
    }
  };

  const clinicName = first(selectedClinic?.name, "No Clinic Linked");
  const ownerName = first(
    user?.name,
    user?.fullName,
    user?.ownerName,
    "Not available"
  );
  const email = first(user?.email, "Not available");
  const phone = first(selectedClinic?.phone, "Not available");
  const address = first(selectedClinic?.address, "Not available");
  const city = first(selectedClinic?.city, "Not available");

  const todayName = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
  })
    .format(new Date())
    .toUpperCase();

  const todayShifts = shifts.filter(
    (shift) => normalizeDay(shift.dayOfWeek) === todayName
  );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>✚ SmartClinic</div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 600 }}>{ownerName}</span>

          <button
            type="button"
            style={styles.button}
            onClick={async () => {
              await loadDashboard();
              await loadShifts();
            }}
            disabled={loading || shiftLoading}
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>

          <button
            type="button"
            style={{
              ...styles.button,
              background: "#fff",
              color: "#334155",
              border: "1px solid #dbe4ef",
            }}
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={styles.content}>
        <section style={styles.hero}>
          <p style={{ fontSize: 12, letterSpacing: 1.5, fontWeight: 700 }}>
            CLINIC ADMINISTRATION
          </p>

          <h1 style={{ fontSize: 30, margin: "0 0 10px" }}>
            {clinicName}
          </h1>

          <p style={{ margin: 0, lineHeight: 1.7 }}>
            Manage clinic timings, registered doctors and token booking records.
          </p>
        </section>

        {message && <div style={styles.error}>{message}</div>}

        {loading && (
          <p style={styles.muted}>Loading dashboard data...</p>
        )}

        {!loading && !selectedClinic && (
          <section style={styles.section}>
            <h2 style={styles.title}>No Clinic Linked</h2>
            <p style={styles.muted}>
              The logged-in user's ID does not match the clinic owner's mapping.
            </p>
            <p style={styles.muted}>
              Logged-in user ID:{" "}
              {String(
                first(
                  user?.id,
                  user?.userId,
                  user?.user_id,
                  user?.user?.id,
                  user?.user?.userId,
                  "Not found"
                )
              )}
            </p>
          </section>
        )}

        {selectedClinic && (
          <>
            <section style={styles.section}>
              <h2 style={styles.title}>Clinic Working Hours</h2>
              <p style={styles.muted}>
                You can configure one or multiple shifts for each day.
                Overnight shifts are not supported.
              </p>

              {shiftMessage && (
                <div
                  style={
                    shiftMessageType === "success"
                      ? styles.success
                      : styles.error
                  }
                >
                  {shiftMessage}
                </div>
              )}

              <form onSubmit={addShift}>
                <div style={styles.grid}>
                  <div>
                    <label htmlFor="shift-day" style={styles.label}>
                      Day of Week
                    </label>
                    <select
                      id="shift-day"
                      value={shiftDay}
                      onChange={(event) => setShiftDay(event.target.value)}
                      style={{ ...styles.input, cursor: "pointer" }}
                      required
                    >
                      {DAYS.map((day) => (
                        <option key={day} value={day}>
                          {day.charAt(0) + day.slice(1).toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="shift-opening" style={styles.label}>
                      Opening Time
                    </label>
                    <input
                      id="shift-opening"
                      type="time"
                      value={shiftOpening}
                      onChange={(event) => setShiftOpening(event.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="shift-closing" style={styles.label}>
                      Closing Time
                    </label>
                    <input
                      id="shift-closing"
                      type="time"
                      value={shiftClosing}
                      onChange={(event) => setShiftClosing(event.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  style={{ ...styles.button, marginTop: 18 }}
                  disabled={shiftLoading || clinicId == null}
                >
                  {shiftLoading ? "Saving..." : "+ Add Shift"}
                </button>
              </form>

              <div style={{ ...styles.card, marginTop: 22 }}>
                <h3 style={{ marginTop: 0 }}>Today's Working Hours</h3>

                {!shiftsLoaded ? (
                  <p style={styles.muted}>Loading clinic working hours...</p>
                ) : todayShifts.length > 0 ? (
                  todayShifts.map((shift) => (
                    <p key={shift.id} style={styles.value}>
                      {formatTime(shift.openingTime)} –{" "}
                      {formatTime(shift.closingTime)}
                    </p>
                  ))
                ) : (
                  <p style={styles.muted}>
                    No working hours have been configured for today.
                  </p>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginTop: 30,
                }}
              >
                <h3 style={{ margin: 0 }}>Saved Working Hours</h3>

                <button
                  type="button"
                  onClick={loadShifts}
                  style={{
                    ...styles.button,
                    background: "#e6f5f5",
                    color: "#087f8c",
                  }}
                  disabled={shiftLoading}
                >
                  Refresh Shifts
                </button>
              </div>

              {!shiftsLoaded ? (
                <div style={styles.empty}>Loading working hours...</div>
              ) : shifts.length === 0 ? (
                <div style={styles.empty}>
                  {shiftMessageType === "error"
                    ? "Unable to load shifts. Please see the error message above."
                    : "No working-hours shifts have been saved yet."}
                </div>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Day</th>
                        <th style={styles.th}>Opening Time</th>
                        <th style={styles.th}>Closing Time</th>
                        <th style={styles.th}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.map((shift) => (
                        <tr key={shift.id}>
                          <td style={styles.td}>
                            {normalizeDay(shift.dayOfWeek) || "—"}
                          </td>
                          <td style={styles.td}>
                            {formatTime(shift.openingTime)}
                          </td>
                          <td style={styles.td}>
                            {formatTime(shift.closingTime)}
                          </td>
                          <td style={styles.td}>
                            <button
                              type="button"
                              onClick={() => deleteShift(shift.id)}
                              style={styles.deleteButton}
                              disabled={shiftLoading}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section style={styles.section}>
              <h2 style={styles.title}>Clinic Information</h2>
              <p style={styles.muted}>Your registered clinic details</p>

              <div style={styles.grid}>
                {[
                  ["Clinic Name", clinicName],
                  ["Clinic Owner", ownerName],
                  ["Registered Email", email],
                  ["Contact Number", phone],
                  ["Address", address],
                  ["City", city],
                ].map(([label, value]) => (
                  <div style={styles.card} key={label}>
                    <div style={styles.label}>{label}</div>
                    <p style={styles.value}>{value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section style={styles.section}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div>
                  <h2 style={styles.title}>Doctor Information</h2>
                  <p style={styles.muted}>
                    Doctors registered with this clinic
                  </p>
                </div>

                <span style={styles.badge}>
                  {clinicDoctors.length} Doctors
                </span>
              </div>

              {clinicDoctors.length ? (
                <div style={styles.grid}>
                  {clinicDoctors.map((doctor, index) => (
                    <div
                      style={{ ...styles.card, background: "#fff" }}
                      key={doctor.id ?? index}
                    >
                      <h3 style={{ marginTop: 0 }}>
                        {first(doctor.name, doctor.fullName, "Doctor")}
                      </h3>

                      <div style={styles.label}>Specialization</div>
                      <p style={styles.value}>
                        {first(doctor.specialization, "Not available")}
                      </p>

                      <div style={{ ...styles.label, marginTop: 16 }}>
                        Contact
                      </div>
                      <p style={styles.value}>
                        {first(doctor.phone, "Not available")}
                      </p>

                      <div style={{ ...styles.label, marginTop: 16 }}>
                        Email
                      </div>
                      <p style={styles.value}>
                        {first(doctor.email, doctor.user?.email, "Not available")}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={styles.empty}>
                  No doctors were found for this clinic.
                </div>
              )}
            </section>

            <section style={styles.section}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2 style={styles.title}>Token Booking Records</h2>
                  <p style={styles.muted}>
                    Date-wise booking summary for the selected period.
                  </p>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <select
                    aria-label="Token record period"
                    value={period}
                    onChange={(event) => setPeriod(event.target.value)}
                    style={styles.filter}
                  >
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </select>

                  <button
                    type="button"
                    style={styles.button}
                    onClick={loadDashboard}
                    disabled={loading}
                  >
                    Refresh Records
                  </button>
                </div>
              </div>

              <div style={styles.statGrid}>
                <div style={styles.statCard}>
                  <p style={styles.muted}>
                    Tokens with valid booking dates
                  </p>
                  <div style={styles.statNumber}>{tokenSummary.total}</div>
                </div>

                <div style={styles.statCard}>
                  <p style={styles.muted}>Days with bookings</p>
                  <div style={styles.statNumber}>
                    {tokenSummary.dailyRecords.length}
                  </div>
                </div>
              </div>

              <p style={styles.muted}>
                Total queue records linked to this clinic: {clinicTokens.length}
              </p>

              <h3>Date-wise Records</h3>

              {tokenSummary.dailyRecords.length > 0 ? (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Date</th>
                        <th style={styles.th}>Tokens Booked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokenSummary.dailyRecords.map((record) => (
                        <tr key={record.date}>
                          <td style={styles.td}>{formatDate(record.date)}</td>
                          <td style={styles.td}>
                            <span style={styles.badge}>{record.count}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={styles.empty}>
                  {clinicTokens.length === 0
                    ? "No queue records were returned for this clinic. Please check the clinic ID mapping and the /api/queues response."
                    : "No valid booking-date records were found for this period. Please check the missing dates and selected period."}
                </div>
              )}

              {tokenSummary.missingDateCount > 0 && (
                <p style={styles.muted}>
                  {tokenSummary.missingDateCount} record(s) have a missing or
                  invalid booking date. For older records, the actual booking
                  timestamp must be saved in the backend/database.
                </p>
              )}

              {tokenSummary.outsidePeriodCount > 0 && (
                <p style={styles.muted}>
                  {tokenSummary.outsidePeriodCount} dated record(s) fall outside
                  the selected period and have therefore not been included in
                  the current summary.
                </p>
              )}
            </section>
          </>
        )}

        <footer
          style={{
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 12,
            padding: "8px 0",
          }}
        >
          SmartClinic · Clinic Administration Dashboard
        </footer>
      </main>
    </div>
  );
}

export default ClinicDashboard;
