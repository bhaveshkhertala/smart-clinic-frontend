
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./home";
import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import DoctorDashboard from "./DoctorDashboard";
import UserDashboard from "./UserDashboard";
import ClinicDashboard from "./ClinicDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/doctor-dashboard" element={<DoctorDashboard />}/>
        <Route path="/user-dashboard" element={<UserDashboard />}/>
        <Route path="/clinic-dashboard" element={<ClinicDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
