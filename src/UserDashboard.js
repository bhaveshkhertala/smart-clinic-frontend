import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const API_BASE_URL ="https://samrt-clinic-backend.onrender.com/api";

function getClinicId(doctor) {
  return (
    doctor?.clinic?.id ??
    doctor?.clinicId ??
    doctor?.clinicID ??
    null
  );
}

function getSpecialization(doctor) {
  return (
    doctor?.specialization ||
    doctor?.speciality ||
    doctor?.specialty ||
    doctor?.department ||
    doctor?.expertise ||
    "General Physician"
  );
}

function getClinicAddress(clinic) {
  return (
    [clinic?.address, clinic?.city].filter(Boolean).join(", ") ||
    "Address not available"
  );
}

function UserDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [clinics, setClinics] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("smartClinicUser");

    if (!saved) {
      navigate("/login");
      return;
    }

    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        let savedUser;

        try {
          savedUser = JSON.parse(saved);
        } catch {
          throw new Error("Login information invalid hai. Dobara login karo.");
        }

        const loggedInUser =
          savedUser?.user || savedUser?.patient || savedUser;

        if (!loggedInUser) {
          throw new Error("User information nahi mili. Dobara login karo.");
        }

        if (cancelled) return;
        setUser(loggedInUser);

        const [clinicResponse, doctorResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/clinics`),
          fetch(`${API_BASE_URL}/doctors`),
        ]);

        if (!clinicResponse.ok) {
          throw new Error(`Clinic API error: ${clinicResponse.status}`);
        }

        if (!doctorResponse.ok) {
          throw new Error(`Doctor API error: ${doctorResponse.status}`);
        }

        const [clinicData, doctorData] = await Promise.all([
          clinicResponse.json(),
          doctorResponse.json(),
        ]);

        if (!Array.isArray(clinicData) || !Array.isArray(doctorData)) {
          throw new Error("Backend se valid clinic/doctor list nahi mili.");
        }

        if (cancelled) return;

        setClinics(clinicData);
        setDoctors(doctorData);
      } catch (err) {
        console.error("User dashboard loading error:", err);

        if (!cancelled) {
          setError(
            err.message ||
              "Dashboard load nahi hua. Backend aur API endpoints check karo."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("smartClinicUser");
    navigate("/login");
  };

  // Search results are empty until the user enters a search.
  const searchResults = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) return [];

    return clinics.reduce((results, clinic) => {
      const clinicDoctors = doctors.filter(
        (doctor) =>
          getClinicId(doctor) != null &&
          String(getClinicId(doctor)) === String(clinic.id)
      );

      const clinicMatches = [
        clinic.name,
        clinic.address,
        clinic.city,
        clinic.phone,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));

      const matchingDoctors = clinicDoctors.filter((doctor) =>
        [
          doctor.name,
          doctor.fullName,
          doctor.specialization,
          doctor.speciality,
          doctor.specialty,
          doctor.department,
          doctor.expertise,
          doctor.phone,
          doctor.email,
          doctor.user?.email,
        ].some((value) =>
          String(value || "").toLowerCase().includes(query)
        )
      );

      if (clinicMatches || matchingDoctors.length > 0) {
        results.push({
          clinic,
          // If the clinic itself matches, show every doctor in that clinic.
          doctors: clinicMatches ? clinicDoctors : matchingDoctors,
          totalDoctors: clinicDoctors.length,
        });
      }

      return results;
    }, []);
  }, [searchText, clinics, doctors]);

  const bookToken = (clinic, doctor) => {
    if (!clinic?.id || !doctor?.id) {
      setError("Clinic ya doctor ki ID missing hai.");
      return;
    }

    const bookingDetails = {
      clinicId: clinic.id,
      clinicName: clinic.name || "",
      clinicAddress: clinic.address || "",
      clinicCity: clinic.city || "",
      doctorId: doctor.id,
      doctorName: doctor.name || doctor.fullName || "",
      specialization: getSpecialization(doctor),
    };

    // Fallback if the dashboard is refreshed after navigation.
    sessionStorage.setItem(
      "smartClinicBooking",
      JSON.stringify(bookingDetails)
    );

    navigate("/dashboard", {
      state: {
        bookingDetails,
        clinic,
        doctor,
      },
    });
  };

  const displayName =
    user?.name ||
    user?.fullName ||
    user?.username ||
    "Patient";

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>SmartClinic</h1>
          <p>Find clinics and doctors for your next visit.</p>
        </div>

        <button
          type="button"
          className="dashboard-logout"
          onClick={logout}
        >
          Logout
        </button>
      </header>

      <section className="welcome-card">
        <div>
          <span>WELCOME BACK</span>
          <h2>Hello, {displayName} 👋</h2>
          <p>
            Search for a registered clinic, explore its doctors, and book
            your token with your preferred doctor.
          </p>
        </div>

        <div className="dashboard-role">PATIENT</div>
      </section>

      <section className="clinic-search-panel">
        <div className="search-heading">
          <span className="search-eyebrow">SMARTCLINIC SEARCH</span>
          <h2>Find a Clinic or Doctor</h2>
          <p>
            Clinic name, city, address, doctor name, or specialization
            search karo.
          </p>
        </div>

        <div className="clinic-search-box">
          <span className="search-icon">🔍</span>

          <input
            type="search"
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

        {loading && (
          <div className="no-search-results">
            <h3>Loading clinics and doctors...</h3>
            <p>Please wait.</p>
          </div>
        )}

        {!loading && error && (
          <div className="no-search-results" role="alert">
            <h3>Unable to load dashboard</h3>
            <p>{error}</p>

            <button
              type="button"
              className="search-join-button"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && !searchText.trim() && (
          <div className="no-search-results">
            <div className="no-result-icon">🏥</div>
            <h3>Search for a clinic or doctor</h3>
            <p>
              Clinic aur doctor ki information yahan search karne ke baad
              dikhegi.
            </p>
          </div>
        )}

        {!loading && !error && searchText.trim() && (
          <div className="search-results">
            <div className="search-result-title">
              <strong>Search Results</strong>
              <span>
                {" "}
                · {searchResults.length} clinic(s) found
              </span>
            </div>

            {searchResults.length === 0 ? (
              <div className="no-search-results">
                <div className="no-result-icon">🔎</div>
                <h3>No matching clinic or doctor found</h3>
                <p>
                  Doosra clinic name, doctor name, city, ya specialization
                  try karo.
                </p>
              </div>
            ) : (
              <div className="search-result-list">
                {searchResults.map(({ clinic, doctors: foundDoctors, totalDoctors }) => (
                  <article
                    className="clinic-search-result"
                    key={clinic.id}
                  >
                    <div className="clinic-result-header">
                      <div className="clinic-result-icon">🏥</div>

                      <div className="clinic-result-main">
                        <h3>{clinic.name || "Clinic"}</h3>
                        <p>📍 {getClinicAddress(clinic)}</p>

                        {clinic.phone && (
                          <p>Phone: {clinic.phone}</p>
                        )}
                      </div>

                      <span className="registered-badge">
                        ✓ Registered
                      </span>
                    </div>

                    <div className="clinic-live-summary">
                      <div>
                        <span>Total Doctors</span>
                        <strong>{totalDoctors}</strong>
                      </div>

                      <div>
                        <span>Matching Doctors</span>
                        <strong>{foundDoctors.length}</strong>
                      </div>
                    </div>

                    <div className="clinic-doctors-list">
                      <div className="doctor-list-heading">
                        Doctors at {clinic.name || "this clinic"}
                      </div>

                      {foundDoctors.length === 0 ? (
                        <p className="empty-doctor-text">
                          Is clinic mein abhi doctor registered nahi hai.
                        </p>
                      ) : (
                        foundDoctors.map((doctor) => (
                          <div
                            className="search-doctor-card"
                            key={doctor.id}
                          >
                            <div className="search-doctor-avatar">
                              {String(
                                doctor.name || doctor.fullName || "D"
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div className="search-doctor-info">
                              <h4>
                                {doctor.name ||
                                  doctor.fullName ||
                                  "Doctor"}
                              </h4>

                              <p>{getSpecialization(doctor)}</p>

                              {doctor.phone && (
                                <p>Phone: {doctor.phone}</p>
                              )}

                              {(doctor.email || doctor.user?.email) && (
                                <p>
                                  Email: {doctor.email || doctor.user.email}
                                </p>
                              )}
                            </div>

                            <div className="doctor-result-actions">
                              <button
                                type="button"
                                className="search-join-button"
                                onClick={() => bookToken(clinic, doctor)}
                              >
                                Book Token →
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default UserDashboard;
