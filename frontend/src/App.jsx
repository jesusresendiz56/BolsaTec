
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

// Páginas públicas
import Home from "./pages/home/Home";
import Login from "./pages/login/Login";
import Registro from "./pages/registro/Registro";

// Administrador
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";

// Dashboards
import EstudianteDashboard from "./pages/estudiante/EstudianteDashboard";
import EmpresaDashboard from "./pages/empresa/EmpresaDashboard";

// Protección de rutas
import ProtectedRoute from "./components/dashboard/ProtectedRoute";

// Botón de modo oscuro
import ThemeToggle from "./components/ThemeToggle";

// ========================================
// RUTAS Y BOTÓN DE MODO OSCURO
// ========================================

function AppContent() {
  const location = useLocation();

  // Rutas que ya tienen un botón de tema
  // dentro de DashboardLayout.jsx
  const rutasDashboard = [
    "/dashboard/estudiante",
    "/dashboard/empresa",
    "/admin/dashboard",
  ];

  const esDashboard = rutasDashboard.some(
    (ruta) =>
      location.pathname === ruta ||
      location.pathname.startsWith(`${ruta}/`)
  );

  return (
    <>
      {/* Mostrar el botón global solamente
          fuera de los dashboards */}

      {!esDashboard && <ThemeToggle />}

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
    </>
  );
}

// ========================================
// APLICACIÓN PRINCIPAL
// ========================================

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
