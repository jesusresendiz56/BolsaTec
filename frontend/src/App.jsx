
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Páginas públicas
import Home from "./pages/Home/Home";
import Login from "./pages/login/Login";
import Registro from "./pages/registro/Registro";

// Login del administrador
import AdminLogin from "./pages/admin/AdminLogin";

// Dashboards
import EstudianteDashboard from "./pages/estudiante/EstudianteDashboard";
import EmpresaDashboard from "./pages/empresa/EmpresaDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";

// Protección de rutas
import ProtectedRoute from "./components/dashboard/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PÁGINAS PÚBLICAS */}
        <Route
          path="/"
          element={<Home />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/registro"
          element={<Registro />}
        />

        {/* LOGIN DEL ADMINISTRADOR */}
        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        {/* DASHBOARD DEL ESTUDIANTE */}
        <Route
          path="/dashboard/estudiante"
          element={
            <ProtectedRoute rol="estudiante">
              <EstudianteDashboard />
            </ProtectedRoute>
          }
        />

        {/* DASHBOARD DE EMPRESA */}
        <Route
          path="/dashboard/empresa"
          element={
            <ProtectedRoute rol="empresa">
              <EmpresaDashboard />
            </ProtectedRoute>
          }
        />

        {/* DASHBOARD DEL ADMINISTRADOR */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute rol="administrador">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
